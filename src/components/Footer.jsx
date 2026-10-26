import React, { useState, useEffect, useRef } from 'react';
import {
  ExternalLink,
  ShieldCheck,
  MapPin,
  Navigation,
  PhoneCall,
  Clock,
  Briefcase,
  GraduationCap,
  Users,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { SHOP_LOCATION } from '../config/shopConfig';
import defaultFooterShowcase from '../config/footerShowcase.json';

// Custom Brand SVGs
const WhatsAppIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.335 4.978L2 22l5.188-1.36a9.924 9.924 0 0 0 4.822 1.254h.005c5.507 0 9.99-4.478 9.99-9.984 0-2.67-1.037-5.18-2.92-7.062C17.195 3.03 14.686 2 12.012 2zm0 1.664c2.227 0 4.321.868 5.898 2.445 1.577 1.578 2.446 3.673 2.446 5.89a8.31 8.31 0 0 1-8.344 8.32h-.004a8.272 8.272 0 0 1-4.218-1.155l-.303-.18-3.138.823.837-3.06-.197-.314a8.278 8.278 0 0 1-1.267-4.32c0-4.587 3.737-8.32 8.34-8.32h.05zm-3.666 4.757c-.202 0-.398.077-.547.228-.27.272-.733.722-.733 1.761 0 1.04.753 2.04.858 2.18.106.14 1.482 2.264 3.59 3.175.502.217.893.347 1.198.444.505.161.965.138 1.328.084.406-.06 1.24-.507 1.414-.997.174-.49.174-.91.122-.997-.052-.088-.192-.14-.403-.245s-1.24-.613-1.432-.683c-.193-.07-.333-.105-.473.105-.14.21-.543.684-.666.824-.122.14-.245.158-.456.053-.21-.105-.888-.327-1.692-1.045-.625-.558-1.047-1.247-1.17-1.458-.122-.21-.013-.324.092-.43.095-.095.21-.245.315-.368.105-.123.14-.21.21-.35.07-.14.035-.263-.017-.369-.053-.105-.473-1.14-.648-1.562-.17-.41-.356-.35-.49-.356h-.233z" />
  </svg>
);

const InstagramIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const TelegramIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.69 7.97c-.12.58-.47.72-.96.45l-2.61-1.92-1.26 1.21c-.14.14-.26.26-.53.26l.19-2.66 4.84-4.37c.21-.19-.05-.29-.32-.11L8.32 13.72l-2.58-.81c-.56-.17-.57-.56.12-.83l10.08-3.88c.47-.17.88.11.7.6z" />
  </svg>
);

