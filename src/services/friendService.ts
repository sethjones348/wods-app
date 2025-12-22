import { supabase } from '../lib/supabase';

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toEmail: string;
  toUserId: string | null;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  updatedAt: string;
  // Joined data
  fromUser?: {
    id: string;
    name: string;
    email: string;
    picture?: string;
  };
  toUser?: {
    id: string;
    name: string;
    email: string;
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
    picture?: string;
  };
  follower?: {
    id: string;
    name: string;
    email: string;
    picture?: string;
  };
}

/**
 * Send a friend request by email
 */
export async function sendFriendRequest(toEmail: string): Promise<FriendRequest> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to send friend requests');
  }

  // Check if user exists with this email
  const { data: toUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', toEmail.toLowerCase().trim())
    .single();

  // Check if request already exists
  const { data: existingRequest } = await supabase
    .from('friend_requests')
    .select('*')
    .eq('from_user_id', user.id)
    .eq('to_email', toEmail.toLowerCase().trim())
    .single();

  if (existingRequest) {
    throw new Error('Friend request already sent to this email');
  }

  // Check if already following
  if (toUser) {
    const { data: existingFollow } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', user.id)
      .eq('following_id', toUser.id)
      .single();

    if (existingFollow) {
      throw new Error('You are already following this user');
    }
  }

  // Create friend request
  const { data, error } = await supabase
    .from('friend_requests')
    .insert({
      from_user_id: user.id,
      to_email: toEmail.toLowerCase().trim(),
      to_user_id: toUser?.id || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to send friend request: ${error?.message || 'Unknown error'}`);
  }

  return {
    id: data.id,
    fromUserId: data.from_user_id,
    toEmail: data.to_email,
    toUserId: data.to_user_id,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
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

  // Get requests sent TO the current user (by email or user_id)
  const { data, error } = await supabase
    .from('friend_requests')
    .select(`
      *,
      from_user:users!friend_requests_from_user_id_fkey(id, name, email, picture)
    `)
    .or(`to_email.eq.${user.email},to_user_id.eq.${user.id}`)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get friend requests: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  return data.map((req) => ({
    id: req.id,
    fromUserId: req.from_user_id,
    toEmail: req.to_email,
    toUserId: req.to_user_id,
    status: req.status,
    createdAt: req.created_at,
    updatedAt: req.updated_at,
    fromUser: req.from_user ? {
      id: req.from_user.id,
      name: req.from_user.name,
      email: req.from_user.email,
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
      to_user:users!friend_requests_to_user_id_fkey(id, name, email, picture)
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

  return data.map((req) => ({
    id: req.id,
    fromUserId: req.from_user_id,
    toEmail: req.to_email,
    toUserId: req.to_user_id,
    status: req.status,
    createdAt: req.created_at,
    updatedAt: req.updated_at,
    toUser: req.to_user ? {
      id: req.to_user.id,
      name: req.to_user.name,
      email: req.to_user.email,
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

  // Verify this request is for the current user
  const isForCurrentUser = 
    request.to_email.toLowerCase() === user.email?.toLowerCase() ||
    request.to_user_id === user.id;

  if (!isForCurrentUser) {
    throw new Error('Unauthorized to accept this friend request');
  }

  // Update request status
  const { error: updateError } = await supabase
    .from('friend_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId);

  if (updateError) {
    throw new Error(`Failed to accept friend request: ${updateError.message}`);
  }

  // Create follow relationship (bidirectional)
  const fromUserId = request.from_user_id;
  const toUserId = request.to_user_id || user.id;

  // Create follow: current user follows the requester
  await supabase
    .from('follows')
    .insert({
      follower_id: user.id,
      following_id: fromUserId,
    })
    .select()
    .single();

  // Create follow: requester follows current user (if they have an account)
  if (toUserId && toUserId !== fromUserId) {
    await supabase
      .from('follows')
      .insert({
        follower_id: fromUserId,
        following_id: toUserId,
      })
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

  // Verify this request is for the current user
  const isForCurrentUser = 
    request.to_email.toLowerCase() === user.email?.toLowerCase() ||
    request.to_user_id === user.id;

  if (!isForCurrentUser) {
    throw new Error('Unauthorized to decline this friend request');
  }

  // Update request status
  const { error } = await supabase
    .from('friend_requests')
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
      following:users!follows_following_id_fkey(id, name, email, picture)
    `)
    .eq('follower_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get following list: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  return data.map((follow) => ({
    id: follow.id,
    followerId: follow.follower_id,
    followingId: follow.following_id,
    createdAt: follow.created_at,
    following: follow.following ? {
      id: follow.following.id,
      name: follow.following.name,
      email: follow.following.email,
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
      follower:users!follows_follower_id_fkey(id, name, email, picture)
    `)
    .eq('following_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get followers list: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  return data.map((follow) => ({
    id: follow.id,
    followerId: follow.follower_id,
    followingId: follow.following_id,
    createdAt: follow.created_at,
    follower: follow.follower ? {
      id: follow.follower.id,
      name: follow.follower.name,
      email: follow.follower.email,
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

