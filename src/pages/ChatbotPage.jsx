import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, ArrowLeft, RefreshCw, MessageCircle, ChevronRight, ExternalLink, Share2, Home, Send, Search } from 'lucide-react';
import { getPublishedFlows } from '../services/chatbotStorage';
import { playSelectSound } from '../utils/sound';
import ChatbotContentRenderer, { splitBilingualTitle } from '../components/ChatbotContentRenderer';
import ChatbotAssistantResponse from '../components/ChatbotAssistantResponse';
import { processUserQuery, getAllServices } from '../services/chatbotAssistantEngine';

const CATEGORY_COLORS = [
  { border: '#10b981', color: '#047857', bg: '#f0fdf4', chevron: '#10b981', dot: '#10b981' }, // Emerald
  { border: '#8b5cf6', color: '#6d28d9', bg: '#f5f3ff', chevron: '#8b5cf6', dot: '#8b5cf6' }, // Purple
  { border: '#3b82f6', color: '#1d4ed8', bg: '#eff6ff', chevron: '#3b82f6', dot: '#3b82f6' }, // Blue
  { border: '#f59e0b', color: '#b45309', bg: '#fffbeb', chevron: '#f59e0b', dot: '#f59e0b' }, // Amber
  { border: '#14b8a6', color: '#0f766e', bg: '#f0fdfa', chevron: '#14b8a6', dot: '#14b8a6' }, // Teal
  { border: '#06b6d4', color: '#0e7490', bg: '#ecfeff', chevron: '#06b6d4', dot: '#06b6d4' }, // Cyan
  { border: '#eab308', color: '#a16207', bg: '#fefce8', chevron: '#eab308', dot: '#eab308' }, // Yellow
  { border: '#ec4899', color: '#be185d', bg: '#fdf2f8', chevron: '#ec4899', dot: '#ec4899' }, // Pink
  { border: '#6366f1', color: '#4338ca', bg: '#eef2ff', chevron: '#6366f1', dot: '#6366f1' }  // Indigo
];

