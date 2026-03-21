
export type LeadStatus = 'NOVO' | 'EM_CONVERSA' | 'RESPONDIDO' | 'INTERESSADO' | 'NEGOCIACAO' | 'AGENDADO' | 'FECHADO' | 'DESCARTADO';

// --- NOVOS STATUS DE ONBOARDING (Fluxo Linear Estrito) ---
export type OnboardingStage = 'HANDOVER' | 'SETUP_ACESSO' | 'IMPLEMENTACAO' | 'PRONTO_PRA_VENDER' | 'FINALIZADO';

export type ProducerStage = 'AQUISICAO' | 'ONBOARDING' | 'GROWTH' | 'RISCO' | 'ACTIVE' | 'BLOCKED';

// --- STATUS DE ACOMPANHAMENTO (Action-Based) ---
// null = Sem pendências (Não aparece no board)
export type TrackingStatus = 'PRECISA_CONTATO' | 'EM_ANDAMENTO' | 'AGUARDANDO_RETORNO' | 'EM_SUPORTE' | 'ACAO_ESTRATEGICA' | null;

export type SLAStatus = 'OK' | 'WARNING' | 'BREACHED';

export interface TrackingMetadata {
    entered_stage_at?: string;  // Timestamp ISO
    last_interaction_at?: string; // Timestamp ISO
    next_action_date?: string;    // Timestamp ISO
    sla_status?: SLAStatus;
    waiting_since?: string;       // Timestamp ISO
    risk_level?: number;
}

// --- STATUS DE SAÚDE DA CARTEIRA (Financeiro) ---
export type HealthStatus = 'SAUDAVEL' | 'ATENCAO' | 'RISCO' | 'CHURN';

// --- IAM & PERMISSIONS (Refatorado v2.0) ---
export type UserRole = string; 
export type NormalizedUserRole = string; 

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export interface UserSettings {
    notifications: {
        email: boolean;
        push: boolean;
        task_deadlines: boolean;
    };
    theme: 'light' | 'dark';
    dashboard_layout?: string[];
}

export interface CSPerformance {
    userId: string;
    userName: string;
    avatar: string;
    status: 'online' | 'offline';
    slaScore: number; // 0-100
    avgResponseTime: number; // minutes
    clientsCount: number;
    waitingClientsCount: number;
    unreadMessagesCount: number;
    tasksTotal: number;
    tasksCompleted: number;
    lastActive?: string;
}

export interface Usuario {
  id: string;
  uid: string; 
  nome: string;
  email: string;
  avatar: string;
  role: UserRole;
  status: UserStatus; 
  inviteCode?: string; 
  phone?: string;      
  department?: string; 
  managerId?: string;  
  linkedInstanceId?: string; 
  createdAt?: any;
  lastLoginAt?: string;
  lastActive?: string;
  settings?: UserSettings;
  performance?: {
    totalResponseTime: number;
    responsesCount: number;
    avgResponseTime: number;
    slaScore: number;
    lastUpdated?: string;
  };
}

export type ProcessingStatus = 'idle' | 'pending' | 'preparing' | 'processing' | 'downloading' | 'completed' | 'error';

// --- EVOLUTION API TYPES ---
export type SystemStatus = 'CREATED' | 'NEEDS_PAIRING' | 'INITIALIZING' | 'READY' | 'RECONNECT_REQUIRED' | 'DELETING' | 'SYNCING';
export type ConnectionStatus = 'ONLINE' | 'OFFLINE' | 'QRCODE';
export type InstanceStatus = ConnectionStatus;

export interface EvolutionInstance {
  id: string; 
  name: string; 
  ownerId: string;
  systemStatus: SystemStatus;
  connectionStatus: ConnectionStatus; 
  qrcode?: string;
  profileName?: string;
  profilePicUrl?: string;
  updatedAt: any;
  phone?: string;
  syncStatus?: { percentage: number; message: string; lastSync: any; };
  batteryLevel?: number;
  connectionQuality?: 'Excellent' | 'Good' | 'Poor';
}

export interface EvolutionChat {
  id: string;
  remoteJid: string;
  pushName: string;
  profilePicUrl?: string;
  profilePictureUrl?: string;
  lastMessage?: string;
  lastMessagePreview?: string;
  lastMessageAt: number;
  lastMessageTimestamp?: any; // Firestore Timestamp object
  lastMessageTimestampMillis?: number; 
  unreadCount: number;
  type: 'private' | 'group';
  leadId?: string; 
  leadName?: string;
  leadAvatar?: string;
  leadScore?: number;
  tags?: string[];
  ownerId?: string;
  instanceId?: string;
  instanceName?: string;
}

