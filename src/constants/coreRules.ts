import { 
  Archive, 
  Search, 
  Award, 
  AlertCircle, 
  Users, 
  History 
} from 'lucide-react';

export const CORE_RULES_SECTIONS = [
  { id: 'pengarsipan', title: 'Pengarsipan Data', icon: Archive, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'audit', title: 'Mekanisme Audit', icon: Search, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { id: 'reward', title: 'Reward & Punishment', icon: Award, color: 'text-amber-500', bg: 'bg-amber-50' },
  { id: 'kendala', title: 'Matriks Kendala', icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-50' },
  { id: 'peran', title: 'Peran & Tanggung Jawab', icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  { id: 'sop', title: 'SOP Tahapan', icon: History, color: 'text-slate-500', bg: 'bg-slate-50' },
];
