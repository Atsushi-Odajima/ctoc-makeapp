export default function Avatar({
  avatar,
  size = 'md',
}: {
  avatar?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const cls = {
    sm: 'h-6 w-6 text-sm',
    md: 'h-9 w-9 text-xl',
    lg: 'h-20 w-20 text-5xl',
  }[size]

  const value = avatar || '🍶'
  const isImage = value.startsWith('http')

  return (
    <span
      className={`${cls} inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-sky-200 bg-sky-100`}
    >
      {isImage ? (
        <img src={value} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="leading-none">{value}</span>
      )}
    </span>
  )
}
