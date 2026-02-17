export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        {/* Spinner */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-indigo-200 dark:border-indigo-900 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin"></div>
        </div>
        
        {/* Text */}
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
          Loading Dashboard
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Preparing your bookmarks...
        </p>
      </div>
    </div>
  );
}
