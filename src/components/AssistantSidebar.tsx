import React, { useState, useEffect, useRef } from 'react';
import {
  AssistantSidebarContent,
  SidebarBlockType,
  ThinkingBlock,
  ProcessingBlock,
  CodingBlock,
  CodeBlock,
  ProcessingStep,
} from '../types';
import {
  Brain,
  Cpu,
  Code2,
  ChevronDown,
  ChevronRight,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Play,
  Eye,
  Copy,
  Check,
  Sparkles,
  FileCode,
  FileText,
  Image,
} from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface AssistantSidebarProps {
  content: AssistantSidebarContent | undefined;
  onClose: () => void;
  onBlockChange?: (block: SidebarBlockType) => void;
}

// ==================== Thinking Block ====================

function ThinkingBlockView({ block }: { block: ThinkingBlock }) {
  return (
    <div className="thinking-block">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-4 h-4 text-green-400" />
        <span className="text-sm font-medium text-green-400">Thinking</span>
        {block.isStreaming && (
          <Loader2 className="w-3 h-3 animate-spin text-green-400 ml-auto" />
        )}
      </div>
      <div className="prose prose-invert prose-sm max-w-none">
        <MarkdownRenderer content={block.content} />
      </div>
    </div>
  );
}

// ==================== Processing Block ====================

