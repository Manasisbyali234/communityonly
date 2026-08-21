import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useUserLocation } from '../../hooks/useUserLocation';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

const CROPS = [
  { id: 'coffee',      name: 'Coffee',       image: require('../../../assets/images/crops/coffee.png') },
  { id: 'blackpepper', name: 'Black Pepper',  image: require('../../../assets/images/crops/blackpepper.png') },
  { id: 'cardamom',    name: 'Cardamom',      image: require('../../../assets/images/crops/cardamom.png') },
  { id: 'vanilla',     name: 'Vanilla',       image: require('../../../assets/images/crops/vanilla.png') },
  { id: 'cinnamon',    name: 'Cinnamon',      image: require('../../../assets/images/crops/cinnamon.png') },
  { id: 'arecanut',    name: 'Arecanut',      image: require('../../../assets/images/crops/arecanut.png') },
  { id: 'coconut',     name: 'Coconut',       image: require('../../../assets/images/crops/coconut.jpg') },
  { id: 'tea',         name: 'Tea',           image: require('../../../assets/images/crops/tea.jpg') },
  { id: 'orange',      name: 'Orange',        image: require('../../../assets/images/crops/orange.jpg') },
  { id: 'jackfruit',   name: 'Jackfruit',     image: require('../../../assets/images/crops/jackfruit.jpg') },
  { id: 'mango',       name: 'Mango',         image: require('../../../assets/images/crops/mango.jpg') },
  { id: 'banana',      name: 'Banana',        image: require('../../../assets/images/crops/banana.jpg') },
  { id: 'paddy',       name: 'Paddy (Rice)',  image: require('../../../assets/images/crops/paddy.jpg') },
];

export default function MarketRatesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const userLocation = useUserLocation();

  const filtered = CROPS.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="trending-up-outline" size={20} color="#FFF" style={{ marginRight: 6 }} />
          <Text style={styles.headerTitle}>Market Rates</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Sub-header */}
      <View style={[styles.subHeader, { backgroundColor: colors.primaryContainer }]}>
        <Text style={[styles.subTitle, { color: colors.primaryDark }]}>Select a crop to view market prices</Text>
        {!userLocation.loading && (userLocation.district || userLocation.state) && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color={colors.primaryDark} />
            <Text style={[styles.locationText, { color: colors.primaryDark }]}>
              {[userLocation.district, userLocation.state].filter(Boolean).join(', ')}
            </Text>
          </View>
        )}
      </View>

      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search crops..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Grid */}
      <ScrollView
        contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="leaf-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No crops found</Text>
          </View>
        ) : (
          <View style={styles.row}>
            {filtered.map((crop) => (
              <TouchableOpacity
                key={crop.id}
                activeOpacity={0.75}
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => router.push(`/market-rates/${encodeURIComponent(crop.name)}` as any)}
              >
                <View style={styles.imageWrap}>
                  <Image source={crop.image} style={styles.cropImage} resizeMode={['blackpepper','cardamom','vanilla','cinnamon','arecanut'].includes(crop.id) ? 'contain' : 'cover'} />
                </View>
                <Text style={[styles.cropName, { color: colors.text }]} numberOfLines={2}>
                  {crop.name}
                </Text>
                <View style={[styles.viewBtn, { backgroundColor: colors.primary + '18' }]}>
                  <Text style={[styles.viewBtnText, { color: colors.primary }]}>View Rates</Text>
                  <Ionicons name="chevron-forward" size={12} color={colors.primary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerCenter: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },

  subHeader: { paddingHorizontal: 16, paddingVertical: 10 },
  subTitle: { fontSize: 13, fontWeight: '600' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  locationText: { fontSize: 11, fontWeight: '500' },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },

  grid: { paddingHorizontal: 16, paddingTop: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  card: {
    width: '47%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 10,
    ...Platform.select({
      ios: { shadowColor: '#1A2D1A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },

  imageWrap: {
    width: 80,
    height: 80,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cropImage: { width: 80, height: 80, borderRadius: 20 },

  cropName: { fontSize: 13, fontWeight: '700', textAlign: 'center', lineHeight: 18 },

  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  viewBtnText: { fontSize: 11, fontWeight: '700' },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12, width: '100%' },
  emptyText: { fontSize: 15, fontWeight: '600' },
});
