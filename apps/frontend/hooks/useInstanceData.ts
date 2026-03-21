
import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { EvolutionInstance } from '../types';

export const useInstanceData = (instanceId: string) => {
  const [data, setData] = useState<EvolutionInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!instanceId) {
      setLoading(false);
      return;
    }

    const unsubscribe = db.collection('instances')
      .doc(instanceId)
      .onSnapshot((doc) => {
        if (doc.exists) {
          setData({ id: doc.id, ...doc.data() } as EvolutionInstance);
        } else {
          setData(null);
          // Não tratamos como erro para permitir que o componente lide com a deleção
        }
        setLoading(false);
      }, (err) => {
        console.error("Instance listener error:", err);
        setError("Falha ao sincronizar dados da instância.");
        setLoading(false);
      });

    return () => unsubscribe();
  }, [instanceId]);

  return { data, loading, error };
};
