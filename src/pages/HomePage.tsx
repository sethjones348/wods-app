import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function LoginButton() {
  const { login } = useAuth();
  return (
    <button
      onClick={login}
      className="bg-cf-red text-white px-6 sm:px-8 py-3 sm:py-4 rounded font-semibold uppercase tracking-wider hover:bg-cf-red-hover transition-all hover:-translate-y-1 hover:shadow-lg min-h-[44px]"
    >
      Sign In with Google
    </button>
  );
}

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div>
      {/* Hero Section */}
      <section className="min-h-[600px] flex items-center justify-center bg-gradient-to-br from-cf-dark to-black text-white pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-heading font-bold mb-6 uppercase tracking-tight">
            Track Your Workouts
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-gray-300 max-w-2xl mx-auto">
            Upload a photo of your whiteboard and let AI extract your workout data. 
            Search, organize, and track your fitness journey.
          </p>
          {isAuthenticated ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/upload"
                className="bg-cf-red text-white px-6 sm:px-8 py-3 sm:py-4 rounded font-semibold uppercase tracking-wider hover:bg-cf-red-hover transition-all hover:-translate-y-1 hover:shadow-lg text-center"
              >
                Upload Workout
              </Link>
              <Link
                to="/workouts"
                className="bg-transparent border-2 border-white text-white px-6 sm:px-8 py-3 sm:py-4 rounded font-semibold uppercase tracking-wider hover:bg-white hover:text-black transition-all text-center"
              >
                View Workouts
              </Link>
            </div>
          ) : (
            <LoginButton />
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-heading font-bold text-center mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-cf-red rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📸</span>
              </div>
              <h3 className="text-xl font-heading font-bold mb-2">1. Upload Photo</h3>
              <p className="text-gray-600">
                Take a picture of your whiteboard workout and upload it to the app.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-cf-red rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-xl font-heading font-bold mb-2">2. AI Extraction</h3>
              <p className="text-gray-600">
                Our AI automatically extracts movements, rounds, times, and reps from your photo.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-cf-red rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-heading font-bold mb-2">3. Track & Search</h3>
              <p className="text-gray-600">
                Review, edit if needed, and save. Search your workout history by movement or exercise.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

