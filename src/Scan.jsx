import { useState } from 'react'
import { analyzeFood, analyzeText, fileToBase64, DEFAULT_MODEL } from './gemini.js'

const MEALS = ['Breakfast', 'Lunch', 'Snacks', 'Dinner']
const KEYS = ['cal', 'p', 'c', 'f', 'fb', 'iron', 'ca', 'vc', 'b12']
const rd = n => Math.round(n)
const box = 'w-full border border-gray-300 rounded-lg p-3 text-base bg-white'

function defaultMeal() {
  const h = new Date().getHours()
  if (h < 11) return 'Breakfast'
  if (h < 16) return 'Lunch'
  if (h < 19) return 'Snacks'
  return 'Dinner'
}

function calc(it) {
  const x = it.base.grams > 0 ? (Number(it.grams) || 0) / it.base.grams : 0
  const out = {}
  KEYS.forEach(k => {
    out[k] = (it.base[k] || 0) * x
  })
  return out
}

function tip(msg) {
  if (/no longer available|not found|404/i.test(msg))
    return 'This model name may be retired. Open Settings and try gemini-3-flash-preview.'
  if (/quota|429|rate|exhausted/i.test(msg))
    return 'Free limit reached. Wait a few minutes (or until tomorrow) and try again.'
  if (/api key|permission|403|401/i.test(msg)) return 'Check your API key in Settings.'
  return ''
}

