import { ProviderType, ModelInfo, ChatMessage } from '../types';
// ✅ Day 3: Retry imports
import { 
  getRequestTimeout, 
  getRetryConfig, 
  isRetryableError, 
  calculateRetryDelay,
  withTimeout,
  withRetry 
} from './retry';

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export async function detectOllamaModels(baseUrl: string): Promise<ModelInfo[]> {
  try {
    const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.models || []).map((m: any) => ({
      id: m.name,
      name: m.name,
      provider: 'ollama' as ProviderType,
      parameters: m.details?.parameter_size || '',
      capabilities: {
        text: true,
        image: false,
        audio: false,
        video: false,
        fileUpload: false,
      },
    }));
  } catch {
    return [];
  }
}

export async function detectLMStudioModels(baseUrl: string): Promise<ModelInfo[]> {
  try {
    const normalized = normalizeBaseUrl(baseUrl);
    const url = normalized.endsWith('/v1') ? `${normalized}/models` : `${normalized}/v1/models`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).map((m: any) => ({
      id: m.id,
      name: m.id,
      provider: 'lmstudio' as ProviderType,
      capabilities: {
        text: true,
        image: false,
        audio: false,
        video: false,
        fileUpload: false,
      },
    }));
  } catch {
    return [];
  }
}

export async function detectOpenRouterModels(apiKey: string): Promise<ModelInfo[]> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).map((m: any) => ({
      id: m.id,
      name: m.name || m.id,
      provider: 'openrouter' as ProviderType,
      capabilities: {
        text: true,
        image: m.image_support || false,
        audio: false,
        video: false,
        fileUpload: false,
      },
    }));
  } catch {
    return [];
  }
}

export async function detectOpenAIModels(apiKey: string): Promise<ModelInfo[]> {
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    
    const visionModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-vision', 'gpt-4-turbo'];
    
    return (data.data || [])
      .filter((m: any) => m.id.includes('gpt') || m.id.includes('o1') || m.id.includes('o3'))
      .map((m: any) => {
        const isVision = visionModels.some(v => m.id.includes(v));
        return {
          id: m.id,
          name: m.id.replace('gpt-', 'GPT-').replace(/-([a-z])/g, (_: string, c: string) => ' ' + c.toUpperCase()),
          provider: 'openai' as ProviderType,
          capabilities: {
            text: true,
            image: isVision,
            audio: m.id.includes('audio'),
            video: false,
            fileUpload: true,
            maxContextTokens: m.id.includes('o1') || m.id.includes('o3') ? 200000 : 128000,
            maxOutputTokens: m.id.includes('o1') || m.id.includes('o3') ? 100000 : 16384,
          },
        };
      });
  } catch {
    return [];
  }
}

export async function detectAnthropicModels(apiKey: string): Promise<ModelInfo[]> {
  const fallbackModels: ModelInfo[] = [
    { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', provider: 'anthropic' as ProviderType, capabilities: { text: true, image: true, audio: false, video: false, fileUpload: true, maxContextTokens: 200000, maxOutputTokens: 8192 } },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic' as ProviderType, capabilities: { text: true, image: true, audio: false, video: false, fileUpload: true, maxContextTokens: 200000, maxOutputTokens: 8192 } },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'anthropic' as ProviderType, capabilities: { text: true, image: true, audio: false, video: false, fileUpload: true, maxContextTokens: 200000, maxOutputTokens: 8192 } },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic' as ProviderType, capabilities: { text: true, image: true, audio: false, video: false, fileUpload: true, maxContextTokens: 200000, maxOutputTokens: 8192 } },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'anthropic' as ProviderType, capabilities: { text: true, image: true, audio: false, video: false, fileUpload: true, maxContextTokens: 200000, maxOutputTokens: 8192 } },
  ];

  try {
    const res = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'anthropic-version': '2023-06-01',
      },
      signal: AbortSignal.timeout(10000),
    });
    
    if (res.ok) {
      const data = await res.json();
      return (data.data || []).map((m: any) => ({
        id: m.id,
        name: m.display_name || m.id.replace('claude-', 'Claude ').replace(/-([a-z])/g, (_: string, c: string) => ' ' + c.toUpperCase()),
        provider: 'anthropic' as ProviderType,
        capabilities: {
          text: true,
          image: true,
          audio: false,
          video: false,
          fileUpload: true,
          maxContextTokens: 200000,
          maxOutputTokens: 8192,
        },
      }));
    }
  } catch {}

  return fallbackModels.map((m) => ({
    id: m.id,
    name: m.name,
    provider: 'anthropic' as ProviderType,
    capabilities: {
      text: true,
      image: true,
      audio: false,
      video: false,
      fileUpload: true,
      maxContextTokens: 200000,
      maxOutputTokens: 8192,
    },
  }));
}

