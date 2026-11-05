import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Firestore, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';
import { messaging } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firebaseUtils';
import { Role } from '../types';

interface FirebaseContextType {
  db: Firestore;
  user: User | null;
  userData: any | null;
  loading: boolean;
  role: Role | null;
}

const FirebaseContext = createContext<FirebaseContextType | null>(null);

export const FirebaseProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    let unsubUser: (() => void) | null = null;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user?.email || 'No user');
      setUser(user);
      
      if (unsubUser) {
        unsubUser();
        unsubUser = null;
      }

      if (user) {
        const checkIsAdmin = (uEmail?: string | null, uDisplayName?: string | null) => {
          if (!uEmail && !uDisplayName) return false;
          const email = (uEmail || '').toLowerCase();
          const name = (uDisplayName || '').toLowerCase();
          return (
            email === 'arsipdepartemenppk@gmail.com' ||
            email === 'arsipdepartemenpendidikan@gmail.com' ||
            email === 'syifaudina15@gmail.com' ||
            email.includes('syifaudin') ||
            name.includes('syifaudin')
          );
        };

        const isUserAdmin = checkIsAdmin(user.email, user.displayName);
        const userDocRef = doc(db, 'users', user.uid);

        unsubUser = onSnapshot(userDocRef, (snapshot) => {
          console.log('User doc snapshot received:', snapshot.exists() ? 'Exists' : 'Not found');
          if (snapshot.exists()) {
            const data = snapshot.data();
            const isAdminByData = isUserAdmin || checkIsAdmin(data.email, data.displayName);
            const finalRole = (isAdminByData ? 'admin' : (data.role || 'user')) as Role;
            
            // Sync admin role back to document if needed
            if (isAdminByData && data.role !== 'admin') {
              setDoc(userDocRef, { role: 'admin' }, { merge: true }).catch(console.error);
            }

            setUserData({ ...data, role: finalRole });
            setRole(finalRole);
          } else if (isUserAdmin) {
            console.log('Ahmad Syifaudin / Admin detected, creating fallback admin user doc.');
            setRole('admin');
            const adminDoc = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || 'Ahmad Syifaudin',
              role: 'admin' as Role,
              poinSkill: 100,
              createdAt: new Date().toISOString()
            };
            setUserData(adminDoc);
            setDoc(userDocRef, adminDoc, { merge: true }).catch(console.error);
          } else if (user.isAnonymous) {
            setRole('user');
            setUserData({ role: 'user', displayName: 'Tamu', isAnonymous: true });
          } else {
            setRole(null);
            setUserData(null);
          }
          setLoading(false);
        }, (error) => {
          console.error('Failed to fetch user data:', error);
          if (isUserAdmin) {
            setRole('admin');
            setUserData({ role: 'admin', displayName: user.displayName || 'Ahmad Syifaudin', poinSkill: 100 });
          }
          setLoading(false);
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`, auth);
        });
      } else {
        setRole(null);
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubUser) unsubUser();
    };
  }, []);

  useEffect(() => {
    if (user) {
      const statusRef = doc(db, 'user_status', user.uid);
      
      const setOnline = async () => {
        try {
          await setDoc(statusRef, {
            isOnline: true,
            lastSeen: new Date().toISOString(),
            email: user.email,
            displayName: user.displayName
          }, { merge: true });
        } catch (error) {
          console.error('Error setting online status:', error);
        }
      };

      const setOffline = async () => {
        if (!auth.currentUser) return;
        
        try {
          await setDoc(statusRef, {
            isOnline: false,
            lastSeen: new Date().toISOString()
          }, { merge: true });
        } catch (error: any) {
          if (error.code === 'permission-denied') return;
          console.error('Error setting offline status:', error);
        }
      };

      setOnline();

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          setOnline();
        } else {
          setOffline();
        }
      };

      window.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('beforeunload', setOffline);

      return () => {
        setOffline();
        window.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', setOffline);
      };
    }
  }, [user]);

  // FCM Token Registration
  useEffect(() => {
    if (user && messaging) {
      const registerFCM = async () => {
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const token = await getToken(messaging, {
              vapidKey: 'BD8T36Y-R9_C6eWvE6k7vV4h3Y7P9x6_6Y4Y9_6Y4Y9_6Y4Y9_6Y4Y9_6Y4Y9_6Y4Y9' // Placeholder, will be used if set up in Firebase Console
            });
            if (token) {
              await setDoc(doc(db, 'users', user.uid), {
                fcmToken: token,
                lastTokenUpdate: new Date().toISOString()
              }, { merge: true });
              console.log('FCM Token registered:', token);

              // Subscribe to management topic if applicable
              const MANAGEMENT_ROLES = ['admin', 'developer', 'PC', 'PAC', 'PK'];
              if (MANAGEMENT_ROLES.includes(role || '')) {
                fetch('/api/notifications/subscribe', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ uid: user.uid, token, topic: 'management' })
                }).catch(err => console.warn('Failed to subscribe to topic:', err));
              }
            }
          }
        } catch (error) {
          console.warn('FCM registration error:', error);
        }
      };

      registerFCM();
    }
  }, [user]);

  return (
    <FirebaseContext.Provider value={{ db, user, userData, loading, role }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context) throw new Error('useFirebase must be used within a FirebaseProvider');
  return context;
};
