import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, ArrowRight } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Dummy login logic
    console.log(`${activeTab} with:`, { email, password });
    onLoginSuccess();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="auth-overlay" onClick={onClose}>
          <motion.div
            className="auth-modal"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="auth-close" onClick={onClose}>
              <X size={20} />
            </button>

            <div className="auth-modal-content">
              <div className="auth-header">
                <div className="auth-logo">
                  <div className="brand-logo-css" style={{ margin: '0 auto', width: '40px', height: '40px', fontSize: '18px' }}>YC</div>
                </div>
                <h2 className="auth-title">
                  {activeTab === 'login' ? 'Welcome Back' : 'Create Account'}
                </h2>
                <p className="auth-sub">
                  {activeTab === 'login' 
                    ? 'Enter your credentials to access your reports' 
                    : 'Start your 14-day free trial today'}
                </p>
              </div>

              <div className="auth-tabs">
                <button
                  className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
                  onClick={() => setActiveTab('login')}
                >
                  Login
                </button>
                <button
                  className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`}
                  onClick={() => setActiveTab('signup')}
                >
                  Sign Up
                </button>
              </div>

              <form className="auth-form" onSubmit={handleSubmit}>
                <div className="auth-field">
                  <label className="auth-label">Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                    <input
                      type="email"
                      className="auth-input"
                      placeholder="name@company.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{ paddingLeft: '2.5rem' }}
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                    <input
                      type="password"
                      className="auth-input"
                      placeholder="••••••••"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{ paddingLeft: '2.5rem' }}
                    />
                  </div>
                </div>

                <button type="submit" className="auth-submit-btn">
                  {activeTab === 'login' ? 'Sign In' : 'Get Started'} <ArrowRight size={18} style={{ marginLeft: '8px', display: 'inline' }} />
                </button>
              </form>

              <div className="auth-divider">Or continue with</div>

              <button className="google-btn">
                <svg width="20" height="20" viewBox="0 0 24 24">
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
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </button>

              <div className="auth-footer">
                {activeTab === 'login' ? (
                  <>
                    Don't have an account?{' '}
                    <span className="auth-link" onClick={() => setActiveTab('signup')}>Sign up</span>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <span className="auth-link" onClick={() => setActiveTab('login')}>Login</span>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;
