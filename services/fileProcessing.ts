// Note: YouTube transcript extraction requires a backend API
// Browser-based apps cannot directly fetch YouTube transcripts due to CORS
// For production, you'd need a backend service to handle this
import { YoutubeTranscript } from 'youtube-transcript';

export enum FileType {
    PDF = 'PDF',
    PPTX = 'PPTX',
    YOUTUBE = 'YOUTUBE',
    TEXT = 'TEXT',
}

export interface ProcessedContent {
    text: string;
    type: FileType;
    metadata?: {
        title?: string;
        pageCount?: number;
        duration?: string;
    };
}

/**
 * Extract text from PDF file (browser-compatible version)
 * Note: For complex PDFs, users should copy/paste text manually for best results
 */
export const extractTextFromPDF = async (file: File): Promise<ProcessedContent> => {
    try {
        // Basic text extraction - works for simple text-based PDFs
        const text = await file.text();

        // Try to extract readable text
        const cleanedText = text
            .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();

        // Check if we got meaningful text
        const hasContent = cleanedText.length > 100;

        return {
            text: hasContent
                ? cleanedText
                : `📄 PDF File Added: ${file.name}\n\nThe PDF was uploaded but automatic text extraction may not work for all PDFs.\n\nTo ensure accurate content:\n• Open the PDF and copy the text\n• Paste it in the text area above\n• Or proceed with other content you've added\n\nThe AI will work with whatever content you provide!`,
            type: FileType.PDF,
            metadata: {
                title: file.name,
            },
        };
    } catch (error) {
        console.error('Error extracting PDF text:', error);
        return {
            text: `📄 PDF File Added: ${file.name}\n\nPlease copy and paste the PDF content into the text area above for best results.`,
            type: FileType.PDF,
            metadata: {
                title: file.name,
            },
        };
    }
};

/**
 * Extract text from PPTX file (browser-compatible version)
 * Note: This is a simplified version. For full PPTX support, consider a backend service
 */
export const extractTextFromPPTX = async (file: File): Promise<ProcessedContent> => {
    try {
        // PPTX files are ZIP archives containing XML files
        // For browser compatibility, we'll provide a fallback
        const text = await file.text();

        // Try to extract any readable text
        const cleanedText = text
            .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        return {
            text: cleanedText || 'PowerPoint content detected. Please paste the text manually for best results.',
            type: FileType.PPTX,
            metadata: {
                title: file.name,
            },
        };
    } catch (error) {
        console.error('Error extracting PPTX text:', error);
        throw new Error('Failed to extract text from PowerPoint. Please try copying and pasting the text manually.');
    }
};

/**
 * Extract YouTube video ID from URL
 */
const extractYouTubeVideoId = (url: string): string | null => {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /^([a-zA-Z0-9_-]{11})$/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }

    return null;
};

/**
 * Process YouTube URL - adds link as reference
 * Note: Transcript extraction requires manual copying due to browser CORS limitations
 */


/**
 * Process YouTube URL - extracts transcript automatically
 */
export const extractYouTubeTranscript = async (url: string): Promise<ProcessedContent> => {
    const videoId = extractYouTubeVideoId(url);

    if (!videoId) {
        throw new Error('Invalid YouTube URL. Please provide a valid YouTube video link.');
    }

    try {
        // Attempt 1: Local Proxy Server (The robust solution)
        // We defer to the standard fetch API to call our local node server
        let transcriptItems;
        try {
            const proxyResponse = await fetch(`http://localhost:3001/transcript?url=${encodeURIComponent(url)}`);
            if (!proxyResponse.ok) throw new Error('Proxy failed');
            transcriptItems = await proxyResponse.json();
            console.log('✅ Fetched transcript via local proxy!');
        } catch (proxyError) {
            console.warn('Local proxy skipped:', proxyError);
            // Attempt 2: Direct Fetch (Fallback)
            transcriptItems = await YoutubeTranscript.fetchTranscript(url);
        }

        const transcriptText = transcriptItems
            .map(item => item.text)
            .join(' ')
            .replace(/&amp;#39;/g, "'")
            .replace(/&amp;quot;/g, '"')
            .replace(/\s+/g, ' ')
            .trim();

        if (!transcriptText || transcriptText.length < 50) {
            throw new Error('Transcript is too short or empty');
        }

        return {
            text: `Title: YouTube Video (${videoId})\n\n${transcriptText}`,
            type: FileType.YOUTUBE,
            metadata: {
                title: `YouTube Video (${videoId})`,
                duration: `${Math.round(transcriptItems[transcriptItems.length - 1].offset / 60)} mins`
            },
        };

    } catch (error: any) {
        console.warn('YouTube Extract Warning:', error.message);

        let errorMessage = 'Failed to extract transcript.';
        if (error.message && error.message.includes('NetworkError')) {
            errorMessage = 'Network Error (CORS). Is the proxy running?';
        } else if (error.message && (error.message.includes('Transcript is too short') || error.message.includes('empty'))) {
            errorMessage = 'No transcript available for this video (or it is empty).';
        } else if (error.message && error.message.includes('Transcript is disabled')) {
            errorMessage = 'Captions are disabled for this video.';
        }

        const placeholderText = `📺 YouTube Video Added: ${url}\n\n⚠️ ${errorMessage}\n\nWorkaround:\n1. Open Video\n2. Copy transcript/summary\n3. Paste here\n\n(We processed the link, so you just need the text!)`;

        return {
            text: placeholderText,
            type: FileType.YOUTUBE,
            metadata: {
                title: `YouTube Video (${videoId}) (No Transcript)`,
            },
        };
    }
};



/**
 * Process uploaded file based on type
 */
export const processFile = async (file: File): Promise<ProcessedContent> => {
    const extension = file.name.split('.').pop()?.toLowerCase();

    switch (extension) {
        case 'pdf':
            return extractTextFromPDF(file);

        case 'pptx':
        case 'ppt':
            return extractTextFromPPTX(file);

        case 'txt':
        case 'md':
            const text = await file.text();
            return {
                text,
                type: FileType.TEXT,
                metadata: {
                    title: file.name,
                },
            };

        default:
            throw new Error(`Unsupported file type: ${extension}. Please upload PDF, PPTX, or TXT files.`);
    }
};

/**
 * Process YouTube URL
 */
export const processYouTubeURL = async (url: string): Promise<ProcessedContent> => {
    return extractYouTubeTranscript(url);
};
