import React, { useEffect, useState } from 'react'
import { Download, CheckCircle2, Smartphone, Laptop, Share2, Info, HelpCircle } from 'lucide-react'
import { usePWAStore } from '../store/pwaStore'
import toast from 'react-hot-toast'

const PWAInstallCard = () => {
  const { deferredPrompt, isInstallable, isInstalled, clearDeferredPrompt, setIsInstalled } = usePWAStore()
  const [deviceInfo, setDeviceInfo] = useState({
    isIOS: false,
    isFirefox: false,
    isSafari: false,
    isStandalone: false
  })

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase()
    const isIOS = /ipad|iphone|ipod/.test(ua) && !window.MSStream
    const isFirefox = ua.indexOf('firefox') > -1
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

    setDeviceInfo({ isIOS, isFirefox, isSafari, isStandalone })
    if (isStandalone) {
      setIsInstalled(true)
    }
  }, [setIsInstalled])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      toast.error('Installation trigger not available on this browser.')
      return
    }

    try {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        toast.success('Thank you for installing Aether Chat!')
        setIsInstalled(true)
      } else {
        toast.error('Installation dismissed.')
      }
      clearDeferredPrompt()
    } catch (err) {
      console.error('PWA Installation failed:', err)
      toast.error('Could not open installation dialog.')
    }
  }

  // Case 1: App is already installed and running standalone
  if (isInstalled || deviceInfo.isStandalone) {
    return (
      <div 
        className="p-6 rounded-2xl border border-emerald-500/10 theme-transition"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', boxShadow: 'var(--shadow-glass)' }}
      >
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="size-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">App Installed</h3>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              You are currently running Aether Chat in Standalone App mode. Enjoy the native desktop/mobile experience!
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Case 2: Browser supports direct installation via prompt
  if (isInstallable && deferredPrompt) {
    return (
      <div 
        className="p-6 rounded-2xl border theme-transition"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', boxShadow: 'var(--shadow-glass)' }}
      >
        <h2 className="text-sm font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent mb-2">
          Install App
        </h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
          Install Aether Chat to your home screen or desktop for rapid launch, custom notifications, and fullscreen window support.
        </p>
        <button
          type="button"
          onClick={handleInstallClick}
          className="auth-btn flex items-center justify-center gap-2 mt-2"
          style={{
            background: 'var(--accent-primary)',
            color: '#ffffff',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--accent-primary)'}
        >
          <Download className="size-4" />
          <span>Install Web App</span>
        </button>
      </div>
    )
  }

  // Case 3: iOS Safari (Needs manual "Add to Home Screen" instructions)
  if (deviceInfo.isIOS) {
    return (
      <div 
        className="p-6 rounded-2xl border theme-transition"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', boxShadow: 'var(--shadow-glass)' }}
      >
        <h2 className="text-sm font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent mb-3">
          Install on iOS Device
        </h2>
        <div className="space-y-3">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            To install Aether Chat on your iPhone or iPad, Safari requires a manual step:
          </p>
          <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02] space-y-2.5">
            <div className="flex items-center gap-3 text-xs">
              <span className="flex size-5 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-[10px]">1</span>
              <span style={{ color: 'var(--text-primary)' }}>
                Tap the <strong className="text-indigo-300 font-semibold inline-flex items-center gap-1"><Share2 className="size-3.5 inline" /> Share</strong> button in Safari's bottom navigation.
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex size-5 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-[10px]">2</span>
              <span style={{ color: 'var(--text-primary)' }}>
                Scroll down the share sheet and select <strong className="text-indigo-300 font-semibold">Add to Home Screen</strong>.
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex size-5 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-[10px]">3</span>
              <span style={{ color: 'var(--text-primary)' }}>
                Tap <strong className="text-indigo-300 font-semibold">Add</strong> in the top right to complete.
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Case 4: Firefox (Suggests compatible browser)
  if (deviceInfo.isFirefox) {
    return (
      <div 
        className="p-6 rounded-2xl border theme-transition"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', boxShadow: 'var(--shadow-glass)' }}
      >
        <h2 className="text-sm font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent mb-2">
          Install App
        </h2>
        <div className="flex gap-3 text-xs items-start p-3.5 rounded-xl bg-indigo-500/5 border border-indigo-500/10" style={{ color: 'var(--text-primary)' }}>
          <Info className="size-5 text-indigo-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-white">Browser Limit Detected</p>
            <p style={{ color: 'var(--text-secondary)' }}>
              Mozilla Firefox does not support direct desktop installation. To install Aether Chat as an app, we recommend opening this URL in Google Chrome, Microsoft Edge, or Brave.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Case 5: General fallback (e.g. desktop Safari or other browsers without active deferred prompt)
  return (
    <div 
      className="p-6 rounded-2xl border theme-transition"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', boxShadow: 'var(--shadow-glass)' }}
    >
      <h2 className="text-sm font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent mb-2">
        Install App
      </h2>
      <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
        To run Aether Chat as a standalone application:
      </p>
      <div className="flex gap-3 text-xs items-start p-3.5 rounded-xl bg-white/[0.02] border border-white/5" style={{ color: 'var(--text-primary)' }}>
        <HelpCircle className="size-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-white">Standard Installation</p>
          <p style={{ color: 'var(--text-secondary)' }}>
            Open your browser's settings menu (usually top-right three dots <strong className="text-indigo-300">⋮</strong> or search bar icon) and look for <strong className="text-indigo-300">"Install Aether Chat"</strong> or <strong className="text-indigo-300">"Add to Home Screen"</strong>.
          </p>
        </div>
      </div>
    </div>
  )
}

export default PWAInstallCard
