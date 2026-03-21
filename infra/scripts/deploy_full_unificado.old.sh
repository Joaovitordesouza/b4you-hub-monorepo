#!/bin/bash
set -e

# ==============================================================================
# DEPLOY FULL UNIFICADO: B4YOU HUB - ELITE ARCHITECTURE
# ==============================================================================
# Descrição: Script blindado para deploy de toda a infraestrutura:
#   - Firebase: Regras de Segurança e Índices (Firestore/Storage)
#   - Backend: Worker (Cloud Run) e Functions (Firebase)
#   - Frontend: React/Vite (Cloud Run)
# ==============================================================================

# Cores para Log
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Funções de Log
log() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
info() { echo -e "${CYAN}[STEP]${NC} $1"; }
highlight() { echo -e "${MAGENTA}[ACTION]${NC} $1"; }

# ==============================================================================
# 0. PRE-FLIGHT CHECKS
# ==============================================================================
check_deps() {
    log "Verificando dependências do sistema..."
    command -v gcloud >/dev/null 2>&1 || error "gcloud CLI não instalado."
    command -v firebase >/dev/null 2>&1 || error "firebase CLI não instalado."
    command -v npm >/dev/null 2>&1 || error "npm não instalado."
    
    # Verificar Projeto Ativo
    CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
    if [ "$CURRENT_PROJECT" != "b4you-hub" ]; then
        warn "Projeto atual é '$CURRENT_PROJECT', mas o esperado é 'b4you-hub'."
        highlight "Deseja mudar para 'b4you-hub'? (y/N)"
        read -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            gcloud config set project b4you-hub
        else
            error "Abortado. Certifique-se de estar no projeto correto."
        fi
    fi
    success "Pré-requisitos validados."
}

# ==============================================================================
# 1. SETUP DE VARIÁVEIS
# ==============================================================================
setup_env() {
    log "Configurando variáveis de ambiente..."
    
    # Defaults de Produção (Nova VM Evolution API)
    export PROJECT_ID="b4you-hub"
    export REGION="us-central1"
    export EVOLUTION_API_URL="https://evolution-api-4b7h.srv1506962.hstgr.cloud"
    export EVOLUTION_APIKEY="ksfghdopsmkxcjfgkspcbnigodkgnjskfgmll"
    export EVOLUTION_GLOBAL_KEY="ksfghdopsmkxcjfgkspcbnigodkgnjskfgmll"
    
    # Carregar do .env local se existir (sobrescreve defaults)
    if [ -f "apps/functions/.env" ]; then
        log "Carregando variáveis de apps/functions/.env..."
        export $(grep -v '^#' apps/functions/.env | xargs)
    fi

    # Variáveis de Serviço
    export WORKER_SERVICE="evolution-worker"
    export FRONTEND_SERVICE="frontend-prod"
    export SA_EMAIL="evolution-worker-sa@${PROJECT_ID}.iam.gserviceaccount.com"

    # Validar DATABASE_URL (Crítica para o Worker)
    if [ -z "$DATABASE_URL" ]; then
        warn "DATABASE_URL não encontrada no ambiente."
        echo -e "${YELLOW}Insira a DATABASE_URL (PostgreSQL):${NC}"
        read -r DATABASE_URL
        export DATABASE_URL
    fi
    
    [ -z "$DATABASE_URL" ] && error "DATABASE_URL é obrigatória para o deploy do Worker."

    # Internal API Key para comunicação Worker <-> Functions
    export INTERNAL_API_KEY="${INTERNAL_API_KEY:-b4you-internal-secret-key-v1}"

    log "Infraestrutura: ${YELLOW}$PROJECT_ID ($REGION)${NC}"
    log "Evolution API: ${YELLOW}$EVOLUTION_API_URL${NC}"
}

