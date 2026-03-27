#!/bin/bash
set -e

# Forçar a execução a partir da raiz do monorepo
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR/../.."

# ==============================================================================
# B4YOU HUB - SISTEMA DE DEPLOY INTELIGENTE (V3)
# ==============================================================================
# Descrição: Script interativo definitivo para gerenciar a arquitetura.
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
# 0. CHECAGEM DE REQUISITOS
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
        highlight "Deseja mudar automaticamente para 'b4you-hub'? (y/N)"
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
    
    export PROJECT_ID="b4you-hub"
    export REGION="us-central1"
    export EVOLUTION_API_URL="https://evolution-api-4b7h.srv1506962.hstgr.cloud"
    export EVOLUTION_APIKEY="ksfghdopsmkxcjfgkspcbnigodkgnjskfgmll"
    export EVOLUTION_GLOBAL_KEY="ksfghdopsmkxcjfgkspcbnigodkgnjskfgmll"
    
    if [ -f "apps/functions/.env" ]; then
        log "Carregando variáveis de apps/functions/.env..."
        export $(grep -v '^#' apps/functions/.env | xargs)
    fi

    export WORKER_SERVICE="evolution-worker"
    export FRONTEND_SERVICE="frontend-prod"
    export CERT_SERVICE="certificate-generator"
    export SA_EMAIL="evolution-worker-sa@${PROJECT_ID}.iam.gserviceaccount.com"
    export INTERNAL_API_KEY="${INTERNAL_API_KEY:-b4you-internal-secret-key-v1}"
    
    # Se o banco for exigido posteriormente, a função pedirá
}

ensure_database_url() {
    if [ -z "$DATABASE_URL" ]; then
        warn "DATABASE_URL não encontrada no ambiente."
        echo -e "${YELLOW}Insira a DATABASE_URL (PostgreSQL) para o Worker:${NC}"
        read -r DATABASE_URL
        export DATABASE_URL
    fi
    if [ -z "$DATABASE_URL" ]; then
        error "DATABASE_URL é obrigatória para o deploy do Worker."
    fi
}

# ==============================================================================
# 2. FUNÇÕES DE DEPLOY MODULARES
# ==============================================================================

deploy_infra() {
    info "Fazendo deploy da infraestrutura Firebase (Regras e Índices)..."
    firebase deploy --only firestore:rules,storage --project "$PROJECT_ID" || error "Falha no deploy de regras."
    firebase deploy --only firestore:indexes --project "$PROJECT_ID" || warn "Falha ao criar índices."
    success "Infraestrutura Firebase atualizada."
}

deploy_worker() {
    ensure_database_url
    info "Iniciando deploy do Backend Worker (Cloud Run)..."
    
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

    WORKER_URL=$(gcloud run services describe "$WORKER_SERVICE" --region "$REGION" --project "$PROJECT_ID" --format='value(status.url)')
    
    gcloud run services update "$WORKER_SERVICE" \
        --region "$REGION" \
        --project "$PROJECT_ID" \
        --set-env-vars "WORKER_URL=$WORKER_URL,CLOUD_TASKS_QUEUE=evolution-sync,CLOUD_TASKS_MEDIA_QUEUE=evolution-media" \
        --quiet

    success "Worker rodando em: $WORKER_URL"
}

deploy_functions() {
    info "Iniciando deploy das Cloud Functions (Firebase)..."
    
    WORKER_URL=$(gcloud run services describe "$WORKER_SERVICE" --region "$REGION" --project "$PROJECT_ID" --format='value(status.url)' 2>/dev/null || echo "")

    cd apps/functions
    log "Gerando arquivo de ambiente de produção (.env.production)..."
    # Carregar as variáveis do Google do ambiente ou do arquivo atual se existirem
    if [ -f ".env.production" ]; then
        source .env.production
    fi
    
    cat <<EOF > .env.production
WORKER_URL=$WORKER_URL
EVOLUTION_API_URL=$EVOLUTION_API_URL
EVOLUTION_APIKEY=$EVOLUTION_APIKEY
EVOLUTION_GLOBAL_KEY=$EVOLUTION_GLOBAL_KEY
INTERNAL_API_KEY=$INTERNAL_API_KEY
GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=$GOOGLE_REDIRECT_URI
EOF

    log "Compilando TypeScript das Functions..."
    npm install && npm run build || error "Falha no build das Functions."
    
    log "Enviando para o Firebase via CLI..."
    firebase deploy --only functions --project "$PROJECT_ID" || error "Falha no deploy das Functions."
    
    cd ../..
    success "Cloud Functions implantadas com sucesso."
}

deploy_certificate_generator() {
    info "Iniciando deploy do Certificate Generator (Cloud Run)..."
    
    cd apps/certificate-generator
    log "Instalando dependências e compilando..."
    npm install && npm run build || error "Falha no build do Certificate Generator."
    cd ../..

    log "Fazendo deploy no Cloud Run: $CERT_SERVICE..."
    gcloud run deploy "$CERT_SERVICE" \
        --source ./apps/certificate-generator \
        --region "$REGION" \
        --project "$PROJECT_ID" \
        --service-account "$SA_EMAIL" \
        --memory 1Gi \
        --cpu 1 \
        --min-instances 0 \
        --max-instances 5 \
        --allow-unauthenticated \
        --quiet

    CERT_URL=$(gcloud run services describe "$CERT_SERVICE" --region "$REGION" --project "$PROJECT_ID" --format='value(status.url)')
    success "Certificate Generator rodando em: $CERT_URL"
}

