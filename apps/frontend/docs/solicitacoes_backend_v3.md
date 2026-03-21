# Solicitação de Implementação Backend (v3.0) - Outbox & Eventos

**Prioridade:** CRÍTICA (Bloqueia Refatoração Frontend)
**Solicitante:** Frontend Team (Architecture Update)

Para finalizar a implementação do padrão **Offline-First** e garantir a consistência do chat, necessitamos da implementação dos seguintes Triggers e Workers no Backend.

O Frontend deixará de chamar `functions.httpsCallable('sendMessage')` diretamente.

## 1. Trigger de Processamento de Outbox (`onOutboxCreate`)

**Gatilho:** Criação de documento em `instances/{instanceId}/outbox/{eventId}`.

**Comportamento Esperado:**
1.  Ler o documento criado.
2.  Executar a ação correspondente na Evolution API (envio, edição, deleção).
3.  **Sucesso:** 
    *   Atualizar documento da `outbox` para `status: 'COMPLETED'`.
    *   Persistir a mensagem enviada na subcoleção `instances/{id}/chats/{chatId}/messages` com os dados retornados pela Evolution (incluindo ID real).
4.  **Erro:** Atualizar documento da `outbox` para `status: 'ERROR'` com campo `errorMessage`.

**Tipos de Eventos (Payloads):**

### A. Enviar Mensagem (`SEND_MESSAGE`)
```json
{
  "type": "SEND_MESSAGE",
  "chatId": "5511999999999@s.whatsapp.net",
  "content": {
    "text": "Olá, tudo bem?", // Opcional se tiver media
    "mediaUrl": "https://...", // Opcional (Link do Firebase Storage)
    "mediaType": "image" // 'image' | 'video' | 'audio' | 'document'
  },
  "status": "PENDING",
  "createdAt": "Timestamp"
}
```
*Nota Crítica:* Se `mediaType` for `audio`, o Backend **DEVE** converter o arquivo (geralmente WebM do browser) para MP3/OGG compatível com WhatsApp antes de enviar para a Evolution API.

### B. Deletar Mensagem (`DELETE_MESSAGE`)
```json
{
  "type": "DELETE_MESSAGE",
  "chatId": "5511999999999@s.whatsapp.net",
  "content": {
    "messageId": "BAE5F...",
    "forEveryone": true
  },
  "status": "PENDING"
}
```

### C. Editar Mensagem (`EDIT_MESSAGE`)
```json
{
  "type": "EDIT_MESSAGE",
  "chatId": "5511999999999@s.whatsapp.net",
  "content": {
    "messageId": "BAE5F...",
    "newText": "Texto corrigido"
  },
  "status": "PENDING"
}
```

## 2. Worker de Conversão de Áudio

O Frontend grava áudio usando `MediaRecorder` API, que gera arquivos `.webm`. O WhatsApp no iOS não reproduz `.webm` nativamente.
**Requisito:** O Trigger `SEND_MESSAGE` deve detectar se é áudio, baixar o arquivo do Storage, converter (ffmpeg) e enviar o binário compatível para a Evolution API.

## 3. Callable: Read Receipt (`markChatAsRead`)

Embora o envio seja via Outbox, a marcação de leitura pode permanecer como Callable ou Trigger. 
**Solicitação:** Garantir que exista uma função ou trigger que, ao zerarmos o `unreadCount` no Firestore (que o front já faz), dispare o `read` para o WhatsApp do cliente.
