import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Image,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useToastStore } from '../../store/toastStore';
import { useConfirmStore } from '../../store/confirmStore';
import { useAuthStore } from '../../store/authStore';
import { useCreateEventMutation, useEventDetailQuery, useUpdateEventMutation } from '../../api/event';
import { apiClient, API_BASE_URL } from '../../api/client';
import Button from '../../components/common/Button';
import ImageCropModal, { CropResult } from '../../components/common/ImageCropModal';
import { appendPickedFile } from '../../utils/imagePicker';

function InputField({ label, value, onChangeText, placeholder, multiline = false, icon = null, colors, keyboardType }: any) {
  return (
    <View style={styles.inputContainer}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
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
          keyboardType={keyboardType}
        />
      </View>
    </View>
  );
}

// ── Web date/time inputs – native HTML input styled to match the design ───────
const webInputBaseStyle = (colors: any): React.CSSProperties => ({
  display: 'block',
  height: 48,
  borderRadius: 12,
  border: `1px solid ${colors.border}`,
  backgroundColor: colors.inputBg,
  paddingLeft: 12,
  paddingRight: 12,
  fontSize: 15,
  color: colors.text,
  width: '100%',
  boxSizing: 'border-box' as const,
  cursor: 'pointer',
  outline: 'none',
  fontFamily: 'inherit',
  colorScheme: 'light' as any,
});

function WebDateInput({ value, onChange, colors }: { value: string; onChange: (iso: string) => void; colors: any }) {
  const ref = useRef<any>(null);
  const today = new Date().toISOString().split('T')[0];
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const open = () => { try { el.showPicker(); } catch {} };
    el.addEventListener('click', open);
    el.addEventListener('focus', open);
    return () => { el.removeEventListener('click', open); el.removeEventListener('focus', open); };
  }, []);
  return (
    // @ts-ignore – web-only
    <input
      ref={ref}
      type="date"
      value={value}
      min={today}
      onChange={(e: any) => onChange(e.target.value)}
      aria-label="Event date"
      style={webInputBaseStyle(colors) as any}
    />
  );
}

function WebTimeInput({ value, onChange, colors }: { value: string; onChange: (t: string) => void; colors: any }) {
  const ref = useRef<any>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const open = () => { try { el.showPicker(); } catch {} };
    el.addEventListener('click', open);
    el.addEventListener('focus', open);
    return () => { el.removeEventListener('click', open); el.removeEventListener('focus', open); };
  }, []);
  return (
    // @ts-ignore – web-only
    <input
      ref={ref}
      type="time"
      value={value}
      step={300}
      onChange={(e: any) => onChange(e.target.value)}
      aria-label="Event time"
      style={webInputBaseStyle(colors) as any}
    />
  );
}

