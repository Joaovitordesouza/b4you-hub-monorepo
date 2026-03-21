
# Relatório de Auditoria Técnica: Frontend Architecture & Backend Integration (v2)

**Autor:** Staff Frontend Engineer AI
**Data:** 16/05/2024
**Versão do Backend:** Cloud Functions v2 (us-central1) + Outbox Pattern
**Status Geral:** 🟡 APROVADO COM RESSALVAS (Correções Críticas Necessárias)

---

## 1. Matriz de Cobertura e Integridade

| Funcionalidade | Status | Método de Conexão | Latência Estimada | Observação |
| :--- | :---: | :--- | :--- | :--- |
| **Envio de Mensagem** | ✅ | Firestore (Outbox) | < 50ms (Optimistic) | Padrão correto. UI não bloqueia esperando API. |
| **Recebimento** | ✅ | Firestore (Snapshot) | Realtime | Merge correto entre `messages` e `outbox`. |
| **Upload de Mídia** | ✅ | Storage SDK | Variável | Upload direto no client antes de criar registro na outbox. Correto. |
| **Criação de Instância** | ⚠️ | Callable (HTTPS) | ~2s | **ERRO CRÍTICO:** Região configurada errada (`southamerica-east1`). |
| **QR Code (Leitura)** | ✅ | Híbrido | Realtime | Ouve o doc da instância. Fallback manual implementado. |
| **Edição/Deleção** | ⚠️ | Callable (HTTPS) | ~1s | Quebra o padrão offline-first. Deveria usar Outbox. |
| **Paginação** | ❌ | Inexistente | N/A | Hardcoded `limit(100)`. Risco de crash em chats longos. |

---

## 2. Análise Profunda de Código (Code Smell & Patterns)

### A. Configuração do Firebase (`firebase.ts`) - 🚨 BLOQUEANTE
**Código Atual:**
```typescript
export const functions = firebase.app().functions('southamerica-east1');
```
**Análise:** O prompt especifica que o backend migrou para `us-central1`. Manter a região antiga resultará em erros CORS/404 em todas as chamadas de funções (`createInstance`, `deleteMessage`, etc).
**Ação:** Refatoração imediata necessária.

### B. Motor de Chat (`useChat.ts`) - ✅ Padrão Ouro
O hook implementa corretamente a fusão de fontes de verdade:
```typescript
// useChat.ts
const allMessages = useMemo(() => {
    const combined = [...messages];
    outboxMessages.forEach(om => {
        // Dedup: Só adiciona se o ID (gerado no front) ainda não existir na lista confirmada
        if (!combined.find(m => m.id === om.id)) {
            combined.push(om);
        }
    });
    return combined.sort((a, b) => a.timestamp - b.timestamp);
}, [messages, outboxMessages]);
```
**Comentário:** Excelente uso de `useMemo` para evitar recálculos desnecessários. A lógica de deduplicação garante que a mensagem não "pisque" quando transita de `outbox` (pendente) para `messages` (confirmada).

### C. Gestão de Instância (`ConnectWizard.tsx`) - ✅ Reativo
O componente não faz polling (chamadas repetidas). Ele confia no Firestore:
```typescript
// ConnectWizard.tsx
const unsub = db.collection('instances').doc(instanceId).onSnapshot((doc) => {
    // ... Lógica baseada em systemStatus
    if (data.systemStatus === 'READY') setStep('SUCCESS');
});
```
**Comentário:** Aderente à arquitetura orientada a eventos.

### D. Edição e Deleção - ⚠️ Inconsistência Arquitetural
```typescript
// useChat.ts
const deleteMessage = async (...) => {
    await deleteMessageFn({ ... }); // Chamada HTTP direta
}
```
**Risco:** Se o usuário estiver offline (túnel, metrô), a ação falha e não há retry automático.
**Recomendação:** Migrar ações de `DELETE` e `EDIT` para a coleção `outbox` com `type: 'DELETE_MSG'`, permitindo que o Backend processe assincronamente.

---

## 3. Teste de Estresse Teórico

### Cenário 1: Envio em Modo Avião
*   **Ação:** Usuário digita 5 mensagens e clica em enviar sem internet.
*   **Comportamento Atual:** As mensagens são gravadas no cache local do Firestore (`instances/{id}/outbox`). Aparecem na UI como `sending` (ou `pending`).
*   **Recuperação:** Ao reconectar, o SDK do Firebase sincroniza a outbox. O backend dispara os envios.
*   **Veredito:** ✅ Aprovado (Resiliência nativa).

### Cenário 2: QR Code Expirado
*   **Ação:** Usuário abre o modal e demora 2 minutos para ler.
*   **Backend:** Gera novo QR Code e atualiza o documento Firestore.
*   **Frontend:** O `onSnapshot` em `QRCodeModal.tsx` detecta a mudança no campo `qrcode` e renderiza a nova imagem automaticamente.
*   **Veredito:** ✅ Aprovado (Reatividade).

### Cenário 3: Chat com 10.000 mensagens
*   **Ação:** Abrir um chat antigo.
*   **Comportamento Atual:** O hook `useChat` tem `limit(100)`. O usuário verá as últimas 100.
*   **Problema:** Ao rolar para cima, nada acontece. Não há lógica de "Load Previous".
*   **Veredito:** ❌ Falha de UX. O usuário perde acesso ao histórico antigo.

---

## 4. Plano de Refatoração (Go-Live)

1.  **Imediato (P0):** Corrigir região do Cloud Functions em `firebase.ts` para `us-central1`.
2.  **Curto Prazo (P1):** Implementar paginação infinita inversa (Infinite Scroll Up) no `ChatFeed` e `useChat`.
3.  **Médio Prazo (P2):** Converter `deleteMessage` e `editMessage` para usar o padrão Outbox, eliminando dependência de conectividade imediata.
4.  **Performance (P3):** Virtualizar a lista de mensagens (`react-window`) se a média de mensagens carregadas passar de 500.

---

**Assinado:** Staff Frontend Engineer (AI Agent)
