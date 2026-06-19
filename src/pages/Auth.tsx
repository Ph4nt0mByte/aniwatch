import { useState } from 'react';
import { loginWithEmail, registerWithEmail } from '../lib/firebase';
import { User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const uname = username.trim();
    try {
      if (mode === 'register') {
        const email = `${uname}@aniwatch.local`;
        await registerWithEmail(email, password, uname);
      } else {
        const email = `${uname}@aniwatch.local`;
        await loginWithEmail(email, password);
      }
    } catch (err: any) {
      const msg = err?.message || 'Something went wrong';
      if (msg.includes('auth/email-already-in-use')) setError('Username is already taken.');
      else if (msg.includes('auth/invalid-credential') || msg.includes('auth/user-not-found') || msg.includes('auth/wrong-password')) setError('Invalid username or password.');
      else if (msg.includes('auth/weak-password')) setError('Password should be at least 6 characters.');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(prev => prev === 'login' ? 'register' : 'login');
    setError(null);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-[#1a1b1e] p-8 rounded-2xl border border-white/5 shadow-2xl"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <span className="text-4xl font-black italic tracking-tighter">ani<span className="text-primary">watch</span></span>
          </div>
          <h2 className="text-2xl font-bold">{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
          <p className="text-text-secondary mt-2 text-sm">
            {mode === 'login' ? 'Login to your account to continue' : 'Join AniWatch to track your anime'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-sm font-medium placeholder:text-gray-600 focus:outline-none focus:border-primary/50 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-10 text-sm font-medium placeholder:text-gray-600 focus:outline-none focus:border-primary/50 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-xs font-medium bg-red-400/10 px-3 py-2 rounded-lg"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-black py-3 rounded-lg font-bold hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            {mode === 'login' ? 'Login' : 'Create Account'}
          </button>
        </form>



        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={toggleMode}
            className="text-sm text-gray-400 hover:text-primary transition-colors"
          >
            {mode === 'login' ? (
              <>Don't have an account? <span className="text-primary font-bold">Register</span></>
            ) : (
              <>Already have an account? <span className="text-primary font-bold">Login</span></>
            )}
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          By continuing, you agree to our <a href="#" className="text-primary hover:underline">Terms of Service</a> and <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
        </p>
      </motion.div>
    </div>
  );
}
