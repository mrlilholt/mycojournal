import { useAuth } from '../../store/auth.jsx'

export default function AuthGate({ children }) {
  const { user, loading, signIn, error } = useAuth()

  if (loading) {
    return (
      <div className="auth-gate">
        <div className="auth-card">
          <p>Loading your workspace...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="auth-gate">
        <div className="auth-card">
          <img className="auth-logo" src="/myco.png" alt="MycoJournal" />
          <h2>Sign in to MycoJournal</h2>
          <p className="muted">Your grows are stored securely in Firebase.</p>
          {error ? <p className="muted">{error}</p> : null}
          <button className="primary-btn" type="button" onClick={signIn}>
            Sign in with Google
          </button>
        </div>
      </div>
    )
  }

  return children
}
