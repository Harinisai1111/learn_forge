# LearnForge - Gamified Learning Platform

Transform your learning materials into interactive mastery paths. Paste your notes, articles, or transcripts and master concepts through gamified learning.

## Features

- **Universal Content Support**: Simply copy and paste text from any source (PDFs, Articles, YouTube Transcripts)
- **AI-Powered Concept Extraction**: Automatically extracts key concepts and builds dependency graphs
- **Dual AI Provider**: Supports both **OpenAI** and **Google Gemini** models
- **4-Level Mastery System**: Progress through Recognition → Understanding → Application → Reasoning
- **Intelligent Question Retry**: Wrong answers require demonstrating understanding with a new question
- **Professional Note Generation**: Download and save beautifully formatted study notes
- **Cloud Persistence**: Save and access your notes from anywhere with Supabase
- **Secure Authentication**: Clerk-powered authentication for user management

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Authentication**: Clerk
- **Database**: Supabase
- **AI**: OpenAI (GPT-4o-mini) OR Google Gemini (1.5 Flash/Pro)
- **Deployment**: Vercel

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Clerk account
- Supabase account
- OpenAI OR Gemini API Key

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file with the following variables:
   ```env
   # AI Provider (openai or gemini)
   VITE_AI_PROVIDER=openai
   VITE_OPENAI_API_KEY=your_openai_key
   VITE_GEMINI_API_KEY=your_gemini_key

   # Authentication & Database
   VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   ```

4. Set up Supabase database:
   - Create a new Supabase project
   - Run the SQL schema from `supabase/schema.sql` in the Supabase SQL editor
   - Copy your project URL and anon key to `.env.local`

5. Set up Clerk:
   - Create a new Clerk application at https://clerk.com
   - Copy your publishable key to `.env.local`

### Running Locally

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or 3000)

## Usage

1. **Sign In**: Authenticate using Clerk
2. **Paste Content**: Copy text from your study materials (or YouTube transcript) and paste it into the input box
3. **Start Learning**: AI extracts concepts and creates a dependency graph
4. **Master Concepts**: Answer questions at 4 difficulty levels
5. **Download Notes**: Generate and save professional study notes
6. **Access Anytime**: View your saved notes from "My Notes"

## License

MIT
