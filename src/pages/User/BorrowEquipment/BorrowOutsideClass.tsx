import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../../../components/Header"
import { useAuth } from "../../../hooks/useAuth"

export default function BorrowOutsideClass() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [currentDate, setCurrentDate] = useState<string>("")
  const [currentTime, setCurrentTime] = useState<string>("")
  const [purpose, setPurpose] = useState<string>("")
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [showCalendar, setShowCalendar] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
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
      setCurrentDate(date)
      setCurrentTime(time)
    }

    updateDateTime()
    const interval = setInterval(updateDateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  const monthNames = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ]

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const isDateDisabled = (day: number) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    return checkDate < today
  }

  const days = []
  const firstDay = getFirstDayOfMonth(currentMonth)
  const daysInMonth = getDaysInMonth(currentMonth)

  for (let i = 0; i < firstDay; i++) {
    days.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  const handleDateSelect = (day: number) => {
    if (isDateDisabled(day)) return
    const dateStr = `${day.toString().padStart(2, "0")}/${(currentMonth.getMonth() + 1).toString().padStart(2, "0")}/${currentMonth.getFullYear() + 543}`
    setSelectedDate(dateStr)
    setShowCalendar(false)
  }

  const getExpectedReturnTimeOptions = () => {
    const times: string[] = []
    for (let hour = 8; hour <= 17; hour++) {
      times.push(`${hour.toString().padStart(2, "0")}:00`)
      times.push(`${hour.toString().padStart(2, "0")}:30`)
    }
    return times
  }

  const handleConfirm = () => {
    if (purpose && selectedDate && expectedReturnTime) {
      const borrowData = {
        borrowType: "outsideClass",
        borrowDate: currentDate,
        purpose: purpose,
        returnDate: selectedDate,
        expectedReturnTime: expectedReturnTime
      }
      console.log("Borrow data:", borrowData)
      sessionStorage.setItem("borrowInfo", JSON.stringify(borrowData))
      navigate('/borrow/equipment')
    }
  }

  const isFormValid = purpose.trim() !== "" && selectedDate !== "" && expectedReturnTime !== ""

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
      <Header title="ยืมนอกคาบเรียน" />

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

          {/* Purpose Input */}
          <div className="w-full mb-6">
            <div className="text-sm text-gray-600 mb-2">ระบุวัตถุประสงค์การยืม</div>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="เช่น ทำโปรเจคจบ, ใช้สำหรับกิจกรรมชมรม"
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

          {/* Return Date Selection */}
          <div className="w-full mb-6">
            <div className="text-sm text-gray-600 mb-2">กำหนดวันคืน</div>
            <div className="relative">
              <div
                onClick={() => setShowCalendar(!showCalendar)}
                className="
                  w-full h-11
                  px-5
                  rounded-full
                  border border-gray-400
                  outline-none
                  text-sm
                  flex items-center justify-between
                  cursor-pointer
                  bg-white
                  hover:bg-gray-50
                "
              >
                <span>{selectedDate || "เลือกวันคืน"}</span>
                <span className="text-lg">📅</span>
              </div>

              {/* Calendar */}
              {showCalendar && (
                <div className="
                  absolute top-full left-0 right-0
                  mt-2 p-4
                  bg-white
                  border border-gray-300
                  rounded-lg
                  shadow-lg
                  z-10
                ">
                  <div className="flex justify-between items-center mb-4">
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      ◀
                    </button>
                    <div className="text-center font-bold text-sm">
                      {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear() + 543}
                    </div>
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      ▶
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                    <div className="text-gray-600">อา</div>
                    <div className="text-gray-600">จ</div>
                    <div className="text-gray-600">อ</div>
                    <div className="text-gray-600">พ</div>
                    <div className="text-gray-600">พฤ</div>
                    <div className="text-gray-600">ศ</div>
                    <div className="text-gray-600">ส</div>
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {days.map((day, idx) => (
                      <button
                        key={idx}
                        onClick={() => day && handleDateSelect(day)}
                        disabled={!day || isDateDisabled(day)}
                        className={`
                          h-7 text-xs rounded
                          ${
                            !day
                              ? "opacity-0 cursor-default"
                              : isDateDisabled(day)
                              ? "text-gray-300 cursor-not-allowed"
                              : "hover:bg-orange-100 cursor-pointer"
                          }
                        `}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
          <div className="w-full mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700">
              ⓘ การยืมนอกคาบเรียนสามารถกำหนดวันคืนได้ตามต้องการ
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
