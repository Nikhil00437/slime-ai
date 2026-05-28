/**
 * Type guards and utilities for File System Access API
 */

/**
 * Type guard for FileSystemDirectoryHandle
 */
export function isFileSystemDirectoryHandle(
  handle: unknown
): handle is FileSystemDirectoryHandle {
  return (
    handle !== null &&
    typeof handle === 'object' &&
    'kind' in handle &&
    (handle as FileSystemHandle).kind === 'directory'
  );
}

/**
 * Type guard for FileSystemFileHandle
 */
export function isFileSystemFileHandle(
  handle: unknown
): handle is FileSystemFileHandle {
  return (
    handle !== null &&
    typeof handle === 'object' &&
    'kind' in handle &&
    (handle as FileSystemHandle).kind === 'file'
  );
}

/**
 * Check if an entry is a directory
 */
export function isDirectoryEntry(
  entry: FileSystemEntry
): entry is FileSystemDirectoryEntry {
  return entry.isDirectory;
}

/**
 * Check if an entry is a file
 */
export function isFileEntry(entry: FileSystemEntry): entry is FileSystemFileEntry {
  return entry.isFile;
}

/**
 * Safe directory iterator helper
 * Works with both FileSystemDirectoryHandle and any object with values()
 */
export async function* iterateDirectoryEntries(
  dirHandle: FileSystemDirectoryHandle | unknown,
  options?: { recursive?: boolean }
): AsyncGenerator<FileSystemHandle> {
  if (!isFileSystemDirectoryHandle(dirHandle)) {
    return;
  }

  try {
    for await (const entry of (dirHandle as any).values()) {
      yield entry;
      if (options?.recursive && entry.kind === 'directory') {
        yield* iterateDirectoryEntries(entry, options);
      }
    }
  } catch (e) {
    console.warn('[FileSystem] Failed to iterate directory:', e);
  }
}

/**
 * Safe query permission helper
 */
export async function queryPermission(
  handle: FileSystemDirectoryHandle
): Promise<boolean> {
  try {
    // @ts-expect-error - queryPermission is not in standard types but exists in practice
    const permission = await handle.queryPermission({ mode: 'readwrite' });
    return permission === 'granted';
  } catch {
    return false;
  }
}

/**
 * Safe request permission helper
 */
export async function requestPermission(
  handle: FileSystemDirectoryHandle
): Promise<boolean> {
  try {
    // @ts-expect-error - requestPermission is not in standard types but exists in practice
    const permission = await handle.requestPermission({ mode: 'readwrite' });
    return permission === 'granted';
  } catch {
    return false;
  }
}