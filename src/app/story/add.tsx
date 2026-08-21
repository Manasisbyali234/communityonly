import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback,
  SafeAreaView, Platform, ActivityIndicator, Alert, ScrollView,
  StatusBar, TextInput, KeyboardAvoidingView, useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useToastStore } from '../../store/toastStore';
import { useConfirmStore } from '../../store/confirmStore';
import { uploadMediaFile, useCreateStoryMutation, useUpdateStoryMutation } from '../../api/story';

type MediaItem = { uri: string; type: 'image' | 'video'; blob?: Blob; filename?: string; mimeType?: string };
type Screen = 'camera' | 'preview';
type Tool = 'none' | 'emoji' | 'text';

type EmojiOverlay = { id: number; emoji: string; size: number; top: number; left: number };
type TextOverlay  = { id: number; text: string; color: string; size: number; top: number; left: number };

const EMOJIS = ['ðŸ˜€','ðŸ˜‚','ðŸ˜','ðŸ¥°','ðŸ˜Ž','ðŸ¤©','ðŸ˜­','ðŸ˜±','ðŸ”¥','â¤ï¸','ðŸ’¯','âœ¨','ðŸŽ‰','ðŸ‘','ðŸ™Œ','ðŸ’ª','ðŸ¤”','ðŸ˜´','ðŸ¥³','ðŸ˜‡','ðŸŒŸ','ðŸ’«','ðŸŽŠ','ðŸŽˆ','ðŸŒˆ','ðŸ¦‹','ðŸŒ¸','ðŸ€','âš¡','ðŸŽ¯'];

const COLORS = [
  '#FFFFFF','#000000','#FF3B30','#FF9500','#FFCC00',
  '#34C759','#00C7BE','#007AFF','#5856D6','#FF2D55',
  '#AF52DE','#FF6B6B','#FFD93D','#6BCB77','#4D96FF',
];
const MAX_VIDEO_SECONDS = 30;
const ALLOWED_IMAGE_TYPES = ['image/jpeg','image/jpg','image/png','image/webp','image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4','video/quicktime','video/webm','video/mpeg'];
const MAX_FILE_MB = 50;

function validateFile(file: File): string | null {
  const allowed = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
  if (!allowed.includes(file.type.toLowerCase())) return `Unsupported format: ${file.type}`;
  if (file.size > MAX_FILE_MB * 1024 * 1024) return `File too large (max ${MAX_FILE_MB}MB)`;
  return null;
}

