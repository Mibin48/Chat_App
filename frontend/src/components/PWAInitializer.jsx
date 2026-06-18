import React, { useEffect, useState } from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import { usePWAStore } from '../store/pwaStore'
import { userChatStore } from '../store/userChatStore'

const PWAInitializer = () => {
  const { isOffline, setOfflineStatus, setDeferredPrompt, setIsInstalled } = usePWAStore()
  const [showOnlineToast, setShowOnlineToast] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setOfflineStatus(false)
      setShowOnlineToast(true)
      userChatStore.getState().loadOfflineQueue()
      userChatStore.getState().syncOfflineMessages()
      setTimeout(() => {
        setShowOnlineToast(false)
      }, 4000)
    }

    const handleOffline = () => {
      setOfflineStatus(true)
      userChatStore.getState().loadOfflineQueue()
    }

    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      // Store the event so it can be triggered later
      setDeferredPrompt(e)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Check initial status
    const isOnline = navigator.onLine
    setOfflineStatus(!isOnline)
    userChatStore.getState().loadOfflineQueue()
    if (isOnline) {
      userChatStore.getState().syncOfflineMessages()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [setOfflineStatus, setDeferredPrompt, setIsInstalled])

  // Simple visibility control for transitions
  useEffect(() => {
    if (isOffline || showOnlineToast) {
      setIsVisible(true)
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOffline, showOnlineToast])

  if (!isVisible) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-sm pointer-events-none transition-all duration-300">
      {isOffline && (
        <div 
          className="flex items-center gap-3 p-3.5 rounded-2xl border bg-black/60 backdrop-blur-xl shadow-2xl border-red-500/20 text-red-200 pointer-events-auto animate-bounce-subtle"
          style={{
            boxShadow: '0 8px 32px rgba(239, 68, 68, 0.15)',
          }}
        >
          <div className="relative flex size-9 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
            <WifiOff className="size-5" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
          </div>
          <div>
            <h4 className="text-xs font-bold font-display text-white">Connection Lost</h4>
            <p className="text-[10px] opacity-80 leading-normal">You are offline. Showing cached messages.</p>
          </div>
        </div>
      )}

      {!isOffline && showOnlineToast && (
        <div 
          className="flex items-center gap-3 p-3.5 rounded-2xl border bg-black/60 backdrop-blur-xl shadow-2xl border-emerald-500/20 text-emerald-200 pointer-events-auto animate-fade-in"
          style={{
            boxShadow: '0 8px 32px rgba(16, 185, 129, 0.15)',
          }}
        >
          <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <Wifi className="size-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold font-display text-white">Connected</h4>
            <p className="text-[10px] opacity-80 leading-normal">You are back online! Syncing connection...</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default PWAInitializer
