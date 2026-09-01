import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  Animated,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMessagesQuery, useSendMessageMutation, useChatSocket, useChatsQuery, useMarkConversationReadMutation, useConversationQuery } from '../../api/chat';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { useConfirmStore } from '../../store/confirmStore';
import { apiClient, API_BASE_URL } from '../../api/client';
import Avatar from '../../components/common/Avatar';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

const WA = {
  bg: '#ECE5DD',
  headerBg: '#075E54',
  outgoingBg: '#005C4B',
  incomingBg: '#FFFFFF',
  inputBarBg: '#F0F2F5',
  sendBtn: '#00A884',
  headerText: '#FFFFFF',
  outgoingText: '#FFFFFF',
  incomingText: '#111B21',
  timestampOut: 'rgba(255,255,255,0.72)',
  timestampIn: '#667781',
  dateSeparatorBg: '#E1F2FB',
  dateSeparatorText: '#54656F',
  iconColor: '#FFFFFF',
  inputText: '#111B21',
  inputPlaceholder: '#8696A0',
  inputBg: '#FFFFFF',
  tickColor: 'rgba(255,255,255,0.72)',
  readTickColor: '#53BDEB',
};

function formatTime(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function formatLastSeen(lastSeenAt?: string | null): string {
  if (!lastSeenAt) return 'Last seen unavailable';
  const date = new Date(lastSeenAt);
  if (Number.isNaN(date.getTime())) return 'Last seen unavailable';

  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return `Last seen today at ${time}`;

  return `Last seen ${date.toLocaleDateString([], { day: 'numeric', month: 'short' })} at ${time}`;
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

function getMediaType(mimeType: string): 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOC' {
  if (mimeType.startsWith('image/')) return 'IMAGE';
  if (mimeType.startsWith('video/')) return 'VIDEO';
  if (mimeType.startsWith('audio/')) return 'AUDIO';
  return 'DOC';
}

function resolveUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('http')) return url;
  // Relative proxy path — prepend the server base (strip /api/v1 suffix from API_BASE_URL)
  const serverBase = API_BASE_URL.replace(/\/api\/v1$/, '');
  return `${serverBase}${url}`;
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

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
});