function ProcessingStepItem({
  step,
  onToggle,
}: {
  step: ProcessingStep;
  onToggle: () => void;
}) {
  const getStatusIcon = () => {
    switch (step.status) {
      case 'pending':
        return <div className="w-4 h-4 rounded-full border border-dark-400" />;
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
    }
  };

  const getStatusColor = () => {
    switch (step.status) {
      case 'pending':
        return 'text-dark-400';
      case 'running':
        return 'text-cyan-400';
      case 'completed':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
    }
  };

  return (
    <div className="processing-step border border-dark-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 hover:bg-dark-800/50 transition-colors text-left"
      >
        {getStatusIcon()}
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {step.name}
        </span>
        {step.status === 'running' && step.startTime && (
          <span className="text-xs text-dark-500 ml-auto">
            {Math.floor((Date.now() - step.startTime) / 1000)}s
          </span>
        )}
        {step.isExpanded !== false ? (
          <ChevronDown className="w-4 h-4 text-dark-500 ml-auto" />
        ) : (
          <ChevronRight className="w-4 h-4 text-dark-500 ml-auto" />
        )}
      </button>

      {step.isExpanded !== false && (
        <div className="px-3 pb-3 border-t border-dark-700/50">
          {step.input && (
            <div className="mt-3">
              <div className="text-xs text-dark-500 mb-1">Input</div>
              <pre className="text-xs bg-dark-900 rounded p-2 overflow-x-auto text-dark-300">
                {formatJson(step.input)}
              </pre>
            </div>
          )}
          {step.output && (
            <div className="mt-3">
              <div className="text-xs text-dark-500 mb-1">Output</div>
              <pre className="text-xs bg-dark-900 rounded p-2 overflow-x-auto text-dark-300 max-h-40">
                {formatJson(step.output)}
              </pre>
            </div>
          )}
          {step.error && (
            <div className="mt-3">
              <div className="text-xs text-red-400 mb-1">Error</div>
              <pre className="text-xs bg-red-900/20 rounded p-2 overflow-x-auto text-red-300">
                {step.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatJson(str: string): string {
  try {
    const parsed = JSON.parse(str);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return str;
  }
}

function ProcessingBlockView({ block }: { block: ProcessingBlock }) {
  const [steps, setSteps] = useState<ProcessingStep[]>(block.steps);

  const toggleStep = (stepId: string) => {
    setSteps(prev =>
      prev.map(s =>
        s.id === stepId ? { ...s, isExpanded: !s.isExpanded } : s
      )
    );
  };

  const completedCount = steps.filter(s => s.status === 'completed').length;
  const totalCount = steps.length;

  return (
    <div className="processing-block">
      <div className="flex items-center gap-2 mb-3">
        <Cpu className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-medium text-cyan-400">Processing</span>
        {block.isStreaming && (
          <Loader2 className="w-3 h-3 animate-spin text-cyan-400 ml-auto" />
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-dark-500 mb-4">
        <span>{completedCount}/{totalCount} steps</span>
        <div className="flex-1 h-1 bg-dark-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-400 transition-all duration-300"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {steps.map(step => (
          <ProcessingStepItem
            key={step.id}
            step={step}
            onToggle={() => toggleStep(step.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ==================== Coding Block ====================

function CodePreview({
  block,
  onCopy,
}: {
  block: CodeBlock;
  onCopy: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(block.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy();
  };

  const renderPreview = () => {
    switch (block.previewType) {
      case 'html':
        return (
          <div className="border border-dark-700 rounded-lg overflow-hidden">
            <div className="bg-dark-800 px-3 py-1 flex items-center justify-between">
              <span className="text-xs text-dark-400">Preview</span>
              <button
                onClick={handleCopy}
                className="text-dark-500 hover:text-dark-300"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-green-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
            <div className="bg-white p-2">
              <iframe
                srcDoc={block.code}
                className="w-full h-48 border-0"
                sandbox="allow-scripts"
                title="HTML Preview"
              />
            </div>
          </div>
        );

      case 'markdown':
        return (
          <div className="border border-dark-700 rounded-lg overflow-hidden">
            <div className="bg-dark-800 px-3 py-1 flex items-center justify-between">
              <span className="text-xs text-dark-400">Preview</span>
              <button
                onClick={handleCopy}
                className="text-dark-500 hover:text-dark-300"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-green-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
            <div className="bg-dark-900 p-3 prose prose-invert prose-sm max-w-none">
              <MarkdownRenderer content={block.code} />
            </div>
          </div>
        );

      case 'mermaid':
        return (
          <div className="border border-dark-700 rounded-lg overflow-hidden">
            <div className="bg-dark-800 px-3 py-1 flex items-center justify-between">
              <span className="text-xs text-dark-400">Diagram Preview</span>
              <button
                onClick={handleCopy}
                className="text-dark-500 hover:text-dark-300"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-green-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
            <div className="bg-dark-900 p-4 flex justify-center">
              <div className="mermaid-preview text-center">
                {/* Mermaid rendering would be handled separately */}
                <pre className="text-xs text-dark-400">{block.code}</pre>
              </div>
            </div>
          </div>
        );

      case 'json':
        try {
          const formatted = JSON.stringify(JSON.parse(block.code), null, 2);
          return (
            <pre className="text-xs bg-dark-900 rounded p-2 overflow-x-auto text-green-400">
              {formatted}
            </pre>
          );
        } catch {
          return (
            <pre className="text-xs bg-dark-900 rounded p-2 overflow-x-auto text-dark-300">
              {block.code}
            </pre>
          );
        }

      default:
        return null;
    }
  };

  return (
    <div className="code-block-item">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-dark-300">
            {block.filename || block.language}
          </span>
          {block.startLine && (
            <span className="text-xs text-dark-500">
              L{block.startLine}-{block.endLine}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {block.previewType && block.previewType !== 'text' && (
            <span className="text-xs px-2 py-0.5 rounded bg-purple-900/30 text-purple-400">
              {block.previewType}
            </span>
          )}
          <button
            onClick={handleCopy}
            className="p-1 text-dark-500 hover:text-dark-300 rounded"
          >
            {copied ? (
              <Check className="w-3 h-3 text-green-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>

      <SyntaxHighlighter
        language={block.language}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '0.75rem',
          fontSize: '0.75rem',
          background: '#0f172a',
          borderRadius: '0.5rem',
        }}
        showLineNumbers
        lineNumberStyle={{ color: '#475569', minWidth: '2rem' }}
      >
        {block.code}
      </SyntaxHighlighter>

      {block.previewType && block.previewType !== 'text' && (
        <div className="mt-3">{renderPreview()}</div>
      )}
    </div>
  );
}

function CodingBlockView({ block }: { block: CodingBlock }) {
  const [blocks, setBlocks] = useState<CodeBlock[]>(block.blocks);

  const detectPreviewType = (language: string, code: string): 'html' | 'markdown' | 'mermaid' | 'text' | 'json' | undefined => {
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

  const blocksWithPreview = blocks.map(b => ({
    ...b,
    previewType: b.previewType || detectPreviewType(b.language, b.code),
  }));

  return (
    <div className="coding-block">
      <div className="flex items-center gap-2 mb-3">
        <Code2 className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-medium text-purple-400">Code</span>
        {block.isStreaming && (
          <Loader2 className="w-3 h-3 animate-spin text-purple-400 ml-auto" />
        )}
      </div>

      <div className="text-xs text-dark-500 mb-4">
        {blocksWithPreview.filter(b => b.previewType).length} previewable,{' '}
        {blocksWithPreview.filter(b => !b.previewType).length} code only
      </div>

      <div className="space-y-4">
        {blocksWithPreview.map((codeBlock, index) => (
          <div key={codeBlock.id || index}>
            <CodePreview block={codeBlock} onCopy={() => {}} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== Main Sidebar Component ====================

export function AssistantSidebar({
  content,
  onClose,
  onBlockChange,
}: AssistantSidebarProps) {
  const [activeBlock, setActiveBlock] = useState<SidebarBlockType | null>(
    content?.activeBlock || null
  );

  useEffect(() => {
    if (content?.activeBlock) {
      setActiveBlock(content.activeBlock);
    }
  }, [content?.activeBlock]);

  const handleBlockClick = (block: SidebarBlockType) => {
    setActiveBlock(block);
    onBlockChange?.(block);
  };

  if (!content || !content.activeBlock) {
    return null;
  }

  const getBlockIcon = (block: SidebarBlockType) => {
    switch (block) {
      case 'thinking':
        return <Brain className="w-4 h-4" />;
      case 'processing':
        return <Cpu className="w-4 h-4" />;
      case 'coding':
        return <Code2 className="w-4 h-4" />;
    }
  };

  const getBlockLabel = (block: SidebarBlockType) => {
    switch (block) {
      case 'thinking':
        return 'Thinking';
      case 'processing':
        return 'Processing';
      case 'coding':
        return 'Code';
    }
  };

  const getBlockColor = (block: SidebarBlockType) => {
    switch (block) {
      case 'thinking':
        return 'text-green-400 border-green-400/30 bg-green-400/10';
      case 'processing':
        return 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10';
      case 'coding':
        return 'text-purple-400 border-purple-400/30 bg-purple-400/10';
    }
  };

  const renderContent = () => {
    switch (activeBlock) {
      case 'thinking':
        return content.thinking ? (
          <ThinkingBlockView block={content.thinking} />
        ) : null;
      case 'processing':
        return content.processing ? (
          <ProcessingBlockView block={content.processing} />
        ) : null;
      case 'coding':
        return content.coding ? (
          <CodingBlockView block={content.coding} />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="assistant-sidebar w-80 h-full bg-dark-900/95 backdrop-blur-sm border-l border-dark-700 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-dark-700">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-slime-400" />
          <span className="text-sm font-medium text-dark-200">Assistant</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-dark-500 hover:text-dark-300 rounded hover:bg-dark-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Block Tabs */}
      <div className="flex gap-1 p-2 border-b border-dark-700">
        {(['thinking', 'processing', 'coding'] as SidebarBlockType[]).map(
          block => {
            const isActive = activeBlock === block;
            const hasContent = content[block];
            
            return (
              <button
                key={block}
                onClick={() => handleBlockClick(block)}
                disabled={!hasContent}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-all ${
                  isActive
                    ? getBlockColor(block)
                    : hasContent
                    ? 'text-dark-400 hover:text-dark-200 hover:bg-dark-800'
                    : 'text-dark-600 cursor-not-allowed'
                }`}
              >
                {getBlockIcon(block)}
                <span>{getBlockLabel(block)}</span>
              </button>
            );
          }
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {renderContent()}
      </div>
    </div>
  );
}

export default AssistantSidebar;