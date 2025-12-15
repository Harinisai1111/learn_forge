import React, { useState } from 'react';
import { extractConceptsFromContent } from '../services/aiService';
import { processFile, processYouTubeURL, FileType } from '../services/fileProcessing';
import { Concept } from '../types';
import { Upload, Youtube, FileText, Loader2, X, CheckCircle } from 'lucide-react';

interface SessionSetupProps {
  onSessionStart: (concepts: Concept[]) => void;
}

const SessionSetup: React.FC<SessionSetupProps> = ({ onSessionStart }) => {
  const [inputText, setInputText] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const handleAnalyze = async () => {
    if (!inputText.trim()) {
      setError("Please add some content first.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const concepts = await extractConceptsFromContent(inputText);
      if (concepts.length === 0) {
        setError("Could not extract any concepts. Try adding more detailed content.");
      } else {
        onSessionStart(concepts);
      }
    } catch (err) {
      setError("Failed to analyze content. Please check your API key.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setError(null);

    try {
      const processed = await processFile(file);
      setInputText(prev => {
        const separator = prev.trim() ? '\n\n---\n\n' : '';
        return prev + separator + `# ${processed.metadata?.title || 'Uploaded Content'}\n\n${processed.text}`;
      });
      setUploadedFiles(prev => [...prev, processed.metadata?.title || file.name]);
    } catch (err: any) {
      setError(err.message || 'Failed to process file');
    } finally {
      setIsProcessingFile(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleYouTubeSubmit = async () => {
    if (!youtubeUrl.trim()) return;

    setIsProcessingFile(true);
    setError(null);

    try {
      const processed = await processYouTubeURL(youtubeUrl);
      setInputText(prev => {
        const separator = prev.trim() ? '\n\n---\n\n' : '';
        return prev + separator + `# ${processed.metadata?.title || 'YouTube Video'}\n\n${processed.text}`;
      });
      setUploadedFiles(prev => [...prev, processed.metadata?.title || 'YouTube Video']);
      setYoutubeUrl('');
    } catch (err: any) {
      setError(err.message || 'Failed to process YouTube URL');
      setYoutubeUrl('');
    } finally {
      setIsProcessingFile(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-slate-800 mb-3 tracking-tight">New Learning Session</h1>
        <p className="text-slate-500 text-lg">Paste your study material, notes, or transcripts below.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        {/* Uploaded Files Indicator */}
        {uploadedFiles.length > 0 && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-emerald-800 mb-2">Content Added</h4>
                <div className="space-y-1">
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} className="text-sm text-emerald-700">• {file}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Paste Notes, Transcripts, or Articles
          </label>
          <textarea
            className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 focus:outline-none transition resize-none text-slate-700"
            placeholder="Paste your study notes, full video transcript, or article text here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isProcessingFile}
          />
        </div>



        {error && (
          <div className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-lg text-sm border border-rose-100 flex items-center">
            <span className="mr-2">⚠️</span> {error}
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="w-full py-4 bg-slate-900 text-white rounded-xl font-semibold text-lg hover:bg-slate-800 transition disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Analyzing Concepts...
            </>
          ) : (
            "Start Learning Session"
          )}
        </button>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-6 text-center text-slate-400 text-sm">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-2 shadow-sm">1</div>
          <span>Ingest & Analyze</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-2 shadow-sm">2</div>
          <span>Play to Learn</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-2 shadow-sm">3</div>
          <span>Master & Download</span>
        </div>
      </div>
    </div>
  );
};

export default SessionSetup;