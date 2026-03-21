
# Análise de Impacto Técnico: Migração de Callable (onCall) para HTTP REST (onRequest)

**Para:** Equipe de Backend / Arquitetura
**De:** Equipe de Frontend
**Prioridade:** CRÍTICA
**Assunto:** Riscos e Requisitos para migração de Firebase SDK para API REST Pura.

## 1. Resumo Executivo
A transição de `functions.httpsCallable` (onCall) para `functions.https.onRequest` (REST) remove a camada de abstração nativa do Firebase. Isso **aumenta a complexidade no cliente (Frontend)** e exige que o Backend reimplemente manualmente camadas de segurança e protocolo que antes eram automáticas.

Se esta migração ocorrer, **todo o código de integração do Frontend precisará ser reescrito**.

## 2. Impactos Diretos na Implementação

### A. Autenticação (Risco de Segurança)
*   **Como é hoje (onCall):** O SDK do Firebase injeta automaticamente o token do usuário logado no `context.auth`. O Frontend não precisa fazer nada.
*   **Como ficará (REST):**
    *   **Frontend:** Teremos que extrair manualmente o token (`await auth.currentUser.getIdToken()`) e anexá-lo ao Header `Authorization: Bearer <token>` em **todas** as requisições.
    *   **Backend:** Vocês precisarão implementar um Middleware para validar esse token usando `admin.auth().verifyIdToken()`. Se esquecerem isso em qualquer endpoint, ele ficará **público**.

### B. CORS (Cross-Origin Resource Sharing)
*   **Como é hoje (onCall):** O Firebase gerencia o CORS automaticamente.
*   **Como ficará (REST):** O Backend **DEVE** configurar explicitamente os headers de CORS (`Access-Control-Allow-Origin`, etc.) para o domínio do Frontend. Sem isso, todas as requisições falharão no navegador, mesmo que funcionem no Postman.

### C. Estrutura de Dados e Tipagem
*   **Como é hoje (onCall):** O SDK empacota o payload em `{ data: ... }` e desempacota a resposta.
*   **Como ficará (REST):**
    *   Receberemos JSON puro.
    *   O Backend deve garantir que o `Content-Type: application/json` seja respeitado.
    *   Precisaremos redefinir todas as interfaces TypeScript de Resposta.

### D. Tratamento de Erros
*   **Como é hoje (onCall):** O backend lança `new HttpsError('permission-denied', 'Msg')` e o frontend recebe isso tipado no `catch`.
*   **Como ficará (REST):**
    *   O Backend precisa retornar códigos HTTP corretos (401, 403, 400, 500).
    *   O `fetch` do Frontend não lança erro em status 4xx/5xx. Teremos que implementar uma camada de "Interceptor" para ler `response.ok` e lançar erros manualmente.

## 3. Comparativo de Código (Esforço de Refatoração)

**Cenário Atual (Callable):**
```typescript
// Frontend
try {
  const result = await functions.httpsCallable('createInstance')({ name: 'Comercial' });
  console.log(result.data.id);
} catch (e) {
  // Erro já vem formatado pelo SDK
  console.error(e.message); 
}
```

**Cenário Futuro (REST):**
```typescript
// Frontend
try {
  const token = await auth.currentUser?.getIdToken(); // Passo extra
  if (!token) throw new Error("Sem sessão");

  const response = await fetch('https://api.b4you.com/createInstance', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` // Passo extra
    },
    body: JSON.stringify({ name: 'Comercial' }) // Passo extra
  });

  if (!response.ok) { // Passo extra: Tratamento manual de HTTP Status
     const errData = await response.json();
     throw new Error(errData.message || 'Erro desconhecido');
  }

  const data = await response.json();
  console.log(data.id);
} catch (e) {
  console.error(e);
}
```

## 4. Requisitos Obrigatórios para o Backend (Checklist)

Para prosseguir, o Backend precisa garantir:

1.  [ ] **Middleware de Auth:** Validar `Authorization: Bearer` em todas as rotas privadas.
2.  [ ] **CORS Middleware:** Permitir `OPTIONS`, `POST`, `GET` da origem do Frontend.
3.  [ ] **Padronização de Erro:** Retornar JSON de erro padrão (ex: `{ "error": "code", "message": "human readable" }`) com status HTTP correto.
4.  [ ] **URL Base:** Definir se usaremos a URL padrão do Cloud Functions ou um domínio customizado.

## 5. Recomendação

Se o objetivo for apenas "performance" (Cold Starts), considerar apenas aumentar as instâncias mínimas. A migração para `onRequest` deve ser feita apenas se houver necessidade de integração com sistemas terceiros (Webhooks) ou se o Firebase SDK for removido completamente.

Se confirmada a mudança, o Frontend precisará de **3 a 5 dias** para refatorar a camada de serviços (`EvolutionContext`, `useChat`, `bridgeApi`).
