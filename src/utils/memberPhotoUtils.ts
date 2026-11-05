/**
 * Utility untuk kompresi dan upload foto profil anggota
 * Mendukung penyimpanan lokal, kompresi client-side hemat memori, dan server API upload.
 */

export interface ProcessedPhotoResult {
  url: string;
  base64: string;
  source: 'server' | 'base64';
}

/**
 * Kompres gambar ke canvas dengan batasan lebar/tinggi maksimal dan kompresi JPEG
 */
export async function compressImage(
  file: File | Blob, 
  maxWidth: number = 600, 
  maxHeight: number = 600, 
  quality: number = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Gagal memuat elemen gambar'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Hitung rasio aspek baru
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(e.target?.result as string);
        }

        // Background putih untuk transparansi PNG agar konsisten di JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Mengonversi Data URL (base64) ke Blob untuk diunggah via FormData
 */
export function dataURLtoBlob(dataurl: string): Blob {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Memproses dan mengunggah foto profil
 * Mengutamakan kompresi ringan dan mencoba upload ke /api/media/upload
 */
export async function processAndUploadMemberPhoto(
  file: File | Blob, 
  memberIdentifier: string = 'member'
): Promise<ProcessedPhotoResult> {
  // 1. Kompres gambar di browser terlebih dahulu
  const compressedBase64 = await compressImage(file, 600, 600, 0.85);

  // 2. Coba upload ke server jika online
  if (navigator.onLine) {
    try {
      const blob = dataURLtoBlob(compressedBase64);
      const formData = new FormData();
      const filename = `foto_${memberIdentifier}_${Date.now()}.jpg`;
      formData.append('file', blob, filename);

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          return {
            url: data.url,
            base64: compressedBase64,
            source: 'server'
          };
        }
      }
    } catch (err) {
      console.warn('Gagal upload ke server /api/media/upload, fallback ke base64 data URL:', err);
    }
  }

  // 3. Fallback ke base64 terkompresi (tetap berfungsi sempurna offline dan di KTA)
  return {
    url: compressedBase64,
    base64: compressedBase64,
    source: 'base64'
  };
}
