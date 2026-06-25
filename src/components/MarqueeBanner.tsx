const ITEMS = [
  '🐾 Znajdź zaginionego pupila',
  '📡 PetRadar aktywny w całej Polsce',
  '💬 Skontaktuj się z właścicielem',
  '🔖 Chip & QR — profil w jednym miejscu',
  '🤖 Dopasowanie AI — znajdziemy podobne zgłoszenia',
  '🗺️ Mapa zaginięć i znalezień w czasie rzeczywistym',
  '📸 Dodaj zdjęcie — zwiększ szanse na odnalezienie',
]

export default function MarqueeBanner() {
  const text = ITEMS.join('   ·   ')
  const doubled = `${text}   ·   ${text}   ·   `

  return (
    <div className="overflow-hidden bg-gray-900 dark:bg-black border-y border-gray-800 dark:border-gray-900 h-10 flex items-center select-none">
      <div className="animate-marquee whitespace-nowrap flex items-center shrink-0">
        <span className="font-mono text-xs font-semibold tracking-wide text-orange-400/90">
          {doubled}
        </span>
      </div>
    </div>
  )
}
