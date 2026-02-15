import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../../../components/Header"
import { useAuth } from "../../../hooks/useAuth"

export default function BorrowForTeaching() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [currentDate, setCurrentDate] = useState<string>("")
  const [currentTime, setCurrentTime] = useState<string>("")
  const [todayFormatted, setTodayFormatted] = useState<string>("")
  const [subject, setSubject] = useState<string>("")
  const [expectedReturnTime, setExpectedReturnTime] = useState<string>("")

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
      const formattedDate = now.toLocaleDateString("th-TH", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      })
      setCurrentDate(date)
      setCurrentTime(time)
      setTodayFormatted(formattedDate)
    }

    updateDateTime()
    const interval = setInterval(updateDateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  const getExpectedReturnTimeOptions = () => {
    const times: string[] = []
    for (let hour = 8; hour <= 17; hour++) {
      times.push(`${hour.toString().padStart(2, "0")}:00`)
      times.push(`${hour.toString().padStart(2, "0")}:30`)
    }
    return times
  }

  const handleConfirm = () => {
    if (subject && expectedReturnTime) {
      const borrowData = {
        borrowType: "teaching",
        borrowDate: currentDate,
        subject: subject,
        expectedReturnTime: expectedReturnTime,
        returnDate: currentDate // Same day
      }
      console.log("Borrow data:", borrowData)
      sessionStorage.setItem("borrowInfo", JSON.stringify(borrowData))
      navigate('/borrow/equipment')
    }
  }

  const isFormValid = subject.trim() !== "" && expectedReturnTime !== ""

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
      <Header title="ยืมใช้สอน" />

      {/* ===== CONTENT ===== */}
      <div className="mt-8 flex justify-center">
        <div className="w-full max-w-[360px] px-4 flex flex-col items-center">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="
              w-full
              py-3
              rounded-full
              border border-gray-400
              text-gray-600
              text-sm font-medium
              hover:bg-gray-100
              transition
              mb-6
              flex items-center justify-center gap-2
            "
          >
            <img src="/arrow.svg" alt="back" className="w-5 h-5" />
          </button>

          {/* User Info & DateTime */}
          <div className="w-full flex justify-between text-gray-600 text-sm mb-6">
            <div>{user?.displayName || user?.email || "User"}</div>
            <div className="text-right">
              <div>{currentDate}</div>
              <div>Time {currentTime}</div>
            </div>
          </div>

          {/* Today's Date Display */}
          <div className="w-full mb-6">
            <div className="text-sm text-gray-600 mb-2">วันที่ยืม (คืนภายในวันนี้)</div>
            <div className="w-full h-11 px-5 rounded-full border border-gray-300 bg-gray-50 flex items-center text-sm text-gray-700">
              📅 {todayFormatted}
            </div>
          </div>

          {/* Subject Input */}
          <div className="w-full mb-6">
            <div className="text-sm text-gray-600 mb-2">ระบุรายวิชาที่ใช้</div>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="เช่น วิชาการเขียนโปรแกรมคอมพิวเตอร์"
              className="
                w-full h-11
                px-5
                rounded-full
                border border-gray-400
                outline-none
                text-sm
                placeholder-gray-400
              "
            />
          </div>

          {/* Expected Return Time */}
          <div className="w-full mb-6">
            <div className="text-sm text-gray-600 mb-2">กำหนดเวลาคืน</div>
            <select
              value={expectedReturnTime}
              onChange={(e) => setExpectedReturnTime(e.target.value)}
              className="
                w-full h-11
                px-5
                rounded-full
                border border-gray-400
                outline-none
                text-sm
                bg-white
                appearance-none
                cursor-pointer
              "
            >
              <option value="">เลือกเวลาคืน</option>
              {getExpectedReturnTimeOptions().map((time) => (
                <option key={time} value={time}>
                  {time} น.
                </option>
              ))}
            </select>
          </div>

          {/* Info Notice */}
          <div className="w-full mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
              ⓘ การยืมใช้สอนต้องคืนภายในวันเดียวกัน
            </p>
          </div>

          {/* Buttons */}
          <div className="w-full flex gap-4">
            <button
              onClick={handleConfirm}
              disabled={!isFormValid}
              className={`
                flex-1 h-11
                rounded-full
                text-sm font-medium
                text-white
                transition
                ${
                  isFormValid
                    ? "bg-orange-500 hover:bg-orange-600"
                    : "bg-gray-300 cursor-not-allowed"
                }
              `}
            >
              ถัดไป
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
