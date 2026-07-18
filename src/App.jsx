import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import UserPortal from './pages/UserPortal';
import AdminPortal from './pages/AdminPortal';
import OgGenerator from './pages/OgGenerator';
import { Home, FileText, CheckCircle, Plus, Users, X, Briefcase, MessageSquare, ShoppingBag, Package, Megaphone } from 'lucide-react';
import { registerUser, loginUser, sendOtp, verifyOtp, getSettings } from './services/db';

function TrollPage() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      minHeight: '70vh',
      width: '100%',
      background: 'radial-gradient(circle at 50% 50%, #f8fafc 0%, #f1f5f9 100%)'
    }}>
      <div className="premium-card text-center" style={{
        maxWidth: '480px',
        width: '100%',
        padding: '32px 24px',
        borderRadius: '24px',
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        animation: 'float-card 4s ease-in-out infinite'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: '#fee2e2',
          border: '1.5px solid #fca5a5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ef4444',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)'
        }}>
          <span style={{ fontSize: '1.8rem' }}>💡</span>
        </div>

        <div style={{ textAlign: 'center' }}>
          <h2 style={{
            fontSize: '1.4rem',
            fontWeight: '900',
            color: '#1e293b',
            margin: '0 0 6px 0',
            fontFamily: 'system-ui, sans-serif'
          }}>
            வீரன் பல்பு வாங்கிய தருணம்
          </h2>
          <p style={{
            margin: 0,
            fontSize: '0.85rem',
            color: '#64748b',
            fontWeight: '600'
          }}>
            Restricted Admin access area!, Bye
          </p>
        </div>

        <div style={{
          borderRadius: '16px',
          overflow: 'hidden',
          border: '2px solid #e2e8f0',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
          background: '#f8fafc',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <img
            src="/vadivelu_meme.png"
            alt="வீரம் பல்பு வாங்கிய தருணம்"
            style={{ width: '100%', objectFit: 'contain', display: 'block' }}
          />
        </div>

        <button
          onClick={() => window.location.replace('/user')}
          className="premium-btn premium-btn-primary"
          style={{
            padding: '11px 24px',
            borderRadius: '12px',
            border: 'none',
            fontWeight: '800',
            fontSize: '0.85rem',
            cursor: 'pointer',
            width: '100%',
            marginTop: '8px'
          }}
        >
          Return to Safety...
        </button>
      </div>
    </div>
  );
}

