#!/bin/bash
set -e

# ==============================================================================
# DEPLOY MASTER: ELITE ARCHITECTURE V2 (Full Stack)
# ==============================================================================
# Descrição: Script definitivo para provisionamento e atualização da infraestrutura.
# Unifica Backend (Worker, Functions) e Frontend (Cloud Run).
# 
# Menu de Opções:
#   1) Limpar Filas       - Limpa apenas as filas do Cloud Tasks
#   2) Deploy Worker      - Faz deploy apenas do Worker (Cloud Run)
#   3) Deploy Functions   - Faz deploy apenas das Cloud Functions
#   4) Deploy Frontend    - Faz deploy apenas do Frontend (Cloud Run)
#   5) Deploy Completo    - Infra + Worker + Functions + Frontend
# ==============================================================================

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
highlight() { echo -e "${MAGENTA}[ACTION]${NC} $1"; }
info() { echo -e "${CYAN}[STEP]${NC} $1"; }

# ==============================================================================
# 0. PRE-FLIGHT CHECKS
# ==============================================================================
check_deps() {
    log "Verificando dependências..."
    command -v gcloud >/dev/null 2>&1 || error "gcloud CLI não instalado."
    command -v firebase >/dev/null 2>&1 || error "firebase CLI não instalado."
    command -v npm >/dev/null 2>&1 || error "npm não instalado."
    command -v node >/dev/null 2>&1 || error "node não instalado."
    
    # Verificar se o usuário está autenticado no gcloud
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
        error "Nenhuma conta gcloud ativa. Execute 'gcloud auth login'."
    fi
    success "Dependências e Autenticação OK."
}

# ==============================================================================
# 1. SETUP DE VARIÁVEIS E AMBIENTE
# ==============================================================================

setup_context() {
  log "Configurando contexto do deploy..."
  
  # Carregar .env se existir (Prioridade)
  if [ -f "apps/functions/.env" ]; then
    log "Carregando variáveis de apps/functions/.env..."
    export $(grep -v '^#' apps/functions/.env | xargs)
  fi

  # Variáveis de Infraestrutura (Defaults)
  export PROJECT_ID="${PROJECT_ID:-b4you-hub-prodv1}"
  export REGION="${REGION:-us-central1}"
  export WORKER_SERVICE="evolution-worker"
  export FRONTEND_SERVICE="frontend-prod"
  export QUEUE_NAME="${CLOUD_TASKS_QUEUE:-evolution-sync}"
  export MEDIA_QUEUE_NAME="${CLOUD_TASKS_MEDIA_QUEUE:-evolution-media}"
  export SA_NAME="evolution-worker-sa"
  export TOPIC_NAME="evolution-events"
  export SUB_NAME="evolution-events-push"

  # Evolution API (Defaults)
  export EVOLUTION_API_URL="${EVOLUTION_API_URL:-https://evolution-api-4b7h.srv1506962.hstgr.cloud/}"
  export EVOLUTION_APIKEY="${EVOLUTION_APIKEY:-ksfghdopsmkxcjfgkspcbnigodkgnjskfgmll}"
  export EVOLUTION_GLOBAL_KEY="${EVOLUTION_GLOBAL_KEY:-ksfghdopsmkxcjfgkspcbnigodkgnjskfgmll}"

  export SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

  log "Projeto: ${YELLOW}$PROJECT_ID${NC}"
  log "Região: ${YELLOW}$REGION${NC}"
  log "Service Account: ${YELLOW}$SA_EMAIL${NC}"
  log "Evolution API URL: ${YELLOW}$EVOLUTION_API_URL${NC}"

  # Prompt para Variáveis Sensíveis (Se não carregadas do .env e não definidas)
  if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}Insira a DATABASE_URL (PostgreSQL):${NC}"
    read -r DATABASE_URL
    export DATABASE_URL
  fi

  if [ -z "$DATABASE_URL" ]; then
      error "FATAL: DATABASE_URL é obrigatória."
  fi
  
  if [ -z "$INTERNAL_API_KEY" ]; then
    export INTERNAL_API_KEY="b4you-internal-secret-key-v1"
  fi
  
  export DB_POOL_MAX="${DB_POOL_MAX:-5}"
}

# ==============================================================================
# 2. LIMPEZA DE DADOS DE TESTE (OPTIONAL)
# ==============================================================================

