import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../../../components/Header"
import type { BookingData } from "../../../App"

interface TimeSlot {
  time: string
  available: boolean
  label?: string
}

interface RoomSchedule {
  id: string
  name: string
  image: string
  badge: string
  badgeColor: string
  timeSlots: TimeSlot[]
}

interface RoomAvailabilityProps {
  setBookingData: (data: BookingData) => void
}

const timeHeaders = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"]

const roomsSchedule: RoomSchedule[] = [
  {
    id: "1",
    name: "Room A",
    image: "🏢",
    badge: "HOT",
    badgeColor: "bg-orange-500",
    timeSlots: [
      { time: "09:00", available: false, label: "ร่าง (10:00 -)" },
      { time: "10:00", available: true, label: "ว่าง 10:00 - 11:00" },
      { time: "11:00", available: false, label: "ร่าง 13:00 - 15:00" },
      { time: "12:00", available: false, label: "ร่าง 13:00 - 15:00" },
      { time: "13:00", available: false, label: "ร่าง 13:00 - 15:00" },
      { time: "14:00", available: false, label: "ร่าง 13:00 - 15:00" },
      { time: "15:00", available: true, label: "ว่าง 15:00 - 16:00" }
    ]
  },
  {
    id: "2",
    name: "Room B",
    image: "🏢",
    badge: "NEW",
    badgeColor: "bg-green-500",
    timeSlots: [
      { time: "09:00", available: true, label: "ว่าง 09:00 - 10:00" },
      { time: "10:00", available: true, label: "ว่าง 10:00 - 11:00" },
      { time: "11:00", available: false, label: "คุณสมัยที่ (11:00 - 13:00)" },
      { time: "12:00", available: false, label: "คุณสมัยที่ (11:00 - 13:00)" },
      { time: "13:00", available: true, label: "ว่าง 13:00 - 14:00" },
      { time: "14:00", available: true, label: "ว่าง 14:00 - 15:00" },
      { time: "15:00", available: true, label: "ว่าง 15:00 - 16:00" }
    ]
  },
  {
    id: "3",
    name: "Room C",
    image: "🏢",
    badge: "FULL",
    badgeColor: "bg-red-500",
    timeSlots: [
      { time: "09:00", available: false, label: "ร่าง (09:00 - 11:00)" },
      { time: "10:00", available: false, label: "สัเตทส์ (09:00 - 11:00)" },
      { time: "11:00", available: false, label: "สัเตทส์ (09:00 - 11:00)" },
      { time: "12:00", available: true, label: "ว่าง 12:00 - 13:00" },
      { time: "13:00", available: false, label: "ร่าง 13:00 - 15:00" },
      { time: "14:00", available: false, label: "ร่าง 13:00 - 15:00" },
      { time: "15:00", available: false, label: "ร่าง 13:00 - 15:00" }
    ]
  },
  {
    id: "4",
    name: "Room D",
    image: "🏢",
    badge: "RECOMMENDED",
    badgeColor: "bg-green-600",
    timeSlots: [
      { time: "09:00", available: true, label: "ว่าง 09:00 - 10:00" },
      { time: "10:00", available: true, label: "ว่าง 10:00 - 11:00" },
      { time: "11:00", available: true, label: "ว่าง 11:00 - 12:00" },
      { time: "12:00", available: true, label: "ว่าง 12:00 - 13:00" },
      { time: "13:00", available: true, label: "ว่าง 13:00 - 14:00" },
      { time: "14:00", available: true, label: "ว่าง 14:00 - 15:00" },
      { time: "15:00", available: true, label: "ว่าง 15:00 - 16:00" }
    ]
  }
]

