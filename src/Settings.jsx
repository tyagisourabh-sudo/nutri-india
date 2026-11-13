import { useState } from 'react'
import { DEFAULT_MODEL } from './gemini.js'

const DATA_KEYS = ['profile', 'logs', 'weights', 'water']
const box = 'w-full border border-gray-300 rounded-lg p-3 text-base bg-white'

export default function Settings({ onEditProfile }) {
  const [key, setKey] = useState(localStorage.getItem('gemini_key') || '')
  const [model, setModel] = useState(localStorage.getItem('gemini_model') || DEFAULT_MODEL)
  const [msg, setMsg] = useState('')

  const saveAI = () => {
    localStorage.setItem('gemini_key', key.trim())
    localStorage.setItem('gemini_model', model.trim() || DEFAULT_MODEL)
    setMsg('Saved.')
  }

  const exportData = () => {
    const data = {}
    DATA_KEYS.forEach(k => {
      const v = localStorage.getItem(k)
      if (v) data[k] = JSON.parse(v)
    })
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'nutri-india-backup.json'
    a.click()
  }

  const importData = e => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result)
        DATA_KEYS.forEach(k => {
          if (data[k] !== undefined) localStorage.setItem(k, JSON.stringify(data[k]))
        })
        window.location.reload()
      } catch {
        setMsg('That file could not be read.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-green-700">Settings</h1>

      <div className="bg-white rounded-xl p-4 shadow space-y-3">
        <h2 className="font-semibold">AI (Gemini)</h2>
        <label className="block text-sm">API key (saved only on this device)
          <input className={box} type="password" value={key} onChange={e => setKey(e.target.value)} />
        </label>
        <label className="block text-sm">Model name
          <input className={box} value={model} onChange={e => setModel(e.target.value)} />
        </label>
        <button onClick={saveAI} className="w-full bg-green-600 text-white font-semibold rounded-lg p-3">Save</button>
      </div>

      <div className="bg-white rounded-xl p-4 shadow space-y-3">
        <h2 className="font-semibold">Backup</h2>
        <p className="text-sm text-gray-600">
          Your data lives only in this browser. Download a backup now and then. The backup does not include your API key.
        </p>
        <button onClick={exportData} className="w-full border border-green-600 text-green-700 rounded-lg p-3">
          ⬇️ Download backup
        </button>
        <label className="block w-full text-center border rounded-lg p-3 cursor-pointer">
          ⬆️ Restore from backup (replaces current data)
          <input type="file" accept="application/json" className="hidden" onChange={importData} />
        </label>
      </div>

      <div className="bg-white rounded-xl p-4 shadow">
        <button onClick={onEditProfile} className="w-full border rounded-lg p-3">
          Edit my details and targets
        </button>
      </div>

      {msg && <p className="text-sm text-green-700">{msg}</p>}
    </div>
  )
}
