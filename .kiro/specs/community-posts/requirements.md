# Requirements Document

## Introduction

This document outlines the requirements for a community posting and chat system integrated with content moderation. The system allows users to create posts (text, images, or both) similar to social media threads, with automatic content moderation using Google's Perspective API. Offensive content is flagged for review while users receive notifications about their post status.

## Glossary

- **Community System**: The web application that enables users to create and view posts
- **Post**: User-generated content containing text, images, or both
- **Perspective API**: Google's API service for analyzing text toxicity and offensive content
- **Moderation Queue**: A database table storing flagged posts awaiting admin review
- **User**: An authenticated person using the Community System
- **Admin**: A user with elevated privileges to review and manage flagged content
- **Notification**: A message sent to users about their post status

## Requirements

### Requirement 1

**User Story:** As a user, I want to create posts with text and/or images, so that I can share content with the community.

#### Acceptance Criteria

1. WHEN a user navigates to /community, THE Community System SHALL display a post creation interface
2. WHEN a user enters text content, THE Community System SHALL accept text input up to 5000 characters
3. WHEN a user uploads images, THE Community System SHALL accept image files in JPEG, PNG, or WebP format
4. WHEN a user submits a post with both text and images, THE Community System SHALL store both content types
5. WHEN a user submits a post with only text, THE Community System SHALL create the post without requiring images

### Requirement 2

**User Story:** As a user, I want my posts to be automatically checked for offensive content, so that the community remains safe and respectful.

#### Acceptance Criteria

1. WHEN a user submits a post with text content, THE Community System SHALL analyze the text using Perspective API
2. WHEN the Perspective API returns toxicity scores above 0.7 for any attribute, THE Community System SHALL flag the post as offensive
3. WHEN a post is flagged as offensive, THE Community System SHALL store it in the moderation queue table
4. WHEN a post passes moderation checks, THE Community System SHALL publish it immediately to the community feed
5. IF the Perspective API is unavailable, THEN THE Community System SHALL queue the post for manual review

### Requirement 3

**User Story:** As a user, I want to receive notifications about my post status, so that I know if my content was published or flagged for review.

#### Acceptance Criteria

1. WHEN a post is successfully published, THE Community System SHALL send a success notification to the user
2. WHEN a post is flagged for moderation, THE Community System SHALL send a notification explaining the flag reason
3. WHEN a notification is sent, THE Community System SHALL store it in the user's notification history
4. WHEN a user views their notifications, THE Community System SHALL display all notifications in chronological order
5. WHEN a user dismisses a notification, THE Community System SHALL mark it as read

### Requirement 4

**User Story:** As a user, I want to view community posts on the main page and community page, so that I can see what others are sharing.

#### Acceptance Criteria

1. WHEN a user visits /community, THE Community System SHALL display all approved posts in reverse chronological order
2. WHEN a user visits the main page (/), THE Community System SHALL display recent approved posts
3. WHEN displaying posts, THE Community System SHALL show the author's name, timestamp, text content, and images
4. WHEN a post contains images, THE Community System SHALL display image thumbnails with click-to-expand functionality
5. WHEN loading posts, THE Community System SHALL implement pagination with 20 posts per page

### Requirement 5

**User Story:** As a user, I want to interact with posts through likes and comments, so that I can engage with the community.

#### Acceptance Criteria

1. WHEN a user clicks a like button on a post, THE Community System SHALL increment the like count
2. WHEN a user unlikes a post, THE Community System SHALL decrement the like count
3. WHEN a user adds a comment to a post, THE Community System SHALL analyze the comment text using Perspective API
4. WHEN a comment passes moderation, THE Community System SHALL display it under the parent post
5. WHEN a comment is flagged, THE Community System SHALL add it to the moderation queue

### Requirement 6

**User Story:** As a system, I want to store moderated content in a dedicated table, so that admins can review it later.

#### Acceptance Criteria

1. WHEN content is flagged by Perspective API, THE Community System SHALL insert a record into the moderation_queue table
2. WHEN storing flagged content, THE Community System SHALL include the content text, toxicity scores, user ID, and timestamp
3. WHEN storing flagged content, THE Community System SHALL set the review status to 'pending'
4. WHEN an admin reviews content, THE Community System SHALL update the review status to 'approved' or 'rejected'
5. WHEN content is approved by admin, THE Community System SHALL publish it to the community feed

### Requirement 7

**User Story:** As a user, I want the community interface to match the onboarding page style, so that the application feels cohesive.

#### Acceptance Criteria

1. WHEN rendering the community page, THE Community System SHALL use the same color scheme as onboarding pages
2. WHEN rendering the community page, THE Community System SHALL use the same typography and spacing as onboarding pages
3. WHEN rendering the community page, THE Community System SHALL use the same button styles as onboarding pages
4. WHEN rendering the community page, THE Community System SHALL use the same card components as onboarding pages
5. WHEN rendering forms, THE Community System SHALL use the same input field styles as onboarding pages

### Requirement 8

**User Story:** As a system, I want to integrate with Supabase for data storage and authentication, so that user data is secure and scalable.

#### Acceptance Criteria

1. WHEN a user creates a post, THE Community System SHALL store it in the Supabase posts table
2. WHEN authenticating users, THE Community System SHALL use Supabase Auth
3. WHEN querying posts, THE Community System SHALL use Supabase RLS policies to enforce permissions
4. WHEN uploading images, THE Community System SHALL store them in Supabase Storage
5. WHEN a user is not authenticated, THE Community System SHALL redirect them to the login page
