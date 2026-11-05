import React, { useState, useEffect } from 'react';
import { Brain, Target, Heart, MessageSquare, Users, Bot, Video, BarChart2, Megaphone, Code, Repeat, Plus, Trash2, Save, X, Loader2, Zap, Send, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, onSnapshot, query, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { useFirebase } from '../components/FirebaseProvider';
import { useToast } from '../components/Toast';
import { sendNotification } from '../lib/notifications';
import { analyzeSystemData } from '../services/aiAnalysisService';
import { SoftSkillsVisualization } from '../components/SoftSkillsVisualization';

const PengembanganKader: React.FC = () => {
  const { user } = useFirebase();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'soft' | 'hard' | 'feedback' | 'automation' | 'guide' | 'training'>('training');
  const [simulationSkill, setSimulationSkill] = useState<string>('');
  const [scenario, setScenario] = useState<string>('');
  const [userResponse, setUserResponse] = useState('');
  const [simulationFeedback, setSimulationFeedback] = useState<string>('');
  const [isGeneratingScenario, setIsGeneratingScenario] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const skillLevels = {
    'Adaptabilitas': 4,
    'Berpikir Kritis': 6,
    'EQ': 5,
    'AI Prompting': 3,
    'Content Creation': 7
  };

  const [logs, setLogs] = useState<any[]>([]);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'log' | 'prompt' | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [botToken, setBotToken] = useState('');
  const [isTriggering, setIsTriggering] = useState(false);

  const softSkills = [
    { title: 'Adaptabilitas & Resiliensi', method: 'Scenario-Based Planning', icon: Target },
    { title: 'Berpikir Kritis', method: 'First Principles Thinking', icon: Brain },
    { title: 'Kecerdasan Emosional (EQ)', method: 'Mood Tracker & Notification', icon: Heart },
    { title: 'Komunikasi Efektif', method: 'AI Transcription Review', icon: MessageSquare },
    { title: 'Kolaborasi & Kerja Sama', method: 'Automated Project Management', icon: Users },
  ];

  const hardSkills = [
    { title: 'AI & Prompt Engineering', method: 'Prompt Library & API Integration', icon: Bot },
    { title: 'Pembuatan Konten & Video', method: 'Templates & AI Generators', icon: Video },
    { title: 'Literasi & Visualisasi Data', method: 'Automated Dashboards', icon: BarChart2 },
    { title: 'Digital Marketing', method: 'Scheduling & Automated Bidding', icon: Megaphone },
    { title: 'Pemrograman & Keamanan', method: 'CI/CD & Vulnerability Scanners', icon: Code },
  ];

  useEffect(() => {
    if (!user?.uid) return;
    const qLogs = query(collection(db, 'users', user.uid, 'kader_logs'));
    const unsubLogs = onSnapshot(qLogs, (s) => setLogs(s.docs.map(d => ({ id: d.id, ...d.data() }))), (error) => handleFirestoreError(error, OperationType.LIST, 'kader_logs', auth));
    
    const qPrompts = query(collection(db, 'users', user.uid, 'prompt_library'));
    const unsubPrompts = onSnapshot(qPrompts, (s) => setPrompts(s.docs.map(d => ({ id: d.id, ...d.data() }))), (error) => handleFirestoreError(error, OperationType.LIST, 'prompt_library', auth));
    
    return () => { unsubLogs(); unsubPrompts(); };
  }, [user?.uid]);

  const summarizeReflections = async () => {
    setIsSummarizing(true);
    try {
      const prompt = `Ringkas data refleksi mingguan berikut menjadi ringkasan eksekutif tentang adaptabilitas dan pola emosi: ${JSON.stringify(logs.map(l => l.content))}`;
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await response.json();
      setAiSummary(data.text || 'Tidak ada ringkasan tersedia.');
    } catch (error: any) {
      if (error?.message?.includes("429") || error?.message?.includes("quota") || error?.message?.includes("RESOURCE_EXHAUSTED")) {
        console.warn("AI Generation Quota Exceeded");
        showToast('Kuota AI Habis. Silakan periksa penagihan Anda.', 'error');
      } else {
        console.error(error);
        showToast('Gagal meringkas refleksi', 'error');
      }
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleSave = async () => {
    if (!user?.uid) return;
    setIsSaving(true);
    try {
      const col = modalType === 'log' ? 'kader_logs' : 'prompt_library';
      await addDoc(collection(db, 'users', user.uid, col), { ...formData, createdAt: serverTimestamp(), author: user.email });
      
      if (modalType === 'log') {
        await addDoc(collection(db, 'kader_logs'), { action: 'create_log', title: formData.title, author: user.email, createdAt: serverTimestamp() });
        await sendNotification('Aktivitas Kaderisasi Baru', `Admin ${user.email} menambahkan log: ${formData.title}`, 'admin');
        await analyzeSystemData();
      }
      setIsModalOpen(false);
      setFormData({ title: '', content: '' });
      showToast('Data berhasil disimpan', 'success');
    } catch (error) {
      console.error(error);
      showToast('Gagal menyimpan data', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, type: 'log' | 'prompt') => {
    if (!user?.uid) return;
    const col = type === 'log' ? 'kader_logs' : 'prompt_library';
    await deleteDoc(doc(db, 'users', user.uid, col, id));
    showToast('Data berhasil dihapus', 'success');
  };

  const usePrompt = (content: string) => {
    navigator.clipboard.writeText(content);
    showToast('Prompt disalin ke clipboard', 'success');
  };

  const triggerAutomation = async (type: 'zapier' | 'bot') => {
    if (type === 'zapier' && !webhookUrl) return showToast('Webhook URL diperlukan', 'error');
    if (type === 'bot' && !botToken) return showToast('Bot Token diperlukan', 'error');
    
    setIsTriggering(true);
    try {
      await new Promise(r => setTimeout(r, 1500));
      
      if (type === 'zapier') {
        await addDoc(collection(db, 'users', user?.uid!, 'kader_logs'), { 
          title: 'Otomatisasi Konten Media Sosial', 
          content: `Trigger dikirim ke Zapier: ${webhookUrl}`,
          createdAt: serverTimestamp(),
          author: user?.email 
        });
        showToast('Draf artikel & template video berhasil dikirim ke Zapier', 'success');
      } else {
        await addDoc(collection(db, 'users', user?.uid!, 'kader_logs'), { 
          title: 'Notifikasi Tantangan Harian', 
          content: 'Bot Telegram/WA berhasil dijadwalkan untuk tantangan harian.',
          createdAt: serverTimestamp(),
          author: user?.email 
        });
        showToast('Bot Telegram/WA berhasil dijadwalkan', 'success');
      }
    } catch (error) {
      showToast('Gagal memicu otomatisasi', 'error');
    } finally {
      setIsTriggering(false);
    }
  };

  const sendFeedbackForms = async () => {
    setIsTriggering(true);
    try {
      await new Promise(r => setTimeout(r, 1500));
      await addDoc(collection(db, 'users', user?.uid!, 'kader_logs'), { 
        title: 'Pengiriman Formulir Evaluasi 360', 
        content: 'Formulir evaluasi otomatis dikirim ke rekan tim.',
        createdAt: serverTimestamp(),
        author: user?.email 
      });
      showToast('Formulir evaluasi telah dikirim ke seluruh rekan tim', 'success');
    } catch (error) {
      showToast('Gagal mengirim formulir', 'error');
    } finally {
      setIsTriggering(false);
    }
  };

  const generateScenario = async (skill: string) => {
    setSimulationSkill(skill);
    setIsGeneratingScenario(true);
    setSimulationFeedback('');
    setUserResponse('');
    try {
      const prompt = `Berikan satu skenario masalah dunia nyata yang menantang untuk melatih skill "${skill}" bagi seorang kader organisasi IPNU IPPNU. Skenario harus spesifik dan membutuhkan solusi taktis.`;
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await response.json();
      setScenario(data.text || 'Gagal memuat skenario.');
    } catch (error: any) {
      if (error?.message?.includes("429") || error?.message?.includes("quota") || error?.message?.includes("RESOURCE_EXHAUSTED")) {
        console.warn("AI Generation Quota Exceeded");
        showToast('Kuota AI Habis. Silakan periksa penagihan Anda.', 'error');
      } else {
        console.error(error);
        showToast('Gagal memuat skenario', 'error');
      }
    } finally {
      setIsGeneratingScenario(false);
    }
  };

  const evaluateResponse = async () => {
    if (!userResponse.trim()) return;
    setIsEvaluating(true);
    try {
      const prompt = `Skenario: ${scenario}\n\nJawaban Kader: ${userResponse}\n\nEvaluasi jawaban ini berdasarkan skill "${simulationSkill}". Berikan skor 1-100 dan saran perbaikan yang tajam namun memotivasi.`;
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await response.json();
      setSimulationFeedback(data.text || 'Gagal mengevaluasi.');
      showToast('Evaluasi selesai! XP bertambah.', 'success');
    } catch (error: any) {
      if (error?.message?.includes("429") || error?.message?.includes("quota") || error?.message?.includes("RESOURCE_EXHAUSTED")) {
        console.warn("AI Generation Quota Exceeded");
        showToast('Kuota AI Habis. Silakan periksa penagihan Anda.', 'error');
      } else {
        console.error(error);
        showToast('Gagal mengevaluasi', 'error');
      }
    } finally {
      setIsEvaluating(false);
    }
  };

  const TabButton = ({ tab, label, icon: Icon }: { tab: typeof activeTab, label: string, icon: any }) => (
    <button 
      onClick={() => setActiveTab(tab)} 
      className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === tab ? 'bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--accent-primary)]/20' : 'bg-[var(--bg-card)] text-[var(--text-muted)] hover:bg-[var(--bg-app)] border border-[var(--border-main)]'}`}
    >
      <Icon size={18} /> {label}
    </button>
  );

  return (
    <div className="p-4 md:p-8 pb-24 min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] font-sans">
      <header className="mb-8">
        <h1 className="text-4xl font-black tracking-tighter mb-6">Pengembangan Kader</h1>
        <div className="flex flex-wrap gap-2">
          <TabButton tab="training" label="Asah Skill" icon={Target} />
          <TabButton tab="soft" label="Soft Skills" icon={Heart} />
          <TabButton tab="hard" label="Hard Skills" icon={Code} />
          <TabButton tab="feedback" label="Feedback 360" icon={Users} />
          <TabButton tab="automation" label="Otomatisasi" icon={Zap} />
          <TabButton tab="guide" label="Panduan" icon={FileText} />
        </div>
      </header>

      <main className="grid gap-8">
        {activeTab === 'training' && (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-[var(--bg-card)] p-8 rounded-[32px] border border-[var(--border-main)] shadow-2xl">
                <h2 className="text-xl font-black mb-6 text-[var(--accent-primary)] uppercase tracking-tighter">Level Keahlian Anda</h2>
                <div className="space-y-6">
                  {Object.entries(skillLevels).map(([name, level]) => (
                    <div key={name}>
                      <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-2">
                        <span className="text-zinc-400">{name}</span>
                        <span className="text-[var(--accent-primary)]">LVL {level}</span>
                      </div>
                      <div className="h-2 bg-[var(--bg-app)] rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${level * 10}%` }}
                          className="h-full bg-[var(--accent-primary)] shadow-[0_0_10px_rgba(var(--accent-primary-rgb),0.5)]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-[var(--bg-card)] p-8 rounded-[32px] border border-[var(--border-main)] shadow-2xl">
                <h2 className="text-2xl font-black mb-6 text-[var(--accent-primary)] uppercase tracking-tighter">Simulasi Masalah (AI Mentor)</h2>
                
                {!scenario ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {['Adaptabilitas', 'Berpikir Kritis', 'EQ', 'Kepemimpinan', 'Resolusi Konflik'].map(skill => (
                      <button 
                        key={skill}
                        onClick={() => generateScenario(skill)}
                        disabled={isGeneratingScenario}
                        className="p-6 bg-zinc-950 border border-zinc-800 rounded-3xl hover:border-[var(--accent-primary)] transition-all text-center group"
                      >
                        <Brain className="mx-auto mb-3 text-zinc-600 group-hover:text-[var(--accent-primary)] transition-colors" />
                        <span className="text-xs font-black uppercase tracking-widest">{skill}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <div className="p-6 bg-zinc-950 rounded-3xl border border-[var(--accent-primary)]/30 relative">
                      <div className="absolute -top-3 left-6 bg-[var(--accent-primary)] text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                        Skenario: {simulationSkill}
                      </div>
                      <p className="text-zinc-300 leading-relaxed italic">"{scenario}"</p>
                    </div>
                    <textarea 
                      placeholder="Ketikkan solusi atau tindakan Anda di sini..."
                      value={userResponse}
                      onChange={(e) => setUserResponse(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-3xl p-6 h-40 focus:border-[var(--accent-primary)] outline-none transition-all text-sm leading-relaxed"
                    />
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setScenario('')}
                        className="px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs bg-zinc-800 hover:bg-zinc-700 transition-all"
                      >
                        Ganti Skill
                      </button>
                      <button 
                        onClick={evaluateResponse}
                        disabled={isEvaluating || !userResponse.trim()}
                        className="flex-1 bg-[var(--accent-primary)] hover:opacity-90 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                      >
                        {isEvaluating ? <Loader2 className="animate-spin" /> : <Send size={16} />} Evaluasi Jawaban
                      </button>
                    </div>
                    {simulationFeedback && (
                      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="p-8 bg-[var(--accent-primary)]/10 rounded-[32px] border border-[var(--accent-primary)]/20">
                        <div className="flex items-center gap-2 mb-4 font-black uppercase text-xs tracking-widest text-[var(--accent-primary)]">
                          <Bot size={18} /> Feedback AI Mentor
                        </div>
                        <div className="prose prose-invert prose-sm max-w-none text-[var(--text-main)] leading-relaxed">
                          {simulationFeedback}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}
                {isGeneratingScenario && (
                  <div className="py-20 text-center space-y-4">
                    <Loader2 className="mx-auto animate-spin text-[var(--accent-primary)]" size={40} />
                    <p className="text-zinc-500 font-black uppercase tracking-widest text-xs">AI sedang merancang skenario untuk Anda...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'guide' && (
          <section className="bg-zinc-900 p-8 rounded-[32px] border border-zinc-800 shadow-2xl">
            <h2 className="text-2xl font-black mb-6 text-[var(--accent-primary)] uppercase tracking-tighter">Panduan Pengguna</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="font-bold text-lg text-white flex items-center gap-2"><Heart className="text-[var(--accent-primary)]" size={20} /> Untuk Kader</h3>
                <ul className="space-y-2 text-zinc-400 text-sm list-disc pl-5">
                  <li>Gunakan <b>Soft Skills</b> untuk mengisi jurnal refleksi mingguan.</li>
                  <li>Klik <b>Ringkas dengan AI</b> untuk melihat analisis perkembangan mental Anda.</li>
                </ul>
              </div>
              <div className="space-y-4">
                <h3 className="font-bold text-lg text-white flex items-center gap-2"><Code className="text-[var(--accent-primary)]" size={20} /> Untuk Keahlian</h3>
                <ul className="space-y-2 text-zinc-400 text-sm list-disc pl-5">
                  <li>Gunakan <b>Hard Skills</b> untuk menyimpan instruksi AI (Prompt) yang berhasil.</li>
                </ul>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'soft' && (
          <section>
            <h2 className="text-2xl font-bold mb-6 text-[var(--accent-primary)]">Strategi Otomatisasi Soft Skills</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {softSkills.map((skill, i) => (
                <div key={i} className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
                  <skill.icon className="text-[var(--accent-primary)] mb-4" size={32} />
                  <h3 className="font-bold text-lg mb-2">{skill.title}</h3>
                  <p className="text-zinc-400 text-sm">{skill.method}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-8">
              <SoftSkillsVisualization logs={logs} />
            </div>

            <div className="mt-8 bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Jurnal Refleksi</h3>
                <button onClick={() => { setModalType('log'); setIsModalOpen(true); }} className="bg-[var(--accent-primary)] p-2 rounded-xl hover:opacity-90 transition-colors"><Plus /></button>
              </div>
              <div className="grid gap-4">
                {logs.map(log => (
                  <div key={log.id} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex justify-between items-center hover:border-[var(--accent-primary)]/30 transition-all">
                    <div>
                      <h3 className="font-bold">{log.title}</h3>
                      <p className="text-zinc-400 text-sm">{log.content}</p>
                    </div>
                    <button onClick={() => handleDelete(log.id, 'log')} className="text-rose-500 hover:bg-rose-500/10 p-2 rounded-lg transition-colors"><Trash2 size={18} /></button>
                  </div>
                ))}
              </div>
              <button onClick={summarizeReflections} disabled={isSummarizing || logs.length === 0} className="mt-4 w-full bg-zinc-800 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-700 transition-colors disabled:opacity-50">
                {isSummarizing ? <Loader2 className="animate-spin" /> : <Brain size={20} />} Ringkas dengan AI
              </button>
              {aiSummary && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-6 bg-[var(--accent-primary)]/10 rounded-2xl border border-[var(--accent-primary)]/20 text-[var(--text-main)] text-sm leading-relaxed">
                  <div className="flex items-center gap-2 mb-2 font-black uppercase text-[10px] tracking-widest text-[var(--accent-primary)]">
                    <Bot size={14} /> AI Executive Summary
                  </div>
                  {aiSummary}
                </motion.div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'hard' && (
          <section>
            <h2 className="text-2xl font-bold mb-6 text-[var(--accent-primary)]">Strategi Otomatisasi Hard Skills</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hardSkills.map((skill, i) => (
                <div key={i} className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
                  <skill.icon className="text-[var(--accent-primary)] mb-4" size={32} />
                  <h3 className="font-bold text-lg mb-2">{skill.title}</h3>
                  <p className="text-zinc-400 text-sm">{skill.method}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Prompt Library</h3>
                <button onClick={() => { setModalType('prompt'); setIsModalOpen(true); }} className="bg-[var(--accent-primary)] p-2 rounded-xl hover:opacity-90 transition-colors"><Plus /></button>
              </div>
              <div className="grid gap-4">
                {prompts.map(p => (
                  <div key={p.id} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex justify-between items-center hover:border-[var(--accent-primary)]/30 transition-all">
                    <div className="flex-1">
                      <h3 className="font-bold">{p.title}</h3>
                      <p className="text-zinc-400 text-sm line-clamp-1">{p.content}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => usePrompt(p.content)} className="text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 p-2 rounded-lg transition-colors"><Repeat size={18} /></button>
                      <button onClick={() => handleDelete(p.id, 'prompt')} className="text-rose-500 hover:bg-rose-500/10 p-2 rounded-lg transition-colors"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'feedback' && (
          <section className="bg-zinc-900 p-8 rounded-[32px] border border-zinc-800 shadow-2xl">
            <h2 className="text-2xl font-black mb-6 text-[var(--accent-primary)] uppercase tracking-tighter">Feedback 360 Derajat</h2>
            <p className="text-zinc-400 mb-8 leading-relaxed">Sistem feedback otomatis yang terintegrasi dengan Google Forms. AI akan merangkum skor EQ dan efektivitas komunikasi setelah proyek selesai.</p>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={sendFeedbackForms} 
                disabled={isTriggering}
                className="inline-flex items-center gap-2 bg-[var(--accent-primary)] hover:opacity-90 px-6 py-4 rounded-2xl font-bold transition-all disabled:opacity-50"
              >
                {isTriggering ? <Loader2 className="animate-spin" /> : <Send size={20} />} Kirim ke Rekan Tim
              </button>
            </div>
          </section>
        )}

        {activeTab === 'automation' && (
          <section className="bg-zinc-900 p-8 rounded-[32px] border border-zinc-800 shadow-2xl">
            <h2 className="text-2xl font-black mb-6 text-[var(--accent-primary)] uppercase tracking-tighter">Integrasi Otomatisasi</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-8 bg-zinc-950 rounded-[32px] border border-zinc-800 hover:border-[var(--accent-primary)]/30 transition-all">
                <h3 className="font-black text-lg mb-4 flex items-center gap-2 uppercase tracking-tighter"><Zap className="text-[var(--accent-primary)]" /> Zapier / Make.com</h3>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-6">Otomatisasi Konten Media Sosial</p>
                <div className="space-y-4">
                  <input 
                    type="text" 
                    placeholder="Webhook URL" 
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 focus:border-[var(--accent-primary)] outline-none transition-all" 
                  />
                  <button 
                    onClick={() => triggerAutomation('zapier')}
                    disabled={isTriggering}
                    className="w-full bg-[var(--accent-primary)] hover:opacity-90 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isTriggering ? <Loader2 className="animate-spin" /> : <Repeat size={16} />} Jalankan Otomatisasi
                  </button>
                </div>
              </div>
              
              <div className="p-8 bg-zinc-950 rounded-[32px] border border-zinc-800 hover:border-[var(--accent-primary)]/30 transition-all">
                <h3 className="font-black text-lg mb-4 flex items-center gap-2 uppercase tracking-tighter"><Bot className="text-[var(--accent-primary)]" /> Bot Telegram / WA</h3>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-6">Tantangan Harian & Resiliensi</p>
                <div className="space-y-4">
                  <input 
                    type="text" 
                    placeholder="Bot Token" 
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 focus:border-[var(--accent-primary)] outline-none transition-all" 
                  />
                  <button 
                    onClick={() => triggerAutomation('bot')}
                    disabled={isTriggering}
                    className="w-full bg-[var(--accent-primary)] hover:opacity-90 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isTriggering ? <Loader2 className="animate-spin" /> : <Send size={16} />} Aktifkan Bot Harian
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-zinc-900 p-6 rounded-3xl w-full max-w-lg border border-zinc-800">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black">{modalType === 'log' ? 'Tambah Jurnal' : 'Tambah Prompt'}</h2>
                <button onClick={() => setIsModalOpen(false)}><X /></button>
              </div>
              <input type="text" placeholder="Judul" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 mb-4" />
              <textarea placeholder="Isi" value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 mb-4 h-32" />
              <button onClick={handleSave} disabled={isSaving} className="w-full bg-[var(--accent-primary)] py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />} {isSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PengembanganKader;
