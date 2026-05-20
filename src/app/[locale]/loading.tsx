export default function Loading() {
  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Map placeholder */}
      <div className="lg:flex-1 h-[50vh] lg:h-auto bg-gray-100 dark:bg-gray-800 animate-pulse" />

      {/* Sidebar */}
      <div className="w-full lg:w-96 flex flex-col bg-white dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            <div className="flex gap-2">
              <div className="h-5 w-16 bg-red-100 dark:bg-red-950 rounded-full animate-pulse" />
              <div className="h-5 w-16 bg-green-100 dark:bg-green-950 rounded-full animate-pulse" />
            </div>
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex-1 h-8 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
          <div className="flex gap-2">
            <div className="flex-1 h-8 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            <div className="flex-1 h-8 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-4 grid grid-cols-1 gap-3">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-pulse" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="h-40 bg-gray-100 dark:bg-gray-800" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-3 w-1/2 bg-gray-100 dark:bg-gray-800 rounded" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
