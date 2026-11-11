import React, { useState } from 'react';
import { User, ArrowRight, Lock, ArrowLeftRight } from 'lucide-react';
import { Avatar, AVATAR_LIST } from './Avatar';

interface LoginModalProps {
  onLogin: (username: string, avatarId: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('duong');
  const [selectedAvatarId, setSelectedAvatarId] = useState<number>(1);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) {
      setError('Vui lòng nhập tên người dùng');
      return;
    }
    if (trimmed.length < 2) {
      setError('Tên người dùng phải có ít nhất 2 ký tự');
      return;
    }
    onLogin(trimmed, String(selectedAvatarId));
  };

  return (
    <div className="min-h-screen w-full bg-neo-grid flex flex-col justify-between items-center p-4 sm:p-6 md:p-8 select-none relative overflow-x-hidden">
      {/* ─── THANH TRÊN ─── */}
      <header className="w-full max-w-6xl flex items-center justify-between z-10">
        {/* Bên trái: Logo 48px màu nhấn + chữ "Phòng Chat" 26px/800 */}
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl bg-[var(--accent)] border-2 border-[#15130F] shadow-[3px_3px_0_#15130F] flex items-center justify-center text-white shrink-0"
            aria-hidden="true"
          >
            <svg
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span className="text-2xl sm:text-[26px] font-extrabold font-title tracking-tight text-[#15130F]">
            Phòng Chat
          </span>
        </div>

        {/* Bên phải: Pill xanh bạc hà có icon khóa: "Phiên làm việc bảo mật" */}
        <div className="min-h-[44px] px-4 py-2 rounded-full bg-[#86E3B8] border-2 border-[#15130F] shadow-[3px_3px_0_#15130F] flex items-center gap-2 text-xs sm:text-sm font-bold font-sans text-[#15130F]">
          <Lock className="w-4 h-4 text-[#15130F]" strokeWidth={2.4} aria-hidden="true" />
          <span>Phiên làm việc bảo mật</span>
        </div>
      </header>

      {/* ─── PHẦN CHÍNH ─── */}
      <main className="w-full max-w-4xl flex flex-col items-center my-6 sm:my-10 z-10 relative">
        {/* Pill vàng xoay -2°, chữ mono hoa: "Đa pod · Đồng bộ Redis" */}
        <div className="inline-block -rotate-2 mb-4">
          <span className="px-4 py-1.5 rounded-full bg-[#FFD23F] border-2 border-[#15130F] shadow-[3px_3px_0_#15130F] text-xs sm:text-sm font-bold font-mono text-[#15130F] uppercase tracking-wider inline-block">
            Đa pod · Đồng bộ Redis
          </span>
        </div>

        {/* Tiêu đề H1 64px/800, line-height ~0.98, tối đa 760px */}
        <h1 className="text-4xl sm:text-5xl md:text-[64px] font-extrabold font-title text-[#15130F] tracking-[-0.03em] leading-[0.98] max-w-[760px] text-center mb-8 sm:mb-10">
          Vào phòng, nói chuyện.<br />
          Mọi pod đều nghe.
        </h1>

        {/* Khối thẻ trắng trung tâm kèm 4 nhãn dán xung quanh */}
        <div className="relative w-full flex justify-center items-center">
          {/* ─── 4 NHÃN DÁN NGHIÊNG QUANH THẺ (Chỉ hiện trên màn rộng >1180px) ─── */}
          {/* Trái trên: "backend-pod-alpha" (cam, xoay -6°) */}
          <div
            className="hidden min-[1180px]:flex absolute -left-20 top-8 -rotate-6 items-center gap-2 px-4 py-2 rounded-full bg-[#FF8A4C] border-2 border-[#15130F] shadow-[4px_4px_0_#15130F] select-none z-20 pointer-events-none"
            aria-hidden="true"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#15130F]" />
            <span className="font-mono font-bold text-xs text-[#15130F]">backend-pod-alpha</span>
          </div>

          {/* Trái dưới: bong bóng chat trắng có avatar robot + "Deploy thành công rồi!" (xoay 3°) */}
          <div
            className="hidden min-[1180px]:flex absolute -left-24 bottom-14 rotate-3 items-center gap-2.5 px-3.5 py-2.5 rounded-[16px] bg-white border-2 border-[#15130F] shadow-[4px_4px_0_#15130F] select-none z-20 pointer-events-none"
            aria-hidden="true"
          >
            <Avatar id={3} size={28} />
            <span className="font-sans font-bold text-xs text-[#15130F]">Deploy thành công rồi!</span>
          </div>

          {/* Phải trên: "Redis Pub/Sub" (vàng, pill, có icon mũi tên trao đổi, xoay 5°) */}
          <div
            className="hidden min-[1180px]:flex absolute -right-20 top-24 rotate-5 items-center gap-2 px-4 py-2 rounded-full bg-[#FFD23F] border-2 border-[#15130F] shadow-[4px_4px_0_#15130F] select-none z-20 pointer-events-none"
            aria-hidden="true"
          >
            <ArrowLeftRight className="w-4 h-4 text-[#15130F]" strokeWidth={2.4} />
            <span className="font-mono font-bold text-xs text-[#15130F]">Redis Pub/Sub</span>
          </div>

          {/* Phải dưới: "backend-pod-beta" (xanh tím, xoay -4°) */}
          <div
            className="hidden min-[1180px]:flex absolute -right-20 bottom-16 -rotate-4 items-center gap-2 px-4 py-2 rounded-full bg-[#A5B0FF] border-2 border-[#15130F] shadow-[4px_4px_0_#15130F] select-none z-20 pointer-events-none"
            aria-hidden="true"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#15130F]" />
            <span className="font-mono font-bold text-xs text-[#15130F]">backend-pod-beta</span>
          </div>

          {/* ─── THẺ TRẮNG CHÍNH (rộng tối đa 480px, bo 28px, bóng 8px, padding 32px) ─── */}
          <div className="w-full max-w-[480px] bg-white border-2 border-[#15130F] rounded-[28px] shadow-[8px_8px_0_#15130F] p-6 sm:p-8 relative z-10 animate-neo-pop">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Hàng đầu: Avatar xem trước 96px + Chào mừng bạn! + mô tả */}
              <div className="flex items-center gap-4 sm:gap-5">
                <Avatar
                  id={selectedAvatarId}
                  size={96}
                  showOnline={true}
                  onlineSize={26}
                  className="shrink-0"
                />
                <div>
                  <h2 className="text-2xl sm:text-[32px] font-extrabold font-title tracking-tight text-[#15130F] leading-tight">
                    Chào mừng bạn!
                  </h2>
                  <p className="text-xs sm:text-sm text-[#4A4538] font-sans mt-1.5 leading-snug">
                    Chọn avatar và đặt tên để bắt đầu trò chuyện.
                  </p>
                </div>
              </div>

              {/* Nhóm "Chọn avatar của bạn": lưới 6 cột, mỗi nút avatar vuông ≥44px */}
              <div>
                <label className="block text-xs font-bold font-sans text-[#15130F] mb-2.5">
                  Chọn avatar của bạn
                </label>
                <div className="grid grid-cols-6 gap-2 sm:gap-2.5" role="radiogroup" aria-label="Chọn avatar">
                  {AVATAR_LIST.map((av) => {
                    const isSelected = selectedAvatarId === av.id;
                    return (
                      <button
                        type="button"
                        key={av.id}
                        onClick={() => setSelectedAvatarId(av.id)}
                        role="radio"
                        aria-checked={isSelected}
                        aria-label={`Chọn avatar ${av.name}`}
                        className={`min-h-[44px] h-12 w-full rounded-2xl flex items-center justify-center border-2 border-[#15130F] transition-all duration-150 ${
                          isSelected
                            ? 'bg-[#FFD23F] shadow-[3px_3px_0_#15130F] translate-x-[-1px] translate-y-[-1px]'
                            : 'bg-transparent hover:-translate-y-[3px] hover:-rotate-3'
                        }`}
                      >
                        <Avatar id={av.id} size={36} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nhãn "Tên hiển thị" + ô nhập cao 56px */}
              <div>
                <label htmlFor="username-input" className="block text-xs font-bold font-sans text-[#15130F] mb-2">
                  Tên hiển thị
                </label>
                <div className="relative h-14 bg-[#FFFBF2] border-2 border-[#15130F] rounded-[16px] px-3.5 flex items-center gap-3 transition-all focus-within:shadow-[3px_3px_0_var(--accent)]">
                  <User className="w-5 h-5 text-[#15130F] shrink-0" strokeWidth={2.4} aria-hidden="true" />
                  <input
                    id="username-input"
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setError('');
                    }}
                    placeholder="Nhập tên bạn muốn hiển thị..."
                    className="w-full bg-transparent text-sm sm:text-base font-sans text-[#15130F] placeholder-[#6B6455] outline-none"
                    autoFocus
                  />
                </div>
                {error && (
                  <p className="text-red-600 text-xs mt-1.5 font-bold font-sans flex items-center gap-1">
                    <span>⚠</span> {error}
                  </p>
                )}
              </div>

              {/* Nút chính cao 60px, bo 18px, nền màu nhấn, chữ trắng đậm "Bắt đầu trò chuyện" + mũi tên → */}
              <button
                type="submit"
                className="h-[60px] w-full rounded-[18px] bg-[var(--accent)] text-white text-base sm:text-lg font-bold font-sans border-2 border-[#15130F] shadow-[5px_5px_0_#15130F] flex items-center justify-center gap-2 neo-btn-primary"
              >
                <span>Bắt đầu trò chuyện</span>
                <ArrowRight className="w-5 h-5 text-white" strokeWidth={2.6} aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* ─── CHÂN TRANG NHỎ ─── */}
      <footer className="w-full text-center py-2 text-xs font-mono font-bold text-[#4A4538] z-10">
        Phòng Chat DevOps · Socket.io · Redis Pub/Sub · Kubernetes
      </footer>
    </div>
  );
};
