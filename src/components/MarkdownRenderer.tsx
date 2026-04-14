import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Check, Copy } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

const CodeBlock: React.FC<{ language: string; children: string }> = ({ language, children }) => {
  const [copied, setCopied] = useState(false);

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
        <span className="text-xs text-gray-400 font-mono">{language || 'text'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check size={14} className="text-green-400" />
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4">
        <code className="text-sm text-gray-100 font-mono">{children}</code>
      </pre>
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

            if (isBlock && !match) {
              return (
                <pre className="overflow-x-auto p-4 bg-gray-950 rounded-lg my-3">
                  <code className="text-sm text-gray-100 font-mono">{String(children).replace(/\n$/, '')}</code>
                </pre>
              );
            }

            if (isBlock) {
              return (
                <CodeBlock language={match?.[1] || ''}>
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
