import React, { useState } from 'react';
import { Link } from 'react-router';
import { userAuthStore } from "../store/userAuthStore";
import BorderAnimatedContainer from '../components/BorderAnimatedContainer';
import { MessageCircleIcon, LockIcon, MailIcon, EyeIcon, EyeOffIcon, LoaderIcon } from "lucide-react";

function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });

  const { login, isLoggingIn } = userAuthStore();

  const handleSubmit = (e) => {
    e.preventDefault();
    login(formData);
  };

  return (
    <div className="w-full flex items-center justify-center p-4 min-h-screen">
      <div className="relative w-full max-w-6xl md:h-[800px] h-auto min-h-[650px]">
        <BorderAnimatedContainer>
          <div className="w-full h-full flex flex-col md:flex-row glass-panel rounded-2xl overflow-hidden">

            {/* FORM COLUMN - LEFT SIDE */}
            <div className="md:w-1/2 p-8 flex items-center justify-center md:border-r border-white/10">
              <div className="w-full max-w-md">
                {/* HEADING TEXT */}
                <div className="text-center mb-8">
                  <div className="inline-flex p-4 rounded-2xl bg-cyan-500/20 mb-4 shadow-lg shadow-cyan-500/10">
                    <MessageCircleIcon className="w-10 h-10 text-cyan-400 animate-pulse" />
                  </div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">Welcome Back</h2>
                  <p className="text-slate-400">Sign in to your account</p>
                </div>

                {/* FORM */}
                <form onSubmit={handleSubmit} className="space-y-5">

                  {/* EMAIL INPUT */}
                  <div>
                    <label className="auth-input-label">Email</label>
                    <div className="relative group">
                      <MailIcon className="auth-input-icon group-focus-within:text-cyan-400 transition-colors" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="input glass-input"
                        placeholder="johndoe@gmail.com"
                        required
                      />
                    </div>
                  </div>

                  {/* PASSWORD INPUT */}
                  <div>
                    <label className="auth-input-label">Password</label>
                    <div className="relative group">
                      <LockIcon className="auth-input-icon group-focus-within:text-cyan-400 transition-colors" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="input glass-input"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* SUBMIT BUTTON */}
                  <button className="auth-btn flex items-center justify-center group" type="submit" disabled={isLoggingIn}>
                    {isLoggingIn ? (
                      <>
                        <LoaderIcon className="size-5 animate-spin mr-2" />
                        <span>Logging In...</span>
                      </>
                    ) : (
                      <span className="group-hover:scale-105 transition-transform">Login</span>
                    )}
                  </button>
                </form>

                <div className="mt-8 text-center">
                  <p className="text-slate-400 text-sm">
                    Don't have an account?{" "}
                    <Link to="/signup" className="text-cyan-400 hover:text-cyan-300 hover:underline font-medium transition-colors">
                      Sign Up
                    </Link>
                  </p>
                </div>
              </div>
            </div>

            {/* ILLUSTRATION - RIGHT SIDE */}
            <div className="hidden md:w-1/2 md:flex flex-col items-center justify-center p-12 bg-gradient-to-br from-cyan-500/10 to-transparent relative overflow-hidden">
              {/* Decorative background orbs for the right side */}
              <div className="absolute top-10 right-10 w-32 h-32 bg-cyan-400/20 rounded-full blur-3xl" />
              <div className="absolute bottom-10 left-10 w-32 h-32 bg-blue-400/20 rounded-full blur-3xl" />

              <div className="w-full max-w-sm relative z-10">
                <img
                  src="/login.png"
                  alt="Illustration"
                  className="w-full h-auto object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500"
                />
                <div className="mt-8 text-center">
                  <h3 className="text-2xl font-bold text-white mb-2 text-shadow-lg">Welcome Back!</h3>
                  <p className="text-slate-300 mb-6">Sign in to continue your conversations and stay connected.</p>
                </div>
              </div>
            </div>
          </div>
        </BorderAnimatedContainer>
      </div>
    </div>
  )
}

export default LoginPage