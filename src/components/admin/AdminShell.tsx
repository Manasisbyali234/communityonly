import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Modal, Pressable, SafeAreaView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useSegments } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAdminStore } from '../../store/adminStore';
import { useAuthStore } from '../../store/authStore';
import { adminApiClient } from '../../api/adminClient';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

// On web, avoid react-native-web Modal (portal removeChild crash).
// Use a plain absolutely-positioned overlay instead.
function WebOverlay({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!visible) return null;
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 999 }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      {children}
    </View>
  );
}

const NAV_MAIN: { label: string; icon: FeatherIconName; key: string }[] = [
  { label: 'Dashboard',        icon: 'layout',       key: 'dashboard' },
  { label: 'Users',            icon: 'users',        key: 'users' },
  { label: 'Pending Profiles', icon: 'user-check',   key: 'pending-profiles' },
  { label: 'Profiles',         icon: 'user',         key: 'profiles' },
  { label: 'Communities',      icon: 'globe',        key: 'communities' },
  { label: 'Events',          icon: 'calendar',     key: 'events' },
  { label: 'Stories',         icon: 'book-open',    key: 'stories' },
  { label: 'Referrals',       icon: 'share-2',      key: 'referrals' },
  { label: 'Jobs',            icon: 'briefcase',    key: 'jobs' },
  { label: 'Matrimony',          icon: 'heart',        key: 'matrimony' },
  { label: 'Business',           icon: 'shopping-bag', key: 'business' },
  { label: 'Community Help',     icon: 'life-buoy',    key: 'community-help' },
  { label: 'Our People Stories', icon: 'book-open',    key: 'community-stories' },
];

const NAV_BOTTOM: typeof NAV_MAIN = [];

interface Props { children: React.ReactNode; title: string; }

