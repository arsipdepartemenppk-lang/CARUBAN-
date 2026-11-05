import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirebase } from './FirebaseProvider';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from './ThemeProvider';
import { cn } from '../lib/utils';
import { toJSDate, formatDisplayDate } from '../utils/dateUtils';

interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  targetRole: string;
  targetUserId?: string;
}

export const Notifications: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user, role, userData } = useFirebase();
  const { resolvedTheme } = useTheme();
  const [filter, setFilter] = useState<'all' | 'role' | 'private'>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const prefs = userData?.notificationPreferences || {
    enableAll: true,
    enablePC: true,
    enablePK: true,
    enableUser: true,
    quietHours: false,
    quietStart: '22:00',
    quietEnd: '07:00'
  };

  const isQuietHours = () => {
    if (!prefs.quietHours) return false;
    const now = new Date();
    const currentStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    if (prefs.quietStart <= prefs.quietEnd) {
      return currentStr >= prefs.quietStart && currentStr <= prefs.quietEnd;
    } else {
      return currentStr >= prefs.quietStart || currentStr <= prefs.quietEnd;
    }
  };

  const quietActive = isQuietHours();

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
      setNotifications(notifs);
    });
    return () => unsub();
  }, [user]);

  const getBatchedNotifications = (notifs: Notification[]) => {
    if (notifs.length <= 5) return notifs;

    const grouped: { [key: string]: Notification[] } = {};
    notifs.forEach(n => {
      const date = toJSDate(n.createdAt).toISOString().split('T')[0];
      const key = `${date}_${n.title}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(n);
    });

    const result: any[] = [];
    Object.values(grouped).forEach(group => {
      if (group.length > 2) {
        result.push({
          id: `digest_${group[0].id}`,
          title: `${group[0].title} (Digest)`,
          message: `${group.length} pembaruan terkait ${group[0].title.toLowerCase()}. Klik untuk melihat detail.`,
          createdAt: group[0].createdAt,
          read: group.every(n => n.read),
          isDigest: true,
          items: group
        });
      } else {
        result.push(...group);
      }
    });

    return result.sort((a, b) => toJSDate(b.createdAt).getTime() - toJSDate(a.createdAt).getTime());
  };

  const filteredNotifications = getBatchedNotifications(notifications.filter(n => {
    let isRelevant = false;
    
    if (n.targetRole === 'all' && prefs.enableAll) isRelevant = true;
    if (n.targetRole === 'PC' && prefs.enablePC) isRelevant = true;
    if (n.targetRole === 'PK' && prefs.enablePK) isRelevant = true;
    if (n.targetRole === 'user' && prefs.enableUser) isRelevant = true;
    if (n.targetUserId === user?.uid) isRelevant = true;
    
    if (!isRelevant) return false;
    if (filter === 'role') return n.targetRole === role;
    if (filter === 'private') return n.targetUserId === user?.uid;
    return true;
  }));

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={cn(
              "fixed top-20 right-4 w-80 sm:w-96 rounded-3xl shadow-2xl z-50 overflow-hidden border flex flex-col max-h-[80vh]",
              resolvedTheme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200"
            )}
          >
            <div className={cn(
              "p-4 border-b flex items-center justify-between",
              resolvedTheme === 'dark' ? "border-zinc-800" : "border-zinc-200"
            )}>
              <div className="flex items-center gap-2">
                <Bell size={18} className={resolvedTheme === 'dark' ? "text-zinc-400" : "text-zinc-600"} />
                <h3 className={cn("font-bold", resolvedTheme === 'dark' ? "text-white" : "text-zinc-900")}>Notifikasi</h3>
                {!quietActive && unreadCount > 0 && (
                  <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {unreadCount} Baru
                  </span>
                )}
                {quietActive && (
                  <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Waktu Tenang
                  </span>
                )}
              </div>
              <button onClick={onClose} className={resolvedTheme === 'dark' ? "text-zinc-500 hover:text-white" : "text-zinc-400 hover:text-zinc-900"}>
                <X size={20} />
              </button>
            </div>

            <div className={cn(
              "p-2 border-b flex gap-2",
              resolvedTheme === 'dark' ? "border-zinc-800" : "border-zinc-200"
            )}>
              <button 
                onClick={() => setFilter('all')}
                className={cn(
                  "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  filter === 'all' 
                    ? "bg-emerald-600 text-white" 
                    : (resolvedTheme === 'dark' ? "bg-zinc-900 text-zinc-500 hover:text-zinc-300" : "bg-zinc-100 text-zinc-400 hover:text-zinc-600")
                )}
              >
                Semua
              </button>
              <button 
                onClick={() => setFilter('role')}
                className={cn(
                  "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  filter === 'role' 
                    ? "bg-emerald-600 text-white" 
                    : (resolvedTheme === 'dark' ? "bg-zinc-900 text-zinc-500 hover:text-zinc-300" : "bg-zinc-100 text-zinc-400 hover:text-zinc-600")
                )}
              >
                {role}
              </button>
              <button 
                onClick={() => setFilter('private')}
                className={cn(
                  "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  filter === 'private' 
                    ? "bg-emerald-600 text-white" 
                    : (resolvedTheme === 'dark' ? "bg-zinc-900 text-zinc-500 hover:text-zinc-300" : "bg-zinc-100 text-zinc-400 hover:text-zinc-600")
                )}
              >
                Pribadi
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-2 space-y-2 custom-scrollbar">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center justify-center">
                  <Bell size={32} className={cn("mb-2 opacity-20", resolvedTheme === 'dark' ? "text-white" : "text-zinc-900")} />
                  <p className={cn("text-sm font-medium", resolvedTheme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>Belum ada notifikasi</p>
                </div>
              ) : (
                filteredNotifications.map(notif => (
                  <div 
                    key={notif.id} 
                    className={cn(
                      "p-3 rounded-2xl border transition-all relative group",
                      !notif.read 
                        ? (resolvedTheme === 'dark' ? "bg-zinc-900/80 border-emerald-500/30" : "bg-emerald-50 border-emerald-200") 
                        : (resolvedTheme === 'dark' ? "bg-zinc-900/30 border-zinc-800/50" : "bg-zinc-50 border-zinc-100")
                    )}
                  >
                    {!notif.read && (
                      <div className="absolute top-3 right-3 w-2 h-2 bg-emerald-500 rounded-full" />
                    )}
                    <h4 className={cn("font-bold text-sm pr-6", resolvedTheme === 'dark' ? "text-zinc-200" : "text-zinc-800")}>{notif.title}</h4>
                    <p className={cn("text-xs mt-1 leading-relaxed", resolvedTheme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>{notif.message}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className={cn("text-[10px] uppercase tracking-wider font-medium", resolvedTheme === 'dark' ? "text-zinc-600" : "text-zinc-400")}>
                        {formatDisplayDate(notif.createdAt)}
                      </span>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notif.read && (
                          <button 
                            onClick={() => markAsRead(notif.id)}
                            className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition-colors"
                            title="Tandai sudah dibaca"
                          >
                            <Check size={14} />
                          </button>
                        )}
                        <button 
                          onClick={() => deleteNotification(notif.id)}
                          className="p-1.5 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-colors"
                          title="Hapus notifikasi"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
