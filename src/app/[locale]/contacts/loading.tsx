export default function ContactsLoading() {
  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-8 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-xl mb-2" />
      <div className="h-4 w-64 bg-gray-100 dark:bg-gray-800 rounded-lg mb-8" />
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 mb-3">
          <div className="flex gap-2 mb-2">
            <div className="h-5 w-20 bg-gray-100 dark:bg-gray-800 rounded-full" />
            <div className="h-5 w-16 bg-gray-100 dark:bg-gray-800 rounded-full" />
          </div>
          <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg mb-1" />
          <div className="h-4 w-32 bg-gray-100 dark:bg-gray-800 rounded-lg" />
        </div>
      ))}
    </div>
  )
}
