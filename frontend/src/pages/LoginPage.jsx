import React, { useState } from 'react';
import { Link } from 'react-router';
import { userAuthStore } from "../store/userAuthStore";
import { ZapIcon, LockIcon, MailIcon, EyeIcon, EyeOffIcon, LoaderIcon, ShieldCheckIcon } from "lucide-react";
import ThemeToggle from '../components/ThemeToggle';

function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const { login, isLoggingIn } = userAuthStore();

  const handleSubmit = (e) => {
    e.preventDefault();
    login(formData);
  };

  return (
    <div className="flex w-full h-screen overflow-hidden relative font-sans" style={{ background: 'transparent' }}>
      {/* Background Ambient Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-[120px] opacity-10 bg-indigo-500 animate-pulse-glow" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-[120px] opacity-10 bg-purple-500 animate-pulse-glow" />
      </div>

      {/* Floating Theme Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* ── FORM SIDE ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 overflow-y-auto z-10">
        <div
          className="w-full max-w-sm p-6 sm:p-8 rounded-3xl border border-white/5 shadow-2xl backdrop-blur-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.05) 100%)',
            borderColor: 'var(--border-subtle)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 24px rgba(99,102,241,0.1)'
          }}
        >
          {/* Brand */}
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 shadow-lg animate-float overflow-hidden"
              style={{ background: 'var(--accent-muted)', border: '1px solid var(--border-accent)', boxShadow: '0 0 15px var(--accent-glow)' }}
            >
              <img src="/logo.png" alt="Aether Chat Logo" className="w-12 h-12 object-contain" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight gradient-text mb-1.5">Aether Chat</h1>
            <p className="text-xs text-zinc-400">Secure real-time messaging network</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="auth-input-label text-[10px] font-bold uppercase tracking-wider text-zinc-400">Email Address</label>
              <div className="relative">
                <MailIcon className="auth-input-icon text-indigo-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="aether-input text-xs"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="auth-input-label text-[10px] font-bold uppercase tracking-wider text-zinc-400">Password</label>
              <div className="relative">
                <LockIcon className="auth-input-icon text-indigo-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="aether-input text-xs"
                  style={{ paddingRight: '2.75rem' }}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-450 hover:text-white transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                </button>
              </div>
            </div>

            <button
              className="auth-btn flex items-center justify-center gap-2 mt-6 py-2.5 rounded-xl font-bold transition-all duration-150 active:scale-[0.98]"
              type="submit"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <><LoaderIcon className="w-4 h-4 animate-spin" /><span>Signing In...</span></>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center space-y-4">
            <div
              className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            >
              <ShieldCheckIcon size={12} className="animate-pulse" />
              <span>End-to-end encrypted</span>
            </div>
            <p className="text-xs text-zinc-400">
              Don't have an account?{" "}
              <Link to="/signup" className="auth-link font-bold hover:underline">Create one</Link>
            </p>
          </div>
        </div>
      </div>

      {/* ── ILLUSTRATION SIDE (desktop only) ── */}
      <div
        className="hidden md:flex flex-col items-center justify-center flex-1 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-base) 100%)', borderLeft: '1px solid var(--border-subtle)' }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[130px] opacity-10 bg-indigo-500" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-[100px] opacity-10 bg-purple-500" />
        </div>
        <div className="relative z-10 w-full max-w-md px-12 text-center flex flex-col items-center">
          <div className="w-72 h-72 mb-8 relative flex items-center justify-center">
            {/* Ambient glowing backdrops */}
            <div className="absolute inset-4 rounded-full bg-indigo-500/10 blur-2xl animate-pulse" />
            <img src="/login.png" alt="Welcome back" className="w-64 h-64 object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500 ease-out" />
          </div>
          <h3 className="text-2xl font-extrabold tracking-tight mb-2 text-white">Welcome Back!</h3>
          <p className="text-sm leading-relaxed text-zinc-400">
            Continue your conversations, check up on your groups, and stay connected with real-time privacy.
          </p>
        </div>
      </div>

    </div>
  );
}

export default LoginPage;