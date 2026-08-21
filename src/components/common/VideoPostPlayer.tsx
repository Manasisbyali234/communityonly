import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

let VideoView: any = null;
let useVideoPlayer: any = null;
if (Platform.OS !== 'web') {
  try {
    const expoVideo = require('expo-video');
    VideoView = expoVideo.VideoView;
    useVideoPlayer = expoVideo.useVideoPlayer;
  } catch (_) {}
}

interface VideoPostPlayerProps {
  url: string;
  onDoubleTap?: () => void;
  poster?: string;
  autoPlay?: boolean;
}

export const VideoPostPlayer: React.FC<VideoPostPlayerProps> = ({
  url,
  onDoubleTap,
  poster,
  autoPlay = true,
}) => {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showCenterIcon, setShowCenterIcon] = useState(false);
  const [centerIconType, setCenterIconType] = useState<'play' | 'pause' | 'volume-mute' | 'volume-high'>('play');

  // Animation values for center icon feedback
  const centerIconAnim = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iconTimeoutRef = useRef<any>(null);

  // Trigger floating center feedback icon
  const triggerCenterIcon = useCallback((type: 'play' | 'pause' | 'volume-mute' | 'volume-high') => {
    if (iconTimeoutRef.current) clearTimeout(iconTimeoutRef.current);
    setCenterIconType(type);
    setShowCenterIcon(true);
    centerIconAnim.setValue(0);

    Animated.sequence([
      Animated.spring(centerIconAnim, {
        toValue: 1,
        tension: 80,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.delay(650),
      Animated.timing(centerIconAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowCenterIcon(false);
    });
  }, [centerIconAnim]);

  // Handle Play/Pause toggle
  const togglePlayPause = useCallback(() => {
    if (Platform.OS === 'web') {
      const vid = videoRef.current;
      if (!vid) return;
      if (vid.paused) {
        vid.play().then(() => {
          setIsPlaying(true);
          triggerCenterIcon('play');
        }).catch(() => {});
      } else {
        vid.pause();
        setIsPlaying(false);
        triggerCenterIcon('pause');
      }
    }
  }, [triggerCenterIcon]);

  // Handle Mute toggle
  const toggleMute = useCallback((e?: any) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (Platform.OS === 'web' && videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
    triggerCenterIcon(nextMuted ? 'volume-mute' : 'volume-high');
  }, [isMuted, triggerCenterIcon]);

  // Handle Tap on video (Single tap = Play/Pause, Double tap = Like)
  const handlePress = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 280;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected
      if (onDoubleTap) {
        onDoubleTap();
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      setTimeout(() => {
        if (Date.now() - lastTapRef.current >= DOUBLE_TAP_DELAY && lastTapRef.current !== 0) {
          togglePlayPause();
        }
      }, DOUBLE_TAP_DELAY);
    }
  }, [onDoubleTap, togglePlayPause]);

  // Seek bar click (Web)
  const handleSeek = (e: any) => {
    e.stopPropagation();
    if (Platform.OS === 'web' && videoRef.current && duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, clickX / rect.width));
      const targetTime = pct * duration;
      videoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  // Format time mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs <= 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // ── Web Player Implementation ───────────────────────────────────────────────
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        {/* Main Video Element */}
        {/* @ts-ignore */}
        <video
          ref={videoRef}
          src={url}
          poster={poster}
          playsInline
          autoPlay={autoPlay}
          muted={isMuted}
          loop
          preload="auto"
          onTimeUpdate={(e: any) => {
            setCurrentTime(e.target.currentTime);
          }}
          onLoadedMetadata={(e: any) => {
            setDuration(e.target.duration);
          }}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => {
            setIsBuffering(false);
            setIsPlaying(true);
          }}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            backgroundColor: '#0A0A0A',
            display: 'block',
            cursor: 'pointer',
          }}
          onClick={handlePress}
        />

        {/* Subtle Bottom Gradient Scrim */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.65)']}
          style={styles.bottomGradient}
          pointerEvents="none"
        />

        {/* Buffering Indicator */}
        {isBuffering && (
          <View style={styles.centerOverlay} pointerEvents="none">
            <View style={styles.bufferingCircle}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
          </View>
        )}

        {/* Animated Center Feedback Icon (Play / Pause / Mute Pop) */}
        {showCenterIcon && !isBuffering && (
          <Animated.View
            style={[
              styles.centerOverlay,
              {
                opacity: centerIconAnim,
                transform: [
                  {
                    scale: centerIconAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.75, 1.1],
                    }),
                  },
                ],
              },
            ]}
            pointerEvents="none"
          >
            <View style={styles.centerPill}>
              <Ionicons
                name={centerIconType as any}
                size={34}
                color="#FFFFFF"
                style={{ marginLeft: centerIconType === 'play' ? 3 : 0 }}
              />
            </View>
          </Animated.View>
        )}

        {/* Persistent Paused Center Badge */}
        {!isPlaying && !showCenterIcon && !isBuffering && (
          <Pressable style={styles.centerOverlay} onPress={togglePlayPause}>
            <View style={styles.centerPlayBtn}>
              <Ionicons name="play" size={32} color="#FFFFFF" style={{ marginLeft: 3 }} />
            </View>
          </Pressable>
        )}

        {/* Top-Right Duration Badge */}
        {duration > 0 && (
          <View style={styles.durationBadge} pointerEvents="none">
            <Ionicons name="videocam" size={11} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.durationText}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </Text>
          </View>
        )}

        {/* Floating Mute/Unmute Button (Instagram Pill Style) */}
        <Pressable
          style={styles.muteButton}
          onPress={toggleMute}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons
            name={isMuted ? 'volume-mute' : 'volume-high'}
            size={16}
            color="#FFFFFF"
          />
        </Pressable>

        {/* Instagram Micro Progress Bar at the Bottom (Seekable) */}
        <Pressable
          style={styles.progressBarTrack}
          onPress={handleSeek}
        >
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.min(100, Math.max(0, progressPercent))}%` },
            ]}
          />
        </Pressable>
      </View>
    );
  }

  // ── Native Player Implementation (expo-video) ──────────────────────────────
  return <NativePlayer url={url} onDoubleTap={onDoubleTap} poster={poster} autoPlay={autoPlay} />;
};

// ── Native Player Subcomponent ───────────────────────────────────────────────
function NativePlayer({
  url,
  onDoubleTap,
  poster,
  autoPlay = true,
}: VideoPostPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(true);
  const [showCenterIcon, setShowCenterIcon] = useState(false);
  const [centerIconType, setCenterIconType] = useState<'play' | 'pause' | 'volume-mute' | 'volume-high'>('play');
  const centerIconAnim = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef<number>(0);

  let player: any = null;
  if (useVideoPlayer) {
    player = useVideoPlayer(url, (p: any) => {
      p.loop = true;
      p.muted = true;
      if (autoPlay) p.play();
    });
  }

  const triggerCenterIcon = (type: 'play' | 'pause' | 'volume-mute' | 'volume-high') => {
    setCenterIconType(type);
    setShowCenterIcon(true);
    centerIconAnim.setValue(0);

    Animated.sequence([
      Animated.spring(centerIconAnim, {
        toValue: 1,
        tension: 80,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.delay(650),
      Animated.timing(centerIconAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowCenterIcon(false);
    });
  };

  const togglePlayPause = () => {
    if (!player) return;
    if (player.playing) {
      player.pause();
      setIsPlaying(false);
      triggerCenterIcon('pause');
    } else {
      player.play();
      setIsPlaying(true);
      triggerCenterIcon('play');
    }
  };

  const toggleMute = () => {
    if (!player) return;
    const nextMuted = !isMuted;
    player.muted = nextMuted;
    setIsMuted(nextMuted);
    triggerCenterIcon(nextMuted ? 'volume-mute' : 'volume-high');
  };

  const handlePress = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 280;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (onDoubleTap) onDoubleTap();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      setTimeout(() => {
        if (Date.now() - lastTapRef.current >= DOUBLE_TAP_DELAY && lastTapRef.current !== 0) {
          togglePlayPause();
        }
      }, DOUBLE_TAP_DELAY);
    }
  };

  if (!VideoView || !player) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable style={StyleSheet.absoluteFill} onPress={handlePress}>
        <VideoView
          player={player}
          style={styles.video}
          nativeControls={false}
          contentFit="cover"
        />

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.65)']}
          style={styles.bottomGradient}
          pointerEvents="none"
        />

        {showCenterIcon && (
          <Animated.View
            style={[
              styles.centerOverlay,
              {
                opacity: centerIconAnim,
                transform: [
                  {
                    scale: centerIconAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.75, 1.1],
                    }),
                  },
                ],
              },
            ]}
            pointerEvents="none"
          >
            <View style={styles.centerPill}>
              <Ionicons
                name={centerIconType as any}
                size={34}
                color="#FFFFFF"
                style={{ marginLeft: centerIconType === 'play' ? 3 : 0 }}
              />
            </View>
          </Animated.View>
        )}

        {!isPlaying && !showCenterIcon && (
          <View style={styles.centerOverlay} pointerEvents="none">
            <View style={styles.centerPlayBtn}>
              <Ionicons name="play" size={32} color="#FFFFFF" style={{ marginLeft: 3 }} />
            </View>
          </View>
        )}
      </Pressable>

      <Pressable
        style={styles.muteButton}
        onPress={toggleMute}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons
          name={isMuted ? 'volume-mute' : 'volume-high'}
          size={16}
          color="#FFFFFF"
        />
      </Pressable>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#080808',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
  },
  fullTouchable: {
    ...StyleSheet.absoluteFill,
  },
  centerOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  centerPill: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  centerPlayBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  bufferingCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 5,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  muteButton: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 20,
  },
  progressBarTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 8,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
    zIndex: 25,
    cursor: 'pointer',
  },
  progressBarFill: {
    height: 3.5,
    backgroundColor: '#FFFFFF',
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
  },
});

export default VideoPostPlayer;