export default function Footer({ systemSettings, onNavigateTab }) {
  const [activeLegalModal, setActiveLegalModal] = useState(null); // 'privacy' | 'terms' | null
  const [showcaseZoomModal, setShowcaseZoomModal] = useState(null);

  let showcaseList = systemSettings?.footer_showcase_images;
  if (typeof showcaseList === 'string') {
    try {
      showcaseList = JSON.parse(showcaseList);
    } catch (e) {
      showcaseList = null;
    }
  }
  if (!Array.isArray(showcaseList) || showcaseList.length === 0) {
    showcaseList = defaultFooterShowcase;
  }

  // Auto-scrolling 1:1 Carousel State
  const [currentShowcaseIdx, setCurrentShowcaseIdx] = useState(0);
  const [isAutoScrollPaused, setIsAutoScrollPaused] = useState(false);
  const touchStartXRef = useRef(null);

  // Automatically scroll / transition to next 1:1 image
  useEffect(() => {
    if (!showcaseList || showcaseList.length <= 1 || isAutoScrollPaused) return;
    const interval = setInterval(() => {
      setCurrentShowcaseIdx(prev => (prev + 1) % showcaseList.length);
    }, 3600);
    return () => clearInterval(interval);
  }, [showcaseList, isAutoScrollPaused]);

  const handleNextShowcase = (e) => {
    if (e) e.stopPropagation();
    setCurrentShowcaseIdx(prev => (prev + 1) % showcaseList.length);
  };

  const handlePrevShowcase = (e) => {
    if (e) e.stopPropagation();
    setCurrentShowcaseIdx(prev => (prev - 1 + showcaseList.length) % showcaseList.length);
  };

  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
    setIsAutoScrollPaused(true);
  };

  const handleTouchEnd = (e) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - touchEndX;
    if (diff > 40) {
      handleNextShowcase();
    } else if (diff < -40) {
      handlePrevShowcase();
    }
    touchStartXRef.current = null;
    setTimeout(() => setIsAutoScrollPaused(false), 2500);
  };



  const rawPhone = systemSettings?.whatsapp_number || '9787973615';
  const cleanPhone = rawPhone.replace(/\D/g, '');
  const internationalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const userCount = systemSettings?.user_count || 0;
  const totalServed = 124 + Number(userCount);

  // External contact links
  const whatsappUrl = `https://wa.me/${internationalPhone}`;
  const instagramUrl = systemSettings?.instagram_url || 'https://instagram.com/';
  const telegramUrl = systemSettings?.telegram_url || 'https://t.me/';
  const callUrl = `tel:+${internationalPhone}`;

  // Group links
  const jobAlertGroupUrl = systemSettings?.job_group_link || systemSettings?.whatsapp_group_link || 'https://chat.whatsapp.com/';
  const studyGroupUrl = systemSettings?.study_group_link || systemSettings?.whatsapp_group_link || 'https://chat.whatsapp.com/';
  const communityGroupUrl = systemSettings?.community_group_link || systemSettings?.whatsapp_group_link || 'https://chat.whatsapp.com/';

  return (
    <footer
      id="about-footer-section"
      style={{
        background: 'linear-gradient(180deg, #075a50 0%, #054840 50%, #033a33 100%)',
        color: '#ffffff',
        borderTop: '3px solid #10b981',
        boxShadow: '0 -10px 30px rgba(7, 90, 80, 0.35), 0 -2px 10px rgba(16, 185, 129, 0.3)',
        padding: '28px 16px 85px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '22px',
        fontSize: '0.85rem',
        lineHeight: 1.5,
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* SECTION A: About SUBI e-Sevai */}
      <div
        className="footer-card-interactive scroll-reveal"
        data-scroll-reveal
        style={{
          background: '#ffffff',
          borderRadius: '18px',
          padding: '20px',
          border: '1.5px solid #d1fae5',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.16)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #047857 0%, #10b981 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
              flexShrink: 0
            }}
          >
            <ShieldCheck size={26} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#075a50', letterSpacing: '-0.02em' }}>
                SUBI e-Sevai
              </h3>
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: '800',
                  background: '#dcfce7', color: '#075a50', padding: '2px 7px', borderRadius: '12px', border: '1px solid #a7f3d0'
                }}
              >
                CSC Verified
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: '#075a50', fontWeight: '700' }}>
              இ சேவை மையம் & CSC பொது சேவை மையம்
            </p>
          </div>
        </div>

        <p style={{ margin: '10px 0 14px 0', fontSize: '0.82rem', color: '#334155', lineHeight: '1.55' }}>
          <strong>SUBI e-Sevai</strong> is your authorized neighborhood Common Service Centre (CSC) offering fast, verified, and hassle-free assistance for all Tamil Nadu Government certificates, Aadhaar updates, PAN card applications, Voter IDs, Passport appointments, online job applications, and educational study resources.
        </p>

        {/* Single 1:1 Featured Showcase with Auto-Scroll */}
        <div style={{ marginTop: '14px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#075a50', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>✨</span> Highlight
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontSize: '0.62rem',
                  color: '#047857',
                  fontWeight: '700',
                  background: '#dcfce7',
                  border: '1px solid #bbf7d0',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: isAutoScrollPaused ? '#94a3b8' : '#10b981',
                    display: 'inline-block'
                  }}
                />
              </span>
            </div>
          </div>

          {/* 1:1 Aspect Ratio Auto-Slide Showcase Card */}
          <div
            onMouseEnter={() => setIsAutoScrollPaused(true)}
            onMouseLeave={() => setIsAutoScrollPaused(false)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '100%',
              margin: '0',
              aspectRatio: '1 / 1',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(6, 78, 59, 0.12)',
              border: '2px solid #bbf7d0',
              background: '#064e3b'
            }}
          >
            {/* Sliding Track for 1:1 items */}
            <div
              style={{
                display: 'flex',
                width: `${showcaseList.length * 100}%`,
                height: '100%',
                transform: `translateX(-${currentShowcaseIdx * (100 / showcaseList.length)}%)`,
                transition: 'transform 0.55s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              {showcaseList.map((item, idx) => (
                <div
                  key={item.id || idx}
                  onClick={() => {
                    if (item.link) {
                      if (item.link.startsWith('http')) {
                        window.open(item.link, '_blank');
                      } else if (onNavigateTab && item.link.includes('tab=')) {
                        const m = item.link.match(/tab=([a-zA-Z0-9_-]+)/);
                        if (m) onNavigateTab(m[1]);
                      } else {
                        window.location.href = item.link;
                      }
                    } else {
                      setShowcaseZoomModal(item);
                    }
                  }}
                  style={{
                    position: 'relative',
                    width: `${100 / showcaseList.length}%`,
                    height: '100%',
                    aspectRatio: '1 / 1',
                    flexShrink: 0,
                    cursor: item.link ? 'pointer' : 'zoom-in',
                    overflow: 'hidden'
                  }}
                >
                  <img
                    src={item.image}
                    alt={item.title || 'Showcase'}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                    onError={(e) => {
                      e.target.src = '/income_og_preview.jpg';
                    }}
                  />

                  {/* Gradient Overlay & Badge */}
                  {(item.title || item.subtitle || item.link) && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: '24px 12px 10px 12px',
                        background: 'linear-gradient(to top, rgba(6, 78, 59, 0.92) 0%, rgba(6, 78, 59, 0.45) 60%, transparent 100%)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        color: '#ffffff'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {item.title && (
                            <div
                              style={{
                                fontSize: '0.88rem',
                                fontWeight: '800',
                                color: '#ffffff',
                                lineHeight: '1.25',
                                textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {item.title}
                            </div>
                          )}
                          {item.subtitle && (
                            <div
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: '600',
                                color: '#86efac',
                                marginTop: '2px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {item.subtitle}
                            </div>
                          )}
                        </div>

                        {item.link ? (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: '800',
                              background: '#10b981',
                              color: '#ffffff',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                            }}
                          >
                            View <ExternalLink size={10} />
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: '700',
                              background: 'rgba(255,255,255,0.2)',
                              color: '#ffffff',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              flexShrink: 0
                            }}
                          >
                            Tap to zoom
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Prev / Next Arrows */}
            {showcaseList.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevShowcase}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '8px',
                    transform: 'translateY(-50%)',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.88)',
                    color: '#064e3b',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    zIndex: 3
                  }}
                  title="Previous"
                >
                  <ChevronLeft size={18} />
                </button>

                <button
                  type="button"
                  onClick={handleNextShowcase}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    right: '8px',
                    transform: 'translateY(-50%)',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.88)',
                    color: '#064e3b',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    zIndex: 3
                  }}
                  title="Next"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}

            {/* Progress Dots inside 1:1 card at top */}
            <div
              style={{
                position: 'absolute',
                top: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '6px',
                background: 'rgba(0, 0, 0, 0.45)',
                backdropFilter: 'blur(4px)',
                padding: '4px 8px',
                borderRadius: '12px',
                zIndex: 3
              }}
            >
              {showcaseList.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentShowcaseIdx(idx);
                  }}
                  style={{
                    width: currentShowcaseIdx === idx ? '18px' : '6px',
                    height: '6px',
                    borderRadius: '3px',
                    background: currentShowcaseIdx === idx ? '#4ade80' : 'rgba(255, 255, 255, 0.5)',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  title={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION B: Our Community & Resource Groups */}
      <div className="scroll-reveal" data-scroll-reveal>
        <h4 style={{ margin: '0 0 4px 0', fontSize: '0.98rem', fontWeight: '800', color: '#ffffff' }}>
          Our Community & Resource Groups
        </h4>
        <p style={{ margin: '0 0 12px 0', fontSize: '0.72rem', color: '#d1fae5' }}>
          Join our official WhatsApp & Telegram channels for instant alerts
        </p>

        <div className="scroll-stagger" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Group 1: Job Alert Group */}
          <a
            href={jobAlertGroupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="footer-group-card scroll-reveal"
            data-scroll-reveal
            style={{
              textDecoration: 'none',
              background: '#ffffff',
              border: '1.5px solid #dbeafe',
              borderRadius: '14px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                className="footer-group-icon"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#dbeafe',
                  color: '#1d4ed8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Briefcase size={18} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: '800', color: '#1e293b' }}>
                    Job Alert Group
                  </span>
                  <span className="badge-highlight-pulse" style={{ fontSize: '0.62rem', fontWeight: '800', background: '#047857', color: '#ffffff', padding: '1px 6px', borderRadius: '4px' }}>
                    DAILY JOBS
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                  TN Govt, Central Govt, Banking & Railway vacancies
                </div>
              </div>
            </div>
            <ExternalLink size={16} color="#047857" className="footer-external-icon" />
          </a>

          {/* Group 2: Study Material Group */}
          <a
            href={studyGroupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="footer-group-card scroll-reveal"
            data-scroll-reveal
            style={{
              textDecoration: 'none',
              background: '#ffffff',
              border: '1.5px solid #fef3c7',
              borderRadius: '14px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                className="footer-group-icon"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#fef3c7',
                  color: '#b45309',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <GraduationCap size={18} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: '800', color: '#1e293b' }}>
                    Study Material Group
                  </span>
                  <span className="badge-highlight-pulse" style={{ fontSize: '0.62rem', fontWeight: '800', background: '#d97706', color: '#ffffff', padding: '1px 6px', borderRadius: '4px' }}>
                    FREE NOTES
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                  Model question papers, syllabus, notes & exam guides
                </div>
              </div>
            </div>
            <ExternalLink size={16} color="#047857" className="footer-external-icon" />
          </a>

          {/* Group 3: More Groups */}
          <a
            href={communityGroupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="footer-group-card scroll-reveal"
            data-scroll-reveal
            style={{
              textDecoration: 'none',
              background: '#ffffff',
              border: '1.5px solid #e0e7ff',
              borderRadius: '14px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                className="footer-group-icon"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#e0e7ff',
                  color: '#4338ca',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Users size={18} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: '800', color: '#1e293b' }}>
                    More Groups & Welfare Alerts
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                  Ration Card updates, TN welfare schemes & public news
                </div>
              </div>
            </div>
            <ExternalLink size={16} color="#047857" className="footer-external-icon" />
          </a>
        </div>
      </div>

      {/* SECTION C: Our Contact */}
      <div className="scroll-reveal" data-scroll-reveal>
        <h4 style={{ margin: '0 0 4px 0', fontSize: '0.98rem', fontWeight: '800', color: '#ffffff' }}>
          Our Contact & Social Connect
        </h4>
        <p style={{ margin: '0 0 12px 0', fontSize: '0.72rem', color: '#d1fae5' }}>
          Connect directly with our support desk anytime
        </p>

        <div
          className="scroll-stagger"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px'
          }}
        >
          {/* WhatsApp */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="footer-contact-btn scroll-reveal"
            data-scroll-reveal
            style={{
              textDecoration: 'none',
              background: '#25D366',
              color: '#ffffff',
              borderRadius: '12px',
              padding: '11px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontWeight: '800',
              fontSize: '0.84rem',
              boxShadow: '0 4px 10px rgba(37, 211, 102, 0.25)'
            }}
          >
            <WhatsAppIcon size={18} />
            <span>WhatsApp</span>
          </a>

          {/* Instagram */}
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="footer-contact-btn scroll-reveal"
            data-scroll-reveal
            style={{
              textDecoration: 'none',
              background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
              color: '#ffffff',
              borderRadius: '12px',
              padding: '11px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontWeight: '800',
              fontSize: '0.84rem',
              boxShadow: '0 4px 10px rgba(220, 39, 67, 0.25)'
            }}
          >
            <InstagramIcon size={18} />
            <span>Instagram</span>
          </a>

          {/* Telegram */}
          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="footer-contact-btn scroll-reveal"
            data-scroll-reveal
            style={{
              textDecoration: 'none',
              background: '#0088cc',
              color: '#ffffff',
              borderRadius: '12px',
              padding: '11px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontWeight: '800',
              fontSize: '0.84rem',
              boxShadow: '0 4px 10px rgba(0, 136, 204, 0.25)'
            }}
          >
            <TelegramIcon size={18} />
            <span>Telegram</span>
          </a>

          {/* Call */}
          <a
            href={callUrl}
            className="footer-contact-btn scroll-reveal"
            data-scroll-reveal
            style={{
              textDecoration: 'none',
              background: 'linear-gradient(135deg, #047857 0%, #10b981 100%)',
              color: '#ffffff',
              borderRadius: '12px',
              padding: '11px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontWeight: '800',
              fontSize: '0.84rem',
              boxShadow: '0 4px 10px rgba(4, 120, 87, 0.25)'
            }}
          >
            <PhoneCall size={18} />
            <span>Call Us</span>
          </a>
        </div>
      </div>

      {/* SECTION D: Our Location — User Location to Shop Directions */}
      <div
        id="footer-location-section"
        className="footer-card-interactive scroll-reveal"
        data-scroll-reveal
        style={{
          background: '#ffffff',
          borderRadius: '18px',
          padding: '18px',
          border: '2px solid #a7f3d0',
          boxShadow: '0 8px 25px -4px rgba(16, 185, 129, 0.14)',
          position: 'relative'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <MapPin size={22} color="#047857" />
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#075a50' }}>
            Our Location — Visit Our Centre
          </h4>
        </div>

        <p style={{ margin: '0 0 12px 0', fontSize: '0.78rem', color: '#334155', lineHeight: '1.4' }}>
          📍 <strong>{SHOP_LOCATION.name}</strong>, {SHOP_LOCATION.address}.
        </p>

        {/* Responsive Embedded Google Map */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '180px',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1.5px solid #cbd5e1',
            marginBottom: '14px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
          }}
        >
          <iframe
            title="SUBI e-Sevai Location Map"
            src={SHOP_LOCATION.embedUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        {/* Prominent Animated & Highlighted "Loc" Directions Button */}
        <div>
          <a
            id="footer-loc-directions-btn"
            href={SHOP_LOCATION.directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Get Directions from your location to SUBI e-Sevai"
            className="loc-btn-highlight"
            style={{
              textDecoration: 'none',
              color: '#ffffff',
              borderRadius: '14px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              fontWeight: '800',
              fontSize: '0.94rem',
              width: '100%',
              boxSizing: 'border-box',
              cursor: 'pointer',
              border: '1.5px solid rgba(255, 255, 255, 0.35)'
            }}
          >
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.24)',
                borderRadius: '8px',
                padding: '3px 9px',
                fontSize: '0.78rem',
                fontWeight: '900',
                letterSpacing: '0.06em',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span className="loc-beacon-dot" />
              <span>LOC</span>
            </div>
            <Navigation size={19} className="loc-nav-icon" />
            <span style={{ letterSpacing: '0.01em' }}>Get Directions on Google Maps</span>
          </a>
        </div>
      </div>

      {/* SECTION E: Working Hours, Trust & Copyright Bottom Box */}
      <div
        className="scroll-reveal"
        data-scroll-reveal
        style={{
          background: 'linear-gradient(135deg, #043831 0%, #022621 100%)',
          borderRadius: '14px',
          padding: '16px',
          color: '#dcfce7',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          fontSize: '0.74rem',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ffffff' }}>
          <Clock size={15} color="#4ade80" />
          <span>
            <strong>Working Hours:</strong> Mon – Sat: 9:00 AM – 9:00 PM | Sun: 10:00 AM – 2:00 PM
          </span>
        </div>

        {/* Privacy Policy & Terms Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.15)', paddingTop: '8px' }}>
          <button
            onClick={() => setActiveLegalModal('privacy')}
            style={{
              background: 'none',
              border: 'none',
              color: '#dcfce7',
              fontSize: '0.72rem',
              fontWeight: '700',
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'underline'
            }}
          >
            Privacy Policy
          </button>
          <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>•</span>
          <button
            onClick={() => setActiveLegalModal('terms')}
            style={{
              background: 'none',
              border: 'none',
              color: '#dcfce7',
              fontSize: '0.72rem',
              fontWeight: '700',
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'underline'
            }}
          >
            Terms & Conditions
          </button>
        </div>

        {/* Copyright & Developer Line */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.15)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ color: '#ecfdf5' }}>
            © 2026 <strong>SUBI e-Sevai</strong>. All rights reserved.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#bbf7d0', fontSize: '0.7rem' }}>
            <span>Designed & Developed By: <strong>J-D / Dechnology</strong></span>
            <ExternalLink size={10} />
          </div>
        </div>
      </div>

      {/* Legal Information Modal (Privacy Policy / Terms) */}
      {activeLegalModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '16px'
          }}
          onClick={() => setActiveLegalModal(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              padding: '20px',
              border: '1.5px solid #10b981',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#064e3b', fontSize: '1.05rem', fontWeight: '800' }}>
                {activeLegalModal === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions'}
              </h3>
              <button
                onClick={() => setActiveLegalModal(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: '1.6' }}>
              {activeLegalModal === 'privacy' ? (
                <>
                  <p><strong>1. Data Confidentiality:</strong> SUBI e-Sevai respects customer privacy. All personal documents (Aadhaar, PAN, Certificates) provided for application processing are kept strictly confidential.</p>
                  <p><strong>2. Usage:</strong> Information collected is utilized exclusively for the specific e-governance, certificate, or job application authorized by the user.</p>
                  <p><strong>3. Security:</strong> We do not share, sell, or disclose personal data to third parties.</p>
                </>
              ) : (
                <>
                  <p><strong>1. Authorized Services:</strong> SUBI e-Sevai provides authorized Common Service Centre (CSC) and e-District citizen facilitation services.</p>
                  <p><strong>2. Accurate Details:</strong> Applicants are requested to verify their application data and certificates before final submission to avoid government rejection.</p>
                  <p><strong>3. Processing Times:</strong> Government processing times are subject to respective department scrutiny and protocols.</p>
                </>
              )}
            </div>

            <button
              onClick={() => setActiveLegalModal(null)}
              style={{
                marginTop: '16px',
                width: '100%',
                background: '#047857',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '10px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 1:1 Showcase Zoom Lightbox Modal */}
      {showcaseZoomModal && (
        <div
          onClick={() => setShowcaseZoomModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(6px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '380px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              position: 'relative'
            }}
          >
            {/* 1:1 Square Image Container */}
            <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', background: '#064e3b' }}>
              <img
                src={showcaseZoomModal.image}
                alt={showcaseZoomModal.title || 'Showcase'}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { e.target.src = '/income_og_preview.jpg'; }}
              />
              <button
                onClick={() => setShowcaseZoomModal(null)}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(0, 0, 0, 0.65)',
                  color: '#ffffff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '16px 20px', textAlign: 'center' }}>
              {showcaseZoomModal.title && (
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1.02rem', fontWeight: '800', color: '#064e3b' }}>
                  {showcaseZoomModal.title}
                </h4>
              )}
              {showcaseZoomModal.subtitle && (
                <p style={{ margin: '0 0 14px 0', fontSize: '0.8rem', color: '#047857', fontWeight: '600' }}>
                  {showcaseZoomModal.subtitle}
                </p>
              )}
              <button
                onClick={() => setShowcaseZoomModal(null)}
                style={{
                  width: '100%',
                  background: '#047857',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}

