import PetForm from '@/components/PetForm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Zgłoś zagubione zwierzę — FindMyPet',
}

export default function ReportLostPage() {
  return (
    <div className="max-w-xl mx-auto w-full px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🔴 Zgłoś zagubione zwierzę</h1>
        <p className="text-gray-500 text-sm mt-1">
          Wypełnij formularz — AI automatycznie porówna ze znalezionymi i wyśle alert do osób w pobliżu.
        </p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <PetForm type="lost" />
      </div>
    </div>
  )
}
