export default function Loading() {
  return (
    <div className="flex-1 flex flex-col lg:flex-row animate-pulse">
      {/* Map skeleton */}
      <div className="lg:flex-1 h-[50vh] lg:h-auto bg-gray-100 dark:bg-gray-800" />
      {/* Sidebar skeleton */}
      <div className="w-full lg:w-96 bg-white dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800 p-4 space-y-3">
        <div className="h-5 bg-gray-100 dark:bg-gray-800 rounded-xl w-40" />
        <div className="h-9 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-3xl" />
        ))}
      </div>
    </div>
  )
}
