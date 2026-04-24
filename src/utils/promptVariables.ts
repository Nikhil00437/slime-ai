/**
 * Dynamic system prompt variable processor
 * Supports: $DATE, $TIME, $USER, $MODEL, $CONVERSATION_COUNT, etc.
 */

interface VariableContext {
  userName?: string;
  currentModel?: string;
  conversationCount: number;
  currentDate: Date;
  customVariables?: Record<string, string>;
}

const VARIABLE_DEFINITIONS: Record<string, { description: string; format?: string }> = {
  $DATE: {
    description: 'Current date',
    format: 'full', // 'full' | 'short' | 'iso'
  },
  $TIME: {
    description: 'Current time',
    format: 'time', // 'time' | '24h'
  },
  $DATETIME: {
    description: 'Current date and time',
  },
  $USER: {
    description: 'User name/placeholder',
  },
  $MODEL: {
    description: 'Current AI model name',
  },
  $CONVERSATION_COUNT: {
    description: 'Total number of conversations',
  },
  $MESSAGE_COUNT: {
    description: 'Messages in current conversation',
  },
  $DAY_OF_WEEK: {
    description: 'Day of the week',
  },
  $YEAR: {
    description: 'Current year',
  },
  $MONTH: {
    description: 'Current month',
  },
  $HOUR: {
    description: 'Current hour (24h)',
  },
  $GREETING: {
    description: 'Time-based greeting (Good morning/afternoon/evening)',
  },
  $LOCATION: {
    description: 'User location placeholder',
  },
};

/**
 * Format date based on format type
 */
function formatDate(date: Date, format?: string): string {
  switch (format) {
    case 'short':
      return date.toLocaleDateString();
    case 'iso':
      return date.toISOString().split('T')[0];
    case 'full':
    default:
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
  }
}

/**
 * Format time based on format type
 */
function formatTime(date: Date, format?: string): string {
  switch (format) {
    case '24h':
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    case 'time':
    default:
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
}

/**
 * Get time-based greeting
 */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

/**
 * Get day of week
 */
function getDayOfWeek(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Process a template string with variables
 */
export function processPromptTemplate(
  template: string,
  context: VariableContext
): string {
  let processed = template;

  // Date and time variables
  processed = processed.replace(/\$DATE(?::(\w+))?/gi, (_, format) => 
    formatDate(context.currentDate, format)
  );
  
  processed = processed.replace(/\$TIME(?::(\w+))?/gi, (_, format) => 
    formatTime(context.currentDate, format)
  );
  
  processed = processed.replace(/\$DATETIME/gi, () => 
    `${formatDate(context.currentDate)}, ${formatTime(context.currentDate)}`
  );
  
  processed = processed.replace(/\$YEAR/gi, () => 
    context.currentDate.getFullYear().toString()
  );
  
  processed = processed.replace(/\$MONTH/gi, () => 
    context.currentDate.toLocaleDateString('en-US', { month: 'long' })
  );
  
  processed = processed.replace(/\$DAY_OF_WEEK/gi, () => getDayOfWeek());
  
  processed = processed.replace(/\$HOUR/gi, () => 
    context.currentDate.getHours().toString().padStart(2, '0')
  );

  // User variables
  processed = processed.replace(/\$USER/gi, () => 
    context.userName || '[User]'
  );

  processed = processed.replace(/\$LOCATION/gi, () => 
    context.customVariables?.['LOCATION'] || '[Your Location]'
  );

  // Model variables
  processed = processed.replace(/\$MODEL/gi, () => 
    context.currentModel || '[Model]'
  );

  // Conversation variables
  processed = processed.replace(/\$CONVERSATION_COUNT/gi, () => 
    context.conversationCount.toString()
  );

  // Greeting
  processed = processed.replace(/\$GREETING/gi, () => getGreeting());

  // Custom variables
  if (context.customVariables) {
    for (const [key, value] of Object.entries(context.customVariables)) {
      const pattern = new RegExp(`\\$${key}`, 'gi');
      processed = processed.replace(pattern, value);
    }
  }

  return processed;
}

/**
 * Extract variables from a template
 */
export function extractVariables(template: string): string[] {
  const matches = template.match(/\$\w+/gi) || [];
  return [...new Set(matches.map(m => m.toUpperCase()))];
}

/**
 * Validate template syntax
 */
export function validateTemplate(template: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const variables = extractVariables(template);

  for (const variable of variables) {
    const defined = Object.keys(VARIABLE_DEFINITIONS).map(v => v.toUpperCase());
    const normalizedVar = variable.toUpperCase();
    
    if (!defined.includes(normalizedVar) && !normalizedVar.startsWith('$CUSTOM_')) {
      // Allow custom variables with CUSTOM_ prefix
      if (!normalizedVar.startsWith('$')) {
        errors.push(`Unknown variable: ${variable}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get all available variable definitions
 */
export function getAvailableVariables(): Record<string, { description: string; format?: string }> {
  return { ...VARIABLE_DEFINITIONS };
}

/**
 * React hook for variable processing
 */
export function usePromptVariables() {
  return {
    processTemplate: processPromptTemplate,
    extractVariables,
    validateTemplate,
    getAvailableVariables,
  };
}