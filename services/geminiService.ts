import { GoogleGenAI, Type } from "@google/genai";
import { Concept, MasteryLevel, Question, QuestionType, AssessmentResult } from "../types";

// Ensure API key is available from Vite environment variables
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

if (!apiKey) {
  console.error('VITE_GEMINI_API_KEY is not set in environment variables');
}

const ai = new GoogleGenAI({ apiKey });

/**
 * Extracts concepts from raw text content.
 * Uses gemini-3-pro-preview for complex reasoning and extraction.
 */
export const extractConceptsFromContent = async (content: string): Promise<Concept[]> => {
  if (!content.trim()) return [];

  const systemInstruction = `
    You are an expert curriculum designer. 
    Analyze the provided learning material and extract a structured Concept Graph.
    Focus on key concepts, not trivial details. 
    Identify dependencies (which concepts must be understood before others).
    Return a JSON list of concepts.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-pro", // Using 2.5-flash which is available in v1beta
      contents: content,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "Unique slug identifier (e.g., 'concept-name')" },
              title: { type: Type.STRING },
              description: { type: Type.STRING, description: "A concise definition." },
              dependencies: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array of IDs of prerequisite concepts found in this list."
              }
            },
            required: ["id", "title", "description", "dependencies"]
          }
        }
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      // Initialize with default state
      return parsed.map((c: any) => ({
        ...c,
        masteryLevel: MasteryLevel.LOCKED,
        mistakes: []
      }));
    }
    return [];
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw new Error("Failed to extract concepts.");
  }
};

/**
 * Generates a question based on the concept and current mastery level.
 */
export const generateQuestion = async (concept: Concept, allConcepts: Concept[]): Promise<Question> => {
  const currentLevel = concept.masteryLevel === MasteryLevel.LOCKED ? 1 : concept.masteryLevel;

  // Contextualize with related concepts if reasoning level
  const relatedConcepts = allConcepts
    .filter(c => concept.dependencies.includes(c.id) || c.dependencies.includes(concept.id))
    .map(c => c.title)
    .join(", ");

  const prompt = `
    Generate a Level ${currentLevel} assessment question for the concept: "${concept.title}".
    Definition: ${concept.description}.
    Context: ${relatedConcepts}.

    Level 1 (Recognition): Multiple choice. Focus on definition or basic identification.
    Level 2 (Understanding): Short answer. Ask to explain in own words or fill in the gap.
    Level 3 (Application): Scenario based. Apply the concept to a new situation.
    Level 4 (Reasoning): Complex open reasoning. Compare/contrast or discuss trade-offs.

    Return JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-pro", // Flash is sufficient for single-shot question generation
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: "The question text." },
            type: {
              type: Type.STRING,
              enum: [
                QuestionType.MULTIPLE_CHOICE,
                QuestionType.SHORT_ANSWER,
                QuestionType.SCENARIO,
                QuestionType.OPEN_REASONING
              ]
            },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Options for multiple choice, null otherwise."
            },
            correctAnswerContext: { type: Type.STRING, description: "The correct answer or key points to check against." }
          },
          required: ["text", "type", "correctAnswerContext"]
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return {
        id: crypto.randomUUID(),
        conceptId: concept.id,
        ...data
      };
    }
    throw new Error("Empty response");
  } catch (error) {
    console.error("Question Generation Error:", error);
    // Fallback question
    return {
      id: "error",
      conceptId: concept.id,
      text: "Explain the concept of " + concept.title,
      type: QuestionType.SHORT_ANSWER,
      correctAnswerContext: concept.description
    };
  }
};

/**
 * Evaluates the user's answer.
 * IMPORTANT: This implements the "Teaching-First Feedback System".
 */
export const evaluateAnswer = async (
  question: Question,
  userAnswer: string,
  concept: Concept
): Promise<AssessmentResult> => {

  const systemInstruction = `
    You are a supportive, intelligent tutor. 
    Evaluate the student's answer based on the provided context.
    NEVER strictly say "Wrong". Instead, identify misunderstandings.
    If the answer is incorrect, explain WHY and provide the correct reasoning.
    If correct, reinforce the key insight.
    
    Current Mastery Level Target: ${concept.masteryLevel || 1}
  `;

  const prompt = `
    Question: ${question.text}
    Context/Correct Answer: ${question.correctAnswerContext}
    Student Answer: ${userAnswer}

    Determine if the student has demonstrated sufficient understanding to pass this specific check.
    Return JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-pro",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCorrect: { type: Type.BOOLEAN },
            explanation: { type: Type.STRING, description: "Constructive feedback." }
          },
          required: ["isCorrect", "explanation"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    throw new Error("Evaluation failed");
  } catch (error) {
    console.error("Evaluation Error:", error);
    return { isCorrect: false, explanation: "An error occurred during evaluation. Please try again." };
  }
};

/**
 * Generates a unified summary of the session.
 * Creates professional, well-formatted notes without emojis.
 */
export const generateUnifiedSummary = async (concepts: Concept[]): Promise<string> => {
  if (concepts.length === 0) return "No concepts to summarize.";

  const conceptData = concepts.map(c => ({
    title: c.title,
    description: c.description,
    masteryLevel: c.masteryLevel,
    dependencies: c.dependencies,
    mistakes: c.mistakes.map(m => ({
      question: m.question,
      userAnswer: m.userAnswer,
      correction: m.correction,
      type: m.misunderstandingType
    }))
  }));

  const systemInstruction = `
    You are an expert educational content writer creating professional study notes.
    
    CRITICAL RULES:
    - NO EMOJIS whatsoever
    - Use clear, professional language
    - Create well-structured, hierarchical content
    - Use proper markdown formatting
    - Include specific examples and explanations
    - Make content scannable with headers and lists
  `;

  const prompt = `
    Generate a comprehensive, professional study guide in Markdown format based on these learned concepts.
    
    Structure the document as follows:
    
    1. OVERVIEW
       - Brief introduction to the topic
       - Key learning objectives
       - Total concepts covered
    
    2. CONCEPT BREAKDOWN
       - For each concept, provide:
         * Clear definition
         * Detailed explanation
         * Key points (as bullet lists)
         * Relationships to other concepts
         * Mastery level achieved
    
    3. COMMON MISTAKES AND CORRECTIONS
       - Document specific mistakes made during learning
       - Provide clear corrections and explanations
       - Highlight common pitfalls to avoid
    
    4. SUMMARY AND NEXT STEPS
       - Recap key takeaways
       - Suggest areas for further study
       - Provide practice recommendations
    
    Concept Data:
    ${JSON.stringify(conceptData, null, 2)}
    
    Remember: NO EMOJIS. Professional formatting only. Use markdown headers (##, ###), bullet points, and bold text for emphasis.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-pro",
      contents: prompt,
      config: {
        systemInstruction,
      }
    });

    let summary = response.text || "# Summary\n\nCould not generate summary.";

    // Remove any emojis that might have slipped through
    summary = summary.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');

    return summary;
  } catch (e) {
    console.error('Summary generation error:', e);
    return "# Error\n\nFailed to generate summary.";
  }
};
