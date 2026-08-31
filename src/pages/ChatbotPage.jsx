import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, ArrowLeft, RefreshCw, MessageCircle, ChevronRight, ExternalLink, Share2, Home, Send, CheckCheck } from 'lucide-react';
import { getPublishedFlows } from '../services/chatbotStorage';
import { playSelectSound } from '../utils/sound';

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

  const chatBodyRef = useRef(null);
  const chatEndRef = useRef(null);
  const startMsgRef = useRef(null);

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

  const initialMessages = [
    {
      id: 1,
      sender: 'bot',
      text: '👋 **வணக்கம்! சுபி இ-சேவை 24/7 ஆன்லைன் உதவி மையம்.**\n\nஉங்களுக்குத் தேவையான அரசு மற்றும் ஆன்லைன் சேவையைத் தேர்ந்தெடுக்கவும்:',
      type: 'main_menu',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ];

  const [messages, setMessages] = useState(initialMessages);

  useEffect(() => {
    const reloadFlows = () => setPublishedFlows(getPublishedFlows());
    window.addEventListener('chatbot-config-published', reloadFlows);
    return () => window.removeEventListener('chatbot-config-published', reloadFlows);
  }, []);

  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.type === 'main_menu') {
      if (chatBodyRef.current) {
        chatBodyRef.current.scrollTop = 0;
      }
    } else if (startMsgRef.current) {
      startMsgRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleHeaderBack = () => {
    playSelectSound();
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/user');
    }
  };

  const handleBackToMainMenu = () => {
    playSelectSound();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: 'user', text: '🏠 Main Menu', timestamp: nowTime },
      { id: Date.now() + 1, sender: 'bot', text: 'உங்களுக்கு என்ன சேவை வேண்டும்? கீழே உள்ள வகையைத் தேர்ந்தெடுக்கவும்:', type: 'main_menu', timestamp: nowTime }
    ]);
  };

  const handleDynamicNodeClick = (node, currentHistory = []) => {
    playSelectSound();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newHistory = [...currentHistory, node];
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: 'user', text: node.button_text || node.title, timestamp: nowTime },
      {
        id: Date.now() + 1,
        sender: 'bot',
        text: node.response ? `📄 **${node.response.title}**` : `📁 **${node.title}**`,
        description: node.response ? node.response.description : (node.description || 'கீழே உள்ள விருப்பங்களில் ஒன்றைத் தேர்ந்தெடுக்கவும்:'),
        type: 'dynamic_flow_node',
        node: node,
        nodeHistory: newHistory,
        children: Array.isArray(node.children) ? node.children.filter(c => c.status !== 'disabled') : [],
        response: node.response,
        timestamp: nowTime
      }
    ]);
  };

  const handleDynamicBack = (nodeHistory = []) => {
    playSelectSound();
    if (!nodeHistory || nodeHistory.length <= 1) {
      handleBackToMainMenu();
      return;
    }
    const prevHistory = nodeHistory.slice(0, -1);
    const parentNode = prevHistory[prevHistory.length - 1];
    handleDynamicNodeClick(parentNode, prevHistory.slice(0, -1));
  };

  const handleDynamicActionClick = (action) => {
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

  const handleCustomSend = (e) => {
    e.preventDefault();
    if (!customText.trim()) return;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userQuery = customText.trim();
    setCustomText('');

    const defaultWaText = `வணக்கம் Subi E-Sevai, "${userQuery}" விண்ணப்பிக்க என்னென்ன விவரங்கள் தேவை?`;
    sendToWhatsApp(defaultWaText);

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: 'user', text: userQuery, timestamp: nowTime },
      {
        id: Date.now() + 1,
        sender: 'bot',
        text: `உங்கள் கேள்வி: **"${userQuery}"**\n\nDirect-ஆ உங்கள் WhatsApp Chat திறக்கப்பட்டது. அதிகாரிகள் விரைவில் பதிலளிப்பார்கள்.`,
        type: 'whatsapp_link',
        waText: defaultWaText,
        timestamp: nowTime
      }
    ]);
  };

  const resetChat = () => {
    playSelectSound();
    setMessages(initialMessages);
  };

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
        @keyframes fadeInMsg {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .chat-msg-animate {
          animation: fadeInMsg 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .chat-touch-btn:active {
          transform: scale(0.98) !important;
          filter: brightness(0.96);
        }
      `}</style>
      <div style={{
        maxWidth: '680px',
        width: '100%',
        height: '100%',
        backgroundColor: '#efeae2',
        backgroundImage: 'radial-gradient(#00000008 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 0 25px rgba(0,0,0,0.1)'
      }}>
        {/* Header (WhatsApp Dark Teal Premium Bar with Safe Area Top) */}
        <header style={{
          background: 'linear-gradient(135deg, #075e54 0%, #128c7e 100%)',
          color: '#ffffff',
          paddingTop: 'max(12px, env(safe-area-inset-top, 12px))',
          paddingBottom: '12px',
          paddingLeft: '14px',
          paddingRight: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
          zIndex: 50,
          boxShadow: '0 2px 10px rgba(0,0,0,0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleHeaderBack}
              className="chat-touch-btn"
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                color: '#ffffff',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                WebkitTapHighlightColor: 'transparent'
              }}
              title="Return to Home Page"
            >
              <ArrowLeft size={20} />
            </button>
            <div style={{ position: 'relative' }}>
              <img
                src="/whatsbro_avatar.png"
                alt="Avatar"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  padding: '2px',
                  objectFit: 'contain',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                }}
              />
              <span style={{
                position: 'absolute',
                bottom: '1px',
                right: '1px',
                width: '10px',
                height: '10px',
                backgroundColor: '#22c55e',
                border: '2px solid #075e54',
                borderRadius: '50%'
              }} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', letterSpacing: '-0.2px', color: '#ffffff', lineHeight: 1.2 }}>
                Subi E-Sevai Assistant
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                <span style={{ fontSize: '0.74rem', color: '#86efac', fontWeight: '600' }}>
                  ● Online 24/7 Official Support
                </span>
              </div>
            </div>
          </div>
          
          <button
            onClick={resetChat}
            className="chat-touch-btn"
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              color: '#ffffff',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              WebkitTapHighlightColor: 'transparent'
            }}
            title="Reset Chat / Main Menu"
          >
            <RefreshCw size={16} />
          </button>
        </header>

        {/* Chat Body with smooth mobile touch scrolling */}
        <div
          ref={chatBodyRef}
          style={{
            flex: 1,
            padding: '14px 14px 20px 14px',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          {messages.map((msg, idx) => {
            const isBot = msg.sender === 'bot';
            return (
              <div
                key={msg.id || idx}
                ref={idx === Math.max(0, messages.length - 2) ? startMsgRef : null}
                className="chat-msg-animate"
                style={{
                  alignSelf: isBot ? 'flex-start' : 'flex-end',
                  maxWidth: isBot ? '95%' : '88%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                {/* Bubble Container */}
                <div style={{
                  background: isBot ? '#ffffff' : '#d9fdd3',
                  borderRadius: isBot ? '2px 18px 18px 18px' : '18px 2px 18px 18px',
                  padding: '12px 14px',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.06)',
                  border: isBot ? '1px solid rgba(0,0,0,0.05)' : '1px solid rgba(0,0,0,0.04)',
                  position: 'relative',
                  wordBreak: 'break-word'
                }}>
                  {isBot && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#ecfdf5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Bot size={13} style={{ color: '#059669' }} />
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#047857' }}>
                        Subi E-Sevai Bot
                      </span>
                    </div>
                  )}

                  {/* Main Message Text */}
                  <div style={{
                    fontSize: '0.94rem',
                    color: '#1e293b',
                    lineHeight: '1.55',
                    whiteSpace: 'pre-line'
                  }}>
                    {msg.text.split('\n').map((line, i) => (
                      <p key={i} style={{ margin: '0 0 5px 0' }}>
                        {line.includes('**') ? (
                          <span dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                        ) : line}
                      </p>
                    ))}
                  </div>

                  {/* Timestamp & Status */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '4px',
                    marginTop: '2px'
                  }}>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: '500' }}>
                      {msg.timestamp}
                    </span>
                    {!isBot && <CheckCheck size={14} style={{ color: '#38bdf8' }} />}
                  </div>
                </div>

                {/* Main Menu Categories (List of Interactive Service Cards) */}
                {isBot && msg.type === 'main_menu' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                    {publishedFlows.filter(f => f.status !== 'disabled').map((flow, fIdx) => {
                      const palette = CATEGORY_COLORS[fIdx % CATEGORY_COLORS.length];
                      return (
                        <button
                          key={flow.id}
                          onClick={() => handleDynamicNodeClick(flow, [])}
                          className="chat-touch-btn"
                          style={{
                            background: '#ffffff',
                            border: `1.5px solid ${palette.border}`,
                            borderRadius: '12px',
                            padding: '12px 14px',
                            fontSize: '0.92rem',
                            fontWeight: '700',
                            color: palette.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                            transition: 'all 0.15s ease',
                            textAlign: 'left',
                            WebkitTapHighlightColor: 'transparent'
                          }}
                        >
                          <span style={{ flex: 1, paddingRight: '8px', lineHeight: 1.4 }}>
                            {flow.button_text || flow.title}
                          </span>
                          <ChevronRight size={18} style={{ color: palette.chevron, flexShrink: 0 }} />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Dynamic Node Options & Action Buttons */}
                {isBot && msg.type === 'dynamic_flow_node' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                    {/* Node Description Box */}
                    {msg.description && (
                      <div style={{
                        background: '#ffffff',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        fontSize: '0.9rem',
                        color: '#334155',
                        lineHeight: '1.55',
                        whiteSpace: 'pre-line',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.04)'
                      }}>
                        {msg.description}
                      </div>
                    )}

                    {/* Sub-children Options */}
                    {Array.isArray(msg.children) && msg.children.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {msg.children.map(child => (
                          <button
                            key={child.id}
                            onClick={() => handleDynamicNodeClick(child, msg.nodeHistory)}
                            className="chat-touch-btn"
                            style={{
                              background: '#ffffff',
                              border: '1.5px solid #10b981',
                              borderRadius: '12px',
                              padding: '12px 14px',
                              fontSize: '0.92rem',
                              fontWeight: '700',
                              color: '#065f46',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                              transition: 'all 0.15s ease',
                              textAlign: 'left',
                              WebkitTapHighlightColor: 'transparent'
                            }}
                          >
                            <span style={{ flex: 1, paddingRight: '8px', lineHeight: 1.4 }}>
                              {child.button_text || child.title}
                            </span>
                            <ChevronRight size={18} style={{ color: '#10b981', flexShrink: 0 }} />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Action Buttons (Apply, WhatsApp, Share) */}
                    {msg.response && Array.isArray(msg.response.actions) && msg.response.actions.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {msg.response.actions.map(action => (
                          <button
                            key={action.id}
                            onClick={() => handleDynamicActionClick(action)}
                            className="chat-touch-btn"
                            style={{
                              background: action.type === 'url'
                                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                : 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '12px',
                              padding: '12px 16px',
                              fontSize: '0.92rem',
                              fontWeight: '800',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              cursor: 'pointer',
                              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                              transition: 'all 0.15s ease',
                              WebkitTapHighlightColor: 'transparent'
                            }}
                          >
                            {action.type === 'url' ? <ExternalLink size={17} /> : action.type === 'whatsapp_msg' ? <MessageCircle size={17} /> : <Share2 size={17} />}
                            <span>{action.button_text}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Navigation Buttons (Back / Main Menu) */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                      <button
                        onClick={() => handleDynamicBack(msg.nodeHistory)}
                        className="chat-touch-btn"
                        style={{
                          flex: 1,
                          background: '#ffffff',
                          border: '1.5px solid #cbd5e1',
                          borderRadius: '10px',
                          padding: '10px',
                          fontSize: '0.86rem',
                          fontWeight: '700',
                          color: '#475569',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                          WebkitTapHighlightColor: 'transparent'
                        }}
                      >
                        <ArrowLeft size={15} /> ← Back
                      </button>
                      <button
                        onClick={handleBackToMainMenu}
                        className="chat-touch-btn"
                        style={{
                          flex: 1,
                          background: '#ffffff',
                          border: '1.5px solid #cbd5e1',
                          borderRadius: '10px',
                          padding: '10px',
                          fontSize: '0.86rem',
                          fontWeight: '700',
                          color: '#475569',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                          WebkitTapHighlightColor: 'transparent'
                        }}
                      >
                        <Home size={15} /> 🏠 Main Menu
                      </button>
                    </div>
                  </div>
                )}

                {/* WhatsApp Direct Link Button */}
                {isBot && msg.type === 'whatsapp_link' && msg.waText && (
                  <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      onClick={() => sendToWhatsApp(msg.waText)}
                      className="chat-touch-btn"
                      style={{
                        background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        fontSize: '0.92rem',
                        fontWeight: '800',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)',
                        WebkitTapHighlightColor: 'transparent'
                      }}
                    >
                      <MessageCircle size={18} /> 💬 Open WhatsApp Chat
                    </button>
                    <button
                      onClick={handleBackToMainMenu}
                      className="chat-touch-btn"
                      style={{
                        background: '#ffffff',
                        border: '1.5px solid #cbd5e1',
                        borderRadius: '10px',
                        padding: '9px',
                        fontSize: '0.86rem',
                        fontWeight: '700',
                        color: '#64748b',
                        cursor: 'pointer',
                        WebkitTapHighlightColor: 'transparent'
                      }}
                    >
                      🏠 Main Menu
                    </button>
                  </div>
                )}

              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Bottom Fixed Input Bar (Safe Area Bottom for mobile home bar) */}
        <form
          onSubmit={handleCustomSend}
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
            boxShadow: '0 -2px 10px rgba(0,0,0,0.04)'
          }}
        >
          <input
            type="text"
            placeholder="Type your query (தமிழ் / English)..."
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            style={{
              flex: 1,
              padding: '11px 16px',
              borderRadius: '24px',
              border: '1.5px solid #cbd5e1',
              fontSize: '16px', // 16px prevents iOS Safari auto-zoom on focus
              outline: 'none',
              backgroundColor: '#f8fafc',
              color: '#1e293b',
              transition: 'border-color 0.2s ease, background 0.2s ease'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#10b981';
              e.currentTarget.style.backgroundColor = '#ffffff';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.backgroundColor = '#f8fafc';
            }}
          />
          <button
            type="submit"
            disabled={!customText.trim()}
            className="chat-touch-btn"
            style={{
              backgroundColor: customText.trim() ? '#128C7E' : '#cbd5e1',
              color: '#ffffff',
              border: 'none',
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: customText.trim() ? 'pointer' : 'default',
              boxShadow: customText.trim() ? '0 3px 10px rgba(18, 140, 126, 0.3)' : 'none',
              transition: 'all 0.15s ease',
              flexShrink: 0,
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            <Send size={18} />
          </button>
        </form>

      </div>
    </div>
  );
}
