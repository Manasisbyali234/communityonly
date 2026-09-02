import React, { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar, Platform, AppState } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useUserApprovalStore, resolveUserApproval } from '../store/userApprovalStore';
import { useTheme } from '../theme';
import Toast from '../components/common/Toast';
import ConfirmationModal from '../components/common/ConfirmationModal';
import { initSocket, disconnectSocket, setSocketAppActive } from '../api/socket';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 60_000,
    },
  },
});

// Capture the intended URL on web before any redirect happens — only for non-admin paths
const intendedPath = Platform.OS === 'web' && typeof window !== 'undefined'
  ? window.location.pathname + window.location.search
  : null;

// Extract the deep-link path from the intended URL so we can restore it after auth.
// e.g. "/explore?tab=members" → "/(tabs)/explore?tab=members"
function resolveIntendedRoute(raw: string | null): string | null {
  if (!raw) return null;
  // Strip leading slash for matching
  const path = raw.startsWith('/') ? raw.slice(1) : raw;
  // These are top-level routes, not nested under (tabs)
  const topLevelScreens = [
    'create', 'chat', 'story', 'download',
  ];
  const tabScreens = [
    'explore', 'communities', 'our-people', 'profile', 'notifications', 'settings',
    'community-help', 'business', 'jobs', 'matrimony', 'events', 'event',
    'krushi-mitra', 'market-rates', 'price-calculator',
  ];
  const base = path.split('?')[0].split('/')[0];
  if (topLevelScreens.includes(base)) return `/${path}`;
  if (tabScreens.includes(base)) return `/(tabs)/${path}`;
  return null;
}

function RootLayoutContent() {
  const { colors, isDark } = useTheme();
  const segments = useSegments();
  const router = useRouter();
  const { isAuthenticated, isOnboarded, isLoading, token, user } = useAuthStore();
  const isLoggedIn = isAuthenticated || !!user;
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
  const [tokensInitialized, setTokensInitialized] = useState(false);
  const lastRedirect = useRef<string | null>(null);
  const appState = useRef(AppState.currentState);

  // Restore in-memory tokens when the app returns from the background.
  // Do not navigate here: system UI such as the image picker backgrounds the
  // app, and replacing the route would unmount the screen that opened it.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let lastBackground = 0;
    const sub = AppState.addEventListener('change', async (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        // Only redirect if the app was truly backgrounded (not just a brief inactive
        // from a permission dialog or system overlay — require >1.5s in background)
        const now = Date.now();
        if (now - lastBackground < 1500) {
          appState.current = nextState;
          return;
        }
        await useAuthStore.getState().initSecureTokens();
        // The auth-routing effect below will redirect only if the restored
        // state is actually unauthenticated. Keeping the active route here is
        // required for image/document pickers and other system activities.
      }
      if (nextState.match(/inactive|background/)) lastBackground = Date.now();
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // hasHydrated() may already be true synchronously — check first
      // then fall back to the listener. A timeout ensures we never hang.
      if (useAuthStore.persist.hasHydrated()) {
        setTokensInitialized(true);
        return;
      }
      let done = false;
      const finish = () => { if (!done) { done = true; setTokensInitialized(true); } };
      const unsub = useAuthStore.persist.onFinishHydration(finish);
      // Safety timeout: if hydration never fires (e.g. empty storage), unblock after 50ms
      const timer = setTimeout(finish, 50);
      return () => { unsub(); clearTimeout(timer); };
    } else {
      useAuthStore.getState().initSecureTokens().finally(() => setTokensInitialized(true));
    }
  }, []);

// Initialize socket once when authenticated and token is in memory
  useEffect(() => {
    if (isLoggedIn && tokensInitialized && token) {
      void initSocket();
    }
    return () => {
      if (!isLoggedIn) disconnectSocket();
    };
  }, [isLoggedIn, tokensInitialized, token]);

  // A backgrounded app should not be advertised as online. Reconnect when it
  // returns to the foreground so the server can publish the current presence.
  useEffect(() => {
    if (!isLoggedIn || !tokensInitialized || !token) return;
    const sub = AppState.addEventListener('change', (nextState) => {
      setSocketAppActive(nextState === 'active');
    });
    setSocketAppActive(AppState.currentState === 'active');
    return () => sub.remove();
  }, [isLoggedIn, tokensInitialized, token]);

  useEffect(() => {
    if (isLoading || !tokensInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAdminGroup = segments[0] === '(admin)';
    // Keep every authenticated, top-level feature route in the application. If a
    // route is omitted here, the auth guard immediately replaces it with the
    // tab home screen, making perfectly valid buttons and filters appear broken.
    const inAppGroup =
      segments[0] === '(tabs)' ||
      ['create', 'chat', 'story', 'community', 'krushi-mitra', 'market-rates',
        'jobs', 'matrimony', 'business', 'community-help', 'our-people'].includes(segments[0] ?? '');

    const navigate = (path: string) => {
      if (lastRedirect.current === path) return;
      lastRedirect.current = path;
      router.replace(path as any);
    };

    if (!isLoggedIn) {
      if (!inAuthGroup) {
        navigate(!isOnboarded ? '/(auth)/onboarding' : '/(auth)/login');
      }
    } else if (isAdmin) {
      if (!inAdminGroup) {
        navigate('/(admin)/dashboard');
      }
    } else {
      // Check user approval status
      const { isApproved } = resolveUserApproval(user);

      if (!isApproved) {
        // Pending, Rejected, Resubmitted, or Suspended user access control
        const top = segments[0] as string | undefined;
        const sub = segments[1] as string | undefined;
        const subSub = segments[2] as string | undefined;

        // Block member profiles and other community routes explicitly
        const isMemberProfile = sub === 'user' || sub === 'our-people';

        // Allowed only:
        // - Approval Status: /(auth)/approval-status
        // - Own Profile: /(tabs)/profile
        // - Edit Profile: /(tabs)/edit-profile
        // - Settings (for logout, support, terms, privacy): /(tabs)/settings
        const isStrictlyAllowed =
          (top === '(auth)' && sub === 'approval-status') ||
          (top === '(tabs)' && sub === 'profile' && !subSub) ||
          (top === '(tabs)' && sub === 'edit-profile') ||
          (top === '(tabs)' && sub === 'settings');

        if (!isStrictlyAllowed || isMemberProfile) {
          navigate('/(auth)/approval-status');
          return;
        }
      } else {
        if (inAuthGroup || inAdminGroup || !inAppGroup) {
          // Restore the originally requested URL (e.g. /explore?tab=members) if available
          const restored = resolveIntendedRoute(intendedPath);
          navigate(restored ?? '/(tabs)');
        }
      }
    }
  }, [isLoggedIn, isOnboarded, isLoading, tokensInitialized, segments]);

  if (!tokensInitialized) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent={true} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
      <Toast />
      <ConfirmationModal />
    </View>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <RootLayoutContent />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
