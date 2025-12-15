import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { getUserNotes, deleteNote, SavedNote } from '../services/supabaseService';
import { FileDown, Trash2, Loader2, BookOpen, Calendar, Hash, ArrowLeft } from 'lucide-react';
import { marked } from 'marked';

interface MyNotesProps {
    onBack: () => void;
}

const MyNotes: React.FC<MyNotesProps> = ({ onBack }) => {
    const { user } = useUser();
    const [notes, setNotes] = useState<SavedNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedNote, setSelectedNote] = useState<SavedNote | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            loadNotes();
        }
    }, [user]);

    const loadNotes = async () => {
        if (!user) return;
        setLoading(true);
        const userNotes = await getUserNotes(user.id);
        setNotes(userNotes);
        setLoading(false);
    };

    const handleDownload = (note: SavedNote, format: 'md' | 'txt' = 'md') => {
        const blob = new Blob([note.content], {
            type: format === 'md' ? 'text/markdown' : 'text/plain'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${note.title}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDelete = async (noteId: string) => {
        if (!user || !confirm('Are you sure you want to delete this note?')) return;

        setDeleting(noteId);
        const success = await deleteNote(noteId, user.id);
        if (success) {
            setNotes(notes.filter(n => n.id !== noteId));
            if (selectedNote?.id === noteId) {
                setSelectedNote(null);
            }
        }
        setDeleting(null);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto p-6">
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
            </div>
        );
    }

    if (selectedNote) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="mb-6 flex items-center justify-between">
                    <button
                        onClick={() => setSelectedNote(null)}
                        className="flex items-center text-slate-600 hover:text-slate-900"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Notes
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={() => handleDownload(selectedNote, 'md')}
                            className="px-4 py-2 bg-slate-900 text-white rounded-lg flex items-center hover:bg-slate-800 text-sm"
                        >
                            <FileDown className="w-4 h-4 mr-2" />
                            Download
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-4">{selectedNote.title}</h1>
                    <div className="flex gap-4 text-sm text-slate-500 mb-8">
                        <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDate(selectedNote.created_at)}
                        </span>
                        <span className="flex items-center">
                            <Hash className="w-4 h-4 mr-1" />
                            {selectedNote.concept_count} concepts
                        </span>
                    </div>
                    <div
                        className="prose prose-slate max-w-none"
                        dangerouslySetInnerHTML={{ __html: marked(selectedNote.content) }}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 mb-2">My Notes</h2>
                    <p className="text-slate-500">Access your previously generated study notes</p>
                </div>
                <button
                    onClick={onBack}
                    className="text-slate-500 hover:text-slate-800 px-4 py-2"
                >
                    Back to Home
                </button>
            </div>

            {notes.length === 0 ? (
                <div className="text-center py-16">
                    <div className="inline-flex p-6 bg-slate-100 rounded-full mb-4">
                        <BookOpen className="w-12 h-12 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-700 mb-2">No notes yet</h3>
                    <p className="text-slate-500 mb-6">Complete a learning session to generate your first note</p>
                    <button
                        onClick={onBack}
                        className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                    >
                        Start Learning
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {notes.map((note) => (
                        <div
                            key={note.id}
                            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => setSelectedNote(note)}
                        >
                            <h3 className="text-lg font-bold text-slate-800 mb-3 line-clamp-2">
                                {note.title}
                            </h3>

                            <div className="space-y-2 mb-4">
                                <div className="flex items-center text-sm text-slate-500">
                                    <Calendar className="w-4 h-4 mr-2" />
                                    {formatDate(note.created_at)}
                                </div>
                                <div className="flex items-center text-sm text-slate-500">
                                    <Hash className="w-4 h-4 mr-2" />
                                    {note.concept_count} concepts
                                </div>
                                {note.mastery_summary && (
                                    <div className="text-sm text-slate-600">
                                        <span className="font-semibold text-emerald-600">
                                            {note.mastery_summary.mastered || 0}
                                        </span>
                                        {' / '}
                                        {note.mastery_summary.total || 0} mastered
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 pt-4 border-t border-slate-100">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownload(note);
                                    }}
                                    className="flex-1 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm flex items-center justify-center"
                                >
                                    <FileDown className="w-4 h-4 mr-1" />
                                    Download
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(note.id);
                                    }}
                                    disabled={deleting === note.id}
                                    className="px-3 py-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 text-sm disabled:opacity-50"
                                >
                                    {deleting === note.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyNotes;
