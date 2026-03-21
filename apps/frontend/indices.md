
# Guia de Índices Compostos (Firestore)

Para que as queries complexas funcionem sem erros, crie os seguintes índices no console do Firebase (Firestore > Índices).

## 1. Migrações (Já existente)
*   **Coleção:** `migrations`
*   **Campos:** `userId` (Asc), `workspaceId` (Asc), `status` (Asc)

## 2. Aulas (Já existente)
*   **Coleção:** `lessons` (Collection Group)
*   **Campos:** `moduleIndex` (Asc), `lessonIndex` (Asc)

## 3. Produtores (NOVO - Integração KYC)
Necessário para a query: `where("stage", "==", "ONBOARDING").orderBy("updatedAt", "desc")`

*   **Coleção:** `producers`
*   **Campos:**
    1.  `stage` (Ascendente)
    2.  `updatedAt` (Descendente)

## 4. Chats (Evolution Inbox)
Necessário para ordenar conversas por última mensagem.

*   **Coleção:** `chats` (Subcoleção de instances)
*   **Campos:**
    1.  `lastMessageTimestamp` (Descendente)

## 5. Workspaces (Work OS) - Novo!
Necessário para filtrar Workspaces onde o usuário é membro. O campo `members` é um Array.

*   **Coleção:** `workspaces_boards`
*   **Campos:**
    1.  `members` (Array)
    *Nota: Índices de Array-Contains são automáticos para queries simples, mas se houver ordenação, será necessário um índice composto.*

## 6. Boards (Work OS) - Novo!
Necessário para filtrar Boards onde o usuário é membro e possivelmente ordenar por nome ou data.

*   **Coleção:** `boards`
*   **Campos:**
    1.  `members` (Array)

## 7. Timeline (Collection Group) - NOVO!
Necessário para a aba de Performance do Admin Panel.

*   **Coleção:** `timeline` (Selecionar "Collection Group")
*   **Campos:**
    1.  `authorId` (Ascendente)
    2.  `timestamp` (Descendente)

## 8. Chats (Collection Group) - NOVO!
Necessário para métricas globais de SLA no Admin Panel.

*   **Coleção:** `chats` (Selecionar "Collection Group")
*   **Campos:**
    1.  `instanceId` (Ascendente) - *Opcional, mas recomendado se houver filtros*
    
---
**Observação:** Se você ver um erro no console do navegador contendo um link (ex: `https://console.firebase.google.com/...`), basta clicar nele para criar o índice automaticamente.
