/**
 * Multi-format conversation export utilities
 */

import { Conversation, ChatMessage } from '../types';

/**
 * Export conversation as Markdown
 */
export function exportToMarkdown(conversation: Conversation): string {
  let md = `# ${conversation.title}\n\n`;
  md += `**Created:** ${new Date(conversation.createdAt).toLocaleString()}\n`;
  md += `**Messages:** ${conversation.messages.length}\n\n`;
  md += `---\n\n`;

  for (const msg of conversation.messages) {
    const role = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'System';
    md += `## ${role}\n\n`;
    md += `${msg.content}\n\n`;

    if (msg.usage) {
      md += `*Tokens: ${msg.usage.totalTokens}*\n\n`;
    }
  }

  return md;
}

/**
 * Export conversation as JSON
 */
export function exportToJSON(conversation: Conversation): string {
  return JSON.stringify({
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messages: conversation.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      model: msg.model,
      usage: msg.usage,
      attachments: msg.attachments,
    })),
  }, null, 2);
}

/**
 * Export messages as plain text
 */
export function exportToText(conversation: Conversation): string {
  let text = `${conversation.title}\n`;
  text += `${'='.repeat(conversation.title.length)}\n\n`;

  for (const msg of conversation.messages) {
    const role = msg.role === 'user' ? 'USER' : msg.role === 'assistant' ? 'ASSISTANT' : 'SYSTEM';
    text += `[${role}]\n${msg.content}\n\n`;
  }

  return text;
}

/**
 * Create and download a file
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export conversation with specified format
 */
export function exportConversation(
  conversation: Conversation,
  format: 'markdown' | 'json' | 'text'
): void {
  const timestamp = new Date().toISOString().slice(0, 10);
  const safeName = conversation.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();

  switch (format) {
    case 'markdown':
      downloadFile(
        exportToMarkdown(conversation),
        `${safeName}-${timestamp}.md`,
        'text/markdown'
      );
      break;
    case 'json':
      downloadFile(
        exportToJSON(conversation),
        `${safeName}-${timestamp}.json`,
        'application/json'
      );
      break;
    case 'text':
      downloadFile(
        exportToText(conversation),
        `${safeName}-${timestamp}.txt`,
        'text/plain'
      );
      break;
  }
}

/**
 * Generate shareable HTML snippet
 */
export function exportToHTML(conversation: Conversation): string {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${conversation.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; background: #111827; color: #f9fafb; }
    .message { margin: 1rem 0; padding: 1rem; border-radius: 0.5rem; }
    .user { background: #1f2937; }
    .assistant { background: #374151; }
    .role { font-weight: bold; margin-bottom: 0.5rem; }
    .timestamp { font-size: 0.75rem; color: #9ca3af; }
    pre { background: #000; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }
    code { font-family: 'SF Mono', Consolas, monospace; }
  </style>
</head>
<body>
  <h1>${conversation.title}</h1>
  ${conversation.messages.map(msg => `
    <div class="message ${msg.role}">
      <div class="role">${msg.role === 'user' ? 'User' : 'Assistant'}</div>
      <div class="timestamp">${new Date(msg.timestamp).toLocaleString()}</div>
      <div class="content">${msg.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
    </div>
  `).join('\n')}
</body>
</html>`;
  return html;
}

/**
 * Export multiple conversations as a zip (future enhancement)
 */
export async function exportMultipleAsZip(
  conversations: Conversation[],
  format: 'markdown' | 'json' | 'text'
): Promise<Blob> {
  // This would require JSZip library
  // For now, just export first conversation
  if (conversations.length > 0) {
    const content = format === 'markdown'
      ? exportToMarkdown(conversations[0])
      : format === 'json'
      ? exportToJSON(conversations[0])
      : exportToText(conversations[0]);

    return new Blob([content], { type: 'text/plain' });
  }
  return new Blob();
}