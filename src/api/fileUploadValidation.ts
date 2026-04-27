/**
 * File Upload Validation
 * Day 9: Block malicious or oversized attachments
 */

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export interface FileValidationConfig {
  maxSizeMB: number;
  allowedTypes: string[];
  blockedExtensions: string[];
  maxFiles: number;
}

// Default validation config
export const DEFAULT_FILE_CONFIG: FileValidationConfig = {
  maxSizeMB: 25,
  allowedTypes: [
    // Images
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Documents
    'application/pdf',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
    // Code files
    'text/javascript',
    'text/typescript',
    'text/html',
    'text/css',
    'text/x-python',
    'application/x-httpd-php',
  ],
  blockedExtensions: [
    '.exe',
    '.dll',
    '.bat',
    '.cmd',
    '.sh',
    '.bin',
    '.com',
    '.scr',
    '.msi',
    '.app',
    '.dmg',
    '.pkg',
    '.deb',
    '.rpm',
    '.jar',
    '.war',
    '.ear',
    '.pyz',
    '.egg',
    '.whl',
  ],
  maxFiles: 10,
};

/**
 * Validate a single file
 */
export function validateFile(file: File, config: Partial<FileValidationConfig> = {}): FileValidationResult {
  const cfg = { ...DEFAULT_FILE_CONFIG, ...config };

  // Check size
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > cfg.maxSizeMB) {
    return {
      valid: false,
      error: `File "${file.name}" is too large (${sizeMB.toFixed(1)}MB). Max: ${cfg.maxSizeMB}MB`,
    };
  }

  // Check extension
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (cfg.blockedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `File type "${ext}" is not allowed for security reasons`,
    };
  }

  // Check MIME type (if available and not generic)
  if (file.type && file.type !== 'application/octet-stream') {
    // Allow image/* wildcard
    const isAllowed = cfg.allowedTypes.some(t => {
      if (t.endsWith('/*')) {
        return file.type.startsWith(t.replace('/*', ''));
      }
      return t === file.type;
    });

    if (!isAllowed) {
      return {
        valid: false,
        error: `File type "${file.type}" is not supported`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate multiple files
 */
export function validateFiles(files: FileList | File[], config: Partial<FileValidationConfig> = {}): FileValidationResult {
  const cfg = { ...DEFAULT_FILE_CONFIG, ...config };
  const fileArray = Array.from(files);

  if (fileArray.length > cfg.maxFiles) {
    return {
      valid: false,
      error: `Too many files (${fileArray.length}). Max: ${cfg.maxFiles}`,
    };
  }

  for (const file of fileArray) {
    const result = validateFile(file, cfg);
    if (!result.valid) return result;
  }

  return { valid: true };
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Check if file is a text/code file
 */
export function isTextFile(file: File): boolean {
  return file.type.startsWith('text/') ||
    file.name.endsWith('.js') ||
    file.name.endsWith('.ts') ||
    file.name.endsWith('.jsx') ||
    file.name.endsWith('.tsx') ||
    file.name.endsWith('.json') ||
    file.name.endsWith('.md') ||
    file.name.endsWith('.py') ||
    file.name.endsWith('.html') ||
    file.name.endsWith('.css');
}

/**
 * Get file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
