import { supabase } from '@/integrations/supabase/client';
import {
  getAll,
  put,
  bulkPut,
  getSyncMetadata,
  setSyncMetadata,
  getUnsyncedRecords,
  markAsSynced,
  initOfflineDb
} from './offlineDb';
import { toast } from 'sonner';

type TableName = 'properties' | 'products' | 'applications' | 'application_products' | 'recipes' | 'recipe_products' | 'equipment' | 'flight_planning';

const SYNC_TABLES_WITH_USER: TableName[] = [
  'properties',
  'products',
  'applications',
  'recipes',
  'equipment',
  'flight_planning'
];

const SYNC_TABLES_JUNCTION: TableName[] = [
  'application_products',
  'recipe_products'
];

let isSyncing = false;

// Sincroniza dados do servidor para o local (download)
export const syncFromServer = async (userId: string): Promise<void> => {
  console.log('🔄 Iniciando sincronização do servidor...');
  
  // Sincronizar tabelas com user_id
  for (const tableName of SYNC_TABLES_WITH_USER) {
    try {
      const lastSync = await getSyncMetadata(`${tableName}_last_sync`);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase.from(tableName) as any).select('*').eq('user_id', userId);
      
      if (lastSync) {
        query = query.gte('updated_at', lastSync);
      }

      const { data, error } = await query;

      if (error) {
        console.error(`Erro ao sincronizar ${tableName}:`, error);
        continue;
      }

      if (data && data.length > 0) {
        await bulkPut(tableName, data);
        console.log(`✅ ${tableName}: ${data.length} registros sincronizados`);
      }

      await setSyncMetadata(`${tableName}_last_sync`, new Date().toISOString());
    } catch (error) {
      console.error(`Erro ao sincronizar ${tableName}:`, error);
    }
  }

  // Sincronizar tabelas de relacionamento
  try {
    const applications = await getAll('applications');
    const appIds = applications.map((a: { id: string }) => a.id);
    
    if (appIds.length > 0) {
      const { data: appProducts } = await supabase
        .from('application_products')
        .select('*')
        .in('application_id', appIds);
      
      if (appProducts && appProducts.length > 0) {
        await bulkPut('application_products', appProducts);
      }
    }

    const recipes = await getAll('recipes');
    const recipeIds = recipes.map((r: { id: string }) => r.id);
    
    if (recipeIds.length > 0) {
      const { data: recipeProducts } = await supabase
        .from('recipe_products')
        .select('*')
        .in('recipe_id', recipeIds);
      
      if (recipeProducts && recipeProducts.length > 0) {
        await bulkPut('recipe_products', recipeProducts);
      }
    }
  } catch (error) {
    console.error('Erro ao sincronizar tabelas de relacionamento:', error);
  }

  console.log('✅ Sincronização do servidor concluída');
};

// Sincroniza dados locais para o servidor (upload)
export const syncToServer = async (): Promise<{ success: number; failed: number }> => {
  console.log('🔄 Enviando dados locais para o servidor...');
  
  let success = 0;
  let failed = 0;

  const allTables = [...SYNC_TABLES_WITH_USER, ...SYNC_TABLES_JUNCTION];

  for (const tableName of allTables) {
    try {
      const unsyncedRecords = await getUnsyncedRecords(tableName);
      
      for (const record of unsyncedRecords) {
        try {
          // Remove campos locais antes de enviar
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { synced, ...cleanRecord } = record;
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await (supabase.from(tableName) as any)
            .upsert(cleanRecord, { onConflict: 'id' });

          if (error) {
            console.error(`Erro ao enviar ${tableName}/${record.id}:`, error);
            failed++;
          } else {
            await markAsSynced(tableName, record.id);
            success++;
          }
        } catch (error) {
          console.error(`Erro ao processar ${tableName}/${record.id}:`, error);
          failed++;
        }
      }
    } catch (error) {
      console.error(`Erro ao buscar registros não sincronizados de ${tableName}:`, error);
    }
  }

  console.log(`✅ Upload concluído: ${success} sucesso, ${failed} falhas`);
  return { success, failed };
};

// Sincronização completa bidirecional
export const performFullSync = async (userId: string): Promise<void> => {
  if (isSyncing) {
    console.log('⏳ Sincronização já em andamento...');
    return;
  }

  if (!navigator.onLine) {
    console.log('📴 Sem conexão, sincronização adiada');
    return;
  }

  isSyncing = true;

  try {
    // Primeiro envia alterações locais
    const { success, failed } = await syncToServer();
    
    // Depois baixa atualizações do servidor
    await syncFromServer(userId);

    if (success > 0 || failed > 0) {
      if (failed === 0) {
        toast.success(`Sincronização completa! ${success} registros enviados.`);
      } else {
        toast.warning(`Sincronização parcial: ${success} enviados, ${failed} com erro.`);
      }
    }
  } catch (error) {
    console.error('Erro na sincronização:', error);
    toast.error('Erro ao sincronizar dados');
  } finally {
    isSyncing = false;
  }
};

// Inicialização do banco offline
export const initializeOfflineData = async (userId: string): Promise<void> => {
  console.log('🚀 Inicializando dados offline...');
  
  await initOfflineDb();
  
  if (navigator.onLine) {
    await syncFromServer(userId);
  }
  
  console.log('✅ Banco offline inicializado');
};

// Listener para reconexão
export const setupSyncListeners = (userId: string): () => void => {
  const handleOnline = () => {
    console.log('🌐 Conexão restaurada, iniciando sincronização...');
    setTimeout(() => performFullSync(userId), 1000);
  };

  window.addEventListener('online', handleOnline);

  return () => {
    window.removeEventListener('online', handleOnline);
  };
};

// Verifica se há dados pendentes de sincronização
export const hasPendingSync = async (): Promise<boolean> => {
  const allTables = [...SYNC_TABLES_WITH_USER, ...SYNC_TABLES_JUNCTION];
  for (const tableName of allTables) {
    const unsynced = await getUnsyncedRecords(tableName);
    if (unsynced.length > 0) return true;
  }
  return false;
};

// Conta registros pendentes
export const getPendingSyncCount = async (): Promise<number> => {
  let count = 0;
  const allTables = [...SYNC_TABLES_WITH_USER, ...SYNC_TABLES_JUNCTION];
  for (const tableName of allTables) {
    const unsynced = await getUnsyncedRecords(tableName);
    count += unsynced.length;
  }
  return count;
};
