
# Solicitação de Backend: Padronização e Integridade de Dados (Leads/Producers)

**Prioridade:** ALTA
**Contexto:** Estamos eliminando dados mockados no Frontend e padronizando a criação de Leads e Produtores para garantir que o vínculo com WhatsApp e Work OS funcione de forma nativa e robusta.

## 1. Trigger: `onProducerCreate` (Sanity Check)

**Gatilho:** Criação de documento em `producers/{producerId}`.

**Objetivo:** Garantir que todo produtor criado (mesmo manualmente pelo dashboard) tenha a estrutura mínima para funcionar no CRM.

**Lógica:**
1.  **Normalização de Telefone:** Verificar o campo `whatsapp_contato`. Remover caracteres não numéricos. Se não tiver `55` no início e tiver 10 ou 11 dígitos, adicionar `55`.
2.  **Inicialização de Timeline:** Se a sub-coleção `timeline` estiver vazia, criar um documento inicial de boas-vindas/log de sistema.
3.  **Vínculo Reverso (Lead):** Se o `producer` foi criado manualmente e não tem `leadId`, tentar encontrar um Lead existente com o mesmo email ou telefone. Se encontrar, atualizar o `producer` com o `leadId` e marcar o Lead como convertido.

## 2. Trigger: `onLeadConverted` (Upgrade Automático)

**Gatilho:** Atualização em `leads/{leadId}` onde `status` muda para `FECHADO` e `isConverted` é `true`.

**Objetivo:** Garantir que dados críticos do Lead (Chat, Arquivos) sejam migrados ou referenciados no novo Produtor.

**Lógica:**
1.  Verificar se já existe um documento em `producers` com `leadId == leadId`.
2.  Se não existir, criar o documento de Producer copiando os dados do Lead (Nome, Foto, Contatos).
3.  Definir `stats_financeiros` iniciais como zerados (Saudável).
4.  Copiar a `timeline` do Lead para a `timeline` do Producer (ou criar referências), para que o histórico de negociação não se perca.

## 3. Scheduled Job: `updateProducerHealth` (Health Check)

**Frequência:** Diária (00:00 UTC).

**Objetivo:** Atualizar o `health_score` e `status_health` baseado em dados reais, removendo a necessidade de mocks no frontend.

**Lógica:**
1.  Para cada Producer:
    *   Verificar data da `ultima_venda`. Se > 30 dias, Health Score cai 20 pontos.
    *   Verificar `tarefas_pendentes` no Work OS. Se > 5 atrasadas, Health Score cai 10 pontos.
    *   Se Health Score < 50, definir `status_health = 'RISCO'`.
    *   Se Health Score > 80, definir `status_health = 'SAUDAVEL'`.
2.  Salvar atualização no documento do Producer.

---

**Observação para o Time de Backend:**
O Frontend agora espera que `stats_financeiros` existam. Se o documento vier sem esse campo, o frontend tratará como zero, mas o ideal é que a criação garanta a estrutura padrão definida em `types.ts`.
