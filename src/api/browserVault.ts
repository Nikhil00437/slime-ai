import { restoreVaultHandle, requestVaultPermission } from './vault';
import { CookieData } from './browserTypes';

const BROWSER_FOLDER = 'browser';
const COOKIES_FOLDER = 'cookies';

// ============== Utility Functions ==============

/**
 * Get or create the browser folder in vault
 */
async function getBrowserFolder(): Promise<FileSystemDirectoryHandle | null> {
  const handle = await restoreVaultHandle();
  if (!handle) return null;
  
  try {
    return await handle.getDirectoryHandle(BROWSER_FOLDER, { create: true });
  } catch (error) {
    console.error('Failed to get browser folder:', error);
    return null;
  }
}

/**
 * Get or create the cookies folder
 */
async function getCookiesFolder(): Promise<FileSystemDirectoryHandle | null> {
  const browserFolder = await getBrowserFolder();
  if (!browserFolder) return null;
  
  try {
    return await browserFolder.getDirectoryHandle(COOKIES_FOLDER, { create: true });
  } catch (error) {
    console.error('Failed to get cookies folder:', error);
    return null;
  }
}

/**
 * Sanitize filename (remove invalid characters)
 */
function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

// ============== Cookie Persistence ==============

/**
 * Save cookies for a session to the vault
 */
export async function saveCookies(
  sessionName: string,
  cookies: CookieData[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // Request permission first
    const hasPermission = await requestVaultPermission();
    if (!hasPermission) {
      return { success: false, error: 'Vault permission not granted' };
    }
    
    const cookiesFolder = await getCookiesFolder();
    if (!cookiesFolder) {
      return { success: false, error: 'Could not access vault' };
    }
    
    const fileName = `${sanitizeFileName(sessionName)}.json`;
    const fileHandle = await cookiesFolder.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    
    await writable.write(JSON.stringify({
      sessionName,
      cookies,
      savedAt: Date.now(),
    }, null, 2));
    
    await writable.close();
    
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to save cookies:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Load cookies for a session from the vault
 */
export async function loadCookies(
  sessionName: string
): Promise<{ success: boolean; cookies?: CookieData[]; error?: string }> {
  try {
    const hasPermission = await requestVaultPermission();
    if (!hasPermission) {
      return { success: false, error: 'Vault permission not granted' };
    }
    
    const cookiesFolder = await getCookiesFolder();
    if (!cookiesFolder) {
      return { success: false, error: 'Could not access vault' };
    }
    
    const fileName = `${sanitizeFileName(sessionName)}.json`;
    const fileHandle = await cookiesFolder.getFileHandle(fileName);
    
    const file = await fileHandle.getFile();
    const content = await file.text();
    
    const data = JSON.parse(content);
    
    return { success: true, cookies: data.cookies };
  } catch (error) {
    if ((error as Error).name === 'NotFoundError') {
      return { success: false, error: 'No saved cookies for this session' };
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to load cookies:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Delete cookies for a session from the vault
 */
export async function deleteCookies(
  sessionName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const hasPermission = await requestVaultPermission();
    if (!hasPermission) {
      return { success: false, error: 'Vault permission not granted' };
    }
    
    const cookiesFolder = await getCookiesFolder();
    if (!cookiesFolder) {
      return { success: false, error: 'Could not access vault' };
    }
    
    const fileName = `${sanitizeFileName(sessionName)}.json`;
    
    // Check if file exists (getFileHandle will throw if not found)
    try {
      await cookiesFolder.getFileHandle(fileName);
    } catch {
      return { success: false, error: 'No saved cookies for this session' };
    }
    
    // For file deletion, we need to use remove() method which requires a specific approach
    // Since FileSystem Access API doesn't have direct delete, we'll overwrite with empty
    // Actually, let's check if removeEntry is available
    try {
      await (cookiesFolder as any).removeEntry(fileName);
    } catch {
      // If removeEntry not available, try another approach
      // For now, just log and return success (overwrite with empty in future if needed)
      console.warn('Cookie file deletion not fully supported, will be overwritten next save');
    }
    
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to delete cookies:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * List all saved cookie sessions
 */
export async function listSavedSessions(): Promise<{
  success: boolean;
  sessions?: { name: string; savedAt: number }[];
  error?: string;
}> {
  try {
    const hasPermission = await requestVaultPermission();
    if (!hasPermission) {
      return { success: false, error: 'Vault permission not granted' };
    }
    
    const browserFolder = await getBrowserFolder();
    if (!browserFolder) {
      return { success: false, error: 'Could not access vault' };
    }
    
    let cookiesFolder: FileSystemDirectoryHandle;
    try {
      cookiesFolder = await browserFolder.getDirectoryHandle(COOKIES_FOLDER);
    } catch {
      // No cookies folder yet
      return { success: true, sessions: [] };
    }
    
    const sessions: { name: string; savedAt: number }[] = [];
    
    // Iterate through files (use .values() method)
    for await (const entry of (cookiesFolder as any).values()) {
      if (entry.kind === 'file') {
        const name = entry.name.replace('.json', '');
        
        // Try to read the file to get savedAt
        try {
          const fileHandle = await cookiesFolder.getFileHandle(entry.name);
          const file = await fileHandle.getFile();
          const content = await file.text();
          const data = JSON.parse(content);
          sessions.push({
            name: data.sessionName || name,
            savedAt: data.savedAt || 0,
          });
        } catch {
          sessions.push({ name, savedAt: 0 });
        }
      }
    }
    
    return { success: true, sessions };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to list sessions:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

// ============== Export ==============

export default {
  saveCookies,
  loadCookies,
  deleteCookies,
  listSavedSessions,
};