import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { useAdmin } from "@/components/AdminContext";
import { FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle } from "react-icons/fi";

export default function Login() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const { login, adminToken, authLoading } = useAdmin();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && adminToken) router.replace("/");
  }, [adminToken, authLoading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await login(email, password);
    if (result.success) router.replace("/");
    else setError(result.message);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Head><title>Sign In — Dorjee Admin</title></Head>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-48 -right-48 w-96 h-96 bg-[#D5AD4D]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-48 -left-48 w-96 h-96 bg-[#D5AD4D]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo-light.svg" alt="Dorjee Fashion Factory" className="h-12 w-auto mx-auto mb-4" />
          <h1 className="text-white text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Dorjee Fashion Factory — Sign in to continue</p>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-2xl">
          {error && (
            <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 mb-5 text-sm">
              <FiAlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-1.5 block">Email</label>
              <div className="relative">
                <FiMail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="dorjeefashionfactory@gmail.com"
                  required
                  className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-[#D5AD4D] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-1.5 block">Password</label>
              <div className="relative">
                <FiLock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl pl-10 pr-11 py-3 text-sm outline-none focus:border-[#D5AD4D] transition-colors"
                />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-[#D5AD4D] to-[#C1913C] hover:from-[#C1913C] hover:to-[#D5AD4D] text-[#1B1406] font-bold py-3 rounded-xl transition-all shadow-lg shadow-[#D5AD4D]/20 disabled:opacity-60 disabled:cursor-not-allowed mt-2">
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
