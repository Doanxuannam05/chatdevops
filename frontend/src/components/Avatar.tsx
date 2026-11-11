import React from 'react';

export interface AvatarMeta {
  id: number;
  name: string;
  color: string;
}

export const AVATAR_LIST: AvatarMeta[] = [
  { id: 1, name: 'Hồng - Bình thản', color: '#FF9CCB' },
  { id: 2, name: 'Vàng - Cười vui', color: '#FFD23F' },
  { id: 3, name: 'Bạc hà - Robot', color: '#86E3B8' },
  { id: 4, name: 'Xanh tím - Thư giãn', color: '#A5B0FF' },
  { id: 5, name: 'Cam - Nháy mắt', color: '#FF8A4C' },
  { id: 6, name: 'Tím nhạt - Dễ thương', color: '#D9B8FF' },
];

export function resolveAvatarId(avatar?: string | number, fallbackSeed?: string): number {
  if (typeof avatar === 'number' && avatar >= 1 && avatar <= 6) {
    return avatar;
  }
  if (typeof avatar === 'string') {
    const parsed = parseInt(avatar, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 6) {
      return parsed;
    }
    const match = avatar.match(/avatar-?([1-6])/i);
    if (match) {
      return parseInt(match[1], 10);
    }
    // Match specific preset seed names if any
    if (avatar.includes('robot') || avatar.includes('docker') || avatar === 'dd') return 3;
    if (avatar.includes('pilot') || avatar.includes('pink') || avatar === 'duong') return 1;
    if (avatar.includes('k8s') || avatar.includes('yellow') || avatar === 'namdoan') return 2;
    if (avatar.includes('cloud') || avatar.includes('blue')) return 4;
    if (avatar.includes('sre') || avatar.includes('orange')) return 5;
    if (avatar.includes('purple') || avatar.includes('eye')) return 6;
  }

  // Deterministic fallback from seed
  const seed = fallbackSeed || (typeof avatar === 'string' ? avatar : 'default');
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return (Math.abs(hash) % 6) + 1;
}

interface AvatarProps {
  id?: string | number;
  seed?: string;
  size?: number | string; // e.g. 40, 44, 48, 96
  showOnline?: boolean;
  onlineSize?: number; // e.g. 26 or 11
  className?: string;
  ariaLabel?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  id,
  seed,
  size = 44,
  showOnline = false,
  onlineSize,
  className = '',
  ariaLabel,
}) => {
  const avatarId = resolveAvatarId(id, seed);
  const meta = AVATAR_LIST[avatarId - 1] || AVATAR_LIST[0];

  const numericSize = typeof size === 'number' ? size : parseInt(size, 10) || 44;
  const badgeSize = onlineSize || (numericSize >= 80 ? 26 : Math.round(numericSize * 0.28));
  const badgeBorder = numericSize >= 80 ? 3 : 2;

  const renderFace = () => {
    switch (avatarId) {
      case 1:
        // 1. Hồng #FF9CCB: mắt chấm tròn, miệng ngang
        return (
          <>
            <circle cx="14" cy="18" r="2.5" fill="#15130F" />
            <circle cx="26" cy="18" r="2.5" fill="#15130F" />
            <path d="M15 26h10" stroke="#15130F" strokeWidth="2.5" strokeLinecap="round" />
          </>
        );
      case 2:
        // 2. Vàng #FFD23F: mắt cười (vòm ^ ^), miệng cười
        return (
          <>
            <path
              d="M11 19c1.6-3.4 4.4-3.4 6 0"
              stroke="#15130F"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M23 19c1.6-3.4 4.4-3.4 6 0"
              stroke="#15130F"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M15 25c2.5 3.2 7.5 3.2 10 0"
              stroke="#15130F"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          </>
        );
      case 3:
        // 3. Bạc hà #86E3B8: mắt vuông (robot), miệng ngang dài
        return (
          <>
            <rect x="12" y="15" width="5.5" height="5.5" rx="1.2" fill="#15130F" />
            <rect x="22.5" y="15" width="5.5" height="5.5" rx="1.2" fill="#15130F" />
            <path d="M12 26h16" stroke="#15130F" strokeWidth="2.5" strokeLinecap="round" />
          </>
        );
      case 4:
        // 4. Xanh tím #A5B0FF: mắt nhắm (gạch ngang), miệng ngang
        return (
          <>
            <path d="M12 18h6" stroke="#15130F" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M22 18h6" stroke="#15130F" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M16 26h8" stroke="#15130F" strokeWidth="2.5" strokeLinecap="round" />
          </>
        );
      case 5:
        // 5. Cam #FF8A4C: một mắt chấm, một mắt nháy, miệng cười nhẹ
        return (
          <>
            <path
              d="M11 19c1.6-3.4 4.4-3.4 6 0"
              stroke="#15130F"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="25.5" cy="18" r="2.5" fill="#15130F" />
            <path
              d="M16 25c2 2.2 6 2.2 8 0"
              stroke="#15130F"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          </>
        );
      case 6:
        // 6. Tím nhạt #D9B8FF: mắt chấm to, miệng nhỏ cong
        return (
          <>
            <circle cx="13.5" cy="18" r="3.4" fill="#15130F" />
            <circle cx="26.5" cy="18" r="3.4" fill="#15130F" />
            <path
              d="M17 26c1.5 2 4.5 2 6 0"
              stroke="#15130F"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`relative inline-block shrink-0 ${className}`}
      style={{ width: numericSize, height: numericSize }}
      aria-label={ariaLabel || meta.name}
    >
      <svg
        viewBox="0 0 40 40"
        width="100%"
        height="100%"
        className="block select-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Nền một màu pastel, viền mực 2px, bo góc rx=10 */}
        <rect
          x="1"
          y="1"
          width="38"
          height="38"
          rx="10"
          fill={meta.color}
          stroke="#15130F"
          strokeWidth="2"
        />
        {/* Khuôn mặt vẽ bằng SVG nét mực */}
        {renderFace()}
      </svg>

      {/* Chấm trạng thái online xanh bạc hà ở góc dưới phải */}
      {showOnline && (
        <span
          className="absolute rounded-full bg-[#86E3B8] block pointer-events-none"
          style={{
            width: badgeSize,
            height: badgeSize,
            right: numericSize >= 80 ? -2 : -1,
            bottom: numericSize >= 80 ? -2 : -1,
            border: `${badgeBorder}px solid #15130F`,
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
};
