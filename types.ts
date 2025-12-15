export enum MasteryLevel {
  LOCKED = 0,
  RECOGNITION = 1, // Definitions, Terminology
  UNDERSTANDING = 2, // Explain in own words
  APPLICATION = 3, // Scenarios
  REASONING = 4 // Trade-offs, Edge cases
}

export interface Concept {
  id: string;
  title: string;
  description: string;
  dependencies: string[]; // IDs of prerequisite concepts
  masteryLevel: MasteryLevel;
  mistakes: MistakeRecord[];
}

export interface MistakeRecord {
  id: string;
  timestamp: number;
  question: string;
  userAnswer: string;
  correction: string;
  misunderstandingType: string;
}

export interface LearningSession {
  id: string;
  title: string;
  concepts: Concept[];
  rawContent: string; // Transient storage for the active session text
  createdAt: number;
  isActive: boolean;
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  SHORT_ANSWER = 'SHORT_ANSWER',
  SCENARIO = 'SCENARIO',
  OPEN_REASONING = 'OPEN_REASONING'
}

export interface Question {
  id: string;
  conceptId: string;
  text: string;
  type: QuestionType;
  options?: string[]; // For MCQ
  correctAnswerContext?: string; // Hidden context for the AI to validate against
}

export interface AssessmentResult {
  isCorrect: boolean;
  explanation: string;
  conceptUpdate?: {
    masteryLevel: MasteryLevel;
  };
}
