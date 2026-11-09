import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { playSelectSound } from '../utils/sound';

export default function WhatsAppChatbot({ systemSettings }) {
  const location = useLocation();

  const isChatPage = location.pathname.toLowerCase().startsWith('/user/chatbot') || 
                     location.pathname.toLowerCase().startsWith('/chatbot') || 
                     location.pathname.toLowerCase().startsWith('/chat');

  const [hiddenByPage, setHiddenByPage] = useState(false);

  // Event listener to hide floating chatbot on specific pages if requested (e.g. form modals)
  useEffect(() => {
    const handleHideEvent = (e) => {
      setHiddenByPage(!!e.detail);
    };
    window.addEventListener('hide-whatsapp-chatbot', handleHideEvent);
    return () => window.removeEventListener('hide-whatsapp-chatbot', handleHideEvent);
  }, []);

  if (hiddenByPage || isChatPage) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '72px',
        right: '8px',
        zIndex: 9998,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      <style>{`
        @keyframes chatbotImgFloat {
          0%, 100% {
            transform: translateY(0);
            filter: drop-shadow(0 6px 16px rgba(0, 0, 0, 0.32)) drop-shadow(0 0 10px rgba(37, 211, 102, 0.5));
          }
          50% {
            transform: translateY(-4px) scale(1.02);
            filter: drop-shadow(0 10px 22px rgba(0, 0, 0, 0.4)) drop-shadow(0 0 16px rgba(37, 211, 102, 0.8));
          }
        }
        .chatbot-img-btn:hover {
          animation: none !important;
          transform: scale(1.06) translateY(-3px) !important;
          filter: drop-shadow(0 12px 26px rgba(0, 0, 0, 0.45)) drop-shadow(0 0 20px rgba(37, 211, 102, 0.9)) !important;
        }
        .chatbot-img-btn:active {
          transform: scale(0.96) !important;
        }
      `}</style>
      <Link
        to="/chatbot"
        onClick={() => playSelectSound()}
        title="Open e Sevai 2.0 Chatbot"
        aria-label="e Sevai 2.0 Chatbot"
        className="chatbot-img-btn"
        style={{
          display: 'block',
          position: 'relative',
          textDecoration: 'none',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          animation: 'chatbotImgFloat 2.6s infinite ease-in-out',
          transition: 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
      >
        {/* Glowing Online Indicator Dot */}
        <span
          style={{
            position: 'absolute',
            top: '12px',
            right: '18px',
            width: '13px',
            height: '13px',
            backgroundColor: '#22c55e',
            border: '2px solid #ffffff',
            borderRadius: '50%',
            boxShadow: '0 0 10px #22c55e',
            zIndex: 10
          }}
        />

        {/* 3D Glossy Image Button (Big Size) */}
        <img
          src="/esevai_chatbot_button.png?v=2"
          alt="e Sevai 2.0 Chatbot"
          style={{
            height: '82px',
            width: 'auto',
            display: 'block',
            maxWidth: '265px',
            pointerEvents: 'none'
          }}
        />
      </Link>
    </div>
  );
}
