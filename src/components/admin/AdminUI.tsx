import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

export const C = {
  accent:      '#16A34A',
  accentLight: '#F0FDF4',
  accentBorder:'#BBF7D0',
  border:      '#E2E8F0',
  borderDark:  '#CBD5E1',
  bg:          '#F8FAFC',
  white:       '#FFFFFF',
  textPrimary: '#0F172A',
  textSecond:  '#475569',
  textMuted:   '#94A3B8',
  rowEven:     '#F8FAFC',
  headerBg:    '#F1F5F9',
  danger:      '#EF4444',
  dangerLight: '#FEF2F2',
  warn:        '#F59E0B',
  warnLight:   '#FFFBEB',
  info:        '#3B82F6',
  infoLight:   '#EFF6FF',
};

// ── Column width presets ──────────────────────────────────────────────────────
export const COL = {
  xs:   { width: 60  },   // counts, icons
  sm:   { width: 90  },   // short labels, role, type
  md:   { width: 130 },   // dates, status
  lg:   { width: 180 },   // names, email
  xl:   { width: 220 },   // long text, caption
  user: { width: 200 },   // avatar + name combo
  act:  { width: 140 },   // action buttons
} as const;

// ── Shared table styles (used by all pages) ───────────────────────────────────
export const T = StyleSheet.create({
  card: {
    backgroundColor: C.white, borderRadius: 12, marginBottom: 20,
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    overflow: 'visible',
  },
  toolbar: {
    padding: 16, borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: C.white, gap: 10,
  },
  filters: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
  },
  filterActive: { backgroundColor: C.accent, borderColor: C.accent },
  filterText: { color: C.textSecond, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: C.white },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.headerBg, paddingHorizontal: 16, paddingVertical: 11,
    borderBottomWidth: 2, borderBottomColor: C.border,
  },
  th: {
    color: C.textSecond, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingRight: 8,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: C.white,
  },
  rowEven: { backgroundColor: C.rowEven },
  td: { color: C.textPrimary, fontSize: 13, paddingRight: 8, justifyContent: 'center' },
  tdMuted: { color: C.textMuted, fontSize: 12, paddingRight: 8, justifyContent: 'center' },

  // Avatar
  avatar: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: C.accentLight,
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
    overflow: 'hidden', borderWidth: 1, borderColor: C.accentBorder,
    flexShrink: 0,
  },
  avatarImg: { width: 34, height: 34 },
  avatarFallback: { color: C.accent, fontWeight: '700', fontSize: 13 },

  // Cell text helpers
  cellPrimary: { color: C.textPrimary, fontWeight: '600', fontSize: 13 },
  cellSub:     { color: C.textMuted, fontSize: 11, marginTop: 1 },
});

// ── Stat Card ─────────────────────────────────────────────────────────────────
interface StatCardProps { label: string; value: number | string; icon: FeatherIconName; color?: string; }
export function StatCard({ label, value, icon, color = C.accent }: StatCardProps) {
  return (
    <View style={[sc.card]}>
      <View style={[sc.iconWrap, { backgroundColor: color + '18' }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <View style={sc.textWrap}>
        <Text style={[sc.value, { color }]}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Text>
        <Text style={sc.label} numberOfLines={2}>{label}</Text>
      </View>
      <View style={[sc.bar, { backgroundColor: color }]} />
    </View>
  );
}
const sc = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: C.white, borderRadius: 12,
    padding: 14,
    flexDirection: 'row', alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  iconWrap: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 },
  textWrap: { flex: 1, minWidth: 0 },
  value: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  label: { color: C.textMuted, fontSize: 11, fontWeight: '500', marginTop: 2 },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
});

// ── Search Bar ────────────────────────────────────────────────────────────────
interface SearchBarProps { value: string; onChangeText: (t: string) => void; placeholder?: string; }
export function SearchBar({ value, onChangeText, placeholder = 'Search...' }: SearchBarProps) {
  return (
    <View style={sb.wrap}>
      <Feather name="search" size={14} color={C.textMuted} style={{ marginRight: 8 }} />
      <TextInput
        style={sb.input} value={value} onChangeText={onChangeText}
        placeholder={placeholder} placeholderTextColor={C.textMuted}
      />
      {value ? (
        <TouchableOpacity onPress={() => onChangeText('')} style={sb.clearBtn}>
          <Feather name="x" size={14} color={C.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
const sb = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg,
    borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: C.border,
  },
  input: { flex: 1, color: C.textPrimary, paddingVertical: 10, fontSize: 13 },
  clearBtn: { padding: 4 },
});

// ── Skeleton ──────────────────────────────────────────────────────────────────
export function Skeleton({ rows = 6 }: { rows?: number }) {
  return (
    <View>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[T.row, i % 2 === 0 && T.rowEven]}>
          <View style={sk.circle} />
          <View style={sk.lines}>
            <View style={[sk.line, { width: '45%' }]} />
            <View style={[sk.line, { width: '28%', marginTop: 6 }]} />
          </View>
          <View style={[sk.line, { width: 60, marginLeft: 'auto' }]} />
        </View>
      ))}
    </View>
  );
}
const sk = StyleSheet.create({
  circle: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#E2E8F0', marginRight: 10 },
  lines: { flex: 1 },
  line: { height: 10, backgroundColor: '#E2E8F0', borderRadius: 5 },
});

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ message = 'No records found' }: { message?: string }) {
  return (
    <View style={es.wrap}>
      <View style={es.iconWrap}>
        <Feather name="inbox" size={28} color={C.textMuted} />
      </View>
      <Text style={es.title}>Nothing here</Text>
      <Text style={es.text}>{message}</Text>
    </View>
  );
}
const es = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  iconWrap: { marginBottom: 12 },
  title: { color: C.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  text: { color: C.textMuted, fontSize: 13, textAlign: 'center', maxWidth: 260 },
});

