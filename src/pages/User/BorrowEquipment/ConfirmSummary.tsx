import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { doc, getDoc } from "firebase/firestore"
import { db } from "../../../firebase/firebase"
import Header from "../../../components/Header"
import { useAuth } from "../../../hooks/useAuth"
import { logBorrowTransaction } from "../../../utils/borrowReturnLogger"
import type { SelectedEquipment } from "../../../App"

interface ConfirmSummaryProps {
  cartItems: SelectedEquipment[]
  setCartItems?: (items: SelectedEquipment[]) => void
}

export default function ConfirmSummary({ cartItems }: ConfirmSummaryProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [fullName, setFullName] = useState<string>("")
  const [userIdNumber, setUserIdNumber] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const totalItems = cartItems.reduce((sum, item) => sum + item.selectedQuantity, 0)

  // Get borrow info from sessionStorage
  const borrowInfo = JSON.parse(sessionStorage.getItem("borrowInfo") || "{}")
  const expectedReturnTime = borrowInfo.expectedReturnTime || ""
  const borrowType = borrowInfo.borrowType || ""

  const getBorrowTypeLabel = () => {
    switch (borrowType) {
      case "during-class":
        return "ยืมในคาบเรียน"
      case "teaching":
        return "ยืมใช้สอน"
      case "outside":
        return "ยืมนอกคาบเรียน"
      default:
        return "ยืมอุปกรณ์"
    }
  }

  // Fetch user's fullName from Firestore
  useEffect(() => {
    const fetchUserFullName = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists()) {
            setFullName(userDoc.data().fullName || "")
            setUserIdNumber(userDoc.data().idNumber || "")
          }
        } catch (error) {
          console.error("Error fetching user fullName:", error)
        }
      }
    }
    fetchUserFullName()
  }, [user])

  // Get current date and return date (same day)
  const today = new Date()
  const borrowDate = today.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit"
  })
  const borrowTime = today.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit"
  })
  const returnDate = today.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit"
  })

  // Handle borrow submission
  const handleConfirm = async () => {
    if (!user || isSubmitting) return

    setIsSubmitting(true)
    try {
      // Prepare equipment items for logging
      const equipmentItems = cartItems.map(item => ({
        equipmentId: item.id,
        equipmentName: item.name,
        equipmentCategory: item.category,
        quantityBorrowed: item.selectedQuantity
      }))

      // Log borrow transaction to Firestore
      await logBorrowTransaction(
        user,
        borrowType as "during-class" | "teaching" | "outside",
        equipmentItems,
        borrowDate,
        borrowTime,
        returnDate,
        "ปกติ", // conditionBeforeBorrow
        undefined, // notes
        fullName,
        userIdNumber,
        expectedReturnTime || borrowTime
      )

      // Navigate to completion page
      navigate('/borrow/completion')
    } catch (error) {
      console.error("Error saving borrow data:", error)
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง")
    } finally {
      setIsSubmitting(false)
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
      <Header title="ตรวจสอบรายการก่อนยืนยัน" />

      {/* ===== CONTENT ===== */}
      <div className="mt-6 flex justify-center">
        <div className="w-full max-w-[360px] px-4 flex flex-col items-center">
          {/* Summary Header */}
          <div className="w-full bg-gray-100 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">👤</span>
                <span className="text-sm text-gray-700">{fullName || user?.email || "ผู้ใช้"}</span>
              </div>
            </div>
            <div className="flex items-center justify-between mb-2 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <span>📦</span>
                <span>ประเภทการยืม: {getBorrowTypeLabel()}</span>
              </div>
            </div>
            <div className="flex items-center justify-between mb-2 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <span>📅</span>
                <span>ยืมวันที่ {borrowDate} เวลา {borrowTime} น.</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span>📋</span>
                <span className="text-blue-600 font-medium">กำหนดคืน {returnDate} เวลา {expectedReturnTime || borrowTime} น.</span>
              </div>
            </div>
          </div>

          {/* Equipment Summary List */}
          <div className="w-full mb-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">รายการยืมทั้งหมด ({totalItems} รายการ)</h3>
            <div className="space-y-2">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-gray-200 rounded-lg p-3 flex justify-between items-center"
                >
                  <div>
                    <h4 className="text-sm font-medium text-gray-800">{item.name}</h4>
                    <p className="text-xs text-green-600 font-medium">
                      {item.equipmentType ? (
                        <>
                          {item.equipmentType}
                          {item.equipmentSubType && ` (${item.equipmentSubType})`}
                        </>
                      ) : (
                        "ไม่ระบุประเภท"
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-800">{item.selectedQuantity}</p>
                    <p className="text-xs text-gray-500">{item.unit}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total Summary */}
          <div className="w-full bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-800">รวมจำนวนอุปกรณ์ทั้งหมด</span>
              <span className="text-lg font-bold text-orange-500">{totalItems} รายการ</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="w-full flex gap-3 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="
                flex-1
                px-4 py-2
                rounded-full
                border border-gray-400
                text-sm text-gray-600
                font-medium
                hover:bg-gray-100
                transition
              "
            >
              ย้อนกลับ
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className={`
                flex-1
                px-4 py-2
                rounded-full
                text-white
                text-sm font-medium
                transition
                ${isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600"}
              `}
            >
              {isSubmitting ? "กำลังบันทึก..." : "เสร็จสิ้น"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
