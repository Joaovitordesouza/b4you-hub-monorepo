
# Solicitação Técnica: B4You Tracking OS Backend (Elite Edition)

**Prioridade:** CRÍTICA
**Solicitante:** Frontend Team (UX Overhaul)

Para suportar a nova interface de "Centro de Comando" e o fluxo de "Liquid Workflow" no Frontend, necessitamos das seguintes alterações na estrutura de dados e triggers no Firebase.

## 1. Atualização de Schema (`producers`)

Precisamos enriquecer o objeto `Producer` com metadados de rastreamento para controlar SLAs e renderizar os cards contextuais corretamente.

**Novo Campo: `tracking_metadata` (Map)**
```json
{
  "tracking_metadata": {
    "entered_stage_at": "Timestamp",  // Quando entrou na coluna atual (para calcular tempo de estagnação)
    "last_interaction_at": "Timestamp", // Última msg enviada ou recebida (para calcular silêncio)
    "next_action_date": "Timestamp",    // Para agendamentos (opcional)
    "sla_status": "String",             // Enum: 'OK' | 'WARNING' | 'BREACHED'
    "waiting_since": "Timestamp",       // Apenas se status == 'AGUARDANDO_RETORNO'
    "risk_level": "Number"              // 0 a 100 (Calculado via Job)
  }
}
```

## 2. Cloud Functions & Triggers

### A. Trigger: `onTrackingChange` (Log e SLA)
**Gatilho:** Alteração no campo `tracking_status` de um documento `producers`.
**Lógica:**
1.  Atualizar `tracking_metadata.entered_stage_at` para `now()`.
2.  Adicionar registro na subcoleção `timeline`:
    *   `type`: 'STAGE_CHANGE'
    *   `content`: "Moveu para [NOVO STATUS]. Motivo: [Nota do Frontend]"
    *   `metadata`: `{ previousStatus: 'OLD', newStatus: 'NEW' }`

### B. Scheduled Job: `monitorSLA` (O "Cronômetro")
**Frequência:** A cada 1 hora.
**Lógica:**
1.  Buscar todos os producers com `tracking_status != null`.
2.  **Regra de Silêncio (7 dias):**
    *   Se `tracking_status` != 'PRECISA_CONTATO' E `last_interaction_at` > 7 dias:
    *   Mover automaticamente para `PRECISA_CONTATO`.
    *   Setar `sla_status` = 'BREACHED'.
    *   Notificar gerente.
3.  **Regra de Espera (48h):**
    *   Se `tracking_status` == 'AGUARDANDO_RETORNO' E `entered_stage_at` > 48h:
    *   Setar `sla_status` = 'WARNING'.
    *   Adicionar flag visual "Retomada Necessária".

### C. Webhook: `onMessageReceived` (Atualização de Interação)
**Contexto:** Quando o cliente responde no WhatsApp.
**Lógica:**
1.  Atualizar `tracking_metadata.last_interaction_at` para `now()`.
2.  Se `tracking_status` == 'AGUARDANDO_RETORNO':
    *   Mover automaticamente para 'EM_ANDAMENTO'.
    *   Logar na timeline: "Cliente respondeu. Retomando tratativa."

## 3. Endpoints/Callables Auxiliares

### `generateIceBreaker({ producerId })`
*   Deve encapsular a chamada ao Gemini (Google GenAI) no backend para não expor chaves ou lógicas de prompt no client, retornando apenas o texto sugerido.

### `nudgeTechTeam({ producerId, reason })`
*   Envia notificação Slack/Email para o time de suporte com link direto para o card do cliente travado em "EM_SUPORTE".
