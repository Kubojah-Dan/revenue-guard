import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, ArrowRight, Mail, Lock, User, Building2 } from "lucide-react";

/** Official Google "G" SVG */
function GoogleLogo() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export default function Signup() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    sessionStorage.setItem("rpt_user_name", fullName || "New User");
    sessionStorage.setItem("rpt_company", company || "Acme Corp");
    sessionStorage.setItem("rpt_user_email", email || "user@company.com");
    setTimeout(() => {
      setIsLoading(false);
      navigate("/onboarding");
    }, 600);
  };

  const handleGoogleSignup = () => {
    setIsGoogleLoading(true);
    sessionStorage.setItem("rpt_auth_provider", "google");
    window.location.href = `${API_BASE_URL}/api/auth/google`;
  };

  return (
    <div className="min-h-screen bg-[var(--color-surface)] flex flex-col justify-between p-6 sm:p-10 relative overflow-hidden">
      {/* Background radial glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none opacity-40"
        style={{
          background: "radial-gradient(circle, rgba(109,91,208,0.08) 0%, rgba(255,255,255,0) 70%)",
        }}
      />

      {/* Top Brand Header */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between z-10">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-xl bg-white border border-black/[0.08] shadow-sm flex items-center justify-center p-1 group-hover:scale-105 transition-transform">
            <img src="/logo.png" alt="Revenue Process Twin" className="w-full h-full object-contain" />
          </div>
          <span className="font-display font-bold text-base text-[var(--color-ink)]">
            Revenue Process Twin
          </span>
        </Link>

        <span className="text-xs text-[var(--color-muted)]">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-[var(--color-ink)] hover:underline">
            Sign in
          </Link>
        </span>
      </header>

      {/* Signup Form Card */}
      <main className="max-w-lg w-full mx-auto my-auto z-10 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white p-8 rounded-2xl border border-[var(--color-border)] shadow-[var(--shadow-elevation-2)] space-y-6"
        >
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)] text-xs font-semibold mb-3">
              <Shield size={13} />
              Create Organization Workspace
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-ink)] tracking-tight">
              Get Started with Revenue Twin
            </h1>
            <p className="text-xs text-[var(--color-muted)] mt-1">
              Set up your continuous process mining & revenue leakage recovery environment.
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Morgan"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] transition-all font-medium"
                  />
                  <User size={15} className="absolute left-3 top-3 text-gray-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1.5">
                  Company Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Acme Global Systems"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] transition-all font-medium"
                  />
                  <Building2 size={15} className="absolute left-3 top-3 text-gray-400" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@acme.com"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] transition-all font-medium"
                />
                <Mail size={15} className="absolute left-3 top-3 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] transition-all font-medium"
                />
                <Lock size={15} className="absolute left-3 top-3 text-gray-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-[var(--color-ink)] text-white font-semibold text-xs hover:bg-black transition-all shadow-md flex items-center justify-center gap-2"
            >
              {isLoading ? "Creating Workspace..." : "Create Account & Continue"}
              <ArrowRight size={14} />
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--color-border)]" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              <span className="bg-white px-2">Or continue with</span>
            </div>
          </div>

          {/* Google OAuth button */}
          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={isGoogleLoading}
            className="w-full py-3 px-4 rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-ink)] font-semibold text-xs hover:bg-gray-50 transition-all shadow-xs flex items-center justify-center gap-2.5"
          >
            {isGoogleLoading ? (
              <span className="text-gray-400">Connecting to Google...</span>
            ) : (
              <>
                <GoogleLogo />
                Continue with Google
              </>
            )}
          </button>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-[var(--color-muted)] py-4 z-10">
        Continuous Revenue Conformance & Causal Recovery Engine
      </footer>
    </div>
  );
}