// â”€â”€â”€ Camera Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CameraScreen({ onMedia }: { onMedia: (m: MediaItem) => void }) {
  const router = useRouter();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [recording, setRecording] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const openFilePicker = (capture?: 'environment' | 'user') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES].join(',');
    if (capture) input.capture = capture;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const err = validateFile(file);
      if (err) { Alert.alert('Invalid file', err); return; }
      onMedia({ uri: URL.createObjectURL(file), type: file.type.startsWith('video') ? 'video' : 'image', blob: file, filename: file.name, mimeType: file.type });
    };
    input.click();
  };

  const handleGallery = () => {
    if (Platform.OS === 'web') { openFilePicker(); return; }
    import('expo-image-picker').then(async ({ launchImageLibraryAsync, requestMediaLibraryPermissionsAsync }) => {
      const { status } = await requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission required', 'Allow photo library access to pick media.'); return; }
      const result = await launchImageLibraryAsync({ mediaTypes: ['images', 'videos'] as any, quality: 0.9 });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const isVideo = asset.type === 'video';
        const mime = asset.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg');
        const ext = mime.split('/')[1]?.replace('quicktime', 'mov') ?? (isVideo ? 'mp4' : 'jpg');
        const name = asset.fileName ?? `story_${Date.now()}.${ext}`;
        onMedia({ uri: asset.uri, type: isVideo ? 'video' : 'image', mimeType: mime, filename: name });
      }
    });
  };

  if (!cameraPermission) {
    return <View style={s.container}><ActivityIndicator color="#FFF" /></View>;
  }

  if (!cameraPermission.granted) {
    return (
      <View style={s.container}>
        <SafeAreaView style={s.safeTop}>
          <TouchableOpacity style={s.closeBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="close" size={30} color="#FFF" />
          </TouchableOpacity>
        </SafeAreaView>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20, paddingHorizontal: 32 }}>
          <Ionicons name="camera-outline" size={72} color="#FFF" />
          <Text style={s.permTitle}>Camera Access Needed</Text>
          <Text style={s.permSub}>Allow camera access to take photos and videos for your story.</Text>
          <TouchableOpacity style={s.igBtn} onPress={requestCameraPermission}>
            <Text style={s.igBtnText}>Allow Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.igBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]} onPress={handleGallery}>
            <Ionicons name="images-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={s.igBtnText}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handlePressIn = () => {
    if (Platform.OS === 'web') { openFilePicker(facing === 'front' ? 'user' : 'environment'); return; }
    isLongPress.current = false;
    longPressTimer.current = setTimeout(async () => {
      isLongPress.current = true;
      if (!micPermission?.granted) await requestMicPermission();
      if (!cameraRef.current) return;
      setRecording(true); setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
      try {
        const video = await cameraRef.current.recordAsync({ maxDuration: MAX_VIDEO_SECONDS });
        if (video?.uri) onMedia({ uri: video.uri, type: 'video', mimeType: 'video/mp4', filename: `story_${Date.now()}.mp4` });
      } catch (error) {
        Alert.alert('Could not record video', error instanceof Error ? error.message : 'Please try again.');
      } finally {
        if (timerRef.current) clearInterval(timerRef.current);
        setRecording(false); setElapsed(0);
      }
    }, 400);
  };

  const handlePressOut = async () => {
    if (Platform.OS === 'web') return;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (recording) {
      cameraRef.current?.stopRecording();
    } else if (!isLongPress.current) {
      try {
        if (!cameraRef.current || !cameraReady) {
          Alert.alert('Camera is starting', 'Please wait a moment and try again.');
          return;
        }
        const photo = await cameraRef.current?.takePictureAsync({ quality: 0.92 });
        if (photo?.uri) onMedia({ uri: photo.uri, type: 'image', mimeType: 'image/jpeg', filename: `story_${Date.now()}.jpg` });
        else Alert.alert('Could not capture photo', 'The camera did not return a photo. Please try again.');
      } catch (error) {
        Alert.alert('Could not capture photo', error instanceof Error ? error.message : 'Please try again.');
      }
    }
  };

  const progress = recording ? (elapsed / MAX_VIDEO_SECONDS) * 100 : 0;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        flash={flash}
        mode={recording ? 'video' : 'picture'}
        onCameraReady={() => setCameraReady(true)}
        onMountError={({ message }) => Alert.alert('Camera unavailable', message)}
      />

      {/* Top gradient */}
      <LinearGradient colors={['rgba(0,0,0,0.55)', 'transparent']} style={s.topGradient} />

      {/* Recording progress bar */}
      {recording && (
        <View style={s.progressBarBg}>
          <View style={[s.progressBarFill, { width: `${progress}%` as any }]} />
        </View>
      )}

      {/* Top bar */}
      <SafeAreaView style={s.safeTop}>
        <View style={s.topBar}>
          <TouchableOpacity style={s.closeBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="close" size={30} color="#FFF" />
          </TouchableOpacity>
          <View style={s.topRight}>
            <TouchableOpacity style={s.topIconBtn} onPress={() => setFlash(f => f === 'off' ? 'on' : 'off')}>
              <Ionicons name={flash === 'on' ? 'flash' : 'flash-off'} size={24} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={s.topIconBtn} onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}>
              <Ionicons name="camera-reverse-outline" size={26} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Recording timer */}
      {recording && (
        <View style={s.recBadge}>
          <View style={s.recDot} />
          <Text style={s.recTimer}>
            {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
          </Text>
        </View>
      )}

      {/* Bottom gradient */}
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={s.bottomGradient} />

      {/* Bottom bar */}
      <View style={s.bottomBar}>
        {/* Gallery */}
        <TouchableOpacity style={s.galleryBtn} onPress={handleGallery}>
          <Ionicons name="images-outline" size={28} color="#FFF" />
          <Text style={s.galleryLabel}>Gallery</Text>
        </TouchableOpacity>

        {/* Shutter */}
        <TouchableWithoutFeedback onPressIn={handlePressIn} onPressOut={handlePressOut} disabled={!cameraReady}>
          <View style={[s.shutterOuter, !cameraReady && { opacity: 0.5 }]}>
            <LinearGradient
              colors={recording ? ['#FF3B30', '#FF6B6B'] : ['#FFFFFF', '#E0E0E0']}
              style={s.shutterInner}
            />
          </View>
        </TouchableWithoutFeedback>

        {/* Flip */}
        <TouchableOpacity style={s.flipBtn} onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}>
          <Ionicons name="camera-reverse" size={28} color="#FFF" />
          <Text style={s.galleryLabel}>Flip</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.hintText}>{recording ? 'Release to stop' : 'Tap photo Â· Hold video'}</Text>
    </View>
  );
}