export interface EvolutionMessage {
  id: string;
  key: { remoteJid: string; fromMe: boolean; id: string; };
  messageType: 'conversation' | 'imageMessage' | 'audioMessage' | 'videoMessage' | 'documentMessage' | 'extendedTextMessage';
  content: any;
  mediaUrl?: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'played' | 'error'; 
  messageTimestamp: number;
  isInternal?: boolean;
}

export type TimelineEventType = 'WHATSAPP_MSG' | 'NOTE' | 'SYSTEM_LOG' | 'TASK_UPDATE' | 'STAGE_CHANGE';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  timestamp: string | number; 
  authorId: string;
  authorName?: string;
  content?: string; 
  metadata?: any; 
  status?: 'pending' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'error' | 'played';
  isOptimistic?: boolean;
  isOutbox?: boolean;
  isInternal?: boolean;
  isDeleted?: boolean;
  deletedAt?: number | string;
  deletedForEveryone?: boolean;
  isEdited?: boolean;
  editedAt?: number | string;
  oldMessages?: any[];
  replyTo?: { id: string; authorName?: string; content?: string; };
  reactions?: string[]; 
  category?: 'TASK' | 'NOTE' | 'SYSTEM'; 
  icon?: any; 
  media?: any;
  mediaStatus?: 'idle' | 'loading' | 'success' | 'error';
  // Campos adicionais usados em runtime
  tempId?: string;
  key?: { remoteJid?: string; id?: string; fromMe?: boolean; participant?: string; };
  messageType?: string;
  quoted?: { key?: { id?: string }; authorName?: string; content?: string; };
  pushName?: string;
  errorMessage?: string;
}

export interface AuditLog {
    id: string;
    action: string; 
    targetId: string; 
    targetCollection: string; 
    actorId: string; 
    actorName: string;
    timestamp: any;
    metadata?: any; 
}

export interface Notification {
    id: string;
    userId: string; 
    type: 'TASK_ASSIGNED' | 'TASK_OVERDUE' | 'MENTION' | 'SYSTEM_ALERT' | 'LEAD_ASSIGNED';
    title: string;
    body: string;
    link?: string; 
    read: boolean;
    createdAt: any;
    priority?: 'HIGH' | 'NORMAL' | 'LOW';
}

export interface Workspace {
  id: string;
  ownerId: string;
  nome: string;
  token: string;
  createdAt: string;
  plataforma: 'Kiwify' | 'Outra';
  linkedLeadId?: string | null;
  originEmail?: string | null;
}

export interface MigrationStatus {
  courseId: string;
  status: ProcessingStatus;
  progress: number;
  localPath?: string;
  error?: string;
  totalModules?: number;
  completedModules?: number; 
  totalLessons?: number;
  completedLessons?: number;
  coverImage?: string;
  workerId?: string; 
  updatedAt?: any;
}

export interface Campanha {
  id: string;
  nome: string;
  nicho: string;
  status: 'CONFIGURADA' | 'RODANDO' | 'PAUSADA' | 'CONCLUIDA';
  leads_count: number;
  data_criacao: string;
  ownerId: string;
  stats?: { contactados: number; respondidos: number; negociacao: number; fechados: number; }
}

export interface ProdutoDetectado {
  tipo: 'Curso' | 'Mentoria' | 'Comunidade' | 'Ebook' | 'Serviço' | 'Outro' | string;
  nome: string;
  descricao?: string;
  url_origem?: string;
  plataforma?: 'Hotmart' | 'Eduzz' | 'Kiwify' | 'Kirvano' | null | string;
  confianca_ia?: 'Alta' | 'Baixa';
  preco?: string;
}

export interface AnaliseIA {
  resumo: string;
  pontos_fortes: string[];
  sinais_monetizacao: boolean;
  plataforma_detectada?: 'Hotmart' | 'Eduzz' | 'Kiwify' | 'Kirvano' | null;
  produto_detectado?: ProdutoDetectado | null;
  mensagem_personalizada?: string;
}

export interface Lead {
  id: string;
  campanha_id: string;
  ownerId: string;
  instagram_username: string;
  nome_display: string;
  foto_url: string;
  seguidores: number;
  score_qualificacao: number;
  status: LeadStatus;
  isOnboarding?: boolean;
  onboardingStatus?: OnboardingStage; 
  migrationProgress?: number; 
  responsavelId?: string | null; 
  tags: string[];
  analise_ia_json: AnaliseIA;
  posicao_kanban: number;
  ultima_interacao?: string;
  proxima_acao?: string;
  dados_contato?: { whatsapp?: string; email?: string; instagram?: string; }
  isConverted?: boolean;
  convertedToProducerId?: string;
  cnpj?: string;
}

