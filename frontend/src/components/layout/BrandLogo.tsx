import { Link } from 'react-router-dom'

/** Минималистичный контрастный вордмарк: Craft + Sphere на одном шрифте Manrope */
export function BrandLogo() {
  return (
    <Link to="/" className="logo-brand" aria-label="CraftSphere — на главную">
      <span className="logo-brand__wordmark">
        <span className="logo-brand__craft">Craft</span>
        <span className="logo-brand__sphere">Sphere</span>
      </span>
    </Link>
  )
}
