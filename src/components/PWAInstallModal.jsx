import React, { useState, useEffect } from 'react';
import { Download, CheckCircle, ShieldCheck, X, Smartphone, Sparkles, ExternalLink } from 'lucide-react';

export default function PWAInstallModal({ isOpen, onClose }) {
  const [installPrompt, setInstallPrompt] = useState(() => (typeof window !== 'undefined' ? window.deferredPrompt : null));
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      window.isAppInstalled === true
    );
  });
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (window.deferredPrompt) {
      setInstallPrompt(window.deferredPrompt);
    }

    const handlePrompt = (e) => {
      e.preventDefault();
      window.deferredPrompt = e;
      setInstallPrompt(e);
    };

    const handleReady = () => {
      if (window.deferredPrompt) {
        setInstallPrompt(window.deferredPrompt);
      }
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallSuccess(true);
      setInstallPrompt(null);
      window.deferredPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('pwa-prompt-ready', handleReady);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('pwa-prompt-ready', handleReady);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDirectInstall = async () => {
    setIsInstalling(true);
    let promptEvent = window.deferredPrompt || installPrompt;

    // Retry briefly if event is arriving
    if (!promptEvent) {
      for (let i = 0; i < 5; i++) {
        await new Promise((r) => setTimeout(r, 200));
        promptEvent = window.deferredPrompt || installPrompt;
        if (promptEvent) break;
      }
    }

    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice && choice.outcome === 'accepted') {
          setInstallSuccess(true);
          window.deferredPrompt = null;
          setInstallPrompt(null);
          setTimeout(() => {
            onClose();
          }, 1800);
        }
      } catch (err) {
        console.error('[PWA Install Error]:', err);
      } finally {
        setIsInstalling(false);
      }
    } else {
      setIsInstalling(false);
    }
  };

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        className="premium-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '380px',
          background: '#ffffff',
          borderRadius: '24px',
          padding: '24px 20px',
          boxShadow: '0 25px 50px -12px rgba(6, 78, 59, 0.25), 0 0 0 1px rgba(16, 185, 129, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
          animation: 'chatSlideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#f1f5f9',
            border: 'none',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
        >
          <X size={18} />
        </button>

        {/* App Icon Container */}
        <div
          style={{
            position: 'relative',
            width: '76px',
            height: '76px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, #047857 0%, #10b981 100%)',
            padding: '3px',
            boxShadow: '0 10px 24px rgba(16, 185, 129, 0.3)',
            marginBottom: '14px',
            flexShrink: 0
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '15px',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}
          >
            <img
              src="/whatsbro_logo.png"
              alt="Subi e-Sevai Logo"
              style={{ width: '85%', height: '85%', objectFit: 'contain' }}
            />
          </div>
          <span
            style={{
              position: 'absolute',
              bottom: '-4px',
              right: '-4px',
              background: '#047857',
              color: '#ffffff',
              borderRadius: '50%',
              width: '22px',
              height: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #ffffff',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
            }}
          >
            <CheckCircle size={14} />
          </span>
        </div>

        {/* App Title & Verification Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: '#064e3b', letterSpacing: '-0.02em' }}>
            SUBI e-Sevai
          </h3>
          <span
            style={{
              fontSize: '0.62rem',
              fontWeight: '800',
              background: '#dcfce7',
              color: '#047857',
              padding: '2px 7px',
              borderRadius: '10px',
              border: '1px solid #bbf7d0'
            }}
          >
            CSC Verified
          </span>
        </div>
        <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>
          Official Government Certificate & Job Portal App
        </p>

        {/* Success State */}
        {installSuccess ? (
          <div
            style={{
              width: '100%',
              background: '#ecfdf5',
              border: '1.5px solid #a7f3d0',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '16px',
              color: '#047857'
            }}
          >
            <Sparkles size={28} style={{ color: '#10b981', margin: '0 auto 6px auto', display: 'block' }} />
            <div style={{ fontWeight: '800', fontSize: '0.95rem' }}>Successfully Installed!</div>
            <div style={{ fontSize: '0.75rem', marginTop: '2px' }}>
              Subi e-Sevai is now available on your device's home screen.
            </div>
          </div>
        ) : isInstalled ? (
          <div
            style={{
              width: '100%',
              background: '#f0fdf4',
              border: '1.5px solid #bbf7d0',
              borderRadius: '16px',
              padding: '14px',
              marginBottom: '16px',
              color: '#047857'
            }}
          >
            <CheckCircle size={24} style={{ color: '#059669', margin: '0 auto 4px auto', display: 'block' }} />
            <div style={{ fontWeight: '800', fontSize: '0.9rem' }}>App Already Installed</div>
            <div style={{ fontSize: '0.74rem', marginTop: '2px' }}>
              You can find Subi e-Sevai in your apps list or home screen.
            </div>
          </div>
        ) : (
          <>
            {/* Feature Highlights Grid */}
            <div
              style={{
                width: '100%',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginBottom: '18px',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.76rem', color: '#334155', fontWeight: '700' }}>
                <span style={{ color: '#10b981' }}>⚡</span> 1-Tap Home Screen Instant Access
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.76rem', color: '#334155', fontWeight: '700' }}>
                <span style={{ color: '#10b981' }}>🔔</span> Live Certificate Status & Job Notifications
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.76rem', color: '#334155', fontWeight: '700' }}>
                <span style={{ color: '#10b981' }}>📱</span> Ultra-Fast Lightweight App (&lt; 1 MB)
              </div>
            </div>

            {/* Direct Install CTA Button */}
            <button
              onClick={handleDirectInstall}
              disabled={isInstalling}
              className="premium-btn premium-btn-primary"
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '0.92rem',
                fontWeight: '800',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #047857 0%, #10b981 100%)',
                color: '#ffffff',
                border: 'none',
                boxShadow: '0 8px 20px rgba(16, 185, 129, 0.35)',
                cursor: 'pointer',
                transition: 'transform 0.15s ease'
              }}
            >
              <Download size={18} strokeWidth={2.4} />
              {isInstalling ? 'Opening Installer...' : 'Install App Directly'}
            </button>

            {/* In-Browser Guidance if Native Prompt Was Suppressed */}
            {!installPrompt && (
              <div style={{ marginTop: '14px', fontSize: '0.72rem', color: '#64748b', lineHeight: '1.4' }}>
                {isIOS ? (
                  <div style={{ background: '#f0fdf4', padding: '8px 10px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                    Tap <strong style={{ color: '#047857' }}>Share (⎙)</strong> in Safari, then tap <strong style={{ color: '#047857' }}>"Add to Home Screen"</strong>.
                  </div>
                ) : (
                  <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    💡 If prompt doesn't open: Tap Chrome's <strong style={{ color: '#0f172a' }}>Install icon (⊕)</strong> in the top address bar.
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
