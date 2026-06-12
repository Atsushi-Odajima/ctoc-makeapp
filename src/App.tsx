import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'
import CategoriesPage from './pages/CategoriesPage'
import NewThreadPage from './pages/NewThreadPage'
import ThreadPage from './pages/ThreadPage'
import MyPage from './pages/MyPage'

export default function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-sky-50">
        <div className="text-center">
          <div className="mb-2 text-5xl">🍶</div>
          <p className="text-sm text-sky-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <AuthPage />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/new" element={<NewThreadPage />} />
          <Route path="/me" element={<MyPage />} />
          <Route path="/thread/:id" element={<ThreadPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
