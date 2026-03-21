
# Plano de Evolução: Work OS (Monday.com Clone integrado ao CRM)

## 1. Visão Geral
Transformar a tela de tarefas simples em um **Sistema Operacional de Trabalho** baseado em Quadros (Boards), Grupos e Colunas Dinâmicas. O diferencial é a integração nativa com o ecossistema B4You: vincular tarefas a **Leads/Clientes** reais e atribuir a **Usuários** do sistema.

## 2. Estrutura de Dados (Firestore)

Para suportar a complexidade de um "Monday.com", precisamos estruturar os dados hierarquicamente:

*   **Collection `boards`**:
    *   `id`, `name`, `type` (main, private), `ownerId`.
    *   `columns`: Array de definições de coluna (ex: `{ id: 'col_status', type: 'status', title: 'Status' }`).
    *   `groups`: Array de grupos (ex: "🚀 Semana Atual", "📅 Próxima Semana").
        *   Cada grupo contém um array de `items` (Tarefas).

*   **Sub-collection `updates` (dentro de `boards`)**:
    *   Para não carregar todo o histórico de conversas da tarefa ao abrir o quadro, os comentários ficam numa sub-coleção.

## 3. Funcionalidades Chave

### A. Colunas Inteligentes
1.  **Pessoas (People):** Busca usuários na coleção `users`. Permite atribuição múltipla.
2.  **Cliente (Connect):** Busca na coleção `leads` e `producers`. Cria um hiperlink para o Chat/Perfil.
3.  **Status/Prioridade:** Pílulas coloridas editáveis (estilo Monday).
4.  **Data:** Seletor de data com indicadores visuais de atraso.

### B. Integrações (Cross-System)
*   **Vínculo com Chat:** Ao clicar no ícone de chat de uma tarefa vinculada a um cliente, o sistema navega para o `Inbox` com aquele cliente selecionado.
*   **Playbook:** Quando um Lead muda de fase (ex: Onboarding), o Backend pode injetar tarefas automaticamente nestes quadros.

## 4. UI/UX (Monday Style)
*   Layout fluido com scroll horizontal.
*   Cores vibrantes para status.
*   Drag and Drop (implementação visual inicial).
*   Painel lateral (Drawer) para "Updates" (Conversa interna sobre a tarefa).

---

## 5. Passos de Migração
1.  Definir novas interfaces em `types.ts`.
2.  Criar a lógica de `Board` completa em `MyWork.tsx`.
3.  Implementar seletores assíncronos (`PeoplePicker` e `ClientPicker`).
