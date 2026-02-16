import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider } from '../firebase/client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const actions = useMemo(
    () => ({
      signIn: async () => {
        try {
          setError('')
          await signInWithPopup(auth, googleProvider)
        } catch (err) {
          console.error(err)
          setError('Login failed. Please try again.')
        }
      },
      signOut: async () => {
        try {
          await signOut(auth)
        } catch (err) {
          console.error(err)
          setError('Sign out failed.')
        }
      }
    }),
    []
  )

  const value = useMemo(
    () => ({ user, loading, error, ...actions }),
    [user, loading, error, actions]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
