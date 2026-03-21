# Estágio 1: Build da aplicação
FROM node:20-alpine as build
WORKDIR /app

# Instalar dependências
COPY package*.json ./
RUN npm install

# Copiar resto do código
COPY . .

# Fazer o build passando todas as variáveis de ambiente necessárias
RUN npm run build

# Estágio 2: Servir os arquivos estáticos com Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar configuração customizada do Nginx para suportar React Router
COPY nginx.conf /etc/nginx/conf.d/default.conf

# O Cloud Run usa a porta 8080 (que vamos configurar no nginx.conf)
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
