import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

const TITLE_MAX = 34
const NICK_MAX = 14

export default function Post() {
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [nickname, setNickname] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  const titleOver = title.length > TITLE_MAX
  const nickOver = nickname.length > NICK_MAX
  const canSubmit = title.length > 0 && !titleOver && !nickOver

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)

    const { data: sessions } = await supabase
      .from('sessions')
      .select('id')
      .eq('is_active', true)
      .limit(1)

    if (!sessions || sessions.length === 0) {
      alert('現在受付中のセッションがありません')
      setSubmitting(false)
      return
    }

    const { error } = await supabase.from('questions').insert({
      session_id: sessions[0].id,
      title: title.trim(),
      note: note.trim() || null,
      nickname: nickname.trim() || null,
    })

    if (error) {
      alert('投稿に失敗しました。もう一度お試しください。')
      console.error(error)
    } else {
      navigate('/')
    }
    setSubmitting(false)
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '1.5rem 1rem 4rem' }}>
      <button
        onClick={() => navigate('/')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#888', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6 }}
      >
        ← ランキングに戻る
      </button>

      <h1 style={{ fontSize: 18, fontWeight: 500, margin: '0 0 4px' }}>質問を投稿する</h1>
      <p style={{ fontSize: 13, color: '#888', margin: '0 0 28px' }}>みんなで聞きたいことを集めています。気軽に投稿してください。</p>

      {/* タイトル */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#666', marginBottom: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
          質問タイトル
          <span style={{ fontSize: 11, background: '#FCEBEB', color: '#A32D2D', borderRadius: 6, padding: '2px 7px' }}>必須</span>
        </div>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="例：この活動をはじめたきっかけは？"
          style={{
            width: '100%', boxSizing: 'border-box', fontSize: 15, padding: '10px 12px',
            border: `0.5px solid ${titleOver ? '#A32D2D' : '#ccc'}`, borderRadius: 8,
            outline: 'none', fontFamily: 'inherit',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <div style={{ flex: 1, height: 3, background: '#eee', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              width: `${Math.min(title.length / TITLE_MAX * 100, 100)}%`,
              background: titleOver ? '#A32D2D' : '#534AB7',
              transition: 'width 0.15s',
            }} />
          </div>
          <span style={{ fontSize: 12, color: titleOver ? '#A32D2D' : '#888', minWidth: 52, textAlign: 'right' }}>
            {titleOver ? `+${title.length - TITLE_MAX}` : TITLE_MAX - title.length}
          </span>
        </div>
        {titleOver && <p style={{ fontSize: 12, color: '#A32D2D', margin: '4px 0 0' }}>文字数オーバーです</p>}
      </div>

      {/* 補足 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#666', marginBottom: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
          補足・詳細
          <span style={{ fontSize: 11, background: '#f0f0f0', color: '#888', borderRadius: 6, padding: '2px 7px' }}>任意</span>
        </div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="質問の背景や意図など、補足があれば書いてください"
          rows={3}
          style={{
            width: '100%', boxSizing: 'border-box', fontSize: 15, padding: '10px 12px',
            border: '0.5px solid #ccc', borderRadius: 8, outline: 'none',
            fontFamily: 'inherit', resize: 'none',
          }}
        />
      </div>

      {/* ニックネーム */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#666', marginBottom: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
          ニックネーム
          <span style={{ fontSize: 11, background: '#f0f0f0', color: '#888', borderRadius: 6, padding: '2px 7px' }}>任意</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="text"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder="例：応援太郎"
            style={{
              flex: 1, fontSize: 15, padding: '10px 12px',
              border: `0.5px solid ${nickOver ? '#A32D2D' : '#ccc'}`, borderRadius: 8,
              outline: 'none', fontFamily: 'inherit',
            }}
          />
          <span style={{ fontSize: 15, color: '#888' }}>さん</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <div style={{ flex: 1, height: 3, background: '#eee', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              width: `${Math.min(nickname.length / NICK_MAX * 100, 100)}%`,
              background: nickOver ? '#A32D2D' : '#534AB7',
              transition: 'width 0.15s',
            }} />
          </div>
          <span style={{ fontSize: 12, color: nickOver ? '#A32D2D' : '#888', minWidth: 52, textAlign: 'right' }}>
            {nickOver ? `+${nickname.length - NICK_MAX}` : NICK_MAX - nickname.length}
          </span>
        </div>
        {nickOver && <p style={{ fontSize: 12, color: '#A32D2D', margin: '4px 0 0' }}>文字数オーバーです</p>}
        <p style={{ fontSize: 12, color: '#aaa', margin: '6px 0 0' }}>👁 ランキングには表示されません</p>
      </div>

      {/* 注意事項 */}
      <ul style={{ margin: '0 0 20px', padding: 0, listStyle: 'none' }}>
        {[
          '性的・暴力的など子どもに見せられない内容は書かないこと',
          '他人を貶めたり、誹謗中傷にあたる内容は書かないこと',
          '自分や他人の個人情報（氏名・連絡先等）は書かないこと',
          'ニックネームは公開されませんが、イベント内で質問を読む際に読み上げる可能性があります',
        ].map((text, i) => (
          <li key={i} style={{ fontSize: 12, color: '#aaa', padding: '3px 0', display: 'flex', gap: 6, lineHeight: 1.6 }}>
            <span>·</span>{text}
          </li>
        ))}
      </ul>

      {/* 投稿ボタン */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        style={{
          width: '100%', padding: 16, fontSize: 17, fontWeight: 500,
          background: canSubmit ? '#534AB7' : '#e0e0e0',
          color: canSubmit ? '#fff' : '#aaa',
          border: 'none', borderRadius: 12, cursor: canSubmit ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        {submitting ? '投稿中...' : '✉ 投稿する'}
      </button>
    </div>
  )
}