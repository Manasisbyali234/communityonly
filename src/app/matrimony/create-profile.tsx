import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator, Alert, Modal, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useCreateMatrimonyProfileMutation, useUpdateMatrimonyProfileMutation,
  useMyMatrimonyProfileQuery, uploadMatrimonyPhoto,
  Gender, MaritalStatus, EducationLevel,
  MARITAL_STATUS_OPTIONS, MARITAL_STATUS_LABELS,
  EDUCATION_OPTIONS, EDUCATION_LABELS,
  HEIGHT_OPTIONS, BLOOD_GROUP_OPTIONS, EATING_HABITS_OPTIONS, DISABILITY_OPTIONS,
  RAASHI_OPTIONS, NAKSHATHRA_OPTIONS, GANA_OPTIONS, DOSHAM_OPTIONS, BALI_OPTIONS,
  GOTRA_LIST, EDUCATION_FIELD_OPTIONS, WORKING_WITH_OPTIONS, ANNUAL_INCOME_OPTIONS,
  FAMILY_TYPE_OPTIONS, FAMILY_VALUE_OPTIONS, FATHER_STATUS_OPTIONS, MOTHER_STATUS_OPTIONS,
  SIBLING_COUNT_OPTIONS, PHOTO_VISIBILITY_OPTIONS,
} from '../../api/matrimony';
import { useTheme } from '../../theme';
import { useConfirmStore } from '../../store/confirmStore';

const STEPS = ['Personal', 'Astrology', 'Career', 'Family', 'Photos & Consent'];

const INITIAL_FORM = {
  // Personal
  displayName: '', gender: '' as Gender | '',
  dateOfBirth: '', height: '', maritalStatus: '' as MaritalStatus | '',
  bloodGroup: '', eatingHabits: '', disability: '',
  religion: '', caste: '', motherTongue: '',
  // Astrology
  birthTime: '', placeOfBirth: '',
  raashi: '', nakshathra: '', gana: '', gotra: '', dosham: '', bali: '',
  // Career
  education: '' as EducationLevel | '', educationField: '',
  workingWith: '', designation: '', workLocation: '', annualIncome: '',
  occupation: '',
  // Family
  familyType: '', familyValue: '', familyLocation: '',
  fatherName: '', fatherStatus: '', motherName: '', motherStatus: '',
  brothers: '', brothersMarried: '', sisters: '', sistersMarried: '',
  ancestralOrigin: '',
  // Photos
  photoVisibility: '',
};

// ── Small reusable components ─────────────────────────────────────────────────

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

