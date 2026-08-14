import nodemailer from 'nodemailer'

// Envía un alerta al correo del restaurante cuando llega una reseña negativa (rating ≤ 3).
// Si las variables de entorno GMAIL_USER / GMAIL_APP_PASSWORD no están configuradas,
// omite el envío silenciosamente para no romper el flujo de la reseña.
export async function sendBadReviewEmail(review: {
  customerName: string
  rating: number
  comment: string
}) {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) {
    console.warn('[email] Not configured, skipping')
    return
  }
  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } })
  await transporter.sendMail({
    from: user,
    to: process.env.REVIEW_EMAIL ?? user,
    subject: `⭐${review.rating}/5 — Reseña negativa de ${review.customerName}`,
    html: `<h2>Reseña negativa recibida</h2><p><b>Cliente:</b> ${review.customerName}</p><p><b>Calificación:</b> ${'⭐'.repeat(review.rating)} (${review.rating}/5)</p><p><b>Comentario:</b></p><blockquote style="border-left:4px solid #e53e3e;padding-left:12px;color:#555">${review.comment}</blockquote>`,
  })
}
