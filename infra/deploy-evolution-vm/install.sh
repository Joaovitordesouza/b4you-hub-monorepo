#!/bin/bash

# Cores para logs
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${GREEN}>>> Iniciando Instalação da Evolution API (VM Mode)...${NC}"

# 1. Update System
echo -e "${GREEN}>>> Atualizando sistema...${NC}"
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git unzip apt-transport-https ca-certificates gnupg lsb-release nginx certbot python3-certbot-nginx

# 2. Install Docker
if ! command -v docker &> /dev/null; then
    echo -e "${GREEN}>>> Instalando Docker...${NC}"
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
else
    echo -e "${GREEN}>>> Docker já instalado.${NC}"
fi

# 3. Setup Nginx & Domain
echo -e "${GREEN}>>> Configurando Domínio e SSL...${NC}"
PUBLIC_IP=$(curl -s ifconfig.me)
DOMAIN="${PUBLIC_IP}.nip.io"
echo "Public IP: $PUBLIC_IP"
echo "Domain: $DOMAIN"

# Copia configuração do Nginx
sudo cp evolution.conf /etc/nginx/sites-available/evolution
sudo sed -i "s/server_name _;/server_name $DOMAIN;/g" /etc/nginx/sites-available/evolution

# Ativa site
sudo ln -sf /etc/nginx/sites-available/evolution /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# 4. SSL (Certbot)
echo -e "${GREEN}>>> Gerando Certificado SSL (Let's Encrypt)...${NC}"
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN --redirect

# 5. Update .env
echo -e "${GREEN}>>> Configurando .env...${NC}"
if [ ! -f .env ]; then
    cp .env.example .env
fi
# Atualiza SERVER_URL com o domínio gerado
sed -i "s|SERVER_URL=.*|SERVER_URL=https://$DOMAIN|g" .env

# 6. Start Services
echo -e "${GREEN}>>> Iniciando Evolution API...${NC}"
sudo docker compose up -d

echo -e "${GREEN}>>> Instalação Concluída!${NC}"
echo -e "${GREEN}>>> API URL: https://$DOMAIN${NC}"
echo -e "${GREEN}>>> Global API Key: Verifique no arquivo .env${NC}"
