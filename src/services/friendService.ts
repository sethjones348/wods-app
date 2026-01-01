import { supabase } from '../lib/supabase';
import { sendFriendInviteEmail } from './emailService';
import { getUserProfile, getUserProfileByUsername } from './userService';

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUsername: string | null; // Username/handle (replaces toEmail)
  toEmail: string | null; // Kept for backward compatibility
  toUserId: string | null;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  updatedAt: string;
  // Joined data
  fromUser?: {
    id: string;
    name: string;
    email: string;
    username?: string;
    picture?: string;
  };
  toUser?: {
    id: string;
    name: string;
    email: string;
    username?: string;
    picture?: string;
  };
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
  // Joined data
  following?: {
    id: string;
    name: string;
    email: string;
    username?: string;
    picture?: string;
  };
  follower?: {
    id: string;
    name: string;
    email: string;
    username?: string;
    picture?: string;
  };
}

/**
 * Send a friend request by username
 */
export async function sendFriendRequest(toUsername: string): Promise<FriendRequest> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to send friend requests');
  }

  const normalizedUsername = toUsername.toLowerCase().trim();
  
  if (!normalizedUsername) {
    throw new Error('Username is required');
  }

  // Check if user exists with this username
  const toUser = await getUserProfileByUsername(normalizedUsername);

  if (!toUser) {
    throw new Error('User not found with this username');
  }

  // Can't send friend request to yourself
  if (toUser.id === user.id) {
    throw new Error('You cannot send a friend request to yourself');
  }

  // Check if already following (if following, can't send request)
  const { data: existingFollow } = await supabase
    .from('follows')
    .select('*')
    .eq('follower_id', user.id)
    .eq('following_id', toUser.id)
    .single();

  if (existingFollow) {
    throw new Error('You are already following this user');
  }

  // Check if there's a pending friend request (only pending, not accepted/declined)
  const { data: pendingRequest } = await supabase
    .from('friend_requests')
    .select('*')
    .eq('from_user_id', user.id)
    .eq('to_user_id', toUser.id)
    .eq('status', 'pending')
    .single();

  if (pendingRequest) {
    throw new Error('Friend request already sent to this user');
  }

  // Check if there's an existing request (any status) - if so, update it instead of inserting
  // This handles the case where someone unfollowed and wants to send a new request
  const { data: existingRequest } = await supabase
    .from('friend_requests')
    .select('*')
    .eq('from_user_id', user.id)
    .eq('to_username', normalizedUsername)
    .single();

  let data;
  let error;

  if (existingRequest) {
    // Update existing request to pending (handles case where previous request was accepted/declined)
    const { data: updatedData, error: updateError } = await (supabase
      .from('friend_requests') as any)
      .update({
        status: 'pending',
        to_user_id: toUser.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', (existingRequest as any).id)
      .select()
      .single();
    
    data = updatedData;
    error = updateError;
  } else {
    // Create new friend request
    const { data: insertedData, error: insertError } = await supabase
      .from('friend_requests')
      .insert({
        from_user_id: user.id,
        to_username: normalizedUsername,
        to_user_id: toUser.id,
        status: 'pending',
      } as any)
      .select()
      .single();
    
    data = insertedData;
    error = insertError;
  }

  if (error || !data) {
    throw new Error(`Failed to send friend request: ${error?.message || 'Unknown error'}`);
  }

  // Send email notification (don't fail if email fails)
  try {
    const inviterProfile = await getUserProfile(user.id);
    if (inviterProfile && toUser.email) {
      await sendFriendInviteEmail(
        toUser.email,
        inviterProfile.name,
        inviterProfile.email
      );
    }
  } catch (emailError) {
    console.warn('Failed to send friend invite email:', emailError);
    // Don't throw - friend request was created successfully
  }

  const dataTyped = data as any;
  return {
    id: dataTyped.id,
    fromUserId: dataTyped.from_user_id,
    toUsername: dataTyped.to_username,
    toEmail: dataTyped.to_email,
    toUserId: dataTyped.to_user_id,
    status: dataTyped.status,
    createdAt: dataTyped.created_at,
    updatedAt: dataTyped.updated_at,
  };
}

/**
 * Get pending friend requests for the current user
 */
export async function getPendingFriendRequests(): Promise<FriendRequest[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated');
  }

  // Get current user's profile to check username
  const currentUserProfile = await getUserProfile(user.id);
  const currentUsername = currentUserProfile?.username;

  // Get requests sent TO the current user (by username or user_id)
  // Support both username and email for backward compatibility
  let query = supabase
    .from('friend_requests')
    .select(`
      *,
      from_user:users!friend_requests_from_user_id_fkey(id, name, email, username, picture)
    `)
    .eq('status', 'pending');

  // Build OR condition for matching requests
  const conditions: string[] = [`to_user_id.eq.${user.id}`];
  if (currentUsername) {
    conditions.push(`to_username.eq.${currentUsername}`);
  }
  if (user.email) {
    conditions.push(`to_email.eq.${user.email}`);
  }

  const { data, error } = await query
    .or(conditions.join(','))
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get friend requests: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  return (data as any[]).map((req: any) => ({
    id: req.id,
    fromUserId: req.from_user_id,
    toUsername: req.to_username,
    toEmail: req.to_email,
    toUserId: req.to_user_id,
    status: req.status,
    createdAt: req.created_at,
    updatedAt: req.updated_at,
    fromUser: req.from_user ? {
      id: req.from_user.id,
      name: req.from_user.name,
      email: req.from_user.email,
      username: req.from_user.username,
      picture: req.from_user.picture,
    } : undefined,
  }));
}

