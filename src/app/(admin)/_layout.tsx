import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAdminStore } from '../../store/adminStore';

export default function AdminLayout() {
  const router = useRouter();
  const { isAuthenticated, token, isTokenValid, logout } = useAdminStore();

  useEffect(() => {
    if (!isAuthenticated || !token || !isTokenValid()) {
      logout();
      router.replace('/(auth)/login' as any);
    }
  }, [isAuthenticated, token]);

  if (!isAuthenticated || !token || !isTokenValid()) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}
