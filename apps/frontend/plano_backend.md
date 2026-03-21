# Especificação Backend: GCP + Evolution API

## 1. Arquitetura de Dados (Firestore)

A estrutura de dados é desenhada para suportar alta concorrência e leitura rápida.

### `instances/{instanceId}`
*   `ownerId`: UID do usuário dono.
*   `token`: Token de autenticação da Evolution.
*   `status`: Estado da conexão.

### `leads/{leadId}`
*   Entidade central do CRM. Contém dados de negócio (valor, funil, responsável).

### `leads/{leadId}/timeline/{eventId}` (Unified Timeline)
*   Armazena TUDO que acontece com o lead.
*   `type`: 'whatsapp_message', 'note', 'status_change'.
*   `content`: Payload do evento.
*   `metadata`: Dados técnicos (messageId, instanceId).

**Para compatibilidade com UI de Chat tradicional:**
Pode-se manter uma coleção auxiliar `chats/{chatId}/messages` se a query na timeline ficar muito complexa, ou usar índices compostos na timeline. *Decisão: Usar sub-coleção `messages` dentro de `chats` (dentro de `instances`) para o chat cru, e replicar eventos chaves na `timeline` do Lead.*

### `instances/{instanceId}/chats/{remoteJid}`
*   Representa a conversa técnica do WhatsApp.
*   `leadId`: Link para o Lead no CRM (Chave Estrangeira lógica).
*   `unreadCount`: Contador atômico.
*   `lastMessage`: Preview.

## 2. Cloud Functions (Triggers)

### `onMessageReceived` (Webhook Handler)
1.  Recebe POST da Evolution.
2.  Identifica `remoteJid` e `instanceId`.
3.  Busca ou cria o documento em `instances/{id}/chats/{jid}`.
4.  Adiciona mensagem na sub-coleção `messages`.
5.  Tenta encontrar um `Lead` com esse telefone. Se achar, atualiza `lastInteraction` do Lead.

### `onMessageSend` (Firestore Trigger)
1.  Ouve criação em `instances/{id}/chats/{jid}/messages` onde `fromMe == true` e `status == 'pending'`.
2.  Dispara requisição para Evolution API `/message/sendText`.
3.  Atualiza documento para `status: 'sent'` ou `error`.

## 3. Regras de Segurança

*   Garantir que um usuário só possa ler/escrever em `instances` que ele é dono (`ownerId == auth.uid`) OU se for Admin.
*   Na visualização unificada (Admin vê tudo), as regras devem permitir leitura de todas as collections `chats`.

## 4. Integração Evolution API

*   Endpoint Base: Definido nas variáveis de ambiente.
*   Global API Key: Gerenciada via Secret Manager do GCP.
*   Webhooks: Devem ser configurados para apontar para a URL da Cloud Function `onMessageReceived`.
