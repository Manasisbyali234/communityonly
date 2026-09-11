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
  /** e.g. [1,1] for avatar, [16,5] for cover, [16,9] for banner */
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

  // vertical center of the frame within the full screen
  const frameTop = (SH - frameH) / 2;

  const [imgNatural, setImgNatural] = useState({ w: 1, h: 1 });
  const [render, setRender] = useState(0);
  const forceRender = () => setRender(n => n + 1);
  const [processing, setProcessing] = useState(false);

  // transform state
  const scale = useRef(1);
  const tx = useRef(0); // offset of image center from frame center
  const ty = useRef(0);

  const clamp = (val: number, min: number, max: number) =>
    Math.max(min, Math.min(max, val));

  // Clamp so the image always fully covers the frame
  const clampTranslation = useCallback((s: number, dx: number, dy: number) => {
    const dispW = imgNatural.w * s;
    const dispH = imgNatural.h * s;
    const maxX = Math.max(0, (dispW - frameW) / 2);
    const maxY = Math.max(0, (dispH - frameH) / 2);
    return {
      x: clamp(dx, -maxX, maxX),
      y: clamp(dy, -maxY, maxY),
    };
  }, [imgNatural, frameW, frameH]);

  const initTransform = useCallback((natW: number, natH: number) => {
    const scaleToFill = Math.max(frameW / natW, frameH / natH);
    scale.current = scaleToFill;
    tx.current = 0;
    ty.current = 0;
    forceRender();
  }, [frameW, frameH]);

  const onImageLoad = useCallback((e: any) => {
    const w = e.source?.width ?? imgNatural.w;
    const h = e.source?.height ?? imgNatural.h;
    setImgNatural({ w, h });
    initTransform(w, h);
  }, [initTransform]);

  // reset when new image arrives
  const prevUri = useRef<string | null>(null);
  if (imageUri && imageUri !== prevUri.current) {
    prevUri.current = imageUri;
    scale.current = 1;
    tx.current = 0;
    ty.current = 0;
  }

  // ── PanResponder ──────────────────────────────────────────────────────────
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
            const minScale = Math.max(frameW / imgNatural.w, frameH / imgNatural.h);
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

  // ── Crop & export ─────────────────────────────────────────────────────────
  const handleDone = async () => {
    if (!imageUri) return;
    setProcessing(true);
    try {
      const s = scale.current;
      const dispW = imgNatural.w * s;
      const dispH = imgNatural.h * s;

      const imgLeft = (dispW - frameW) / 2 - tx.current;
      const imgTop  = (dispH - frameH) / 2 - ty.current;

      const cropX = Math.max(0, imgLeft / s);
      const cropY = Math.max(0, imgTop / s);
      const cropW = Math.min(imgNatural.w - cropX, frameW / s);
      const cropH = Math.min(imgNatural.h - cropY, frameH / s);

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
    } catch {
      onCancel();
    } finally {
      setProcessing(false);
    }
  };

  const dispW = imgNatural.w * scale.current;
  const dispH = imgNatural.h * scale.current;

  // Image is centered on screen; tx/ty shift it within that center
  const imgLeft = (SW - dispW) / 2 + tx.current;
  const imgTop  = (SH - dispH) / 2 + ty.current;

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={styles.overlay}>

        {/* ── Full image rendered behind everything ── */}
        <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
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
          {/* top shade */}
          <View style={[styles.shade, { height: frameTop }]} />
          {/* middle row */}
          <View style={{ flexDirection: 'row', height: frameH }}>
            <View style={[styles.shade, { width: FRAME_PADDING }]} />
            {/* transparent frame window */}
            <View style={[styles.frame, { width: frameW, height: frameH }]}>
              {/* Corner guides */}
              {[
                { top: 0, left: 0 },
                { top: 0, right: 0 },
                { bottom: 0, left: 0 },
                { bottom: 0, right: 0 },
              ].map((pos, i) => (
                <View key={i} style={[styles.corner, pos]} />
              ))}
              {/* Rule-of-thirds grid */}
              <View style={[styles.gridLine, styles.gridV1]} />
              <View style={[styles.gridLine, styles.gridV2]} />
              <View style={[styles.gridLine, styles.gridH1]} />
              <View style={[styles.gridLine, styles.gridH2]} />
            </View>
            <View style={[styles.shade, { width: FRAME_PADDING }]} />
          </View>
          {/* bottom shade */}
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
          <Text style={styles.hintText}>Drag to reposition · Pinch to zoom</Text>
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
