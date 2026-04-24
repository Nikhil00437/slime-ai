import { DEFAULT_SKILLS, Skill } from '../types';

interface AutocompleteSuggestion {
  type: 'skill' | 'keyword' | 'variable' | 'command';
  text: string;
  label: string;
  icon?: string;
}

const VARIABLE_PATTERNS = [
  { pattern: /\$date/g, label: 'Current date', insertText: '$DATE' },
  { pattern: /\$time/g, label: 'Current time', insertText: '$TIME' },
  { pattern: /\$user/g, label: 'User placeholder', insertText: '$USER' },
  { pattern: /\$model/g, label: 'Current model', insertText: '$MODEL' },
  { pattern: /\$context/g, label: 'Conversation context', insertText: '$CONTEXT' },
];

const COMMAND_PATTERNS = [
  { pattern: /^@/, label: 'Skill activation', needsSpace: true },
  { pattern: /^\//, label: 'Command', needsSpace: false },
  { pattern: /^\$/, label: 'Variable', needsSpace: false },
];

/**
 * Get autocomplete suggestions based on current input
 */
export function getAutocompleteSuggestions(
  input: string,
  cursorPosition: number
): AutocompleteSuggestion[] {
  const suggestions: AutocompleteSuggestion[] = [];
  const beforeCursor = input.slice(0, cursorPosition);
  const afterCursor = input.slice(cursorPosition);

  // Get last word/token before cursor
  const lastWord = beforeCursor.split(/\s+/).pop() || '';
  const lastWordLower = lastWord.toLowerCase();

  // Skill suggestions (type @ to activate)
  if (beforeCursor.endsWith('@') || lastWord.startsWith('@')) {
    const skillQuery = lastWord.slice(1).toLowerCase();
    const matchingSkills = DEFAULT_SKILLS.filter(
      s => s.name.toLowerCase().includes(skillQuery) ||
           s.id.toLowerCase().includes(skillQuery) ||
           s.keywords?.some(k => k.toLowerCase().includes(skillQuery))
    );

    for (const skill of matchingSkills) {
      suggestions.push({
        type: 'skill',
        text: `@${skill.id}`,
        label: skill.name,
      });
    }
  }

  // Command suggestions (type / to activate)
  if (beforeCursor.endsWith('/')) {
    const commands = [
      { id: 'new', label: 'New conversation' },
      { id: 'clear', label: 'Clear chat' },
      { id: 'export', label: 'Export conversation' },
      { id: 'settings', label: 'Open settings' },
      { id: 'model', label: 'Switch model' },
    ];

    for (const cmd of commands) {
      suggestions.push({
        type: 'command',
        text: `/${cmd.id}`,
        label: cmd.label,
      });
    }
  }

  // Variable suggestions (type $ to activate)
  if (beforeCursor.endsWith('$')) {
    for (const variable of VARIABLE_PATTERNS) {
      suggestions.push({
        type: 'variable',
        text: variable.insertText,
        label: variable.label,
      });
    }
  }

  // Keyword suggestions based on context
  if (lastWord.length >= 2 && !beforeCursor.endsWith('@') && !beforeCursor.endsWith('/') && !beforeCursor.endsWith('$')) {
    // Suggest skill keywords
    for (const skill of DEFAULT_SKILLS) {
      const matchingKeywords = skill.keywords?.filter(
        k => k.toLowerCase().startsWith(lastWordLower) && k.toLowerCase() !== lastWordLower
      );

      if (matchingKeywords) {
        for (const keyword of matchingKeywords) {
          suggestions.push({
            type: 'keyword',
            text: keyword,
            label: `Activate ${skill.name}`,
          });
        }
      }
    }

    // Suggest common patterns
    const commonPatterns = [
      { text: 'explain', label: 'Explain something' },
      { text: 'write', label: 'Write code/text' },
      { text: 'debug', label: 'Debug code' },
      { text: 'refactor', label: 'Refactor code' },
      { text: 'test', label: 'Write tests' },
    ];

    for (const pattern of commonPatterns) {
      if (pattern.text.startsWith(lastWordLower) && pattern.text !== lastWordLower) {
        suggestions.push({
          type: 'keyword',
          text: pattern.text,
          label: pattern.label,
        });
      }
    }
  }

  // Sort by relevance (skill > command > variable > keyword)
  const typeOrder = { skill: 0, command: 1, variable: 2, keyword: 3 };
  suggestions.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);

  return suggestions.slice(0, 8);
}

/**
 * Apply autocomplete suggestion to input
 */
export function applySuggestion(
  input: string,
  cursorPosition: number,
  suggestion: AutocompleteSuggestion
): { newInput: string; newCursorPosition: number } {
  const beforeCursor = input.slice(0, cursorPosition);
  const afterCursor = input.slice(cursorPosition);

  // Find where to insert (after @, /, or $ for those types)
  let insertAt = cursorPosition;

  if (suggestion.type === 'skill') {
    // Find the @ symbol
    const atIndex = beforeCursor.lastIndexOf('@');
    if (atIndex !== -1) {
      insertAt = atIndex;
    }
  } else if (suggestion.type === 'command') {
    const slashIndex = beforeCursor.lastIndexOf('/');
    if (slashIndex !== -1) {
      insertAt = slashIndex;
    }
  } else if (suggestion.type === 'variable') {
    const dollarIndex = beforeCursor.lastIndexOf('$');
    if (dollarIndex !== -1) {
      insertAt = dollarIndex;
    }
  }

  const newInput = input.slice(0, insertAt) + suggestion.text + afterCursor;
  const newCursorPosition = insertAt + suggestion.text.length;

  return { newInput, newCursorPosition };
}

/**
 * Check if input ends with a trigger character
 */
export function isAutocompleteTrigger(char: string): boolean {
  return char === '@' || char === '/' || char === '$';
}

/**
 * React hook for input autocomplete
 */
export function useInputAutocomplete() {
  const getSuggestions = (input: string, cursorPosition: number) => {
    if (cursorPosition === 0) return [];
    return getAutocompleteSuggestions(input, cursorPosition);
  };

  return {
    getSuggestions,
    applySuggestion,
    isAutocompleteTrigger,
  };
}