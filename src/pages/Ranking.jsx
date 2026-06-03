import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Ranking() {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchQuestions()
  }, [])

  async function fetchQuestions() {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('hidden', false)
      .is('parent_id', null)
      .order('votes', { ascending: false })

    if (error) {
      console.error(error)
    } else {
      setQuestions(data)
    }
    setLoading(false)
  }

  async function handleVote(id, currentVotes) {
    const { error } = await supabase
      .from('questions')
      .update({ votes: currentVotes + 1 })
      .eq('id', id)

    if (!error) {
      setQuestions(prev =>
        prev
          .map(q => q.id === id ? { ...q, votes: q.votes + 1 } : q)
          .sort((a, b) => b.votes - a.votes)
      )
    }
  }

  if (loading) return <div style={{ padding: '2rem' }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '1.5rem 1rem 6rem' }}>
      <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>みんなの質問</h1>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
        気になる質問に「私も聞きたい」を押してください · {questions.length}件
      </p>

      {questions.length === 0 && (
        <p style={{ color: '#888', fontSize: 14 }}>まだ質問がありません</p>
      )}

      {questions.map((q, index) => {
        const rank = index + 1
        const isTop3 = rank <= 3
        const rankColors = { 1: '#B4890A', 2: '#7A7A7A', 3: '#8C5C34' }
        const bgColors = { 1: '#FAEEDA', 2: '#F1EFE8', 3: '#F5EDE5' }

        return (
          <div key={q.id} style={{
            display: 'flex',
            gap: 16,
            alignItems: 'center',
            padding: '1rem 1.25rem',
            marginBottom: 10,
            borderRadius: 12,
            border: `${isTop3 ? 1 : 0.5}px solid ${isTop3 ? rankColors[rank] : '#ddd'}`,
            background: bgColors[rank] || '#fff',
          }}>
            <div style={{ textAlign: 'center', minWidth: 44 }}>
              <div style={{
                fontSize: rank === 1 ? 36 : rank === 2 ? 32 : rank === 3 ? 30 : 24,
                fontWeight: 500,
                color: rankColors[rank] || '#999',
                lineHeight: 1,
              }}>{rank}</div>
              <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>位</div>
            </div>

            <div style={{ flex: 1 }}>
              <p style={{
                fontSize: rank === 1 ? 16 : 15,
                fontWeight: rank === 1 ? 500 : 400,
                margin: '0 0 10px',
                lineHeight: 1.55,
              }}>{q.title}</p>
              <button
                onClick={() => handleVote(q.id, q.votes)}
                style={{
                  fontSize: 13,
                  border: '0.5px solid #ccc',
                  borderRadius: 8,
                  padding: '5px 14px',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                🤍 私も聞きたい
              </button>
            </div>

            <div style={{ textAlign: 'center', minWidth: 52 }}>
              <div style={{
                fontSize: rank === 1 ? 40 : rank === 2 ? 36 : rank === 3 ? 34 : 28,
                fontWeight: 500,
                color: rankColors[rank] || '#333',
                lineHeight: 1,
              }}>{q.votes}</div>
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>票</div>
            </div>
          </div>
        )
      })}

      <button
        onClick={() => navigate('/post')}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: '#534AB7',
          color: '#fff',
          border: 'none',
          borderRadius: 999,
          padding: '12px 20px',
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        }}
      >
        ＋ 質問を追加する
      </button>
    </div>
  )
}