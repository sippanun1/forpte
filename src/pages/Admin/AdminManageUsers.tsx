import { useState, useEffect } from 'react'
import { collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Header from '../../components/Header'

interface User {
  id: string
  email: string
  fullName: string
  idNumber: string
  role: string
}

export default function AdminManageUsers() {
  const navigate = useNavigate()
  const { role, user: authUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Check if admin
  useEffect(() => {
    if (role && role !== 'admin') {
      navigate('/home')
    }
  }, [role, navigate])

  // Load all users
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersRef = collection(db, 'users')
        const querySnapshot = await getDocs(usersRef)
        const userList: User[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          userList.push({
            id: doc.id,
            email: data.email || '',
            fullName: data.fullName || '',
            idNumber: data.idNumber || '',
            role: data.role || 'user'
          })
        })
        setUsers(userList)
      } catch (error) {
        console.error('Error loading users:', error)
        setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้' })
      } finally {
        setLoading(false)
      }
    }
    loadUsers()
  }, [])

  // Filter users based on search term
  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase()
    return (
      user.email.toLowerCase().includes(searchLower) ||
      user.fullName.toLowerCase().includes(searchLower) ||
      user.idNumber.toLowerCase().includes(searchLower)
    )
  })

  const handleDeleteUser = async (userId: string) => {
    try {
      // Prevent deleting self
      if (userId === authUser?.uid) {
        setMessage({ type: 'error', text: 'ไม่สามารถลบตัวคุณเองได้' })
        setShowDeleteConfirm(false)
        return
      }

      // Delete user from 'users' collection
      await deleteDoc(doc(db, 'users', userId))

      // Delete user's borrow history
      const borrowHistoryRef = collection(db, 'borrowHistory')
      const borrowQuery = query(borrowHistoryRef, where('userId', '==', userId))
      const borrowDocs = await getDocs(borrowQuery)
      for (const doc of borrowDocs.docs) {
        await deleteDoc(doc.ref)
      }

      // Delete user's return history
      const returnHistoryRef = collection(db, 'returnHistory')
      const returnQuery = query(returnHistoryRef, where('userId', '==', userId))
      const returnDocs = await getDocs(returnQuery)
      for (const doc of returnDocs.docs) {
        await deleteDoc(doc.ref)
      }

      // Delete user's borrow-return history
      const borrowReturnHistoryRef = collection(db, 'borrowReturnHistory')
      const borrowReturnQuery = query(borrowReturnHistoryRef, where('userId', '==', userId))
      const borrowReturnDocs = await getDocs(borrowReturnQuery)
      for (const doc of borrowReturnDocs.docs) {
        await deleteDoc(doc.ref)
      }

      // Delete user's room bookings
      const roomBookingsRef = collection(db, 'roomBookings')
      const bookingsQuery = query(roomBookingsRef, where('userId', '==', userId))
      const bookingsDocs = await getDocs(bookingsQuery)
      for (const doc of bookingsDocs.docs) {
        await deleteDoc(doc.ref)
      }

      setMessage({ type: 'success', text: 'ลบผู้ใช้งานและข้อมูลที่เกี่ยวข้องสำเร็จ' })

      // Reload users list
      const usersRef = collection(db, 'users')
      const querySnapshot = await getDocs(usersRef)
      const userList: User[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        userList.push({
          id: doc.id,
          email: data.email || '',
          fullName: data.fullName || '',
          idNumber: data.idNumber || '',
          role: data.role || 'user'
        })
      })
      setUsers(userList)
      setShowDeleteConfirm(false)
      setSelectedUserId(null)
      setSelectedUserEmail('')
    } catch (error) {
      console.error('Error deleting user:', error)
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการลบผู้ใช้งาน' })
    }
  }

  if (role && role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-white bg-[radial-gradient(#dbeafe_1px,transparent_1px)] bg-[length:18px_18px]">
      <Header title="จัดการผู้ใช้งาน" />

      <div className="mt-6 flex justify-center">
        <div className="w-full max-w-[400px] px-4 pb-6">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="w-full mb-4 py-2 rounded-full border border-gray-400 text-gray-600 text-sm font-medium hover:bg-gray-100 transition flex items-center justify-center gap-2"
          >
            <img src="/arrow.svg" alt="back" className="w-5 h-5" />
          </button>

          {/* Message */}
          {message && (
            <div className={`w-full mb-4 p-3 rounded-lg text-sm text-center ${
              message.type === 'success'
                ? 'bg-green-100 border border-green-400 text-green-700'
                : 'bg-red-100 border border-red-400 text-red-700'
            }`}>
              {message.text}
            </div>
          )}

          {/* Search Bar */}
          <div className="mb-4 relative">
            <input
              type="text"
              placeholder="ค้นหาผู้ใช้งาน (อีเมล, ชื่อ, เลขประจำตัว)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 px-4 border border-gray-300 rounded-lg outline-none text-sm focus:border-blue-500"
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
          </div>

          {/* User Count */}
          <div className="mb-4 text-sm text-gray-600">
            พบ <span className="font-semibold text-blue-600">{filteredUsers.length}</span> / {users.length} ผู้ใช้งาน
          </div>

          {/* Users List */}
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="flex flex-col gap-3">
              {filteredUsers.map((user) => (
                <div key={user.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  {/* User Header */}
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{user.fullName || '-'}</p>
                      <p className="text-xs text-gray-600">{user.email}</p>
                    </div>
                    {user.id === authUser?.uid ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-lg">
                        คุณ
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedUserId(user.id)
                          setSelectedUserEmail(user.email)
                          setShowDeleteConfirm(true)
                        }}
                        className="px-3 py-1 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 transition"
                      >
                        ลบ
                      </button>
                    )}
                  </div>

                  {/* User Details */}
                  <div className="space-y-1 text-xs text-gray-600">
                    <p><span className="font-medium">เลขประจำตัว:</span> {user.idNumber}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-300 text-5xl mb-3">👤</p>
              <p className="text-gray-500 font-medium">ไม่พบผู้ใช้งาน</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedUserId && (
        <div className="fixed inset-0 backdrop-blur-xs bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">ยืนยันการลบ</h3>
            <p className="text-gray-700 mb-2">
              คุณแน่ใจว่าต้องการลบผู้ใช้งานนี้?
            </p>
            <p className="text-sm text-gray-600 mb-6 bg-gray-50 p-3 rounded-lg">
              {selectedUserEmail}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setSelectedUserId(null)
                  setSelectedUserEmail('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => handleDeleteUser(selectedUserId)}
                className="flex-1 px-4 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition"
              >
                ยืนยันลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
