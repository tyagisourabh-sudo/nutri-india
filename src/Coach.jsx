import { useState } from 'react'
import { askAI, DEFAULT_MODEL } from './gemini.js'

const QUICK = [
  'Plan my meals for the rest of today',
  'What should I eat for dinner?',
  'Make a 3-day Indian meal plan with a grocery list',
]
const GOALS = ['lose weight', 'maintain weight', 'gain weight']

function fmt(d) {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function load(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key))
    return v === null || v === undefined ? fallback : v
  } catch {
    return fallback
  }
}

function buildSystem(profile) {
  const logs = load('logs', [])
  const todays = logs.filter(l => l.date === fmt(new Date()))
  const sum = k => Math.round(todays.reduce((s, l) => s + (l[k] || 0), 0))
  const t = profile.targets
  return `You are a friendly Indian nutrition coach inside a calorie-tracking app. Give short, practical answers using Indian home-style foods and katori or roti measures. Write in plain text only: no markdown symbols such as asterisks or hashes; use simple dashes for lists. You are not a doctor: for medical conditions, pregnancy or eating-disorder concerns, tell the user to speak to a doctor or dietitian. If you need to know whether the user is vegetarian, ask.
User: ${profile.age} years, ${profile.sex}, ${profile.height} cm, ${profile.weight} kg, goal: ${GOALS[profile.goal] || 'maintain weight'}.
Daily targets: ${t.calories} kcal, protein ${t.protein} g, carbs ${t.carbs} g, fat ${t.fat} g.
Eaten today so far: ${sum('cal')} kcal, protein ${sum('p')} g, carbs ${sum('c')} g, fat ${sum('f')} g. Foods today: ${todays.map(l => l.name).join(', ') || 'nothing yet'}.`
}

export default function Coach({ profile }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const send = async text => {
    const q = (text ?? input).trim()
    if (!q || busy) return
    const key = (localStorage.getItem('gemini_key') || '').trim()
    if (!key) {
      setError('Add your Gemini API key in the Settings tab first.')
      return
    }
    const model = (localStorage.getItem('gemini_model') || '').trim() || DEFAULT_MODEL
    const next = [...messages, { role: 'user', text: q }]
    setMessages(next)
    setInput('')
    setError('')
    setBusy(true)
    try {
      const reply = await askAI(next.slice(-10), buildSystem(profile), key, model)
      setMessages([...next, { role: 'model', text: reply }])
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold text-green-700">Coach 💬</h1>

      {messages.length === 0 && (
        <div className="space-y-2">
          <p className="text-gray-600 text-sm">Ask anything about your food, or tap a quick question:</p>
          {QUICK.map(q => (
            <button key={q} onClick={() => send(q)} className="w-full text-left bg-white border rounded-lg p-3">
              {q}
            </button>
          ))}
        </div>
      )}

      {messages.map((m, i) => (
        <div
          key={i}
          className={
            'rounded-xl p-3 whitespace-pre-wrap ' +
            (m.role === 'user' ? 'bg-green-600 text-white ml-10' : 'bg-white shadow mr-10')
          }
        >
          {m.text}
        </div>
      ))}

      {busy && <p className="text-gray-500 text-sm">Thinking…</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex gap-2">
        <input
          className="flex-1 border border-gray-300 rounded-lg p-3 bg-white"
          placeholder="Ask your coach…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
        />
        <button onClick={() => send()} disabled={busy} className="bg-green-600 text-white rounded-lg px-4 disabled:opacity-40">
          Send
        </button>
      </div>
      <p className="text-xs text-gray-500">AI suggestions are general guidance, not medical advice.</p>
    </div>
  )
}
