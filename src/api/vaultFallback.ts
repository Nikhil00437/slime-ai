/**
 * IndexedDB Vault Fallback
 * Provides vault storage for browsers without File System Access API support
 * (Firefox, Safari, etc.)
 */

import { getFallbackStorageLimit } from './browserDetection';

const DB_NAME = 'slime-ai-vault';
const DB_VERSION = 1;
const STORE_NAME = 'files';
const METADATA_STORE = 'metadata';

export interface VaultFile {
  path: string;
  content: ArrayBuffer;
  mimeType: string;
  size: number;
  createdAt: number;
  updatedAt: number;
}

export interface VaultMetadata {
  key: string;
  value: string | number | boolean;
}

export interface StorageInfo {
  used: number;
  available: number;
  fileCount: number;
  isNearLimit: boolean;
}

export class IndexedDBVault {
  private db: IDBDatabase | null = null;
  private dbName: string;
  private storeName: string;
  private metadataStoreName: string;

  constructor(dbName = DB_NAME, storeName = STORE_NAME, metadataStoreName = METADATA_STORE) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.metadataStoreName = metadataStoreName;
  }

  /**
   * Initialize the IndexedDB database
   */
  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, DB_VERSION);

      request.onerror = () => {
        console.error('[IndexedDBVault] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[IndexedDBVault] Database initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create files store
        if (!db.objectStoreNames.contains(this.storeName)) {
          const fileStore = db.createObjectStore(this.storeName, { keyPath: 'path' });
          fileStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          fileStore.createIndex('size', 'size', { unique: false });
        }

        // Create metadata store
        if (!db.objectStoreNames.contains(this.metadataStoreName)) {
          db.createObjectStore(this.metadataStoreName, { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Ensure database is initialized
   */
  private async ensureInit(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  /**
   * Save a file to the vault
   */
  async saveFile(path: string, content: ArrayBuffer, mimeType = 'application/octet-stream'): Promise<void> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);

      const file: VaultFile = {
        path,
        content,
        mimeType,
        size: content.byteLength,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const request = store.put(file);

      request.onsuccess = () => {
        console.log(`[IndexedDBVault] File saved: ${path} (${content.byteLength} bytes)`);
        resolve();
      };

      request.onerror = () => {
        console.error(`[IndexedDBVault] Failed to save file: ${path}`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Read a file from the vault
   */
  async readFile(path: string): Promise<ArrayBuffer | null> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([this.storeName], 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.get(path);

      request.onsuccess = () => {
        const file = request.result as VaultFile | undefined;
        if (file) {
          resolve(file.content);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error(`[IndexedDBVault] Failed to read file: ${path}`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete a file from the vault
   */
  async deleteFile(path: string): Promise<void> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.delete(path);

      request.onsuccess = () => {
        console.log(`[IndexedDBVault] File deleted: ${path}`);
        resolve();
      };

      request.onerror = () => {
        console.error(`[IndexedDBVault] Failed to delete file: ${path}`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * List all files in the vault (optionally with prefix)
   */
  async listFiles(prefix = ''): Promise<string[]> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([this.storeName], 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const files = request.result as VaultFile[];
        const paths = files
          .filter(f => !prefix || f.path.startsWith(prefix))
          .map(f => f.path)
          .sort();
        resolve(paths);
      };

      request.onerror = () => {
        console.error('[IndexedDBVault] Failed to list files', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(path: string): Promise<VaultFile | null> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([this.storeName], 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.get(path);

      request.onsuccess = () => {
        resolve(request.result as VaultFile | undefined || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get storage information
   */
  async getStorageInfo(): Promise<StorageInfo> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([this.storeName], 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const files = request.result as VaultFile[];
        const used = files.reduce((sum, f) => sum + f.size, 0);
        const limit = getFallbackStorageLimit();

        resolve({
          used,
          available: Math.max(0, limit - used),
          fileCount: files.length,
          isNearLimit: used > limit * 0.9,
        });
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Save metadata
   */
  async setMetadata(key: string, value: string | number | boolean): Promise<void> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([this.metadataStoreName], 'readwrite');
      const store = tx.objectStore(this.metadataStoreName);
      const request = store.put({ key, value });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get metadata
   */
  async getMetadata(key: string): Promise<string | number | boolean | null> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([this.metadataStoreName], 'readonly');
      const store = tx.objectStore(this.metadataStoreName);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result as VaultMetadata | undefined;
        resolve(result?.value ?? null);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all files from the vault
   */
  async clearAll(): Promise<void> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('[IndexedDBVault] All files cleared');
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Export all files as a downloadable ZIP
   */
  async exportAll(): Promise<Blob> {
    const files = await this.listFiles();
    const fileBlobs: { path: string; content: ArrayBuffer }[] = [];

    for (const path of files) {
      const content = await this.readFile(path);
      if (content) {
        fileBlobs.push({ path, content });
      }
    }

    // Create a simple JSON export (could be enhanced to ZIP)
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      files: fileBlobs.map(f => ({
        path: f.path,
        content: Array.from(new Uint8Array(f.content)),
      })),
    };

    const jsonStr = JSON.stringify(exportData);
    return new Blob([jsonStr], { type: 'application/json' });
  }

  /**
   * Import files from an export
   */
  async importFromExport(exportBlob: Blob): Promise<number> {
    const text = await exportBlob.text();
    const exportData = JSON.parse(text);

    if (!exportData.files || !Array.isArray(exportData.files)) {
      throw new Error('Invalid export format');
    }

    let imported = 0;
    for (const file of exportData.files) {
      const content = new Uint8Array(file.content).buffer;
      await this.saveFile(file.path, content);
      imported++;
    }

    return imported;
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Singleton instance
let vaultInstance: IndexedDBVault | null = null;

export function getIndexedDBVault(): IndexedDBVault {
  if (!vaultInstance) {
    vaultInstance = new IndexedDBVault();
  }
  return vaultInstance;
}

export async function initIndexedDBVault(): Promise<IndexedDBVault> {
  const vault = getIndexedDBVault();
  await vault.init();
  return vault;
}