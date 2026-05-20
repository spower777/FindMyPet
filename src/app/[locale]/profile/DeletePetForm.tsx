'use client'

export default function DeletePetForm({
  petId,
  deletePetAction,
}: {
  petId: string
  deletePetAction: (petId: string) => Promise<void>
}) {
  return (
    <form action={deletePetAction.bind(null, petId)} className="flex-1 border-l border-gray-100">
      <button
        type="submit"
        className="w-full text-xs text-red-400 hover:bg-red-50 py-2.5 transition font-medium"
        onClick={e => {
          if (!confirm('Usunąć to zgłoszenie?')) e.preventDefault()
        }}
      >
        Usuń
      </button>
    </form>
  )
}
