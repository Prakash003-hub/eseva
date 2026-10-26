import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Send, Bot, ArrowLeft, RefreshCw, MessageCircle, ChevronRight, Maximize2, Minimize2, ExternalLink, Share2, Home } from 'lucide-react';
import { getPublishedFlows } from '../services/chatbotStorage';
import { playSelectSound } from '../utils/sound';

const CATEGORY_COLORS = [
  { border: '#10b981', color: '#047857', bg: '#ecfdf5', chevron: '#10b981' }, // Emerald Green
  { border: '#8b5cf6', color: '#6d28d9', bg: '#f5f3ff', chevron: '#8b5cf6' }, // Purple
  { border: '#3b82f6', color: '#1d4ed8', bg: '#eff6ff', chevron: '#3b82f6' }, // Blue
  { border: '#f59e0b', color: '#b45309', bg: '#fffbeb', chevron: '#f59e0b' }, // Amber
  { border: '#14b8a6', color: '#0f766e', bg: '#f0fdfa', chevron: '#14b8a6' }, // Teal
  { border: '#06b6d4', color: '#0e7490', bg: '#ecfeff', chevron: '#06b6d4' }, // Cyan
  { border: '#eab308', color: '#a16207', bg: '#fefce8', chevron: '#eab308' }, // Yellow
  { border: '#ec4899', color: '#be185d', bg: '#fdf2f8', chevron: '#ec4899' }, // Pink
  { border: '#6366f1', color: '#4338ca', bg: '#eef2ff', chevron: '#6366f1' }  // Indigo
];

