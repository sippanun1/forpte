import { useState } from "react"

interface DatePickerProps {
  value: string
  onChange: (date: string) => void
  label?: string
}

export default function DatePicker({ value, onChange, label }: DatePickerProps) {
  const [showCalendar, setShowCalendar] = useState(false)
  const [displayMonth, setDisplayMonth] = useState(new Date())

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
    "JANUARY",
    "FEBRUARY",
    "MARCH",
    "APRIL",
    "MAY",
    "JUNE",
    "JULY",
    "AUGUST",
    "SEPTEMBER",
    "OCTOBER",
    "NOVEMBER",
    "DECEMBER"
  ]

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const handleDateClick = (day: number) => {
    const newDate = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day)
    const dateString = newDate.toISOString().split("T")[0]
    onChange(dateString)
    setShowCalendar(false)
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
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day)
        .toISOString()
        .split("T")[0]
      const isSelected = value === dateString
      const isToday = new Date().toDateString() === dateString.split("T")[0]

      days.push(
        <button
          key={day}
          onClick={() => handleDateClick(day)}
          className={`
            w-10 h-10 rounded flex items-center justify-center text-sm font-medium transition
            ${isSelected ? "bg-blue-500 text-white" : ""}
            ${isToday && !isSelected ? "text-orange-500 font-bold" : ""}
            ${!isSelected && !isToday ? "text-gray-700 hover:bg-gray-100" : ""}
          `}
          style={{
            color: isSelected ? "white" : isToday ? "#FF7F50" : "#595959"
          }}
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
          className="w-full px-4 py-3 border-2 border-gray-400 rounded-lg bg-white cursor-pointer flex items-center justify-between"
        >
          <span style={{ color: value ? "#595959" : "#999" }}>
            {value ? formatDateDisplay(value) : "dd/mm/yyyy"}
          </span>
          <span className="text-xl">📅</span>
        </div>

        {/* Calendar Popup */}
        {showCalendar && (
          <div className="absolute top-full mt-2 w-full bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handlePrevMonth}
                className="text-blue-500 text-xl hover:opacity-70 transition"
              >
                ◀
              </button>
              <h3 className="text-base font-bold" style={{ color: "#595959" }}>
                {monthNames[displayMonth.getMonth()]} {displayMonth.getFullYear()}
              </h3>
              <button
                onClick={handleNextMonth}
                className="text-blue-500 text-xl hover:opacity-70 transition"
              >
                ▶
              </button>
            </div>

            {/* Day Names */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {dayNames.map((day) => (
                <div key={day} className="w-10 h-10 flex items-center justify-center text-xs font-semibold" style={{ color: "#595959" }}>
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2">
              {renderCalendar()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
