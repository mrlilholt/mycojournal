import { Link } from 'react-router-dom'
import EmptyState from '../components/ui/EmptyState.jsx'

export default function NotFoundPage() {
  return (
    <div className="page">
      <EmptyState
        title="Page not found"
        description="That route does not exist. Return to your grow dashboard."
        action={
          <Link className="secondary-btn" to="/grows">
            Go to Grows
          </Link>
        }
      />
    </div>
  )
}
