# Proposta Executiva: B4You Work OS & Chat CRM (v3)

## 1. Visão do Produto
A transformação do B4You Hub em um **Work OS (Sistema Operacional de Trabalho)** visa resolver a fragmentação do fluxo de trabalho das equipes de Customer Success (CS). Atualmente, o CS alterna entre CRM, Planilhas e WhatsApp Web/Desktop. Nossa proposta é unificar essas experiências em uma **Interface de Comando Única**.

O objetivo não é apenas "integrar o WhatsApp", mas sim criar um ambiente onde a comunicação é o motor da gestão. Cada conversa é um ativo da empresa, não do telefone do funcionário. O design seguirá os padrões de excelência visual da Apple (Human Interface Guidelines), priorizando clareza, fluidez e feedback tátil.

---

## 2. Jornada do Usuário (User Experience)

### A. O Início do Dia (Dashboard & Connect Hub)
1.  **Login & Status**: Ao entrar, o CS vê seu status de conexão com o WhatsApp no canto superior. Se estiver desconectado, um indicador sutil (ponto vermelho pulsante) alerta.
2.  **Conexão Simplificada**: Ao clicar no status, o `Connect Hub` desliza em um modal elegante. O usuário vê um QR Code gerado em tempo real pela Evolution API.
3.  **Feedback de Conexão**: Ao escanear, o sistema não apenas diz "Conectado", mas sincroniza as últimas conversas em background, mostrando uma barra de progresso visual ("Sincronizando 15 conversas...").

### B. A Nova Inbox (O Centro de Comando)
A tela `Inbox` substitui o WhatsApp Web. Ela é dividida em três painéis de vidro fosco (Glassmorphism), criando uma hierarquia visual clara.

**Painel 1: A Lista Inteligente (Esquerda)**
*   **Filtragem Contextual**: Em vez de apenas "Lidos/Não Lidos", temos abas como "Negociação", "Onboarding", "Risco". O sistema sabe em que fase o lead está e o agrupa automaticamente.
*   **Previsibilidade**: Cada card de conversa mostra não só a última mensagem, mas a *próxima ação* necessária (ex: ícone de calendário indicando uma reunião agendada).
*   **Indicadores de Estado**: Se uma mensagem falhou ao enviar (offline), um ícone de alerta vermelho aparece. Se está na fila de envio, um relógio cinza.

**Painel 2: O Palco da Conversa (Centro)**
*   **Imersão**: O chat ocupa o espaço central. Balões de mensagem com cantos arredondados suaves, cores da marca (Verde B4You) para o usuário e cinza neutro para o cliente.
*   **Rich Media**: Áudios com visualização de ondas (waveform) interativas. Imagens com preview em alta definição e lightbox ao clicar.
*   **Feedback em Tempo Real**: Indicadores de "Digitando..." e "Gravando áudio..." reais, capturados via WebSocket da Evolution API.
*   **Modo Stealth (Privacidade)**: O CS pode ler mensagens e ouvir áudios sem enviar o "check azul" até que decida responder.

**Painel 3: O Cérebro do CRM (Direita - Contexto)**
*   **Identidade Unificada**: Ao clicar em uma conversa, este painel carrega instantaneamente os dados do Lead (foto, cargo, empresa, valor do contrato).
*   **Ações de Work OS**:
    *   *Pipeline*: Uma barra de progresso no topo permite mover o lead de "Qualificação" para "Fechamento" com um clique.
    *   *Tarefas Rápidas*: Uma lista de *to-do* vinculada àquele chat. "Ligar amanhã", "Enviar contrato".
    *   *Anotações*: Um bloco de notas persistente para registrar detalhes que não vão para o chat (ex: "Cliente prefere contato pela manhã").

### C. Cenários de Exceção & Resiliência
*   **Queda de Internet**: O CS continua trabalhando. Ele envia mensagens, cria tarefas e muda status. O sistema guarda tudo em uma fila local (IndexedDB/Firestore Cache) e mostra um ícone de "Sincronização Pendente". Assim que a rede volta, o sistema dispara a fila sequencialmente.
*   **Troca de Responsável (Handover)**: O Gestor decide transferir um lead de "João" para "Maria".
    *   Na tela da Maria, o chat aparece instantaneamente com *todo* o histórico anterior.
    *   O sistema insere uma linha divisória sutil no chat: "Atendimento transferido para Maria".
    *   Maria responde usando o número da empresa (ou o seu próprio, dependendo da rota), mas para o cliente, a transição é fluida.

---

## 3. Especificações de Design (UI)

### Tipografia & Cor
*   **Fonte**: Inter (Google Fonts) ou SF Pro (Apple System), com tracking ajustado para leitura densa.
*   **Paleta**:
    *   Fundo App: `#F5F5F7` (Cinza Apple).
    *   Superfícies: Branco puro com `backdrop-filter: blur(20px)` para painéis flutuantes.
    *   Acentos: Verde B4You (`#16a34a`) para ações primárias e sucesso. Vermelho suave (`#EF4444`) para erros e riscos.

### Micro-interações
*   **Hover Effects**: Cards elevam-se suavemente (`transform: translateY(-2px)`) ao passar o mouse.
*   **Transições**: Navegação entre chats deve ter animação de slide sutil, como no iOS.
*   **Loaders**: Nada de spinners chatos. Usaremos esqueletos (skeletons) pulsantes que imitam o conteúdo carregando.

---

## 4. Requisitos Funcionais do Sistema

### Módulo de Chat
1.  **Envio de Texto/Emoji**: Suporte completo.
2.  **Envio de Mídia**: Drag-and-drop de arquivos para a área de chat. Upload automático para Firebase Storage e envio do link/thumbnail via API.
3.  **Citação/Reply**: Deslizar mensagem para direita para responder especificamente a ela.
4.  **Audio Player**: Player customizado HTML5, não o nativo do browser. Deve permitir aceleração (1.5x, 2x).

### Módulo de Gestão (Contexto)
1.  **Edição de Lead**: Editar nome, email e telefone diretamente na sidebar.
2.  **Tagging**: Adicionar/Remover tags (ex: "Quente", "Pós-Venda") que funcionam como filtros na lista.
3.  **Histórico de Atividades**: Log automático no CRM quando uma conversa é iniciada ou encerrada.

### Módulo de Conexão
1.  **Multi-Sessão**: O sistema deve suportar múltiplas instâncias conectadas simultaneamente.
2.  **Roteamento Inteligente**: O sistema deve saber qual instância usar para responder baseada no `ownerId` do Lead.

---

## 5. Estratégia de Dados (Backend Simulation)

Para o Frontend funcionar perfeitamente, assumimos que o Backend (GCP + Evolution) garante:
*   **Webhooks**: Cada mensagem recebida no WhatsApp dispara um POST para nosso endpoint, que atualiza o Firestore em < 500ms.
*   **Fila de Saída**: O Frontend escreve em `leads/{id}/timeline` e o Backend consome essa coleção para enviar via API. Isso desacopla a UI da latência da API do WhatsApp.

---

## 6. Próximos Passos de Execução

1.  **Refatoração da Inbox**: Transformar a `Inbox.tsx` atual no layout de 3 colunas.
2.  **Componentização**: Criar `ChatBubble`, `ContactList`, `CRMSidebar`.
3.  **Integração de Dados**: Conectar os componentes aos Hooks do Firestore (`useCollection`).
4.  **Polimento Visual**: Aplicar as regras de design (sombras, blur, tipografia).
