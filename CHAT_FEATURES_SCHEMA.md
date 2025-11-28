# Chat Features Database Schema

This document outlines the database schema changes needed to support image/document uploads and chat reporting features.

## Required Database Changes

### 1. Update Messages Table

Add columns to support file attachments:

```sql
-- Add attachment columns to messages table
ALTER TABLE messages 
ADD COLUMN attachment_url TEXT,
ADD COLUMN attachment_type TEXT CHECK (attachment_type IN ('image', 'document')),
ADD COLUMN attachment_name TEXT;

-- Add index for faster queries
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
```

### 2. Create Chat Reports Table

Create a new table to store chat reports:

```sql
-- Create chat_reports table
CREATE TABLE chat_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'action_taken', 'dismissed')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_chat_reports_status ON chat_reports(status);
CREATE INDEX idx_chat_reports_reporter ON chat_reports(reporter_id);
CREATE INDEX idx_chat_reports_reported_user ON chat_reports(reported_user_id);
CREATE INDEX idx_chat_reports_created ON chat_reports(created_at DESC);

-- Enable RLS
ALTER TABLE chat_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can create reports
CREATE POLICY "Users can create chat reports" ON chat_reports
  FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view their own reports" ON chat_reports
  FOR SELECT
  USING (auth.uid() = reporter_id);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports" ON chat_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email = ANY(string_to_array(current_setting('app.admin_emails', true), ','))
    )
  );

-- Admins can update reports
CREATE POLICY "Admins can update reports" ON chat_reports
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email = ANY(string_to_array(current_setting('app.admin_emails', true), ','))
    )
  );
```

### 3. Create Storage Bucket for Chat Files

Create a Supabase storage bucket for chat attachments:

```sql
-- Create storage bucket (run in Supabase dashboard or via API)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-files', 'chat-files', true);

-- Set up storage policies
CREATE POLICY "Users can upload chat files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view chat files"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-files');

CREATE POLICY "Users can delete their own chat files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### 4. Add Chat Ban Functionality

Add a column to track chat bans:

```sql
-- Add chat ban column to users table
ALTER TABLE users 
ADD COLUMN is_chat_banned BOOLEAN DEFAULT FALSE,
ADD COLUMN chat_ban_reason TEXT,
ADD COLUMN chat_banned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN chat_banned_by UUID REFERENCES users(id);

-- Add index
CREATE INDEX idx_users_chat_banned ON users(is_chat_banned) WHERE is_chat_banned = TRUE;
```

## File Upload Specifications

### Allowed File Types
- **Images**: JPEG, PNG, GIF, WebP
- **Documents**: PDF, DOC, DOCX

### File Size Limits
- Maximum file size: 10MB per file

### Storage Structure
```
chat-files/
  └── chat-attachments/
      └── {timestamp}-{random}.{ext}
```

### 5. Create Blocked Users Table

Allow users to block other users:

```sql
-- Create blocked_users table
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, blocked_user_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_blocked_users_user ON blocked_users(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_user_id);

-- Enable RLS
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own blocks
CREATE POLICY "Users can manage their own blocks" ON blocked_users
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

## Admin Features

Admins should be able to:
1. View all chat reports
2. Review reported conversations
3. Take action on reports:
   - Ban user from chat only
   - Ban user from all features (chat + posts)
   - Dismiss report
   - Add admin notes
4. View chat ban history

## User Features

Users can:
1. Upload images and documents in chat (up to 10MB)
2. Download attachments from chat messages
3. Report inappropriate chats
4. Block/unblock other users
5. View blocked status indicator

## API Endpoints

### POST /api/chat/report
Report a chat conversation
- **Body**: `{ conversationId, reportedUserId, reason }`
- **Response**: `{ success: true, report }`

### POST /api/messages
Send a message with optional attachment
- **Body**: `{ conversationId, content, attachmentUrl?, attachmentType?, attachmentName? }`
- **Response**: `{ message }`

### GET /api/admin/chat-reports
Get all chat reports (admin only)
- **Response**: `{ reports: [...] }`

### POST /api/admin/chat-reports/:id/action
Take action on a chat report (admin only)
- **Body**: `{ action: 'ban_chat' | 'ban_all' | 'dismiss', notes? }`
- **Response**: `{ success: true }`

## Features Summary

### ✅ Implemented Features

1. **Image/Document Upload**
   - Upload images (JPEG, PNG, GIF, WebP) and documents (PDF, DOC, DOCX)
   - 10MB file size limit
   - Files stored in Supabase Storage `chat-files` bucket
   - Preview before sending
   - Download button on all attachments

2. **Chat Reporting**
   - Report button in chat header
   - Reason textarea for detailed reports
   - Reports sent to admin panel
   - Admin can ban from chat, ban from all, or dismiss

3. **User Blocking**
   - Block/unblock button in chat header
   - Blocked users' messages are hidden
   - Visual indicator when user is blocked
   - Unblock option available

4. **Admin Panel**
   - New "Chat Reports" tab
   - View all reports with status
   - Take action on reports (ban chat, ban all, dismiss)
   - View reporter and reported user details
   - Add admin notes to reports