# ==============================================================================
# 2. DEPLOY FIREBASE (RULES & INDEXES)
# ==============================================================================
deploy_infra() {
    info "Fazendo deploy da infraestrutura Firebase..."
    
    log "Deploying Security Rules (Firestore & Storage)..."
    firebase deploy --only firestore:rules,storage --project "$PROJECT_ID" || error "Falha no deploy de regras."
    
    log "Deploying Firestore Indexes..."
    firebase deploy --only firestore:indexes --project "$PROJECT_ID" || warn "Falha ao criar índices (pode ser ignorado se não houver mudanças)."
    
    success "Infraestrutura Firebase atualizada."
}

# ==============================================================================
# 3. DEPLOY WORKER (CLOUD RUN)
# ==============================================================================
deploy_worker() {
    info "Iniciando deploy do Backend Worker..."
    
    cd apps/backend-worker
    log "Instalando dependências e compilando..."
    npm install && npm run build || error "Falha no build do Worker."
    cd ../..

    log "Fazendo deploy no Cloud Run: $WORKER_SERVICE..."
    gcloud run deploy "$WORKER_SERVICE" \
        --source ./apps/backend-worker \
        --region "$REGION" \
        --project "$PROJECT_ID" \
        --service-account "$SA_EMAIL" \
        --memory 2Gi \
        --cpu 1 \
        --min-instances 0 \
        --max-instances 20 \
        --concurrency 80 \
        --timeout 3600 \
        --allow-unauthenticated \
        --set-env-vars "GCP_PROJECT=$PROJECT_ID,GCP_REGION=$REGION,DATABASE_URL=$DATABASE_URL,EVOLUTION_API_URL=$EVOLUTION_API_URL,EVOLUTION_APIKEY=$EVOLUTION_APIKEY,EVOLUTION_GLOBAL_KEY=$EVOLUTION_GLOBAL_KEY,INTERNAL_API_KEY=$INTERNAL_API_KEY,NODE_ENV=production,LOG_LEVEL=INFO" \
        --quiet

    # Capturar URL e configurar auto-referência
    WORKER_URL=$(gcloud run services describe "$WORKER_SERVICE" --region "$REGION" --project "$PROJECT_ID" --format='value(status.url)')
    
    gcloud run services update "$WORKER_SERVICE" \
        --region "$REGION" \
        --project "$PROJECT_ID" \
        --set-env-vars "WORKER_URL=$WORKER_URL,CLOUD_TASKS_QUEUE=evolution-sync,CLOUD_TASKS_MEDIA_QUEUE=evolution-media" \
        --quiet

    success "Worker rodando em: $WORKER_URL"
}

# ==============================================================================
# 4. DEPLOY FUNCTIONS
# ==============================================================================
deploy_functions() {
    info "Iniciando deploy das Cloud Functions..."
    
    # Capturar URL do Worker para as functions
    WORKER_URL=$(gcloud run services describe "$WORKER_SERVICE" --region "$REGION" --project "$PROJECT_ID" --format='value(status.url)' 2>/dev/null || echo "")

    cd apps/functions
    
    log "Gerando arquivo de ambiente de produção..."
    cat <<EOF > .env.production
WORKER_URL=$WORKER_URL
EVOLUTION_API_URL=$EVOLUTION_API_URL
EVOLUTION_APIKEY=$EVOLUTION_APIKEY
EVOLUTION_GLOBAL_KEY=$EVOLUTION_GLOBAL_KEY
INTERNAL_API_KEY=$INTERNAL_API_KEY
EOF

    log "Compilando TypeScript..."
    npm install && npm run build || error "Falha no build das Functions."
    
    log "Enviando para o Firebase..."
    firebase deploy --only functions --project "$PROJECT_ID" || error "Falha no deploy das Functions."
    
    cd ../..
    success "Cloud Functions implantadas com sucesso."
}