// â”€â”€â”€ Emoji Size Controls â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function EmojiSizeControls({ id, size, onResize, onDelete }: { id: number; size: number; onResize: (id: number, delta: number) => void; onDelete: (id: number) => void }) {
  return (
    <View style={s.emojiControls}>
      <TouchableOpacity style={s.sizeBtn} onPress={() => onResize(id, -6)}>
        <Text style={s.sizeBtnText}>âˆ’</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.sizeBtn} onPress={() => onResize(id, 6)}>
        <Text style={s.sizeBtnText}>+</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[s.sizeBtn, { backgroundColor: 'rgba(255,59,48,0.8)' }]} onPress={() => onDelete(id)}>
        <Ionicons name="trash-outline" size={14} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

// â”€â”€â”€ Preview Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PreviewScreen({ media, onRetake }: { media: MediaItem; onRetake: () => void }) {
  const showToast = useToastStore((s) => s.showToast);
  const router = useRouter();
  const { storyId } = useLocalSearchParams<{ storyId?: string }>();
  const createStory = useCreateStoryMutation();
  const updateStory = useUpdateStoryMutation();
  const { width: windowWidth } = useWindowDimensions();

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploaded, setUploaded] = useState(false);
  const uploadedOnce = useRef(false);

  // Tool state
  const [activeTool, setActiveTool] = useState<Tool>('none');

  // Emoji state
  const [overlayEmojis, setOverlayEmojis] = useState<EmojiOverlay[]>([]);
  const [selectedEmojiId, setSelectedEmojiId] = useState<number | null>(null);

  // Text state
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [textInput, setTextInput] = useState('');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textSize, setTextSize] = useState(28);
  const [selectedTextId, setSelectedTextId] = useState<number | null>(null);
  const textInputRef = useRef<TextInput>(null);

  const toggleTool = (tool: Tool) => {
    setActiveTool(prev => prev === tool ? 'none' : tool);
    setSelectedEmojiId(null);
    setSelectedTextId(null);
    if (tool === 'text') setTimeout(() => textInputRef.current?.focus(), 100);
  };

  const addEmoji = (emoji: string) => {
    setOverlayEmojis(prev => [...prev, { id: Date.now(), emoji, size: 44, top: 25 + Math.random() * 30, left: 10 + Math.random() * 55 }]);
    setActiveTool('none');
  };

  const resizeEmoji = (id: number, delta: number) => {
    setOverlayEmojis(prev => prev.map(e => e.id === id ? { ...e, size: Math.max(20, Math.min(100, e.size + delta)) } : e));
  };

  const deleteEmoji = (id: number) => {
    setOverlayEmojis(prev => prev.filter(e => e.id !== id));
    setSelectedEmojiId(null);
  };

  const addText = () => {
    if (!textInput.trim()) return;
    setTextOverlays(prev => [...prev, { id: Date.now(), text: textInput.trim(), color: textColor, size: textSize, top: 20 + Math.random() * 40, left: 10 + Math.random() * 40 }]);
    setTextInput('');
    setActiveTool('none');
  };

  const deleteText = (id: number) => {
    setTextOverlays(prev => prev.filter(t => t.id !== id));
    setSelectedTextId(null);
  };

  const containerRef = useRef<KeyboardAvoidingView>(null);
  const [containerSize, setContainerSize] = useState({ w: windowWidth, h: 0 });

  const compositeImageWithOverlays = async (sourceBlob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      const objectUrl = URL.createObjectURL(sourceBlob);
      img.onload = () => {
        // Use the container's rendered size so overlay % positions map exactly
        const W = containerSize.w || windowWidth;
        const H = containerSize.h || img.naturalHeight * (W / img.naturalWidth);
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d')!;

        // Draw image cover-fitted into canvas
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const canvasAspect = W / H;
        let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
        if (imgAspect > canvasAspect) {
          sw = img.naturalHeight * canvasAspect;
          sx = (img.naturalWidth - sw) / 2;
        } else {
          sh = img.naturalWidth / canvasAspect;
          sy = (img.naturalHeight - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
        URL.revokeObjectURL(objectUrl);

        // Draw emoji overlays â€” positions are already in screen px units
        overlayEmojis.forEach(item => {
          ctx.font = `${item.size}px serif`;
          ctx.textBaseline = 'top';
          ctx.fillText(item.emoji, (item.left / 100) * W, (item.top / 100) * H);
        });

        // Draw text overlays
        textOverlays.forEach(item => {
          ctx.font = `700 ${item.size}px sans-serif`;
          ctx.textBaseline = 'top';
          ctx.shadowColor = 'rgba(0,0,0,0.6)';
          ctx.shadowBlur = 4;
          ctx.fillStyle = item.color;
          ctx.fillText(item.text, (item.left / 100) * W, (item.top / 100) * H);
          ctx.shadowBlur = 0;
        });

        canvas.toBlob(blob => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas export failed'));
        }, 'image/jpeg', 0.92);
      };
      img.onerror = () => reject(new Error('Failed to load image for compositing'));
      img.src = objectUrl;
    });
  };

  const handleUpload = async () => {
    if (uploadedOnce.current || uploading) return;

    const ok = await useConfirmStore.getState().confirm({
      title: storyId ? 'Update story?' : 'Post story?',
      message: storyId ? 'Your story will be updated.' : 'Your story will be shared and visible to members for 24 hours.',
      confirmText: storyId ? 'Update' : 'Post',
      cancelText: 'Cancel',
      isDestructive: false,
      icon: 'paper-plane-outline',
    });
    if (!ok) return;

    uploadedOnce.current = true;
    setUploading(true); setProgress(0);
    try {
      let fileBlob: Blob;
      const filename = media.filename ?? `story_${Date.now()}`;
      const mimeType = media.mimeType ?? (media.type === 'video' ? 'video/mp4' : 'image/jpeg');
      if (Platform.OS !== 'web') {
        const mediaUrl = await uploadMediaFile(
          { uri: media.uri, name: filename, type: mimeType },
          filename,
          mimeType,
          setProgress
        );
        const payload = { mediaUrl, mediaType: media.type === 'video' ? 'VIDEO' as const : 'IMAGE' as const };
        if (storyId) await updateStory.mutateAsync({ id: storyId, ...payload });
        else await createStory.mutateAsync(payload);
        setUploaded(true);
        setTimeout(() => router.replace('/(tabs)'), 800);
        return;
      }

      const rawBlob = media.blob ? media.blob : await (await fetch(media.uri)).blob();
      if (media.type === 'image' && (overlayEmojis.length > 0 || textOverlays.length > 0)) {
        fileBlob = await compositeImageWithOverlays(rawBlob);
      } else {
        fileBlob = rawBlob;
      }

      const mediaUrl = await uploadMediaFile(fileBlob, filename, mimeType, setProgress);
      const payload = { mediaUrl, mediaType: media.type === 'video' ? 'VIDEO' as const : 'IMAGE' as const };
      if (storyId) await updateStory.mutateAsync({ id: storyId, ...payload });
      else await createStory.mutateAsync(payload);
      setUploaded(true);
      setTimeout(() => router.replace('/(tabs)'), 800);
    } catch (err: any) {
      uploadedOnce.current = false;
      showToast(err?.message ?? 'Upload failed. Please try again.', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      ref={containerRef}
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      onLayout={e => setContainerSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Media */}
      {media.type === 'image' ? (
        <Image source={{ uri: media.uri }} style={StyleSheet.absoluteFill} contentFit="contain" />
      ) : Platform.OS === 'web' ? (
        // @ts-ignore
        <video src={media.uri} autoPlay loop playsInline muted={false} controls={false}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' } as any} />
      ) : (
        <NativeVideoPreview uri={media.uri} />
      )}

      <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent']} style={s.topGradient} />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.65)']} style={s.bottomGradient} />

      {/* â”€â”€ Emoji overlays â”€â”€ */}
      {overlayEmojis.map(item => (
        <TouchableOpacity
          key={item.id}
          style={[s.overlayItem, { top: `${item.top}%` as any, left: `${item.left}%` as any }]}
          onPress={() => setSelectedEmojiId(prev => prev === item.id ? null : item.id)}
        >
          <Text style={{ fontSize: item.size }}>{item.emoji}</Text>
          {selectedEmojiId === item.id && (
            <EmojiSizeControls id={item.id} size={item.size} onResize={resizeEmoji} onDelete={deleteEmoji} />
          )}
        </TouchableOpacity>
      ))}

      {/* â”€â”€ Text overlays â”€â”€ */}
      {textOverlays.map(item => (
        <TouchableOpacity
          key={item.id}
          style={[s.overlayItem, { top: `${item.top}%` as any, left: `${item.left}%` as any }]}
          onPress={() => setSelectedTextId(prev => prev === item.id ? null : item.id)}
        >
          <Text style={[s.textOverlayText, { fontSize: item.size, color: item.color }]}>{item.text}</Text>
          {selectedTextId === item.id && (
            <View style={s.textEditControls}>
              {/* Size row */}
              <View style={s.textEditRow}>
                <TouchableOpacity style={s.sizeBtn} onPress={() => setTextOverlays(prev => prev.map(t => t.id === item.id ? { ...t, size: Math.max(14, t.size - 4) } : t))}>
                  <Text style={s.sizeBtnText}>âˆ’</Text>
                </TouchableOpacity>
                <Text style={s.textSizeLabel}>{item.size}px</Text>
                <TouchableOpacity style={s.sizeBtn} onPress={() => setTextOverlays(prev => prev.map(t => t.id === item.id ? { ...t, size: Math.min(72, t.size + 4) } : t))}>
                  <Text style={s.sizeBtnText}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.sizeBtn, { backgroundColor: 'rgba(255,59,48,0.8)', marginLeft: 4 }]} onPress={() => deleteText(item.id)}>
                  <Ionicons name="trash-outline" size={14} color="#FFF" />
                </TouchableOpacity>
              </View>
              {/* Color row */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 4, paddingTop: 6 }}>
                {COLORS.map(c => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setTextOverlays(prev => prev.map(t => t.id === item.id ? { ...t, color: c } : t))}
                    style={[s.colorDot, {
                      backgroundColor: c,
                      borderWidth: item.color === c ? 3 : 1.5,
                      borderColor: item.color === c ? '#FFF' : 'rgba(255,255,255,0.35)',
                      transform: [{ scale: item.color === c ? 1.2 : 1 }],
                    }]}
                  />
                ))}
              </ScrollView>
            </View>
          )}
        </TouchableOpacity>
      ))}

      {/* â”€â”€ Emoji picker panel â”€â”€ */}
      {activeTool === 'emoji' && (
        <View style={s.toolPanel}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4, paddingHorizontal: 12 }}>
            {EMOJIS.map(emoji => (
              <TouchableOpacity key={emoji} onPress={() => addEmoji(emoji)} style={s.emojiItem}>
                <Text style={{ fontSize: 34 }}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* â”€â”€ Text input panel â”€â”€ */}
      {activeTool === 'text' && (
        <View style={s.textPanel}>
          {/* Color row */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 12, paddingBottom: 8 }}>
            {COLORS.map(c => (
              <TouchableOpacity key={c} onPress={() => setTextColor(c)}
                style={[s.colorDot, {
                  backgroundColor: c,
                  borderWidth: textColor === c ? 3 : 1.5,
                  borderColor: textColor === c ? '#FFF' : 'rgba(255,255,255,0.4)',
                  transform: [{ scale: textColor === c ? 1.2 : 1 }],
                }]}
              />
            ))}
          </ScrollView>
          {/* Size row */}
          <View style={s.textSizeRow}>
            <TouchableOpacity style={s.sizeBtn} onPress={() => setTextSize(prev => Math.max(14, prev - 4))}>
              <Text style={s.sizeBtnText}>Aâˆ’</Text>
            </TouchableOpacity>
            <Text style={s.textSizeLabel}>{textSize}px</Text>
            <TouchableOpacity style={s.sizeBtn} onPress={() => setTextSize(prev => Math.min(72, prev + 4))}>
              <Text style={s.sizeBtnText}>A+</Text>
            </TouchableOpacity>
          </View>
          {/* Input row */}
          <View style={s.textInputRow}>
            <TextInput
              ref={textInputRef}
              style={[s.textInputField, { color: textColor, fontSize: Math.min(textSize, 22) }]}
              placeholder="Type somethingâ€¦"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={textInput}
              onChangeText={setTextInput}
              autoFocus
              multiline
              maxLength={120}
            />
            <TouchableOpacity style={s.textAddBtn} onPress={addText}>
              <Ionicons name="checkmark" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* â”€â”€ Top bar â”€â”€ */}
      <SafeAreaView style={s.safeTop}>
        <View style={s.topBar}>
          <TouchableOpacity style={s.closeBtn} onPress={onRetake}>
            <Ionicons name="arrow-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <View style={s.topRight}>
            <TouchableOpacity
              style={[s.topIconBtn, activeTool === 'emoji' && s.topIconActive]}
              onPress={() => toggleTool('emoji')}
            >
              <Text style={{ fontSize: 22 }}>ðŸ˜Š</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.topIconBtn, activeTool === 'text' && s.topIconActive]}
              onPress={() => toggleTool('text')}
            >
              <MaterialIcons name="text-fields" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* â”€â”€ Bottom actions â”€â”€ */}
      <View style={s.previewBottom}>
        {uploading ? (
          <View style={s.uploadingRow}>
            <ActivityIndicator color="#FFF" size="small" />
            <Text style={s.uploadingText}>Uploadingâ€¦ {progress}%</Text>
            <View style={s.uploadProgressBg}>
              <View style={[s.uploadProgressFill, { width: `${progress}%` as any }]} />
            </View>
          </View>
        ) : uploaded ? (
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Ionicons name="checkmark-circle" size={52} color="#4CAF50" />
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 16 }}>Story Posted!</Text>
          </View>
        ) : (
          <View style={s.previewActions}>
            <View style={s.storyLabelWrap}>
              <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={s.storyLabel}>Your Story</Text>
            </View>
            <TouchableOpacity style={s.sendBtn} onPress={handleUpload}>
              <Text style={s.sendBtnText}>{storyId ? 'Update Story' : 'Share to Story'}</Text>
              <View style={s.sendArrow}>
                <Ionicons name="arrow-forward" size={20} color="#FFF" />
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// â”€â”€â”€ Native Video Preview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function NativeVideoPreview({ uri }: { uri: string }) {
  const [VideoView, setVideoView] = useState<any>(null);
  const [player, setPlayer] = useState<any>(null);

  useEffect(() => {
    import('expo-video').then(mod => {
      setVideoView(() => mod.VideoView);
      if (mod.createVideoPlayer) {
        const vp = mod.createVideoPlayer(uri);
        vp.loop = true; vp.play();
        setPlayer(vp);
      }
    }).catch(() => {});
  }, [uri]);

  if (!VideoView || !player) return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator color="#FFF" />
    </View>
  );

  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />;
}

