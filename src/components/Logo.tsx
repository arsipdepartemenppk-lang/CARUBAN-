import React from 'react';
import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className, size = 40 }: LogoProps) {
  return (
    <div 
      className={cn("relative flex items-center justify-center transition-all duration-300", className)}
      style={{ width: size, height: size }}
    >
      <img 
        src="https://res.cloudinary.com/dxsbefd16/image/upload/q_auto/f_auto/v1775730419/Logo_CARUBAN_CORE_dengan_motif_Mega_Mendung-removebg-preview_gszxaq.png"
        alt="Caruban Core Logo"
        className="w-full h-full object-contain"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
