import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { api } from '../shared/api'

export function StoryPage() {
  const params = useParams()
  const [story, setStory] = useState<{ id: number; title: string; content: string } | null>(null)

  useEffect(() => {
    if (!params.id) return
    api
      .home()
      .then((data) => {
        const found = data.stories?.find((x: { id: number }) => x.id === Number(params.id))
        setStory(found ?? null)
      })
      .catch(console.error)
  }, [params.id])

  if (!story) return <div className="container section card">История не найдена.</div>

  return (
    <div className="container section detail-page card">
      <h1>{story.title}</h1>
      <p>{story.content}</p>
    </div>
  )
}
