import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Switch,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useToastStore } from '../../store/toastStore';
import { useConfirmStore } from '../../store/confirmStore';
import * as ImagePicker from 'expo-image-picker';
import { apiClient, SOCKET_URL } from '../../api/client';
import { useQueryClient } from '@tanstack/react-query';
import { communityKeys, useMyCommunitiesRequestsQuery } from '../../api/community';
import { feedKeys } from '../../api/feed';
import Button from '../../components/common/Button';
type InputFieldProps = {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  multiline?: boolean;
  icon?: any;
  colors: any;
  error?: string;
};

function InputField({ label, value, onChangeText, placeholder, multiline = false, icon = null, colors, error }: InputFieldProps) {
  return (
    <View style={styles.inputContainer}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: error ? '#E53935' : colors.border }]}>
        {icon && <Ionicons name={icon} size={20} color={colors.textMuted} style={styles.inputIcon} />}
        <TextInput
          style={[
            styles.input,
            { color: colors.text },
            multiline && { height: 100, textAlignVertical: 'top', paddingTop: 12 },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          multiline={multiline}
        />
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

export default function CreateCommunity() {
  const { colors, spacing, typography, roundness } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const showToast = useToastStore((state) => state.showToast);

  const queryClient = useQueryClient();
  const { data: myRequests = [] } = useMyCommunitiesRequestsQuery();

  const PRESET_CATEGORIES = ['Design', 'Tech', 'Travel', 'Fitness', 'Education', 'Health', 'Business', 'Art', 'Music', 'Sports', 'Others'];
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [village, setVillage] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [bannerUri, setBannerUri] = useState<string | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; description?: string; category?: string }>({});
  const [submitted, setSubmitted] = useState(false);

  // Rules
  const [rules, setRules] = useState<{ title: string; description: string }[]>([]);
  const [ruleTitle, setRuleTitle] = useState('');
  const [ruleDesc, setRuleDesc] = useState('');

  // Feed Posts
  const [feedPosts, setFeedPosts] = useState<{ content: string }[]>([]);
  const [feedPostInput, setFeedPostInput] = useState('');

  const addFeedPost = () => {
    if (!feedPostInput.trim()) {
      showToast('Post content is required', 'error');
      return;
    }
    setFeedPosts((prev) => [...prev, { content: feedPostInput.trim() }]);
    setFeedPostInput('');
  };

  const removeFeedPost = (idx: number) => setFeedPosts((prev) => prev.filter((_, i) => i !== idx));

  const addRule = () => {
    if (!ruleTitle.trim()) {
      showToast('Rule title is required', 'error');
      return;
    }
    setRules((prev) => [...prev, { title: ruleTitle.trim(), description: ruleDesc.trim() }]);
    setRuleTitle('');
    setRuleDesc('');
  };

  const removeRule = (idx: number) => setRules((prev) => prev.filter((_, i) => i !== idx));

  const isFormValid = name.trim().length >= 3 && description.trim() && (category === 'Others' ? customCategory.trim() : category.trim());

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)' as any);
  };

  const pickImage = async (type: 'banner' | 'avatar') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast('Permission to access photos is required', 'error');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: type === 'banner' ? [16, 9] : [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      if (type === 'banner') setBannerUri(result.assets[0].uri);
      else setAvatarUri(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string): Promise<string> => {
    const filename = uri.split('/').pop()?.split('?')[0] ?? 'image.jpg';
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

    const formData = new FormData();

    if (Platform.OS === 'web') {
      const blobRes = await fetch(uri);
      const blob = await blobRes.blob();
      formData.append('file', new File([blob], filename, { type: blob.type || mimeType }));
    } else {
      formData.append('file', { uri, name: filename, type: mimeType } as any);
    }

    // The generic upload route is available on all deployed API versions.
    // It returns the same media URL contract as the community-specific route.
    const res = await apiClient.post('/media/upload', formData);
    const url: string = res.data.data.url;
    // Backend returns relative URLs like /api/v1/media/proxy/... — make absolute for validation
    if (url.startsWith('/')) return `${SOCKET_URL}${url}`;
    return url;
  };

  const handleSubmit = async () => {
    if (uploading) return;
    const newErrors: { name?: string; description?: string; category?: string } = {};
    if (!name.trim()) newErrors.name = 'Community name is required';
    else if (name.trim().length < 3) newErrors.name = 'Name must be at least 3 characters';
    else if (name.trim().length > 80) newErrors.name = 'Name must be 80 characters or less';
    if (!description.trim()) newErrors.description = 'Description is required';
    else if (description.trim().length > 500) newErrors.description = 'Description must be 500 characters or less';
    if (!category.trim()) newErrors.category = 'Please select a category';
    else if (category === 'Others' && !customCategory.trim()) newErrors.category = 'Please enter a custom category';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const duplicateRequest = myRequests.find((request: any) => request.name?.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase());
    if (duplicateRequest) {
      showToast(`Your community "${duplicateRequest.name}" is already ${String(duplicateRequest.status ?? 'pending').toLowerCase()} review. Track it in Communities.`, 'error');
      return;
    }

    const ok = await useConfirmStore.getState().confirm({
      title: 'Create community?',
      message: 'Your community will be created and submitted for review.',
      confirmText: 'Create',
      cancelText: 'Cancel',
      isDestructive: false,
      icon: 'people-outline',
    });
    if (!ok) return;

    setUploading(true);
    try {
      const [bannerUrl, avatarUrl] = await Promise.all([
        bannerUri ? uploadImage(bannerUri) : Promise.resolve(undefined),
        avatarUri ? uploadImage(avatarUri) : Promise.resolve(undefined),
      ]);
      const body: Record<string, any> = {
        name: name.trim(),
        category: category === 'Others' ? customCategory.trim() : category.trim(),
        isPrivate,
      };
      if (description.trim()) body.description = description.trim();
      if (bannerUrl) body.bannerUrl = bannerUrl;
      if (avatarUrl) body.avatarUrl = avatarUrl;
      console.log('[create-community] POST /communities body:', JSON.stringify(body));
      const res = await apiClient.post('/communities', body);
      console.log('[create-community] response:', JSON.stringify(res.data));
      const newCommunityId: string = res.data?.data?.id ?? res.data?.id;

      // Add rules
      if (newCommunityId && rules.length > 0) {
        await Promise.all(
          rules.map((r) => apiClient.post(`/communities/${newCommunityId}/rules`, { title: r.title, description: r.description || undefined }))
        );
      }

      // New communities are pending moderation. Posting here used to turn a
      // successful creation into a confusing failure state.

      await queryClient.invalidateQueries({ queryKey: communityKeys.list() });
      await queryClient.invalidateQueries({ queryKey: feedKeys.posts() });
      await queryClient.invalidateQueries({ queryKey: [...communityKeys.all, 'my-requests'] });
      setSubmitted(true);
    } catch (err: any) {
      console.log('[create-community] error:', JSON.stringify(err?.response?.data));
      const data = err?.response?.data;
      const fieldErrors: { field: string; message: string }[] = data?.errors ?? [];
      const detail = fieldErrors.length > 0
        ? fieldErrors.map((e) => `${e.field}: ${e.message}`).join(', ')
        : (data?.message ?? err?.message ?? 'Failed to create community');
      showToast(detail, 'error');
    } finally {
      setUploading(false);
    }
  };

  if (submitted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
        <Ionicons name="time-outline" size={64} color={colors.primary} style={{ marginBottom: 24 }} />
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: 20, textAlign: 'center', marginBottom: 16 }]}>
          Request Submitted!
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
          Your community creation request has been submitted successfully and is awaiting admin approval. You can track its status in Communities. Posts drafted here are not published until the community is approved.
        </Text>
        <TouchableOpacity
          onPress={goBack}
          style={[styles.fullWidthButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
        >
          <Text style={[styles.fullWidthButtonText, { color: '#FFF' }]}>Back to Communities</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── HEADER ────────────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: Math.max(insets.top, 12) + 10 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={goBack} style={styles.iconBtn}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Create Community</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        
        {/* Cover & Logo Uploader */}
        <View style={styles.imagesSection}>
          <TouchableOpacity
            style={[styles.coverUpload, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => pickImage('banner')}
          >
            {bannerUri ? (
              <Image source={{ uri: bannerUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <>
                <Ionicons name="image-outline" size={32} color={colors.textMuted} />
                <Text style={[styles.uploadText, { color: colors.textSecondary }]}>Add Cover Photo</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.logoUpload, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
            activeOpacity={0.9}
            onPress={() => pickImage('avatar')}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={[StyleSheet.absoluteFill, { borderRadius: 40 }]} resizeMode="cover" />
            ) : (
              <Ionicons name="camera-outline" size={28} color={colors.textMuted} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.formContent}>
          <InputField label="Community Name" value={name} onChangeText={(t) => { setName(t); if (t.trim()) setErrors((e) => ({ ...e, name: undefined })); }} placeholder="e.g. Mandya Youth Association" colors={colors} error={errors.name} />
          <InputField label="Description" value={description} onChangeText={(t) => { setDescription(t); if (t.trim()) setErrors((e) => ({ ...e, description: undefined })); }} placeholder="What is this community about?" multiline colors={colors} error={errors.description} />
          
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
                <TouchableOpacity
                  style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: errors.category ? '#E53935' : colors.border }]}
                  onPress={() => setShowCategoryDropdown(true)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.input, { color: category ? colors.text : colors.textMuted, lineHeight: 48 }]}>
                    {category === 'Others' ? (customCategory || 'Others') : (category || 'Select category')}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={colors.textMuted} style={{ marginRight: 4 }} />
                </TouchableOpacity>
                {!!errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
                {category === 'Others' && (
                  <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border, marginTop: 8 }]}>
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      value={customCategory}
                      onChangeText={setCustomCategory}
                      placeholder="Enter custom category"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                )}
              </View>

              <Modal visible={showCategoryDropdown} transparent animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowCategoryDropdown(false)} activeOpacity={1}>
                  <View style={[styles.dropdown, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <FlatList
                      data={PRESET_CATEGORIES}
                      keyExtractor={(item) => item}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[styles.dropdownItem, { borderBottomColor: colors.border }, item === category && { backgroundColor: colors.inputBg }]}
                          onPress={() => { setCategory(item); setShowCategoryDropdown(false); if (item !== 'Others') setCustomCategory(''); setErrors((e) => ({ ...e, category: undefined })); }}
                        >
                          <Text style={[{ color: colors.text, fontSize: 15 }, item === category && { fontWeight: '700', color: colors.primary }]}>{item}</Text>
                          {item === category && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                </TouchableOpacity>
              </Modal>
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <InputField label="Village / Location" value={village} onChangeText={setVillage} placeholder="Location" icon="location-outline" colors={colors} />
            </View>
          </View>

          {/* Privacy toggle */}
          <View style={{ marginBottom: 20 }}>
            <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 8, marginLeft: 4 }]}>Community Visibility</Text>
            <View style={[styles.switchRow, { borderColor: colors.border, backgroundColor: colors.inputBg }]}>
              <View style={styles.switchLeft}>
                <Ionicons
                  name={isPrivate ? 'lock-closed-outline' : 'earth-outline'}
                  size={20}
                  color={isPrivate ? colors.primary : colors.textSecondary}
                />
                <View style={{ marginLeft: 12 }}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>
                    {isPrivate ? 'Private Community' : 'Public Community'}
                  </Text>
                  <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>
                    {isPrivate
                      ? 'Posts are visible only to your followers'
                      : 'Anyone can find and join this community'}
                  </Text>
                </View>
              </View>
              <Switch
                value={isPrivate}
                onValueChange={setIsPrivate}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFF"
              />
            </View>

          </View>

          {/* Feed Posts section */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Feed Posts</Text>
            {feedPosts.map((p, idx) => (
              <View key={idx} style={[styles.listItem, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Text style={[styles.listItemTitle, { color: colors.text, flex: 1 }]}>{p.content}</Text>
                <TouchableOpacity onPress={() => removeFeedPost(idx)}>
                  <Ionicons name="close-circle" size={20} color={colors.error ?? '#B71C1C'} />
                </TouchableOpacity>
              </View>
            ))}
            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border, marginBottom: 8, height: 'auto' as any }]}>
              <TextInput
                style={[styles.input, { color: colors.text, height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
                value={feedPostInput}
                onChangeText={setFeedPostInput}
                placeholder="Write a post for this community..."
                placeholderTextColor={colors.textMuted}
                multiline
              />
            </View>
            <TouchableOpacity
              onPress={addFeedPost}
              style={[styles.addBtn, { borderColor: colors.primary }]}
            >
              <Ionicons name="add" size={18} color={colors.primary} />
              <Text style={[styles.addBtnText, { color: colors.primary }]}>Add Post</Text>
            </TouchableOpacity>
          </View>

          {/* Rules section */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Community Rules</Text>
            {rules.map((r, idx) => (
              <View key={idx} style={[styles.listItem, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.listItemTitle, { color: colors.text }]}>{r.title}</Text>
                  {!!r.description && <Text style={[styles.listItemDesc, { color: colors.textSecondary }]}>{r.description}</Text>}
                </View>
                <TouchableOpacity onPress={() => removeRule(idx)}>
                  <Ionicons name="close-circle" size={20} color={colors.error ?? '#B71C1C'} />
                </TouchableOpacity>
              </View>
            ))}
            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border, marginBottom: 8 }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={ruleTitle}
                onChangeText={setRuleTitle}
                placeholder="Rule title"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border, marginBottom: 8 }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={ruleDesc}
                onChangeText={setRuleDesc}
                placeholder="Description (optional)"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <TouchableOpacity
              onPress={addRule}
              style={[styles.addBtn, { borderColor: colors.primary }]}
            >
              <Ionicons name="add" size={18} color={colors.primary} />
              <Text style={[styles.addBtnText, { color: colors.primary }]}>Add Rule</Text>
            </TouchableOpacity>
          </View>

        </View>

      </ScrollView>

      {/* ── BOTTOM ACTION BAR ──────────────────────────────────── */}
      <View style={[styles.bottomBar, { borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 16), backgroundColor: colors.background }]}>
        <Button
          title="Create Page"
          variant="primary"
          size="lg"
          fullWidth
          disabled={!isFormValid || uploading}
          loading={uploading}
          onPress={handleSubmit}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  imagesSection: {
    position: 'relative',
    marginBottom: 40,
  },
  coverUpload: {
    height: 140,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  uploadText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  logoUpload: {
    position: 'absolute',
    bottom: -35,
    left: 20,
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  formContent: {
    paddingHorizontal: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
  },
  switchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  switchDesc: {
    fontSize: 12,
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 13,
    marginBottom: 10,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  listItemDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignSelf: 'flex-start',
    gap: 4,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  dropdown: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    maxHeight: 360,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  fullWidthButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidthButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: '#E53935',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
