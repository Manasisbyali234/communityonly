import React, { useRef, useState, useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  PanResponder, Platform, useWindowDimensions, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';

export interface CropResult {
  uri: string;
  width: number;
  height: number;
}

interface Props {
  visible: boolean;
  imageUri: string | null;
  aspect: [number, number];
  onDone: (result: CropResult) => void;
  onCancel: () => void;
  accentColor?: string;
}

const FRAME_PADDING = 24;

export default function ImageCropModal({
  visible, imageUri, aspect, onDone, onCancel, accentColor = '#16A34A',
}: Props) {
  const { width: SW, height: SH } = useWindowDimensions();

  const frameW = SW - FRAME_PADDING * 2;
  const frameH = frameW * (aspect[1] / aspect[0]);
  const frameTop = (SH - frameH) / 2;

  // Use refs for everything pan handlers need — avoids stale closure problem
  const frameWRef = useRef(frameW);
  const frameHRef = useRef(frameH);
  frameWRef.current = frameW;
  frameHRef.current = frameH;

  const imgNaturalRef = useRef({ w: 1, h: 1 });
  const [imgNatural, setImgNatural] = useState({ w: 1, h: 1 });

  const [render, setRender] = useState(0);
  const forceRender = () => setRender(n => n + 1);
  const [processing, setProcessing] = useState(false);

  const scale = useRef(1);
  const tx = useRef(0);
  const ty = useRef(0);

  const clamp = (val: number, min: number, max: number) =>
    Math.max(min, Math.min(max, val));

  // Always reads from refs — never stale
  const clampTranslation = (s: number, dx: number, dy: number) => {
    const { w, h } = imgNaturalRef.current;
    const fw = frameWRef.current;
    const fh = frameHRef.current;
    const dispW = w * s;
    const dispH = h * s;
    const maxX = Math.max(0, (dispW - fw) / 2);
    const maxY = Math.max(0, (dispH - fh) / 2);
    return {
      x: clamp(dx, -maxX, maxX),
      y: clamp(dy, -maxY, maxY),
    };
  };

  const initTransform = useCallback((natW: number, natH: number) => {
    const fw = frameWRef.current;
    const fh = frameHRef.current;
    const scaleToFill = Math.max(fw / natW, fh / natH);
    scale.current = scaleToFill;
    tx.current = 0;
    ty.current = 0;
    forceRender();
  }, []);

  const onImageLoad = useCallback((e: any) => {
    const w = e.source?.width ?? 1;
    const h = e.source?.height ?? 1;
    imgNaturalRef.current = { w, h };
    setImgNatural({ w, h });
    initTransform(w, h);
  }, [initTransform]);

  const prevUri = useRef<string | null>(null);
  if (imageUri && imageUri !== prevUri.current) {
    prevUri.current = imageUri;
    scale.current = 1;
    tx.current = 0;
    ty.current = 0;
    imgNaturalRef.current = { w: 1, h: 1 };
  }

  // ── PanResponder — reads from refs, never stale ───────────────────────────
  const lastTouches = useRef<{ x: number; y: number }[]>([]);
  const lastDist = useRef<number | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (e) => {
        lastTouches.current = e.nativeEvent.touches.map(t => ({ x: t.pageX, y: t.pageY }));
        lastDist.current = null;
      },

      onPanResponderMove: (e) => {
        const touches = e.nativeEvent.touches;

        if (touches.length === 2) {
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (lastDist.current !== null) {
            const delta = dist / lastDist.current;
            const { w, h } = imgNaturalRef.current;
            const fw = frameWRef.current;
            const fh = frameHRef.current;
            const minScale = Math.max(fw / w, fh / h);
            const newScale = clamp(scale.current * delta, minScale, minScale * 6);
            scale.current = newScale;
            const clamped = clampTranslation(newScale, tx.current, ty.current);
            tx.current = clamped.x;
            ty.current = clamped.y;
            forceRender();
          }
          lastDist.current = dist;
          lastTouches.current = touches.map(t => ({ x: t.pageX, y: t.pageY }));

        } else if (touches.length === 1 && lastTouches.current.length >= 1) {
          const prev = lastTouches.current[0];
          const ddx = touches[0].pageX - prev.x;
          const ddy = touches[0].pageY - prev.y;
          const clamped = clampTranslation(scale.current, tx.current + ddx, ty.current + ddy);
          tx.current = clamped.x;
          ty.current = clamped.y;
          forceRender();
          lastTouches.current = [{ x: touches[0].pageX, y: touches[0].pageY }];
          lastDist.current = null;
        }
      },

      onPanResponderRelease: () => {
        lastDist.current = null;
      },
    })
  ).current;

  // ── Web mouse drag support ────────────────────────────────────────────────
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const webHandlers = Platform.OS === 'web' ? {
    onMouseDown: (e: any) => {
      isDragging.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    },
    onMouseMove: (e: any) => {
      if (!isDragging.current) return;
      const ddx = e.clientX - lastMouse.current.x;
      const ddy = e.clientY - lastMouse.current.y;
      const clamped = clampTranslation(scale.current, tx.current + ddx, ty.current + ddy);
      tx.current = clamped.x;
      ty.current = clamped.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      forceRender();
    },
    onMouseUp: () => { isDragging.current = false; },
    onMouseLeave: () => { isDragging.current = false; },
    onWheel: (e: any) => {
      const { w, h } = imgNaturalRef.current;
      const fw = frameWRef.current;
      const fh = frameHRef.current;
      const minScale = Math.max(fw / w, fh / h);
      const delta = e.deltaY > 0 ? 0.92 : 1.08;
      const newScale = clamp(scale.current * delta, minScale, minScale * 6);
      scale.current = newScale;
      const clamped = clampTranslation(newScale, tx.current, ty.current);
      tx.current = clamped.x;
      ty.current = clamped.y;
      forceRender();
      e.preventDefault();
    },
  } : {};

  // ── Crop & export ─────────────────────────────────────────────────────────
  const handleDone = async () => {
    if (!imageUri) return;
    setProcessing(true);
    try {
      const s = scale.current;
      const { w, h } = imgNaturalRef.current;
      const fw = frameWRef.current;
      const fh = frameHRef.current;
      const dispW = w * s;
      const dispH = h * s;

      const imgLeft = (dispW - fw) / 2 - tx.current;
      const imgTop  = (dispH - fh) / 2 - ty.current;

      const cropX = Math.max(0, imgLeft / s);
      const cropY = Math.max(0, imgTop / s);
      const cropW = Math.min(w - cropX, fw / s);
      const cropH = Math.min(h - cropY, fh / s);

      if (Platform.OS === 'web') {
        // Use Canvas API on web — ImageManipulator has no web support
        const canvas = document.createElement('canvas');
        const outW = Math.round(Math.min(1920, cropW));
        const outH = Math.round((cropH / cropW) * outW);
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas not supported');
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Image load failed'));
          img.src = imageUri;
        });
        ctx.drawImage(
          img,
          Math.round(cropX), Math.round(cropY),
          Math.round(cropW), Math.round(cropH),
          0, 0, outW, outH
        );
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        onDone({ uri: dataUrl, width: outW, height: outH });
      } else {
        const result = await ImageManipulator.manipulateAsync(
          imageUri,
          [
            {
              crop: {
                originX: Math.round(cropX),
                originY: Math.round(cropY),
                width:   Math.round(cropW),
                height:  Math.round(cropH),
              },
            },
            { resize: { width: Math.min(1920, Math.round(cropW)) } },
          ],
          { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
        );
        onDone({ uri: result.uri, width: result.width, height: result.height });
      }
    } catch {
      onCancel();
    } finally {
      setProcessing(false);
    }
  };

  const dispW = imgNatural.w * scale.current;
  const dispH = imgNatural.h * scale.current;
  const imgLeft = (SW - dispW) / 2 + tx.current;
  const imgTop  = (SH - dispH) / 2 + ty.current;

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={styles.overlay}>

        {/* ── Full image rendered behind everything ── */}
        <View
          style={StyleSheet.absoluteFill}
          {...(Platform.OS !== 'web' ? panResponder.panHandlers : {})}
          {...webHandlers}
        >
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={{
                position: 'absolute',
                width: dispW,
                height: dispH,
                left: imgLeft,
                top: imgTop,
              }}
              contentFit="fill"
              onLoad={onImageLoad}
            />
          ) : null}
        </View>

        {/* ── Dark overlay with frame cutout ── */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={[styles.shade, { height: frameTop }]} />
          <View style={{ flexDirection: 'row', height: frameH }}>
            <View style={[styles.shade, { width: FRAME_PADDING }]} />
            <View style={[styles.frame, { width: frameW, height: frameH }]}>
              {[
                { top: 0, left: 0 },
                { top: 0, right: 0 },
                { bottom: 0, left: 0 },
                { bottom: 0, right: 0 },
              ].map((pos, i) => (
                <View key={i} style={[styles.corner, pos]} />
              ))}
              <View style={[styles.gridLine, styles.gridV1]} />
              <View style={[styles.gridLine, styles.gridV2]} />
              <View style={[styles.gridLine, styles.gridH1]} />
              <View style={[styles.gridLine, styles.gridH2]} />
            </View>
            <View style={[styles.shade, { width: FRAME_PADDING }]} />
          </View>
          <View style={[styles.shade, { flex: 1 }]} />
        </View>

        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onCancel} style={styles.topBtn} disabled={processing}>
            <Ionicons name="close" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Move & Zoom to Fit</Text>
          <TouchableOpacity
            onPress={handleDone}
            style={[styles.topBtn, styles.doneBtn, { backgroundColor: accentColor }]}
            disabled={processing}
          >
            {processing
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Text style={styles.doneBtnText}>Done</Text>}
          </TouchableOpacity>
        </View>

        {/* ── Hint ── */}
        <View style={styles.hintRow}>
          <Ionicons name="hand-left-outline" size={14} color="rgba(255,255,255,0.6)" />
          <Text style={styles.hintText}>
            {Platform.OS === 'web'
              ? 'Drag to reposition · Scroll to zoom'
              : 'Drag to reposition · Pinch to zoom'}
          </Text>
        </View>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom: 12,
  },
  topBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  topTitle: {
    color: '#FFF', fontSize: 15, fontWeight: '700',
  },
  doneBtn: {
    width: 'auto' as any,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  doneBtnText: {
    color: '#FFF', fontSize: 14, fontWeight: '700',
  },
  shade: {
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  frame: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  corner: {
    position: 'absolute',
    width: 20, height: 20,
    borderColor: '#FFF',
    borderWidth: 2.5,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  gridV1: { left: '33.33%', top: 0, bottom: 0, width: StyleSheet.hairlineWidth },
  gridV2: { left: '66.66%', top: 0, bottom: 0, width: StyleSheet.hairlineWidth },
  gridH1: { top: '33.33%', left: 0, right: 0, height: StyleSheet.hairlineWidth },
  gridH2: { top: '66.66%', left: 0, right: 0, height: StyleSheet.hairlineWidth },
  hintRow: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14,
  },
  hintText: {
    color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '500',
  },
});
