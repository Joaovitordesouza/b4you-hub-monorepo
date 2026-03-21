# Configuração de CORS para Vídeos do Firebase Storage

Se os vídeos funcionam em uma aba separada mas não no player do app, você precisa autorizar o domínio do app no Google Cloud Storage (Bucket do Firebase).

### 1. Crie o arquivo `cors.json`
No seu computador, crie um arquivo chamado `cors.json` com o seguinte conteúdo:

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "OPTIONS"],
    "responseHeader": ["Content-Type", "Range", "Authorization"],
    "maxAgeSeconds": 3600
  }
]
```
*Nota: Você pode substituir `["*"]` pela URL específica do seu app (ex: `["https://seu-app.aistudio.com"]`) para maior segurança.*

### 2. Aplique a configuração via Terminal (gcloud)
Você precisará do `gsutil` (parte do Google Cloud SDK). Execute o comando abaixo substituindo pelo nome do seu bucket:

```bash
gsutil cors set cors.json gs://b4you-hub.firebasestorage.app
```

### 3. Por que isso é necessário?
Os navegadores bloqueiam o acesso a mídias hospedadas em domínios diferentes por questões de segurança. Como os links são **Signed URLs** gerados para o bucket `firebasestorage.app`, o navegador exige que o servidor (Google) envie um cabeçalho autorizando seu domínio a ler os bytes do vídeo.

---
**Dica:** Se você não tiver o SDK instalado, pode fazer isso via **Cloud Shell** diretamente no console do Google Cloud selecionando o projeto `b4you-hub`.