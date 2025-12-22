import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getReactionUsers } from '../services/reactionService';

interface StackedReactionsProps {
  workoutId: string;
  count: number;
}

export default function StackedReactions({ workoutId, count }: StackedReactionsProps) {
  const { user: currentUser } = useAuth();
  const [reactionUsers, setReactionUsers] = useState<Array<{
    id: string;
    name: string;
    email: string;
    picture?: string;
  }>>([]);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (count > 0) {
      loadReactionUsers();
    }
  }, [workoutId, count]);

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

  const loadReactionUsers = async () => {
    try {
      const users = await getReactionUsers(workoutId);
      setReactionUsers(users);
    } catch (error) {
      console.error('Failed to load reaction users:', error);
    }
  };

  if (count === 0) {
    return null;
  }

  const DefaultAvatar = ({ name, size = 'w-6 h-6' }: { name?: string; size?: string }) => (
    <div className={`${size} rounded-full bg-gradient-to-br from-cf-red to-cf-red-hover flex items-center justify-center border border-white`}>
      <span className="text-white text-xs font-bold">
        {name?.[0]?.toUpperCase() || '?'}
      </span>
    </div>
  );

  // Show up to 3 stacked avatars, then a count
  const displayUsers = reactionUsers.slice(0, 3);
  const remainingCount = Math.max(0, count - 3);

  return (
    <div className="relative inline-flex items-center" ref={tooltipRef}>
      <div
        className="flex items-center -space-x-2 cursor-pointer"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {displayUsers.map((user, index) => (
          <div
            key={user.id}
            className="relative z-10 border-2 border-white rounded-full"
            style={{ zIndex: 10 - index }}
          >
            {user.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <DefaultAvatar name={user.name} />
            )}
          </div>
        ))}
        {remainingCount > 0 && (
          <div className="relative z-0 border-2 border-white rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-xs font-semibold text-gray-700 px-1">
              +{remainingCount}
            </span>
          </div>
        )}
      </div>
      <span className="ml-2 text-sm text-gray-600">
        {count === 1 ? '1 fist' : `${count} fists`}
      </span>

      {/* Tooltip showing all users who reacted */}
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
                  <DefaultAvatar name={user.name} size="w-5 h-5" />
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

