import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, CheckCircle, HelpCircle, FileText, CreditCard, Download, Search, Shield, User, Award, MoreHorizontal } from 'lucide-react';

export default function WhatsAppChatbot({ systemSettings }) {
  const [isOpen, setIsOpen] = useState(false);
  const [customText, setCustomText] = useState('');
  const [hiddenByPage, setHiddenByPage] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleHideEvent = (e) => {
      setHiddenByPage(!!e.detail);
    };
    window.addEventListener('hide-whatsapp-chatbot', handleHideEvent);
    return () => window.removeEventListener('hide-whatsapp-chatbot', handleHideEvent);
  }, []);

  // Auto-close chatbot popup when user clicks anywhere outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isOpen && containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  if (hiddenByPage) return null;

  // Extract phone number from settings or default to official support number
  const rawNumber = systemSettings?.admin_whatsapp_number || '919787973615';
  const cleanNumber = rawNumber.replace(/\D/g, '') || '919787973615';

  const sendToWhatsApp = (messageText) => {
    if (!messageText || !messageText.trim()) return;
    const encoded = encodeURIComponent(messageText.trim());
    const waUrl = `https://api.whatsapp.com/send?phone=${cleanNumber}&text=${encoded}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleQuickQuestion = (text) => {
    sendToWhatsApp(text);
  };

  const handleCustomSend = (e) => {
    e.preventDefault();
    if (!customText.trim()) return;
    sendToWhatsApp(customText);
    setCustomText('');
  };

  const chatbotServices = [
    { label: 'E-Sevai Services', icon: FileText, color: '#10b981', bg: '#ecfdf5', text: "Hi Subi E-Sevai, I want information on E-Sevai Services (Community, Income, Nativity, First Graduate, etc.)." },
    { label: 'PAN Card Services', icon: CreditCard, color: '#3b82f6', bg: '#eff6ff', text: "Hi Subi E-Sevai, I need help with PAN Card New Application / Correction." },
    { label: 'Voter ID Services', icon: Award, color: '#8b5cf6', bg: '#f5f3ff', text: "Hi Subi E-Sevai, I want to apply for Voter ID New / Address Correction / Replacement." },
    { label: 'Smart Card (Ration Card)', icon: Shield, color: '#f59e0b', bg: '#fffbeb', text: "Hi Subi E-Sevai, I need details regarding Smart Card (Ration Card) updates." },
    { label: 'Aadhaar Card Services', icon: User, color: '#06b6d4', bg: '#ecfeff', text: "Hi Subi E-Sevai, I need help with Aadhaar Card Update & verification." },
    { label: 'e-Shram Card', icon: FileText, color: '#ec4899', bg: '#fdf2f8', text: "Hi Subi E-Sevai, I want to apply or download my e-Shram Card." },
    { label: 'Certificate Download', icon: Download, color: '#14b8a6', bg: '#f0fdfa', text: "Hi Subi E-Sevai, I want to download my issued Certificate." },
    { label: 'Application Status Check', icon: Search, color: '#047857', bg: '#f0fdf4', text: "Hi Subi E-Sevai, I want to check my Application Status." },
    { label: 'More Services / Support', icon: MoreHorizontal, color: '#6366f1', bg: '#eef2ff', text: "Hi Subi E-Sevai, I want to inquire about more services / speak with support officer." },
  ];

  return (
    <div ref={containerRef} style={{ position: 'fixed', bottom: '85px', right: '18px', zIndex: 9998, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* 1. FLOATING CHAT TRIGGER BUTTON */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '30px',
            padding: '10px 16px',
            boxShadow: '0 8px 24px rgba(37, 211, 102, 0.4)',
            cursor: 'pointer',
            fontWeight: '800',
            fontSize: '0.85rem',
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.06) translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 28px rgba(37, 211, 102, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1) translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(37, 211, 102, 0.4)';
          }}
        >
          {/* Online Indicator Dot */}
          <span style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            width: '12px',
            height: '12px',
            backgroundColor: '#22c55e',
            border: '2px solid #ffffff',
            borderRadius: '50%',
            boxShadow: '0 0 8px #22c55e'
          }} />

          {/* WhatsApp Icon */}
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.335 4.978L2 22l5.188-1.36a9.924 9.924 0 0 0 4.822 1.254h.005c5.507 0 9.99-4.478 9.99-9.984 0-2.67-1.037-5.18-2.92-7.062C17.195 3.03 14.686 2 12.012 2zm0 1.664c2.227 0 4.321.868 5.898 2.445 1.577 1.578 2.446 3.673 2.446 5.89a8.31 8.31 0 0 1-8.344 8.32h-.004a8.272 8.272 0 0 1-4.218-1.155l-.303-.18-3.138.823.837-3.06-.197-.314a8.278 8.278 0 0 1-1.267-4.32c0-4.587 3.737-8.32 8.34-8.32h.05zm-3.666 4.757c-.202 0-.398.077-.547.228-.27.272-.733.722-.733 1.761 0 1.04.753 2.04.858 2.18.106.14 1.482 2.264 3.59 3.175.502.217.893.347 1.198.444.505.161.965.138 1.328.084.406-.06 1.24-.507 1.414-.997.174-.49.174-.91.122-.997-.052-.088-.192-.14-.403-.245s-1.24-.613-1.432-.683c-.193-.07-.333-.105-.473.105-.14.21-.543.684-.666.824-.122.14-.245.158-.456.053-.21-.105-.888-.327-1.692-1.045-.625-.558-1.047-1.247-1.17-1.458-.122-.21-.013-.324.092-.43.095-.095.21-.245.315-.368.105-.123.14-.21.21-.35.07-.14.035-.263-.017-.369-.053-.105-.473-1.14-.648-1.562-.17-.41-.356-.35-.49-.356h-.233z" />
          </svg>
          
          <span>24/7 WhatsApp Chatbot</span>
        </button>
      )}

      {/* 2. CHATBOT POPUP WINDOW */}
      {isOpen && (
        <div style={{
          width: '350px',
          maxWidth: 'calc(100vw - 36px)',
          height: '480px',
          maxHeight: 'calc(100vh - 120px)',
          backgroundColor: '#efeae2', // Official WhatsApp Wallpaper beige
          borderRadius: '18px',
          boxShadow: '0 20px 35px rgba(0, 0, 0, 0.25), 0 4px 10px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
          animation: 'chatSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}>
          <style>{`
            @keyframes chatSlideUp {
              0% { opacity: 0; transform: translateY(20px) scale(0.95); }
              100% { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>

          {/* HEADER */}
          <div style={{
            backgroundColor: '#075e54', // Dark WhatsApp Green
            color: '#ffffff',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #054c44'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative' }}>
                <img
                  src="/whatsbro_avatar.png"
                  alt="Assistant Avatar"
                  style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'contain', backgroundColor: '#ffffff', padding: '2px', border: '1px solid #25d366' }}
                />
                <span style={{
                  position: 'absolute',
                  bottom: '1px',
                  right: '1px',
                  width: '9px',
                  height: '9px',
                  backgroundColor: '#22c55e',
                  border: '1.5px solid #075e54',
                  borderRadius: '50%'
                }} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '800', color: '#ffffff' }}>
                  Subi e sevai 24/7 Chatbot
                </h4>
                <div style={{ fontSize: '0.65rem', color: '#86efac', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <span>● Online 24/7</span> • <span>Replies Instantly</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                color: '#ffffff',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            >
              <X size={18} />
            </button>
          </div>

          {/* CHAT BODY AREA */}
          <div style={{
            flex: 1,
            padding: '14px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {/* Timestamp Badge */}
            <div style={{ textAlign: 'center', margin: '4px 0' }}>
              <span style={{ background: 'rgba(255,255,255,0.75)', color: '#64748b', fontSize: '0.62rem', padding: '3px 8px', borderRadius: '10px', fontWeight: '600' }}>
                Today • 24/7 Automated Assistant
              </span>
            </div>

            {/* BOT WELCOME BUBBLE */}
            <div style={{
              alignSelf: 'flex-start',
              maxWidth: '88%',
              backgroundColor: '#ffffff',
              borderRadius: '0px 14px 14px 14px',
              padding: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Bot size={16} style={{ color: '#075e54' }} />
                <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#075e54' }}>Subi E-Sevai AI Assistant</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#1e293b', lineHeight: '1.45' }}>
                👋 <strong>Vanakkam! Welcome to Subi E-Sevai Online Helpdesk.</strong>
              </p>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.78rem', color: '#475569', lineHeight: '1.4' }}>
                How can we assist you today? Select a quick topic below or type your question:
              </p>
              <span style={{ fontSize: '0.6rem', color: '#94a3b8', display: 'block', textAlign: 'right', marginTop: '6px' }}>
                Just now
              </span>
            </div>

            {/* QUICK BOT ACTION BUTTONS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginTop: '4px' }}>
              {chatbotServices.map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleQuickQuestion(item.text)}
                    style={{
                      background: '#ffffff',
                      border: `1px solid ${item.color}`,
                      borderRadius: '10px',
                      padding: '9px 12px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      color: item.color,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = item.bg;
                      e.currentTarget.style.transform = 'translateX(2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <IconComponent size={15} style={{ color: item.color, flexShrink: 0 }} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* INPUT FORM FOOTER */}
          <form
            onSubmit={handleCustomSend}
            style={{
              padding: '10px 12px',
              backgroundColor: '#f0f2f5',
              borderTop: '1px solid #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <input
              type="text"
              placeholder="Type your message..."
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              style={{
                flex: 1,
                padding: '9px 14px',
                borderRadius: '20px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#1e293b',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={!customText.trim()}
              style={{
                backgroundColor: customText.trim() ? '#128C7E' : '#cbd5e1',
                color: '#ffffff',
                border: 'none',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: customText.trim() ? 'pointer' : 'default',
                transition: 'background-color 0.2s'
              }}
            >
              <Send size={16} />
            </button>
          </form>

        </div>
      )}

    </div>
  );
}