cleanup_queues() {
    highlight "Deseja realizar o PURGE (limpeza) das filas do Cloud Tasks? (y/N)"
    read -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log "Limpando fila $QUEUE_NAME..."
        gcloud tasks queues purge "$QUEUE_NAME" --location="$REGION" --project="$PROJECT_ID" --quiet || warn "Falha ao limpar $QUEUE_NAME"
        log "Limpando fila $MEDIA_QUEUE_NAME..."
        gcloud tasks queues purge "$MEDIA_QUEUE_NAME" --location="$REGION" --project="$PROJECT_ID" --quiet || warn "Falha ao limpar $MEDIA_QUEUE_NAME"
        success "Filas limpas."
    else
        log "Pulando limpeza de filas."
    fi
}

# ==============================================================================
# 3. INFRAESTRUTURA BASE (IAM & APIS)
# ==============================================================================

setup_infra() {
  log "Habilitando APIs e Configurando IAM..."
  
  gcloud services enable \
    run.googleapis.com \
    cloudtasks.googleapis.com \
    firestore.googleapis.com \
    cloudbuild.googleapis.com \
    iam.googleapis.com \
    pubsub.googleapis.com \
    storage.googleapis.com \
    --project "$PROJECT_ID" --quiet

  # Criar Service Account
  if ! gcloud iam service-accounts describe "$SA_EMAIL" --project="$PROJECT_ID" &>/dev/null; then
    log "Criando Service Account '$SA_NAME'..."
    gcloud iam service-accounts create "$SA_NAME" --display-name "Evolution Worker SA" --project="$PROJECT_ID"
  fi

  # Permissões Granulares
  log "Atribuindo permissões IAM..."
  local roles=(
    "roles/cloudtasks.enqueuer" 
    "roles/datastore.user" 
    "roles/logging.logWriter" 
    "roles/run.invoker" 
    "roles/pubsub.publisher" 
    "roles/pubsub.subscriber" 
    "roles/iam.serviceAccountTokenCreator"
    "roles/storage.objectAdmin"
  )
  
  for role in "${roles[@]}"; do
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
      --member="serviceAccount:$SA_EMAIL" \
      --role="$role" --quiet >/dev/null
  done
  
  success "Infraestrutura Base OK."
}

# ==============================================================================
# 4. MENSAGERIA (CLOUD TASKS & PUBSUB)
# ==============================================================================

setup_messaging() {
  log "Configurando Mensageria..."

  # Cloud Tasks (Sync Queue)
  if ! gcloud tasks queues describe "$QUEUE_NAME" --location="$REGION" --project="$PROJECT_ID" &>/dev/null; then
    log "Criando fila Cloud Tasks '$QUEUE_NAME'..."
    gcloud tasks queues create "$QUEUE_NAME" \
      --location="$REGION" \
      --project="$PROJECT_ID" \
      --max-dispatches-per-second=20 \
      --max-concurrent-dispatches=50
  fi

  # Cloud Tasks (Media Queue)
  if ! gcloud tasks queues describe "$MEDIA_QUEUE_NAME" --location="$REGION" --project="$PROJECT_ID" &>/dev/null; then
    log "Criando fila Cloud Tasks '$MEDIA_QUEUE_NAME'..."
    gcloud tasks queues create "$MEDIA_QUEUE_NAME" \
      --location="$REGION" \
      --project="$PROJECT_ID" \
      --max-dispatches-per-second=20 \
      --max-concurrent-dispatches=20
  fi

  # Pub/Sub (Topic)
  if ! gcloud pubsub topics describe "$TOPIC_NAME" --project="$PROJECT_ID" &>/dev/null; then
    log "Criando tópico Pub/Sub '$TOPIC_NAME'..."
    gcloud pubsub topics create "$TOPIC_NAME" --project="$PROJECT_ID"
  fi
}

# ==============================================================================
# 5. DEPLOY WORKER (CLOUD RUN)
# ==============================================================================

