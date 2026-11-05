import React, { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, Users, FileText, Map as MapIcon, LayoutDashboard, 
  Menu, X, Calendar, Book, MessageCircle, 
  GraduationCap, FileCheck, Database, ShieldCheck, LogOut, Settings,
  Compass, Search, Bell, Sun, Moon, Trophy, Activity, BookOpenText, BookOpen,
  ChevronDown, LifeBuoy, Heart, QrCode, HardDrive, Image as ImageIcon, Sparkles
} from 'lucide-react';
import { useFirebase } from '../FirebaseProvider';
import { useTheme } from '../ThemeProvider';
import { auth, db } from '../../firebase';
import { collection, query, onSnapshot, orderBy, where, getDocs, writeBatch, Timestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../utils/firebaseUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Notifications } from '../Notifications';
import { GlobalSearch } from '../GlobalSearch';
import { Logo } from '../Logo';
import OnboardingTour from '../OnboardingTour';
import { CORE_RULES_SECTIONS } from '../../constants/coreRules';
import { NetworkSyncStatus } from '../NetworkSyncStatus';
import { GlobalQRScannerModal } from '../GlobalQRScannerModal';

interface NavSubItem {
  name: string;
  icon: React.ElementType;
  path: string;
  color?: string;
  external?: boolean;
  roles?: string[];
}

interface NavItem {
  name: string;
  icon: React.ElementType;
  path: string;
  color?: string;
  roles?: string[];
  external?: boolean;
  subItems?: NavSubItem[];
}

