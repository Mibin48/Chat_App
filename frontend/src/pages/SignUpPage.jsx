import React, { useState } from 'react';
import { Link } from 'react-router';
import { userAuthStore } from "../store/userAuthStore";
import { ZapIcon, LockIcon, MailIcon, UserIcon, LoaderIcon, EyeIcon, EyeOffIcon, PhoneIcon, MapPinIcon, FileTextIcon, CalendarIcon, ArrowRightIcon, ArrowLeftIcon } from "lucide-react";
import ThemeToggle from '../components/ThemeToggle';
import toast from 'react-hot-toast';

function SignUpPage() {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    location: "",
    bio: "",
    dob: ""
  });
  const { signup, isSigningUp } = userAuthStore();

  const handleNext = (e) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.password.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setStep(2);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    signup(formData);
  };

  const passwordStrength = (() => {
    const p = formData.password;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  })();

  const strengthColors = ['', '#ef4444', '#f59e0b', '#10b981', '#6366f1'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  return (
    <div className="fixed inset-0 flex w-full h-full overflow-hidden relative font-sans" style={{ background: 'transparent' }}>
      {/* Background Ambient Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-[120px] opacity-10 bg-indigo-500 animate-pulse-glow" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-[120px] opacity-10 bg-purple-500 animate-pulse-glow" />
      </div>

      {/* Floating Theme Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* ── ILLUSTRATION SIDE (desktop only) ── */}
      <div
        className="hidden md:flex flex-col items-center justify-center flex-1 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-base) 100%)', borderRight: '1px solid var(--border-subtle)' }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 right-1/3 w-96 h-96 rounded-full blur-[120px] opacity-10 bg-indigo-500 animate-pulse-glow" />
          <div className="absolute bottom-1/3 left-1/4 w-80 h-80 rounded-full blur-[100px] opacity-10 bg-purple-500 animate-pulse-glow" />
        </div>
        <div className="relative z-10 w-full max-w-md px-12 text-center flex flex-col items-center">
          <div className="w-72 h-72 mb-8 relative flex items-center justify-center">
            <div className="absolute inset-4 rounded-full bg-purple-500/10 blur-2xl animate-pulse" />
            <img src="/signup.png" alt="Get started" className="w-64 h-64 object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500 ease-out" />
          </div>
          <h3 className="text-2xl font-extrabold tracking-tight mb-2 text-white">Start Your Journey</h3>
          <p className="text-sm leading-relaxed mb-6 text-zinc-400">
            Experience premium private messaging built with speed, end-to-end security, and beautiful responsive layouts.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {['Free Forever', 'Real-time', 'E2E Encrypted'].map((label) => (
              <span key={label} className="auth-badge text-[10px] font-bold uppercase tracking-wider">{label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── FORM SIDE ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 overflow-y-auto z-10">
        <div
          className="w-full max-w-sm p-6 sm:p-8 rounded-3xl border border-white/5 shadow-2xl backdrop-blur-2xl animate-fade-in"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.05) 100%)',
            borderColor: 'var(--border-subtle)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 24px rgba(99,102,241,0.1)'
          }}
        >
          {/* Brand */}
          <div className="text-center mb-6">
            <div
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3 shadow-lg animate-float overflow-hidden"
              style={{ background: 'var(--accent-muted)', border: '1px solid var(--border-accent)', boxShadow: '0 0 15px var(--accent-glow)' }}
            >
              <img src="/logo.png" alt="Aether Chat Logo" className="w-12 h-12 object-contain" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight gradient-text mb-1">Create Account</h1>
            <p className="text-xs text-zinc-400">Join the secure Aether network</p>
          </div>

          {/* Step Progress indicator */}
          <div className="flex items-center justify-between mb-6 px-1">
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === 1 ? 'bg-indigo-500 text-white font-extrabold' : 'bg-emerald-500 text-white'}`}>
                {step > 1 ? '✓' : '1'}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Credentials</span>
            </div>
            <div className="h-0.5 flex-1 bg-white/5 mx-3 rounded" />
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === 2 ? 'bg-indigo-500 text-white font-extrabold' : 'bg-white/5 text-zinc-500'}`}>
                2
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Details</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={step === 1 ? handleNext : handleSubmit} className="space-y-4">
            {step === 1 ? (
              /* ── STEP 1: CREDENTIALS ── */
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="auth-input-label text-[10px] font-bold uppercase tracking-wider text-zinc-400">Full Name</label>
                  <div className="relative">
                    <UserIcon className="auth-input-icon text-indigo-400" />
                    <input type="text" value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="aether-input text-xs" placeholder="John Doe" required />
                  </div>
                </div>

                <div>
                  <label className="auth-input-label text-[10px] font-bold uppercase tracking-wider text-zinc-400">Email Address</label>
                  <div className="relative">
                    <MailIcon className="auth-input-icon text-indigo-400" />
                    <input type="email" value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="aether-input text-xs" placeholder="you@example.com" required />
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
                      className="aether-input text-xs" style={{ paddingRight: '2.75rem' }}
                      placeholder="Min. 8 characters" required
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-450 hover:text-white transition-colors"
                      onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                    </button>
                  </div>
                  {formData.password && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex gap-1 flex-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                            style={{ background: i <= passwordStrength ? strengthColors[passwordStrength] : 'var(--border-medium)' }} />
                        ))}
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: strengthColors[passwordStrength] }}>
                        {strengthLabels[passwordStrength]}
                      </span>
                    </div>
                  )}
                </div>

                <button className="auth-btn flex items-center justify-center gap-2 mt-6 py-2.5 rounded-xl font-bold transition-all duration-150 active:scale-[0.98]" type="submit">
                  <span>Next Step</span> <ArrowRightIcon size={16} />
                </button>
              </div>
            ) : (
              /* ── STEP 2: PROFILE DETAILS (OPTIONAL) ── */
              <div className="space-y-3.5 animate-fade-in animate-duration-200">
                <div>
                  <label className="auth-input-label text-[10px] font-bold uppercase tracking-wider text-zinc-400">Phone Number (Optional)</label>
                  <div className="relative">
                    <PhoneIcon className="auth-input-icon text-indigo-400" />
                    <input type="text" value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="aether-input text-xs" placeholder="+1 (555) 000-0000" />
                  </div>
                </div>

                <div>
                  <label className="auth-input-label text-[10px] font-bold uppercase tracking-wider text-zinc-400">Location (Optional)</label>
                  <div className="relative">
                    <MapPinIcon className="auth-input-icon text-indigo-400" />
                    <input type="text" value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="aether-input text-xs" placeholder="New York, NY" />
                  </div>
                </div>

                <div>
                  <label className="auth-input-label text-[10px] font-bold uppercase tracking-wider text-zinc-400">Bio (Optional)</label>
                  <div className="relative">
                    <FileTextIcon className="auth-input-icon text-indigo-400" />
                    <input type="text" value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      className="aether-input text-xs" placeholder="Hey there! I am using Aether Chat." />
                  </div>
                </div>

                <div>
                  <label className="auth-input-label text-[10px] font-bold uppercase tracking-wider text-zinc-400">Date of Birth (Optional)</label>
                  <div className="relative">
                    <CalendarIcon className="auth-input-icon text-indigo-400" />
                    <input type="date" value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      className="aether-input font-sans text-xs" style={{ colorScheme: 'dark' }} />
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <button type="button" onClick={() => setStep(1)} className="flex-1 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-zinc-300 font-bold border border-white/5 transition-all flex items-center justify-center gap-1 active:scale-[0.98]">
                    <ArrowLeftIcon size={14} />                  </button>
                  <button className="flex-2 auth-btn font-bold rounded-xl py-2.5 shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]" type="submit" disabled={isSigningUp}>
                    {isSigningUp ? (
                      <><LoaderIcon className="w-4 h-4 animate-spin" /><span>Signing Up...</span></>
                    ) : (
                      <span>Sign Up</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          <div className="mt-5 text-center">
            <p className="text-xs text-zinc-400">
              Already have an account?{" "}
              <Link to="/login" className="auth-link font-bold hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignUpPage;