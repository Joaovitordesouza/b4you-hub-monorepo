
# Plano de Implementação para Produção (Roadmap)

## Fase 1: Refinamento do Modelo de Dados (Backend First)
*Objetivo: Preparar o Firestore para suportar a visão 360.*

1.  **Unificar Entidades:** Garantir que `Producers` (Carteira) e `Leads` (CRM) tenham chaves únicas compartilhadas (`producerId`).
2.  **Extensão da Collection `producers`:**
    *   Adicionar array `playbook`: `[{ taskId, status, title, deadline }]`.
    *   Adicionar objeto `metrics`: `{ lastSaleDate, mrr, healthScore }`.
    *   Adicionar sub-collection `timeline`: Para logs de sistema + notas.
3.  **Integração Financeira (Webhook Mock):** Criar endpoint para receber webhooks de venda e atualizar `producers/{id}.stats_financeiros`.

## Fase 2: Evolução do Frontend (O "Cockpit")
*Objetivo: Criar a interface onde o gerente vive.*

1.  **Refatorar `Inbox.tsx`:**
    *   Transformar o painel direito (`CRMPanel`) em um **ClientOS**.
    *   Integrar o componente `MyWork` (Tarefas) dentro do `ClientOS` (filtrado pelo cliente atual).
    *   Adicionar aba "Arquivos" (Upload/Listagem simples).
2.  **Criar "Notas Internas" no Chat:**
    *   Permitir enviar mensagens no chat que são visíveis apenas para a equipe (fundo amarelo), salvas na `timeline` mas não enviadas via Evolution API.
3.  **Visualização de Jornada:**
    *   Adicionar barra de progresso visual no topo do chat indicando a fase atual (Handover > ... > Growth).

## Fase 3: Automação e Playbooks
*Objetivo: Reduzir trabalho manual.*

1.  **Engine de Playbooks (Frontend Trigger):**
    *   Ao mudar o status no dropdown, disparar função `generatePlaybookTasks(newStage)`.
    *   Isso cria automaticamente 3-5 tarefas no Work OS do gerente.
2.  **Agendador de Reuniões:**
    *   Criar tipo de tarefa "Reunião" que sincroniza com data/hora.

## Fase 4: Painel Administrativo (BI)
*Objetivo: Controle da operação.*

1.  **Dashboard de Equipe:**
    *   Tabela com todos os Gerentes.
    *   Colunas: Leads Ativos, MRR sob Gestão, Tarefas Atrasadas, Tempo de Resposta (Calc. via Timestamp das msgs).
2.  **Auditoria:**
    *   Log de todas as ações sensíveis (Deleção de chat, Exportação de dados).

## Checklist de Produção (Go-Live)
- [ ] Regras de Segurança Firestore (bloquear leitura de carteiras alheias).
- [ ] Índices Compostos para queries de Tasks e Chat.
- [ ] Tratamento de Erros (Sentry ou logs no console robustos).
- [ ] Feedback visual de "Offline" / "Sincronizando".
