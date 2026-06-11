import { useEffect, useRef, useState, useCallback } from "react";

export interface SpeechResult {
  transcript: string;
  isFinal: boolean;
}

interface UseSpeechRecognitionOptions {
  onResult?: (result: SpeechResult) => void;
  onCommand?: (command: string) => void;
  lang?: string;
}

const COMMANDS: Record<string, string> = {
  "открой браузер": "browser",
  "следующая вкладка": "tab_next",
  "предыдущая вкладка": "tab_prev",
  "закрой вкладку": "tab_close",
  "открой telegram": "open_telegram",
  "открой телеграм": "open_telegram",
  "открой discord": "open_discord",
  "открой дискорд": "open_discord",
  "прочитай сообщения": "read_messages",
  "запусти музыку": "open_music",
  "открой настройки": "open_settings",
  "открой файлы": "open_files",
  "открой терминал": "open_terminal",
  "открой заметки": "open_notes",
};

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export function detectCommand(transcript: string): string | null {
  const lower = transcript.toLowerCase().trim();
  for (const [phrase, cmd] of Object.entries(COMMANDS)) {
    if (lower.includes(phrase)) return cmd;
  }
  return null;
}

// Синхронная проверка — кнопка активна сразу без ожидания useEffect
function getSR(): typeof SpeechRecognition | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function useSpeechRecognition({ onResult, onCommand, lang = "ru-RU" }: UseSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  // Вычисляем синхронно при инициализации стейта
  const [isSupported] = useState<boolean>(() => getSR() !== null);
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldListenRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const createRecognition = useCallback(() => {
    const SR = getSR();
    if (!SR) return null;

    const recognition = new SR();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          setInterimText("");
          onResult?.({ transcript, isFinal: true });
          const cmd = detectCommand(transcript);
          if (cmd) onCommand?.(cmd);
        } else {
          interim += transcript;
        }
      }
      if (interim) {
        setInterimText(interim);
        onResult?.({ transcript: interim, isFinal: false });
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Разреши микрофон в браузере (значок 🔒 в адресной строке)");
        shouldListenRef.current = false;
        setIsListening(false);
      } else if (event.error === "no-speech") {
        // Нормально — авто-рестарт
      } else if (event.error === "network") {
        setError("Ошибка сети — нужен интернет для Speech API");
      } else {
        setError(`Ошибка микрофона: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (shouldListenRef.current) {
        restartTimerRef.current = setTimeout(() => {
          if (shouldListenRef.current && recognitionRef.current) {
            try { recognitionRef.current.start(); } catch (_e) { /* ignore */ }
          }
        }, 200);
      } else {
        setIsListening(false);
        setInterimText("");
      }
    };

    return recognition;
  }, [lang, onResult, onCommand]);

  const start = useCallback(() => {
    // Перепроверяем на случай если isSupported был вычислен до загрузки браузерного API
    if (!getSR()) return;
    setError(null);
    shouldListenRef.current = true;

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_e) { /* ignore */ }
    }

    const recognition = createRecognition();
    if (!recognition) return;
    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
    } catch (_e) {
      setError("Не удалось запустить микрофон");
    }
  }, [isSupported, createRecognition]);

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_e) { /* ignore */ }
    }
    setIsListening(false);
    setInterimText("");
  }, []);

  const toggle = useCallback(() => {
    if (shouldListenRef.current) stop();
    else start();
  }, [start, stop]);

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_e) { /* ignore */ }
      }
    };
  }, []);

  return { isListening, isSupported, interimText, error, start, stop, toggle };
}