export async function detectGeminiModels(apiKey: string): Promise<ModelInfo[]> {
  const fallbackModels: ModelInfo[] = [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'gemini' as ProviderType, capabilities: { text: true, image: true, audio: true, video: true, fileUpload: true, maxContextTokens: 2000000, maxOutputTokens: 8192 } },
    { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', provider: 'gemini' as ProviderType, capabilities: { text: true, image: true, audio: true, video: true, fileUpload: true, maxContextTokens: 2000000, maxOutputTokens: 8192 } },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'gemini' as ProviderType, capabilities: { text: true, image: true, audio: false, video: false, fileUpload: true, maxContextTokens: 1000000, maxOutputTokens: 8192 } },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'gemini' as ProviderType, capabilities: { text: true, image: true, audio: false, video: false, fileUpload: true, maxContextTokens: 1000000, maxOutputTokens: 8192 } },
  ];
  
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return fallbackModels;
    const data = await res.json();
    
    const models = (data.models || [])
      .filter((m: any) => m.name.includes('gemini') && !m.name.includes('embedding'))
      .map((m: any) => {
        const isGemini2 = m.name.includes('gemini-2');
        return {
          id: m.name.replace('models/', ''),
          name: m.displayName || m.name.replace('models/', 'Gemini ').replace(/-([a-z])/g, (_: string, c: string) => ' ' + c.toUpperCase()),
          provider: 'gemini' as ProviderType,
          capabilities: {
            text: true,
            image: true,
            audio: isGemini2,
            video: isGemini2,
            fileUpload: true,
            maxContextTokens: isGemini2 ? 2000000 : 1000000,
            maxOutputTokens: 8192,
          },
        };
      });
    
    return models.length > 0 ? models : fallbackModels;
  } catch {
    return fallbackModels.map((m) => ({
      id: m.id,
      name: m.name,
      provider: 'gemini' as ProviderType,
      capabilities: {
        text: true,
        image: true,
        audio: m.id.includes('2.0'),
        video: m.id.includes('2.0'),
        fileUpload: true,
        maxContextTokens: m.id.includes('2.0') ? 2000000 : 1000000,
        maxOutputTokens: 8192,
      },
    }));
  }
}

