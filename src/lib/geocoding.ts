export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    )
    const data = await res.json() as { display_name?: string }
    return data.display_name ?? ''
  } catch {
    return ''
  }
}

export async function forwardGeocode(query: string): Promise<{ lat: number; lng: number; address: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
    )
    const data = await res.json() as { lat: string; lon: string; display_name: string }[]
    if (!data[0]) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), address: data[0].display_name }
  } catch {
    return null
  }
}
