import React, { useState, useEffect } from 'react';
import {
  CodingBlock,
  CodeBlock,
  CodePreviewType,
} from '../types';
import {
  Code2,
  Copy,
  Check,
  Eye,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileCode,
  FileText,
  Image,
  Play,
  Terminal,
  Wrench,
  FileJson,
  FileArchive,
  Brackets,
  Hash,
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { MarkdownRenderer } from './MarkdownRenderer';
import { MermaidDiagram } from './MermaidDiagram';
import { fixMermaidSyntax, validateAndFixMermaid } from '../utils/mermaidFixer';

interface CodingSidebarProps {
  content: CodingBlock;
  compact?: boolean;
}

interface CodePreview {
  block: CodeBlock;
  previewType: CodePreviewType;
  previewContent: string;
}

export function CodingSidebar({ content, compact = false }: CodingSidebarProps) {
  const [blocks, setBlocks] = useState<CodeBlock[]>(content.blocks);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [previews, setPreviews] = useState<CodePreview[]>([]);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  // Auto-detect preview types for code blocks and fix Mermaid syntax
  useEffect(() => {
    const enhancedBlocks = blocks.map(block => {
      const previewType = detectPreviewType(block.language, block.code) || 'text';

      // Fix Mermaid syntax if it's a mermaid diagram
      let fixedCode = block.code;
      if (previewType === 'mermaid') {
        fixedCode = fixMermaidSyntax(block.code);
      }

      return {
        ...block,
        code: fixedCode,
        previewType,
      };
    });
    setBlocks(enhancedBlocks);
  }, [blocks]);

  // Generate previews for blocks that have preview types
  useEffect(() => {
    const newPreviews: CodePreview[] = [];
    
    blocks.forEach(block => {
      if (block.previewType && block.previewType !== 'text') {
        const previewContent = generatePreview(block, block.previewType);
        if (previewContent) {
          newPreviews.push({
            block,
            previewType: block.previewType,
            previewContent,
          });
        }
      }
    });
    
    setPreviews(newPreviews);
  }, [blocks]);

  const detectPreviewType = (language: string, code: string): CodePreviewType | undefined => {
    const lang = language.toLowerCase();
    
    if (lang === 'html' || lang === 'htm') return 'html';
    if (lang === 'markdown' || lang === 'md') return 'markdown';
    if (lang === 'mermaid') return 'mermaid';
    if (lang === 'json') return 'json';
    
    // Check content for HTML
    if (code.trim().startsWith('<') && code.includes('</')) return 'html';
    
    // Check for mermaid syntax
    if (code.includes('graph') || code.includes('flowchart') || code.includes('sequenceDiagram')) return 'mermaid';
    
    return undefined;
  };

  const generatePreview = (block: CodeBlock, previewType: CodePreviewType): string => {
    switch (previewType) {
      case 'html':
        return block.code;
      case 'markdown':
        return block.code;
      case 'mermaid':
        // Fix Mermaid syntax before rendering
        return fixMermaidSyntax(block.code);
      case 'json':
        try {
          return JSON.stringify(JSON.parse(block.code), null, 2);
        } catch {
          return block.code;
        }
      default:
        return block.code;
    }
  };

  const toggleBlock = (blockId: string) => {
    setExpandedBlocks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(blockId)) {
        newSet.delete(blockId);
      } else {
        newSet.add(blockId);
      }
      return newSet;
    });
  };

  const handleCopy = async (blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    
    try {
      await navigator.clipboard.writeText(block.code);
      setCopiedStates(prev => ({ ...prev, [blockId]: true }));
      setTimeout(() => setCopiedStates(prev => ({ ...prev, [blockId]: false })), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const isExpanded = (blockId: string) => expandedBlocks.has(blockId);

  const getLanguageIcon = (language: string) => {
    const lang = language.toLowerCase();
    switch (lang) {
      case 'javascript':
      case 'typescript':
      case 'jsx':
      case 'tsx':
        return <Brackets className="w-4 h-4 text-yellow-400" />;
      case 'python':
      case 'py':
        return <Terminal className="w-4 h-4 text-blue-400" />;
      case 'html':
      case 'htm':
        return <FileCode className="w-4 h-4 text-orange-500" />;
      case 'css':
      case 'scss':
      case 'sass':
        return <FileText className="w-4 h-4 text-pink-400" />;
      case 'json':
        return <FileJson className="w-4 h-4 text-green-400" />;
      case 'markdown':
      case 'md':
        return <FileText className="w-4 h-4 text-gray-400" />;
      case 'sql':
        return <FileArchive className="w-4 h-4 text-cyan-400" />;
      case 'bash':
      case 'sh':
      case 'shell':
        return <Terminal className="w-4 h-4 text-green-500" />;
      case 'yaml':
      case 'yml':
        return <Hash className="w-4 h-4 text-purple-400" />;
      default:
        return <Code2 className="w-4 h-4 text-dark-400" />;
    }
  };

  const getLanguageColor = (language: string) => {
    const lang = language.toLowerCase();
    switch (lang) {
      case 'javascript':
      case 'typescript':
      case 'jsx':
      case 'tsx':
        return 'text-yellow-400';
      case 'python':
      case 'py':
        return 'text-blue-400';
      case 'html':
      case 'htm':
        return 'text-orange-500';
      case 'css':
      case 'scss':
      case 'sass':
        return 'text-pink-400';
      case 'json':
        return 'text-green-400';
      case 'markdown':
      case 'md':
        return 'text-gray-400';
      case 'sql':
        return 'text-cyan-400';
      case 'bash':
      case 'sh':
      case 'shell':
        return 'text-green-500';
      case 'yaml':
      case 'yml':
        return 'text-purple-400';
      default:
        return 'text-dark-400';
    }
  };

  const previewableCount = blocks.filter(b => b.previewType && b.previewType !== 'text').length;
  const totalBlocks = blocks.length;

  if (compact) {
    return (
      <div className="coding-sidebar-compact">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/20">
              <Code2 className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <span className="text-sm font-medium text-purple-400">Code</span>
            {content.isStreaming && (
              <Loader2 className="w-3 h-3 animate-spin text-purple-400 ml-auto" />
            )}
          </div>
        </div>

        <div className="text-xs text-dark-500 mb-3 flex items-center gap-2">
          <span className="px-2 py-0.5 bg-purple-500/10 rounded">{totalBlocks} files</span>
          {previewableCount > 0 && (
            <span className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded">{previewableCount} preview</span>
          )}
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {blocks.slice(0, 2).map((block, index) => (
            <div key={block.id || index} className="p-3 bg-gradient-to-br from-dark-800/60 to-dark-900/60 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`${getLanguageColor(block.language)}`}>
                    {getLanguageIcon(block.language)}
                  </div>
                  <span className="text-xs font-medium text-dark-200">
                    {block.filename || block.language}
                  </span>
                  {block.previewType && block.previewType !== 'text' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-medium">
                      {block.previewType}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleCopy(block.id || `block-${index}`)}
                  className="p-1 text-dark-500 hover:text-dark-300 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {copiedStates[block.id || `block-${index}`] ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              
              <div className="text-xs text-dark-400 font-mono bg-dark-900/50 p-2 rounded-lg overflow-hidden border border-dark-700/50">
                <pre className="text-[10px] overflow-x-auto leading-relaxed">
                  {block.code.slice(0, 120)}
                  {block.code.length > 120 && '...'}
                </pre>
              </div>
            </div>
          ))}
          {blocks.length > 2 && (
            <div className="text-xs text-dark-500 text-center py-2 bg-dark-800/30 rounded-lg">
              +{blocks.length - 2} more files
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="coding-sidebar-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/30">
            <Code2 className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <span className="text-sm font-semibold text-purple-400">Code</span>
            {content.isStreaming && (
              <span className="text-xs text-purple-500/70 ml-2 animate-pulse">Generating...</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-dark-500">
            <span className="px-2 py-1 bg-purple-500/10 rounded-lg">{totalBlocks} files</span>
            {previewableCount > 0 && (
              <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded-lg">{previewableCount} preview</span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
        {blocks.map((block, index) => {
          const blockId = block.id || `block-${index}`;
          const expanded = isExpanded(blockId);
          
          return (
            <div key={blockId} className={`code-block-item rounded-xl border transition-all ${
              expanded 
                ? 'bg-dark-800/60 border-purple-500/30 shadow-lg shadow-purple-500/5' 
                : 'bg-dark-800/40 border-dark-700/50 hover:border-dark-600'
            }`}>
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-dark-900/50 ${getLanguageColor(block.language)}`}>
                    {getLanguageIcon(block.language)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-dark-200">
                      {block.filename || block.language}
                    </div>
                    {block.startLine && (
                      <div className="text-xs text-dark-500">
                        Lines {block.startLine}-{block.endLine}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {block.previewType && block.previewType !== 'text' && (
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-400 font-medium">
                      {block.previewType}
                    </span>
                  )}
                  <button
                    onClick={() => toggleBlock(blockId)}
                    className="p-1.5 text-dark-500 hover:text-dark-300 rounded-lg hover:bg-dark-700 transition-colors"
                  >
                    {expanded ? 
                      <ChevronUp className="w-4 h-4" /> : 
                      <ChevronDown className="w-4 h-4" />
                    }
                  </button>
                  <button
                    onClick={() => handleCopy(blockId)}
                    className="p-1.5 text-dark-500 hover:text-dark-300 rounded-lg hover:bg-dark-700 transition-colors"
                  >
                    {copiedStates[blockId] ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {expanded && (
                <div className="px-4 pb-4 pt-0">
                  <SyntaxHighlighter
                    language={block.language}
                    style={oneDark}
                    customStyle={{
                      margin: 0,
                      padding: '1rem',
                      fontSize: '0.75rem',
                      background: '#0f172a',
                      borderRadius: '0.75rem',
                      border: '1px solid rgba(139, 92, 246, 0.2)',
                    }}
                    showLineNumbers
                    lineNumberStyle={{ color: '#475569', minWidth: '2.5rem', paddingRight: '1rem' }}
                  >
                    {block.code}
                  </SyntaxHighlighter>

                  {block.previewType && block.previewType !== 'text' && (
                    <div className="mt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Eye className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-medium text-purple-400">
                          Preview
                        </span>
                        <span className="text-xs text-dark-500 capitalize">
                          ({block.previewType})
                        </span>
                      </div>
                      {renderPreview(block, block.previewType)}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {totalBlocks > 0 && (
        <div className="pt-4 border-t border-dark-700/50 mt-4">
          <div className="flex items-center justify-between text-xs text-dark-500">
            <div className="flex items-center gap-2">
              <Code2 className="w-3.5 h-3.5" />
              <span>Total: {totalBlocks} files</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="w-3.5 h-3.5" />
              <span>Previewable: {previewableCount}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function renderPreview(block: CodeBlock, previewType: CodePreviewType) {
  switch (previewType) {
    case 'html':
      return (
        <div className="border border-dark-700 rounded-xl overflow-hidden">
          <div className="bg-dark-800/80 px-4 py-2 flex items-center justify-between border-b border-dark-700">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
              </div>
              <span className="text-xs text-dark-400 ml-2">HTML Preview</span>
            </div>
          </div>
          <div className="bg-white p-0">
            <iframe
              srcDoc={block.code}
              className="w-full h-40 border-0"
              sandbox="allow-scripts"
              title="HTML Preview"
            />
          </div>
        </div>
      );

    case 'markdown':
      return (
        <div className="border border-dark-700 rounded-xl overflow-hidden">
          <div className="bg-dark-800/80 px-4 py-2 flex items-center justify-between border-b border-dark-700">
            <span className="text-xs text-dark-400">Markdown Preview</span>
          </div>
          <div className="bg-dark-900/50 p-4 prose prose-invert prose-sm max-w-none">
            <MarkdownRenderer content={block.code} />
          </div>
        </div>
      );

    case 'mermaid':
      // Fix Mermaid syntax before rendering
      const fixedMermaidCode = fixMermaidSyntax(block.code);
      return (
        <div className="border border-dark-700 rounded-xl overflow-hidden">
          <div className="bg-dark-800/80 px-4 py-2 flex items-center justify-between border-b border-dark-700">
            <span className="text-xs text-dark-400">Mermaid Diagram</span>
            {fixedMermaidCode !== block.code && (
              <span className="text-xs text-amber-400 flex items-center gap-1">
                <Wrench size={10} />
                Auto-fixed
              </span>
            )}
          </div>
          <div className="bg-dark-900/50 p-4">
            <MermaidDiagram code={fixedMermaidCode} />
          </div>
        </div>
      );

    case 'json':
      try {
        const formatted = JSON.stringify(JSON.parse(block.code), null, 2);
        return (
          <div className="border border-dark-700 rounded-xl overflow-hidden">
            <div className="bg-dark-800/80 px-4 py-2 flex items-center justify-between border-b border-dark-700">
              <span className="text-xs text-dark-400">JSON Data</span>
              <span className="text-xs text-green-500/70">Valid</span>
            </div>
            <pre className="text-xs bg-dark-900/50 p-4 overflow-x-auto text-green-400 font-mono">
              {formatted}
            </pre>
          </div>
        );
      } catch {
        return (
          <div className="border border-red-500/30 rounded-xl overflow-hidden">
            <div className="bg-red-900/20 px-4 py-2 flex items-center justify-between border-b border-red-500/30">
              <span className="text-xs text-red-400">JSON Data</span>
              <span className="text-xs text-red-400">Invalid JSON</span>
            </div>
            <pre className="text-xs bg-dark-900/50 p-4 overflow-x-auto text-dark-300 font-mono">
              {block.code}
            </pre>
          </div>
        );
      }

    default:
      return null;
  }
}