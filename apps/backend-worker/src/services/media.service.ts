import * as admin from "firebase-admin";
import * as crypto from "crypto";
import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import { PassThrough } from "stream";
import { InstanceCache } from "../utils/instance-cache";

export class MediaService {
    
    /**
     * Faz upload de um Buffer ou Base64 para o Firebase Storage.
     * [REFATORADO] Agora utiliza Streams internamente para uniformidade.
     */
    static async uploadMedia(
        instanceId: string, 
        data: Buffer | string, 
        mimeType: string, 
        originalFilename?: string
    ): Promise<string> {
        let buffer: Buffer;
        if (typeof data === 'string') {
            buffer = Buffer.from(data, 'base64');
        } else {
            buffer = data;
        }

        // [VALIDATION] Corrigir MIME Type baseado em Magic Bytes
        const validatedMime = this.validateMimeType(buffer, mimeType);
        if (validatedMime !== mimeType) {
            console.warn(`[MediaService] MIME Type corrigido: ${mimeType} -> ${validatedMime}`);
        }

        // Converte Buffer para Stream para usar a lógica otimizada de streamUpload
        const bufferStream = new PassThrough();
        bufferStream.end(buffer);

        return this.streamUpload(instanceId, bufferStream, validatedMime, originalFilename);
    }

    /**
     * Valida e corrige o MIME Type com base nos Magic Bytes do buffer
     */
    private static validateMimeType(buffer: Buffer, originalMime: string): string {
        if (!buffer || buffer.length < 4) return originalMime;

        const hex = buffer.toString('hex', 0, 4).toUpperCase();
        
        // JPEG (FF D8 FF)
        if (hex.startsWith('FFD8FF')) return 'image/jpeg';
        
        // PNG (89 50 4E 47)
        if (hex === '89504E47') return 'image/png';
        
        // GIF (47 49 46 38)
        if (hex === '47494638') return 'image/gif';
        
        // PDF (25 50 44 46)
        if (hex === '25504446') return 'application/pdf';
        
        // OGG (4F 67 67 53)
        if (hex === '4F676753') return 'audio/ogg';

        // MP3 (ID3 or FF FB)
        if (hex.startsWith('494433') || hex.startsWith('FFFB')) return 'audio/mpeg';

        // MP4 / M4A (ftyp)
        // Geralmente bytes 4-8 são 'ftyp', mas o header varia.
        // Simplificação: Se declarou mp4 e não parece outra coisa, confia.

        return originalMime;
    }