export default function ChatbotPage({ systemSettings }) {
  const navigate = useNavigate();
  const [customText, setCustomText] = useState('');
  const [publishedFlows, setPublishedFlows] = useState(() => getPublishedFlows());

  // Navigation History Stack:
  // [] = Root (Main Categories)
  // [categoryNode] = Sub-selection of category (previous root categories hidden)
  // [categoryNode, childNode] = Deep child details (previous sub-selection hidden)
  const [navHistory, setNavHistory] = useState([]);
  
  // Custom query state (when user types a message in the input box)
  const [customQuery, setCustomQuery] = useState(null);

  const chatBodyRef = useRef(null);

  // Helper to format WhatsApp phone number
  const formatWhatsAppNumber = (num) => {
    let clean = String(num || '').replace(/\D/g, '');
    if (!clean) return '919787973615';
    if (clean.length === 11 && clean.startsWith('0')) clean = clean.slice(1);
    if (clean.length === 10) return `91${clean}`;
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

  useEffect(() => {
    const reloadFlows = () => setPublishedFlows(getPublishedFlows());
    window.addEventListener('chatbot-config-published', reloadFlows);
    return () => window.removeEventListener('chatbot-config-published', reloadFlows);
  }, []);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = 0;
    }
  }, [navHistory, customQuery]);

  const handleHeaderBack = () => {
    playSelectSound();
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/user');
    }
  };

  const handleResetToMainMenu = () => {
    playSelectSound();
    setCustomQuery(null);
    setNavHistory([]);
  };

  const handleNodeClick = (node) => {
    playSelectSound();
    setCustomQuery(null);
    setNavHistory((prev) => [...prev, node]);
  };

  const handleBack = () => {
    playSelectSound();
    setCustomQuery(null);
    setNavHistory((prev) => prev.slice(0, -1));
  };

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

  // Natural Language & Assistant Query Execution
  const executeQuery = (queryText) => {
    if (!queryText || !queryText.trim()) return;
    const query = queryText.trim();
    playSelectSound();

    const result = processUserQuery(query);

    setCustomQuery({
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      result
    });
    setCustomText('');

    setTimeout(() => {
      if (chatBodyRef.current) {
        chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
      }
    }, 120);
  };

  const handleCustomSend = (e) => {
    e.preventDefault();
    executeQuery(customText);
  };

  const searchResults = customText.trim()
    ? getAllServices().filter(s => {
        const q = customText.toLowerCase().trim();
        return (
          s.title.toLowerCase().includes(q) ||
          (s.category && s.category.toLowerCase().includes(q)) ||
          s.keywords.some(k => k.includes(q))
        );
      })
    : [];

  const isSearching = customText.trim().length > 0 && !customQuery;
  const currentNode = navHistory.length > 0 ? navHistory[navHistory.length - 1] : null;
  const isAtRoot = navHistory.length === 0 && !customQuery && !isSearching;
  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100dvh',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '0px',
      background: '#efeae2',
      zIndex: 9999,
      overflow: 'hidden',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <style>{`
        @keyframes viewFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .chat-touch-btn:active {
          transform: scale(0.97) !important;
          opacity: 0.9;
        }
      `}</style>

      {/* Main Container */}
      <div style={{
        width: '100%',
        maxWidth: '560px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#efeae2',
        position: 'relative',
        boxShadow: '0 0 40px rgba(0,0,0,0.12)',
        overflow: 'hidden'
      }}>

        {/* WhatsApp Chat Header */}
        <div style={{
          backgroundColor: '#075e54',
          color: '#ffffff',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          zIndex: 50,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleHeaderBack}
              title="Go Back"
              className="chat-touch-btn"
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: 'none',
                color: '#ffffff',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s ease',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <ArrowLeft size={20} />
            </button>

            <div style={{ position: 'relative' }}>
              <img
                src="/whatsbro_avatar.png"
                alt="Chatbot Avatar"
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  objectFit: 'contain',
                  backgroundColor: '#ffffff',
                  padding: '2px',
                  border: '1.5px solid #25d366'
                }}
              />
              <span style={{
                position: 'absolute',
                bottom: '1px',
                right: '1px',
                width: '11px',
                height: '11px',
                backgroundColor: '#22c55e',
                border: '2px solid #075e54',
                borderRadius: '50%'
              }} />
            </div>

            <div>
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '800', color: '#ffffff', lineHeight: 1.2 }}>
                Subi E-Sevai 24/7 Chatbot
              </h3>
              <div style={{ fontSize: '0.72rem', color: '#86efac', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
                <span>Online • WhatsApp Direct Help</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={handleResetToMainMenu}
              title="Restart / Main Menu"
              className="chat-touch-btn"
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: 'none',
                color: '#ffffff',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s ease',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable Chat Body */}
        <div
          ref={chatBodyRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {/* Day / Service Badge */}
          <div style={{ textAlign: 'center', margin: '4px 0 6px 0' }}>
            <span style={{
              background: 'rgba(255,255,255,0.92)',
              color: '#64748b',
              fontSize: '0.68rem',
              padding: '4px 12px',
              borderRadius: '12px',
              fontWeight: '700',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
            }}>
              Subi E-Sevai 24/7 WhatsApp Chat Support
            </span>
          </div>

          {/* ======================================================== */}
          {/* SEARCHABLE LIST VIEW (TOP TO BOTTOM)                     */}
          {/* Matches are rendered cleanly from top to bottom          */}
          {/* ======================================================== */}
          {isSearching && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', animation: 'viewFadeIn 0.2s ease-out' }}>
              {/* Search Header Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#ecfdf5',
                  border: '1.5px solid #10b981',
                  borderRadius: '11px',
                  padding: '8px 12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Search size={15} style={{ color: '#047857' }} />
                  <span style={{ fontSize: '0.80rem', fontWeight: '800', color: '#065f46' }}>
                    "{customText.trim()}" - {searchResults.length} சேவைகள்
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCustomText('')}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #a7f3d0',
                    color: '#065f46',
                    fontSize: '0.70rem',
                    fontWeight: '800',
                    cursor: 'pointer',
                    padding: '3px 8px',
                    borderRadius: '6px'
                  }}
                >
                  ✕ Clear
                </button>
              </div>

              {/* Matched Services List (Rendered Top to Bottom) */}
              {searchResults.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {searchResults.map((service, idx) => {
                    const { primary, secondary } = splitBilingualTitle(service.title);
                    return (
                      <button
                        key={service.id || idx}
                        onClick={() => {
                          setCustomText('');
                          handleNodeClick(service.rawNode || service);
                        }}
                        style={{
                          background: '#ffffff',
                          border: '1.5px solid #10b981',
                          borderRadius: '12px',
                          padding: '11px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          textAlign: 'left',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                          transition: 'all 0.15s ease',
                          width: '100%',
                          gap: '8px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f0fdf4';
                          e.currentTarget.style.transform = 'translateX(2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#ffffff';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: '0.90rem', fontWeight: '800', color: '#0f172a', lineHeight: '1.35' }}>
                            📄 {primary}
                          </span>
                          {secondary && (
                            <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#059669', lineHeight: '1.2', paddingLeft: '20px' }}>
                              {secondary}
                            </span>
                          )}
                          {service.category && (
                            <span style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px', paddingLeft: '20px' }}>
                              பிரிவு: {service.category.replace(/^[^\w\s\u0B80-\u0BFF]+/gu, '').trim()}
                            </span>
                          )}
                        </div>
                        <ChevronRight size={17} style={{ color: '#10b981', flexShrink: 0 }} />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '14px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ fontSize: '0.86rem', color: '#334155', fontWeight: '700' }}>
                    "{customText}" தொடர்பான நேரடி சேவை இல்லை.
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                    Enter அல்லது கீழே உள்ள Send பொத்தானை கிளிக் செய்து AI உதவியாளரிடம் கேட்கலாம்.
                  </div>
                  <button
                    type="button"
                    onClick={() => executeQuery(customText)}
                    style={{
                      background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '9px 14px',
                      fontSize: '0.80rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      marginTop: '4px'
                    }}
                  >
                    🤖 AI உதவியாளரிடம் கேட்கவும் (Ask AI)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* VIEW 1: ROOT / MAIN CATEGORIES */}
          {isAtRoot && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', animation: 'viewFadeIn 0.25s ease-out' }}>
              {/* Bot Greeting Bubble */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '0px 16px 16px 16px',
                  padding: '12px 14px',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.06)',
                  alignSelf: 'flex-start',
                  maxWidth: '92%'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <Bot size={16} style={{ color: '#075e54' }} />
                  <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#075e54' }}>Subi E-Sevai Bot</span>
                </div>
                <div style={{ fontSize: '0.88rem', color: '#1e293b', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                  <p style={{ margin: '0 0 6px 0' }}>👋 <strong>வணக்கம்! சுபி இ-சேவை 24/7 ஆன்லைன் உதவி மையம்.</strong></p>
                  <p style={{ margin: 0 }}>உங்களுக்குத் தேவையான அரசு மற்றும் ஆன்லைன் சேவையைத் தேர்ந்தெடுக்கவும்:</p>
                </div>
                <span style={{ fontSize: '0.62rem', color: '#94a3b8', display: 'block', textAlign: 'right', marginTop: '6px' }}>
                  {nowTime}
                </span>
              </div>

              {/* Categories Buttons List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                {publishedFlows.filter(f => f.status !== 'disabled').map((flow, idx) => {
                  const palette = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                  const { primary, secondary } = splitBilingualTitle(flow.button_text || flow.title);
                  return (
                    <button
                      key={flow.id}
                      onClick={() => handleNodeClick(flow)}
                      className="chat-touch-btn"
                      style={{
                        background: '#ffffff',
                        border: `1.5px solid ${palette.border}`,
                        borderRadius: '12px',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                        transition: 'all 0.15s ease',
                        textAlign: 'left',
                        WebkitTapHighlightColor: 'transparent',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: '0.94rem', fontWeight: '800', color: palette.color, lineHeight: 1.35 }}>
                          {primary}
                        </span>
                        {secondary && (
                          <span style={{ fontSize: '0.80rem', fontWeight: '600', color: '#64748b', lineHeight: 1.2 }}>
                            {secondary}
                          </span>
                        )}
                      </div>
                      <ChevronRight size={18} style={{ color: palette.chevron, flexShrink: 0 }} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 2: CATEGORY / SUB-SELECTION VIEW */}
          {!isSearching && currentNode && !customQuery && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', animation: 'viewFadeIn 0.25s ease-out' }}>
              
              {/* Back / Navigation Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={handleBack}
                  className="chat-touch-btn"
                  style={{
                    flex: 1,
                    background: '#ffffff',
                    border: '1.5px solid #075e54',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    fontSize: '0.86rem',
                    fontWeight: '800',
                    color: '#075e54',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(7, 94, 84, 0.1)',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                >
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>

                <button
                  onClick={handleResetToMainMenu}
                  className="chat-touch-btn"
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    fontSize: '0.86rem',
                    fontWeight: '700',
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                >
                  <Home size={16} />
                  <span>Main Menu</span>
                </button>
              </div>


              {/* Selected Node Header Card */}
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '14px 16px',
                boxShadow: '0 3px 10px -2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
                border: '1px solid #e2e8f0',
                borderLeft: '4px solid #10b981'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Bot size={16} style={{ color: '#075e54' }} />
                    <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#075e54' }}>Subi E-Sevai Bot</span>
                  </div>
                  <span style={{ fontSize: '0.64rem', fontWeight: '700', color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '4px' }}>
                    Service Details
                  </span>
                </div>
                {(() => {
                  const fullTitle = currentNode.response ? currentNode.response.title : (currentNode.title || currentNode.button_text);
                  const { primary, secondary } = splitBilingualTitle(fullTitle);
                  return (
                    <div style={{ margin: '0 0 12px 0' }}>
                      <h4 style={{ margin: 0, fontSize: '1.08rem', fontWeight: '800', color: '#0f172a', lineHeight: '1.35' }}>
                        📄 {primary}
                      </h4>
                      {secondary && (
                        <div style={{ fontSize: '0.86rem', fontWeight: '600', color: '#059669', marginTop: '3px', paddingLeft: '24px' }}>
                          {secondary}
                        </div>
                      )}
                    </div>
                  );
                })()}
                <ChatbotContentRenderer
                  content={currentNode.response ? currentNode.response.description : (currentNode.description || 'கீழே உள்ள விருப்பங்களில் ஒன்றைத் தேர்ந்தெடுக்கவும்:')}
                  currentTitle={currentNode.response ? currentNode.response.title : (currentNode.title || currentNode.button_text)}
                  compact={false}
                />
              </div>

              {/* Sub-Items / Children List */}
              {Array.isArray(currentNode.children) && currentNode.children.filter(c => c.status !== 'disabled').length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {currentNode.children.filter(c => c.status !== 'disabled').map((child) => {
                    const { primary, secondary } = splitBilingualTitle(child.button_text || child.title);
                    return (
                      <button
                        key={child.id}
                        onClick={() => handleNodeClick(child)}
                        className="chat-touch-btn"
                        style={{
                          background: '#ffffff',
                          border: '1.5px solid #10b981',
                          borderRadius: '12px',
                          padding: '12px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                          transition: 'all 0.15s ease',
                          textAlign: 'left',
                          WebkitTapHighlightColor: 'transparent',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: '0.94rem', fontWeight: '700', color: '#065f46', lineHeight: 1.35 }}>
                            👉 {primary}
                          </span>
                          {secondary && (
                            <span style={{ fontSize: '0.80rem', fontWeight: '500', color: '#64748b', paddingLeft: '22px', lineHeight: 1.2 }}>
                              {secondary}
                            </span>
                          )}
                        </div>
                        <ChevronRight size={18} style={{ color: '#10b981', flexShrink: 0 }} />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Action Buttons */}
              {currentNode.response && Array.isArray(currentNode.response.actions) && currentNode.response.actions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  {currentNode.response.actions.map((action) => {
                    const isPrimary =
                      action.button_text.includes('விண்ணப்பிக்க') ||
                      action.button_text.includes('👇');

                    const hasDownFinger = action.button_text.includes('👇');
                    let cleanText = hasDownFinger ? action.button_text.replace('👇', '').trim() : action.button_text;
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
                              <ExternalLink size={17} style={{ flexShrink: 0 }} />
                            ) : action.type === 'whatsapp_msg' ? (
                              <MessageCircle size={17} style={{ flexShrink: 0 }} />
                            ) : (
                              <Share2 size={17} style={{ flexShrink: 0 }} />
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

              {/* Fallback Direct WhatsApp Contact */}
              {(!Array.isArray(currentNode.children) || currentNode.children.filter(c => c.status !== 'disabled').length === 0) &&
               (!currentNode.response || !Array.isArray(currentNode.response.actions) || currentNode.response.actions.length === 0) && (
                <button
                  onClick={() => sendToWhatsApp(`வணக்கம் Subi E-Sevai, "${currentNode.button_text || currentNode.title}" சேவை பற்றி விவரம் தேவை.`)}
                  className="chatbot-action-btn chatbot-action-btn-primary"
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', position: 'relative', zIndex: 1 }}>
                    <MessageCircle size={18} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, textAlign: 'center', lineHeight: 1.35 }}>WhatsApp மூலம் விசாரிக்க கிளிக் செய்யவும்</span>
                  </span>
                </button>
              )}

              {/* Bottom Back Button */}
              <button
                onClick={handleBack}
                className="chat-touch-btn"
                style={{
                  background: '#f1f5f9',
                  border: '1px dashed #94a3b8',
                  borderRadius: '10px',
                  padding: '9px 12px',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  marginTop: '4px',
                  justifyContent: 'center',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                <ArrowLeft size={15} />
                <span>Back</span>
              </button>

            </div>
          )}

          {/* VIEW 3: INTELLIGENT MULTILINGUAL ASSISTANT VIEW */}
          {customQuery && (
            <ChatbotAssistantResponse
              customQuery={customQuery}
              onExecuteQuery={executeQuery}
              onSendToWhatsApp={(msg) => sendToWhatsApp(msg)}
              onBackToMenu={handleResetToMainMenu}
            />
          )}

        </div>

        {/* Bottom Fixed Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (customText.trim()) {
              executeQuery(customText);
            } else {
              executeQuery('services');
            }
          }}
          style={{
            paddingTop: '10px',
            paddingBottom: 'max(10px, env(safe-area-inset-bottom, 10px))',
            paddingLeft: '12px',
            paddingRight: '12px',
            backgroundColor: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0,
            zIndex: 50,
            position: 'relative',
            boxShadow: '0 -2px 10px rgba(0,0,0,0.04)'
          }}
        >
          {/* Input Bar with Search Icon */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#f8fafc',
              borderRadius: '24px',
              border: '1.5px solid #cbd5e1',
              padding: '0 14px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <Search size={16} style={{ color: customText.trim() ? '#10b981' : '#94a3b8', flexShrink: 0, marginRight: '8px' }} />
            <input
              type="text"
              placeholder="Search service or ask query (தமிழ் / Eng)..."
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              style={{
                flex: 1,
                padding: '11px 0',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#0f172a',
                fontSize: '16px',
                outline: 'none',
                fontWeight: '500'
              }}
            />
          </div>

          {/* Dynamic Send / Search Action Button */}
          <button
            type="submit"
            title={customText.trim() ? "Search & Send message" : "Search services"}
            className="chat-touch-btn"
            style={{
              background: customText.trim()
                ? 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)'
                : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: '#ffffff',
              border: 'none',
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 3px 10px rgba(18, 140, 126, 0.3)',
              transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              transform: customText.trim() ? 'scale(1.06)' : 'scale(1)',
              flexShrink: 0,
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            {customText.trim() ? (
              <Send size={18} style={{ marginLeft: '1px' }} />
            ) : (
              <Search size={18} />
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
