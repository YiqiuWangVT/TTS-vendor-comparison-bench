/**
 * Audio Download Utility Functions
 * Provides functionality to download audio files from data URLs
 */

import JSZip from 'jszip'

export interface ParsedDataUrl {
  mimeType: string
  base64: string
  extension: string
}

/**
 * MIME type to file extension mapping
 */
const MIME_EXTENSIONS: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
  'audio/flac': 'flac',
  'audio/mp4': 'm4a',
  'audio/mp3': 'mp3',
  'audio/x-wav': 'wav',
}

/**
 * Parse a data URL to extract MIME type, base64 data, and file extension
 */
export function parseDataUrl(dataUrl: string): ParsedDataUrl | null {
  try {
    const commaIndex = dataUrl.indexOf(',')
    if (commaIndex === -1) return null

    const header = dataUrl.substring(0, commaIndex)
    const base64 = dataUrl.substring(commaIndex + 1)

    // Extract MIME type from header like "data:audio/mpeg;base64"
    const mimeTypeMatch = header.match(/data:([^;]+)/)
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : ''
    const extension = MIME_EXTENSIONS[mimeType] || 'audio'

    return {
      mimeType,
      base64,
      extension,
    }
  } catch (error) {
    console.error('Failed to parse data URL:', error)
    return null
  }
}

/**
 * Sanitize text for use in filename
 */
export function sanitizeFilename(text: string): string {
  return text
    // Remove or replace special characters
    .replace(/[<>:"/\\|?*]/g, '_')
    // Replace multiple spaces with single space
    .replace(/\s+/g, '_')
    // Remove leading/trailing spaces and underscores
    .replace(/^[\s_]+|[\s_]+$/g, '')
    // Limit length
    .substring(0, 30)
    // Ensure it's not empty
    || 'audio'
}

/**
 * Generate filename for audio download
 */
export function generateAudioFilename(
  provider: string,
  text: string,
  mimeType: string,
  timestamp?: Date
): string {
  const date = timestamp || new Date()
  const timeStr = date.toISOString().slice(0, 19).replace(/[:-]/g, '_')
  const sanitizedText = sanitizeFilename(text)
  const extension = MIME_EXTENSIONS[mimeType] || 'mp3'

  return `${provider}_${sanitizedText}_${timeStr}.${extension}`
}

/**
 * Convert base64 to Blob
 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  try {
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }

    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: mimeType })
  } catch (error) {
    console.error('Failed to convert base64 to blob:', error)
    throw new Error('Invalid base64 data')
  }
}

/**
 * Trigger browser download for a blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  try {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none'

    document.body.appendChild(link)
    link.click()

    // Clean up
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Failed to download blob:', error)
    throw new Error('Download failed')
  }
}

/**
 * Main function: Download audio from data URL
 */
export async function downloadAudioFromDataUrl(
  dataUrl: string,
  provider: string,
  text: string,
  customFilename?: string
): Promise<void> {
  try {
    if (!dataUrl) {
      throw new Error('No audio data available for download')
    }

    const parsed = parseDataUrl(dataUrl)
    if (!parsed) {
      throw new Error('Invalid audio data format')
    }

    const blob = base64ToBlob(parsed.base64, parsed.mimeType)
    const filename = customFilename || generateAudioFilename(provider, text, parsed.mimeType)

    downloadBlob(blob, filename)
  } catch (error) {
    console.error('Audio download failed:', error)
    throw error
  }
}

/**
 * Check if download is supported in current browser
 */
export function isDownloadSupported(): boolean {
  return typeof document !== 'undefined' &&
         typeof URL !== 'undefined' &&
         typeof URL.createObjectURL === 'function' &&
         typeof Blob !== 'undefined'
}

export interface AudioFile {
  provider: string
  text: string
  dataUrl: string
  mimeType?: string
}

/**
 * Create metadata for downloaded audio files
 */
export function createDownloadMetadata(audioFiles: AudioFile[], timestamp: Date): string {
  const metadata = {
    downloadInfo: {
      timestamp: timestamp.toISOString(),
      totalFiles: audioFiles.length,
      generatedBy: 'TTS Vendor Comparison Platform'
    },
    files: audioFiles.map(file => {
      const parsed = parseDataUrl(file.dataUrl)
      return {
        provider: file.provider,
        text: file.text,
        filename: generateAudioFilename(file.provider, file.text, file.mimeType || 'audio/mpeg', timestamp),
        mimeType: file.mimeType || parsed?.mimeType,
        sizeBytes: parsed?.base64 ? Math.floor(parsed.base64.length * 0.75) : 0
      }
    })
  }

  return JSON.stringify(metadata, null, 2)
}

/**
 * Download multiple audio files as individual files
 */
export async function downloadMultipleAudioFiles(
  audioFiles: AudioFile[],
  onProgress?: (completed: number, total: number) => void
): Promise<void> {
  if (!isDownloadSupported()) {
    throw new Error('Download not supported in this browser')
  }

  for (let i = 0; i < audioFiles.length; i++) {
    const file = audioFiles[i]
    try {
      await downloadAudioFromDataUrl(file.dataUrl, file.provider, file.text)
      onProgress?.(i + 1, audioFiles.length)
    } catch (error) {
      console.error(`Failed to download ${file.provider}:`, error)
    }
  }
}

/**
 * Download multiple audio files as a ZIP archive
 */
export async function downloadAudioFilesAsZip(
  audioFiles: AudioFile[],
  customZipName?: string
): Promise<void> {
  if (!isDownloadSupported()) {
    throw new Error('Download not supported in this browser')
  }

  const zip = new JSZip()
  const timestamp = new Date()
  const zipName = customZipName || `tts_audio_${timestamp.toISOString().slice(0, 19).replace(/[:-]/g, '_')}.zip`

  try {
    // Create audio folder
    const audioFolder = zip.folder('audio')
    if (!audioFolder) throw new Error('Failed to create audio folder in ZIP')

    // Add audio files to ZIP
    for (const file of audioFiles) {
      const parsed = parseDataUrl(file.dataUrl)
      if (!parsed) continue

      const blob = base64ToBlob(parsed.base64, parsed.mimeType)
      const filename = generateAudioFilename(file.provider, file.text, parsed.mimeType, timestamp)
      audioFolder.file(filename, blob)
    }

    // Add metadata file
    const metadata = createDownloadMetadata(audioFiles, timestamp)
    zip.file('metadata.json', metadata)

    // Generate ZIP file and download
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    downloadBlob(zipBlob, zipName)

  } catch (error) {
    console.error('Failed to create ZIP file:', error)
    throw new Error('Failed to create ZIP archive')
  }
}

/**
 * Download multiple audio files with options for individual or ZIP download
 */
export async function downloadAudioFiles(
  audioFiles: AudioFile[],
  options: {
    format?: 'individual' | 'zip'
    zipName?: string
    onProgress?: (completed: number, total: number) => void
  } = {}
): Promise<void> {
  const { format = 'individual', zipName, onProgress } = options

  if (audioFiles.length === 0) {
    throw new Error('No audio files to download')
  }

  if (format === 'zip') {
    return downloadAudioFilesAsZip(audioFiles, zipName)
  } else {
    return downloadMultipleAudioFiles(audioFiles, onProgress)
  }
}