import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  getCommentReactionCount,
  hasUserReactedToComment,
  toggleCommentReaction,
  getCommentReactionUsers,
} from '../services/commentReactionService';

interface CommentFistBumpButtonProps {
  commentId: string;
}

export default function CommentFistBumpButton({ commentId }: CommentFistBumpButtonProps) {
  const { isAuthenticated, user: currentUser } = useAuth();
  const [count, setCount] = useState(0);
  const [hasReacted, setHasReacted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [reactionUsers, setReactionUsers] = useState<Array<{
    id: string;
    name: string;
    email: string;
    picture?: string;
  }>>([]);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    loadReactionData();
  }, [commentId, isAuthenticated]);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setShowTooltip(false);
      }
    };

    if (showTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTooltip]);

  const loadReactionData = async () => {
    try {
      const [reactionCount, userHasReacted, users] = await Promise.all([
        getCommentReactionCount(commentId),
        hasUserReactedToComment(commentId),
        getCommentReactionUsers(commentId).catch(() => []), // Don't fail if this fails
      ]);
      setCount(reactionCount);
      setHasReacted(userHasReacted);
      setReactionUsers(users);
    } catch (error) {
      console.error('Failed to load reaction data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClick = async () => {
    if (!isAuthenticated || isToggling) return;

    setIsToggling(true);
    try {
      const newHasReacted = await toggleCommentReaction(commentId);
      setHasReacted(newHasReacted);
      
      // Update count optimistically
      const newCount = newHasReacted ? count + 1 : Math.max(0, count - 1);
      setCount(newCount);
      
      // Reload to get accurate count and users
      await loadReactionData();
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
      // Revert optimistic update
      await loadReactionData();
    } finally {
      setIsToggling(false);
    }
  };

  if (isLoading) {
    return (
      <button
        disabled
        className="flex items-center space-x-1 text-gray-400 cursor-not-allowed text-xs"
      >
        <span className="text-sm">👊</span>
        <span className="text-xs">-</span>
      </button>
    );
  }

  const DefaultAvatar = ({ name }: { name?: string }) => (
    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cf-red to-cf-red-hover flex items-center justify-center border border-gray-200">
      <span className="text-white text-xs font-bold">
        {name?.[0]?.toUpperCase() || '?'}
      </span>
    </div>
  );

  return (
    <div className="relative inline-block" ref={tooltipRef}>
      <button
        onClick={handleClick}
        onMouseEnter={() => count > 0 && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        disabled={!isAuthenticated || isToggling}
        className={`flex items-center space-x-1 transition-all px-1.5 py-0.5 rounded text-xs ${
          hasReacted
            ? 'text-cf-red hover:text-cf-red-hover'
            : 'text-gray-600 hover:text-cf-red'
        } ${
          isToggling ? 'opacity-50 cursor-wait' : 'cursor-pointer'
        } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''} ${
          !hasReacted && isAuthenticated ? 'opacity-40 hover:opacity-60' : ''
        }`}
        title={hasReacted ? 'Remove fist bump' : 'Fist bump'}
      >
        <span
          className={`text-sm transition-transform ${
            hasReacted ? 'scale-110' : ''
          } ${isToggling ? 'animate-pulse' : ''}`}
        >
          👊
        </span>
        {count > 0 && (
          <span className="text-xs font-semibold">{count}</span>
        )}
      </button>

      {/* Tooltip showing who reacted */}
      {showTooltip && reactionUsers.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
            Fist Bumps ({reactionUsers.length})
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {reactionUsers.map((user) => (
              <div key={user.id} className="flex items-center space-x-2">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-5 h-5 rounded-full object-cover border border-gray-200"
                  />
                ) : (
                  <DefaultAvatar name={user.name} />
                )}
                <span className="text-xs text-gray-700 truncate">
                  {user.id === currentUser?.id ? 'You' : user.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

