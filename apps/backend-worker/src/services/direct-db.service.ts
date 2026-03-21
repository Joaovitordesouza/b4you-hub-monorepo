import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.warn('[DB DIRECT] DATABASE_URL not set. Direct DB features (Fast Sync) will be disabled.');
}

// Configuração do Pool de Conexões para eficiência e resiliência
const poolMax = parseInt(process.env.DB_POOL_MAX || '2', 10);
const pool = connectionString ? new Pool({
  connectionString,
  max: poolMax, // Configurável via env var (Default: 2 por instância)
  idleTimeoutMillis: 30000, // Fecha conexões ociosas após 30s
  connectionTimeoutMillis: 5000, // Timeout de conexão de 5s
  ssl: {
    rejectUnauthorized: false // Permite conexão com Railway/Neon/Self-signed (CRÍTICO PARA FAST SYNC)
  }
}) : null;

export class DirectDbService {

    /**
     * Verifica se a conexão com o banco está saudável.
     * Útil para health checks e failover proativo.
     */
    static async checkConnection(): Promise<boolean> {
        if (!pool) return false;
        try {
            const client = await pool.connect();
            client.release();
            return true;
        } catch (e) {
            console.error('[DB DIRECT] Erro de conexão (Health Check):', e);
            return false;
        }
    }

    /**
     * FAST SYNC QUERY - CHATS
     * Busca os chats mais recentes diretamente do banco.
     * Otimizado para popular a tela inicial rapidamente.
     */
    static async fetchFastSyncChats(instanceId: string, limit: number = 50): Promise<any[]> {
        if (!pool) throw new Error("DB connection not configured (EVOLUTION_DB_URL missing)");
        
        const client = await pool.connect();
        try {
            // [QUERY VALIDADA] 
            // Tabela: "Chat" (PascalCase, requer aspas)
            // Ordenação: "updatedAt" DESC (Coluna confirmada via inspect-schema)
            const res = await client.query(`
                SELECT * FROM "Chat" 
                WHERE "instanceId" = $1 
                ORDER BY "updatedAt" DESC 
                LIMIT $2
            `, [instanceId, limit]);

            return res.rows.map(row => ({
                id: row.remoteJid, 
                remoteJid: row.remoteJid,
                name: row.name || row.remoteJid,
                pushName: row.name,
                unreadCount: row.unreadMessages,
                // Converte Date do Postgres para Unix Timestamp (segundos)
                conversationTimestamp: row.updatedAt ? Math.floor(new Date(row.updatedAt).getTime() / 1000) : 0,
                updatedAt: row.updatedAt,
                // Foto de perfil não está na tabela Chat, mas o frontend lida com isso.
                profilePictureUrl: null as string | null
            }));
        } catch (e: any) {
            console.warn(`[DB DIRECT] Falha ao buscar chats para ${instanceId}: ${e.message}`);
            throw e; // Propaga erro para acionar o failover no Controller
        } finally {
            client.release();
        }
    }

    /**
     * MESSAGE SYNC QUERY
     * Busca mensagens de um chat específico.
     * @param minTimestamp Timestamp mínimo (em segundos) para Delta Sync
     */
    static async fetchMessages(instanceId: string, remoteJid: string, limit: number = 30, minTimestamp: number = 0): Promise<any[]> {
        if (!pool) throw new Error("DB connection not configured (EVOLUTION_DB_URL missing)");

        const client = await pool.connect();
        try {
            // [QUERY VALIDADA - DELTA SYNC]
            // Tabela: "Message" (PascalCase, requer aspas)
            // Filtro: "key" é JSONB, extraímos 'remoteJid' dele.
            // Delta: Filtra mensagens mais novas que o último sync
            // Ordenação: "messageTimestamp" DESC (Coluna integer confirmada)
            const res = await client.query(`
                SELECT * FROM "Message" 
                WHERE "instanceId" = $1 
                AND "key"->>'remoteJid' = $2
                AND "messageTimestamp" > $4
                ORDER BY "messageTimestamp" DESC 
                LIMIT $3
            `, [instanceId, remoteJid, limit, minTimestamp]);

            // Mapeia para o formato que o EvolutionService/Firestore esperam
            return res.rows.map(row => DirectDbService.mapSqlToEvolutionInterface(row));
        } catch (e: any) {
            console.warn(`[DB DIRECT] Falha ao buscar mensagens de ${remoteJid}: ${e.message}`);
            throw e; // Propaga erro para acionar o failover
        } finally {
            client.release();
        }
    }

    /**
     * CAMADA DE ADAPTAÇÃO (MAPPER)
     * Transforma o retorno snake_case/raw do Postgres na interface da Evolution API.
     */
    private static mapSqlToEvolutionInterface(row: any): any {
        return {
            key: row.key, // Já é objeto JSON graças ao pg driver
            message: row.message, // Já é objeto JSON
            messageTimestamp: row.messageTimestamp, // Integer (seconds)
            status: row.status,
            pushName: row.pushName,
            participant: row.participant,
            messageType: row.messageType,
            instanceId: row.instanceId,
            // Campos adicionais úteis
            id: row.id,
            isFromMe: row.key?.fromMe ?? false
        };
    }
}
