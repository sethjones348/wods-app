import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { user, isAuthenticated, logout } = useAuth();
    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const isActive = (path: string) => location.pathname === path;

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
                ? 'bg-white shadow-md'
                : 'bg-white/95 backdrop-blur-sm'
                }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    <Link to="/" className="flex items-center">
                        <span className="text-2xl font-heading font-bold text-black">
                            WODs<span className="text-cf-red">App</span>
                        </span>
                    </Link>

                    <div className="hidden md:flex items-center space-x-8">
                        <Link
                            to="/"
                            className={`text-sm font-semibold uppercase tracking-wider transition-colors ${isActive('/')
                                ? 'text-cf-red'
                                : 'text-black hover:text-cf-red'
                                }`}
                        >
                            Home
                        </Link>
                        <Link
                            to="/workouts"
                            className={`text-sm font-semibold uppercase tracking-wider transition-colors ${isActive('/workouts')
                                ? 'text-cf-red'
                                : 'text-black hover:text-cf-red'
                                }`}
                        >
                            Workouts
                        </Link>
                        <Link
                            to="/upload"
                            className={`text-sm font-semibold uppercase tracking-wider transition-colors ${isActive('/upload')
                                ? 'text-cf-red'
                                : 'text-black hover:text-cf-red'
                                }`}
                        >
                            Upload
                        </Link>
                        <Link
                            to="/friends"
                            className={`text-sm font-semibold uppercase tracking-wider transition-colors ${isActive('/friends')
                                ? 'text-cf-red'
                                : 'text-black hover:text-cf-red'
                                }`}
                        >
                            Friends
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 text-black hover:text-cf-red transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        aria-label="Toggle menu"
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            {mobileMenuOpen ? (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            ) : (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 6h16M4 12h16M4 18h16"
                                />
                            )}
                        </svg>
                    </button>

                    <div className="hidden md:flex items-center space-x-4">
                        {isAuthenticated && user ? (
                            <>
                                <Link
                                    to="/profile"
                                    className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
                                >
                                    {user.picture ? (
                                        <img
                                            src={user.picture}
                                            alt={user.name}
                                            className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cf-red to-cf-red-hover flex items-center justify-center border-2 border-gray-200">
                                            <span className="text-white text-sm font-bold">
                                                {user.name?.[0]?.toUpperCase() || '?'}
                                            </span>
                                        </div>
                                    )}
                                </Link>
                                <button
                                    onClick={logout}
                                    className="text-sm font-semibold uppercase tracking-wider text-black hover:text-cf-red transition-colors"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <span className="text-sm text-gray-600">Not signed in</span>
                        )}
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-gray-200 py-4">
                        <div className="flex flex-col space-y-4">
                            <Link
                                to="/"
                                onClick={() => setMobileMenuOpen(false)}
                                className={`px-4 py-2 text-sm font-semibold uppercase tracking-wider transition-colors ${isActive('/')
                                    ? 'text-cf-red'
                                    : 'text-black hover:text-cf-red'
                                    }`}
                            >
                                Home
                            </Link>
                            <Link
                                to="/workouts"
                                onClick={() => setMobileMenuOpen(false)}
                                className={`px-4 py-2 text-sm font-semibold uppercase tracking-wider transition-colors ${isActive('/workouts')
                                    ? 'text-cf-red'
                                    : 'text-black hover:text-cf-red'
                                    }`}
                            >
                                Workouts
                            </Link>
                            <Link
                                to="/upload"
                                onClick={() => setMobileMenuOpen(false)}
                                className={`px-4 py-2 text-sm font-semibold uppercase tracking-wider transition-colors ${isActive('/upload')
                                    ? 'text-cf-red'
                                    : 'text-black hover:text-cf-red'
                                    }`}
                            >
                                Upload
                            </Link>
                            <Link
                                to="/friends"
                                onClick={() => setMobileMenuOpen(false)}
                                className={`px-4 py-2 text-sm font-semibold uppercase tracking-wider transition-colors ${isActive('/friends')
                                    ? 'text-cf-red'
                                    : 'text-black hover:text-cf-red'
                                    }`}
                            >
                                Friends
                            </Link>
                            {isAuthenticated && user && (
                                <div className="px-4 py-2 border-t border-gray-200 mt-2">
                                    <Link
                                        to="/profile"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center space-x-3 mb-3 hover:opacity-80 transition-opacity"
                                    >
                                        {user.picture ? (
                                            <img
                                                src={user.picture}
                                                alt={user.name}
                                                className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cf-red to-cf-red-hover flex items-center justify-center border-2 border-gray-200">
                                                <span className="text-white text-sm font-bold">
                                                    {user.name?.[0]?.toUpperCase() || '?'}
                                                </span>
                                            </div>
                                        )}
                                        <span className="text-sm font-semibold">{user.name}</span>
                                    </Link>
                                    <button
                                        onClick={() => {
                                            logout();
                                            setMobileMenuOpen(false);
                                        }}
                                        className="w-full text-left px-0 py-2 text-sm font-semibold uppercase tracking-wider text-black hover:text-cf-red transition-colors"
                                    >
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}