// ── Mobile date/time picker (iOS modal + Android inline) ─────────────────────
function MobileDateInput({ value, onChange, colors }: { value: string; onChange: (iso: string) => void; colors: any }) {
  const [show, setShow] = useState(false);
  const dateObj = value ? new Date(value) : new Date();
  const display = value ? value.split('-').reverse().join('/') : '';

  const onConfirm = (_: any, selected?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (selected) {
      const iso = selected.toISOString().split('T')[0];
      onChange(iso);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
        activeOpacity={0.8}
        onPress={() => setShow(true)}
        accessibilityLabel="Select date"
        accessibilityRole="button"
      >
        <Ionicons name="calendar-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
        <Text style={[styles.input, { color: value ? colors.text : colors.textMuted, lineHeight: 48 }]}>
          {display || 'DD/MM/YYYY'}
        </Text>
      </TouchableOpacity>

      {Platform.OS === 'ios' && show && (
        <Modal transparent animationType="slide">
          <Pressable style={styles.modalOverlay} onPress={() => setShow(false)} />
          <View style={[styles.iosPickerSheet, { backgroundColor: colors.surface ?? '#fff' }]}>
            <View style={styles.iosPickerHeader}>
              <TouchableOpacity onPress={() => setShow(false)}>
                <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={dateObj}
              mode="date"
              display="inline"
              minimumDate={new Date()}
              onValueChange={onConfirm}
              onDismiss={() => setShow(false)}
              style={{ width: '100%' }}
            />
          </View>
        </Modal>
      )}

      {Platform.OS === 'android' && show && (
        <DateTimePicker
          value={dateObj}
          mode="date"
          display="calendar"
          minimumDate={new Date()}
          onValueChange={onConfirm}
          onDismiss={() => setShow(false)}
        />
      )}
    </>
  );
}

function MobileTimeInput({ value, onChange, colors }: { value: string; onChange: (t: string) => void; colors: any }) {
  const [show, setShow] = useState(false);
  const toDate = (t: string) => {
    const d = new Date();
    if (t) { const [h, m] = t.split(':'); d.setHours(+h, +m, 0, 0); }
    return d;
  };
  const display = (() => {
    if (!value) return 'HH:MM AM/PM';
    const [h, m] = value.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  })();

  const onConfirm = (_: any, selected?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (selected) {
      const hh = String(selected.getHours()).padStart(2, '0');
      const mm = String(selected.getMinutes()).padStart(2, '0');
      onChange(`${hh}:${mm}`);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
        activeOpacity={0.8}
        onPress={() => setShow(true)}
        accessibilityLabel="Select time"
        accessibilityRole="button"
      >
        <Ionicons name="time-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
        <Text style={[styles.input, { color: value ? colors.text : colors.textMuted, lineHeight: 48 }]}>
          {display}
        </Text>
      </TouchableOpacity>

      {Platform.OS === 'ios' && show && (
        <Modal transparent animationType="slide">
          <Pressable style={styles.modalOverlay} onPress={() => setShow(false)} />
          <View style={[styles.iosPickerSheet, { backgroundColor: colors.surface ?? '#fff' }]}>
            <View style={styles.iosPickerHeader}>
              <TouchableOpacity onPress={() => setShow(false)}>
                <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={toDate(value)}
              mode="time"
              display="spinner"
              is24Hour={false}
              minuteInterval={5}
              onValueChange={onConfirm}
              onDismiss={() => setShow(false)}
              style={{ width: '100%' }}
            />
          </View>
        </Modal>
      )}

      {Platform.OS === 'android' && show && (
        <DateTimePicker
          value={toDate(value)}
          mode="time"
          display="clock"
          is24Hour={false}
          minuteInterval={5}
          onValueChange={onConfirm}
          onDismiss={() => setShow(false)}
        />
      )}
    </>
  );
}

export default function CreateEvent() {
  const { colors, spacing, typography, roundness } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id: editId } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!editId;
  const showToast = useToastStore((state) => state.showToast);
  const { user } = useAuthStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  // date stored as YYYY-MM-DD (ISO), time stored as HH:mm (24h)
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [volunteersRequired, setVolunteersRequired] = useState(false);
  const [bannerUri, setBannerUri] = useState<string | null>(null);
  const [cropUri, setCropUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<string | null>(null);
  const createEvent = useCreateEventMutation();
  const updateEvent = useUpdateEventMutation();
  const { data: existingEvent, isLoading: loadingExisting } = useEventDetailQuery(editId);

  useEffect(() => {
    if (!isEdit || !existingEvent) return;
    setTitle(existingEvent.title ?? '');
    setDescription(existingEvent.description ?? '');
    setCategory('');
    setDate(existingEvent.startsAt ? new Date(existingEvent.startsAt).toISOString().split('T')[0] : '');
    setTime(existingEvent.startsAt ? new Date(existingEvent.startsAt).toTimeString().slice(0, 5) : '');
    setVenue(existingEvent.location ?? '');
    setBannerUri(existingEvent.coverUrl ?? null);
  }, [existingEvent, isEdit]);

  const pickBanner = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast('Permission to access photos is required.', 'error');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) setCropUri(result.assets[0].uri);
  };

  const handleCropDone = (result: CropResult) => {
    setBannerUri(result.uri);
    setCropUri(null);
  };

  const isFormValid = title.trim() && description.trim() && date.trim().match(/^\d{4}-\d{2}-\d{2}$/) && venue.trim();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)' as any);
  };

  const uploadBanner = async (uri: string): Promise<string> => {
    const formData = new FormData();
    const filename = uri.split('/').pop() ?? 'event-banner.jpg';
    const extension = filename.split('.').pop()?.toLowerCase();
    const mimeType = extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg';
    await appendPickedFile(formData, { localUri: uri, filename, mimeType });

    // /media/upload is the upload contract shared by the event and community
    // forms.  The old event-only route is not available on every deployment,
    // which caused the event to be saved without its selected image.
    const res = await apiClient.post('/media/upload', formData, { timeout: 60000 });
    const uploadedUrl = res.data?.data?.url ?? res.data?.url ?? res.data?.data?.file?.url;
    if (!uploadedUrl || typeof uploadedUrl !== 'string') throw new Error('The image upload did not return a URL.');
    // Events validate coverUrl as a URL. The upload service often returns a
    // relative media-proxy path, which works for rendering but is rejected by
    // that validation when the event is saved.
    return uploadedUrl.startsWith('/')
      ? `${API_BASE_URL.replace('/api/v1', '')}${uploadedUrl}`
      : uploadedUrl;
  };

  const handleSubmit = async () => {
    if (!isFormValid) return;

    const ok = await useConfirmStore.getState().confirm({
      title: isEdit ? 'Update event?' : 'Create event?',
      message: isEdit ? 'Your event changes will be saved.' : 'Your event will be created and published.',
      confirmText: isEdit ? 'Update' : 'Create',
      cancelText: 'Cancel',
      isDestructive: false,
      icon: 'calendar-outline',
    });
    if (!ok) return;

    let startsAt: string;
    try {
      const [year, month, day] = date.trim().split('-').map(Number);
      let hours = 0, minutes = 0;
      if (time.trim()) {
        const [hStr, mStr] = time.trim().split(':');
        hours = parseInt(hStr) || 0;
        minutes = parseInt(mStr) || 0;
      }
      const parsed = new Date(year, month - 1, day, hours, minutes);
      startsAt = isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
    } catch {
      startsAt = new Date().toISOString();
    }

    let coverUrl: string | undefined;
    if (bannerUri) {
      try {
        setUploading(true);
        coverUrl = await uploadBanner(bannerUri);
      } catch {
        showToast('Image upload failed. Event will be saved without a banner.', 'error');
      } finally {
        setUploading(false);
      }
    }

    const payload = {
      title: title.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(category.trim() ? { category: category.trim() } : {}),
      ...(venue.trim() ? { location: venue.trim() } : {}),
      startsAt,
      ...(coverUrl ? { coverUrl } : {}),
    };
    try {
      if (isEdit && editId) {
        await updateEvent.mutateAsync({ id: editId, payload });
        showToast('Event updated.', 'success');
        router.replace(`/events/${editId}` as any);
        return;
      }
      const created = await createEvent.mutateAsync(payload);
      setSubmissionStatus(String((created as any)?.status ?? 'PENDING_APPROVAL').toUpperCase());
    } catch (err: any) {
      const responseData = err?.response?.data;
      const msg = responseData?.message ?? responseData?.error ?? err?.message ?? 'Unable to create the event.';
      const fieldErrors = Array.isArray(responseData?.errors)
        ? responseData.errors.map((item: any) => item.message ?? item.msg ?? String(item)).filter(Boolean).join(', ')
        : '';
      showToast(fieldErrors ? `${msg}: ${fieldErrors}` : msg, 'error');
    }
  };

  const isLiveImmediately = ['APPROVED', 'ACTIVE', 'LIVE', 'PUBLISHED'].includes(submissionStatus ?? '');

  if (!isEdit && submissionStatus) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 32, paddingTop: insets.top }]}>
        <View style={[styles.pendingIconWrap, { backgroundColor: isLiveImmediately ? '#ECFDF3' : '#FFF8E1' }]}>
          <Ionicons name={isLiveImmediately ? 'checkmark-circle-outline' : 'time-outline'} size={56} color={isLiveImmediately ? '#16A34A' : '#F59E0B'} />
        </View>
        <Text style={[styles.pendingTitle, { color: colors.text }]}>{isLiveImmediately ? 'Event Is Live!' : 'Event Submitted!'}</Text>
        <Text style={[styles.pendingMessage, { color: colors.textSecondary }]}>
          {isLiveImmediately
            ? 'Your event was approved automatically and is now visible to the community.'
            : 'Your event has been submitted successfully and is awaiting admin approval. It will be published once an administrator approves it.'}
        </Text>
        <Button
          title="Back to Home"
          variant="primary"
          size="lg"
          fullWidth
          onPress={goBack}
          style={{ marginTop: 24 }}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* ── HEADER ────────────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: Math.max(insets.top, 12) + 10 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={goBack} style={styles.iconBtn}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{isEdit ? 'Edit Event' : 'Create Event'}</Text>
          {loadingExisting && isEdit ? <ActivityIndicator size="small" color={colors.primary} /> : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        
        {/* Banner Uploader */}
        <TouchableOpacity
          style={[styles.bannerUpload, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
          activeOpacity={0.7}
          onPress={pickBanner}
        >
          {bannerUri ? (
            <>
              <Image source={{ uri: bannerUri }} style={styles.bannerImage} />
              <View style={styles.bannerEditBadge}>
                <Ionicons name="pencil" size={14} color="#FFF" />
              </View>
            </>
          ) : (
            <>
              <Ionicons name="image-outline" size={32} color={colors.textMuted} />
              <Text style={[styles.bannerUploadText, { color: colors.textSecondary }]}>Add Event Banner</Text>
              <Text style={[styles.bannerUploadHint, { color: colors.textMuted }]}>Tap to upload (16:9)</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.formContent}>
          <InputField label="Event Title" value={title} onChangeText={setTitle} placeholder="e.g. Gowda Sangama 2026" colors={colors} />
          <InputField label="Description" value={description} onChangeText={setDescription} placeholder="Describe your event..." multiline colors={colors} />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Date</Text>
                {Platform.OS === 'web'
                  ? <WebDateInput value={date} onChange={setDate} colors={colors} />
                  : <MobileDateInput value={date} onChange={setDate} colors={colors} />}
              </View>
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Time</Text>
                {Platform.OS === 'web'
                  ? <WebTimeInput value={time} onChange={setTime} colors={colors} />
                  : <MobileTimeInput value={time} onChange={setTime} colors={colors} />}
              </View>
            </View>
          </View>

          <InputField label="Venue / Location" value={venue} onChangeText={setVenue} placeholder="e.g. Kodagu Gowda Samaja" icon="location-outline" colors={colors} />
          <InputField label="Category" value={category} onChangeText={setCategory} placeholder="e.g. Cultural, Meeting, Sports" colors={colors} />

          {/* Switch row for Volunteers */}
          <View style={styles.switchRow}>
            <View>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Volunteers Required</Text>
              <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>Allow members to register as volunteers</Text>
            </View>
            <Switch
              value={volunteersRequired}
              onValueChange={setVolunteersRequired}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFF"
            />
          </View>
        </View>

      </ScrollView>

      {/* ── BOTTOM ACTION BAR ──────────────────────────────────── */}
      <View style={[styles.bottomBar, { borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 16), backgroundColor: colors.background }]}>
        <Button
          title={isEdit ? 'Save Event' : 'Publish Event'}
          variant="primary"
          size="lg"
          fullWidth
          disabled={!isFormValid || createEvent.isPending || updateEvent.isPending || uploading}
          loading={uploading || createEvent.isPending || updateEvent.isPending}
          onPress={handleSubmit}
        />
      </View>

      {/* ── BANNER CROP MODAL ──────────────────────────────────── */}
      <ImageCropModal
        visible={!!cropUri}
        imageUri={cropUri}
        aspect={[16, 9]}
        onDone={handleCropDone}
        onCancel={() => setCropUri(null)}
        accentColor={colors.primary}
      />
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
  bannerUpload: {
    height: 160,
    margin: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  bannerEditBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    padding: 6,
  },
  bannerUploadText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  bannerUploadHint: {
    marginTop: 4,
    fontSize: 12,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  switchDesc: {
    fontSize: 13,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  iosPickerSheet: {
    paddingBottom: 32,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  pendingIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  pendingTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  pendingMessage: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 36,
  },
  pendingBtn: {
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
  },
  pendingBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
