import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  AlertTriangle,
  Zap,
  Terminal,
  ShieldCheck,
  Activity,
  Smile,
  ThumbsUp,
} from 'lucide-react';
import { ChatMessage, UserProfile } from '../hooks/useSocket';
import { Avatar } from './Avatar';
import { getPodStyle, formatMessageTime } from '../utils/podUtils';

interface ChatWindowProps {
  currentRoom: string;
  messages: ChatMessage[];
  typingUsers: string[];
  currentUser: UserProfile | null;
  onSendMessage: (text: string) => void;
  onSendTyping: (isTyping: boolean) => void;
  onReactMessage: (messageId: string, emoji: string) => void;
  isConnected: boolean;
  latency: number;
}

const QUICK_SUGGESTIONS = [
  'Xin chào mọi người!',
  'Deploy thành công rồi!',
  'Hệ thống đang chạy ổn định.',
  'Nghỉ giải lao 5 phút nhé!',
];

const EMOJI_OPTIONS = [
  { emoji: '👍', label: 'Thích' },
  { emoji: '❤️', label: 'Yêu thích' },
  { emoji: '😂', label: 'Haha' },
  { emoji: '😮', label: 'Wow' },
  { emoji: '🔥', label: 'Tuyệt vời' },
  { emoji: '🎉', label: 'Chúc mừng' },
];

