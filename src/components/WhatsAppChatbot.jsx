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
        bottom: '85px',
        right: '18px',
        zIndex: 9998,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
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
      <Link
        to="/chatbot"
        onClick={() => playSelectSound()}
        title="Open 24/7 WhatsApp Chatbot"
        aria-label="24/7 WhatsApp Chatbot"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
          color: '#ffffff',
          textDecoration: 'none',
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
          position: 'relative',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent'
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
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'scale(0.96)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'scale(1.06) translateY(-2px)';
        }}
      >
        {/* Online Indicator Dot */}
        <span
          style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            width: '12px',
            height: '12px',
            backgroundColor: '#22c55e',
            border: '2px solid #ffffff',
            borderRadius: '50%',
            boxShadow: '0 0 8px #22c55e'
          }}
        />

        {/* WhatsApp SVG Icon */}
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
          <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.335 4.978L2 22l5.188-1.36a9.924 9.924 0 0 0 4.822 1.254h.005c5.507 0 9.99-4.478 9.99-9.984 0-2.67-1.037-5.18-2.92-7.062C17.195 3.03 14.686 2 12.012 2zm0 1.664c2.227 0 4.321.868 5.898 2.445 1.577 1.578 2.446 3.673 2.446 5.89a8.31 8.31 0 0 1-8.344 8.32h-.004a8.272 8.272 0 0 1-4.218-1.155l-.303-.18-3.138.823.837-3.06-.197-.314a8.278 8.278 0 0 1-1.267-4.32c0-4.587 3.737-8.32 8.34-8.32h.05zm-3.666 4.757c-.202 0-.398.077-.547.228-.27.272-.733.722-.733 1.761 0 1.04.753 2.04.858 2.18.106.14 1.482 2.264 3.59 3.175.502.217.893.347 1.198.444.505.161.965.138 1.328.084.406-.06 1.24-.507 1.414-.997.174-.49.174-.91.122-.997-.052-.088-.192-.14-.403-.245s-1.24-.613-1.432-.683c-.193-.07-.333-.105-.473.105-.14.21-.543.684-.666.824-.122.14-.245.158-.456.053-.21-.105-.888-.327-1.692-1.045-.625-.558-1.047-1.247-1.17-1.458-.122-.21-.013-.324.092-.43.095-.095.21-.245.315-.368.105-.123.14-.21.21-.35.07-.14.035-.263-.017-.369-.053-.105-.473-1.14-.648-1.562-.17-.41-.356-.35-.49-.356h-.233z" />
        </svg>

        <span>24/7 WhatsApp Chatbot</span>
      </Link>
    </div>
  );
}
