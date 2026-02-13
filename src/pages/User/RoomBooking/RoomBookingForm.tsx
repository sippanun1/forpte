import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { addDoc, collection } from "firebase/firestore"
import { db } from "../../../firebase/firebase"
import { useAuth } from "../../../hooks/useAuth"
import Header from "../../../components/Header"
import DatePicker from "../../../components/DatePicker"
import type { BookingData } from "../../../App"

interface RoomBookingFormProps {
  bookingData: BookingData | null
  onConfirmBooking: (bookingData: {
    room: string
    date: string
    time: string
    people: number
    objective: string
  }) => void
}

export default function RoomBookingForm({
  bookingData,
  onConfirmBooking
}: RoomBookingFormProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [date, setDate] = useState("")
  const [time, setTime] = useState(bookingData?.time || "")
  const [people, setPeople] = useState(1)
  const [objective, setObjective] = useState("")
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const timeOptions = [
    "09:00 - 11:00",
    "11:00 - 13:00",
    "13:00 - 15:00",
    "15:00 - 17:00",
  ]

  const handlePeopleIncrease = () => {
    setPeople(people + 1)
  }

  const handlePeopleDecrease = () => {
    if (people > 1) {
      setPeople(people - 1)
    }
  }

  const handleBooking = async () => {
    if (!date || !time || !objective.trim()) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน")
      return
    }

    setIsSubmitting(true)
    try {
      // Parse time range
      const timeParts = time.split(" - ")
      const startTime = timeParts[0] || ""
      const endTime = timeParts[1] || ""

      // Save to Firebase
      await addDoc(collection(db, "roomBookings"), {
        roomCode: bookingData?.room || "",
        roomType: "", // Can be enhanced to include room type
        userName: user?.displayName || user?.email || "ผู้ใช้",
        userId: user?.uid || "",
        date: date,
        startTime: startTime,
        endTime: endTime,
        purpose: objective,
        people: people,
        status: "upcoming",
        bookedAt: new Date().toISOString()
      })

      onConfirmBooking({
        room: bookingData?.room || "",
        date,
        time,
        people,
        objective
      })
      setShowApprovalModal(true)
    } catch (error) {
      console.error("Error saving booking:", error)
      alert("เกิดข้อผิดพลาดในการจองห้อง")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApprovalModalClose = () => {
    setShowApprovalModal(false)
    navigate('/home')
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
      <Header title="กรอกข้อมูลการจอง" />

      {/* ===== CONTENT ===== */}
      <div className="mt-6 flex justify-center">
        <div className="w-full max-w-[360px] px-4 flex flex-col items-center">
          {/* Title */}
          <div className="w-full mb-4">
            <p className="text-sm font-medium mb-1" style={{ color: "#595959" }}>
              รายละเอียดการจอง
            </p>
            <p className="text-xs" style={{ color: "#595959" }}>
              กรุณากรอกข้อมูลเพื่อจองห้อง
            </p>
          </div>

          {/* Room Info Card */}
          <div className="w-full p-4 mb-6 flex gap-4">
            {/* Room Image */}
            <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center">
              <span className="text-3xl">{bookingData?.roomImage}</span>
            </div>

            {/* Room Details */}
            <div className="flex-1 flex flex-col justify-between">
              {/* Room Name */}
              <div>
                <input
                  type="text"
                  value={bookingData?.room || ""}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
                  style={{ color: "#595959" }}
                />
              </div>

              {/* Date Picker Component */}
              <DatePicker
                value={date}
                onChange={setDate}
              />
            </div>
          </div>

          {/* Time Dropdown */}
          <div className="w-full mb-4">
            <select
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none appearance-none bg-white"
              style={{ color: "#595959" }}
            >
              <option value="" disabled>
                ช่วงเวลาที่ต้องการจอง
              </option>
              {timeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <span className="absolute right-6 top-3 text-lg pointer-events-none">▼</span>
          </div>

          {/* Number of People */}
          <div className="w-full mb-4">
            <div className="flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg bg-white">
              <span style={{ color: "#595959" }} className="text-sm font-medium">
                จำนวนผู้เข้า
              </span>
              <div className="flex items-center gap-4">
                <button
                  onClick={handlePeopleDecrease}
                  className="w-6 h-6 flex items-center justify-center rounded border border-gray-400 text-lg"
                  style={{ color: "#595959" }}
                >
                  −
                </button>
                <span className="w-8 text-center" style={{ color: "#595959" }}>
                  {people}
                </span>
                <button
                  onClick={handlePeopleIncrease}
                  className="w-6 h-6 flex items-center justify-center rounded border border-gray-400 text-lg"
                  style={{ color: "#595959" }}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Objective Input */}
          <div className="w-full mb-8">
            <input
              type="text"
              placeholder="ระบุจุดประสงค์"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none"
              style={{ color: "#595959" }}
            />
          </div>

          {/* Buttons */}
          <div className="w-full flex gap-3 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="flex-1 py-3 rounded-full border border-gray-400 text-gray-600 text-sm font-medium hover:bg-gray-100 transition"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleBooking}
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-full text-white text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
              style={{ backgroundColor: "#FF7F50" }}
            >
              {isSubmitting ? "กำลังบันทึก..." : "จองห้อง"}
            </button>
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 backdrop-blur-xs bg-opacity-50 flex items-center justify-center z-50">
          <div className="w-full max-w-[320px] mx-4 bg-white rounded-lg p-8 flex flex-col items-center text-center">
            {/* Orange Header Bar */}
            <div className="w-[calc(100%+64px)] -mx-8 -mt-8 mb-6 py-4 rounded-t-lg" style={{ backgroundColor: "#FF7F50" }}>
              <p className="text-white font-medium">
                จองห้องเรียบร้อย
              </p>
            </div>

            {/* Message */}
            <p className="text-xl font-bold mb-6" style={{ color: "#B71C1C" }}>
              โปรดรอการอนุมัติ
              <br />
              ก่อนเข้าใช้งาน
            </p>

            {/* Button */}
            <button
              onClick={handleApprovalModalClose}
              className="w-full py-3 rounded-full text-white font-medium text-sm hover:opacity-90 transition"
              style={{ backgroundColor: "#FF7F50" }}
            >
              ตกลง
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
