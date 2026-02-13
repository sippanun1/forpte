interface HeaderProps {
  title: string
}

export default function Header({ title }: HeaderProps) {
  return (
    <div
      className="
        w-full h-14
        bg-[#FF7F50]
        text-white text-xl font-semibold
        flex items-center justify-center
        z-10
      "
    >
      {title}
    </div>
  )
}
