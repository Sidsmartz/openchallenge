# Video Student Features

## Overview
Enhanced the VideoTab component with two powerful learning features for students:

### 1. Subtitle Search with Time-Skip
- **Purpose**: Allows students to search through video subtitles and jump directly to relevant timestamps
- **How it works**:
  - Students enter a search query in the "Search in Video" section
  - The system searches through all subtitle segments for matching text
  - Results display with timestamps and preview text
  - Clicking any result jumps the video to that exact moment
- **Benefits**:
  - Quick navigation to specific topics within long videos
  - Easy review of particular concepts
  - Efficient study sessions by skipping to relevant content

### 2. AI-Generated Flashcards
- **Purpose**: Automatically creates study flashcards from video content
- **How it works**:
  - Uses Google Gemini 1.5 Flash to analyze video subtitles
  - Generates 10-15 high-quality question-answer flashcards
  - Covers key concepts, definitions, and important facts
  - Interactive flashcard interface with show/hide answers
- **Benefits**:
  - Automated study material creation
  - Reinforces learning through active recall
  - Saves time creating study materials manually
  - Focuses on the most important educational content

## Technical Implementation

### API Routes Created:
1. `/api/search-subtitles` - Searches subtitle text and returns matching segments with timestamps
2. `/api/generate-flashcards` - Uses OpenAI to generate flashcards from subtitle content

### Features:
- Real-time subtitle search with debouncing (300ms delay)
- Click-to-jump functionality for instant video navigation
- Flashcard navigation (previous/next)
- Show/hide answer functionality
- Progress tracking (card X of Y)
- Responsive design for mobile devices

### Requirements:
- Video must have subtitles generated (faculty feature)
- Gemini API key must be configured in `.env.local` as `GEMINI_API_KEY`
- Features are student-only (role-based access)
- @google/generative-ai package installed

## Usage

### For Students:
1. Select a video from the library
2. Wait for subtitles to load (if available)
3. Use "Search in Video" to find specific content
4. Click "Generate Flashcards from Video" to create study materials
5. Navigate through flashcards using Previous/Next buttons

### For Faculty:
- These features are not visible to faculty users
- Faculty can generate subtitles which enable these student features
- Faculty focus remains on video upload and subtitle generation
