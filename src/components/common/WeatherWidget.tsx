import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

// ── Types ─────────────────────────────────────────────────────────────────────
interface CurrentWeather {
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  location: string;
  icon: string;
}

interface ForecastDay {
  day: string;
  condition: string;
  icon: string;
  tempMax: number;
  tempMin: number;
  rainProbability: number;
}

// ── Fallback data (used only if location/network fails) ───────────────────────
const FALLBACK_CURRENT: CurrentWeather = {
  temp: 28,
  condition: 'Partly Cloudy',
  humidity: 72,
  windSpeed: 14,
  location: 'Your Location',
  icon: 'partly-sunny-outline',
};

const FALLBACK_FORECAST: ForecastDay[] = [
  { day: 'Today',    condition: 'Partly Cloudy', icon: 'partly-sunny-outline', tempMax: 31, tempMin: 22, rainProbability: 20 },
  { day: 'Tomorrow', condition: 'Light Rain',    icon: 'rainy-outline',        tempMax: 27, tempMin: 20, rainProbability: 65 },
  { day: 'Day 3',    condition: 'Sunny',         icon: 'sunny-outline',        tempMax: 33, tempMin: 23, rainProbability: 5  },
];

// ── Weatherbit weather code → label + icon ───────────────────────────────────
// https://www.weatherbit.io/api/codes
function weatherbitToMeta(code: number): { condition: string; icon: string } {
  if (code === 800)            return { condition: 'Clear Sky',       icon: 'sunny-outline' };
  if (code === 801 || code === 802) return { condition: 'Partly Cloudy', icon: 'partly-sunny-outline' };
  if (code >= 803)             return { condition: 'Overcast',         icon: 'cloudy-outline' };
  if (code >= 700 && code < 800) return { condition: 'Foggy',          icon: 'water-outline' };
  if (code >= 600 && code < 700) return { condition: 'Snow',           icon: 'snow-outline' };
  if (code >= 520 && code < 600) return { condition: 'Rain Showers',   icon: 'rainy-outline' };
  if (code >= 500 && code < 520) return { condition: 'Rain',           icon: 'rainy-outline' };
  if (code >= 300 && code < 400) return { condition: 'Drizzle',        icon: 'rainy-outline' };
  if (code >= 200 && code < 300) return { condition: 'Thunderstorm',   icon: 'thunderstorm-outline' };
  return { condition: 'Unknown', icon: 'partly-sunny-outline' };
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── Component ─────────────────────────────────────────────────────────────────
export default function WeatherWidget() {
  const [current, setCurrent] = useState<CurrentWeather | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') throw new Error('permission denied');

        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude: lat, longitude: lon } = loc.coords;

        // Reverse-geocode for city name
        const [geo] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
        const cityName = geo?.city ?? geo?.region ?? 'Your Location';

        const API_KEY = 'YOUR_WEATHERBIT_API_KEY';

        // Fetch current weather
        const currentRes = await fetch(
          `https://api.weatherbit.io/v2.0/current?lat=${lat}&lon=${lon}&key=${API_KEY}&units=M`
        );
        if (!currentRes.ok) throw new Error('API error');
        const currentData = await currentRes.json();
        const c = currentData.data[0];
        const { condition, icon } = weatherbitToMeta(c.weather.code);
        setCurrent({
          temp: Math.round(c.temp),
          condition,
          icon,
          humidity: c.rh,
          windSpeed: Math.round(c.wind_spd * 3.6), // m/s → km/h
          location: cityName,
        });

        // Fetch 3-day forecast
        const forecastRes = await fetch(
          `https://api.weatherbit.io/v2.0/forecast/daily?lat=${lat}&lon=${lon}&key=${API_KEY}&units=M&days=3`
        );
        if (!forecastRes.ok) throw new Error('API error');
        const forecastData = await forecastRes.json();
        setForecast(
          forecastData.data.map((d: any, i: number) => {
            const dayName = i === 0 ? 'Today' : DAY_NAMES[new Date(d.datetime).getDay()];
            const { condition: fc, icon: fi } = weatherbitToMeta(d.weather.code);
            return {
              day: dayName,
              condition: fc,
              icon: fi,
              tempMax: Math.round(d.max_temp),
              tempMin: Math.round(d.min_temp),
              rainProbability: Math.round(d.pop ?? 0),
            };
          })
        );
      } catch {
        setCurrent(FALLBACK_CURRENT);
        setForecast(FALLBACK_FORECAST);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.sectionTitle}>Weather Forecast</Text>
      <LinearGradient
        colors={['#E3F2FD', '#BBDEFB', '#E8F5E9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#1565C0" style={{ paddingVertical: 32 }} />
        ) : current ? (
          <>
            {/* Current weather row */}
            <View style={styles.currentRow}>
              <View style={styles.iconWrap}>
                <Ionicons name={current.icon as any} size={56} color="#1565C0" />
              </View>
              <View style={styles.currentInfo}>
                <Text style={styles.temp}>{current.temp}°C</Text>
                <Text style={styles.location}>{current.location}</Text>
                <Text style={styles.condition}>{current.condition}</Text>
                <View style={styles.metaRow}>
                  <Ionicons name="water-outline" size={14} color="#1565C0" />
                  <Text style={styles.metaText}>{current.humidity}%</Text>
                  <Ionicons name="speedometer-outline" size={14} color="#1565C0" style={{ marginLeft: 10 }} />
                  <Text style={styles.metaText}>{current.windSpeed} km/h</Text>
                </View>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* 3-day forecast */}
            <View style={styles.forecastRow}>
              {forecast.map((day, i) => (
                <View key={i} style={[styles.forecastCard, i < forecast.length - 1 && styles.forecastCardBorder]}>
                  <Text style={styles.forecastDay}>{day.day}</Text>
                  <Ionicons name={day.icon as any} size={24} color="#1565C0" style={{ marginVertical: 4 }} />
                  <Text style={styles.forecastCondition}>{day.condition}</Text>
                  <Text style={styles.forecastTemps}>{day.tempMax}° / {day.tempMin}°</Text>
                  <View style={styles.rainRow}>
                    <Ionicons name="rainy-outline" size={11} color="#1565C0" />
                    <Text style={styles.rainText}>{day.rainProbability}%</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </LinearGradient>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2, marginBottom: 12, color: '#1A1A1A' },

  card: {
    borderRadius: 20,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#1565C0', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 },
      android: { elevation: 4 },
    }),
  },

  currentRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconWrap: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  currentInfo: { flex: 1 },
  temp: { fontSize: 40, fontWeight: '900', color: '#0D47A1', lineHeight: 44 },
  location: { fontSize: 14, fontWeight: '700', color: '#1565C0', marginTop: 2 },
  condition: { fontSize: 13, color: '#1976D2', marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
  metaText: { fontSize: 13, color: '#1565C0', fontWeight: '600' },

  divider: { height: 1, backgroundColor: 'rgba(21,101,192,0.2)', marginVertical: 14 },

  forecastRow: { flexDirection: 'row' },
  forecastCard: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  forecastCardBorder: { borderRightWidth: 1, borderRightColor: 'rgba(21,101,192,0.15)' },
  forecastDay: { fontSize: 12, fontWeight: '700', color: '#1565C0' },
  forecastCondition: { fontSize: 10, color: '#1976D2', textAlign: 'center', marginTop: 2, lineHeight: 13 },
  forecastTemps: { fontSize: 12, fontWeight: '700', color: '#0D47A1', marginTop: 3 },
  rainRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 3 },
  rainText: { fontSize: 10, color: '#1565C0', fontWeight: '600' },
});
