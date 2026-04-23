import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import loaderLogo from '@/assets/nawa-loader-logo.jpeg'

const ensureLoaderLogoReady = async () => {
  const existingPreload = document.querySelector(`link[rel="preload"][href="${loaderLogo}"]`)

  if (!existingPreload) {
    const preload = document.createElement('link')
    preload.rel = 'preload'
    preload.as = 'image'
    preload.href = loaderLogo
    preload.fetchPriority = 'high'
    document.head.appendChild(preload)
  }

  const image = new Image()
  image.src = loaderLogo

  try {
    await Promise.race([
      image.decode ? image.decode() : new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = () => reject(new Error('Loader logo failed to load'))
      }),
      new Promise<void>((resolve) => {
        image.onload = () => resolve()
        image.onerror = () => resolve()
        window.setTimeout(resolve, 1200)
      }),
    ])
  } catch {
    // Allow the app to render even if logo decoding fails.
  }
}

ensureLoaderLogoReady().finally(() => {
  createRoot(document.getElementById("root")!).render(
    <App />
  )
})
