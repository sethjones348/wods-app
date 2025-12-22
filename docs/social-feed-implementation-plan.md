# Social Feed Implementation Plan

## Overview

This plan outlines the step-by-step implementation of the social feed feature for SamFit, migrating from Google Drive to Supabase and adding friend connections, feed, comments, and reactions.

## Related Documentation

- [Social Feed Proposal](./social-feed-proposal.md) - Full feature specification
- [Supabase Setup Guide](./supabase-setup-guide.md) - Database setup instructions

## Progress Tracker

### Phase 1: Supabase Setup & Migration
- [x] Set up Supabase project
- [ ] Configure environment variables
- [x] Create database schema
- [x] Set up Row Level Security policies
- [x] Create Supabase Storage bucket
- [x] Install Supabase client library
- [x] Build migration script from Google Drive (skipped - no existing data)
- [x] Test migration with existing data (skipped - no existing data)
- [x] Update storage service to use Supabase
- [x] Update image upload to Supabase Storage
- [ ] Verify all existing features work with Supabase

### Phase 2: User Profiles & Authentication
- [x] Create user profile system
- [x] Update authentication to work with Supabase (using Supabase Auth with Google provider)
- [x] Create user profile page
- [x] Add profile editing functionality
- [ ] Test user profile creation and updates

### Phase 3: Friend System
- [x] Create friend request data model (already in schema)
- [x] Build email-based friend invite UI
- [x] Implement friend request sending
- [x] Create friend request accept/decline flow
- [x] Build friends list page
- [x] Implement follow/unfollow functionality
- [ ] Test friend request flow end-to-end

### Phase 4: Feed
- [ ] Create feed page component
- [ ] Implement feed query (workouts from friends)
- [ ] Build workout card component for feed
- [ ] Add real-time feed subscriptions
- [ ] Implement pull-to-refresh
- [ ] Add empty state for feed
- [ ] Test feed with multiple users

### Phase 5: Reactions (Fist Bumps)
- [ ] Create reactions data model
- [ ] Build fist bump button component
- [ ] Implement add/remove reaction functionality
- [ ] Display reaction count
- [ ] Add visual feedback (animation)
- [ ] Test reactions across users

### Phase 6: Comments
- [ ] Create comments data model
- [ ] Build comment input component
- [ ] Implement add comment functionality
- [ ] Create comments list component
- [ ] Add edit/delete comment functionality
- [ ] Implement comment notifications
- [ ] Test comments across users

### Phase 7: Privacy & Polish
- [ ] Add privacy toggle (public/private) to workout editor
- [ ] Update workout save to respect privacy setting
- [ ] Filter feed by privacy settings
- [ ] Add loading states
- [ ] Add error handling
- [ ] Mobile responsiveness
- [ ] Performance optimization

### Phase 8: Testing & Deployment
- [ ] Test with 2+ users
- [ ] Verify all features work together
- [ ] Performance testing
- [ ] Security review (RLS policies)
- [ ] Deploy to production
- [ ] Monitor for issues
- [ ] Gather user feedback

## Detailed Implementation Steps

### Phase 1: Supabase Setup & Migration

#### 1.1 Set up Supabase Project
- Create account at supabase.com
- Create new project
- Note project URL and anon key
- **Estimated Time**: 15 minutes

#### 1.2 Configure Environment Variables
- Add `VITE_SUPABASE_URL` to `.env.local`
- Add `VITE_SUPABASE_ANON_KEY` to `.env.local`
- Update GitHub Actions secrets for deployment
- **Estimated Time**: 10 minutes

#### 1.3 Create Database Schema
- Run SQL schema from setup guide
- Create all tables (users, workouts, follows, etc.)
- Verify tables created correctly
- **Estimated Time**: 30 minutes

#### 1.4 Set up Row Level Security
- Enable RLS on all tables
- Create RLS policies for data access
- Test policies with different users
- **Estimated Time**: 1 hour

#### 1.5 Create Supabase Storage Bucket
- Create `workout-images` bucket
- Set bucket to public (or configure policies)
- Test image upload
- **Estimated Time**: 15 minutes

#### 1.6 Install Supabase Client
```bash
npm install @supabase/supabase-js
```
- **Estimated Time**: 5 minutes

#### 1.7 Build Migration Script
- Create script to read workouts from Google Drive
- Transform data to Supabase format
- Upload workouts to Supabase
- Upload images to Supabase Storage
- **Estimated Time**: 2-3 hours

#### 1.8 Test Migration
- Run migration script
- Verify all workouts migrated
- Verify images uploaded
- Check data integrity
- **Estimated Time**: 30 minutes

#### 1.9 Update Storage Service
- Replace `driveStorage.ts` with `supabaseStorage.ts`
- Update all storage functions
- Test save/load/delete operations
- **Estimated Time**: 2 hours

#### 1.10 Update Image Upload
- Update `ImageUpload` component
- Use Supabase Storage instead of base64
- Update workout editor to use Supabase Storage URLs
- **Estimated Time**: 1 hour

