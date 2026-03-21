#!/bin/bash

# Este script corrige a Subscription do Pub/Sub para apontar para o Worker correto
# Serviço: 'worker' (não 'evolution-worker')

PROJECT_ID="b4you-hub"
REGION="us-central1"
TOPIC_NAME="evolution-events"
SUB_NAME="${TOPIC_NAME}-push"
SERVICE_NAME="worker"

echo "🔧 Corrigindo Subscription do Pub/Sub..."

# 1. Obter URL do Worker correto
echo "☁️  Obtendo URL do serviço Cloud Run: $SERVICE_NAME..."
WORKER_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --project $PROJECT_ID --format='value(status.url)')

if [ -z "$WORKER_URL" ]; then
    echo "❌ Erro: Não foi possível encontrar o serviço '$SERVICE_NAME'. Verifique se o deploy foi feito."
    exit 1
fi

echo "✅ URL do Worker encontrada: $WORKER_URL"

# 2. Atualizar Subscription
echo "🔗 Atualizando Endpoint da Subscription '$SUB_NAME'..."
TARGET_URL="${WORKER_URL}/events/process"

gcloud pubsub subscriptions update $SUB_NAME \
    --push-endpoint="$TARGET_URL" \
    --project=$PROJECT_ID

echo "✅ Sucesso! A Subscription agora aponta para: $TARGET_URL"
echo "🚀 O fluxo de eventos deve funcionar agora."
