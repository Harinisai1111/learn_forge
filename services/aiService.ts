/**
 * AI Service Abstraction Layer
 * 
 * This module provides a unified interface for AI operations,
 * automatically selecting between OpenAI and Gemini based on
 * available API keys and configuration.
 */

import { Concept, Question, AssessmentResult } from "../types";

// Determine which provider to use
const providerEnv = import.meta.env.VITE_AI_PROVIDER;
const openAIKey = import.meta.env.VITE_OPENAI_API_KEY;
const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;

const hasOpenAI = !!openAIKey && openAIKey.length > 5;
const hasGemini = !!geminiKey && geminiKey.length > 5;

// Debug logging - mask keys for security
console.log('🤖 AI Config Check:', {
    providerEnv,
    hasOpenAI: hasOpenAI ? `Yes (${openAIKey.substring(0, 4)}...)` : 'No',
    hasGemini: hasGemini ? `Yes (${geminiKey.substring(0, 4)}...)` : 'No',
    mode: import.meta.env.MODE,
    prod: import.meta.env.PROD
});

// Select provider
let selectedProvider: 'openai' | 'gemini';

if (providerEnv === 'openai' && hasOpenAI) {
    selectedProvider = 'openai';
} else if (providerEnv === 'gemini' && hasGemini) {
    selectedProvider = 'gemini';
} else if (hasOpenAI) {
    // Prefer OpenAI if available and no specific provider requested (or 'auto')
    selectedProvider = 'openai';
} else {
    // Default to gemini (fallback)
    selectedProvider = 'gemini';
}

console.log(`🤖 AI Provider: ${selectedProvider.toUpperCase()}`);

// Dynamic imports based on selected provider
const getService = async () => {
    if (selectedProvider === 'openai') {
        return await import('./openaiService');
    } else {
        return await import('./geminiService');
    }
};

/**
 * Extract concepts from content using the selected AI provider
 */
export const extractConceptsFromContent = async (content: string): Promise<Concept[]> => {
    const service = await getService();
    return service.extractConceptsFromContent(content);
};

/**
 * Generate a question using the selected AI provider
 */
export const generateQuestion = async (concept: Concept, allConcepts: Concept[]): Promise<Question> => {
    const service = await getService();
    return service.generateQuestion(concept, allConcepts);
};

/**
 * Evaluate an answer using the selected AI provider
 */
export const evaluateAnswer = async (
    question: Question,
    userAnswer: string,
    concept: Concept
): Promise<AssessmentResult> => {
    const service = await getService();
    return service.evaluateAnswer(question, userAnswer, concept);
};

/**
 * Generate a unified summary using the selected AI provider
 */
export const generateUnifiedSummary = async (concepts: Concept[]): Promise<string> => {
    const service = await getService();
    return service.generateUnifiedSummary(concepts);
};
