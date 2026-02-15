import { useState, useEffect } from 'react'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header'

interface AdminAction {
  id: string
  adminEmail: string
  adminName: string
  action: string
  type: 'equipment' | 'room'
  itemName: string
  timestamp: string
  details: string
}

export default function AdminHistory() {
  const navigate = useNavigate()
  const [actions, setActions] = useState<AdminAction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<'all' | 'equipment' | 'room'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAction, setSelectedAction] = useState<'all' | 'add' | 'edit' | 'update' | 'delete'>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Check if any filter is active
  const hasActiveFilters = selectedType !== 'all' || selectedAction !== 'all' || dateFilter !== 'all' || searchTerm !== ''

  useEffect(() => {
    const fetchAdminActions = async () => {
      try {
        const actionsRef = collection(db, 'adminLogs')
        const q = query(actionsRef, orderBy('timestamp', 'desc'))
        const querySnapshot = await getDocs(q)
        
        const actionsList: AdminAction[] = []
        querySnapshot.forEach((doc) => {
          actionsList.push({
            id: doc.id,
            ...doc.data()
          } as AdminAction)
        })
        
        setActions(actionsList)
      } catch (error) {
        console.error('Error fetching admin actions:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAdminActions()
  }, [])

  // Date filter logic
  const isWithinDateRange = (timestamp: string) => {
    if (dateFilter === 'all') return true
    
    const actionDate = new Date(timestamp)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    switch (dateFilter) {
      case 'today':
        const todayEnd = new Date(today)
        todayEnd.setHours(23, 59, 59, 999)
        return actionDate >= today && actionDate <= todayEnd
      case 'week':
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        return actionDate >= weekAgo
      case 'month':
        const monthAgo = new Date(today)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        return actionDate >= monthAgo
      case 'custom':
        if (!customStartDate && !customEndDate) return true
        const start = customStartDate ? new Date(customStartDate) : new Date('1970-01-01')
        const end = customEndDate ? new Date(customEndDate + 'T23:59:59') : new Date()
        return actionDate >= start && actionDate <= end
      default:
        return true
    }
  }

  const filteredActions = actions.filter(action => {
    // Type filter
    const matchesType = selectedType === 'all' || action.type === selectedType
    
    // Action filter
    const matchesAction = selectedAction === 'all' || action.action === selectedAction
    
    // Search filter
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = searchTerm === '' || 
      action.adminName.toLowerCase().includes(searchLower) ||
      action.adminEmail.toLowerCase().includes(searchLower) ||
      action.itemName.toLowerCase().includes(searchLower) ||
      action.details.toLowerCase().includes(searchLower)
    
    // Date filter
    const matchesDate = isWithinDateRange(action.timestamp)
    
    return matchesType && matchesAction && matchesSearch && matchesDate
  })

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedType('all')
    setSelectedAction('all')
    setDateFilter('all')
    setCustomStartDate('')
    setCustomEndDate('')
  }

  const getActionLabel = (action: string) => {
    const labels: { [key: string]: string } = {
      'add': 'เพิ่ม',
      'edit': 'แก้ไข',
      'delete': 'ลบ',
      'update': 'อัปเดต'
    }
    return labels[action] || action
  }

  const getTypeLabel = (type: string) => {
    return type === 'equipment' ? 'อุปกรณ์/ครุภัณฑ์' : 'ห้อง'
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'add':
        return 'bg-green-100 text-green-800'
      case 'edit':
      case 'update':
        return 'bg-blue-100 text-blue-800'
      case 'delete':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ===== HEADER ===== */}
      <Header title="ประวัติการจัดการของแอดมิน" />

      {/* ===== BACK BUTTON ===== */}
      <div className="mt-8 px-4">
        <div className="w-full max-w-4xl mx-auto mb-6">
          <button
            onClick={() => navigate(-1)}
            className="              w-full
              py-3
              rounded-full
              border border-gray-400
              text-gray-600
              text-sm font-medium
              hover:bg-gray-100
              transition
              mb-6
              flex items-center justify-center gap-2"
          >
            <img src="/arrow.svg" alt="back" className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ===== CONTENT ===== */}
      <div className="px-4">
        <div className="w-full max-w-4xl mx-auto">
          
          {/* Search Box */}
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="ค้นหาชื่อแอดมิน, รายการ, รายละเอียด..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 px-4 pr-10 border border-gray-300 rounded-lg outline-none text-sm focus:border-orange-500"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl">🔍</span>
            </div>
          </div>

          {/* Filter Section */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg mb-6 overflow-hidden">
            {/* Filter Header - Always Visible */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-100 transition"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">🔧 ตัวกรอง</span>
                {hasActiveFilters && (
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full">
                    กำลังใช้งาน
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  พบ <span className="font-semibold text-orange-600">{filteredActions.length}</span> รายการ
                </span>
                <span className={`text-gray-400 transition-transform ${showFilters ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </div>
            </button>
            
            {/* Collapsible Filter Content */}
            {showFilters && (
              <div className="px-4 pb-4 border-t border-gray-200">
                {/* Type Filter */}
                <div className="mt-4 mb-4">
              <p className="text-xs font-semibold text-gray-600 mb-2">ประเภท:</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: 'all', label: 'ทั้งหมด' },
                  { key: 'equipment', label: 'อุปกรณ์/ครุภัณฑ์' },
                  { key: 'room', label: 'ห้อง' }
                ].map((type) => (
                  <button
                    key={type.key}
                    onClick={() => setSelectedType(type.key as typeof selectedType)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                      selectedType === type.key
                        ? "bg-orange-500 text-white"
                        : "border border-gray-300 text-gray-700 hover:border-orange-500"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Filter */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-600 mb-2">การดำเนินการ:</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: 'all', label: 'ทั้งหมด' },
                  { key: 'add', label: 'เพิ่ม', color: 'green' },
                  { key: 'update', label: 'อัปเดต', color: 'blue' },
                  { key: 'edit', label: 'แก้ไข', color: 'blue' },
                  { key: 'delete', label: 'ลบ', color: 'red' }
                ].map((action) => (
                  <button
                    key={action.key}
                    onClick={() => setSelectedAction(action.key as typeof selectedAction)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                      selectedAction === action.key
                        ? action.color === 'green' ? "bg-green-500 text-white"
                        : action.color === 'blue' ? "bg-blue-500 text-white"
                        : action.color === 'red' ? "bg-red-500 text-white"
                        : "bg-orange-500 text-white"
                        : "border border-gray-300 text-gray-700 hover:border-gray-500"
                    }`}
                  >
                    {action.label}
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
                    className={`px-4 py-2 rounded-full text-sm font-medium transition ${
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
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-purple-500 outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">ถึง:</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-purple-500 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

                {/* Clear Filters Button */}
                <div className="pt-3 border-t border-gray-200">
                  <button
                    onClick={clearFilters}
                    className="text-sm text-gray-500 hover:text-red-500 transition flex items-center gap-1"
                  >
                    ✕ ล้างตัวกรองทั้งหมด
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* History Table */}
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      เวลา
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      แอดมิน
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      ประเภท
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      การดำเนิน
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      ชื่อรายการ
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      รายละเอียด
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActions.length > 0 ? (
                    filteredActions.map((action) => (
                      <tr key={action.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {new Date(action.timestamp).toLocaleString('th-TH')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="font-medium">{action.adminName}</div>
                          <div className="text-xs text-gray-500">{action.adminEmail}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {getTypeLabel(action.type)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getActionColor(action.action)}`}>
                            {getActionLabel(action.action)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {action.itemName}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {action.details}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        ไม่มีข้อมูลการจัดการของแอดมิน
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