export default function Scan({ onAdd }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('photo')
  const [key, setKey] = useState(localStorage.getItem('gemini_key') || '')
  const [model, setModel] = useState(localStorage.getItem('gemini_model') || DEFAULT_MODEL)
  const [settings, setSettings] = useState(false)
  const [meal, setMeal] = useState(defaultMeal())
  const [hint, setHint] = useState('')
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [items, setItems] = useState(null)

  const openModal = () => {
    setKey(localStorage.getItem('gemini_key') || '')
    setModel(localStorage.getItem('gemini_model') || DEFAULT_MODEL)
    setOpen(true)
  }

  const reset = () => {
    setPhoto(null)
    setItems(null)
    setHint('')
    setText('')
    setError('')
  }

  const saveSettings = () => {
    localStorage.setItem('gemini_key', key.trim())
    localStorage.setItem('gemini_model', model.trim() || DEFAULT_MODEL)
    setSettings(false)
  }

  const onFile = async e => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setError('')
    setItems(null)
    try {
      const b64 = await fileToBase64(file)
      setPhoto({ b64, url: 'data:image/jpeg;base64,' + b64 })
    } catch (err) {
      setError(err.message)
    }
  }

  const listen = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setError('Voice input is not supported in this browser. Please use Chrome.')
      return
    }
    const r = new SR()
    r.lang = 'en-IN'
    r.onresult = e => setText(t => (t ? t + ' ' : '') + e.results[0][0].transcript)
    r.onerror = () => setError('Could not hear you. Please try again.')
    r.start()
  }

  const ready = mode === 'photo' ? !!photo : text.trim().length > 0

  const analyze = async () => {
    if (!key.trim()) {
      setSettings(true)
      return
    }
    setBusy(true)
    setError('')
    const m = model.trim() || DEFAULT_MODEL
    try {
      const list =
        mode === 'photo'
          ? await analyzeFood(photo.b64, hint, key.trim(), m)
          : await analyzeText(text, key.trim(), m)
      setItems(
        list.map(it => ({
          name: it.name,
          grams: it.grams,
          base: { ...it, grams: it.grams || 1 },
        }))
      )
    } catch (err) {
      setError(err.message + ' ' + tip(err.message))
    }
    setBusy(false)
  }

  const edit = (i, patch) => setItems(items.map((it, j) => (j === i ? { ...it, ...patch } : it)))
  const drop = i => setItems(items.filter((_, j) => j !== i))
  const total = items ? items.reduce((s, it) => s + calc(it).cal, 0) : 0

  const addAll = () => {
    const entries = items
      .filter(it => Number(it.grams) > 0)
      .map(it => ({ meal, name: it.name, grams: rd(Number(it.grams)), ...calc(it) }))
    if (entries.length) onAdd(entries)
    reset()
    setOpen(false)
  }

  return (
    <>
      <button
        onClick={openModal}
        className="w-full bg-green-600 text-white font-semibold rounded-xl p-4 text-lg shadow"
      >
        ✨ Add food with AI (photo / type / voice)
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-20">
          <div className="bg-white w-full max-w-md mx-auto rounded-t-2xl p-4 max-h-[90vh] overflow-y-auto space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-green-700">Add food with AI</h2>
              <div>
                <button onClick={() => setSettings(!settings)} className="text-xl px-2">⚙️</button>
                <button onClick={() => { reset(); setOpen(false) }} className="text-2xl px-2">✕</button>
              </div>
            </div>

            {settings ? (
              <div className="space-y-3">
                <label className="block text-sm">Gemini API key (saved only on this device)
                  <input className={box} type="password" value={key} onChange={e => setKey(e.target.value)} />
                </label>
                <label className="block text-sm">Model name
                  <input className={box} value={model} onChange={e => setModel(e.target.value)} />
                </label>
                <button onClick={saveSettings} className="w-full bg-green-600 text-white font-semibold rounded-lg p-3">
                  Save
                </button>
              </div>
            ) : (
              <>
                <label className="block text-sm">Add to
                  <select className={box} value={meal} onChange={e => setMeal(e.target.value)}>
                    {MEALS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </label>

                {!items && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMode('photo')}
                      className={'flex-1 rounded-lg p-2 border ' + (mode === 'photo' ? 'bg-green-600 text-white' : 'text-green-700 border-green-600')}
                    >
                      📷 Photo
                    </button>
                    <button
                      onClick={() => setMode('text')}
                      className={'flex-1 rounded-lg p-2 border ' + (mode === 'text' ? 'bg-green-600 text-white' : 'text-green-700 border-green-600')}
                    >
                      ⌨️ Type / 🎤 Speak
                    </button>
                  </div>
                )}

                {!items && mode === 'photo' && (
                  <>
                    <div className="flex gap-2">
                      <label className="flex-1 text-center bg-green-600 text-white rounded-lg p-3 cursor-pointer">
                        📷 Take photo
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
                      </label>
                      <label className="flex-1 text-center border border-green-600 text-green-700 rounded-lg p-3 cursor-pointer">
                        🖼️ Gallery
                        <input type="file" accept="image/*" className="hidden" onChange={onFile} />
                      </label>
                    </div>
                    {photo && <img src={photo.url} alt="Your meal" className="w-full rounded-lg max-h-64 object-cover" />}
                    {photo && (
                      <input
                        className={box}
                        placeholder="Optional note, e.g. 'homemade, little oil, 2 rotis'"
                        value={hint}
                        onChange={e => setHint(e.target.value)}
                      />
                    )}
                  </>
                )}

                {!items && mode === 'text' && (
                  <div className="space-y-2">
                    <textarea
                      className={box}
                      rows={3}
                      placeholder="e.g. 2 roti, 1 katori dal, sabzi, 1 glass chaas"
                      value={text}
                      onChange={e => setText(e.target.value)}
                    />
                    <button onClick={listen} className="w-full border border-green-600 text-green-700 rounded-lg p-3">
                      🎤 Speak
                    </button>
                  </div>
                )}

                {!items && (
                  <button
                    disabled={busy || !ready}
                    onClick={analyze}
                    className="w-full bg-green-600 text-white font-semibold rounded-lg p-3 disabled:opacity-40"
                  >
                    {busy ? 'Analysing…' : 'Analyse'}
                  </button>
                )}

                {error && <p className="text-red-600 text-sm">{error}</p>}

                {items && (
                  <div className="space-y-2">
                    {items.length === 0 && <p className="text-gray-500">No food found. Try again.</p>}
                    {items.map((it, i) => (
                      <div key={i} className="border rounded-lg p-3 space-y-2">
                        <div className="flex gap-2">
                          <input className={box} value={it.name} onChange={e => edit(i, { name: e.target.value })} />
                          <button onClick={() => drop(i)} className="text-red-600 px-2">✕</button>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <input
                            className="w-24 border border-gray-300 rounded-lg p-2"
                            type="number"
                            value={it.grams}
                            onChange={e => edit(i, { grams: e.target.value })}
                          />
                          <span>g</span>
                          <span className="text-gray-600 ml-auto">
                            {rd(calc(it).cal)} kcal · P {rd(calc(it).p)} · C {rd(calc(it).c)} · F {rd(calc(it).f)}
                          </span>
                        </div>
                      </div>
                    ))}
                    {items.length > 0 && (
                      <>
                        <div className="font-semibold">Total: {rd(total)} kcal</div>
                        <p className="text-xs text-gray-500">
                          AI estimates can be off, especially for hidden oil and ghee. Fix the names and grams before adding.
                        </p>
                        <button onClick={addAll} className="w-full bg-green-600 text-white font-semibold rounded-lg p-3">
                          Add to {meal}
                        </button>
                      </>
                    )}
                    <button onClick={reset} className="w-full border rounded-lg p-3">Start again</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
