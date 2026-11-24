import React, { useState } from 'react';
import { User, Lock, ArrowRight, ArrowLeftRight, Eye, EyeOff, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { Avatar, AVATAR_LIST } from './Avatar';

interface LoginModalProps {
  onLogin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onRegister: (username: string, password: string, avatarId: string) => Promise<{ success: boolean; error?: string }>;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLogin, onRegister }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('duong');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState<number>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleTabChange = (newTab: 'login' | 'register') => {
    setTab(newTab);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUser = username.trim();
    if (!trimmedUser) {
      setError('Vui lòng nhập tên người dùng');
      return;
    }
    if (trimmedUser.length < 2) {
      setError('Tên người dùng phải có ít nhất 2 ký tự');
      return;
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu');
      return;
    }

    if (tab === 'register') {
      if (password.length < 6) {
        setError('Mật khẩu đăng ký phải có ít nhất 6 ký tự');
        return;
      }
      if (password !== confirmPassword) {
        setError('Mật khẩu xác nhận không khớp');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (tab === 'login') {
        const res = await onLogin(trimmedUser, password);
        if (!res.success) {
          setError(res.error || 'Đăng nhập không thành công');
        }
      } else {
        const res = await onRegister(trimmedUser, password, String(selectedAvatarId));
        if (!res.success) {
          setError(res.error || 'Đăng ký không thành công');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-neo-grid flex flex-col justify-between items-center p-4 sm:p-6 md:p-8 select-none relative overflow-x-hidden">
      {/* ─── THANH TRÊN ─── */}
      <header className="w-full max-w-6xl flex items-center justify-between z-10">
        {/* Bên trái: Logo 48px màu nhấn + chữ "Phòng Chat" */}
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
      <main className="w-full max-w-4xl flex flex-col items-center my-6 sm:my-8 z-10 relative">
        {/* Pill vàng xoay -2°, chữ mono hoa: "Đa pod · Đồng bộ Redis" */}
        <div className="inline-block -rotate-2 mb-4">
          <span className="px-4 py-1.5 rounded-full bg-[#FFD23F] border-2 border-[#15130F] shadow-[3px_3px_0_#15130F] text-xs sm:text-sm font-bold font-mono text-[#15130F] uppercase tracking-wider inline-block">
            Đa pod · Đồng bộ Redis
          </span>
        </div>

        {/* Tiêu đề H1 64px/800, line-height ~0.98, tối đa 760px */}
        <h1 className="text-3xl sm:text-5xl md:text-[54px] font-extrabold font-title text-[#15130F] tracking-[-0.03em] leading-[1.05] max-w-[760px] text-center mb-6 sm:mb-8">
          Vào phòng, nói chuyện.<br />
          Mọi pod đều nghe.
        </h1>

        {/* Khối thẻ trắng trung tâm kèm 4 nhãn dán xung quanh */}
        <div className="relative w-full flex justify-center items-center">
          {/* ─── 4 NHÃN DÁN NGHIÊNG QUANH THẺ (Chỉ hiện trên màn rộng >1180px) ─── */}
          <div
            className="hidden min-[1180px]:flex absolute -left-20 top-8 -rotate-6 items-center gap-2 px-4 py-2 rounded-full bg-[#FF8A4C] border-2 border-[#15130F] shadow-[4px_4px_0_#15130F] select-none z-20 pointer-events-none"
            aria-hidden="true"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#15130F]" />
            <span className="font-mono font-bold text-xs text-[#15130F]">backend-pod-alpha</span>
          </div>

          <div
            className="hidden min-[1180px]:flex absolute -left-24 bottom-14 rotate-3 items-center gap-2.5 px-3.5 py-2.5 rounded-[16px] bg-white border-2 border-[#15130F] shadow-[4px_4px_0_#15130F] select-none z-20 pointer-events-none"
            aria-hidden="true"
          >
            <Avatar id={3} size={28} />
            <span className="font-sans font-bold text-xs text-[#15130F]">Deploy thành công rồi!</span>
          </div>

          <div
            className="hidden min-[1180px]:flex absolute -right-20 top-24 rotate-5 items-center gap-2 px-4 py-2 rounded-full bg-[#FFD23F] border-2 border-[#15130F] shadow-[4px_4px_0_#15130F] select-none z-20 pointer-events-none"
            aria-hidden="true"
          >
            <ArrowLeftRight className="w-4 h-4 text-[#15130F]" strokeWidth={2.4} />
            <span className="font-mono font-bold text-xs text-[#15130F]">Redis Pub/Sub</span>
          </div>

          <div
            className="hidden min-[1180px]:flex absolute -right-20 bottom-16 -rotate-4 items-center gap-2 px-4 py-2 rounded-full bg-[#A5B0FF] border-2 border-[#15130F] shadow-[4px_4px_0_#15130F] select-none z-20 pointer-events-none"
            aria-hidden="true"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#15130F]" />
            <span className="font-mono font-bold text-xs text-[#15130F]">backend-pod-beta</span>
          </div>

          {/* ─── THẺ TRẮNG CHÍNH (rộng tối đa 500px, bo 28px, bóng 8px, padding 32px) ─── */}
          <div className="w-full max-w-[500px] bg-white border-2 border-[#15130F] rounded-[28px] shadow-[8px_8px_0_#15130F] p-6 sm:p-8 relative z-10 animate-neo-pop">
            {/* TAB CHUYỂN ĐỔI: ĐĂNG NHẬP / ĐĂNG KÝ */}
            <div className="flex bg-[#FFFBF2] p-1.5 rounded-2xl border-2 border-[#15130F] mb-6">
              <button
                type="button"
                onClick={() => handleTabChange('login')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold font-title transition-all duration-150 flex items-center justify-center gap-1.5 ${
                  tab === 'login'
                    ? 'bg-[#FFD23F] text-[#15130F] border-2 border-[#15130F] shadow-[2px_2px_0_#15130F] -translate-y-0.5'
                    : 'text-[#6B6455] hover:text-[#15130F]'
                }`}
              >
                <span>Đăng nhập</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('register')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold font-title transition-all duration-150 flex items-center justify-center gap-1.5 ${
                  tab === 'register'
                    ? 'bg-[#FFD23F] text-[#15130F] border-2 border-[#15130F] shadow-[2px_2px_0_#15130F] -translate-y-0.5'
                    : 'text-[#6B6455] hover:text-[#15130F]'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Đăng ký mới</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* TIÊU ĐỀ THEO TAB */}
              {tab === 'login' ? (
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#86E3B8] border-2 border-[#15130F] shadow-[3px_3px_0_#15130F] flex items-center justify-center shrink-0">
                    <Lock className="w-8 h-8 text-[#15130F]" strokeWidth={2.4} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold font-title tracking-tight text-[#15130F] leading-tight">
                      Mừng bạn trở lại!
                    </h2>
                    <p className="text-xs sm:text-sm text-[#4A4538] font-sans mt-1">
                      Nhập thông tin tài khoản để vào phòng chat.
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar
                      id={selectedAvatarId}
                      size={72}
                      showOnline={true}
                      onlineSize={20}
                      className="shrink-0"
                    />
                    <div>
                      <h2 className="text-2xl font-extrabold font-title tracking-tight text-[#15130F] leading-tight">
                        Tạo tài khoản mới
                      </h2>
                      <p className="text-xs sm:text-sm text-[#4A4538] font-sans mt-1">
                        Chọn avatar đại diện và mật khẩu bảo mật.
                      </p>
                    </div>
                  </div>

                  {/* Nhóm "Chọn avatar của bạn" (chỉ hiện khi Đăng ký) */}
                  <div className="mb-2">
                    <label className="block text-xs font-bold font-sans text-[#15130F] mb-2">
                      Chọn avatar của bạn
                    </label>
                    <div className="grid grid-cols-6 gap-2" role="radiogroup" aria-label="Chọn avatar">
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
                                ? 'bg-[#FFD23F] shadow-[3px_3px_0_#15130F] -translate-x-[1px] -translate-y-[1px]'
                                : 'bg-transparent hover:-translate-y-[2px] hover:-rotate-2'
                            }`}
                          >
                            <Avatar id={av.id} size={34} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Ô NHẬP TÊN ĐĂNG NHẬP */}
              <div>
                <label htmlFor="username-input" className="block text-xs font-bold font-sans text-[#15130F] mb-1.5">
                  Tên đăng nhập
                </label>
                <div className="relative h-13 bg-[#FFFBF2] border-2 border-[#15130F] rounded-[16px] px-3.5 flex items-center gap-3 transition-all focus-within:shadow-[3px_3px_0_var(--accent)]">
                  <User className="w-5 h-5 text-[#15130F] shrink-0" strokeWidth={2.4} aria-hidden="true" />
                  <input
                    id="username-input"
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setError('');
                    }}
                    placeholder={tab === 'login' ? 'Nhập tên đăng nhập của bạn...' : 'Chọn tên hiển thị (vd: duong, devops)...'}
                    className="w-full bg-transparent text-sm sm:text-base font-sans text-[#15130F] placeholder-[#6B6455] outline-none"
                    autoFocus
                  />
                </div>
              </div>

              {/* Ô NHẬP MẬT KHẨU */}
              <div>
                <label htmlFor="password-input" className="block text-xs font-bold font-sans text-[#15130F] mb-1.5">
                  Mật khẩu
                </label>
                <div className="relative h-13 bg-[#FFFBF2] border-2 border-[#15130F] rounded-[16px] px-3.5 flex items-center gap-3 transition-all focus-within:shadow-[3px_3px_0_var(--accent)]">
                  <Lock className="w-5 h-5 text-[#15130F] shrink-0" strokeWidth={2.4} aria-hidden="true" />
                  <input
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    placeholder={tab === 'login' ? 'Nhập mật khẩu...' : 'Tối thiểu 6 ký tự...'}
                    className="w-full bg-transparent text-sm sm:text-base font-sans text-[#15130F] placeholder-[#6B6455] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[#6B6455] hover:text-[#15130F] p-1 transition-colors"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Ô XÁC NHẬN MẬT KHẨU (CHỈ KHI ĐĂNG KÝ) */}
              {tab === 'register' && (
                <div>
                  <label htmlFor="confirm-password-input" className="block text-xs font-bold font-sans text-[#15130F] mb-1.5">
                    Xác nhận mật khẩu
                  </label>
                  <div className="relative h-13 bg-[#FFFBF2] border-2 border-[#15130F] rounded-[16px] px-3.5 flex items-center gap-3 transition-all focus-within:shadow-[3px_3px_0_var(--accent)]">
                    <Lock className="w-5 h-5 text-[#15130F] shrink-0" strokeWidth={2.4} aria-hidden="true" />
                    <input
                      id="confirm-password-input"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError('');
                      }}
                      placeholder="Nhập lại mật khẩu để xác nhận..."
                      className="w-full bg-transparent text-sm sm:text-base font-sans text-[#15130F] placeholder-[#6B6455] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-[#6B6455] hover:text-[#15130F] p-1 transition-colors"
                      aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* HIỂN THỊ THÔNG BÁO LỖI */}
              {error && (
                <div className="bg-[#FFEAEA] border-2 border-[#E53E3E] rounded-2xl p-3 shadow-[3px_3px_0_#E53E3E] flex items-center gap-2.5 animate-neo-pop">
                  <AlertCircle className="w-5 h-5 text-[#E53E3E] shrink-0" />
                  <p className="text-xs sm:text-sm font-bold text-[#9B1C1C] leading-snug">
                    {error}
                  </p>
                </div>
              )}

              {/* NÚT CHÍNH XÁC NHẬN */}
              <button
                type="submit"
                disabled={isLoading}
                className="h-[56px] w-full rounded-[18px] bg-[var(--accent)] text-white text-base sm:text-lg font-bold font-sans border-2 border-[#15130F] shadow-[5px_5px_0_#15130F] flex items-center justify-center gap-2 neo-btn-primary disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : tab === 'login' ? (
                  <>
                    <span>Đăng nhập vào phòng</span>
                    <ArrowRight className="w-5 h-5 text-white" strokeWidth={2.6} aria-hidden="true" />
                  </>
                ) : (
                  <>
                    <span>Tạo tài khoản & Bắt đầu</span>
                    <ArrowRight className="w-5 h-5 text-white" strokeWidth={2.6} aria-hidden="true" />
                  </>
                )}
              </button>

              {/* CHUYỂN NHANH GIỮA 2 TAB Ở CUỐI FORM */}
              <div className="text-center pt-1">
                {tab === 'login' ? (
                  <p className="text-xs text-[#4A4538] font-sans">
                    Chưa có tài khoản?{' '}
                    <button
                      type="button"
                      onClick={() => handleTabChange('register')}
                      className="font-bold text-[#15130F] underline hover:text-[var(--accent)] ml-1"
                    >
                      Đăng ký ngay
                    </button>
                  </p>
                ) : (
                  <p className="text-xs text-[#4A4538] font-sans">
                    Đã có tài khoản?{' '}
                    <button
                      type="button"
                      onClick={() => handleTabChange('login')}
                      className="font-bold text-[#15130F] underline hover:text-[var(--accent)] ml-1"
                    >
                      Đăng nhập ngay
                    </button>
                  </p>
                )}
              </div>
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
