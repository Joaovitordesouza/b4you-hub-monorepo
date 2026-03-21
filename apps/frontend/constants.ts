import { Campanha, Lead, Conversa } from './types';

// Mock Data simulating Databases
export const MOCK_USER = {
  id: 'u-1',
  nome: 'Admin B4You',
  email: 'admin@b4you.com.br',
  avatar: 'https://ui-avatars.com/api/?name=Admin+B4You&background=16a34a&color=fff'
};

// Fix: Added missing ownerId property to satisfy Campanha interface
export const MOCK_CAMPANHAS: Campanha[] = [
  { id: 'c-1', nome: 'Nutricionistas SP', nicho: 'Nutrição Esportiva', status: 'RODANDO', leads_count: 142, data_criacao: '2023-10-01', ownerId: 'u-1' },
  { id: 'c-2', nome: 'Devs React', nicho: 'Tecnologia', status: 'PAUSADA', leads_count: 58, data_criacao: '2023-10-05', ownerId: 'u-1' },
  { id: 'c-3', nome: 'Personal Trainers', nicho: 'Fitness', status: 'CONFIGURADA', leads_count: 0, data_criacao: '2023-10-10', ownerId: 'u-1' },
];

// Fix: Added missing ownerId property to satisfy Lead interface
export const MOCK_LEADS: Lead[] = [
  {
    id: 'l-1',
    campanha_id: 'c-1',
    ownerId: 'u-1',
    instagram_username: '@nutri.julia',
    nome_display: 'Júlia Nutri',
    foto_url: 'https://picsum.photos/100/100?random=1',
    seguidores: 15400,
    score_qualificacao: 85,
    status: 'NOVO',
    tags: ['Ebook', 'Engajado'],
    posicao_kanban: 0,
    analise_ia_json: {
      resumo: 'Perfil focado em emagrecimento feminino. Possui linktree com ebook.',
      pontos_fortes: ['Boa didática', 'Alta frequência de stories'],
      sinais_monetizacao: true,
      plataforma_detectada: 'Hotmart'
    }
  },
  {
    id: 'l-2',
    campanha_id: 'c-1',
    ownerId: 'u-1',
    instagram_username: '@dr.marcos',
    nome_display: 'Dr. Marcos Silva',
    foto_url: 'https://picsum.photos/100/100?random=2',
    seguidores: 45000,
    score_qualificacao: 92,
    status: 'EM_CONVERSA',
    tags: ['Mentoria', 'Alto Ticket'],
    posicao_kanban: 0,
    analise_ia_json: {
      resumo: 'Médico do esporte. Vende mentoria para outros médicos.',
      pontos_fortes: ['Autoridade', 'Prova social forte'],
      sinais_monetizacao: true,
      plataforma_detectada: 'Eduzz'
    }
  },
  {
    id: 'l-3',
    campanha_id: 'c-2',
    ownerId: 'u-1',
    instagram_username: '@tech.bruno',
    nome_display: 'Bruno Dev',
    foto_url: 'https://picsum.photos/100/100?random=3',
    seguidores: 5000,
    score_qualificacao: 45,
    status: 'DESCARTADO',
    tags: ['Iniciante'],
    posicao_kanban: 0,
    analise_ia_json: {
      resumo: 'Perfil pessoal com pouco conteúdo técnico.',
      pontos_fortes: [],
      sinais_monetizacao: false,
      plataforma_detectada: null
    }
  },
  {
    id: 'l-4',
    campanha_id: 'c-1',
    ownerId: 'u-1',
    instagram_username: '@coach.ana',
    nome_display: 'Ana Coach',
    foto_url: 'https://picsum.photos/100/100?random=4',
    seguidores: 12000,
    score_qualificacao: 78,
    status: 'INTERESSADO',
    tags: ['Consultoria'],
    posicao_kanban: 0,
    analise_ia_json: {
      resumo: 'Coach de carreira. Tem interesse em escalar.',
      pontos_fortes: ['Boa oratória'],
      sinais_monetizacao: true,
      plataforma_detectada: 'Kiwify'
    }
  }
];

export const INITIAL_CONVERSATION: Conversa = {
  id: 'conv-1',
  lead_id: 'l-2',
  agente_atual: 'nutricao',
  mensagens: [
    {
      id: 'm-1',
      conversa_id: 'conv-1',
      remetente: 'AGENT_B4YOU',
      conteudo: 'Olá! Vi seu perfil e notei que você tem uma mentoria excelente. A B4You ajuda creators como você a escalar. Como está sua estrutura de vendas hoje?',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      tipo: 'text'
    }
  ]
};

// --- GESTÃO DE FOLLOW-UP 2.0 COLORS ---
export const STATUS_COLORS = {
  OVERDUE: 'bg-rose-50 text-rose-700 border-rose-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  UPCOMING: 'bg-blue-50 text-blue-700 border-blue-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-gray-50 text-gray-500 border-gray-200',
  B4YOU: 'bg-indigo-600 text-white border-indigo-700',
  CLIENT: 'bg-brand-500 text-white border-brand-600'
};