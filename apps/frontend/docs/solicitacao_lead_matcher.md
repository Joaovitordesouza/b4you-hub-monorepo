# Solicitação de Backend: Lead Matcher & Enriquecimento de Chat

**Prioridade:** ALTA
**Contexto:** O Frontend precisa exibir dados do Lead (Nome, Score, Tags) na lista de conversas do WhatsApp, mas atualmente o chat chega apenas com o número de telefone (`remoteJid`).

Precisamos de uma Cloud Function (Trigger) que intercepte novas conversas e faça o vínculo automático com o CRM.

## 1. Trigger: `onChatCreate` ou `onMessageReceived`

**Gatilho:** Quando um documento é criado/atualizado em `instances/{instanceId}/chats/{chatId}`.

**Lógica Necessária:**

1.  **Verificar Vínculo Existente:**
    Se o campo `leadId` já existir no documento do chat, **PARE**. (Evita processamento desnecessário).

2.  **Extrair Telefone:**
    Obter o número do `chatId` (ex: `5511999999999@s.whatsapp.net` -> `5511999999999`).

3.  **Buscar no CRM (Coleção `leads`):**
    Executar query buscando leads que possuam esse número em `dados_contato.whatsapp`.
    *Dica:* Tentar match exato e match sem o "9" adicional se falhar.

4.  **Ação de Vínculo (Match Encontrado):**
    Atualizar o documento do Chat com os dados do Lead encontrado:
    ```javascript
    await chatRef.update({
      leadId: leadDoc.id,
      leadName: leadDoc.data().nome_display,
      leadAvatar: leadDoc.data().foto_url,
      leadScore: leadDoc.data().score_qualificacao,
      ownerId: leadDoc.data().ownerId, // Vital para o filtro de "Meus Chats" funcionar
      tags: leadDoc.data().tags
    });
    ```

5.  **Ação Sem Match (Novo Contato):**
    Se não encontrar lead, marcar o chat como "Desconhecido" ou criar um "Lead Provisório" (opcional, definir regra de negócio).

## 2. Trigger: Sincronização de Proprietário (`onLeadUpdate`)

**Gatilho:** Quando um Lead é transferido de dono no CRM (`leads/{leadId}`).

**Lógica:**
1.  Buscar todas as conversas abertas vinculadas a este `leadId`.
2.  Atualizar o campo `ownerId` nessas conversas para refletir o novo dono.
    *   *Isso garante que o chat "suma" da tela do antigo dono e "apareça" na do novo instantaneamente.*

---

**Impacto no Frontend:**
Com essas implementações, o componente `ChatSidebar` e `CRMPanel` funcionarão automaticamente, exibindo a foto e nome corretos do cliente ao invés de apenas o número de telefone.