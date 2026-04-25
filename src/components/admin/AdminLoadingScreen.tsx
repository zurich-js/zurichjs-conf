/**
 * Shared Admin Loading Screen
 * Consistent full-page loading state for all admin pages
 */

export function AdminLoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-text-brand-gray-lightest flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
        <p className="text-lg font-medium text-black">Loading...</p>
      </div>
    </div>
  );
}
