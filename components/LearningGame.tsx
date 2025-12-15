import React, { useState, useEffect } from 'react';
import { Concept, Question, AssessmentResult, MasteryLevel, QuestionType } from '../types';
import { generateQuestion, evaluateAnswer } from '../services/aiService';
import { Loader2, CheckCircle2, XCircle, ArrowRight, BrainCircuit, AlertCircle } from 'lucide-react';

interface LearningGameProps {
  concept: Concept;
  allConcepts: Concept[];
  onUpdateConcept: (updatedConcept: Concept) => void;
  onClose: () => void;
}

const LearningGame: React.FC<LearningGameProps> = ({ concept, allConcepts, onUpdateConcept, onClose }) => {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [userAnswer, setUserAnswer] = useState('');
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [questionHistory, setQuestionHistory] = useState<string[]>([]); // Track asked questions
  const [needsRetry, setNeedsRetry] = useState(false); // Track if user needs to retry same level

  // Initialize: Load question
  useEffect(() => {
    const loadQ = async () => {
      setLoading(true);
      const q = await generateQuestion(concept, allConcepts);
      setCurrentQuestion(q);
      setLoading(false);
    };
    loadQ();
  }, [concept.id]); // Reload if concept changes

  const handleSubmit = async () => {
    if (!currentQuestion || !userAnswer.trim()) return;
    setSubmitting(true);

    const result = await evaluateAnswer(currentQuestion, userAnswer, concept);
    setAssessment(result);
    setSubmitting(false);

    // Add question to history
    setQuestionHistory(prev => [...prev, currentQuestion.text]);

    if (result.isCorrect) {
      // Correct answer - can progress to next level
      setNeedsRetry(false);
      const currentLevel = concept.masteryLevel === MasteryLevel.LOCKED ? 1 : concept.masteryLevel;
      const nextLevel = Math.min(currentLevel + 1, MasteryLevel.REASONING);

      if (currentLevel < MasteryLevel.REASONING) {
        onUpdateConcept({
          ...concept,
          masteryLevel: nextLevel
        });
      } else {
        // Boss level completed - mastered!
        onUpdateConcept({
          ...concept,
          masteryLevel: MasteryLevel.REASONING
        });

        // Close the game and return to concept map after a short delay
        setTimeout(() => {
          onClose();
        }, 2000); // 2 second delay to show the success message
      }
    } else {
      // Wrong answer - record mistake and require retry at same level
      setNeedsRetry(true);
      onUpdateConcept({
        ...concept,
        mistakes: [
          ...concept.mistakes,
          {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            question: currentQuestion.text,
            userAnswer: userAnswer,
            correction: result.explanation,
            misunderstandingType: "Conceptual"
          }
        ]
      });
    }
  };

  const handleNext = async () => {
    setAssessment(null);
    setUserAnswer('');
    setCurrentQuestion(null);
    setLoading(true);

    // Generate next question, avoiding previously asked ones
    let newQuestion = await generateQuestion(concept, allConcepts);
    let attempts = 0;
    const maxAttempts = 5;

    // Try to get a unique question
    while (questionHistory.includes(newQuestion.text) && attempts < maxAttempts) {
      newQuestion = await generateQuestion(concept, allConcepts);
      attempts++;
    }

    setCurrentQuestion(newQuestion);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Forging challenge...</p>
      </div>
    );
  }

  if (!currentQuestion) return null;

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            Level {concept.masteryLevel || 1}: {
              concept.masteryLevel === 2 ? 'Understanding' :
                concept.masteryLevel === 3 ? 'Application' :
                  concept.masteryLevel === 4 ? 'Reasoning' : 'Recognition'
            }
          </div>
          <h2 className="text-xl font-bold text-slate-800">{concept.title}</h2>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm font-medium">
          Close
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">

        {/* Question */}
        <div className="mb-8">
          <h3 className="text-lg text-slate-800 font-medium leading-relaxed">
            {currentQuestion.text}
          </h3>
        </div>

        {/* Answer Input */}
        <div className="mb-8">
          {currentQuestion.type === QuestionType.MULTIPLE_CHOICE && currentQuestion.options ? (
            <div className="space-y-3">
              {currentQuestion.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => setUserAnswer(opt)}
                  disabled={!!assessment}
                  className={`w-full text-left p-4 rounded-xl border transition ${userAnswer === opt
                    ? 'border-slate-800 bg-slate-800 text-white shadow-md'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                    } ${assessment ? 'opacity-50 cursor-default' : ''}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              disabled={!!assessment}
              className="w-full h-32 p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none resize-none text-slate-700 text-lg disabled:bg-slate-50"
              placeholder="Type your explanation..."
            />
          )}
        </div>

        {/* Assessment Feedback */}
        {assessment && (
          <div className={`p-6 rounded-xl border mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ${assessment.isCorrect ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'
            }`}>
            <div className="flex items-start gap-4">
              {assessment.isCorrect ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h4 className={`font-bold mb-2 ${assessment.isCorrect ? 'text-emerald-800' : 'text-amber-800'}`}>
                  {assessment.isCorrect ? 'Concept Mastered!' : 'Learning Moment'}
                </h4>
                <p className={`leading-relaxed mb-3 ${assessment.isCorrect ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {assessment.explanation}
                </p>
                {!assessment.isCorrect && needsRetry && (
                  <div className="mt-3 p-3 bg-white rounded-lg border border-amber-200">
                    <p className="text-sm text-amber-800 font-medium">
                      Please answer another question at this level to demonstrate understanding.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <div className="p-6 border-t border-slate-100 bg-white flex justify-end">
        {!assessment ? (
          <button
            onClick={handleSubmit}
            disabled={!userAnswer || submitting}
            className="px-8 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition disabled:opacity-50 flex items-center"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Submit Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="px-8 py-3 bg-slate-100 text-slate-800 rounded-lg font-semibold hover:bg-slate-200 transition flex items-center group"
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </button>
        )}
      </div>
    </div>
  );
};

export default LearningGame;