# Implementation Plan

- [x] 1. Set up database schema and migrations


  - Create posts, comments, post_likes, moderation_queue, and notifications tables in Supabase
  - Set up Row Level Security (RLS) policies for all tables
  - Create indexes for performance optimization
  - _Requirements: 8.1, 8.3_



- [ ] 2. Create Supabase client utilities
  - [ ] 2.1 Set up Supabase client configuration
    - Create lib/supabase/client.ts for browser client
    - Create lib/supabase/server.ts for server-side client
    - Add environment variables to .env
    - _Requirements: 8.1, 8.2_

  - [ ] 2.2 Create database helper functions
    - Write functions for CRUD operations on posts
    - Write functions for CRUD operations on comments
    - Write functions for like/unlike operations
    - Write functions for notification management
    - _Requirements: 8.1_

- [ ] 3. Implement content moderation service
  - [x] 3.1 Create moderation API utility


    - Create lib/moderation.ts with Perspective API integration
    - Implement analyzeToxicity function
    - Implement shouldFlagContent function (threshold > 0.7)
    - _Requirements: 2.1, 2.2_

  - [ ] 3.2 Create moderation queue handler
    - Implement function to add content to moderation queue
    - Store toxicity scores in JSONB format
    - _Requirements: 2.3, 6.1, 6.2_

- [ ] 4. Build post creation API
  - [x] 4.1 Create POST /api/posts/create endpoint


    - Validate user authentication
    - Handle text content and image uploads
    - Upload images to Supabase Storage
    - Analyze content with Perspective API
    - Create post record in database
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 8.4_

  - [ ] 4.2 Implement post status logic
    - Set status to 'published' if content passes moderation
    - Set status to 'flagged' if content fails moderation
    - Create moderation queue entry for flagged content
    - _Requirements: 2.2, 2.3, 2.4_

  - [ ] 4.3 Create notification on post submission
    - Send success notification for published posts
    - Send flagged notification for moderated posts
    - Store notification in database
    - _Requirements: 3.1, 3.2, 3.3_

- [ ] 5. Build posts feed API
  - [x] 5.1 Create GET /api/posts/feed endpoint


    - Query published posts from database
    - Join with users table for author information
    - Implement pagination (20 posts per page)
    - Return posts in reverse chronological order
    - _Requirements: 4.1, 4.2, 4.5_

  - [ ] 5.2 Add user-specific data to feed
    - Check if current user has liked each post
    - Include like and comment counts
    - _Requirements: 5.1, 5.2_

- [ ] 6. Build like/unlike functionality
  - [x] 6.1 Create POST /api/posts/like endpoint


    - Validate user authentication
    - Toggle like status (add or remove from post_likes)
    - Update likes_count on post
    - Return updated like status
    - _Requirements: 5.1, 5.2_

- [ ] 7. Build comment system
  - [ ] 7.1 Create POST /api/posts/comment endpoint
    - Validate user authentication
    - Analyze comment text with Perspective API
    - Create comment record if passes moderation
    - Add to moderation queue if flagged
    - Update comments_count on parent post
    - _Requirements: 5.3, 5.4, 5.5_

  - [ ] 7.2 Create GET /api/posts/[id]/comments endpoint
    - Query comments for specific post
    - Join with users table for author information
    - Return only published comments
    - _Requirements: 5.4_

- [ ] 8. Build notifications API
  - [ ] 8.1 Create GET /api/notifications endpoint
    - Query notifications for current user
    - Return in chronological order
    - Include read/unread status
    - _Requirements: 3.4_

  - [ ] 8.2 Create POST /api/notifications/mark-read endpoint
    - Mark specific notification as read
    - Update is_read field in database
    - _Requirements: 3.5_

- [ ] 9. Create community page UI
  - [x] 9.1 Build post creation form component



    - Create textarea for text content (max 5000 chars)
    - Add image upload with preview
    - Add submit button with loading state
    - Match onboarding page styling
    - _Requirements: 1.1, 1.2, 1.3, 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ] 9.2 Build post feed component
    - Display posts in card layout
    - Show author name and timestamp
    - Display text content and images
    - Add like button with count
    - Add comment button with count
    - Match onboarding page styling
    - _Requirements: 4.1, 4.3, 4.4, 7.1, 7.2, 7.3, 7.4_

  - [ ] 9.3 Build post card component
    - Display post content and metadata
    - Show image thumbnails with click-to-expand
    - Add like/unlike interaction
    - Add comment section
    - _Requirements: 4.3, 4.4, 5.1, 5.2_

  - [ ] 9.4 Build comments section component
    - Display comments under each post
    - Add comment input form
    - Show comment author and timestamp
    - _Requirements: 5.3, 5.4_

- [ ] 10. Create notifications UI
  - [ ] 10.1 Build notification bell component
    - Add notification icon to header
    - Show unread count badge
    - Display dropdown with recent notifications
    - _Requirements: 3.4_

  - [ ] 10.2 Build notification list component
    - Display all notifications
    - Show read/unread status
    - Add mark as read functionality
    - Add click to navigate to related post
    - _Requirements: 3.4, 3.5_

- [ ] 11. Update main page to show posts
  - [ ] 11.1 Add recent posts section to home page
    - Query recent published posts
    - Display in card layout
    - Limit to 5 most recent posts
    - Add "View All" link to /community
    - _Requirements: 4.2_

- [ ] 12. Implement image upload to Supabase Storage
  - [ ] 12.1 Create image upload utility
    - Validate file type (JPEG, PNG, WebP)
    - Validate file size (max 5MB)
    - Generate unique filename
    - Upload to Supabase Storage bucket
    - Return public URL
    - _Requirements: 1.3, 8.4_

  - [ ] 12.2 Create storage bucket in Supabase
    - Create 'post-images' bucket
    - Set public access policy
    - Configure file size limits
    - _Requirements: 8.4_

- [ ] 13. Add authentication checks
  - [ ] 13.1 Protect API routes with auth middleware
    - Check for valid session on all protected routes
    - Return 401 for unauthenticated requests
    - Extract user ID from session
    - _Requirements: 8.2, 8.5_

  - [ ] 13.2 Add auth checks to UI components
    - Redirect to login if not authenticated
    - Show/hide features based on auth status
    - _Requirements: 8.5_

- [ ] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
