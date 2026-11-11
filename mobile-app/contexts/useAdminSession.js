import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../firebase/client.js'

export function useAdminSession() {
  const [session, setSession] = useState({ status: 'checking', user: null })

  useEffect(() => {
    if (!auth || !db) return

    let stopGrant = () => {}
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      stopGrant()
      if (!user) {
        setSession({ status: 'signed-out', user: null })
        return
      }

      setSession({ status: 'checking', user })
      const timeout = setTimeout(() => setSession({ status: 'error', user }), 10_000)
      const unsubscribeGrant = onSnapshot(
        doc(db, 'admins', user.uid),
        { includeMetadataChanges: true },
        (grant) => {
          if (grant.metadata.fromCache) return
          clearTimeout(timeout)
          setSession({ status: grant.exists() ? 'admin' : 'denied', user })
        },
        () => {
          clearTimeout(timeout)
          setSession({ status: 'error', user })
        },
      )

      stopGrant = () => {
        clearTimeout(timeout)
        unsubscribeGrant()
      }
    })

    return () => {
      stopGrant()
      unsubscribe()
    }
  }, [])

  return session
}
