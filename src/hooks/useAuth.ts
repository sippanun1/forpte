import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { getDoc, doc } from 'firebase/firestore'
import { auth, db } from '../firebase/firebase'

interface UserAuthData {
  user: User | null
  role: 'admin' | 'user' | null
  loading: boolean
}

export function useAuth(): UserAuthData {
  const [userAuthData, setUserAuthData] = useState<UserAuthData>({
    user: null,
    role: null,
    loading: true
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid))
          const role = userDoc.exists() ? (userDoc.data().role as 'admin' | 'user') : 'user'
          setUserAuthData({
            user,
            role,
            loading: false
          })
        } catch (error) {
          console.error('Error fetching user role:', error)
          setUserAuthData({
            user,
            role: 'user',
            loading: false
          })
        }
      } else {
        setUserAuthData({
          user: null,
          role: null,
          loading: false
        })
      }
    })

    return unsubscribe
  }, [])

  return userAuthData
}
