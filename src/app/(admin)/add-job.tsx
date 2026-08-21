import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Image, Platform, ScrollView, Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AdminShell from '../../components/admin/AdminShell';
import { C, SearchBar } from '../../components/admin/AdminUI';
import { adminApiClient } from '../../api/adminClient';

const showAlert = (title: string, message: string, buttons?: { text: string; onPress?: () => void }[]) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message}`);
    if (buttons?.[0]?.onPress) buttons[0].onPress();
  } else {
    Alert.alert(title, message, buttons);
  }
};

const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT'];
const EMPLOYMENT_LABELS: Record<string, string> = {
  FULL_TIME: 'Full Time', PART_TIME: 'Part Time',
  INTERNSHIP: 'Internship', CONTRACT: 'Contract',
};
const WORK_MODES = ['WORK_FROM_OFFICE', 'HYBRID', 'REMOTE'];
const WORK_MODE_LABELS: Record<string, string> = {
  WORK_FROM_OFFICE: 'Work From Office', HYBRID: 'Hybrid', REMOTE: 'Remote',
};

const EMPTY_FORM = {
  jobTitle: '', description: '', employmentType: 'FULL_TIME',
  workMode: 'WORK_FROM_OFFICE', salaryLPA: '', address: '', location: '',
  experience: '', education: '', requiredSkills: [] as string[],
  vacancyCount: '1', lastDate: '', hrContact: '', hrEmail: '', status: 'ACTIVE',
};

export default function AdminAddJob() {
  const router = useRouter();
  const { id, employerId: preselectedEmployerId } = useLocalSearchParams<{ id?: string; employerId?: string }>();
  const isEdit = !!id;

  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedEmployer, setSelectedEmployer] = useState<any | null>(null);
  const [employers, setEmployers] = useState<any[]>([]);
  const [employerSearch, setEmployerSearch] = useState('');
  const [showEmployerPicker, setShowEmployerPicker] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  // Load employers list
  useEffect(() => {
    adminApiClient.get('/jobs/employers')
      .then(res => setEmployers(res.data?.data ?? res.data ?? []))
      .catch(() => {});
  }, []);

  // Preselect employer if coming from employers page
  useEffect(() => {
    if (preselectedEmployerId && employers.length > 0) {
      const emp = employers.find((e: any) => e.id === preselectedEmployerId);
      if (emp) setSelectedEmployer(emp);
    }
  }, [preselectedEmployerId, employers]);

  // Load job for edit
  useEffect(() => {
    if (!isEdit) return;
    adminApiClient.get(`/jobs/${id}`).then(res => {
      const j = res.data?.data ?? res.data;
      setForm({
        jobTitle: j.jobTitle ?? '',
        description: j.description ?? '',
        employmentType: j.employmentType ?? 'FULL_TIME',
        workMode: j.workMode ?? 'WORK_FROM_OFFICE',
        salaryLPA: j.salaryLPA ?? '',
        address: j.address ?? '',
        location: j.location ?? '',
        experience: j.experience ?? '',
        education: j.education ?? '',
        requiredSkills: j.requiredSkills ?? [],
        vacancyCount: String(j.vacancyCount ?? 1),
        lastDate: j.lastDate ? j.lastDate.split('T')[0] : '',
        hrContact: j.hrContact ?? '',
        hrEmail: j.hrEmail ?? '',
        status: j.status ?? 'ACTIVE',
      });
      // If job has an employerId, find and set it
      if (j.employerId) {
        adminApiClient.get(`/jobs/employers/${j.employerId}`)
          .then(r => setSelectedEmployer(r.data?.data ?? r.data))
          .catch(() => {});
      }
    }).catch(() => showAlert('Error', 'Failed to load job')).finally(() => setLoading(false));
  }, [id]);

  const set = (key: keyof typeof EMPTY_FORM, val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  const addSkill = () => {
    const sk = skillInput.trim();
    if (sk && !form.requiredSkills.includes(sk)) {
      setForm(f => ({ ...f, requiredSkills: [...f.requiredSkills, sk] }));
    }
    setSkillInput('');
  };

  const removeSkill = (sk: string) =>
    setForm(f => ({ ...f, requiredSkills: f.requiredSkills.filter(x => x !== sk) }));

  const submit = async (status: 'ACTIVE' | 'DRAFT') => {
    if (!selectedEmployer) {
      showAlert('Validation', 'Please select an employer / company');
      return;
    }
    if (!form.jobTitle || !form.description || !form.salaryLPA || !form.location || !form.experience) {
      showAlert('Validation', 'Please fill all required fields');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        employerId: selectedEmployer.id,
        status,
        vacancyCount: Number(form.vacancyCount) || 1,
      };
      if (isEdit) {
        await adminApiClient.put(`/jobs/${id}`, payload);
      } else {
        await adminApiClient.post('/jobs', payload);
      }
      showAlert('Success', isEdit ? 'Job updated!' : 'Job posted!', [
        { text: 'OK', onPress: () => router.push('/(admin)/jobs' as any) },
      ]);
    } catch (e: any) {
      showAlert('Error', e.response?.data?.message ?? 'Failed to save job');
    }
    setSaving(false);
  };

  const filteredEmployers = employers.filter(e =>
    !employerSearch ||
    e.name?.toLowerCase().includes(employerSearch.toLowerCase()) ||
    e.industry?.toLowerCase().includes(employerSearch.toLowerCase())
  );

  if (loading) {
    return (
      <AdminShell title={isEdit ? 'Edit Job' : 'Post Job'}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      </AdminShell>
    );
  }

  return (
    <AdminShell title={isEdit ? 'Edit Job' : 'Post Job'}>
      <View style={s.card}>

        {/* ── Employer Picker ── */}
        <Field label="Company / Employer" required>
          {selectedEmployer ? (
            <View style={s.selectedEmployer}>
              {selectedEmployer.logoUrl ? (
                <Image source={{ uri: selectedEmployer.logoUrl }} style={s.empLogo} />
              ) : (
                <View style={[s.empLogo, s.empLogoFallback]}>
                  <Feather name="briefcase" size={16} color={C.accent} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.empName}>{selectedEmployer.name}</Text>
                {selectedEmployer.industry ? <Text style={s.empSub}>{selectedEmployer.industry}</Text> : null}
              </View>
              <TouchableOpacity onPress={() => setShowEmployerPicker(true)} style={s.changeBtn}>
                <Text style={s.changeBtnText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={s.pickEmployerBtn} onPress={() => setShowEmployerPicker(true)}>
              <Feather name="briefcase" size={15} color={C.accent} />
              <Text style={s.pickEmployerText}>Select Employer</Text>
              <Feather name="chevron-down" size={15} color={C.textMuted} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.createEmployerLink} onPress={() => router.push('/(admin)/add-employer' as any)}>
            <Feather name="plus" size={12} color={C.accent} />
            <Text style={s.createEmployerLinkText}>Create new employer profile</Text>
          </TouchableOpacity>
        </Field>

        <Field label="Job Title" required>
          <TextInput style={s.input} value={form.jobTitle} onChangeText={v => set('jobTitle', v)}
            placeholder="e.g. Senior React Developer" placeholderTextColor={C.textMuted} />
        </Field>

        <Field label="Job Description" required>
          <TextInput style={[s.input, s.textarea]} value={form.description}
            onChangeText={v => set('description', v)} multiline numberOfLines={5}
            placeholder="Describe the role, responsibilities..." placeholderTextColor={C.textMuted}
            textAlignVertical="top" />
        </Field>

        <Field label="Employment Type" required>
          <View style={s.chips}>
            {EMPLOYMENT_TYPES.map(t => (
              <TouchableOpacity key={t} style={[s.chip, form.employmentType === t && s.chipActive]}
                onPress={() => set('employmentType', t)}>
                <Text style={[s.chipText, form.employmentType === t && s.chipTextActive]}>
                  {EMPLOYMENT_LABELS[t]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <Field label="Work Mode" required>
          <View style={s.chips}>
            {WORK_MODES.map(m => (
              <TouchableOpacity key={m} style={[s.chip, form.workMode === m && s.chipActive]}
                onPress={() => set('workMode', m)}>
                <Text style={[s.chipText, form.workMode === m && s.chipTextActive]}>
                  {WORK_MODE_LABELS[m]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <View style={s.twoCol}>
          <View style={{ flex: 1 }}>
            <Field label="Salary (LPA)" required>
              <TextInput style={s.input} value={form.salaryLPA} onChangeText={v => set('salaryLPA', v)}
                placeholder="e.g. 5 LPA or 8-10 LPA" placeholderTextColor={C.textMuted} />
            </Field>
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Field label="Vacancies" required>
              <TextInput style={s.input} value={form.vacancyCount} onChangeText={v => set('vacancyCount', v)}
                keyboardType="numeric" placeholder="1" placeholderTextColor={C.textMuted} />
            </Field>
          </View>
        </View>

        <Field label="Location (City, State)" required>
          <TextInput style={s.input} value={form.location} onChangeText={v => set('location', v)}
            placeholder="e.g. Bangalore, Karnataka" placeholderTextColor={C.textMuted} />
        </Field>

        <Field label="Address" optional>
          <TextInput style={s.input} value={form.address} onChangeText={v => set('address', v)}
            placeholder="Full address" placeholderTextColor={C.textMuted} />
        </Field>

        <View style={s.twoCol}>
          <View style={{ flex: 1 }}>
            <Field label="Experience Required" required>
              <TextInput style={s.input} value={form.experience} onChangeText={v => set('experience', v)}
                placeholder="e.g. 2-4 years" placeholderTextColor={C.textMuted} />
            </Field>
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Field label="Education" optional>
              <TextInput style={s.input} value={form.education} onChangeText={v => set('education', v)}
                placeholder="e.g. B.Tech" placeholderTextColor={C.textMuted} />
            </Field>
          </View>
        </View>

        <Field label="Required Skills">
          <View style={s.skillInputRow}>
            <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} value={skillInput}
              onChangeText={setSkillInput} placeholder="Add skill..." placeholderTextColor={C.textMuted}
              onSubmitEditing={addSkill} returnKeyType="done" />
            <TouchableOpacity style={s.addSkillBtn} onPress={addSkill}>
              <Feather name="plus" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={s.chips}>
            {form.requiredSkills.map(skill => (
              <TouchableOpacity key={skill} style={[s.chip, s.chipActive, { flexDirection: 'row', gap: 4 }]}
                onPress={() => removeSkill(skill)}>
                <Text style={s.chipTextActive}>{skill}</Text>
                <Feather name="x" size={11} color="#fff" />
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <Field label="Last Date to Apply" optional>
          <TextInput style={s.input} value={form.lastDate} onChangeText={v => set('lastDate', v)}
            placeholder="YYYY-MM-DD" placeholderTextColor={C.textMuted} />
        </Field>

        <View style={s.twoCol}>
          <View style={{ flex: 1 }}>
            <Field label="HR Contact" optional>
              <TextInput style={s.input} value={form.hrContact} onChangeText={v => set('hrContact', v)}
                placeholder="HR Name" placeholderTextColor={C.textMuted} />
            </Field>
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Field label="HR Email" optional>
              <TextInput style={s.input} value={form.hrEmail} onChangeText={v => set('hrEmail', v)}
                placeholder="hr@company.com" placeholderTextColor={C.textMuted}
                keyboardType="email-address" autoCapitalize="none" />
            </Field>
          </View>
        </View>

        <Field label="Status">
          <View style={s.chips}>
            {['ACTIVE', 'CLOSED'].map(st => (
              <TouchableOpacity key={st} style={[s.chip, form.status === st && s.chipActive]}
                onPress={() => set('status', st)}>
                <Text style={[s.chipText, form.status === st && s.chipTextActive]}>{st}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <View style={s.btnRow}>
          <TouchableOpacity style={s.draftBtn} onPress={() => submit('DRAFT')} disabled={saving}>
            <Text style={s.draftBtnText}>Save Draft</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.postBtn} onPress={() => submit('ACTIVE')} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : (
              <>
                <Feather name="briefcase" size={15} color="#fff" />
                <Text style={s.postBtnText}>{isEdit ? 'Update Job' : 'Post Job'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Employer Picker Modal ── */}
      <Modal visible={showEmployerPicker} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Select Employer</Text>
              <TouchableOpacity onPress={() => setShowEmployerPicker(false)}>
                <Feather name="x" size={20} color={C.textSecond} />
              </TouchableOpacity>
            </View>
            <SearchBar value={employerSearch} onChangeText={setEmployerSearch} placeholder="Search employers..." />
            <ScrollView style={{ maxHeight: 360, marginTop: 10 }}>
              {filteredEmployers.length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ color: C.textMuted, fontSize: 13 }}>No employers found.</Text>
                  <TouchableOpacity style={[s.postBtn, { marginTop: 12, paddingHorizontal: 20 }]}
                    onPress={() => { setShowEmployerPicker(false); router.push('/(admin)/add-employer' as any); }}>
                    <Feather name="plus" size={14} color="#fff" />
                    <Text style={s.postBtnText}>Create Employer</Text>
                  </TouchableOpacity>
                </View>
              ) : filteredEmployers.map(emp => (
                <TouchableOpacity
                  key={emp.id}
                  style={[s.empRow, selectedEmployer?.id === emp.id && s.empRowSelected]}
                  onPress={() => { setSelectedEmployer(emp); setShowEmployerPicker(false); setEmployerSearch(''); }}
                >
                  {emp.logoUrl ? (
                    <Image source={{ uri: emp.logoUrl }} style={s.empRowLogo} />
                  ) : (
                    <View style={[s.empRowLogo, s.empLogoFallback]}>
                      <Feather name="briefcase" size={14} color={C.accent} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={s.empName}>{emp.name}</Text>
                    {emp.industry ? <Text style={s.empSub}>{emp.industry}</Text> : null}
                  </View>
                  {selectedEmployer?.id === emp.id && <Feather name="check" size={16} color={C.accent} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </AdminShell>
  );
}

function Field({ label, children, required, optional }: {
  label: string; children: React.ReactNode; required?: boolean; optional?: boolean;
}) {
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
  textarea: { minHeight: 100 },
  twoCol: { flexDirection: 'row' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg },
  chipActive: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { fontSize: 12, fontWeight: '600', color: C.textSecond },
  chipTextActive: { color: '#fff' },
  skillInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 },
  addSkillBtn: { width: 38, height: 38, borderRadius: 8, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  // Employer picker
  pickEmployerBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: C.bg },
  pickEmployerText: { flex: 1, fontSize: 13, color: C.textSecond, fontWeight: '600' },
  selectedEmployer: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: C.accent, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: C.accentLight },
  empLogo: { width: 40, height: 40, borderRadius: 8 },
  empLogoFallback: { backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  empName: { fontSize: 13, fontWeight: '700', color: C.textPrimary },
  empSub: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  changeBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: C.accent },
  changeBtnText: { fontSize: 12, fontWeight: '700', color: C.accent },
  createEmployerLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  createEmployerLinkText: { fontSize: 12, color: C.accent, fontWeight: '600' },
  // Buttons
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  draftBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg, alignItems: 'center' },
  draftBtnText: { fontSize: 14, fontWeight: '700', color: C.textSecond },
  postBtn: { flex: 2, paddingVertical: 13, borderRadius: 10, backgroundColor: C.accent, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  postBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 480 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: C.textPrimary },
  empRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: C.border },
  empRowSelected: { backgroundColor: C.accentLight },
  empRowLogo: { width: 36, height: 36, borderRadius: 8 },
});
