# Plano do Projeto - B4You Hub

## Visão Geral
Plataforma de gestão integrada para creators e afiliados, combinando CRM, Work OS (Gestão de Tarefas), Chat Omni-channel e Ferramentas de Migração (Kiwify/Hotmart). O objetivo é centralizar a operação de scale-up de infoprodutores.

## Objetivo Principal
Fornecer uma interface unificada ("Hub") onde a equipe B4You possa gerenciar todo o ciclo de vida dos parceiros, desde a prospecção (Hunter AI) até a gestão diária (Customer Success) e suporte técnico.

## Escopo Funcional
1.  **Hunter AI**: Ferramenta de prospecção e enriquecimento de leads (Instagram/Kiwify).
2.  **Pipeline de Vendas (CRM)**: Kanban para gestão de negociações.
3.  **Onboarding**: Esteira técnica para migração de cursos e setup.
4.  **Client OS (Creator Dashboard)**: Visão 360° do cliente (Financeiro, Tarefas, Arquivos).
5.  **Work OS**: Gestão de tarefas estilo Monday.com para a equipe interna.
6.  **Connect Hub**: Gestão de instâncias do WhatsApp (Evolution API).
7.  **Inbox (Chat)**: Atendimento centralizado multi-agente.
8.  **Gestão de Acessos (IAM)**: Controle de usuários e permissões.

## Arquitetura Geral
-   **Frontend**: React (Vite), Tailwind CSS, Lucide Icons, Recharts.
-   **Backend**: Firebase (Auth, Firestore, Storage, Cloud Functions).
-   **Integrações**: Evolution API (WhatsApp), Firecrawl (Scraping), OpenAI/Gemini (AI).

## Regras de Negócio
-   Usuários possuem roles (Admin, Hunter, CS, Support).
-   Leads passam por funil: Novo -> Negociação -> Fechado.
-   Clientes (Producers) possuem métricas financeiras (MRR, Health Score).
-   A comunicação é centralizada via instâncias de WhatsApp conectadas.

## Estratégia de Evolução Incremental
1.  Estabilização da UI e Correção de Bugs (Foco Atual).
2.  Implementação de funcionalidades de Real-time e Chat.
3.  Otimização de Performance e Refatoração de Código.
