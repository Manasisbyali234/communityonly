/**
 * Matrimony private chat screen.
 * Accessed via /matrimony/chat/:conversationId
 * Uses the same messaging infrastructure as the main chat but is isolated
 * from the main chat list (isMatrimonyChat = true on the conversation).
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMessagesQuery, useSendMessageMutation, useChatSocket, useMarkConversationReadMutation } from '../../../api/chat';
import { useAuthStore } from '../../../store/authStore';
import Avatar from '../../../components/common/Avatar';
import { apiClient } from '../../../api/client';
import { useQuery } from '@tanstack/react-query';

const WA = {
  bg: '#ECE5DD',
  headerBg: '#7B3FA0', // matrimony purple instead of WhatsApp green
  outgoingBg: '#5B2D8E',
  incomingBg: '#FFFFFF',
  inputBarBg: '#F0F2F5',
  sendBtn: '#7B3FA0',
  headerText: '#FFFFFF',
  outgoingText: '#FFFFFF',
  incomingText: '#111B21',
  timestampOut: 'rgba(255,255,255,0.72)',
  timestampIn: '#667781',
  dateSeparatorBg: '#F3E8FF',
  dateSeparatorText: '#5B2D8E',
  inputBg: '#FFFFFF',
  tickColor: 'rgba(255,255,255,0.72)',
  readTickColor: '#C084FC',
};

function formatTime(dateStr: string) {
  try { return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
}

function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

const AnimatedMessage = React.memo(({ children, isNew }: { children: React.ReactNode; isNew: boolean }) => {
  const opacity = useRef(new Animated.Value(isNew ? 0 : 1)).current;
  const translateY = useRef(new Animated.Value(isNew ? 12 : 0)).current;
  useEffect(() => {
    if (isNew) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
});

export default function MatrimonyChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [inputText, setInputText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const prevMessageCount = useRef(0);
  const isAtBottomRef = useRef(true);

  const EMOJIS = ['😀','😂','😍','🥰','😎','😭','😅','🤔','😊','🙏','👍','❤️','🔥','💍','😢','😡','🤣','😇','🥳','😴','👏','💪','🤝','✨','💯','🙌','😏','🤗','😬','🫡'];

  const { data: rawMessages = [], isLoading } = useMessagesQuery(id);
  const messages = React.useMemo(() => [...rawMessages].reverse(), [rawMessages]);

  // Derive the other participant from message senders
  const participant: any = React.useMemo(() => {
    const otherMsg = (rawMessages as any[]).find((m) => m.senderId !== currentUser?.id);
    return otherMsg?.sender ?? null;
  }, [rawMessages, currentUser?.id]);

  // Fetch their matrimony profile to get the matrimony displayName
  const { data: matchProfile } = useQuery({
    queryKey: ['matrimony-profile-by-user', participant?.id],
    enabled: !!participant?.id,
    queryFn: async () => {
      const res = await apiClient.get(`/matrimony/profiles/by-user/${participant.id}`);
      return res.data?.data ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const participantName: string = matchProfile?.displayName ?? participant?.displayName ?? 'Match';
  const participantAvatar: string = matchProfile?.photos?.[0] ?? participant?.avatarUrl ?? '';

  useChatSocket(id);
  const sendMessageMutation = useSendMessageMutation();
  const markReadMutation = useMarkConversationReadMutation();

  useEffect(() => {
    if (id) markReadMutation.mutate(id);
  }, [id]);

  useEffect(() => {
    if (messages.length > 0 && messages.length > prevMessageCount.current) {
      if (isAtBottomRef.current) {
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
      prevMessageCount.current = messages.length;
    } else if (messages.length > 0 && prevMessageCount.current === 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
      prevMessageCount.current = messages.length;
    }
  }, [messages.length]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    sendMessageMutation.mutate(
      { chatId: id, content: text },
      {
        onSuccess: () => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100),
        onError: () => setInputText(text),
      }
    );
  };

  type ListItem =
    | { type: 'separator'; date: string; key: string }
    | { type: 'message'; msg: any; isNew: boolean; isLastInGroup: boolean; key: string };

  const listData: ListItem[] = [];
  messages.forEach((msg: any, i: number) => {
    const prev = messages[i - 1] as any | undefined;
    if (!prev || !isSameDay(prev.createdAt, msg.createdAt)) {
      listData.push({ type: 'separator', date: msg.createdAt, key: `sep-${msg.createdAt}` });
    }
    const next = messages[i + 1] as any | undefined;
    const isLastInGroup = !next || next.senderId !== msg.senderId;
    const isNew = i >= prevMessageCount.current - 1 && prevMessageCount.current > 0;
    listData.push({ type: 'message', msg, isNew, isLastInGroup, key: msg.id });
  });

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.type === 'separator') {
      return (
        <View style={styles.dateSepRow}>
          <View style={styles.dateSepPill}>
            <Text style={styles.dateSepText}>{formatDateLabel(item.date)}</Text>
          </View>
        </View>
      );
    }
    const { msg, isNew, isLastInGroup } = item;
    const isMe = msg.senderId === currentUser?.id;
    const isRead = !!msg.readAt;
    return (
      <AnimatedMessage isNew={isNew}>
        <View style={[styles.msgRow, isMe ? styles.msgRowRight : styles.msgRowLeft, { marginBottom: isLastInGroup ? 6 : 2 }]}>
          {!isMe && (
            <View style={styles.avatarSlot}>
              {isLastInGroup && <Avatar url={participantAvatar} name={participantName} size={32} />}
            </View>
          )}
          <View style={[
            styles.bubble,
            isMe ? styles.bubbleOut : styles.bubbleIn,
            isMe ? (isLastInGroup ? styles.bubbleTailRight : null) : (isLastInGroup ? styles.bubbleTailLeft : null),
          ]}>
            <Text style={[styles.bubbleText, { color: isMe ? WA.outgoingText : WA.incomingText }]}>{msg.content}</Text>
            <View style={styles.metaRow}>
              <Text style={[styles.timestamp, { color: isMe ? WA.timestampOut : WA.timestampIn }]}>{formatTime(msg.createdAt)}</Text>
              {isMe && <Ionicons name="checkmark-done" size={14} color={isRead ? WA.readTickColor : WA.tickColor} style={{ marginLeft: 3 }} />}
            </View>
          </View>
        </View>
      </AnimatedMessage>
    );
  }, [currentUser?.id, participantAvatar, participantName]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/matrimony' as any)} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color={WA.headerText} />
        </TouchableOpacity>
        <View style={styles.headerAvatar}>
          <Avatar url={participantAvatar} name={participantName} size={40} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{participantName}</Text>
          <Text style={styles.headerSub}>💍 Matrimony Match</Text>
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={WA.sendBtn} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={listData}
            renderItem={renderItem}
            keyExtractor={(item) => item.key}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 8 }]}
            showsVerticalScrollIndicator={false}
            style={styles.messageList}
            onScroll={(e) => {
              const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
              isAtBottomRef.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 40;
            }}
            scrollEventThrottle={100}
          />
        )}

        {showEmoji && (
          <View style={styles.emojiPanel}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiScroll}>
              {EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => {
                    const text = (inputText + emoji).trim();
                    if (!text) return;
                    setInputText('');
                    setShowEmoji(false);
                    sendMessageMutation.mutate(
                      { chatId: id, content: text },
                      { onSuccess: () => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100) }
                    );
                  }}
                  style={styles.emojiBtn}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity onPress={() => setShowEmoji(v => !v)} style={styles.inputIcon}>
              <Ionicons name="happy-outline" size={24} color={showEmoji ? WA.sendBtn : '#8696A0'} />
            </TouchableOpacity>
            <TextInput
              placeholder="Message your match..."
              placeholderTextColor="#8696A0"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSend}
              multiline
              style={styles.textInput}
            />
          </View>
          <TouchableOpacity onPress={handleSend} style={[styles.sendButton, { opacity: inputText.trim() ? 1 : 0.85 }]} activeOpacity={0.75}>
            <Ionicons name={inputText.trim() ? 'send' : 'mic'} size={20} color="#FFFFFF" style={inputText.trim() ? { marginLeft: 2 } : undefined} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: WA.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: WA.headerBg, paddingHorizontal: 16, paddingVertical: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 4, elevation: 4,
  },
  backBtn: { padding: 4 },
  headerAvatar: { marginLeft: 4 },
  headerInfo: { flex: 1, marginLeft: 10 },
  headerName: { color: WA.headerText, fontSize: 16, fontWeight: '600' },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 1 },
  messageList: { flex: 1, backgroundColor: WA.bg },
  listContent: { paddingHorizontal: 16, paddingTop: 10 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dateSepRow: { alignItems: 'center', marginVertical: 10 },
  dateSepPill: { backgroundColor: WA.dateSeparatorBg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  dateSepText: { color: WA.dateSeparatorText, fontSize: 12, fontWeight: '500' },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', maxWidth: '100%' },
  msgRowLeft: { justifyContent: 'flex-start' },
  msgRowRight: { justifyContent: 'flex-end' },
  avatarSlot: { width: 36, marginRight: 4, alignItems: 'center', justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '70%', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1,
  },
  bubbleIn: { backgroundColor: WA.incomingBg, borderTopLeftRadius: 4 },
  bubbleOut: { backgroundColor: WA.outgoingBg, borderTopRightRadius: 4 },
  bubbleTailLeft: { borderBottomLeftRadius: 4 },
  bubbleTailRight: { borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, gap: 2 },
  timestamp: { fontSize: 11 },
  emojiPanel: { backgroundColor: WA.inputBarBg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#D1D7DB', paddingVertical: 6 },
  emojiScroll: { paddingHorizontal: 8, alignItems: 'center' },
  emojiBtn: { padding: 6 },
  emojiText: { fontSize: 26 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: WA.inputBarBg, paddingHorizontal: 8, paddingTop: 8, gap: 8,
  },
  inputWrapper: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: WA.inputBg, borderRadius: 24,
    paddingHorizontal: 4, paddingVertical: Platform.OS === 'ios' ? 8 : 4, minHeight: 44,
  },
  inputIcon: { padding: 6, alignSelf: 'flex-end' },
  textInput: { flex: 1, fontSize: 15, color: '#111B21', paddingHorizontal: 4, paddingVertical: 0, maxHeight: 120, alignSelf: 'center' },
  sendButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: WA.sendBtn,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3,
  },
});
