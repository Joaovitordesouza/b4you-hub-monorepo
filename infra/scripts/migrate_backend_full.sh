#!/bin/bash
set -e

# Configurações
PROJECT_ID="b4you-hub"
OLD_REGION="southamerica-east1"
NEW_REGION="us-central1"
WORKER_SERVICE="evolution-worker"

echo "========================================================"
echo "🚀 MIGRATION PROTOCOL: MOVING TO US-CENTRAL1"
echo "========================================================"
echo "Project: $PROJECT_ID"
echo "From:    $OLD_REGION"
echo "To:      $NEW_REGION"
echo "========================================================"

# 1. Limpeza da Infraestrutura Antiga
echo ""
echo "🧹 [1/3] Cleaning up old infrastructure in $OLD_REGION..."

# Deletar Cloud Functions antigas
# Listar funções na região antiga e deletar (simplificado: tenta deletar as conhecidas)
FUNCTIONS_TO_DELETE=(
    "importProducers"
    "evolutionWebhookReceiver"
    "onOutboxCreate"
    "onOutboxRetry"
    "syncInstanceHistory"
    "deepSyncInstance"
    "manageInstances"
    "sendMessage"
    "deleteMessage"
    "editMessage"
    "onMigrationDeleted"
    "listKiwifyCourses"
)

echo "   -> Removing old Cloud Functions..."
for func in "${FUNCTIONS_TO_DELETE[@]}"; do
    echo "      Deleting $func($OLD_REGION)..."
    # O comando retorna erro se não existir, então usamos || true para continuar
    firebase functions:delete "$func" --region "$OLD_REGION" --force --project "$PROJECT_ID" || true
done

# Deletar Cloud Run Worker antigo
echo "   -> Removing old Cloud Run Worker..."
gcloud run services delete "$WORKER_SERVICE" \
    --region "$OLD_REGION" \
    --project "$PROJECT_ID" \
    --quiet || echo "      Service $WORKER_SERVICE not found in $OLD_REGION (skip)."

# 2. Deploy da Nova Infraestrutura (Worker)
echo ""
echo "🏗️ [2/3] Deploying Cloud Run Worker to $NEW_REGION..."
chmod +x ./deploy_hybrid_infra.sh
./deploy_hybrid_infra.sh

# 3. Deploy da Nova Infraestrutura (Functions)
echo ""
echo "⚡ [3/3] Deploying Cloud Functions to $NEW_REGION..."
cd apps/functions
npm run build
firebase deploy --only functions --project "$PROJECT_ID"

echo ""
echo "========================================================"
echo "✅ MIGRATION COMPLETED SUCCESSFULLY!"
echo "========================================================"
echo "⚠️  ACTION REQUIRED:"
echo "1. Verify the 'Worker URL' output above from deploy_hybrid_infra.sh."
echo "2. Check apps/functions/.env.production and update WORKER_URL if it differs."
echo "3. Test the Evolution API integration."
echo "========================================================"