export interface ProducerStats {
  faturamento_total: number;
  faturamento_mes: number;
  comissao_pendente: number;
  vendas_count: number;
  health_score: number;
  status_health: HealthStatus; 
  ultima_venda: string;
  tendencia: 'alta' | 'baixa' | 'estavel';
}

export interface Producer {
  id: string; 
  leadId?: string; 
  nome_display: string;
  foto_url: string;
  email_contato?: string;
  whatsapp_contato?: string;
  cpf?: string;
  cnpj?: string;
  data_nascimento?: string;
  kyc_status?: boolean;
  cnpj_status?: string;
  conta_externa_criada_em?: string;
  produto_principal: string;
  plataforma_origem: string;
  data_inicio_parceria: string;
  gerente_conta: string; 
  stats_financeiros: ProducerStats;
  
  onboarding_stage?: OnboardingStage;
  tracking_status?: TrackingStatus | null; 
  tracking_metadata?: TrackingMetadata; 
  
  stage: string; 
  
  tags: string[];
  createdAt?: any;
  updatedAt?: any; 
  instagram_username?: string;
  seguidores?: number;
  analise_ia_json?: AnaliseIA; 
  
  lastContactAt?: string;
  nextCheckinAt?: string;
  responsibleInternalId?: string; 
  responsibleClientId?: string;   
  
  statusUpdatedAt?: string;
  nextReminderAt?: string;
  statusHistory?: Array<{
    stage: OnboardingStage | TrackingStatus;
    enteredAt: string;
    exitedAt?: string;
    durationMinutes?: number;
    changedBy: string;
    note?: string;
  }>;
}

export type Creator = Producer; 

export type BoardColumnType = 'status' | 'text' | 'person' | 'date' | 'priority' | 'numbers' | 'client' | 'timeline' | 'rating' | 'checkbox';

export interface BoardStatusOption {
    id: string;
    label: string;
    color: string;
}

export interface BoardColumn {
    id: string;
    title: string;
    type: BoardColumnType;
    width: number;
    settings?: {
        options?: BoardStatusOption[];
    };
}

export interface BoardItemUpdate {
    id: string;
    authorId: string;
    text: string;
    createdAt: string;
    likes: number;
}

export interface BoardItem {
    id: string;
    name: string;
    column_values: Record<string, any>; 
    updates: BoardItemUpdate[];
    createdAt?: string;
    updatedAt?: string;
}

export interface BoardGroup {
    id: string;
    title: string;
    color: string;
    items: BoardItem[];
}

export interface BoardWorkspace {
    id: string;
    name: string;
    description?: string;
    ownerId: string;
    members: string[]; 
    isPublic?: boolean; 
    createdAt?: any;
    color?: string; 
    icon?: string; 
}

export interface Board {
    id: string;
    workspaceId?: string; 
    name: string;
    description?: string;
    type: 'main' | 'private';
    ownerId: string;
    members?: string[]; 
    columns: BoardColumn[];
    groups: BoardGroup[];
    updatedAt?: any;
}

export type TaskPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type TaskType = 'CHURN_PREVENTION' | 'ONBOARDING_FOLLOWUP' | 'ROUTINE_CHECK' | 'SALES_CLOSING' | 'MANUAL' | 'PLAYBOOK' | 'REMINDER';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED' | 'WAITING' | 'STUCK' | 'CANCELLED';

export interface WorkTask {
  id: string;
  title: string;
  description?: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  responsibility?: 'B4YOU' | 'CLIENT';
  leadId?: string;
  clientId?: string;
  creatorName?: string;
  creatorAvatar?: string;
  assignedTo: string[];
  userId?: string;
  dueDate: string;
  createdAt: string;
  updatedAt?: string;
  columnValues?: Record<string, any>;
  healthScore?: number;
  healthStatus?: string;
  updatesCount?: number;
  metadata?: {
      messageId?: string;
      originalText?: string;
      source?: 'CHAT' | 'MANUAL' | 'SYSTEM';
  };
}

export interface TaskUpdateReply {
    id: string;
    authorId: string;
    authorName: string;
    authorAvatar: string;
    content: string;
    createdAt: string;
    reactions?: Record<string, string[]>; // emoji -> userIds
    isEdited?: boolean;
    editedAt?: string;
}

export interface TaskUpdate {
    id: string;
    authorId: string;
    authorName: string;
    authorAvatar: string;
    content: string;
    createdAt: string;
    reactions?: Record<string, string[]>; // emoji -> userIds
    replies?: TaskUpdateReply[];
    isEdited?: boolean;
    editedAt?: string;
}