export async function detectGrokModels(apiKey: string): Promise<ModelInfo[]> {
  const fallbackModels: ModelInfo[] = [
    { id: 'grok-2-latest', name: 'Grok 2', provider: 'grok' as ProviderType, capabilities: { text: true, image: true, audio: false, video: false, fileUpload: false, maxContextTokens: 131072, maxOutputTokens: 32768 } },
    { id: 'grok-2-vision-latest', name: 'Grok 2 Vision', provider: 'grok' as ProviderType, capabilities: { text: true, image: true, audio: false, video: false, fileUpload: false, maxContextTokens: 131072, maxOutputTokens: 32768 } },
    { id: 'grok-beta', name: 'Grok Beta', provider: 'grok' as ProviderType, capabilities: { text: true, image: false, audio: false, video: false, fileUpload: false, maxContextTokens: 131072, maxOutputTokens: 32768 } },
  ];
  
  try {
    const res = await fetch('https://api.x.ai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return fallbackModels;
    const data = await res.json();
    
    return (data.data || []).map((m: any) => ({
      id: m.id,
        name: m.id.replace('grok-', 'Grok ').replace(/-([a-z])/g, (_: string, c: string) => ' ' + c.toUpperCase()),
      provider: 'grok' as ProviderType,
      capabilities: {
        text: true,
        image: m.id.includes('vision') || m.id.includes('2'),
        audio: false,
        video: false,
        fileUpload: false,
        maxContextTokens: 131072,
        maxOutputTokens: 32768,
      },
    }));
  } catch {
    return fallbackModels.map((m) => ({
      id: m.id,
      name: m.name,
      provider: 'grok' as ProviderType,
      capabilities: {
        text: true,
        image: m.id.includes('vision') || m.id.includes('2'),
        audio: false,
        video: false,
        fileUpload: false,
        maxContextTokens: 131072,
        maxOutputTokens: 32768,
      },
    }));
  }
}

export async function checkProviderHealth(
  type: ProviderType,
  baseUrl: string,
  apiKey?: string
): Promise<boolean> {
  try {
    let url: string;
    const headers: Record<string, string> = {};

    switch (type) {
      case 'ollama':
        url = `${baseUrl}/api/tags`;
        break;
      case 'lmstudio': {
        const normalized = normalizeBaseUrl(baseUrl);
        url = normalized.endsWith('/v1') ? `${normalized}/models` : `${normalized}/v1/models`;
        break;
      }
      case 'openrouter':
        url = `${baseUrl}/models`;
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
        break;
      case 'openai':
        url = `${baseUrl}/models`;
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
        break;
      case 'anthropic':
        url = `${baseUrl}/models`;
        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
          headers['anthropic-version'] = '2023-06-01';
        }
        break;
      case 'gemini':
        url = `${baseUrl}/models?key=${apiKey}`;
        break;
      case 'grok':
        url = `${baseUrl}/models`;
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
        break;
      default:
        return false;
    }

    const res = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

export interface ImageAttachment {
  type: 'image';
  url: string;
  mimeType: string;
}

export interface FileAttachment {
  type: 'file';
  name: string;
  content: string;
  mimeType: string;
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters?: {
      type: string;
      properties?: Record<string, any>;
      required?: string[];
    };
  };
}

export interface ToolCallDelta {
  index: number;
  id?: string;
  type?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
}

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onComplete: (usage?: { inputTokens: number; outputTokens: number; totalTokens: number }) => void;
  onError: (error: string) => void;
  onToolCalls?: (toolCalls: ToolCallDelta[]) => void;
}

