import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Image, Platform, ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AdminShell from '../../components/admin/AdminShell';
import { C } from '../../components/admin/AdminUI';
import { adminApiClient } from '../../api/adminClient';

const INDUSTRIES = [
  'Technology', 'Finance', 'Healthcare', 'Education', 'Manufacturing',
  'Retail', 'Construction', 'Agriculture', 'Media', 'Logistics', 'Other',
];

const EMPTY: Record<string, string> = {
  name: '', logoUrl: '', website: '', industry: '',
  description: '', email: '', phone: '', address: '', city: '', state: '',
};

export default function AdminAddEmployer() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    adminApiClient.get(`/jobs/employers/${id}`)
      .then(res => {
        const e = res.data?.data ?? res.data;
        setForm({
          name: e.name ?? '', logoUrl: e.logoUrl ?? '', website: e.website ?? '',
          industry: e.industry ?? '', description: e.description ?? '',
          email: e.email ?? '', phone: e.phone ?? '',
          address: e.address ?? '', city: e.city ?? '', state: e.state ?? '',
        });
      })
      .catch(() => Alert.alert('Error', 'Failed to load employer'))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const uploadLogo = async (formData: FormData) => {
    const res = await adminApiClient.post('/jobs/employers/upload-logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const url = res.data?.data?.url ?? res.data?.url;
    if (url) set('logoUrl', url);
  };

  const pickLogo = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLogoUploading(true);
        try {
          const fd = new FormData();
          fd.append('file', file);
          await uploadLogo(fd);
        } catch { Alert.alert('Error', 'Failed to upload logo'); }
        setLogoUploading(false);
      };
      input.click();
      return;
    }
    const ImagePicker = require('expo-image-picker');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (result.canceled) return;
    const asset = result.assets[0];
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', { uri: asset.uri, name: 'logo.jpg', type: 'image/jpeg' } as any);
      await uploadLogo(fd);
    } catch { Alert.alert('Error', 'Failed to upload logo'); }
    setLogoUploading(false);
  };

  const submit = async () => {
    if (!form.name.trim()) {
      Alert.alert('Validation', 'Company name is required');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await adminApiClient.put(`/jobs/employers/${id}`, form);
      } else {
        await adminApiClient.post('/jobs/employers', form);
      }
      const msg = isEdit ? 'Employer updated!' : 'Employer created!';
      if (Platform.OS === 'web') {
        window.alert(msg);
        router.push('/(admin)/employers' as any);
      } else {
        Alert.alert('Success', msg, [{ text: 'OK', onPress: () => router.push('/(admin)/employers' as any) }]);
      }
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message ?? 'Failed to save');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <AdminShell title={isEdit ? 'Edit Employer' : 'Add Employer'}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      </AdminShell>
    );
  }

  return (
    <AdminShell title={isEdit ? 'Edit Employer' : 'Add Employer'}>
      <View style={s.card}>

        {/* Logo */}
        <Field label="Company Logo" optional>
          <View style={s.logoRow}>
            {form.logoUrl ? (
              <Image source={{ uri: form.logoUrl }} style={s.logoPreview} resizeMode="contain" />
            ) : (
              <View style={s.logoPlaceholder}>
                <Feather name="image" size={24} color={C.textMuted} />
              </View>
            )}
            <TouchableOpacity style={s.uploadBtn} onPress={pickLogo} disabled={logoUploading}>
              {logoUploading
                ? <ActivityIndicator size="small" color={C.accent} />
                : <><Feather name="upload" size={13} color={C.accent} /><Text style={s.uploadBtnText}> Upload Logo</Text></>}
            </TouchableOpacity>
          </View>
          {form.logoUrl ? (
            <TouchableOpacity onPress={() => set('logoUrl', '')} style={s.removeBtn}>
              <Feather name="x" size={12} color={C.danger} />
              <Text style={s.removeText}>Remove</Text>
            </TouchableOpacity>
          ) : null}
        </Field>

        <Field label="Company Name" required>
          <TextInput style={s.input} value={form.name} onChangeText={v => set('name', v)}
            placeholder="e.g. Acme Technologies" placeholderTextColor={C.textMuted} />
        </Field>

        <Field label="Industry" optional>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
            <View style={s.chips}>
              {INDUSTRIES.map(ind => (
                <TouchableOpacity key={ind} style={[s.chip, form.industry === ind && s.chipActive]}
                  onPress={() => set('industry', form.industry === ind ? '' : ind)}>
                  <Text style={[s.chipText, form.industry === ind && s.chipTextActive]}>{ind}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </Field>

        <Field label="Website" optional>
          <TextInput style={s.input} value={form.website} onChangeText={v => set('website', v)}
            placeholder="https://company.com" placeholderTextColor={C.textMuted}
            autoCapitalize="none" keyboardType="url" />
        </Field>

        <Field label="About Company" optional>
          <TextInput style={[s.input, s.textarea]} value={form.description}
            onChangeText={v => set('description', v)} multiline numberOfLines={4}
            placeholder="Brief description of the company..." placeholderTextColor={C.textMuted}
            textAlignVertical="top" />
        </Field>

        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Field label="Contact Email" optional>
              <TextInput style={s.input} value={form.email} onChangeText={v => set('email', v)}
                placeholder="hr@company.com" placeholderTextColor={C.textMuted}
                keyboardType="email-address" autoCapitalize="none" />
            </Field>
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Field label="Phone" optional>
              <TextInput style={s.input} value={form.phone} onChangeText={v => set('phone', v)}
                placeholder="+91 XXXXX XXXXX" placeholderTextColor={C.textMuted}
                keyboardType="phone-pad" />
            </Field>
          </View>
        </View>

        <Field label="Address" optional>
          <TextInput style={s.input} value={form.address} onChangeText={v => set('address', v)}
            placeholder="Street address" placeholderTextColor={C.textMuted} />
        </Field>

        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Field label="City" optional>
              <TextInput style={s.input} value={form.city} onChangeText={v => set('city', v)}
                placeholder="Bangalore" placeholderTextColor={C.textMuted} />
            </Field>
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Field label="State" optional>
              <TextInput style={s.input} value={form.state} onChangeText={v => set('state', v)}
                placeholder="Karnataka" placeholderTextColor={C.textMuted} />
            </Field>
          </View>
        </View>

        <TouchableOpacity style={s.submitBtn} onPress={submit} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : (
            <>
              <Feather name="check" size={15} color="#fff" />
              <Text style={s.submitBtnText}>{isEdit ? 'Update Employer' : 'Create Employer'}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </AdminShell>
  );
}

function Field({ label, children, required, optional }: { label: string; children: React.ReactNode; required?: boolean; optional?: boolean }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={s.label}>
        {label}
        {required && <Text style={{ color: C.danger }}> *</Text>}
        {optional && <Text style={{ color: C.textMuted }}> (optional)</Text>}
      </Text>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.white, borderRadius: 12, padding: 20, borderWidth: 1, borderColor: C.border, marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '700', color: C.textSecond, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: C.textPrimary, backgroundColor: C.bg },
  textarea: { minHeight: 90 },
  row: { flexDirection: 'row' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg },
  chipActive: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { fontSize: 12, fontWeight: '600', color: C.textSecond },
  chipTextActive: { color: '#fff' },
  logoRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  logoPreview: { width: 72, height: 72, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  logoPlaceholder: { width: 72, height: 72, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: C.accent, backgroundColor: C.bg },
  uploadBtnText: { fontSize: 13, fontWeight: '600', color: C.accent },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  removeText: { fontSize: 12, color: C.danger, fontWeight: '600' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 10, backgroundColor: C.accent, marginTop: 8 },
  submitBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
