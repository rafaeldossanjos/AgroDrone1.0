import { v4 as uuidv4 } from 'uuid';

// Tipos para o banco local
export interface SyncQueueItem {
  id: string;
  table_name: string;
  operation: 'insert' | 'update' | 'delete';
  record_id: string;
  data: Record<string, unknown>;
  created_at: string;
  retry_count: number;
}

const DB_NAME = 'agrodrone_offline';
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

// Inicializa o IndexedDB
export const initOfflineDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      const stores = [
        'properties', 'products', 'applications', 'application_products',
        'recipes', 'recipe_products', 'equipment', 'flight_planning'
      ];

      stores.forEach(storeName => {
        if (!database.objectStoreNames.contains(storeName)) {
          const store = database.createObjectStore(storeName, { keyPath: 'id' });
          store.createIndex('user_id', 'user_id', { unique: false });
          store.createIndex('synced', 'synced', { unique: false });
        }
      });

      if (!database.objectStoreNames.contains('sync_queue')) {
        const syncQueueStore = database.createObjectStore('sync_queue', { keyPath: 'id' });
        syncQueueStore.createIndex('table_name', 'table_name', { unique: false });
        syncQueueStore.createIndex('created_at', 'created_at', { unique: false });
      }

      if (!database.objectStoreNames.contains('sync_metadata')) {
        database.createObjectStore('sync_metadata', { keyPath: 'key' });
      }
    };
  });
};

// Operações genéricas - usando any para evitar problemas de tipagem com Supabase
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getAll = async (storeName: string): Promise<any[]> => {
  const database = await initOfflineDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getById = async (storeName: string, id: string): Promise<any | undefined> => {
  const database = await initOfflineDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getByIndex = async (storeName: string, indexName: string, value: string): Promise<any[]> => {
  const database = await initOfflineDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const put = async (storeName: string, data: any): Promise<any> => {
  const database = await initOfflineDb();
  const record = {
    ...data,
    id: data.id || uuidv4(),
    synced: data.synced ?? false,
    updated_at: new Date().toISOString()
  };

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(record);

    request.onsuccess = () => resolve(record);
    request.onerror = () => reject(request.error);
  });
};

export const remove = async (storeName: string, id: string): Promise<void> => {
  const database = await initOfflineDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const clear = async (storeName: string): Promise<void> => {
  const database = await initOfflineDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Metadados de sincronização
export const getSyncMetadata = async (key: string): Promise<string | undefined> => {
  const database = await initOfflineDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('sync_metadata', 'readonly');
    const store = transaction.objectStore('sync_metadata');
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result?.value as string | undefined);
    request.onerror = () => reject(request.error);
  });
};

export const setSyncMetadata = async (key: string, value: string): Promise<void> => {
  const database = await initOfflineDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('sync_metadata', 'readwrite');
    const store = transaction.objectStore('sync_metadata');
    const request = store.put({ key, value });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Bulk insert para sincronização inicial
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const bulkPut = async (storeName: string, records: any[]): Promise<void> => {
  const database = await initOfflineDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    records.forEach(record => {
      store.put({ ...record, synced: true });
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

// Marcar registro como sincronizado
export const markAsSynced = async (storeName: string, id: string): Promise<void> => {
  const record = await getById(storeName, id);
  if (record) {
    await put(storeName, { ...record, synced: true });
  }
};

// Obter registros não sincronizados
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getUnsyncedRecords = async (storeName: string): Promise<any[]> => {
  const allRecords = await getAll(storeName);
  return allRecords.filter(r => r.synced === false);
};
