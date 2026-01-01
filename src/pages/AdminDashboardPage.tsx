import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { UserProfile } from '../services/userService';
import { getAllUsers, setUserAdminStatus } from '../services/adminService';
import { format } from 'date-fns';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAdmin, setFilterAdmin] = useState<'all' | 'admin' | 'non-admin'>('all');
  const [updatingUserIds, setUpdatingUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAdmin = async (userId: string, currentAdminStatus: boolean) => {
    setUpdatingUserIds(prev => new Set(prev).add(userId));
    try {
      await setUserAdminStatus(userId, !currentAdminStatus);
      // Reload users to get updated status
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update admin status');
      console.error('Failed to update admin status:', err);
    } finally {
      setUpdatingUserIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  // Filter users based on search query and admin filter
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.username && user.username.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter = 
      filterAdmin === 'all' ||
      (filterAdmin === 'admin' && user.is_admin) ||
      (filterAdmin === 'non-admin' && !user.is_admin);

    return matchesSearch && matchesFilter;
  });

  const adminCount = users.filter(u => u.is_admin).length;
  const nonAdminCount = users.length - adminCount;

  if (isLoading) {
    return (
      <div className="min-h-screen md:pt-20 md:pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cf-red mb-4"></div>
            <p className="text-lg text-gray-600">Loading users...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen md:pt-20 md:pb-12">
      <div className="max-w-7xl mx-auto px-0 md:px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-4 md:mb-8 px-4 md:px-0 bg-white md:bg-transparent border-b md:border-b-0 border-gray-200 md:border-0 py-3 md:py-0 sticky md:static top-0 z-30">
          <h1 className="text-xl md:text-3xl sm:text-4xl font-heading font-bold mb-3 md:mb-4">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 mb-4">
            Manage users and admin privileges. Total users: {users.length} ({adminCount} admins, {nonAdminCount} regular users)
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700 mx-4 md:mx-0">
            {error}
          </div>
        )}

        {/* Search and Filter */}
        <div className="mb-6 px-4 md:px-0">
          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
            {/* Search */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Users
              </label>
              <input
                type="text"
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or username..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cf-red focus:border-transparent"
              />
            </div>

            {/* Filter */}
            <div>
              <label htmlFor="filter" className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Admin Status
              </label>
              <select
                id="filter"
                value={filterAdmin}
                onChange={(e) => setFilterAdmin(e.target.value as 'all' | 'admin' | 'non-admin')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cf-red focus:border-transparent"
              >
                <option value="all">All Users</option>
                <option value="admin">Admins Only</option>
                <option value="non-admin">Regular Users Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="px-4 md:px-0">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        No users found matching your search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((profileUser) => {
                      const isCurrentUser = profileUser.id === user?.id;
                      const isUpdating = updatingUserIds.has(profileUser.id);

                      return (
                        <tr key={profileUser.id} className={isCurrentUser ? 'bg-blue-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {profileUser.picture ? (
                                <img
                                  className="h-10 w-10 rounded-full object-cover"
                                  src={profileUser.picture}
                                  alt={profileUser.name}
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                  <span className="text-gray-600 font-medium">
                                    {profileUser.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {profileUser.name}
                                  {isCurrentUser && (
                                    <span className="ml-2 text-xs text-blue-600 font-semibold">(You)</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{profileUser.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {profileUser.username ? `@${profileUser.username}` : '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {format(new Date(profileUser.created_at), 'MMM d, yyyy')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {profileUser.is_admin ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                Admin
                              </span>
                            ) : (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                User
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {isCurrentUser ? (
                              <span className="text-gray-400">Cannot change own status</span>
                            ) : (
                              <button
                                onClick={() => handleToggleAdmin(profileUser.id, profileUser.is_admin || false)}
                                disabled={isUpdating}
                                className={`${
                                  profileUser.is_admin
                                    ? 'text-red-600 hover:text-red-900'
                                    : 'text-green-600 hover:text-green-900'
                                } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                {isUpdating ? (
                                  <span className="inline-flex items-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                    Updating...
                                  </span>
                                ) : profileUser.is_admin ? (
                                  'Remove Admin'
                                ) : (
                                  'Make Admin'
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* User Count */}
          <div className="mt-4 text-sm text-gray-600 text-center">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </div>
      </div>
    </div>
  );
}

