export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-8 animate-pulse">
      <div className="h-7 bg-gray-100 dark:bg-gray-800 rounded-xl w-36 mb-6" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
