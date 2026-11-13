import { useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, LineChart, Line, CartesianGrid } from 'recharts'

const rd = n => Math.round(n)

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

// Approximate adult reference values. Please verify against the ICMR-NIN 2020 table and edit here.
const RDA = {
  male: { iron: 19, ca: 1000, vc: 80, b12: 2.2 },
  female: { iron: 29, ca: 1000, vc: 65, b12: 2.2 },
}

function MicroBar({ label, value, target, unit }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span>{Math.round(value * 10) / 10} / {target} {unit}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full">
        <div className="h-2 bg-orange-500 rounded-full" style={{ width: pct + '%' }} />
      </div>
    </div>
  )
}

export default function Progress({ profile }) {
  const [weights, setWeights] = useState(load('weights', []))
  const [kg, setKg] = useState('')
  const logs = load('logs', [])
  const t = profile.targets
  const rda = RDA[profile.sex] || RDA.male
  const todayStr = fmt(new Date())

  const days = [...Array(7)].map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return fmt(d)
  })
  const calData = days.map(d => ({
    day: d.slice(5),
    kcal: rd(logs.filter(l => l.date === d).reduce((s, l) => s + (l.cal || 0), 0)),
  }))

  const todays = logs.filter(l => l.date === todayStr)
  const sum = k => todays.reduce((s, l) => s + (l[k] || 0), 0)
  const fibreTarget = Math.round(t.calories / 50)

  const addWeight = () => {
    const v = Number(kg)
    if (!(v > 0)) return
    const next = [...weights.filter(w => w.date !== todayStr), { date: todayStr, kg: v }].sort((a, b) =>
      a.date.localeCompare(b.date)
    )
    setWeights(next)
    localStorage.setItem('weights', JSON.stringify(next))
    setKg('')
  }

  const wData = weights.slice(-30).map(w => ({ day: w.date.slice(5), kg: w.kg }))

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-green-700">Progress</h1>

      <div className="bg-white rounded-xl p-4 shadow">
        <h2 className="font-semibold mb-2">Calories, last 7 days</h2>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={calData}>
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <ReferenceLine y={t.calories} stroke="#16a34a" strokeDasharray="4 4" />
              <Bar dataKey="kcal" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-gray-500">Dashed line = your daily target ({t.calories} kcal)</p>
      </div>

      <div className="bg-white rounded-xl p-4 shadow space-y-3">
        <h2 className="font-semibold">Vitamins and minerals today</h2>
        <MicroBar label="Fibre" value={sum('fb')} target={fibreTarget} unit="g" />
        <MicroBar label="Iron" value={sum('iron')} target={rda.iron} unit="mg" />
        <MicroBar label="Calcium" value={sum('ca')} target={rda.ca} unit="mg" />
        <MicroBar label="Vitamin C" value={sum('vc')} target={rda.vc} unit="mg" />
        <MicroBar label="Vitamin B12" value={sum('b12')} target={rda.b12} unit="mcg" />
        <p className="text-xs text-gray-500">
          Vitamins and minerals are counted only for foods added with AI (photo, type or voice). Foods picked from the
          built-in list have only fibre. Targets are approximate adult values, not medical advice.
        </p>
      </div>

      <div className="bg-white rounded-xl p-4 shadow space-y-3">
        <h2 className="font-semibold">Weight</h2>
        <div className="flex gap-2">
          <input
            className="flex-1 border border-gray-300 rounded-lg p-3"
            type="number"
            step="0.1"
            placeholder="Today's weight (kg)"
            value={kg}
            onChange={e => setKg(e.target.value)}
          />
          <button onClick={addWeight} className="bg-green-600 text-white rounded-lg px-4">Save</button>
        </div>
        {wData.length > 1 ? (
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={wData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis domain={['auto', 'auto']} />
                <Tooltip />
                <Line type="monotone" dataKey="kg" stroke="#16a34a" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Save your weight on two different days to see the chart.</p>
        )}
      </div>
    </div>
  )
}
