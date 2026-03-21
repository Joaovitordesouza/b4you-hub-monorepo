
# Regras de Segurança do Firebase

Este documento contém todas as regras de segurança para Firestore (Banco de Dados) e Storage (Arquivos).
Copie e cole nas respectivas abas do Console do Firebase.

---

## 1. Firestore Database (Regras de Dados)
**Onde aplicar:** Console > Firestore Database > Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // --- FUNÇÕES AUXILIARES ---

    function isSignedIn() {
      return request.auth != null;
    }
    
    // Verifica se o usuário é Admin (lê do documento do usuário)
    function isAdmin() {
      return isSignedIn() && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Verifica se é o próprio usuário
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    // Verifica se o usuário é dono do recurso (campo ownerId)
    function isResourceOwner() {
      return isSignedIn() && resource.data.ownerId == request.auth.uid;
    }

    // Verifica se o usuário está na lista de membros (array members)
    function isMember() {
      return isSignedIn() && resource.data.members != null && resource.data.members.hasAny([request.auth.uid]);
    }

    // Verifica se o usuário é dono do recurso que ESTÁ SENDO CRIADO (request.resource)
    function isCreatingAsOwner() {
      return isSignedIn() && request.resource.data.ownerId == request.auth.uid;
    }
    
    // --- REGRAS POR COLEÇÃO ---

    // 1. Usuários
    match /users/{userId} {
      // Permite leitura se estiver logado OU se for uma consulta de convite pendente (get)
      allow get: if isSignedIn() || resource.data.status == 'pending';
      allow list: if isSignedIn();
      allow create: if isOwner(userId) || isAdmin();
      allow update: if isOwner(userId) || isAdmin();
      allow delete: if isOwner(userId) || isAdmin() || (resource.data.status == 'pending' && resource.data.email == request.auth.token.email);

      match /notifications/{notificationId} {
        allow read: if isOwner(userId);
        allow create: if isSignedIn();
        allow update, delete: if isOwner(userId);
      }
    }

    // 2. Work OS: Workspaces (workspaces_boards)
    match /workspaces_boards/{workspaceId} {
      allow read: if isSignedIn() && (
        resource.data.isPublic == true || 
        isResourceOwner() || 
        isMember() || 
        isAdmin()
      );
      allow create: if isSignedIn() && isCreatingAsOwner();
      allow update: if isSignedIn() && (
        isResourceOwner() || 
        isMember() || 
        isAdmin()
      );
      allow delete: if isSignedIn() && (isResourceOwner() || isAdmin());
    }

    // 3. Work OS: Quadros (boards)
    match /boards/{boardId} {
      allow read: if isSignedIn() && (
        resource.data.type == 'main' ||
        isResourceOwner() ||
        isMember() ||
        isAdmin()
      );
      allow create: if isSignedIn() && isCreatingAsOwner();
      allow update: if isSignedIn() && (
        isResourceOwner() ||
        isMember() ||
        isAdmin() ||
        resource.data.type == 'main'
      );
      allow delete: if isSignedIn() && (isResourceOwner() || isAdmin());
    }

    // 4. CRM: Campanhas
    match /campaigns/{campaignId} {
      allow read: if isResourceOwner() || isAdmin();
      allow create: if isSignedIn() && isCreatingAsOwner();
      allow update, delete: if isResourceOwner() || isAdmin();
    }

    // 5. CRM: Leads
    match /leads/{leadId} {
      allow read: if isSignedIn(); 
      allow create: if isSignedIn() && isCreatingAsOwner();
      allow update, delete: if isResourceOwner() || isAdmin();
      
      match /timeline/{eventId} {
         allow read, write: if isSignedIn();
      }
    }

    // 6. Kiwify: Workspaces de Integração
    match /workspaces/{workspaceId} {
      allow read: if isResourceOwner() || isAdmin();
      allow create: if isSignedIn() && isCreatingAsOwner();
      allow update, delete: if isResourceOwner() || isAdmin();
    }

    // 7. Tech: Migrações e Aulas
    match /migrations/{migrationId} {
      allow read: if resource.data.userId == request.auth.uid || isAdmin();
      allow create: if isSignedIn();
      allow update, delete: if resource.data.userId == request.auth.uid || isAdmin();
      
      match /lessons/{lessonId} {
        allow read: if isSignedIn();
      }
    }

    // 8. Tasks (Tarefas Avulsas)
    match /tasks/{taskId} {
      allow read: if isSignedIn(); 
      allow create: if isSignedIn();
      allow update, delete: if isSignedIn();
    }

    // 9. Carteira de Produtores
    match /producers/{producerId} {
      allow read: if isSignedIn(); 
      allow create: if isSignedIn();
      allow update, delete: if isSignedIn();
      
      match /timeline/{eventId} {
         allow read, write: if isSignedIn();
      }
      match /files/{fileId} {
         allow read, write: if isSignedIn();
      }
    }

    // 9.1 Lançamentos (Launches)
    match /launches/{launchId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update, delete: if isSignedIn();
    }

    // 10. Evolution API: Instâncias e Chats
    match /instances/{instanceId} {
      // FIX: Permitir leitura para qualquer usuário logado para evitar erros de snapshot
      allow read: if isSignedIn(); 
      allow create: if isSignedIn() && isCreatingAsOwner();
      allow update, delete: if isResourceOwner() || isAdmin();

      match /chats/{chatId} {
         allow read, write: if isSignedIn(); 
         match /messages/{messageId} { allow read, write: if isSignedIn(); }
      }

      match /outbox/{msgId} {
         allow read, write: if isSignedIn();
      }
    }
    
    // 11. Logs de Auditoria
    match /audit_logs/{logId} {
      allow create: if isSignedIn();
      allow read: if isAdmin();
    }

    // --- REGRAS DE GRUPO DE COLEÇÕES (COLLECTION GROUP) ---
    // Necessário para queries que varrem subcoleções em múltiplos documentos pai
    
    match /{path=**}/timeline/{eventId} {
      allow read: if isSignedIn();
    }

    match /{path=**}/chats/{chatId} {
      allow read: if isSignedIn();
    }
  }
}
```

---

## 2. Storage Rules (Arquivos e Mídia)
**Onde aplicar:** Console > Storage > Rules

Estas regras permitem que qualquer usuário logado envie imagens, áudios e arquivos.

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Permite acesso a qualquer caminho para usuários autenticados
    // Isso cobre 'media/', 'audio/', 'producers/' etc.
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
