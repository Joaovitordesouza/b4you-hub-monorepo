
# Plano de Sincronização e Gestão de Conversas (Pós-Conexão)

## 1. Objetivo
Garantir que, após a leitura do QR Code, o histórico de conversas do WhatsApp seja importado para o B4You Hub e vinculado automaticamente aos Leads do CRM, permitindo que o gerente veja apenas seus contatos pertinentes.

## 2. Fluxo de Dados (Data Flow)

### Fase A: Gatilho de Conexão
1.  Frontend exibe QR Code.
2.  Usuário escaneia.
3.  Evolution API envia Webhook `connection.update` com status `open`.
4.  Cloud Function (`onInstanceUpdate`) recebe o webhook e atualiza o status no Firestore para `ONLINE`.

### Fase B: Ingestão de Histórico (Backend)
*Esta é a etapa crítica para "carregar todas as mensagens".*
1.  Ao detectar a mudança para `ONLINE`, o sistema dispara o job `syncInstanceHistory`.
2.  O Job chama `/chat/findMessages` na Evolution API (paginado).
3.  Para cada conversa retornada:
    *   Verifica se o número de telefone existe na coleção `leads`.
    *   **Se existir:** Copia `leadId`, `ownerId` (gerente), `leadName` e `leadAvatar` para o documento do Chat.
    *   **Se não existir:** Cria o Chat como "Desconhecido" ou "Novo Contato".
    *   Salva as últimas 50 mensagens na subcoleção `messages`.

### Fase C: Visualização (Frontend)
1.  **Inbox Inteligente:** O componente `ChatSidebar` deixará de mostrar apenas dados crus da Evolution. Ele lerá os campos `leadName` e `leadStatus` injetados pelo backend no documento do chat.
2.  **Filtro de Propriedade:** O hook `useChat` aplicará um filtro: `where('ownerId', '==', currentUser.uid)` para garantir que o gerente veja seus leads.
3.  **Estado de Loading:** Enquanto a Fase B ocorre, o Frontend exibirá um status "Sincronizando Histórico (20%)".

## 3. Requisitos de Performance
*   **Firestore Indexes:** Necessário criar índices compostos para ordenar chats por `lastMessageTime` filtrando por `ownerId`.
*   **Paginação:** O Frontend deve implementar "Infinite Scroll" nas mensagens para não travar o navegador se o histórico for grande.

## 4. Próximos Passos Imediatos
1.  Backend: Implementar a Cloud Function de `Lead Matcher`.
2.  Frontend: Adaptar o `Inbox.tsx` para usar os dados enriquecidos do Lead diretamente do objeto de Chat, reduzindo leituras duplicadas.
