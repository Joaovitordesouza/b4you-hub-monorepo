import * as admin from "firebase-admin";

interface CachedInstance {
    data: admin.firestore.DocumentData;
    timestamp: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos de cache (Performance/Estabilidade)
const instanceCache = new Map<string, CachedInstance>();
const pendingRequests = new Map<string, Promise<admin.firestore.DocumentData | undefined>>();

export class InstanceCache {
    /**
     * Busca dados da instância com cache em memória.
     * Implementa Request Coalescing para evitar "Cache Stampede".
     */
    static async get(instanceId: string): Promise<admin.firestore.DocumentData | undefined> {
        const now = Date.now();
        const cached = instanceCache.get(instanceId);

        // 1. Cache Hit
        if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
            return cached.data;
        }

        // 2. Request Coalescing (Se já existe uma busca em andamento, retorna a mesma Promise)
        if (pendingRequests.has(instanceId)) {
            // console.log(`[CACHE] Unindo requisição para ${instanceId}...`);
            return pendingRequests.get(instanceId);
        }

        // 3. Cache Miss - Inicia busca
        const fetchPromise = (async () => {
            try {
                console.log(`[CACHE] Buscando instância ${instanceId} no Firestore (Miss)...`);
                const db = admin.firestore();
                const start = Date.now();
                const doc = await db.collection("instances").doc(instanceId).get();
                console.log(`[CACHE] Busca instância ${instanceId} concluída em ${Date.now() - start}ms`);
                
                if (doc.exists) {
                    const data = doc.data();
                    if (data) {
                        instanceCache.set(instanceId, { data, timestamp: Date.now() });
                        return data;
                    }
                }
            } catch (e) {
                console.warn(`[CACHE] Falha ao buscar instância ${instanceId}:`, e);
            } finally {
                // Remove do mapa de pendências após terminar
                pendingRequests.delete(instanceId);
            }
            return undefined;
        })();

        pendingRequests.set(instanceId, fetchPromise);
        return fetchPromise;
    }

    /**
     * Invalida o cache de uma instância (ex: quando atualizamos status)
     */
    static invalidate(instanceId: string) {
        instanceCache.delete(instanceId);
    }
}
