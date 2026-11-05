import React from 'react';
import { cn } from '../lib/utils';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div className={cn(
      "animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded-md",
      className
    )} />
  );
};

export const PostSkeleton: React.FC = () => {
  return (
    <div className="p-4 border-b border-zinc-100 dark:border-zinc-900 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="w-24 h-3" />
          <Skeleton className="w-16 h-2" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="w-full h-4" />
        <Skeleton className="w-3/4 h-4" />
      </div>
      <Skeleton className="w-full aspect-video rounded-3xl" />
      <div className="flex gap-6">
        <Skeleton className="w-12 h-4 rounded-full" />
        <Skeleton className="w-12 h-4 rounded-full" />
        <Skeleton className="w-12 h-4 rounded-full" />
      </div>
    </div>
  );
};

export const StorySkeleton: React.FC = () => {
  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <Skeleton className="w-12 h-12 sm:w-16 sm:h-16 rounded-full" />
      <Skeleton className="w-10 h-2" />
    </div>
  );
};

export const VisitasiSkeleton: React.FC = () => {
  return (
    <div className="bg-zinc-900/30 border border-zinc-800 rounded-[40px] p-6 space-y-4 animate-pulse">
      <Skeleton className="w-full aspect-video rounded-3xl" />
      <div className="space-y-2">
        <Skeleton className="w-3/4 h-6" />
        <Skeleton className="w-1/2 h-4" />
      </div>
      <Skeleton className="w-full h-20 rounded-3xl" />
    </div>
  );
};
