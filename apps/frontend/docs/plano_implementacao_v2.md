
# Plano de Implementação Unificado: Evolution API v2 (Go-Live)

**Versão:** 2.0
**Data:** 17/05/2024
**Contexto:** Consolidação da Auditoria Frontend com as Diretrizes do Backend.

---

## 1. Visão Geral da Arquitetura (Consenso)

O sistema operará em **Modo Híbrido Assíncrono**:
1.  **Frontend:** Não realiza chamadas HTTP diretas para mutações de chat (Enviar, Editar, Deletar). Toda intenção do usuário é gravada na coleção `outbox`.
2.  **Backend:** Workers (Cloud Functions) monitoram a `outbox`, processam a requisição na Evolution API e atualizam o status no Firestore.
3.  **Sync:** O Frontend reflete o estado otimista (Optimistic UI) e confirma quando o Backend atualiza o documento.

---

## 2. Cronograma de Execução

### Fase 1: Padronização do Outbox (Imediato) 🟢
*Objetivo: Eliminar dependência de conectividade para ações de chat.*

*   **[FRONTEND]** Refatorar `hooks/useChat.ts`:
    *   Substituir `deleteMessageFn` (Callable) por `db.collection('outbox').add({ type: 'DELETE_MSG' ... })`.
    *   Substituir `editMessageFn` (Callable) por `db.collection('outbox').add({ type: 'EDIT_MSG' ... })`.
*   **[BACKEND]** Atualizar `outboxTriggers.ts` para escutar e processar os novos tipos de eventos.

### Fase 2: Performance e Paginação (Curto Prazo) 🟡
*Objetivo: Suportar chats com +10k mensagens sem travar o navegador.*

*   **[FRONTEND]** Atualizar `hooks/useChat.ts`:
    *   Implementar `loadPreviousMessages(lastMessageId)`.
    *   Manter estado `hasMore`.
*   **[FRONTEND]** Atualizar `components/Chat/ChatFeed.tsx`:
    *   Adicionar "Intersection Observer" no topo da lista para gatilho de scroll infinito reverso.

### Fase 3: Smart Sync (Médio Prazo) ⚪
*Objetivo: Reduzir leituras no Firestore (Custos).*

*   **[BACKEND]** Implementar `Lead Matcher` robusto para garantir que todo chat tenha `leadId`.
*   **[FRONTEND]** Cachear metadados dos chats e carregar mensagens apenas sob demanda.

---

## 3. Contratos de Dados (Novos Tipos Outbox)

O Frontend deve escrever na coleção `instances/{id}/outbox` seguindo este esquema:

**Deletar Mensagem:**
```json
{
  "type": "DELETE_MSG",
  "to": "5511999999999@s.whatsapp.net",
  "content": {
    "id": "BAE5F...", // ID da mensagem no Whats
    "forEveryone": true
  },
  "status": "PENDING",
  "createdAt": "Timestamp"
}
```

**Editar Mensagem:**
```json
{
  "type": "EDIT_MSG",
  "to": "5511999999999@s.whatsapp.net",
  "content": {
    "id": "BAE5F...",
    "newText": "Texto corrigido"
  },
  "status": "PENDING",
  "createdAt": "Timestamp"
}
```
