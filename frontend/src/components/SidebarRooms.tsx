import React, { useState, useEffect } from 'react';
import { Plus, LogOut, X } from 'lucide-react';
import { UserProfile } from '../hooks/useSocket';
import { Avatar } from './Avatar';
import { getPodStyle } from '../utils/podUtils';

interface RoomItem {
  roomId: string;
  name: string;
  description: string;
  monogram: string;
  isDefault?: boolean;
}

interface SidebarRoomsProps {
  currentRoom: string;
  onSelectRoom: (roomId: string) => void;
  currentUser: UserProfile | null;
  onLogout: () => void;
  connectedPod: string;
}

const DEFAULT_ROOMS: RoomItem[] = [
  {
    roomId: 'general',
    name: 'General Chat',
    description: 'Kênh chat chung toàn hệ thống',
    monogram: 'GC',
  },
  {
    roomId: 'devops',
    name: 'DevOps & SRE',
    description: 'Thảo luận CI/CD, Terraform, Kubernetes',
    monogram: 'DO',
  },
  {
    roomId: 'kubernetes',
    name: 'K8s Cluster',
    description: 'Trao đổi về Pods, HPA, Redis Pub/Sub',
    monogram: 'K8',
  },
  {
    roomId: 'random',
    name: 'Random & Coffee',
    description: 'Góc giải trí công nghệ',
    monogram: 'RC',
  },
  {
    roomId: 'namdoan',
    name: 'namdoan',
    description: '',
    monogram: '#',
  },
];