export type ActivityType = 'NOTE' | 'STRATEGY' | 'FILE' | 'LOG';
export interface ClientActivity { id: string; clientId: string; authorId: string; authorName: string; type: ActivityType; content: string; attachments?: { name: string, url: string, type: string }[]; createdAt: string; isPinned?: boolean; }
export interface KiwifyCourse { id: string; name: string; cover_image: string; product_id: string; }
export interface LocalCourse { dirName: string; workspaceId?: string; course: { id: string; name: string; config: { premium_members_area: { cover_image_desktop: string; } }; modules: Module[]; }; leadId?: string; }
export interface Module { id: string; name: string; order: number; lessons: Lesson[]; }
export interface Lesson { id: string; title: string; isMigrated?: boolean; processingStatus?: ProcessingStatus; video?: { name: string; streamUrl?: string; duration?: number; }; module_id?: string; module_name?: string; moduleIndex?: number; lessonIndex?: number; }
export interface Mensagem { id: string; conversa_id: string; remetente: 'AGENT_B4YOU' | 'USER_CREATOR' | 'SYSTEM'; conteudo: string; timestamp: string; tipo: 'text'; autor?: { id: string; nome: string; avatar: string; role: UserRole; }; }
export interface Conversa { id: string; lead_id: string; agente_atual: string; mensagens: Mensagem[]; modo_manual?: boolean; }
export type HunterStep = 'ICP_DEFINITION' | 'SEARCH_RESULTS' | 'STRATEGY' | 'EXECUTION';
export interface HunterCreator { id: string; name: string; avatar: string; niche: string; productName: string; productPrice: number; commissionRate: number; salesPageUrl: string; instagram: string; followers: number; email?: string; whatsapp?: string; matchScore: number; status: 'NEW' | 'CONTACTED' | 'NEGOTIATING' | 'PARTNER' | 'DISCARDED'; }
export type ProductType = 'Cursos Online' | 'E-books' | 'Audiobooks' | 'Mentorias' | 'Comunidades';
export type MaturityLevel = 'LAUNCH' | 'ESTABLISHED' | 'CONSOLIDATED'; 
export type AudienceSize = 'BEGINNER' | 'INTERMEDIATE' | 'HUGE'; 
export interface HunterCampaignConfig { niche: string; minPrice: number; maxPrice: number; minCommission: number; maxCommission: number; productTypes: ProductType[]; maturity: MaturityLevel; performanceIndicators: string[]; audienceSize: AudienceSize; }
export interface HunterStrategyConfig { channel: 'WHATSAPP' | 'INSTAGRAM' | 'EMAIL'; tone: 'FORMAL' | 'FRIENDLY' | 'DIRECT'; template: string; }
export interface HunterChatMessage { id: string; sender: 'user' | 'agent'; text: string; type?: 'text'|'action'; actionData?: any; }

export type LaunchStatus = 'PRE_LANCAMENTO' | 'EM_TESTE' | 'APROVADO' | 'AO_VIVO' | 'FINALIZADO' | 'POS_ANALISE';

export interface Launch {
  id: string;
  producerId: string;
  status: LaunchStatus;
  productName: string;
  productType: 'FISICO' | 'DIGITAL' | 'HIBRIDO';
  platform: string;
  openDate: string;
  closeDate: string;
  launchType: string;
  revenueGoal: number;
  volumeExpectation: 'BAIXO' | 'MEDIO' | 'ALTO' | 'PICO';
  hasDiscount: boolean;
  discountDetails?: string;
  hasCoupon: boolean;
  priceChange: boolean;
  needsNewOffer: boolean;
  integrations: string[]; 
  funnel: { orderBump: boolean; upsell: boolean; downsell: boolean };
  specialSplit: boolean;
  hasAffiliates: boolean;
  tests: {
    checkout: boolean;
    split: boolean;
    integrations: boolean;
    webhook: boolean;
    membersArea: boolean;
    notifications: boolean;
    salesPage: boolean;
    pixel: boolean;
  };
  testDeadline: string; 
  producerProfile: 'BASE_ATIVA' | 'NOVO' | 'HIGH_TICKET' | 'OPERACAO_GRANDE';
  accountManagerId?: string;
  estimatedTicket: number;
  priority: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  isStrategicMonth: boolean;
  notifiedBy: string;
  notifiedAt: string;
  techNotified: boolean;
  techOwnerId?: string;
  riskMapped?: string;
  planB?: string;
  notes?: string;
  analysis?: AnaliseIA;
  isShortNotice: boolean; 
  hasLastMinuteChanges: boolean;
  statusHistory?: Array<{
    status: LaunchStatus;
    enteredAt: string;
    exitedAt: string;
    durationMinutes: number;
    changedBy: string;
    note?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}
