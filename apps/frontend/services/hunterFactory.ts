
import { HunterCreator, HunterCampaignConfig } from '../types';

// Arrays auxiliares para gerar dados de produtos Kiwify realistas
const PRODUCT_PREFIXES = ['Método', 'Protocolo', 'Jornada', 'Desafio', 'Escola', 'Comunidade', 'Mentoria', 'Manual'];
const PRODUCT_SUFFIXES = ['Digital', '360', 'Pro', 'Elite', '2.0', 'do Futuro', 'Acelerado', 'Definitivo'];

const NICHES_KEYWORDS: Record<string, string[]> = {
  'espiritualidade': ['Chakra', 'Tarot', 'Astral', 'Meditação', 'Cura', 'Sagrado', 'Energia', 'Cristais'],
  'marketing': ['Vendas', 'Tráfego', 'Copy', 'Lançamento', 'Funil', 'Conversão', 'Instagram', 'Growth'],
  'fitness': ['Shape', 'Treino', 'Dieta', 'Emagrecer', 'Músculo', 'Saúde', 'Funcional', 'Yoga'],
  'finance': ['Investidor', 'Renda', 'Cripto', 'Bolsa', 'Dividendos', 'Milhas', 'Trader', 'Lucro'],
  'generic': ['Sucesso', 'Foco', 'Mentalidade', 'Carreira', 'Liderança', 'Produtividade']
};

export const hunterFactory = {
  
  // Gera um nome de produto baseado no nicho
  generateProductName: (niche: string): string => {
    const keywords = NICHES_KEYWORDS[niche.toLowerCase()] || NICHES_KEYWORDS['generic'];
    const prefix = PRODUCT_PREFIXES[Math.floor(Math.random() * PRODUCT_PREFIXES.length)];
    const keyword = keywords ? keywords[Math.floor(Math.random() * keywords.length)] : 'Expert';
    const suffix = Math.random() > 0.5 ? PRODUCT_SUFFIXES[Math.floor(Math.random() * PRODUCT_SUFFIXES.length)] : '';
    return `${prefix} ${keyword} ${suffix}`.trim();
  },

  // Busca perfis fake na API randomuser.me e enriquece com dados Kiwify
  searchCreators: async (config: HunterCampaignConfig): Promise<HunterCreator[]> => {
    try {
      const response = await fetch('https://randomuser.me/api/?results=12&nat=br');
      const data = await response.json();
      
      return data.results.map((user: any, index: number) => {
        // Preço respeitando o range
        const price = Math.floor(Math.random() * (config.maxPrice - config.minPrice + 1) + config.minPrice);
        
        // Seguidores respeitando AudienceSize
        let minFollowers = 100;
        let maxFollowers = 5000;
        if (config.audienceSize === 'INTERMEDIATE') { minFollowers = 5000; maxFollowers = 50000; }
        if (config.audienceSize === 'HUGE') { minFollowers = 50000; maxFollowers = 500000; }
        
        const followers = Math.floor(Math.random() * (maxFollowers - minFollowers)) + minFollowers;
        
        // Comissão: Respeita min e max
        const commissionRange = config.maxCommission - config.minCommission;
        const commissionRandom = Math.random() * commissionRange;
        const commission = (config.minCommission + commissionRandom) / 100;
        
        // Simulação de Score de Match
        const matchScore = Math.floor(Math.random() * 30) + 70; // Entre 70 e 100

        return {
          id: user.login.uuid,
          name: `${user.name.first} ${user.name.last}`,
          avatar: user.picture.large,
          niche: config.niche,
          productName: hunterFactory.generateProductName(config.niche),
          productPrice: price,
          commissionRate: parseFloat(commission.toFixed(2)),
          salesPageUrl: `kiwify.com/${user.login.username}`,
          instagram: `@${user.login.username}`,
          followers: followers,
          email: user.email,
          whatsapp: Math.random() > 0.4 ? `(11) 9${Math.floor(Math.random()*9000)+1000}-${Math.floor(Math.random()*9000)+1000}` : undefined,
          matchScore: matchScore,
          status: 'NEW'
        } as HunterCreator;
      });

    } catch (error) {
      console.error("Erro ao gerar creators simulados:", error);
      return [];
    }
  }
};