'use client'

import dynamic from 'next/dynamic'
import type { PetWithPhotos } from '@/lib/types'

interface Props {
  pets: PetWithPhotos[]
  defaultCenter?: [number, number]
  defaultZoom?: number
  interactive?: boolean
}

export default function MapView({
  pets,
  defaultCenter = [52.2297, 21.0122],
  defaultZoom = 12,
  interactive = true,
}: Props) {
  return <LeafletMap pets={pets} defaultCenter={defaultCenter} defaultZoom={defaultZoom} interactive={interactive} />
}

const LeafletMap = dynamic(() => import('@/components/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full flex-1 min-h-[400px] bg-gray-100 dark:bg-gray-800 animate-pulse" />
  ),
})
