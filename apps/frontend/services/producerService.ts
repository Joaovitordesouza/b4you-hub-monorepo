
import { db, fieldValue, auth } from '../firebase';
import { Lead, Producer } from '../types';

export const producerService = {
  /**
   * Promove um Lead finalizado no Onboarding para Produtor oficial.
   * Cria o registro na coleção 'producers' e atualiza o status do Lead.
   * @deprecated Prefira usar a integração via Webhook de KYC que popula 'producers' automaticamente.
   */
  async promoteLeadToProducer(lead: Lead): Promise<string> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Usuário não autenticado");

    // Verifica se já existe como produtor para evitar duplicidade
    const existingCheck = await db.collection('producers').where('leadId', '==', lead.id).get();
    if (!existingCheck.empty) {
        return existingCheck.docs[0].id;
    }

    const producerId = `prod_${lead.id}`; // Mantém vínculo fácil pelo ID ou cria novo
    
    // Dados iniciais do Produtor
    const newProducer: Producer = {
        id: producerId,
        leadId: lead.id,
        nome_display: lead.nome_display,
        foto_url: lead.foto_url,
        email_contato: lead.dados_contato?.email,
        whatsapp_contato: lead.dados_contato?.whatsapp,
        
        produto_principal: lead.analise_ia_json.produto_detectado?.nome || 'Produto Principal',
        plataforma_origem: lead.analise_ia_json.produto_detectado?.plataforma || 'Outra',
        
        data_inicio_parceria: new Date().toISOString(),
        gerente_conta: currentUser.displayName || 'Admin', // Atribui quem fez a promoção ou busca regra de negócio
        
        stage: 'GROWTH', // Começa em Growth pois acabou de passar pelo Onboarding
        tags: [...lead.tags, 'Novo Produtor'],
        
        // Métricas zeradas (serão populadas por integrações futuras ou webhook)
        stats_financeiros: {
            faturamento_total: 0,
            faturamento_mes: 0,
            comissao_pendente: 0,
            vendas_count: 0,
            health_score: 100, // Começa com saúde máxima (lua de mel)
            status_health: 'SAUDAVEL',
            ultima_venda: new Date().toISOString(),
            tendencia: 'estavel'
        },

        // Campos legados/compatibilidade
        instagram_username: lead.instagram_username,
        seguidores: lead.seguidores,
        analise_ia_json: lead.analise_ia_json
    };

    const batch = db.batch();

    // 1. Criar documento do Produtor
    const producerRef = db.collection('producers').doc(producerId);
    batch.set(producerRef, newProducer);

    // 2. Atualizar Lead para indicar que foi convertido
    // Não deletamos o lead para manter histórico de aquisição
    const leadRef = db.collection('leads').doc(lead.id);
    batch.update(leadRef, {
        isConverted: true,
        convertedToProducerId: producerId,
        status: 'FECHADO', // Garante que está fechado
        onboardingStatus: 'COMPLETED' // Garante status final
    });

    await batch.commit();
    return producerId;
  },

  /**
   * Busca todos os produtores ativos
   */
  subscribeToProducers(callback: (producers: Producer[]) => void) {
      return db.collection('producers')
        .orderBy('stats_financeiros.faturamento_mes', 'desc')
        .onSnapshot(snapshot => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Producer));
            callback(data);
        });
  },

  /**
   * NOVO: Busca produtores recém-chegados via integração KYC (Onboarding)
   * Ordenado por data de atualização (chegada)
   */
  subscribeToKYCProducers(callback: (producers: Producer[]) => void) {
      // Query alinhada com a resposta técnica do backend:
      // Filtra stage == 'ONBOARDING' e ordena por updatedAt
      return db.collection('producers')
        .where('stage', '==', 'ONBOARDING')
        .orderBy('updatedAt', 'desc')
        .onSnapshot(snapshot => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Producer));
            callback(data);
        }, error => {
            console.error("Erro ao buscar produtores KYC:", error);
        });
  }
};