// ── Pagination ────────────────────────────────────────────────────────────────
interface PaginationProps { skip: number; take: number; total: number; onPage: (skip: number) => void; }
export function Pagination({ skip, take, total, onPage }: PaginationProps) {
  const { width: w } = useWindowDimensions();
  const isNarrow = w < 400;
  const page = Math.floor(skip / take) + 1;
  const pages = Math.ceil(total / take);
  if (pages <= 1) return null;
  return (
    <View style={[pg.wrap, isNarrow && pg.wrapNarrow]}>
      <Text style={pg.info}>{total.toLocaleString()} records · Page {page} of {pages}</Text>
      <View style={pg.btns}>
        <TouchableOpacity style={[pg.btn, page === 1 && pg.disabled]} onPress={() => onPage(Math.max(0, skip - take))} disabled={page === 1}>
          <Text style={pg.btnText}>← Prev</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[pg.btn, page === pages && pg.disabled]} onPress={() => onPage(skip + take)} disabled={page === pages}>
          <Text style={pg.btnText}>Next →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
const pg = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg,
  },
  wrapNarrow: { flexDirection: 'column', alignItems: 'center', gap: 8 },
  info: { color: C.textMuted, fontSize: 12 },
  btns: { flexDirection: 'row', gap: 8 },
  btn: {
    backgroundColor: C.white, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: C.border,
  },
  disabled: { opacity: 0.35 },
  btnText: { color: C.accent, fontWeight: '700', fontSize: 12 },
});

// ── Badge ─────────────────────────────────────────────────────────────────────
const BADGE: Record<string, { bg: string; text: string }> = {
  PENDING:   { bg: '#FEF9C3', text: '#92400E' },
  REVIEWED:  { bg: '#DBEAFE', text: '#1E40AF' },
  RESOLVED:  { bg: '#DCFCE7', text: '#166534' },
  DISMISSED: { bg: '#F1F5F9', text: '#475569' },
  active:    { bg: '#DCFCE7', text: '#166534' },
  blocked:   { bg: '#FEE2E2', text: '#991B1B' },
  verified:  { bg: '#DBEAFE', text: '#1E40AF' },
  inactive:  { bg: '#F1F5F9', text: '#475569' },
  ACTIVE:    { bg: '#DCFCE7', text: '#166534' },
  EXPIRED:   { bg: '#FEE2E2', text: '#991B1B' },
};
export function Badge({ label }: { label: string }) {
  const c = BADGE[label] ?? { bg: '#F1F5F9', text: '#475569' };
  return (
    <View style={[bd.wrap, { backgroundColor: c.bg }]}>
      <Text style={[bd.text, { color: c.text }]}>{label}</Text>
    </View>
  );
}
const bd = StyleSheet.create({
  wrap: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 2 },
  text: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
});

// ── Action Button ─────────────────────────────────────────────────────────────
interface ActionBtnProps { label: string; onPress: () => void; variant?: 'danger' | 'success' | 'default'; }
export function ActionBtn({ label, onPress, variant = 'default' }: ActionBtnProps) {
  const colors = {
    danger:  { bg: C.dangerLight, text: C.danger, border: '#FECACA' },
    success: { bg: C.accentLight, text: C.accent, border: C.accentBorder },
    default: { bg: C.bg,          text: C.textSecond, border: C.border },
  }[variant];
  return (
    <TouchableOpacity style={[ab.btn, { backgroundColor: colors.bg, borderColor: colors.border }]} onPress={onPress}>
      <Text style={[ab.text, { color: colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}
const ab = StyleSheet.create({
  btn: { borderRadius: 5, paddingHorizontal: 10, paddingVertical: 5, marginRight: 4, marginBottom: 2, borderWidth: 1 },
  text: { fontSize: 12, fontWeight: '600' },
});

// ── Table Row ─────────────────────────────────────────────────────────────────
export function TableRow({ children, even }: { children: React.ReactNode; even?: boolean }) {
  return <View style={[T.row, even && T.rowEven]}>{children}</View>;
}

// ── Section Card ──────────────────────────────────────────────────────────────
export function SectionCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[T.card, style]}>{children}</View>;
}

// ── Mobile Card (used by list pages on small screens) ────────────────────────
export function MobileCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={mc.card}>{children}</View>
  );
}
export function MobileCardRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={mc.row}>
      <Text style={mc.label}>{label}</Text>
      <View style={mc.value}>{children}</View>
    </View>
  );
}
const mc = StyleSheet.create({
  card: {
    backgroundColor: C.white, borderRadius: 10, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 5 },
  label: { width: 80, minWidth: 80, fontSize: 11, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.3, paddingTop: 2, flexShrink: 0 },
  value: { flex: 1, flexShrink: 1 },
});

export function useIsMobile() {
  const { width } = useWindowDimensions();
  return width < 768;
}
export function LoadingOverlay() {
  return (
    <View style={lo.wrap}>
      <ActivityIndicator size="large" color={C.accent} />
      <Text style={lo.text}>Loading...</Text>
    </View>
  );
}
const lo = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  text: { color: C.textMuted, fontSize: 13, marginTop: 10 },
});
