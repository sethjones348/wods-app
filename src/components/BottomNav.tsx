import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '';
    }
    return location.pathname.startsWith(path);
  };

  const navItems = [
    {
      path: '/',
      label: 'Home',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      path: '/workouts',
      label: 'Workouts',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      path: '/upload',
      label: 'Upload',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      isPrimary: true, // Make this button stand out like Strava's Record button
    },
    {
      path: '/friends',
      label: 'Friends',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      path: '/profile',
      label: 'You',
      icon: user?.picture ? (
        <img
          src={user.picture}
          alt={user.name || 'Profile'}
          className="w-6 h-6 rounded-full object-cover border border-gray-300"
        />
      ) : (
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cf-red to-cf-red-hover flex items-center justify-center border border-gray-300">
          <span className="text-white text-xs font-bold">
            {user?.name?.[0]?.toUpperCase() || '?'}
          </span>
        </div>
      ),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const isPrimary = (item as any).isPrimary;
          
          if (isPrimary) {
            // Special styling for the Upload/Record button (like Strava)
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center justify-center flex-1 min-w-0 px-1 py-1 transition-colors"
              >
                <div className={`mb-0.5 w-10 h-10 rounded-full flex items-center justify-center ${
                  active 
                    ? 'bg-cf-red text-white' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {item.icon}
                </div>
                <span className={`text-xs font-medium truncate w-full text-center ${
                  active ? 'text-cf-red' : 'text-gray-600'
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          }
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 min-w-0 px-1 py-1 transition-colors ${
                active ? 'text-cf-red' : 'text-gray-600'
              }`}
            >
              <div className={`mb-0.5 ${active ? 'text-cf-red' : 'text-gray-600'}`}>
                {item.icon}
              </div>
              <span className={`text-xs font-medium truncate w-full text-center ${active ? 'text-cf-red' : 'text-gray-600'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

