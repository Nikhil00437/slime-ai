import React, { useState } from 'react';
import { getIndexedDBVault, IndexedDBVault } from '../api/vaultFallback';
import { selectVaultFolder, isVaultFallbackMode, getVaultState } from '../api/vault';
import { Download, Upload, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface MigrationStatus {
  status: 'idle' | 'exporting' | 'importing' | 'success' | 'error';
  message: string;
  progress?: number;
}

export function VaultMigrationTool() {
  const [status, setStatus] = useState<MigrationStatus>({ status: 'idle', message: '' });
  const [showConfirm, setShowConfirm] = useState(false);

  // Only show for fallback mode
  if (!isVaultFallbackMode()) {
    return null;
  }

  const handleExport = async () => {
    setStatus({ status: 'exporting', message: 'Exporting data...' });

    try {
      const vault = getIndexedDBVault();
      await vault.init();
      
      const blob = await vault.exportAll();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `slime-ai-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus({ status: 'success', message: 'Data exported successfully!' });
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setStatus({ status: 'idle', message: '' });
      }, 3000);
    } catch (err) {
      setStatus({ status: 'error', message: `Export failed: ${err}` });
    }
  };

  const handleImport = async () => {
    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setStatus({ status: 'importing', message: 'Importing data...' });

      try {
        const vault = getIndexedDBVault();
        await vault.init();
        
        const text = await file.text();
        const exportData = JSON.parse(text);
        
        if (!exportData.files || !Array.isArray(exportData.files)) {
          throw new Error('Invalid backup file format');
        }

        let imported = 0;
        for (const fileData of exportData.files) {
          const content = new Uint8Array(fileData.content).buffer;
          await vault.saveFile(fileData.path, content);
          imported++;
        }

        setStatus({ 
          status: 'success', 
          message: `Successfully imported ${imported} files!` 
        });
        
        // Reload page to refresh data
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } catch (err) {
        setStatus({ status: 'error', message: `Import failed: ${err}` });
      }
    };

    input.click();
  };

  const handleSwitchToFSA = async () => {
    setShowConfirm(false);
    setStatus({ status: 'exporting', message: 'Preparing to switch...' });

    try {
      // First export current data
      const vault = getIndexedDBVault();
      await vault.init();
      const blob = await vault.exportAll();
      
      // Save to a variable to use after folder selection
      const exportBlob = blob;

      // Now try to select a folder using FSA
      const folderName = await selectVaultFolder();
      
      if (folderName) {
        // Import to the new folder
        // Note: This would require additional implementation to write to FSA
        // For now, just show success and ask user to re-import
        setStatus({ 
          status: 'success', 
          message: `Connected to "${folderName}"! Please re-import your backup to complete the migration.` 
        });
      } else {
        setStatus({ status: 'idle', message: '' });
      }
    } catch (err) {
      setStatus({ status: 'error', message: `Failed to switch: ${err}` });
    }
  };

  return (
    <div className="vault-migration-tool p-4 rounded-lg bg-dark-800/50 border border-dark-700">
      <h3 className="text-sm font-semibold text-dark-100 mb-3 flex items-center gap-2">
        <RefreshCw size={16} />
        Data Migration
      </h3>

      {/* Status Message */}
      {status.status !== 'idle' && (
        <div className={`mb-4 p-3 rounded text-xs ${
          status.status === 'success' ? 'bg-green-500/20 text-green-400' :
          status.status === 'error' ? 'bg-red-500/20 text-red-400' :
          status.status === 'exporting' || status.status === 'importing'
            ? 'bg-blue-500/20 text-blue-400'
            : 'bg-dark-700 text-dark-300'
        }`}>
          {status.status === 'exporting' && <RefreshCw size={12} className="inline mr-2 animate-spin" />}
          {status.status === 'importing' && <RefreshCw size={12} className="inline mr-2 animate-spin" />}
          {status.message}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleExport}
          disabled={status.status === 'exporting' || status.status === 'importing'}
          className="flex items-center gap-2 px-3 py-2 text-xs rounded bg-dark-700 hover:bg-dark-600 text-dark-200 disabled:opacity-50"
        >
          <Download size={14} />
          Export Backup
        </button>

        <button
          onClick={handleImport}
          disabled={status.status === 'exporting' || status.status === 'importing'}
          className="flex items-center gap-2 px-3 py-2 text-xs rounded bg-dark-700 hover:bg-dark-600 text-dark-200 disabled:opacity-50"
        >
          <Upload size={14} />
          Import Backup
        </button>

        <button
          onClick={() => setShowConfirm(true)}
          className="flex items-center gap-2 px-3 py-2 text-xs rounded bg-green-600 hover:bg-green-500 text-white disabled:opacity-50"
        >
          <CheckCircle size={14} />
          Switch to Native Folder
        </button>
      </div>

      {/* Warning */}
      <div className="mt-3 p-2 rounded bg-yellow-500/10 border border-yellow-500/30">
        <p className="text-xs text-yellow-300 flex items-start gap-2">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          Regular backups are recommended since fallback storage has limited capacity.
        </p>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 p-4 rounded-lg max-w-sm mx-4 border border-dark-700">
            <h4 className="text-sm font-semibold text-dark-100 mb-2">Switch to Native Folder?</h4>
            <p className="text-xs text-dark-400 mb-4">
              This will connect to a native folder on your device. You'll need to re-import your backup data.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-3 py-1.5 text-xs rounded bg-dark-700 hover:bg-dark-600 text-dark-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSwitchToFSA}
                className="px-3 py-1.5 text-xs rounded bg-green-600 hover:bg-green-500 text-white"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VaultMigrationTool;