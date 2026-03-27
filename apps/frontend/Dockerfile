# Estágio 1: Build da aplicação
FROM node:20-alpine as build
WORKDIR /app

# Copiar configurações da raiz
COPY package*.json ./
COPY turbo.json ./

# Copiar dependências locais (pacotes compartilhados)
COPY packages/ ./packages/

# Copiar apenas o frontend para não enviar código desnecessário
COPY apps/frontend/ ./apps/frontend/

# Instalar dependências da raiz inteira para compor workspace corretamente
RUN npm install

# Buildar o Frontend (Contexto vai pra pasta frontend)
WORKDIR /app/apps/frontend
RUN npm run build

# Estágio 2: Servir os arquivos estáticos com Nginx
FROM nginx:alpine
# Copiar do local correto de build gerado dentro do workspace
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html

# Copiar configuração customizada do Nginx para suportar React Router
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# O Cloud Run usa a porta 8080
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
