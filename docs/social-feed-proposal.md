# Social Feed Feature Proposal

## Overview

Add a social feed feature to SamFit that allows users to follow friends, view their workouts in a feed, and interact through comments and reactions (fist bumps). This will transform SamFit from a personal workout tracker into a social fitness platform similar to Strava.

## Core Features

### 1. Friends/Following System
- **Invite by Email**: Users must know someone's email address to send them a friend invite
- **Accept/Decline Invites**: Users receive friend requests and can accept or decline
- **Followers List**: View who follows you
- **Following List**: View who you follow
- **Privacy Controls**: 
  - **Private**: Workout does not appear in feed (only you can see it)
  - **Public**: Friends can see the workout in their feed

### 2. Feed
- **Simple Chronological Feed**: View workouts from followed users in reverse chronological order (newest first)
- **No Algorithm**: Just show workouts in the order they were posted
- **Infinite Scroll**: Load more workouts as user scrolls
- **Workout Cards**: Display workout summary with image, movements, times/reps

### 3. Comments
- **Comment on Workouts**: Add text comments to any workout (yours or friends')
- **Simple List**: Comments shown in chronological order (newest first or oldest first)
- **Comment Notifications**: Notify users when someone comments on their workout
- **Edit/Delete**: Users can edit or delete their own comments

### 4. Reactions (Fist Bumps)
- **Fist Bump Button**: Simple reaction button on each workout
- **Reaction Count**: Display number of fist bumps
- **Who Reacted**: Show list of users who fist bumped (optional for MVP)
- **Toggle Reaction**: Click to add/remove your fist bump
- **Visual Feedback**: Animated fist bump icon when clicked

## Architecture Considerations

### Current Architecture
- **Storage**: Google Drive API (JSON files)
- **Authentication**: Google OAuth
- **Frontend**: React + TypeScript (client-side only)
- **Hosting**: GitHub Pages (static site)

### Migration Strategy: Move to Free-Tier Database

**Scale**: 2-20 users maximum - perfect for free tier services

**Decision**: Migrate from Google Drive to a free-tier database/cloud storage provider. This eliminates:
- Complex Google Drive permission management
- Slow queries across multiple user drives
- Permission sharing complexity for social features

**Recommended Solution**: Use **Supabase** (PostgreSQL) - has a generous free tier perfect for 2-20 users, with built-in real-time, storage, and PostgreSQL database.

### Why Migrate from Google Drive?

**Problems with Google Drive for Social Features**:
1. **Permission Complexity**: Must grant/revoke Drive access for each friend relationship
2. **Slow Queries**: Can't efficiently query across multiple users' drives
3. **No Real-time**: No built-in real-time updates for feed
4. **API Limits**: Drive API has rate limits that could be hit with social features

**Benefits of Database Migration to Supabase**:
1. **Simple Queries**: Easy SQL queries to get workouts from multiple users
2. **No Permissions**: Database handles access control via user IDs and Row Level Security
3. **Real-time**: Built-in PostgreSQL real-time subscriptions for feed updates
4. **Free Tier**: 500MB database, 1GB storage, 2GB bandwidth - perfect for 2-20 users
5. **Better Performance**: PostgreSQL with proper indexing is fast and efficient
6. **Familiar SQL**: PostgreSQL is a standard SQL database, easier to work with
7. **Built-in Storage**: Supabase Storage for images with CDN

#### 2. User Discovery
**Challenge**: How do users find and follow each other?

**Solution**:
- **Email-based invites only**: Users must know the email address of someone they want to follow
- Send friend request by entering their email
- If the email is associated with a SamFit account, they receive a friend request
- If not, they can be invited to join SamFit
- No public user search or discovery - privacy-focused approach

#### 3. Real-Time Updates
**Challenge**: Feed should update when friends post new workouts.

**Solution** (with database):
- Use Supabase real-time subscriptions for automatic feed updates
- Automatic updates when new workouts are posted
- No polling needed
- Manual refresh button as fallback

## Data Model

### New Data Structures

#### User Profile
```typescript
interface UserProfile {
  id: string; // Google user ID
  email: string;
  name: string;
  picture?: string;
  bio?: string;
  createdAt: string; // ISO-8601
  settings: {
    workoutPrivacy: 'public' | 'private'; // public = friends can see, private = no feed
    showEmail: boolean;
  };
}
```

#### Friend Request
```typescript
interface FriendRequest {
  id: string;
  fromUserId: string; // User sending the request
  toEmail: string; // Email of user being invited
  toUserId?: string; // User ID if they have an account
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}
```

#### Follow Relationship
```typescript
interface Follow {
  id: string;
  followerId: string; // User who is following
  followingId: string; // User being followed
  createdAt: string;
}
```

#### Comment
```typescript
interface Comment {
  id: string;
  workoutId: string;
  userId: string;
  userName: string;
  userPicture?: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
  edited: boolean;
}
```

#### Reaction
```typescript
interface Reaction {
  id: string;
  workoutId: string;
  userId: string;
  userName: string;
  userPicture?: string;
  createdAt: string;
}
```

#### Workout (Extended)
```typescript
interface Workout {
  // ... existing fields ...
  userId: string; // Owner of workout
  privacy: 'public' | 'private'; // public = friends can see, private = no feed
  comments?: Comment[];
  reactions?: Reaction[];
  commentCount: number;
  reactionCount: number;
  userHasReacted: boolean;
}
```

## Storage Strategy

### Recommended Approach: Full Migration to Supabase

**For 2-20 users, migrate everything to Supabase. No Google Drive needed.**

#### Supabase Free Tier
- **Database**: 500MB PostgreSQL storage
- **Bandwidth**: 2GB/month
- **Storage**: 1GB for images
- **Bandwidth**: 2GB/month for images
- **Real-time**: Unlimited real-time subscriptions
- **API Requests**: Unlimited
- **Cost**: $0/month for 2-20 users (well within free tier limits)

#### What Gets Migrated
- **Workout Data**: All workouts stored in PostgreSQL `workouts` table
- **Images**: Workout photos stored in Supabase Storage
- **Social Data**: Users, follows, comments, reactions in PostgreSQL
- **Authentication**: Can use Supabase Auth or continue with Google OAuth

### Migration Plan

1. **Set up Supabase project**
2. **Create schema** for workouts, users, follows, comments, reactions
3. **Build migration script** to move existing Google Drive workouts to database
4. **Update storage service** to use database instead of Google Drive
5. **Test with existing data**
6. **Deploy and verify**

### Benefits of Full Migration

- **No Permission Management**: Database handles access via user IDs
- **Fast Queries**: Easy to query workouts from multiple users
- **Real-time Updates**: Built-in real-time subscriptions
- **Simple Feed**: Query workouts from followed users, order by date
- **Image Storage**: Built-in image storage with CDN
- **Free Tier**: Both options are free for 2-20 users
- **Better Performance**: Faster than Google Drive API calls

## UI/UX Design

### New Pages/Components

1. **Feed Page** (`/feed`)
   - Simple chronological list of workout cards from friends
   - Pull to refresh
   - Empty state when no workouts or no friends

2. **Invite Friends Page** (`/invite`)
   - Email input to send friend invite
   - List of pending friend requests (sent and received)
   - Accept/decline received requests
   - Cancel sent requests

3. **Profile Page** (`/profile/:userId`)
   - User info and stats
   - Grid/list of their workouts
   - Follow/Unfollow button

4. **Workout Detail (Enhanced)**
   - Add comments section below workout
   - Add fist bump button
   - Show who reacted
   - Comment input at bottom

5. **Notifications** (Optional for MVP)
   - Bell icon in navbar
   - Dropdown with recent activity
   - Mark as read functionality

### Component Updates

- **WorkoutCard**: Add reaction count, comment count, user avatar
- **Navbar**: Add Feed link, Invite Friends link, Notifications icon
- **WorkoutDetailPage**: Add comments section, reactions section

## Implementation Phases

### Phase 1: Foundation (MVP)
1. Set up Supabase for all data storage
2. Create user profile system
3. Implement email-based friend invite system
4. Accept/decline friend requests
5. Basic feed page showing followed users' workouts
6. Fist bump reactions (simple count, no user list)

**Timeline**: 2-3 weeks

### Phase 2: Comments
1. Add comment data model
2. Comment input component
3. Comments list on workout detail page
4. Edit/delete comments
5. Basic notifications for new comments

**Timeline**: 1-2 weeks

### Phase 3: Enhanced Features
1. Profile pages
2. Privacy settings
3. Who reacted list

**Timeline**: 1-2 weeks

### Phase 4: Polish
1. Real-time updates
2. Push notifications
3. Activity feed
4. Analytics/insights

**Timeline**: 1-2 weeks

## Technical Implementation Details

### Supabase Setup

```typescript
// supabaseConfig.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

**Supabase Schema (PostgreSQL)**:
```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  picture TEXT,
  bio TEXT,
  settings JSONB DEFAULT '{"workoutPrivacy": "public", "showEmail": false}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Friend requests table
CREATE TABLE friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES users(id),
  to_email TEXT NOT NULL,
  to_user_id UUID REFERENCES users(id),
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Follows table
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES users(id),
  following_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Workouts table
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name TEXT,
  date TIMESTAMP NOT NULL,
  raw_text TEXT[],
  workout_type TEXT CHECK (workout_type IN ('time', 'reps', 'unknown')),
  rounds INTEGER,
  movements TEXT[],
  times INTEGER[], -- in seconds
  reps INTEGER[],
  image_url TEXT, -- Supabase Storage URL
  privacy TEXT CHECK (privacy IN ('public', 'private')) DEFAULT 'public',
  confidence FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

-- Reactions table
CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(workout_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_workouts_user_id ON workouts(user_id);
CREATE INDEX idx_workouts_privacy ON workouts(privacy);
CREATE INDEX idx_workouts_created_at ON workouts(created_at DESC);
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);
```

### Row Level Security (RLS) Policies

Supabase uses Row Level Security to control data access:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile and profiles of friends
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can read workouts from friends (public workouts)
CREATE POLICY "Users can read friend workouts" ON workouts
  FOR SELECT USING (
    privacy = 'public' AND
    user_id IN (
      SELECT following_id FROM follows WHERE follower_id = auth.uid()
    )
  );

-- Users can read their own workouts
CREATE POLICY "Users can read own workouts" ON workouts
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own workouts
CREATE POLICY "Users can insert own workouts" ON workouts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Similar policies for comments, reactions, follows, etc.
```

### Feed Query Example

```typescript
async function getFeed(userId: string) {
  // 1. Get list of users being followed
  const { data: follows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);
  
  const followingIds = follows?.map(f => f.following_id) || [];
  
  if (followingIds.length === 0) {
    return [];
  }
  
  // 2. Simple query: workouts from followed users, ordered by date
  // RLS policies automatically filter to only public workouts from friends
  const { data: workouts, error } = await supabase
    .from('workouts')
    .select(`
      *,
      user:users(id, name, picture),
      comments(count),
      reactions(count)
    `)
    .in('user_id', followingIds)
    .eq('privacy', 'public')
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (error) {
    console.error('Error fetching feed:', error);
    return [];
  }
  
  return workouts || [];
}
```

### Real-time Feed Subscription

```typescript
// Subscribe to new workouts from friends in real-time
const subscription = supabase
  .channel('workouts-feed')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'workouts',
      filter: `privacy=eq.public`
    },
    (payload) => {
      // New workout added, refresh feed
      refreshFeed();
    }
  )
  .subscribe();
```

**Note**: Feed is intentionally simple - just chronological order by creation date. No ranking, no algorithms, no personalization. What you see is what was posted, in order.

## Privacy & Security

### Privacy Levels
1. **Public**: Friends can see the workout in their feed
2. **Private**: Workout does not appear in feed (only the owner can see it)

### Security Considerations
- Validate user permissions before showing workouts
- Sanitize comment input to prevent XSS
- Rate limiting on comments/reactions
- Verify user identity for all social actions

## Cost Considerations

### Current (Free Tier)
- Google Drive: 15GB free (will be replaced)
- GitHub Pages: Free
- Google OAuth: Free

### With Supabase Migration (Free Tier)

#### Supabase Free Tier Limits
- **Database**: 500MB storage
- **Bandwidth**: 2GB/month
- **Storage**: 1GB for images
- **Bandwidth**: 2GB/month for images
- **Real-time**: Unlimited subscriptions
- **API Requests**: Unlimited

#### Estimated Usage for 20 Users
- **Database**: ~100 workouts/month × 50KB = ~5MB (1% of limit)
- **Storage**: ~100 images/month × 200KB = ~20MB (2% of limit)
- **Bandwidth**: ~500MB/month for API calls + images (25% of limit)
- **Well within free tier limits**

### Cost Summary
- **2-20 Users**: $0/month (free tier more than sufficient)
- **If Growth**: Supabase Pro tier ~$25/month (still very affordable)
- **No Google Drive Costs**: Eliminated by migration
- **No Additional Services**: Everything in one platform (database + storage + real-time)

## Success Metrics

- Number of active users following each other
- Average workouts per user per week
- Engagement: comments and reactions per workout
- Feed usage: time spent on feed page
- User retention: daily/weekly active users

## Risks & Mitigations

### Risk 1: Infrastructure Complexity
- **Mitigation**: Start with Supabase free tier, well within limits for 2-20 users

### Risk 2: Database Migration Complexity
- **Challenge**: Migrating existing Google Drive workouts to database
- **Mitigation**: 
  - Build migration script to export all workouts from Drive
  - Import into database with same structure
  - Test thoroughly before switching
  - Keep Google Drive as backup during migration

### Risk 3: Free Tier Limits
- **Challenge**: Exceeding free tier limits with 20 users
- **Mitigation**: 
  - Monitor usage closely
  - Supabase free tier is generous for 2-20 users
  - If limits approached, can optimize (image compression, pagination)
  - Upgrade to paid tier only if needed ($25/month is reasonable)

### Risk 3: Privacy Concerns
- **Mitigation**: Clear privacy controls, opt-in for social features

### Risk 4: Spam/Abuse
- **Mitigation**: Report functionality, moderation tools, rate limiting

## Open Questions

1. Should workouts be automatically shared or opt-in?
2. Do we want workout groups/communities (like Strava clubs)?
3. Should we support workout challenges/competitions?
4. Do we need workout sharing to external platforms?
5. Should comments support @mentions?

## Recommendation

**Migrate to Supabase** for all data storage. For 2-20 users, the free tier is more than sufficient.

**Why Supabase**:
- **PostgreSQL**: Standard SQL database, familiar and powerful
- **Simpler**: No Google Drive permission management
- **Faster**: Database queries are much faster than Drive API
- **Real-time**: Built-in PostgreSQL real-time subscriptions
- **Free**: Free tier is generous for 2-20 users
- **All-in-one**: Database + Storage + Real-time in one platform
- **Better UX**: Faster feed loading, real-time updates
- **Row Level Security**: Built-in security policies for data access
- **TypeScript Support**: Excellent TypeScript client library

**Migration Benefits**:
- Eliminate Google Drive complexity
- Single platform for all data needs
- Real-time feed updates
- Simple SQL queries
- Free for your scale

## Next Steps

1. **Set up Supabase project** at supabase.com
2. **Configure environment variables** (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
3. **Create database schema** using the SQL schema provided above
4. **Set up Row Level Security policies** for data access control
5. **Create Supabase Storage bucket** for workout images
6. **Install Supabase client** (`npm install @supabase/supabase-js`)
7. **Build migration script** to move existing Google Drive workouts to Supabase
8. **Update storage service** to use Supabase instead of Google Drive API
9. **Update image upload** to use Supabase Storage
10. **Design and implement user profile system**
11. **Build email-based friend invite system**
12. **Create friend request accept/decline flow**
13. **Create feed page** with basic workout cards
14. **Add real-time feed subscriptions** using Supabase real-time
15. **Add fist bump reactions**
16. **Test migration** with existing data
17. **Deploy and verify** everything works
18. **Test with small group of users**
19. **Iterate based on feedback**

