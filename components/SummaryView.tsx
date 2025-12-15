import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Concept, MasteryLevel } from '../types';
import { generateUnifiedSummary } from '../services/aiService';
import { saveNote } from '../services/supabaseService';
import { FileDown, Loader2, Save, CheckCircle } from 'lucide-react';

interface SummaryViewProps {
  concepts: Concept[];
  onBack: () => void;
}

const SummaryView: React.FC<SummaryViewProps> = ({ concepts, onBack }) => {
  const { user } = useUser();
  const [summary, setSummary] = useState<string>('');
  const [generating, setGenerating] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');

  useEffect(() => {
    // Generate default title
    const date = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const topConcepts = concepts.slice(0, 2).map(c => c.title).join(' & ');
    setNoteTitle(`${topConcepts} - ${date}`);

    // Generate summary
    generateUnifiedSummary(concepts).then(text => {
      setSummary(text);
      setGenerating(false);
    });
  }, [concepts]);

  const handleSaveToDatabase = async () => {
    if (!user || !summary || saved) return;

    setSaving(true);

    const masteredCount = concepts.filter(c => c.masteryLevel === MasteryLevel.REASONING).length;

    const noteData = {
      title: noteTitle,
      content: summary,
      concept_count: concepts.length,
      mastery_summary: {
        total: concepts.length,
        mastered: masteredCount,
        concepts: concepts.map(c => c.title)
      }
    };

    const result = await saveNote(user.id, noteData);

    if (result) {
      setSaved(true);
    }

    setSaving(false);
  };

  const handleDownload = async () => {
    // Auto-save to database before downloading
    if (user && !saved) {
      await handleSaveToDatabase();
    }

    const blob = new Blob([summary], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${noteTitle}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-start mb-8">
        <div className="flex-1">
          <h2 className="text-3xl font-bold text-slate-800 mb-4">Knowledge Summary</h2>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:outline-none text-slate-700"
              placeholder="Note title..."
              disabled={generating}
            />
            {saved && (
              <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                Saved
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-3 ml-6">
          <button onClick={onBack} className="text-slate-500 hover:text-slate-800 px-4 py-2">
            Back to Map
          </button>
          {!generating && (
            <>
              {!saved && (
                <button
                  onClick={handleSaveToDatabase}
                  disabled={saving}
                  className="bg-slate-100 text-slate-700 px-6 py-2 rounded-lg flex items-center hover:bg-slate-200 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </>
                  )}
                </button>
              )}
              <button
                onClick={handleDownload}
                className="bg-slate-900 text-white px-6 py-2 rounded-lg flex items-center hover:bg-slate-800"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Download
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white p-10 rounded-xl shadow-sm border border-slate-200 min-h-[500px]">
        {generating ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin mb-4" />
            <p>Synthesizing your mastery path...</p>
          </div>
        ) : (
          <article className="prose prose-slate max-w-none">
            <div
              className="whitespace-pre-wrap leading-relaxed"
              dangerouslySetInnerHTML={{ __html: summary.replace(/\n/g, '<br/>') }}
            />
          </article>
        )}
      </div>
    </div>
  );
};

export default SummaryView;