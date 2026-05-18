import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FindMyPet',
    short_name: 'FindMyPet',
    description: 'Mapa zagubionych i znalezionych zwierząt w Twojej okolicy',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#f97316',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