// â”€â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function AddStoryScreen() {
  const [screen, setScreen] = useState<Screen>('camera');
  const [media, setMedia] = useState<MediaItem | null>(null);

  const handleMedia = (item: MediaItem) => { setMedia(item); setScreen('preview'); };
  const handleRetake = () => {
    if (media?.uri?.startsWith('blob:')) URL.revokeObjectURL(media.uri);
    setMedia(null); setScreen('camera');
  };

  return (
    <View style={s.container}>
      {screen === 'preview' && media
        ? <PreviewScreen media={media} onRetake={handleRetake} />
        : <CameraScreen onMedia={handleMedia} />
      }
    </View>
  );
}

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  safeTop: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20 },

  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 160, zIndex: 5 },
  bottomGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 220, zIndex: 5 },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 44 : 12, paddingBottom: 8,
  },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center',
  },
  topRight: { flexDirection: 'row', gap: 8 },
  topIconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center',
  },

  // Recording progress
  progressBarBg: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)', zIndex: 30,
  },
  progressBarFill: { height: '100%', backgroundColor: '#FF3B30' },

  recBadge: {
    position: 'absolute', top: Platform.OS === 'ios' ? 120 : 90,
    alignSelf: 'center', flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, zIndex: 20, gap: 6,
  },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3B30' },
  recTimer: { color: '#FFF', fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },

  // Bottom camera bar
  bottomBar: {
    position: 'absolute', bottom: Platform.OS === 'ios' ? 48 : 32,
    left: 0, right: 0, flexDirection: 'row',
    justifyContent: 'space-around', alignItems: 'center',
    paddingHorizontal: 24, zIndex: 20,
  },
  galleryBtn: { alignItems: 'center', gap: 4, width: 60 },
  galleryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '500' },
  flipBtn: { alignItems: 'center', gap: 4, width: 60 },

  // Instagram-style shutter
  shutterOuter: {
    width: 84, height: 84, borderRadius: 42,
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
    elevation: 8,
  },
  shutterInner: { width: 68, height: 68, borderRadius: 34 },

  hintText: {
    position: 'absolute', bottom: Platform.OS === 'ios' ? 18 : 10,
    alignSelf: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 12, zIndex: 20,
  },

  // Preview bottom
  previewBottom: {
    position: 'absolute', bottom: Platform.OS === 'ios' ? 48 : 32,
    left: 0, right: 0, paddingHorizontal: 20, zIndex: 20,
  },
  previewActions: { gap: 14 },
  storyLabelWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'center',
  },
  storyLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600' },

  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: 30, paddingVertical: 14, paddingHorizontal: 24, gap: 10,
  },
  sendBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  sendArrow: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },

  uploadingRow: { alignItems: 'center', gap: 10 },
  uploadingText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  uploadProgressBg: { width: '100%', height: 3, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden' },
  uploadProgressFill: { height: '100%', backgroundColor: '#FFF', borderRadius: 2 },

  // Overlays
  overlayItem: { position: 'absolute', zIndex: 15, alignItems: 'center' },
  textOverlayText: { fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4 },

  // Emoji / text size controls
  emojiControls: {
    flexDirection: 'row', gap: 6, marginTop: 4,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  sizeBtn: {
    minWidth: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6,
  },
  sizeBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  // Tool panels
  toolPanel: {
    position: 'absolute', top: Platform.OS === 'ios' ? 120 : 90,
    left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.78)',
    paddingVertical: 10, zIndex: 25,
  },
  emojiItem: { padding: 6 },

  textPanel: {
    position: 'absolute', bottom: Platform.OS === 'ios' ? 140 : 120,
    left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.82)',
    paddingTop: 12, paddingBottom: 8, zIndex: 25,
  },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  textSizeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 6,
  },
  textSizeLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, flex: 1, textAlign: 'center' },
  // Inline edit controls for selected text overlay
  textEditControls: {
    marginTop: 6,
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: 16, paddingHorizontal: 8, paddingVertical: 8,
    alignItems: 'center', gap: 4,
  },
  textEditRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  textInputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, gap: 8,
  },
  textInputField: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10,
    fontWeight: '600', minHeight: 44,
  },
  textAddBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center',
  },

  topIconActive: { backgroundColor: 'rgba(255,255,255,0.3)', borderWidth: 1.5, borderColor: '#FFF' },

  // Permission screen
  permTitle: { color: '#FFF', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  permSub: { color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontSize: 14, lineHeight: 20 },
  igBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)',
  },
  igBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
