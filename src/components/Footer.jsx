import React from 'react';
import { ExternalLink } from 'lucide-react';

export default function Footer({ systemSettings }) {
  const userCount = systemSettings?.user_count || 0;
  const totalCount = 124 + Number(userCount);

  return (
    <footer className="premium-footer-new">
      <div className="footer-content-wrap">
        
        {/* Left Side: Brand Details & Served Count */}
        <div className="footer-left-side">
          <div className="logo-footer-section" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <img 
              src="/whatsbro_avatar.png" 
              alt="WhatsBro logo" 
              style={{ width: '24px', height: '24px', objectFit: 'contain' }} 
            />
            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#ffffff' }}>Subi e sevai</span>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '12px', fontSize: '0.6rem', fontWeight: 'bold', color: '#ffffff' }}>
              <span style={{ display: 'inline-block', width: '4px', height: '4px', borderRadius: '50%', background: '#4ade80' }}></span>
              Served: {totalCount}+ Users
            </div>
          </div>
          <div style={{ fontSize: '0.65rem', color: '#dcfce7', marginTop: '3px', opacity: 0.9 }}>
            Online Application Assistant
          </div>
        </div>

        {/* Right Side: Compact Help Desk WhatsApp Badge */}
        <div className="footer-right-side">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.7rem', color: 'white', fontWeight: 'bold' }}>Support:</span>
            <a 
              href="https://wa.me/919787973615" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: '#25D366',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '0.7rem',
                fontWeight: 'bold',
                textDecoration: 'none',
                boxShadow: '0 2px 5px rgba(37, 211, 102, 0.2)',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#128C7E';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#25D366';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.335 4.978L2 22l5.188-1.36a9.924 9.924 0 0 0 4.822 1.254h.005c5.507 0 9.99-4.478 9.99-9.984 0-2.67-1.037-5.18-2.92-7.062C17.195 3.03 14.686 2 12.012 2zm0 1.664c2.227 0 4.321.868 5.898 2.445 1.577 1.578 2.446 3.673 2.446 5.89a8.31 8.31 0 0 1-8.344 8.32h-.004a8.272 8.272 0 0 1-4.218-1.155l-.303-.18-3.138.823.837-3.06-.197-.314a8.278 8.278 0 0 1-1.267-4.32c0-4.587 3.737-8.32 8.34-8.32h.05zm-3.666 4.757c-.202 0-.398.077-.547.228-.27.272-.733.722-.733 1.761 0 1.04.753 2.04.858 2.18.106.14 1.482 2.264 3.59 3.175.502.217.893.347 1.198.444.505.161.965.138 1.328.084.406-.06 1.24-.507 1.414-.997.174-.49.174-.91.122-.997-.052-.088-.192-.14-.403-.245s-1.24-.613-1.432-.683c-.193-.07-.333-.105-.473.105-.14.21-.543.684-.666.824-.122.14-.245.158-.456.053-.21-.105-.888-.327-1.692-1.045-.625-.558-1.047-1.247-1.17-1.458-.122-.21-.013-.324.092-.43.095-.095.21-.245.315-.368.105-.123.14-.21.21-.35.07-.14.035-.263-.017-.369-.053-.105-.473-1.14-.648-1.562-.17-.41-.356-.35-.49-.356h-.233z" />
              </svg>
              <span>WhatsApp</span>
            </a>
          </div>
          <div style={{ fontSize: '0.6rem', color: '#86efac', marginTop: '3px', opacity: 0.8 }}>
            Quick Online Support
          </div>
        </div>

      </div>

      <div className="footer-bottom-row-new">
        <span>© 2026 Burkitmanagaram.</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          Powered by TEC Boys <ExternalLink size={8} />
        </span>
      </div>
    </footer>
  );
}
