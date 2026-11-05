import React, { useState, useEffect } from 'react';
import { useFirebase } from '../components/FirebaseProvider';
import { db } from '../firebase';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { Play, Pause } from 'lucide-react';

export default function Stories() {
  const { user } = useFirebase();
  const [stories, setStories] = useState<any[]>([]);
  const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null);
  const [playingStoryId, setPlayingStoryId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'stories'),
      where('status', '==', 'published'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setStories(data);
    });
    return () => {
      unsub();
      if (activeAudio) activeAudio.pause();
    };
  }, []);

  const togglePlay = (story: any) => {
    if (playingStoryId === story.id) {
      activeAudio?.pause();
      setPlayingStoryId(null);
    } else {
      activeAudio?.pause();
      const audio = new Audio(story.musicUrl);
      audio.play();
      setActiveAudio(audio);
      setPlayingStoryId(story.id);
    }
  };

  return (
    <div className="p-6 pb-24 min-h-screen bg-[var(--bg-app)]">
      <h1 className="text-3xl font-black mb-8">Stories</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {stories.map(story => (
          <div key={story.id} className="aspect-[9/16] rounded-3xl overflow-hidden relative shadow-lg group">
            {story.mediaType === 'image' ? (
              <img src={story.mediaUrl} alt="Story" className="w-full h-full object-cover" />
            ) : (
              <video src={story.mediaUrl} className="w-full h-full object-cover" autoPlay muted loop />
            )}
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <p className="text-white font-bold text-sm">{story.authorName}</p>
              {story.musicUrl && (
                <button 
                  onClick={() => togglePlay(story)}
                  className="mt-2 flex items-center gap-2 text-white/80 text-xs bg-white/20 px-2 py-1 rounded-full"
                >
                  {playingStoryId === story.id ? <Pause size={12} /> : <Play size={12} />}
                  <span className="truncate max-w-[80px]">{story.musicTitle}</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
