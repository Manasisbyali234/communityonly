import React, { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, Image,
  TextInput, ActivityIndicator, Modal, Platform, Pressable, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { confirmAction } from '../../store/confirmStore';
import {
  BUSINESS_CATEGORIES, useSubmitBusinessMutation,
  useUpdateBusinessMutation, useBusinessQuery, Business, BusinessSubmission,
} from '../../api/business';
import { pickImage, PickedImage, uploadImage } from '../../utils/imagePicker';

function FormSection({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.formSection, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
      <View style={styles.formSectionHeader}>
        <Ionicons name={icon as any} size={18} color={colors.primary} />
        <Text style={[styles.formSectionTitle, { color: colors.text }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function FormField({
  label, required, value, onChangeText, placeholder, multiline, keyboardType, autoCapitalize,
}: {
  label: string; required?: boolean; value: string; onChangeText: (t: string) => void;
  placeholder?: string; multiline?: boolean; keyboardType?: any; autoCapitalize?: any;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
        {label} {required && <Text style={{ color: '#EF4444' }}>*</Text>}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        style={[
          styles.fieldInput,
          multiline && styles.fieldInputMulti,
          { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border },
        ]}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

function CategoryPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const { colors, isDark } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
        Business Category <Text style={{ color: '#EF4444' }}>*</Text>
      </Text>
      <TouchableOpacity
        style={[styles.fieldInput, { backgroundColor: colors.inputBg, borderColor: colors.border, flexDirection: 'row', alignItems: 'center' }]}
        onPress={() => setOpen(true)}
      >
        <Text style={[{ flex: 1, fontSize: 15 }, { color: value ? colors.text : colors.textMuted }]}>
          {value || 'Select a category...'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.pickerOverlay} onPress={() => setOpen(false)}>
          <Pressable style={[styles.pickerSheet, { backgroundColor: colors.cardBg }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Category</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {BUSINESS_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.pickerRow,
                    {
                      backgroundColor: value === cat
                        ? (isDark ? 'rgba(45,106,45,0.2)' : '#F4F9F4')
                        : 'transparent',
                    },
                  ]}
                  onPress={() => { onChange(cat); setOpen(false); }}
                >
                  <Text style={[styles.pickerRowText, { color: value === cat ? colors.primary : colors.text }]}>{cat}</Text>
                  {value === cat && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// Preview card
function PreviewCard({ data, logoUri, colors, isDark }: { data: Partial<Business>; logoUri?: string | null; colors: any; isDark: boolean }) {
  return (
    <View style={[styles.previewCard, { backgroundColor: colors.cardBg, borderColor: colors.primary }]}>
      <View style={styles.previewHeader}>
        {logoUri ? (
          <Image source={{ uri: logoUri }} style={[styles.previewLogo, { borderColor: colors.border }]} />
        ) : (
          <View style={[styles.previewLogo, { backgroundColor: isDark ? 'rgba(45,106,45,0.2)' : colors.primaryContainer }]}>
            <Ionicons name="storefront" size={26} color={colors.primary} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.previewBizName, { color: colors.text }]} numberOfLines={1}>
            {data.businessName || 'Your Business Name'}
          </Text>
          <Text style={[styles.previewOwner, { color: colors.textSecondary }]}>
            {data.ownerName || 'Owner Name'}
          </Text>
        </View>
      </View>
      {data.category && (
        <View style={[styles.previewCat, { backgroundColor: isDark ? 'rgba(45,106,45,0.15)' : '#F4F9F4' }]}>
          <Text style={[styles.previewCatText, { color: colors.primary }]}>{data.category}</Text>
        </View>
      )}
      {data.description && (
        <Text style={[styles.previewDesc, { color: colors.textSecondary }]} numberOfLines={2}>
          {data.description}
        </Text>
      )}
      {data.location && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Ionicons name="location-outline" size={12} color={colors.textMuted} />
          <Text style={[styles.previewLocation, { color: colors.textMuted }]}>{data.location}</Text>
        </View>
      )}
    </View>
  );
}

export default function SubmitBusinessScreen() {
  const { id: editId } = useLocalSearchParams<{ id?: string }>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.showToast);

  const { data: existingBusiness } = useBusinessQuery(editId ?? '');

  const submitMutation = useSubmitBusinessMutation();
  const updateMutation = useUpdateBusinessMutation();

  const isEdit = !!editId;

  const [form, setForm] = useState({
    businessName: '',
    ownerName: user?.displayName ?? '',
    category: '',
    description: '',
    productsServices: '',
    location: '',
    address: '',
    website: '',
    whatsapp: '',
    phone: '',
    email: '',
    offers: '',
  });
  const [showPreview, setShowPreview] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<PickedImage | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Prefill on edit
  React.useEffect(() => {
    if (existingBusiness && isEdit) {
      setForm({
        businessName: existingBusiness.businessName ?? '',
        ownerName: existingBusiness.ownerName ?? user?.displayName ?? '',
        category: existingBusiness.category ?? '',
        description: existingBusiness.description ?? '',
        productsServices: existingBusiness.productsServices ?? '',
        location: existingBusiness.location ?? '',
        address: existingBusiness.address ?? '',
        website: existingBusiness.website ?? '',
        whatsapp: existingBusiness.whatsapp ?? '',
        phone: existingBusiness.phone ?? '',
        email: existingBusiness.email ?? '',
        offers: existingBusiness.offers ?? '',
      });
      setLogoUrl(existingBusiness.logoUrl ?? null);
      setProfilePhoto(null);
    }
  }, [existingBusiness]);

  const setField = useCallback((key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const buildSubmission = (submittedLogoUrl: string | null): BusinessSubmission => ({
    businessName: form.businessName.trim(),
    category: form.category,
    description: form.description.trim(),
    productsServices: form.productsServices.trim(),
    location: form.location.trim(),
    address: form.address.trim() || undefined,
    website: form.website.trim() || undefined,
    whatsapp: form.whatsapp.trim() || undefined,
    phone: form.phone.trim() || undefined,
    email: form.email.trim() || undefined,
    offers: form.offers.trim() || undefined,
    photos: [],
    ...(isEdit ? { logoUrl: submittedLogoUrl } : submittedLogoUrl ? { logoUrl: submittedLogoUrl } : {}),
  });

  const handlePickProfilePhoto = async () => {
    try {
      const picked = await pickImage({ aspect: [1, 1] });
      if (picked) setProfilePhoto(picked);
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Unable to open your photo library. Please try again.';
      showToast(message, 'error');
    }
  };

  const handleRemoveProfilePhoto = () => {
    setProfilePhoto(null);
    setLogoUrl(null);
  };

  const displayedLogoUri = profilePhoto?.localUri ?? logoUrl;

  const validate = () => {
    if (!form.businessName.trim()) { showToast('Business Name is required.', 'error'); return false; }
    if (!form.ownerName.trim()) { showToast('Owner Name is required.', 'error'); return false; }
    if (!form.category) { showToast('Please select a Business Category.', 'error'); return false; }
    if (!form.productsServices.trim()) { showToast('Products / Services is required.', 'error'); return false; }
    if (!form.location.trim()) { showToast('Location is required.', 'error'); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const confirmed = await confirmAction({
      title: isEdit ? 'Resubmit for Approval?' : 'Submit Business for Approval?',
      message: isEdit
        ? 'Your updated business information will be sent to the administrator for review.'
        : 'Your business will be sent to the community administrator for review. It will be visible in the Business Directory only after approval.',
      confirmText: isEdit ? 'Resubmit' : 'Submit',
      isDestructive: false,
      icon: 'storefront-outline',
    });

    if (!confirmed) return;

    try {
      let submittedLogoUrl = logoUrl;
      if (profilePhoto) {
        setIsUploadingPhoto(true);
        const uploadedUrl = await uploadImage(profilePhoto);
        if (!uploadedUrl) throw new Error('The business photo could not be uploaded.');
        submittedLogoUrl = uploadedUrl;
        setLogoUrl(uploadedUrl);
        setProfilePhoto(null);
      }
      const submission = buildSubmission(submittedLogoUrl);
      if (isEdit && editId) {
        await updateMutation.mutateAsync({ id: editId, data: submission });
      } else {
        await submitMutation.mutateAsync(submission);
      }
      router.replace('/business/my-businesses' as any);
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to submit. Please try again.';
      showToast(message, 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const isPending = submitMutation.isPending || updateMutation.isPending || isUploadingPhoto;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.primaryContainer }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={19} color={colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isEdit ? 'Edit Business' : 'Add My Business'}
          </Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            {isEdit ? 'Edit and resubmit for approval' : 'Submit for admin approval'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.previewBtn, { backgroundColor: isDark ? 'rgba(45,106,45,0.15)' : colors.primaryContainer, borderColor: isDark ? 'rgba(45,106,45,0.3)' : colors.primary + '40' }]}
          onPress={() => setShowPreview(true)}
        >
          <Ionicons name="eye-outline" size={16} color={colors.primary} />
          <Text style={[styles.previewBtnText, { color: colors.primary }]}>Preview</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={20}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info Note */}
          <View style={[styles.infoNote, { backgroundColor: isDark ? 'rgba(45,106,45,0.12)' : '#F4F9F4', borderColor: isDark ? 'rgba(45,106,45,0.3)' : '#C6E6C6' }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text style={[styles.infoNoteText, { color: isDark ? '#A7D9A7' : '#1A5C1A' }]}>
              Your submission will be reviewed by the community administrator. Only approved businesses will appear in the public directory.
            </Text>
          </View>

          {/* Section 1 – Basic Info */}
          <FormSection title="Basic Information" icon="storefront-outline">
            <View style={styles.photoFieldWrap}>
              <View style={styles.photoLabelRow}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginBottom: 0 }]}>Business Profile Photo</Text>
                <Text style={[styles.optionalLabel, { color: colors.textMuted }]}>Optional</Text>
              </View>
              <Text style={[styles.photoHelperText, { color: colors.textMuted }]}>Use a logo or storefront image to help customers recognize your business.</Text>
              <View style={styles.photoUploadRow}>
                {displayedLogoUri ? (
                  <Image source={{ uri: displayedLogoUri }} style={[styles.photoPreview, { borderColor: colors.border }]} />
                ) : (
                  <View style={[styles.photoPlaceholder, { backgroundColor: isDark ? 'rgba(45,106,45,0.16)' : colors.primaryContainer, borderColor: colors.border }]}>
                    <Ionicons name="image-outline" size={27} color={colors.primary} />
                  </View>
                )}
                <View style={styles.photoActions}>
                  <TouchableOpacity
                    style={[styles.photoActionButton, { backgroundColor: isDark ? 'rgba(45,106,45,0.16)' : colors.primaryContainer, borderColor: colors.primary + '40' }]}
                    onPress={handlePickProfilePhoto}
                    disabled={isPending}
                  >
                    <Ionicons name={displayedLogoUri ? 'refresh-outline' : 'cloud-upload-outline'} size={16} color={colors.primary} />
                    <Text style={[styles.photoActionText, { color: colors.primary }]}>{displayedLogoUri ? 'Change Photo' : 'Upload Photo'}</Text>
                  </TouchableOpacity>
                  {displayedLogoUri ? (
                    <TouchableOpacity style={styles.removePhotoButton} onPress={handleRemoveProfilePhoto} disabled={isPending}>
                      <Ionicons name="trash-outline" size={15} color="#DC2626" />
                      <Text style={styles.removePhotoText}>Remove</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>
            <FormField label="Business Name" required value={form.businessName} onChangeText={(v) => setField('businessName', v)} placeholder="e.g. Gowda Organic Farm" />
            <FormField label="Owner Name" required value={form.ownerName} onChangeText={(v) => setField('ownerName', v)} placeholder="Your full name" />
            <CategoryPicker value={form.category} onChange={(v) => setField('category', v)} />
            <FormField label="About / Description" value={form.description} onChangeText={(v) => setField('description', v)} placeholder="Tell customers about your business..." multiline />
          </FormSection>

          {/* Section 2 – Business Details */}
          <FormSection title="Business Details" icon="cube-outline">
            <FormField label="Products / Services" required value={form.productsServices} onChangeText={(v) => setField('productsServices', v)} placeholder="e.g. Organic vegetables, Home delivery, Custom orders" multiline />
            <FormField label="Location (City, State)" required value={form.location} onChangeText={(v) => setField('location', v)} placeholder="e.g. Mysuru, Karnataka" />
            <FormField label="Full Address" value={form.address} onChangeText={(v) => setField('address', v)} placeholder="Street, landmark, pin code" multiline />
            <FormField label="Special Offers / Promotions" value={form.offers} onChangeText={(v) => setField('offers', v)} placeholder="Any community discounts or offers?" multiline />
          </FormSection>

          {/* Section 3 – Contact Info */}
          <FormSection title="Contact Information" icon="call-outline">
            <FormField label="Phone Number" value={form.phone} onChangeText={(v) => setField('phone', v)} placeholder="+91 98765 43210" keyboardType="phone-pad" autoCapitalize="none" />
            <FormField label="WhatsApp Number" value={form.whatsapp} onChangeText={(v) => setField('whatsapp', v)} placeholder="+91 98765 43210" keyboardType="phone-pad" autoCapitalize="none" />
            <FormField label="Email Address" value={form.email} onChangeText={(v) => setField('email', v)} placeholder="business@email.com" keyboardType="email-address" autoCapitalize="none" />
            <FormField label="Website URL" value={form.website} onChangeText={(v) => setField('website', v)} placeholder="https://yourbusiness.com" keyboardType="url" autoCapitalize="none" />
          </FormSection>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Submit Button */}
      <View style={[styles.submitBar, { backgroundColor: colors.cardBg, borderTopColor: colors.border, paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 16 }]}>
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: isPending ? colors.textMuted : colors.primary }]}
          onPress={handleSubmit}
          disabled={isPending}
          activeOpacity={0.85}
        >
          {isPending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="#FFF" />
              <Text style={styles.submitBtnText}>
                {isEdit ? 'Resubmit for Approval' : 'Submit for Approval'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Preview Modal */}
      <Modal visible={showPreview} transparent animationType="slide" onRequestClose={() => setShowPreview(false)}>
        <Pressable style={styles.previewOverlay} onPress={() => setShowPreview(false)}>
          <Pressable
            style={[styles.previewSheet, { backgroundColor: colors.cardBg, paddingBottom: insets.bottom + 20 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.previewSheetTitle, { color: colors.text }]}>Business Preview</Text>
            <Text style={[styles.previewSheetSub, { color: colors.textSecondary }]}>
              This is how your listing will appear in the Business Directory after approval.
            </Text>
            <PreviewCard data={form} logoUri={displayedLogoUri} colors={colors} isDark={isDark} />
            <TouchableOpacity
              style={[styles.previewDoneBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowPreview(false)}
            >
              <Text style={styles.previewDoneBtnText}>Close Preview</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  headerSub: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  previewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, borderWidth: 1,
  },
  previewBtnText: { fontSize: 12.5, fontWeight: '700' },
  scrollContent: { padding: 16, gap: 14 },

  // Info note
  infoNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    padding: 12, borderRadius: 14, borderWidth: 1,
  },
  infoNoteText: { flex: 1, fontSize: 13, lineHeight: 18 },

  // Form section
  formSection: {
    borderRadius: 18, borderWidth: 1, overflow: 'hidden',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }, android: { elevation: 2 } }),
  },
  formSectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  formSectionTitle: { fontSize: 15, fontWeight: '700' },

  // Fields
  fieldWrap: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  fieldLabel: { fontSize: 12.5, fontWeight: '600', marginBottom: 6 },
  fieldInput: {
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
  },
  fieldInputMulti: { minHeight: 80, paddingTop: 12 },

  // Business photo
  photoFieldWrap: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  photoLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  optionalLabel: { fontSize: 11.5, fontWeight: '500' },
  photoHelperText: { fontSize: 12, lineHeight: 17, marginTop: 6 },
  photoUploadRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  photoPreview: { width: 72, height: 72, borderRadius: 14, borderWidth: 1 },
  photoPlaceholder: { width: 72, height: 72, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  photoActions: { flex: 1, alignItems: 'flex-start', gap: 5 },
  photoActionButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  photoActionText: { fontSize: 12.5, fontWeight: '700' },
  removePhotoButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 2, paddingVertical: 4 },
  removePhotoText: { color: '#DC2626', fontSize: 12, fontWeight: '600' },

  // Category Picker
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  pickerSheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, maxHeight: '70%' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  pickerTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 14, borderRadius: 10, marginBottom: 2 },
  pickerRowText: { fontSize: 15, fontWeight: '600' },

  // Submit bar
  submitBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.07, shadowRadius: 8 }, android: { elevation: 6 } }),
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
  },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  // Preview Modal
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  previewSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12, gap: 8 },
  previewSheetTitle: { fontSize: 19, fontWeight: '800' },
  previewSheetSub: { fontSize: 13.5, marginBottom: 4 },
  previewDoneBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  previewDoneBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  // Preview Card
  previewCard: {
    borderRadius: 16, borderWidth: 2, padding: 14, gap: 8,
  },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  previewLogo: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  previewBizName: { fontSize: 16, fontWeight: '800' },
  previewOwner: { fontSize: 13, fontWeight: '500' },
  previewCat: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  previewCatText: { fontSize: 12, fontWeight: '700' },
  previewDesc: { fontSize: 13.5, lineHeight: 19 },
  previewLocation: { fontSize: 12.5 },
});
