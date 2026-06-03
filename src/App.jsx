import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Ranking from './pages/Ranking'
import Post from './pages/Post'
import Admin from './pages/Admin'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Ranking />} />
        <Route path="/post" element={<Post />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  )
}