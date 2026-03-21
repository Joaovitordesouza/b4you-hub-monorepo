
# Solicitação Técnica Backend - B4You Hub v2.0 (Produção)

Para suportar a nova jornada do cliente e visão 360, necessitamos dos seguintes endpoints e triggers no Firebase Functions / Node.js.

## 1. Triggers de Automação (Playbook)

### `onProducerStageChange`
**Gatilho:** Update no campo `stage` da coleção `producers`.
**Lógica:**
1.  Ler o novo estágio (ex: "ONBOARDING").
2.  Buscar o template de tarefas para este estágio (definido em config ou banco).
3.  Criar documentos na coleção `tasks` atribuídos ao `gerente_conta`.
4.  Criar registro na `producers/{id}/timeline`: "Mudança de fase para Onboarding".

**Exemplo de Template (JSON):**
```json
{
  "ONBOARDING": [
    { "title": "Agendar Kick-off", "sla_hours": 24, "priority": "HIGH" },
    { "title": "Solicitar Acessos", "sla_hours": 48, "priority": "MEDIUM" },
    { "title": "Criar Grupo WhatsApp", "sla_hours": 2, "priority": "HIGH" }
  ],
  "GROWTH": [
    { "title": "Reunião Mensal de Resultados", "sla_hours": 720, "priority": "MEDIUM" }
  ]
}
```

## 2. Métricas de Gerente (`aggregateManagerStats`)

**Tipo:** Scheduled Job (a cada 1h ou 24h).
**Lógica:**
1.  Iterar sobre todos os usuários com role `prospector` ou `cs_manager`.
2.  Contar tarefas `status: 'COMPLETED'` vs `status: 'LATE'` na coleção `tasks`.
3.  Calcular média de tempo entre `msg_cliente` e `msg_gerente` nos chats (SLA de resposta).
4.  Somar `stats_financeiros.faturamento_mes` de todos os producers da carteira.
5.  Salvar em `users/{userId}/performance_stats`.

## 3. Webhook de Integração Financeira (`onSalesWebhook`)

**Endpoint:** `POST /api/webhooks/sales`
**Payload Esperado:** `{ producerEmail, amount, status, date }`
**Lógica:**
1.  Encontrar Producer pelo email.
2.  Atualizar `stats_financeiros`:
    *   Incrementar `faturamento_total`.
    *   Atualizar `ultima_venda`.
    *   Recalcular `health_score` (Ex: Se venda > 0, Health = 100).
3.  Se for a **primeira venda**, mudar Stage automaticamente para "ACTIVE/GROWTH" e notificar gerente.

## 4. Chat Híbrido & Timeline

**Ajuste no `sendMessage` (Outbox Trigger):**
*   Se o payload tiver `isInternal: true`, salvar na coleção `timeline` do Lead vinculado E na coleção `messages` do chat com um marcador visual.
*   **Importante:** Não enviar para a Evolution API se `isInternal: true`.

