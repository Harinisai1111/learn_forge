import express from 'express';
import cors from 'cors';
import { YoutubeTranscript } from 'youtube-transcript';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

app.get('/transcript', async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'Missing url parameter' });
    }

    try {
        console.log(`Fetching transcript for: ${url}`);
        const transcript = await YoutubeTranscript.fetchTranscript(url);
        res.json(transcript);
    } catch (error) {
        console.error('Error fetching transcript:', error);
        res.status(500).json({ error: 'Failed to fetch transcript. Captions might be disabled.' });
    }
});

app.listen(port, () => {
    console.log(`✅ Transcript Proxy Server running at http://localhost:${port}`);
});
