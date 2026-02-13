import { useNavigate } from "react-router-dom"
import Header from "../../../components/Header"
import BookRoomButton from "../../../components/BookRoomButton"
import ListPopularRoom from "../../../components/ListPopularRoom"
import type { BookingData } from "../../../App"

interface Room {
  id: string
  name: string
  image: string
  badge: string
  badgeColor: string
  availability: string
  availabilityColor: string
  capacity: string
  status: string
}

interface RoomBookingProps {
  setBookingData: (data: BookingData) => void
}

const rooms: Room[] = [
  {
    id: "1",
    name: "Room A",
    image: "🏢",
    badge: "HOT",
    badgeColor: "bg-orange-500",
    availability: "Available",
    availabilityColor: "bg-green-500",
    capacity: "Capacity: 10 People",
    status: "Book Now"
  },
  {
    id: "2",
    name: "Room B",
    image: "🏢",
    badge: "NEW",
    badgeColor: "bg-green-500",
    availability: "Available",
    availabilityColor: "bg-green-500",
    capacity: "Capacity: 8 People",
    status: "Book Now"
  },
  {
    id: "3",
    name: "Room C",
    image: "🏢",
    badge: "FULL",
    badgeColor: "bg-red-500",
    availability: "Full",
    availabilityColor: "bg-red-500",
    capacity: "Capacity: 12 People",
    status: "Book Now"
  },
  {
    id: "4",
    name: "Room D",
    image: "🏢",
    badge: "RECOMMENDED",
    badgeColor: "bg-green-600",
    availability: "Available",
    availabilityColor: "bg-green-500",
    capacity: "TV",
    status: "Book Now"
  }
]

export default function RoomBooking({ setBookingData }: RoomBookingProps) {
  const navigate = useNavigate()
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
      <Header title="ระบบการจองห้อง" />

      {/* ===== CONTENT ===== */}
      <div className="mt-6 flex justify-center">
        <div className="w-full max-w-[360px] px-4 flex flex-col items-center">
          {/* Navigation Buttons */}
          <div className="w-full flex gap-4 mb-8 bg-[#FFDAB9]">
            <BookRoomButton
              emoji="📅"
              label="Room Availability"
              onClick={() => navigate('/room-booking/availability')}
            />
            <BookRoomButton
              emoji="📋"
              label="My Bookings"
              onClick={() => navigate('/room-booking/my-bookings')}
            />
          </div>
          {/* Popular Rooms List */}
          <ListPopularRoom 
            rooms={rooms}
            onBookNow={(room) => { setBookingData({ room: room.name, roomImage: room.image, time: '' }); navigate('/room-booking/form') }}
          />

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
    </div>
  )
}
