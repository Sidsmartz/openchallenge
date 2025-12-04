-- Add columns for Hindi and Telugu subtitles to videos table
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS subtitles_hindi TEXT,
ADD COLUMN IF NOT EXISTS subtitles_telugu TEXT;

-- Add comment to describe the columns
COMMENT ON COLUMN videos.subtitles_hindi IS 'JSON array of Hindi translated subtitles';
COMMENT ON COLUMN videos.subtitles_telugu IS 'JSON array of Telugu translated subtitles';
