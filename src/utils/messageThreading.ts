/**
 * Message Threading for Follow-ups
 * Day 23: Organize Q&A chains within a conversation
 */

export interface ThreadNode {
  id: string;
  messageId: string;
  parentId: string | null;
  children: string[];
  depth: number;
}

export interface Thread {
  id: string;
  rootMessageId: string;
  nodes: Map<string, ThreadNode>;
}

const threadStorage = new Map<string, Thread>();

/**
 * Create a new thread starting from a message
 */
export function createThread(messageId: string): Thread {
  const thread: Thread = {
    id: `thread-${Date.now()}`,
    rootMessageId: messageId,
    nodes: new Map(),
  };

  const rootNode: ThreadNode = {
    id: `node-${messageId}`,
    messageId,
    parentId: null,
    children: [],
    depth: 0,
  };

  thread.nodes.set(rootNode.id, rootNode);
  threadStorage.set(thread.id, thread);
  return thread;
}

/**
 * Add a reply to a thread
 */
export function addReply(threadId: string, messageId: string, parentMessageId: string): ThreadNode | null {
  const thread = threadStorage.get(threadId);
  if (!thread) return null;

  const parentNode = Array.from(thread.nodes.values()).find(n => n.messageId === parentMessageId);
  if (!parentNode) return null;

  const node: ThreadNode = {
    id: `node-${messageId}`,
    messageId,
    parentId: parentNode.id,
    children: [],
    depth: parentNode.depth + 1,
  };

  parentNode.children.push(node.id);
  thread.nodes.set(node.id, node);
  return node;
}

/**
 * Get thread for a message
 */
export function getThreadForMessage(messageId: string): Thread | null {
  for (const thread of threadStorage.values()) {
    for (const node of thread.nodes.values()) {
      if (node.messageId === messageId) {
        return thread;
      }
    }
  }
  return null;
}

/**
 * Get thread path (breadcrumb) for a message
 */
export function getThreadPath(threadId: string, messageId: string): string[] {
  const thread = threadStorage.get(threadId);
  if (!thread) return [];

  const path: string[] = [];
  let current = Array.from(thread.nodes.values()).find(n => n.messageId === messageId);

  while (current) {
    path.unshift(current.messageId);
    if (current.parentId) {
      current = thread.nodes.get(current.parentId) || undefined;
    } else {
      break;
    }
  }

  return path;
}

/**
 * Get all replies in a thread
 */
export function getThreadReplies(threadId: string, messageId: string): string[] {
  const thread = threadStorage.get(threadId);
  if (!thread) return [];

  const node = Array.from(thread.nodes.values()).find(n => n.messageId === messageId);
  if (!node) return [];

  return node.children.map(childId => {
    const child = thread.nodes.get(childId);
    return child?.messageId || '';
  }).filter(Boolean);
}

/**
 * Serialize threads for storage
 */
export function serializeThreads(): string {
  const data: Record<string, any> = {};
  for (const [id, thread] of threadStorage) {
    data[id] = {
      id: thread.id,
      rootMessageId: thread.rootMessageId,
      nodes: Array.from(thread.nodes.entries()),
    };
  }
  return JSON.stringify(data);
}

/**
 * Load threads from storage
 */
export function loadThreads(data: string): void {
  try {
    const parsed = JSON.parse(data) as Record<string, any>;
    threadStorage.clear();
    for (const [id, threadData] of Object.entries(parsed)) {
      const thread: Thread = {
        id: threadData.id as string,
        rootMessageId: threadData.rootMessageId as string,
        nodes: new Map(threadData.nodes as [string, ThreadNode][]),
      };
      threadStorage.set(id, thread);
    }
  } catch {
    // Ignore parse errors
  }
}

/**
 * Check if a message is part of a thread
 */
export function isInThread(messageId: string): boolean {
  return getThreadForMessage(messageId) !== null;
}

/**
 * Get thread depth for a message
 */
export function getThreadDepth(messageId: string): number {
  const thread = getThreadForMessage(messageId);
  if (!thread) return 0;

  const node = Array.from(thread.nodes.values()).find(n => n.messageId === messageId);
  return node?.depth || 0;
}
