import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

export interface UserLocation {
  state: string | null;
  district: string | null;
  coords: { latitude: number; longitude: number } | null;
  loading: boolean;
  error: string | null;
}

// Normalize whatever expo-location / Google returns → exact DB state name
const STATE_NORMALIZE: Record<string, string> = {
  // Karnataka variants
  'karnataka': 'Karnataka',
  'state of karnataka': 'Karnataka',
  'ka': 'Karnataka',
  'karnatak': 'Karnataka',
  // Kerala variants
  'kerala': 'Kerala',
  'keralam': 'Kerala',
  'state of kerala': 'Kerala',
  'kl': 'Kerala',
  // Tamil Nadu variants
  'tamil nadu': 'Tamil Nadu',
  'tamilnadu': 'Tamil Nadu',
  'state of tamil nadu': 'Tamil Nadu',
  'tn': 'Tamil Nadu',
  // Maharashtra variants
  'maharashtra': 'Maharashtra',
  'state of maharashtra': 'Maharashtra',
  'mh': 'Maharashtra',
  // Andhra Pradesh
  'andhra pradesh': 'Andhra Pradesh',
  'ap': 'Andhra Pradesh',
  // Telangana
  'telangana': 'Telangana',
  'ts': 'Telangana',
  // Others as needed
  'goa': 'Goa',
  'gujarat': 'Gujarat',
  'rajasthan': 'Rajasthan',
  'madhya pradesh': 'Madhya Pradesh',
  'uttar pradesh': 'Uttar Pradesh',
  'west bengal': 'West Bengal',
  'odisha': 'Odisha',
  'punjab': 'Punjab',
  'haryana': 'Haryana',
  'himachal pradesh': 'Himachal Pradesh',
  'uttarakhand': 'Uttarakhand',
  'assam': 'Assam',
};

function normalizeState(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return STATE_NORMALIZE[raw.trim().toLowerCase()] ?? raw.trim();
}

export function useUserLocation(): UserLocation {
  const [state, setState] = useState<string | null>(null);
  const [district, setDistrict] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) { setError('Location permission denied'); setLoading(false); }
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        const { latitude, longitude } = pos.coords;
        setCoords({ latitude, longitude });

        const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (cancelled) return;
        setState(normalizeState(place?.region));
        setDistrict(place?.subregion ?? place?.city ?? null);
      } catch (e: any) {
        if (!cancelled) setError('Unable to get location');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { state, district, coords, loading, error };
}
