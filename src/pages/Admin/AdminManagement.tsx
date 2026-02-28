import { useState, useEffect } from 'react'
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header'

interface AdminUser {
  id: string
  email: string
  name: string
}

export default function AdminManagement() {
  const navigate = useNavigate()
  const { role, user } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loadingAdmins, setLoadingAdmins] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null)

  // Load all admins
  useEffect(() => {
    const loadAdmins = async () => {
      try {
        const usersRef = collection(db, 'users')
        const q = query(usersRef, where('role', '==', 'admin'))
        const querySnapshot = await getDocs(q)
        const adminList: AdminUser[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          adminList.push({
            id: doc.id,
            email: data.email || '',
            name: data.name || ''
          })
        })
        setAdmins(adminList)
      } catch (error) {
        console.error('Error loading admins:', error)
      } finally {
        setLoadingAdmins(false)
      }
    }
    loadAdmins()
  }, [])

  // Check if user is admin
  useEffect(() => {
    if (role && role !== 'admin') {
      navigate('/home')
    }
  }, [role, navigate])

  const handleMakeAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      // Find user by email
      const usersRef = collection(db, 'users')
      const q = query(usersRef, where('email', '==', email))
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        setMessage({ type: 'error', text: 'ไม่พบผู้ใช้งานที่มีอีเมลนี้' })
        setLoading(false)
        return
      }

      // Check if already admin
      const userDoc = querySnapshot.docs[0]
      const userData = userDoc.data()
      if (userData.role === 'admin') {
        setMessage({ type: 'error', text: 'ผู้ใช้นี้เป็นแอดมินแล้ว' })
        setLoading(false)
        return
      }

      // Update user role to admin
      await updateDoc(doc(db, 'users', userDoc.id), {
        role: 'admin'
      })

      setMessage({ type: 'success', text: `${email} ได้ถูกตั้งเป็นแอดมินแล้ว` })
      setEmail('')
      
      // Reload admins list
      const updatedQ = query(collection(db, 'users'), where('role', '==', 'admin'))
      const updatedSnapshot = await getDocs(updatedQ)
      const adminList: AdminUser[] = []
      updatedSnapshot.forEach((doc) => {
        const data = doc.data()
        adminList.push({
          id: doc.id,
          email: data.email || '',
          name: data.name || ''
        })
      })
      setAdmins(adminList)
    } catch (error) {
      console.error('Error:', error)
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาด' })
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveAdmin = async (adminId: string) => {
    try {
      // Prevent removing self
      if (adminId === user?.uid) {
        setMessage({ type: 'error', text: 'ไม่สามารถลบตัวคุณเองได้' })
        setShowDeleteConfirm(false)
        return
      }

      await updateDoc(doc(db, 'users', adminId), {
        role: 'user'
      })

      setMessage({ type: 'success', text: 'ลบสิทธิแอดมินสำเร็จ' })
      
      // Reload admins list
      const updatedQ = query(collection(db, 'users'), where('role', '==', 'admin'))
      const updatedSnapshot = await getDocs(updatedQ)
      const adminList: AdminUser[] = []
      updatedSnapshot.forEach((doc) => {
        const data = doc.data()
        adminList.push({
          id: doc.id,
          email: data.email || '',
          name: data.name || ''
        })
      })
      setAdmins(adminList)
      setShowDeleteConfirm(false)
      setSelectedAdminId(null)
    } catch (error) {
      console.error('Error removing admin:', error)
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการลบสิทธิ' })
    }
  }

  if (role && role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-white bg-[radial-gradient(#dbeafe_1px,transparent_1px)] bg-[length:18px_18px]">
      <Header title="จัดการแอดมิน" />

      <div className="mt-10 flex justify-center">
        <div className="w-full max-w-[360px] px-4 flex flex-col items-center">
          <button
            onClick={() => navigate(-1)}
            className="w-full py-3 rounded-full border border-gray-400 text-gray-600 text-sm font-medium hover:bg-gray-100 transition mb-6 flex items-center justify-center gap-2"
          >
            <img src="/arrow.svg" alt="back" className="w-5 h-5" />
          </button>

          {message && (
            <div className={`w-full mb-4 p-3 rounded-lg text-sm text-center ${
              message.type === 'success'
                ? 'bg-green-100 border border-green-400 text-green-700'
                : 'bg-red-100 border border-red-400 text-red-700'
            }`}>
              {message.text}
            </div>
          )}

          {/* Add New Admin Section */}
          <h2 className="text-lg font-semibold mb-4 text-center w-full">เพิ่มแอดมินใหม่</h2>
          <form onSubmit={handleMakeAdmin} className="w-full flex flex-col items-center gap-4 mb-8 pb-8 border-b border-gray-200">
            <div className="w-full mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700">ป้อนอีเมลของผู้ใช้ที่ต้องการตั้งเป็นแอดมิน</p>
            </div>

            <input
              type="email"
              placeholder="อีเมล"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full h-11 px-5 rounded-full border border-gray-400 outline-none text-sm disabled:bg-gray-100"
            />

            <button
              type="submit"
              disabled={loading || !email}
              className="mt-4 w-full h-12 rounded-full bg-[#FF7F50] text-white text-lg font-medium hover:bg-[#ff6a33] disabled:bg-gray-400 transition"
            >
              {loading ? 'กำลังดำเนินการ...' : 'ตั้งเป็นแอดมิน'}
            </button>
          </form>

          {/* Admin List Section */}
          <h2 className="text-lg font-semibold mb-4 text-center w-full">รายชื่อแอดมิน</h2>
          {loadingAdmins ? (
            <p className="text-gray-500 text-center">กำลังโหลด...</p>
          ) : admins.length > 0 ? (
            <div className="w-full flex flex-col gap-3">
              {admins.map((admin) => (
                <div key={admin.id} className="w-full flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{admin.email}</p>
                    {admin.name && <p className="text-xs text-gray-600">{admin.name}</p>}
                  </div>
                  {admin.id !== user?.uid && (
                    <button
                      onClick={() => {
                        setSelectedAdminId(admin.id)
                        setShowDeleteConfirm(true)
                      }}
                      className="ml-3 px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 transition"
                    >
                      ลบ
                    </button>
                  )}
                  {admin.id === user?.uid && (
                    <span className="ml-3 px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-lg">
                      คุณ
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center">ไม่มีแอดมิน</p>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedAdminId && (
        <div className="fixed inset-0 backdrop-blur-xs bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">ยืนยันการลบ</h3>
            <p className="text-gray-700 mb-6">
              คุณแน่ใจว่าต้องการลบสิทธิแอดมินสำหรับผู้ใช้นี้?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setSelectedAdminId(null)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => handleRemoveAdmin(selectedAdminId)}
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
