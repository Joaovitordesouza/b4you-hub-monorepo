# Documentação de Conexão com Backend e Fluxo de Migração

## 1. Visão Geral da Arquitetura

O **B4You Prospector** opera em uma arquitetura híbrida (Serverless + Servidor Dedicado):

1.  **Frontend (React/Vite):** Interface do usuário.
2.  **BaaS (Firebase):** Gerencia autenticação, banco de dados de usuários, campanhas e metadados dos workspaces.
3.  **Bridge API (VM Dedicada):** Um servidor Python (FastAPI) que atua como "ponte". Ele realiza o trabalho pesado de baixar cursos, processar vídeos (FFmpeg) e servir os arquivos estáticos via streaming.

---

## 2. Recursos do Backend Detalhados

### A. Firebase (Google Cloud)
Utilizado para dados relacionais leves e tempo real.

*   **Authentication:** Gerencia login/cadastro (Email/Senha).
*   **Firestore (NoSQL):**
    *   `users`: Perfis e níveis de acesso.
    *   `workspaces`: Armazena tokens da Kiwify e IDs de conexão (Não armazena o conteúdo do curso, apenas as credenciais).
    *   `campaigns` & `leads`: Dados do CRM de prospecção.

### B. Bridge API (Servidor de Mídia/Migração)
*   **Host:** `https://34-136-160-206.sslip.io` (Definido em `config.ts`).
*   **Tecnologia Inferida:** Python (FastAPI/Flask) + FFmpeg + File System.
*   **Responsabilidades:**
    1.  **Proxy Kiwify:** Repassa requisições para a API da Kiwify usando o token do usuário para listar cursos.
    2.  **Worker de Download:** Gerencia filas de download de vídeos.
    3.  **Streaming:** Serve os vídeos processados (`streamUrl`).

#### Endpoints Principais (`services/bridgeApi.ts`)

| Método | Endpoint | Função | Payload/Headers |
|:--- |:--- |:--- |:--- |
| `GET` | `/courses` | Lista produtos da conta Kiwify | Header: `Authorization: Bearer {token}` |
| `POST` | `/courses/migrate` | Inicia o download de um curso | Body: `{ courseId, workspaceId }` |
| `GET` | `/workspaces/{id}/status` | Retorna % de progresso da migração | - |
| `GET` | `/gallery` | Retorna estrutura local (JSON) para o player | Query: `?workspaceId={id}` |

---

## 3. Fluxo de Migração Detalhado

O processo de "Migração" consiste em baixar o conteúdo da Kiwify para o servidor da B4You para consumo offline/local.

### Etapa 1: Credenciamento (Frontend -> Firebase)
1.  O usuário obtém o Token via extensão (ver `HelpScreen.tsx`).
2.  Em `KiwifyDownloader.tsx`, o usuário cria um "Workspace".
3.  **Ação Backend:** O Frontend salva o Token no **Firestore** (`db.collection("workspaces")`).
    *   *Nota:* O Token fica salvo no Firebase, mas será enviado à Bridge API nas requisições subsequentes.

### Etapa 2: Listagem de Catálogo (Frontend -> Bridge API -> Kiwify)
1.  O usuário seleciona um Workspace.
2.  O Frontend recupera o Token do Firebase.
3.  Chamada: `bridgeApi.listCourses(token)`.
    *   O Frontend envia o Token para a Bridge API.
    *   A Bridge API atua como Proxy e consulta a Kiwify.
    *   Retorna metadados (Nome, Capa, ID) para o grid.

### Etapa 3: Acionamento da Migração (Trigger)
Quando o usuário clica em "Sincronizar" ou "Play" (se não baixado):

1.  **Ação Frontend:** `KiwifyDownloader` chama `bridgeApi.migrateCourse(courseId, workspaceId, token)`.
2.  **Ação Backend (Bridge):**
    *   Recebe o comando.
    *   Valida o token na Kiwify.
    *   Adiciona o curso a uma **Fila de Processamento (Queue)**.
    *   Retorna `200 OK` (Ack).
    *   *Assíncrono:* O servidor começa a baixar as aulas, baixar os vídeos (Vimeo/Panda/etc) e processá-los.

### Etapa 4: Polling de Status (Monitoramento)
Imediatamente após o acionamento, o Frontend entra em loop de verificação:

1.  **Loop:** `setInterval` a cada 3 segundos (definido em `KiwifyDownloader.tsx`).
2.  **Chamada:** `bridgeApi.getWorkspaceStatus(workspaceId)`.
3.  **Resposta Backend:** Retorna um array de objetos `MigrationStatus`:
    ```json
    [
      {
        "courseId": "abc-123",
        "status": "downloading",
        "progress": 45, // Usado na barra de progresso da UI
        "error": null
      }
    ]
    ```
4.  **UI:** Atualiza a barra de progresso e o ícone de status (ex: "Baixando... 45%").

### Etapa 5: Conclusão e Consumo (Gallery)
Quando o status muda para `completed`:

1.  O Frontend libera o botão "Assistir".
2.  Ao entrar na `KiwifyGallery`, chama `bridgeApi.getGallery()`.
3.  **Resposta Backend:** Retorna a estrutura final mapeada do disco local do servidor:
    ```json
    {
      "course": { ... },
      "modules": [
        {
          "lessons": [
            {
              "title": "Aula 1",
              "video": {
                "streamUrl": "https://34-136-160-206.sslip.io/static/videos/aula1.mp4"
              }
            }
          ]
        }
      ]
    }
    ```
4.  O player HTML5 consome diretamente a `streamUrl` fornecida pelo Backend Dedicado.

---

## 4. Integrações de Terceiros (Prospector)

Embora não faça parte da "Migração Kiwify", o sistema também conecta com:
*   **Gemini API (@google/genai):** Processamento de linguagem natural para análise de leads (Client-side em `services/prospector.ts`).
*   **RapidAPI / Firecrawl:** Scrapers externos chamados diretamente pelo navegador para enriquecimento de dados.

