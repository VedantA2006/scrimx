import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingButton from '../components/ui/LoadingButton';
import toast from 'react-hot-toast';
import { SiGamejolt } from 'react-icons/si';
import { HiMail, HiLockClosed, HiEye, HiEyeOff } from 'react-icons/hi';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || null;

  const validate = () => {
    const errs = { email: '', password: '' };
    let valid = true;

    if (!email) {
      errs.email = 'Email is required';
      valid = false;
    } else if (!email.includes('@') || !email.split('@')[1]?.includes('.')) {
      errs.email = 'Enter a valid email address';
      valid = false;
    }

    if (!password) {
      errs.password = 'Password is required';
      valid = false;
    }

    setErrors(errs);
    return valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const user = await login(email, password);
      const redirect = from || (user.role === 'admin' ? '/admin' : user.role === 'organizer' ? '/organizer' : '/dashboard');
      navigate(redirect, { replace: true });
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center px-4 py-12">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-purple/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-neon-cyan to-primary-600 rounded-xl flex items-center justify-center">
              <SiGamejolt className="text-white text-xl" />
            </div>
            <span className="text-2xl font-display font-bold text-white">
              Scrim<span className="text-neon-cyan">X</span>
            </span>
          </Link>
          <h1 className="text-2xl font-display font-bold text-white mt-4">Welcome back</h1>
          <p className="text-dark-400 mt-1">Sign in to your account</p>
        </div>

        {/* Form */}
        <div className="glass-card p-8 rounded-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <div className="relative">
                <HiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors(prev => ({ ...prev, email: '' })); }}
                  placeholder="you@example.com"
                  className={`input-field pl-10 ${errors.email ? 'border-red-500 focus:border-red-500' : ''}`}
                  autoComplete="email"
                />
              </div>
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <HiLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors(prev => ({ ...prev, password: '' })); }}
                  placeholder="••••••••"
                  className={`input-field pl-10 pr-10 ${errors.password ? 'border-red-500 focus:border-red-500' : ''}`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white"
                >
                  {showPassword ? <HiEyeOff /> : <HiEye />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password}</p>}
              <p className="text-xs text-dark-500 hover:text-dark-300 mt-1.5 cursor-pointer transition-colors">Forgot password?</p>
            </div>

            <LoadingButton
              type="submit"
              loading={loading}
              variant="primary"
              className="w-full py-3 text-sm"
            >
              Sign In
            </LoadingButton>
          </form>

          <p className="text-center text-sm text-dark-400 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-neon-cyan hover:underline font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