export default function AdminShell({ children, title }: Props) {
  const router = useRouter();
  const segments = useSegments();
  const { admin, logout } = useAdminStore();
  const logoutAuth = useAuthStore((s) => s.logout);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingProfilesCount, setPendingProfilesCount] = useState(0);
  const [pendingData, setPendingData] = useState<{ communities: any[]; events: any[]; profiles: any[] }>({ communities: [], events: [], profiles: [] });
  const currentKey = segments[segments.length - 1] ?? '';
  const { width: screenW } = useWindowDimensions();
  const isWide = Platform.OS === 'web' && screenW >= 768;
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 0 : insets.top;

  useEffect(() => {
    if (isWide) { setMenuOpen(false); setBellOpen(false); }
  }, [isWide]);

  const fetchPending = useCallback(async () => {
    try {
      const [countsRes, commRes, evtRes, profilesRes] = await Promise.all([
        adminApiClient.get('/admin-panel/pending-counts'),
        adminApiClient.get('/admin-panel/communities/pending'),
        adminApiClient.get('/admin-panel/events', { params: { status: 'PENDING', take: 10 } }),
        adminApiClient.get('/admin-panel/profile-approvals', { params: { status: 'PENDING', take: 10 } }),
      ]);
      const counts = countsRes.data?.data ?? {};
      setPendingCount(counts.total ?? 0);
      setPendingProfilesCount(counts.pendingProfiles ?? 0);
      setPendingData({
        communities: commRes.data?.data?.communities ?? [],
        events: evtRes.data?.data?.events ?? [],
        profiles: profilesRes.data?.data?.users ?? [],
      });
    } catch {}
  }, []);

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    return () => clearInterval(interval);
  }, [fetchPending]);

  const handleLogout = async () => {
    try { await adminApiClient.post('/admin-auth/logout'); } catch {}
    logout();
    await logoutAuth();
    router.replace('/(auth)/login' as any);
  };

  const renderItem = (item: typeof NAV_MAIN[0]) => {
    const active = currentKey === item.key;
    const badgeCount =
      item.key === 'pending-profiles'
        ? pendingProfilesCount
        : item.key === 'communities'
        ? pendingData.communities.length
        : item.key === 'events'
        ? pendingData.events.length
        : 0;
    return (
      <Pressable
        key={item.key}
        style={({ hovered }: any) => [
          s.navItem,
          active && s.navItemActive,
          !active && hovered && s.navItemHover,
        ]}
        onPress={() => { router.push(`/(admin)/${item.key}` as any); setMenuOpen(false); }}
      >
        <View style={[s.navIconWrap, active && s.navIconWrapActive]}>
          <Feather name={item.icon} size={16} color={active ? '#16A34A' : '#64748B'} />
        </View>
        <Text style={[s.navLabel, active && s.navLabelActive]}>{item.label}</Text>
        {badgeCount > 0 && (
          <View style={[s.navBadge, item.key === 'pending-profiles' && { backgroundColor: '#D97706' }]}>
            <Text style={s.navBadgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  const SidebarContent = () => (
    <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {NAV_MAIN.map(renderItem)}
      </ScrollView>
      {NAV_BOTTOM.length > 0 && <View style={s.divider} />}
      {NAV_BOTTOM.map(renderItem)}
      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
        <Feather name="log-out" size={15} color="#DC2626" style={{ marginRight: 8 }} />
        <Text style={s.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={s.root}>
      {/* Sidebar — wide screens */}
      {isWide && (
        <View style={s.sidebar}>
          <View style={s.sidebarHeader}>
            <View style={s.logoRow}>
              <View style={s.logoIcon}>
                <Feather name="shield" size={14} color="#16A34A" />
              </View>
              <Text style={s.logoTitle}>Admin Panel</Text>
            </View>
            <Text style={s.adminSub}>{admin?.displayName ?? 'Admin'}</Text>
          </View>
          <SidebarContent />
        </View>
      )}

      {/* Drawer — web uses View overlay, native uses Modal */}
      {Platform.OS === 'web' ? (
        <WebOverlay visible={!isWide && menuOpen} onClose={() => setMenuOpen(false)}>
          <View style={s.modalContainer}>
            <SafeAreaView style={s.drawer}>
              <View style={s.logoRow}>
                <View style={s.logoIcon}>
                  <Feather name="shield" size={14} color="#16A34A" />
                </View>
                <Text style={s.logoTitle}>Admin Panel</Text>
              </View>
              <Text style={s.adminSub}>{admin?.displayName ?? 'Admin'}</Text>
              <View style={{ flex: 1, marginTop: 8 }}>
                <SidebarContent />
              </View>
            </SafeAreaView>
            <Pressable style={s.overlay} onPress={() => setMenuOpen(false)} />
          </View>
        </WebOverlay>
      ) : (
        <Modal visible={menuOpen} transparent animationType="slide" onRequestClose={() => setMenuOpen(false)}>
          <View style={s.modalContainer}>
            <SafeAreaView style={s.drawer}>
              <View style={s.logoRow}>
                <View style={s.logoIcon}>
                  <Feather name="shield" size={14} color="#16A34A" />
                </View>
                <Text style={s.logoTitle}>Admin Panel</Text>
              </View>
              <Text style={s.adminSub}>{admin?.displayName ?? 'Admin'}</Text>
              <View style={{ flex: 1, marginTop: 8 }}>
                <SidebarContent />
              </View>
            </SafeAreaView>
            <Pressable style={s.overlay} onPress={() => setMenuOpen(false)} />
          </View>
        </Modal>
      )}

      <View style={s.main}>
        <View style={[s.topBarSafe, { paddingTop: topPad }]}>
          <View style={s.topBar}>
            {!isWide && (
              <TouchableOpacity onPress={() => setMenuOpen(true)} style={s.menuBtn}>
                <Feather name="menu" size={22} color="#334155" />
              </TouchableOpacity>
            )}
            <Text style={s.pageTitle} numberOfLines={1}>{title}</Text>
            <TouchableOpacity style={s.bellBtn} onPress={() => { setBellOpen(true); fetchPending(); }}>
              <Feather name="bell" size={20} color="#334155" />
              {pendingCount > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{pendingCount > 99 ? '99+' : pendingCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={s.content} contentContainerStyle={s.contentInner}>
          {children}
        </ScrollView>
      </View>

      {/* Bell Notification Dropdown — web uses View overlay, native uses Modal */}
      {Platform.OS === 'web' ? (
        <WebOverlay visible={bellOpen} onClose={() => setBellOpen(false)}>
          <View style={s.bellOverlay}>
            <Pressable style={[s.bellPanel, isWide && s.bellPanelWide]} onPress={(e) => e.stopPropagation()}>
            <View style={s.bellHeader}>
              <Text style={s.bellTitle}>Pending Approvals</Text>
              <TouchableOpacity onPress={() => setBellOpen(false)}>
                <Feather name="x" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {pendingData.communities.length === 0 && pendingData.events.length === 0 && pendingData.profiles.length === 0 && (
                <Text style={s.bellEmpty}>No pending items 🎉</Text>
              )}

              {pendingData.communities.length > 0 && (
                <View>
                  <Text style={s.bellSection}>Communities ({pendingData.communities.length})</Text>
                  {pendingData.communities.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={s.bellItem}
                      onPress={() => { setBellOpen(false); router.push('/(admin)/communities' as any); }}
                    >
                      <View style={s.bellDot} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.bellItemTitle} numberOfLines={1}>{c.name}</Text>
                        <Text style={s.bellItemSub} numberOfLines={1}>
                          by {c.members?.[0]?.user?.displayName ?? '—'} · {c.members?.[0]?.user?.email ?? ''}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={14} color="#94A3B8" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {pendingData.events.length > 0 && (
                <View>
                  <Text style={s.bellSection}>Events ({pendingData.events.length})</Text>
                  {pendingData.events.map((e) => (
                    <TouchableOpacity
                      key={e.id}
                      style={s.bellItem}
                      onPress={() => { setBellOpen(false); router.push('/(admin)/events' as any); }}
                    >
                      <View style={[s.bellDot, { backgroundColor: '#6366F1' }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.bellItemTitle} numberOfLines={1}>{e.title}</Text>
                        <Text style={s.bellItemSub} numberOfLines={1}>
                          {e.community?.name ? `in ${e.community.name}` : 'No community'}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={14} color="#94A3B8" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {pendingData.profiles.length > 0 && (
                <View>
                  <Text style={s.bellSection}>Profiles ({pendingData.profiles.length})</Text>
                  {pendingData.profiles.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={s.bellItem}
                      onPress={() => { setBellOpen(false); router.push('/(admin)/pending-profiles' as any); }}
                    >
                      <View style={[s.bellDot, { backgroundColor: '#16A34A' }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.bellItemTitle} numberOfLines={1}>{p.displayName || p.username}</Text>
                        <Text style={s.bellItemSub} numberOfLines={1}>
                          {p.familyName ? `${p.familyName} - ` : ''}{p.email || p.phone || 'New registration'}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={14} color="#94A3B8" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>

            {pendingCount > 0 && (
              <View style={s.bellFooter}>
                <TouchableOpacity
                  style={s.bellFooterBtn}
                  onPress={() => {
                    setBellOpen(false);
                    router.push((pendingProfilesCount > 0 ? '/(admin)/pending-profiles' : '/(admin)/communities') as any);
                  }}
                >
                  <Text style={s.bellFooterText}>View all pending →</Text>
                </TouchableOpacity>
              </View>
            )}
            </Pressable>
          </View>
        </WebOverlay>
      ) : (
        <Modal visible={bellOpen} transparent animationType="fade" onRequestClose={() => setBellOpen(false)}>
          <Pressable style={s.bellOverlay} onPress={() => setBellOpen(false)}>
            <Pressable style={[s.bellPanel, isWide && s.bellPanelWide]} onPress={(e) => e.stopPropagation()}>
              <View style={s.bellHeader}>
                <Text style={s.bellTitle}>Pending Approvals</Text>
                <TouchableOpacity onPress={() => setBellOpen(false)}>
                  <Feather name="x" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {pendingData.communities.length === 0 && pendingData.events.length === 0 && pendingData.profiles.length === 0 && (
                  <Text style={s.bellEmpty}>No pending items 🎉</Text>
                )}
                {pendingData.communities.length > 0 && (
                  <View>
                    <Text style={s.bellSection}>Communities ({pendingData.communities.length})</Text>
                    {pendingData.communities.map((c) => (
                      <TouchableOpacity key={c.id} style={s.bellItem} onPress={() => { setBellOpen(false); router.push('/(admin)/communities' as any); }}>
                        <View style={s.bellDot} />
                        <View style={{ flex: 1 }}>
                          <Text style={s.bellItemTitle} numberOfLines={1}>{c.name}</Text>
                          <Text style={s.bellItemSub} numberOfLines={1}>by {c.members?.[0]?.user?.displayName ?? '—'} · {c.members?.[0]?.user?.email ?? ''}</Text>
                        </View>
                        <Feather name="chevron-right" size={14} color="#94A3B8" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {pendingData.events.length > 0 && (
                  <View>
                    <Text style={s.bellSection}>Events ({pendingData.events.length})</Text>
                    {pendingData.events.map((e) => (
                      <TouchableOpacity key={e.id} style={s.bellItem} onPress={() => { setBellOpen(false); router.push('/(admin)/events' as any); }}>
                        <View style={[s.bellDot, { backgroundColor: '#6366F1' }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={s.bellItemTitle} numberOfLines={1}>{e.title}</Text>
                          <Text style={s.bellItemSub} numberOfLines={1}>{e.community?.name ? `in ${e.community.name}` : 'No community'}</Text>
                        </View>
                        <Feather name="chevron-right" size={14} color="#94A3B8" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {pendingData.profiles.length > 0 && (
                  <View>
                    <Text style={s.bellSection}>Profiles ({pendingData.profiles.length})</Text>
                    {pendingData.profiles.map((p) => (
                      <TouchableOpacity key={p.id} style={s.bellItem} onPress={() => { setBellOpen(false); router.push('/(admin)/pending-profiles' as any); }}>
                        <View style={[s.bellDot, { backgroundColor: '#16A34A' }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={s.bellItemTitle} numberOfLines={1}>{p.displayName || p.username}</Text>
                          <Text style={s.bellItemSub} numberOfLines={1}>{p.familyName ? `${p.familyName} - ` : ''}{p.email || p.phone || 'New registration'}</Text>
                        </View>
                        <Feather name="chevron-right" size={14} color="#94A3B8" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </ScrollView>
              {pendingCount > 0 && (
                <View style={s.bellFooter}>
                  <TouchableOpacity
                    style={s.bellFooterBtn}
                    onPress={() => {
                      setBellOpen(false);
                      router.push((pendingProfilesCount > 0 ? '/(admin)/pending-profiles' : '/(admin)/communities') as any);
                    }}
                  >
                    <Text style={s.bellFooterText}>View all pending →</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: '#F8FAFC' },

  sidebar: {
    width: 232, backgroundColor: '#fff',
    borderRightWidth: 1, borderRightColor: '#E2E8F0',
    flexDirection: 'column',
  },
  sidebarHeader: {
    padding: 18, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  logoIcon: {
    width: 26, height: 26, borderRadius: 7, backgroundColor: '#F0FDF4',
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  logoTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', letterSpacing: -0.2 },
  adminSub: { fontSize: 11, color: '#94A3B8', marginLeft: 34 },

  navItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 9,
    marginHorizontal: 8, marginBottom: 1, borderRadius: 8,
  },
  navItemActive: { backgroundColor: '#F0FDF4' },
  navItemHover: { backgroundColor: '#F8FAFC' },
  navIconWrap: {
    width: 30, height: 30, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10, backgroundColor: '#F8FAFC',
  },
  navIconWrapActive: { backgroundColor: '#DCFCE7' },
  navLabel: { fontSize: 13, color: '#64748B', fontWeight: '500', flex: 1 },
  navLabelActive: { color: '#15803D', fontWeight: '600' },
  navBadge: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4, marginLeft: 4,
  },
  navBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  divider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 10, marginVertical: 4 },
  logoutBtn: {
    margin: 10, padding: 12, backgroundColor: '#FFF1F2',
    borderRadius: 8, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#FECDD3',
  },
  logoutText: { color: '#DC2626', fontWeight: '600', fontSize: 13 },

  modalContainer: { flex: 1, flexDirection: 'row' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  drawer: {
    width: 260, backgroundColor: '#fff',
    paddingHorizontal: 14, paddingTop: 20,
    paddingBottom: 20,
  },

  main: { flex: 1, minWidth: 0 },
  topBarSafe: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
  },
  menuBtn: { padding: 6, borderRadius: 8 },
  pageTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', flex: 1, letterSpacing: -0.2 },
  bellBtn: { padding: 6, borderRadius: 8, position: 'relative' },
  badge: {
    position: 'absolute', top: 2, right: 2,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },

  bellOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'flex-end', justifyContent: 'flex-start', paddingTop: 60, paddingHorizontal: 12 },
  bellPanel: { width: '100%', maxWidth: 320, backgroundColor: '#fff', borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  bellPanelWide: { marginRight: 8 },
  bellHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  bellTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  bellEmpty: { textAlign: 'center', color: '#94A3B8', fontSize: 13, paddingVertical: 32 },
  bellSection: { fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4, textTransform: 'uppercase' },
  bellItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  bellDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16A34A', flexShrink: 0 },
  bellItemTitle: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  bellItemSub: { fontSize: 11, color: '#94A3B8', marginTop: 1 },
  bellFooter: { borderTopWidth: 1, borderTopColor: '#F1F5F9', padding: 10 },
  bellFooterBtn: { alignItems: 'center', paddingVertical: 6 },
  bellFooterText: { fontSize: 13, color: '#16A34A', fontWeight: '600' },

  content: { flex: 1 },
  contentInner: { padding: 16, paddingBottom: 40, flexGrow: 1 },
});
