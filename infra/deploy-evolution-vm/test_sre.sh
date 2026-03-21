#!/bin/bash
# SRE Test Stress Script (Curl Version)

BASE_URL="http://localhost:8080"
INSTANCE_NAME="debug_final"

echo "--- Iniciando Teste de Estresse: $INSTANCE_NAME ---"

# Recuperar API Key
API_KEY=$(grep AUTHENTICATION_API_KEY ~/deploy-evolution-vm/.env | cut -d'=' -f2 | tr -d '\r')

if [ -z "$API_KEY" ]; then
    echo "ERRO: API Key não encontrada."
    exit 1
fi

# 1. Criar Instância
echo "[1/3] Criando instância $INSTANCE_NAME..."
CREATE_RESP=$(curl -s -X POST "$BASE_URL/instance/create" \
     -H "apikey: $API_KEY" \
     -H "Content-Type: application/json" \
     -d "{\"instanceName\": \"$INSTANCE_NAME\", \"qrcode\": true}")

echo "Resposta Create: $CREATE_RESP"

# 2. Delay Técnico
echo "[2/3] Aguardando 5 segundos para estabilização..."
sleep 5

# 3. Tentar recuperar QR Code com Polling Resiliente
echo "[3/3] Recuperando QR Code via /instance/connect (com polling)..."
MAX_RETRIES=5
RETRY_COUNT=0
SUCCESS=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    CONNECT_RESP=$(curl -s -X GET "$BASE_URL/instance/connect/$INSTANCE_NAME" \
         -H "apikey: $API_KEY")
    
    if [[ $CONNECT_RESP == *"base64"* ]]; then
        echo -e "\nSUCESSO: QR CODE GERADO EM BASE64 (Tentativa $((RETRY_COUNT+1)))!"
        SUCCESS=1
        break
    else
        echo "Aguardando QR Code... (Tentativa $((RETRY_COUNT+1)))"
        sleep 5
        RETRY_COUNT=$((RETRY_COUNT+1))
    fi
done

if [ $SUCCESS -eq 0 ]; then
    echo -e "\nFALHA FINAL: QR Code não gerado após retries."
    echo "Última Resposta: $CONNECT_RESP"
    echo -e "\n--- LOGS DO CONTAINER ---"
    sudo docker logs --tail 50 user-evolution-api-1
fi
