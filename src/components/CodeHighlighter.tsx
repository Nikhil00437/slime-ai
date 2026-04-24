import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Dark theme style (custom)
const customDarkStyle = {
  ...oneDark,
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    background: '#0d1117',
    margin: 0,
    padding: '1rem',
    fontSize: '0.875rem',
    lineHeight: '1.5',
  },
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    background: 'transparent',
    fontSize: '0.875rem',
    fontFamily: "'Fira Code', 'JetBrains Mono', 'SF Mono', Consolas, monospace",
  },
};

// Language display names
const LANG_NAMES: Record<string, string> = {
  js: 'JavaScript',
  javascript: 'JavaScript',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  jsx: 'JSX',
  tsx: 'TSX',
  py: 'Python',
  python: 'Python',
  rb: 'Ruby',
  ruby: 'Ruby',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
  cs: 'C#',
  go: 'Go',
  rust: 'Rust',
  rs: 'Rust',
  swift: 'Swift',
  kotlin: 'Kotlin',
  scala: 'Scala',
  php: 'PHP',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  sql: 'SQL',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  xml: 'XML',
  md: 'Markdown',
  markdown: 'Markdown',
  bash: 'Bash',
  sh: 'Shell',
  shell: 'Shell',
  powershell: 'PowerShell',
  docker: 'Docker',
  dockerfile: 'Dockerfile',
  graphql: 'GraphQL',
  vim: 'Vim',
  tex: 'LaTeX',
  latex: 'LaTeX',
};

interface CodeBlockHighlighterProps {
  language: string;
  children: string;
  showLineNumbers?: boolean;
  maxLines?: number;
}

export function CodeBlockHighlighter({
  language,
  children,
  showLineNumbers = false,
  maxLines = 50,
}: CodeBlockHighlighterProps) {
  const displayLang = LANG_NAMES[language.toLowerCase()] || language.toUpperCase();
  const lines = children.split('\n');
  const isLong = lines.length > maxLines;

  const displayCode = isLong ? lines.slice(0, maxLines).join('\n') : children;

  return (
    <div className="relative my-3 rounded-lg overflow-hidden bg-gray-950 border border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <span className="text-xs text-gray-400 font-medium">{displayLang}</span>
        {isLong && (
          <span className="text-xs text-gray-500">
            Showing {maxLines} of {lines.length} lines
          </span>
        )}
      </div>

      {/* Code */}
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={language.toLowerCase()}
          style={customDarkStyle}
          showLineNumbers={showLineNumbers && displayCode.split('\n').length < 30}
          lineNumberStyle={{
            color: '#4b5563',
            paddingRight: '1rem',
            userSelect: 'none',
          }}
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: 'transparent',
          }}
          wrapLongLines={false}
        >
          {displayCode}
        </SyntaxHighlighter>
      </div>

      {isLong && (
        <div className="px-4 py-2 bg-gray-900/50 border-t border-gray-800">
          <span className="text-xs text-gray-500">
            + {lines.length - maxLines} more lines
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Detect language from code content
 */
export function detectLanguage(code: string): string {
  // Heuristic detection based on patterns
  if (/import\s+.*\s+from\s+['"`]/.test(code)) return 'javascript';
  if (/export\s+(default\s+)?(const|let|var|function|class)/.test(code)) return 'javascript';
  if (/def\s+\w+\s*\(/.test(code)) return 'python';
  if (/fn\s+\w+\s*\(/.test(code)) return 'rust';
  if (/func\s+\w+\s*\(/.test(code)) return 'go';
  if (/public\s+class\s+\w+/.test(code)) return 'java';
  if (/package\s+main/.test(code)) return 'go';
  if (/<\w+[^>]*>.*<\/\w+>/.test(code)) return 'html';
  if (/SELECT\s+.*\s+FROM/i.test(code)) return 'sql';
  if (/^\s*[\[\{].*:/.test(code)) return 'json';
  if (/^FROM\s+\w+/.test(code)) return 'dockerfile';
  return 'text';
}