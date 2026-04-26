import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingButton from '../components/ui/LoadingButton';
import toast from 'react-hot-toast';
import { SiGamejolt } from 'react-icons/si';
import { HiUser, HiMail, HiLockClosed, HiEye, HiEyeOff } from 'react-icons/hi';

const getPasswordStrength = (password) => {
  if (!password) return { level: 0, label: '', color: '' };
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isLong = password.length >= 8;
  const isMedium = password.length >= 6;

  if (isLong && hasUpper && hasNumber) return { level: 3, label: 'Strong', color: 'bg-green-500' };
  if (isMedium && (hasNumber || hasUpper)) return { level: 2, label: 'Medium', color: 'bg-amber-500' };
  if (password.length > 0) return { level: 1, label: 'Weak', color: 'bg-red-500' };
  return { level: 0, label: '', color: '' };
};

const RegisterPage = () => {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', role: 'player' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { username, email, password, confirmPassword, role } = form;

    if (!username || !email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const user = await register(username, email, password, role);
      const redirect = user.role === 'organizer' ? '/organizer' : '/dashboard';
      navigate(redirect, { replace: true });
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength(form.password);
  const confirmMatch = form.confirmPassword.length > 0 && form.password === form.confirmPassword;
  const confirmMismatch = form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

  const roles = [
    { value: 'player', label: '🎮 Player', bullets: ['Join scrims', 'Track results', 'Compete'] },
    { value: 'organizer', label: '🏆 Organizer', bullets: ['Host scrims', 'Manage slots', 'Earn money'] },
  ];

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-neon-cyan/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-primary-600/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-neon-cyan to-primary-600 rounded-xl flex items-center justify-center">
              <SiGamejolt className="text-white text-xl" />
            </div>
            <span className="text-2xl font-display font-bold text-white">
              Scrim<span className="text-neon-cyan">X</span>
            </span>
          </Link>
          <h1 className="text-2xl font-display font-bold text-white mt-4">Create your account</h1>
          <p className="text-dark-400 mt-1">Join the ultimate scrim platform</p>
        </div>

        <div className="glass-card p-8 rounded-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role selector */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">I am a</label>
              <div className="grid grid-cols-2 gap-3">
                {roles.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setForm({ ...form, role: r.value })}
                    className={`p-4 rounded-xl border text-left transition-all min-h-[5rem] ${
                      form.role === r.value
                        ? 'border-neon-cyan/50 bg-neon-cyan/5 shadow-lg shadow-neon-cyan/10'
                        : 'border-surface-border bg-dark-850 hover:border-dark-600'
                    }`}
                  >
                    <p className="text-sm font-semibold text-white mb-1.5">{r.label}</p>
                    <ul className="space-y-0.5">
                      {r.bullets.map(b => (
                        <li key={b} className="text-[11px] text-dark-400">• {b}</li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Username</label>
              <div className="relative">
                <HiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                <input
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="gamertag"
                  className="input-field pl-10"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <div className="relative">
                <HiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="input-field pl-10"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <HiLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="input-field pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white"
                >
                  {showPassword ? <HiEyeOff /> : <HiEye />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {form.password && (
                <div className="mt-2">
                  <div className="flex gap-1 h-1.5">
                    {[1, 2, 3].map(seg => (
                      <div
                        key={seg}
                        className={`flex-1 rounded-full transition-all duration-300 ${
                          strength.level >= seg ? strength.color : 'bg-dark-700'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-[11px] mt-1 ${
                    strength.level === 3 ? 'text-green-400' :
                    strength.level === 2 ? 'text-amber-400' :
                    'text-red-400'
                  }`}>
                    {strength.label}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm Password</label>
              <div className="relative">
                <HiLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`input-field pl-10 ${
                    confirmMatch ? 'border-green-500 focus:border-green-500' :
                    confirmMismatch ? 'border-red-500 focus:border-red-500' : ''
                  }`}
                />
              </div>
              {confirmMatch && <p className="text-xs text-green-400 mt-1">✓ Passwords match</p>}
              {confirmMismatch && <p className="text-xs text-red-400 mt-1">Passwords don't match</p>}
            </div>

            <LoadingButton
              type="submit"
              loading={loading}
              variant="primary"
              className="w-full py-3 text-sm"
            >
              Create Account
            </LoadingButton>
          </form>

          <p className="text-center text-sm text-dark-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-neon-cyan hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
