import React, { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import ChatPage from './pages/ChatPage'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import { userAuthStore } from "./store/userAuthStore"
import PageLoader from './components/PageLoader';
import { Toaster } from "react-hot-toast";



const App = () => {
  const { checkAuth, isCheckingAuth, authUser } = userAuthStore();
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isCheckingAuth) return <PageLoader />

  console.log({ authUser });

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden text-slate-100 font-sans selection:bg-cyan-500/30">

      {/* BACKGROUND ELEMENTS */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Geometric Grid Pattern - Increased opacity and visibility */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

        {/* Radial Gradient Glow for Depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/0 via-slate-950/60 to-slate-950" />

        {/* Animated Orbs - Increased opacity from 0.04 to ~0.2 */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-cyan-500/20 rounded-full blur-[100px] animate-float mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-500/20 rounded-full blur-[100px] animate-float mix-blend-screen" style={{ animationDelay: '-5s' }} />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-80 h-80 bg-blue-500/20 rounded-full blur-[120px] animate-pulse-glow mix-blend-screen" />
      </div>

      {/* CONTENT LAYER */}
      <div className="relative z-10 min-h-screen flex flex-col">
        <Routes>
          <Route path="/" element={authUser ? <ChatPage /> : <Navigate to={"/login"} />} />
          <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to={"/"} />} />
          <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to={"/"} />} />
        </Routes>
      </div>

      <Toaster />
    </div>
  )
}

export default App