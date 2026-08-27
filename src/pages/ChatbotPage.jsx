import React, { useState, useEffect, useRef } from 'react';
import { Bot, ArrowLeft, RefreshCw, MessageCircle, ChevronRight, Globe, ExternalLink, Share2, Home, Send } from 'lucide-react';
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

export default function ChatbotPage({ systemSettings }) {
  const [lang, setLang] = useState('tam'); // 'tam' | 'eng' | 'tanglish'
  const [customText, setCustomText] = useState('');
  const [publishedFlows, setPublishedFlows] = useState(() => getPublishedFlows());

  const chatBodyRef = useRef(null);
  const chatEndRef = useRef(null);

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

  // Hardcoded default categories fallback
  const serviceCategories = [
    {
      id: 'esevai',
      titleTam: '📄 இ-சேவை சான்றிதழ்கள்',
      titleEng: '📄 E-Sevai Certificates',
      color: '#10b981',
      bg: '#ecfdf5',
      items: [
        { id: 'income', nameTam: 'வருமானச் சான்றிதழ்', nameEng: 'Income Certificate', waTam: 'வணக்கம் Subi E-Sevai, வருமானச் சான்றிதழ் விண்ணப்பிக்க என்னென்ன சான்றுகள் வேண்டும்?' },
        { id: 'caste', nameTam: 'வகுப்புச் சான்றிதழ் (ஜாதி)', nameEng: 'Community / Caste Certificate', waTam: 'வணக்கம் Subi E-Sevai, வகுப்புச் சான்றிதழ் (ஜாதி) விண்ணப்பிக்க என்னென்ன சான்றுகள் வேண்டும்?' },
        { id: 'residence', nameTam: 'இருப்பிடச் சான்றிதழ்', nameEng: 'Residence Certificate', waTam: 'வணக்கம் Subi E-Sevai, இருப்பிடச் சான்றிதழ் விண்ணப்பிக்க என்னென்ன சான்றுகள் வேண்டும்?' }
      ]
    },
    {
      id: 'voter',
      titleTam: '🗳️ வாக்காளர் அட்டை சேவைகள்',
      titleEng: '🗳️ Voter ID Services',
      color: '#8b5cf6',
      bg: '#f5f3ff',
      items: [
        { id: 'voter_new', nameTam: 'புதிய வாக்காளர் அட்டை', nameEng: 'New Voter ID Application', waTam: 'வணக்கம் Subi E-Sevai, புதிய வாக்காளர் அட்டை விண்ணப்பிக்க என்னென்ன சான்றுகள் வேண்டும்?' }
      ]
    }
  ];

  const initialMessages = [
    {
      id: 1,
      sender: 'bot',
      text: '👋 **வணக்கம்! சுபி இ-சேவை 24/7 ஆன்லைன் உதவி மையம்.**\n\nதயவுசெய்து உங்களுக்குத் தேவையான சேவையைத் தேர்ந்தெடுக்கவும்:',
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

  const handleCategoryClick = (category) => {
    playSelectSound();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: 'user', text: category.titleTam, timestamp: nowTime },
      {
        id: Date.now() + 1,
        sender: 'bot',
        text: `📄 **${category.titleTam}**\n\nகீழே உள்ள பட்டியலில் தேவையான சேவையைக் கிளிக் செய்யவும்:`,
        type: 'sub_menu',
        subItems: category.items,
        timestamp: nowTime
      }
    ]);
  };

  const handleSubItemClick = (item) => {
    playSelectSound();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    sendToWhatsApp(item.waTam);
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: 'user', text: item.nameTam, timestamp: nowTime },
      {
        id: Date.now() + 1,
        sender: 'bot',
        text: `💬 **WhatsApp Chat திறக்கப்பட்டது:** "${item.nameTam}"\n\nDirect-ஆ WhatsApp Message அனுப்பப்பட்டது.`,
        type: 'whatsapp_link',
        waText: item.waTam,
        timestamp: nowTime
      }
    ]);
  };

  const handleCustomSend = (e) => {
    e.preventDefault();
    if (!customText.trim()) return;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userQuery = customText.trim();
    setCustomText('');

    const defaultWaText = `Hi Subi E-Sevai, ${userQuery} - apply panna enenna details veanum?`;
    sendToWhatsApp(defaultWaText);

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: 'user', text: userQuery, timestamp: nowTime },
      {
        id: Date.now() + 1,
        sender: 'bot',
        text: `உங்கள் கேள்வி: "${userQuery}"\n\nDirect-ஆ WhatsApp Message அனுப்பப்பட்டது.`,
        type: 'whatsapp_link',
        waText: defaultWaText,
        timestamp: nowTime
      }
    ]);
  };

  const resetChat = () => {
    setMessages(initialMessages);
  };

  return (
    <div style={{
      minHeight: '100vh',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '0px',
      background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
      flex: 1
    }}>
      <div style={{
        maxWidth: '640px',
        width: '100%',
        height: '100vh',
        backgroundColor: '#efeae2',
        borderRadius: '0px',
        border: 'none',
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header with WhatsApp-style Back Arrow */}
        <div style={{ background: '#075e54', color: 'white', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => window.location.href = '/user'}
              style={{
                background: 'none',
                border: 'none',
                color: '#ffffff',
                padding: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '2px'
              }}
              title="Return to Home Page"
            >
              <ArrowLeft size={22} />
            </button>
            <img src="/whatsbro_avatar.png" alt="Avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'white', padding: '2px' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: '800' }}>Subi E-Sevai Chatbot</h3>
              <span style={{ fontSize: '0.68rem', color: '#86efac' }}>● Online 24/7 Official Support</span>
            </div>
          </div>
          <button onClick={resetChat} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Chat Body */}
        <div ref={chatBodyRef} style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {messages.map((msg, idx) => {
            const isBot = msg.sender === 'bot';
            return (
              <div
                key={msg.id || idx}
                ref={idx === Math.max(0, messages.length - 2) ? startMsgRef : null}
                style={{ alignSelf: isBot ? 'flex-start' : 'flex-end', maxWidth: '88%' }}
              >
                <div style={{
                  background: isBot ? 'white' : '#dcf8c6',
                  borderRadius: isBot ? '0px 14px 14px 14px' : '14px 0px 14px 14px',
                  padding: '12px 14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                }}>
                  {isBot && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <Bot size={16} style={{ color: '#075e54' }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#075e54' }}>Subi E-Sevai Assistant</span>
                    </div>
                  )}
                  <div style={{ fontSize: '0.84rem', color: '#1e293b', lineHeight: '1.45', whiteSpace: 'pre-line' }}>
                    {msg.text.split('\n').map((line, i) => (
                      <p key={i} style={{ margin: '0 0 4px 0' }}>
                        {line.includes('**') ? (
                          <span dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                        ) : line}
                      </p>
                    ))}
                  </div>
                  <span style={{ fontSize: '0.6rem', color: '#94a3b8', display: 'block', textAlign: 'right', marginTop: '4px' }}>{msg.timestamp}</span>
                </div>

                {/* Main Menu Options */}
                {isBot && msg.type === 'main_menu' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                    {publishedFlows.filter(f => f.status !== 'disabled').map((flow, idx) => {
                      const palette = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                      return (
                        <button
                          key={flow.id}
                          onClick={() => handleDynamicNodeClick(flow, [])}
                          style={{
                            background: 'white',
                            border: `1.5px solid ${palette.border}`,
                            borderRadius: '10px',
                            padding: '10px 14px',
                            fontSize: '0.82rem',
                            fontWeight: '800',
                            color: palette.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                            transition: 'all 0.2s ease'
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
                          <span>{flow.button_text || flow.title}</span>
                          <ChevronRight size={16} style={{ color: palette.chevron }} />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Dynamic Node Options or Final Response */}
                {isBot && msg.type === 'dynamic_flow_node' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    {msg.description && (
                      <div style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 12px', fontSize: '0.78rem', color: '#334155', whiteSpace: 'pre-line' }}>
                        {msg.description}
                      </div>
                    )}
                    {Array.isArray(msg.children) && msg.children.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {msg.children.map(child => (
                          <button
                            key={child.id}
                            onClick={() => handleDynamicNodeClick(child, msg.nodeHistory)}
                            style={{
                              background: 'white', border: '1.5px solid #10b981', borderRadius: '10px',
                              padding: '10px 14px', fontSize: '0.8rem', fontWeight: '700', color: '#065f46',
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer'
                            }}
                          >
                            <span>{child.button_text || child.title}</span>
                            <ChevronRight size={15} style={{ color: '#10b981' }} />
                          </button>
                        ))}
                      </div>
                    )}
                    {msg.response && Array.isArray(msg.response.actions) && msg.response.actions.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {msg.response.actions.map(action => (
                          <button
                            key={action.id}
                            onClick={() => handleDynamicActionClick(action)}
                            style={{
                              background: action.type === 'url' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                              color: 'white', border: 'none', borderRadius: '12px', padding: '11px 16px',
                              fontSize: '0.82rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer'
                            }}
                          >
                            {action.type === 'url' ? <ExternalLink size={16} /> : action.type === 'whatsapp_msg' ? <MessageCircle size={16} /> : <Share2 size={16} />}
                            <span>{action.button_text}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button onClick={() => handleDynamicBack(msg.nodeHistory)} style={{ flex: 1, background: 'white', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '8px', fontSize: '0.76rem', fontWeight: '700', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <ArrowLeft size={14} /> ← Back
                      </button>
                      <button onClick={handleBackToMainMenu} style={{ flex: 1, background: 'white', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '8px', fontSize: '0.76rem', fontWeight: '700', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <Home size={14} /> 🏠 Main Menu
                      </button>
                    </div>
                  </div>
                )}

                {/* WhatsApp Link Action */}
                {isBot && msg.type === 'whatsapp_link' && msg.waText && (
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <button onClick={() => sendToWhatsApp(msg.waText)} style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)', color: 'white', border: 'none', borderRadius: '12px', padding: '11px', fontSize: '0.82rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
                      <MessageCircle size={18} /> 💬 Open WhatsApp Chat
                    </button>
                    <button onClick={handleBackToMainMenu} style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '7px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', cursor: 'pointer' }}>
                      🏠 Main Menu
                    </button>
                  </div>
                )}

              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Input Footer */}
        <form onSubmit={handleCustomSend} style={{ padding: '10px 14px', backgroundColor: '#f0f2f5', borderTop: '1px solid #cbd5e1', display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Type your query (தமிழ் / English)..."
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            style={{ flex: 1, padding: '10px 14px', borderRadius: '20px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
          />
          <button type="submit" disabled={!customText.trim()} style={{ backgroundColor: customText.trim() ? '#128C7E' : '#cbd5e1', color: 'white', border: 'none', width: '38px', height: '38px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: customText.trim() ? 'pointer' : 'default' }}>
            <Send size={18} />
          </button>
        </form>

      </div>
    </div>
  );
}
