#!/bin/bash
set -e

# Configurações Oficiais (VPC e IAM corrigidos)
PROJECT_ID="b4youhub-483504"
REGION="southamerica-east1"
CONNECTOR="evolution-fix"
REDIS_IP="10.162.82.171"
REDIS_PORT="6379"

echo "========================================================"
echo "Deploy da Evolution API v2 no Cloud Run (VPC + Redis + High Mem)"
echo "========================================================"
echo "VPC Connector: $CONNECTOR"
echo "Redis Target: $REDIS_IP:$REDIS_PORT"
echo "Resources: 2 CPU / 4GB RAM"
echo "--------------------------------------------------------"

# Deploy Cloud Run
# 1. Aumentamos CPU e Memória para suportar o Chrome interno.
# 2. Ativamos o Redis para persistência de sessões.
# 3. Timeout estendido para 600s para evitar falha no startup inicial.
# 4. FIX: Versão do WhatsApp Web fixada para evitar erro de WebSocket/QR Code

echo "Iniciando Deploy Otimizado..."
gcloud run deploy evolution-api \
  --image=atendai/evolution-api:v1.8.2 \
  --region=$REGION \
  --project=$PROJECT_ID \
  --allow-unauthenticated \
  --port=8080 \
  --cpu=2 \
  --memory=4Gi \
  --timeout=600 \
  --vpc-connector=$CONNECTOR \
  --vpc-egress=all-traffic \
  --set-env-vars="SERVER_PORT=8080,SERVER_TYPE=http,CACHE_REDIS_ENABLED=true,CACHE_REDIS_URI=redis://${REDIS_IP}:${REDIS_PORT},DATABASE_SAVE_DATA_INSTANCE=false,DATABASE_SAVE_DATA_NEW_MESSAGE=false,WEBSOCKET_ENABLED=false,CONFIG_SESSION_PHONE_VERSION=2.3000.1015901307" \
  --set-secrets="AUTHENTICATION_API_KEY=EVOLUTION_API_KEY:latest,SESSION_SECRET_KEY=EVOLUTION_SESSION_KEY:latest"

echo "========================================================"
echo "Deploy Finalizado!"
echo "URL: https://evolution-api-585632476640.southamerica-east1.run.app"
echo "========================================================"
