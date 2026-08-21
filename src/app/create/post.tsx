import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image as RNImage,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useTheme } from '../../theme';
import { useCommunitiesQuery } from '../../api/community';
import { useCreatePostMutation } from '../../api/feed';
import { useSearchUsersQuery } from '../../api/user';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import { useToastStore } from '../../store/toastStore';
import { useConfirmStore } from '../../store/confirmStore';
import { useAuthStore } from '../../store/authStore';
import { pickImage, uploadPostImage, uploadPostVideo } from '../../utils/imagePicker';
import * as ImagePicker from 'expo-image-picker';
import { User } from '../../types';

const CHAR_LIMIT = 500;

export default function CreatePost() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const showToast = useToastStore((state) => state.showToast);
  const { user } = useAuthStore();

  const { communityId: preselectedCommId } = useLocalSearchParams<{ communityId?: string }>();
  const { data: communities = [] } = useCommunitiesQuery();
  const createPostMutation = useCreatePostMutation();

  const [content, setContent] = useState('');
  const [selectedCommId, setSelectedCommId] = useState<string>(preselectedCommId ?? '');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaKind, setMediaKind] = useState<'image' | 'video' | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showTagPanel, setShowTagPanel] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [taggedUsers, setTaggedUsers] = useState<User[]>([]);
  const { data: searchResults = [], isFetching: searchingUsers } = useSearchUsersQuery(tagSearch);
  const [showLocationPanel, setShowLocationPanel] = useState(false);
  const [location, setLocation] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [fetchingLocation, setFetchingLocation] = useState(false);

  useEffect(() => {
    if (preselectedCommId) setSelectedCommId(preselectedCommId);
  }, [preselectedCommId]);

  const joinedCommunities = communities.filter((c) => c.isJoined);
  const selectedCommunity = communities.find((c) => c.id === selectedCommId);
  const allCommunities = [
    ...joinedCommunities,
    ...(preselectedCommId && !joinedCommunities.find((c) => c.id === preselectedCommId)
      ? communities.filter((c) => c.id === preselectedCommId)
      : []),
  ];

  const toggleTagUser = (u: User) => {
    setTaggedUsers((prev) =>
      prev.find((p) => p.id === u.id) ? prev.filter((p) => p.id !== u.id) : [...prev, u]
    );
  };
  const isTagged = (u: User) => taggedUsers.some((p) => p.id === u.id);

  const reverseGeocode = async (lat: number, lon: number) => {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'User-Agent': 'CommunityApp/1.0' } }
    );
    const data = await res.json();
    const place = data.address?.city || data.address?.town || data.address?.village || data.address?.county || data.display_name?.split(',')[0] || '';
    const state = data.address?.state || '';
    return state ? `${place}, ${state}` : place;
  };

  const handleDetectLocation = async () => {
    setFetchingLocation(true);
    try {
      if (Platform.OS === 'web') {
        if (!navigator.geolocation) {
          showToast('Geolocation is not supported by your browser.', 'error');
          return;
        }
        await new Promise<void>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              try {
                const label = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
                setLocation(label);
                setLocationInput(label);
                setShowLocationPanel(false);
                resolve();
              } catch { reject(new Error('geocode')); }
            },
            (err) => reject(err)
          );
        });
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          showToast('Enable location permission in device Settings.', 'error');
          return;
        }
        const coords = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const label = await reverseGeocode(coords.coords.latitude, coords.coords.longitude);
        setLocation(label);
        setLocationInput(label);
        setShowLocationPanel(false);
      }
    } catch (e: any) {
      const isHttpBlocked = Platform.OS === 'web' && window.location.protocol === 'http:' && window.location.hostname !== 'localhost';
      if (isHttpBlocked) {
        showToast('Location requires HTTPS. Please enter your location manually.', 'error');
      } else if (e?.code === 1 || e?.message === 'denied') {
        showToast('Location access denied. Allow it in your browser/Settings.', 'error');
      } else {
        showToast('Could not detect location. Enter manually.', 'error');
      }
    } finally {
      setFetchingLocation(false);
    }
  };

  const handleConfirmLocation = () => { setLocation(locationInput.trim()); setShowLocationPanel(false); };
  const handleClearLocation = () => { setLocation(''); setLocationInput(''); };

  const handleAttachImage = async () => {
    try {
      const picked = await pickImage();
      if (!picked) return;
      setImageUploading(true);
      setUploadError(null);
      const url = await uploadPostImage(picked);
      if (url) { setMediaUrl(url); setMediaKind('image'); }
      else showToast('Failed to upload image.', 'error');
    } catch (e: any) {
      const message = e?.response?.data?.message ?? e?.message ?? 'Failed to upload image.';
      setUploadError(message);
      showToast(message, 'error');
    } finally {
      setImageUploading(false);
    }
  };

  const handleAttachVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { showToast('Media library permission required.', 'error'); return; }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 1,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      const filename = asset.uri.split('/').pop() ?? 'video.mp4';
      const ext = filename.split('.').pop()?.toLowerCase() ?? 'mp4';
      const mimeMap: Record<string, string> = { mp4: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo', webm: 'video/webm' };
      const mimeType = mimeMap[ext] ?? 'video/mp4';

      const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
      if (asset.fileSize && asset.fileSize > MAX_VIDEO_BYTES) {
        showToast('Maximum video size allowed is 50 MB.', 'error');
        return;
      }

      setVideoUploading(true);
      setUploadProgress(0);
      setUploadError(null);
      const url = await uploadPostVideo({ localUri: asset.uri, filename, mimeType }, (pct) => setUploadProgress(pct));
      if (url) { setMediaUrl(url); setMediaKind('video'); }
      else { setUploadError('Failed to upload video.'); }
    } catch (e: any) {
      const message = e?.response?.data?.message ?? e?.message ?? 'Failed to upload video.';
      setUploadError(message);
      showToast(message, 'error');
    } finally {
      setVideoUploading(false);
      setUploadProgress(0);
    }
  };

  const confirm = useConfirmStore((s) => s.confirm);

  const handlePostSubmit = async () => {
    if (!content.trim() && !mediaUrl) return;

    const ok = await confirm({
      title: 'Share post?',
      message: 'Your post will be published to the community.',
      confirmText: 'Share',
      cancelText: 'Cancel',
      isDestructive: false,
      icon: 'send-outline',
    });
    if (!ok) return;

    const isVideo = mediaKind === 'video';
    createPostMutation.mutate(
      {
        content: content.trim() || '',
        communityId: selectedCommId || undefined,
        mediaType: mediaUrl ? (isVideo ? 'VIDEO' : 'IMAGE') : undefined,
        mediaUrl: isVideo ? undefined : (mediaUrl || undefined),
        videoUrl: isVideo ? (mediaUrl || undefined) : undefined,
        tags: taggedUsers.length > 0 ? taggedUsers.map((u) => u.username) : undefined,
      } as any,
      {
        onSuccess: () => {
          setContent(''); setSelectedCommId(''); setTaggedUsers([]); setMediaUrl(null); setMediaKind(null); setLocation(''); setUploadError(null);
          setTimeout(() => router.replace('/(tabs)' as any), 100);
        },
        onError: () => showToast('Failed to create post. Try again.', 'error'),
      }
    );
  };

  const isPostEnabled = (content.trim().length > 0 || !!mediaUrl) && !createPostMutation.isPending && !videoUploading && !imageUploading;
  const charsLeft = CHAR_LIMIT - content.length;
  const filteredResults = searchResults.filter((u) => u.id !== user?.id);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16), borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)' as any)} style={styles.headerClose} activeOpacity={0.7}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>New Post</Text>
        <Button
          title="Share"
          variant="primary"
          size="sm"
          disabled={!isPostEnabled}
          loading={createPostMutation.isPending || videoUploading}
          onPress={handlePostSubmit}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* COMPOSE CARD */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Author row */}
          <View style={styles.composeTop}>
            <Avatar url={user?.avatarUrl} name={user?.displayName || 'User'} size={44} />
            <View style={styles.composeRight}>
              <Text style={[styles.userName, { color: colors.text }]}>{user?.displayName || 'You'}</Text>
              {(selectedCommunity || location) ? (
                <View style={styles.metaRow}>
                  {selectedCommunity ? (
                    <View style={[styles.metaBadge, { backgroundColor: colors.primaryContainer }]}>
                      <Ionicons name="people-outline" size={11} color={colors.primary} />
                      <Text style={[styles.metaBadgeText, { color: colors.primary }]}>{selectedCommunity.name}</Text>
                    </View>
                  ) : null}
                  {location ? (
                    <View style={[styles.metaBadge, { backgroundColor: colors.primaryContainer }]}>
                      <Ionicons name="location" size={11} color={colors.primary} />
                      <Text style={[styles.metaBadgeText, { color: colors.primary }]} numberOfLines={1}>{location}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>

          <TextInput
            placeholder="What's on your mind?"
            placeholderTextColor={colors.textMuted}
            value={content}
            onChangeText={(t) => t.length <= CHAR_LIMIT && setContent(t)}
            multiline
            autoFocus
            style={[styles.textInput, { color: colors.text }]}
          />

          {content.length > 0 ? (
            <Text style={[styles.charCounter, { color: charsLeft <= 50 ? colors.warning : colors.textMuted }]}>{charsLeft}</Text>
          ) : null}

          {/* Media */}
          {mediaUrl ? (
            <View style={styles.mediaPreview}>
              {mediaKind === 'video' ? (
                <View style={styles.videoPreviewWrap}>
                  <Ionicons name="videocam" size={32} color="#FFF" />
                </View>
              ) : (
                <RNImage source={{ uri: mediaUrl }} style={styles.mediaImage} resizeMode="cover" />
              )}
              <TouchableOpacity onPress={() => { setMediaUrl(null); setMediaKind(null); setUploadError(null); }} style={styles.mediaRemove} activeOpacity={0.8}>
                <Ionicons name="close" size={14} color="#FFF" />
              </TouchableOpacity>
            </View>
          ) : videoUploading ? (
            <View style={[styles.mediaPlaceholder, { borderColor: colors.border, backgroundColor: colors.inputBg, flexDirection: 'column', paddingVertical: 18 }]}>
              <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                <View style={[styles.progressBarFill, { backgroundColor: colors.primary, width: `${uploadProgress}%` as any }]} />
              </View>
              <Text style={[styles.mediaPlaceholderText, { color: colors.textMuted, marginTop: 8 }]}>Uploading… {uploadProgress}%</Text>
            </View>
          ) : (
            <View style={styles.mediaButtonsRow}>
              <TouchableOpacity onPress={handleAttachImage} disabled={imageUploading} style={[styles.mediaBtn, { borderColor: colors.border, backgroundColor: colors.inputBg }]} activeOpacity={0.7}>
                {imageUploading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="image-outline" size={20} color={colors.primary} />}
                <Text style={[styles.mediaPlaceholderText, { color: imageUploading ? colors.textMuted : colors.primary }]}>{imageUploading ? 'Uploading…' : 'Photo'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAttachVideo} style={[styles.mediaBtn, { borderColor: colors.border, backgroundColor: colors.inputBg }]} activeOpacity={0.7}>
                <Ionicons name="videocam-outline" size={20} color={colors.primary} />
                <Text style={[styles.mediaPlaceholderText, { color: colors.primary }]}>Video</Text>
              </TouchableOpacity>
            </View>
          )}
          {uploadError ? (
            <View style={styles.errorRow}>
              <Text style={[styles.errorText, { color: colors.error ?? '#E53935' }]}>{uploadError}</Text>
              <TouchableOpacity onPress={handleAttachVideo} activeOpacity={0.7}>
                <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* OPTIONS CARD */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, overflow: 'hidden' }]}>

          {/* Tag people row */}
          <TouchableOpacity style={[styles.menuRow, { borderBottomColor: colors.border }]} onPress={() => { setShowTagPanel(!showTagPanel); setShowLocationPanel(false); }} activeOpacity={0.65}>
            <View style={[styles.menuIconWrap, { backgroundColor: taggedUsers.length > 0 ? colors.primary : colors.primaryContainer }]}>
              <Ionicons name="people-outline" size={18} color={taggedUsers.length > 0 ? '#FFF' : colors.primary} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.text }]}>Tag people</Text>
            <View style={styles.menuRight}>
              {taggedUsers.length > 0 ? <Text style={[styles.menuValue, { color: colors.textSecondary }]} numberOfLines={1}>{taggedUsers.length} tagged</Text> : null}
              <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          {showTagPanel ? (
            <View style={[styles.panel, { backgroundColor: colors.surfaceSecondary, borderTopColor: colors.border }]}>
              <View style={[styles.searchRow, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Ionicons name="search" size={16} color={colors.textMuted} />
                <TextInput
                  placeholder="Search by name or username…"
                  placeholderTextColor={colors.textMuted}
                  value={tagSearch}
                  onChangeText={setTagSearch}
                  autoCapitalize="none"
                  returnKeyType="search"
                  style={[styles.searchInput, { color: colors.text }]}
                />
                {tagSearch.length > 0 ? (
                  <TouchableOpacity onPress={() => setTagSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>
              {taggedUsers.length > 0 ? (
                <View style={styles.taggedStrip}>
                  {taggedUsers.map((u) => (
                    <TouchableOpacity key={u.id} onPress={() => toggleTagUser(u)} style={[styles.taggedChip, { backgroundColor: colors.primaryContainer }]} activeOpacity={0.7}>
                      <Avatar url={u.avatarUrl} name={u.displayName} size={20} />
                      <Text style={[styles.taggedChipText, { color: colors.primary }]}>{u.displayName}</Text>
                      <Ionicons name="close-circle" size={14} color={colors.primary} />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
              {searchingUsers && tagSearch.length > 0 ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
              ) : filteredResults.length > 0 ? (
                <View style={styles.userList}>
                  {filteredResults.slice(0, 6).map((u) => {
                    const tagged = isTagged(u);
                    return (
                      <TouchableOpacity key={u.id} onPress={() => toggleTagUser(u)} activeOpacity={0.7} style={[styles.userRow, { borderBottomColor: colors.border }]}>
                        <Avatar url={u.avatarUrl} name={u.displayName} size={38} />
                        <View style={styles.userInfo}>
                          <Text style={[styles.userDisplayName, { color: colors.text }]}>{u.displayName}</Text>
                          <Text style={[styles.userUsername, { color: colors.textMuted }]}>@{u.username}</Text>
                        </View>
                        <View style={[styles.tagToggle, { backgroundColor: tagged ? colors.primary : 'transparent', borderColor: tagged ? colors.primary : colors.border }]}>
                          {tagged ? <Ionicons name="checkmark" size={14} color="#FFF" /> : <Ionicons name="add" size={14} color={colors.textMuted} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : tagSearch.length > 1 ? (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No users found</Text>
              ) : (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Type a name to search</Text>
              )}
            </View>
          ) : null}

          {/* Location row */}
          <TouchableOpacity style={[styles.menuRow, { borderBottomColor: colors.border }]} onPress={() => { setShowLocationPanel(!showLocationPanel); setShowTagPanel(false); }} activeOpacity={0.65}>
            <View style={[styles.menuIconWrap, { backgroundColor: location ? colors.primary : colors.primaryContainer }]}>
              <Ionicons name="location-outline" size={18} color={location ? '#FFF' : colors.primary} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.text }]}>Add location</Text>
            <View style={styles.menuRight}>
              {location ? <Text style={[styles.menuValue, { color: colors.textSecondary }]} numberOfLines={1}>{location}</Text> : null}
              <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          {showLocationPanel ? (
            <View style={[styles.panel, { backgroundColor: colors.surfaceSecondary, borderTopColor: colors.border }]}>
              <TouchableOpacity onPress={handleDetectLocation} disabled={fetchingLocation} activeOpacity={0.75} style={[styles.detectBtn, { backgroundColor: colors.primaryContainer, borderColor: colors.primary }]}>
                {fetchingLocation ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="navigate" size={16} color={colors.primary} />}
                <Text style={[styles.detectBtnText, { color: colors.primary }]}>{fetchingLocation ? 'Detecting…' : 'Use current location'}</Text>
              </TouchableOpacity>
              <View style={styles.orRow}>
                <View style={[styles.orLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.orText, { color: colors.textMuted }]}>or enter manually</Text>
                <View style={[styles.orLine, { backgroundColor: colors.border }]} />
              </View>
              <View style={[styles.searchRow, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Ionicons name="location-outline" size={16} color={colors.textMuted} />
                <TextInput
                  placeholder="City, area or landmark…"
                  placeholderTextColor={colors.textMuted}
                  value={locationInput}
                  onChangeText={setLocationInput}
                  returnKeyType="done"
                  onSubmitEditing={handleConfirmLocation}
                  style={[styles.searchInput, { color: colors.text }]}
                />
                {locationInput.length > 0 ? (
                  <TouchableOpacity onPress={() => setLocationInput('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={styles.locationActions}>
                {location ? (
                  <TouchableOpacity onPress={handleClearLocation} style={[styles.locationBtn, { borderColor: colors.border }]} activeOpacity={0.7}>
                    <Text style={[styles.locationBtnText, { color: colors.textSecondary }]}>Remove</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity onPress={handleConfirmLocation} disabled={!locationInput.trim()} style={[styles.locationBtn, { backgroundColor: locationInput.trim() ? colors.primary : colors.inputBg, borderColor: 'transparent' }]} activeOpacity={0.8}>
                  <Text style={[styles.locationBtnText, { color: locationInput.trim() ? '#FFF' : colors.textMuted }]}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {/* Community selector */}
          <View style={[styles.panel, { backgroundColor: colors.surfaceSecondary, borderTopColor: colors.border }]}>
            <Text style={[styles.panelLabel, { color: colors.textSecondary }]}>Share to community</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
              {[{ id: '', name: 'General Feed' }, ...allCommunities].map((comm) => {
                const isSelected = selectedCommId === comm.id;
                return (
                  <TouchableOpacity key={comm.id} onPress={() => setSelectedCommId(comm.id)} activeOpacity={0.75} style={[styles.pill, { backgroundColor: isSelected ? colors.primary : colors.background, borderColor: isSelected ? colors.primary : colors.border }]}>
                    {isSelected ? <Ionicons name="checkmark" size={13} color="#FFF" style={{ marginRight: 4 }} /> : null}
                    <Text style={[styles.pillText, { color: isSelected ? '#FFF' : colors.text }]}>{comm.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

        </View>
      </ScrollView>

      {/* BOTTOM BAR */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16), borderTopColor: colors.border, backgroundColor: colors.surface }]}>
        <Button
          title="Share Now"
          variant="primary"
          size="lg"
          fullWidth
          disabled={!isPostEnabled}
          loading={createPostMutation.isPending || videoUploading}
          onPress={handlePostSubmit}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  headerClose: { padding: 4, marginRight: 10 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  shareButton: { paddingHorizontal: 22, paddingVertical: 9, borderRadius: 22, minWidth: 80, alignItems: 'center', justifyContent: 'center' },
  shareButtonText: { fontSize: 14, fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2, marginBottom: 12 },
  composeTop: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, paddingBottom: 0 },
  composeRight: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap' },
  metaBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginRight: 6, marginBottom: 4 },
  metaBadgeText: { fontSize: 11, fontWeight: '600', maxWidth: 120, marginLeft: 4 },
  textInput: { fontSize: 16, lineHeight: 24, textAlignVertical: 'top', minHeight: 80, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  charCounter: { fontSize: 12, textAlign: 'right', paddingHorizontal: 16, marginBottom: 8 },
  taggedStrip: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 10 },
  taggedChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginRight: 8, marginBottom: 6 },
  taggedChipText: { fontSize: 13, fontWeight: '600', marginLeft: 6, marginRight: 4 },
  mediaPreview: { margin: 16, marginTop: 8, borderRadius: 12, overflow: 'hidden' },
  mediaImage: { width: '100%', height: 200, borderRadius: 12 },
  mediaRemove: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  mediaPlaceholder: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', margin: 16, marginTop: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed' },
  mediaPlaceholderText: { fontSize: 14, fontWeight: '600', marginLeft: 8 },
  mediaButtonsRow: { flexDirection: 'row', margin: 16, marginTop: 8, gap: 10 },
  mediaBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed' },
  videoPreviewWrap: { width: '100%', height: 200, borderRadius: 12, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  progressBarBg: { width: '80%', height: 6, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: 6, borderRadius: 3 },
  errorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginBottom: 8 },
  errorText: { fontSize: 13, flex: 1 },
  retryText: { fontSize: 13, fontWeight: '700', marginLeft: 10 },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  menuIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  menuRight: { flexDirection: 'row', alignItems: 'center', maxWidth: '45%' },
  menuValue: { fontSize: 13, marginRight: 6 },
  panel: { paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth },
  panelLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 44, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 14, marginLeft: 8 },
  userList: { borderRadius: 10, overflow: 'hidden' },
  userRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  userInfo: { flex: 1, marginLeft: 12 },
  userDisplayName: { fontSize: 14, fontWeight: '600' },
  userUsername: { fontSize: 12, marginTop: 1 },
  tagToggle: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 10 },
  detectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  detectBtnText: { fontSize: 14, fontWeight: '600', marginLeft: 8 },
  orRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth },
  orText: { fontSize: 12, marginHorizontal: 10 },
  locationActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  locationBtn: { paddingHorizontal: 20, paddingVertical: 9, borderRadius: 10, borderWidth: 1, alignItems: 'center', marginLeft: 10 },
  locationBtnText: { fontSize: 14, fontWeight: '600' },
  pillRow: { paddingBottom: 2 },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  pillText: { fontSize: 13, fontWeight: '600' },
  bottomBar: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  submitButton: { width: '100%', paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  submitButtonText: { fontSize: 16, fontWeight: '700' },
});
