import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore"
import { db } from "../../firebase/firebase"
import Header from "../../components/Header"
import { useAuth } from "../../hooks/useAuth"
import { logAdminAction } from "../../utils/adminLogger"

interface Room {
  id: string
  code: string
  type: string
  status: "ว่าง" | "ไม่ว่าง"
  usageDays?: {
    monday: boolean
    tuesday: boolean
    wednesday: boolean
    thursday: boolean
    friday: boolean
    saturday: boolean
    sunday: boolean
  }
  timeRanges?: {
    monday: { start: string; end: string }
    tuesday: { start: string; end: string }
    wednesday: { start: string; end: string }
    thursday: { start: string; end: string }
    friday: { start: string; end: string }
    saturday: { start: string; end: string }
    sunday: { start: string; end: string }
  }
}

interface RoomBooking {
  id: string
  roomId: string
  roomCode: string
  userName: string
  userId: string
  date: string
  startTime: string
  endTime: string
  purpose: string
  status: "upcoming" | "completed" | "cancelled"
}

interface RoomFormData {
  code: string
  type: string
  customType: string
  image?: string
  usageDays: {
    monday: boolean
    tuesday: boolean
    wednesday: boolean
    thursday: boolean
    friday: boolean
    saturday: boolean
    sunday: boolean
  }
  timeRanges: {
    monday: { start: string; end: string }
    tuesday: { start: string; end: string }
    wednesday: { start: string; end: string }
    thursday: { start: string; end: string }
    friday: { start: string; end: string }
    saturday: { start: string; end: string }
    sunday: { start: string; end: string }
  }
}

