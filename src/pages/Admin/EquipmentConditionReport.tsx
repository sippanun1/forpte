import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore"
import { db } from "../../firebase/firebase"
import Header from "../../components/Header"
import type { BorrowTransaction } from "../../utils/borrowReturnLogger"

interface EquipmentConditionData {
  equipmentName: string
  equipmentId: string
  condition: string
  assetCodes: string[]
  notes: string[]
  borrowIds: string[]
  borrowerNames: string[]
  documentIds: string[]
  borrowItemIndices: number[]
}

export default function EquipmentConditionReport() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [equipmentConditions, setEquipmentConditions] = useState<EquipmentConditionData[]>([])
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentConditionData | null>(null)
  const [filter, setFilter] = useState<'all' | 'ชำรุด' | 'สูญหาย'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null)
  const [newCondition, setNewCondition] = useState<string>('')
  const [newNotes, setNewNotes] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchEquipmentConditions = async () => {
      try {
        // Get all returned borrow transactions
        const borrowHistoryQuery = query(
          collection(db, "borrowHistory"),
          where("status", "==", "returned")
        )
        const snapshot = await getDocs(borrowHistoryQuery)
        
        const conditionMap = new Map<string, EquipmentConditionData>()
        
        snapshot.forEach((doc) => {
          const txn = doc.data() as BorrowTransaction
          
          // Process each equipment item in the transaction
          txn.equipmentItems?.forEach((item, itemIndex) => {
            if (item.returnCondition && item.returnCondition !== "ปกติ") {
              const key = `${item.equipmentName}-${item.returnCondition}`
              
              if (!conditionMap.has(key)) {
                conditionMap.set(key, {
                  equipmentName: item.equipmentName,
                  equipmentId: item.equipmentId || "",
                  condition: item.returnCondition,
                  assetCodes: [],
                  notes: [],
                  borrowIds: [],
                  borrowerNames: [],
                  documentIds: [],
                  borrowItemIndices: []
                })
              }
              
              const data = conditionMap.get(key)!
              // Add asset codes (plural - could be multiple per item)
              if (item.assetCodeConditions && item.assetCodeConditions.length > 0) {
                item.assetCodeConditions.forEach(ac => {
                  data.assetCodes.push(ac.code)
                  data.notes.push(ac.notes || item.returnNotes || "")
                })
              } else if (item.assetCodes && item.assetCodes.length > 0) {
                item.assetCodes.forEach(code => {
                  data.assetCodes.push(code)
                  data.notes.push(item.returnNotes || "")
                })
              }
              data.borrowIds.push(txn.borrowId)
              data.borrowerNames.push(txn.userName)
              data.documentIds.push(doc.id)
              data.borrowItemIndices.push(itemIndex)
            }
          })
        })
        
        setEquipmentConditions(Array.from(conditionMap.values()))
      } catch (error) {
        console.error("Error fetching equipment conditions:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchEquipmentConditions()
  }, [])

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "ชำรุด":
        return "bg-red-100 border-red-300 text-red-700"
      case "สูญหาย":
        return "bg-orange-100 border-orange-300 text-orange-700"
      default:
        return "bg-gray-100 border-gray-300 text-gray-700"
    }
  }

  const getConditionBadgeColor = (condition: string) => {
    switch (condition) {
      case "ชำรุด":
        return "bg-red-600 text-white"
      case "สูญหาย":
        return "bg-orange-600 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  const groupedByCondition = {
    ชำรุด: equipmentConditions.filter(e => e.condition === "ชำรุด"),
    สูญหาย: equipmentConditions.filter(e => e.condition === "สูญหาย")
  }

  const filteredEquipment = {
    ชำรุด: groupedByCondition.ชำรุด.filter(_e => 
      filter === 'all' || filter === 'ชำรุด'
    ).filter(e =>
      e.equipmentName.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    สูญหาย: groupedByCondition.สูญหาย.filter(_e => 
      filter === 'all' || filter === 'สูญหาย'
    ).filter(e =>
      e.equipmentName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const totalBroken = filteredEquipment.ชำรุด.length
  const totalLost = filteredEquipment.สูญหาย.length

  const handleEditItem = (itemIndex: number) => {
    if (selectedEquipment) {
      setEditingItemIndex(itemIndex)
      setIsEditing(true)
      setNewCondition(selectedEquipment.condition)
      setNewNotes(selectedEquipment.notes[itemIndex] || '')
    }
  }

  const handleSaveCondition = async () => {
    if (!selectedEquipment || editingItemIndex === null) return
    
    setIsSaving(true)
    try {
      const docId = selectedEquipment.documentIds[editingItemIndex]
      const itemIndex = selectedEquipment.borrowItemIndices[editingItemIndex]
      const serialCode = selectedEquipment.assetCodes[editingItemIndex]
      
      const docRef = doc(db, "borrowHistory", docId)
      
      // Get the current document to preserve other data
      const querySnapshot = await getDocs(query(collection(db, "borrowHistory")))
      let foundDoc = null
      
      for (const docSnap of querySnapshot.docs) {
        if (docSnap.id === docId) {
          foundDoc = docSnap
          break
        }
      }
      
      if (foundDoc) {
        const txnData = foundDoc.data() as BorrowTransaction
        const updatedItems = [...txnData.equipmentItems]
        updatedItems[itemIndex] = {
          ...updatedItems[itemIndex],
          returnCondition: newCondition,
          returnNotes: newNotes
        }
        
        await updateDoc(docRef, { equipmentItems: updatedItems })
        
        // If condition changed to "ปกติ", mark the asset code document as available
        // NEW STRUCTURE (Option A): Each serial code is its own document
        if (newCondition === "ปกติ" && serialCode) {
          try {
            // Find the equipment document with this serial code and set available: true
            const equipmentQuery = query(
              collection(db, "equipment"),
              where("serialCode", "==", serialCode)
            )
            const equipmentSnapshot = await getDocs(equipmentQuery)
            
            if (!equipmentSnapshot.empty) {
              const equipmentDocRef = equipmentSnapshot.docs[0].ref
              await updateDoc(equipmentDocRef, {
                available: true
              })
            }
          } catch (error) {
            console.error("Error updating equipment availability:", error)
          }
        }
        
        // Update local state
        const updated = selectedEquipment.notes.slice()
        updated[editingItemIndex] = newNotes
        setSelectedEquipment({
          ...selectedEquipment,
          condition: newCondition,
          notes: updated
        })
        
        setIsEditing(false)
        setEditingItemIndex(null)
        setNewCondition('')
        setNewNotes('')
        
        alert('อัปเดตสภาพอุปกรณ์สำเร็จ')
      }
    } catch (error) {
      console.error("Error updating condition:", error)
      alert('เกิดข้อผิดพลาดในการอัปเดต')
    } finally {
      setIsSaving(false)
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
      <Header title="สรุปสภาพอุปกรณ์/ครุภัณฑ์" />

      {/* ===== CONTENT ===== */}
      <div className="mt-6 flex justify-center">
        <div className="w-full max-w-[360px] px-4 flex flex-col items-center pb-6">
          {/* Back Button */}
          <button
            onClick={() => navigate('/admin')}
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
              flex items-center justify-center gap-2
            "
          >
            <img src="/arrow.svg" alt="back" className="w-5 h-5" />
          </button>

          {/* Search Box */}
          <div className="w-full mb-4">
            <input
              type="text"
              placeholder="ค้นหาอุปกรณ์..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="
                w-full
                px-4 py-2
                rounded-lg
                border border-gray-300
                text-sm
                placeholder-gray-500
                focus:outline-none
                focus:ring-2
                focus:ring-orange-500
                focus:border-transparent
              "
            />
          </div>

          {/* Filter Buttons */}
          <div className="w-full flex gap-2 mb-4">
            <button
              onClick={() => setFilter('all')}
              className={`
                flex-1
                py-2
                rounded-lg
                text-xs font-semibold
                transition
                ${filter === 'all'
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }
              `}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setFilter('ชำรุด')}
              className={`
                flex-1
                py-2
                rounded-lg
                text-xs font-semibold
                transition
                ${filter === 'ชำรุด'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
                }
              `}
            >
              ชำรุด
            </button>
            <button
              onClick={() => setFilter('สูญหาย')}
              className={`
                flex-1
                py-2
                rounded-lg
                text-xs font-semibold
                transition
                ${filter === 'สูญหาย'
                  ? 'bg-orange-600 text-white'
                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                }
              `}
            >
              สูญหาย
            </button>
          </div>
          {/* Summary Cards */}
          <div className="w-full grid grid-cols-2 gap-3 mb-6">
            {/* Broken Items */}
            <div className="bg-red-50 border border-red-300 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-red-600 mb-1">{totalBroken}</div>
              <p className="text-xs font-medium text-red-700">ชำรุด</p>
              <p className="text-xs text-red-600 mt-1">
                {filteredEquipment.ชำรุด.reduce((sum, e) => sum + e.assetCodes.length, 0)} รายการ
              </p>
            </div>

            {/* Lost Items */}
            <div className="bg-orange-50 border border-orange-300 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-orange-600 mb-1">{totalLost}</div>
              <p className="text-xs font-medium text-orange-700">สูญหาย</p>
              <p className="text-xs text-orange-600 mt-1">
                {filteredEquipment.สูญหาย.reduce((sum, e) => sum + e.assetCodes.length, 0)} รายการ
              </p>
            </div>
          </div>

          {/* Broken Equipment Section */}
          {totalBroken > 0 && (filter === 'all' || filter === 'ชำรุด') && (
            <div className="w-full mb-6">
              <h2 className="text-lg font-bold text-red-700 mb-3">🔧 อุปกรณ์ที่ชำรุด ({totalBroken})</h2>
              <div className="space-y-2">
                {filteredEquipment.ชำรุด.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedEquipment(item)}
                    className={`
                      w-full text-left p-3 rounded-lg border-2 transition
                      ${getConditionColor("ชำรุด")} hover:shadow-md
                    `}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{item.equipmentName}</h3>
                        <p className="text-xs opacity-75 mt-1">
                          {item.assetCodes.length} รหัส • {item.borrowerNames.length} ผู้ยืม
                        </p>
                      </div>
                      <span className={`${getConditionBadgeColor(item.condition)} text-xs font-bold px-2 py-1 rounded`}>
                        {item.condition}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Lost Equipment Section */}
          {totalLost > 0 && (filter === 'all' || filter === 'สูญหาย') && (
            <div className="w-full mb-6">
              <h2 className="text-lg font-bold text-orange-700 mb-3">🚨 อุปกรณ์ที่สูญหาย ({totalLost})</h2>
              <div className="space-y-2">
                {filteredEquipment.สูญหาย.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedEquipment(item)}
                    className={`
                      w-full text-left p-3 rounded-lg border-2 transition
                      ${getConditionColor("สูญหาย")} hover:shadow-md
                    `}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{item.equipmentName}</h3>
                        <p className="text-xs opacity-75 mt-1">
                          {item.assetCodes.length} รหัส • {item.borrowerNames.length} ผู้ยืม
                        </p>
                      </div>
                      <span className={`${getConditionBadgeColor(item.condition)} text-xs font-bold px-2 py-1 rounded`}>
                        {item.condition}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && totalBroken === 0 && totalLost === 0 && (
            <div className="w-full text-center py-12">
              <p className="text-lg mb-2">✅</p>
              <p className="text-gray-600 font-medium">ไม่มีอุปกรณ์ที่ชำรุดหรือสูญหาย</p>
              <p className="text-xs text-gray-500 mt-2">ทุกอุปกรณ์อยู่ในสภาพปกติ</p>
            </div>
          )}
        </div>
      </div>

      {/* ===== DETAIL MODAL ===== */}
      {selectedEquipment && (
        <div className="fixed inset-0 backdrop-blur-xs bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full mt-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedEquipment.equipmentName}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`${getConditionBadgeColor(selectedEquipment.condition)} text-sm font-bold px-3 py-1 rounded-full`}>
                    {selectedEquipment.condition}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedEquipment(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Asset Codes Section */}
            <div className="mb-6 border-b pb-4">
              <h3 className="font-semibold text-gray-900 mb-3">รหัสอุปกรณ์ที่ได้รับ</h3>
              <div className="space-y-3">
                {selectedEquipment.assetCodes.map((code, idx) => (
                  <div
                    key={idx}
                    className={`border-2 rounded-lg p-4 transition ${
                      isEditing && editingItemIndex === idx
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <p className="text-sm font-mono font-semibold text-gray-800">{code}</p>
                    <p className="text-xs text-gray-600 mt-1">ผู้ยืม: {selectedEquipment.borrowerNames[idx]}</p>
                    
                    {/* Edit Section */}
                    {isEditing && editingItemIndex === idx ? (
                      <div className="mt-4 space-y-3 border-t pt-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-700 block mb-2">สภาพอุปกรณ์</label>
                          <select
                            value={newCondition}
                            onChange={(e) => setNewCondition(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="ปกติ">ปกติ</option>
                            <option value="ชำรุด">ชำรุด</option>
                            <option value="สูญหาย">สูญหาย</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-700 block mb-2">หมายเหตุ</label>
                          <textarea
                            value={newNotes}
                            onChange={(e) => setNewNotes(e.target.value)}
                            placeholder="เพิ่มหมายเหตุ (ตัวอย่าง: ซ่อมแซมเรียบร้อยแล้ว, พบอุปกรณ์แล้ว)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            rows={2}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveCondition}
                            disabled={isSaving}
                            className="flex-1 px-3 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition"
                          >
                            {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                          </button>
                          <button
                            onClick={() => {
                              setIsEditing(false)
                              setEditingItemIndex(null)
                              setNewCondition('')
                              setNewNotes('')
                            }}
                            disabled={isSaving}
                            className="flex-1 px-3 py-2 bg-gray-400 text-white text-xs font-semibold rounded-lg hover:bg-gray-500 disabled:opacity-50 transition"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 flex items-start gap-2">
                        <div className="flex-1">
                          {selectedEquipment.notes[idx] && (
                            <div className={`rounded p-2 text-xs ${
                              selectedEquipment.condition === 'สูญหาย' 
                                ? 'bg-orange-100 border border-orange-200' 
                                : 'bg-orange-100 border border-orange-200'
                            }`}>
                              <span className="font-semibold">หมายเหตุ:</span> {selectedEquipment.notes[idx]}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleEditItem(idx)}
                          className="px-3 py-2 bg-orange-600 text-white text-xs font-semibold rounded-lg hover:bg-orange-700 transition whitespace-nowrap"
                        >
                          แก้ไข
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Close Button */}
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedEquipment(null)}
                className="w-full px-4 py-2 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
