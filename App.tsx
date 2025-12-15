import React, { useState } from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from '@clerk/clerk-react';
import SessionSetup from './components/SessionSetup';
import ConceptMap from './components/ConceptMap';
import LearningGame from './components/LearningGame';
import SummaryView from './components/SummaryView';
import MyNotes from './components/MyNotes';
import { Concept } from './types';
import { Brain, LogOut, FileText, BookOpen } from 'lucide-react';

enum ViewState {
  SETUP,
  LEARNING,
  SUMMARY,
  MY_NOTES
}

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.SETUP);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const { user } = useUser();

  const startSession = (extractedConcepts: Concept[]) => {
    setConcepts(extractedConcepts);
    setView(ViewState.LEARNING);
  };

  const updateConcept = (updated: Concept) => {
    const newConcepts = concepts.map(c => c.id === updated.id ? updated : c);
    setConcepts(newConcepts);
    // If currently selected, update it too
    if (selectedConcept && selectedConcept.id === updated.id) {
      setSelectedConcept(updated);
    }
  };

  return (
    <>
      <SignedOut>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-6">
          <div className="text-center space-y-8 max-w-md">
            <div className="flex justify-center mb-6">
              <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-700 rounded-3xl shadow-2xl">
                <Brain className="w-16 h-16 text-white" />
              </div>
            </div>
            <h1 className="text-5xl font-bold text-slate-900 tracking-tight">LearnForge</h1>
            <p className="text-lg text-slate-600 leading-relaxed">
              Transform your learning materials into interactive mastery paths. Upload PDFs, PowerPoints, or YouTube videos and master concepts through gamified learning.
            </p>
            <SignInButton mode="modal">
              <button className="px-10 py-4 bg-slate-900 text-white rounded-xl font-semibold text-lg hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                Start Learning
              </button>
            </SignInButton>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="min-h-screen bg-slate-50 flex flex-col">
          {/* Navbar */}
          <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView(ViewState.SETUP)}>
                <div className="p-2 bg-slate-900 rounded-lg">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-slate-800 text-lg tracking-tight">LearnForge</span>
              </div>
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setView(ViewState.MY_NOTES)}
                  className="text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  My Notes
                </button>
                {view === ViewState.LEARNING && (
                  <button
                    onClick={() => setView(ViewState.SUMMARY)}
                    className="text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Finish & Summary
                  </button>
                )}
                <div className="h-6 w-px bg-slate-200"></div>
                <UserButton afterSignOutUrl="/" />
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1 max-w-7xl w-full mx-auto p-6">
            {view === ViewState.SETUP && (
              <SessionSetup onSessionStart={startSession} />
            )}

            {view === ViewState.LEARNING && (
              <div className="flex gap-6 h-[calc(100vh-140px)]">
                {/* Left: Map */}
                <div className={`${selectedConcept ? 'w-1/3' : 'w-full'} transition-all duration-500 ease-in-out`}>
                  <div className="h-full flex flex-col">
                    <div className="mb-4 flex justify-between items-center">
                      <h2 className="text-lg font-bold text-slate-800">Concept Graph</h2>
                      <span className="text-xs text-slate-400 bg-white border border-slate-200 px-2 py-1 rounded-full">
                        {concepts.filter(c => c.masteryLevel === 4).length} / {concepts.length} Mastered
                      </span>
                    </div>
                    <ConceptMap
                      concepts={concepts}
                      onSelectConcept={setSelectedConcept}
                      selectedConceptId={selectedConcept?.id}
                    />
                    <div className="mt-4 p-4 bg-white rounded-xl border border-slate-200 text-sm text-slate-500 shadow-sm">
                      <p>Tip: Click a node to begin the mastery game. Concepts must be unlocked sequentially.</p>
                    </div>
                  </div>
                </div>

                {/* Right: Game Interface */}
                {selectedConcept && (
                  <div className="w-2/3 animate-in fade-in slide-in-from-right-8 duration-500">
                    <LearningGame
                      concept={selectedConcept}
                      allConcepts={concepts}
                      onUpdateConcept={updateConcept}
                      onClose={() => setSelectedConcept(null)}
                    />
                  </div>
                )}
              </div>
            )}

            {view === ViewState.SUMMARY && (
              <SummaryView
                concepts={concepts}
                onBack={() => setView(ViewState.LEARNING)}
              />
            )}

            {view === ViewState.MY_NOTES && (
              <MyNotes onBack={() => setView(ViewState.SETUP)} />
            )}
          </main>
        </div>
      </SignedIn>
    </>
  );
};

export default App;