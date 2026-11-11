import React from 'react';
import { useSocket } from './hooks/useSocket';
import { SidebarRooms } from './components/SidebarRooms';
import { ChatWindow } from './components/ChatWindow';
import { LoginModal } from './components/LoginModal';

export const App: React.FC = () => {
  const {
    isConnected,
    connectedPod,
    latency,
    messages,
    typingUsers,
    currentRoom,
    currentUser,
    joinRoom,
    sendMessage,
    sendTyping,
    reactMessage,
    login,
    logout,
  } = useSocket();

  // Màn 1: Chưa đăng nhập -> Toàn màn hình Đăng Nhập (~1280x800)
  if (!currentUser) {
    return <LoginModal onLogin={login} />;
  }

  // Màn 2: Đã đăng nhập -> Toàn màn hình Phòng Chat (~1440x900)
  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-[#F5F0E6] text-[#15130F] font-sans antialiased">
      {/* Thanh bên ~292px */}
      <SidebarRooms
        currentRoom={currentRoom}
        onSelectRoom={joinRoom}
        currentUser={currentUser}
        onLogout={logout}
        connectedPod={connectedPod}
      />

      {/* Vùng chính chiếm phần còn lại */}
      <ChatWindow
        currentRoom={currentRoom}
        messages={messages}
        typingUsers={typingUsers}
        currentUser={currentUser}
        onSendMessage={sendMessage}
        onSendTyping={sendTyping}
        onReactMessage={reactMessage}
        isConnected={isConnected}
        latency={latency}
      />
    </div>
  );
};

export default App;
