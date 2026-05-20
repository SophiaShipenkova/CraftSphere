import { ReactNode } from 'react'

type Props = {
  image: ReactNode
  children: ReactNode
}

export function DetailPanel({ image, children }: Props) {
  return (
    <div className="detail-panel card">
      <div className="detail-panel__image">{image}</div>
      <div className="detail-panel__body">{children}</div>
    </div>
  )
}
