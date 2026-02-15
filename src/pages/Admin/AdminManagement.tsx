import { useState } from 'react'
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header'

export default function AdminManagement() {
  const navigate = useNavigate()
  const { role } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  if (role !== 'admin') {
    navigate('/home')
    return null
  }

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

      // Update user role to admin
      const userDoc = querySnapshot.docs[0]
      await updateDoc(doc(db, 'users', userDoc.id), {
        role: 'admin'
      })

      setMessage({ type: 'success', text: `${email} ได้ถูกตั้งเป็นแอดมินแล้ว` })
      setEmail('')
    } catch (error) {
      console.error('Error:', error)
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาด' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white bg-[radial-gradient(#dbeafe_1px,transparent_1px)] bg-[length:18px_18px]">
      <Header title="จัดการแอดมิน" />

      <div className="mt-10 flex justify-center">
        <div className="w-full max-w-[360px] px-4 flex flex-col items-center">
                    <button
            onClick={() => navigate(-1)}
            className="              w-full
              py-3
              rounded-full
              border border-gray-400
              text-gray-600
              text-sm font-medium
              hover:bg-gray-100
              transition
              mb-6
              flex items-center justify-center gap-2"
          >
            <img src="/arrow.svg" alt="back" className="w-5 h-5" />
            
          </button>
          <h2 className="text-lg font-semibold mb-6 text-center">เพิ่มแอดมินใหม่</h2>

          {message && (
            <div className={`w-full mb-4 p-3 rounded-lg text-sm text-center ${
              message.type === 'success'
                ? 'bg-green-100 border border-green-400 text-green-700'
                : 'bg-red-100 border border-red-400 text-red-700'
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleMakeAdmin} className="w-full flex flex-col items-center gap-4">
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

        </div>
      </div>
    </div>
  )
}
