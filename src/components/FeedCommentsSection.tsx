import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Comment, getComments, addComment, deleteComment } from '../services/commentService';
import { formatDistanceToNow } from 'date-fns';
import CommentFistBumpButton from './CommentFistBumpButton';

interface FeedCommentsSectionProps {
  workoutId: string;
  showInput?: boolean;
  showByDefault?: boolean;
  onCommentCountChange?: (count: number) => void;
}

export default function FeedCommentsSection({ workoutId, showInput = false, showByDefault = true, onCommentCountChange }: FeedCommentsSectionProps) {
  const { isAuthenticated, user: currentUser } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllComments, setShowAllComments] = useState(showByDefault);

  useEffect(() => {
    if (isAuthenticated) {
      loadComments();
    } else {
      setIsLoading(false);
    }
  }, [workoutId, isAuthenticated]);

  const loadComments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const commentsData = await getComments(workoutId);
      setComments(commentsData);
      if (onCommentCountChange) {
        onCommentCountChange(commentsData.length);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments');
      console.error('Failed to load comments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !isAuthenticated || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const comment = await addComment(workoutId, newComment);
      const updatedComments = [...comments, comment];
      setComments(updatedComments);
      setNewComment('');
      setShowAllComments(true); // Show comments after adding one
      if (onCommentCountChange) {
        onCommentCountChange(updatedComments.length);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
      console.error('Failed to add comment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      await deleteComment(commentId);
      const updatedComments = comments.filter(c => c.id !== commentId);
      setComments(updatedComments);
      if (onCommentCountChange) {
        onCommentCountChange(updatedComments.length);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete comment');
      console.error('Failed to delete comment:', err);
    }
  };

  const DefaultAvatar = ({ name }: { name?: string }) => (
    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cf-red to-cf-red-hover flex items-center justify-center border border-gray-200">
      <span className="text-white text-xs font-bold">
        {name?.[0]?.toUpperCase() || '?'}
      </span>
    </div>
  );

  // Show first 2 comments by default, or all if showAllComments is true
  const displayedComments = showAllComments ? comments : comments.slice(0, 2);
  const hasMoreComments = comments.length > 2 && !showAllComments;

  if (isLoading) {
    return null; // Don't show loading in feed
  }

  return (
    <div className="pt-3 border-t border-gray-200 mt-3">
      {error && (
        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
          {error}
        </div>
      )}

      {/* Comments List - show by default */}
      {comments.length > 0 && (
        <div className="space-y-3 mb-3">
          {displayedComments.map((comment) => (
            <div key={comment.id} className="flex items-start space-x-2">
              {comment.user?.picture ? (
                <img
                  src={comment.user.picture}
                  alt={comment.user.name}
                  className="w-6 h-6 rounded-full object-cover border border-gray-200 flex-shrink-0"
                />
              ) : (
                <DefaultAvatar name={comment.user?.name} />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-0.5">
                  <span className="font-semibold text-xs text-black">
                    {comment.user?.name || 'Unknown User'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap break-words mb-1">
                  {comment.text}
                </p>
                <div className="flex items-center space-x-3">
                  <CommentFistBumpButton commentId={comment.id} />
                  {currentUser?.id === comment.userId && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {hasMoreComments && (
            <button
              onClick={() => setShowAllComments(true)}
              className="text-xs text-gray-600 hover:text-cf-red"
            >
              View {comments.length - 2} more comments
            </button>
          )}
        </div>
      )}

      {/* Comment Input - always show if authenticated */}
      {isAuthenticated && showInput && (
        <form onSubmit={handleSubmit} className="flex items-start space-x-2">
          {currentUser?.picture ? (
            <img
              src={currentUser.picture}
              alt={currentUser.name}
              className="w-6 h-6 rounded-full object-cover border border-gray-200 flex-shrink-0"
            />
          ) : (
            <DefaultAvatar name={currentUser?.name} />
          )}
          <div className="flex-1">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="w-full px-3 py-1.5 border border-gray-200 rounded focus:border-cf-red outline-none text-sm"
              disabled={isSubmitting}
            />
          </div>
          {newComment.trim() && (
            <button
              type="submit"
              disabled={isSubmitting}
              className="text-cf-red hover:text-cf-red-hover font-semibold text-sm disabled:opacity-50"
            >
              Post
            </button>
          )}
        </form>
      )}
    </div>
  );
}

