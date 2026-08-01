import React, { useState, useEffect } from 'react';
import { User, LogOut, MessageSquare, X, ChevronDown, Send, ArrowLeft, Star } from 'lucide-react';
import { submitFeedback, getFeedback } from '../services/db';

export default function Header({ currentUser, onLogout, onLoginTrigger, onInstallApp, isAdmin }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    if (!isProfileOpen) return;

    const handleOutsideClick = (e) => {
      const popover = document.getElementById('profile-popover-container');
      const avatarBtn = document.getElementById('profile-avatar-button');
      if (popover && !popover.contains(e.target) && avatarBtn && !avatarBtn.contains(e.target)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isProfileOpen]);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [modalSubView, setModalSubView] = useState('menu'); // 'menu' | 'reviews' | 'chat'

  // Feedback list states
  const [feedbackList, setFeedbackList] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // Review form states
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Private chat states
  const [chatMessageText, setChatMessageText] = useState('');
  const [chatSubmitting, setChatSubmitting] = useState(false);

  const fetchFeedbackData = async () => {
    setFeedbackLoading(true);
    try {
      const data = await getFeedback();
      setFeedbackList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching feedback:', err);
    } finally {
      setFeedbackLoading(false);
    }
  };

  useEffect(() => {
    if (isFeedbackOpen) {
      fetchFeedbackData();
      setModalSubView('menu');
    }
  }, [isFeedbackOpen]);



  const getAvatarUrl = () => {
    if (currentUser && currentUser.photo_url) {
      // Direct file download stream
      if (currentUser.photo_url.includes('drive.google.com')) {
        const fileId = currentUser.photo_url.match(/id=([^&]+)/)?.[1] || currentUser.photo_url.split('/d/')?.[1]?.split('/')?.[0];
        if (fileId) return `https://drive.google.com/uc?export=download&id=${fileId}`;
      }
      return currentUser.photo_url;
    }
    // Sleek premium default avatar placeholder (Demo person)
    return '/default_avatar.png';
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewText.trim()) {
      alert('Please enter your review message.');
      return;
    }
    setReviewSubmitting(true);
    try {
      await submitFeedback(
        currentUser ? currentUser.name : 'Anonymous',
        currentUser ? currentUser.phone : '',
        currentUser ? currentUser.aadhar : '',
        reviewText,
        reviewRating
      );
      alert('Review submitted successfully!');
      setReviewText('');
      fetchFeedbackData();
    } catch (err) {
      console.error(err);
      alert('Failed to submit review.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatMessageText.trim()) {
      alert('Please enter a message.');
      return;
    }
    setChatSubmitting(true);
    try {
      await submitFeedback(
        currentUser ? currentUser.name : 'Citizen',
        currentUser ? currentUser.phone : '',
        currentUser ? currentUser.aadhar : '',
        chatMessageText,
        0
      );
      alert('Message sent successfully!');
      setChatMessageText('');
      fetchFeedbackData();
    } catch (err) {
      console.error(err);
      alert('Failed to send message.');
    } finally {
      setChatSubmitting(false);
    }
  };

  return (
    <header className="fixed-header" style={{ padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 9999 }}>
      <div className="logo-container" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img
          src="/whatsbro_logo.png"
          alt="WhatsBro Logo"
          style={{
            width: '48px',
            height: '48px',
            objectFit: 'contain',
            filter: 'hue-rotate(-4deg) saturate(70%) brightness(195%)',
            pointerEvents: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none'
          }}
        />
        <div>
          <div className="brand-name" style={{ fontSize: '1.4rem', lineHeight: '1.2' }}>Subi - e seva</div>
          <div className="brand-subtitle" style={{ fontSize: '0.8rem' }}>தமிழ் நாடு முழுவதும் </div>
        </div>
      </div>

      {!isAdmin && (
        <div className="header-auth-section" style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>

              {/* Circular profile avatar button */}
              <button
                id="profile-avatar-button"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  borderRadius: '50%',
                  outline: 'none'
                }}
              >
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '2px solid var(--primary)',
                  boxShadow: '0 2px 8px rgba(30, 168, 103, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#f1f5f9'
                }}>
                  <img
                    src={getAvatarUrl()}
                    alt={currentUser.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.target.onerror = null; e.target.src = '/default_avatar.png'; }}
                  />
                </div>
              </button>

              {/* Profile Popover Overlay Dropdown */}
              {isProfileOpen && (
                <div
                  id="profile-popover-container"
                  style={{
                    position: 'absolute',
                    top: '46px',
                    right: 0,
                    width: '240px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '16px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    zIndex: 99999
                  }}>
                  {/* Large avatar and details */}
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '3px solid var(--primary)',
                    background: '#f8fafc',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.06)'
                  }}>
                    <img
                      src={getAvatarUrl()}
                      alt={currentUser.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.target.onerror = null; e.target.src = '/default_avatar.png'; }}
                    />
                  </div>

                  <div style={{ textAlign: 'center', width: '100%' }}>
                    <h4 style={{ margin: '0 0 2px 0', fontSize: '0.9rem', fontWeight: '800', color: '#1e293b' }}>{currentUser.name}</h4>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>Phone: {currentUser.phone}</p>

                  </div>

                  <div style={{ width: '100%', borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Feedback button */}
                    <button
                      onClick={() => setIsFeedbackOpen(true)}
                      className="premium-btn premium-btn-success"
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        width: '100%'
                      }}
                    >
                      <MessageSquare size={14} /> Give Feedback
                    </button>

                    {/* Logout Option button */}
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        onLogout();
                      }}
                      className="premium-btn premium-btn-danger"
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        width: '100%',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none'
                      }}
                    >
                      <LogOut size={14} /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Prominent and highly visible green Login button at top
            <button
              onClick={onLoginTrigger}
              className="premium-btn premium-btn-success"
              style={{
                fontSize: '0.8rem',
                fontWeight: '800',
                padding: '8px 16px',
                width: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '24px',
                background: '#10b981',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                transition: 'all 0.2s',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.25)';
              }}
            >
              <User size={14} />
            </button>
          )}
        </div>
      )}

      {/* Floating Modal for feedback form */}
      {isFeedbackOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15,23,42,0.3)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999999,
          padding: '16px'
        }}>
          <div className="auth-card" style={{
            background: 'white',
            width: '100%',
            maxWidth: '380px',
            borderRadius: '16px',
            border: '1px solid #cbd5e1',
            padding: '20px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {/* Close button - always visible */}
            <button
              onClick={() => setIsFeedbackOpen(false)}
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                zIndex: 10
              }}
            >
              <X size={18} />
            </button>

            {/* Sub-view: MENU */}
            {modalSubView === 'menu' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: '800', color: '#1e293b' }}>Feedback & Support</h3>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', margin: 0 }}>Select an option to proceed</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    onClick={() => setModalSubView('reviews')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      background: '#f8fafc',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary)';
                      e.currentTarget.style.background = 'rgba(16,185,129,0.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.background = '#f8fafc';
                    }}
                  >
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div style={{ padding: '8px', background: '#dcfce7', color: '#16803d', borderRadius: '8px', display: 'flex' }}>
                        <Star size={20} fill="#16803d" />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#1e293b', display: 'block' }}>Citizen Reviews</span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Read and write public reviews</span>
                      </div>
                    </div>
                    <ChevronDown size={18} style={{ transform: 'rotate(-90deg)', color: '#94a3b8' }} />
                  </button>

                  {currentUser ? (
                    <button
                      onClick={() => setModalSubView('chat')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px',
                        background: '#f8fafc',
                        border: '1.5px solid #cbd5e1',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                        outline: 'none'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--secondary)';
                        e.currentTarget.style.background = 'rgba(99,102,241,0.02)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.background = '#f8fafc';
                      }}
                    >
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ padding: '8px', background: '#e0f2fe', color: '#0284c7', borderRadius: '8px', display: 'flex' }}>
                          <MessageSquare size={20} fill="#0284c7" />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#1e293b', display: 'block' }}>Support Inquiry</span>
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Private support chat with admin</span>
                        </div>
                      </div>
                      <ChevronDown size={18} style={{ transform: 'rotate(-90deg)', color: '#94a3b8' }} />
                    </button>
                  ) : (
                    <div style={{
                      padding: '12px',
                      background: '#fee2e2',
                      border: '1px solid #fca5a5',
                      borderRadius: '12px',
                      textAlign: 'center',
                      fontSize: '0.75rem',
                      color: '#991b1b',
                      fontWeight: '600'
                    }}>
                      🔒 Log in to access direct support chat.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sub-view: REVIEWS */}
            {modalSubView === 'reviews' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginBottom: '4px' }}>
                  <button
                    onClick={() => setModalSubView('menu')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px', color: '#64748b' }}
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1e293b' }}>Citizen Reviews</span>
                </div>

                {/* Review form */}
                {currentUser ? (
                  <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#1e293b' }}>
                        Review as: <span style={{ color: 'var(--primary)', fontWeight: '800' }}>{currentUser.name}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#475569' }}>Rating:</span>
                        <div style={{ display: 'flex', gap: '2px', height: '28px', alignItems: 'center' }}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewRating(star)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: star <= reviewRating ? '#f59e0b' : '#cbd5e1', padding: 0 }}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <textarea
                        rows={2}
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        required
                        placeholder="Share your experience..."
                        style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'none', outline: 'none', fontFamily: 'inherit' }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={reviewSubmitting}
                      className="premium-btn premium-btn-success"
                      style={{ padding: '6px 12px', fontSize: '0.72rem', alignSelf: 'flex-end', width: 'auto', fontWeight: '700' }}
                    >
                      {reviewSubmitting ? 'Submitting...' : 'Submit'}
                    </button>
                  </form>
                ) : (
                  <div style={{ padding: '12px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '10px', fontSize: '0.72rem', color: '#991b1b', fontWeight: '600', textAlign: 'center' }}>
                    🔒 Please log in to write a review.
                  </div>
                )}

                {/* Reviews List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '220px', overflowY: 'auto', paddingRight: '4px' }}>
                  {feedbackLoading ? (
                    <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b' }}>Loading reviews...</div>
                  ) : feedbackList.filter(f => parseInt(f.rating) > 0).length === 0 ? (
                    <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>No reviews yet.</div>
                  ) : (
                    feedbackList.filter(f => parseInt(f.rating) > 0).map(review => (
                      <div key={review.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#1e293b' }}>{review.user_name}</span>
                          <div style={{ display: 'flex' }}>
                            {[1, 2, 3, 4, 5].map(s => (
                              <span key={s} style={{ fontSize: '0.75rem', color: s <= parseInt(review.rating) ? '#f59e0b' : '#cbd5e1' }}>★</span>
                            ))}
                          </div>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.72rem', color: '#475569', lineHeight: '1.4' }}>{review.message}</p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.55rem', color: '#94a3b8', textAlign: 'right' }}>
                          {review.created_at ? new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Sub-view: CHAT */}
            {modalSubView === 'chat' && currentUser && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginBottom: '4px' }}>
                  <button
                    onClick={() => setModalSubView('menu')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px', color: '#64748b' }}
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1e293b' }}>Support Inquiry</span>
                </div>

                {/* Chat messages */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  height: '240px',
                  overflowY: 'auto'
                }}>
                  {feedbackLoading ? (
                    <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b' }}>Loading messages...</div>
                  ) : feedbackList.filter(f => (!f.rating || parseInt(f.rating) === 0) && (f.user_aadhar === currentUser.aadhar || f.user_phone === currentUser.phone)).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px 10px', color: '#94a3b8', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                      <MessageSquare size={24} style={{ opacity: 0.3 }} />
                      No messages yet. Send a message to the admin below.
                    </div>
                  ) : (
                    feedbackList.filter(f => (!f.rating || parseInt(f.rating) === 0) && (f.user_aadhar === currentUser.aadhar || f.user_phone === currentUser.phone))
                      .slice().reverse()
                      .map(msg => (
                        <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {/* User Inquiry Message */}
                          <div style={{ alignSelf: 'flex-end', maxWidth: '85%', background: 'linear-gradient(135deg, var(--primary) 0%, #059669 100%)', color: 'white', padding: '8px 12px', borderRadius: '12px 12px 2px 12px', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                            <p style={{ margin: 0, fontSize: '0.75rem', lineHeight: '1.4' }}>{msg.message}</p>
                            <span style={{ fontSize: '0.5rem', opacity: 0.8, display: 'block', textAlign: 'right', marginTop: '2px' }}>
                              {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>

                          {/* Admin Reply */}
                          {msg.admin_response ? (
                            <div style={{ alignSelf: 'flex-start', maxWidth: '85%', background: '#ffffff', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '12px 12px 12px 2px', boxShadow: '0 2px 4px rgba(0,0,0,0.01)' }}>
                              <span style={{ fontSize: '0.58rem', fontWeight: '800', color: 'var(--secondary)', display: 'block', marginBottom: '2px', textTransform: 'uppercase' }}>
                                🛡️ Admin Reply
                              </span>
                              <p style={{ margin: 0, fontSize: '0.75rem', color: '#1e293b', lineHeight: '1.4' }}>{msg.admin_response}</p>
                              <span style={{ fontSize: '0.5rem', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                                {msg.response_at ? new Date(msg.response_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                          ) : (
                            <span style={{ alignSelf: 'flex-start', fontSize: '0.6rem', color: '#94a3b8', fontStyle: 'italic', paddingLeft: '4px' }}>
                              Sent. Pending reply...
                            </span>
                          )}
                        </div>
                      ))
                  )}
                </div>

                {/* Send message form */}
                <form onSubmit={handleChatSubmit} style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    value={chatMessageText}
                    onChange={(e) => setChatMessageText(e.target.value)}
                    required
                    placeholder="Type message to admin..."
                    style={{ flex: 1, padding: '8px 12px', fontSize: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#ffffff' }}
                  />
                  <button
                    type="submit"
                    disabled={chatSubmitting}
                    className="premium-btn premium-btn-primary"
                    style={{ padding: '8px 14px', fontSize: '0.75rem', fontWeight: '700', borderRadius: '8px', width: 'auto' }}
                  >
                    Send
                  </button>
                </form>
              </div>
            )}

          </div>
        </div>
      )}
    </header>
  );
}
