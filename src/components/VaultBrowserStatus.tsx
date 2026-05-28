import React, { useEffect, useState } from 'react';
import { getVaultState, getVaultStorageInfo, VaultState } from '../api/vault';
import { getBrowserInfo, BrowserType } from '../api/browserDetection';
import { HardDrive, AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';

interface StorageInfo {
  used: number;
  available: number;
  fileCount: number;
  isNearLimit: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getBrowserIcon(browser: BrowserType): string {
  const icons: Record<BrowserType, string> = {
    chrome: '🔵',
    brave: '🦁',
    edge: '🌐',
    opera: '🔴',
    firefox: '🦊',
    safari: '🧭',
    unknown: '❓',
  };
  return icons[browser];
}

export function VaultBrowserStatus() {
  const [vaultState, setVaultState] = useState<VaultState | null>(null);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [browserInfo, setBrowserInfo] = useState(getBrowserInfo());

  useEffect(() => {
    // Get initial vault state
    const state = getVaultState();
    setVaultState(state);

    // Get storage info if in fallback mode
    if (state.isFallbackMode) {
      getVaultStorageInfo().then(info => {
        if (info) {
          setStorageInfo(info);
        }
      });
    }
  }, []);

  if (!vaultState) {
    return null;
  }

  const isConnected = vaultState.isConnected;
  const isFallback = vaultState.isFallbackMode;
  const supportsFSA = vaultState.supportsFSA;

  return (
    <div className="vault-browser-status p-4 rounded-lg bg-dark-800/50 border border-dark-700">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{getBrowserIcon(browserInfo.browser)}</span>
        <div>
          <h3 className="text-sm font-semibold text-dark-100">{browserInfo.browserName}</h3>
          <p className="text-xs text-dark-500">
            {browserInfo.version ? `Version ${browserInfo.version}` : 'Unknown version'}
          </p>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-2 mb-3">
        {isConnected ? (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
            <CheckCircle size={12} />
            Connected
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400">
            <AlertTriangle size={12} />
            Not Connected
          </span>
        )}

        {isFallback && (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-orange-500/20 text-orange-400">
            <Info size={12} />
            Fallback Mode
          </span>
        )}

        {!supportsFSA && !isFallback && (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400">
            <XCircle size={12} />
            Not Supported
          </span>
        )}
      </div>

      {/* Storage Info (Fallback Mode Only) */}
      {isFallback && storageInfo && (
        <div className="mt-3 p-3 rounded bg-dark-900/50">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive size={14} className="text-dark-400" />
            <span className="text-xs font-medium text-dark-300">Storage</span>
          </div>
          
          <div className="flex justify-between text-xs text-dark-500 mb-2">
            <span>Used: {formatBytes(storageInfo.used)}</span>
            <span>Available: {formatBytes(storageInfo.available)}</span>
          </div>
          
          {/* Progress Bar */}
          <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${
                storageInfo.isNearLimit 
                  ? 'bg-red-500' 
                  : 'bg-green-500'
              }`}
              style={{ 
                width: `${Math.min(100, (storageInfo.used / (storageInfo.used + storageInfo.available)) * 100)}%` 
              }}
            />
          </div>
          
          {storageInfo.isNearLimit && (
            <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
              <AlertTriangle size={12} />
              Storage is almost full. Consider exporting your data.
            </p>
          )}
          
          <p className="text-xs text-dark-500 mt-2">
            {storageInfo.fileCount} files stored
          </p>
        </div>
      )}

      {/* Recommendation */}
      {!browserInfo.isRecommended && (
        <div className="mt-3 p-3 rounded bg-blue-500/10 border border-blue-500/30">
          <p className="text-xs text-blue-300">
            For full vault features, use Chrome, Brave, Edge, or Opera.
            Current browser uses fallback storage with limited features.
          </p>
        </div>
      )}

      {/* Fallback Mode Info */}
      {isFallback && (
        <div className="mt-3 p-3 rounded bg-yellow-500/10 border border-yellow-500/30">
          <p className="text-xs text-yellow-300">
            <strong>Fallback Mode:</strong> Your data is stored in browser IndexedDB.
            Some features like opening files in native apps are not available.
            Consider using a recommended browser for full functionality.
          </p>
        </div>
      )}
    </div>
  );
}

export default VaultBrowserStatus;