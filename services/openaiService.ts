import OpenAI from 'openai';
import { Concept, MasteryLevel, Question, QuestionType, AssessmentResult } from "../types";

const apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';

if (!apiKey) {
    console.error('VITE_OPENAI_API_KEY is not set in environment variables');
}

const openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true // Required for browser usage
});

/**
 * Extracts concepts from raw text content using OpenAI.
 */
export const extractConceptsFromContent = async (content: string): Promise<Concept[]> => {
    if (!content.trim()) return [];

    const systemPrompt = `You are an expert curriculum designer. 
Analyze the provided learning material and extract a structured Concept Graph.
Focus on key concepts, not trivial details. 
Identify dependencies (which concepts must be understood before others).
Return a JSON array of concepts with this exact structure:
[{
  "id": "unique-slug-identifier",
  "title": "Concept Title",
  "description": "A concise definition",
  "dependencies": ["array-of-prerequisite-concept-ids"]
}]`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: content }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7
        });

        const text = response.choices[0]?.message?.content;
        if (text) {
            const parsed = JSON.parse(text);
            // Handle both array and object with concepts array
            const concepts = Array.isArray(parsed) ? parsed : (parsed.concepts || []);

            return concepts.map((c: any) => ({
                ...c,
                masteryLevel: MasteryLevel.LOCKED,
                mistakes: []
            }));
        }
        return [];
    } catch (error) {
        console.error("OpenAI Extraction Error:", error);
        throw new Error("Failed to extract concepts.");
    }
};

/**
 * Generates a question based on the concept and current mastery level.
 */
export const generateQuestion = async (concept: Concept, allConcepts: Concept[]): Promise<Question> => {
    const currentLevel = concept.masteryLevel === MasteryLevel.LOCKED ? 1 : concept.masteryLevel;

    const relatedConcepts = allConcepts
        .filter(c => concept.dependencies.includes(c.id) || c.dependencies.includes(concept.id))
        .map(c => c.title)
        .join(", ");

    const systemPrompt = `You are an expert educator creating assessment questions.

Level 1 (Recognition): Multiple choice. Focus on definition or basic identification.
Level 2 (Understanding): Short answer. Ask to explain in own words or fill in the gap.
Level 3 (Application): Scenario based. Apply the concept to a new situation.
Level 4 (Reasoning): Complex open reasoning. Compare/contrast or discuss trade-offs.

Return JSON with this exact structure:
{
  "text": "The question text",
  "type": "MULTIPLE_CHOICE" | "SHORT_ANSWER" | "SCENARIO" | "OPEN_REASONING",
  "options": ["option1", "option2", "option3", "option4"] (only for MULTIPLE_CHOICE, null otherwise),
  "correctAnswerContext": "The correct answer or key points to check against"
}`;

    const userPrompt = `Generate a Level ${currentLevel} assessment question for the concept: "${concept.title}".
Definition: ${concept.description}.
Related concepts: ${relatedConcepts}.`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.8
        });

        const text = response.choices[0]?.message?.content;
        if (text) {
            const data = JSON.parse(text);
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
 * Evaluates the user's answer using OpenAI.
 */
export const evaluateAnswer = async (
    question: Question,
    userAnswer: string,
    concept: Concept
): Promise<AssessmentResult> => {

    const systemPrompt = `You are a supportive, intelligent tutor. 
Evaluate the student's answer based on the provided context.
NEVER strictly say "Wrong". Instead, identify misunderstandings.
If the answer is incorrect, explain WHY and provide the correct reasoning.
If correct, reinforce the key insight.

Current Mastery Level Target: ${concept.masteryLevel || 1}

Return JSON with this exact structure:
{
  "isCorrect": true/false,
  "explanation": "Constructive feedback"
}`;

    const userPrompt = `Question: ${question.text}
Context/Correct Answer: ${question.correctAnswerContext}
Student Answer: ${userAnswer}

Determine if the student has demonstrated sufficient understanding to pass this specific check.`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3
        });

        const text = response.choices[0]?.message?.content;
        if (text) {
            return JSON.parse(text);
        }
        throw new Error("Evaluation failed");
    } catch (error) {
        console.error("Evaluation Error:", error);
        return { isCorrect: false, explanation: "An error occurred during evaluation. Please try again." };
    }
};

/**
 * Generates a unified summary of the session using OpenAI.
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

    const systemPrompt = `You are an expert educational content writer creating professional study notes.

CRITICAL RULES:
- NO EMOJIS whatsoever
- Use clear, professional language
- Create well-structured, hierarchical content
- Use proper markdown formatting
- Include specific examples and explanations
- Make content scannable with headers and lists`;

    const userPrompt = `Generate a comprehensive, professional study guide in Markdown format based on these learned concepts.

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

Remember: NO EMOJIS. Professional formatting only. Use markdown headers (##, ###), bullet points, and bold text for emphasis.`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.7
        });

        let summary = response.choices[0]?.message?.content || "# Summary\n\nCould not generate summary.";

        // Remove any emojis that might have slipped through
        summary = summary.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');

        return summary;
    } catch (e) {
        console.error('Summary generation error:', e);
        return "# Error\n\nFailed to generate summary.";
    }
};
