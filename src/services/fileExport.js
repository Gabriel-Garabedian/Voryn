import { Capacitor, registerPlugin } from '@capacitor/core'

const FileExport = registerPlugin('FileExport')

export async function saveExport(blob, filename) {
  if (Capacitor.getPlatform() === 'android') {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result.split(',')[1])
      reader.onerror = () => reject(new Error('Não foi possível preparar o arquivo.'))
      reader.readAsDataURL(blob)
    })
    await FileExport.save({ filename, mimeType: blob.type, base64 })
    return
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
