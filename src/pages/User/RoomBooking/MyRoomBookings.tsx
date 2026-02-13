import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../../../components/Header"
import type { ReturnBookingData } from "../../../App"

interface RoomBooking {
  id: string
  room: string
  time: string
  name: string
  bookingCode: string
  image: string
  status: "pending" | "approved" | "inuse"
}

interface MyRoomBookingsProps {
  setReturnBookingData: (data: ReturnBookingData) => void
}

export default function MyRoomBookings({ setReturnBookingData }: MyRoomBookingsProps) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "inuse" | "all">("all")

  const bookings: RoomBooking[] = [
    {
      id: "1",
      room: "ห้องประชุม (เรียองใหญ่)",
      time: "12 เมษายน 2568 09:00-11:00",
      name: "สมชาย จงใจดี",
      bookingCode: "จองเมื่อ: 12 เมษายน 2568",
      image: "🏢",
      status: "pending"
    },
    {
      id: "3",
      room: "ห้องประชุม (เรียองใหญ่)",
      time: "12 เมษายน 2568 09:00-11:00",
      name: "สมชาย จงใจดี",
      bookingCode: "จองเมื่อ: 12 เมษายน 2568",
      image: "🏢",
      status: "approved"
    },
    {
      id: "4",
      room: "ห้องประชุม (เรียองใหญ่)",
      time: "12 เมษายน 2568 09:00-11:00",
      name: "สมชาย จงใจดี",
      bookingCode: "จองเมื่อ: 12 เมษายน 2568",
      image: "🏢",
      status: "inuse"
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "#FF7F50" // Orange
      case "approved":
        return "#228B22" // green
      case "inuse":
        return "#228B22" // Green
      default:
        return "#595959"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "รอยืนยัน"
      case "approved":
        return "อนุมัติแล้ว"
      case "inuse":
        return "เสร็จสิ้น"
      case "all":
        return "ทั้งหมด"
      default:
        return ""
    }
  }

  const getButtonText = (status: string) => {
    switch (status) {
      case "pending":
        return "ยกเลิก"
      case "approved":
        return "ยกเลิก"
      case "inuse":
        return "คืนห้อง"
      default:
        return ""
    }
  }

  const filteredBookings = activeTab === "all" 
    ? bookings 
    : bookings.filter(booking => booking.status === activeTab)
  
  const tabs: Array<"pending" | "approved" | "inuse" | "all"> = ["all", "pending", "approved", "inuse"]

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
      <Header title="การจองของฉัน" />

      {/* ===== CONTENT ===== */}
      <div className="mt-6 flex justify-center">
        <div className="w-full max-w-[360px] px-4 flex flex-col items-center">
          {/* Tabs */}
          <div className="w-full flex gap-2 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  flex-1 py-2 px-3 rounded-lg text-xs font-medium transition
                  ${activeTab === tab 
                    ? "bg-white border-2" 
                    : "bg-white border"
                  }
                `}
                style={{
                  borderColor: activeTab === tab ? "#FF7F50" : "#000000",
                  color: activeTab === tab ? "#FF7F50" : "#595959"
                }}
              >
                {getStatusLabel(tab)}
              </button>
            ))}
          </div>

          {/* Bookings List */}
          <div className="w-full flex flex-col gap-4">
            {filteredBookings.length > 0 ? (
              filteredBookings.map((booking) => (
                <div key={booking.id} className="w-full bg-white rounded-lg overflow-hidden border border-gray-300">
                  {/* Status Bar with Label */}
                  <div
                    className="w-full px-4 py-2 text-white text-xs font-semibold"
                    style={{ backgroundColor: getStatusColor(booking.status) }}
                  >
                    {getStatusLabel(booking.status)}
                  </div>

                  {/* Booking Content */}
                  <div className="p-4 flex gap-4">
                    {/* Image */}
                    <div className="w-20 h-20 flex-shrink-0 rounded-lg bg-gray-200 flex items-center justify-center text-3xl">
                      {booking.image}
                    </div>

                    {/* Info */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <p className="font-medium text-sm" style={{ color: "#595959" }}>
                          {booking.room}
                        </p>
                        <p className="text-xs mt-1" style={{ color: "#595959" }}>
                          {booking.time}
                        </p>
                        <p className="text-xs mt-1" style={{ color: "#595959" }}>
                          ผู้จอง: {booking.name}
                        </p>
                        <p className="text-xs mt-1" style={{ color: "#595959" }}>
                          {booking.bookingCode}
                        </p>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex flex-col justify-center">
                      <button
                        onClick={() => { setReturnBookingData(booking); navigate('/room-booking/return') }}
                        className="px-4 py-2 rounded-lg text-white text-xs font-medium hover:opacity-90 transition"
                        style={{ backgroundColor: "#FF7F50" }}
                      >
                        {getButtonText(booking.status)}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="w-full text-center py-8">
                <p style={{ color: "#595959" }}>ไม่มีการจองในหมวดนี้</p>
              </div>
            )}
          </div>

          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="w-full mt-8 py-3 rounded-full border border-gray-400 text-gray-600 text-sm font-medium hover:bg-gray-100 transition mb-6"
          >
            ย้อนกลับ
          </button>
        </div>
      </div>
    </div>
  )
}
