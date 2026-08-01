import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { Home, Plus, Users, Package, Megaphone, FileText, CheckCircle, Briefcase, X } from 'lucide-react';
import Header from './components/Header';
import Footer from './components/Footer';
import WhatsAppChatbot from './components/WhatsAppChatbot';
import UserPortal from './pages/UserPortal';
import AdminPortal from './pages/AdminPortal';
import OgGenerator from './pages/OgGenerator';
import InstallPwaBanner from './components/InstallPwaBanner';
import { registerUser, loginUser, getSettings } from './services/db';

// Web Audio API Synthesizer for Soft Mechanical Keyboard Typing Audio Feedback
const playTypingSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Soft warm mechanical key press pitch
    const pitch = 420 + Math.random() * 90;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.015);

    gain.gain.setValueAtTime(0.025, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.015);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.015);
  } catch (err) {
    // Ignore audio policy errors
  }
};

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
        animation: 'float-card 4s ease-in-out infinite',
        borderTop: '6px solid #ef4444'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#fef2f2',
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

  // Auto-scroll window and frame content to top whenever route or search parameters change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const frameContent = document.querySelector('.mobile-frame-content');
    if (frameContent) frameContent.scrollTop = 0;
  }, [location.pathname, location.search]);

  // Auth state
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('whatsbro_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [systemSettings, setSystemSettings] = useState(null);

  useEffect(() => {
    getSettings().then(data => {
      if (data) setSystemSettings(data);
    }).catch(err => console.error('Failed to load settings in App.jsx', err));
  }, []);



  // Global Keypress Typing Audio Feedback
  useEffect(() => {
    const handleGlobalKeydown = (e) => {
      const isInput = e.target.matches('input, textarea, [contenteditable="true"]');
      if (isInput && !['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Escape', 'Tab'].includes(e.key)) {
        playTypingSound();
      }
    };
    window.addEventListener('keydown', handleGlobalKeydown, { capture: true });
    return () => window.removeEventListener('keydown', handleGlobalKeydown, { capture: true });
  }, []);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Login form state (Phone + Aadhaar + Email)
  const [loginPhone, setLoginPhone] = useState('');
  const [loginAadhar, setLoginAadhar] = useState('');
  const [loginEmail, setLoginEmail] = useState('');

  // Alerts and loading
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(() => window.deferredPrompt || null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      window.deferredPrompt = e;
      console.log('[PWA] beforeinstallprompt event captured in App.jsx');
    };
    const handleCustomReady = () => {
      if (window.deferredPrompt) {
        setDeferredPrompt(window.deferredPrompt);
      }
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-prompt-ready', handleCustomReady);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-prompt-ready', handleCustomReady);
    };
  }, []);

  const handleInstallApp = () => {
    const promptEvent = window.deferredPrompt || deferredPrompt;
    if (promptEvent) {
      try {
        promptEvent.prompt();
        if (promptEvent.userChoice) {
          promptEvent.userChoice.then((choiceResult) => {
            if (choiceResult && choiceResult.outcome === 'accepted') {
              setDeferredPrompt(null);
              window.deferredPrompt = null;
            }
          });
        }
      } catch (err) {
        console.error('[PWA] Install prompt error:', err);
      }
    }
  };

  // Determine if active route is admin or user
  const isAdmin = location.pathname.toLowerCase().startsWith('/tnkpadmin');

  // Read active tab, default based on portal type with automatic bounds verification
  const rawTab = searchParams.get('tab');
  const activeTab = isAdmin
    ? (['posts', 'forms', 'users', 'jobs', 'products', 'announcements', 'settings', 'og'].includes(rawTab) ? rawTab : 'posts')
    : (['home', 'apply', 'jobs', 'status'].includes(rawTab) ? rawTab : 'home');

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
      const cleanP = loginPhone.replace(/\D/g, '');
      const cleanA = loginAadhar.replace(/\D/g, '');
      const cleanE = loginEmail.trim();

      if (!cleanP || cleanP.length !== 10) {
        throw new Error('Please enter a valid 10-digit Phone number.');
      }
      if (!cleanA || cleanA.length !== 12) {
        throw new Error('Please enter a valid 12-digit Aadhaar number.');
      }

      const payload = {
        phone: cleanP,
        aadhar: cleanA,
        email: cleanE
      };

      const user = await loginUser(payload);
      localStorage.setItem('whatsbro_user', JSON.stringify(user));
      setCurrentUser(user);
      setAuthSuccess('Logged in successfully!');
      setTimeout(() => {
        setIsAuthModalOpen(false);
        setLoginPhone('');
        setLoginAadhar('');
        setLoginEmail('');
        setAuthSuccess('');
      }, 600);
    } catch (err) {
      setAuthError(err.message || 'Login failed. Please check your details and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="layout-viewport-container">
      <InstallPwaBanner />

      {/* Centered Mobile Container Viewport */}
      <div className="app-mobile-container" style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {/* Fixed Header */}
        <Header
          currentUser={currentUser}
          onLogout={handleLogout}
          onInstallApp={handleInstallApp}
          onLoginTrigger={() => {
            setAuthError('');
            setAuthSuccess('');
            setIsRegisterMode(false);
            setIsAuthModalOpen(true);
          }}
          isAdmin={isAdmin}
          onLoginClick={() => {
            setAuthError('');
            setAuthSuccess('');
            setIsAuthModalOpen(true);
          }}
          onLogoutClick={handleLogout}
          onUpdateProfile={handleUpdateProfile}
          systemSettings={systemSettings}
        />

        {/* Scrollable Frame Content (Main Routes) */}
        <div className="mobile-frame-content" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

          {/* Main Contents */}
          <main style={{ flex: 1, paddingBottom: '20px' }}>
            <Routes>
              <Route path="/" element={<Navigate to="/user" replace />} />
              <Route path="/user" element={<UserPortal currentUser={currentUser} onUpdateProfile={handleUpdateProfile} onLoginTrigger={(prefillPhone, prefillAadhar) => { setAuthError(''); setAuthSuccess(''); setIsRegisterMode(false); if (prefillPhone) setLoginPhone(prefillPhone); if (prefillAadhar) setLoginAadhar(prefillAadhar); setIsAuthModalOpen(true); }} systemSettings={systemSettings} />} />
              <Route path="/tnkpadmin" element={<AdminPortal systemSettings={systemSettings} />} />
              <Route path="/admin/og-generator" element={<OgGenerator systemSettings={systemSettings} />} />
              <Route path="/form/:formId" element={<UserPortal currentUser={currentUser} onLoginTrigger={() => setIsAuthModalOpen(true)} systemSettings={systemSettings} />} />
              <Route path="/post/:postId" element={<UserPortal currentUser={currentUser} onLoginTrigger={() => setIsAuthModalOpen(true)} systemSettings={systemSettings} />} />
              <Route path="/admin" element={<TrollPage />} />
              <Route path="*" element={<Navigate to="/user" replace />} />
            </Routes>
          </main>

        </div>

        {/* 24/7 WhatsApp Floating Support Chatbot */}
        <WhatsAppChatbot systemSettings={systemSettings} />

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
              <span>Job Alerts</span>
            </button>
            <button
              onClick={() => handleTabChange('status')}
              className={`bottom-nav-item ${activeTab === 'status' ? 'active' : ''}`}
            >
              <CheckCircle className="bottom-nav-icon" size={20} />
              <span>Status Check</span>
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
                  Citizen Portal Entry
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px', marginBottom: 0, lineHeight: '1.4' }}>
                  Enter your Phone Number & Aadhaar Number to access your account or create a new profile.
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

              {/* Direct Login Form (Phone + Aadhaar) */}
              <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Phone Input */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#334155' }}>Phone Number *</label>
                  <input
                    type="tel"
                    placeholder="Enter 10-digit mobile number"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value.replace(/\D/g, ''))}
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

                {/* Aadhaar Input */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#334155' }}>Aadhaar Number *</label>
                  <input
                    type="text"
                    maxLength={12}
                    placeholder="Enter 12-digit Aadhaar number"
                    value={loginAadhar}
                    onChange={(e) => setLoginAadhar(e.target.value.replace(/\D/g, ''))}
                    required
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#1e293b',
                      fontSize: '0.85rem',
                      letterSpacing: '2px',
                      fontWeight: '600'
                    }}
                  />
                </div>

                {/* Email Input */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#334155' }}>Email Address (For E-Receipt)</label>
                  <input
                    type="email"
                    placeholder="Enter email address (e.g. name@gmail.com)"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#1e293b',
                      fontSize: '0.85rem'
                    }}
                  />
                  <span style={{ fontSize: '0.65rem', color: '#64748b' }}>E-Receipts for your submitted applications will be sent to this email.</span>
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
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    marginTop: '8px',
                    transition: 'background-color 0.2s'
                  }}
                >
                  {isLoading ? 'Signing in...' : 'Login / Enter Portal'}
                </button>
              </form>
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
            Subi e sevai
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
