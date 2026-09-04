import React, { useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { useTheme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, StyleSheet, TouchableOpacity, Text, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import BottomSheet from '../../components/common/BottomSheet';
import { useAuthStore } from '../../store/authStore';
import { useUserApprovalStore, resolveUserApproval } from '../../store/userApprovalStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '../../components/common/Avatar';
import { useChatsQuery } from '../../api/chat';

// All creation options available in the app
const CREATE_OPTIONS = [
  {
    route: '/create/post',
    icon: 'create-outline',
    title: 'Create Post',
    desc: 'Share updates, photos, and community news.',
    color: '#2D6A2D',
  },
  {
    route: '/create/event',
    icon: 'calendar-outline',
    title: 'Create Event',
    desc: 'Organize community gatherings, meetings, and celebrations.',
    color: '#E65100',
  },
  {
    route: '/create/community',
    icon: 'people-outline',
    title: 'Create Community Page',
    desc: 'Create a new village, association, or interest-based group.',
    color: '#1565C0',
  },
  {
    route: '/create/post',
    icon: 'newspaper-outline',
    title: 'Community Feed Post',
    desc: 'Post to the community feed and share with your neighbors.',
    color: '#6366F1',
  },
];

// Modern floating center "Create" action button
function CreatePostTabIcon({ focused }: { focused: boolean; color?: string }) {
  const { colors, isDark } = useTheme();
  return (
    <View style={styles.createTabContainer}>
      <View
        style={[
          styles.fabOuterRing,
          {
            backgroundColor: colors.surface,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
          },
        ]}
      >
        <LinearGradient
          colors={
            focused
              ? [colors.secondary || '#D97706', '#B45309']
              : [colors.primaryLight || '#4A8505', colors.primary || '#2D6A2D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fab}
        >
          <Ionicons name="add" size={26} color="#FFFFFF" />
        </LinearGradient>
      </View>
      <Text
        style={[
          styles.tabLabel,
          {
            color: focused ? (colors.secondary || '#D97706') : colors.textMuted,
            fontWeight: focused ? '700' : '500',
          },
        ]}
        numberOfLines={1}
      >
        Create
      </Text>
    </View>
  );
}

// Nav Tab Item component with active pill & micro-label
function TabItem({
  focused,
  activeIcon,
  inactiveIcon,
  label,
  badgeCount,
}: {
  focused: boolean;
  activeIcon: string;
  inactiveIcon: string;
  label: string;
  badgeCount?: number;
}) {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.tabItemContainer}>
      <View
        style={[
          styles.iconPill,
          focused && {
            backgroundColor: isDark ? 'rgba(74, 133, 5, 0.22)' : 'rgba(74, 133, 5, 0.12)',
          },
        ]}
      >
        <Ionicons
          name={(focused ? activeIcon : inactiveIcon) as any}
          size={20}
          color={focused ? colors.primary : colors.textMuted}
        />

        {!!badgeCount && badgeCount > 0 && (
          <View style={[styles.badge, { backgroundColor: '#EF4444', borderColor: colors.surface }]}>
            <Text style={styles.badgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
          </View>
        )}
      </View>

      <Text
        style={[
          styles.tabLabel,
          {
            color: focused ? colors.primary : colors.textMuted,
            fontWeight: focused ? '700' : '500',
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [createMenuVisible, setCreateMenuVisible] = useState(false);
  const user = useAuthStore((s) => s.user);
  const { isApproved } = resolveUserApproval(user);
  const { data: conversations = [] } = useChatsQuery();
  const unreadChatCount = conversations.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0);

  const insets = useSafeAreaInsets();
  const tabBarBottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 8 : 6);

  const handleCreateOptionPress = (route: string) => {
    setCreateMenuVisible(false);
    router.push(route as any);
  };

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            borderTopWidth: StyleSheet.hairlineWidth,
            height: 58 + tabBarBottomPadding,
            paddingBottom: tabBarBottomPadding,
            paddingTop: 4,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -3 },
                shadowOpacity: isDark ? 0.25 : 0.05,
                shadowRadius: 10,
              },
              android: { elevation: 8 },
            }),
          },
          tabBarButton: (props) => (
            <TouchableOpacity
              {...(props as any)}
              activeOpacity={1}
              style={[props.style as any, { flex: 1 }]}
            />
          ),
          tabBarButton: (props) => (
            <TouchableOpacity
              {...(props as any)}
              activeOpacity={1}
              style={[props.style as any, { flex: 1 }]}
            />
          ),
          tabBarItemStyle: {
            paddingVertical: 1,
            pressColor: 'transparent',
            pressOpacity: 1,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            href: isApproved ? undefined : null,
            tabBarIcon: ({ focused }) => (
              <TabItem
                focused={focused}
                activeIcon="home"
                inactiveIcon="home-outline"
                label="Home"
              />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            href: isApproved ? undefined : null,
            tabBarIcon: ({ focused }) => (
              <TabItem
                focused={focused}
                activeIcon="compass"
                inactiveIcon="compass-outline"
                label="Explore"
              />
            ),
          }}
        />
        <Tabs.Screen
          name="create"
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              if (isApproved) {
                setCreateMenuVisible(true);
              }
            },
          }}
          options={{
            href: isApproved ? undefined : null,
            tabBarIcon: ({ focused }) => (
              <CreatePostTabIcon focused={createMenuVisible} />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            href: isApproved ? undefined : null,
            tabBarIcon: ({ focused }) => (
              <TabItem
                focused={focused}
                activeIcon="chatbubbles"
                inactiveIcon="chatbubbles-outline"
                label="Chat"
                badgeCount={unreadChatCount}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabItem
                focused={focused}
                activeIcon="person"
                inactiveIcon="person-outline"
                label="Profile"
              />
            ),
          }}
        />

        {/* Hidden screens that share the tab bar */}
        <Tabs.Screen name="communities" options={{ href: null }} />
        <Tabs.Screen name="our-people/index" options={{ href: null }} />
        <Tabs.Screen name="our-people/[id]" options={{ href: null }} />
        <Tabs.Screen name="community-help/index" options={{ href: null }} />
        <Tabs.Screen name="community-help/create" options={{ href: null }} />
        <Tabs.Screen name="community-help/[id]" options={{ href: null }} />
        <Tabs.Screen name="community-help/my-requests" options={{ href: null }} />
        <Tabs.Screen name="business/index" options={{ href: null }} />
        <Tabs.Screen name="business/submit" options={{ href: null }} />
        <Tabs.Screen name="business/[id]" options={{ href: null }} />
        <Tabs.Screen name="business/my-businesses" options={{ href: null }} />
        <Tabs.Screen name="jobs/index" options={{ href: null }} />
        <Tabs.Screen name="jobs/[id]" options={{ href: null }} />
        <Tabs.Screen name="jobs/my-applications" options={{ href: null }} />
        <Tabs.Screen name="matrimony/index" options={{ href: null }} />
        <Tabs.Screen name="matrimony/create-profile" options={{ href: null }} />
        <Tabs.Screen name="matrimony/[id]" options={{ href: null }} />
        <Tabs.Screen name="matrimony/interests" options={{ href: null }} />
        <Tabs.Screen name="events/[id]" options={{ href: null }} />
        <Tabs.Screen name="event/[id]" options={{ href: null }} />
        <Tabs.Screen name="krushi-mitra" options={{ href: null }} />
        <Tabs.Screen name="market-rates/index" options={{ href: null }} />
        <Tabs.Screen name="market-rates/[cropName]" options={{ href: null }} />
        <Tabs.Screen name="price-calculator" options={{ href: null }} />
        <Tabs.Screen name="user/[id]" options={{ href: null }} />
        <Tabs.Screen name="community/[id]" options={{ href: null }} />
        <Tabs.Screen name="community/[id]/members" options={{ href: null }} />
        <Tabs.Screen name="post/[id]" options={{ href: null }} />
        <Tabs.Screen name="edit-profile" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen
          name="settings"
          options={{
            href: isApproved ? null : undefined,
            tabBarIcon: ({ focused }) => (
              <TabItem
                focused={focused}
                activeIcon="settings"
                inactiveIcon="settings-outline"
                label="Settings"
              />
            ),
          }}
        />
        <Tabs.Screen name="settings/appearance" options={{ href: null }} />
        <Tabs.Screen name="settings/privacy" options={{ href: null }} />
        <Tabs.Screen name="settings/notifications" options={{ href: null }} />
        <Tabs.Screen name="settings/privacy-policy" options={{ href: null }} />
        <Tabs.Screen name="settings/terms" options={{ href: null }} />
        <Tabs.Screen name="settings/account" options={{ href: null }} />
        <Tabs.Screen name="media-gallery" options={{ href: null }} />
      </Tabs>

      {/* Modern Creation Action Sheet Modal */}
      <BottomSheet
        visible={createMenuVisible}
        onClose={() => setCreateMenuVisible(false)}
        title="Create Something"
      >
        <ScrollView style={styles.sheetContent} showsVerticalScrollIndicator={false}>
          {CREATE_OPTIONS.map((opt, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.menuOption, { borderBottomColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }]}
              onPress={() => handleCreateOptionPress(opt.route)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: opt.color + '15' }]}>
                <Ionicons name={opt.icon as any} size={22} color={opt.color} />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>{opt.title}</Text>
                <Text style={[styles.menuDesc, { color: colors.textSecondary }]}>{opt.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  tabItemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 58,
    paddingTop: 1,
  },
  iconPill: {
    width: 40,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
    letterSpacing: -0.1,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
  avatarWrapper: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 0.5,
  },
  createTabContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 58,
  },
  fabOuterRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 3,
    marginTop: -14,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#2D6A2D',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: { elevation: 6 },
    }),
  },
  fab: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  menuTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    marginBottom: 3,
  },
  menuDesc: {
    fontSize: 12.5,
    lineHeight: 17,
  },
});
