export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-800 to-cyan-700 flex items-center justify-center p-4">
      <div className="absolute top-20 right-20 w-72 h-72 bg-blue-400 rounded-full opacity-10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-20 w-64 h-64 bg-cyan-300 rounded-full opacity-10 blur-3xl pointer-events-none" />
      <div className="relative w-full max-w-sm z-10">
        {children}
      </div>
    </div>
  )
}
