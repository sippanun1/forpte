interface UserInfoBoxProps {
  userName: string
  date: string
  time?: string
}

export default function UserInfoBox({ userName, date, time }: UserInfoBoxProps) {
  return (
    <div className="w-full bg-gray-100 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">👤</span>
        <span className="text-sm font-medium text-gray-800">{userName}</span>
      </div>
      <div className="text-xs text-gray-600 ml-9">
        <div>{date}</div>
        {time && <div>{time}</div>}
      </div>
    </div>
  )
}
