import { useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        const { needsConfirm } = await signUp(email, password, nickname)
        if (needsConfirm) {
          setInfo(
            '確認メールを送信しました。メール内のリンクを開いてからログインしてください。'
          )
          setMode('login')
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(
        msg.includes('Invalid login credentials')
          ? 'メールアドレスまたはパスワードが違います'
          : msg
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center bg-sky-50 px-6">
      <div className="mb-8 text-center">
        <div className="mb-2 text-6xl">🍶</div>
        <h1 className="text-2xl font-bold text-sky-800">大塚･巣鴨の酒アホ達</h1>
        <p className="mt-1 text-sm text-sky-600">仲間内だけのゆるい掲示板</p>
      </div>

      <div className="mb-4 grid grid-cols-2 rounded-xl bg-sky-100 p-1">
        {(['login', 'signup'] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m)
              setError('')
            }}
            className={`rounded-lg py-2 text-sm font-bold transition ${
              mode === m ? 'bg-white text-sky-700 shadow' : 'text-sky-500'
            }`}
          >
            {m === 'login' ? 'ログイン' : '新規登録'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'signup' && (
          <input
            type="text"
            required
            maxLength={20}
            placeholder="ニックネーム"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-base outline-none focus:border-sky-400"
          />
        )}
        <input
          type="email"
          required
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-base outline-none focus:border-sky-400"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="パスワード(6文字以上)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-base outline-none focus:border-sky-400"
        />

        {error && <p className="text-sm text-red-500">{error}</p>}
        {info && <p className="text-sm text-sky-600">{info}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-sky-500 py-3 text-base font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? '処理中...' : mode === 'login' ? 'ログイン' : '登録する'}
        </button>
      </form>
    </div>
  )
}