function PortalLayout() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Auth state
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('whatsbro_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [systemSettings, setSystemSettings] = useState({});

  useEffect(() => {
    getSettings().then(data => {
      if (data) setSystemSettings(data);
    }).catch(err => console.error('Failed to load settings in App.jsx', err));
  }, []);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Login form state
  const [loginPhone, setLoginPhone] = useState('');
  const [loginAadharPrefix, setLoginAadharPrefix] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAadhar, setRegAadhar] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [otpSending, setOtpSending] = useState(false);

  // Alerts and loading
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Determine if active route is admin or user
  const isAdmin = location.pathname.toLowerCase().startsWith('/tnkpadmin');

  // Read active tab, default based on portal type with automatic bounds verification
  const rawTab = searchParams.get('tab');
  const activeTab = isAdmin
    ? (['posts', 'forms', 'users', 'jobs', 'products', 'announcements', 'settings', 'og'].includes(rawTab) ? rawTab : 'posts')
    : (['home', 'apply', 'jobs', 'accessories'].includes(rawTab) ? rawTab : 'home');

  const handleTabChange = (tabName) => {
    setSearchParams({ tab: tabName });
  };

  const handleLogout = () => {
    localStorage.removeItem('whatsbro_user');
    setCurrentUser(null);
    window.location.replace('/user');
  };

  const handleUpdateProfile = (updatedUser) => {
    localStorage.setItem('whatsbro_user', JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setIsLoading(true);

    try {
      if (!loginPhone) throw new Error('Please enter your Phone number.');
      if (!loginAadharPrefix || loginAadharPrefix.length !== 4) throw new Error('Please enter the first 4 digits of your Aadhaar number.');

      const payload = {
        phone: loginPhone,
        aadhar_prefix: loginAadharPrefix
      };

      const user = await loginUser(payload);
      localStorage.setItem('whatsbro_user', JSON.stringify(user));
      setCurrentUser(user);
      setAuthSuccess('Welcome back! Login successful.');
      setTimeout(() => {
        setIsAuthModalOpen(false);
        setLoginPhone('');
        setLoginAadharPrefix('');
        setAuthSuccess('');
      }, 1000);
    } catch (err) {
      setAuthError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setIsLoading(true);

    try {
      if (!regName) throw new Error('Please enter your full Name.');
      if (!regPhone) throw new Error('Please enter your Phone number.');
      if (!regAadhar || regAadhar.length !== 12) throw new Error('Please enter a valid 12-digit Aadhaar number.');
      if (!regEmail) throw new Error('Please enter your Email ID.');
      if (!otpSent) throw new Error('Please verify your email with OTP first.');
      if (!otpValue) throw new Error('Please enter the OTP sent to your email.');

      // Verify OTP first
      const otpResult = await verifyOtp(regEmail, otpValue);
      if (!otpResult || !otpResult.verified) {
        throw new Error('Invalid or expired OTP. Please request a new one.');
      }

      const payload = {
        name: regName,
        phone: regPhone,
        aadhar: regAadhar,
        email: regEmail
      };

      const user = await registerUser(payload);
      localStorage.setItem('whatsbro_user', JSON.stringify(user));
      setCurrentUser(user);
      setAuthSuccess('Registration successful! Profile created.');
      setTimeout(() => {
        setIsAuthModalOpen(false);
        setRegName('');
        setRegPhone('');
        setRegAadhar('');
        setRegEmail('');
        setOtpSent(false);
        setOtpValue('');
        setAuthSuccess('');
      }, 1000);
    } catch (err) {
      setAuthError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!regEmail) {
      setAuthError('Please enter your Email ID first.');
      return;
    }
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) {
      setAuthError('Please enter a valid email address.');
      return;
    }
    setOtpSending(true);
    setAuthError('');
    try {
      await sendOtp(regEmail);
      setOtpSent(true);
      setAuthSuccess('OTP sent to ' + regEmail + '. Please check your inbox.');
    } catch (err) {
      setAuthError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setOtpSending(false);
    }
  };

  return (
    <div className="layout-viewport-container">

      {/* Centered Mobile Container Viewport */}
      <div className="app-mobile-container" style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>

        {/* Header - Fixed at the top */}
        <Header
          currentUser={currentUser}
          onLogout={handleLogout}
          onLoginTrigger={() => {
            setAuthError('');
            setAuthSuccess('');
            setIsRegisterMode(false);
            setIsAuthModalOpen(true);
          }}
          isAdmin={isAdmin}
        />

        {/* Scrollable Frame Content (Main Routes) */}
        <div className="mobile-frame-content" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

          {/* Main Contents */}
          <main style={{ flex: 1, paddingBottom: '20px' }}>
            <Routes>
              <Route path="/user" element={<UserPortal currentUser={currentUser} onUpdateProfile={handleUpdateProfile} onLoginTrigger={(prefillPhone, prefillAadharPrefix) => { setAuthError(''); setAuthSuccess(''); setIsRegisterMode(false); if (prefillPhone) setLoginPhone(prefillPhone); if (prefillAadharPrefix) setLoginAadharPrefix(prefillAadharPrefix); setIsAuthModalOpen(true); }} />} />
              <Route path="/tnkpadmin" element={<AdminPortal />} />
              <Route path="/admin/og-generator" element={<OgGenerator />} />
              <Route path="/admin" element={<TrollPage />} />
              <Route path="*" element={<Navigate to="/user" replace />} />
            </Routes>
          </main>

        </div>

        {/* Footer - Fixed at the bottom above bottom nav */}
        <Footer systemSettings={systemSettings} />

        {/* Global Bottom Sticky Menu */}
        {isAdmin ? (
          <div className="bottom-nav-bar">
            <button
              onClick={() => handleTabChange('posts')}
              className={`bottom-nav-item ${activeTab === 'posts' ? 'active' : ''}`}
            >
              <Home className="bottom-nav-icon" size={20} />
              <span>Posts</span>
            </button>
            <button
              onClick={() => handleTabChange('forms')}
              className={`bottom-nav-item ${activeTab === 'forms' ? 'active' : ''}`}
            >
              <Plus className="bottom-nav-icon" size={20} />
              <span>Templates</span>
            </button>
            <button
              onClick={() => handleTabChange('users')}
              className={`bottom-nav-item ${activeTab === 'users' ? 'active' : ''}`}
            >
              <Users className="bottom-nav-icon" size={20} />
              <span>Submissions</span>
            </button>
            <button
              onClick={() => handleTabChange('jobs')}
              className={`bottom-nav-item ${activeTab === 'jobs' ? 'active' : ''}`}
            >
              <Briefcase className="bottom-nav-icon" size={20} />
              <span>Jobs</span>
            </button>
            <button
              onClick={() => handleTabChange('products')}
              className={`bottom-nav-item ${activeTab === 'products' ? 'active' : ''}`}
            >
              <Package className="bottom-nav-icon" size={20} />
              <span>Products</span>
            </button>
            <button
              onClick={() => handleTabChange('announcements')}
              className={`bottom-nav-item ${activeTab === 'announcements' ? 'active' : ''}`}
            >
              <Megaphone className="bottom-nav-icon" size={20} />
              <span>Ads</span>
            </button>
          </div>
        ) : (
          <div className="bottom-nav-bar">
            <button
              onClick={() => handleTabChange('home')}
              className={`bottom-nav-item ${activeTab === 'home' ? 'active' : ''}`}
            >
              <Home className="bottom-nav-icon" size={20} />
              <span>Home</span>
            </button>
            <button
              onClick={() => handleTabChange('apply')}
              className={`bottom-nav-item ${activeTab === 'apply' ? 'active' : ''}`}
            >
              <FileText className="bottom-nav-icon" size={20} />
              <span>Application</span>
            </button>
            <button
              onClick={() => handleTabChange('jobs')}
              className={`bottom-nav-item ${activeTab === 'jobs' ? 'active' : ''}`}
            >
              <Briefcase className="bottom-nav-icon" size={20} />
              <span>Job alerts</span>
            </button>
            <button
              onClick={() => handleTabChange('accessories')}
              className={`bottom-nav-item ${activeTab === 'accessories' ? 'active' : ''}`}
            >
              <ShoppingBag className="bottom-nav-icon" size={20} />
              <span>Accessories</span>
            </button>
          </div>
        )}

        {/* Authentication Modal */}
        {isAuthModalOpen && (
          <div className="modal-overlay" style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            zIndex: 9999,
            padding: '16px',
            paddingTop: '60px'
          }}>
            <div className="auth-card" style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '360px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              position: 'relative'
            }}>
              {/* Close Button */}
              <button
                onClick={() => setIsAuthModalOpen(false)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer'
                }}
              >
                <X size={20} />
              </button>

              {/* Title Header */}
              <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                  {isRegisterMode ? 'Register Profile' : 'User Verification'}
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px', marginBottom: 0, lineHeight: '1.4' }}>
                  {isRegisterMode ? 'Create a profile to easily apply for certificates' : 'Sign in to access your stored applications & prefill forms'}
                </p>
              </div>

              {/* Success / Error Alerts */}
              {authError && (
                <div style={{ padding: '8px 12px', backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', borderRadius: '4px', color: '#991b1b', fontSize: '0.8rem' }}>
                  {authError}
                </div>
              )}
              {authSuccess && (
                <div style={{ padding: '8px 12px', backgroundColor: '#f0fdf4', borderLeft: '4px solid #10b981', borderRadius: '4px', color: '#166534', fontSize: '0.8rem' }}>
                  {authSuccess}
                </div>
              )}

              {/* Form Content */}
              {!isRegisterMode ? (
                // Login Form
                <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Phone Input */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#334155' }}>Phone Number *</label>
                    <input
                      type="tel"
                      placeholder="Enter registered mobile number"
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(e.target.value)}
                      required
                      maxLength={10}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#1e293b',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>

                  {/* Aadhar First 4 Digits */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#334155' }}>Aadhaar First 4 Digits *</label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="Enter first 4 digits of Aadhaar"
                      value={loginAadharPrefix}
                      onChange={(e) => setLoginAadharPrefix(e.target.value.replace(/\D/g, ''))}
                      required
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#1e293b',
                        fontSize: '0.85rem',
                        letterSpacing: '4px',
                        textAlign: 'center',
                        fontWeight: '700'
                      }}
                    />
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>For security, only the first 4 digits are needed</span>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      fontWeight: '600',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      marginTop: '8px',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    {isLoading ? 'Verifying...' : 'Login'}
                  </button>

                  {/* Toggle Link */}
                  <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '0.8rem', color: '#64748b' }}>
                    Don't have a profile?{' '}
                    <span
                      onClick={() => { setIsRegisterMode(true); setAuthError(''); setAuthSuccess(''); }}
                      style={{ color: '#10b981', cursor: 'pointer', fontWeight: '600' }}
                    >
                      Register Now
                    </span>
                  </div>
                </form>
              ) : (
                // Register Form
                <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Full Name */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#334155' }}>Full Name *</label>
                    <input
                      type="text"
                      placeholder="Enter full name"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      required
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#1e293b',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>

                  {/* Phone */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#334155' }}>Phone Number *</label>
                    <input
                      type="tel"
                      placeholder="Enter mobile number"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      required
                      maxLength={10}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#1e293b',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>

                  {/* Aadhaar */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#334155' }}>Aadhaar Number * <span style={{ fontSize: '0.6rem', color: '#ef4444' }}>(Permanent - cannot change later)</span></label>
                    <input
                      type="text"
                      maxLength={12}
                      placeholder="Enter 12-digit Aadhaar number"
                      value={regAadhar}
                      onChange={(e) => setRegAadhar(e.target.value.replace(/\D/g, ''))}
                      required
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#1e293b',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>

                  {/* Email + OTP */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#334155' }}>Email ID * <span style={{ fontSize: '0.6rem', color: '#ef4444' }}>(Permanent - cannot change later)</span></label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="email"
                        placeholder="Enter email address"
                        value={regEmail}
                        onChange={(e) => { setRegEmail(e.target.value); if (otpSent) { setOtpSent(false); setOtpValue(''); } }}
                        required
                        disabled={otpSent}
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: otpSent ? '#f1f5f9' : '#ffffff',
                          color: '#1e293b',
                          fontSize: '0.85rem',
                          flex: 1
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={otpSending || otpSent}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: otpSent ? '#10b981' : '#3b82f6',
                          color: '#ffffff',
                          fontWeight: '700',
                          fontSize: '0.7rem',
                          cursor: otpSent ? 'default' : 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s'
                        }}
                      >
                        {otpSending ? '...' : otpSent ? '✓ Sent' : 'Send OTP'}
                      </button>
                    </div>
                  </div>

                  {/* OTP Input - only shown after OTP sent */}
                  {otpSent && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#334155' }}>Enter OTP *</label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="Enter 6-digit OTP from email"
                        value={otpValue}
                        onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                        required
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #10b981',
                          backgroundColor: '#f0fdf4',
                          color: '#1e293b',
                          fontSize: '0.85rem',
                          letterSpacing: '6px',
                          textAlign: 'center',
                          fontWeight: '700'
                        }}
                      />
                      <span style={{ fontSize: '0.65rem', color: '#10b981' }}>OTP sent to {regEmail}. Valid for 5 minutes.</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading || !otpSent}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: (!otpSent) ? '#94a3b8' : '#10b981',
                      color: '#ffffff',
                      fontWeight: '600',
                      fontSize: '0.85rem',
                      cursor: (!otpSent) ? 'not-allowed' : 'pointer',
                      marginTop: '8px',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    {isLoading ? 'Creating...' : 'Verify OTP & Register'}
                  </button>

                  {/* Toggle Link */}
                  <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '0.8rem', color: '#64748b' }}>
                    Already registered?{' '}
                    <span
                      onClick={() => { setIsRegisterMode(false); setAuthError(''); setAuthSuccess(''); }}
                      style={{ color: '#10b981', cursor: 'pointer', fontWeight: '600' }}
                    >
                      Login Now
                    </span>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        animation: 'fadeOut 0.5s ease-in-out 1.5s forwards'
      }}>
        <style>{`
          @keyframes slideUpFade {
            0% { transform: translateY(30px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
          @keyframes pulseScale {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          @keyframes fadeOut {
            to { opacity: 0; visibility: hidden; }
          }
        `}</style>
        <div style={{
          animation: 'slideUpFade 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          <img
            src="/whatsbro_logo.png"
            alt="Logo"
            style={{
              width: '240px',
              height: '240px',
              objectFit: 'contain',
              animation: 'pulseScale 2s ease-in-out infinite'
            }}
          />
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '900',
            color: '#1e293b',
            margin: 0,
            letterSpacing: '-1px'
          }}>
            SUBI Online Service
          </h1>
          <p style={{ color: '#64748b', fontSize: '1rem', fontWeight: '600', margin: 0 }}>
            Online Service Portal
          </p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <PortalLayout />
    </BrowserRouter>
  );
}