deploy_worker() {
  log "Compilando e Fazendo Deploy do Worker (Cloud Run)..."

  cd apps/backend-worker
  npm install
  npm run build || error "Falha no build do Worker."
  cd ../..

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
    --set-env-vars "GCP_PROJECT=$PROJECT_ID,GCP_REGION=$REGION,DATABASE_URL=$DATABASE_URL,DB_POOL_MAX=$DB_POOL_MAX,EVOLUTION_API_URL=$EVOLUTION_API_URL,EVOLUTION_APIKEY=$EVOLUTION_APIKEY,LOG_LEVEL=INFO,NODE_ENV=production,EVOLUTION_GLOBAL_KEY=$EVOLUTION_GLOBAL_KEY,INTERNAL_API_KEY=$INTERNAL_API_KEY,SERVICE_ACCOUNT_EMAIL=$SA_EMAIL"

  export WORKER_URL=$(gcloud run services describe "$WORKER_SERVICE" --region "$REGION" --project "$PROJECT_ID" --format='value(status.url)')
  
  if [ -z "$WORKER_URL" ]; then
      error "Falha ao obter URL do Worker."
  fi

  log "Configurando Auto-Referência (WORKER_URL=$WORKER_URL)..."

  gcloud run services update "$WORKER_SERVICE" \
    --region "$REGION" \
    --project "$PROJECT_ID" \
    --set-env-vars "WORKER_URL=$WORKER_URL,CLOUD_TASKS_QUEUE=$QUEUE_NAME,CLOUD_TASKS_MEDIA_QUEUE=$MEDIA_QUEUE_NAME,GCP_PROJECT=$PROJECT_ID,GCP_REGION=$REGION,DATABASE_URL=$DATABASE_URL,DB_POOL_MAX=$DB_POOL_MAX,EVOLUTION_API_URL=$EVOLUTION_API_URL,EVOLUTION_APIKEY=$EVOLUTION_APIKEY,LOG_LEVEL=INFO,NODE_ENV=production,EVOLUTION_GLOBAL_KEY=$EVOLUTION_GLOBAL_KEY,INTERNAL_API_KEY=$INTERNAL_API_KEY,SERVICE_ACCOUNT_EMAIL=$SA_EMAIL" \
    --quiet

  success "Worker Configurado: $WORKER_URL"
}

# ==============================================================================
# 6. DEPLOY FRONTEND (CLOUD RUN)
# ==============================================================================

deploy_frontend() {
    info "Iniciando deploy do Frontend (React/Vite)..."
    
    if [ ! -d "apps/frontend" ]; then
        error "Diretório 'apps/frontend' não encontrado."
    fi

    cd apps/frontend
    
    log "Construindo imagem via Cloud Build..."
    gcloud builds submit --tag gcr.io/$PROJECT_ID/$FRONTEND_SERVICE . --project "$PROJECT_ID" || error "Falha no Cloud Build do Frontend."

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
    
    cd ../..
    success "Frontend implantado em: $FRONTEND_URL"
}

# ==============================================================================
# 7. CONFIGURAÇÃO DE ASSINATURA PUBSUB
# ==============================================================================

setup_subscription() {
  log "Configurando Subscription do Pub/Sub..."
  local push_endpoint="${WORKER_URL}/events/process"
  
  if gcloud pubsub subscriptions describe "$SUB_NAME" --project="$PROJECT_ID" &>/dev/null; then
    gcloud pubsub subscriptions update "$SUB_NAME" \
      --push-endpoint="$push_endpoint" \
      --push-auth-service-account="$SA_EMAIL" \
      --ack-deadline=600 \
      --project="$PROJECT_ID" --quiet
  else
    gcloud pubsub subscriptions create "$SUB_NAME" \
      --topic "$TOPIC_NAME" \
      --push-endpoint="$push_endpoint" \
      --push-auth-service-account="$SA_EMAIL" \
      --ack-deadline=600 \
      --project="$PROJECT_ID" --quiet
  fi
}

# ==============================================================================
# 8. DEPLOY FUNCTIONS (CLOUD FUNCTIONS)
# ==============================================================================

