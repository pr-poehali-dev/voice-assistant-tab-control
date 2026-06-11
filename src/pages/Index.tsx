import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

const ANIME_IMG = "https://cdn.poehali.dev/projects/9ef22dbd-5052-4a85-92c0-ddfa03cf9082/files/659450f2-f3d7-4609-b8bd-057c34b1758e.jpg";

type Platform = "telegram" | "discord";
type Tab = "voice" | "messages" | "apps";

interface Message {
  id: number;
  platform: Platform;
  sender: string;
  text: string;
  time: string;
  unread?: boolean;
}

interface AppItem {
  name: string;
  icon: string;
  key: string;
  url?: string;
}

const DEMO_MESSAGES: Message[] = [
  { id: 1, platform: "telegram", sender: "Алексей", text: "Привет! Когда встреча?", time: "14:32", unread: true },
  { id: 2, platform: "discord", sender: "ShadowKing", text: "gg wp, следующий раунд?", time: "14:28", unread: true },
  { id: 3, platform: "telegram", sender: "Мама", text: "Позвони когда будет время 🌸", time: "13:55" },
  { id: 4, platform: "discord", sender: "DevTeam", text: "Pull request approved ✓", time: "13:40" },
  { id: 5, platform: "telegram", sender: "Рабочий чат", text: "Дедлайн сегодня в 18:00", time: "12:10" },
];

const APPS: AppItem[] = [
  { name: "Браузер", icon: "Globe", key: "browser", url: "https://google.com" },
  { name: "Терминал", icon: "Terminal", key: "terminal" },
  { name: "Настройки", icon: "Settings", key: "settings" },
  { name: "Файлы", icon: "Folder", key: "files" },
  { name: "Музыка", icon: "Music", key: "open_music", url: "https://music.yandex.ru" },
  { name: "Заметки", icon: "FileText", key: "open_notes" },
];

const VOICE_COMMANDS_LIST = [
  "Открой браузер",
  "Следующая вкладка",
  "Предыдущая вкладка",
  "Закрой вкладку",
  "Открой Telegram",
  "Открой Discord",
  "Прочитай сообщения",
  "Запусти музыку",
  "Открой настройки",
];

const WAVE_HEIGHTS = [1, 0.5, 0.8, 1, 0.6, 0.9, 0.4, 0.7, 1, 0.5];

function WaveVisualizer({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-[3px] h-8">
      {WAVE_HEIGHTS.map((h, i) => {
        // Объединяем animation и animationDelay в одно свойство animation чтобы избежать React warning
        const animValue = active
          ? `wave-bar ${0.6 + i * 0.05}s ease-in-out ${i * 0.07}s infinite`
          : "none";
        return (
          <div
            key={i}
            className="w-[3px] rounded-full"
            style={{
              height: active ? `${h * 26}px` : "4px",
              background: active
                ? `rgba(224, 85, 116, ${0.5 + h * 0.5})`
                : "rgba(255,255,255,0.15)",
              transition: active ? "none" : "height 0.3s, background 0.3s",
              animation: animValue,
            }}
          />
        );
      })}
    </div>
  );
}

function PlatformBadge({ platform }: { platform: Platform }) {
  if (platform === "telegram") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
        style={{ background: "rgba(42,171,238,0.15)", color: "#2AABEE" }}>
        ✈ TG
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
      style={{ background: "rgba(88,101,242,0.15)", color: "#5865F2" }}>
      ◈ DC
    </span>
  );
}

