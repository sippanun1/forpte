import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../../../components/Header"

export default function BorrowEquipment() {
  const navigate = useNavigate()
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
      <Header title="เลือกประเภทการยืม" />

      {/* ===== CONTENT ===== */}
      <div className="mt-8 flex justify-center">
        <div className="w-full max-w-[360px] px-4 flex flex-col items-center">
          {/* Date & Time */}
          <div className="w-full flex justify-between text-gray-600 text-sm mb-6">
            <div>{currentDate}</div>
            <div>Time {currentTime}</div>
          </div>

          {/* Options */}
          <div className="w-full flex flex-col gap-4">
            <button
              onClick={() => navigate('/borrow/during-class')}
              className="
                w-full h-14
                rounded-3xl
                bg-orange-100
                text-gray-700 text-base font-medium
                hover:bg-orange-200
                transition
              "
            >
              ยืมในคาบเรียน<br />
              <span className="text-sm">(09.30-10.30) (13.30-14.30)</span>
            </button>

            <button
              onClick={() => navigate('/borrow/teaching')}
              className="
                w-full h-14
                rounded-3xl
                bg-orange-100
                text-gray-700 text-base font-medium
                hover:bg-orange-200
                transition
              "
            >
              ยืมใช้สอน
            </button>

            <button
              onClick={() => navigate('/borrow/outside')}
              className="
                w-full h-14
                rounded-3xl
                bg-orange-100
                text-gray-700 text-base font-medium
                hover:bg-orange-200
                transition
              "
            >
              ยืมนอกคาบเรียน
            </button>
          </div>

          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="
              mt-8
              px-8 py-2
              rounded-full
              border border-gray-400
              text-sm text-gray-600
              hover:bg-gray-100
              transition
            "
          >
            ย้อนกลับ
          </button>
        </div>
      </div>
    </div>
  )
}