export default function RoomAvailability({ setBookingData }: RoomAvailabilityProps) {
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState<"today" | "tomorrow" | "custom">("today")
  const [showBookModal, setShowBookModal] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ room: string; time: string; label: string } | null>(null)
  const [modalPosition, setModalPosition] = useState<{ top: number; left: number } | null>(null)

  const handleTimeSlotClick = (roomName: string, timeSlot: TimeSlot, event: React.MouseEvent<HTMLButtonElement>) => {
    if (timeSlot.available) {
      const rect = event.currentTarget.getBoundingClientRect()
      setSelectedSlot({ room: roomName, time: timeSlot.time, label: timeSlot.label || "ว่าง" })
      setModalPosition({
        top: rect.top - 10,
        left: rect.left + rect.width / 2
      })
      setShowBookModal(true)
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
      <Header title="สถานะห้องว่าง" />

      {/* ===== CONTENT ===== */}
      <div className="mt-6 flex justify-center">
        <div className="w-full max-w-[360px] px-4 flex flex-col items-center">
          {/* Date Filter Tabs */}
          <div className="w-full flex gap-2 mb-6 overflow-x-auto">
            <button
              onClick={() => setSelectedDate("today")}
              className={`px-4 py-2 rounded-full border-2 transition whitespace-nowrap ${
                selectedDate === "today"
                  ? "border-gray-400 bg-white"
                  : "border-gray-300 bg-gray-50"
              }`}
              style={{ color: "#595959" }}
            >
              วันนี้
            </button>
            <button
              onClick={() => setSelectedDate("tomorrow")}
              className={`px-4 py-2 rounded-full border-2 transition whitespace-nowrap ${
                selectedDate === "tomorrow"
                  ? "border-gray-400 bg-white"
                  : "border-gray-300 bg-gray-50"
              }`}
              style={{ color: "#595959" }}
            >
              พรุ่งนี้
            </button>
            <button
              onClick={() => setSelectedDate("custom")}
              className={`px-4 py-2 rounded-full border-2 transition whitespace-nowrap flex items-center gap-2 ${
                selectedDate === "custom"
                  ? "border-gray-400 bg-white"
                  : "border-gray-300 bg-gray-50"
              }`}
              style={{ color: "#595959" }}
            >
              เลือกวันที่ 📅
            </button>
          </div>

          {/* Time Header & Room Schedule - Horizontal Scrollable */}
          <div className="w-full overflow-x-auto mb-6">
            <div className="min-w-max">
              {/* Time Header */}
              <div className="flex gap-2 mb-4 pb-2">
                <div className="w-24 flex-shrink-0"></div>
                {timeHeaders.map((time) => (
                  <div
                    key={time}
                    className="flex-shrink-0 w-16 text-center text-xs font-medium"
                    style={{ color: "#595959" }}
                  >
                    {time}
                  </div>
                ))}
              </div>

              {/* Room Schedule List */}
              <div className="space-y-4">
                {roomsSchedule.map((room) => (
                  <div key={room.id} className="flex gap-2">
                    {/* Room Image & Name - Fixed */}
                    <div className="w-24 flex-shrink-0">
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center mb-2">
                        <span className="text-2xl">{room.image}</span>
                        <div
                          className={`absolute top-1 left-1 ${room.badgeColor} text-white text-xs font-bold px-1 py-0.5 rounded`}
                        >
                          {room.badge}
                        </div>
                      </div>
                      <h3 className="font-semibold text-xs" style={{ color: "#595959" }}>
                        {room.name}
                      </h3>
                    </div>

                    {/* Time Slots - Scrollable */}
                    <div className="flex gap-2">
                      {room.timeSlots.map((slot, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => handleTimeSlotClick(room.name, slot, e)}
                          disabled={!slot.available}
                          className={`
                            flex-shrink-0 w-16 py-2 rounded text-xs font-medium
                            transition
                            ${
                              slot.available
                                ? "text-white cursor-pointer hover:opacity-90"
                                : "text-white cursor-not-allowed opacity-75"
                            }
                          `}
                          style={{
                            backgroundColor: slot.available ? "#228B22" : "#FF7F50"
                          }}
                        >
                          {slot.available ? "ว่าง" : "ไม่ว่าง"}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

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
            "
          >
            ย้อนกลับ
          </button>
        </div>
      </div>

      {/* Book Tooltip Modal */}
      {showBookModal && selectedSlot && modalPosition && (
        <div className="fixed inset-0 z-50" onClick={() => setShowBookModal(false)}>
          {/* Tooltip Popup */}
          <div
            className="fixed bg-white rounded-lg shadow-xl p-4 w-56"
            style={{
              top: `${modalPosition.top}px`,
              left: `${modalPosition.left}px`,
              transform: "translate(-50%, -100%)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Time Range Display */}
            <p className="text-sm font-semibold mb-3" style={{ color: "#595959" }}>
              {selectedSlot.time && selectedSlot.label ? `${selectedSlot.label}` : selectedSlot.label}
            </p>

            {/* Book Now Button */}
            <button
              onClick={() => {
                // Find the room object to get the image
                const room = roomsSchedule.find(r => r.name === selectedSlot.room)
                if (room) {
                  setBookingData({ room: selectedSlot.room, roomImage: room.image, time: selectedSlot.time })
                  navigate('/room-booking/form')
                }
                setShowBookModal(false)
                setSelectedSlot(null)
              }}
              className="w-full py-2 rounded-full text-white text-sm font-medium hover:opacity-90 transition"
              style={{ backgroundColor: "#FF7F50" }}
            >
              Book Now
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
