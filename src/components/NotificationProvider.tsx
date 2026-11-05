import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit, updateDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirebase } from './FirebaseProvider';

interface Notification {
  id: string;
  message: string;
  title: string;
  type: 'info' | 'warning' | 'success' | 'error';
  createdAt: any;
  userId?: string;
  read: boolean;
  link?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (data: Omit<Notification, 'id' | 'read' | 'createdAt'>) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useFirebase();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'), 
      orderBy('createdAt', 'desc'), 
      limit(100)
    );
    
    const unsub = onSnapshot(q, (snapshot) => {
      const allNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      const filtered = allNotifications.filter(n => !n.userId || n.userId === 'all' || n.userId === user.uid);
      
      // Notification Batching Logic
      const batched: Notification[] = [];
      const groups: { [key: string]: Notification[] } = {};
      
      filtered.forEach(n => {
        // Group by title (usually the event type) and date (within 1 hour)
        const date = new Date(n.createdAt);
        const groupKey = `${n.title}_${date.getFullYear()}_${date.getMonth()}_${date.getDate()}_${date.getHours()}`;
        
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(n);
      });
      
      Object.values(groups).forEach(group => {
        if (group.length > 3) {
          const first = group[0];
          batched.push({
            ...first,
            id: `batch_${group.map(i => i.id).join('_')}`,
            message: `${group.length} baris data ${first.title.toLowerCase()} baru telah ditambahkan.`,
            isBatch: true,
            originalIds: group.map(i => i.id)
          } as any);
        } else {
          batched.push(...group);
        }
      });
      
      // Sort again by date
      batched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setNotifications(batched);
    });
    return () => unsub();
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      if (id.startsWith('batch_')) {
        const notification = notifications.find(n => n.id === id);
        if (notification && (notification as any).originalIds) {
          const promises = (notification as any).originalIds.map((oid: string) => 
            updateDoc(doc(db, 'notifications', oid), { read: true })
          );
          await Promise.all(promises);
        }
      } else {
        await updateDoc(doc(db, 'notifications', id), { read: true });
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.read);
      const promises = unread.map(n => updateDoc(doc(db, 'notifications', n.id), { read: true }));
      await Promise.all(promises);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const addNotification = async (data: Omit<Notification, 'id' | 'read' | 'createdAt'>) => {
    try {
      await addDoc(collection(db, 'notifications'), {
        ...data,
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error adding notification:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, addNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
};
