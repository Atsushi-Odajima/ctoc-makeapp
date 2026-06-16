import Link from 'next/link';
import { Heart, MessageCircle, Shield, Zap, Star, Users } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" fill="currentColor" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              ConnectMe
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-slate-600 hover:text-blue-600 font-medium text-sm transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-md shadow-blue-200"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-64 h-64 bg-white/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-cyan-300/30 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium mb-6 border border-white/30">
            <Star className="w-4 h-4 text-yellow-300" fill="currentColor" />
            <span>Join 2M+ people finding connections</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight">
            Find Your
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-yellow-200">
              Perfect Match
            </span>
          </h1>

          <p className="text-xl text-white/80 mb-10 max-w-xl mx-auto leading-relaxed">
            Swipe, match, and connect with people who share your interests. Start your love story today.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-2xl text-lg font-bold hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              <Heart className="w-5 h-5" fill="currentColor" />
              Start for Free
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-white/20 backdrop-blur-sm text-white px-8 py-4 rounded-2xl text-lg font-bold hover:bg-white/30 transition-all border border-white/40"
            >
              Log In
            </Link>
          </div>
        </div>

        {/* Floating cards preview */}
        <div className="relative max-w-sm mx-auto mt-16 h-72">
          <div className="absolute inset-4 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 overflow-hidden transform rotate-[-8deg] translate-y-4">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />
            <div className="absolute bottom-4 left-4 text-white">
              <p className="font-bold text-lg">Sarah, 24</p>
              <p className="text-sm text-white/80">📍 New York</p>
            </div>
          </div>
          <div className="absolute inset-4 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 overflow-hidden transform rotate-[4deg] translate-y-2">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />
            <div className="absolute bottom-4 left-4 text-white">
              <p className="font-bold text-lg">Alex, 27</p>
              <p className="text-sm text-white/80">📍 San Francisco</p>
            </div>
          </div>
          <div className="absolute inset-4 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-3xl overflow-hidden shadow-2xl">
            <div className="absolute inset-0 flex items-center justify-center">
              <Heart className="w-20 h-20 text-white/30" fill="currentColor" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />
            <div className="absolute bottom-4 left-4 text-white">
              <p className="font-bold text-lg">Emma, 25</p>
              <p className="text-sm text-white/80">📍 Los Angeles</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-4">
              Why people love ConnectMe
            </h2>
            <p className="text-slate-500 text-lg">
              Modern features designed for meaningful connections
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Zap,
                color: 'from-yellow-400 to-orange-500',
                title: 'Smart Matching',
                desc: 'Our algorithm finds the best matches based on your interests, location, and preferences.',
              },
              {
                icon: Shield,
                color: 'from-green-400 to-emerald-500',
                title: 'Safe & Secure',
                desc: 'Your privacy is our priority. All conversations are encrypted and profiles are verified.',
              },
              {
                icon: MessageCircle,
                color: 'from-blue-400 to-indigo-500',
                title: 'Real Conversations',
                desc: 'Break the ice easily with our message prompts and connect on a deeper level.',
              },
              {
                icon: Heart,
                color: 'from-pink-400 to-rose-500',
                title: 'Super Likes',
                desc: "Show someone you're extra interested with a Super Like that stands out from the crowd.",
              },
              {
                icon: Users,
                color: 'from-purple-400 to-violet-500',
                title: 'Shared Interests',
                desc: 'Find people who share your passions from over 100 interest categories.',
              },
              {
                icon: Star,
                color: 'from-cyan-400 to-blue-500',
                title: 'Premium Features',
                desc: 'Unlock unlimited likes, see who liked you, and boost your profile visibility.',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-slate-50 rounded-2xl p-6 hover:shadow-md transition-all hover:-translate-y-0.5"
              >
                <div
                  className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4`}
                >
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-slate-800 text-lg mb-2">{feature.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-6 text-center text-white">
            {[
              { value: '2M+', label: 'Active Users' },
              { value: '500K+', label: 'Matches Made' },
              { value: '4.8★', label: 'App Rating' },
            ].map((stat, i) => (
              <div key={i}>
                <p className="text-4xl font-black mb-1">{stat.value}</p>
                <p className="text-white/70 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-white text-center">
        <div className="max-w-xl mx-auto">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Heart className="w-8 h-8 text-white" fill="currentColor" />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-4">
            Ready to find your match?
          </h2>
          <p className="text-slate-500 mb-8">
            Join millions of people already finding love on ConnectMe
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-2xl text-lg font-bold hover:shadow-lg hover:shadow-blue-200 transition-all hover:-translate-y-0.5"
          >
            <Heart className="w-5 h-5" fill="currentColor" />
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-100">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Heart className="w-3 h-3 text-white" fill="currentColor" />
            </div>
            <span className="text-slate-500 text-sm">© 2024 ConnectMe. All rights reserved.</span>
          </div>
          <div className="flex gap-6 text-sm text-slate-500">
            <a href="#" className="hover:text-blue-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Terms</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
