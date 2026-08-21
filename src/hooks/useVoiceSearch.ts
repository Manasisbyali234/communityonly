import { useState, useCallback, useEffect } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

export function useVoiceSearch(onResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useSpeechRecognitionEvent('start', () => setIsListening(true));
  useSpeechRecognitionEvent('end', () => setIsListening(false));
  useSpeechRecognitionEvent('error', (e) => {
    setIsListening(false);
    if (e.error !== 'aborted') setError('Voice recognition failed. Please try again.');
  });
  useSpeechRecognitionEvent('result', (e) => {
    const text = e.results?.[0]?.transcript?.trim();
    if (text) onResult(text);
  });

  // Clear error after 3s
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 3000);
    return () => clearTimeout(t);
  }, [error]);

  const start = useCallback(async () => {
    setError(null);
    if (isListening) {
      ExpoSpeechRecognitionModule.abort();
      return;
    }
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      setError('Microphone permission denied.');
      return;
    }
    ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: false });
  }, [isListening]);

  const stop = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
  }, []);

  return { isListening, error, start, stop };
}
