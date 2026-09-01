import { useState, useCallback, useEffect } from 'react';

let SpeechModule: any = null;
let useSpeechRecognitionEventHook: ((event: string, listener: (event: any) => void) => void) | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const speechPkg = require('expo-speech-recognition');
  SpeechModule = speechPkg.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEventHook = speechPkg.useSpeechRecognitionEvent;
} catch {
  SpeechModule = null;
  useSpeechRecognitionEventHook = null;
}

const noopHook = () => {};
const safeUseSpeechRecognitionEvent = useSpeechRecognitionEventHook || noopHook;

export function useVoiceSearch(onResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  safeUseSpeechRecognitionEvent('start', () => setIsListening(true));
  safeUseSpeechRecognitionEvent('end', () => setIsListening(false));
  safeUseSpeechRecognitionEvent('error', (e) => {
    setIsListening(false);
    if (e.error !== 'aborted') setError('Voice recognition failed. Please try again.');
  });
  safeUseSpeechRecognitionEvent('result', (e) => {
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
    if (!SpeechModule) {
      setError('Voice recognition requires a development build.');
      return;
    }
    if (isListening) {
      SpeechModule.abort();
      return;
    }
    const { granted } = await SpeechModule.requestPermissionsAsync();
    if (!granted) {
      setError('Microphone permission denied.');
      return;
    }
    SpeechModule.start({ lang: 'en-US', interimResults: false });
  }, [isListening]);

  const stop = useCallback(() => {
    SpeechModule?.stop?.();
  }, []);

  return { isListening, error, start, stop };
}