#### 1.11 Verify Existing Features
- Test workout upload
- Test workout viewing
- Test workout editing
- Test workout deletion
- Test search functionality
- **Estimated Time**: 1 hour

**Phase 1 Total Estimated Time**: 8-10 hours

---

### Phase 2: User Profiles & Authentication

#### 2.1 Create User Profile System
- Create `UserProfile` interface
- Create user profile service
- Add profile creation on first login
- **Estimated Time**: 1 hour

#### 2.2 Update Authentication
- Integrate Supabase Auth (or keep Google OAuth)
- Create user record in database on login
- Update auth context/hooks
- **Estimated Time**: 1-2 hours

#### 2.3 Create User Profile Page
- Create `/profile/:userId` route
- Display user info and stats
- Show user's workouts
- **Estimated Time**: 2 hours

#### 2.4 Add Profile Editing
- Create profile edit form
- Update profile in database
- Add bio, picture upload
- **Estimated Time**: 1-2 hours

#### 2.5 Test User Profiles
- Create test users
- Verify profile creation
- Test profile updates
- **Estimated Time**: 30 minutes

**Phase 2 Total Estimated Time**: 5-7 hours

---

### Phase 3: Friend System

#### 3.1 Create Friend Request Data Model
- Verify `friend_requests` table exists
- Create TypeScript interfaces
- Create friend request service
- **Estimated Time**: 30 minutes

#### 3.2 Build Email Invite UI
- Create `/invite` page
- Add email input form
- Add validation
- **Estimated Time**: 1 hour

#### 3.3 Implement Friend Request Sending
- Create API function to send request
- Check if user exists by email
- Create friend request record
- Show success/error messages
- **Estimated Time**: 1-2 hours

#### 3.4 Create Friend Request Accept/Decline Flow
- Display pending requests on invite page
- Add accept/decline buttons
- Update request status
- Create follow relationship on accept
- **Estimated Time**: 2 hours

#### 3.5 Build Friends List Page
- Create friends list component
- Show followers and following
- Add unfollow functionality
- **Estimated Time**: 1-2 hours

#### 3.6 Implement Follow/Unfollow
- Create follow service functions
- Add follow/unfollow buttons
- Update UI on follow status change
- **Estimated Time**: 1 hour

#### 3.7 Test Friend Request Flow
- Test sending requests
- Test accepting/declining
- Test following/unfollowing
- Test with multiple users
- **Estimated Time**: 1 hour

**Phase 3 Total Estimated Time**: 7-9 hours

---

### Phase 4: Feed

#### 4.1 Create Feed Page Component
- Create `/feed` route
- Set up basic page structure
- Add navigation link
- **Estimated Time**: 30 minutes

#### 4.2 Implement Feed Query
- Create feed service function
- Query workouts from followed users
- Filter by privacy (public only)
- Order by date (newest first)
- **Estimated Time**: 1-2 hours

#### 4.3 Build Workout Card Component
- Create `FeedWorkoutCard` component
- Display workout summary
- Show user info
- Add reaction/comment counts
- **Estimated Time**: 2 hours

#### 4.4 Add Real-time Feed Subscriptions
- Set up Supabase real-time channel
- Subscribe to new workout inserts
- Update feed when new workout added
- **Estimated Time**: 1-2 hours

#### 4.5 Implement Pull-to-Refresh
- Add pull-to-refresh functionality
- Refresh feed data
- Show loading state
- **Estimated Time**: 30 minutes

#### 4.6 Add Empty State
- Create empty state component
- Show message when no workouts
- Add "invite friends" CTA
- **Estimated Time**: 30 minutes

#### 4.7 Test Feed
- Test with multiple users
- Test real-time updates
- Test privacy filtering
- **Estimated Time**: 1 hour

**Phase 4 Total Estimated Time**: 6-8 hours

---

### Phase 5: Reactions (Fist Bumps)

#### 5.1 Create Reactions Data Model
- Verify `reactions` table exists
- Create TypeScript interfaces
- Create reaction service
- **Estimated Time**: 30 minutes

#### 5.2 Build Fist Bump Button Component
- Create `FistBumpButton` component
- Add fist bump icon
- Style button
- **Estimated Time**: 1 hour

#### 5.3 Implement Add/Remove Reaction
- Create toggle reaction function
- Check if user has reacted
- Add/remove reaction in database
- Update UI immediately
- **Estimated Time**: 1-2 hours

#### 5.4 Display Reaction Count
- Query reaction count for workout
- Display count next to button
- Update count in real-time
- **Estimated Time**: 1 hour

#### 5.5 Add Visual Feedback
- Add animation on click
- Show loading state
- Add hover effects
- **Estimated Time**: 1 hour

#### 5.6 Test Reactions
- Test adding reactions
- Test removing reactions
- Test across multiple users
- Test real-time updates
- **Estimated Time**: 30 minutes

**Phase 5 Total Estimated Time**: 5-6 hours

---

