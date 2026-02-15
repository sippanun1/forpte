import { useState } from "react"

interface DatePickerProps {
  value: string
  onChange: (date: string) => void
  label?: string
  usageDays?: Record<string, boolean>
}

export default function DatePicker({ value, onChange, label, usageDays }: DatePickerProps) {
  const [showCalendar, setShowCalendar] = useState(false)
  const [displayMonth, setDisplayMonth] = useState(new Date())

  // Get day key for a specific date (0=Sunday, 1=Monday, etc.)
  const getDayKey = (date: Date): string => {
    const dayNum = date.getDay()
    const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
    return dayKeys[dayNum]
  }

  // Check if a specific date is available based on usageDays
  const isDateAvailable = (date: Date): boolean => {
    if (!usageDays) return true // If no usageDays specified, all dates are available
    const dayKey = getDayKey(date)
    return usageDays[dayKey] !== false // Default to true if not explicitly set to false
  }

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return ""
    const date = new Date(dateString + "T00:00:00")
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear() + 543 // Convert to Buddhist year
    return `${day}/${month}/${year}`
  }

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const monthNames = [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม"
  ]

  const dayNames = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]

  const handleDateClick = (day: number) => {
    const newDate = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day)
    newDate.setHours(0, 0, 0, 0)
    
    // Create date string manually to avoid timezone issues
    const year = newDate.getFullYear()
    const month = String(newDate.getMonth() + 1).padStart(2, "0")
    const dateNum = String(newDate.getDate()).padStart(2, "0")
    const dateString = `${year}-${month}-${dateNum}`
    
    // Prevent selecting past dates
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (newDate.getTime() >= today.getTime()) {
      onChange(dateString)
      setShowCalendar(false)
    }
  }

  const handlePrevMonth = () => {
    setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1))
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(displayMonth)
    const firstDay = getFirstDayOfMonth(displayMonth)
    const days = []

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`}></div>)
    }

    // Days of month
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day)
      dateObj.setHours(0, 0, 0, 0)
      
      // Create date string manually to avoid timezone issues
      const year = dateObj.getFullYear()
      const month = String(dateObj.getMonth() + 1).padStart(2, "0")
      const dateNum = String(dateObj.getDate()).padStart(2, "0")
      const dateString = `${year}-${month}-${dateNum}`
      
      const isSelected = value === dateString
      const isToday = new Date().toDateString() === dateObj.toDateString()
      const isPast = dateObj.getTime() < today.getTime()
      const isUnavailable = !isDateAvailable(dateObj)

      days.push(
        <button
          key={day}
          onClick={() => handleDateClick(day)}
          disabled={isPast || isUnavailable}
          className={`
            w-full h-12 rounded flex items-center justify-center text-sm font-medium transition touch-manipulation
            ${isSelected ? "bg-blue-500 text-white" : ""}
            ${isToday && !isSelected ? "bg-blue-100 text-blue-600 font-bold" : ""}
            ${!isSelected && !isToday && !isPast && !isUnavailable ? "text-gray-700 hover:bg-gray-100 active:bg-gray-200" : ""}
            ${isPast || isUnavailable ? "text-gray-300 cursor-not-allowed" : ""}
          `}
          style={{
            color: isSelected ? "white" : isToday ? "#2563eb" : isPast || isUnavailable ? "#ccc" : "#595959",
            backgroundColor: isSelected ? "#3b82f6" : isToday ? "#dbeafe" : isPast || isUnavailable ? "transparent" : "transparent"
          }}
          title={isUnavailable ? "ห้องปิดในวันนี้" : ""}
        >
          {day}
        </button>
      )
    }

    return days
  }

  return (
    <div className="w-full">
      {label && (
        <p className="text-sm font-medium mb-2" style={{ color: "#595959" }}>
          {label}
        </p>
      )}

      <div className="relative">
        {/* Date Input */}
        <div
          onClick={() => setShowCalendar(!showCalendar)}
          className="w-full px-4 py-3 border-2 border-gray-400 rounded-lg bg-white cursor-pointer flex items-center justify-between hover:border-gray-500 transition"
        >
          <span style={{ color: value ? "#595959" : "#999" }}>
            {value ? formatDateDisplay(value) : "วว/คค/ปปปป"}
          </span>
          <span className="text-xl">📅</span>
        </div>

        {/* Calendar Modal */}
        {showCalendar && (
          <div 
            className="fixed inset-0 z-50 p-4 flex items-end sm:items-center sm:justify-center bg-black/30 sm:bg-transparent"
            onClick={() => setShowCalendar(false)}
          >
            <div 
              className="w-full bg-white border border-gray-300 rounded-lg shadow-lg p-5 sm:max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-5">
                <button
                  onClick={handlePrevMonth}
                  className="w-10 h-10 flex items-center justify-center text-xl text-gray-400 hover:text-gray-600 active:opacity-50 transition rounded-lg touch-manipulation"
                >
                  ▲
                </button>
                <h3 className="text-base font-bold" style={{ color: "#595959" }}>
                  {monthNames[displayMonth.getMonth()]} {displayMonth.getFullYear() + 543}
                </h3>
                <button
                  onClick={handleNextMonth}
                  className="w-10 h-10 flex items-center justify-center text-xl text-gray-400 hover:text-gray-600 active:opacity-50 transition rounded-lg touch-manipulation"
                >
                  ▼
                </button>
              </div>

              {/* Day Names */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map((day) => (
                  <div key={day} className="h-10 flex items-center justify-center text-xs font-semibold" style={{ color: "#595959" }}>
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {renderCalendar()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
