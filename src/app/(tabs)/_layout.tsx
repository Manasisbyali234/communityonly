import React, { useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { useTheme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, StyleSheet, TouchableOpacity, Text, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import BottomSheet from '../../components/common/BottomSheet';
import { useAuthStore } from '../../store/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '../../components/common/Avatar';

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
function CreatePostTabIcon({ focused }: { focused: boolean; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.fabWrapper}>
      <LinearGradient
        colors={focused ? [colors.secondary, '#BF360C'] : [colors.primaryLight, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.fab,
          {
            shadowColor: focused ? colors.secondary : colors.primary,
          },
        ]}
      >
        <Ionicons name="add" size={26} color="#FFFFFF" />
      </LinearGradient>
    </View>
  );
}

// Nav Tab Icon wrapper with refined micro-dot indicator
function TabItem({
  focused,
  activeIcon,
  inactiveIcon,
  color,
}: {
  focused: boolean;
  activeIcon: string;
  inactiveIcon: string;
  color: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.tabItemContainer}>
      <Ionicons
        name={(focused ? activeIcon : inactiveIcon) as any}
        size={27}
        color={focused ? colors.primary : colors.textMuted}
      />
      <View
        style={[
          styles.activeDot,
          { backgroundColor: focused ? colors.primary : 'transparent' },
        ]}
      />
    </View>
  );
}

export default function TabsLayout() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [createMenuVisible, setCreateMenuVisible] = useState(false);
  const user = useAuthStore((s) => s.user);
  const insets = useSafeAreaInsets();
  const tabBarBottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 10 : 8);

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
            height: 54 + tabBarBottomPadding,
            paddingBottom: tabBarBottomPadding,
            paddingTop: 6,
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
          tabBarItemStyle: {
            paddingVertical: 2,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ focused, color }) => (
              <TabItem
                focused={focused}
                activeIcon="home"
                inactiveIcon="home-outline"
                color={color as string}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            tabBarIcon: ({ focused, color }) => (
              <TabItem
                focused={focused}
                activeIcon="compass"
                inactiveIcon="compass-outline"
                color={color as string}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="create"
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setCreateMenuVisible(true);
            },
          }}
          options={{
            tabBarIcon: ({ focused, color }) => (
              <CreatePostTabIcon focused={createMenuVisible} color={color as string} />
            ),
          }}
        />
        <Tabs.Screen
          name="communities"
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              router.push('/chat' as any);
            },
          }}
          options={{
            tabBarIcon: ({ focused, color }) => (
              <TabItem
                focused={focused}
                activeIcon="chatbubbles"
                inactiveIcon="chatbubbles-outline"
                color={color as string}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            tabBarIcon: ({ focused }) => (
              <View style={styles.tabItemContainer}>
                {user?.avatarUrl ? (
                  <View
                    style={[
                      styles.avatarWrapper,
                      {
                        borderColor: focused ? colors.primary : 'transparent',
                      },
                    ]}
                  >
                    <Avatar url={user.avatarUrl} name={user.displayName} size={29} />
                  </View>
                ) : (
                  <Ionicons
                    name={focused ? 'person' : 'person-outline'}
                    size={27}
                    color={focused ? colors.primary : colors.textMuted}
                  />
                )}
                <View
                  style={[
                    styles.activeDot,
                    { backgroundColor: focused ? colors.primary : 'transparent' },
                  ]}
                />
              </View>
            ),
          }}
        />

        {/* Hidden screens that share the tab bar */}
        <Tabs.Screen name="user/[id]" options={{ href: null }} />
        <Tabs.Screen name="community/[id]" options={{ href: null }} />
        <Tabs.Screen name="community/[id]/members" options={{ href: null }} />
        <Tabs.Screen name="post/[id]" options={{ href: null }} />
        <Tabs.Screen name="edit-profile" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
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
    height: 42,
    width: 48,
  },
  activeDot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
    marginTop: 2,
  },
  avatarWrapper: {
    borderRadius: 18,
    borderWidth: 2,
    padding: 1,
  },
  fabWrapper: {
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
    }),
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
