import { useState } from 'react'
import Diary from './Diary.jsx'
import Progress from './Progress.jsx'
import Coach from './Coach.jsx'
import Settings from './Settings.jsx'

const ACTIVITY = [
  { label: 'Sitting most of the day', f: 1.2 },
  { label: 'Light activity (1-3 days/week)', f: 1.375 },
  { label: 'Moderate (3-5 days/week)', f: 1.55 },
  { label: 'Very active (6-7 days/week)', f: 1.725 },
]
const GOALS = [
  { label: 'Lose weight', adj: -400, protein: 1.6 },
  { label: 'Maintain weight', adj: 0, protein: 1.2 },
  { label: 'Gain weight', adj: 300, protein: 1.6 },
]
const TABS = [
  { id: 'diary', label: 'Diary', icon: '🍽️' },
  { id: 'progress', label: 'Progress', icon: '📈' },
  { id: 'coach', label: 'Coach', icon: '💬' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

function calculate(p) {
  const base = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'male' ? 5 : -161)
  const goal = GOALS[p.goal]
  const floor = p.sex === 'male' ? 1500 : 1200
  const calories = Math.max(floor, Math.round(base * ACTIVITY[p.activity].f + goal.adj))
  const protein = Math.round(p.weight * goal.protein)
  const fat = Math.round((calories * 0.25) / 9)
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4)
  return { calories, protein, fat, carbs }
}

function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem('profile'))
  } catch {
    return null
  }
}

const input = 'w-full border border-gray-300 rounded-lg p-3 text-base bg-white'

function Onboarding({ onSave }) {
  const [f, setF] = useState({ age: '', sex: 'male', height: '', weight: '', activity: 1, goal: 0 })
  const set = (k, v) => setF({ ...f, [k]: v })
  const ok = f.age > 0 && f.height > 0 && f.weight > 0

  const submit = () => {
    const p = {
      age: Number(f.age),
      sex: f.sex,
      height: Number(f.height),
      weight: Number(f.weight),
      activity: Number(f.activity),
      goal: Number(f.goal),
    }
    p.targets = calculate(p)
    localStorage.setItem('profile', JSON.stringify(p))
    onSave(p)
  }

  return (
    <div className="max-w-md mx-auto p-5 space-y-4">
      <h1 className="text-2xl font-bold text-green-700">Welcome to NutriIndia 🍛</h1>
      <p className="text-gray-600">Tell us about yourself to set your daily targets.</p>

      <label className="block">Age (years)
        <input className={input} type="number" value={f.age} onChange={e => set('age', e.target.value)} />
      </label>
      <label className="block">Sex
        <select className={input} value={f.sex} onChange={e => set('sex', e.target.value)}>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </label>
      <label className="block">Height (cm)
        <input className={input} type="number" value={f.height} onChange={e => set('height', e.target.value)} />
      </label>
      <label className="block">Weight (kg)
        <input className={input} type="number" value={f.weight} onChange={e => set('weight', e.target.value)} />
      </label>
      <label className="block">Activity level
        <select className={input} value={f.activity} onChange={e => set('activity', e.target.value)}>
          {ACTIVITY.map((a, i) => <option key={i} value={i}>{a.label}</option>)}
        </select>
      </label>
      <label className="block">Goal
        <select className={input} value={f.goal} onChange={e => set('goal', e.target.value)}>
          {GOALS.map((g, i) => <option key={i} value={i}>{g.label}</option>)}
        </select>
      </label>

      <button
        disabled={!ok}
        onClick={submit}
        className="w-full bg-green-600 text-white font-semibold rounded-lg p-3 disabled:opacity-40"
      >
        Calculate my targets
      </button>
      <p className="text-xs text-gray-500">
        Targets are estimates from a standard formula, not medical advice. If you have a health condition, check them with a doctor or dietitian.
      </p>
    </div>
  )
}

export default function App() {
  const [profile, setProfile] = useState(loadProfile())
  const [tab, setTab] = useState('diary')

  const editProfile = () => {
    localStorage.removeItem('profile')
    setProfile(null)
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-green-50">
        <Onboarding onSave={setProfile} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-green-50 pb-24">
      <div className="max-w-md mx-auto p-4">
        {tab === 'diary' && <Diary targets={profile.targets} />}
        {tab === 'progress' && <Progress profile={profile} />}
        {tab === 'coach' && <Coach profile={profile} />}
        {tab === 'settings' && <Settings onEditProfile={editProfile} />}
      </div>
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t flex">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={'flex-1 py-3 text-xs ' + (tab === t.id ? 'text-green-700 font-bold' : 'text-gray-500')}
          >
            <div className="text-xl">{t.icon}</div>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