export async function streamChatCompletion(
  provider: ProviderType,
  baseUrl: string,
  modelId: string,
  messages: ChatMessage[],
  systemPrompt: string,
  temperature: number,
  maxTokens: number,
  apiKey?: string,
  callbacks?: StreamCallbacks,
  images?: ImageAttachment[],
  tools?: ToolDefinition[]
): Promise<void> {
  
  if (provider === 'ollama') {
    const endpoint = `${baseUrl}/api/chat`;
    const ollamaMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];
    
    if (images && images.length > 0) {
      const lastMessage = ollamaMessages[ollamaMessages.length - 1];
      if (lastMessage && typeof lastMessage.content === 'string') {
        const textContent = lastMessage.content;
        (lastMessage as any).content = [
          { type: 'text', text: textContent },
          ...images.map((img) => ({
            type: 'image_url',
            image_url: { url: img.url },
          })),
        ];
      }
    }
    
    const ollamaBody: any = {
      model: modelId,
      messages: ollamaMessages,
      stream: true,
      options: {
        temperature,
        num_predict: maxTokens,
      },
      ...(tools && tools.length > 0 ? { tools } : {}),
    };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ollamaBody),
      });

      if (!res.ok) {
        const err = await res.text();
        callbacks?.onError(`Ollama error: ${err}`);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        callbacks?.onError('No response stream');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        const lines = buffer.split('\n');
        
        for (let i = 0; i < lines.length - 1; i++) {
          const trimmed = lines[i].trim();
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.message?.content) {
              callbacks?.onChunk(parsed.message.content);
            }
            if (parsed.done) {
              const usage = parsed.prompt_eval_count || parsed.eval_count ? {
                inputTokens: parsed.prompt_eval_count || 0,
                outputTokens: parsed.eval_count || 0,
                totalTokens: (parsed.prompt_eval_count || 0) + (parsed.eval_count || 0),
              } : undefined;
              callbacks?.onComplete(usage);
              return;
            }
          } catch {}
        }
        buffer = lines[lines.length - 1];
      }
      
      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer.trim());
          if (parsed.message?.content) callbacks?.onChunk(parsed.message.content);
          if (parsed.done) callbacks?.onComplete();
        } catch {}
      }
    } catch (err: any) {
      callbacks?.onError(err instanceof Error ? err.message : 'Stream error');
    }
    return;
  }

  if (provider === 'anthropic') {
    const endpoint = `${baseUrl}/messages`;
    const anthropicHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': apiKey || '',
    };
    if (apiKey) anthropicHeaders['Authorization'] = `Bearer ${apiKey}`;

    // Anthropic vision format - content can be array with text and image blocks
    const anthropicMessages: any[] = messages.map((m) => {
      if (m.role === 'user' && images && images.length > 0) {
        const content: any[] = [{ type: 'text', text: m.content }];
        for (const img of images) {
          let base64Data = img.url;
          if (base64Data.startsWith('data:')) {
            base64Data = base64Data.split(',')[1];
          }
          content.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: img.mimeType,
              data: base64Data,
            },
          });
        }
        return { role: m.role, content };
      }
      return { role: m.role, content: m.content };
    });

    const anthropicBody: any = {
      model: modelId,
      max_tokens: maxTokens,
      messages: anthropicMessages,
      system: systemPrompt,
      stream: true,
      ...(tools && tools.length > 0 ? { tools } : {}),
    };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: anthropicHeaders,
        body: JSON.stringify(anthropicBody),
      });

      if (!res.ok) {
        const err = await res.text();
        callbacks?.onError(`Anthropic error: ${err}`);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        callbacks?.onError('No response stream');
        return;
      }

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.includes('message_stop')) {
              // Try to extract usage from message_stop event
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                if (parsed.usage) {
                  callbacks?.onComplete({
                    inputTokens: parsed.usage.input_tokens || 0,
                    outputTokens: parsed.usage.output_tokens || 0,
                    totalTokens: (parsed.usage.input_tokens || 0) + (parsed.usage.output_tokens || 0),
                  });
                  return;
                }
              } catch {}
              callbacks?.onComplete();
              return;
            }
            if (!trimmed.startsWith('data: ')) continue;

          try {
            const parsed = JSON.parse(trimmed.slice(6));
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              callbacks?.onChunk(parsed.delta.text);
            }
            // Handle tool_use content blocks in streaming
            if (parsed.type === 'content_block_start' && parsed.content_block?.type === 'tool_use') {
              callbacks?.onToolCalls?.([{
                index: parsed.content_block.index ?? 0,
                id: parsed.content_block.id,
                type: 'function',
                function: {
                  name: parsed.content_block.name,
                  arguments: '',
                },
              }]);
            }
            if (parsed.type === 'input_json_delta' && parsed.delta?.partial_json) {
              callbacks?.onToolCalls?.([{
                index: parsed.index ?? 0,
                function: {
                  arguments: parsed.delta.partial_json,
                },
              }]);
            }
          } catch {}
        }
      }
      callbacks?.onComplete();
      return;
    } catch (err: any) {
      callbacks?.onError(err.message || 'Stream error');
      callbacks?.onComplete();
      return;
    }
  }

  if (provider === 'gemini') {
    const endpoint = `${baseUrl}/models/${modelId}:streamGenerateContent?alt=sse&key=${apiKey}`;

    const geminiParts = [];

    // 1. Process Images
    if (images && images.length > 0) {
      for (const img of images) {
        let base64Data = img.url;
        if (base64Data.startsWith('data:')) {
          base64Data = base64Data.split(',')[1];
        }
        geminiParts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: base64Data,
          },
        });
      }
    }

    // 2. Prepare the current user message parts
    const userContent = messages.length > 0 ? messages[messages.length - 1].content : '';
    if (userContent || geminiParts.length > 0) {
      geminiParts.unshift({ text: userContent });
    }

    // 3. Construct conversation history (EXCLUDING system role)
    const geminiContents = [
      ...messages.slice(0, -1).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: geminiParts },
    ];

    // 4. Construct the body with system_instruction at the top level
    const geminiBody: any = {
      contents: geminiContents,
      system_instruction: systemPrompt ? {
        parts: [{ text: systemPrompt }]
      } : undefined,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
      ...(tools && tools.length > 0 ? {
        tools: [{
          functionDeclarations: tools.map(t => ({
            name: t.function.name,
            description: t.function.description,
            parameters: t.function.parameters || { type: 'object', properties: {} },
          })),
        }],
      } : {}),
    };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
      });

      if (!res.ok) {
        const err = await res.text();
        callbacks?.onError(`Gemini error: ${err}`);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        callbacks?.onError('No response stream');
        return;
      }

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          try {
            // Remove 'data: ' prefix and parse
            const parsed = JSON.parse(trimmed.slice(6));
            const parts = parsed.candidates?.[0]?.content?.parts;
            if (parts) {
              for (const part of parts) {
                if (part.text) {
                  callbacks?.onChunk(part.text);
                }
                // Handle Gemini function call responses
                if (part.functionCall) {
                  callbacks?.onToolCalls?.([{
                    index: 0,
                    id: `call_${Date.now()}`,
                    type: 'function',
                    function: {
                      name: part.functionCall.name,
                      arguments: JSON.stringify(part.functionCall.args || {}),
                    },
                  }]);
                }
              }
            }
          } catch (e) {
            // Silence parsing errors for incomplete stream chunks
          }
        }
      }
      callbacks?.onComplete();
    } catch (err: any) {
      callbacks?.onError(err instanceof Error ? err.message : 'Stream error');
    }
    return;
  }

  const normalized = normalizeBaseUrl(baseUrl);
