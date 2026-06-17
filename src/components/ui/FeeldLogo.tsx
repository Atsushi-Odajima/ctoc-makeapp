import Image from "next/image"

interface FeeldLogoProps {
  size?: number
  showText?: boolean
  textSize?: string
  className?: string
}

export function FeeldLogo({ size = 32, showText = true, textSize = "text-2xl", className = "" }: FeeldLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/logo.svg"
        alt="Feeld"
        width={size}
        height={size}
        className="object-contain"
        priority
      />
      {showText && (
        <span className={`font-black tracking-tight bg-gradient-to-r from-blue-700 to-cyan-500 bg-clip-text text-transparent ${textSize}`}>
          Feeld
        </span>
      )}
    </div>
  )
}

export function FeeldIcon({ size = 32 }: { size?: number }) {
  return (
    <Image
      src="/logo.svg"
      alt="Feeld"
      width={size}
      height={size}
      className="object-contain"
      priority
    />
  )
}
