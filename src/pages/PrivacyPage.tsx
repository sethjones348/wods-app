export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8 md:p-12">
        <h1 className="text-4xl font-bold mb-8 text-gray-900">Privacy Policy</h1>
        
        <div className="prose prose-lg max-w-none">
          <p className="text-gray-600 mb-6">
            <strong>Last updated:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">1. Introduction</h2>
            <p className="text-gray-700 mb-4">
              Welcome to WODsApp ("we," "our," or "us"). We are committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
              when you use our workout tracking application.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold mb-3 text-gray-800 mt-6">2.1 Authentication Information</h3>
            <p className="text-gray-700 mb-4">
              When you sign in with Google, we collect:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>Email address</li>
              <li>Name</li>
              <li>Profile picture</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-gray-800 mt-6">2.2 Profile Information</h3>
            <p className="text-gray-700 mb-4">
              You may optionally provide:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>Bio or personal description</li>
              <li>Box name (gym/affiliate name)</li>
              <li>Fitness level</li>
              <li>Favorite movements</li>
              <li>Personal records (PRs)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-gray-800 mt-6">2.3 Workout Data</h3>
            <p className="text-gray-700 mb-4">
              When you upload workout photos, we collect and store:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>Workout photos you upload</li>
              <li>Extracted workout text and data (movements, times, reps, rounds)</li>
              <li>Workout dates and metadata</li>
              <li>Workout privacy settings (public or private)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-gray-800 mt-6">2.4 Social Features</h3>
            <p className="text-gray-700 mb-4">
              If you use social features, we collect:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>Friend/follow relationships</li>
              <li>Comments on workouts</li>
              <li>Reactions to workouts</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">3. How We Use Your Information</h2>
            <p className="text-gray-700 mb-4">We use the information we collect to:</p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>Provide and maintain our workout tracking service</li>
              <li>Process and store your workout data</li>
              <li>Enable social features (friends, comments, reactions) based on your privacy settings</li>
              <li>Improve our AI extraction capabilities</li>
              <li>Respond to your requests and provide customer support</li>
              <li>Send you notifications related to your account (if enabled)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">4. Data Storage</h2>
            <p className="text-gray-700 mb-4">
              Your data is stored securely using Supabase, a third-party database and storage service. 
              We use industry-standard security measures to protect your information. Your workout photos 
              and data are stored in Supabase's secure cloud infrastructure.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">5. Data Sharing and Disclosure</h2>
            <p className="text-gray-700 mb-4">
              We respect your privacy settings:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li><strong>Public workouts:</strong> If you set a workout to "public," it may be visible to users who follow you</li>
              <li><strong>Private workouts:</strong> Private workouts are only visible to you</li>
              <li><strong>Profile information:</strong> Your profile information (name, picture, bio) may be visible to other users based on your settings</li>
              <li>We do not sell your personal information to third parties</li>
              <li>We may disclose information if required by law or to protect our rights</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">6. Your Rights and Choices</h2>
            <p className="text-gray-700 mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>Access your personal data</li>
              <li>Update or correct your profile information</li>
              <li>Delete your account and all associated data</li>
              <li>Control workout privacy settings (public/private)</li>
              <li>Opt out of certain features or notifications</li>
            </ul>
            <p className="text-gray-700 mb-4">
              To exercise these rights, please contact us using the information provided below or use the 
              account settings in the app.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">7. Third-Party Services</h2>
            <p className="text-gray-700 mb-4">
              Our service uses the following third-party services:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li><strong>Google OAuth:</strong> For authentication. Google's privacy policy applies to authentication data.</li>
              <li><strong>Supabase:</strong> For data storage and backend services. Supabase's privacy policy applies to stored data.</li>
              <li><strong>Google Gemini API:</strong> For AI-powered workout text extraction. Data sent to Gemini is processed according to Google's privacy policies.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">8. Data Security</h2>
            <p className="text-gray-700 mb-4">
              We implement appropriate technical and organizational measures to protect your personal information. 
              However, no method of transmission over the internet or electronic storage is 100% secure. 
              While we strive to use commercially acceptable means to protect your data, we cannot guarantee 
              absolute security.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">9. Children's Privacy</h2>
            <p className="text-gray-700 mb-4">
              Our service is not intended for children under the age of 13. We do not knowingly collect 
              personal information from children under 13. If you are a parent or guardian and believe your 
              child has provided us with personal information, please contact us.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">10. Changes to This Privacy Policy</h2>
            <p className="text-gray-700 mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any changes by 
              posting the new Privacy Policy on this page and updating the "Last updated" date. You are 
              advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">11. Contact Us</h2>
            <p className="text-gray-700 mb-4">
              If you have any questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <p className="text-gray-700">
              Email: <a href="mailto:support@wodsapp.online" className="text-cf-red hover:underline">support@wodsapp.online</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