### Phase 6: Comments

#### 6.1 Create Comments Data Model
- Verify `comments` table exists
- Create TypeScript interfaces
- Create comment service
- **Estimated Time**: 30 minutes

#### 6.2 Build Comment Input Component
- Create `CommentInput` component
- Add textarea
- Add submit button
- Add validation
- **Estimated Time**: 1-2 hours

#### 6.3 Implement Add Comment
- Create add comment function
- Insert comment into database
- Refresh comments list
- Show success message
- **Estimated Time**: 1-2 hours

#### 6.4 Create Comments List Component
- Create `CommentsList` component
- Display comments in chronological order
- Show user info for each comment
- Format timestamps
- **Estimated Time**: 2 hours

#### 6.5 Add Edit/Delete Comment
- Add edit button (owner only)
- Add delete button (owner only)
- Implement edit functionality
- Implement delete functionality
- **Estimated Time**: 2 hours

#### 6.6 Implement Comment Notifications
- Create notification system
- Notify workout owner on new comment
- Show notification badge
- **Estimated Time**: 2-3 hours

#### 6.7 Test Comments
- Test adding comments
- Test editing comments
- Test deleting comments
- Test across multiple users
- Test notifications
- **Estimated Time**: 1 hour

**Phase 6 Total Estimated Time**: 9-12 hours

---

### Phase 7: Privacy & Polish

#### 7.1 Add Privacy Toggle
- Add privacy selector to workout editor
- Default to "public"
- Save privacy setting with workout
- **Estimated Time**: 1 hour

#### 7.2 Update Workout Save
- Include privacy in workout save
- Update RLS policies if needed
- Verify privacy is saved correctly
- **Estimated Time**: 30 minutes

#### 7.3 Filter Feed by Privacy
- Ensure feed only shows public workouts
- Verify RLS policies filter correctly
- Test with private workouts
- **Estimated Time**: 30 minutes

#### 7.4 Add Loading States
- Add loading spinners
- Add skeleton loaders for feed
- Improve UX during data fetching
- **Estimated Time**: 1-2 hours

#### 7.5 Add Error Handling
- Add error boundaries
- Show user-friendly error messages
- Handle network errors gracefully
- **Estimated Time**: 1-2 hours

#### 7.6 Mobile Responsiveness
- Test on mobile devices
- Fix any layout issues
- Ensure touch targets are adequate
- **Estimated Time**: 2-3 hours

#### 7.7 Performance Optimization
- Optimize queries
- Add pagination if needed
- Lazy load images
- **Estimated Time**: 2-3 hours

**Phase 7 Total Estimated Time**: 8-12 hours

---

### Phase 8: Testing & Deployment

#### 8.1 Test with Multiple Users
- Create test accounts
- Test all features with 2+ users
- Verify data isolation
- **Estimated Time**: 2-3 hours

#### 8.2 Verify All Features Work Together
- End-to-end testing
- Test complete user flows
- Verify no conflicts
- **Estimated Time**: 2 hours

#### 8.3 Performance Testing
- Test with realistic data volumes
- Check query performance
- Optimize slow queries
- **Estimated Time**: 1-2 hours

#### 8.4 Security Review
- Review RLS policies
- Test unauthorized access attempts
- Verify data isolation
- **Estimated Time**: 1-2 hours

#### 8.5 Deploy to Production
- Update environment variables
- Deploy to GitHub Pages
- Verify production build
- **Estimated Time**: 30 minutes

#### 8.6 Monitor for Issues
- Watch for errors
- Monitor Supabase usage
- Check performance
- **Estimated Time**: Ongoing

#### 8.7 Gather User Feedback
- Get feedback from users
- Identify issues
- Plan improvements
- **Estimated Time**: Ongoing

**Phase 8 Total Estimated Time**: 6-10 hours

---

## Total Estimated Time

**Grand Total**: 54-74 hours (~7-9 full working days)

## Dependencies

- Phase 1 must be completed before all other phases
- Phase 2 can be done in parallel with Phase 1 (after 1.9)
- Phase 3 depends on Phase 2
- Phase 4 depends on Phase 3
- Phase 5 can be done in parallel with Phase 6
- Phase 6 depends on Phase 4
- Phase 7 depends on all previous phases
- Phase 8 depends on all previous phases

## Risk Mitigation

1. **Migration Issues**: Test migration thoroughly before switching
2. **RLS Policy Errors**: Test policies with multiple users
3. **Real-time Performance**: Monitor subscription performance
4. **Storage Limits**: Monitor Supabase usage
5. **Breaking Changes**: Keep Google Drive as backup during migration

## Success Criteria

- [ ] All existing features work with Supabase
- [ ] Users can send and accept friend requests
- [ ] Feed shows workouts from friends
- [ ] Real-time updates work
- [ ] Reactions work across users
- [ ] Comments work across users
- [ ] Privacy settings work correctly
- [ ] Performance is acceptable
- [ ] No security issues
- [ ] Users can use all features without errors