export const ChatWindow: React.FC<ChatWindowProps> = ({
  currentRoom,
  messages,
  typingUsers,
  currentUser,
  onSendMessage,
  onSendTyping,
  onReactMessage,
  isConnected,
  latency,
}) => {
  const [inputText, setInputText] = useState('');
  const [activePickerId, setActivePickerId] = useState<string | null>(null);
  const [simulationStatus, setSimulationStatus] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevMessagesLengthRef = useRef(messages.length);

  // Cuộn xuống đáy khi có tin nhắn mới hoặc vừa mở phòng
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    // Nếu tin nhắn tăng lên (có tin mới), tự động cuộn xuống đáy
    if (messages.length > prevMessagesLengthRef.current) {
      scrollToBottom(true);
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  // Lần đầu tải component: cuộn xuống cuối một lần
  useEffect(() => {
    scrollToBottom(false);
  }, [currentRoom]);

  // Đóng bảng chọn cảm xúc khi click ra ngoài
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.reaction-picker-root')) {
        setActivePickerId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    onSendTyping(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      onSendTyping(false);
    }, 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    onSendMessage(inputText.trim());
    setInputText('');
    onSendTyping(false);
  };

  const handleSelectSuggestion = (text: string) => {
    setInputText(text);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSimulate = async (type: string) => {
    setIsSimulating(true);
    setSimulationStatus(`Triggering ${type}...`);
    try {
      const res = await fetch(`/api/simulate-error?type=${type}`);
      const data = await res.json();
      setSimulationStatus(
        res.status === 200
          ? `✓ ${data.message || 'Thành công'}`
          : `⚠ Mã ${res.status}: ${data.error || 'Lỗi mô phỏng'}`
      );
    } catch (err: any) {
      setSimulationStatus(`⚠ Đã kích hoạt lệnh ${type} (Kiểm tra Grafana / Prometheus)`);
    } finally {
      setIsSimulating(false);
      setTimeout(() => setSimulationStatus(null), 4000);
    }
  };

  return (
    <main className="flex-1 flex flex-col h-full bg-neo-grid relative overflow-hidden">
      {/* ─── ĐẦU TRANG (VIỀN DƯỚI 2PX) ─── */}
      <header className="px-5 py-3.5 bg-[#F5F0E6] border-b-2 border-[#15130F] flex flex-wrap items-center justify-between gap-3 shrink-0 z-10">
        {/* Trái: H1 "#namdoan" 36px/800 + badge trắng viền mực có chấm xanh lá "Đồng bộ" */}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl md:text-[36px] font-extrabold font-title tracking-tight text-[#15130F] leading-tight">
              #{currentRoom}
            </h1>
            <div className="min-h-[30px] px-3 py-1 rounded-full bg-white border-2 border-[#15130F] shadow-[2px_2px_0_#15130F] flex items-center gap-1.5 text-xs font-bold font-sans text-[#15130F]">
              <span className="w-2 h-2 rounded-full bg-[#1FA66A] shrink-0" />
              <span>Đồng bộ</span>
            </div>
          </div>
          <p className="text-xs sm:text-[13px] font-sans text-[#4A4538] mt-0.5">
            Tin nhắn được đồng bộ tức thì qua Redis Pub/Sub
          </p>
        </div>

        {/* Phải: chip "Đang kết nối", chip mono "< 5ms", vạch ngăn 2px, 4 nút chẩn đoán */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Chip: Đang kết nối */}
          <div className="h-11 px-3.5 bg-white border-2 border-[#15130F] rounded-xl shadow-[3px_3px_0_#15130F] flex items-center gap-2 text-xs font-bold font-sans text-[#15130F]">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                isConnected ? 'bg-[#1FA66A]' : 'bg-[#B3261E]'
              }`}
            />
            <span>{isConnected ? 'Đang kết nối' : 'Mất kết nối'}</span>
          </div>

          {/* Chip: Latency mono */}
          <div className="h-11 px-3 bg-white border-2 border-[#15130F] rounded-xl shadow-[3px_3px_0_#15130F] flex items-center gap-1.5 text-xs font-mono font-bold text-[#15130F]">
            <Activity className="w-4 h-4 text-[#15130F]" strokeWidth={2.4} />
            <span>{latency > 0 ? `${latency}ms` : '< 5ms'}</span>
          </div>

          {/* Vạch ngăn 2px */}
          <div className="w-[2px] h-7 bg-[#15130F] hidden sm:block mx-0.5" />

          {/* 4 Nút chẩn đoán: 500, CPU, /metrics, /health */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => handleSimulate('500')}
              disabled={isSimulating}
              title="Kích hoạt lỗi HTTP 500 (Alertmanager)"
              aria-label="Kích hoạt lỗi HTTP 500"
              className="h-11 px-3 bg-white border-2 border-[#15130F] rounded-xl shadow-[3px_3px_0_#15130F] flex items-center gap-1.5 text-xs font-bold text-[#B3261E] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#15130F] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all"
            >
              <AlertTriangle className="w-4 h-4 text-[#B3261E]" strokeWidth={2.4} />
              <span>500</span>
            </button>

            <button
              type="button"
              onClick={() => handleSimulate('cpu')}
              disabled={isSimulating}
              title="Spike CPU để test HPA"
              aria-label="Kích hoạt tải CPU cao"
              className="h-11 px-3 bg-white border-2 border-[#15130F] rounded-xl shadow-[3px_3px_0_#15130F] flex items-center gap-1.5 text-xs font-bold text-[#15130F] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#15130F] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all"
            >
              <Zap className="w-4 h-4 text-[#15130F]" strokeWidth={2.4} />
              <span>CPU</span>
            </button>

            <a
              href="/metrics"
              target="_blank"
              rel="noreferrer"
              title="Prometheus Metrics"
              aria-label="Mở Prometheus Metrics"
              className="h-11 px-3 bg-white border-2 border-[#15130F] rounded-xl shadow-[3px_3px_0_#15130F] flex items-center gap-1.5 text-xs font-mono font-bold text-[#15130F] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#15130F] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all"
            >
              <Terminal className="w-4 h-4 text-[#15130F]" strokeWidth={2.4} />
              <span>/metrics</span>
            </a>

            <a
              href="/health"
              target="_blank"
              rel="noreferrer"
              title="Health Check Endpoint"
              aria-label="Mở Health Check Endpoint"
              className="h-11 px-3 bg-white border-2 border-[#15130F] rounded-xl shadow-[3px_3px_0_#15130F] flex items-center gap-1.5 text-xs font-mono font-bold text-[#15130F] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#15130F] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all"
            >
              <ShieldCheck className="w-4 h-4 text-[#15130F]" strokeWidth={2.4} />
              <span>/health</span>
            </a>
          </div>
        </div>
      </header>

      {/* Thông báo mô phỏng SRE nếu có */}
      {simulationStatus && (
        <div className="mx-5 mt-2 p-2.5 bg-white border-2 border-[#15130F] rounded-xl shadow-[3px_3px_0_#15130F] text-xs font-bold font-sans text-[#15130F] flex items-center justify-between z-10 animate-neo-pop">
          <span>{simulationStatus}</span>
          <span className="text-[11px] font-mono text-[#4A4538]">Grafana / Prometheus</span>
        </div>
      )}

      {/* ─── DANH SÁCH TIN NHẮN (CHO PHÉP CUỘN LÊN XEM TIN CŨ, CĂN ĐÁY, CÁCH NHAU 28PX) ─── */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6"
      >
        {/* Wrapper flex min-h-full kèm mt-auto để luôn đẩy tin nhắn xuống đáy khi ít tin, và cuộn trơn tru khi nhiều tin */}
        <div className="flex flex-col min-h-full">
          <div className="mt-auto space-y-7 pb-2">
            {messages.map((msg, index) => {
              const isMe =
                currentUser?.username &&
                msg.sender.toLowerCase() === currentUser.username.toLowerCase();
              const podStyle = getPodStyle(msg.senderPod);
              const timeString = formatMessageTime(msg.createdAt);
              const messageKey = msg._id || `msg-${index}`;
              const isPickerOpen = activePickerId === messageKey;

              const likeReaction = msg.reactions?.find((r) => r.emoji === '👍');
              const isLikedByMe = !!likeReaction?.users.includes(currentUser?.username || '');

              if (isMe) {
                // ─── TIN CỦA MÌNH: Căn phải, bong bóng màu nhấn cobalt chữ trắng đậm, bo 20/6/20/20 ───
                return (
                  <div
                    key={messageKey}
                    className="flex items-start justify-end gap-3 max-w-[640px] ml-auto group"
                  >
                    {/* Cột nội dung căn phải */}
                    <div className="flex flex-col items-end max-w-[85%] sm:max-w-[540px]">
                      {/* Hàng tên & giờ: Giờ trước, Tên sau */}
                      <div className="flex items-center gap-2 mb-1.5 px-1">
                        <span className="font-mono text-xs text-[#5A5446]">{timeString}</span>
                        <span className="font-bold text-[15px] text-[#15130F]">{msg.sender}</span>
                      </div>

                      {/* Khối bong bóng tin nhắn kèm thanh hành động cảm xúc floating */}
                      <div className="relative group/bubble reaction-picker-root">
                        {/* Thanh thả cảm xúc nhanh trên bong bóng */}
                        <div className="absolute -top-3.5 right-3 flex items-center bg-white border-2 border-[#15130F] rounded-full shadow-[2px_2px_0_#15130F] px-1.5 py-0.5 gap-1 z-20 opacity-0 group-hover/bubble:opacity-100 transition-opacity">
                          {/* Nút Like nhanh */}
                          <button
                            type="button"
                            title={isLikedByMe ? 'Bỏ thích' : 'Thích tin nhắn (👍)'}
                            onClick={() => onReactMessage(messageKey, '👍')}
                            className={`p-1 rounded-full hover:bg-slate-100 transition-all ${
                              isLikedByMe ? 'text-[var(--accent)] font-bold' : 'text-[#15130F]'
                            }`}
                          >
                            <ThumbsUp
                              className={`w-3.5 h-3.5 ${isLikedByMe ? 'fill-current' : ''}`}
                              strokeWidth={2.4}
                            />
                          </button>

                          {/* Nút mở bảng 6 emoji */}
                          <button
                            type="button"
                            title="Thả cảm xúc"
                            onClick={() =>
                              setActivePickerId(isPickerOpen ? null : messageKey)
                            }
                            className="p-1 rounded-full text-[#15130F] hover:bg-[#FFD23F] transition-all"
                          >
                            <Smile className="w-3.5 h-3.5" strokeWidth={2.4} />
                          </button>
                        </div>

                        {/* Bảng chọn cảm xúc (Popover Emoji Palette) */}
                        {isPickerOpen && (
                          <div className="absolute bottom-full right-0 mb-2 bg-white border-2 border-[#15130F] rounded-2xl shadow-[4px_4px_0_#15130F] p-2 flex items-center gap-1.5 z-30 animate-neo-pop">
                            {EMOJI_OPTIONS.map(({ emoji, label }) => {
                              const currentEmojiRx = msg.reactions?.find((r) => r.emoji === emoji);
                              const userHasReacted = !!currentEmojiRx?.users.includes(
                                currentUser?.username || ''
                              );
                              return (
                                <button
                                  key={emoji}
                                  type="button"
                                  title={`${label} (${emoji})`}
                                  onClick={() => {
                                    onReactMessage(messageKey, emoji);
                                    setActivePickerId(null);
                                  }}
                                  className={`p-1.5 rounded-xl text-lg leading-none transition-all hover:bg-[#FFD23F] hover:scale-125 border border-transparent hover:border-[#15130F] ${
                                    userHasReacted ? 'bg-[#FFD23F] border-[#15130F]' : ''
                                  }`}
                                >
                                  {emoji}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Bong bóng tin nhắn */}
                        <div
                          className="px-5 py-3.5 rounded-[20px] rounded-tr-[6px] bg-[var(--accent)] text-white text-[15px] font-bold border-2 border-[#15130F] shadow-[4px_4px_0_#15130F] break-words whitespace-pre-wrap select-text leading-relaxed cursor-default"
                          onDoubleClick={() => onReactMessage(messageKey, '👍')}
                          title="Nhấp đúp chuột để like nhanh 👍"
                        >
                          {msg.text}
                        </div>
                      </div>

                      {/* Hàng biểu cảm đã thả (Reactions Badge Row) */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex flex-wrap items-center justify-end gap-1.5 mt-2 reaction-picker-root">
                          {msg.reactions.map((rx) => {
                            const hasReacted = !!rx.users.includes(currentUser?.username || '');
                            const userNames = rx.users
                              .map((u) => (u === currentUser?.username ? 'Bạn' : u))
                              .join(', ');

                            return (
                              <button
                                key={rx.emoji}
                                type="button"
                                title={`${userNames} đã thả ${rx.emoji}`}
                                onClick={() => onReactMessage(messageKey, rx.emoji)}
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border-2 border-[#15130F] text-xs font-bold transition-all hover:translate-x-[1px] hover:translate-y-[1px] ${
                                  hasReacted
                                    ? 'bg-[#FFD23F] shadow-[2px_2px_0_#15130F]'
                                    : 'bg-white shadow-[2px_2px_0_#15130F]'
                                }`}
                              >
                                <span className="text-sm leading-none">{rx.emoji}</span>
                                <span className="font-mono text-[11px] text-[#15130F]">
                                  {rx.users.length}
                                </span>
                              </button>
                            );
                          })}

                          {/* Nút '+' thêm biểu cảm */}
                          <button
                            type="button"
                            title="Thêm cảm xúc"
                            onClick={() =>
                              setActivePickerId(isPickerOpen ? null : messageKey)
                            }
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white border-2 border-[#15130F] shadow-[2px_2px_0_#15130F] hover:bg-[#FFD23F] text-xs font-bold transition-all"
                          >
                            +
                          </button>
                        </div>
                      )}

                      {/* Hàng dưới: Dấu ✓✓ + Thẻ pod */}
                      <div className="flex items-center gap-2 mt-1.5 px-1">
                        <span
                          className="flex items-center text-[#15130F]"
                          aria-label="Đã gửi"
                          title="Đã gửi thành công"
                        >
                          <svg
                            className="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#15130F"
                            strokeWidth="2.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M18 6L7 17l-5-5" />
                            <path d="M22 10l-7.5 7.5L13 16" />
                          </svg>
                        </span>

                        <div
                          className="px-2.5 py-0.5 rounded-full border-[1.5px] border-[#15130F] flex items-center gap-1.5 font-mono font-bold text-[11.5px]"
                          style={{ backgroundColor: podStyle.bg, color: podStyle.text }}
                        >
                          <span className="w-2 h-2 rounded-full bg-[#15130F]" />
                          <span>{podStyle.name}</span>
                        </div>
                      </div>
                    </div>

                    {/* Avatar bên phải */}
                    <Avatar
                      id={msg.avatar || 1}
                      seed={msg.sender}
                      size={44}
                      className="shrink-0 mt-1"
                    />
                  </div>
                );
              }

              // ─── TIN NGƯỜI KHÁC: Avatar 44px bên trái, bong bóng trắng viền 2px + bóng 4px ───
              return (
                <div
                  key={messageKey}
                  className="flex items-start justify-start gap-3 max-w-[640px] group"
                >
                  {/* Avatar 44px bên trái */}
                  <Avatar
                    id={msg.avatar || 3}
                    seed={msg.sender}
                    size={44}
                    className="shrink-0 mt-1"
                  />

                  {/* Cột nội dung căn trái */}
                  <div className="flex flex-col items-start max-w-[85%] sm:max-w-[540px]">
                    {/* Hàng tên & giờ: Tên trước, Giờ sau */}
                    <div className="flex items-center gap-2 mb-1.5 px-1">
                      <span className="font-bold text-[15px] text-[#15130F]">{msg.sender}</span>
                      <span className="font-mono text-xs text-[#5A5446]">{timeString}</span>
                    </div>

                    {/* Khối bong bóng tin nhắn kèm thanh hành động cảm xúc floating */}
                    <div className="relative group/bubble reaction-picker-root">
                      {/* Thanh thả cảm xúc nhanh trên bong bóng */}
                      <div className="absolute -top-3.5 left-3 flex items-center bg-white border-2 border-[#15130F] rounded-full shadow-[2px_2px_0_#15130F] px-1.5 py-0.5 gap-1 z-20 opacity-0 group-hover/bubble:opacity-100 transition-opacity">
                        {/* Nút Like nhanh */}
                        <button
                          type="button"
                          title={isLikedByMe ? 'Bỏ thích' : 'Thích tin nhắn (👍)'}
                          onClick={() => onReactMessage(messageKey, '👍')}
                          className={`p-1 rounded-full hover:bg-slate-100 transition-all ${
                            isLikedByMe ? 'text-[var(--accent)] font-bold' : 'text-[#15130F]'
                          }`}
                        >
                          <ThumbsUp
                            className={`w-3.5 h-3.5 ${isLikedByMe ? 'fill-current' : ''}`}
                            strokeWidth={2.4}
                          />
                        </button>

                        {/* Nút mở bảng 6 emoji */}
                        <button
                          type="button"
                          title="Thả cảm xúc"
                          onClick={() =>
                            setActivePickerId(isPickerOpen ? null : messageKey)
                          }
                          className="p-1 rounded-full text-[#15130F] hover:bg-[#FFD23F] transition-all"
                        >
                          <Smile className="w-3.5 h-3.5" strokeWidth={2.4} />
                        </button>
                      </div>

                      {/* Bảng chọn cảm xúc (Popover Emoji Palette) */}
                      {isPickerOpen && (
                        <div className="absolute bottom-full left-0 mb-2 bg-white border-2 border-[#15130F] rounded-2xl shadow-[4px_4px_0_#15130F] p-2 flex items-center gap-1.5 z-30 animate-neo-pop">
                          {EMOJI_OPTIONS.map(({ emoji, label }) => {
                            const currentEmojiRx = msg.reactions?.find((r) => r.emoji === emoji);
                            const userHasReacted = !!currentEmojiRx?.users.includes(
                              currentUser?.username || ''
                            );
                            return (
                              <button
                                key={emoji}
                                type="button"
                                title={`${label} (${emoji})`}
                                onClick={() => {
                                  onReactMessage(messageKey, emoji);
                                  setActivePickerId(null);
                                }}
                                className={`p-1.5 rounded-xl text-lg leading-none transition-all hover:bg-[#FFD23F] hover:scale-125 border border-transparent hover:border-[#15130F] ${
                                  userHasReacted ? 'bg-[#FFD23F] border-[#15130F]' : ''
                                }`}
                              >
                                {emoji}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Bong bóng trắng */}
                      <div
                        className="px-5 py-3.5 rounded-[20px] rounded-tl-[6px] bg-white text-[#15130F] text-[15px] font-sans border-2 border-[#15130F] shadow-[4px_4px_0_#15130F] break-words whitespace-pre-wrap select-text leading-relaxed cursor-default"
                        onDoubleClick={() => onReactMessage(messageKey, '👍')}
                        title="Nhấp đúp chuột để like nhanh 👍"
                      >
                        {msg.text}
                      </div>
                    </div>

                    {/* Hàng biểu cảm đã thả (Reactions Badge Row) */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="flex flex-wrap items-center justify-start gap-1.5 mt-2 reaction-picker-root">
                        {msg.reactions.map((rx) => {
                          const hasReacted = !!rx.users.includes(currentUser?.username || '');
                          const userNames = rx.users
                            .map((u) => (u === currentUser?.username ? 'Bạn' : u))
                            .join(', ');

                          return (
                            <button
                              key={rx.emoji}
                              type="button"
                              title={`${userNames} đã thả ${rx.emoji}`}
                              onClick={() => onReactMessage(messageKey, rx.emoji)}
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border-2 border-[#15130F] text-xs font-bold transition-all hover:translate-x-[1px] hover:translate-y-[1px] ${
                                hasReacted
                                  ? 'bg-[#FFD23F] shadow-[2px_2px_0_#15130F]'
                                  : 'bg-white shadow-[2px_2px_0_#15130F]'
                              }`}
                            >
                              <span className="text-sm leading-none">{rx.emoji}</span>
                              <span className="font-mono text-[11px] text-[#15130F]">
                                {rx.users.length}
                              </span>
                            </button>
                          );
                        })}

                        {/* Nút '+' thêm biểu cảm */}
                        <button
                          type="button"
                          title="Thêm cảm xúc"
                          onClick={() =>
                            setActivePickerId(isPickerOpen ? null : messageKey)
                          }
                          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white border-2 border-[#15130F] shadow-[2px_2px_0_#15130F] hover:bg-[#FFD23F] text-xs font-bold transition-all"
                        >
                          +
                        </button>
                      </div>
                    )}

                    {/* Dưới: Thẻ pod dạng pill viền 1.5px, chữ mono 11.5px/700, có chấm tròn mực, nền theo màu pod */}
                    <div className="flex items-center gap-2 mt-1.5 px-1">
                      <div
                        className="px-2.5 py-0.5 rounded-full border-[1.5px] border-[#15130F] flex items-center gap-1.5 font-mono font-bold text-[11.5px]"
                        style={{ backgroundColor: podStyle.bg, color: podStyle.text }}
                      >
                        <span className="w-2 h-2 rounded-full bg-[#15130F]" />
                        <span>{podStyle.name}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Typing Users Indicator nếu có */}
      {typingUsers.length > 0 && (
        <div className="px-6 py-1.5 text-xs font-bold font-sans text-[#4A4538] flex items-center gap-2 bg-[#F5F0E6]/80">
          <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-ping" />
          <span>{typingUsers.join(', ')} đang gõ...</span>
        </div>
      )}

      {/* ─── THANH GỢI Ý (VIỀN TRÊN 2PX) ─── */}
      <div className="border-t-2 border-[#15130F] bg-[#F5F0E6] px-5 py-2.5 flex items-center gap-2.5 overflow-x-auto shrink-0 select-none">
        <span className="text-xs font-mono font-bold text-[#4A4538] uppercase tracking-wider shrink-0 mr-1">
          GỢI Ý
        </span>
        {QUICK_SUGGESTIONS.map((suggestion, idx) => (
          <button
            type="button"
            key={idx}
            onClick={() => handleSelectSuggestion(suggestion)}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-white border-2 border-[#15130F] shadow-[3px_3px_0_#15130F] text-xs sm:text-[13px] font-bold text-[#15130F] whitespace-nowrap shrink-0 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#15130F] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all"
          >
            {suggestion}
          </button>
        ))}
      </div>

      {/* ─── Ô SOẠN TIN (HỘP TRẮNG CAO 60PX, VIỀN 2PX, BO 18PX, BÓNG 4PX) ─── */}
      <div className="px-5 py-3.5 bg-[#F5F0E6] border-t-2 border-transparent shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder={`Nhập tin nhắn trong #${currentRoom}...`}
            className="h-[60px] flex-1 bg-white border-2 border-[#15130F] rounded-[18px] shadow-[4px_4px_0_#15130F] px-5 text-sm sm:text-base font-sans text-[#15130F] placeholder-[#6B6455] outline-none focus:shadow-[4px_4px_0_var(--accent)] transition-all"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="h-[60px] px-6 rounded-[18px] bg-[var(--accent)] disabled:opacity-50 text-white text-base font-bold font-sans border-2 border-[#15130F] shadow-[4px_4px_0_#15130F] flex items-center gap-2 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#15130F] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all shrink-0"
          >
            <Send className="w-5 h-5 text-white" strokeWidth={2.4} aria-hidden="true" />
            <span>Gửi</span>
          </button>
        </form>
      </div>
    </main>
  );
};
