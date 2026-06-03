import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD

export default function Admin() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [questions, setQuestions] = useState([])
  const [sessions, setSessions] = useState([])
  const [currentSession, setCurrentSession] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sortMode, setSortMode] = useState('votes')
  const [filterMode, setFilterMode] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [groupTargetId, setGroupTargetId] = useState(null)

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_authed')
    if (saved === 'true') setAuthed(true)
  }, [])

  useEffect(() => {
    if (authed) fetchSessions()
  }, [authed])

  useEffect(() => {
    if (currentSession) fetchQuestions()
  }, [currentSession])

  async function fetchSessions() {
    const { data } = await supabase.from('sessions').select('*').order('created_at', { ascending: false })
    setSessions(data || [])
    if (data && data.length > 0) setCurrentSession(data[0].id)
  }

  async function fetchQuestions() {
    setLoading(true)
    const { data } = await supabase
      .from('questions')
      .select('*')
      .eq('session_id', currentSession)
      .order('created_at', { ascending: true })
    setQuestions(data || [])
    setLoading(false)
  }

  function handleLogin() {
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_authed', 'true')
      setAuthed(true)
    } else {
      alert('パスワードが違います')
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('admin_authed')
    setAuthed(false)
  }

  async function toggleHidden(id, current) {
    await supabase.from('questions').update({ hidden: !current }).eq('id', id)
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, hidden: !current } : q))
  }

  async function unlink(id) {
    await supabase.from('questions').update({ parent_id: null }).eq('id', id)
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, parent_id: null } : q))
  }

  async function applyGroup(childIds) {
    await Promise.all(childIds.map(id =>
      supabase.from('questions').update({ parent_id: groupTargetId }).eq('id', id)
    ))
    setQuestions(prev => prev.map(q =>
      childIds.includes(q.id) ? { ...q, parent_id: groupTargetId } : q
    ))
    setGroupTargetId(null)
  }

  function getEffectiveVotes(q) {
    return q.votes + questions.filter(c => c.parent_id === q.id).reduce((a, c) => a + c.votes, 0)
  }

  function getSortedParents() {
    const parents = questions.filter(q => !q.parent_id)
    if (sortMode === 'votes') return [...parents].sort((a, b) => getEffectiveVotes(b) - getEffectiveVotes(a))
    if (sortMode === 'newest') return [...parents].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    if (sortMode === 'oldest') return [...parents].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    return parents
  }

  function matchFilter(q) {
    if (filterMode === 'visible') return !q.hidden
    if (filterMode === 'hidden') return q.hidden
    if (filterMode === 'parent') return !q.parent_id
    return true
  }

  function matchSearch(q) {
    if (!searchQuery) return true
    return q.title.includes(searchQuery) || (q.nickname || '').includes(searchQuery)
  }

  function downloadCSV() {
    const parents = getSortedParents()
    let rank = 0
    const rows = [['順位', '質問タイトル', '補足', 'ニックネーム', '票数', '状態', '関連元ID']]
    for (const q of parents) {
      if (!q.hidden) rank++
      rows.push([q.hidden ? '' : rank, q.title, q.note || '', q.nickname || '', getEffectiveVotes(q), q.hidden ? '非表示' : '公開', ''])
      questions.filter(c => c.parent_id === q.id).forEach(c => {
        rows.push(['', c.title, c.note || '', c.nickname || '', c.votes, c.hidden ? '非表示' : '公開', q.id])
      })
    }
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `questions.csv`
    a.click()
  }

  // ログイン画面
  if (!authed) return (
    <div style={{ maxWidth: 360, margin: '6rem auto', padding: '0 1rem' }}>
      <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 24 }}>管理画面</h1>
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleLogin()}
        placeholder="パスワード"
        style={{ width: '100%', boxSizing: 'border-box', fontSize: 15, padding: '10px 12px', border: '0.5px solid #ccc', borderRadius: 8, outline: 'none', marginBottom: 12, fontFamily: 'inherit' }}
      />
      <button
        onClick={handleLogin}
        style={{ width: '100%', padding: 12, fontSize: 15, fontWeight: 500, background: '#534AB7', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
      >
        ログイン
      </button>
    </div>
  )

  const parents = getSortedParents().filter(q => matchFilter(q) && matchSearch(q))
  const totalVotes = questions.filter(q => !q.parent_id).reduce((s, q) => s + getEffectiveVotes(q), 0)

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '1.5rem 1rem 4rem' }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>管理画面</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={currentSession || ''}
            onChange={e => setCurrentSession(e.target.value)}
            style={{ fontSize: 13, padding: '6px 10px', border: '0.5px solid #ccc', borderRadius: 8, background: '#fff' }}
          >
            {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button onClick={handleLogout} style={{ fontSize: 12, padding: '6px 12px', border: '0.5px solid #ccc', borderRadius: 8, background: 'transparent', cursor: 'pointer', color: '#888' }}>ログアウト</button>
        </div>
      </div>

      {/* サマリー */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 24 }}>
        {[
          { label: '質問数', value: questions.filter(q => !q.parent_id).length },
          { label: '総票数', value: totalVotes },
          { label: '非表示', value: questions.filter(q => q.hidden).length },
          { label: '類似紐付け', value: questions.filter(q => q.parent_id).length },
        ].map(s => (
          <div key={s.label} style={{ background: '#f5f5f5', borderRadius: 8, padding: '12px 14px' }}>
            <p style={{ fontSize: 12, color: '#888', margin: '0 0 4px' }}>{s.label}</p>
            <p style={{ fontSize: 24, fontWeight: 500, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ツールバー */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="質問を検索..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ fontSize: 13, padding: '6px 10px', border: '0.5px solid #ccc', borderRadius: 8, outline: 'none', width: 180 }}
        />
        <select
          value={sortMode}
          onChange={e => setSortMode(e.target.value)}
          style={{ fontSize: 13, padding: '6px 10px', border: '0.5px solid #ccc', borderRadius: 8, background: '#fff' }}
        >
          <option value="votes">票数順</option>
          <option value="newest">新しい順</option>
          <option value="oldest">古い順</option>
        </select>
        <button onClick={downloadCSV} style={{ fontSize: 12, padding: '6px 12px', border: '0.5px solid #ccc', borderRadius: 8, background: 'transparent', cursor: 'pointer', color: '#888', marginLeft: 'auto' }}>
          ↓ CSVエクスポート
        </button>
      </div>

      {/* フィルター */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {[['all', 'すべて'], ['visible', '公開中'], ['hidden', '非表示'], ['parent', '親質問のみ']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilterMode(val)}
            style={{
              fontSize: 12, padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
              border: `0.5px solid ${filterMode === val ? '#534AB7' : '#ccc'}`,
              background: filterMode === val ? '#EEEDFE' : 'transparent',
              color: filterMode === val ? '#534AB7' : '#888',
            }}
          >{label}</button>
        ))}
      </div>

      {/* 質問一覧 */}
      {loading ? <p style={{ color: '#888' }}>読み込み中...</p> : (
        <div>
          {parents.map(q => {
            const children = questions.filter(c => c.parent_id === q.id)
            const ev = getEffectiveVotes(q)
            return (
              <div key={q.id}>
                <div style={{
                  display: 'flex', gap: 12, alignItems: 'center', padding: '10px 12px',
                  borderBottom: '0.5px solid #eee',
                  opacity: q.hidden ? 0.5 : 1,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: '0 0 4px', fontSize: 14, lineHeight: 1.5 }}>
                      {q.title}
                      {q.hidden && <span style={{ fontSize: 11, background: '#eee', color: '#888', borderRadius: 4, padding: '1px 6px', marginLeft: 6 }}>非表示</span>}
                      {children.length > 0 && <span style={{ fontSize: 11, background: '#EEEDFE', color: '#534AB7', borderRadius: 4, padding: '1px 6px', marginLeft: 6 }}>関連 {children.length}件</span>}
                    </p>
                    {q.nickname && <p style={{ margin: 0, fontSize: 12, color: '#aaa' }}>{q.nickname}さん</p>}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 500, minWidth: 40, textAlign: 'right' }}>{ev}</div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => toggleHidden(q.id, q.hidden)} style={{ fontSize: 12, padding: '4px 8px', border: '0.5px solid #ccc', borderRadius: 6, background: 'transparent', cursor: 'pointer', color: '#666' }}>
                      {q.hidden ? '表示する' : '非表示'}
                    </button>
                    <button onClick={() => setGroupTargetId(q.id)} style={{ fontSize: 12, padding: '4px 8px', border: '0.5px solid #ccc', borderRadius: 6, background: 'transparent', cursor: 'pointer', color: '#666' }}>
                      関連質問を追加
                    </button>
                  </div>
                </div>
                {children.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 12px 6px 28px', background: '#fafafa', borderBottom: '0.5px solid #eee' }}>
                    <p style={{ flex: 1, margin: 0, fontSize: 13, color: '#888' }}>↳ {c.title}　<span style={{ color: '#bbb' }}>{c.votes}票</span></p>
                    <button onClick={() => unlink(c.id)} style={{ fontSize: 12, padding: '3px 8px', border: '0.5px solid #ffcccc', borderRadius: 6, background: 'transparent', cursor: 'pointer', color: '#cc4444' }}>解除</button>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* 関連質問モーダル */}
      {groupTargetId && (
        <GroupModal
          target={questions.find(q => q.id === groupTargetId)}
          candidates={questions.filter(q => q.id !== groupTargetId && !q.parent_id)}
          onApply={applyGroup}
          onClose={() => setGroupTargetId(null)}
        />
      )}
    </div>
  )
}

function GroupModal({ target, candidates, onApply, onClose }) {
  const [selected, setSelected] = useState([])

  function toggle(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', maxWidth: 500, width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
        <h2 style={{ fontSize: 15, fontWeight: 500, margin: '0 0 4px' }}>関連質問を追加</h2>
        <p style={{ fontSize: 13, color: '#888', margin: '0 0 16px' }}>親質問：「{target?.title}」</p>
        {candidates.length === 0
          ? <p style={{ color: '#aaa', fontSize: 13 }}>候補となる質問がありません</p>
          : candidates.map(q => (
            <div key={q.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid #eee' }}>
              <span style={{ fontSize: 13, flex: 1 }}>{q.title} <span style={{ color: '#bbb' }}>{q.votes}票</span></span>
              <button
                onClick={() => toggle(q.id)}
                style={{
                  fontSize: 12, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                  border: `0.5px solid ${selected.includes(q.id) ? '#534AB7' : '#ccc'}`,
                  background: selected.includes(q.id) ? '#EEEDFE' : 'transparent',
                  color: selected.includes(q.id) ? '#534AB7' : '#666',
                }}
              >{selected.includes(q.id) ? '選択済み' : '選択'}</button>
            </div>
          ))
        }
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onClose} style={{ fontSize: 13, padding: '6px 14px', border: '0.5px solid #ccc', borderRadius: 8, background: 'transparent', cursor: 'pointer', color: '#666' }}>キャンセル</button>
          <button onClick={() => onApply(selected)} style={{ fontSize: 13, padding: '6px 14px', border: 'none', borderRadius: 8, background: '#534AB7', color: '#fff', cursor: 'pointer' }}>紐付けを確定する</button>
        </div>
      </div>
    </div>
  )
}