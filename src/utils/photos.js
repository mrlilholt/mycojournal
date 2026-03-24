import { uid } from './id.js'

const DEFAULT_MAX_DIMENSION = 1600
const DEFAULT_QUALITY = 0.78
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = (error) => {
      URL.revokeObjectURL(url)
      reject(error)
    }
    image.src = url
  })
}

async function fileToCanvas(file, maxDimension = DEFAULT_MAX_DIMENSION) {
  const image = await loadImage(file)
  const longestSide = Math.max(image.width, image.height) || 1
  const scale = Math.min(1, maxDimension / longestSide)
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { alpha: false })
  context.drawImage(image, 0, 0, width, height)
  return { canvas, width, height }
}

function canvasToBlob(canvas, quality = DEFAULT_QUALITY) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to compress image'))
          return
        }
        resolve(blob)
      },
      'image/jpeg',
      quality
    )
  })
}

export async function preparePhoto(file, options = {}) {
  const { maxDimension = DEFAULT_MAX_DIMENSION, quality = DEFAULT_QUALITY } = options
  const { canvas, width, height } = await fileToCanvas(file, maxDimension)
  const blob = await canvasToBlob(canvas, quality)
  return {
    blob,
    width,
    height,
    originalName: file.name,
    size: blob.size,
    contentType: 'image/jpeg'
  }
}

function requireCloudinaryConfig() {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary env vars are missing')
  }
}

export async function uploadEntryPhotos({ userId, entryType, entryId, files, options }) {
  requireCloudinaryConfig()
  const fileList = Array.from(files || []).filter((file) => file?.type?.startsWith('image/'))
  if (!fileList.length) return []

  const uploads = fileList.map(async (file) => {
    const prepared = await preparePhoto(file, options)
    const photoId = uid('photo')
    const folder = `mycojournal/${userId || 'anonymous'}/${entryType}/${entryId}`
    const formData = new FormData()
    formData.append('file', prepared.blob, `${photoId}.jpg`)
    formData.append('upload_preset', UPLOAD_PRESET)
    formData.append('folder', folder)
    formData.append('public_id', photoId)
    formData.append('context', `alt=${prepared.originalName}|entryType=${entryType}`)

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error('Cloudinary upload failed')
    }

    const result = await response.json()
    return {
      id: photoId,
      url: result.secure_url,
      publicId: result.public_id,
      assetId: result.asset_id,
      name: prepared.originalName,
      width: result.width || prepared.width,
      height: result.height || prepared.height,
      size: result.bytes || prepared.size,
      createdAt: new Date().toISOString()
    }
  })

  return Promise.all(uploads)
}

export async function deleteEntryPhotos(_provider, _paths = []) {
  return
}
