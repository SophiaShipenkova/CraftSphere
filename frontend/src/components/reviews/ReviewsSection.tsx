import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ThumbsDown, ThumbsUp } from 'lucide-react'

import { api, Review, ReviewsResponse } from '../../shared/api'
import { StarRating } from '../ui/StarRating'
import { useAuthStore } from '../../store/auth'

type Props = {
  kind: 'product' | 'service'
  entityId: number
}

export function ReviewsSection({ kind, entityId }: Props) {
  const token = useAuthStore((s) => s.token)
  const [data, setData] = useState<ReviewsResponse | null>(null)
  const [rating, setRating] = useState(5)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    const fetcher = kind === 'product' ? api.productReviews(entityId) : api.serviceReviews(entityId)
    fetcher.then(setData).catch(console.error)
  }, [kind, entityId])

  useEffect(() => {
    load()
  }, [load])

  const hasMyReview = Boolean(data?.items.some((r) => r.is_mine))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!token) return
    setBusy(true)
    setError('')
    try {
      const create = kind === 'product' ? api.createProductReview : api.createServiceReview
      await create(entityId, { rating, text: text.trim() })
      setText('')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить отзыв')
    } finally {
      setBusy(false)
    }
  }

  async function onVote(review: Review, value: 1 | -1) {
    if (!token) {
      window.location.href = '/login'
      return
    }
    try {
      await api.voteReview(review.id, value)
      load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось проголосовать')
    }
  }

  if (!data) {
    return (
      <section className="section reviews-section card">
        <h2>Отзывы</h2>
        <p className="muted">Загрузка отзывов...</p>
      </section>
    )
  }

  const { summary, items } = data

  return (
    <section className="section reviews-section card">
      <div className="reviews-section__header">
        <h2>Отзывы и оценки</h2>
        {summary.count > 0 && summary.avg_rating != null ? (
          <div className="reviews-section__summary">
            <StarRating value={Math.round(summary.avg_rating)} readonly />
            <strong>{summary.avg_rating.toFixed(1)}</strong>
            <span className="muted">· {summary.count} отзывов</span>
          </div>
        ) : (
          <p className="muted">Пока нет отзывов</p>
        )}
      </div>

      {token ? (
        hasMyReview ? (
          <p className="muted review-form__done">Вы уже оставили отзыв.</p>
        ) : (
          <form className="review-form" onSubmit={onSubmit}>
            <label className="review-form__label">
              Ваша оценка
              <StarRating value={rating} onChange={setRating} />
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Расскажите о покупке или мастер-классе..."
              rows={3}
            />
            {error && <p className="notice review-form__error">{error}</p>}
            <button type="submit" className="btn btn-sm" disabled={busy}>
              {busy ? 'Отправка...' : 'Отправить отзыв'}
            </button>
          </form>
        )
      ) : (
        <p className="muted">
          <Link to="/login">Войдите</Link>, чтобы оставить отзыв.
        </p>
      )}

      <ul className="review-list">
        {items.map((review) => (
          <li key={review.id} className="review-item">
            <div className="review-item__head">
              <strong>{review.author_name}</strong>
              <StarRating value={review.rating} readonly size={14} />
              <time className="muted" dateTime={review.created_at}>
                {new Date(review.created_at).toLocaleDateString('ru-RU')}
              </time>
            </div>
            {review.text && <p className="review-item__text">{review.text}</p>}
            <div className="review-votes">
              <button
                type="button"
                className={`review-vote ${review.my_vote === 1 ? 'is-active' : ''}`}
                onClick={() => onVote(review, 1)}
              >
                <ThumbsUp size={14} /> {review.upvotes}
              </button>
              <button
                type="button"
                className={`review-vote ${review.my_vote === -1 ? 'is-active' : ''}`}
                onClick={() => onVote(review, -1)}
              >
                <ThumbsDown size={14} /> {review.downvotes}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
