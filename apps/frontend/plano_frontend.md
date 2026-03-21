# Plano de Implementação Frontend: Work OS v3

## 1. Arquitetura de Componentes (`src/pages/Inbox/`)

A tela de Inbox será quebrada em sub-componentes menores para manutenção e performance.

```
src/
  components/
    Chat/
      ChatLayout.tsx       # Container Grid (3 colunas)
      Sidebar/
        ConversationList.tsx
        ConversationItem.tsx
        FilterHeader.tsx
      Feed/
        MessageFeed.tsx
        MessageBubble.tsx
        InputArea.tsx
        AudioPlayer.tsx
      Context/
        CRMProfile.tsx
        ActionTimeline.tsx
```

## 2. Gerenciamento de Estado (Local vs Global)

*   **Global (`EvolutionContext`)**: Mantém a lista de instâncias e status de conexão.
*   **Local (`Inbox.tsx`)**:
    *   `selectedChatId`: ID da conversa ativa.
    *   `viewMode`: Controle de visibilidade da sidebar direita (Mobile/Desktop).
    *   `draftMessage`: Texto sendo digitado (para não perder se trocar de chat).

## 3. Integração com Firestore

### Estrutura de Leitura (Hooks)
O Frontend deve ouvir em tempo real:
1.  **Coleção `chats`**: Ordenada por `lastMessageTimestamp`. Usar paginação infinita (carregar 20, scroll, carregar +20).
2.  **Sub-coleção `messages`**: Do chat selecionado. Ordenada por `timestamp`.
3.  **Documento `lead`**: Dados do CRM vinculados ao chat.

### Otimistic UI (Envio de Mensagem)
Ao enviar uma mensagem:
1.  Criar objeto `tempMessage` com ID temporário.
2.  Adicionar ao estado local de mensagens imediatamente.
3.  Disparar `addDoc` no Firestore.
4.  O listener do Firestore eventualmente retornará a mensagem real (com ID do servidor), substituindo a temporária e atualizando o status de `sending` para `sent`.

## 4. Estilização (Tailwind + CSS Modules)

*   Usar classes utilitárias para layout (`flex`, `grid`, `w-full`).
*   Usar variáveis CSS para cores de tema (suporte futuro a Dark Mode).
*   **Scrollbars**: Esconder scrollbars nativas e usar versões finas e customizadas em CSS.
*   **Animações**: `framer-motion` para transições de entrada de mensagens e abertura de painéis.

## 5. Tratamento de Mídia

*   **Imagens**: Usar componentes com `lazy-loading` e fallback de blur.
*   **Áudio**: Implementar visualizador de ondas (pode ser fake/randomico inicialmente se a API não entregar os picos, ou gerado via Web Audio API).

## 6. Responsividade

*   **Desktop (lg/xl)**: 3 Colunas visíveis.
*   **Tablet (md)**: Lista + Chat. Contexto vira um "Drawer" deslizante.
*   **Mobile (sm)**: Apenas Lista. Ao clicar, navega para tela cheia de Chat. Botão "i" abre detalhes do Lead.
