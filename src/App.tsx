import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from './hooks/useAuth';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import WorkoutsPage from './pages/WorkoutsPage';
import UploadPage from './pages/UploadPage';
import WorkoutDetailPage from './pages/WorkoutDetailPage';
import EditWorkoutPage from './pages/EditWorkoutPage';
import ProfilePage from './pages/ProfilePage';
import FriendsPage from './pages/FriendsPage';
import FeedPage from './pages/FeedPage';

// Dynamically determine base path based on current location
// If we're on GitHub Pages subdirectory, use that; otherwise use root
function getBasePath(): string {
  const pathname = window.location.pathname;
  // Check if we're on GitHub Pages subdirectory
  if (pathname.startsWith('/sam-fit/')) {
    return '/sam-fit';
  }
  // For custom domain or localhost, use root
  return '';
}

const BASENAME = getBasePath();

// Component to handle 404 redirects from GitHub Pages
function RedirectHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a stored redirect from 404.html
    const storedRoute = sessionStorage.getItem('githubPages404Redirect');
    if (storedRoute) {
      sessionStorage.removeItem('githubPages404Redirect');
      // Navigate to the stored route
      navigate(storedRoute, { replace: true });
    }
  }, [navigate]);

  return null;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={BASENAME}>
        <RedirectHandler />
        <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/workouts" element={<WorkoutsPage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/workout/:id" element={<WorkoutDetailPage />} />
              <Route path="/workout/:id/edit" element={<EditWorkoutPage />} />
              <Route path="/profile/:id" element={<ProfilePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/friends" element={<FriendsPage />} />
              <Route path="/feed" element={<FeedPage />} />
            </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

