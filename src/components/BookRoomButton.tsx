interface BookRoomButtonProps {
  emoji: string
  label: string
  onClick?: () => void
}

export default function BookRoomButton({ emoji, label, onClick }: BookRoomButtonProps) {
  return (
    <button
      onClick={onClick}
      className="
        flex-1
        flex flex-col items-center justify-center gap-3
        px-6 py-5
        rounded-lg
        transition
        hover:opacity-90
      "
    >
      {/* Circle Orange Background for Emoji */}
      <div
        className="
          w-14 h-14
          rounded-full
          bg-orange-500
          flex items-center justify-center
          text-2xl
        "
      >
        {emoji}
      </div>
      <span className="text-sm font-medium" style={{ color: '#595959' }}>
        {label}
      </span>
    </button>
  )
}
