import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://findmypet-kohl.vercel.app'
const FROM = 'FindMyPet <onboarding@resend.dev>'

interface MatchEmailParams {
  toEmail: string
  ownerPetName: string
  ownerPetType: 'lost' | 'found'
  ownerPetSpecies: string
  matchedPetName: string
  matchedPetSpecies: string
  similarityScore: number
  reasoning: string
  petUrl: string
  matchPhotoUrl?: string | null
}

export async function sendMatchEmail(params: MatchEmailParams) {
  if (!process.env.RESEND_API_KEY) return

  const score = Math.round(params.similarityScore * 100)
  const action = params.ownerPetType === 'lost' ? 'Znaleziono potencjalnego pupila!' : 'Twój znaleziony zwierzak może mieć właściciela!'
  const petLabel = params.ownerPetType === 'lost' ? 'zaginionego' : 'znalezionego'

  const html = `
<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
    <!-- Header -->
    <div style="background:#f97316;padding:24px;text-align:center">
      <p style="margin:0;font-size:32px">🐾</p>
      <h1 style="margin:8px 0 0;color:#fff;font-size:20px;font-weight:700">FindMyPet</h1>
    </div>

    <!-- Body -->
    <div style="padding:32px 24px">
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827">${action}</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px">
        AI porównała zdjęcia i znalazła możliwe dopasowanie dla Twojego ${petLabel} zwierzaka
        <strong>${params.ownerPetName}</strong>.
      </p>

      <!-- Score -->
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px;margin-bottom:24px;text-align:center">
        <p style="margin:0;font-size:32px;font-weight:800;color:#f97316">${score}%</p>
        <p style="margin:4px 0 0;font-size:13px;color:#92400e">podobieństwo wg AI</p>
        ${params.reasoning ? `<p style="margin:12px 0 0;font-size:13px;color:#78716c;font-style:italic">"${params.reasoning}"</p>` : ''}
      </div>

      ${params.matchPhotoUrl ? `
      <div style="text-align:center;margin-bottom:24px">
        <img src="${params.matchPhotoUrl}" alt="Dopasowane zwierzę" style="width:100%;max-width:300px;height:200px;object-fit:cover;border-radius:12px;border:1px solid #e5e7eb"/>
        <p style="margin:8px 0 0;font-size:13px;color:#6b7280">Dopasowane zwierzę: ${params.matchedPetName}</p>
      </div>` : ''}

      <a href="${APP_URL}${params.petUrl}"
         style="display:block;background:#f97316;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 24px;border-radius:12px;text-align:center">
        Zobacz dopasowanie →
      </a>
    </div>

    <!-- Footer -->
    <div style="padding:16px 24px;border-top:1px solid #f3f4f6;text-align:center">
      <p style="margin:0;font-size:12px;color:#9ca3af">
        FindMyPet — społecznościowa mapa zagubionych zwierząt<br>
        <a href="${APP_URL}" style="color:#f97316;text-decoration:none">findmypet-kohl.vercel.app</a>
      </p>
    </div>
  </div>
</body>
</html>`

  await resend.emails.send({
    from: FROM,
    to: params.toEmail,
    subject: `🐾 ${action} (${score}% podobieństwo)`,
    html,
  })
}