    /**
     * Faz upload via Stream (Memória Eficiente).
     * Nota: Streams não podem ser retentadas diretamente sem recriar a fonte.
     */
    static async streamUpload(
        instanceId: string,
        dataStream: any,
        mimeType: string,
        originalFilename?: string
    ): Promise<string> {
        const bucket = admin.storage().bucket();
        const ext = this.getExtensionFromMime(mimeType);
        const hash = crypto.randomBytes(16).toString('hex');
        const filename = originalFilename || `${hash}.${ext}`;
        const destination = `instances/${instanceId}/media/${filename}`;
        const file = bucket.file(destination);

        return new Promise((resolve, reject) => {
            let byteCount = 0;

            const writeStream = file.createWriteStream({
                metadata: { contentType: mimeType },
                public: true, // Torna o arquivo público
                resumable: false // Disable resumable for stability in streams unless large
            });

            // Monitora dados passando pelo stream
            dataStream.on('data', (chunk: any) => {
                byteCount += chunk.length;
            });

            dataStream.pipe(writeStream)
                .on('error', (error: any) => {
                    // Tenta detectar erros de rede no stream
                    if (error.code === 'ECONNRESET') {
                        error.isNetwork = true;
                    }
                    reject(error);
                })
                .on('finish', async () => {
                    // [SAFETY] Verifica se o arquivo não está vazio
                    if (byteCount === 0) {
                        console.error(`[MediaService] Erro: Stream finalizou com 0 bytes. Abortando upload.`);
                        try {
                            await file.delete().catch(() => {}); // Limpa arquivo vazio
                        } catch (e) {}
                        reject(new Error("Empty stream (0 bytes received)"));
                        return;
                    }

                    try {
                        // Tenta usar makePublic para retrocompatibilidade com quem tem regras IAM abertas
                        await file.makePublic().catch(() => {});
                    } catch (err) { }
                    
                    // [CORREÇÃO SRE] Gera a URL padrão do Firebase Storage usando HTTP REST
                    const encodedDestination = encodeURIComponent(destination);
                    const firebaseStorageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedDestination}?alt=media`;
                    resolve(firebaseStorageUrl);
                });
        });
    }

    /**
     * Baixa mídia de uma URL temporária e faz upload para o Storage via Stream.
     * Suporta downloads autenticados via Evolution API.
     */
    static async downloadAndPersist(
        instanceId: string, 
        url: string, 
        mimeType: string,
        retries = 3
    ): Promise<string | null> {
        // [SRE] Se a URL já for do nosso storage, não faz nada
        if (url && url.includes("storage.googleapis.com")) return url;
        
        // [AUTH] Busca credenciais da instância para download autenticado
        let headers: any = { 'Connection': 'keep-alive' };
        try {
            const instanceData = await InstanceCache.get(instanceId);
            if (instanceData?.token) {
                headers['apikey'] = instanceData.token;
            }
        } catch (e) {}

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                // [FIX CRÍTICO CONVERSAO OGG] Mídias de aúdio pequenas sofriam com Empty Stream.
                // OGG será baixado por completo via buffer, garantindo entrega integral para FFmpeg.
                const isOgg = mimeType.includes('audio/ogg') || mimeType.includes('video/ogg') || url.includes('.ogg');
                const responseType = isOgg ? 'arraybuffer' : 'stream';

                const response = await axios.get(url, { 
                    responseType: responseType,
                    timeout: 45000, 
                    headers
                });

                if (isOgg) {
                    const audioBuffer = Buffer.from(response.data);
                    if (audioBuffer.length === 0) {
                        throw new Error("Arquivo OGG retornado como vazio (0 bytes).");
                    }
                    console.log(`[MediaService] Detectado áudio OGG (${audioBuffer.length} bytes). Iniciando conversão para MP3...`);
                    const inputStream = new PassThrough();
                    inputStream.end(audioBuffer);

                    const mp3Stream = this.convertOggToMp3Stream(inputStream);
                    return await this.streamUpload(instanceId, mp3Stream, 'audio/mpeg');
                }

                // Para outras mídias, mantém a eficiência do stream direto
                return await this.streamUpload(instanceId, response.data, mimeType);

            } catch (error: any) {
                const isNetworkError = error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.message?.includes('socket hang up') || error.isNetwork;
                
                if (attempt === retries) {
                    console.error(`[MediaService] Falha final ao baixar/salvar mídia de ${url}: ${error.message}`);
                    return null;
                }

                // Tratamento Específico para Mídia Expirada (403/404/410)
                if (error.response) {
                    const status = error.response.status;
                    if (status === 403 || status === 404 || status === 410) {
                        console.warn(`[MediaService] Mídia expirada ou não encontrada (${status}) em ${url}. Marcando como EXPIRED.`);
                        return 'EXPIRED';
                    }
                    // Outros erros 4xx (Client Error) - Abortar sem retry
                    if (status >= 400 && status < 500) {
                        console.error(`[MediaService] Erro cliente (${status}) ao baixar ${url}. Abortando.`);
                        return null;
                    }
                }

                const delay = Math.pow(2, attempt) * 1000;
                console.warn(`[MediaService] Erro download/upload (tentativa ${attempt}/${retries}): ${error.message}. Retentando em ${delay}ms...`);
                await new Promise(r => setTimeout(r, delay));
            }
        }
        return null;
    }

    /**
     * Converte um stream OGG/Opus para MP3 via FFmpeg (Stream Pipeline)
     */
    private static convertOggToMp3Stream(inputStream: any): PassThrough {
        const outputStream = new PassThrough();
        
        ffmpeg(inputStream)
            .toFormat('mp3')
            .audioCodec('libmp3lame')
            .audioBitrate('128k')
            .on('error', (err) => {
                console.error(`[MediaService] Erro na conversão FFmpeg:`, err.message);
                outputStream.emit('error', err);
            })
            .pipe(outputStream);

        return outputStream;
    }

    /**
     * [FIX PTT] Baixa url WebM (do frontend), converte para OGG Opus via FFmpeg local e sobe para Storage nativamente.
     * Isso garante entrega de notas de voz 100% corretas no WhatsApp, evitando bugs do ffmpeg da Evolution/Baileys.
     */
    static async convertWebmToOggOpusUrl(instanceId: string, webmUrl: string): Promise<string> {
        console.log(`[MediaService] Baixando audio para conversao PTT nativa (Webm -> OGG Opus): ${webmUrl}`);
        
        try {
            const response = await axios.get(webmUrl, { responseType: 'arraybuffer', timeout: 30000 });
            const inputBuffer = Buffer.from(response.data);
            
            if (inputBuffer.length === 0) {
                throw new Error("Arquivo de audio recebido da origin vazio.");
            }

            const inputStream = new PassThrough();
            inputStream.end(inputBuffer);

            const outputStream = new PassThrough();
            
            ffmpeg(inputStream)
                .toFormat('ogg')
                .audioCodec('libopus')
                .on('error', (err) => {
                    console.error(`[MediaService] Erro na conversao Webm -> Ogg Opus FFmpeg local:`, err.message);
                    outputStream.emit('error', err);
                })
                .pipe(outputStream);

            const oggUrl = await this.streamUpload(instanceId, outputStream, 'audio/ogg', `voice_msg_${Date.now()}.ogg`);
            console.log(`[MediaService] Conversao OGG Opus bem sucedida. Nova URL: ${oggUrl}`);
            return oggUrl;
        } catch (error: any) {
            console.error(`[MediaService] Falha grave ao tentar converter PTT para Ogg:`, error.message);
            throw error;
        }
    }

    private static getExtensionFromMime(mime: string): string {
        const map: any = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
            'video/mp4': 'mp4',
            'audio/mp4': 'm4a',
            'audio/mpeg': 'mp3',
            'audio/ogg': 'ogg',
            'audio/mpeg3': 'mp3',
            'application/pdf': 'pdf',
            'image/gif': 'gif',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
            'application/zip': 'zip'
        };
        return map[mime] || 'bin';
    }

    /**
     * Baixa foto de perfil de uma URL temporária e faz upload permanente para Firebase Storage.
     * Usado para garantir que imagens de perfil tenham URLs permanentes no primeiro sync.
     */
    static async downloadAndPersistPfp(instanceId: string, pfpUrl: string): Promise<string | null> {
        // Se já for URL do nosso storage, retorna diretamente
        if (pfpUrl && pfpUrl.includes("storage.googleapis.com")) {
            return pfpUrl;
        }

        try {
            // Busca credenciais para download autenticado
            let headers: any = { 'Connection': 'keep-alive' };
            try {
                const instanceData = await InstanceCache.get(instanceId);
                if (instanceData?.token) {
                    headers['apikey'] = instanceData.token;
                }
            } catch (e) {}

            // Download da imagem
            const response = await axios.get(pfpUrl, { 
                responseType: 'arraybuffer',
                timeout: 30000,
                headers
            });

            const buffer = Buffer.from(response.data, 'binary');
            const mimeType = response.headers['content-type'] || 'image/jpeg';

            // Upload para Firebase Storage
            const bucket = admin.storage().bucket();
            const hash = crypto.randomBytes(8).toString('hex');
            const path = `pfp/${instanceId}/${Date.now()}_${hash}.jpg`;
            const file = bucket.file(path);

            await file.save(buffer, {
                metadata: { contentType: mimeType }
            });

            // URL pública via Firebase Storage API (respeita rules do Firebase e não apenas ACL GCP)
            await file.makePublic().catch(() => {});
            
            const encodedPath = encodeURIComponent(path);
            const firebaseStorageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media`;
            
            console.log(`[MediaService] PFP persistido com sucesso: ${firebaseStorageUrl}`);
            return firebaseStorageUrl;

        } catch (error: any) {
            console.error(`[MediaService] Falha ao persistir PFP de ${pfpUrl}: ${error.message}`);
            return null;
        }
    }
}