# ==============================================================================
# 5. DEPLOY FRONTEND (CLOUD RUN)
# ==============================================================================
deploy_frontend() {
    info "Iniciando deploy do Frontend (React/Vite)..."
    
    if [ ! -d "apps/frontend" ]; then
        error "Diretório 'apps/frontend' não encontrado. Certifique-se de que o repositório foi clonado."
    fi

    cd apps/frontend
    
    log "Construindo imagem via Cloud Build..."
    gcloud builds submit --tag gcr.io/$PROJECT_ID/$FRONTEND_SERVICE . || error "Falha no Cloud Build do Frontend."

    log "Implantando no Cloud Run..."
    gcloud run deploy "$FRONTEND_SERVICE" \
        --image gcr.io/$PROJECT_ID/$FRONTEND_SERVICE \
        --platform managed \
        --region "$REGION" \
        --project "$PROJECT_ID" \
        --allow-unauthenticated \
        --port 8080 \
        --set-env-vars "VITE_API_URL=$EVOLUTION_API_URL" \
        --quiet

    FRONTEND_URL=$(gcloud run services describe "$FRONTEND_SERVICE" --region "$REGION" --project "$PROJECT_ID" --format='value(status.url)')
    
    cd ..
    success "Frontend implantado em: $FRONTEND_URL"
}

# ==============================================================================
# 6. MANUTENÇÃO (CLEANUP)
# ==============================================================================
cleanup_queues() {
    highlight "Deseja limpar as filas do Cloud Tasks antes de continuar? (y/N)"
    read -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log "Limpando filas de sincronização e mídia..."
        gcloud tasks queues purge evolution-sync --location="$REGION" --quiet || warn "Fila evolution-sync não pôde ser limpa."
        gcloud tasks queues purge evolution-media --location="$REGION" --quiet || warn "Fila evolution-media não pôde ser limpa."
        success "Filas limpas."
    fi
}

# ==============================================================================
# MENU INTERATIVO
# ==============================================================================
show_menu() {
    echo -e "\n${MAGENTA}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║         B4YOU HUB - SISTEMA DE DEPLOY UNIFICADO           ║${NC}"
    echo -e "${MAGENTA}╠═══════════════════════════════════════════════════════════╣${NC}"
    echo -e "${MAGENTA}║  1) ${GREEN}Deploy Completo${NC} (Tudo em sequência)               ║"
    echo -e "${MAGENTA}║  2) ${CYAN}Infraestrutura${NC} (Regras e Índices Firestore)      ║"
    echo -e "${MAGENTA}║  3) ${CYAN}Backend Worker${NC} (Cloud Run)                      ║"
    echo -e "${MAGENTA}║  4) ${CYAN}Backend Functions${NC} (Firebase)                     ║"
    echo -e "${MAGENTA}║  5) ${CYAN}Frontend Web${NC} (React/Vite)                      ║"
    echo -e "${MAGENTA}║  6) ${YELLOW}Limpar Filas${NC} (Cloud Tasks Purge)                ║"
    echo -e "${MAGENTA}║  0) ${RED}Sair${NC}                                            ║"
    echo -e "${MAGENTA}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo -n "Escolha uma opção: "
}

# ==============================================================================
# MAIN EXECUTION
# ==============================================================================
main() {
    check_deps
    setup_env

    if [ -n "$1" ]; then
        option=$1
    else
        show_menu
        read option
    fi

    case $option in
        1)
            cleanup_queues
            deploy_infra
            deploy_worker
            deploy_functions
            deploy_frontend
            ;;
        2)
            deploy_infra
            ;;
        3)
            deploy_worker
            ;;
        4)
            deploy_functions
            ;;
        5)
            deploy_frontend
            ;;
        6)
            cleanup_queues
            ;;
        0)
            log "Saindo..."
            exit 0
            ;;
        *)
            error "Opção inválida: $option"
            ;;
    esac

    echo -e "\n${GREEN}======================================================${NC}"
    echo -e "${GREEN}        OPERAÇÃO CONCLUÍDA COM SUCESSO!               ${NC}"
    echo -e "${GREEN}======================================================${NC}"
}

main "$@"
