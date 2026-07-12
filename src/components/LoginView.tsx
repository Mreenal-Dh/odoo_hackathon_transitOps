import React, { useState } from "react";
import { motion } from "motion/react";
import { Shield, KeyRound, Mail, User as UserIcon, Phone, Truck } from "lucide-react";
import { apiRequest, setAuthToken, setUserData } from "../lib/api.ts";

interface LoginViewProps {
  onLoginSuccess: () => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [roleId, setRoleId] = useState("1"); // Default Fleet Manager
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const data = await apiRequest("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        setAuthToken(data.token);
        setUserData(data.user);
        onLoginSuccess();
      } else {
        const data = await apiRequest("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({
            name,
            email,
            phone,
            password,
            role_id: roleId,
          }),
        });
        setAuthToken(data.token);
        setUserData(data.user);
        onLoginSuccess();
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4 md:p-8" id="login-container">
      <div className="absolute inset-0 bg-radial from-slate-100 to-gray-50 -z-10" />
      
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white border border-gray-200/80 rounded-2xl shadow-xl overflow-hidden p-8"
        id="login-card"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-slate-900 text-white rounded-xl mb-4 shadow-md flex items-center justify-center">
            <Truck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold font-sans tracking-tight text-gray-900">TransitOps</h1>
          <p className="text-sm text-gray-500 mt-1">Smart Transport Operations Platform</p>
        </div>

        {/* Toggle tabs */}
        <div className="flex bg-gray-100/80 p-1 rounded-lg mb-6 border border-gray-200/50">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              isLogin 
                ? "bg-white text-gray-900 shadow-sm" 
                : "text-gray-500 hover:text-gray-900"
            }`}
            id="tab-btn-signin"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              !isLogin 
                ? "bg-white text-gray-900 shadow-sm" 
                : "text-gray-500 hover:text-gray-900"
            }`}
            id="tab-btn-signup"
          >
            Register Account
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg font-medium" id="login-error-banner">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" id="login-form">
          {!isLogin && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <UserIcon className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Marc Manager"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:border-transparent transition-all"
                    id="input-name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Phone Number</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <Phone className="h-4 w-4" />
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 100-200"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:border-transparent transition-all"
                    id="input-phone"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Functional Role</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <Shield className="h-4 w-4" />
                  </span>
                  <select
                    value={roleId}
                    onChange={(e) => setRoleId(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:border-transparent transition-all appearance-none"
                    id="select-role"
                  >
                    <option value="1">Fleet Manager</option>
                    <option value="2">Driver</option>
                    <option value="3">Safety Officer</option>
                    <option value="4">Financial Analyst</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="manager@transitops.com"
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:border-transparent transition-all"
                id="input-email"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <KeyRound className="h-4 w-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:border-transparent transition-all"
                id="input-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-slate-950 disabled:opacity-50 mt-2 flex items-center justify-center"
            id="btn-login-submit"
          >
            {loading ? "Authenticating..." : isLogin ? "Sign In" : "Register and Seed Account"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-400 border-t border-gray-100 pt-4">
          <p>Demo accounts seeded automatically on backend:</p>
          <p className="mt-1 font-mono text-gray-500">
            Email: manager@transitops.com | Password: password123
          </p>
        </div>
      </motion.div>
    </div>
  );
}
