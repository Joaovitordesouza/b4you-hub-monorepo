
# Solicitação Backend - Work OS (Gestão de Tarefas Avançada)

Para suportar o novo `MyWork` (estilo Monday.com), precisamos garantir consistência e notificações.

## 1. Estrutura de Dados `boards`
O Frontend gerenciará a estrutura do JSON do board, mas precisamos de validação de segurança.

**Regra de Segurança (Firestore Rules):**
*   `boards` públicos (`type: 'main'`): Leitura/Escrita para todos os usuários autenticados da organização.
*   `boards` privados (`type: 'private'`): Leitura/Escrita apenas para `ownerId` e usuários listados em `subscribers`.

## 2. Trigger: `onBoardItemUpdate`

**Gatilho:** Alteração no array `groups` dentro de um documento `boards/{boardId}`.
*Nota: Como o Firestore não tem trigger para campos específicos de JSON, o ideal é que atualizações críticas (mudança de status para "Feito") sejam enviadas para um endpoint específico ou que o front garanta a notificação.*

**Alternativa Recomendada (Granularidade):**
O Frontend enviará notificações diretamente para a coleção `notifications` dos usuários envolvidos quando:
1.  Um usuário for atribuído a uma tarefa (Coluna `person`).
2.  Um prazo vencer (Job agendado).

## 3. Trigger: `onLeadStageChange` (Integração Playbook)
Quando um Lead muda de estágio (ex: `AQUISICAO` -> `ONBOARDING`), o Backend deve:
1.  Buscar o Board padrão de "Onboarding".
2.  Adicionar um novo Item (Tarefa) no primeiro grupo.
3.  Preencher a coluna "Cliente" com o ID do Lead.
4.  Preencher a coluna "Status" com "Pendente".

**Payload Exemplo de Item:**
```json
{
  "id": "task_123",
  "name": "Kick-off: [Nome do Lead]",
  "column_values": {
    "status": { "label": "Pendente", "color": "#c4c4c4" },
    "person": ["user_id_gerente"],
    "client": { "id": "lead_id", "name": "Nome do Lead" }
  }
}
```
