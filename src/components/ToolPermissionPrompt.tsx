import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  AlertTriangle,
  Check,
  X,
  Clock,
  FileEdit,
  Trash2,
  Terminal,
  Loader,
} from 'lucide-react';

interface ToolCall {
  name: string;
  args: Record<string, any>;
}

interface ToolPermissionPromptProps {
  pendingTools: ToolCall[];
  onApprove: (tools: string[]) => void;
  onDeny: () => void;
  autoApproveTimeout?: number;
}

// Mapping of sensitive tools
const SENSITIVE_TOOLS = ['bash', 'write_file', 'delete_file', 'delete_directory', 'edit_file'];

export const ToolPermissionPrompt: React.FC<ToolPermissionPromptProps> = ({
  pendingTools,
  onApprove,
  onDeny,
  autoApproveTimeout = 30,
}) => {
  const [countdown, setCountdown] = useState(autoApproveTimeout);
  const [selectedTools, setSelectedTools] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    pendingTools.forEach(t => initial.add(t.name));
    return initial;
  });

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) {
      // Auto-deny when countdown expires
      onDeny();
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, onDeny]);

  const toggleTool = useCallback((toolName: string) => {
    setSelectedTools(prev => {
      const next = new Set(prev);
      if (next.has(toolName)) {
        next.delete(toolName);
      } else {
        next.add(toolName);
      }
      return next;
    });
  }, []);

  const getToolIcon = (name: string) => {
    if (name === 'bash') return <Terminal size={14} />;
    if (name.includes('delete')) return <Trash2 size={14} />;
    if (name.includes('write') || name.includes('edit')) return <FileEdit size={14} />;
    return <Shield size={14} />;
  };

  const getToolRisk = (name: string): 'low' | 'medium' | 'high' => {
    if (name === 'bash') return 'high';
    if (name.includes('delete')) return 'high';
    if (name.includes('write') || name.includes('edit')) return 'medium';
    return 'low';
  };

  if (!pendingTools.length) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-[480px] max-w-[90vw] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Shield className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Tool Permission Required</h3>
              <p className="text-xs text-gray-400">
                {pendingTools.length} tool{pendingTools.length > 1 ? 's' : ''} waiting approval
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-yellow-400">
            <Clock size={14} />
            <span className="text-sm font-mono">{countdown}s</span>
          </div>
        </div>

        {/* Warning */}
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-2">
          <AlertTriangle size={16} className="text-yellow-400 mt-0.5 shrink-0" />
          <p className="text-xs text-yellow-200">
            Sensitive tools require your approval before execution. Review each tool call carefully.
          </p>
        </div>

        {/* Tool list */}
        <div className="space-y-2 mb-6 max-h-[240px] overflow-y-auto">
          {pendingTools.map((tool, idx) => {
            const risk = getToolRisk(tool.name);
            const isSelected = selectedTools.has(tool.name);
            
            return (
              <button
                key={idx}
                onClick={() => toggleTool(tool.name)}
                className={`w-full p-3 rounded-lg border flex items-start gap-3 text-left transition-all ${
                  isSelected
                    ? 'border-green-500/50 bg-green-500/10'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                }`}
              >
                <div className={`p-1.5 rounded ${
                  risk === 'high' ? 'bg-red-500/20 text-red-400' :
                  risk === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {getToolIcon(tool.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-mono">{tool.name}</div>
                  <div className="text-xs text-gray-400 truncate">
                    {JSON.stringify(tool.args).slice(0, 100)}
                    {JSON.stringify(tool.args).length > 100 && '...'}
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isSelected
                    ? 'border-green-500 bg-green-500'
                    : 'border-gray-600'
                }`}>
                  {isSelected && <Check size={12} className="text-black" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onDeny}
            className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <X size={16} />
            Deny All
          </button>
          <button
            onClick={() => onApprove(Array.from(selectedTools))}
            disabled={selectedTools.size === 0}
            className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Check size={16} />
            Approve ({selectedTools.size})
          </button>
        </div>
      </div>
    </div>
  );
};

export default ToolPermissionPrompt;