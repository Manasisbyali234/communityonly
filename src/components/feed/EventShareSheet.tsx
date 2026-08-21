import React from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet,
  Platform, Linking, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  eventTitle: string;
  eventId: string;
  shareUrl: string;
}

const SHARE_OPTIONS = [
  { id: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp', color: '#25D366' },
  { id: 'facebook', label: 'Facebook', icon: 'logo-facebook', color: '#1877F2' },
  { id: 'twitter', label: 'X (Twitter)', icon: 'logo-twitter', color: '#1DA1F2' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'logo-linkedin', color: '#0A66C2' },
  { id: 'telegram', label: 'Telegram', icon: 'paper-plane-outline', color: '#2AABEE' },
  { id: 'email', label: 'Email', icon: 'mail-outline', color: '#EA4335' },
  { id: 'copy', label: 'Copy Link', icon: 'copy-outline', color: '#6B7280' },
];

export default function EventShareSheet({ visible, onClose, eventTitle, shareUrl }: Props) {
  const { colors } = useTheme();

  const handleShare = async (platform: string) => {
    const encoded = encodeURIComponent(shareUrl);
    const text = encodeURIComponent(`Check out this event: ${eventTitle}`);
    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${text}%20${encoded}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${encoded}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`,
      telegram: `https://t.me/share/url?url=${encoded}&text=${text}`,
      email: `mailto:?subject=${text}&body=${encoded}`,
    };

    if (platform === 'copy') {
      if (Platform.OS === 'web') {
        try { await navigator.clipboard.writeText(shareUrl); } catch {}
      }
      onClose();
      return;
    }

    const url = urls[platform];
    if (url) {
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        try {
          const supported = await Linking.canOpenURL(url);
          if (supported) await Linking.openURL(url);
        } catch { /* app not installed */ }
      }
    }
    onClose();
  };

  const SheetContent = (
    <TouchableOpacity
      activeOpacity={1}
      style={[styles.sheet, { backgroundColor: colors.surface }]}
    >
      <View style={[styles.handle, { backgroundColor: colors.border }]} />
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Share Event</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.eventName, { color: colors.textSecondary }]} numberOfLines={2}>
        {eventTitle}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionsRow}>
        {SHARE_OPTIONS.map((opt) => (
          <TouchableOpacity key={opt.id} style={styles.optionItem} onPress={() => handleShare(opt.id)}>
            <View style={[styles.optionIcon, { backgroundColor: opt.color + '18', borderColor: opt.color + '30' }]}>
              <Ionicons name={opt.icon as any} size={24} color={opt.color} />
            </View>
            <Text style={[styles.optionLabel, { color: colors.textSecondary }]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </TouchableOpacity>
  );

  if (Platform.OS === 'ios') {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
          {SheetContent}
        </TouchableOpacity>
      </Modal>
    );
  }

  // web + Android: plain View overlay — Modal crashes on both platforms
  if (!visible) return null;
  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay, { zIndex: 999 }]}>
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      {SheetContent}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 16, fontWeight: '700' },
  closeBtn: { padding: 4 },
  eventName: {
    fontSize: 13, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4, lineHeight: 18,
  },
  optionsRow: {
    paddingHorizontal: 16, paddingVertical: 16, gap: 8,
  },
  optionItem: {
    alignItems: 'center', gap: 6, width: 72,
  },
  optionIcon: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  optionLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
});
