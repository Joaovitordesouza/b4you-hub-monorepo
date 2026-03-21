#!/bash/bin
# Script de Reset e Redeploy Clean para Evolution API

echo "--- Iniciando Protocolo de Limpeza e Redeploy ---"

# 1. Parar todos os containers
echo "[1/5] Parando containers..."
docker compose down

# 2. Limpar instâncias corrompidas do volume local (se houver mapeamento direto)
echo "[2/5] Limpando arquivos de sessão locais..."
sudo rm -rf ./instances/*

# 3. Subir versão limpa
echo "[3/5] Subindo nova versão do Evolution API..."
docker compose up -d

# 4. Limpar cache do Redis
echo "[4/5] Zerando cache do Redis..."
# Aguarda 5 segundos para o redis subir antes de limpar
sleep 5
docker exec -it user-redis-1 redis-cli flushall || docker exec -it deploy-evolution-vm-redis-1 redis-cli flushall

# 5. Acompanhar logs
echo "[5/5] Iniciando acompanhamento de logs do boot limpo..."
docker logs -f user-evolution-api-1 || docker logs -f deploy-evolution-vm-evolution-api-1
