import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDocFromServer } from 'firebase/firestore'
import { auth, db } from '../firebase/client.js'

export function useAdminSession() {
  const [session, setSession] = useState({ status: 'checking', user: null })

  useEffect(() => {
    if (!auth || !db) return

    let currentCheck = 0
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const check = ++currentCheck
      if (!user) {
        setSession({ status: 'signed-out', user: null })
        return
      }

      setSession({ status: 'checking', user })
      try {
        const grant = await getDocFromServer(doc(db, 'admins', user.uid))
        if (check === currentCheck) {
          setSession({ status: grant.exists() ? 'admin' : 'denied', user })
        }
      } catch {
        if (check === currentCheck) setSession({ status: 'error', user })
      }
    })

    return () => {
      currentCheck += 1
      unsubscribe()
    }
  }, [])

  return session
}
