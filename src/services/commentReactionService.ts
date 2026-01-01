import { supabase } from '../lib/supabase';

/**
 * Get reaction count for a comment
 */
export async function getCommentReactionCount(commentId: string): Promise<number> {
  const { count, error } = await supabase
    .from('comment_reactions')
    .select('*', { count: 'exact', head: true })
    .eq('comment_id', commentId);

  if (error) {
    throw new Error(`Failed to get reaction count: ${error.message}`);
  }

  return count || 0;
}

/**
 * Check if current user has reacted to a comment
 */
export async function hasUserReactedToComment(commentId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return false;
  }

  const { data, error } = await supabase
    .from('comment_reactions')
    .select('id')
    .eq('comment_id', commentId)
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No reaction found
      return false;
    }
    throw new Error(`Failed to check reaction: ${error.message}`);
  }

  return !!data;
}

/**
 * Add a reaction (fist bump) to a comment
 */
export async function addCommentReaction(commentId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to react');
  }

  const { error } = await supabase
    .from('comment_reactions')
    .insert({
      comment_id: commentId,
      user_id: user.id,
    } as any);

  if (error) {
    // If it's a unique constraint violation, user already reacted
    if (error.code === '23505') {
      return; // Already reacted, no-op
    }
    throw new Error(`Failed to add reaction: ${error.message}`);
  }
}

/**
 * Remove a reaction (fist bump) from a comment
 */
export async function removeCommentReaction(commentId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to remove reaction');
  }

  const { error } = await supabase
    .from('comment_reactions')
    .delete()
    .eq('comment_id', commentId)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(`Failed to remove reaction: ${error.message}`);
  }
}

/**
 * Toggle reaction - add if not present, remove if present
 */
export async function toggleCommentReaction(commentId: string): Promise<boolean> {
  const hasReacted = await hasUserReactedToComment(commentId);
  
  if (hasReacted) {
    await removeCommentReaction(commentId);
    return false;
  } else {
    await addCommentReaction(commentId);
    return true;
  }
}

/**
 * Get list of users who reacted to a comment
 */
export async function getCommentReactionUsers(commentId: string): Promise<Array<{
  id: string;
  name: string;
  email: string;
  picture?: string;
}>> {
  const { data, error } = await supabase
    .from('comment_reactions')
    .select(`
      user_id,
      users!inner(id, name, email, picture)
    `)
    .eq('comment_id', commentId)
    .order('created_at', { ascending: false });

  if (error) {
    // Try fallback approach if join fails
    const { data: reactionsData, error: reactionsError } = await supabase
      .from('comment_reactions')
      .select('user_id')
      .eq('comment_id', commentId)
      .order('created_at', { ascending: false });

    if (reactionsError) {
      throw new Error(`Failed to get reaction users: ${reactionsError.message}`);
    }

    if (!reactionsData || reactionsData.length === 0) {
      return [];
    }

    const userIds = reactionsData.map((r: any) => r.user_id);
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, picture')
      .in('id', userIds);

    if (usersError) {
      throw new Error(`Failed to get users: ${usersError.message}`);
    }

    return ((usersData || []) as any[]).map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      picture: u.picture || undefined,
    }));
  }

  if (!data || !Array.isArray(data)) {
    return [];
  }

  const users: Array<{ id: string; name: string; email: string; picture?: string }> = [];
  
  for (const row of data) {
    // Supabase returns users as an array when using !inner, but we expect a single user
    const rowTyped = row as any;
    let userData: any = null;
    if (rowTyped.users) {
      // If it's an array, take the first element
      userData = Array.isArray(rowTyped.users) ? rowTyped.users[0] : rowTyped.users;
    }
    
    if (userData && userData.id) {
      users.push({
        id: String(userData.id),
        name: String(userData.name || 'Unknown User'),
        email: String(userData.email || ''),
        picture: userData.picture ? String(userData.picture) : undefined,
      });
    }
  }
  
  return users;
}

