export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-8 space-y-8 animate-pulse">
      <div className="flex items-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-6 bg-gray-100 dark:bg-gray-800 rounded-xl w-48" />
          <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-xl w-36" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-3xl" />
        ))}
      </div>
      <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
      ))}
    </div>
  )
}
