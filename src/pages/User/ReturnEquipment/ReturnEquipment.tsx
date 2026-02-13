import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../../../components/Header"
import UserInfoBox from "../../../components/UserInfoBox"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "../../../firebase/firebase"
import { useAuth } from "../../../hooks/useAuth"
import type { BorrowTransaction } from "../../../utils/borrowReturnLogger"

interface EquipmentItem {
  borrowId: string
  id: string
  name: string
  code: string
  checked: boolean
  quantity: number
  quantityBorrowed: number
  status: string
  notes?: string
  borrowDate: string
  borrowTime: string
  borrowType: string
  userName: string
  expectedReturnDate: string
  expectedReturnTime?: string
  equipmentCategory?: string
  consumptionStatus?: string
  // Asset return breakdown
  returnGoodQty?: number
  returnDamagedQty?: number
  returnLostQty?: number
}

interface ReturnEquipmentProps {
  returnEquipment: EquipmentItem[]
  setReturnEquipment: (equipment: EquipmentItem[]) => void
}

export default function ReturnEquipment({ setReturnEquipment }: ReturnEquipmentProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [equipment, setEquipment] = useState<EquipmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [borrowRequests, setBorrowRequests] = useState<BorrowTransaction[]>([])
  const [selectedBorrow, setSelectedBorrow] = useState<BorrowTransaction | null>(null)

  useEffect(() => {
    const fetchBorrowedEquipment = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        // Query user's borrow history - simple query without orderBy to avoid index requirement
        const borrowHistoryQuery = query(
          collection(db, "borrowHistory"),
          where("userId", "==", user.uid)
        )
        const snapshot = await getDocs(borrowHistoryQuery)
        
        // Sort by timestamp client-side
        const sortedDocs = snapshot.docs.sort((a, b) => {
          const aTimestamp = (a.data() as BorrowTransaction).timestamp || 0
          const bTimestamp = (b.data() as BorrowTransaction).timestamp || 0
          return bTimestamp - aTimestamp
        })
        
        // Get only borrowed items
        const borrowed: BorrowTransaction[] = []
        const flatItems: EquipmentItem[] = []
        
        sortedDocs.forEach((doc) => {
          const txn = doc.data() as BorrowTransaction
          // Only include items with "borrowed" status
          if (txn.status === "borrowed") {
            borrowed.push(txn)
            
            // Also create flat items for backward compatibility
            txn.equipmentItems.forEach((item) => {
              flatItems.push({
                borrowId: txn.borrowId,
                id: item.equipmentId,
                name: item.equipmentName,
                code: item.equipmentName,
                checked: false,
                quantity: item.equipmentCategory === "consumable" ? 0 : item.quantityBorrowed,
                quantityBorrowed: item.quantityBorrowed,
                status: "ปกติ",
                borrowDate: txn.borrowDate,
                borrowTime: txn.borrowTime,
                borrowType: txn.borrowType,
                userName: txn.userName,
                expectedReturnDate: txn.expectedReturnDate,
                expectedReturnTime: txn.expectedReturnTime,
                equipmentCategory: item.equipmentCategory,
                // Initialize asset breakdown fields
                returnGoodQty: item.equipmentCategory === "consumable" ? undefined : item.quantityBorrowed,
                returnDamagedQty: 0,
                returnLostQty: 0
              })
            })
          }
        })
        
        setBorrowRequests(borrowed)
        setEquipment(flatItems)
      } catch (error) {
        console.error("Error fetching borrowed equipment:", error)
        alert("ไม่สามารถโหลดอุปกรณ์ที่ยืม กรุณาลองใหม่อีกครั้ง")
      } finally {
        setLoading(false)
      }
    }

    fetchBorrowedEquipment()
  }, [user])

  const handleCheckChange = (key: string) => {
    setEquipment(equipment.map(item =>
      `${item.borrowId}-${item.id}` === key ? { ...item, checked: !item.checked } : item
    ))
  }

  const handleQuantityChange = (key: string, value: number) => {
    setEquipment(equipment.map(item =>
      `${item.borrowId}-${item.id}` === key ? { ...item, quantity: Math.max(0, value) } : item
    ))
  }



  const handleConsumptionStatusChange = (key: string, value: string) => {
    setEquipment(equipment.map(item =>
      `${item.borrowId}-${item.id}` === key ? { ...item, consumptionStatus: value } : item
    ))
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
      <Header title="คืนอุปกรณ์/ครุภัณฑ์" />

      {/* ===== CONTENT ===== */}
      <div className="mt-6 flex justify-center">
        <div className="w-full max-w-[360px] px-4 flex flex-col items-center">
          {/* User Info Box */}
          {loading ? (
            <div className="w-full h-24 bg-gray-100 rounded-lg animate-pulse mb-6"></div>
          ) : equipment.length > 0 ? (
            <UserInfoBox 
              userName={equipment[0].userName}
              date={`ยืมตั้งแต่ ${equipment[0].borrowDate}`}
              time={`${equipment[0].borrowTime} น.`}
            />
          ) : (
            <UserInfoBox 
              userName="ไม่มีอุปกรณ์ที่ต้องคืน"
              date=""
              time=""
            />
          )}

          {/* Column Headers */}
          {!loading && borrowRequests.length > 0 && (
            <>
              <div className="w-full mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                <p className="text-sm font-semibold text-blue-900">
                  รายการยืมที่ยังไม่ได้คืน ({borrowRequests.length} รายการ)
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  คลิกเพื่อดูรายละเอียดและคืนอุปกรณ์
                </p>
              </div>
            </>
          )}

          {/* Borrow Requests List */}
          <div className="w-full space-y-3 mb-6">
            {loading ? (
              <div className="text-center text-gray-500 py-8">กำลังโหลดอุปกรณ์ที่ยืม...</div>
            ) : borrowRequests.length > 0 ? (
              borrowRequests.map((borrow) => (
                <div
                  key={borrow.borrowId}
                  onClick={() => setSelectedBorrow(borrow)}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md cursor-pointer transition"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-900">
                          {borrow.borrowDate} {borrow.borrowTime}
                        </span>
                        <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 font-medium text-xs">
                          {borrow.borrowType === "during-class" ? "ยืมในคาบเรียน" : 
                           borrow.borrowType === "teaching" ? "ยืมใช้สอน" : 
                           "ยืมนอกคาบเรียน"}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {borrow.equipmentItems.length} รายการ: {borrow.equipmentItems.map(e => e.equipmentName).join(", ")}
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      คลิกเพื่อคืน →
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-8">ไม่มีอุปกรณ์ที่ต้องคืน</div>
            )}
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
              onClick={() => {
                const selectedItems = equipment.filter(item => item.checked)
                if (selectedItems.length === 0) {
                  alert("กรุณาเลือกอุปกรณ์ที่ต้องคืน")
                  return
                }
                setReturnEquipment(selectedItems)
                navigate('/return/summary')
              }}
              disabled={equipment.length === 0}
              className="
                flex-1
                px-4 py-2
                rounded-full
                bg-orange-500
                text-white
                text-sm font-medium
                hover:bg-orange-600
                transition
                disabled:bg-gray-300
              "
            >
              ถัดไป
            </button>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {selectedBorrow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full mt-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">คืนอุปกรณ์</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedBorrow.borrowDate} {selectedBorrow.borrowTime}
                </p>
              </div>
              <button
                onClick={() => setSelectedBorrow(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Equipment List */}
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-xs font-semibold text-gray-700 px-2">
                <div className="flex-1">รายการ</div>
                <div className="w-16 text-center">จำนวน</div>
                <div className="w-32 text-center">สถานะ/สภาพ</div>
              </div>
              
              {selectedBorrow.equipmentItems.map((item, idx) => {
                const equipmentKey = `${selectedBorrow.borrowId}-${item.equipmentId}`
                const foundEquipment = equipment.find(e => `${e.borrowId}-${e.id}` === equipmentKey)
                const isConsumable = item.equipmentCategory === "consumable"
                
                return (
                  <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex gap-2 items-center mb-3">
                      <input
                        type="checkbox"
                        checked={foundEquipment?.checked || false}
                        onChange={() => handleCheckChange(equipmentKey)}
                        className="w-5 h-5 shrink-0 cursor-pointer accent-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-800">{item.equipmentName}</h4>
                        <p className="text-xs text-blue-500 font-medium">{item.equipmentCategory}</p>
                      </div>
                    </div>

                    {isConsumable ? (
                      // CONSUMABLE - Simple quantity + consumption status
                      <div className="space-y-2 ml-7">
                        <div className="flex gap-2 items-end">
                          <div className="flex flex-col items-end gap-1">
                            <div className="text-xs text-gray-600 font-medium">ยืมไป:</div>
                            <div className="text-sm font-semibold text-gray-800">{item.quantityBorrowed}</div>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max={item.quantityBorrowed}
                              value={typeof foundEquipment?.quantity === 'number' ? foundEquipment.quantity : 0}
                              onChange={(e) => {
                                let value = parseInt(e.target.value)
                                if (isNaN(value)) value = 0
                                if (value > item.quantityBorrowed) {
                                  value = item.quantityBorrowed
                                }
                                if (value < 0) {
                                  value = 0
                                }
                                handleQuantityChange(equipmentKey, value)
                              }}
                              disabled={!foundEquipment?.checked}
                              className="w-14 h-7 px-2 border border-gray-300 rounded text-xs text-center outline-none disabled:bg-gray-100 disabled:text-gray-400"
                            />
                            <div className="text-xs text-gray-500">
                              คืน <span className="text-red-500 font-bold">*</span>
                            </div>
                          </div>
                        </div>
                        <select
                          value={foundEquipment?.consumptionStatus || ""}
                          onChange={(e) => handleConsumptionStatusChange(equipmentKey, e.target.value)}
                          disabled={!foundEquipment?.checked}
                          className="w-full h-7 px-3 border border-gray-300 rounded-full text-xs outline-none cursor-pointer disabled:bg-gray-100 disabled:text-gray-400"
                        >
                          <option value="">-- เลือกสถานะการใช้ --</option>
                          <option value="ใช้จนหมด">✓ ใช้จนหมด (ใช้ทั้งหมด)</option>
                          <option value="ใช้บางส่วน">◐ ใช้บางส่วน (ใช้งานส่วน)</option>
                          <option value="ไม่ได้ใช้">✗ ไม่ได้ใช้</option>
                        </select>
                      </div>
                    ) : (
                      // ASSET - Breakdown by condition
                      <div className="space-y-3 ml-7">
                        <div className="text-sm font-semibold text-gray-700 mb-2">ยืมไป: {item.quantityBorrowed} หน่วย</div>
                        <div className="grid grid-cols-3 gap-2">
                          {/* Good condition */}
                          <div className="border border-green-300 bg-green-50 rounded p-2">
                            <label className="text-xs font-semibold text-green-800 block mb-1">ปกติ</label>
                            <input
                              type="number"
                              min="0"
                              max={item.quantityBorrowed}
                              value={foundEquipment?.returnGoodQty ?? item.quantityBorrowed}
                              onChange={(e) => {
                                const updated = equipment.map(eq =>
                                  `${eq.borrowId}-${eq.id}` === equipmentKey
                                    ? { ...eq, returnGoodQty: parseInt(e.target.value) || 0 }
                                    : eq
                                )
                                setEquipment(updated)
                              }}
                              disabled={!foundEquipment?.checked}
                              className="w-full h-7 px-2 border border-green-300 bg-white rounded text-sm font-semibold text-center outline-none disabled:bg-gray-100 disabled:text-gray-400 text-green-700"
                            />
                          </div>

                          {/* Damaged */}
                          <div className="border border-orange-300 bg-orange-50 rounded p-2">
                            <label className="text-xs font-semibold text-orange-800 block mb-1">ชำรุด</label>
                            <input
                              type="number"
                              min="0"
                              max={item.quantityBorrowed}
                              value={foundEquipment?.returnDamagedQty || 0}
                              onChange={(e) => {
                                const updated = equipment.map(eq =>
                                  `${eq.borrowId}-${eq.id}` === equipmentKey
                                    ? { ...eq, returnDamagedQty: parseInt(e.target.value) || 0 }
                                    : eq
                                )
                                setEquipment(updated)
                              }}
                              disabled={!foundEquipment?.checked}
                              className="w-full h-7 px-2 border border-orange-300 bg-white rounded text-sm font-semibold text-center outline-none disabled:bg-gray-100 disabled:text-gray-400 text-orange-700"
                            />
                          </div>

                          {/* Lost */}
                          <div className="border border-red-300 bg-red-50 rounded p-2">
                            <label className="text-xs font-semibold text-red-800 block mb-1">สูญหาย</label>
                            <input
                              type="number"
                              min="0"
                              max={item.quantityBorrowed}
                              value={foundEquipment?.returnLostQty || 0}
                              onChange={(e) => {
                                const updated = equipment.map(eq =>
                                  `${eq.borrowId}-${eq.id}` === equipmentKey
                                    ? { ...eq, returnLostQty: parseInt(e.target.value) || 0 }
                                    : eq
                                )
                                setEquipment(updated)
                              }}
                              disabled={!foundEquipment?.checked}
                              className="w-full h-7 px-2 border border-red-300 bg-white rounded text-sm font-semibold text-center outline-none disabled:bg-gray-100 disabled:text-gray-400 text-red-700"
                            />
                          </div>
                        </div>

                        {/* Total validation */}
                        {foundEquipment?.checked && (
                          <div className="mt-2">
                            {(() => {
                              const total = (foundEquipment?.returnGoodQty ?? item.quantityBorrowed) + 
                                           (foundEquipment?.returnDamagedQty || 0) + 
                                           (foundEquipment?.returnLostQty || 0)
                              const isValid = total === item.quantityBorrowed
                              return (
                                <div className={`text-xs font-semibold p-2 rounded ${
                                  isValid 
                                    ? 'bg-green-50 text-green-800 border border-green-200' 
                                    : 'bg-red-50 text-red-800 border border-red-200'
                                }`}>
                                  รวม: {total} / {item.quantityBorrowed} {
                                    isValid 
                                      ? '✓ ถูกต้อง' 
                                      : '✗ ต้องว่างเว้น ' + (item.quantityBorrowed - total) + ' หน่วย'
                                  }
                                </div>
                              )
                            })()}
                          </div>
                        )}

                      </div>
                    )}
                    
                    {/* Notes field */}
                    {foundEquipment?.checked && (
                      <div className="w-full mt-3 space-y-2 ml-7">
                        {isConsumable ? (
                          // For consumables: simple notes field
                          <input
                            type="text"
                            placeholder="หมายเหตุ (ไม่จำเป็น)"
                            value={foundEquipment?.notes || ""}
                            onChange={(e) => {
                              const updated = equipment.map(item =>
                                `${item.borrowId}-${item.id}` === equipmentKey
                                  ? { ...item, notes: e.target.value }
                                  : item
                              )
                              setEquipment(updated)
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-300"
                          />
                        ) : (
                          // For assets: show notes field if there are damaged or lost items
                          (() => {
                            const damagedQty = foundEquipment?.returnDamagedQty || 0
                            const lostQty = foundEquipment?.returnLostQty || 0
                            const hasIssues = damagedQty > 0 || lostQty > 0
                            
                            return hasIssues ? (
                              <div>
                                <div className="text-xs font-semibold text-gray-700 mb-1">
                                  {damagedQty > 0 && `⚠️ ${damagedQty} ชำรุด`}
                                  {damagedQty > 0 && lostQty > 0 && ', '}
                                  {lostQty > 0 && `⚠️ ${lostQty} สูญหาย`}
                                </div>
                                <input
                                  type="text"
                                  placeholder={lostQty > 0 ? "อธิบายไว้ที่ไหน (จำเป็นต้องกรอก)*" : "อธิบายความเสียหาย (จำเป็นต้องกรอก)*"}
                                  value={foundEquipment?.notes || ""}
                                  onChange={(e) => {
                                    const updated = equipment.map(item =>
                                      `${item.borrowId}-${item.id}` === equipmentKey
                                        ? { ...item, notes: e.target.value }
                                        : item
                                    )
                                    setEquipment(updated)
                                  }}
                                  className={`w-full px-3 py-2 border rounded text-xs outline-none ${
                                    lostQty > 0
                                      ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-1 focus:ring-red-300'
                                      : 'border-orange-300 bg-orange-50 focus:border-orange-500 focus:ring-1 focus:ring-orange-300'
                                  }`}
                                />
                              </div>
                            ) : null
                          })()
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedBorrow(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition"
              >
                ปิด
              </button>
              <button
                onClick={() => {
                  const selectedItems = equipment.filter(
                    e => e.borrowId === selectedBorrow.borrowId && e.checked
                  )
                  if (selectedItems.length === 0) {
                    alert("กรุณาเลือกอุปกรณ์ที่ต้องคืน")
                    return
                  }
                  
                  // Validate each item
                  for (const item of selectedItems) {
                    const borrowItem = selectedBorrow.equipmentItems.find(
                      e => `${selectedBorrow.borrowId}-${e.equipmentId}` === `${item.borrowId}-${item.id}`
                    )
                    
                    if (!borrowItem) continue
                    
                    const isConsumable = borrowItem.equipmentCategory === "consumable"
                    
                    if (isConsumable) {
                      // For consumables: validate consumption status and quantity
                      if (!item.consumptionStatus || item.consumptionStatus === "") {
                        alert(`กรุณาเลือกสถานะการใช้สำหรับ${borrowItem.equipmentName}`)
                        return
                      }
                      // Validate quantity is entered (can be 0 if used completely)
                      if (item.quantity === undefined || item.quantity === null) {
                        alert(`กรุณากรอกจำนวนที่คืนสำหรับ${borrowItem.equipmentName}`)
                        return
                      }
                      // If quantity is 0, must be marked as "used completely"
                      if (item.quantity === 0 && item.consumptionStatus !== "ใช้จนหมด") {
                        alert(`หากจำนวนคืนเป็น 0 ให้เลือกสถานะ "ใช้จนหมด"`)
                        return
                      }
                    } else {
                      // For assets: validate breakdown totals
                      const goodQty = item.returnGoodQty || 0
                      const damagedQty = item.returnDamagedQty || 0
                      const lostQty = item.returnLostQty || 0
                      const total = goodQty + damagedQty + lostQty
                      
                      // Check total equals borrowed
                      if (total !== borrowItem.quantityBorrowed) {
                        alert(`${borrowItem.equipmentName}: รวมทั้งหมดต้องเท่ากับ ${borrowItem.quantityBorrowed} หน่วย (ปัจจุบัน: ${total})`)
                        return
                      }
                      
                      // Require notes if there's damage or loss
                      if ((damagedQty > 0 || lostQty > 0) && (!item.notes || !item.notes.trim())) {
                        const missing = damagedQty > 0 ? 'ชำรุด' : 'สูญหาย'
                        alert(`กรุณาอธิบายสำหรับ${borrowItem.equipmentName}ที่${missing}`)
                        return
                      }
                    }
                  }
                  
                  setReturnEquipment(selectedItems)
                  setSelectedBorrow(null)
                  navigate('/return/summary')
                }}
                className="flex-1 px-4 py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition"
              >
                ยืนยันและถัดไป
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
