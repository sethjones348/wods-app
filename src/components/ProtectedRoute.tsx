import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useState, useEffect } from 'react';
import { isAdmin } from '../services/adminService';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const [adminStatus, setAdminStatus] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!requireAdmin || !isAuthenticated) {
        setIsChecking(false);
        return;
      }

      try {
        const userIsAdmin = await isAdmin();
        setAdminStatus(userIsAdmin);
      } catch (error) {
        console.error('Failed to check admin status:', error);
        setAdminStatus(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAdminStatus();
  }, [isAuthenticated, requireAdmin]);

  // Show loading state while checking authentication/admin status
  if (!isAuthenticated || (requireAdmin && isChecking)) {
    if (!isAuthenticated) {
      return <Navigate to="/" replace />;
    }
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cf-red mb-4"></div>
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if admin is required but user is not admin
  if (requireAdmin && adminStatus === false) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h1 className="text-2xl font-heading font-bold text-red-800 mb-2">Access Denied</h1>
            <p className="text-red-700">
              You do not have permission to access this page. Admin privileges are required.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

