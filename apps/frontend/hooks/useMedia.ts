
import { useState } from 'react';
import { storage } from '../firebase';

export const useMedia = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadFile = async (file: Blob | File, path: string): Promise<string> => {
    setIsUploading(true);
    setUploadProgress(0);

    return new Promise((resolve, reject) => {
      const storageRef = storage.ref().child(path);
      const uploadTask = storageRef.put(file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error("Erro no upload:", error);
          setIsUploading(false);
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
            setIsUploading(false);
            resolve(downloadURL);
          } catch (err) {
            setIsUploading(false);
            reject(err);
          }
        }
      );
    });
  };

  return {
    uploadFile,
    isUploading,
    uploadProgress
  };
};
