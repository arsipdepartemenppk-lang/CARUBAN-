import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Download, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from './Toast';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: any[]) => void;
}

export const CSVImportModal: React.FC<CSVImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
      
      if (!['csv', 'xlsx', 'xls'].includes(fileExt || '')) {
        showToast('Format file tidak didukung. Gunakan .csv, .xlsx, atau .xls', 'error');
        return;
      }
      
      setFile(selectedFile);
      parseFilePreview(selectedFile);
    }
  };

  const parseFilePreview = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        setPreviewData((json || []).slice(0, 5));
      } catch (error) {
        console.error('Error parsing file preview:', error);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (!file) {
      showToast('Silakan pilih file terlebih dahulu', 'error');
      return;
    }
    setIsProcessing(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        if (json.length === 0) {
          showToast('File kosong atau tidak valid', 'error');
          setIsProcessing(false);
          return;
        }

        const mappedData = json.map((item: any) => {
          const formatDate = (val: any) => {
            if (!val) return '';
            if (typeof val === 'number') {
              const date = XLSX.SSF.parse_date_code(val);
              const d = new Date(date.y, date.m - 1, date.d);
              return d.toISOString().split('T')[0];
            }
            if (typeof val === 'string') {
              const d = new Date(val);
              if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
            }
            return val;
          };

          return {
            noSurat: String(item.noSurat || item['Nomor Surat'] || item['No Surat'] || ''),
            tglSurat: formatDate(item.tglSurat || item['Tanggal Surat'] || item['Tgl Surat']),
            tglDiterima: formatDate(item.tglDiterima || item['Tanggal Diterima'] || item['Tgl Diterima']) || new Date().toISOString().split('T')[0],
            asalSurat: String(item.asalSurat || item['Asal Surat'] || ''),
            perihal: String(item.perihal || item['Perihal'] || ''),
            disposisi: String(item.disposisi || item['Disposisi'] || ''),
            klasifikasi: item.klasifikasi || item['Klasifikasi'] || 'Biasa',
            tipeSurat: item.tipeSurat || item['Tipe Surat'] || 'Eksternal',
          };
        });

        onImport(mappedData);
        showToast(`${mappedData.length} data berhasil diimpor`, 'success');
        onClose();
      } catch (error) {
        console.error('Import error:', error);
        showToast('Gagal mengimpor file. Pastikan format benar.', 'error');
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      showToast('Gagal membaca file', 'error');
      setIsProcessing(false);
    };

    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const template = [
      {
        'Nomor Surat': '001/A/2024',
        'Tanggal Surat': '2024-01-01',
        'Tanggal Diterima': '2024-01-02',
        'Asal Surat': 'Instansi A',
        'Perihal': 'Undangan Rapat',
        'Disposisi': 'Ketua',
        'Klasifikasi': 'Penting',
        'Tipe Surat': 'Eksternal'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Template_Surat_Masuk.xlsx");
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-zinc-900 border border-zinc-800 p-8 rounded-[32px] w-full max-w-2xl shadow-2xl"
      >
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black tracking-tighter uppercase">Impor Data Surat</h2>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Format: .csv, .xlsx, .xls</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-[24px] p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all",
              file ? "border-purple-500 bg-purple-500/5" : "border-zinc-800 hover:border-zinc-700 bg-zinc-950/50"
            )}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              accept=".csv, .xlsx, .xls" 
              onChange={handleFileChange} 
              className="hidden" 
            />
            {file ? (
              <>
                <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-900/20">
                  <FileText size={32} />
                </div>
                <div className="text-center">
                  <p className="font-black text-white">{file.name}</p>
                  <p className="text-zinc-500 text-xs uppercase tracking-widest mt-1">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-500">
                  <Upload size={32} />
                </div>
                <div className="text-center">
                  <p className="font-black text-zinc-400">Klik atau seret file ke sini</p>
                  <p className="text-zinc-600 text-[10px] uppercase tracking-widest mt-1">Maksimal 10MB</p>
                </div>
              </>
            )}
          </div>

          {previewData.length > 0 && (
            <div className="bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden">
              <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800 flex justify-between items-center">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Pratinjau Data (5 Baris Pertama)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[10px]">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="p-3 font-black text-zinc-500 uppercase">No Surat</th>
                      <th className="p-3 font-black text-zinc-500 uppercase">Asal</th>
                      <th className="p-3 font-black text-zinc-500 uppercase">Perihal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, i) => (
                      <tr key={i} className="border-b border-zinc-900 last:border-0">
                        <td className="p-3 text-zinc-400 truncate max-w-[120px]">{row.noSurat || row['Nomor Surat'] || row['No Surat']}</td>
                        <td className="p-3 text-zinc-400 truncate max-w-[120px]">{row.asalSurat || row['Asal Surat']}</td>
                        <td className="p-3 text-zinc-400 truncate max-w-[150px]">{row.perihal || row['Perihal']}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button 
              onClick={handleImport}
              disabled={!file || isProcessing}
              className={cn(
                "w-full py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                !file || isProcessing 
                  ? "bg-zinc-800 text-zinc-600 cursor-not-allowed" 
                  : "bg-purple-600 text-white shadow-xl shadow-purple-900/20 active:scale-95"
              )}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Memproses...
                </>
              ) : (
                <>
                  <CheckCircle2 size={20} />
                  Mulai Impor
                </>
              )}
            </button>
            <button 
              onClick={downloadTemplate}
              className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-zinc-500 hover:text-white hover:bg-zinc-900 transition-all flex items-center justify-center gap-2 text-[10px]"
            >
              <Download size={14} />
              Unduh Template Excel
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
