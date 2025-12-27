import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex flex-col">
      {/* Optional subtle background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.08)_0%,transparent_50%)] pointer-events-none" />

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 text-center gap-8 md:gap-12 z-10">
        {/* Logo / Brand */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              AI Search Engine
            </span>
          </h1>

          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover smarter answers with the power of next-generation AI search
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mt-4">
          <Link
            to="/login"
            className="group relative inline-flex items-center justify-center px-8 py-4 
                     text-lg font-semibold text-white bg-blue-600 rounded-xl 
                     shadow-lg shadow-blue-200/50 hover:shadow-xl hover:shadow-blue-300/50 
                     transition-all duration-300 hover:-translate-y-0.5 focus:outline-none 
                     focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Sign In
            <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
          </Link>

          <Link
            to="/signup"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold 
                     text-blue-700 bg-white border-2 border-blue-200 rounded-xl 
                     hover:bg-blue-50 hover:border-blue-300 transition-all duration-300 
                     hover:-translate-y-0.5 focus:outline-none focus:ring-2 
                     focus:ring-blue-400 focus:ring-offset-2"
          >
            Create Account
          </Link>
        </div>

        {/* Optional subtle trust signals / features */}
        <div className="mt-8 text-sm text-gray-500 flex flex-wrap justify-center gap-x-8 gap-y-2">
          <span>Fast • Accurate • Private</span>
          <span>Powered by AI</span>
          <span>Free to start</span>
        </div>
      </main>

      {/* Optional footer */}
      <footer className="py-8 text-center text-sm text-gray-500">
        <p>© {new Date().getFullYear()} AI Search Engine • All rights reserved</p>
      </footer>
    </div>
  );
}