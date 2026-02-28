import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { addDoc, collection } from "firebase/firestore"
import { db } from "../../../firebase/firebase"
import { useAuth } from "../../../hooks/useAuth"
import Header from "../../../components/Header"
import DatePicker from "../../../components/DatePicker"
import { sendRoomBookingEmailToAdmin } from "../../../utils/emailService"
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
  const [date, setDate] = useState(bookingData?.selectedDate || "")
  const [startTime, setStartTime] = useState(bookingData?.time?.split(" - ")[0] || "")
  const [endTime, setEndTime] = useState(bookingData?.time?.split(" - ")[1] || "")
  const [people, setPeople] = useState(1)
  const [objective, setObjective] = useState("")
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Format time key from "HH:00" format
  const getTimeKey = (time: string) => {
    const [hours] = time.split(":")
    return parseInt(hours)
  }

  // Format time
  const formatTime = (hours: number) => {
    return `${String(hours).padStart(2, "0")}:00`
  }

  // Get day key from date for timeRanges lookup
  const getDayKey = (dateString: string) => {
    const date = new Date(dateString + "T00:00:00")
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    return days[date.getDay()]
  }

  // Check if a date is available based on usageDays
  const isDateAvailable = (dateString: string) => {
    if (!bookingData?.usageDays) return true // If no usageDays defined, assume all days available
    const dayKey = getDayKey(dateString)
    return bookingData.usageDays[dayKey] ?? false
  }

  // Get available start times from slots or generate based on timeRanges
  const availableStartTimes = bookingData?.availableSlots && bookingData.availableSlots.length > 0
    ? bookingData.availableSlots.filter(slot => slot.available).map(slot => slot.time)
    : (() => {
        // Check if the selected date is available
        if (!date || !isDateAvailable(date)) {
          return [] // No times available for unavailable days
        }
        
        if (bookingData?.timeRanges) {
          const dayKey = getDayKey(date)
          const timeRange = bookingData.timeRanges[dayKey]
          if (timeRange) {
            const startHour = parseInt(timeRange.start.split(':')[0])
            const endHour = parseInt(timeRange.end.split(':')[0])
            return generateTimeOptions(startHour, endHour)
          }
        }
        return generateTimeOptions(9, 17) // Default: 09:00 to 17:00
      })()

  // Generate time options within a range
  function generateTimeOptions(startHour: number, endHour: number): string[] {
    const times: string[] = []
    for (let hour = startHour; hour < endHour; hour++) {
      times.push(formatTime(hour))
    }
    return times
  }

  // Get available end times (within 2 hours of start time, respecting timeRanges)
  const getAvailableEndTimes = () => {
    if (!startTime || !date) return []
    
    // Check if date is available
    if (!isDateAvailable(date)) {
      return []
    }
    
    const startHour = getTimeKey(startTime)
    let maxHour = Math.min(startHour + 2, 23)
    
    // Respect room's timeRanges if available
    if (bookingData?.timeRanges) {
      const dayKey = getDayKey(date)
      const timeRange = bookingData.timeRanges[dayKey]
      if (timeRange) {
        const rangeEndHour = parseInt(timeRange.end.split(':')[0])
        maxHour = Math.min(maxHour, rangeEndHour)
      }
    }
    
    const endTimes: string[] = []
    for (let hour = startHour + 1; hour <= maxHour; hour++) {
      endTimes.push(formatTime(hour))
    }
    return endTimes
  }

  const handlePeopleIncrease = () => {
    setPeople(people + 1)
  }

  const handlePeopleDecrease = () => {
    if (people > 1) {
      setPeople(people - 1)
    }
  }

  const handleBooking = async () => {
    if (!date || !startTime || !endTime) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน")
      return
    }

    setIsSubmitting(true)
    try {
      // Save to Firebase
      await addDoc(collection(db, "roomBookings"), {
        roomCode: bookingData?.room || "",
        roomType: "", // Can be enhanced to include room type
        userName: user?.displayName || user?.email || "ผู้ใช้",
        userId: user?.uid || "",
        userEmail: user?.email || "",
        date: date,
        startTime: startTime,
        endTime: endTime,
        purpose: objective || "",
        people: people,
        status: "pending",
        bookedAt: new Date().toISOString()
      })

      // Send notification to admin only (wait for admin approval to notify user)
      const emailData = {
        adminEmail: import.meta.env.VITE_ADMIN_EMAIL || 'admin@example.com',
        userEmail: user?.email || '',
        userName: user?.displayName || user?.email || 'ผู้ใช้',
        roomName: bookingData?.room || '',
        date: date,
        startTime: startTime,
        endTime: endTime,
        people: people,
        objective: objective || '-',
        userId: user?.uid || ''
      }

      // Send notification to admin only (user will be notified after admin approval)
      if (user?.email) {
        await sendRoomBookingEmailToAdmin(emailData)
      }

      onConfirmBooking({
        room: bookingData?.room || "",
        date,
        time: `${startTime} - ${endTime}`,
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
                usageDays={bookingData?.usageDays}
              />
            </div>
          </div>

          {/* Time Dropdown */}
          {date && !isDateAvailable(date) ? (
            <div className="w-full mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">ห้องนี้ปิดในวันนี้ กรุณาเลือกวันอื่น</p>
            </div>
          ) : (
            <>
              <div className="w-full mb-4">
                <label className="block text-sm font-medium mb-2" style={{ color: "#595959" }}>
                  เวลาเริ่มต้น
                </label>
                <select
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value)
                    // Auto-set end time to start + 1 hour
                    if (e.target.value) {
                      const startHour = getTimeKey(e.target.value)
                      const endHour = Math.min(startHour + 1, 23)
                      setEndTime(formatTime(endHour))
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none appearance-none bg-white"
                  style={{ color: "#595959" }}
                >
                  {!startTime && <option value="" disabled>เลือกเวลาเริ่มต้น</option>}
                  {availableStartTimes.length === 0 ? (
                    <option disabled>ไม่มีเวลาว่างในวันนี้</option>
                  ) : (
                    availableStartTimes.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* End Time Dropdown */}
              <div className="w-full mb-4">
                <label className="block text-sm font-medium mb-2" style={{ color: "#595959" }}>
                  เวลาสิ้นสุด (สูงสุด 2 ชั่วโมง)
                </label>
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={!startTime}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none appearance-none bg-white disabled:opacity-50"
                  style={{ color: "#595959" }}
                >
                  {!endTime && startTime && <option value="" disabled>เลือกเวลาสิ้นสุด</option>}
                  {getAvailableEndTimes().map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

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
            {(() => {
              const isFormComplete = date && startTime && endTime && isDateAvailable(date)
              return (
                <>
                  <button
                    onClick={() => {
                      if (window.history.length > 1) {
                        navigate(-1)
                      } else {
                        navigate('/room-booking')
                      }
                    }}
                    className="flex-1 py-3 rounded-full border border-gray-400 text-gray-600 text-sm font-medium hover:bg-gray-100 transition"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleBooking}
                    disabled={isSubmitting || !isFormComplete}
                    className="flex-1 py-3 rounded-full text-white text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
                    style={{ backgroundColor: "#FF7F50" }}
                  >
                    {isSubmitting ? "กำลังบันทึก..." : "จองห้อง"}
                  </button>
                </>
              )
            })()}
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
