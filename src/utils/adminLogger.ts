import { collection, addDoc, doc, getDoc } from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { db } from '../firebase/firebase'

interface LogAdminActionParams {
  user: User
  action: 'add' | 'edit' | 'delete' | 'update' | 'confirm' | 'cancel' | 'acknowledge'
  type: 'equipment' | 'room' | 'borrow'
  itemName: string
  details: string
}

export async function logAdminAction({
  user,
  action,
  type,
  itemName,
  details
}: LogAdminActionParams) {
  try {
    // Get admin's full name from Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid))
    const adminName = userDoc.data()?.fullName || 'Unknown'

    // Add action to adminLogs collection
    await addDoc(collection(db, 'adminLogs'), {
      adminEmail: user.email,
      adminName: adminName,
      action: action,
      type: type,
      itemName: itemName,
      timestamp: new Date().toISOString(),
      details: details
    })

    console.log(`Admin action logged: ${action} ${type}`)
  } catch (error) {
    console.error('Error logging admin action:', error)
  }
}