export default function AppLayout() {
  const { user, userData, loading, role } = useFirebase();
  const { setTheme, resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isGlobalQRScannerOpen, setIsGlobalQRScannerOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  useEffect(() => {
    const checkSync = async () => {
      try {
        const { syncQueue } = await import('../../services/syncQueue');
        const q = await syncQueue.getQueue();
        setPendingSyncCount(q.length);
      } catch (err) {
        console.warn('Sync check failed:', err);
      }
    };
    const interval = setInterval(checkSync, 10000);
    checkSync();
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && role) {
      const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, (snapshot) => {
        const notifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
        const filtered = notifs.filter(n => 
          (n.targetRole === 'all' || n.targetRole === role || n.targetUserId === user.uid) && !n.read
        );
        setUnreadCount(filtered.length);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'notifications', auth);
      });
      return () => unsub();
    }
  }, [user, role]);

  // Scheduled Content Worker (Client-Side for Admins)
  useEffect(() => {
    if (user && role === 'admin') {
      const interval = setInterval(async () => {
        try {
          const now = new Date().toISOString();
          const firestoreNow = Timestamp.now();
          
          // 1. Scheduled Chats
          const chatsRef = collection(db, 'chats');
          const chatQ = query(chatsRef, where('status', '==', 'scheduled'), where('scheduledAt', '<=', now));
          const chatSnapshot = await getDocs(chatQ);
          if (!chatSnapshot.empty) {
            console.log(`Processing ${chatSnapshot.size} scheduled messages...`);
            const batch = writeBatch(db);
            chatSnapshot.forEach(doc => {
              batch.update(doc.ref, {
                status: 'sent',
                createdAt: now,
                scheduledAt: null
              });
            });
            await batch.commit();
          }

          // 2. Scheduled Posts
          const postsRef = collection(db, 'internal_posts');
          const postQ = query(postsRef, where('status', '==', 'scheduled'), where('scheduledAt', '<=', firestoreNow));
          const postSnapshot = await getDocs(postQ);
          if (!postSnapshot.empty) {
            console.log(`Processing ${postSnapshot.size} scheduled posts...`);
            const batch = writeBatch(db);
            postSnapshot.forEach(doc => {
              batch.update(doc.ref, {
                status: 'published',
                createdAt: firestoreNow,
                scheduledAt: null
              });
            });
            await batch.commit();
          }

          // 3. Scheduled Stories
          const storiesRef = collection(db, 'stories');
          const storyQ = query(storiesRef, where('status', '==', 'scheduled'), where('scheduledAt', '<=', firestoreNow));
          const storySnapshot = await getDocs(storyQ);
          if (!storySnapshot.empty) {
            console.log(`Processing ${storySnapshot.size} scheduled stories...`);
            const batch = writeBatch(db);
            storySnapshot.forEach(doc => {
              batch.update(doc.ref, {
                status: 'published',
                createdAt: firestoreNow,
                scheduledAt: null
              });
            });
            await batch.commit();
          }

          // 4. Cleanup Expired Stories (Older than 24h)
          const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const expiredStoriesQ = query(
            storiesRef, 
            where('status', '==', 'published'), 
            where('createdAt', '<', Timestamp.fromDate(twentyFourHoursAgo))
          );
          const expiredSnapshot = await getDocs(expiredStoriesQ);
          if (!expiredSnapshot.empty) {
            console.log(`Cleaning up ${expiredSnapshot.size} expired stories...`);
            const batch = writeBatch(db);
            expiredSnapshot.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
          }
        } catch (error) {
          console.error('Scheduled Content Worker Error:', error);
        }
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [user, role]);

  // Local Notification Scheduler Checker
  useEffect(() => {
    if (user && userData?.notificationPreferences?.scheduledReminders) {
      const interval = setInterval(() => {
        const now = new Date();
        const reminders = userData.notificationPreferences.scheduledReminders as any[];
        
        reminders.forEach(reminder => {
          const reminderDate = new Date(reminder.date);
          const diff = reminderDate.getTime() - now.getTime();
          
          // Trigger if within 1 minute of scheduled time
          if (diff > 0 && diff < 60000) {
            if (Notification.permission === 'granted') {
              new Notification(`PENGINGAT: ${reminder.title}`, {
                body: `Agenda ${reminder.type === 'deadline' ? 'Deadline Administrasi' : 'Visitasi'} sudah tiba!`,
                icon: '/favicon.ico'
              });
            }
          }
        });
      }, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user, userData]);

  if (loading) return (
    <div className={cn("min-h-screen flex items-center justify-center bg-[var(--bg-app)]")}>
      <div className="w-10 h-10 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;

  const toggleMenu = (name: string) => {
    setExpandedMenus(prev => prev.includes(name) ? [] : [name]);
  };

  const isParentActive = (item: NavItem) => {
    if (isActive(item.path)) return true;
    return item.subItems?.some(sub => isActive(sub.path));
  };

  const isCoreRules = location.pathname === '/core-rules';

  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: { name: string; path: string; icon: any }[] = [{ name: 'Home', path: '/', icon: Home }];
    
    let currentPath = '';
    paths.forEach((path) => {
      currentPath += `/${path}`;
      let name = (path || '').charAt(0).toUpperCase() + (path || '').slice(1).replace(/-/g, ' ');
      
      if (path === 'core-rules') name = 'Tata Aturan CORE';
      if (path === 'media' || path === 'penyimpanan-media' || path === 'galeri-media') name = 'Penyimpanan Media';
      if (path === 'database-pimpinan') name = 'Database Pimpinan';
      if (path === 'admin') name = 'Admin';
      if (path === 'pk') name = 'Master PK';
      if (path === 'pk-management') name = 'Manajemen PK';
      if (path === 'layanan') name = 'Layanan';
      if (path === 'administrasi') name = 'Administrasi';
      if (path === 'manajemen') name = 'Manajemen';
      
      breadcrumbs.push({ name, path: currentPath, icon: null });
    });
    
    return breadcrumbs;
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    const mainContent = document.getElementById('main-content');
    if (element && mainContent) {
      mainContent.scrollTo({
        top: element.offsetTop - 100,
        behavior: 'smooth'
      });
      setIsSideNavOpen(false);
    }
  };

  const ALL_ROLES = ['admin', 'developer', 'PC', 'PAC', 'PK', 'Pengurus', 'Anggota', 'user'];
  const MANAGEMENT_ROLES = ['admin', 'developer', 'PC', 'PAC', 'PK'];
  const ADMIN_ROLES = ['admin', 'developer'];

  const sideNavItems: NavItem[] = [
    { 
      name: 'Layanan & Ibadah', 
      icon: Book, 
      path: '/layanan', 
      color: 'text-[var(--accent-primary)]', 
      roles: ALL_ROLES,
      subItems: [
        { name: 'Al-Quran', icon: BookOpen, path: '/alquran', color: 'text-[var(--accent-primary)]' },
        { name: 'Amaliah', icon: Book, path: '/amaliah', color: 'text-teal-400' },
        { name: 'Perpustakaan Digital', icon: Search, path: '/perpustakaan', color: 'text-blue-400' },
        { name: 'Kaderisasi', icon: GraduationCap, path: '/kaderisasi', color: 'text-violet-400' },
        { name: 'Beasiswa', icon: FileCheck, path: '/beasiswa', color: 'text-yellow-400' }
      ] as NavSubItem[]
    },
    { 
      name: 'Administrasi', 
      icon: FileText, 
      path: '/administrasi', 
      color: 'text-orange-400', 
      roles: MANAGEMENT_ROLES,
      subItems: [
        { name: 'Agenda', icon: Calendar, path: '/agenda', color: 'text-orange-400' },
        { name: 'Presensi QR', icon: QrCode, path: '/presensi', color: 'text-emerald-400' },
        { name: 'Template Surat', icon: FileText, path: '/templates', color: 'text-pink-400' },
        { name: 'Surat Masuk', icon: FileText, path: '/surat-masuk', color: 'text-indigo-400' },
        { name: 'Surat Keluar', icon: FileText, path: '/surat-keluar', color: 'text-rose-400' },
      ] as NavSubItem[]
    },
    { 
      name: 'Manajemen & Core', 
      icon: LayoutDashboard, 
      path: '/manajemen', 
      color: 'text-[var(--accent-primary)]', 
      roles: MANAGEMENT_ROLES,
      subItems: [
        { name: 'Modul CORE', icon: LayoutDashboard, path: '/core', color: 'text-[var(--accent-primary)]' },
        { name: 'Tata Aturan CORE', icon: BookOpenText, path: '/core-rules', color: 'text-[var(--accent-primary)]' },
        { name: 'Leaderboard CORE', icon: Trophy, path: '/leaderboard', color: 'text-amber-400' },
        { name: 'Database Pimpinan', icon: BookOpen, path: '/database-pimpinan', color: 'text-[var(--accent-primary)]' },
        { name: 'Admin & Hak Akses', icon: ShieldCheck, path: '/admin/users', color: 'text-red-400', roles: ADMIN_ROLES },
      ] as NavSubItem[]
    },
  ].filter(item => !item.roles || item.roles.includes(role || 'user'))
   .map(item => ({
     ...item,
     subItems: item.subItems?.filter(sub => !sub.roles || sub.roles.includes(role || 'user'))
   }));

  const bottomNavItems: NavItem[] = [
    { name: 'Beranda', icon: Home, path: '/', color: 'text-[var(--accent-primary)]', roles: ALL_ROLES },
    { name: 'Anggota', icon: Users, path: '/anggota', color: 'text-blue-400', roles: ALL_ROLES },
    { name: 'Master PK', icon: Database, path: '/master-pk', color: 'text-teal-400', roles: ALL_ROLES },
    { name: 'Visitasi', icon: Compass, path: '/visitasi', color: 'text-amber-400', roles: MANAGEMENT_ROLES },
    { name: 'Peta', icon: MapIcon, path: '/maps', color: 'text-rose-400', roles: ALL_ROLES },
    { name: 'Laporan', icon: LayoutDashboard, path: '/laporan', color: 'text-pink-400', roles: MANAGEMENT_ROLES },
  ].filter(item => !item.roles || item.roles.includes(role || 'user'));

  return (
    <div className={cn(
      "min-h-screen flex overflow-hidden transition-colors duration-500 relative bg-[var(--bg-app)] text-[var(--text-main)]"
    )}>
      {resolvedTheme === 'dark' && (
        <div className="fixed bottom-0 left-0 right-0 h-[50vh] bg-gradient-to-tr from-[var(--bg-primary)]/20 via-[var(--bg-primary)]/5 to-transparent -skew-y-6 transform origin-bottom-left pointer-events-none z-0" />
      )}

      {/* Desktop Persistent Sidebar */}
      <aside className={cn(
        "hidden lg:flex flex-col w-72 p-8 shadow-2xl z-50 border-r transition-all duration-500 backdrop-blur-2xl relative bg-[var(--bg-sidebar)] border-[var(--border-main)]"
      )}>
        <div className="flex items-center gap-4 mb-6 p-2 rounded-3xl bg-[var(--bg-app)] border border-[var(--border-main)] shadow-sm" id="tour-logo">
          <Logo size={56} className="shrink-0" />
          <div className="flex flex-col">
            <h1 className={cn(
              "text-xl font-black tracking-tighter leading-none transition-colors",
              resolvedTheme === 'dark' ? "text-white" : "text-[var(--bg-primary)]"
            )}>CARUBAN</h1>
            <span className="text-[8.5px] font-black text-[var(--accent-primary)] tracking-[0.1em] uppercase">PC IPNU & IPPNU Cirebon</span>
          </div>
        </div>

        {/* Quick QR Scanner Button in Desktop Sidebar */}
        <button
          onClick={() => setIsGlobalQRScannerOpen(true)}
          className="w-full flex items-center justify-between p-3.5 mb-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-900/30 hover:brightness-105 active:scale-98 transition-all group cursor-pointer border border-emerald-400/30"
          title="Pindai QR Absensi & Akses Cepat Fitur"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <QrCode size={19} className="text-white group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs uppercase tracking-wider">Pindai QR</span>
                <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[9px] font-black">1-Klik</span>
              </div>
              <p className="text-[10px] text-emerald-100 font-medium line-clamp-1">Absensi & Akses Cepat</p>
            </div>
          </div>
          <Sparkles size={16} className="text-emerald-200 shrink-0" />
        </button>

        <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-2 -mx-2 px-2" id="tour-sidebar">
          {isCoreRules && (
            <div className="mb-8">
              <h3 className="px-4 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-4">Daftar Isi</h3>
              <div className="space-y-1">
                {CORE_RULES_SECTIONS.map((section) => (
                  <button
                    key={`desktop-toc-${section.id}`}
                    onClick={() => scrollToSection(section.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-2xl transition-all group border border-transparent",
                      "text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10"
                    )}
                  >
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--bg-app)] group-hover:bg-[var(--accent-primary)]/10 transition-colors">
                      <section.icon size={16} className={cn("transition-colors", section.color)} />
                    </div>
                    <span className="font-bold text-sm tracking-tight truncate">{section.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            <h3 className="px-4 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-4">Main Menu</h3>
            <div className="space-y-1">
              {[...bottomNavItems, ...sideNavItems].map((item) => {
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isExpanded = expandedMenus.includes(item.name);
                const active = isParentActive(item);

                return (
                  <div key={`desktop-${item.name}`} className="flex flex-col">
                    <div
                      id={`tour-nav-${item.path.replace(/\//g, '-').replace(/^-/, '') || 'home'}`}
                      onClick={(e) => {
                        if (hasSubItems) {
                          e.preventDefault();
                          toggleMenu(item.name);
                        } else {
                          navigate(item.path);
                        }
                      }}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-2xl transition-all group border relative overflow-hidden cursor-pointer",
                        active 
                          ? (resolvedTheme === 'dark' ? "bg-[var(--bg-card)] text-white border-[var(--border-main)] shadow-lg" : "bg-[var(--accent-primary)]/10 text-[var(--bg-primary)] border-[var(--accent-primary)]/20 shadow-sm")
                          : "text-[var(--text-muted)] border-transparent hover:bg-[var(--bg-app)] hover:text-[var(--bg-primary)]"
                      )}
                    >
                      <div className="flex items-center gap-3 relative z-10 flex-1 min-w-0">
                        <div className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0",
                          active ? (resolvedTheme === 'dark' ? "bg-[var(--bg-app)]" : "bg-white shadow-sm") : "bg-transparent"
                        )}>
                          <item.icon size={18} className={cn(
                            "transition-transform group-active:scale-90",
                            active ? (item.color || "text-[var(--bg-primary)]") : "text-[var(--text-muted)] group-hover:text-[var(--bg-primary)]"
                          )} />
                        </div>
                        <span className="font-bold text-sm tracking-tight">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2 relative z-10">
                        {hasSubItems && (
                          <ChevronDown 
                            size={14} 
                            className={cn("transition-transform duration-300", isExpanded && "rotate-180")} 
                          />
                        )}
                        {active && (
                          <motion.div 
                            layoutId="active-dot-desktop"
                            className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] shadow-[0_0_15px_var(--accent-primary)]" 
                          />
                        )}
                      </div>
                      {active && (
                        <motion.div 
                          layoutId="active-indicator-desktop" 
                          className="absolute inset-0 bg-[var(--accent-primary)]/5 z-0"
                          transition={{ type: 'spring', bounce: 0.3, duration: 0.6 }}
                        />
                      )}
                    </div>
                    
                    <AnimatePresence>
                      {isExpanded && hasSubItems && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden ml-2 mt-1 space-y-1 border-l-2 border-[var(--accent-primary)]/20 pl-3"
                        >
                          {item.subItems?.map((subItem) => (
                            subItem.external ? (
                              <a
                                key={`desktop-sub-${subItem.name}`}
                                href={subItem.path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  "flex items-center gap-3 p-2.5 rounded-xl transition-all group border border-transparent",
                                  "text-[var(--text-muted)] hover:text-[var(--bg-primary)] hover:bg-[var(--accent-primary)]/10"
                                )}
                              >
                                <subItem.icon size={14} className="shrink-0" />
                                <span className="font-bold text-xs tracking-tight">{subItem.name}</span>
                              </a>
                            ) : (
                              <Link
                                key={`desktop-sub-${subItem.name}`}
                                to={subItem.path}
                                className={cn(
                                  "flex items-center gap-3 p-2.5 rounded-xl transition-all group border border-transparent",
                                  isActive(subItem.path)
                                    ? (resolvedTheme === 'dark' ? "bg-[var(--bg-app)] text-white border-[var(--border-main)] shadow-sm" : "bg-[var(--accent-primary)]/10 text-[var(--bg-primary)] border-[var(--accent-primary)]/20")
                                    : "text-[var(--text-muted)] hover:text-[var(--bg-primary)] hover:bg-[var(--accent-primary)]/10"
                                )}
                              >
                                <subItem.icon size={14} className="shrink-0" />
                                <span className="font-bold text-xs tracking-tight">{subItem.name}</span>
                              </Link>
                            )
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-[var(--border-main)] transition-colors">
          <div className="flex items-center gap-4 p-4 mb-4 rounded-3xl border border-[var(--border-main)] bg-[var(--bg-app)] transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--bg-primary)]">
              <ShieldCheck size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Role & Poin Skill</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--text-main)]">
                  {role === 'admin' ? 'Admin' : 
                   role === 'developer' ? 'Developer' :
                   role === 'PC' ? 'PC (Pimpinan Cabang)' : 
                   role === 'PAC' ? 'PAC (Pimpinan Anak Cabang)' :
                   role === 'PK' ? 'PK (Pimpinan Komisariat)' : 
                   role === 'PR' ? 'PR (Pimpinan Ranting)' :
                   role === 'Pengurus' ? 'Pengurus' : 
                   role === 'Anggota' ? 'Anggota' : 
                   'User / Tamu'}
                </span>
                <span className="w-1 h-1 rounded-full bg-zinc-300" />
                <span className="px-2 py-0.5 bg-[var(--bg-primary)] text-white text-[10px] font-black rounded-lg shadow-lg shadow-[var(--accent-primary)]/20">
                  {userData?.poinSkill || 0} Poin Skill
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <button 
              onClick={() => navigate('/pengaturan')}
              className="flex items-center gap-4 p-4 w-full rounded-2xl text-[var(--text-muted)] hover:bg-[var(--bg-app)] hover:text-[var(--bg-primary)] transition-all group"
            >
              <Settings size={20} className="group-hover:rotate-90 transition-transform duration-500" />
              <span className="font-black text-sm uppercase tracking-widest">Pengaturan</span>
            </button>
            <button 
              onClick={() => auth.signOut()}
              className="flex items-center gap-4 p-4 w-full rounded-2xl text-rose-500 hover:bg-rose-50 transition-all group"
            >
              <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
              <span className="font-black text-sm uppercase tracking-widest">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <div className={cn(
        "flex-1 flex flex-col relative min-h-screen min-w-0 transition-colors duration-500 bg-transparent"
      )}>
        <OnboardingTour />
        
        {/* Header */}
        <header className={cn(
          "sticky top-0 backdrop-blur-xl border-b p-4 flex justify-between items-center z-40 transition-colors duration-500 bg-[var(--bg-header)] border-[var(--border-main)]"
        )}>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSideNavOpen(true)}
              className={cn(
                "lg:hidden p-2.5 rounded-2xl transition-all active:scale-90 border bg-[var(--bg-app)] border-[var(--border-main)]"
              )}
            >
              <Menu size={20} className="text-[var(--bg-primary)]" />
            </button>

            <div className="flex flex-col hidden sm:flex ml-2">
              <div className="flex items-center gap-2">
                <Logo size={32} className="shrink-0" />
                <h1 className={cn(
                  "text-lg font-black tracking-tighter leading-none transition-colors",
                  resolvedTheme === 'dark' ? "text-white" : "text-[var(--bg-primary)]"
                )}>CARUBAN</h1>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] font-black text-[var(--accent-primary)] tracking-[0.1em] uppercase">PC IPNU & IPPNU Kab. Cirebon</span>
                <span className="px-2 py-0.5 bg-[var(--bg-primary)] text-white text-[9px] font-black rounded-full shadow-lg shadow-[var(--accent-primary)]/20">
                  {userData?.poinSkill || 0} Poin Skill
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 max-w-xl px-4 hidden md:block" id="tour-search">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-2">
            <NetworkSyncStatus />

            <button
              onClick={() => setIsGlobalQRScannerOpen(true)}
              className="p-2.5 rounded-2xl border transition-all active:scale-90 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/30 flex items-center gap-1.5"
              title="Pindai QR Code Absensi & Akses Cepat"
            >
              <QrCode size={18} />
              <span className="text-xs font-black hidden xl:inline">Scan QR</span>
            </button>

            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className={cn(
                "p-2.5 rounded-2xl border transition-all active:scale-90 bg-[var(--bg-app)] text-[var(--text-muted)] border-[var(--border-main)]",
              )}
              title="Toggle Theme"
            >
              {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button 
              id="tour-notifications"
              onClick={() => setIsNotificationsOpen(true)}
              className={cn(
              "px-3 py-2.5 rounded-2xl relative border transition-all flex items-center gap-2 bg-[var(--bg-app)] text-[var(--text-muted)] border-[var(--border-main)]"
            )}>
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-[var(--bg-primary)] text-white text-[10px] font-black rounded-lg shadow-lg shadow-[var(--accent-primary)]/20">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            <Link to="/profile" id="tour-profile" className="p-1 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--bg-primary)] rounded-2xl shadow-lg shadow-[var(--accent-primary)]/20">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="User" className="w-9 h-9 rounded-xl object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-xs font-bold text-[var(--bg-primary)]">
                  {user?.email?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
            </Link>
          </div>
        </header>

        {/* Mobile Search Bar */}
        <div className="md:hidden p-4 border-b border-[var(--border-main)]">
          <GlobalSearch />
        </div>

        {/* Notifications Modal */}
        <Notifications isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {isSideNavOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSideNavOpen(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 lg:hidden"
              />
              
              <motion.div 
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className={cn(
                  "fixed top-0 left-0 bottom-0 w-[85%] max-w-[320px] border-r z-[60] p-8 flex flex-col shadow-2xl lg:hidden transition-colors backdrop-blur-xl bg-[var(--bg-sidebar)] border-[var(--border-main)]"
                )}
              >
                <div className="flex justify-between items-center mb-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-[0.3em] mb-1">Navigation</span>
                    <h2 className="text-2xl font-black tracking-tighter text-[var(--text-main)]">EXPLORE</h2>
                  </div>
                  <button 
                    onClick={() => setIsSideNavOpen(false)}
                    className="p-2 rounded-xl border active:scale-90 transition-all bg-[var(--bg-app)] text-[var(--text-muted)] border-[var(--border-main)]"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2 -mx-2 px-2">
                  {/* Quick QR Scanner Button in Mobile Drawer */}
                  <button
                    onClick={() => {
                      setIsSideNavOpen(false);
                      setIsGlobalQRScannerOpen(true);
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md active:scale-98 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                        <QrCode size={18} className="text-white" />
                      </div>
                      <div className="text-left">
                        <span className="font-black text-xs uppercase tracking-wider block">Pindai QR</span>
                        <span className="text-[10px] text-emerald-100">Scan Absensi & Fitur Cepat</span>
                      </div>
                    </div>
                    <Sparkles size={14} className="text-emerald-200" />
                  </button>

                  <div className="space-y-1">
                    {[...bottomNavItems, ...sideNavItems].map((item) => {
                      const hasSubItems = item.subItems && item.subItems.length > 0;
                      const isExpanded = expandedMenus.includes(item.name);
                      const active = isParentActive(item);

                      return (
                        <div key={`mobile-side-${item.name}`} className="flex flex-col">
                          <div
                            onClick={(e) => {
                              if (hasSubItems) {
                                e.preventDefault();
                                toggleMenu(item.name);
                              } else {
                                setIsSideNavOpen(false);
                                navigate(item.path);
                              }
                            }}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-xl transition-all group border relative overflow-hidden cursor-pointer",
                              active 
                                ? (resolvedTheme === 'dark' ? "bg-[var(--bg-card)] text-white border-[var(--border-main)] shadow-lg" : "bg-[var(--accent-primary)]/10 text-[var(--bg-primary)] border-[var(--accent-primary)]/20 shadow-sm")
                                : "text-[var(--text-muted)] border-transparent hover:bg-[var(--bg-app)] hover:text-[var(--bg-primary)]"
                            )}
                          >
                            <div className="flex items-center gap-3 relative z-10 flex-1 min-w-0">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0",
                                active ? (resolvedTheme === 'dark' ? "bg-[var(--bg-app)]" : "bg-white shadow-sm") : "bg-transparent"
                              )}>
                                <item.icon size={18} className={cn(
                                  "transition-transform group-active:scale-90",
                                  active ? (item.color || "text-[var(--bg-primary)]") : "text-[var(--text-muted)] group-hover:text-[var(--bg-primary)]"
                                )} />
                              </div>
                              <span className="font-bold text-xs tracking-tight">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-2 relative z-10">
                              {hasSubItems && (
                                <ChevronDown 
                                  size={14} 
                                  className={cn("transition-transform duration-300", isExpanded && "rotate-180")} 
                                />
                              )}
                              {active && (
                                <motion.div 
                                  layoutId="active-dot-mobile"
                                  className="w-1 h-1 rounded-full bg-[var(--accent-primary)] shadow-[0_0_10px_var(--accent-primary)]" 
                                />
                              )}
                            </div>
                          </div>
                          
                          <AnimatePresence>
                            {isExpanded && hasSubItems && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden ml-2 mt-1 space-y-1 border-l-2 border-[var(--accent-primary)]/20 pl-3"
                              >
                                {item.subItems?.map((subItem) => (
                                  <Link
                                    key={`mobile-side-sub-${subItem.name}`}
                                    to={subItem.path}
                                    onClick={() => setIsSideNavOpen(false)}
                                    className={cn(
                                      "flex items-center gap-3 p-2.5 rounded-xl transition-all group border border-transparent",
                                      isActive(subItem.path)
                                        ? (resolvedTheme === 'dark' ? "bg-[var(--bg-app)] text-white border-[var(--border-main)]" : "bg-[var(--accent-primary)]/10 text-[var(--bg-primary)] border-[var(--accent-primary)]/20")
                                        : "text-[var(--text-muted)] hover:text-[var(--bg-primary)] hover:bg-[var(--accent-primary)]/10"
                                    )}
                                  >
                                    <subItem.icon size={14} className="shrink-0" />
                                    <span className="font-bold text-[10px] tracking-tight">{subItem.name}</span>
                                  </Link>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-[var(--border-main)] transition-colors">
                  <button 
                    onClick={() => auth.signOut()}
                    className="flex items-center gap-3 p-3 w-full rounded-xl text-rose-500 hover:bg-rose-50 transition-all group"
                  >
                    <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
                    <span className="font-black text-xs uppercase tracking-widest">Logout</span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main id="main-content" className="flex-1 overflow-y-auto scroll-smooth min-w-0">
          <div className={cn(
            "mx-auto w-full p-4 lg:p-8 pb-40 lg:pb-12 min-w-0",
            isCoreRules ? "max-w-6xl" : "max-w-7xl"
          )}>
            <nav className="mb-6 flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-1">
              {getBreadcrumbs().map((crumb, index) => (
                <React.Fragment key={crumb.path}>
                  {index > 0 && (
                    <span className="text-[var(--text-muted)] text-[10px] font-black">/</span>
                  )}
                  <Link 
                    to={crumb.path}
                    className={cn(
                      "flex items-center gap-1.5 whitespace-nowrap transition-all",
                      index === getBreadcrumbs().length - 1 
                        ? "text-[var(--bg-primary)] font-black text-[10px] uppercase tracking-widest" 
                        : "text-[var(--text-muted)] hover:text-[var(--accent-primary)] font-bold text-[10px] uppercase tracking-widest"
                    )}
                  >
                    {crumb.icon && <crumb.icon size={12} />}
                    {crumb.name}
                  </Link>
                </React.Fragment>
              ))}
            </nav>

            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                transition={{ 
                  type: 'spring',
                  damping: 25,
                  stiffness: 200,
                  duration: 0.4
                }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
            <div className="h-20 lg:hidden" />
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className={cn(
          "lg:hidden fixed bottom-0 left-0 right-0 backdrop-blur-2xl border-t flex justify-around items-center p-2 pb-safe z-40 transition-colors duration-500 bg-[var(--bg-header)] border-[var(--border-main)]"
        )}>
          {bottomNavItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button 
                key={`mobile-bottom-${item.path}`}
                onClick={() => navigate(item.path)}
                className={cn(
                  "relative flex-1 flex flex-col items-center gap-0.5 transition-all duration-300 py-1.5 px-1 rounded-xl min-w-0",
                  active ? "text-[var(--bg-primary)]" : "text-[var(--text-muted)] hover:text-[var(--accent-primary)]"
                )}
              >
                {active && (
                  <motion.div 
                    layoutId="bottomNavMorp"
                    className="absolute inset-0 bg-[var(--accent-primary)]/10 rounded-xl z-0"
                    transition={{ type: 'spring', bounce: 0.4, duration: 0.6 }}
                  />
                )}
                <div className="relative z-10 flex flex-col items-center">
                  <item.icon size={20} strokeWidth={active ? 2.5 : 2} className={cn(
                    "transition-transform",
                    active ? "scale-105" : "scale-100"
                  )} />
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-tighter transition-all",
                    active ? "opacity-100 mt-0.5" : "opacity-60"
                  )}>
                    {item.name}
                  </span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>
      {/* Theme Toggle FAB */}
      <button
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        className="fixed bottom-24 right-6 lg:bottom-10 lg:right-10 z-[60] w-14 h-14 rounded-full bg-[var(--bg-card)] border border-[var(--border-main)] shadow-2xl flex items-center justify-center text-[var(--accent-primary)] hover:scale-110 active:scale-95 transition-all group"
      >
        <div className="absolute inset-0 rounded-full bg-[var(--accent-primary)]/5 group-hover:bg-[var(--accent-primary)]/10 transition-colors" />
        {resolvedTheme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
      </button>

      {/* Global Quick QR Scanner Modal */}
      <GlobalQRScannerModal
        isOpen={isGlobalQRScannerOpen}
        onClose={() => setIsGlobalQRScannerOpen(false)}
      />
    </div>
  );
}
