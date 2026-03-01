import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore"
import { db } from "../../../firebase/firebase"
import { useAuth } from "../../../hooks/useAuth"
import Header from "../../../components/Header"
import type { ReturnBookingData } from "../../../App"

interface Member {
  id: string
  name: string
  studentId: string
}

interface RoomBooking {
  id: string
  roomCode: string
  room: string
  time: string
  date: string
  name: string
  bookedAt: string
  image: string
  status: "pending" | "approved" | "returned" | "cancelled"
  startTime: string
  endTime: string
  people: number
  purpose: string
  members?: Member[]
  cancellationReason?: string
  cancelledBy?: string
  cancelledByType?: "admin" | "user"
  cancelledAt?: string
}

interface MyRoomBookingsProps {
  setReturnBookingData: (data: ReturnBookingData) => void
}

export default function MyRoomBookings({ setReturnBookingData }: MyRoomBookingsProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "returned" | "cancelled" | "all">("all")
  const [bookings, setBookings] = useState<RoomBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<RoomBooking | null>(null)
  const [showCancellationModal, setShowCancellationModal] = useState(false)
  const [cancellationReason, setCancellationReason] = useState("")
  const [bookingToCancel, setBookingToCancel] = useState<RoomBooking | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)

  useEffect(() => {
    fetchMyBookings()
  }, [user])

  const fetchMyBookings = async () => {
    if (!user?.uid) {
      setBookings([])
      setLoading(false)
      return
    }

    try {
      const q = query(
        collection(db, "roomBookings"),
        where("userId", "==", user.uid)
      )
      const querySnapshot = await getDocs(q)
      
      const fetchedBookings: RoomBooking[] = []
      for (const doc of querySnapshot.docs) {
        const data = doc.data()
        fetchedBookings.push({
          id: doc.id,
          roomCode: data.roomCode || "",
          room: data.roomCode || "ห้องประชุม",
          time: `${formatThaiDate(data.date)} ${data.startTime}-${data.endTime}`,
          date: data.date,
          name: data.userName || "ผู้ใช้",
          bookedAt: formatThaiDate(data.bookedAt),
          image: "🏢",
          status: data.status || "upcoming",
          startTime: data.startTime,
          endTime: data.endTime,
          people: data.people || 0,
          purpose: data.purpose || "",
          members: data.members || [],
          cancellationReason: data.cancellationReason || "",
          cancelledBy: data.cancelledBy || "",
          cancelledByType: data.cancelledByType || "user",
          cancelledAt: data.cancelledAt ? formatThaiDate(data.cancelledAt) : ""
        })
      }

      // Sort by date descending
      fetchedBookings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setBookings(fetchedBookings)
    } catch (error) {
      console.error("Error fetching bookings:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatThaiDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
                    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"]
    const day = date.getDate()
    const month = months[date.getMonth()]
    const year = date.getFullYear() + 543 // Convert to Buddhist Era
    return `${day} ${month} ${year}`
  }

  const getStatusColor = (status: string, cancelledByType?: "user" | "admin") => {
    switch (status) {
      case "pending":
        return "#FF7F50" // Orange
      case "approved":
        return "#4169E1" // Royal Blue
      case "returned":
        return "#228B22" // Green
      case "cancelled":
        if (cancelledByType === "admin") {
          return "#DC2626" // Dark Red for admin denial
        }
        return "#999999" // Gray for user cancellation
      default:
        return "#595959"
    }
  }

  const getStatusLabel = (status: string, cancelledByType?: "user" | "admin") => {
    switch (status) {
      case "pending":
        return "รอยืนยัน"
      case "approved":
        return "อนุมัติแล้ว"
      case "returned":
        return "คืนห้องแล้ว"
      case "cancelled":
        if (cancelledByType === "admin") {
          return "ปฏิเสธ"
        }
        return "ยกเลิก"
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
        return "คืนห้อง"
      case "returned":
        return "รอการยืนยัน"
      case "cancelled":
        return "ดูรายละเอียด"
      default:
        return ""
    }
  }

  const filteredBookings = activeTab === "all" 
    ? bookings 
    : bookings.filter(booking => booking.status === activeTab)
  
  const tabs: Array<"pending" | "approved" | "returned" | "cancelled" | "all"> = ["all", "pending", "approved", "returned", "cancelled"]

  const handleCancelClick = (booking: RoomBooking) => {
    setBookingToCancel(booking)
    setCancellationReason("")
    setShowCancellationModal(true)
  }

  const handleConfirmCancellation = async () => {
    if (!bookingToCancel || !cancellationReason.trim()) {
      alert("กรุณาระบุเหตุผลการยกเลิก")
      return
    }

    setIsCancelling(true)
    try {
      const bookingRef = doc(db, "roomBookings", bookingToCancel.id)
      const cancelledAtISO = new Date().toISOString()
      
      await updateDoc(bookingRef, {
        status: "cancelled",
        cancellationReason: cancellationReason.trim(),
        cancelledBy: user?.displayName || user?.email || "ผู้ใช้",
        cancelledByType: "user",
        cancelledAt: cancelledAtISO
      })

      // Update local state
      setBookings(bookings.map(b =>
        b.id === bookingToCancel.id
          ? { 
              ...b, 
              status: "cancelled", 
              cancellationReason: cancellationReason,
              cancelledBy: user?.displayName || user?.email || "ผู้ใช้",
              cancelledByType: "user",
              cancelledAt: formatThaiDate(cancelledAtISO)
            }
          : b
      ))

      setShowCancellationModal(false)
      setBookingToCancel(null)
      setCancellationReason("")
    } catch (error) {
      console.error("Error cancelling booking:", error)
      alert("เกิดข้อผิดพลาดในการยกเลิกการจอง")
    } finally {
      setIsCancelling(false)
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
      <Header title="การจองของฉัน" />

      {/* ===== CONTENT ===== */}
      <div className="mt-6 flex justify-center">
        <div className="w-full max-w-[360px] px-4 flex flex-col items-center">

                    {/* Back Button */}
          <button
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1)
              } else {
                navigate('/home')
              }
            }}
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
            {loading ? (
              <div className="w-full text-center py-8">
                <p style={{ color: "#595959" }}>กำลังโหลดข้อมูล...</p>
              </div>
            ) : filteredBookings.length > 0 ? (
              filteredBookings.map((booking) => (
                <div key={booking.id} className="w-full bg-white rounded-lg overflow-hidden border border-gray-300">
                  {/* Status Bar with Label */}
                  <div
                    className="w-full px-4 py-2 text-white text-xs font-semibold"
                    style={{ backgroundColor: getStatusColor(booking.status, booking.cancelledByType) }}
                  >
                    {getStatusLabel(booking.status, booking.cancelledByType)}
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
                          จองเมื่อ: {booking.bookedAt}
                        </p>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex flex-col justify-center">
                      <button
                        onClick={() => {
                          if (booking.status === "pending") {
                            handleCancelClick(booking)
                          } else if (booking.status === "approved") {
                            setReturnBookingData({
                              ...booking,
                              room: booking.room
                            } as any)
                            navigate('/room-booking/return')
                          } else if (booking.status === "returned" || booking.status === "cancelled" || booking.status === "completed") {
                            setSelectedBooking(booking)
                          }
                        }}
                        disabled={booking.status === "returned"}
                        className="px-4 py-2 rounded-lg text-white text-xs font-medium hover:opacity-90 transition disabled:opacity-50"
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
        </div>
      </div>

      {/* Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 backdrop-blur-xs bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-bold text-gray-900">รายละเอียดการจอง</h2>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-600 font-medium">ห้อง:</p>
                <p className="text-gray-800">{selectedBooking.room}</p>
              </div>
              <div>
                <p className="text-gray-600 font-medium">วันที่ เวลา:</p>
                <p className="text-gray-800">{selectedBooking.time}</p>
              </div>
              <div>
                <p className="text-gray-600 font-medium">จำนวนคน:</p>
                <p className="text-gray-800">{selectedBooking.people} คน</p>
              </div>
              {selectedBooking.members && selectedBooking.members.length > 0 && (
                <div>
                  <p className="text-gray-600 font-medium mb-2">สมาชิก:</p>
                  <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
                    {selectedBooking.members.map((member, index) => (
                      <div key={member.id || index} className="text-sm">
                        <p className="text-gray-700">{index + 1}. {member.name}</p>
                        <p className="text-gray-600 text-xs">เลขประจำตัว: {member.studentId}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedBooking.purpose && (
                <div>
                  <p className="text-gray-600 font-medium">จุดประสงค์:</p>
                  <p className="text-gray-800">{selectedBooking.purpose}</p>
                </div>
              )}
              {selectedBooking.status === "cancelled" && selectedBooking.cancellationReason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
                  <p className="text-red-900 font-medium text-xs mb-2">
                    {selectedBooking.cancelledByType === "admin" ? "เหตุผลการปฏิเสธ:" : "เหตุผลการยกเลิก:"}
                  </p>
                  <p className="text-red-800 text-sm mb-3">{selectedBooking.cancellationReason}</p>
                  {selectedBooking.cancelledBy && (
                    <p className="text-red-700 text-xs">{selectedBooking.cancelledByType === "admin" ? "ปฏิเสธโดย" : "ยกเลิกโดย"}: {selectedBooking.cancelledBy}</p>
                  )}
                  {selectedBooking.cancelledAt && (
                    <p className="text-red-700 text-xs">{selectedBooking.cancelledByType === "admin" ? "ปฏิเสธเมื่อ" : "ยกเลิกเมื่อ"}: {selectedBooking.cancelledAt}</p>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedBooking(null)}
              className="w-full mt-6 px-4 py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition"
            >
              ปิด
            </button>
          </div>
        </div>
      )}

      {/* Cancellation Reason Modal */}
      {showCancellationModal && bookingToCancel && (
        <div className="fixed inset-0 backdrop-blur-xs bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-bold text-gray-900">ยกเลิกการจอง</h2>
              <button
                onClick={() => {
                  setShowCancellationModal(false)
                  setBookingToCancel(null)
                  setCancellationReason("")
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              ห้อง: <span className="font-medium text-gray-900">{bookingToCancel.room}</span>
            </p>
            <p className="text-sm text-gray-600 mb-4">
              วันที่ เวลา: <span className="font-medium text-gray-900">{bookingToCancel.time}</span>
            </p>
            <p className="text-sm text-gray-600 mb-4">
              ยกเลิกโดย: <span className="font-medium text-gray-900">{user?.displayName || user?.email || "ผู้ใช้"}</span>
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                เหตุผลการยกเลิก <span className="text-red-600">*</span>
              </label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="กรุณาระบุเหตุผลการยกเลิกการจอง..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancellationModal(false)
                  setBookingToCancel(null)
                  setCancellationReason("")
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmCancellation}
                disabled={isCancelling || !cancellationReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {isCancelling ? "กำลังบันทึก..." : "ยืนยันการยกเลิก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}