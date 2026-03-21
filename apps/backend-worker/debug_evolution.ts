
import { EvolutionService } from './src/services/evolution.service';
import * as admin from 'firebase-admin';

// Mock do Firebase (apenas para o teste não falhar no init)
if (admin.apps.length === 0) {
    admin.initializeApp({ projectId: process.env.GCP_PROJECT || 'b4you-hub' });
}

const INSTANCE = 'comercialçp'; // Do log do usuário
// JID de exemplo (pode ser qualquer um válido, peguei do log anterior se houver, ou uso um genérico)
const REMOTE_JID = '5511941003333@s.whatsapp.net'; 

async function testFetch() {
    console.log(`\n--- TESTANDO FETCH MESSAGES (${INSTANCE}) ---`);
    console.log(`JID: ${REMOTE_JID}`);
    
    try {
        console.time('fetch');
        const messages = await EvolutionService.fetchMessagesPaginated(INSTANCE, REMOTE_JID, { page: 1, limit: 10 });
        console.timeEnd('fetch');
        
        console.log(`✅ Sucesso! Mensagens: ${messages.length}`);
        if (messages.length > 0) {
            console.log('Exemplo:', JSON.stringify(messages[0]?.key || {}));
        }
    } catch (error: any) {
        console.error('❌ Falha no fetch:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data).substring(0, 500));
        }
    }
}

testFetch();
