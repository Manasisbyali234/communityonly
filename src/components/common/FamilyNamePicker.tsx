import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { FAMILY_NAMES } from '../../constants/familyNames';
import { useTheme } from '../../theme';

type FamilyNamePickerProps = {
  label?: string;
  value?: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  required?: boolean;
};

/** Keeps a free-text fallback for existing names while offering the curated family directory. */
export default function FamilyNamePicker({
  label = 'Family Name / Okka',
  value = '',
  onChangeText,
  onBlur,
  error,
  required = false,
}: FamilyNamePickerProps) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');
  const filteredNames = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return term ? FAMILY_NAMES.filter((name) => name.toLocaleLowerCase().includes(term)) : FAMILY_NAMES;
  }, [search]);

  const choose = (name: string) => {
    onChangeText(name);
    onBlur?.();
    setVisible(false);
    setSearch('');
  };

  return (
    <View>
      <Text style={[styles.label, { color: colors.text }]}>{label}{required ? ' *' : ''}</Text>
      <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: error ? colors.error : colors.border }]}>
        <Ionicons name="people-outline" size={18} color={colors.primary} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          placeholder="Choose from the family directory"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text }]}
        />
        <TouchableOpacity
          accessibilityLabel="Open family name directory"
          accessibilityRole="button"
          onPress={() => setVisible(true)}
          style={[styles.openButton, { backgroundColor: colors.primary + '12' }]}
        >
          <Ionicons name="chevron-down" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>
      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

      <Modal visible={visible} animationType="slide" transparent onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}> 
          <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Family Name Directory</Text>
              <Text style={[styles.sheetSubtitle, { color: colors.textMuted }]}>{FAMILY_NAMES.length} available family names</Text>
            </View>
            <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeButton} accessibilityLabel="Close family name directory">
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={[styles.searchRow, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={18} color={colors.textMuted} />
            <TextInput
              autoFocus
              value={search}
              onChangeText={setSearch}
              placeholder="Search family names"
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.text }]}
            />
          </View>
          <FlatList
            data={filteredNames}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.option, { borderBottomColor: colors.border }]} onPress={() => choose(item)}>
                <View style={[styles.optionIcon, { backgroundColor: colors.primary + '12' }]}>
                  <Ionicons name="people-outline" size={15} color={colors.primary} />
                </View>
                <Text style={[styles.optionText, { color: colors.text }]}>{item}</Text>
                {value === item ? <Ionicons name="checkmark-circle" size={19} color={colors.primary} /> : null}
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.textMuted }]}>No family name found.</Text>}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', marginBottom: 7 },
  inputRow: { minHeight: 48, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14 },
  input: { flex: 1, fontSize: 14.5, paddingVertical: 12 },
  openButton: { width: 42, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', borderTopRightRadius: 11, borderBottomRightRadius: 11 },
  error: { fontSize: 12, marginTop: 5 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  sheet: { marginTop: 'auto', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '82%', overflow: 'hidden' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: StyleSheet.hairlineWidth },
  sheetTitle: { fontSize: 18, fontWeight: '800' },
  sheetSubtitle: { fontSize: 12, marginTop: 3 },
  closeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 9, margin: 16, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 12 },
  listContent: { paddingHorizontal: 16, paddingBottom: 36 },
  option: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  optionIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1, fontSize: 14.5, fontWeight: '600' },
  emptyText: { textAlign: 'center', paddingVertical: 28, fontSize: 14 },
});
