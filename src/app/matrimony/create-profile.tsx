import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator, Alert, Modal, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useCreateMatrimonyProfileMutation, useUpdateMatrimonyProfileMutation,
  useMyMatrimonyProfileQuery, uploadMatrimonyPhoto,
  Gender, MaritalStatus, EducationLevel,
  MARITAL_STATUS_LABELS, EDUCATION_LABELS,
} from '../../api/matrimony';
import { useTheme } from '../../theme';
import { useConfirmStore } from '../../store/confirmStore';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={styles.field}>{label ? <Text style={styles.fieldLabelPlaceholder}>{label}</Text> : null}{children}</View>;
}

function OptionGroup<T extends string>({
  options, labels, value, onChange, colors,
}: { options: T[]; labels: Record<string, string>; value: T | ''; onChange: (v: T) => void; colors: any }) {
  return (
    <View style={styles.optionGroup}>
      {options.map(o => (
        <TouchableOpacity
          key={o}
          style={[styles.optionChip, {
            backgroundColor: value === o ? colors.primary : colors.primaryContainer,
            borderColor: colors.primary,
          }]}
          onPress={() => onChange(o)}
        >
          <Text style={[styles.optionChipText, { color: value === o ? '#fff' : colors.primary }]}>
            {labels[o] ?? o}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function CreateMatrimonyProfile() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: myProfile, isLoading: profileLoading } = useMyMatrimonyProfileQuery();
  const createMutation = useCreateMatrimonyProfileMutation();
  const updateMutation = useUpdateMatrimonyProfileMutation();

  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [form, setForm] = useState({
    displayName: '',
    gender: '' as Gender | '',
    dateOfBirth: '',
    height: '',
    maritalStatus: '' as MaritalStatus | '',
    religion: '',
    caste: '',
    motherTongue: '',
    education: '' as EducationLevel | '',
    educationDetails: '',
    occupation: '',
    annualIncome: '',
    city: '',
    state: '',
    aboutMe: '',
    partnerMinAge: '',
    partnerMaxAge: '',
    partnerReligion: '',
    partnerCaste: '',
  });

  // Populate form once myProfile loads
  useEffect(() => {
    if (!myProfile?.id) return;
    setPhotos(myProfile.photos ?? []);
    setForm({
      displayName: myProfile.displayName ?? '',
      gender: (myProfile.gender ?? '') as Gender | '',
      dateOfBirth: myProfile.dateOfBirth ? myProfile.dateOfBirth.toString().slice(0, 10) : '',
      height: myProfile.height ?? '',
      maritalStatus: (myProfile.maritalStatus ?? '') as MaritalStatus | '',
      religion: myProfile.religion ?? '',
      caste: myProfile.caste ?? '',
      motherTongue: myProfile.motherTongue ?? '',
      education: (myProfile.education ?? '') as EducationLevel | '',
      educationDetails: myProfile.educationDetails ?? '',
      occupation: myProfile.occupation ?? '',
      annualIncome: myProfile.annualIncome ?? '',
      city: myProfile.city ?? '',
      state: myProfile.state ?? '',
      aboutMe: myProfile.aboutMe ?? '',
      partnerMinAge: myProfile.partnerMinAge?.toString() ?? '',
      partnerMaxAge: myProfile.partnerMaxAge?.toString() ?? '',
      partnerReligion: myProfile.partnerReligion ?? '',
      partnerCaste: myProfile.partnerCaste ?? '',
    });
  }, [myProfile]);

  const set = (key: keyof typeof form) => (val: string) => setForm(f => ({ ...f, [key]: val }));

  const [showPhotoSheet, setShowPhotoSheet] = useState(false);

  const uploadAssets = async (assets: ImagePicker.ImagePickerAsset[]) => {
    const selected = assets.slice(0, Math.max(0, 5 - photos.length));
    if (!selected.length) return;
    setUploadingPhoto(true);
    try {
      const urls = (await Promise.all(selected.map(async (asset) => {
        const filename = asset.fileName ?? asset.uri.split('/').pop() ?? 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const mimeType = asset.mimeType ?? (match ? `image/${match[1].toLowerCase().replace('jpg', 'jpeg')}` : 'image/jpeg');
        return uploadMatrimonyPhoto(asset.uri, filename, mimeType);
      }))).filter((url): url is string => !!url);
      if (urls.length) setPhotos(p => [...p, ...urls].slice(0, 5));
      if (urls.length !== selected.length) Alert.alert('Some uploads failed', 'Please try adding the missing photos again.');
    } catch (e: any) {
      console.error('[upload] error:', e.response?.data ?? e.message);
      Alert.alert('Upload failed', e.response?.data?.message ?? e.message ?? 'Could not upload photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const _doUpload = async (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled && result.assets?.length) await uploadAssets(result.assets);
  };

  // Android can recreate the activity while the camera app is open. Recovering the
  // pending picker result keeps this form mounted and prevents the apparent page close.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    ImagePicker.getPendingResultAsync().then((result) => {
      if (result && !('code' in result)) void _doUpload(result);
    }).catch(() => undefined);
  }, []);

  const handlePickFromGallery = async () => {
    setShowPhotoSheet(false);
    if (Platform.OS === 'web') {
      // On web, use native file input directly
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;
      input.onchange = async (e: any) => {
        const files = Array.from(e.target.files ?? []).slice(0, Math.max(0, 5 - photos.length)) as File[];
        if (!files.length) return;
        const uris = files.map(file => URL.createObjectURL(file));
        setUploadingPhoto(true);
        try {
          const urls = (await Promise.all(files.map((file, index) => uploadMatrimonyPhoto(uris[index], file.name, file.type || 'image/jpeg'))))
            .filter((url): url is string => !!url);
          if (urls.length) setPhotos(p => [...p, ...urls].slice(0, 5));
          if (urls.length !== files.length) Alert.alert('Some uploads failed', 'Please try adding the missing photos again.');
        } catch (e: any) {
          console.error('[web upload] error:', e.response?.data ?? e.message);
          Alert.alert('Upload failed', e.response?.data?.message ?? e.message ?? 'Failed to upload');
        } finally {
          setUploadingPhoto(false);
          uris.forEach(uri => URL.revokeObjectURL(uri));
        }
      };
      input.click();
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow access to your photo library.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsMultipleSelection: true,
      selectionLimit: Math.max(1, 5 - photos.length), allowsEditing: false, quality: 0.85,
    });
    await _doUpload(result);
  };

  const handleTakePhoto = async () => {
    setShowPhotoSheet(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow access to your camera.'); return; }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, quality: 0.85,
    });
    await _doUpload(result);
  };

  const handlePickPhoto = () => {
    if (photos.length >= 5) { Alert.alert('Limit reached', 'You can upload up to 5 photos.'); return; }
    if (Platform.OS === 'web') {
      handlePickFromGallery();
      return;
    }
    setShowPhotoSheet(true);
  };

  const removePhoto = (idx: number) => setPhotos(p => p.filter((_, i) => i !== idx));
  const movePhoto = (idx: number, direction: -1 | 1) => setPhotos((current) => {
    const next = idx + direction;
    if (next < 0 || next >= current.length) return current;
    const reordered = [...current];
    [reordered[idx], reordered[next]] = [reordered[next], reordered[idx]];
    return reordered;
  });

  const handleSubmit = async () => {
    console.log('[submit] form:', JSON.stringify(form));
    console.log('[submit] photos:', photos.length, photos);
    if (!form.displayName || !form.gender || !form.dateOfBirth || !form.city) {
      console.log('[submit] missing fields');
      Alert.alert('Missing Fields', 'Please fill in Name, Gender, Date of Birth and City.');
      return;
    }
    const minPhotos = 4;
    if (photos.length < minPhotos) {
      console.log('[submit] not enough photos:', photos.length);
      Alert.alert('More Photos Required', `Please upload at least ${minPhotos} photo${minPhotos > 1 ? 's' : ''}. You have ${photos.length} so far.`);
      return;
    }
    const payload = {
      ...form,
      gender: form.gender as Gender,
      maritalStatus: (form.maritalStatus || 'NEVER_MARRIED') as MaritalStatus,
      education: (form.education || 'OTHER') as EducationLevel,
      partnerMinAge: form.partnerMinAge ? Number(form.partnerMinAge) : undefined,
      partnerMaxAge: form.partnerMaxAge ? Number(form.partnerMaxAge) : undefined,
      photos,
    } as any;

    const ok = await useConfirmStore.getState().confirm({
      title: myProfile?.id ? 'Save profile changes?' : 'Submit profile?',
      message: myProfile?.id
        ? 'Your updated matrimony profile will be saved and sent for review.'
        : 'Your matrimony profile will be submitted for verification.',
      confirmText: myProfile?.id ? 'Save' : 'Submit',
      cancelText: 'Cancel',
      isDestructive: false,
      icon: 'heart-outline',
    });
    if (!ok) return;

    try {
      if (myProfile?.id) {
        await updateMutation.mutateAsync({ id: myProfile.id, data: payload });
        router.back();
      } else {
        await createMutation.mutateAsync(payload);
        router.back();
      }
    } catch (e: any) {
      console.error('Profile save error:', JSON.stringify(e.response?.data ?? e.message));
      Alert.alert('Error', e.response?.data?.message ?? e.message ?? 'Failed to save profile');
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const inputStyle = [styles.textInput, { backgroundColor: colors.elevation1, borderColor: colors.border, color: colors.text }];

  if (profileLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.header, { backgroundColor: colors.primaryDark }]}>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: 'rgba(255,255,255,0.18)' }]} onPress={() => (router.canGoBack() ? router.back() : router.replace('/matrimony' as any))}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { backgroundColor: colors.primaryDark }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: 'rgba(255,255,255,0.18)' }]} onPress={() => (router.canGoBack() ? router.back() : router.replace('/matrimony' as any))}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{myProfile?.id ? 'Edit Profile' : 'Create Profile'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>

        {/* Approval status banner */}
        {myProfile?.id && (
          <ApprovalBanner status={myProfile.approvalStatus} rejectionReason={myProfile.rejectionReason} colors={colors} />
        )}

        {/* Photos */}
        <SectionHeader title="Profile Photos" colors={colors} />
        <View style={styles.photosRow}>
          {photos.map((p, i) => (
            <View key={i} style={styles.photoThumbWrap}>
              <Image source={{ uri: p }} style={styles.photoThumb} contentFit="cover" />
              <TouchableOpacity style={[styles.removePhotoBtn, { backgroundColor: colors.error }]} onPress={() => removePhoto(i)}>
                <Ionicons name="close" size={12} color="#fff" />
              </TouchableOpacity>
              <View style={styles.photoOrderControls}>
                <TouchableOpacity disabled={i === 0} onPress={() => movePhoto(i, -1)} style={[styles.photoOrderBtn, { opacity: i === 0 ? 0.35 : 1, backgroundColor: colors.primary }]}>
                  <Ionicons name="chevron-back" size={13} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity disabled={i === photos.length - 1} onPress={() => movePhoto(i, 1)} style={[styles.photoOrderBtn, { opacity: i === photos.length - 1 ? 0.35 : 1, backgroundColor: colors.primary }]}>
                  <Ionicons name="chevron-forward" size={13} color="#fff" />
                </TouchableOpacity>
              </View>
              {i === 0 && (
                <View style={[styles.mainPhotoBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.mainPhotoBadgeText}>Main</Text>
                </View>
              )}
            </View>
          ))}
          {photos.length < 5 && (
            <TouchableOpacity
              style={[styles.addPhotoBtn, { backgroundColor: colors.primaryContainer, borderColor: colors.primary }]}
              onPress={handlePickPhoto}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto
                ? <ActivityIndicator size="small" color={colors.primary} />
                : (
                  <>
                    <Ionicons name="camera-outline" size={24} color={colors.primary} />
                    <Text style={[styles.addPhotoText, { color: colors.primary }]}>Add Photo</Text>
                  </>
                )
              }
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.photoHint, { color: colors.textMuted }]}>
          {photos.length}/5 photos · First photo is your main profile photo · Use arrows to reorder
        </Text>
        {photos.length < 4 && (
          <View style={[styles.photoWarning, { backgroundColor: colors.errorContainer, borderColor: colors.error }]}>
            <Ionicons name="warning-outline" size={15} color={colors.error} />
            <Text style={[styles.photoWarningText, { color: colors.error }]}>
              {`Minimum 4 photos required (${4 - photos.length} more needed)`}
            </Text>
          </View>
        )}

        {/* Photo source picker sheet */}
        <Modal visible={showPhotoSheet} transparent animationType="slide">
          <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setShowPhotoSheet(false)}>
            <View style={[styles.sheetContainer, { backgroundColor: colors.surface }]}>
              <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Add Profile Photo</Text>

              <TouchableOpacity style={[styles.sheetOption, { borderBottomColor: colors.border }]} onPress={handleTakePhoto}>
                <View style={[styles.sheetIconWrap, { backgroundColor: colors.primaryContainer }]}>
                  <Ionicons name="camera" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sheetOptionTitle, { color: colors.text }]}>Take Photo</Text>
                  <Text style={[styles.sheetOptionSub, { color: colors.textMuted }]}>Use your camera</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.sheetOption, { borderBottomColor: colors.border }]} onPress={handlePickFromGallery}>
                <View style={[styles.sheetIconWrap, { backgroundColor: colors.primaryContainer }]}>
                  <Ionicons name="images" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sheetOptionTitle, { color: colors.text }]}>Choose from Gallery</Text>
                  <Text style={[styles.sheetOptionSub, { color: colors.textMuted }]}>Pick from your photos</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.sheetCancel, { backgroundColor: colors.elevation1 }]} onPress={() => setShowPhotoSheet(false)}>
                <Text style={[styles.sheetCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Personal */}
        <SectionHeader title="Personal Details" colors={colors} />

        <FieldLabel label="Full Name *" colors={colors} />
        <TextInput style={inputStyle} value={form.displayName} onChangeText={set('displayName')} placeholder="Your full name" placeholderTextColor={colors.textMuted} />

        <FieldLabel label="Gender *" colors={colors} />
        <OptionGroup options={['MALE', 'FEMALE', 'OTHER'] as Gender[]} labels={{ MALE: 'Male', FEMALE: 'Female', OTHER: 'Other' }} value={form.gender} onChange={v => setForm(f => ({ ...f, gender: v }))} colors={colors} />

        <FieldLabel label="Date of Birth *" colors={colors} />
        <TouchableOpacity style={[inputStyle, styles.dateInput, { marginBottom: 14 }]} onPress={() => setShowDatePicker(true)}>
          <Text style={{ color: form.dateOfBirth ? colors.text : colors.textMuted }}>{form.dateOfBirth || 'Select your date of birth'}</Text>
          <Ionicons name="calendar-outline" size={19} color={colors.primary} />
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={form.dateOfBirth ? new Date(`${form.dateOfBirth}T12:00:00`) : new Date(1995, 0, 1)}
            mode="date"
            maximumDate={new Date()}
            onValueChange={(_event, date) => {
              if (Platform.OS !== 'ios') setShowDatePicker(false);
              if (date) set('dateOfBirth')(date.toISOString().slice(0, 10));
            }}
            onDismiss={() => setShowDatePicker(false)}
          />
        )}
        {showDatePicker && Platform.OS === 'ios' && (
          <TouchableOpacity style={[styles.dateDoneBtn, { backgroundColor: colors.primary }]} onPress={() => setShowDatePicker(false)}>
            <Text style={styles.dateDoneBtnText}>Done</Text>
          </TouchableOpacity>
        )}

        <FieldLabel label={"Height (e.g. 5'7\")"} colors={colors} />
        <TextInput style={inputStyle} value={form.height} onChangeText={set('height')} placeholder={"5'7\""} placeholderTextColor={colors.textMuted} />

        <FieldLabel label="Marital Status" colors={colors} />
        <OptionGroup options={['NEVER_MARRIED', 'DIVORCED', 'WIDOWED', 'SEPARATED'] as MaritalStatus[]} labels={MARITAL_STATUS_LABELS} value={form.maritalStatus} onChange={v => setForm(f => ({ ...f, maritalStatus: v }))} colors={colors} />

        <FieldLabel label="Religion" colors={colors} />
        <TextInput style={inputStyle} value={form.religion} onChangeText={set('religion')} placeholder="e.g. Hindu" placeholderTextColor={colors.textMuted} />

        <FieldLabel label="Caste" colors={colors} />
        <TextInput style={inputStyle} value={form.caste} onChangeText={set('caste')} placeholder="e.g. Vokkaliga" placeholderTextColor={colors.textMuted} />

        <FieldLabel label="Mother Tongue" colors={colors} />
        <TextInput style={inputStyle} value={form.motherTongue} onChangeText={set('motherTongue')} placeholder="e.g. Kannada" placeholderTextColor={colors.textMuted} />

        {/* Education */}
        <SectionHeader title="Education & Career" colors={colors} />

        <FieldLabel label="Education" colors={colors} />
        <OptionGroup options={['HIGH_SCHOOL', 'DIPLOMA', 'BACHELORS', 'MASTERS', 'PHD', 'OTHER'] as EducationLevel[]} labels={EDUCATION_LABELS} value={form.education} onChange={v => setForm(f => ({ ...f, education: v }))} colors={colors} />

        <FieldLabel label="Education Details" colors={colors} />
        <TextInput style={inputStyle} value={form.educationDetails} onChangeText={set('educationDetails')} placeholder="e.g. B.Tech in Computer Science" placeholderTextColor={colors.textMuted} />

        <FieldLabel label="Occupation" colors={colors} />
        <TextInput style={inputStyle} value={form.occupation} onChangeText={set('occupation')} placeholder="e.g. Software Engineer" placeholderTextColor={colors.textMuted} />

        <FieldLabel label="Annual Income" colors={colors} />
        <TextInput style={inputStyle} value={form.annualIncome} onChangeText={set('annualIncome')} placeholder="e.g. 8 LPA" placeholderTextColor={colors.textMuted} />

        {/* Location */}
        <SectionHeader title="Location" colors={colors} />

        <FieldLabel label="City *" colors={colors} />
        <TextInput style={inputStyle} value={form.city} onChangeText={set('city')} placeholder="e.g. Bengaluru" placeholderTextColor={colors.textMuted} />

        <FieldLabel label="State" colors={colors} />
        <TextInput style={inputStyle} value={form.state} onChangeText={set('state')} placeholder="e.g. Karnataka" placeholderTextColor={colors.textMuted} />

        {/* About */}
        <SectionHeader title="About Me" colors={colors} />
        <TextInput
          style={[inputStyle, { height: 90, textAlignVertical: 'top' }]}
          value={form.aboutMe}
          onChangeText={set('aboutMe')}
          placeholder="Write a short description about yourself..."
          placeholderTextColor={colors.textMuted}
          multiline
        />

        {/* Partner Preferences */}
        <SectionHeader title="Partner Preferences" colors={colors} />

        <FieldLabel label="Partner Age Range" colors={colors} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TextInput style={[inputStyle, { flex: 1 }]} value={form.partnerMinAge} onChangeText={set('partnerMinAge')} placeholder="Min age" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
          <TextInput style={[inputStyle, { flex: 1 }]} value={form.partnerMaxAge} onChangeText={set('partnerMaxAge')} placeholder="Max age" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
        </View>

        <FieldLabel label="Partner Religion" colors={colors} />
        <TextInput style={inputStyle} value={form.partnerReligion} onChangeText={set('partnerReligion')} placeholder="Any" placeholderTextColor={colors.textMuted} />

        <FieldLabel label="Partner Caste" colors={colors} />
        <TextInput style={inputStyle} value={form.partnerCaste} onChangeText={set('partnerCaste')} placeholder="Any" placeholderTextColor={colors.textMuted} />

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: isPending ? 0.7 : 1 }]}
          onPress={handleSubmit}
          disabled={isPending}
        >
          {isPending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.submitBtnText}>{myProfile ? 'Save Changes ✅' : 'Create My Profile 💍'}</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function ApprovalBanner({ status, rejectionReason, colors }: { status: string | undefined; rejectionReason?: string | null; colors: any }) {
  if (!status) return null;
  const config = {
    PENDING:  { bg: '#FEF9C3', border: '#EAB308', icon: 'time-outline' as const,           text: '#92400E', label: 'Awaiting Admin Approval', sub: 'Your profile is under review and not yet visible to others.' },
    APPROVED: { bg: '#DCFCE7', border: '#22C55E', icon: 'checkmark-circle-outline' as const, text: '#166534', label: 'Profile Approved ✓',        sub: 'Your profile is live and visible to other members.' },
    REJECTED: { bg: '#FEE2E2', border: '#EF4444', icon: 'close-circle-outline' as const,    text: '#991B1B', label: 'Profile Rejected',           sub: rejectionReason ?? 'Please update your profile and resubmit.' },
  }[status];
  if (!config) return null;
  return (
    <View style={[styles.approvalBanner, { backgroundColor: config.bg, borderColor: config.border }]}>
      <Ionicons name={config.icon} size={22} color={config.text} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.approvalLabel, { color: config.text }]}>{config.label}</Text>
        <Text style={[styles.approvalSub, { color: config.text }]}>{config.sub}</Text>
      </View>
    </View>
  );
}