deploy_functions() {
  info "Fazendo deploy das Cloud Functions..."
  
  log "Deploying Firestore/Storage Rules..."
  # Tenta usar o token se definido
  if [ -n "$FIREBASE_TOKEN" ]; then
      firebase deploy --only firestore:rules,storage --project "$PROJECT_ID" --token "$FIREBASE_TOKEN" || error "FALHA ao fazer deploy das regras"
  else
      firebase deploy --only firestore:rules,storage --project "$PROJECT_ID" || error "FALHA ao fazer deploy das regras (falta auth?)"
  fi
  
  cd apps/functions
  rm -rf lib
  npm install
  npm run build || error "Falha no build das Functions."

  log "Criando arquivo de ambiente..."
  cat <<EOF > .env.production
WORKER_URL=$WORKER_URL
EVOLUTION_API_URL=$EVOLUTION_API_URL
EVOLUTION_APIKEY=$EVOLUTION_APIKEY
EVOLUTION_GLOBAL_KEY=$EVOLUTION_GLOBAL_KEY
INTERNAL_API_KEY=$INTERNAL_API_KEY
EOF

  log "Deploying Functions..."
  
  # Forçar refresh
  rm -rf lib node_modules/.cache
  npm install
  npm run build
  touch .env.production

  if [ -n "$FIREBASE_TOKEN" ]; then
      firebase deploy --only functions --project "$PROJECT_ID" --force --token "$FIREBASE_TOKEN" || error "FALHA no deploy das Cloud Functions"
  else
      firebase deploy --only functions --project "$PROJECT_ID" --force || error "FALHA no deploy das Cloud Functions"
  fi
  
  cd ../..
  success "Cloud Functions deployed!"
}

# ==============================================================================
# MENU & RUNNERS
# ==============================================================================

run_deploy_full() {
  echo -e "${BLUE}======================================================${NC}"
  echo -e "${CYAN}           DEPLOY FULL STACK (V2)                    ${NC}"
  echo -e "${BLUE}======================================================${NC}"
  
  check_deps
  setup_context
  setup_infra
  setup_messaging
  deploy_worker
  setup_subscription
  deploy_functions
  deploy_frontend
  
  echo -e "${BLUE}======================================================${NC}"
  echo -e "${GREEN}   SISTEMA PRONTO PARA PRODUÇÃO!   ${NC}"
  echo -e "${BLUE}======================================================${NC}"
}

show_menu() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║         MENU DE DEPLOY - B4YOU HUB                     ║${NC}"
    echo -e "${BLUE}╠═══════════════════════════════════════════════════════════╣${NC}"
    echo -e "${BLUE}║  1) ${GREEN}Limpar Filas${BLUE}        - Purge Cloud Tasks            ║${NC}"
    echo -e "${BLUE}║  2) ${GREEN}Deploy Worker${BLUE}       - Backend Cloud Run            ║${NC}"
    echo -e "${BLUE}║  3) ${GREEN}Deploy Functions${BLUE}    - Firebase Cloud Functions     ║${NC}"
    echo -e "${BLUE}║  4) ${GREEN}Deploy Frontend${BLUE}     - Web App (Cloud Run)          ║${NC}"
    echo -e "${BLUE}║  5) ${GREEN}Deploy Completo${BLUE}     - Full Stack                   ║${NC}"
    echo -e "${BLUE}║  0) ${RED}Sair${BLUE}              - Exit                         ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

main() {
  if [ $# -gt 0 ]; then
    case "$1" in
      1) check_deps; setup_context; cleanup_queues ;;
      2) check_deps; setup_context; deploy_worker; setup_subscription ;;
      3) check_deps; setup_context; 
         export WORKER_URL=$(gcloud run services describe "$WORKER_SERVICE" --region "$REGION" --project "$PROJECT_ID" --format='value(status.url)' 2>/dev/null)
         deploy_functions ;;
      4) check_deps; setup_context; deploy_frontend ;;
      5) run_deploy_full ;;
      *) echo "Opção inválida"; exit 1 ;;
    esac
    return
  fi

  while true; do
    show_menu
    read -n 1 -p "Opção: " option
    echo ""
    case $option in
      1) check_deps; setup_context; cleanup_queues ;;
      2) check_deps; setup_context; deploy_worker; setup_subscription ;;
      3) check_deps; setup_context; 
         export WORKER_URL=$(gcloud run services describe "$WORKER_SERVICE" --region "$REGION" --project "$PROJECT_ID" --format='value(status.url)' 2>/dev/null)
         deploy_functions ;;
      4) check_deps; setup_context; deploy_frontend ;;
      5) run_deploy_full ;;
      0) exit 0 ;;
      *) echo "Inválido" ;;
    esac
    echo ""
    read -n 1 -p "Continue..."
  done
}

main "$@"