let endpoint: string;

if (provider === 'lmstudio' && !normalized.endsWith('/v1')) {
  endpoint = `${normalized}/v1/chat/completions`;
} else if (provider === 'grok') {
  endpoint = `${normalized}/chat/completions`;
} else {
  endpoint = `${normalized}/chat/completions`;
}

// 1. Refactored Message Formatting
// Filter out empty system prompts to prevent '400' errors on strict providers
// 1. Prepare your message array
const formattedMessages: any[] = messages.map((m) => {
  // Handle tool role messages for OpenAI-compatible APIs
  if (m.role === 'tool') {
    return {
      role: 'tool',
      content: m.content,
      tool_call_id: m.toolCallId,
    };
  }
  // Handle assistant messages with tool_calls
  if (m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0) {
    return {
      role: 'assistant',
      content: m.content || null,
      tool_calls: m.toolCalls.map(tc => ({
        id: tc.id,
        type: 'function',
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      })),
    };
  }
  return {
    role: (m.role as string) === 'model' ? 'assistant' as const : m.role,
    content: m.content,
  };
});

// 2. Modified Image handling for LM Studio Vision
if (images && images.length > 0 && provider === 'lmstudio') {
  const lastMessage = formattedMessages[formattedMessages.length - 1];
  if (lastMessage && lastMessage.role === 'user') {
    // LM Studio often expects an 'images' array at the root of the message object
    // specifically for local VLM inference.
    lastMessage.images = images.map((img) => {
      let base64Data = img.url;
      if (base64Data.startsWith('data:')) {
        base64Data = base64Data.split(',')[1];
      }
      return base64Data; // Just the raw base64 string
    });
  }
}

const requestHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
if (apiKey) {
  requestHeaders['Authorization'] = `Bearer ${apiKey}`;
}
if (provider === 'openrouter') {
  requestHeaders['HTTP-Referer'] = window.location.origin;
  requestHeaders['X-Title'] = 'SlimeAI';
}

const body: any = {
  model: modelId,
  messages: formattedMessages,
  temperature,
  max_tokens: maxTokens,
  stream: true,
  ...(tools && tools.length > 0 ? { tools } : {}),
};

