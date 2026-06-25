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
    <div className="overflow-hidden relative h-14 flex items-center select-none bg-gradient-to-r from-orange-950 via-gray-950 to-orange-950 dark:from-orange-950 dark:via-black dark:to-orange-950 border-y border-orange-900/60">
      {/* edge fade */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-orange-950 dark:from-black to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-orange-950 dark:from-black to-transparent z-10 pointer-events-none" />
      <div className="animate-marquee whitespace-nowrap flex items-center shrink-0">
        <span className="font-mono text-sm font-bold tracking-widest text-orange-300 drop-shadow-[0_0_8px_rgba(251,146,60,0.6)]">
          {doubled}
        </span>
      </div>
    </div>
  )
}
