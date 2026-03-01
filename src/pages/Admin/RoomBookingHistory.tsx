import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { collection, getDocs, query, orderBy, updateDoc, doc } from "firebase/firestore"
import { db } from "../../firebase/firebase"
import Header from "../../components/Header"
import { sendRoomBookingConfirmationToUser, sendRoomBookingRejectionToUser } from "../../utils/emailService"

interface RoomBookingRecord {
  id: string
  roomCode: string
  roomName: string
  roomType: string
  userName: string
  userId: string
  userEmail: string
  date: string
  startTime: string
  endTime: string
  purpose: string
  status: "completed" | "cancelled" | "pending" | "approved" | "returned"
  bookedAt: string
  cancellationReason?: string
  cancelledBy?: string
  cancelledByType?: "admin" | "user"
  cancelledAt?: string
  roomCondition?: string
  equipmentCondition?: string
  returnNotes?: string
  returnedAt?: string
  pictures?: string[]
}

export default function RoomBookingHistory() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "cancelled" | "denied" | "pending" | "approved">("all")
  const [roomTypeFilter, setRoomTypeFilter] = useState<"all" | "ห้องเรียน" | "ห้องปฏิบัติการ" | "ห้องประชุม">("all")
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month" | "custom">("all")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [bookingHistory, setBookingHistory] = useState<RoomBookingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelModalBookingId, setCancelModalBookingId] = useState<string | null>(null)
  const [cancellationReason, setCancellationReason] = useState("")
  const [returnDetailsModalOpen, setReturnDetailsModalOpen] = useState(false)
  const [selectedReturnBooking, setSelectedReturnBooking] = useState<RoomBookingRecord | null>(null)
  const [showPendingOnly, setShowPendingOnly] = useState(false)

  // Load booking history from Firebase
  useEffect(() => {
    const loadBookingHistory = async () => {
      try {
        const q = query(collection(db, "roomBookings"), orderBy("date", "desc"))
        const querySnapshot = await getDocs(q)
        const records: RoomBookingRecord[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          records.push({
            id: doc.id,
            roomCode: data.roomCode || "",
            roomName: data.roomCode || "",
            roomType: data.roomType || "",
            userName: data.userName || "",
            userId: data.userId || "",
            userEmail: data.userEmail || "",
            date: data.date || "",
            startTime: data.startTime || "",
            endTime: data.endTime || "",
            purpose: data.purpose || "",
            status: data.status || "upcoming",
            bookedAt: data.bookedAt || "",
            cancellationReason: data.cancellationReason || "",
            cancelledBy: data.cancelledBy || "",
            cancelledByType: data.cancelledByType || "user",
            cancelledAt: data.cancelledAt || "",
            roomCondition: data.roomCondition || "",
            equipmentCondition: data.equipmentCondition || "",
            returnNotes: data.returnNotes || "",
            returnedAt: data.returnedAt || "",
            pictures: data.pictures || []
          })
        })
        setBookingHistory(records)
      } catch (error) {
        console.error("Error loading room booking history:", error)
      } finally {
        setLoading(false)
      }
    }
    loadBookingHistory()
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('th-TH', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    })
  }

  const formatBookedAt = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('th-TH', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: RoomBookingRecord["status"], cancelledByType?: "user" | "admin") => {
    switch (status) {
      case "pending":
        return { text: "รอยืนยัน", color: "bg-orange-500" }
      case "approved":
        return { text: "อนุมัติแล้ว", color: "bg-blue-500" }
      case "completed":
        return { text: "เสร็จสิ้น", color: "bg-green-500" }
      case "cancelled":
        if (cancelledByType === "admin") {
          return { text: "ปฏิเสธ", color: "bg-red-600" }
        }
        return { text: "ยกเลิก", color: "bg-red-500" }
      case "returned":
        return { text: "คืนห้องแล้ว", color: "bg-purple-500" }
      default:
        return { text: "ไม่ทราบ", color: "bg-gray-500" }
    }
  }

  const handleApproveBooking = async (bookingId: string) => {
    try {
      let bookingData: any = null
      const bookingsSnapshot = await getDocs(collection(db, "roomBookings"))
      bookingsSnapshot.forEach((doc) => {
        if (doc.id === bookingId) {
          bookingData = doc.data()
        }
      })

      await updateDoc(doc(db, "roomBookings", bookingId), {
        status: "approved"
      })

      // Send approval email to user
      if (bookingData && bookingData.userEmail) {
        await sendRoomBookingConfirmationToUser({
          adminEmail: import.meta.env.VITE_ADMIN_EMAIL || 'admin@example.com',
          userEmail: bookingData.userEmail,
          userName: bookingData.userName || 'ผู้ใช้',
          roomName: bookingData.roomCode || 'ห้อง',
          date: bookingData.date || '',
          startTime: bookingData.startTime || '',
          endTime: bookingData.endTime || '',
          people: bookingData.people || 0,
          objective: bookingData.purpose || '',
          userId: bookingData.userId || ''
        })
      }

      // Refresh the bookings list
      const q = query(collection(db, "roomBookings"), orderBy("date", "desc"))
      const querySnapshot = await getDocs(q)
      const records: RoomBookingRecord[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        records.push({
          id: doc.id,
          roomCode: data.roomCode || "",
          roomName: data.roomCode || "",
          roomType: data.roomType || "",
          userName: data.userName || "",
          userId: data.userId || "",
          userEmail: data.userEmail || "",
          date: data.date || "",
          startTime: data.startTime || "",
          endTime: data.endTime || "",
          purpose: data.purpose || "",
          status: data.status || "pending",
          bookedAt: data.bookedAt || "",
          cancellationReason: data.cancellationReason || "",
          cancelledBy: data.cancelledBy || "",
          cancelledByType: data.cancelledByType || "user",
          cancelledAt: data.cancelledAt || "",
          roomCondition: data.roomCondition || "",
          equipmentCondition: data.equipmentCondition || "",
          returnNotes: data.returnNotes || "",
          returnedAt: data.returnedAt || "",
          pictures: data.pictures || []
        })
      })
      setBookingHistory(records)
      alert("อนุมัติการจองและส่งอีเมลยืนยันไปให้ผู้ใช้แล้ว")
    } catch (error) {
      console.error("Error approving booking:", error)
      alert("เกิดข้อผิดพลาดในการอนุมัติการจอง")
    }
  }

  const handleCancelBooking = (bookingId: string) => {
    setCancelModalBookingId(bookingId)
    setCancellationReason("")
    setCancelModalOpen(true)
  }

  const handleViewReturnDetails = (booking: RoomBookingRecord) => {
    setSelectedReturnBooking(booking)
    setReturnDetailsModalOpen(true)
  }

  const handleConfirmCancel = async () => {
    if (!cancelModalBookingId) return
    if (!cancellationReason.trim()) {
      alert("กรุณาระบุเหตุผลในการยกเลิก")
      return
    }
    try {
      // Get booking data before updating
      let bookingData: any = null
      const bookingsSnapshot = await getDocs(collection(db, "roomBookings"))
      bookingsSnapshot.forEach((doc) => {
        if (doc.id === cancelModalBookingId) {
          bookingData = doc.data()
        }
      })

      await updateDoc(doc(db, "roomBookings", cancelModalBookingId), {
        status: "cancelled",
        cancellationReason: cancellationReason,
        cancelledBy: "Admin",
        cancelledByType: "admin",
        cancelledAt: new Date().toISOString()
      })

      // Send rejection email to user
      if (bookingData && bookingData.userEmail) {
        await sendRoomBookingRejectionToUser({
          adminEmail: import.meta.env.VITE_ADMIN_EMAIL || 'admin@example.com',
          userEmail: bookingData.userEmail,
          userName: bookingData.userName || 'ผู้ใช้',
          roomName: bookingData.roomCode || 'ห้อง',
          date: bookingData.date || '',
          startTime: bookingData.startTime || '',
          endTime: bookingData.endTime || '',
          people: bookingData.people || 0,
          objective: bookingData.purpose || '',
          userId: bookingData.userId || '',
          rejectionReason: cancellationReason
        })
      }

      // Refresh the bookings list
      const q = query(collection(db, "roomBookings"), orderBy("date", "desc"))
      const querySnapshot = await getDocs(q)
      const records: RoomBookingRecord[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        records.push({
          id: doc.id,
          roomCode: data.roomCode || "",
          roomName: data.roomCode || "",
          roomType: data.roomType || "",
          userName: data.userName || "",
          userId: data.userId || "",
          userEmail: data.userEmail || "",
          date: data.date || "",
          startTime: data.startTime || "",
          endTime: data.endTime || "",
          purpose: data.purpose || "",
          status: data.status || "pending",
          bookedAt: data.bookedAt || "",
          cancellationReason: data.cancellationReason || "",
          cancelledBy: data.cancelledBy || "",
          cancelledByType: data.cancelledByType || "user",
          cancelledAt: data.cancelledAt || "",
          roomCondition: data.roomCondition || "",
          equipmentCondition: data.equipmentCondition || "",
          returnNotes: data.returnNotes || "",
          returnedAt: data.returnedAt || "",
          pictures: data.pictures || []
        })
      })
      setBookingHistory(records)
      setCancelModalOpen(false)
      setCancelModalBookingId(null)
      setCancellationReason("")
      alert("ปฏิเสธการจองและส่งอีเมลแจ้งไปให้ผู้ใช้แล้ว")
    } catch (error) {
      console.error("Error cancelling booking:", error)
      alert("เกิดข้อผิดพลาดในการปฏิเสธการจอง")
    }
  }

  // Date filter logic
  const isWithinDateRange = (bookingDate: string) => {
    if (dateFilter === 'all') return true
    
    const recordDate = new Date(bookingDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    switch (dateFilter) {
      case 'today':
        const todayEnd = new Date(today)
        todayEnd.setHours(23, 59, 59, 999)
        return recordDate >= today && recordDate <= todayEnd
      case 'week':
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        return recordDate >= weekAgo
      case 'month':
        const monthAgo = new Date(today)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        return recordDate >= monthAgo
      case 'custom':
        if (!customStartDate && !customEndDate) return true
        const start = customStartDate ? new Date(customStartDate) : new Date('1970-01-01')
        const end = customEndDate ? new Date(customEndDate + 'T23:59:59') : new Date()
        return recordDate >= start && recordDate <= end
      default:
        return true
    }
  }

  // Check if any filter is active
  const hasActiveFilters = filterStatus !== 'all' || roomTypeFilter !== 'all' || dateFilter !== 'all' || searchTerm !== '' || showPendingOnly

  const clearFilters = () => {
    setFilterStatus('all')
    setRoomTypeFilter('all')
    setDateFilter('all')
    setSearchTerm('')
    setCustomStartDate('')
    setCustomEndDate('')
    setShowPendingOnly(false)
  }

  const filteredHistory = bookingHistory
    .filter(record => {
      const matchesSearch = 
        record.roomCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.purpose.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = (() => {
        if (showPendingOnly) return record.status === "pending"
        if (filterStatus === "all") return true
        if (filterStatus === "denied") return record.status === "cancelled" && record.cancelledByType === "admin"
        if (filterStatus === "cancelled") return record.status === "cancelled" && record.cancelledByType === "user"
        return record.status === filterStatus
      })()
      
      const matchesRoomType = roomTypeFilter === "all" || record.roomType === roomTypeFilter
      const matchesDate = isWithinDateRange(record.date)
      
      return matchesSearch && matchesStatus && matchesRoomType && matchesDate
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="min-h-screen bg-white bg-[radial-gradient(#dbeafe_1px,transparent_1px)] bg-[length:18px_18px]">
      <Header title="ประวัติการจองห้อง" />

      <div className="mt-6 flex justify-center">
        <div className="w-full max-w-[400px] px-4 pb-6">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="                            
              w-full
              mb-4
              py-2
              rounded-full
              border border-gray-400
              text-gray-600
              text-sm font-medium
              hover:bg-gray-100
              transition
              flex items-center justify-center gap-2"
          >
            <img src="/arrow.svg" alt="back" className="w-5 h-5" />
          </button>

          {/* Search Bar */}
          <div className="mb-4 relative">
            <input
              type="text"
              placeholder="ค้นหาห้อง, ชื่อผู้จอง..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 px-4 border border-gray-300 rounded-lg outline-none text-sm focus:border-blue-500"
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
          </div>

          {/* Collapsible Filter Section */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg mb-6 overflow-hidden">
            {/* Filter Header - Always Visible */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-100 transition"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">🔧 ตัวกรอง</span>
                {hasActiveFilters && (
                  <span className="px-2 py-0.5 bg-cyan-100 text-cyan-600 text-xs rounded-full">
                    กำลังใช้งาน
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  พบ <span className="font-semibold text-cyan-600">{filteredHistory.length}</span> รายการ
                </span>
                <span className={`text-gray-400 transition-transform ${showFilters ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </div>
            </button>
            
            {/* Collapsible Filter Content */}
            {showFilters && (
              <div className="px-4 pb-4 border-t border-gray-200">
                {/* Status Filter */}
                <div className="mt-4 mb-4">
                  <p className="text-xs font-semibold text-gray-600 mb-2">สถานะ:</p>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { key: 'all', label: 'ทั้งหมด', color: 'gray' },
                      { key: 'pending', label: 'รอยืนยัน', color: 'orange' },
                      { key: 'approved', label: 'อนุมัติแล้ว', color: 'blue' },
                      { key: 'completed', label: 'เสร็จสิ้น', color: 'green' },
                      { key: 'denied', label: 'ปฏิเสธ', color: 'red' },
                      { key: 'cancelled', label: 'ยกเลิก', color: 'red' }
                    ].map((status) => (
                      <button
                        key={status.key}
                        onClick={() => setFilterStatus(status.key as typeof filterStatus)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                          filterStatus === status.key
                            ? status.color === 'gray' ? "bg-gray-700 text-white"
                            : status.color === 'orange' ? "bg-orange-500 text-white"
                            : status.color === 'blue' ? "bg-blue-500 text-white"
                            : status.color === 'green' ? "bg-green-500 text-white"
                            : status.key === 'denied' ? "bg-red-600 text-white"
                            : "bg-red-500 text-white"
                            : "border border-gray-300 text-gray-700 hover:border-gray-500"
                        }`}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Room Type Filter */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-600 mb-2">ประเภทห้อง:</p>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { key: 'all', label: 'ทั้งหมด' },
                      { key: 'ห้องเรียน', label: 'ห้องเรียน' },
                      { key: 'ห้องปฏิบัติการ', label: 'ห้องปฏิบัติการ' },
                      { key: 'ห้องประชุม', label: 'ห้องประชุม' }
                    ].map((type) => (
                      <button
                        key={type.key}
                        onClick={() => setRoomTypeFilter(type.key as typeof roomTypeFilter)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                          roomTypeFilter === type.key
                            ? "bg-cyan-500 text-white"
                            : "border border-gray-300 text-gray-700 hover:border-cyan-500"
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Filter */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-600 mb-2">ช่วงเวลา:</p>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { key: 'all', label: 'ทั้งหมด' },
                      { key: 'today', label: 'วันนี้' },
                      { key: 'week', label: '7 วันที่ผ่านมา' },
                      { key: 'month', label: '30 วันที่ผ่านมา' },
                      { key: 'custom', label: 'กำหนดเอง' }
                    ].map((date) => (
                      <button
                        key={date.key}
                        onClick={() => setDateFilter(date.key as typeof dateFilter)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                          dateFilter === date.key
                            ? "bg-purple-500 text-white"
                            : "border border-gray-300 text-gray-700 hover:border-purple-500"
                        }`}
                      >
                        {date.label}
                      </button>
                    ))}
                  </div>
                  
                  {/* Custom Date Range */}
                  {dateFilter === 'custom' && (
                    <div className="mt-3 flex gap-3 items-center flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">จาก:</span>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:border-purple-500 outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">ถึง:</span>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:border-purple-500 outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Pending Filter */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-600 mb-2">สถานะพิเศษ:</p>
                  <button
                    onClick={() => setShowPendingOnly(!showPendingOnly)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                      showPendingOnly
                        ? "bg-orange-500 text-white"
                        : "border border-gray-300 text-gray-700 hover:border-orange-500"
                    }`}
                  >
                    🔔 รอการอนุมัติ
                  </button>
                </div>

                {/* Clear Filters Button */}
                <div className="pt-3 border-t border-gray-200">
                  <button
                    onClick={clearFilters}
                    className="text-xs text-gray-500 hover:text-red-500 transition flex items-center gap-1"
                  >
                    ✕ ล้างตัวกรองทั้งหมด
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Booking History List */}
          <div className="flex flex-col gap-3">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
              </div>
            ) : filteredHistory.length > 0 ? (
              filteredHistory.map((record) => {
                const statusBadge = getStatusBadge(record.status, record.cancelledByType)
                return (
                  <div key={record.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-gray-800">{record.roomCode}</h3>
                        <p className="text-xs text-gray-500">{record.roomType}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-white text-[10px] font-medium ${statusBadge.color}`}>
                        {statusBadge.text}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">📅</span>
                        <span className="text-gray-700">{formatDate(record.date)}</span>
                        <span className="text-blue-600 font-medium">
                          {record.startTime} - {record.endTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">👤</span>
                        <span className="text-gray-700">{record.userName}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-gray-400">📝</span>
                        <span className="text-gray-600 text-xs">{record.purpose}</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-3 pt-2 border-t border-gray-100">
                      <p className="text-[10px] text-gray-400 mb-3">
                        จองเมื่อ: {formatBookedAt(record.bookedAt)}
                      </p>
                      {/* Action Buttons for Pending Bookings */}
                      {record.status === "pending" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveBooking(record.id)}
                            className="flex-1 px-3 py-2 bg-green-500 text-white text-xs font-medium rounded-lg hover:bg-green-600 transition"
                          >
                            อนุมัติ
                          </button>
                          <button
                            onClick={() => handleCancelBooking(record.id)}
                            className="flex-1 px-3 py-2 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 transition"
                          >
                            ปฏิเสธ
                          </button>
                        </div>
                      )}
                      {/* Action Button for Returned Bookings */}
                      {record.status === "returned" && (
                        <button
                          onClick={() => handleViewReturnDetails(record)}
                          className="w-full px-3 py-2 bg-purple-500 text-white text-xs font-medium rounded-lg hover:bg-purple-600 transition"
                        >
                          ดูรายละเอียดการคืน
                        </button>
                      )}
                      {/* Action Button for Cancelled Bookings */}
                      {record.status === "cancelled" && (
                        <button
                          onClick={() => handleViewReturnDetails(record)}
                          className="w-full px-3 py-2 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 transition"
                        >
                          {record.cancelledByType === "admin" ? "ดูรายละเอียดการปฏิเสธ" : "ดูรายละเอียดการยกเลิก"}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-300 text-5xl mb-3">📅</p>
                <p className="text-gray-500 font-medium">ไม่พบประวัติการจอง</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancellation Reason Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 backdrop-blur-xs bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-bold text-gray-900 mb-4">ระบุเหตุผลการปฏิเสธ</h2>
            
            <textarea
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="เหตุผลการยกเลิกการจอง..."
              className="w-full h-24 p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-500 resize-none"
            />
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setCancelModalOpen(false)
                  setCancelModalBookingId(null)
                  setCancellationReason("")
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmCancel}
                className="flex-1 px-4 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition"
              >
                ยืนยันการปฏิเสธ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return/Cancellation Details Modal */}
      {returnDetailsModalOpen && selectedReturnBooking && (
        <div className="fixed inset-0 backdrop-blur-xs bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {selectedReturnBooking.status === "cancelled" 
                ? (selectedReturnBooking.cancelledByType === "admin" 
                  ? "รายละเอียดการปฏิเสธ" 
                  : "รายละเอียดการยกเลิก") 
                : "รายละเอียดการคืนห้อง"}
            </h2>
            
            {/* Room Info */}
            <div className="mb-4 pb-4 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-600 mb-2">ข้อมูลห้อง</p>
              <p className="text-sm font-medium text-gray-800">{selectedReturnBooking.roomCode}</p>
              <p className="text-xs text-gray-600">{selectedReturnBooking.roomType}</p>
            </div>

            {/* Cancellation Details */}
            {selectedReturnBooking.status === "cancelled" && selectedReturnBooking.cancellationReason && (
              <>
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 mb-2">
                    {selectedReturnBooking.cancelledByType === "admin" ? "เหตุผลการปฏิเสธ" : "เหตุผลการยกเลิก"}
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-gray-800">{selectedReturnBooking.cancellationReason}</p>
                  </div>
                </div>
                {selectedReturnBooking.cancelledBy && (
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <p className="text-xs font-semibold text-gray-600 mb-2">
                      {selectedReturnBooking.cancelledByType === "admin" ? "ปฏิเสธโดย" : "ยกเลิกโดย"}
                    </p>
                    <p className="text-sm text-gray-800">{selectedReturnBooking.cancelledBy}</p>
                  </div>
                )}
                {selectedReturnBooking.cancelledAt && (
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <p className="text-xs font-semibold text-gray-600 mb-2">
                      {selectedReturnBooking.cancelledByType === "admin" ? "ปฏิเสธเมื่อ" : "ยกเลิกเมื่อ"}
                    </p>
                    <p className="text-sm text-gray-800">
                      {new Date(selectedReturnBooking.cancelledAt).toLocaleDateString('th-TH', { 
                        day: 'numeric', 
                        month: 'short',
                        year: 'numeric'
                      })} {new Date(selectedReturnBooking.cancelledAt).toLocaleTimeString('th-TH')}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Return Date (for returned bookings) */}
            {selectedReturnBooking.status === "returned" && selectedReturnBooking.returnedAt && (
              <div className="mb-4 pb-4 border-b border-gray-200">
                <p className="text-xs font-semibold text-gray-600 mb-2">วันเวลาคืนห้อง</p>
                <p className="text-sm text-gray-800">
                  {new Date(selectedReturnBooking.returnedAt).toLocaleDateString('th-TH', { 
                    day: 'numeric', 
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            )}

            {/* Room Condition */}
            {selectedReturnBooking.roomCondition && (
              <div className="mb-4 pb-4 border-b border-gray-200">
                <p className="text-xs font-semibold text-gray-600 mb-2">สภาพห้อง</p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-gray-800">
                    {selectedReturnBooking.roomCondition === "normal" 
                      ? "ปกติ" 
                      : selectedReturnBooking.roomCondition === "needCleaning" 
                      ? "ต้องทำความสะอาด" 
                      : "มีของชำรุด"}
                  </p>
                </div>
              </div>
            )}

            {/* Equipment Condition */}
            {selectedReturnBooking.equipmentCondition && (
              <div className="mb-4 pb-4 border-b border-gray-200">
                <p className="text-xs font-semibold text-gray-600 mb-2">สภาพอุปกรณ์</p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-gray-800">
                    {selectedReturnBooking.equipmentCondition === "working" 
                      ? "ใช้งานได้" 
                      : "มีปัญหา"}
                  </p>
                </div>
              </div>
            )}

            {/* Return Notes */}
            {selectedReturnBooking.returnNotes && (
              <div className="mb-4 pb-4 border-b border-gray-200">
                <p className="text-xs font-semibold text-gray-600 mb-2">หมายเหตุ</p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-gray-800">{selectedReturnBooking.returnNotes}</p>
                </div>
              </div>
            )}

            {/* Return Pictures */}
            {selectedReturnBooking.pictures && selectedReturnBooking.pictures.length > 0 && (
              <div className="mb-4 pb-4 border-b border-gray-200">
                <p className="text-xs font-semibold text-gray-600 mb-3">รูปภาพการคืน</p>
                <div className="grid grid-cols-3 gap-2">
                  {selectedReturnBooking.pictures.map((picture, index) => (
                    <div key={index} className="relative w-full aspect-square rounded-lg overflow-hidden border border-gray-200">
                      <img src={picture} alt={`return-${index}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={() => {
                setReturnDetailsModalOpen(false)
                setSelectedReturnBooking(null)
              }}
              className="w-full px-4 py-2 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition"
            >
              ปิด
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
