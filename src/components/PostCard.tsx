import React, { useState, useRef, useEffect, memo } from 'react';
import { 
  Heart, MessageCircle, Share2, MoreHorizontal, 
  X, Trash2, Edit2, Check, Play, ChevronRight, Clock, Music,
  ArrowBigUp, ArrowBigDown, Flag, Tag, Star, Bookmark
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { useToast } from './Toast';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { ConfirmDialog } from './ConfirmDialog';

interface PostCardProps {
  post: any;
  onLike: () => void | Promise<void>;
  onComment: (text: string) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  onEdit: (newContent: string) => void | Promise<void>;
  onFavorite: () => void | Promise<void>;
  onUpdateCategory?: (category: string) => void | Promise<void>;
  currentUser: any;
  isDark: boolean;
}

const PostCardComponent: React.FC<PostCardProps> = ({ 
  post, onLike, onComment, onDelete, onEdit, onFavorite, onUpdateCategory, currentUser, isDark 
}) => {
  const { showToast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(post.content);
  const [showOptions, setShowOptions] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReportConfirm, setShowReportConfirm] = useState(false);
  const [showCategorySelect, setShowCategorySelect] = useState(false);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const lastTap = useRef(0);
  const commentsRef = useRef<HTMLDivElement>(null);

  const CATEGORIES = ['Informasi', 'Kegiatan', 'Diskusi', 'Lainnya'];

  useEffect(() => {
    setIsLiked(post.likes?.includes(currentUser?.uid));
    setIsFavorite(post.favorites?.includes(currentUser?.uid));
  }, [post.likes, post.favorites, currentUser?.uid]);

  const handleTap = async () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!isLiked) {
        try {
          await onLike();
          setShowHeart(true);
          setTimeout(() => setShowHeart(false), 1000);
        } catch (error) {
          console.error('Like error:', error);
        }
      }
    }
    lastTap.current = now;
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: `Postingan dari ${post.authorName}`,
        text: post.content,
        url: window.location.href
      });
    } catch (err) {
      showToast('Berhasil menyalin tautan', 'info');
      try {
        if (document.hasFocus()) {
          await navigator.clipboard.writeText(window.location.href);
        } else {
          console.warn('Document not focused, cannot write to clipboard');
        }
      } catch (clipboardErr) {
        console.error('Clipboard error:', clipboardErr);
      }
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: id });
    } catch (e) {
      return 'Baru saja';
    }
  };

  const TRUNCATE_LIMIT = 150;
  const isLongContent = (post.content || '').length > TRUNCATE_LIMIT;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      layout
      className={cn(
        "anti-gravity mb-6 overflow-hidden transition-all duration-500",
        "bg-[var(--bg-card)] border-[var(--border-main)]"
      )}
    >
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex gap-4">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white overflow-hidden border shadow-lg",
              "bg-[var(--accent-primary)] border-[var(--border-main)]"
            )}>
              {post.authorPhoto && post.authorPhoto !== "" ? (
                <img src={post.authorPhoto} alt={post.authorName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                post.authorName?.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className={cn(
                  "font-black text-sm tracking-tight",
                  isDark ? "text-white" : "text-emerald-950"
                )}>{post.authorName}</h4>
                {post.isVerified && <div className="w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center shadow-sm"><Check size={10} className="text-white" /></div>}
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mt-1">
                <Clock size={10} className="text-emerald-500" />
                {post.status === 'scheduled' ? (
                  <span className="text-amber-500 flex items-center gap-1">
                    Terjadwal: {new Date(post.scheduledAt?.toDate?.() || post.scheduledAt).toLocaleString()}
                  </span>
                ) : (
                  formatTime(post.createdAt)
                )}
                {post.category && (
                  <>
                    <span className="opacity-30">•</span>
                    <span className="text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">{post.category}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setShowOptions(!showOptions)}
              className="p-2 hover:bg-zinc-500/10 rounded-full transition text-zinc-500"
            >
              <MoreHorizontal size={18} />
            </button>
            
            <AnimatePresence>
              {showOptions && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowOptions(false)} />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className={cn(
                      "absolute right-0 top-10 w-48 rounded-2xl border shadow-2xl z-20 overflow-hidden backdrop-blur-xl",
                      "bg-[var(--bg-card)] border-[var(--border-main)]"
                    )}
                  >
                    {currentUser?.uid === post.authorUid ? (
                      <>
                        <button 
                          onClick={() => { setIsEditing(true); setShowOptions(false); }}
                          className="w-full px-4 py-3 text-left text-xs font-bold flex items-center gap-3 hover:bg-zinc-500/10 transition"
                        >
                          <Edit2 size={14} /> Edit Postingan
                        </button>
                        {onUpdateCategory && (
                          <button 
                            onClick={() => { setShowCategorySelect(true); setShowOptions(false); }}
                            className="w-full px-4 py-3 text-left text-xs font-bold flex items-center gap-3 hover:bg-zinc-500/10 transition"
                          >
                            <Tag size={14} /> Pilih Kategori
                          </button>
                        )}
                        <button 
                          onClick={() => { 
                            showToast('Disimpan ke koleksi', 'success');
                            setShowOptions(false); 
                          }}
                          className="w-full px-4 py-3 text-left text-xs font-bold flex items-center gap-3 hover:bg-zinc-500/10 transition"
                        >
                          <Bookmark size={14} /> Simpan ke Koleksi
                        </button>
                        {post.status === 'scheduled' && (
                          <button 
                            onClick={() => { onDelete(); setShowOptions(false); }}
                            className="w-full px-4 py-3 text-left text-xs font-bold text-amber-500 flex items-center gap-3 hover:bg-amber-500/10 transition"
                          >
                            <Clock size={14} /> Batalkan Jadwal
                          </button>
                        )}
                        <button 
                          onClick={() => { setShowDeleteConfirm(true); setShowOptions(false); }}
                          className="w-full px-4 py-3 text-left text-xs font-bold text-rose-500 flex items-center gap-3 hover:bg-rose-500/10 transition"
                        >
                          <Trash2 size={14} /> Hapus Postingan
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => { 
                            showToast('Disimpan ke koleksi', 'success');
                            setShowOptions(false); 
                          }}
                          className="w-full px-4 py-3 text-left text-xs font-bold flex items-center gap-3 hover:bg-zinc-500/10 transition"
                        >
                          <Bookmark size={14} /> Simpan ke Koleksi
                        </button>
                        <button 
                          onClick={() => { setShowReportConfirm(true); setShowOptions(false); }}
                          className="w-full px-4 py-3 text-left text-xs font-bold flex items-center gap-3 hover:bg-zinc-500/10 transition"
                        >
                          <Flag size={14} /> Laporkan
                        </button>
                      </>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {isEditing ? (
            <div className="space-y-3">
              <textarea 
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className={cn(
                  "w-full bg-white/40 border rounded-3xl p-4 text-sm sm:text-base outline-none focus:border-emerald-400 transition-all min-h-[120px] shadow-inner",
                  isDark ? "text-white border-zinc-800 bg-zinc-900/40" : "text-emerald-950 border-emerald-100/50"
                )}
              />
              <div className="flex justify-end gap-2">
                <button 
                  onClick={() => setIsEditing(false)}
                  className={cn(
                    "px-5 py-2.5 text-xs font-black rounded-2xl transition-all border",
                    isDark ? "text-zinc-400 border-zinc-800 hover:bg-zinc-800" : "text-emerald-600 border-emerald-100/50 hover:bg-emerald-50"
                  )}
                >
                  Batal
                </button>
                <button 
                  onClick={async () => {
                    try {
                      await onEdit(editValue);
                      setIsEditing(false);
                    } catch (error) {
                      console.error('Edit error:', error);
                    }
                  }}
                  className="px-5 py-2.5 text-xs font-black bg-emerald-600 text-white rounded-2xl hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20 border border-emerald-500"
                >
                  Simpan
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className={cn(
                "text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-medium",
                isDark ? "text-zinc-200" : "text-emerald-900"
              )}>
                {isExpanded ? post.content : (post.content || '').slice(0, TRUNCATE_LIMIT)}
                {isLongContent && !isExpanded && (
                  <button 
                    onClick={() => setIsExpanded(true)}
                    className="text-emerald-600 font-black ml-1 hover:underline"
                  >
                    ... selengkapnya
                  </button>
                )}
              </p>
              
              {/* YouTube / Vimeo Embed */}
              {(() => {
                const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
                const vimeoRegex = /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:[a-zA-Z0-9_\-]+)?/i;
                const ytMatch = (post.content || '').match(youtubeRegex);
                if (ytMatch && ytMatch[1]) {
                  return (
                    <div className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-lg border border-emerald-100/50 dark:border-zinc-800 mt-4">
                      <iframe
                        src={`https://www.youtube.com/embed/${ytMatch[1]}`}
                        className="absolute top-0 left-0 w-full h-full"
                        allowFullScreen
                        title="YouTube Video"
                      />
                    </div>
                  );
                }
                const vimeoMatch = (post.content || '').match(vimeoRegex);
                if (vimeoMatch && vimeoMatch[1]) {
                  return (
                    <div className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-lg border border-emerald-100/50 dark:border-zinc-800 mt-4">
                      <iframe
                        src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
                        className="absolute top-0 left-0 w-full h-full"
                        allowFullScreen
                        title="Vimeo Video"
                      />
                    </div>
                  );
                }
                return null;
              })()}
            </>
          )}

          {post.mediaUrl && (
            <div 
              className={cn(
                "relative rounded-3xl overflow-hidden border group cursor-pointer w-full shadow-lg",
                isDark ? "border-zinc-800 bg-zinc-900" : "border-emerald-100/50 bg-white/40"
              )}
              onClick={handleTap}
            >
              {post.mediaType === 'video' ? (
                <div className="relative w-full flex items-center justify-center bg-black">
                  {post.mediaUrl && post.mediaUrl !== "" && (
                    <video 
                      src={post.mediaUrl} 
                      className="w-full h-auto max-h-[500px] object-contain"
                      controls
                      playsInline
                    />
                  )}
                </div>
              ) : post.mediaType === 'audio' ? (
                <div className={cn(
                  "p-6 sm:p-10 flex flex-col items-center gap-6 backdrop-blur-md w-full",
                  isDark ? "bg-zinc-900/50" : "bg-emerald-50/30"
                )}>
                  <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 animate-pulse shadow-inner border border-emerald-500/20">
                    <Music size={36} />
                  </div>
                  <div className="w-full">
                    {post.mediaUrl && post.mediaUrl !== "" && (
                      <audio 
                        src={post.mediaUrl} 
                        controls
                        className="w-full h-12 accent-emerald-600"
                      />
                    )}
                  </div>
                  <p className="text-[10px] sm:text-[12px] font-black text-emerald-600 uppercase tracking-[0.3em]">Audio Post</p>
                </div>
              ) : (
                post.mediaUrl && post.mediaUrl !== "" && (
                  <div className="relative w-full flex items-center justify-center overflow-hidden">
                    <img 
                      src={post.mediaUrl} 
                      alt="Post media" 
                      className="w-full h-auto max-h-[600px] object-contain transition-transform duration-700 group-hover:scale-[1.05]"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/error/800/600';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                )
              )}

              {post.music && (
                <div className="flex items-center gap-2 p-3 bg-zinc-800/50 rounded-lg text-white text-xs mt-2">
                  <Music size={16} className="text-emerald-400" />
                  <div className="flex flex-col">
                    <span className="font-bold">{post.music.title}</span>
                    <span className="text-zinc-400">{post.music.artist}</span>
                  </div>
                </div>
              )}
              
              <AnimatePresence>
                {showHeart && (
                  <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1.5, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                  >
                    <Heart size={80} fill="#10b981" className="text-emerald-500 drop-shadow-2xl" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Total Likes Label */}
        <div className="px-1 mt-2">
          <p className={cn(
            "text-[10px] font-black uppercase tracking-widest",
            isDark ? "text-zinc-500" : "text-zinc-400"
          )}>
            Total Likes: <span className="text-emerald-500">{post.likes?.length || 0}</span>
          </p>
        </div>

        {/* Actions */}
        <div className={cn(
          "flex flex-wrap items-center gap-2 sm:gap-4 mt-6 pt-4 border-t",
          isDark ? "border-zinc-800/50" : "border-emerald-100/30"
        )}>
          <button 
            onClick={onFavorite}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all duration-300 group border shadow-sm",
              isFavorite 
                ? "text-amber-500 bg-amber-500/10 border-amber-500/20" 
                : isDark 
                  ? "text-zinc-500 bg-zinc-900/60 border-zinc-800 hover:text-amber-500" 
                  : "bg-white/60 border-emerald-100/50 text-emerald-600 hover:text-amber-500 hover:bg-amber-50"
            )}
          >
            <Star size={20} fill={isFavorite ? "currentColor" : "none"} className="group-hover:scale-110 transition-transform" />
          </button>

          <button 
            onClick={async () => {
              try {
                const wasLiked = isLiked;
                await onLike();
                if (!wasLiked) {
                  setShowLikeAnimation(true);
                  setTimeout(() => setShowLikeAnimation(false), 800);
                }
              } catch (error) {
                console.error('Like error:', error);
              }
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all duration-300 group border shadow-sm relative",
              isLiked 
                ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" 
                : isDark 
                  ? "text-zinc-500 bg-zinc-900/60 border-zinc-800 hover:text-emerald-500" 
                  : "bg-white/60 border-emerald-100/50 text-emerald-600 hover:text-emerald-500 hover:bg-emerald-50"
            )}
          >
            <Heart size={20} fill={isLiked ? "currentColor" : "none"} className="group-hover:scale-110 transition-transform" />
            <span className="text-xs font-black">{post.likes?.length || 0}</span>
            
            <AnimatePresence>
              {showLikeAnimation && (
                <motion.div
                  initial={{ scale: 0, opacity: 0, y: 0 }}
                  animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 0], y: -30 }}
                  exit={{ opacity: 0 }}
                  className="absolute -top-6 left-1/2 -translate-x-1/2 pointer-events-none"
                >
                  <Heart size={24} fill="#10b981" className="text-emerald-500 drop-shadow-lg" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>

          <button 
            onClick={() => {
              const newValue = !showComments;
              setShowComments(newValue);
              if (newValue) {
                setTimeout(() => {
                  commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all duration-300 group border shadow-sm",
              showComments 
                ? "text-blue-500 bg-blue-500/10 border-blue-500/20" 
                : isDark 
                  ? "text-zinc-500 bg-zinc-900/60 border-zinc-800 hover:text-blue-500" 
                  : "bg-white/60 border-emerald-100/50 text-emerald-600 hover:text-blue-500 hover:bg-blue-50"
            )}
          >
            <MessageCircle size={20} className="group-hover:scale-110 transition-transform" />
            <span className="text-xs font-black">{post.comments?.length || 0}</span>
          </button>

          <div className="flex-1"></div>

          <button 
            onClick={handleShare}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all duration-300 group border shadow-sm",
              isDark 
                ? "text-zinc-500 bg-zinc-900/60 border-zinc-800 hover:text-purple-500" 
                : "bg-white/60 border-emerald-100/50 text-emerald-600 hover:text-purple-500 hover:bg-purple-50"
            )}
          >
            <Share2 size={20} className="group-hover:scale-110 transition-transform" />
            <span className="text-xs font-black hidden sm:inline">Share</span>
          </button>
        </div>

        {/* Comments Section */}
        <div ref={commentsRef} className={cn(
          "mt-6 pt-6 border-t space-y-6",
          isDark ? "border-zinc-800/50" : "border-emerald-100/30"
        )}>
          <div className="flex items-center justify-between">
            <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">Komentar ({post.comments?.length || 0})</h5>
            {post.comments?.length > 0 && (
              <button 
                onClick={() => setShowComments(!showComments)}
                className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 hover:underline"
              >
                {showComments ? 'Sembunyikan' : `Lihat Komentar (${post.comments.length})`}
              </button>
            )}
          </div>

          <div className="space-y-6">
            {showComments && (post.comments || []).map((comment: any, idx: number) => (
              <motion.div 
                key={idx} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex gap-4 group"
              >
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black text-white shrink-0 overflow-hidden border shadow-sm",
                  isDark ? "bg-zinc-800 border-zinc-700" : "bg-emerald-600 border-emerald-500/20"
                )}>
                  {comment.userPhoto && comment.userPhoto !== "" ? (
                    <img src={comment.userPhoto} alt={comment.userName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    comment.userName?.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1">
                  <div className={cn(
                    "rounded-3xl px-5 py-3 inline-block max-w-full border shadow-sm",
                    "bg-[var(--bg-card)] border-[var(--border-main)]"
                  )}>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1">{comment.userName}</p>
                    <p className={cn(
                      "text-sm leading-relaxed font-medium",
                      isDark ? "text-zinc-300" : "text-emerald-950"
                    )}>{comment.text}</p>
                  </div>
                  <p className="text-[9px] font-black text-zinc-500 mt-2 ml-3 uppercase tracking-[0.2em] opacity-60">
                    {formatTime(comment.createdAt)}
                  </p>
                </div>
              </motion.div>
            ))}

            <div className="flex gap-4 pt-2">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-xs font-black text-white shrink-0 overflow-hidden border border-emerald-500/20 shadow-lg shadow-emerald-500/20">
                {currentUser?.photoURL && currentUser.photoURL !== "" ? (
                  <img src={currentUser.photoURL} alt="Me" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  currentUser?.email?.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 relative">
                <input 
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && commentText.trim()) {
                      try {
                        await onComment(commentText);
                        setCommentText('');
                      } catch (error) {
                        console.error('Comment error:', error);
                      }
                    }
                  }}
                  placeholder="Tulis komentar..."
                  className={cn(
                    "w-full border rounded-2xl px-5 py-3 text-sm outline-none focus:border-emerald-400 transition-all pr-12 shadow-inner font-medium",
                    "bg-[var(--bg-app)] text-[var(--text-main)] border-[var(--border-main)]"
                  )}
                />
                <button 
                  onClick={async () => {
                    if (commentText.trim()) {
                      try {
                        await onComment(commentText);
                        setCommentText('');
                      } catch (error) {
                        console.error('Comment error:', error);
                      }
                    }
                  }}
                  disabled={!commentText.trim()}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600 disabled:opacity-30 transition-all hover:scale-110 active:scale-90"
                >
                  <Check size={20} className="font-black" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog 
        isOpen={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          try {
            await onDelete();
            setShowDeleteConfirm(false);
          } catch (error) {
            console.error('Delete error:', error);
          }
        }}
        title="Hapus Postingan"
        message="Apakah Anda yakin ingin menghapus postingan ini? Tindakan ini tidak dapat dibatalkan."
      />

      <ConfirmDialog 
        isOpen={showReportConfirm}
        onCancel={() => setShowReportConfirm(false)}
        onConfirm={() => {
          showToast('Postingan berhasil dilaporkan', 'success');
          setShowReportConfirm(false);
        }}
        title="Laporkan Postingan"
        message="Apakah Anda yakin ingin melaporkan postingan ini? Tim kami akan meninjaunya."
      />

      <AnimatePresence>
        {showCategorySelect && (
          <>
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setShowCategorySelect(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm rounded-3xl p-6 z-50 shadow-2xl",
                isDark ? "bg-zinc-900 border border-zinc-800" : "bg-white border border-zinc-100"
              )}
            >
              <h3 className={cn(
                "text-lg font-black mb-4",
                isDark ? "text-white" : "text-zinc-900"
              )}>Pilih Kategori</h3>
              
              <div className="space-y-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={async () => {
                      if (onUpdateCategory) {
                        await onUpdateCategory(cat);
                        setShowCategorySelect(false);
                      }
                    }}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all",
                      post.category === cat 
                        ? "bg-emerald-500 text-white" 
                        : isDark ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-slate-50 text-zinc-700 hover:bg-slate-100"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              
              <button 
                onClick={() => setShowCategorySelect(false)}
                className="mt-6 w-full py-3 rounded-xl text-sm font-bold text-zinc-500 hover:bg-zinc-500/10 transition-all"
              >
                Batal
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const PostCard = memo(PostCardComponent);
