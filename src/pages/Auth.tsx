import { signInWithGoogle } from '../lib/firebase';
import { Mail, Github, Chrome, LogIn } from 'lucide-react';
import { motion } from 'motion/react';

export default function Auth() {
  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-[#1a1b1e] p-8 rounded-2xl border border-white/5 shadow-2xl"
      >
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <span className="text-4xl font-black italic tracking-tighter">ani<span className="text-primary">watch</span></span>
          </div>
          <h2 className="text-2xl font-bold">Welcome Back</h2>
          <p className="text-text-secondary mt-2">Login to your account to continue</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white text-black py-3 rounded-lg font-bold hover:bg-gray-100 transition-all"
          >
            <Chrome className="w-5 h-5" /> Continue with Google
          </button>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#1a1b1e] px-2 text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-semibold transition-all">
              <Mail className="w-4 h-4" /> Email
            </button>
            <button className="flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-semibold transition-all">
              <Github className="w-4 h-4" /> GitHub
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-gray-500">
          By continuing, you agree to our <a href="#" className="text-primary hover:underline">Terms of Service</a> and <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
        </p>
      </motion.div>
    </div>
  );
}
