#!/bin/bash
# SRE Deep Clean Script

echo "--- PASSO 1: Operação de Limpeza Profunda ---"

# 1. Parar containers
echo "Parando containers..."
sudo docker compose -f ~/docker-compose.yml down

# 2. Limpeza física de volumes e pastas
echo "Removendo rastro de instâncias corrompidas..."
sudo rm -rf ./deploy-evolution-vm/instances/*
# Garante limpeza de volumes docker órfãos se necessário
docker volume rm deploy-evolution-vm_evolution_instances deploy-evolution-vm_evolution_store deploy-evolution-vm_redis_data 2>/dev/null || true

# 3. Subir apenas o Redis para flush
echo "Subindo Redis para limpeza..."
sudo docker compose -f ~/docker-compose.yml up -d redis

# 4. Limpar Redis
echo "Limpando cache do Redis..."
sleep 5
REDIS_CONTAINER=$(sudo docker ps --filter "name=redis" --format "{{.Names}}")
if [ -z "$REDIS_CONTAINER" ]; then
    echo "ERRO: Container Redis não encontrado."
else
    # Removendo -it para evitar erro de tty no ssh
    RESULT=$(sudo docker exec $REDIS_CONTAINER redis-cli flushall)
    echo "Resultado do Redis: $RESULT"
fi

echo "--- Fase 1 Concluída. Aguardando verificação do 'OK' do Redis ---"
