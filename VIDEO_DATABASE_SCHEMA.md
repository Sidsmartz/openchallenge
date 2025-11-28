# Video and Subtitles Database Schema

## Overview

This document describes the database schema for storing videos and their generated subtitles in Supabase.

## Tables

### `videos` Table

Stores metadata about uploaded videos.

| Column        | Type        | Description                                                          |
| ------------- | ----------- | -------------------------------------------------------------------- |
| `id`          | UUID        | Primary key, auto-generated                                          |
| `file_path`   | TEXT        | Unique file path in Supabase Storage (e.g., "1234567890-abc123.mp4") |
| `file_name`   | TEXT        | Original filename uploaded by user                                   |
| `video_url`   | TEXT        | Public URL to access the video                                       |
| `duration`    | REAL        | Video duration in seconds (optional)                                 |
| `uploaded_by` | UUID        | Reference to auth.users (optional)                                   |
| `created_at`  | TIMESTAMPTZ | Timestamp when video was uploaded                                    |
| `updated_at`  | TIMESTAMPTZ | Timestamp when record was last updated                               |

**Indexes:**

- Primary key on `id`
- Unique constraint on `file_path`

### `subtitles` Table

Stores subtitle segments for each video.

| Column       | Type        | Description                            |
| ------------ | ----------- | -------------------------------------- |
| `id`         | UUID        | Primary key, auto-generated            |
| `video_id`   | UUID        | Foreign key to videos table            |
| `start_time` | REAL        | Start time of subtitle in seconds      |
| `end_time`   | REAL        | End time of subtitle in seconds        |
| `text`       | TEXT        | Subtitle text content                  |
| `language`   | TEXT        | Language code (e.g., 'en', 'es', 'fr') |
| `created_at` | TIMESTAMPTZ | Timestamp when subtitle was created    |

**Indexes:**

- Primary key on `id`
- Index on `video_id` for faster lookups
- Composite index on `(video_id, start_time, end_time)` for time-range queries

**Foreign Keys:**

- `video_id` references `videos(id)` with CASCADE delete

## Row Level Security (RLS)

Both tables have RLS enabled with the following policies:

### Videos Table Policies

- `Anyone can view videos` - SELECT access for all users
- `Anyone can insert videos` - INSERT access for all users
- `Anyone can update videos` - UPDATE access for all users
- `Anyone can delete videos` - DELETE access for all users

### Subtitles Table Policies

- `Anyone can view subtitles` - SELECT access for all users
- `Anyone can insert subtitles` - INSERT access for all users
- `Anyone can update subtitles` - UPDATE access for all users
- `Anyone can delete subtitles` - DELETE access for all users

> **Note:** In production, you should restrict these policies to authenticated users only.

## Triggers

### `update_videos_updated_at`

Automatically updates the `updated_at` column in the `videos` table whenever a record is modified.

## Usage Examples

### Insert a Video

```typescript
const { data, error } = await supabase
  .from("videos")
  .insert({
    file_path: "video-123.mp4",
    file_name: "my-video.mp4",
    video_url:
      "https://...supabase.co/storage/v1/object/public/videos/video-123.mp4",
  })
  .select()
  .single();
```

### Insert Subtitles

```typescript
const subtitlesData = [
  {
    video_id: "uuid-here",
    start_time: 0.0,
    end_time: 2.5,
    text: "Hello world",
    language: "en",
  },
  // ... more subtitles
];

const { error } = await supabase.from("subtitles").insert(subtitlesData);
```

### Load Video with Subtitles

```typescript
const { data, error } = await supabase
  .from("videos")
  .select(
    `
    *,
    subtitles (*)
  `
  )
  .eq("file_path", "video-123.mp4")
  .single();
```

### Search Subtitles

```typescript
const { data, error } = await supabase
  .from("subtitles")
  .select("*, videos(*)")
  .ilike("text", "%search term%")
  .order("start_time");
```

## Integration with Video Page

The `app/video/page.tsx` component automatically:

1. **On Upload:** Saves video metadata to the `videos` table
2. **On Subtitle Generation:** Saves all subtitle segments to the `subtitles` table
3. **On Load:** Retrieves existing subtitles from the database if available

All operations include comprehensive console logging for debugging.
