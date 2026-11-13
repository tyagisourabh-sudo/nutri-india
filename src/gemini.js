export const DEFAULT_MODEL = 'gemini-flash-latest'

const NUM = { type: 'NUMBER' }
const SCHEMA = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          portion: { type: 'STRING' },
          grams: NUM,
          calories: NUM,
          protein_g: NUM,
          carbs_g: NUM,
          fat_g: NUM,
          fiber_g: NUM,
        },
        required: ['name', 'grams', 'calories', 'protein_g', 'carbs_g', 'fat_g'],
      },
    },
  },
  required: ['items'],
}

const PROMPT = `You are an expert Indian dietitian. Identify EVERY food item in this photo
(thali, katoris, rotis, sabzi, dal, rice, curd, chai, sweets, snacks and so on).
For each item estimate the portion in grams using visual cues such as plate size,
katori size and roti diameter. Assume typical home-style Indian cooking with moderate
oil or ghee, and use ICMR-NIN IFCT values as your reference.
Give the nutrition for the WHOLE portion you see (not per 100 g).
If the photo has no food, return an empty items list.`

export function fileToBase64(file, max = 1024) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale)
      c.height = Math.round(img.height * scale)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.8).split(',')[1])
    }
    img.onerror = () => reject(new Error('Could not read this photo'))
    img.src = url
  })
}

export async function analyzeFood(base64, hint, apiKey, model) {
  const text = PROMPT + (hint ? `\nNote from the user: ${hint}` : '')
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text }, { inline_data: { mime_type: 'image/jpeg', data: base64 } }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA },
      }),
    }
  )
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || `Error ${res.status}`)

  const parts = data?.candidates?.[0]?.content?.parts
  if (!parts) throw new Error('No answer from the AI. Try a clearer photo.')
  const raw = parts.map(p => p.text || '').join('').replace(/```json|```/g, '').trim()

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('The AI answer was not readable. Please try again.')
  }

  return (parsed.items || []).map(i => ({
    name: i.name,
    portion: i.portion || '',
    grams: Number(i.grams) || 0,
    cal: Number(i.calories) || 0,
    p: Number(i.protein_g) || 0,
    c: Number(i.carbs_g) || 0,
    f: Number(i.fat_g) || 0,
    fb: Number(i.fiber_g) || 0,
  }))
}
