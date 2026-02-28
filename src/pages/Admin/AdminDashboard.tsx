import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { signOut } from "firebase/auth"
import { collection, getDocs, query, where } from "firebase/firestore"
import { auth, db } from "../../firebase/firebase"
import Header from "../../components/Header"

interface Equipment {
  id: string
  name: string
  category: string
  quantity: number
  unit: string
}

interface RoomBooking {
  id: string
  roomCode: string
  roomType: string
  userName: string
  date: string
  startTime: string
  endTime: string
  status: "pending" | "approved" | "completed" | "cancelled" | "returned"
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [lowStockItems, setLowStockItems] = useState<Equipment[]>([])
  const [pendingBookings, setPendingBookings] = useState<RoomBooking[]>([])

  // Load low stock items from Firestore
  useEffect(() => {
    const loadLowStockItems = async () => {
      try {
        const q = query(collection(db, "equipment"), where("category", "==", "consumable"))
        const querySnapshot = await getDocs(q)
        const items: Equipment[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          if (data.quantity <= 4) {  // Low stock threshold: 4 or less
            items.push({
              id: doc.id,
              name: data.name,
              category: data.category,
              quantity: data.quantity,
              unit: data.unit || "ชิ้น"
            })
          }
        })
        setLowStockItems(items)
      } catch (error) {
        console.error("Error loading low stock items:", error)
      }
    }
    loadLowStockItems()
  }, [])

  // Load pending and upcoming room bookings from Firestore
  useEffect(() => {
    const loadPendingBookings = async () => {
      try {
        const q = query(collection(db, "roomBookings"), where("status", "==", "pending"))
        const querySnapshot = await getDocs(q)
        const bookings: RoomBooking[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          bookings.push({
            id: doc.id,
            roomCode: data.roomCode || "",
            roomType: data.roomType || "",
            userName: data.userName || "",
            date: data.date || "",
            startTime: data.startTime || "",
            endTime: data.endTime || "",
            status: data.status || "pending"
          })
        })
        setPendingBookings(bookings)
      } catch (error) {
        console.error("Error loading pending bookings:", error)
      }
    }
    loadPendingBookings()
  }, [])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      navigate('/login')
    } catch (error) {
      console.error('Error logging out:', error)
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
      <Header title="จัดการข้อมูลห้องและสถิติ" />

      {/* ===== CONTENT ===== */}
      <div className="mt-8 flex justify-center">
        <div className="w-full max-w-[360px] px-4 flex flex-col items-center">
          {/* Room Booking Alert */}
          {pendingBookings.length > 0 && (
            <div className="w-full mb-6 bg-amber-50 rounded-lg p-4 border border-amber-200">
              <h3 className="text-sm font-semibold text-amber-800 mb-3">🔔 มีการจองห้องรอการอนุมัติ</h3>
              <div className="flex flex-col gap-2 mb-4">
                <div className="text-sm text-gray-700">
                  <span className="font-semibold text-amber-700">{pendingBookings.length} รายการ</span>
                  <span> รอการอนุมัติ</span>
                </div>
              </div>
              <button
                onClick={() => navigate('/admin/room-booking-history')}
                className="w-full py-2 bg-orange-500 text-white text-sm font-semibold rounded-full hover:bg-orange-600 transition"
              >
                ดูการจองห้อง
              </button>
            </div>
          )}

          {/* Low Stock Alert */}
          {lowStockItems.length > 0 && (
            <div className="w-full mb-8 bg-red-50 rounded-lg p-4 border border-red-200">
              <h3 className="text-sm font-semibold text-red-800 mb-3">⚠️ สต๊อกอุปกรณ์ไม่เพียงพอ</h3>
              <div className="flex flex-col gap-3 mb-4">
                {(() => {
                  const outOfStockCount = lowStockItems.filter(item => item.quantity === 0).length
                  const lowStockCount = lowStockItems.filter(item => item.quantity > 0).length
                  
                  return (
                    <>
                      {outOfStockCount > 0 && (
                        <div className="text-sm text-gray-700">
                          <span className="font-semibold text-red-700">{outOfStockCount} รายการ</span>
                          <span> หมดสต๊อก</span>
                        </div>
                      )}
                      {lowStockCount > 0 && (
                        <div className="text-sm text-gray-700">
                          <span className="font-semibold text-red-600">{lowStockCount} รายการ</span>
                          <span> สต๊อกใกล้หมด</span>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
              <button
                onClick={() => navigate('/admin/manage-equipment')}
                className="w-full py-2 bg-orange-500 text-white text-sm font-semibold rounded-full hover:bg-orange-600 transition"
              >
                ไปจัดการอุปกรณ์
              </button>
            </div>
          )}

          {/* Admin Buttons */}
          <div className="w-full flex flex-col gap-4">
            {/* Manage Rooms Button */}
            <button
              onClick={() => navigate('/admin/manage-rooms')}
              className="
                w-full
                py-4
                rounded-full
                text-white
                text-base font-semibold
                hover:opacity-90
                transition
              "
              style={{ backgroundColor: "#FF7F50" }}
            >
              จัดการห้อง
            </button>

            {/* Manage Calendar/Equipment Button */}
            <button
              onClick={() => navigate('/admin/manage-equipment')}
              className="
                w-full
                py-4
                rounded-full
                text-white
                text-base font-semibold
                hover:opacity-90
                transition
              "
              style={{ backgroundColor: "#FF7F50" }}
            >
              จัดการอุปกรณ์/ครุภัณฑ์
            </button>

            {/* Equipment Condition Report Button */}
            <button
              onClick={() => navigate('/admin/equipment-condition')}
              className="
                w-full
                py-4
                rounded-full
                text-white
                text-base font-semibold
                hover:opacity-90
                transition
              "
              style={{ backgroundColor: "#FF7F50" }}
            >
              รายงานสภาพอุปกรณ์
            </button>

            {/* Borrow/Return History Button */}
            <button
              onClick={() => navigate('/admin/borrow-return-history')}
              className="
                w-full
                py-4
                rounded-full
                text-white
                text-base font-semibold
                hover:opacity-90
                transition
              "
              style={{ backgroundColor: "#FF7F50" }}
            >
              ประวัติการยืม/คืน
            </button>

            {/* Room Booking History Button */}
            <button
              onClick={() => navigate('/admin/room-booking-history')}
              className="
                w-full
                py-4
                rounded-full
                text-white
                text-base font-semibold
                hover:opacity-90
                transition
              "
              style={{ backgroundColor: "#FF7F50" }}
            >
              ประวัติการจองห้อง
            </button>

            {/* Admin History Button */}
            <button
              onClick={() => navigate('/admin/history')}
              className="
                w-full
                py-4
                rounded-full
                text-white
                text-base font-semibold
                hover:opacity-90
                transition
              "
              style={{ backgroundColor: "#FF7F50" }}
            >
              ประวัติการจัดการของแอดมิน
            </button>

            {/* Admin Management Button */}
            <button
              onClick={() => navigate('/admin/management')}
              className="
                w-full
                py-4
                rounded-full
                text-white
                text-base font-semibold
                hover:opacity-90
                transition
              "
              style={{ backgroundColor: "#FF7F50" }}
            >
              จัดการแอดมิน
            </button>

            {/* Manage Users Button */}
            <button
              onClick={() => navigate('/admin/manage-users')}
              className="
                w-full
                py-4
                rounded-full
                text-white
                text-base font-semibold
                hover:opacity-90
                transition
              "
              style={{ backgroundColor: "#FF7F50" }}
            >
              จัดการผู้ใช้งาน
            </button>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="
              w-full
              mt-16
              py-3
              rounded-full
              border border-gray-400
              text-white
              text-sm font-medium
              hover:bg-gray-100
              transition
              mb-6
            "
            style={{ backgroundColor: "#DC2626" }}
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  )
}