export default function Index() {
  const [activeTab, setActiveTab] = useState<Tab>("voice");
  const [messages, setMessages] = useState<Message[]>(DEMO_MESSAGES);
  const [displayText, setDisplayText] = useState("Нажми микрофон...");
  const [lastFinalText, setLastFinalText] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null);

  const unreadCount = messages.filter((m) => m.unread).length;

  const showFeedback = useCallback((text: string) => {
    setCommandFeedback(text);
    setTimeout(() => setCommandFeedback(null), 2500);
  }, []);

  const handleCommand = useCallback((cmd: string) => {
    switch (cmd) {
      case "browser":
        window.open("https://google.com", "_blank");
        showFeedback("Открываю браузер...");
        break;
      case "tab_next":
        showFeedback("Следующая вкладка ▶");
        break;
      case "tab_prev":
        showFeedback("◀ Предыдущая вкладка");
        break;
      case "tab_close":
        showFeedback("✕ Закрываю вкладку");
        window.close();
        break;
      case "open_telegram":
        window.open("https://web.telegram.org", "_blank");
        showFeedback("Открываю Telegram...");
        break;
      case "open_discord":
        window.open("https://discord.com/app", "_blank");
        showFeedback("Открываю Discord...");
        break;
      case "read_messages":
        setActiveTab("messages");
        showFeedback("Показываю сообщения");
        break;
      case "open_music":
        window.open("https://music.yandex.ru", "_blank");
        showFeedback("Запускаю музыку...");
        break;
      case "open_settings":
        setActiveTab("apps");
        showFeedback("Открываю настройки");
        break;
      case "open_files":
        setActiveTab("apps");
        showFeedback("Открываю файлы");
        break;
      case "open_terminal":
        setActiveTab("apps");
        showFeedback("Терминал");
        break;
      case "open_notes":
        setActiveTab("apps");
        showFeedback("Открываю заметки");
        break;
    }
  }, [showFeedback]);

  const { isListening, isSupported, interimText, error, toggle } = useSpeechRecognition({
    onResult: ({ transcript, isFinal }) => {
      if (isFinal) {
        setLastFinalText(transcript);
        setDisplayText(`«${transcript}»`);
      } else {
        setDisplayText(transcript);
      }
    },
    onCommand: handleCommand,
  });

  useEffect(() => {
    if (!isListening && !error) {
      if (lastFinalText) {
        setDisplayText(`«${lastFinalText}»`);
      } else {
        setDisplayText("Нажми микрофон...");
      }
    }
    if (isListening && !interimText && !lastFinalText) {
      setDisplayText("Слушаю...");
    }
  }, [isListening, interimText, lastFinalText, error]);

  useEffect(() => {
    if (error) setDisplayText(error);
  }, [error]);

  const markRead = (id: number) => {
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, unread: false } : m));
  };

  const bgStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "radial-gradient(ellipse at 20% 50%, rgba(224,85,116,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(88,101,242,0.04) 0%, transparent 60%), var(--dark)",
  };

  return (
    <div style={bgStyle}>
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <p className="font-unbounded text-[11px] tracking-widest uppercase mb-2"
            style={{ color: "rgba(255,255,255,0.08)" }}>Рабочий стол</p>
          <p className="font-golos text-xs" style={{ color: "rgba(255,255,255,0.05)" }}>
            Виджет помощника находится в правом нижнем углу
          </p>
        </div>
      </div>

      {/* Collapsed state */}
      {!isExpanded && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => setIsExpanded(true)}
            className="relative w-16 h-16 rounded-2xl overflow-hidden transition-transform hover:scale-105 active:scale-95"
            style={{
              border: "1px solid rgba(224,85,116,0.3)",
              boxShadow: "0 0 20px rgba(224,85,116,0.3)",
            }}
          >
            <img src={ANIME_IMG} alt="Yuki" className="w-full h-full object-cover object-top" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                style={{ background: "var(--red)" }}>
                {unreadCount}
              </span>
            )}
            {isListening && (
              <div className="absolute inset-0 rounded-2xl animate-pulse-ring"
                style={{ border: "2px solid var(--red)" }} />
            )}
          </button>
        </div>
      )}

      {/* Main widget */}
      {isExpanded && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 animate-slide-up" style={{ width: "300px" }}>

          {/* Command feedback toast */}
          {commandFeedback && (
            <div className="glass-panel rounded-xl px-3 py-2 animate-slide-up flex items-center gap-2"
              style={{ border: "1px solid rgba(224,85,116,0.3)" }}>
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--red)" }} />
              <span className="text-xs font-golos text-white/80">{commandFeedback}</span>
            </div>
          )}

          {/* Header card */}
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <div>
                <p className="font-unbounded text-[9px] font-light tracking-widest uppercase"
                  style={{ color: "var(--red)" }}>Ассистент</p>
                <h1 className="font-unbounded text-base font-semibold text-white leading-tight">Юки</h1>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Mic status indicator */}
                {isListening && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
                    style={{ background: "rgba(224,85,116,0.1)" }}>
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse-ring"
                      style={{ background: "var(--red)" }} />
                    <span className="text-[9px] font-golos" style={{ color: "var(--red)" }}>LIVE</span>
                  </div>
                )}
                <button
                  onClick={() => setIsExpanded(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
                >
                  <Icon name="Minus" size={14} className="text-white/40" />
                </button>
              </div>
            </div>

            {/* Character + voice */}
            <div className="flex items-end px-4 pb-3 gap-3">
              <div className="relative rounded-xl overflow-hidden flex-shrink-0"
                style={{
                  width: "72px",
                  height: "88px",
                  border: `1px solid ${isListening ? "rgba(224,85,116,0.5)" : "rgba(224,85,116,0.2)"}`,
                  transition: "border-color 0.3s",
                  boxShadow: isListening ? "0 0 16px rgba(224,85,116,0.2)" : "none",
                }}>
                <img
                  src={ANIME_IMG}
                  alt="Yuki"
                  className="w-full h-full object-cover object-top animate-float"
                />
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: "linear-gradient(to top, rgba(14,15,20,0.5) 0%, transparent 60%)" }} />
              </div>

              <div className="flex-1 flex flex-col gap-2 min-w-0">
                <p className="text-[11px] leading-tight font-golos truncate"
                  style={{ color: isListening ? "var(--pink)" : "rgba(255,255,255,0.45)" }}
                  title={displayText}>
                  {displayText}
                </p>
                <WaveVisualizer active={isListening} />
                <button
                  onClick={toggle}
                  className="flex items-center justify-center gap-1.5 rounded-xl py-1.5 px-3 transition-all active:scale-95 text-white text-[11px] font-medium font-golos"
                  style={{
                    background: isListening
                      ? "linear-gradient(135deg, #e05574, #c0375a)"
                      : error
                        ? "rgba(224,85,116,0.15)"
                        : "rgba(255,255,255,0.07)",
                    border: isListening
                      ? "none"
                      : error
                        ? "1px solid rgba(224,85,116,0.4)"
                        : "1px solid rgba(255,255,255,0.1)",
                    boxShadow: isListening ? "0 4px 16px var(--glow-red)" : "none",
                  }}
                >
                  <Icon name={isListening ? "MicOff" : error ? "MicOff" : "Mic"} size={12} />
                  {isListening ? "Стоп" : error ? "Повторить" : !isSupported ? "Нет API" : "Слушать"}
                </button>
                {error && (
                  <p className="text-[9px] font-golos leading-tight" style={{ color: "rgba(224,85,116,0.8)" }}>
                    {error}
                  </p>
                )}
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex" style={{ borderTop: "1px solid var(--border-subtle)" }}>
              {([
                { key: "voice" as Tab, label: "Команды", icon: "Mic" },
                { key: "messages" as Tab, label: "Чаты", icon: "MessageCircle", badge: unreadCount },
                { key: "apps" as Tab, label: "Запуск", icon: "Grid3X3" },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="flex-1 flex flex-col items-center gap-1 py-2 text-[9px] font-medium transition-colors relative font-golos"
                  style={{
                    color: activeTab === tab.key ? "var(--red)" : "rgba(255,255,255,0.3)",
                    borderBottom: activeTab === tab.key ? "2px solid var(--red)" : "2px solid transparent",
                  }}
                >
                  <Icon name={tab.icon} size={13} />
                  {tab.label}
                  {tab.badge ? (
                    <span className="absolute top-1 right-3 w-3.5 h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center text-white"
                      style={{ background: "var(--red)" }}>
                      {tab.badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          {/* Content panel */}
          <div className="glass-panel rounded-2xl overflow-hidden" key={activeTab}>

            {/* VOICE TAB */}
            {activeTab === "voice" && (
              <div className="p-3">
                <p className="text-[9px] font-medium uppercase tracking-widest mb-2 font-unbounded"
                  style={{ color: "rgba(255,255,255,0.2)" }}>Доступные команды</p>
                <div className="flex flex-col gap-1">
                  {VOICE_COMMANDS_LIST.map((cmd, i) => (
                    <div key={i}
                      className="flex items-center gap-2 rounded-xl px-3 py-1.5 cursor-pointer transition-all"
                      style={{ background: "rgba(255,255,255,0.03)" }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.background = "rgba(224,85,116,0.07)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)";
                      }}
                    >
                      <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: "var(--red)", opacity: 0.7 }} />
                      <span className="text-[11px] font-golos" style={{ color: "rgba(255,255,255,0.6)" }}>«{cmd}»</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2.5 pt-2.5 flex items-center gap-1.5" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                  <Icon name="Info" size={11} style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
                  <p className="text-[9px] font-golos" style={{ color: "rgba(255,255,255,0.25)" }}>
                    {isSupported ? "Работает в фоне пока включён микрофон" : "Chrome / Edge — для распознавания речи"}
                  </p>
                </div>
              </div>
            )}

            {/* MESSAGES TAB */}
            {activeTab === "messages" && (
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[9px] font-medium uppercase tracking-widest font-unbounded"
                    style={{ color: "rgba(255,255,255,0.2)" }}>Сообщения</p>
                  <div className="flex gap-1">
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-golos"
                      style={{ background: "rgba(42,171,238,0.12)", color: "#2AABEE" }}>TG</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-golos"
                      style={{ background: "rgba(88,101,242,0.12)", color: "#5865F2" }}>DC</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 max-h-44 overflow-y-auto pr-0.5">
                  {messages.map((msg) => (
                    <div key={msg.id} onClick={() => markRead(msg.id)}
                      className="flex items-start gap-2 rounded-xl px-2.5 py-2 cursor-pointer transition-all"
                      style={{
                        background: msg.unread ? "rgba(224,85,116,0.06)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${msg.unread ? "rgba(224,85,116,0.18)" : "transparent"}`,
                      }}
                    >
                      <div className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white/60"
                        style={{ background: "rgba(255,255,255,0.07)" }}>
                        {msg.sender[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="text-[10px] font-semibold text-white/80 truncate font-golos">{msg.sender}</span>
                          <PlatformBadge platform={msg.platform} />
                        </div>
                        <p className="text-[10px] leading-tight truncate font-golos"
                          style={{ color: "rgba(255,255,255,0.4)" }}>{msg.text}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-[9px] font-golos" style={{ color: "rgba(255,255,255,0.2)" }}>{msg.time}</span>
                        {msg.unread && <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--red)" }} />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* APPS TAB */}
            {activeTab === "apps" && (
              <div className="p-3">
                <p className="text-[9px] font-medium uppercase tracking-widest mb-2 font-unbounded"
                  style={{ color: "rgba(255,255,255,0.2)" }}>Быстрый запуск</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {APPS.map((app) => (
                    <button key={app.key}
                      onClick={() => {
                        if (app.url) window.open(app.url, "_blank");
                        else showFeedback(`Открываю ${app.name}...`);
                      }}
                      className="flex flex-col items-center gap-1.5 rounded-xl py-2.5 px-1 transition-all active:scale-95"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid transparent",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = "rgba(224,85,116,0.07)";
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(224,85,116,0.25)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
                      }}
                    >
                      <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                        style={{ background: "rgba(224,85,116,0.1)" }}>
                        <Icon name={app.icon} size={14} style={{ color: "var(--red)" }} />
                      </div>
                      <span className="text-[10px] font-golos text-center leading-tight"
                        style={{ color: "rgba(255,255,255,0.5)" }}>{app.name}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-2.5 pt-2.5 flex items-center gap-1.5" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                  <Icon name="Info" size={11} style={{ color: "rgba(255,255,255,0.15)", flexShrink: 0 }} />
                  <p className="text-[9px] font-golos" style={{ color: "rgba(255,255,255,0.2)" }}>
                    Голосом: «Открой браузер»
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}