export default function AdminManageRooms() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null)
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null)
  const [formData, setFormData] = useState<RoomFormData>({
    code: "",
    type: "",
    customType: "",
    image: "",
    usageDays: {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false
    },
    timeRanges: {
      monday: { start: "08:00", end: "18:00" },
      tuesday: { start: "08:00", end: "18:00" },
      wednesday: { start: "08:00", end: "18:00" },
      thursday: { start: "08:00", end: "18:00" },
      friday: { start: "08:00", end: "18:00" },
      saturday: { start: "08:00", end: "18:00" },
      sunday: { start: "08:00", end: "18:00" }
    }
  })
  const [originalFormData, setOriginalFormData] = useState<RoomFormData | null>(null)

  const [roomBookings, setRoomBookings] = useState<RoomBooking[]>([])

  // Load rooms and bookings from Firebase
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load rooms
        const roomsSnapshot = await getDocs(collection(db, "rooms"))
        const roomsList: Room[] = []
        roomsSnapshot.forEach((doc) => {
          const data = doc.data()
          roomsList.push({
            id: doc.id,
            code: data.code || "",
            type: data.type || "",
            status: data.status || "ว่าง",
            usageDays: data.usageDays || {
              monday: true,
              tuesday: true,
              wednesday: true,
              thursday: true,
              friday: true,
              saturday: false,
              sunday: false
            },
            timeRanges: data.timeRanges || {
              monday: { start: "09:00", end: "17:00" },
              tuesday: { start: "09:00", end: "17:00" },
              wednesday: { start: "09:00", end: "17:00" },
              thursday: { start: "09:00", end: "17:00" },
              friday: { start: "09:00", end: "17:00" },
              saturday: { start: "09:00", end: "17:00" },
              sunday: { start: "09:00", end: "17:00" }
            }
          })
        })
        setRooms(roomsList)

        // Load room bookings
        const bookingsSnapshot = await getDocs(collection(db, "roomBookings"))
        const bookingsList: RoomBooking[] = []
        bookingsSnapshot.forEach((doc) => {
          const data = doc.data()
          bookingsList.push({
            id: doc.id,
            roomId: data.roomId || "",
            roomCode: data.roomCode || "",
            userName: data.userName || "",
            userId: data.userId || "",
            date: data.date || "",
            startTime: data.startTime || "",
            endTime: data.endTime || "",
            purpose: data.purpose || "",
            status: data.status || "upcoming"
          })
        })
        setRoomBookings(bookingsList)
      } catch (error) {
        console.error("Error loading rooms data:", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Get upcoming bookings count for a room
  const getUpcomingBookingsForRoom = (roomId: string) => {
    const today = new Date().toISOString().split('T')[0]
    return roomBookings.filter(
      booking => booking.roomId === roomId && 
                 booking.status === "upcoming" && 
                 booking.date >= today
    )
  }

  const filteredRooms = rooms.filter(room =>
    room.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAddRoom = () => {
    setEditingRoomId(null)
    setFormData({
      code: "",
      type: "",
      customType: "",
      image: "",
      usageDays: {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false
      },
      timeRanges: {
        monday: { start: "08:00", end: "18:00" },
        tuesday: { start: "08:00", end: "18:00" },
        wednesday: { start: "08:00", end: "18:00" },
        thursday: { start: "08:00", end: "18:00" },
        friday: { start: "08:00", end: "18:00" },
        saturday: { start: "08:00", end: "18:00" },
        sunday: { start: "08:00", end: "18:00" }
      }
    })
    setShowModal(true)
  }

  const handleEditRoom = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId)
    if (room) {
      setEditingRoomId(roomId)
      const editFormData = {
        code: room.code,
        type: room.type,
        customType: room.type === "ห้องอื่นๆ" ? room.type : "",
        image: "",
        usageDays: room.usageDays || {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false
        },
        timeRanges: room.timeRanges || {
          monday: { start: "09:00", end: "17:00" },
          tuesday: { start: "09:00", end: "17:00" },
          wednesday: { start: "09:00", end: "17:00" },
          thursday: { start: "09:00", end: "17:00" },
          friday: { start: "09:00", end: "17:00" },
          saturday: { start: "09:00", end: "17:00" },
          sunday: { start: "09:00", end: "17:00" }
        }
      }
      setFormData(editFormData)
      setOriginalFormData(JSON.parse(JSON.stringify(editFormData)))
      setShowModal(true)
    }
  }

  const handleSaveRoom = () => {
    setShowConfirm(true)
  }

  const getDayName = (day: string) => {
    const dayNames: { [key: string]: string } = {
      monday: 'จันทร์',
      tuesday: 'อังคาร',
      wednesday: 'พุธ',
      thursday: 'พฤหัสบดี',
      friday: 'ศุกร์',
      saturday: 'เสาร์',
      sunday: 'อาทิตย์'
    }
    return dayNames[day] || day
  }

  const buildChangeDetails = () => {
    if (!originalFormData) return `Room code: ${formData.code}`
    
    const changes: string[] = []
    const finalType = formData.type === "ห้องอื่นๆ" ? formData.customType : formData.type
    const originalFinalType = originalFormData.type === "ห้องอื่นๆ" ? originalFormData.customType : originalFormData.type
    
    // Check room code change
    if (formData.code !== originalFormData.code) {
      changes.push(`รหัสห้อง: ${originalFormData.code} → ${formData.code}`)
    }
    
    // Check room type change
    if (finalType !== originalFinalType) {
      changes.push(`ประเภทห้อง: ${originalFinalType} → ${finalType}`)
    }
    
    // Check usage days changes
    const daysChanged: string[] = []
    Object.keys(formData.usageDays).forEach((day) => {
      const dayKey = day as keyof typeof formData.usageDays
      if (formData.usageDays[dayKey] !== originalFormData.usageDays[dayKey]) {
        daysChanged.push(`${getDayName(day)}: ${originalFormData.usageDays[dayKey] ? 'เปิด' : 'ปิด'} → ${formData.usageDays[dayKey] ? 'เปิด' : 'ปิด'}`)
      }
    })
    if (daysChanged.length > 0) {
      changes.push(`วันใช้งาน: ${daysChanged.join(', ')}`)
    }
    
    // Check time ranges changes
    const timeChanged: string[] = []
    Object.keys(formData.timeRanges).forEach((day) => {
      const dayKey = day as keyof typeof formData.timeRanges
      if (formData.usageDays[dayKey]) {
        const oldTime = originalFormData.timeRanges[dayKey]
        const newTime = formData.timeRanges[dayKey]
        if (oldTime.start !== newTime.start || oldTime.end !== newTime.end) {
          timeChanged.push(`${getDayName(day)}: ${oldTime.start}-${oldTime.end} → ${newTime.start}-${newTime.end}`)
        }
      }
    })
    if (timeChanged.length > 0) {
      changes.push(`เวลา: ${timeChanged.join(', ')}`)
    }
    
    if (changes.length === 0) {
      return `Room code: ${formData.code} (ไม่มีการเปลี่ยนแปลง)`
    }
    
    return `Room code: ${formData.code} | ${changes.join(' | ')}`
  }

  const handleConfirmSave = async () => {
    const finalType = formData.type === "ห้องอื่นๆ" ? formData.customType : formData.type
    
    try {
      if (editingRoomId) {
        // Edit existing room in Firebase
        await updateDoc(doc(db, "rooms", editingRoomId), {
          code: formData.code,
          type: finalType,
          usageDays: formData.usageDays,
          timeRanges: formData.timeRanges
        })
        
        setRooms(rooms.map(room =>
          room.id === editingRoomId
            ? { ...room, code: formData.code, type: finalType }
            : room
        ))
        
        // Log admin action for edit with detailed changes
        if (user) {
          logAdminAction({
            user,
            action: 'update',
            type: 'room',
            itemName: finalType,
            details: buildChangeDetails()
          })
        }
        setOriginalFormData(null)
      } else {
        // Add new room to Firebase
        const docRef = await addDoc(collection(db, "rooms"), {
          code: formData.code,
          type: finalType,
          status: "ว่าง",
          usageDays: formData.usageDays,
          timeRanges: formData.timeRanges
        })
        
        const newRoom: Room = {
          id: docRef.id,
          code: formData.code,
          type: finalType,
          status: "ว่าง"
        }
        setRooms([...rooms, newRoom])
        
        // Log admin action for add
        if (user) {
          logAdminAction({
            user,
            action: 'add',
            type: 'room',
            itemName: finalType,
            details: `Room code: ${formData.code}`
          })
        }
      }
      setShowModal(false)
      setShowConfirm(false)
    } catch (error) {
      console.error("Error saving room:", error)
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล")
    }
  }

  const handleDeleteRoom = (roomId: string) => {
    setDeletingRoomId(roomId)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    if (deletingRoomId) {
      const deletedRoom = rooms.find(room => room.id === deletingRoomId)
      const affectedBookings = getUpcomingBookingsForRoom(deletingRoomId)
      
      try {
        // Cancel all upcoming bookings for this room in Firebase
        if (affectedBookings.length > 0) {
          for (const booking of affectedBookings) {
            await updateDoc(doc(db, "roomBookings", booking.id), {
              status: "cancelled"
            })
          }
          setRoomBookings(prev => prev.map(booking => 
            booking.roomId === deletingRoomId && booking.status === "upcoming"
              ? { ...booking, status: "cancelled" as const }
              : booking
          ))
        }
        
        // Delete the room from Firebase
        await deleteDoc(doc(db, "rooms", deletingRoomId))
        setRooms(rooms.filter(room => room.id !== deletingRoomId))
        
        // Log admin action
        if (user && deletedRoom) {
          const bookingInfo = affectedBookings.length > 0 
            ? ` | ยกเลิกการจอง ${affectedBookings.length} รายการ`
            : ''
          logAdminAction({
            user,
            action: 'delete',
            type: 'room',
            itemName: deletedRoom.type,
            details: `Room code: ${deletedRoom.code}${bookingInfo}`
          })
        }
      } catch (error) {
        console.error("Error deleting room:", error)
        alert("เกิดข้อผิดพลาดในการลบข้อมูล")
      }
    }
    setShowDeleteConfirm(false)
    setDeletingRoomId(null)
  }

  const getSelectedDaysText = () => {
    const days: string[] = []
    const dayLabels = {
      monday: "จันทร์",
      tuesday: "อังคาร",
      wednesday: "พุธ",
      thursday: "พฤหัสบดี",
      friday: "ศุกร์",
      saturday: "เสาร์",
      sunday: "อาทิตย์"
    }
    Object.entries(formData.usageDays).forEach(([key, checked]) => {
      if (checked && key in dayLabels) {
        days.push(dayLabels[key as keyof typeof dayLabels])
      }
    })
    return days.length > 0 ? days.join(" - ") : "ไม่มี"
  }

  const getTimeRangesText = () => {
    const times: string[] = []
    const dayLabels = {
      monday: "จันทร์",
      tuesday: "อังคาร",
      wednesday: "พุธ",
      thursday: "พฤหัสบดี",
      friday: "ศุกร์",
      saturday: "เสาร์",
      sunday: "อาทิตย์"
    }
    const dayKeys = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const
    dayKeys.forEach((key) => {
      if (formData.usageDays[key]) {
        const dayLabel = dayLabels[key as keyof typeof dayLabels]
        times.push(`${dayLabel}: ${formData.timeRanges[key].start}-${formData.timeRanges[key].end}`)
      }
    })
    return times.length > 0 ? times.join(" / ") : "ไม่มี"
  }

  const handleShowSchedule = (roomId: string) => {
    navigate(`/admin/room-schedule/${roomId}`)
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
      <Header title="จัดการห้อง" />

      {/* ===== CONTENT ===== */}
      <div className="mt-6 flex justify-center">
        <div className="w-full max-w-[360px] px-4 flex flex-col items-center pb-6">
        {/* Back and Add Room Buttons */}
          <div className="w-full flex gap-3 mt-6 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="
                flex-1
                py-3
                rounded-full
                border border-gray-400
                text-gray-600
                text-sm font-medium
                hover:bg-gray-100
                transition
                flex items-center justify-center gap-2
              "
            >
              <img src="/arrow.svg" alt="back" className="w-5 h-5" />
            </button>
            <span className="w-1/5"> </span>
            <button
              onClick={handleAddRoom}
              className="
                flex-1
                py-3
                rounded-full
                bg-orange-500
                text-white
                text-sm font-semibold
                hover:bg-orange-600
                transition
              "
            >
              + เพิ่มห้องใหม่
            </button>
          </div>

          {/* Search Bar */}
          <div className="w-full mb-6 relative">
            <input
              type="text"
              placeholder="ค้นหา"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="
                w-full
                h-10
                px-4
                border border-gray-300
                outline-none
                text-sm
              "
            />
            <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600">
              🔍
            </button>
          </div>

          {/* Table Headers */}
          <div className="w-full mb-4 grid grid-cols-4 gap-2 text-xs font-semibold text-gray-700">
            <div>เลขห้อง</div>
            <div>ประเภท</div>
            <div>สถานะ</div>
            <div>การจัดการ</div>
          </div>

          {/* Rooms List */}
          <div className="w-full flex flex-col gap-3">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
              </div>
            ) : filteredRooms.length > 0 ? (
              filteredRooms.map((room) => (
                <div key={room.id} className="w-full grid grid-cols-4 gap-2 items-center text-xs border-b pb-3">
                  {/* Room Code */}
                  <div className="font-semibold">{room.code}</div>

                  {/* Room Type */}
                  <div className="text-gray-600">{room.type}</div>

                  {/* Status Button - Click to view schedule */}
                  <div>
                    <button
                      onClick={() => handleShowSchedule(room.id)}
                      className="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded hover:bg-purple-600 transition"
                    >
                      ดูการจอง
                    </button>
                  </div>

                  {/* Action Button */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditRoom(room.id)}
                      className="
                        px-3 py-1
                        bg-blue-500
                        text-white text-xs font-semibold
                        rounded
                        hover:bg-blue-600
                        transition
                      "
                    >
                      ข้อมูล
                    </button>
                    <button
                      onClick={() => handleDeleteRoom(room.id)}
                      className="
                        px-3 py-1
                        bg-red-500
                        text-white text-xs font-semibold
                        rounded
                        hover:bg-red-600
                        transition
                      "
                    >
                      ลบ
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="w-full text-center text-gray-500 py-8">
                ไม่พบห้องที่ค้นหา
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ===== MODAL FORM ===== */}
      {showModal && (
        <div className="fixed inset-0 backdrop-blur-xs bg-opacity-50 flex items-start z-50">
          <div className="w-screen h-screen bg-white overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-orange-500 text-white p-4 text-center font-semibold sticky top-0">
              {editingRoomId ? "แก้ไขข้อมูลห้อง" : "เพิ่มห้องใหม่"}
            </div>

            {/* Modal Content */}
            <div className="p-6 flex flex-col gap-5 max-w-md mx-auto">
              {/* Room Code */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">ข้อมูล/เลขห้อง</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-orange-500"
                  placeholder="เช่น CB8720"
                />
              </div>

              {/* Room Type */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">ประเภท</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value, customType: "" })}
                  className="w-full max-w-full px-3 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-orange-500 overflow-hidden"
                >
                  <option value="">เลือกประเภทห้อง</option>
                  <option value="ห้องเรียน">ห้องเรียน</option>
                  <option value="ห้องปฏิบัติการ">ห้องปฏิบัติการ</option>
                  <option value="ห้องประชุม">ห้องประชุม</option>
                  <option value="ห้องอื่นๆ">ห้องอื่นๆ</option>
                </select>
              </div>

              {/* Custom Type Input - Show when "ห้องอื่นๆ" is selected */}
              {formData.type === "ห้องอื่นๆ" && (
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-2">ระบุประเภทห้อง</label>
                  <input
                    type="text"
                    value={formData.customType}
                    onChange={(e) => setFormData({ ...formData, customType: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-orange-500"
                    placeholder="เช่น ห้องพักอาจารย์"
                  />
                </div>
              )}

              {/* Room Image */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">รูปภาพห้อง</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full text-sm text-gray-600 file:px-4 file:py-2 file:border file:border-gray-300 file:rounded"
                />
              </div>

              {/* Usage Days */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-3">ข่าวสารการใช้งาน</label>
                <div className="flex flex-col gap-4">
                  {[
                    { key: "monday", label: "จันทร์" },
                    { key: "tuesday", label: "อังคาร" },
                    { key: "wednesday", label: "พุธ" },
                    { key: "thursday", label: "พฤหัสบดี" },
                    { key: "friday", label: "ศุกร์" },
                    { key: "saturday", label: "เสาร์" },
                    { key: "sunday", label: "อาทิตย์" }
                  ].map((day) => (
                    <div key={day.key}>
                      <label className="flex items-center gap-2 text-sm mb-2">
                        <input
                          type="checkbox"
                          checked={formData.usageDays[day.key as keyof typeof formData.usageDays]}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              usageDays: {
                                ...formData.usageDays,
                                [day.key]: e.target.checked
                              }
                            })
                          }
                          className="w-4 h-4 cursor-pointer"
                        />
                        {day.label}
                      </label>
                      
                      {/* Show time range only if day is checked */}
                      {formData.usageDays[day.key as keyof typeof formData.usageDays] && (
                        <div className="ml-6 flex gap-2 items-center mb-3">
                          <select
                            value={formData.timeRanges[day.key as keyof typeof formData.timeRanges].start}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                timeRanges: {
                                  ...formData.timeRanges,
                                  [day.key]: {
                                    ...formData.timeRanges[day.key as keyof typeof formData.timeRanges],
                                    start: e.target.value
                                  }
                                }
                              })
                            }
                            className="flex-1 px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-orange-500"
                          >
                            {Array.from({ length: 21 }, (_, i) => {
                              const hours = 8 + Math.floor(i / 2);
                              const minutes = (i % 2) * 30;
                              const time = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
                              return <option key={time} value={time}>{time}</option>
                            })}
                          </select>
                          <span className="text-xs font-medium">-</span>
                          <select
                            value={formData.timeRanges[day.key as keyof typeof formData.timeRanges].end}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                timeRanges: {
                                  ...formData.timeRanges,
                                  [day.key]: {
                                    ...formData.timeRanges[day.key as keyof typeof formData.timeRanges],
                                    end: e.target.value
                                  }
                                }
                              })
                            }
                            className="flex-1 px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-orange-500"
                          >
                            {Array.from({ length: 21 }, (_, i) => {
                              const hours = 8 + Math.floor(i / 2);
                              const minutes = (i % 2) * 30;
                              const time = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
                              return <option key={time} value={time}>{time}</option>
                            })}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 mt-6 pb-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border border-gray-400 text-gray-600 rounded-lg font-medium hover:bg-gray-100 transition"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSaveRoom}
                  className="flex-1 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition"
                >
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== CONFIRMATION MODAL ===== */}
      {showConfirm && (
        <div className="fixed inset-0 backdrop-blur-xs bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 border-4 border-purple-300">
            {/* Header */}
            <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">ยืนยันการบันทึกข้อมูล</h2>

            {/* Message */}
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              ระบบจะทำการบันทึกข้อมูลห้องเรียน รวมถึงวันและเวลาการใช้งาน ตรวจสอบความถูกต้องของข้อมูลและแจ้งไว้ให้ทราบ
            </p>

            {/* Room Information Box */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
              {/* Room Code and Type */}
              <div className="mb-3">
                <p className="text-xs text-gray-600 mb-1">รหัสห้อง / ประเภทห้อง</p>
                <p className="text-sm font-semibold text-gray-800">{formData.code} - {formData.type === "ห้องอื่นๆ" ? formData.customType : formData.type}</p>
              </div>

              {/* Usage Days */}
              <div className="mb-3">
                <p className="text-xs text-gray-600 flex items-center gap-2 mb-1">
                  <span className="text-base">📅</span> วันใช้งาน
                </p>
                <p className="text-sm font-semibold text-gray-800">{getSelectedDaysText()}</p>
              </div>

              {/* Time Range */}
              <div>
                <p className="text-xs text-gray-600 flex items-center gap-2 mb-1">
                  <span className="text-base">🕐</span> เวลาใช้งาน
                </p>
                <p className="text-sm font-semibold text-gray-800">{getTimeRangesText()}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 border border-gray-400 text-gray-600 rounded-lg font-medium hover:bg-gray-100 transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmSave}
                className="flex-1 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 backdrop-blur-xs bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 border-4 border-red-300">
            {/* Header */}
            <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">ยืนยันการลบห้อง</h2>

            {/* Message */}
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              คุณแน่ใจที่จะลบห้องนี้หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </p>

            {/* Room Information Box */}
            {deletingRoomId && (
              <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${getUpcomingBookingsForRoom(deletingRoomId).length > 0 ? 'mb-4' : 'mb-6'}`}>
                <p className="text-xs text-gray-600 mb-1">รหัสห้อง / ประเภทห้อง</p>
                <p className="text-sm font-semibold text-gray-800">
                  {rooms.find(r => r.id === deletingRoomId)?.code} - {rooms.find(r => r.id === deletingRoomId)?.type}
                </p>
              </div>
            )}

            {/* Warning about upcoming bookings */}
            {deletingRoomId && getUpcomingBookingsForRoom(deletingRoomId).length > 0 && (
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-6">
                <p className="text-sm font-semibold text-yellow-800 flex items-center gap-2">
                  <span>⚠️</span>
                  การจองที่จะถูกยกเลิก: {getUpcomingBookingsForRoom(deletingRoomId).length} รายการ
                </p>
                <div className="mt-2 text-xs text-yellow-700 max-h-24 overflow-y-auto">
                  {getUpcomingBookingsForRoom(deletingRoomId).map(booking => (
                    <p key={booking.id} className="py-1 border-b border-yellow-200 last:border-0">
                      📅 {new Date(booking.date).toLocaleDateString('th-TH')} {booking.startTime}-{booking.endTime} - {booking.userName}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 border border-gray-400 text-gray-600 rounded-lg font-medium hover:bg-gray-100 transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition"
              >
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}