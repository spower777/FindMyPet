import webpush from 'web-push'

const RADIUS_KM = 10

function getWebPush() {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
  return webpush
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function sendPetAlert(
  petLat: number,
  petLng: number,
  payload: { title: string; body: string; url: string }
) {
  const { createAdminClient } = await import('@/lib/supabase/server')
  const supabase = createAdminClient()

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')
    .not('lat', 'is', null)
    .not('lng', 'is', null)

  if (!subscriptions?.length) return

  const nearby = subscriptions.filter(
    sub => haversineKm(petLat, petLng, sub.lat!, sub.lng!) <= RADIUS_KM
  )

  const wp = getWebPush()
  const results = await Promise.allSettled(
    nearby.map(sub =>
      wp.sendNotification(sub.subscription, JSON.stringify(payload))
    )
  )

  const expired = nearby.filter((_, i) => results[i].status === 'rejected')
  if (expired.length) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('id', expired.map(s => s.id))
  }
}