export default function WhatsAppChatbot({ systemSettings }) {
  const location = useLocation();
  const isChatPage = location.pathname.toLowerCase().startsWith('/user/chatbot') || 
                     location.pathname.toLowerCase().startsWith('/chatbot') || 
                     location.pathname.toLowerCase().startsWith('/chat');

  const [isOpen, setIsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [customText, setCustomText] = useState('');
  const [hiddenByPage, setHiddenByPage] = useState(false);
  const [publishedFlows, setPublishedFlows] = useState(() => getPublishedFlows());

  // Navigation History Stack:
  // [] = Root (Main Categories)
  // [categoryNode] = Sub-selection of category (previous root categories hidden)
  // [categoryNode, childNode] = Deep child details (previous sub-selection hidden)
  const [navHistory, setNavHistory] = useState([]);
  
  // Custom query state (when user types a message in the input box)
  const [customQuery, setCustomQuery] = useState(null);

  const containerRef = useRef(null);
  const chatBodyRef = useRef(null);

  // Sync published flows if updated by admin
  useEffect(() => {
    const handlePublishedUpdate = () => {
      setPublishedFlows(getPublishedFlows());
    };
    window.addEventListener('chatbot-config-published', handlePublishedUpdate);
    return () => window.removeEventListener('chatbot-config-published', handlePublishedUpdate);
  }, []);

  // Event listener to hide floating chatbot on specific pages if requested
  useEffect(() => {
    const handleHideEvent = (e) => {
      setHiddenByPage(!!e.detail);
    };
    window.addEventListener('hide-whatsapp-chatbot', handleHideEvent);
    return () => window.removeEventListener('hide-whatsapp-chatbot', handleHideEvent);
  }, []);

  // Auto-close chatbot popup when clicking outside
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

  // Scroll to top of chat body whenever navigation changes
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = 0;
    }
  }, [navHistory, customQuery, isOpen]);

  if (hiddenByPage || isChatPage) return null;

  // Phone number formatter
  const formatWhatsAppNumber = (num) => {
    let clean = String(num || '').replace(/\D/g, '');
    if (!clean) return '919787973615';
    if (clean.length === 11 && clean.startsWith('0')) {
      clean = clean.slice(1);
    }
    if (clean.length === 10) {
      return `91${clean}`;
    }
    return clean;
  };

  const rawNumber = systemSettings?.admin_whatsapp_number || '919787973615';
  const cleanNumber = formatWhatsAppNumber(rawNumber);

  const sendToWhatsApp = (messageText) => {
    if (!messageText || !messageText.trim()) return;
    const encoded = encodeURIComponent(messageText.trim());
    const waUrl = `https://api.whatsapp.com/send?phone=${cleanNumber}&text=${encoded}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // Node selection: hide previous data, show new selection
  const handleNodeClick = (node) => {
    playSelectSound();
    setCustomQuery(null);
    setNavHistory((prev) => [...prev, node]);
  };

  // Back button: return and show previous data
  const handleBack = () => {
    playSelectSound();
    setCustomQuery(null);
    setNavHistory((prev) => prev.slice(0, -1));
  };

  // Reset to root categories
  const handleResetToMainMenu = () => {
    playSelectSound();
    setCustomQuery(null);
    setNavHistory([]);
  };

  // Action button click (WhatsApp, URL, Share)
  const handleActionClick = (action) => {
    playSelectSound();
    if (!action) return;
    if (action.type === 'url') {
      if (action.url.startsWith('http://') || action.url.startsWith('https://')) {
        window.open(action.url, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = action.url;
      }
    } else if (action.type === 'whatsapp_msg') {
      sendToWhatsApp(action.message);
    } else if (action.type === 'whatsapp_share') {
      const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(action.share_content || '')}`;
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Custom text submit
  const handleCustomSend = (e) => {
    e.preventDefault();
    if (!customText.trim()) return;

    const query = customText.trim();
    const defaultWaText = `Hi Subi E-Sevai, ${query} - விண்ணப்பிக்க என்னென்ன விவரங்கள் தேவை?`;
    
    // Open WhatsApp directly
    sendToWhatsApp(defaultWaText);

    setCustomQuery({
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      waText: defaultWaText
    });
    setCustomText('');
  };

  const currentNode = navHistory.length > 0 ? navHistory[navHistory.length - 1] : null;
  const isAtRoot = navHistory.length === 0 && !customQuery;
  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      ref={containerRef}
      style={isFullScreen ? {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      } : {
        position: 'fixed',
        bottom: '85px',
        right: '18px',
        zIndex: 9998,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      
      {/* 1. FLOATING CHAT TRIGGER BUTTON */}
      {!isOpen && (
        <>
          <style>{`
            @keyframes chatbotBorderPulse {
              0%, 100% {
                box-shadow: 0 0 0 2.5px #ffffff, 0 0 0 5.5px #10b981, 0 8px 24px rgba(16, 185, 129, 0.5);
              }
              50% {
                box-shadow: 0 0 0 2.5px #ffffff, 0 0 0 7.5px #059669, 0 12px 30px rgba(16, 185, 129, 0.75);
              }
            }
          `}</style>
          <button
            onClick={() => setIsOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
              color: '#ffffff',
              border: '2px solid #ffffff',
              borderRadius: '30px',
              padding: '10px 18px',
              boxShadow: '0 0 0 2.5px #ffffff, 0 0 0 5.5px #10b981, 0 8px 24px rgba(16, 185, 129, 0.5)',
              animation: 'chatbotBorderPulse 2.4s infinite ease-in-out',
              cursor: 'pointer',
              fontWeight: '800',
              fontSize: '0.85rem',
              letterSpacing: '0.01em',
              transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.animation = 'none';
              e.currentTarget.style.transform = 'scale(1.06) translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 0 0 2.5px #ffffff, 0 0 0 7px #047857, 0 14px 32px rgba(16, 185, 129, 0.8)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1) translateY(0)';
              e.currentTarget.style.boxShadow = '0 0 0 2.5px #ffffff, 0 0 0 5.5px #10b981, 0 8px 24px rgba(16, 185, 129, 0.5)';
              e.currentTarget.style.animation = 'chatbotBorderPulse 2.4s infinite ease-in-out';
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

          {/* WhatsApp SVG Icon */}
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.335 4.978L2 22l5.188-1.36a9.924 9.924 0 0 0 4.822 1.254h.005c5.507 0 9.99-4.478 9.99-9.984 0-2.67-1.037-5.18-2.92-7.062C17.195 3.03 14.686 2 12.012 2zm0 1.664c2.227 0 4.321.868 5.898 2.445 1.577 1.578 2.446 3.673 2.446 5.89a8.31 8.31 0 0 1-8.344 8.32h-.004a8.272 8.272 0 0 1-4.218-1.155l-.303-.18-3.138.823.837-3.06-.197-.314a8.278 8.278 0 0 1-1.267-4.32c0-4.587 3.737-8.32 8.34-8.32h.05zm-3.666 4.757c-.202 0-.398.077-.547.228-.27.272-.733.722-.733 1.761 0 1.04.753 2.04.858 2.18.106.14 1.482 2.264 3.59 3.175.502.217.893.347 1.198.444.505.161.965.138 1.328.084.406-.06 1.24-.507 1.414-.997.174-.49.174-.91.122-.997-.052-.088-.192-.14-.403-.245s-1.24-.613-1.432-.683c-.193-.07-.333-.105-.473.105-.14.21-.543.684-.666.824-.122.14-.245.158-.456.053-.21-.105-.888-.327-1.692-1.045-.625-.558-1.047-1.247-1.17-1.458-.122-.21-.013-.324.092-.43.095-.095.21-.245.315-.368.105-.123.14-.21.21-.35.07-.14.035-.263-.017-.369-.053-.105-.473-1.14-.648-1.562-.17-.41-.356-.35-.49-.356h-.233z" />
          </svg>
          
          <span>24/7 WhatsApp Chatbot</span>
        </button>
        </>
      )}

      {/* 2. CHATBOT POPUP WINDOW */}
      {isOpen && (
        <div style={isFullScreen ? {
          width: '100vw',
          maxWidth: '100vw',
          height: '100vh',
          maxHeight: '100vh',
          backgroundColor: '#efeae2',
          borderRadius: '0px',
          boxShadow: 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: 'none',
          animation: 'chatSlideUp 0.25s ease-out forwards'
        } : {
          width: '360px',
          maxWidth: 'calc(100vw - 28px)',
          height: '560px',
          maxHeight: 'calc(100vh - 100px)',
          backgroundColor: '#efeae2',
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
            @keyframes viewFadeIn {
              0% { opacity: 0; transform: translateY(6px); }
              100% { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          {/* HEADER */}
          <div style={{
            backgroundColor: '#075e54',
            color: '#ffffff',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #054c44',
            flexShrink: 0
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
                <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: '800', color: '#ffffff' }}>
                  24/7 WhatsApp Chatbot
                </h4>
                <div style={{ fontSize: '0.65rem', color: '#86efac', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <span>● Online 24/7</span> • <span>Tamil & English</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* FullScreen Toggle Button */}
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
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
                {isFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>

              {/* Reset to Main Menu */}
              <button
                onClick={handleResetToMainMenu}
                title="Restart / Main Menu"
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
                <RefreshCw size={14} />
              </button>

              {/* Close Button */}
              <button
                onClick={() => {
                  setIsFullScreen(false);
                  setIsOpen(false);
                }}
                title="Close"
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
          </div>

          {/* CHAT BODY AREA */}
          <div
            ref={chatBodyRef}
            style={{
              flex: 1,
              padding: '12px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {/* Timestamp Badge */}
            <div style={{ textAlign: 'center', margin: '2px 0' }}>
              <span style={{ background: 'rgba(255,255,255,0.85)', color: '#64748b', fontSize: '0.62rem', padding: '3px 9px', borderRadius: '10px', fontWeight: '600', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                Today • Subi E-Sevai 24 h chatservice
              </span>
            </div>

            {/* ======================================================== */}
            {/* VIEW 1: ROOT / MAIN CATEGORIES LIST                      */}
            {/* When at root, show greeting and the 12 category buttons  */}
            {/* ======================================================== */}
            {isAtRoot && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', animation: 'viewFadeIn 0.25s ease-out' }}>
                {/* Bot Greeting Bubble */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '0px 14px 14px 14px',
                    padding: '10px 12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    alignSelf: 'flex-start',
                    maxWidth: '92%'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <Bot size={15} style={{ color: '#075e54' }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#075e54' }}>Subi E-Sevai Bot</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#1e293b', lineHeight: '1.45', whiteSpace: 'pre-line' }}>
                    <p style={{ margin: '0 0 4px 0' }}>👋 <strong>வணக்கம்! சுபி இ-சேவை 24/7 WhatsApp உதவி மையம்.</strong></p>
                    <p style={{ margin: 0 }}>தயவுசெய்து உங்களுக்குத் தேவையான சேவையைத் தேர்ந்தெடுக்கவும்:</p>
                  </div>
                  <span style={{ fontSize: '0.58rem', color: '#94a3b8', display: 'block', textAlign: 'right', marginTop: '4px' }}>
                    {nowTime}
                  </span>
                </div>

                {/* Categories Buttons List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {publishedFlows.filter(f => f.status !== 'disabled').map((flow, idx) => {
                    const palette = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                    return (
                      <button
                        key={flow.id}
                        onClick={() => handleNodeClick(flow)}
                        style={{
                          background: '#ffffff',
                          border: `1.5px solid ${palette.border}`,
                          borderRadius: '10px',
                          padding: '10px 12px',
                          fontSize: '0.78rem',
                          fontWeight: '800',
                          color: palette.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          textAlign: 'left',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                          transition: 'all 0.2s ease',
                          width: '100%'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = palette.bg;
                          e.currentTarget.style.transform = 'translateX(3px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#ffffff';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {flow.button_text || flow.title}
                        </span>
                        <ChevronRight size={15} style={{ color: palette.chevron, flexShrink: 0, marginLeft: '6px' }} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* VIEW 2: CATEGORY / SUB-SELECTION VIEW                    */}
            {/* Previous categories are hidden, new selection is shown!  */}
            {/* Back button returns to show previous data!               */}
            {/* ======================================================== */}
            {currentNode && !customQuery && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', animation: 'viewFadeIn 0.25s ease-out' }}>
                
                {/* Navigation Bar: Prominent Back / Return Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={handleBack}
                    style={{
                      flex: 1,
                      background: '#ffffff',
                      border: '1.5px solid #075e54',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      fontSize: '0.75rem',
                      fontWeight: '800',
                      color: '#075e54',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(7, 94, 84, 0.1)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#ecfdf5';
                      e.currentTarget.style.transform = 'translateX(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                  </button>

                  <button
                    onClick={handleResetToMainMenu}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      color: '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                  >
                    <Home size={15} />
                    <span>Main Menu</span>
                  </button>
                </div>


                {/* Selected Node Header Card */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    borderLeft: '4px solid #10b981'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <Bot size={15} style={{ color: '#075e54' }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#075e54' }}>Subi E-Sevai Bot</span>
                  </div>
                  <h4 style={{ margin: '2px 0 4px 0', fontSize: '0.84rem', fontWeight: '800', color: '#0f172a' }}>
                    {currentNode.response ? currentNode.response.title : (currentNode.title || currentNode.button_text)}
                  </h4>
                  <div style={{ fontSize: '0.75rem', color: '#334155', lineHeight: '1.45', whiteSpace: 'pre-line' }}>
                    {currentNode.response
                      ? currentNode.response.description
                      : (currentNode.description || 'கீழே உள்ள விருப்பங்களில் ஒன்றைத் தேர்ந்தெடுக்கவும்:')}
                  </div>
                </div>

                {/* Sub-Items / Children List (if node has children) */}
                {Array.isArray(currentNode.children) && currentNode.children.filter(c => c.status !== 'disabled').length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {currentNode.children.filter(c => c.status !== 'disabled').map((child) => (
                      <button
                        key={child.id}
                        onClick={() => handleNodeClick(child)}
                        style={{
                          background: '#ffffff',
                          border: '1.5px solid #10b981',
                          borderRadius: '10px',
                          padding: '9px 12px',
                          fontSize: '0.76rem',
                          fontWeight: '700',
                          color: '#065f46',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          textAlign: 'left',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                          transition: 'all 0.2s ease',
                          width: '100%'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#ecfdf5';
                          e.currentTarget.style.transform = 'translateX(3px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#ffffff';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          👉 {child.button_text || child.title}
                        </span>
                        <ChevronRight size={14} style={{ color: '#10b981', flexShrink: 0, marginLeft: '6px' }} />
                      </button>
                    ))}
                  </div>
                )}

                {/* Final Response Action Buttons (if node has response actions) */}
                {currentNode.response && Array.isArray(currentNode.response.actions) && currentNode.response.actions.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                    {currentNode.response.actions.map((action) => {
                      const isPrimary =
                        action.button_text.includes('விண்ணப்பிக்க') ||
                        action.button_text.includes('👇');

                      const hasDownFinger = action.button_text.includes('👇');
                      let cleanText = hasDownFinger ? action.button_text.replace('👇', '').trim() : action.button_text;
                      // Remove redundant leading equal sign if present from legacy json
                      if (cleanText.startsWith('=')) cleanText = cleanText.substring(1).trim();

                      const hasDocEmoji = cleanText.startsWith('📄') || cleanText.startsWith('📲');

                      const btnClass = isPrimary
                        ? 'chatbot-action-btn chatbot-action-btn-primary'
                        : action.type === 'url'
                        ? 'chatbot-action-btn chatbot-action-btn-url'
                        : 'chatbot-action-btn chatbot-action-btn-secondary';

                      return (
                        <button
                          key={action.id}
                          onClick={() => handleActionClick(action)}
                          className={btnClass}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', position: 'relative', zIndex: 1 }}>
                            {!hasDocEmoji && (
                              action.type === 'url' ? (
                                <ExternalLink size={16} style={{ flexShrink: 0 }} />
                              ) : action.type === 'whatsapp_msg' ? (
                                <MessageCircle size={16} style={{ flexShrink: 0 }} />
                              ) : (
                                <Share2 size={16} style={{ flexShrink: 0 }} />
                              )
                            )}
                            <span style={{ textAlign: 'center', lineHeight: 1.35 }}>
                              {cleanText}
                              {hasDownFinger && (
                                <span className="cta-bounce-finger" style={{ marginLeft: '6px' }}>👇</span>
                              )}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* If neither children nor actions exist, provide default direct WhatsApp option */}
                {(!Array.isArray(currentNode.children) || currentNode.children.filter(c => c.status !== 'disabled').length === 0) &&
                 (!currentNode.response || !Array.isArray(currentNode.response.actions) || currentNode.response.actions.length === 0) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <button
                      onClick={() => sendToWhatsApp(`வணக்கம் Subi E-Sevai, "${currentNode.button_text || currentNode.title}" சேவை பற்றி விவரம் தேவை.`)}
                      className="chatbot-action-btn chatbot-action-btn-primary"
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', position: 'relative', zIndex: 1 }}>
                        <MessageCircle size={16} style={{ flexShrink: 0 }} />
                        <span style={{ flex: 1, textAlign: 'center', lineHeight: 1.35 }}>WhatsApp மூலம் விசாரிக்க கிளிக் செய்யவும்</span>
                      </span>
                    </button>
                  </div>
                )}

                {/* Bottom Back Button for easy access without scrolling */}
                <button
                  onClick={handleBack}
                  style={{
                    background: '#f1f5f9',
                    border: '1px dashed #94a3b8',
                    borderRadius: '9px',
                    padding: '8px 11px',
                    fontSize: '0.73rem',
                    fontWeight: '700',
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    marginTop: '4px',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </button>

              </div>
            )}

            {/* ======================================================== */}
            {/* VIEW 3: CUSTOM TYPED QUERY VIEW                          */}
            {/* When user types in the input box                         */}
            {/* ======================================================== */}
            {customQuery && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', animation: 'viewFadeIn 0.25s ease-out' }}>
                {/* User Message Bubble */}
                <div
                  style={{
                    backgroundColor: '#dcf8c6',
                    borderRadius: '14px 0px 14px 14px',
                    padding: '9px 12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    alignSelf: 'flex-end',
                    maxWidth: '85%'
                  }}
                >
                  <div style={{ fontSize: '0.8rem', color: '#1e293b', lineHeight: '1.4' }}>
                    {customQuery.text}
                  </div>
                  <span style={{ fontSize: '0.58rem', color: '#64748b', display: 'block', textAlign: 'right', marginTop: '3px' }}>
                    {customQuery.timestamp}
                  </span>
                </div>

                {/* Bot Response Bubble */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '0px 14px 14px 14px',
                    padding: '10px 12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    alignSelf: 'flex-start',
                    maxWidth: '90%'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <Bot size={15} style={{ color: '#075e54' }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#075e54' }}>Subi E-Sevai Bot</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#1e293b', lineHeight: '1.45' }}>
                    <p style={{ margin: '0 0 6px 0' }}>
                      💬 <strong>WhatsApp Chat திறக்கப்பட்டது:</strong>
                    </p>
                    <p style={{ margin: 0, color: '#475569' }}>
                      "{customQuery.text}" - தொடர்பான WhatsApp Message அனுப்பப்பட்டுள்ளது. அதிகாரிகள் விரைவில் பதிலளிப்பார்கள்.
                    </p>
                  </div>
                </div>

                {/* Direct WhatsApp Action Button */}
                <button
                  onClick={() => sendToWhatsApp(customQuery.waText)}
                  style={{
                    background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    fontSize: '0.78rem',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(37, 211, 102, 0.35)'
                  }}
                >
                  <MessageCircle size={16} />
                  <span>WhatsApp Chat திறக்கவும்</span>
                </button>

                {/* Return to Categories Button */}
                <button
                  onClick={handleResetToMainMenu}
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #075e54',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    fontSize: '0.75rem',
                    fontWeight: '800',
                    color: '#075e54',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    justifyContent: 'center',
                    marginTop: '4px'
                  }}
                >
                  <ArrowLeft size={15} />
                  <span>← சேவைகளுக்குத் திரும்பு (Back to Categories)</span>
                </button>
              </div>
            )}

          </div>

          {/* INPUT FORM FOOTER */}
          <form
            onSubmit={handleCustomSend}
            style={{
              padding: '9px 12px',
              backgroundColor: '#f0f2f5',
              borderTop: '1px solid #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexShrink: 0
            }}
          >
            <input
              type="text"
              placeholder="Type message (தமிழ் / Eng)..."
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
