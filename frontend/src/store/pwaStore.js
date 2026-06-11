import { create } from 'zustand'

export const usePWAStore = create((set) => ({
  isOffline: !navigator.onLine,
  deferredPrompt: null,
  isInstallable: false,
  isInstalled: window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true,

  setOfflineStatus: (offline) => set({ isOffline: offline }),
  setDeferredPrompt: (prompt) => set({ deferredPrompt: prompt, isInstallable: !!prompt }),
  setIsInstalled: (installed) => set({ isInstalled: installed }),
  clearDeferredPrompt: () => set({ deferredPrompt: null, isInstallable: false }),
}))
