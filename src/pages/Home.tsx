import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { signOut } from "firebase/auth"
import { auth } from "../firebase/firebase"
import { useAuth } from "../hooks/useAuth"
import Header from "../components/Header"

export default function Home() {
  const navigate = useNavigate()
  const { user: _user } = useAuth()
  const [currentDate, setCurrentDate] = useState<string>("")
  const [currentTime, setCurrentTime] = useState<string>("")


  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date()
      const date = now.toLocaleDateString("th-TH", {
        year: "2-digit",
        month: "2-digit",
        day: "2-digit"
      })
      const time = now.toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      })
      setCurrentDate(date)
      setCurrentTime(time)
    }

    updateDateTime()
    const interval = setInterval(updateDateTime, 1000)
    return () => clearInterval(interval)
  }, [])



  const handleLogout = async () => {
    try {
      await signOut(auth)
      navigate('/login')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  return (
    <div
      className="
        min-h-screen
        bg-white
        bg-[radial-gradient(#dbeafe_1px,transparent_1px)]
        bg-[length:18px_18px]
      "
    >
      {/* ===== HEADER ===== */}
      <Header title="ระบบยืม-คืนวัสดุ/ครุภัณฑ์" />

      {/* ===== CONTENT ===== */}
      <div className="mt-8 flex justify-center">
        <div className="w-full max-w-[360px] px-4 flex flex-col items-center">
          {/* Date & Time */}
          <div className="w-full flex justify-between text-gray-600 text-sm mb-6">
            <div>{currentDate}</div>
            <div>Time {currentTime}</div>
          </div>

          {/* Username */}
          <div className="w-full text-gray-600 text-sm mb-6">
            User (ชื่อ-สกุล)
          </div>



          {/* Action Buttons */}
          <div className="w-full flex flex-col gap-4">
            <button
              onClick={() => navigate('/borrow')}
              className="
                w-full h-12
                rounded-full
                bg-yellow-300
                text-gray-700 text-base font-medium
                hover:bg-yellow-400
                transition
              "
            >
              ยืมอุปกรณ์
            </button>

            <button
              onClick={() => navigate('/return')}
              className="
                w-full h-12
                rounded-full
                bg-orange-500
                text-white text-base font-medium
                hover:bg-orange-600
                transition
              "
            >
              คืนอุปกรณ์
            </button>

            <button
              onClick={() => navigate('/room-booking')}
              className="
                w-full h-12
                rounded-full
                bg-green-500
                text-white text-base font-medium
                hover:bg-green-600
                transition
              "
            >
              ยืมใช้ห้อง
            </button>

            <button
              onClick={() => navigate('/borrow-return-history')}
              className="
                w-full h-12
                rounded-full
                bg-blue-500
                text-white text-base font-medium
                hover:bg-blue-600
                transition
              "
            >
              ประวัติการยืมและคืน
            </button>

            <button
              onClick={handleLogout}
              className="
                w-full h-12
                rounded-full
                bg-red-500
                text-white text-base font-medium
                hover:bg-red-600
                transition
              "
            >
              ออกจากระบบ
            </button>

          </div>
        </div>
      </div>
    </div>
  )
}
