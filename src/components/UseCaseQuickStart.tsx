/**
 * UseCase Quick Start
 * Phase 3: Templates & Presets
 * Quick-start buttons for common use cases
 */

import React from 'react';
import { Zap, Code, BookOpen, Mic, GitBranch } from 'lucide-react';
import type { Personality } from '../types';

interface UseCaseQuickStart {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  personalityIds: string[];
  recommendedModel?: string;
  prompt: string; // Initial prompt to send
}

interface UseCaseQuickStartProps {
  onStart: (config: {
    personalityId?: string;
    modelId?: string;
    initialPrompt?: string;
  }) => void;
  availablePersonalities: Personality[];
  availableModels: string[];
}

const USE_CASES: UseCaseQuickStart[] = [
  {
    id: 'code-review',
    name: 'Code Review',
    description: 'Review code for issues',
    icon: <Code size={16} />,
    personalityIds: ['code-expert'],
    prompt: 'Please review the following code for bugs, security issues, and best practices:',
  },
  {
    id: 'write-story',
    name: 'Write Story',
    description: 'Creative writing',
    icon: <BookOpen size={16} />,
    personalityIds: ['creative-writer'],
    prompt: 'Write a short story with compelling characters and plot.',
  },
  {
    id: 'analyze-data',
    name: 'Analyze Data',
    description: 'Research and analysis',
    icon: <GitBranch size={16} />,
    personalityIds: ['research-analyst'],
    prompt: 'Analyze the following data and provide insights:',
  },
  {
    id: 'learn-topic',
    name: 'Learn Topic',
    description: 'Explain and teach',
    icon: <Zap size={16} />,
    personalityIds: ['teacher'],
    prompt: 'Explain this topic in simple terms with examples:',
  },
  {
    id: 'debate',
    name: 'Start Debate',
    description: 'Argument analysis',
    icon: <Mic size={16} />,
    personalityIds: ['debate-partner'],
    prompt: 'Let\'s debate this topic. Present your best arguments:',
  },
];

export const UseCaseQuickStartPanel: React.FC<UseCaseQuickStartProps> = ({
  onStart,
  availablePersonalities,
}) => {
  const handleUseCaseClick = (useCase: UseCaseQuickStart) => {
    // Find available personality from use case
    const availablePersonality = useCase.personalityIds.find(personalityId =>
      availablePersonalities.some(p => p.id === personalityId && p.enabled)
    );

    onStart({
      personalityId: availablePersonality,
      initialPrompt: useCase.prompt,
    });
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3">
      {USE_CASES.map(useCase => {
        const hasPersonalities = useCase.personalityIds.some(personalityId =>
          availablePersonalities.some(p => p.id === personalityId && p.enabled)
        );

        return (
          <button
            key={useCase.id}
            onClick={() => handleUseCaseClick(useCase)}
            disabled={!hasPersonalities}
            className={`
              flex flex-col items-center gap-1 p-3 rounded-lg border transition-all
              ${hasPersonalities
                ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-700 hover:border-gray-600 cursor-pointer'
                : 'bg-gray-800/20 border-gray-800 opacity-50 cursor-not-allowed'
              }
            `}
          >
            <span className={`${hasPersonalities ? 'text-blue-400' : 'text-gray-500'}`}>
              {useCase.icon}
            </span>
            <span className={`text-xs font-medium ${hasPersonalities ? 'text-gray-200' : 'text-gray-500'}`}>
              {useCase.name}
            </span>
            <span className="text-xs text-gray-500 text-center">
              {useCase.description}
            </span>
          </button>
        );
      })}
    </div>
  );
};

/**
 * Get default model for a use case
 */
export function getModelForUseCase(useCaseId: string): string | undefined {
  const useCase = USE_CASES.find(u => u.id === useCaseId);
  return useCase?.recommendedModel;
}

export default UseCaseQuickStartPanel;