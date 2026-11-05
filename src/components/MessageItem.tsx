import React from 'react';
import { cn } from '../lib/utils';
import { Ban, Pin, Clock, Check, CheckCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const MessageItem = React.memo(({ msg, isMe, decrypt, activeRoom, handlePinMessage, handleArchiveMessage, handleDeleteForMe, handleDeleteForEveryone, setEditingMessage, setInput, inputRef, addToast, handleReaction }: any) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex w-full mb-2 group",
        isMe ? "justify-end" : "justify-start"
      )}
    >
      <div className={cn(
        "max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm relative",
        isMe 
          ? "bg-[var(--accent-primary)] text-white rounded-br-none" 
          : "bg-[var(--bg-card)] text-[var(--text-main)] rounded-bl-none border border-[var(--border-main)]"
      )}>
        {/* Reply Preview */}
        {msg.replyTo && (
          <div className={cn(
            "mb-2 p-2 rounded-xl text-[11px] border-l-4 opacity-80",
            isMe 
              ? "bg-white/10 border-white/30 text-white" 
              : "bg-[var(--bg-app)] border-[var(--accent-primary)] text-[var(--text-muted)]"
          )}>
            <p className="font-bold mb-0.5">{msg.replyTo.senderName}</p>
            <p className="truncate italic">{msg.replyTo.text}</p>
          </div>
        )}

        <p className={cn("whitespace-pre-wrap", msg.isDeleted && "italic opacity-50")}>
          {msg.isDeleted ? (
            <span className="flex items-center gap-1">
              <Ban size={12} /> Pesan telah dihapus
            </span>
          ) : msg.text}
        </p>
        
        {/* Reactions */}
        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(msg.reactions).map(([emoji, userIds]: any) => (
              <button
                key={emoji}
                onClick={() => handleReaction(msg.id, emoji)}
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full border transition-all hover:scale-110",
                  isMe ? "bg-white/20 border-white/30" : "bg-[var(--bg-app)] border-[var(--border-main)]"
                )}
              >
                {emoji} {userIds.length}
              </button>
            ))}
          </div>
        )}

        <div className={cn(
          "flex items-center justify-end gap-1 mt-1 text-[10px]",
          isMe ? "text-white/70" : "text-[var(--text-muted)]"
        )}>
          {msg.isEdited && !msg.isDeleted && <span className="font-bold uppercase tracking-tighter mr-1">Diedit</span>}
          {msg.isPinned && <Pin size={10} className={isMe ? "text-white" : "text-amber-500"} />}
          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {isMe && (
            <span>
              {msg.status === 'sent' && <Clock size={10} />}
              {msg.status === 'delivered' && <Check size={10} />}
              {msg.status === 'read' && <CheckCheck size={10} className="text-emerald-300" />}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
});

export default MessageItem;
