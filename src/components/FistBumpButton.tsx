import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  getReactionCount,
  hasUserReacted,
  toggleReaction,
  getReactionUsers,
} from '../services/reactionService';

interface FistBumpButtonProps {
  workoutId: string;
  commentCount?: number;
  onReactionChange?: (count: number, hasReacted: boolean) => void;
}

export default function FistBumpButton({
  workoutId,
  commentCount = 0,
  onReactionChange,
}: FistBumpButtonProps) {
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
  }, [workoutId, isAuthenticated]);

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
        getReactionCount(workoutId),
        hasUserReacted(workoutId),
        getReactionUsers(workoutId).catch(() => []), // Don't fail if this fails
      ]);
      setCount(reactionCount);
      setHasReacted(userHasReacted);
      setReactionUsers(users);
      if (onReactionChange) {
        onReactionChange(reactionCount, userHasReacted);
      }
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
      const newHasReacted = await toggleReaction(workoutId);
      setHasReacted(newHasReacted);
      
      // Update count optimistically
      const newCount = newHasReacted ? count + 1 : Math.max(0, count - 1);
      setCount(newCount);
      
      if (onReactionChange) {
        onReactionChange(newCount, newHasReacted);
      }

      // Reload to get accurate count
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
        className="flex items-center space-x-2 text-gray-400 cursor-not-allowed"
      >
        <span className="text-xl">👊</span>
        <span className="text-sm font-semibold">-</span>
      </button>
    );
  }

  const DefaultAvatar = ({ name }: { name?: string }) => (
    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cf-red to-cf-red-hover flex items-center justify-center border border-gray-200">
      <span className="text-white text-xs font-bold">
        {name?.[0]?.toUpperCase() || '?'}
      </span>
    </div>
  );

  return (
    <div className="relative" ref={tooltipRef}>
      <button
        onClick={handleClick}
        onMouseEnter={() => count > 0 && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        disabled={!isAuthenticated || isToggling}
        className={`flex items-center space-x-2 transition-all min-h-[44px] min-w-[44px] px-2 rounded ${
          hasReacted
            ? 'text-cf-red hover:text-cf-red-hover'
            : 'text-gray-600 hover:text-cf-red'
        } ${
          isToggling ? 'opacity-50 cursor-wait' : 'cursor-pointer'
        } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={hasReacted ? 'Remove fist bump' : 'Fist bump'}
      >
        <span
          className={`text-xl transition-transform ${
            hasReacted ? 'scale-110' : ''
          } ${isToggling ? 'animate-pulse' : ''}`}
        >
          👊
        </span>
        {(count > 0 || commentCount > 0) && (
          <span className="text-sm font-semibold">
            {[
              count > 0 && (count === 1 ? '1 fist' : `${count} fists`),
              commentCount > 0 && (commentCount === 1 ? '1 comment' : `${commentCount} comments`),
            ].filter(Boolean).join(', ')}
          </span>
        )}
      </button>

      {/* Tooltip showing who reacted */}
      {showTooltip && reactionUsers.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
            Fist Bumps ({reactionUsers.length})
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {reactionUsers.map((user) => (
              <div key={user.id} className="flex items-center space-x-2">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-6 h-6 rounded-full object-cover border border-gray-200"
                  />
                ) : (
                  <DefaultAvatar name={user.name} />
                )}
                <span className="text-sm text-gray-700 truncate">
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