function SectionHeader({ title, colors }: { title: string; colors: any }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionAccent, { backgroundColor: colors.primary }]} />
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
    </View>
  );
}

function FieldLabel({ label, colors }: { label: string; colors: any }) {
  return <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },

  form: { padding: 16, paddingBottom: 50 },
  field: { marginBottom: 14 },
  fieldLabelPlaceholder: { display: 'none' },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 20, marginBottom: 14,
  },
  sectionAccent: { width: 4, height: 18, borderRadius: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },

  fieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  textInput: {
    borderRadius: 10, borderWidth: 1.5,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, marginBottom: 14,
  },

  optionGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  optionChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5,
  },
  optionChipText: { fontSize: 12, fontWeight: '600' },

  // Photos
  photosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  photoThumbWrap: { position: 'relative' },
  photoThumb: { width: 90, height: 90, borderRadius: 12 },
  removePhotoBtn: {
    position: 'absolute', top: -6, right: -6,
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  mainPhotoBadge: {
    position: 'absolute', bottom: 4, left: 4,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  mainPhotoBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  photoOrderControls: { position: 'absolute', bottom: 4, right: 4, flexDirection: 'row', gap: 3 },
  photoOrderBtn: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  addPhotoBtn: {
    width: 90, height: 90, borderRadius: 12,
    borderWidth: 2, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  addPhotoText: { fontSize: 11, fontWeight: '600' },
  photoHint: { fontSize: 11, marginBottom: 8, color: '#888' },
  photoWarning: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, marginBottom: 14,
  },
  photoWarningText: { fontSize: 12, fontWeight: '600', flex: 1 },
  dateInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateDoneBtn: { alignSelf: 'flex-end', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 8, marginBottom: 14 },
  dateDoneBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  sheetOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingBottom: 36, paddingTop: 12,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle: { fontSize: 16, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  sheetOption: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, borderBottomWidth: 1,
  },
  sheetIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  sheetOptionTitle: { fontSize: 15, fontWeight: '700' },
  sheetOptionSub: { fontSize: 12, marginTop: 2 },
  sheetCancel: {
    marginTop: 12, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
  },
  sheetCancelText: { fontSize: 15, fontWeight: '700' },

  submitBtn: {
    marginTop: 24, paddingVertical: 16, borderRadius: 14, alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 },
      android: { elevation: 6 },
    }),
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  approvalBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    padding: 14, borderRadius: 12, borderWidth: 1.5, marginBottom: 20,
  },
  approvalLabel: { fontSize: 13, fontWeight: '800', marginBottom: 3 },
  approvalSub: { fontSize: 12, lineHeight: 17 },
});