function Dropdown({
  label, options, value, onChange, colors, placeholder,
}: {
  label: string; options: string[]; value: string;
  onChange: (v: string) => void; colors: any; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const inputStyle = [styles.textInput, { backgroundColor: colors.elevation1, borderColor: colors.border, color: colors.text }];
  return (
    <>
      <FieldLabel label={label} colors={colors} />
      <TouchableOpacity style={[inputStyle, styles.dropdownBtn]} onPress={() => setOpen(true)}>
        <Text style={{ color: value ? colors.text : colors.textMuted, flex: 1, fontSize: 14 }}>
          {value || placeholder || `Select ${label}`}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide">
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={[styles.sheetContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{label}</Text>
            <ScrollView style={{ maxHeight: 340 }}>
              {options.map(o => (
                <TouchableOpacity
                  key={o}
                  style={[styles.sheetRow, { borderBottomColor: colors.border, backgroundColor: value === o ? colors.primaryContainer : 'transparent' }]}
                  onPress={() => { onChange(o); setOpen(false); }}
                >
                  <Text style={{ color: value === o ? colors.primary : colors.text, fontSize: 14, fontWeight: value === o ? '700' : '400' }}>{o}</Text>
                  {value === o && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function SearchableDropdown({
  label, options, value, onChange, colors,
}: {
  label: string; options: string[]; value: string;
  onChange: (v: string) => void; colors: any;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filtered = query.length > 0 ? options.filter(o => o.toLowerCase().includes(query.toLowerCase())) : options;
  const inputStyle = [styles.textInput, { backgroundColor: colors.elevation1, borderColor: colors.border, color: colors.text }];
  return (
    <>
      <FieldLabel label={label} colors={colors} />
      <TouchableOpacity style={[inputStyle, styles.dropdownBtn]} onPress={() => { setQuery(''); setOpen(true); }}>
        <Text style={{ color: value ? colors.text : colors.textMuted, flex: 1, fontSize: 14 }}>
          {value || `Search ${label}...`}
        </Text>
        <Ionicons name="search" size={16} color={colors.textMuted} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide">
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={[styles.sheetContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{label}</Text>
            <TextInput
              style={[inputStyle, { marginHorizontal: 0, marginBottom: 8 }]}
              value={query}
              onChangeText={setQuery}
              placeholder={`Search ${label}...`}
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <FlatList
              data={filtered}
              keyExtractor={i => i}
              style={{ maxHeight: 280 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.sheetRow, { borderBottomColor: colors.border, backgroundColor: value === item ? colors.primaryContainer : 'transparent' }]}
                  onPress={() => { onChange(item); setOpen(false); }}
                >
                  <Text style={{ color: value === item ? colors.primary : colors.text, fontSize: 14, fontWeight: value === item ? '700' : '400' }}>{item}</Text>
                  {value === item && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function ChipGroup({
  label, options, value, onChange, colors,
}: {
  label: string; options: string[]; value: string;
  onChange: (v: string) => void; colors: any;
}) {
  return (
    <>
      <FieldLabel label={label} colors={colors} />
      <View style={styles.chipRow}>
        {options.map(o => (
          <TouchableOpacity
            key={o}
            style={[styles.chip, { backgroundColor: value === o ? colors.primary : colors.primaryContainer, borderColor: colors.primary }]}
            onPress={() => onChange(o)}
          >
            <Text style={[styles.chipText, { color: value === o ? '#fff' : colors.primary }]}>{o}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
}

function NumberSelector({
  label, options, value, onChange, colors,
}: {
  label: string; options: string[]; value: string;
  onChange: (v: string) => void; colors: any;
}) {
  return (
    <>
      <FieldLabel label={label} colors={colors} />
      <View style={[styles.chipRow, { marginBottom: 14 }]}>
        {options.map(o => (
          <TouchableOpacity
            key={o}
            style={[styles.numBtn, { backgroundColor: value === o ? colors.primary : colors.elevation1, borderColor: colors.border }]}
            onPress={() => onChange(o)}
          >
            <Text style={{ color: value === o ? '#fff' : colors.text, fontSize: 13, fontWeight: '700' }}>{o}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
}

function ApprovalBanner({ status, rejectionReason, colors }: { status: string | undefined; rejectionReason?: string | null; colors: any }) {
  if (!status) return null;
  const config = {
    PENDING:  { bg: '#FEF9C3', border: '#EAB308', icon: 'time-outline' as const,            text: '#92400E', label: 'Awaiting Admin Approval', sub: 'Your profile is under review.' },
    APPROVED: { bg: '#DCFCE7', border: '#22C55E', icon: 'checkmark-circle-outline' as const, text: '#166534', label: 'Profile Approved ✓',        sub: 'Your profile is live.' },
    REJECTED: { bg: '#FEE2E2', border: '#EF4444', icon: 'close-circle-outline' as const,    text: '#991B1B', label: 'Profile Rejected',           sub: rejectionReason ?? 'Please update and resubmit.' },
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

export default function CreateMatrimonyProfile() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: myProfile, isLoading: profileLoading } = useMyMatrimonyProfileQuery();
  const createMutation = useCreateMatrimonyProfileMutation();
  const updateMutation = useUpdateMatrimonyProfileMutation();
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showPhotoSheet, setShowPhotoSheet] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [consents, setConsents] = useState({ accurate: false, terms: false, privacy: false, display: false });
  const [form, setForm] = useState(INITIAL_FORM);

  useEffect(() => {
    if (!myProfile?.id) return;
    setPhotos(myProfile.photos ?? []);
    setForm({
      displayName: myProfile.displayName ?? '',
      gender: (myProfile.gender ?? '') as Gender | '',
      dateOfBirth: myProfile.dateOfBirth ? myProfile.dateOfBirth.toString().slice(0, 10) : '',
      height: myProfile.height ?? '',
      maritalStatus: (myProfile.maritalStatus ?? '') as MaritalStatus | '',
      bloodGroup: myProfile.bloodGroup ?? '',
      eatingHabits: myProfile.eatingHabits ?? '',
      disability: myProfile.disability ?? '',
      religion: myProfile.religion ?? '',
      caste: myProfile.caste ?? '',
      motherTongue: myProfile.motherTongue ?? '',
      birthTime: myProfile.birthTime ?? '',
      placeOfBirth: myProfile.placeOfBirth ?? '',
      raashi: myProfile.raashi ?? '',
      nakshathra: myProfile.nakshathra ?? '',
      gana: myProfile.gana ?? '',
      gotra: myProfile.gotra ?? '',
      dosham: myProfile.dosham ?? '',
      bali: myProfile.bali ?? '',
      education: (myProfile.education ?? '') as EducationLevel | '',
      educationField: myProfile.educationField ?? '',
      workingWith: myProfile.workingWith ?? '',
      designation: myProfile.designation ?? '',
      workLocation: myProfile.workLocation ?? '',
      annualIncome: myProfile.annualIncome ?? '',
      occupation: myProfile.occupation ?? '',
      familyType: myProfile.familyType ?? '',
      familyValue: myProfile.familyValue ?? '',
      familyLocation: myProfile.familyLocation ?? '',
      fatherName: myProfile.fatherName ?? '',
      fatherStatus: myProfile.fatherStatus ?? '',
      motherName: myProfile.motherName ?? '',
      motherStatus: myProfile.motherStatus ?? '',
      brothers: myProfile.brothers?.toString() ?? '',
      brothersMarried: myProfile.brothersMarried?.toString() ?? '',
      sisters: myProfile.sisters?.toString() ?? '',
      sistersMarried: myProfile.sistersMarried?.toString() ?? '',
      ancestralOrigin: myProfile.ancestralOrigin ?? '',
      photoVisibility: myProfile.photoVisibility ?? '',
    });
  }, [myProfile]);

  const set = (key: keyof typeof form) => (val: string) => setForm(f => ({ ...f, [key]: val }));

  const uploadAssets = async (assets: ImagePicker.ImagePickerAsset[]) => {
    const selected = assets.slice(0, Math.max(0, 5 - photos.length));
    if (!selected.length) return;
    setUploadingPhoto(true);
    try {
      const urls = (await Promise.all(selected.map(async (asset) => {
        const filename = asset.fileName ?? asset.uri.split('/').pop() ?? 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const mimeType = asset.mimeType ?? (match ? `image/${match[1].toLowerCase().replace('jpg','jpeg')}` : 'image/jpeg');
        return uploadMatrimonyPhoto(asset.uri, filename, mimeType);
      }))).filter((u): u is string => !!u);
      if (urls.length) setPhotos(p => [...p, ...urls].slice(0, 5));
    } catch (e: any) {
      Alert.alert('Upload failed', e?.response?.data?.message ?? e?.message ?? 'Could not upload.');
    } finally { setUploadingPhoto(false); }
  };

  const handlePickFromGallery = async () => {
    setShowPhotoSheet(false);
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*'; input.multiple = true;
      input.onchange = async (e: any) => {
        const files = Array.from(e.target.files ?? []).slice(0, Math.max(0, 5 - photos.length)) as File[];
        if (!files.length) return;
        const uris = files.map(f => URL.createObjectURL(f));
        setUploadingPhoto(true);
        try {
          const urls = (await Promise.all(files.map((f, i) => uploadMatrimonyPhoto(uris[i], f.name, f.type || 'image/jpeg')))).filter((u): u is string => !!u);
          if (urls.length) setPhotos(p => [...p, ...urls].slice(0, 5));
        } finally { setUploadingPhoto(false); uris.forEach(u => URL.revokeObjectURL(u)); }
      };
      input.click(); return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: Math.max(1, 5 - photos.length), quality: 0.85 });
    if (!result.canceled && result.assets?.length) await uploadAssets(result.assets);
  };

  const handleTakePhoto = async () => {
    setShowPhotoSheet(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow camera access.'); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.85 });
    if (!result.canceled && result.assets?.length) await uploadAssets(result.assets);
  };

  const removePhoto = (idx: number) => setPhotos(p => p.filter((_, i) => i !== idx));
  const movePhoto = (idx: number, dir: -1 | 1) => setPhotos(cur => {
    const next = idx + dir; if (next < 0 || next >= cur.length) return cur;
    const r = [...cur]; [r[idx], r[next]] = [r[next], r[idx]]; return r;
  });

  const handleSubmit = async () => {
    if (photos.length < 4) { Alert.alert('More Photos Required', `Please upload at least 4 photos. You have ${photos.length}.`); return; }
    if (!consents.accurate || !consents.terms || !consents.privacy || !consents.display) {
      const missing = ['accurate','terms','privacy','display'].filter(k => !consents[k as keyof typeof consents]);
      Alert.alert('Declaration Required', `Please check all declaration boxes. Missing: ${missing.join(', ')}`); return;
    }
    const ok = await useConfirmStore.getState().confirm({
      title: myProfile?.id ? 'Save profile changes?' : 'Submit profile?',
      message: myProfile?.id ? 'Your updated profile will be sent for review.' : 'Your matrimony profile will be submitted for verification.',
      confirmText: myProfile?.id ? 'Save' : 'Submit',
      cancelText: 'Cancel', isDestructive: false, icon: 'heart-outline',
    });
    if (!ok) return;
    const toNum = (v: string) => { const n = parseInt(v); return isNaN(n) ? undefined : n; };
    const payload: any = {
      ...form,
      brothers: toNum(form.brothers), brothersMarried: toNum(form.brothersMarried),
      sisters: toNum(form.sisters), sistersMarried: toNum(form.sistersMarried),
      photos,
    };
    try {
      if (myProfile?.id) { await updateMutation.mutateAsync({ id: myProfile.id, data: payload }); }
      else { await createMutation.mutateAsync(payload); }
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? e?.message ?? 'Failed to save profile');
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const inputStyle = [styles.textInput, { backgroundColor: colors.elevation1, borderColor: colors.border, color: colors.text }];

  if (profileLoading) return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { backgroundColor: colors.primaryDark }]}>
        <Text style={styles.headerTitle}>Loading...</Text>
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { backgroundColor: colors.primaryDark }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: 'rgba(255,255,255,0.18)' }]}
          onPress={() => step > 0 ? setStep(s => s - 1) : (router.canGoBack() ? router.back() : router.replace('/matrimony' as any))}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{myProfile?.id ? 'Edit Profile' : 'Create Profile'}</Text>
          <Text style={styles.headerSub}>Step {step + 1} of {STEPS.length} · {STEPS[step]}</Text>
        </View>
      </View>
      <View style={[styles.stepBar, { backgroundColor: colors.surface }]}>
        {STEPS.map((_, i) => <View key={i} style={[styles.stepDot, { backgroundColor: i <= step ? colors.primary : colors.border }]} />)}
      </View>
      <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {myProfile?.id && step === 0 && <ApprovalBanner status={myProfile.approvalStatus} rejectionReason={myProfile.rejectionReason} colors={colors} />}

        {step === 0 && (<>
          <SectionHeader title="Personal Details" colors={colors} />
          <FieldLabel label="Full Name *" colors={colors} />
          <TextInput style={inputStyle} value={form.displayName} onChangeText={set('displayName')} placeholder="Your full name" placeholderTextColor={colors.textMuted} />
          <ChipGroup label="Gender *" options={['MALE','FEMALE','OTHER']} value={form.gender} onChange={v => setForm(f => ({ ...f, gender: v as Gender }))} colors={colors} />
          <FieldLabel label="Date of Birth *" colors={colors} />
          <TouchableOpacity style={[inputStyle, styles.rowBetween, { marginBottom: 14 }]} onPress={() => setShowDatePicker(true)}>
            <Text style={{ color: form.dateOfBirth ? colors.text : colors.textMuted }}>{form.dateOfBirth || 'Select date of birth'}</Text>
            <Ionicons name="calendar-outline" size={19} color={colors.primary} />
          </TouchableOpacity>
          {showDatePicker && <DateTimePicker value={form.dateOfBirth ? new Date(form.dateOfBirth + 'T12:00:00') : new Date(1995,0,1)} mode="date" maximumDate={new Date()} onValueChange={(_e: any, d?: Date) => { if (Platform.OS !== 'ios') setShowDatePicker(false); if (d) set('dateOfBirth')(d.toISOString().slice(0,10)); }} onDismiss={() => setShowDatePicker(false)} />}
          {showDatePicker && Platform.OS === 'ios' && <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.primary }]} onPress={() => setShowDatePicker(false)}><Text style={styles.doneBtnText}>Done</Text></TouchableOpacity>}
          <Dropdown label="Marital Status *" options={MARITAL_STATUS_OPTIONS.map(o => MARITAL_STATUS_LABELS[o])} value={form.maritalStatus ? MARITAL_STATUS_LABELS[form.maritalStatus as MaritalStatus] : ''} onChange={v => { const k = MARITAL_STATUS_OPTIONS.find(o => MARITAL_STATUS_LABELS[o] === v); if (k) setForm(f => ({ ...f, maritalStatus: k })); }} colors={colors} />
          <Dropdown label="Height *" options={HEIGHT_OPTIONS} value={form.height} onChange={set('height')} colors={colors} />
          <Dropdown label="Blood Group *" options={BLOOD_GROUP_OPTIONS} value={form.bloodGroup} onChange={set('bloodGroup')} colors={colors} />
          <Dropdown label="Eating Habits *" options={EATING_HABITS_OPTIONS} value={form.eatingHabits} onChange={set('eatingHabits')} colors={colors} />
          <Dropdown label="Disability *" options={DISABILITY_OPTIONS} value={form.disability} onChange={set('disability')} colors={colors} />
          <FieldLabel label="Religion" colors={colors} />
          <TextInput style={inputStyle} value={form.religion} onChangeText={set('religion')} placeholder="e.g. Hindu" placeholderTextColor={colors.textMuted} />
          <FieldLabel label="Caste" colors={colors} />
          <TextInput style={inputStyle} value={form.caste} onChangeText={set('caste')} placeholder="e.g. Gowda" placeholderTextColor={colors.textMuted} />
          <FieldLabel label="Mother Tongue" colors={colors} />
          <TextInput style={inputStyle} value={form.motherTongue} onChangeText={set('motherTongue')} placeholder="e.g. Kannada" placeholderTextColor={colors.textMuted} />
        </>)}

        {step === 1 && (<>
          <SectionHeader title="Astrology & Birth Details" colors={colors} />
          <FieldLabel label="Birth Time *" colors={colors} />
          <TouchableOpacity style={[inputStyle, styles.rowBetween, { marginBottom: 14 }]} onPress={() => setShowTimePicker(true)}>
            <Text style={{ color: form.birthTime ? colors.text : colors.textMuted }}>{form.birthTime || 'Select birth time'}</Text>
            <Ionicons name="time-outline" size={19} color={colors.primary} />
          </TouchableOpacity>
          {showTimePicker && <DateTimePicker value={(() => { if (form.birthTime) { const [h,m] = form.birthTime.split(':').map(Number); const d = new Date(); d.setHours(h,m); return d; } return new Date(); })()} mode="time" onValueChange={(_e: any, d?: Date) => { if (Platform.OS !== 'ios') setShowTimePicker(false); if (d) set('birthTime')(String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0')); }} onDismiss={() => setShowTimePicker(false)} />}
          {showTimePicker && Platform.OS === 'ios' && <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.primary }]} onPress={() => setShowTimePicker(false)}><Text style={styles.doneBtnText}>Done</Text></TouchableOpacity>}
          <FieldLabel label="Place of Birth *" colors={colors} />
          <TextInput style={inputStyle} value={form.placeOfBirth} onChangeText={set('placeOfBirth')} placeholder="e.g. Mysuru, Karnataka" placeholderTextColor={colors.textMuted} />
          <Dropdown label="Raashi *" options={RAASHI_OPTIONS} value={form.raashi} onChange={set('raashi')} colors={colors} />
          <Dropdown label="Nakshathra *" options={NAKSHATHRA_OPTIONS} value={form.nakshathra} onChange={set('nakshathra')} colors={colors} />
          <Dropdown label="Gana *" options={GANA_OPTIONS} value={form.gana} onChange={set('gana')} colors={colors} />
          <SearchableDropdown label="Gotra *" options={GOTRA_LIST} value={form.gotra} onChange={set('gotra')} colors={colors} />
          <Dropdown label="Dosham *" options={DOSHAM_OPTIONS} value={form.dosham} onChange={set('dosham')} colors={colors} />
          <Dropdown label="Bali" options={BALI_OPTIONS} value={form.bali} onChange={set('bali')} colors={colors} />
        </>)}

        {step === 2 && (<>
          <SectionHeader title="Career & Education" colors={colors} />
          <Dropdown label="Highest Education *" options={EDUCATION_OPTIONS.map(o => EDUCATION_LABELS[o])} value={form.education ? EDUCATION_LABELS[form.education as EducationLevel] : ''} onChange={v => { const k = EDUCATION_OPTIONS.find(o => EDUCATION_LABELS[o] === v); if (k) setForm(f => ({ ...f, education: k })); }} colors={colors} />
          <Dropdown label="Education Field *" options={EDUCATION_FIELD_OPTIONS} value={form.educationField} onChange={set('educationField')} colors={colors} />
          <Dropdown label="Working With *" options={WORKING_WITH_OPTIONS} value={form.workingWith} onChange={set('workingWith')} colors={colors} />
          <FieldLabel label="Designation *" colors={colors} />
          <TextInput style={inputStyle} value={form.designation} onChangeText={set('designation')} placeholder="e.g. Software Engineer" placeholderTextColor={colors.textMuted} />
          <FieldLabel label="Occupation" colors={colors} />
          <TextInput style={inputStyle} value={form.occupation} onChangeText={set('occupation')} placeholder="e.g. IT Professional" placeholderTextColor={colors.textMuted} />
          <FieldLabel label="Work Location *" colors={colors} />
          <TextInput style={inputStyle} value={form.workLocation} onChangeText={set('workLocation')} placeholder="e.g. Bengaluru" placeholderTextColor={colors.textMuted} />
          <Dropdown label="Annual Income *" options={ANNUAL_INCOME_OPTIONS} value={form.annualIncome} onChange={set('annualIncome')} colors={colors} />
        </>)}

        {step === 3 && (<>
          <SectionHeader title="Family Details" colors={colors} />
          <Dropdown label="Family Type *" options={FAMILY_TYPE_OPTIONS} value={form.familyType} onChange={set('familyType')} colors={colors} />
          <Dropdown label="Family Value *" options={FAMILY_VALUE_OPTIONS} value={form.familyValue} onChange={set('familyValue')} colors={colors} />
          <FieldLabel label="Family Location *" colors={colors} />
          <TextInput style={inputStyle} value={form.familyLocation} onChangeText={set('familyLocation')} placeholder="e.g. Mysuru, Karnataka" placeholderTextColor={colors.textMuted} />
          <FieldLabel label="Father's Name *" colors={colors} />
          <TextInput style={inputStyle} value={form.fatherName} onChangeText={set('fatherName')} placeholder="Father's full name" placeholderTextColor={colors.textMuted} />
          <Dropdown label="Father's Status *" options={FATHER_STATUS_OPTIONS} value={form.fatherStatus} onChange={set('fatherStatus')} colors={colors} />
          <FieldLabel label="Mother's Name" colors={colors} />
          <TextInput style={inputStyle} value={form.motherName} onChangeText={set('motherName')} placeholder="Mother's full name" placeholderTextColor={colors.textMuted} />
          <Dropdown label="Mother's Status *" options={MOTHER_STATUS_OPTIONS} value={form.motherStatus} onChange={set('motherStatus')} colors={colors} />
          <NumberSelector label="Brothers *" options={SIBLING_COUNT_OPTIONS} value={form.brothers} onChange={set('brothers')} colors={colors} />
          <NumberSelector label="Brothers Married *" options={SIBLING_COUNT_OPTIONS} value={form.brothersMarried} onChange={set('brothersMarried')} colors={colors} />
          <NumberSelector label="Sisters *" options={SIBLING_COUNT_OPTIONS} value={form.sisters} onChange={set('sisters')} colors={colors} />
          <NumberSelector label="Sisters Married *" options={SIBLING_COUNT_OPTIONS} value={form.sistersMarried} onChange={set('sistersMarried')} colors={colors} />
          <FieldLabel label="Ancestral / Family Origin *" colors={colors} />
          <TextInput style={inputStyle} value={form.ancestralOrigin} onChangeText={set('ancestralOrigin')} placeholder="e.g. Kodagu, Karnataka" placeholderTextColor={colors.textMuted} />
        </>)}

        {step === 4 && (<>
          <SectionHeader title="Profile Photos" colors={colors} />
          <View style={styles.photosRow}>
            {photos.map((p, i) => (
              <View key={i} style={styles.photoWrap}>
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
                {i === 0 && <View style={[styles.mainBadge, { backgroundColor: colors.primary }]}><Text style={styles.mainBadgeText}>Main</Text></View>}
              </View>
            ))}
            {photos.length < 5 && (
              <TouchableOpacity style={[styles.addPhotoBtn, { backgroundColor: colors.primaryContainer, borderColor: colors.primary }]} onPress={() => Platform.OS === 'web' ? handlePickFromGallery() : setShowPhotoSheet(true)} disabled={uploadingPhoto}>
                {uploadingPhoto ? <ActivityIndicator size="small" color={colors.primary} /> : <><Ionicons name="camera-outline" size={24} color={colors.primary} /><Text style={[styles.addPhotoText, { color: colors.primary }]}>Add Photo</Text></>}
              </TouchableOpacity>
            )}
          </View>
          <Text style={[styles.photoHint, { color: colors.textMuted }]}>{photos.length}/5 photos · First photo is your main profile photo</Text>
          {photos.length < 4 && (
            <View style={[styles.photoWarning, { backgroundColor: colors.errorContainer, borderColor: colors.error }]}>
              <Ionicons name="warning-outline" size={15} color={colors.error} />
              <Text style={[styles.photoWarningText, { color: colors.error }]}>{`Minimum 4 photos required (${4 - photos.length} more needed)`}</Text>
            </View>
          )}
          <Dropdown label="Photo Visibility *" options={PHOTO_VISIBILITY_OPTIONS} value={form.photoVisibility} onChange={set('photoVisibility')} colors={colors} />
          <SectionHeader title="Declaration & Consent" colors={colors} />
          {(['accurate','terms','privacy','display'] as (keyof typeof consents)[]).map((key, idx) => {
            const labels = ['I confirm that the information provided is accurate.','I agree to the Terms & Conditions.','I agree to the Privacy Policy.','I consent to my profile being displayed to registered Matrimony members.'];
            return (
              <TouchableOpacity key={key} style={styles.consentRow} onPress={() => setConsents(c => ({ ...c, [key]: !c[key] }))}>
                <View style={[styles.checkbox, { borderColor: colors.primary, backgroundColor: consents[key] ? colors.primary : 'transparent' }]}>
                  {consents[key] && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={[styles.consentText, { color: colors.text }]}>{labels[idx]}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: isPending ? 0.7 : 1 }]} onPress={handleSubmit} disabled={isPending}>
            {isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitBtnText}>{myProfile?.id ? 'Save Changes' : 'Submit Matrimony Profile'}</Text>}
          </TouchableOpacity>
        </>)}

        {step < 4 && (
          <TouchableOpacity style={[styles.nextBtn, { backgroundColor: colors.primary }]} onPress={() => setStep(s => s + 1)}>
            <Text style={styles.nextBtnText}>Next: {STEPS[step + 1]} →</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal visible={showPhotoSheet} transparent animationType="slide">
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setShowPhotoSheet(false)}>
          <View style={[styles.sheetContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Add Profile Photo</Text>
            <TouchableOpacity style={[styles.sheetRow, { borderBottomColor: colors.border }]} onPress={handleTakePhoto}>
              <View style={[styles.sheetIconWrap, { backgroundColor: colors.primaryContainer }]}><Ionicons name="camera" size={22} color={colors.primary} /></View>
              <Text style={[styles.sheetOptionTitle, { color: colors.text }]}>Take Photo</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sheetRow, { borderBottomColor: colors.border }]} onPress={handlePickFromGallery}>
              <View style={[styles.sheetIconWrap, { backgroundColor: colors.primaryContainer }]}><Ionicons name="images" size={22} color={colors.primary} /></View>
              <Text style={[styles.sheetOptionTitle, { color: colors.text }]}>Choose from Gallery</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sheetCancel, { backgroundColor: colors.elevation1 }]} onPress={() => setShowPhotoSheet(false)}>
              <Text style={[styles.sheetCancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  stepBar: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 10 },
  stepDot: { width: 28, height: 4, borderRadius: 2 },
  form: { padding: 16, paddingBottom: 50 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 14 },
  sectionAccent: { width: 4, height: 18, borderRadius: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  textInput: { borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 14 },
  dropdownBtn: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  chipText: { fontSize: 12, fontWeight: '600' },
  numBtn: { width: 44, height: 44, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  doneBtn: { alignSelf: 'flex-end', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 8, marginBottom: 14 },
  doneBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  photosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  photoWrap: { position: 'relative' },
  photoThumb: { width: 90, height: 90, borderRadius: 12 },
  removePhotoBtn: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  mainBadge: { position: 'absolute', bottom: 4, left: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  mainBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  photoOrderControls: { position: 'absolute', bottom: 4, right: 4, flexDirection: 'row', gap: 3 },
  photoOrderBtn: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  addPhotoBtn: { width: 90, height: 90, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  addPhotoText: { fontSize: 11, fontWeight: '600' },
  photoHint: { fontSize: 11, marginBottom: 8 },
  photoWarning: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, marginBottom: 14 },
  photoWarningText: { fontSize: 12, fontWeight: '600', flex: 1 },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  consentText: { flex: 1, fontSize: 13, lineHeight: 19 },
  nextBtn: { marginTop: 24, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  submitBtn: { marginTop: 24, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  approvalBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1.5, marginBottom: 20 },
  approvalLabel: { fontSize: 13, fontWeight: '800', marginBottom: 3 },
  approvalSub: { fontSize: 12, lineHeight: 17 },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheetContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingBottom: 36, paddingTop: 12 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 16, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1 },
  sheetIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sheetOptionTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  sheetCancel: { marginTop: 12, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  sheetCancelText: { fontSize: 15, fontWeight: '700' },
});