function AttachmentBubble({ msg, isMe }: { msg: any; isMe: boolean }) {
  const mediaType = msg.mediaType as string | undefined;
  const url = resolveUrl(msg.mediaUrl ?? '');
  const textColor = isMe ? WA.outgoingText : WA.incomingText;
  const content: string = msg.content ?? '';

  // Distinguish image vs doc: docs have doc-like extensions in their filename (stored as content)
  const docExtensions = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv)$/i;
  const isVideo = mediaType === 'VIDEO';
  // An image: mediaType IMAGE and either no content, or content has an image extension
  const isImage = mediaType === 'IMAGE' && !docExtensions.test(content);

  console.log('[AttachmentBubble] mediaType:', mediaType, 'url:', url, 'content:', content, 'isImage:', isImage);

  if (isImage) {
    return (
      <View>
        <Image
          source={{ uri: url }}
          style={styles.attachImage}
          resizeMode="cover"
          onError={(e) => console.warn('[AttachmentBubble] image load error:', url, e.nativeEvent.error)}
          onLoad={() => console.log('[AttachmentBubble] image loaded:', url)}
        />
      </View>
    );
  }

  if (isVideo) {
    return (
      <View style={styles.docCard}>
        <Ionicons name="videocam" size={28} color={isMe ? '#fff' : WA.sendBtn} />
        <Text style={[styles.docName, { color: textColor }]} numberOfLines={2}>
          {content || 'Video'}
        </Text>
      </View>
    );
  }

  // DOC / AUDIO / unknown
  const ext = content.split('.').pop()?.toLowerCase() ?? '';
  const iconMap: Record<string, string> = {
    pdf: 'document-text', doc: 'document', docx: 'document',
    xls: 'grid', xlsx: 'grid', csv: 'grid',
    ppt: 'easel', pptx: 'easel', txt: 'reader',
  };
  const iconName = iconMap[ext] ?? 'attach';
  return (
    <View style={styles.docCard}>
      <Ionicons name={iconName as any} size={28} color={isMe ? '#fff' : WA.sendBtn} />
      <Text style={[styles.docName, { color: textColor }]} numberOfLines={2}>
        {content || 'File'}
      </Text>
    </View>
  );
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [inputText, setInputText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [muted, setMuted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [, setPresenceClock] = useState(0);
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const prevMessageCount = useRef(0);
  const isAtBottomRef = useRef(true);

  const EMOJIS = ['😀','😂','😍','🥰','😎','😭','😅','🤔','😊','🙏','👍','❤️','🔥','🎉','😢','😡','🤣','😇','🥳','😴','👏','💪','🤝','✨','💯','🙌','😏','🤗','😬','🫡'];

  const { user: currentUser } = useAuthStore();
  const { data: conversations = [] } = useChatsQuery();
  const conversation = conversations.find((c: any) => c.id === id);

  // Fallback: fetch conversation directly if not in cache (e.g. navigated from notification)
  const { data: singleConv } = useConversationQuery(id, !conversation);
  const activeConv = conversation ?? singleConv;

  const { data: rawMessages = [], isLoading } = useMessagesQuery(id);
  const messages = React.useMemo(() => [...rawMessages].reverse(), [rawMessages]);

  // Derive participant from conversation cache OR from message senders
  const participant: any = React.useMemo(() => {
    const fromConv =
      activeConv?.participants?.find((p: any) => p.userId !== currentUser?.id)?.user ??
      (activeConv as any)?.participant ??
      null;
    if (fromConv) return fromConv;
    // Last resort: find the other person's sender object from messages
    const otherMsg = (rawMessages as any[]).find((m) => m.senderId !== currentUser?.id);
    return otherMsg?.sender ?? null;
  }, [activeConv, rawMessages, currentUser?.id]);

  const participantId: string | undefined = participant?.id;
  const participantName: string = participant?.displayName ?? 'Loading...';
  const participantAvatar: string = participant?.avatarUrl ?? '';
  const participantIsOnline = participant?.isOnline === true;
  const participantStatus = participantIsOnline ? 'Online' : formatLastSeen(participant?.lastSeenAt);

  useChatSocket(id);
  const sendMessageMutation = useSendMessageMutation();
  const markReadMutation = useMarkConversationReadMutation();

  // Keep the displayed minute count current while an offline chat is open.
  useEffect(() => {
    const interval = setInterval(() => setPresenceClock((value) => value + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Guard: if id doesn't look like a cuid (starts with 'c' + alphanumeric), redirect back
  useEffect(() => {
    if (id && !/^c[a-z0-9]{20,}$/i.test(id)) {
      router.replace('/chat');
    }
  }, [id]);

  // Mark conversation as read when screen mounts or conversation changes
  useEffect(() => {
    if (id) markReadMutation.mutate(id);
  }, [id]);

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

  const handleAttach = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'image/*',
          'video/*',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
          'text/csv',
        ],
        copyToCacheDirectory: true,
        multiple: false,
        base64: false, // web: gives blob: URI + asset.file; avoids huge base64 strings
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const mimeType = asset.mimeType ?? 'application/octet-stream';
      const mediaKind = getMediaType(mimeType);

      console.log('[attach] selected:', asset.name, mimeType, 'uri:', asset.uri?.slice(0, 60));
      setUploading(true);

      // Build FormData for upload.
      // Web: expo-document-picker (base64:false) gives asset.file as a native File object.
      // Native: only a file:// URI is available — use the RN { uri, name, type } object.
      const formData = new FormData();
      if (Platform.OS === 'web') {
        const webFile: File | undefined = (asset as any).file;
        if (!webFile) throw new Error('Could not read file. Please try again.');
        formData.append('file', webFile);
      } else {
        formData.append('file', { uri: asset.uri, name: asset.name, type: mimeType } as any);
      }

      const token = useAuthStore.getState().token;
      // Use native fetch (not axios) so the browser sets the correct multipart boundary
      const uploadFetch = await fetch(`${API_BASE_URL}/media/upload-chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!uploadFetch.ok) {
        const errBody = await uploadFetch.json().catch(() => ({}));
        throw new Error(errBody?.message ?? `Upload failed: ${uploadFetch.status}`);
      }

      const uploadJson = await uploadFetch.json();
      const rawUrl: string = uploadJson.data?.url ?? '';
      // Resolve relative proxy paths to absolute so the backend URL validator accepts them
      const url = resolveUrl(rawUrl);
      const filename: string = uploadJson.data?.filename ?? '';
      console.log('[attach] uploaded rawUrl:', rawUrl, '→ resolved:', url, 'filename:', filename);

      // Backend MediaType enum: IMAGE | VIDEO | AUDIO
      const backendMediaType = mediaKind === 'VIDEO' ? 'VIDEO' : mediaKind === 'AUDIO' ? 'AUDIO' : 'IMAGE';
      // For non-image files store the filename as content so the UI can label them
      const msgContent = asset.name; // always set — backend schema requires content OR mediaUrl

      const msgPayload = { content: msgContent, mediaUrl: url, mediaType: backendMediaType };
      console.log('[attach] message payload:', JSON.stringify(msgPayload));

      const msgRes = await apiClient.post(`/messages/conversations/${id}`, msgPayload);
      const newMessage = (msgRes.data as any)?.data;
      console.log('[attach] message saved:', JSON.stringify(newMessage));

      if (newMessage?.id) {
        queryClient.setQueryData<any[]>(
          ['chats', 'messages', id],
          (old: any[] | undefined) => {
            if (!old) return [newMessage];
            if (old.some((m) => m.id === newMessage.id)) return old;
            return [newMessage, ...old];
          }
        );
        queryClient.invalidateQueries({ queryKey: ['chats', 'list'] });
      }

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err: any) {
      if (!err?.message?.includes('cancel') && !err?.message?.includes('Cancel')) {
        console.error('[attach] error:', err?.response?.data ?? err?.message);
        Alert.alert('Upload failed', err?.response?.data?.message ?? err?.message ?? 'Could not upload file.');
      }
    } finally {
      setUploading(false);
    }
  }, [id, queryClient]);

  useEffect(() => {
    if (messages.length > 0 && messages.length > prevMessageCount.current) {
      if (isAtBottomRef.current) {
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
      prevMessageCount.current = messages.length;
    } else if (messages.length > 0 && prevMessageCount.current === 0) {
      // Initial load — scroll to bottom without animation
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
      prevMessageCount.current = messages.length;
    }
  }, [messages.length]);

  const handleViewProfile = () => {
    setShowMenu(false);
    if (!participantId) { Alert.alert('Error', 'Could not find user profile.'); return; }
    router.push(`/(tabs)/user/${participantId}` as any);
  };

  const handleMute = () => {
    const next = !muted;
    setMuted(next);
    setShowMenu(false);
    Alert.alert(next ? 'Muted' : 'Unmuted', next ? 'Notifications muted for this chat.' : 'Notifications enabled for this chat.');
  };

  const handleClearChat = async () => {
    setShowMenu(false);
    const ok = await useConfirmStore.getState().confirm({
      title: 'Clear chat?',
      message: 'This will delete all messages in this conversation. This cannot be undone.',
      confirmText: 'Clear',
      cancelText: 'Cancel',
      isDestructive: true,
      icon: 'trash-outline',
    });
    if (!ok) return;

    try {
      const msgs = rawMessages as any[];
      await Promise.all(msgs.map((m) => apiClient.delete(`/messages/messages/${m.id}/me`)));
      router.canGoBack() ? router.back() : router.replace('/chat');
    } catch {
      useToastStore.getState().showToast('Failed to clear chat. Please try again.', 'error');
    }
  };

  const handleBlock = async () => {
    setShowMenu(false);
    if (!participantId) {
      useToastStore.getState().showToast('Could not identify user.', 'error');
      return;
    }

    const ok = await useConfirmStore.getState().confirm({
      title: `Block ${participantName}?`,
      message: `${participantName} will no longer be able to message you or see your profile.`,
      confirmText: 'Block',
      cancelText: 'Cancel',
      isDestructive: true,
      icon: 'ban-outline',
    });
    if (!ok) return;

    try {
      await apiClient.post(`/users/${participantId}/block`);
      router.canGoBack() ? router.back() : router.replace('/chat');
    } catch {
      useToastStore.getState().showToast('Failed to block user. Please try again.', 'error');
    }
  };

  type ListItem =
    | { type: 'separator'; date: string; key: string }
    | { type: 'message'; msg: any; isNew: boolean; showAvatar: boolean; isLastInGroup: boolean; key: string };

  const listData: ListItem[] = [];
  messages.forEach((msg: any, i: number) => {
    const prev = messages[i - 1] as any | undefined;
    if (!prev || !isSameDay(prev.createdAt, msg.createdAt)) {
      listData.push({ type: 'separator', date: msg.createdAt, key: `sep-${msg.createdAt}` });
    }
    const next = messages[i + 1] as any | undefined;
    const isLastInGroup = !next || next.senderId !== msg.senderId;
    const isNew = i >= prevMessageCount.current - 1 && prevMessageCount.current > 0;
    listData.push({ type: 'message', msg, isNew, showAvatar: isLastInGroup, isLastInGroup, key: msg.id });
  });

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.type === 'separator') {
      return (
        <View style={styles.dateSeparatorRow}>
          <View style={styles.dateSeparatorPill}>
            <Text style={styles.dateSeparatorText}>{formatDateLabel(item.date)}</Text>
          </View>
        </View>
      );
    }

    const { msg, isNew, showAvatar, isLastInGroup } = item;
    const isMe = msg.senderId === currentUser?.id;
    const isRead = !!msg.readAt;
    const hasAttachment = !!msg.mediaUrl;

    return (
      <AnimatedMessage isNew={isNew}>
        <View style={[styles.messageRow, isMe ? styles.messageRowRight : styles.messageRowLeft, { marginBottom: isLastInGroup ? 6 : 2 }]}>
          {!isMe && (
            <View style={styles.avatarSlot}>
              {showAvatar && <Avatar url={participantAvatar} name={participantName} size={32} />}
            </View>
          )}
          <View style={[
            styles.bubble,
            isMe ? styles.bubbleOut : styles.bubbleIn,
            isMe ? (isLastInGroup ? styles.bubbleTailRight : null) : (isLastInGroup ? styles.bubbleTailLeft : null),
            hasAttachment && msg.mediaType === 'IMAGE' ? styles.bubbleImage : null,
          ]}>
            {hasAttachment
              ? <AttachmentBubble msg={msg} isMe={isMe} />
              : <Text style={[styles.bubbleText, { color: isMe ? WA.outgoingText : WA.incomingText }]}>{msg.content}</Text>
            }
            <View style={styles.metaRow}>
              <Text style={[styles.timestamp, { color: isMe ? WA.timestampOut : WA.timestampIn }]}>{formatTime(msg.createdAt)}</Text>
              {isMe && (
                <Ionicons name="checkmark-done" size={14} color={isRead ? WA.readTickColor : WA.tickColor} style={{ marginLeft: 3 }} />
              )}
            </View>
          </View>
        </View>
      </AnimatedMessage>
    );
  }, [currentUser?.id, participantAvatar, participantName]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/chat')} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color={WA.iconColor} />
        </TouchableOpacity>
        <View style={styles.headerAvatar}>
          <Avatar url={participantAvatar} name={participantName} size={40} online={participantIsOnline} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{participantName}</Text>
          <Text style={styles.headerStatus}>{participantStatus}</Text>
        </View>
        <TouchableOpacity style={styles.headerIcon} onPress={() => setShowMenu(true)}>
          <Ionicons name="ellipsis-vertical" size={20} color={WA.iconColor} />
        </TouchableOpacity>
      </View>

      {/* ── Dropdown Menu Modal ── */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setShowMenu(false)}>
          <View style={styles.menuBox}>
            <TouchableOpacity style={styles.menuItem} onPress={handleViewProfile}>
              <Ionicons name="person-outline" size={18} color="#111B21" style={styles.menuIcon} />
              <Text style={styles.menuItemText}>View Profile</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleMute}>
              <Ionicons name={muted ? 'notifications-outline' : 'notifications-off-outline'} size={18} color="#111B21" style={styles.menuIcon} />
              <Text style={styles.menuItemText}>{muted ? 'Unmute Notifications' : 'Mute Notifications'}</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleClearChat}>
              <Ionicons name="trash-outline" size={18} color="#E53935" style={styles.menuIcon} />
              <Text style={[styles.menuItemText, { color: '#E53935' }]}>Clear Chat</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleBlock}>
              <Ionicons name="ban-outline" size={18} color="#E53935" style={styles.menuIcon} />
              <Text style={[styles.menuItemText, { color: '#E53935' }]}>Block</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* ── Messages ── */}
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
                      {
                        onSuccess: () => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100),
                        onError: () => setInputText(text),
                      }
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

        {uploading && (
          <View style={styles.uploadingBar}>
            <ActivityIndicator size="small" color={WA.sendBtn} />
            <Text style={styles.uploadingText}>Uploading…</Text>
          </View>
        )}

        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity onPress={() => setShowEmoji(v => !v)} style={styles.inputIcon}>
              <Ionicons name="happy-outline" size={24} color={showEmoji ? WA.sendBtn : '#8696A0'} />
            </TouchableOpacity>
            <TextInput
              placeholder="Message"
              placeholderTextColor={WA.inputPlaceholder}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSend}
              multiline
              style={styles.textInput}
            />
            <TouchableOpacity onPress={handleAttach} style={styles.inputIcon} disabled={uploading}>
              <Ionicons name="attach" size={24} color={uploading ? '#ccc' : '#8696A0'} />
            </TouchableOpacity>
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
  headerStatus: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 1 },
  headerIcon: { padding: 6 },

  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-start', alignItems: 'flex-end' },
  menuBox: {
    marginTop: 56, marginRight: 8, backgroundColor: '#FFFFFF', borderRadius: 10, minWidth: 220,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 10, overflow: 'hidden',
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 15 },
  menuIcon: { marginRight: 12 },
  menuItemText: { fontSize: 15, color: '#111B21' },
  menuDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E0E0E0', marginHorizontal: 18 },

  messageList: { flex: 1, backgroundColor: WA.bg },
  listContent: { paddingHorizontal: 16, paddingTop: 10 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  dateSeparatorRow: { alignItems: 'center', marginVertical: 10 },
  dateSeparatorPill: {
    backgroundColor: WA.dateSeparatorBg, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 1,
  },
  dateSeparatorText: { color: WA.dateSeparatorText, fontSize: 12, fontWeight: '500' },

  messageRow: { flexDirection: 'row', alignItems: 'flex-end', maxWidth: '100%' },
  messageRowLeft: { justifyContent: 'flex-start' },
  messageRowRight: { justifyContent: 'flex-end' },
  avatarSlot: { width: 36, marginRight: 4, alignItems: 'center', justifyContent: 'flex-end' },

  bubble: {
    maxWidth: '70%', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1,
  },
  bubbleImage: { paddingHorizontal: 4, paddingVertical: 4 },
  bubbleIn: { backgroundColor: WA.incomingBg, borderTopLeftRadius: 4 },
  bubbleOut: { backgroundColor: WA.outgoingBg, borderTopRightRadius: 4 },
  bubbleTailLeft: { borderBottomLeftRadius: 4 },
  bubbleTailRight: { borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, gap: 2 },
  timestamp: { fontSize: 11 },

  attachImage: { width: 200, height: 160, borderRadius: 10 },
  docCard: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  docName: { flex: 1, fontSize: 13, lineHeight: 18 },

  uploadingBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: WA.inputBarBg, paddingHorizontal: 16, paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#D1D7DB',
  },
  uploadingText: { fontSize: 13, color: '#54656F' },

  emojiPanel: {
    backgroundColor: WA.inputBarBg, borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D1D7DB', paddingVertical: 6,
  },
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
  textInput: {
    flex: 1, fontSize: 15, color: WA.inputText,
    paddingHorizontal: 4, paddingVertical: 0, maxHeight: 120, alignSelf: 'center',
  },
  sendButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: WA.sendBtn,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3,
  },
});
