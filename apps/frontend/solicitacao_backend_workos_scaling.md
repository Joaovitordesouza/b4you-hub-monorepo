
# Solicitação Técnica: Arquitetura Escalável para Work OS (Monday-like)

**Prioridade:** CRÍTICA (Bloqueante para Produção)
**Contexto:** O Work OS atual armazena todos os itens, grupos e colunas dentro de um único documento `boards/{boardId}`.

## O Problema
O Firestore possui um limite rígido de **1MB por documento**.
*   Se um quadro tiver 500 tarefas com atualizações de texto, metadados e logs, o documento excederá 1MB e o quadro quebrará (crash).
*   Concorrência: Se dois usuários editarem tarefas diferentes no mesmo quadro ao mesmo tempo, um sobrescreverá o trabalho do outro (Race Condition), pois ambos enviam o JSON completo do board.

## A Solução: Arquitetura de Sub-coleções

Solicitamos a refatoração do banco de dados para a seguinte estrutura hierárquica:

### 1. `boards/{boardId}` (Metadados Leves)
Mantém apenas configurações globais.
```json
{
  "name": "Projetos Q3",
  "ownerId": "user_123",
  "columns": [ ...definições de colunas... ],
  "groupsOrder": ["group_A", "group_B"] // Array de IDs para ordenação
}
```

### 2. `boards/{boardId}/groups/{groupId}` (Sub-coleção)
Cada grupo é um documento separado.
```json
{
  "title": "A Fazer",
  "color": "#FF0000",
  "order": 1
}
```

### 3. `boards/{boardId}/items/{itemId}` (Sub-coleção - A mais volumosa)
Cada tarefa é um documento independente. Isso permite milhões de tarefas por quadro sem atingir limites.
```json
{
  "groupId": "group_A",
  "name": "Tarefa 1",
  "column_values": { "status": "Done", "person": ["user_1"] },
  "updatedAt": "Timestamp"
}
```

## Requisitos para API/Backend
1.  **Migração:** Criar script para explodir os documentos atuais `boards` para a nova estrutura.
2.  **Listeners:** O Frontend precisará de listeners compostos (ouvir Groups + Items onde `boardId == X`).
3.  **Atomicidade:** Ao deletar um Board, usar uma Cloud Function para deletar recursivamente todas as sub-coleções (o client não consegue fazer isso de forma segura em uma única operação).
