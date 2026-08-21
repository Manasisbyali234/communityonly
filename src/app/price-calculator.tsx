import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

export default function PriceCalculatorScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [quantity, setQuantity] = useState('');
  const [ratePerUnit, setRatePerUnit] = useState('');
  const [extraKg, setExtraKg] = useState('');
  const [extraKgRate, setExtraKgRate] = useState('');

  const qty = parseFloat(quantity) || 0;
  const rate = parseFloat(ratePerUnit) || 0;
  const extra = parseFloat(extraKg) || 0;
  const extraRate = parseFloat(extraKgRate) || 0;

  const baseAmount = qty * rate;
  const extraAmount = extra * extraRate;
  const totalAmount = baseAmount + extraAmount;

  const hasResult = qty > 0 && rate > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="calculator-outline" size={20} color="#FFF" style={{ marginRight: 6 }} />
          <Text style={styles.headerTitle}>Price Calculator</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">

        {/* Input Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Enter Details</Text>

          <Field
            label="Quantity (bags / units)"
            placeholder="e.g. 10"
            value={quantity}
            onChangeText={setQuantity}
            colors={colors}
          />

          <Field
            label="Rate per unit (₹ / 20 kg)"
            placeholder="e.g. 500"
            value={ratePerUnit}
            onChangeText={setRatePerUnit}
            colors={colors}
            prefix="₹"
            suffix="/ 20 kg"
          />

          <Field
            label="Extra kg"
            placeholder="e.g. 5"
            value={extraKg}
            onChangeText={setExtraKg}
            colors={colors}
          />

          <Field
            label="Extra kg rate (₹ per kg)"
            placeholder="e.g. 25"
            value={extraKgRate}
            onChangeText={setExtraKgRate}
            colors={colors}
            prefix="₹"
            suffix="/ kg"
          />
        </View>

        {/* Result Card */}
        {hasResult && (
          <View style={[styles.resultCard, { backgroundColor: colors.primaryContainer, borderColor: colors.primary + '40' }]}>
            <Text style={[styles.resultTitle, { color: colors.primaryDark }]}>Summary</Text>

            <Row label="Base Amount" value={baseAmount} colors={colors} />
            {extra > 0 && <Row label="Extra kg Amount" value={extraAmount} colors={colors} />}

            <View style={[styles.divider, { backgroundColor: colors.primary + '30' }]} />

            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.primaryDark }]}>Total Amount</Text>
              <Text style={[styles.totalValue, { color: colors.primary }]}>₹ {totalAmount.toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* Reset */}
        {(quantity || ratePerUnit || extraKg || extraKgRate) ? (
          <TouchableOpacity
            style={[styles.resetBtn, { borderColor: colors.border }]}
            onPress={() => { setQuantity(''); setRatePerUnit(''); setExtraKg(''); setExtraKgRate(''); }}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.resetText, { color: colors.textMuted }]}>Reset</Text>
          </TouchableOpacity>
        ) : null}

      </ScrollView>
    </View>
  );
}

function Field({ label, placeholder, value, onChangeText, colors, prefix, suffix }: any) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
        {prefix && <Text style={[styles.affix, { color: colors.textMuted }]}>{prefix}</Text>}
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
          value={value}
          onChangeText={onChangeText}
        />
        {suffix && <Text style={[styles.affix, { color: colors.textMuted }]}>{suffix}</Text>}
      </View>
    </View>
  );
}

function Row({ label, value, colors }: any) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: colors.primaryDark }]}>₹ {value.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerCenter: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  scroll: { padding: 16, gap: 16 },

  card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },

  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 6,
  },
  input: { flex: 1, fontSize: 15, padding: 0 },
  affix: { fontSize: 13, fontWeight: '600' },

  resultCard: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 10 },
  resultTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 13, fontWeight: '700' },
  divider: { height: 1, marginVertical: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: '800' },
  totalValue: { fontSize: 20, fontWeight: '900' },

  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
  },
  resetText: { fontSize: 13, fontWeight: '600' },
});
