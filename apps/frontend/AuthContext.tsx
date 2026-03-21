
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from './firebase';
import firebase from 'firebase/compat/app';
import { Usuario } from './types';

interface AuthContextType {
  currentUser: Usuario | null;
  loading: boolean;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<Usuario>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  logout: async () => {},
  updateProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // --- SECURITY CHECK v2.0 ---
          // Não cria mais perfil automaticamente. 
          // O perfil deve ter sido criado previamente por um Admin.
          
          const userDocRef = db.collection("users").doc(firebaseUser.uid);
          const userDoc = await userDocRef.get();
          
          if (userDoc.exists) {
            const userData = userDoc.data() as Usuario;
            
            // Verifica se a conta está ativa
            if (userData.status === 'inactive' || userData.status === 'suspended') {
                console.warn("Acesso negado: Conta inativa.");
                await auth.signOut();
                setCurrentUser(null);
            } else {
                setCurrentUser({
                  id: firebaseUser.uid,
                  uid: firebaseUser.uid,
                  email: firebaseUser.email || "",
                  ...userData
                } as Usuario);
                
                // Atualiza último acesso
                await userDocRef.update({ 
                    lastActive: new Date().toISOString(),
                    lastLoginAt: new Date().toISOString()
                });
            }
          } else {
            console.error("ERRO CRÍTICO: Usuário autenticado sem perfil no Firestore. Acesso negado.");
            // Logout forçado para garantir segurança
            await auth.signOut();
            setCurrentUser(null);
            alert("Acesso negado. Sua conta não possui um perfil de colaborador configurado. Contate o administrador.");
          }
        } catch (error) {
          console.error("Erro de Autenticação/Firestore:", error);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });
  }, []);

  const logout = () => auth.signOut();

  const updateProfile = async (data: Partial<Usuario>) => {
      if (!currentUser) return;
      try {
          await db.collection("users").doc(currentUser.id).update(data);
          setCurrentUser(prev => prev ? { ...prev, ...data } : null);
      } catch (error) {
          console.error("Erro ao atualizar perfil:", error);
          throw error;
      }
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
