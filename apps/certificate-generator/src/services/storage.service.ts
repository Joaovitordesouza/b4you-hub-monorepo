import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

export class StorageService {
  private bucketName = "b4you-hub.firebasestorage.app";

  constructor() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        storageBucket: this.bucketName,
      });
    }
  }

  async uploadCertificate(pdfBuffer: Uint8Array, courseName: string, studentName: string): Promise<string> {
    const bucket = admin.storage().bucket();
    const cleanCourse = courseName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const cleanName = studentName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const fileName = `certificates/${cleanCourse}/${crypto.randomUUID()}_${cleanName}.pdf`;

    const file = bucket.file(fileName);
    const downloadToken = crypto.randomUUID();
    
    await file.save(Buffer.from(pdfBuffer), {
      contentType: 'application/pdf',
      metadata: {
        cacheControl: 'public, max-age=31536000',
        metadata: {
          firebaseStorageDownloadTokens: downloadToken
        }
      }
    });

    // Return the standard Firebase Storage URL with the download token to make it public
    const encodedDestination = encodeURIComponent(fileName);
    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${this.bucketName}/o/${encodedDestination}?alt=media&token=${downloadToken}`;
    
    return downloadUrl;
  }
}
