/**
 * UseCase Quick Start
 * Phase 3: Templates & Presets
 * Quick-start buttons for common use cases
 */

import React from 'react';
import { Zap, Code, BookOpen, Mic, GitBranch } from 'lucide-react';
import type { Skill } from '../types';

interface UseCaseQuickStart {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  skillIds: string[];
  recommendedModel?: string;
  prompt: string; // Initial prompt to send
}

interface UseCaseQuickStartProps {
  onStart: (config: {
    skillId?: string;
    modelId?: string;
    initialPrompt?: string;
  }) => void;
  availableSkills: Skill[];
  availableModels: string[];
}

const USE_CASES: UseCaseQuickStart[] = [
  {
    id: 'code-review',
    name: 'Code Review',
    description: 'Review code for issues',
    icon: <Code size={16} />,
    skillIds: ['code-expert'],
    prompt: 'Please review the following code for bugs, security issues, and best practices:',
  },
  {
    id: 'write-story',
    name: 'Write Story',
    description: 'Creative writing',
    icon: <BookOpen size={16} />,
    skillIds: ['creative-writer'],
    prompt: 'Write a short story with compelling characters and plot.',
  },
  {
    id: 'analyze-data',
    name: 'Analyze Data',
    description: 'Research and analysis',
    icon: <GitBranch size={16} />,
    skillIds: ['research-analyst'],
    prompt: 'Analyze the following data and provide insights:',
  },
  {
    id: 'learn-topic',
    name: 'Learn Topic',
    description: 'Explain and teach',
    icon: <Zap size={16} />,
    skillIds: ['teacher'],
    prompt: 'Explain this topic in simple terms with examples:',
  },
  {
    id: 'debate',
    name: 'Start Debate',
    description: 'Argument analysis',
    icon: <Mic size={16} />,
    skillIds: ['debate-partner'],
    prompt: 'Let\'s debate this topic. Present your best arguments:',
  },
];

export const UseCaseQuickStartPanel: React.FC<UseCaseQuickStartProps> = ({
  onStart,
  availableSkills,
}) => {
  const handleUseCaseClick = (useCase: UseCaseQuickStart) => {
    // Find available skill from use case
    const availableSkill = useCase.skillIds.find(skillId =>
      availableSkills.some(s => s.id === skillId && s.enabled)
    );

    onStart({
      skillId: availableSkill,
      initialPrompt: useCase.prompt,
    });
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3">
      {USE_CASES.map(useCase => {
        const hasSkills = useCase.skillIds.some(skillId =>
          availableSkills.some(s => s.id === skillId && s.enabled)
        );

        return (
          <button
            key={useCase.id}
            onClick={() => handleUseCaseClick(useCase)}
            disabled={!hasSkills}
            className={`
              flex flex-col items-center gap-1 p-3 rounded-lg border transition-all
              ${hasSkills
                ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-700 hover:border-gray-600 cursor-pointer'
                : 'bg-gray-800/20 border-gray-800 opacity-50 cursor-not-allowed'
              }
            `}
          >
            <span className={`${hasSkills ? 'text-blue-400' : 'text-gray-500'}`}>
              {useCase.icon}
            </span>
            <span className={`text-xs font-medium ${hasSkills ? 'text-gray-200' : 'text-gray-500'}`}>
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