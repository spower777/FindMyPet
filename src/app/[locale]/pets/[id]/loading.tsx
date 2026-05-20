export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-6 animate-pulse space-y-4">
      <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-3xl" />
      <div className="space-y-3">
        <div className="h-7 bg-gray-100 dark:bg-gray-800 rounded-xl w-3/4" />
        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-xl w-1/2" />
        <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      </div>
      <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-3xl" />
    </div>
  )
}
