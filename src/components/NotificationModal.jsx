import React, { useState } from 'react';
import {
  Bell,
  X,
  CheckCircle,
  Home,
  FileText,
  Briefcase,
  Megaphone,
  ChevronRight,
  CheckCheck
} from 'lucide-react';
import {
  requestMobileNotificationPermission,
  isMobileNotificationEnabled
} from '../services/notificationManager';

export default function NotificationModal({
  isOpen,
  onClose,
  notifications = [],
  unreadCounts = { home: 0, apply: 0, jobs: 0, announcements: 0, total: 0 },
  onSelectNotification,
  onMarkAllAsRead
}) {
  const [filter, setFilter] = useState('all');
  const [permissionStatus, setPermissionStatus] = useState(() => (
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  ));

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter(item => {
    if (filter === 'all') return true;
    return item.category === filter;
  });

  const handleEnablePush = async () => {
    const res = await requestMobileNotificationPermission();
    setPermissionStatus(res);
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'home':
        return <Home size={16} style={{ color: '#047857' }} />;
      case 'apply':
        return <FileText size={16} style={{ color: '#0284c7' }} />;
      case 'jobs':
        return <Briefcase size={16} style={{ color: '#d97706' }} />;
      case 'announcements':
        return <Megaphone size={16} style={{ color: '#dc2626' }} />;
      default:
        return <Bell size={16} style={{ color: '#047857' }} />;
    }
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        zIndex: 999999,
        padding: '16px',
        paddingTop: '32px'
      }}
      onClick={onClose}
    >
      <div
        className="premium-card notification-center-modal"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '460px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'slideUpFade 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          border: '1.5px solid rgba(4, 120, 87, 0.15)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #047857 0%, #10b981 100%)',
            color: 'white'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Bell size={20} color="white" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: 'white' }}>
                Notifications
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', opacity: 0.9 }}>
                {unreadCounts.total > 0 ? `${unreadCounts.total} new updates` : 'All caught up!'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {unreadCounts.total > 0 && (
              <button
                onClick={onMarkAllAsRead}
                title="Mark all as read"
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  color: 'white',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <CheckCheck size={14} /> Read All
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Enable Mobile Push Notifications Banner (if not yet granted) */}
        {permissionStatus !== 'granted' && permissionStatus !== 'unsupported' && (
          <div
            style={{
              padding: '10px 16px',
              background: '#f0fdf4',
              borderBottom: '1px solid #bbf7d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={16} color="#047857" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: '600' }}>
                Enable Mobile Device Push Alerts
              </span>
            </div>
            <button
              onClick={handleEnablePush}
              style={{
                background: '#047857',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '5px 10px',
                fontSize: '0.72rem',
                fontWeight: '700',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Turn On
            </button>
          </div>
        )}

        {/* Category Filter Chips */}
        <div
          style={{
            padding: '10px 16px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            background: '#fafafa',
            whiteSpace: 'nowrap'
          }}
        >
          <button
            onClick={() => setFilter('all')}
            style={{
              padding: '5px 12px',
              borderRadius: '20px',
              border: filter === 'all' ? '1.5px solid #047857' : '1px solid #e2e8f0',
              background: filter === 'all' ? '#ecfdf5' : 'white',
              color: filter === 'all' ? '#047857' : '#64748b',
              fontSize: '0.75rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            All {unreadCounts.total > 0 && `(${unreadCounts.total})`}
          </button>
          <button
            onClick={() => setFilter('home')}
            style={{
              padding: '5px 12px',
              borderRadius: '20px',
              border: filter === 'home' ? '1.5px solid #047857' : '1px solid #e2e8f0',
              background: filter === 'home' ? '#ecfdf5' : 'white',
              color: filter === 'home' ? '#047857' : '#64748b',
              fontSize: '0.75rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Home size={13} /> Home {unreadCounts.home > 0 && `(${unreadCounts.home})`}
          </button>
          <button
            onClick={() => setFilter('apply')}
            style={{
              padding: '5px 12px',
              borderRadius: '20px',
              border: filter === 'apply' ? '1.5px solid #047857' : '1px solid #e2e8f0',
              background: filter === 'apply' ? '#ecfdf5' : 'white',
              color: filter === 'apply' ? '#047857' : '#64748b',
              fontSize: '0.75rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <FileText size={13} /> Apply {unreadCounts.apply > 0 && `(${unreadCounts.apply})`}
          </button>
          <button
            onClick={() => setFilter('jobs')}
            style={{
              padding: '5px 12px',
              borderRadius: '20px',
              border: filter === 'jobs' ? '1.5px solid #047857' : '1px solid #e2e8f0',
              background: filter === 'jobs' ? '#ecfdf5' : 'white',
              color: filter === 'jobs' ? '#047857' : '#64748b',
              fontSize: '0.75rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Briefcase size={13} /> Jobs {unreadCounts.jobs > 0 && `(${unreadCounts.jobs})`}
          </button>
        </div>

        {/* Notification List Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          {filteredNotifications.length === 0 ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#94a3b8'
              }}
            >
              <CheckCircle size={42} style={{ color: '#10b981', margin: '0 auto 12px', opacity: 0.6 }} />
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#475569' }}>
                No notifications in this category
              </h4>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>
                You are up to date on all latest announcements!
              </p>
            </div>
          ) : (
            filteredNotifications.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectNotification(item)}
                style={{
                  background: item.isNew ? '#f0fdf4' : '#ffffff',
                  border: item.isNew ? '1.5px solid #a7f3d0' : '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 14px rgba(0,0,0,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: item.isNew ? '#dcfce7' : '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {getCategoryIcon(item.category)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: '800',
                          padding: '2px 6px',
                          borderRadius: '6px',
                          background: item.isNew ? '#047857' : '#64748b',
                          color: 'white'
                        }}
                      >
                        {item.categoryBadge}
                      </span>
                      {item.isNew && (
                        <span
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: '900',
                            padding: '2px 5px',
                            borderRadius: '6px',
                            background: '#ef4444',
                            color: 'white',
                            animation: 'pulseScale 1.8s infinite'
                          }}
                        >
                          NEW
                        </span>
                      )}
                    </div>

                    <h4
                      style={{
                        margin: '3px 0 2px 0',
                        fontSize: '0.86rem',
                        fontWeight: '700',
                        color: '#1e293b',
                        lineHeight: '1.3'
                      }}
                    >
                      {item.title}
                    </h4>
                    {item.description && (
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.74rem',
                          color: '#64748b',
                          lineHeight: '1.35',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', alignSelf: 'center', color: '#047857' }}>
                  <ChevronRight size={18} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom Footer Note */}
        <div
          style={{
            padding: '10px 16px',
            borderTop: '1px solid #f1f5f9',
            background: '#fafafa',
            fontSize: '0.72rem',
            color: '#64748b',
            textAlign: 'center'
          }}
        >
          💡 Tip: Tap any notification to open and apply directly!
        </div>
      </div>
    </div>
  );
}
