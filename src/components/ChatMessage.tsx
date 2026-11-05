import React from 'react';
import { cn } from '../lib/utils';
import { Check, CheckCheck, Clock, Ban, Pin, FileText, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface MessageProps {
  message: any;
  isOwn: boolean;
  isDark: boolean;
  activeRoom: any;
  decrypt: (c: string, r: string) => Promise<string>;
}

const ChatMessage: React.FC<MessageProps> = React.memo(({ message, isOwn, isDark, activeRoom, decrypt }) => {
  const [decryptedText, setDecryptedText] = React.useState<string>('');

  React.useEffect(() => {
    if (message.text) {
      decrypt(message.text, activeRoom.id).then(setDecryptedText);
    }
  }, [message.text, activeRoom.id, decrypt]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex w-full mb-2 group",
        isOwn ? "justify-end" : "justify-start"
      )}
    >
      <div className={cn(
        "max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm relative",
        isOwn 
          ? "bg-[var(--accent-primary)] text-white rounded-br-none" 
          : "bg-[var(--bg-card)] text-[var(--text-main)] rounded-bl-none border border-[var(--border-main)]"
      )}>
        {message.replyTo && (
          <div className={cn(
            "mb-2 p-2 rounded-xl text-[11px] border-l-4",
            isOwn 
              ? "bg-black/10 border-white/30 text-white/80" 
              : "bg-[var(--bg-app)] border-[var(--accent-primary)] text-[var(--text-muted)]"
          )}>
            <p className="font-bold mb-0.5">{message.replyTo.senderName}</p>
            <p className="truncate italic opacity-80">{message.replyTo.text}</p>
          </div>
        )}
        
        {message.attachmentUrl && (
          <div className="mb-2">
            {message.attachmentType === 'image' ? (
              <ImageIcon size={40} className="mx-auto" />
            ) : (
              <FileText size={40} className="mx-auto" />
            )}
          </div>
        )}

        <p className={cn("whitespace-pre-wrap", message.isDeleted && "italic opacity-50")}>
          {message.isDeleted ? (
            <span className="flex items-center gap-1">
              <Ban size={12} /> Pesan telah dihapus
            </span>
          ) : decryptedText}
        </p>
        
        <div className={cn(
          "flex items-center justify-end gap-1 mt-1 text-[10px]",
          isOwn ? "text-white/70" : "text-[var(--text-muted)]"
        )}>
          {message.isEdited && !message.isDeleted && <span className="font-bold uppercase tracking-tighter mr-1">Diedit</span>}
          {message.isPinned && <Pin size={10} className={isOwn ? "text-white" : "text-amber-500"} />}
          <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {isOwn && (
            <span>
              {message.status === 'sent' && <Clock size={10} />}
              {message.status === 'delivered' && <Check size={10} />}
              {message.status === 'read' && <CheckCheck size={10} className="text-emerald-300" />}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
});

export default ChatMessage;
