import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import imageCompression from 'browser-image-compression';

/**
 * Uploads a media file via the server API (Cloudinary) with Firebase Storage fallback.
 * @param onProgress Optional callback to report upload progress (0-100)
 */
export async function uploadMedia(
  file: File | Blob, 
  path: string, 
  userId: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  let fileToUpload = file;
  
  if (file.type.startsWith('image/') && file.type !== 'image/gif') {
    try {
      const options = {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      };
      if (file instanceof File) {
        fileToUpload = await imageCompression(file, options);
      }
    } catch (error) {
      console.warn('Image compression failed, uploading original:', error);
    }
  }

  return new Promise((resolve, reject) => {
    const formData = new FormData();
    const filename = file instanceof File ? file.name : `upload_${Date.now()}.bin`;
    formData.append('file', fileToUpload, filename);

    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (onProgress) onProgress(100);
          resolve(response.url);
        } catch (e) {
          console.warn('Invalid response from server:', xhr.responseText);
          reject(new Error('Invalid response from server'));
        }
      } else {
        console.warn(`Server upload failed with status ${xhr.status}, response: ${xhr.responseText}`);
        reject(new Error(`Server upload failed: ${xhr.responseText || xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => {
      console.warn('Server upload failed (network error)');
      reject(new Error('Network error during upload'));
    });

    xhr.open('POST', '/api/media/upload');
    xhr.send(formData);
  });
}