/**
 * Get sent friend requests (requests the current user sent)
 */
export async function getSentFriendRequests(): Promise<FriendRequest[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated');
  }

  const { data, error } = await supabase
    .from('friend_requests')
    .select(`
      *,
      to_user:users!friend_requests_to_user_id_fkey(id, name, email, username, picture)
    `)
    .eq('from_user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get sent friend requests: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  return (data as any[]).map((req: any) => ({
    id: req.id,
    fromUserId: req.from_user_id,
    toUsername: req.to_username,
    toEmail: req.to_email,
    toUserId: req.to_user_id,
    status: req.status,
    createdAt: req.created_at,
    updatedAt: req.updated_at,
    toUser: req.to_user ? {
      id: req.to_user.id,
      name: req.to_user.name,
      email: req.to_user.email,
      username: req.to_user.username,
      picture: req.to_user.picture,
    } : undefined,
  }));
}

/**
 * Accept a friend request
 */
export async function acceptFriendRequest(requestId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated');
  }

  // Get the request
  const { data: request, error: fetchError } = await supabase
    .from('friend_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (fetchError || !request) {
    throw new Error(`Friend request not found: ${fetchError?.message || 'Unknown error'}`);
  }

  // Get current user's profile to check username
  const currentUserProfile = await getUserProfile(user.id);
  const currentUsername = currentUserProfile?.username;

  // Verify this request is for the current user
  const requestTyped = request as any;
  const isForCurrentUser = 
    requestTyped.to_user_id === user.id ||
    (currentUsername && requestTyped.to_username?.toLowerCase() === currentUsername.toLowerCase()) ||
    (user.email && requestTyped.to_email?.toLowerCase() === user.email.toLowerCase());

  if (!isForCurrentUser) {
    throw new Error('Unauthorized to accept this friend request');
  }

  // Update request status
  const { error: updateError } = await (supabase
    .from('friend_requests') as any)
    .update({ status: 'accepted' })
    .eq('id', requestId);

  if (updateError) {
    throw new Error(`Failed to accept friend request: ${updateError.message}`);
  }

  // Create follow relationship (bidirectional)
  const fromUserId = requestTyped.from_user_id;
  const toUserId = requestTyped.to_user_id || user.id;

  // Create follow: current user follows the requester
  await supabase
    .from('follows')
    .insert({
      follower_id: user.id,
      following_id: fromUserId,
    } as any)
    .select()
    .single();

  // Create follow: requester follows current user (if they have an account)
  if (toUserId && toUserId !== fromUserId) {
    await supabase
      .from('follows')
      .insert({
        follower_id: fromUserId,
        following_id: toUserId,
      } as any)
      .select()
      .single();
  }
}

/**
 * Decline a friend request
 */
export async function declineFriendRequest(requestId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated');
  }

  // Get the request
  const { data: request } = await supabase
    .from('friend_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (!request) {
    throw new Error('Friend request not found');
  }

  // Get current user's profile to check username
  const currentUserProfile = await getUserProfile(user.id);
  const currentUsername = currentUserProfile?.username;

  // Verify this request is for the current user
  const requestTyped2 = request as any;
  const isForCurrentUser = 
    requestTyped2.to_user_id === user.id ||
    (currentUsername && requestTyped2.to_username?.toLowerCase() === currentUsername.toLowerCase()) ||
    (user.email && requestTyped2.to_email?.toLowerCase() === user.email.toLowerCase());

  if (!isForCurrentUser) {
    throw new Error('Unauthorized to decline this friend request');
  }

  // Update request status
  const { error } = await (supabase
    .from('friend_requests') as any)
    .update({ status: 'declined' })
    .eq('id', requestId);

  if (error) {
    throw new Error(`Failed to decline friend request: ${error.message}`);
  }
}

/**
 * Get list of users the current user is following
 */
export async function getFollowing(): Promise<Follow[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated');
  }

  const { data, error } = await supabase
    .from('follows')
    .select(`
      *,
      following:users!follows_following_id_fkey(id, name, email, username, picture)
    `)
    .eq('follower_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get following list: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  return (data as any[]).map((follow: any) => ({
    id: follow.id,
    followerId: follow.follower_id,
    followingId: follow.following_id,
    createdAt: follow.created_at,
    following: follow.following ? {
      id: follow.following.id,
      name: follow.following.name,
      email: follow.following.email,
      username: follow.following.username,
      picture: follow.following.picture,
    } : undefined,
  }));
}

/**
 * Get list of users following the current user
 */
export async function getFollowers(): Promise<Follow[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated');
  }

  const { data, error } = await supabase
    .from('follows')
    .select(`
      *,
      follower:users!follows_follower_id_fkey(id, name, email, username, picture)
    `)
    .eq('following_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get followers list: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  return (data as any[]).map((follow: any) => ({
    id: follow.id,
    followerId: follow.follower_id,
    followingId: follow.following_id,
    createdAt: follow.created_at,
    follower: follow.follower ? {
      id: follow.follower.id,
      name: follow.follower.name,
      email: follow.follower.email,
      username: follow.follower.username,
      picture: follow.follower.picture,
    } : undefined,
  }));
}

/**
 * Unfollow a user
 */
export async function unfollowUser(followingId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated');
  }

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', followingId);

  if (error) {
    throw new Error(`Failed to unfollow user: ${error.message}`);
  }
}

