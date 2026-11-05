import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from './NotificationProvider';

export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 text-zinc-400 hover:text-white">
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl z-[1000] p-4">
          <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4">Notifikasi</h4>
          {notifications.length === 0 ? (
            <p className="text-xs text-zinc-600">Tidak ada notifikasi baru.</p>
          ) : (
            <div className="space-y-4">
              {notifications.map(n => (
                <div key={n.id} className="text-xs text-zinc-300">
                  <p>{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
