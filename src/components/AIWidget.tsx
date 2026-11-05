import React from 'react';
import { Bot } from 'lucide-react';

export function AIWidget() {
  return (
    <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
          <Bot size={24} />
        </div>
        <h3 className="text-lg font-black text-white">AI Assistant</h3>
      </div>
      <p className="text-zinc-400 text-sm">Tanyakan apa saja, saya siap membantu Anda.</p>
    </div>
  );
}

export default AIWidget;
