# Design Document

## Overview

The Community Posts system is a social platform feature that enables users to create, share, and interact with content while maintaining a safe environment through automated content moderation. The system integrates Supabase for data persistence, Google Perspective API for content analysis, and provides a cohesive user experience matching the existing onboarding interface.

## Architecture

### System Components

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│     Next.js Frontend            │
│  - Community Page (/community)  │
│  - Main Page (/)                │
│  - Post Creation Form           │
│  - Post Feed Display            │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│     API Routes                  │
│  - POST /api/posts/create       │
│  - GET /api/posts/feed          │
│  - POST /api/posts/like         │
│  - POST /api/posts/comment      │
│  - GET /api/notifications       │
└──────┬──────────────────────────┘
       │
       ├──────────────┬─────────────┐
       ▼              ▼             ▼
┌──────────┐   ┌──────────┐  ┌──────────────┐
│ Supabase │   │Perspective│  │   Supabase   │
│   DB     │   │    API    │  │   Storage    │
└──────────┘   └──────────┘  └──────────────┘
```

## Components and Interfaces

### Database Schema

#### posts table
```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  content TEXT NOT NULL,
  image_urls TEXT[], -- Array of image URLs from Supabase Storage
  status TEXT CHECK (status IN ('published', 'flagged', 'deleted')) DEFAULT 'published',
  toxicity_scores JSONB, -- Store Perspective API scores
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### moderation_queue table
```sql
CREATE TABLE moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id),
  comment_id UUID REFERENCES comments(id),
  content_type TEXT CHECK (content_type IN ('post', 'comment')) NOT NULL,
  content TEXT NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  toxicity_scores JSONB NOT NULL,
  review_status TEXT CHECK (review_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### comments table
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  content TEXT NOT NULL,
  status TEXT CHECK (status IN ('published', 'flagged', 'deleted')) DEFAULT 'published',
  toxicity_scores JSONB,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### post_likes table
```sql
CREATE TABLE post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);
```

#### notifications table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  type TEXT CHECK (type IN ('post_published', 'post_flagged', 'post_approved', 'post_rejected', 'comment_reply')) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_post_id UUID REFERENCES posts(id),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Endpoints

#### POST /api/posts/create
**Request:**
```typescript
{
  content: string;
  images?: File[];
}
```

**Response:**
```typescript
{
  success: boolean;
  post?: {
    id: string;
    status: 'published' | 'flagged';
  };
  message: string;
}
```

#### GET /api/posts/feed
**Query Parameters:**
- `page`: number (default: 1)
- `limit`: number (default: 20)

**Response:**
```typescript
{
  posts: Array<{
    id: string;
    user: { id: string; full_name: string; };
    content: string;
    image_urls: string[];
    likes_count: number;
    comments_count: number;
    created_at: string;
    user_has_liked: boolean;
  }>;
  total: number;
  page: number;
  has_more: boolean;
}
```

## Data Models

### Post Model
```typescript
interface Post {
  id: string;
  user_id: string;
  content: string;
  image_urls: string[];
  status: 'published' | 'flagged' | 'deleted';
  toxicity_scores: ToxicityScores;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
}
```

### ToxicityScores Model
```typescript
interface ToxicityScores {
  TOXICITY: number;
  SEVERE_TOXICITY: number;
  IDENTITY_ATTACK: number;
  INSULT: number;
  PROFANITY: number;
  THREAT: number;
}
```

### Notification Model
```typescript
interface Notification {
  id: string;
  user_id: string;
  type: 'post_published' | 'post_flagged' | 'post_approved' | 'post_rejected' | 'comment_reply';
  title: string;
  message: string;
  related_post_id?: string;
  is_read: boolean;
  created_at: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Content moderation consistency
*For any* post or comment with text content, when analyzed by Perspective API, if any toxicity score exceeds 0.7, the content status should be set to 'flagged' and a moderation queue entry should be created.
**Validates: Requirements 2.2, 2.3**

### Property 2: Notification creation on post submission
*For any* post submission, exactly one notification should be created for the user indicating either 'post_published' or 'post_flagged' status.
**Validates: Requirements 3.1, 3.2**

### Property 3: Published posts visibility
*For any* query to the posts feed, only posts with status 'published' should be returned to non-admin users.
**Validates: Requirements 4.1, 4.2**

### Property 4: Like count consistency
*For any* post, the likes_count field should equal the number of records in post_likes table for that post_id.
**Validates: Requirements 5.1, 5.2**

### Property 5: Image storage integrity
*For any* post with uploaded images, all image URLs in the image_urls array should reference valid files in Supabase Storage.
**Validates: Requirements 8.4**

### Property 6: Authentication requirement
*For any* API endpoint that creates or modifies content, requests without valid authentication should be rejected with 401 status.
**Validates: Requirements 8.5**

## Error Handling

### Content Moderation Failures
- If Perspective API is unavailable, queue post for manual review
- Log error and notify admins
- Show user a message that post is pending review

### Image Upload Failures
- Validate file size (max 5MB per image)
- Validate file type (JPEG, PNG, WebP only)
- Show clear error messages to users
- Allow post submission without images if upload fails

### Database Errors
- Implement retry logic for transient failures
- Roll back transactions on error
- Log errors for debugging
- Show generic error message to users

## Testing Strategy

### Unit Tests
- Test content moderation logic with various toxicity scores
- Test notification creation for different post statuses
- Test like/unlike functionality
- Test image URL validation

### Property-Based Tests
- Use fast-check library for JavaScript/TypeScript
- Generate random post content and verify moderation consistency
- Generate random like/unlike sequences and verify count accuracy
- Generate random user authentication states and verify access control

### Integration Tests
- Test full post creation flow with Supabase
- Test Perspective API integration
- Test image upload to Supabase Storage
- Test notification delivery

## Security Considerations

### Row Level Security (RLS)
- Enable RLS on all tables
- Users can only read their own notifications
- Users can only create posts/comments with their own user_id
- Only admins can access moderation_queue table
- All users can read published posts

### Input Validation
- Sanitize all user input to prevent XSS
- Validate image file types and sizes
- Limit text content length
- Validate URLs before storing

### Rate Limiting
- Limit post creation to 10 per hour per user
- Limit comment creation to 50 per hour per user
- Limit like actions to 100 per hour per user
