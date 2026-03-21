
Atue como um Engenheiro de Software Sênior Especialista em React e Firebase.
Você deve evoluir a plataforma "B4You Hub" para a versão de Produção focada na **Jornada do Cliente 360°**.

**Contexto:**
Já possuímos o Chat (Evolution API), Tarefas (Monday-like) e Gestão de Creators.
Agora precisamos integrar tudo em uma **Visão Unificada** para o Gerente de Contas.

**Tarefas Principais para Execução:**

1.  **Refatoração do `CRMPanel.tsx` (ClientOS):**
    *   Transforme este componente no centro de comando.
    *   Adicione abas funcionais:
        *   **Timeline:** Deve mostrar histórico misto (Mensagens WhatsApp + Logs de Sistema + Notas Internas).
        *   **Tarefas:** Deve listar as tarefas do `WorkTask` filtradas para ESTE cliente específico. Permita dar "Check" direto daqui.
        *   **Arquivos:** Crie uma UI simples para listar links/arquivos (contratos, mídias).
    *   Implemente a lógica de "Notas Internas": Um input de texto que salva uma mensagem no chat mas com flag `isInternal: true` (não envia pro WhatsApp).

2.  **Automação de Playbook (Frontend Simulation):**
    *   No `CRMPanel`, ao mudar o Status do Lead/Producer (ex: de Aquisição para Onboarding):
    *   Dispare automaticamente a criação de 3 tarefas padrão no Firebase (`tasks` collection):
        *   "Agendar Reunião de Kick-off"
        *   "Criar Grupo no WhatsApp"
        *   "Validar Contrato"
    *   Mostre um Toast de confirmação: "Playbook de Onboarding Iniciado".

3.  **Dashboard de Admin (`AdminPanel.tsx`):**
    *   Crie uma nova aba "Performance da Equipe".
    *   Renderize uma tabela que lista os Gerentes (Users com role `cs_manager`).
    *   Colunas Calculadas (Mock por enquanto, mas estrutura real):
        *   Carteira (Qtd Leads).
        *   MRR Total (Soma dos leads).
        *   Tarefas Pendentes.
        *   SLA de Resposta (Exiba um valor estático "25min" por enquanto).

4.  **Integração Visual:**
    *   Garanta que ao clicar em uma Tarefa no `MyWork`, se ela tiver `leadId`, abra o Chat desse lead imediatamente (`Inbox` com filtro).
    *   No `Inbox`, destaque visualmente mensagens que são "Notas Internas" (fundo amarelo claro, borda diferente).

**Diretrizes Técnicas:**
*   Mantenha o uso de Tailwind CSS e Lucide React.
*   Use `db.collection('tasks')`, `db.collection('producers')` e `db.collection('timeline')`.
*   Não quebre as funcionalidades existentes de Chat e Conexão QR Code.
*   Priorize a UX: O gerente não deve precisar trocar de tela para trabalhar.

Analise os arquivos `arquitetura_jornada_cliente.md` e `solicitacao_backend_final.md` que criei na raiz para entender as regras de negócio profundas.

Gere o código atualizado para os componentes afetados.
