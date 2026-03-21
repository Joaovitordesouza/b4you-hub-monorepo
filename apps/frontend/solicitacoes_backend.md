
# Solicitação de Recursos ao Backend (B4You Hub v8.0)

Durante a integração do Frontend com a nova API (v2) e Cloud Functions, identificamos os seguintes pontos que necessitam de implementação no backend para completude do produto:

## 1. Marcar Conversa como Lida (`markChatAsRead`)
O Guia v8.0 menciona que o backend atualiza o Firestore via Webhook (`Incoming`), mas não especifica uma função `Outgoing` para limpar o contador de não lidas e enviar o *Blue Check* para o cliente.

**Solicitação:** Criar Callable `markChatAsRead`.
```javascript
// Exemplo de uso esperado no Frontend
await markChatAsRead({
  instanceName: "user-123",
  remoteJid: "5511999999999@s.whatsapp.net"
});
```

## 2. Reenvio de Mensagem (`resendMessage`)
Para mensagens que falharam (status `error`), precisamos de um método para tentar novamente sem criar um novo registro no histórico, ou criar um novo mantendo o contexto.

**Solicitação:** Endpoint ou flag na `sendMessage` para retry.



## 3. Webhook de Status da Instância
Garantir que eventos de `connection.update` (QR Code gerado, Conectado, Desconectado) atualizem o documento `instances/{id}` em tempo real, especificamente os campos `connectionStatus` e `qrcode`, para que o Wizard de Conexão do Frontend funcione fluidamente sem polling excessivo.
