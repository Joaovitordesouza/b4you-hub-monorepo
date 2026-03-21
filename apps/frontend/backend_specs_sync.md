
# Especificação Técnica: Sincronização de Histórico e Lead Matcher

**Prioridade:** Alta (Bloqueia a usabilidade do Chat)
**Contexto:** Pós-conexão da Evolution API (v2).

## 1. Cloud Function: `syncInstanceHistory`

**Gatilho:**
*   Deve ser acionada quando `instances/{id}.connectionStatus` mudar para `ONLINE`.

**Lógica de Execução:**
1.  **Fetch Chats:** Chamar endpoint da Evolution para listar conversas recentes.
2.  **Iteração & Match:** Para cada conversa (chat):
    *   Extrair o número de telefone (remoteJid).
    *   Executar Query no Firestore: `db.collection('leads').where('dados_contato.whatsapp', '==', phone).limit(1)`.
    *   *Nota:* Normalizar o telefone (remover +55 ou 9 extra) para aumentar a taxa de match.
3.  **Persistência (Upsert):**
    *   Salvar/Atualizar documento em `instances/{instanceId}/chats/{remoteJid}`.
    *   **Campos Obrigatórios a Injetar:**
        ```json
        {
          "leadId": "lead_123",       // Se encontrado
          "ownerId": "user_456",      // ID do Gerente (User) dono do Lead
          "leadName": "João Silva",   // Cache para listagem rápida
          "leadScore": 85,
          "lastMessageTime": 1715000000,
          "unreadCount": 0
        }
        ```
4.  **Fetch Messages:** Para os 20 chats mais recentes, buscar as últimas 50 mensagens e salvar na subcoleção `messages`.

## 2. Webhook: `onMessageReceived` (Atualização)

O webhook atual de recebimento de mensagem precisa ser atualizado para manter o vínculo:

1.  Ao receber nova mensagem, verificar se o documento do Chat já tem `leadId`.
2.  Se não tiver, tentar fazer o Match (como descrito acima).
3.  Se tiver, atualizar apenas `lastMessage`, `lastMessageTime` e incrementar `unreadCount`.

## 3. Endpoint Utilitário (Opcional)

Criar um Callable `forceResync({ instanceId })` para permitir que o usuário force a re-sincronização via botão no Frontend caso o vínculo automático falhe.
