import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useOnlineStatus } from './useOnlineStatus';
import { 
  initializeOfflineData, 
  performFullSync, 
  setupSyncListeners,
  getPendingSyncCount
} from '@/lib/syncService';
import { 
  getByIndex, 
  put, 
  remove,
  initOfflineDb
} from '@/lib/offlineDb';
import { supabase } from '@/integrations/supabase/client';

export const useOfflineData = () => {
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const [isInitialized, setIsInitialized] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (user?.id) {
        try {
          await initializeOfflineData(user.id);
          setIsInitialized(true);
          const count = await getPendingSyncCount();
          setPendingCount(count);
        } catch (error) {
          console.error('Erro ao inicializar dados offline:', error);
        }
      }
    };
    init();
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      const cleanup = setupSyncListeners(user.id);
      return cleanup;
    }
  }, [user?.id]);

  useEffect(() => {
    const updatePendingCount = async () => {
      const count = await getPendingSyncCount();
      setPendingCount(count);
    };
    if (isOnline) {
      updatePendingCount();
    }
  }, [isOnline]);

  const forceSync = useCallback(async () => {
    if (!user?.id || !isOnline) return;
    setIsSyncing(true);
    try {
      await performFullSync(user.id);
      const count = await getPendingSyncCount();
      setPendingCount(count);
    } finally {
      setIsSyncing(false);
    }
  }, [user?.id, isOnline]);

  return {
    isInitialized,
    isOnline,
    pendingCount,
    isSyncing,
    forceSync,
    hasPendingData: pendingCount > 0
  };
};

// Hook para operações offline-first - usando any para compatibilidade com Supabase types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useOfflineCollection(tableName: string) {
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    setError(null);

    try {
      await initOfflineDb();

      if (isOnline) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: serverData, error: serverError } = await (supabase as any)
          .from(tableName)
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (serverError) throw serverError;
        setData(serverData || []);
        
        if (serverData) {
          for (const record of serverData) {
            await put(tableName, { ...record, synced: true });
          }
        }
      } else {
        const localData = await getByIndex(tableName, 'user_id', user.id);
        setData(localData);
      }
    } catch (err) {
      console.error(`Erro ao carregar ${tableName}:`, err);
      setError(err as Error);
      try {
        const localData = await getByIndex(tableName, 'user_id', user.id);
        setData(localData);
      } catch (localErr) {
        console.error('Erro ao carregar dados locais:', localErr);
      }
    } finally {
      setIsLoading(false);
    }
  }, [tableName, user?.id, isOnline]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const upsert = useCallback(async (record: any): Promise<any> => {
    if (!user?.id) return null;

    const now = new Date().toISOString();
    const fullRecord = {
      ...record,
      user_id: user.id,
      updated_at: now,
      ...(!record.id && { created_at: now })
    };

    try {
      if (isOnline) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: serverData, error: serverError } = await (supabase as any)
          .from(tableName)
          .upsert(fullRecord)
          .select()
          .single();

        if (serverError) throw serverError;
        await put(tableName, { ...serverData, synced: true });
        
        setData(prev => {
          const index = prev.findIndex(r => r.id === serverData.id);
          if (index >= 0) {
            const newData = [...prev];
            newData[index] = serverData;
            return newData;
          }
          return [serverData, ...prev];
        });
        return serverData;
      } else {
        const localRecord = await put(tableName, fullRecord);
        setData(prev => {
          const index = prev.findIndex(r => r.id === localRecord.id);
          if (index >= 0) {
            const newData = [...prev];
            newData[index] = localRecord;
            return newData;
          }
          return [localRecord, ...prev];
        });
        return localRecord;
      }
    } catch (err) {
      console.error(`Erro ao salvar ${tableName}:`, err);
      throw err;
    }
  }, [tableName, user?.id, isOnline]);

  const deleteRecord = useCallback(async (id: string): Promise<void> => {
    try {
      if (isOnline) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: serverError } = await (supabase as any)
          .from(tableName)
          .delete()
          .eq('id', id);

        if (serverError) throw serverError;
      }
      await remove(tableName, id);
      setData(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error(`Erro ao deletar ${tableName}:`, err);
      throw err;
    }
  }, [tableName, isOnline]);

  return {
    data,
    isLoading,
    error,
    refresh: loadData,
    upsert,
    delete: deleteRecord,
    isOnline
  };
}
