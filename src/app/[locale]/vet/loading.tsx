export default function VetLoading() {
  return (
    <div className="max-w-xl mx-auto w-full px-4 py-8 animate-pulse">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
        <div className="h-7 w-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-5 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
          <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 w-20 bg-gray-100 dark:bg-gray-800 rounded-xl" />
          ))}
        </div>
        <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
          <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
        </div>
        <div className="h-14 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
      </div>
    </div>
  )
}
