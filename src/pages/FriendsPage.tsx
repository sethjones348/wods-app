import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  sendFriendRequest,
  getPendingFriendRequests,
  getSentFriendRequests,
  acceptFriendRequest,
  declineFriendRequest,
  getFollowing,
  unfollowUser,
  FriendRequest,
  Follow,
} from '../services/friendService';

export default function FriendsPage() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'invite' | 'pending' | 'sent' | 'following'>('invite');
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [following, setFollowing] = useState<Follow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all counts on mount to show accurate tab counts
  useEffect(() => {
    if (!isAuthenticated) return;
    loadAllCounts();
  }, [isAuthenticated]);

  // Load data for the active tab when it changes
  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeTab !== 'invite') {
      loadData();
    }
  }, [isAuthenticated, activeTab]);

  // Load all counts in parallel to populate tab badges
  const loadAllCounts = async () => {
    try {
      const [pending, sent, followingData] = await Promise.all([
        getPendingFriendRequests(),
        getSentFriendRequests(),
        getFollowing(),
      ]);
      setPendingRequests(pending || []);
      setSentRequests(sent || []);
      setFollowing(followingData || []);
    } catch (err) {
      // Silently fail for counts - don't show error, just leave arrays empty
      console.error('Failed to load friend counts:', err);
    }
  };

  const loadData = async () => {
    // For invite tab, no data to load
    if (activeTab === 'invite') {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      if (activeTab === 'pending') {
        const requests = await getPendingFriendRequests();
        setPendingRequests(requests || []);
      } else if (activeTab === 'sent') {
        const requests = await getSentFriendRequests();
        setSentRequests(requests || []);
      } else if (activeTab === 'following') {
        const follows = await getFollowing();
        setFollowing(follows || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      // Set empty arrays on error to prevent infinite loading
      if (activeTab === 'pending') {
        setPendingRequests([]);
      } else if (activeTab === 'sent') {
        setSentRequests([]);
      } else if (activeTab === 'following') {
        setFollowing([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSending(true);
    setError(null);
    try {
      await sendFriendRequest(email);
      setEmail('');
      alert('Friend request sent!');
      // Refresh all counts to update tab badges
      await loadAllCounts();
      // Refresh sent requests if on that tab
      if (activeTab === 'sent') {
        loadData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send friend request');
    } finally {
      setIsSending(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    try {
      await acceptFriendRequest(requestId);
      await loadAllCounts(); // Update all counts
      await loadData(); // Refresh current tab data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept friend request');
    }
  };

  const handleDecline = async (requestId: string) => {
    try {
      await declineFriendRequest(requestId);
      await loadAllCounts(); // Update all counts
      await loadData(); // Refresh current tab data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline friend request');
    }
  };

  const handleUnfollow = async (followingId: string) => {
    if (!confirm('Are you sure you want to unfollow this user?')) return;
    try {
      await unfollowUser(followingId);
      await loadAllCounts(); // Update all counts
      await loadData(); // Refresh current tab data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unfollow user');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
          <p className="text-gray-600">You need to be signed in to manage friends.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen md:pt-20 md:pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-heading font-bold mb-6">Friends</h1>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('invite')}
            className={`pb-2 px-4 font-semibold uppercase tracking-wider text-sm transition-colors ${
              activeTab === 'invite'
                ? 'text-cf-red border-b-2 border-cf-red'
                : 'text-gray-600 hover:text-cf-red'
            }`}
          >
            Invite Friend
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-2 px-4 font-semibold uppercase tracking-wider text-sm transition-colors ${
              activeTab === 'pending'
                ? 'text-cf-red border-b-2 border-cf-red'
                : 'text-gray-600 hover:text-cf-red'
            }`}
          >
            Pending ({pendingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`pb-2 px-4 font-semibold uppercase tracking-wider text-sm transition-colors ${
              activeTab === 'sent'
                ? 'text-cf-red border-b-2 border-cf-red'
                : 'text-gray-600 hover:text-cf-red'
            }`}
          >
            Sent ({sentRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`pb-2 px-4 font-semibold uppercase tracking-wider text-sm transition-colors ${
              activeTab === 'following'
                ? 'text-cf-red border-b-2 border-cf-red'
                : 'text-gray-600 hover:text-cf-red'
            }`}
          >
            Following ({following.length})
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
            {error}
          </div>
        )}

        {/* Invite Friend Tab */}
        {activeTab === 'invite' && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-heading font-bold mb-4">Invite a Friend</h2>
            <p className="text-gray-600 mb-4">
              Enter your friend's email address to send them a friend request. They'll be able to see your public workouts in their feed once they accept.
            </p>
            <form onSubmit={handleSendRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="friend@example.com"
                  required
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded focus:border-cf-red outline-none min-h-[44px]"
                />
              </div>
              <button
                type="submit"
                disabled={isSending || !email.trim()}
                className="bg-cf-red text-white px-6 py-2 rounded font-semibold uppercase tracking-wider hover:bg-cf-red-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {isSending ? 'Sending...' : 'Send Friend Request'}
              </button>
            </form>
          </div>
        )}

        {/* Pending Requests Tab */}
        {activeTab === 'pending' && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-heading font-bold mb-4">Pending Friend Requests</h2>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cf-red"></div>
                <p className="mt-2 text-gray-600">Loading...</p>
              </div>
            ) : pendingRequests.length === 0 ? (
              <p className="text-gray-600">No pending friend requests.</p>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      {request.fromUser?.picture ? (
                        <img
                          src={request.fromUser.picture}
                          alt={request.fromUser.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cf-red to-cf-red-hover flex items-center justify-center border-2 border-gray-200">
                          <span className="text-white text-sm font-bold">
                            {request.fromUser?.name?.[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-semibold">{request.fromUser?.name || request.fromUser?.email || 'Unknown User'}</p>
                        <p className="text-sm text-gray-600">{request.fromUser?.email || request.toEmail}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAccept(request.id)}
                        className="bg-cf-red text-white px-4 py-2 rounded font-semibold uppercase tracking-wider hover:bg-cf-red-hover transition-all min-h-[44px]"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleDecline(request.id)}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded font-semibold uppercase tracking-wider hover:bg-gray-300 transition-all min-h-[44px]"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sent Requests Tab */}
        {activeTab === 'sent' && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-heading font-bold mb-4">Sent Friend Requests</h2>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cf-red"></div>
                <p className="mt-2 text-gray-600">Loading...</p>
              </div>
            ) : sentRequests.length === 0 ? (
              <p className="text-gray-600">No sent friend requests.</p>
            ) : (
              <div className="space-y-4">
                {sentRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      {request.toUser?.picture ? (
                        <img
                          src={request.toUser.picture}
                          alt={request.toUser.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cf-red to-cf-red-hover flex items-center justify-center border-2 border-gray-200">
                          <span className="text-white text-sm font-bold">
                            {request.toUser?.name?.[0]?.toUpperCase() || request.toEmail?.[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-semibold">{request.toUser?.name || request.toEmail}</p>
                        <p className="text-sm text-gray-600">{request.toEmail}</p>
                        {request.toUser && (
                          <Link
                            to={`/profile/${request.toUser.id}`}
                            className="text-sm text-cf-red hover:underline"
                          >
                            View Profile
                          </Link>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-gray-600">Pending</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Following Tab */}
        {activeTab === 'following' && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-heading font-bold mb-4">Following</h2>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cf-red"></div>
                <p className="mt-2 text-gray-600">Loading...</p>
              </div>
            ) : following.length === 0 ? (
              <p className="text-gray-600">You're not following anyone yet.</p>
            ) : (
              <div className="space-y-4">
                {following.map((follow) => (
                  <div
                    key={follow.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      {follow.following?.picture ? (
                        <img
                          src={follow.following.picture}
                          alt={follow.following.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cf-red to-cf-red-hover flex items-center justify-center border-2 border-gray-200">
                          <span className="text-white text-sm font-bold">
                            {follow.following?.name?.[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                      )}
                      <div>
                        <Link
                          to={`/profile/${follow.followingId}`}
                          className="font-semibold hover:text-cf-red transition-colors"
                        >
                          {follow.following?.name || 'Unknown User'}
                        </Link>
                        <p className="text-sm text-gray-600">{follow.following?.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnfollow(follow.followingId)}
                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded font-semibold uppercase tracking-wider hover:bg-gray-300 transition-all min-h-[44px]"
                    >
                      Unfollow
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

