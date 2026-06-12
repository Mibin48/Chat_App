import React, { useState } from 'react'
import { KeyRound, Lock, Unlock, Eye, EyeOff, RefreshCw, AlertCircle } from 'lucide-react'
import { userAuthStore } from '../store/userAuthStore'
import { generateE2EEKeyPair, getPrivateKey, encryptPrivateKeyWithPassword } from '../lib/cryptoUtils'
import { axiosInstance } from '../lib/axios'
import toast from 'react-hot-toast'

const KeyRecoveryPrompt = () => {
  const { needsRecovery, recoverPrivateKey, authUser } = userAuthStore()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isRecovering, setIsRecovering] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  if (!needsRecovery) return null

  const handleRecover = async (e) => {
    e.preventDefault()
    if (!password) return toast.error('Password is required')
    
    setIsRecovering(true)
    const success = await recoverPrivateKey(password)
    setIsRecovering(false)
    if (success) {
      setPassword('')
    }
  }

  const handleResetE2EE = async () => {
    let backupFields = {
      encryptedPrivateKey: null,
      privateKeyIv: null,
      passwordSalt: null
    };

    if (!password) {
      const confirmNoBackup = window.confirm(
        "WARNING: You did not enter your login password. Resetting E2EE keys without a password means they CANNOT be backed up to the server. If browser storage is cleared in the future, you will lose access to all messages permanently.\n\nAre you sure you want to reset without a secure backup?"
      );
      if (!confirmNoBackup) return;
    } else {
      const confirmReset = window.confirm(
        "WARNING: Resetting E2EE keys will generate a new secure keypair. All older encrypted conversations will become permanently undecryptable. Do you want to continue?"
      );
      if (!confirmReset) return;
    }

    setIsResetting(true)
    try {
      console.log("[E2EE] User selected manual keys reset. Regenerating...");
      const publicKeyJwk = await generateE2EEKeyPair()
      
      if (password) {
        try {
          const privateKey = await getPrivateKey();
          if (privateKey) {
            backupFields = await encryptPrivateKeyWithPassword(privateKey, password);
            console.log("[E2EE] Secure backup created for the reset keypair.");
          }
        } catch (backupErr) {
          console.error("[E2EE] Failed to encrypt key for backup during reset:", backupErr);
          toast.error("Could not encrypt key backup. Resetting without backup.");
        }
      }

      // Update public key and backup fields on server
      const res = await axiosInstance.put("/auth/update-public-key", {
        publicKey: publicKeyJwk,
        ...backupFields
      })
      
      // Update authUser state
      userAuthStore.setState({ authUser: res.data, needsRecovery: false })
      toast.success("Secure keys reset successfully. New chat sessions will be secure.")
    } catch (err) {
      console.error("[E2EE] Failed to reset E2EE keys:", err)
      toast.error("Failed to reset E2EE keys. Please reload and try again.")
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
      <div 
        className="w-full max-w-md p-8 rounded-3xl border border-[var(--border-medium)] shadow-2xl relative animate-scale-in"
        style={{
          background: 'var(--bg-glass-panel)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        }}
      >
        <div className="flex flex-col items-center text-center space-y-4 mb-6">
          <div className="size-16 rounded-2xl flex items-center justify-center bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner relative animate-pulse">
            <KeyRound className="size-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-display text-white tracking-tight">Restore Secure Chat Keys</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed max-w-xs">
              Your browser storage was cleared. Enter your login password to decrypt your secure chat history.
            </p>
          </div>
        </div>

        <form onSubmit={handleRecover} className="space-y-4">
          <div className="space-y-1.5">
            <label className="auth-input-label text-xs">Login Password</label>
            <div className="relative">
              <Lock className="auth-input-icon text-indigo-400 opacity-60" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="aether-input w-full pr-10 font-sans"
                placeholder="Enter password"
                disabled={isRecovering || isResetting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white transition-colors"
                disabled={isRecovering || isResetting}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isRecovering || isResetting}
            className="auth-btn flex items-center justify-center gap-2 mt-4"
            style={{
              background: 'var(--accent-primary)',
              color: '#ffffff',
            }}
          >
            {isRecovering ? (
              <>
                <RefreshCw className="size-4 animate-spin" />
                <span>Restoring Keys...</span>
              </>
            ) : (
              <>
                <Unlock className="size-4" />
                <span>Restore History</span>
              </>
            )}
          </button>
        </form>

        <div className="border-t border-white/5 my-6 pt-4 space-y-4">
          <div className="flex gap-2.5 items-start p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 text-[11px] leading-relaxed text-amber-200/90">
            <AlertCircle className="size-4 text-amber-400 flex-shrink-0 mt-0.5 animate-bounce" />
            <div>
              <p className="font-semibold text-white">Forgot password?</p>
              <p className="opacity-80">
                If you cannot remember your password, you will have to reset your E2EE keys. Note that all previous chat history will become unreadable.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetE2EE}
            disabled={isRecovering || isResetting}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-white/5 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 border border-white/5 hover:border-red-500/20 transition-all active:scale-[0.98] duration-150"
          >
            {isResetting ? 'Resetting Keys...' : 'Reset & Re-initialize E2EE Keys'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default KeyRecoveryPrompt
