import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-cf-dark text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="font-heading text-lg font-bold mb-4 uppercase tracking-wider">
              About
            </h3>
            <p className="text-gray-400 text-sm">
              Track your workouts by uploading photos of your whiteboard. 
              Powered by AI to extract and organize your fitness data.
            </p>
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold mb-4 uppercase tracking-wider">
              Quick Links
            </h3>
            <ul className="space-y-2">
              <li>
                <a href="/" className="text-gray-400 hover:text-cf-red transition-colors text-sm">
                  Home
                </a>
              </li>
              <li>
                <a href="/workouts" className="text-gray-400 hover:text-cf-red transition-colors text-sm">
                  Workouts
                </a>
              </li>
              <li>
                <a href="/upload" className="text-gray-400 hover:text-cf-red transition-colors text-sm">
                  Upload
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold mb-4 uppercase tracking-wider">
              Support
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              For questions or issues, check the documentation or open an issue on GitHub.
            </p>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy" className="text-gray-400 hover:text-cf-red transition-colors text-sm">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-8 text-center">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} WODsApp. All rights reserved.
          </p>
          <p className="text-gray-500 text-xs mt-2">
            <Link to="/privacy" className="hover:text-cf-red transition-colors">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}

