import crypto from 'node:crypto'

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET
const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  }
}

async function verifyFirebaseToken(idToken) {
  if (!idToken || !FIREBASE_WEB_API_KEY) return null

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_WEB_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ idToken })
    }
  )

  if (!response.ok) {
    throw new Error('Token verification failed')
  }

  const data = await response.json()
  return data?.users?.[0]?.localId || null
}

function buildSignature(publicId, timestamp) {
  const toSign = `public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`
  return crypto.createHash('sha1').update(toSign).digest('hex')
}

async function destroyAsset(publicId) {
  const timestamp = Math.floor(Date.now() / 1000)
  const signature = buildSignature(publicId, timestamp)
  const formData = new URLSearchParams()
  formData.set('public_id', publicId)
  formData.set('timestamp', String(timestamp))
  formData.set('api_key', CLOUDINARY_API_KEY)
  formData.set('signature', signature)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(CLOUDINARY_CLOUD_NAME)}/image/destroy`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    }
  )

  if (!response.ok) {
    throw new Error(`Cloudinary delete failed for ${publicId}`)
  }

  return response.json()
}

export default async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET || !FIREBASE_WEB_API_KEY) {
    return json(500, { error: 'Missing server configuration' })
  }

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization || ''
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    const uid = await verifyFirebaseToken(idToken)
    if (!uid) {
      return json(401, { error: 'Unauthorized' })
    }

    const body = JSON.parse(event.body || '{}')
    const publicIds = Array.from(new Set((body.publicIds || []).filter(Boolean)))
    if (!publicIds.length) {
      return json(200, { deleted: [] })
    }

    const invalid = publicIds.find((publicId) => !String(publicId).startsWith(`mycojournal/${uid}/`))
    if (invalid) {
      return json(403, { error: 'Forbidden public id' })
    }

    const deleted = []
    for (const publicId of publicIds) {
      const result = await destroyAsset(publicId)
      deleted.push({ publicId, result: result.result || 'unknown' })
    }

    return json(200, { deleted })
  } catch (error) {
    console.error(error)
    return json(500, { error: error.message || 'Delete failed' })
  }
}