export const SidebarRooms: React.FC<SidebarRoomsProps> = ({
  currentRoom,
  onSelectRoom,
  currentUser,
  onLogout,
  connectedPod,
}) => {
  const [rooms, setRooms] = useState<RoomItem[]>(DEFAULT_ROOMS);
  const [showNewRoomModal, setShowNewRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Fetch rooms from backend REST API
  useEffect(() => {
    async function fetchRooms() {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${apiUrl}/api/rooms`);
        if (res.ok) {
          const apiRooms = await res.json();
          if (apiRooms && apiRooms.length > 0) {
            // Merge API rooms while preserving the 5 specified demo rooms
            const merged = [...DEFAULT_ROOMS];
            apiRooms.forEach((ar: any) => {
              if (!merged.some((r) => r.roomId === ar.roomId)) {
                const words = (ar.name || '').trim().split(/\s+/);
                const monogram =
                  words.length >= 2
                    ? (words[0][0] + words[1][0]).toUpperCase()
                    : ar.name.slice(0, 2).toUpperCase() || '#';
                merged.push({
                  roomId: ar.roomId,
                  name: ar.name,
                  description: ar.description || '',
                  monogram,
                });
              }
            });
            setRooms(merged);
          }
        }
      } catch (err) {
        // Fallback to default rooms
      }
    }
    fetchRooms();
  }, []);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    setIsCreating(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiUrl}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRoomName.trim(), description: newRoomDesc.trim() }),
      });

      if (res.ok) {
        const createdRoom = await res.json();
        const words = createdRoom.name.trim().split(/\s+/);
        const monogram =
          words.length >= 2
            ? (words[0][0] + words[1][0]).toUpperCase()
            : createdRoom.name.slice(0, 2).toUpperCase() || '#';

        const newRoomItem: RoomItem = {
          roomId: createdRoom.roomId,
          name: createdRoom.name,
          description: createdRoom.description || '',
          monogram,
        };
        setRooms((prev) => [...prev, newRoomItem]);
        onSelectRoom(createdRoom.roomId);
        setNewRoomName('');
        setNewRoomDesc('');
        setShowNewRoomModal(false);
      }
    } catch (err) {
      console.error('Failed to create room:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const currentPodStyle = getPodStyle(connectedPod);

  return (
    <aside className="w-full md:w-[292px] bg-[#EDE6D6] border-b-2 md:border-b-0 md:border-r-2 border-[#15130F] flex flex-col justify-between shrink-0 select-none h-full overflow-y-auto">
      {/* ─── PHẦN TRÊN: LOGO & PHÒNG CHAT ─── */}
      <div className="p-4 flex flex-col gap-5">
        {/* Logo 48px màu nhấn + "Phòng Chat" 22px/800 + dòng nhỏ "Socket.io + Redis Pub/Sub" */}
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
          <div>
            <h1 className="text-[22px] font-extrabold font-title tracking-tight text-[#15130F] leading-tight">
              Phòng Chat
            </h1>
            <p className="text-xs font-sans text-[#4A4538] leading-tight">
              Socket.io + Redis Pub/Sub
            </p>
          </div>
        </div>

        {/* Tiêu đề nhóm "PHÒNG CHAT" + nút "+" vuông 44px */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs font-mono font-bold tracking-wider text-[#4A4538] uppercase">
            PHÒNG CHAT
          </span>
          <button
            type="button"
            onClick={() => setShowNewRoomModal(true)}
            aria-label="Tạo phòng mới"
            className="w-11 h-11 bg-white border-2 border-[#15130F] rounded-xl shadow-[3px_3px_0_#15130F] flex items-center justify-center hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#15130F] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all"
          >
            <Plus className="w-5 h-5 text-[#15130F]" strokeWidth={2.5} />
          </button>
        </div>

        {/* Danh sách 5 phòng */}
        <nav className="flex flex-col gap-2" aria-label="Danh sách phòng chat">
          {rooms.map((room) => {
            const isActive = room.roomId === currentRoom;

            if (isActive) {
              // Phòng đang mở: thẻ trắng viền 2px + bóng 4px, ô icon "#" nền màu nhấn chữ trắng, chấm màu nhấn bên phải
              return (
                <button
                  type="button"
                  key={room.roomId}
                  onClick={() => onSelectRoom(room.roomId)}
                  aria-current="page"
                  className="w-full text-left bg-white border-2 border-[#15130F] rounded-2xl shadow-[4px_4px_0_#15130F] p-2.5 flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center font-title font-extrabold text-base shrink-0 border border-[#15130F]">
                      {room.monogram}
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-sm text-[#15130F] truncate leading-tight">
                        {room.name}
                      </p>
                      {room.description && (
                        <p className="text-[11px] text-[#4A4538] truncate leading-tight mt-0.5">
                          {room.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] shrink-0 ml-2" />
                </button>
              );
            }

            // Phòng thường: ô monogram nền mực 8% alpha, hover nền mực 7%
            return (
              <button
                type="button"
                key={room.roomId}
                onClick={() => onSelectRoom(room.roomId)}
                className="w-full text-left p-2.5 rounded-2xl flex items-center gap-3 transition-colors hover:bg-[#15130F]/[0.07]"
              >
                <div className="w-10 h-10 rounded-xl bg-[#15130F]/[0.08] text-[#15130F] flex items-center justify-center font-title font-extrabold text-sm shrink-0">
                  {room.monogram}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-[#15130F] truncate leading-tight">
                    {room.name}
                  </p>
                  {room.description && (
                    <p className="text-[11px] text-[#4A4538] truncate leading-tight mt-0.5">
                      {room.description}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ─── PHẦN DƯỚI: 2 THẺ TRẮNG VIỀN + BÓNG 4PX ─── */}
      <div className="p-4 flex flex-col gap-3">
        {/* (1) "Đang kết nối tới" + thẻ pod backend-pod-beta */}
        <div className="bg-white border-2 border-[#15130F] rounded-2xl shadow-[4px_4px_0_#15130F] p-3 flex items-center justify-between gap-2">
          <div className="text-xs font-bold text-[#15130F] leading-tight">
            <span>Đang kết nối</span>
            <br />
            <span>tới</span>
          </div>

          <div
            className="px-3 py-1 rounded-full border-[1.5px] border-[#15130F] flex items-center gap-1.5 font-mono font-bold text-[11.5px] shrink-0"
            style={{ backgroundColor: currentPodStyle.bg, color: currentPodStyle.text }}
          >
            <span className="w-2 h-2 rounded-full bg-[#15130F]" />
            <span className="truncate max-w-[130px]">{connectedPod}</span>
          </div>
        </div>

        {/* (2) Thẻ người dùng: avatar hồng 44px có chấm online, tên "duong", chữ xanh lá đậm "Trực tuyến", nút đăng xuất vuông 44px */}
        <div className="bg-white border-2 border-[#15130F] rounded-2xl shadow-[4px_4px_0_#15130F] p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar
              id={currentUser?.avatar || 1}
              seed={currentUser?.username || 'duong'}
              size={44}
              showOnline={true}
              onlineSize={11}
            />
            <div className="min-w-0">
              <p className="font-bold text-sm text-[#15130F] truncate leading-tight">
                {currentUser?.username || 'duong'}
              </p>
              <p className="text-xs font-bold text-[#1FA66A] leading-tight mt-0.5">
                Trực tuyến
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            aria-label="Đăng xuất"
            title="Đăng xuất"
            className="w-11 h-11 bg-white border-2 border-[#15130F] rounded-xl shadow-[3px_3px_0_#15130F] flex items-center justify-center hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#15130F] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all shrink-0 ml-2"
          >
            <LogOut className="w-5 h-5 text-[#15130F]" strokeWidth={2.4} />
          </button>
        </div>
      </div>

      {/* ─── MODAL TẠO PHÒNG MỚI (NEO-BRUTALIST) ─── */}
      {showNewRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#15130F]/40 backdrop-blur-none">
          <div className="w-full max-w-sm bg-white border-2 border-[#15130F] rounded-[24px] shadow-[8px_8px_0_#15130F] p-6 animate-neo-pop">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold font-title text-[#15130F] flex items-center gap-2">
                <Plus className="w-5 h-5 text-[var(--accent)]" strokeWidth={2.5} />
                Tạo Phòng Mới
              </h2>
              <button
                type="button"
                onClick={() => setShowNewRoomModal(false)}
                aria-label="Đóng"
                className="w-8 h-8 rounded-lg border-2 border-[#15130F] shadow-[2px_2px_0_#15130F] flex items-center justify-center hover:bg-slate-100"
              >
                <X className="w-4 h-4 text-[#15130F]" strokeWidth={2.4} />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-bold font-sans text-[#15130F] mb-1.5">
                  Tên phòng
                </label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Ví dụ: Security, Cloud, SRE..."
                  className="w-full px-3.5 py-2.5 bg-[#FFFBF2] border-2 border-[#15130F] rounded-xl text-sm font-sans text-[#15130F] placeholder-[#6B6455] outline-none focus:shadow-[3px_3px_0_var(--accent)]"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold font-sans text-[#15130F] mb-1.5">
                  Mô tả (tùy chọn)
                </label>
                <input
                  type="text"
                  value={newRoomDesc}
                  onChange={(e) => setNewRoomDesc(e.target.value)}
                  placeholder="Mô tả mục đích của phòng"
                  className="w-full px-3.5 py-2.5 bg-[#FFFBF2] border-2 border-[#15130F] rounded-xl text-sm font-sans text-[#15130F] placeholder-[#6B6455] outline-none focus:shadow-[3px_3px_0_var(--accent)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewRoomModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[#15130F] border-2 border-[#15130F] rounded-xl shadow-[2px_2px_0_#15130F] hover:bg-slate-100 min-h-[44px]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 text-xs font-bold text-white bg-[var(--accent)] border-2 border-[#15130F] rounded-xl shadow-[3px_3px_0_#15130F] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#15130F] min-h-[44px]"
                >
                  {isCreating ? 'Đang tạo...' : 'Tạo Phòng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};