deploy_frontend() {
    info "Iniciando deploy do Frontend Web (React/Vite) no Cloud Run..."
    
    if [ ! -d "apps/frontend" ]; then
        error "Diretório 'apps/frontend' não encontrado. Você está na raiz do monorepo?"
    fi

    cd apps/frontend
    
    log "Gerando variáveis de ambiente de produção do Frontend..."
    cat <<EOF > .env.production
VITE_API_URL=$EVOLUTION_API_URL
EOF
    
    cd ../..

    log "Construindo imagem otimizada via Cloud Build (Contexto Monorepo)..."
    # O gcloud builds espera que o arquivo se chame 'Dockerfile' na raiz do contexto
    cp apps/frontend/Dockerfile ./Dockerfile
    gcloud builds submit --tag gcr.io/$PROJECT_ID/$FRONTEND_SERVICE . || { rm -f ./Dockerfile; error "Falha no Cloud Build do Frontend."; }
    rm -f ./Dockerfile

    log "Implantando Service no Cloud Run..."
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
    
    success "Frontend Web implantado em: $FRONTEND_URL"
}

cleanup_queues() {
    highlight "Deseja purgar (esvaziar) as filas do Cloud Tasks antes de continuar? (y/N)"
    read -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log "Limpando fila evolution-sync..."
        gcloud tasks queues purge evolution-sync --location="$REGION" --project="$PROJECT_ID" --quiet || warn "Fila evolution-sync não pôde ser limpa."
        
        log "Limpando fila evolution-media..."
        gcloud tasks queues purge evolution-media --location="$REGION" --project="$PROJECT_ID" --quiet || warn "Fila evolution-media não pôde ser limpa."
        
        success "Filas do Cloud Tasks purgadas."
    else
        log "Operação abortada."
    fi
}

deploy_all() {
    log "Iniciando FLUXO COMPLETO..."
    deploy_infra
    deploy_worker
    deploy_functions
    deploy_certificate_generator
    deploy_frontend
}

deploy_backend_only() {
    log "Iniciando deploy de TODO O BACKEND..."
    deploy_worker
    deploy_functions
}

# ==============================================================================
# 3. MENU INTERATIVO E LAÇO PRINCIPAL
# ==============================================================================

show_menu() {
    clear
    echo -e "${MAGENTA}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║         B4YOU HUB - SISTEMA DE DEPLOY INTELIGENTE         ║${NC}"
    echo -e "${MAGENTA}╠═══════════════════════════════════════════════════════════╣${NC}"
    echo -e "${MAGENTA}║  1) ${GREEN}Deploy Completo${NC} (Infra + Backends + Frontend)       ║"
    echo -e "${MAGENTA}║  2) ${GREEN}Deploy APENAS Servidores${NC} (Worker + Functions)        ║"
    echo -e "${MAGENTA}║  3) ${GREEN}Deploy APENAS Frontend Web${NC} (React/Vite)              ║"
    echo -e "${MAGENTA}║  4) ${CYAN}Deploy Específico:${NC} Somente Worker                    ║"
    echo -e "${MAGENTA}║  5) ${CYAN}Deploy Específico:${NC} Somente Functions                 ║"
    echo -e "${MAGENTA}║  6) ${CYAN}Deploy Específico:${NC} Infraestrutura (Regras)           ║"
    echo -e "${MAGENTA}║  7) ${CYAN}Deploy Específico:${NC} Certificate Generator             ║"
    echo -e "${MAGENTA}║  8) ${YELLOW}Limpar Filas / Purge${NC} (Esvazia Cloud Tasks)           ║"
    echo -e "${MAGENTA}║  0) ${RED}Sair${NC}                                                ║"
    echo -e "${MAGENTA}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo -n -e "${BLUE}Escolha uma opção:${NC} "
}

pause() {
    echo -e "\n${BLUE}======================================================${NC}"
    read -n 1 -s -p "Pressione qualquer tecla para retornar ao menu..."
    echo -e "\n"
}

main() {
    check_deps
    setup_env

    # Se um argumento for passado na CLI, executa só aquilo e sai
    if [ -n "$1" ]; then
        case "$1" in
            1) deploy_all ;;
            2) deploy_backend_only ;;
            3) deploy_frontend ;;
            4) deploy_worker ;;
            5) deploy_functions ;;
            6) deploy_infra ;;
            7) cleanup_queues ;;
            *) error "Opção inválida na linha de comando." ;;
        esac
        exit 0
    fi

    # Loop Infinito de Menu
    while true; do
        show_menu
        read option
        echo ""

        case $option in
            1) deploy_all; pause ;;
            2) deploy_backend_only; pause ;;
            3) deploy_frontend; pause ;;
            4) deploy_worker; pause ;;
            5) deploy_functions; pause ;;
            6) deploy_infra; pause ;;
            7) deploy_certificate_generator; pause ;;
            8) cleanup_queues; pause ;;
            0) success "Sessão encerrada com sucesso 👋"; exit 0 ;;
            *) warn "Opção inválida, tente novamente." ; sleep 1 ;;
        esac
    done
}

main "$@"
