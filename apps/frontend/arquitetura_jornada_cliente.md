
# Arquitetura de Processos: B4You Customer Journey 360°

## 1. Visão Estratégica (O "B4You Method")
A plataforma deixa de ser passiva (apenas chat e tarefas) e se torna ativa. O Gerente de Contas não "atende" o cliente; ele **pilota a jornada** do Infoprodutor, desde a migração até a escala.

### Os 3 Pilares da Plataforma
1.  **Centralização (Single Source of Truth):** Chat, Arquivos, Financeiro e Tarefas vivem no mesmo contexto.
2.  **Rastreabilidade:** Cada interação (mensagem, reunião, mudança de status) é um evento na Timeline.
3.  **Automação de Playbook:** O sistema diz o que fazer (Tarefas) baseado no estágio do cliente.

---

## 2. A Jornada do Infoprodutor (Life Cycle)

Definimos 5 Estágios de Vida (Life Stages) para o Produtor na plataforma. Cada estágio dispara um **Playbook de Tarefas** automático.

### Estágio 1: Handover (Vendas -> CS)
*   **Gatilho:** Contrato Assinado / Lead marcado como "FECHADO".
*   **Objetivo:** Garantir que o cliente entenda o próximo passo e se sinta seguro.
*   **Playbook Automático (Tarefas geradas):**
    *   [ ] Validar Contrato e Documentos (Compliance).
    *   [ ] Criar Grupo WhatsApp "B4You + [Nome do Expert]".
    *   [ ] Agendar Reunião de Kick-off.
    *   [ ] Enviar Kit de Boas-vindas (Email).

### Estágio 2: Onboarding Técnico (Migração)
*   **Gatilho:** Reunião de Kick-off realizada.
*   **Objetivo:** Trazer o conteúdo (Hotmart/Kiwify) para a B4You sem atrito.
*   **Ações na Plataforma:** Uso do módulo `KiwifyDownloader`.
*   **Playbook Automático:**
    *   [ ] Solicitar Token de Acesso da plataforma antiga.
    *   [ ] Executar Migração de Cursos.
    *   [ ] Configurar Checkout e Pixel.
    *   [ ] Validar Acesso de Alunos (Homologação).

### Estágio 3: Ativação (Go-to-Market)
*   **Gatilho:** Migração 100% concluída.
*   **Objetivo:** Realizar as primeiras vendas via B4You.
*   **Playbook Automático:**
    *   [ ] Liberar Links de Afiliados para os Creators.
    *   [ ] Monitorar tráfego nos primeiros 48h.
    *   [ ] Call de Alinhamento Pós-Lançamento (15 dias).

### Estágio 4: Growth (Gestão de Carteira)
*   **Gatilho:** Vendas recorrentes > R$ X.
*   **Objetivo:** Manter o relacionamento e aumentar LTV.
*   **Rotina (SLA):**
    *   Reunião Quinzenal (Check-in).
    *   Relatório Mensal de Performance.
    *   Resposta no WhatsApp em < 2 horas.

### Estágio 5: Risco/Churn
*   **Gatilho:** Queda de 30% no faturamento ou Sem resposta há 5 dias.
*   **Objetivo:** Reverter insatisfação.
*   **Playbook Automático:**
    *   [ ] Acionar Gerente Sênior (Escalonamento).
    *   [ ] Agendar Reunião de Resgate.

---

## 3. Estrutura de Dados 360° (O "Client Profile")

A tela de Chat atual (`Inbox`) deve evoluir para um **Cockpit do Cliente**.

**Esquerda (Lista):** Organizada por Prioridade (Risco > Onboarding > Growth).
**Centro (Chat):** Histórico Evolution API + Notas Internas (Mistas).
**Direita (Contexto 360):**
1.  **Header:** Foto, Nome, MRR Atual, Saúde (Score).
2.  **Aba Playbook:** Lista de Tarefas (Work OS) vinculadas a este cliente.
3.  **Aba Timeline:** Histórico unificado (ex: "Mudou de fase", "Enviou contrato", "Reunião realizada").
4.  **Aba Arquivos:** Contratos, Briefings, Midia Kits (Linkados ao Storage).

---

## 4. Visão do Administrador (Gestão de Equipe)

O Admin não vê conversas individuais por padrão, ele vê **Métricas de Performance**.

*   **KPIs de Gerente:**
    *   Volume de Mensagens (Entrada/Saída).
    *   Tempo Médio de Resposta (SLA).
    *   Tarefas Concluídas vs Atrasadas.
    *   Saúde da Carteira (Quantos clientes em Risco?).
*   **Audit Log:** Quem mudou o status do cliente X? Quem apagou a tarefa Y?

