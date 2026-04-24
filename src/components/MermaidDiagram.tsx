import React, { useEffect, useRef, useState } from 'react';
import { Copy, Check, Maximize2, Minimize2, AlertCircle } from 'lucide-react';
import mermaid from 'mermaid';

// Initialize mermaid with dark theme
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#3b82f6',
    primaryTextColor: '#f9fafb',
    primaryBorderColor: '#4b5563',
    lineColor: '#6b7280',
    secondaryColor: '#1f2937',
    tertiaryColor: '#111827',
    background: '#111827',
    mainBkg: '#1f2937',
    nodeBorder: '#4b5563',
    clusterBkg: '#1f2937',
    clusterBorder: '#374151',
    titleColor: '#f9fafb',
    edgeLabelBackground: '#1f2937',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '14px',
  },
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis',
  },
  securityLevel: 'loose',
});

interface MermaidDiagramProps {
  code: string;
  id?: string;
}

export function MermaidDiagram({ code, id }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [svg, setSvg] = useState<string | null>(null);
  const diagramId = useRef(id || `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    let mounted = true;

    const renderDiagram = async () => {
      if (!containerRef.current) return;

      try {
        setError(null);
        const { svg } = await mermaid.render(diagramId.current, code.trim());
        if (mounted) {
          setSvg(svg);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to render diagram');
        }
      }
    };

    renderDiagram();

    return () => {
      mounted = false;
    };
  }, [code]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (error) {
    return (
      <div className="my-3 rounded-lg overflow-hidden bg-gray-950 border border-red-900/50">
        <div className="flex items-center justify-between px-4 py-2 bg-red-900/20 border-b border-red-900/30">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="text-red-400" />
            <span className="text-xs text-red-400">Mermaid Error</span>
          </div>
          <button
            onClick={handleCopy}
            className="p-1 text-gray-500 hover:text-white transition-colors"
            title="Copy code"
          >
            <Copy size={14} />
          </button>
        </div>
        <div className="p-4">
          <pre className="text-xs text-red-300 font-mono whitespace-pre-wrap">{code}</pre>
          <p className="mt-2 text-xs text-red-400/80">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`my-3 rounded-lg overflow-hidden bg-gray-950 border border-gray-800 ${expanded ? 'fixed inset-4 z-50' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-xs text-purple-400 font-medium">Mermaid Diagram</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-gray-500 hover:text-white transition-colors"
            title={expanded ? 'Minimize' : 'Maximize'}
          >
            {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            onClick={handleCopy}
            className={`p-1 transition-colors ${copied ? 'text-green-400' : 'text-gray-500 hover:text-white'}`}
            title="Copy code"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {/* Diagram */}
      <div ref={containerRef} className={`p-4 overflow-auto ${expanded ? 'h-[calc(100%-40px)]' : ''}`}>
        {svg ? (
          <div
            className="mermaid-svg"
            dangerouslySetInnerHTML={{ __html: svg }}
            style={{ display: 'flex', justifyContent: 'center' }}
          />
        ) : (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Code preview when collapsed */}
      {!expanded && (
        <details className="border-t border-gray-800">
          <summary className="px-4 py-2 text-xs text-gray-500 hover:text-gray-400 cursor-pointer">
            View source code
          </summary>
          <pre className="px-4 pb-4 text-xs text-gray-400 font-mono whitespace-pre-wrap">
            {code.trim()}
          </pre>
        </details>
      )}

      {/* Expanded backdrop */}
      {expanded && (
        <div
          className="fixed inset-0 bg-black/80 -z-10"
          onClick={() => setExpanded(false)}
        />
      )}
    </div>
  );
}

/**
 * Check if content contains a mermaid code block
 */
export function isMermaidCode(content: string): boolean {
  const mermaidBlockRegex = /```mermaid\n([\s\S]*?)```/i;
  return mermaidBlockRegex.test(content);
}

/**
 * Extract mermaid code blocks from content
 */
export function extractMermaidBlocks(
  content: string
): { code: string; before: string; after: string }[] {
  const blocks: { code: string; before: string; after: string }[] = [];
  const regex = /```mermaid\n([\s\S]*?)```/gi;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    blocks.push({
      code: match[1],
      before: content.slice(lastIndex, match.index),
      after: '',
    });
    lastIndex = regex.lastIndex;
  }

  // Fill in 'after' for each block
  for (let i = 0; i < blocks.length - 1; i++) {
    blocks[i].after = content.slice(
      content.indexOf(blocks[i].code) + blocks[i].code.length + 11,
      content.indexOf(blocks[ i + 1 ].code) - 11
    );
  }

  // Last block gets remaining content
  if (blocks.length > 0) {
    const lastBlock = blocks[blocks.length - 1];
    lastBlock.after = content.slice(lastIndex);
  }

  return blocks;
}