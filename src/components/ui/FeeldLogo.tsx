interface FeeldLogoProps {
  size?: number
  showText?: boolean
  textSize?: string
  className?: string
}

export function FeeldLogo({ size = 32, showText = true, textSize = "text-2xl", className = "" }: FeeldLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img src="/logo.svg" alt="ハレノワ" width={size} height={size} className="object-contain" />
      {showText && <span className={`${textSize} font-black text-[#0b1f3a]`}>ハレノワ</span>}
    </div>
  )
}

export function FeeldIcon({ size = 32 }: { size?: number }) {
  return <img src="/logo.svg" alt="ハレノワ" width={size} height={size} className="object-contain" />
}