try {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: requestHeaders,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    callbacks?.onError(`API error (${res.status}): ${err}`);
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    callbacks?.onError('No response stream');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let finalUsage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    buffer += chunk;
    
    const lines = buffer.split('\n');
    for (let i = 0; i < lines.length - 1; i++) {
      let line = lines[i].trim();
      if (!line) continue;
      
      if (line.startsWith('data: ')) {
        line = line.slice(6);
      } else if (line.startsWith('data:')) {
        line = line.slice(5);
      }
      
      if (line === '[DONE]') continue;
      
      try {
        const parsed = JSON.parse(line);
        // Standard OpenAI delta format
        const delta = parsed.choices?.[0]?.delta;
        if (delta?.content) {
          callbacks?.onChunk(delta.content);
        }
        // Handle tool_calls in streaming response
        if (delta?.tool_calls) {
          callbacks?.onToolCalls?.(delta.tool_calls.map((tc: any) => ({
            index: tc.index ?? 0,
            id: tc.id,
            type: tc.type,
            function: {
              name: tc.function?.name,
              arguments: tc.function?.arguments,
            },
          })));
        }
        // Extract usage from final chunk
        if (parsed.usage) {
          finalUsage = parsed.usage;
        }
      } catch (e) {
        // Log error if needed for debugging
      }
    }
    buffer = lines[lines.length - 1];
  }
  
  callbacks?.onComplete(finalUsage ? {
    inputTokens: finalUsage.prompt_tokens || 0,
    outputTokens: finalUsage.completion_tokens || 0,
    totalTokens: finalUsage.total_tokens || 0,
  } : undefined);
    } catch (err) {
    callbacks?.onError(err instanceof Error ? err.message : 'Stream error');
}
}

export async function nonStreamChatCompletion(
  provider: ProviderType,
  baseUrl: string,
  modelId: string,
  messages: ChatMessage[],
  systemPrompt: string,
  temperature: number,
  maxTokens: number,
  apiKey?: string,
  images?: ImageAttachment[]
): Promise<string> {
  
  if (provider === 'ollama') {
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];
    
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        messages: formattedMessages,
        stream: false,
        options: { temperature, num_predict: maxTokens },
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.message?.content || '';
  }

  if (provider === 'anthropic') {
    const anthropicHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': apiKey || '',
    };
    if (apiKey) anthropicHeaders['Authorization'] = `Bearer ${apiKey}`;

    const res = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: anthropicHeaders,
      body: JSON.stringify({
        model: modelId,
        max_tokens: maxTokens,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        system: systemPrompt,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.content?.[0]?.text || '';
  }

  if (provider === 'gemini') {
    // Gemini uses inlineData for images
    const geminiParts: any[] = [];
    
    if (images && images.length > 0) {
      for (const img of images) {
        let base64Data = img.url;
        if (base64Data.startsWith('data:')) {
          base64Data = base64Data.split(',')[1];
        }
        geminiParts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: base64Data,
          },
        });
      }
    }
    
    const userContent = messages.length > 0 ? messages[messages.length - 1].content : '';
    if (userContent || geminiParts.length > 0) {
      geminiParts.unshift({ text: userContent });
    }
    
    const geminiMessages = [
      { role: 'system' as const, parts: [{ text: systemPrompt }] },
      ...messages.slice(0, -1).filter(m => m.role !== 'tool').map((m) => ({
        role: (m.role === 'assistant' ? 'model' : 'user') as 'model' | 'user',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: geminiParts },
    ];
    
    const res = await fetch(
      `${baseUrl}/models/${modelId}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: { temperature, maxOutputTokens: maxTokens },
        }),
      }
    );
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  const normalized = normalizeBaseUrl(baseUrl);
  const endpoint = provider === 'lmstudio' && !normalized.endsWith('/v1') 
    ? `${normalized}/v1/chat/completions` 
    : `${normalized}/chat/completions`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const formattedMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = window.location.origin;
    headers['X-Title'] = 'SlimeAI';
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: modelId,
      messages: formattedMessages,
      temperature,
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}
