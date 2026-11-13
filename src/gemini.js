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
          iron_mg: NUM,
          calcium_mg: NUM,
          vitamin_c_mg: NUM,
          vitamin_b12_mcg: NUM,
        },
        required: ['name', 'grams', 'calories', 'protein_g', 'carbs_g', 'fat_g'],
      },
    },
  },
  required: ['items'],
}

const RULES = `Assume typical home-style Indian cooking with moderate oil or ghee and use ICMR-NIN IFCT values as your reference. Give nutrition for the WHOLE portion (not per 100 g), including fibre, iron, calcium, vitamin C and vitamin B12.`

const PHOTO_PROMPT = `You are an expert Indian dietitian. Identify EVERY food item in this photo (thali, katoris, rotis, sabzi, dal, rice, curd, chai, sweets, snacks and so on). Estimate each portion in grams using visual cues such as plate size, katori size and roti diameter. ${RULES} If the photo has no food, return an empty items list.`

const TEXT_PROMPT = `You are an expert Indian dietitian. The user describes what they ate (English, Hindi or Hinglish). Split it into separate food items and estimate grams for each, using the quantities given (for example 2 roti, 1 katori dal) or a typical serving. ${RULES} Description: `

const RETRY = /high demand|overloaded|unavailable|503/i

async function call(body, apiKey, model) {
  let lastErr
  for (let n = 1; n <= 3; n++) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify(body),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.message || `Error ${res.status}`)
      const parts = data?.candidates?.[0]?.content?.parts
      if (!parts) throw new Error('No answer from the AI. Please try again.')
      return parts.map(p => p.text || '').join('')
    } catch (err) {
      lastErr = err
      if (n === 3 || !RETRY.test(err.message)) break
      await new Promise(r => setTimeout(r, 3000 * n))
    }
  }
  throw lastErr
}

function parseItems(raw) {
  const clean = raw.replace(/```json|```/g, '').trim()
  let parsed
  try {
    parsed = JSON.parse(clean)
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
    iron: Number(i.iron_mg) || 0,
    ca: Number(i.calcium_mg) || 0,
    vc: Number(i.vitamin_c_mg) || 0,
    b12: Number(i.vitamin_b12_mcg) || 0,
  }))
}

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
  const text = PHOTO_PROMPT + (hint ? `\nNote from the user: ${hint}` : '')
  const raw = await call(
    {
      contents: [{ parts: [{ text }, { inline_data: { mime_type: 'image/jpeg', data: base64 } }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA },
    },
    apiKey,
    model
  )
  return parseItems(raw)
}

export async function analyzeText(description, apiKey, model) {
  const raw = await call(
    {
      contents: [{ parts: [{ text: TEXT_PROMPT + description }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA },
    },
    apiKey,
    model
  )
  return parseItems(raw)
}

export async function askAI(messages, system, apiKey, model) {
  return call(
    {
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      })),
    },
    apiKey,
    model
  )
}
