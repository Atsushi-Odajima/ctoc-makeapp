import Link from "next/link"
import { Heart, Camera, Users, MessageCircle, Eye, Zap } from "lucide-react"

const DEMO_PHOTOS = [
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&q=80",
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80",
  "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=400&q=80",
  "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=400&q=80",
  "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=400&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80",
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center">
              <Camera className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-black bg-gradient-to-r from-blue-700 to-cyan-500 bg-clip-text text-transparent" style={{fontFamily:"'Georgia',serif"}}>
              Connectly
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-slate-600 font-semibold text-sm hover:text-blue-600 transition-colors">
              ログイン
            </Link>
            <Link href="/register"
              className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md shadow-blue-200 hover:shadow-lg transition-all">
              登録する
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-20 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-white" />
        <div className="relative max-w-4xl mx-auto px-5 text-center pt-12">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
            <Zap className="w-3.5 h-3.5" />
            写真でつながる新しいSNS
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-5 leading-tight">
            あなたの毎日を
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              シェアしよう
            </span>
          </h1>
          <p className="text-lg text-slate-500 mb-10 max-w-md mx-auto leading-relaxed">
            写真を投稿して、フォロワーとつながろう。<br />
            足跡機能でプロフィール訪問者がわかる。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-8 py-4 rounded-2xl text-base font-bold shadow-lg shadow-blue-200 hover:shadow-xl hover:-translate-y-0.5 transition-all">
              <Heart className="w-5 h-5 fill-white" />
              無料ではじめる
            </Link>
            <Link href="/login"
              className="inline-flex items-center justify-center gap-2 border border-slate-200 text-slate-700 px-8 py-4 rounded-2xl text-base font-semibold hover:bg-slate-50 transition-all">
              ログイン
            </Link>
          </div>
        </div>

        {/* Photo grid preview */}
        <div className="relative max-w-lg mx-auto mt-14 px-5">
          <div className="grid grid-cols-3 gap-1.5 rounded-3xl overflow-hidden shadow-2xl shadow-blue-100">
            {DEMO_PHOTOS.map((photo, i) => (
              <div key={i} className="aspect-square bg-slate-200 overflow-hidden">
                <img src={photo} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-5 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-slate-900 mb-3">充実した機能</h2>
            <p className="text-slate-500">日常をもっと楽しくするフィーチャー</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {[
              { icon: Camera, color: "from-blue-500 to-cyan-500", title: "写真投稿", desc: "複数枚の写真をシェア。キャプションや場所も追加できます" },
              { icon: Users, color: "from-purple-500 to-pink-500", title: "フォロー", desc: "気になるユーザーをフォローして、フィードに投稿を表示" },
              { icon: Eye, color: "from-orange-400 to-amber-500", title: "足跡機能", desc: "誰があなたのプロフィールを見たかがわかる独自機能" },
              { icon: MessageCircle, color: "from-green-500 to-teal-500", title: "ダイレクトメッセージ", desc: "フォロワーとプライベートなやりとりができます" },
              { icon: Heart, color: "from-red-500 to-rose-500", title: "いいね・コメント", desc: "ダブルタップでいいね。コメントで盛り上がろう" },
              { icon: Zap, color: "from-blue-600 to-indigo-600", title: "ストーリー", desc: "24時間で消えるストーリーで日常をシェア" },
            ].map((f, i) => (
              <div key={i} className="bg-slate-50 rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className={`w-11 h-11 bg-gradient-to-br ${f.color} rounded-xl flex items-center justify-center mb-4`}>
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-slate-900 mb-1.5">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-14 bg-gradient-to-r from-blue-600 to-cyan-500">
        <div className="max-w-3xl mx-auto px-5">
          <div className="grid grid-cols-3 gap-4 text-center text-white">
            {[
              { value: "1万+", label: "ユーザー" },
              { value: "5万+", label: "投稿数" },
              { value: "4.9★", label: "評価" },
            ].map((s, i) => (
              <div key={i}>
                <p className="text-4xl font-black mb-1">{s.value}</p>
                <p className="text-white/70 text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-5 text-center bg-white">
        <div className="max-w-md mx-auto">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Camera className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-3">今すぐはじめよう</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Connectlyに参加して、あなたの日常を写真でシェアしよう
          </p>
          <Link href="/register"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-8 py-4 rounded-2xl text-base font-bold shadow-lg shadow-blue-200 hover:shadow-xl hover:-translate-y-0.5 transition-all">
            <Heart className="w-5 h-5 fill-white" />
            無料アカウントを作成
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-5 border-t border-slate-100">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-md flex items-center justify-center">
              <Camera className="w-3 h-3 text-white" />
            </div>
            <span className="text-slate-400 text-sm">© 2024 Connectly</span>
          </div>
          <div className="flex gap-5 text-sm text-slate-400">
            <a href="#" className="hover:text-blue-600 transition-colors">プライバシー</a>
            <a href="#" className="hover:text-blue-600 transition-colors">利用規約</a>
            <a href="#" className="hover:text-blue-600 transition-colors">サポート</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
