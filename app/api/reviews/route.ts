import { NextRequest } from 'next/server'
import { getAllReviews, getPublishedReviews, createReview } from '@/lib/reviewDb'
import { verifySession } from '@/lib/auth'
import { sendBadReviewEmail } from '@/lib/email'

// GET: el admin puede ver todas las reseñas con ?all=1; el público solo ve las publicadas.
export async function GET(req: NextRequest) {
  const isAdmin = verifySession(req.cookies.get('admin_session')?.value)
  const all = req.nextUrl.searchParams.get('all') === '1'
  return Response.json(isAdmin && all ? await getAllReviews() : await getPublishedReviews())
}

// POST: público (cualquier cliente puede dejar una reseña).
// Si la reseña es negativa, se dispara el email de alerta de forma asíncrona (no bloquea la respuesta).
export async function POST(req: NextRequest) {
  const data = await req.json()
  if (!data.customerName?.trim() || !data.comment?.trim() || !data.rating)
    return Response.json({ error: 'Datos incompletos' }, { status: 400 })
  const review = await createReview({
    customerName: data.customerName.trim(),
    rating: Number(data.rating),
    comment: data.comment.trim(),
  })
  if (review.bad) {
    sendBadReviewEmail(review).catch(e => console.error('[email]', e))
  }
  return Response.json(review, { status: 201 })
}
