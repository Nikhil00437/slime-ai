import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Check, Copy, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, Lightbulb, Eye, EyeOff } from 'lucide-react';
import { CodeBlockHighlighter } from './CodeHighlighter';
import { MermaidDiagram } from './MermaidDiagram';

interface MarkdownRendererProps {
  content: string;
  onReaction?: (emoji: string) => void;
  reactions?: Record<string, number>;
  enableSyntaxHighlighting?: boolean;
}

type ReactionType = 'thumbsup' | 'thumbsdown' | 'lightbulb';

const REACTION_ICONS: Record<ReactionType, React.ReactNode> = {
  thumbsup: <ThumbsUp size={12} />,
  thumbsdown: <ThumbsDown size={12} />,
  lightbulb: <Lightbulb size={12} />,
};

const REACTION_EMOJI: Record<ReactionType, string> = {
  thumbsup: '👍',
  thumbsdown: '🔥',
  lightbulb: '💡',
};

interface CodeBlockProps {
  language: string;
  children: string;
  enableHighlighting?: boolean;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, children, enableHighlighting = true }) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [rawView, setRawView] = useState(false);
  const codeLines = children.split('\n');
  const isLong = codeLines.length > 10;
  const charCount = children.length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="relative my-3 rounded-lg overflow-hidden bg-gray-950 border border-gray-800">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-mono">{language || 'text'}</span>
          <span className="text-xs text-gray-500">{codeLines.length} lines</span>
          {charCount > 500 && (
            <span className="text-xs text-gray-500">{(charCount / 1000).toFixed(1)}k chars</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {enableHighlighting && (
            <button
              onClick={() => setRawView(!rawView)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors btn-press px-2 py-1 rounded hover:bg-gray-800"
              title={rawView ? 'Show highlighted' : 'Show raw'}
            >
              {rawView ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          )}
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors btn-press px-2 py-1 rounded hover:bg-gray-800"
            >
              {expanded ? (
                <>
                  <ChevronUp size={14} />
                  <span>Collapse</span>
                </>
              ) : (
                <>
                  <ChevronDown size={14} />
                  <span>Expand</span>
                </>
              )}
            </button>
          )}
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 text-xs transition-all btn-press px-2 py-1 rounded ${
              copied
                ? 'text-green-400 bg-green-400/10'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {copied ? (
              <>
                <Check size={14} className="copy-check copy-pulse" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
<pre className={`overflow-x-auto ${isLong && !expanded ? 'max-h-48' : ''}`}>
        {rawView || !enableHighlighting ? (
          <code className="text-sm text-gray-100 font-mono whitespace-pre block p-4">
            {isLong && !expanded
              ? codeLines.slice(0, 10).join('\n') + '\n...'
              : children
            }
          </code>
        ) : (
          <CodeBlockHighlighter language={language} showLineNumbers={codeLines.length > 5}>
            {isLong && !expanded
              ? codeLines.slice(0, 10).join('\n') + '\n...'
              : children
            }
          </CodeBlockHighlighter>
        )}
      </pre>
    </div>
  );
};

interface MessageReactionsProps {
  reactions?: Record<string, number>;
  onReaction: (emoji: string) => void;
}

export const MessageReactions: React.FC<MessageReactionsProps> = ({ reactions = {}, onReaction }) => {
  return (
    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
      {(['thumbsup', 'thumbsdown', 'lightbulb'] as ReactionType[]).map((type) => (
        <button
          key={type}
          onClick={(e) => {
            e.stopPropagation();
            onReaction(REACTION_EMOJI[type]);
          }}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full transition-all hover:bg-gray-700 ${
            reactions[REACTION_EMOJI[type]] 
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
              : 'text-gray-500 hover:text-gray-300 border border-transparent hover:border-gray-600'
          }`}
        >
          {REACTION_ICONS[type]}
          {reactions[REACTION_EMOJI[type]] && (
            <span>{reactions[REACTION_EMOJI[type]]}</span>
          )}
        </button>
      ))}
    </div>
  );
};

interface QuickReplyChip {
  id: string;
  text: string;
}

interface QuickReplyChipsProps {
  chips: QuickReplyChip[];
  onSelect: (text: string) => void;
}

export const QuickReplyChips: React.FC<QuickReplyChipsProps> = ({ chips, onSelect }) => {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {chips.map((chip) => (
        <button
          key={chip.id}
          onClick={() => onSelect(chip.text)}
          className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 hover:border-gray-600 rounded-full transition-all hover:scale-105"
        >
          {chip.text}
        </button>
      ))}
    </div>
  );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  if (!content) return null;

  return (
    <div className="prose prose-invert max-w-none prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2 prose-code:text-orange-400 prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-pre:p-0 prose-pre:m-0 prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-li:my-1 prose-blockquote:border-l-blue-500 prose-blockquote:text-gray-400">
      <ReactMarkdown
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isBlock = match || String(children).includes('\n');

            // Handle mermaid diagrams
            if (match && match[1]?.toLowerCase() === 'mermaid') {
              return (
                <MermaidDiagram code={String(children).replace(/\n$/, '')} />
              );
            }

            if (isBlock && !match) {
              return (
                <pre className="overflow-x-auto p-4 bg-gray-950 rounded-lg my-3 border border-gray-800 font-mono">
                  <code className="text-sm text-gray-100">{String(children).replace(/\n$/, '')}</code>
                </pre>
              );
            }

            if (isBlock) {
              return (
                <CodeBlock language={match?.[1] || ''} enableHighlighting={true}>
                  {String(children).replace(/\n$/, '')}
                </CodeBlock>
              );
            }

            return (
              <code className="text-sm text-orange-400 bg-gray-800 px-1.5 py-0.5 rounded font-mono" {...props}>
                {children}
              </code>
            );
          },
          li({ className, children, ...props }) {
            const childArr = React.Children.toArray(children);
            if (childArr.length > 0 && typeof childArr[0] === 'string') {
              const str = childArr[0] as string;
              if (str.startsWith('[ ] ')) {
                return (
                  <li className="flex items-start gap-3 my-2 p-3 bg-white/5 border border-white/10 backdrop-blur-md rounded-xl shadow-lg list-none ms-0">
                    <div className="w-5 h-5 rounded border-2 border-white/20 mt-0.5 shrink-0" />
                    <span className="text-gray-200">{str.slice(4)}</span>
                    {childArr.slice(1)}
                  </li>
                );
              }
              if (str.startsWith('[x] ') || str.startsWith('[X] ') || str.startsWith('[-] ')) {
                return (
                  <li className="flex items-start gap-3 my-2 p-3 bg-white/5 border border-white/10 backdrop-blur-md rounded-xl shadow-lg list-none ms-0 opacity-70">
                    <div className="w-5 h-5 rounded border-2 border-green-500 bg-green-500/20 mt-0.5 flex items-center justify-center shrink-0">
                      <Check size={14} className="text-green-400" />
                    </div>
                    <span className="text-gray-400 line-through">{str.slice(4)}</span>
                    {childArr.slice(1)}
                  </li>
                );
              }
            }
            return <li className="my-1 ms-4 list-disc" {...props}>{children}</li>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
