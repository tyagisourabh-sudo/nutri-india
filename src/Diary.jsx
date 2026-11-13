import { useEffect, useState } from 'react'

const MEALS = ['Breakfast', 'Lunch', 'Snacks', 'Dinner']
const rd = n => Math.round(n)

function today() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function loadLogs() {
  try {
    return JSON.parse(localStorage.getItem('logs')) || []
  } catch {
    return []
  }
}

const box = 'w-full border border-gray-300 rounded-lg p-3 text-base bg-white'

function Bar({ label, value, target, unit }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span>{rd(value)} / {target} {unit}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full">
        <div className="h-2 bg-green-600 rounded-full" style={{ width: pct + '%' }} />
      </div>
    </div>
  )
}

function AddFood({ meal, foods, onAdd, onClose }) {
  const [q, setQ] = useState('')
  const [pick, setPick] = useState(null)
  const [qty, setQty] = useState('1')
  const [manual, setManual] = useState(false)
  const [m, setM] = useState({ name: '', k: '', p: '', c: '', f: '' })

  const term = q.trim().toLowerCase()
  const results = (term ? foods.filter(x => x.n.toLowerCase().includes(term)) : foods).slice(0, 20)

  const servings = Number(qty) || 0
  const grams = pick ? servings * pick.g : 0
  const x = grams / 100

  const addPicked = () =>
    onAdd({
      meal,
      name: pick.n,
      qty: servings,
      unit: pick.s,
      grams: rd(grams),
      cal: pick.k * x,
      p: pick.p * x,
      c: pick.c * x,
      f: pick.f * x,
      fb: (pick.fb || 0) * x,
    })

  const addManual = () =>
    onAdd({
      meal,
      name: m.name.trim() || 'My food',
      grams: 0,
      cal: Number(m.k) || 0,
      p: Number(m.p) || 0,
      c: Number(m.c) || 0,
      f: Number(m.f) || 0,
      fb: 0,
    })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-10">
      <div className="bg-white w-full max-w-md mx-auto rounded-t-2xl p-4 max-h-[85vh] overflow-y-auto space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-green-700">Add to {meal}</h2>
          <button onClick={onClose} className="text-2xl px-2">✕</button>
        </div>

        {pick ? (
          <div className="space-y-3">
            <div className="font-semibold">{pick.n}</div>
            <label className="block text-sm">
              Number of servings ({pick.s} = {pick.g} g)
              <input className={box} type="number" step="0.5" value={qty} onChange={e => setQty(e.target.value)} />
            </label>
            <div className="bg-green-50 rounded-lg p-3 text-sm">
              {rd(pick.k * x)} kcal · P {rd(pick.p * x)} g · C {rd(pick.c * x)} g · F {rd(pick.f * x)} g
            </div>
            <button
              disabled={servings <= 0}
              onClick={addPicked}
              className="w-full bg-green-600 text-white font-semibold rounded-lg p-3 disabled:opacity-40"
            >
              Add
            </button>
            <button onClick={() => setPick(null)} className="w-full border rounded-lg p-3">Back</button>
          </div>
        ) : manual ? (
          <div className="space-y-3">
            <input className={box} placeholder="Food name" value={m.name} onChange={e => setM({ ...m, name: e.target.value })} />
            <input className={box} type="number" placeholder="Calories (kcal)" value={m.k} onChange={e => setM({ ...m, k: e.target.value })} />
            <input className={box} type="number" placeholder="Protein (g)" value={m.p} onChange={e => setM({ ...m, p: e.target.value })} />
            <input className={box} type="number" placeholder="Carbs (g)" value={m.c} onChange={e => setM({ ...m, c: e.target.value })} />
            <input className={box} type="number" placeholder="Fat (g)" value={m.f} onChange={e => setM({ ...m, f: e.target.value })} />
            <button
              disabled={!(Number(m.k) > 0)}
              onClick={addManual}
              className="w-full bg-green-600 text-white font-semibold rounded-lg p-3 disabled:opacity-40"
            >
              Add
            </button>
            <button onClick={() => setManual(false)} className="w-full border rounded-lg p-3">Back</button>
          </div>
        ) : (
          <div className="space-y-2">
            <input className={box} placeholder="Search food, e.g. dal, roti, paneer" value={q} onChange={e => setQ(e.target.value)} />
            {results.map(f => (
              <button
                key={f.n}
                onClick={() => { setPick(f); setQty('1') }}
                className="w-full text-left border rounded-lg p-3 flex justify-between"
              >
                <span>{f.n}</span>
                <span className="text-gray-500 text-sm">{f.s}</span>
              </button>
            ))}
            {results.length === 0 && <p className="text-gray-500">No match found.</p>}
            <button onClick={() => setManual(true)} className="w-full border border-green-600 text-green-700 rounded-lg p-3">
              Can't find it? Add my own
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Diary({ targets }) {
  const [foods, setFoods] = useState([])
  const [logs, setLogs] = useState(loadLogs())
  const [adding, setAdding] = useState(null)
  const day = today()

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'foods.json')
      .then(res => res.json())
      .then(setFoods)
      .catch(() => setFoods([]))
  }, [])

  const save = next => {
    setLogs(next)
    localStorage.setItem('logs', JSON.stringify(next))
  }

  const todays = logs.filter(l => l.date === day)
  const sum = k => todays.reduce((s, l) => s + (l[k] || 0), 0)

  const add = entry => {
        const list = Array.isArray(entry) ? entry : [entry]
    save([...logs, ...list.map((e, i) => ({ ...e, id: Date.now() + i, date: day }))])
    setAdding(null)
  }
  const remove = id => save(logs.filter(l => l.id !== id))

  return (
    <div className="space-y-4">
      <Scan onAdd={add} />
      <div className="bg-white rounded-xl p-4 shadow space-y-3">
        <h2 className="font-bold text-green-700">Today</h2>
        <Bar label="Calories" value={sum('cal')} target={targets.calories} unit="kcal" />
        <Bar label="Protein" value={sum('p')} target={targets.protein} unit="g" />
        <Bar label="Carbs" value={sum('c')} target={targets.carbs} unit="g" />
        <Bar label="Fat" value={sum('f')} target={targets.fat} unit="g" />
      </div>

      {MEALS.map(meal => {
        const items = todays.filter(l => l.meal === meal)
        return (
          <div key={meal} className="bg-white rounded-xl p-4 shadow">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">
                {meal} <span className="text-gray-500 text-sm">({rd(items.reduce((s, l) => s + l.cal, 0))} kcal)</span>
              </h3>
              <button onClick={() => setAdding(meal)} className="bg-green-600 text-white rounded-lg px-3 py-1">+ Add</button>
            </div>
            {items.map(l => (
              <div key={l.id} className="flex justify-between items-center border-t mt-2 pt-2 text-sm">
                <span>
                  {l.name}{l.qty ? ` · ${l.qty} × ${l.unit}` : ''}{l.grams ? ` (${l.grams} g)` : ''}
                  <span className="text-gray-500"> · {rd(l.cal)} kcal</span>
                </span>
                <button onClick={() => remove(l.id)} className="text-red-600 px-2">✕</button>
              </div>
            ))}
          </div>
        )
      })}

      {adding && <AddFood meal={adding} foods={foods} onAdd={add} onClose={() => setAdding(null)} />}
    </div>
  )
}
