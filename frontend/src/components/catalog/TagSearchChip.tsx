import { useNavigate } from 'react-router-dom'

type Props = { tag: string; catalogType: 'products' | 'services' }

export function TagSearchChip({ tag, catalogType }: Props) {
  const navigate = useNavigate()
  const qs = new URLSearchParams()
  qs.set('tag', tag)
  qs.set('type', catalogType === 'products' ? 'products' : 'services')

  return (
    <button
      type="button"
      className="chip-tag"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        navigate(`/search?${qs.toString()}`)
      }}
    >
      #{tag}
    </button>
  )
}
