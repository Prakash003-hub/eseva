import React from 'react';
import { Bot, MessageCircle, ArrowLeft, ChevronRight, Phone, Clock, MapPin, CheckCircle, Sparkles } from 'lucide-react';
import ChatbotContentRenderer, { splitBilingualTitle } from './ChatbotContentRenderer';

export default function ChatbotAssistantResponse({
  customQuery,
  onExecuteQuery,
  onSendToWhatsApp,
  onBackToMenu
}) {
  if (!customQuery) return null;

  const { text, timestamp, result } = customQuery;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', animation: 'viewFadeIn 0.25s ease-out' }}>
      {/* 1. User Message Bubble (Right) */}
      <div
        style={{
          backgroundColor: '#dcf8c6',
          borderRadius: '14px 0px 14px 14px',
          padding: '9px 13px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          alignSelf: 'flex-end',
          maxWidth: '85%'
        }}
      >
        <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: '500', lineHeight: '1.4' }}>
          {text}
        </div>
        <span style={{ fontSize: '0.62rem', color: '#64748b', display: 'block', textAlign: 'right', marginTop: '3px' }}>
          {timestamp}
        </span>
      </div>

      {/* 2. Intelligent Assistant Response Bubble (Left) */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '0px 14px 14px 14px',
          padding: '12px 14px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          border: '1px solid #e2e8f0',
          borderLeft: '4px solid #10b981',
          alignSelf: 'flex-start',
          maxWidth: '96%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        {/* Assistant Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={14} style={{ color: '#059669' }} />
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#065f46' }}>Subi E-Sevai AI Assistant</span>
          </div>
          <span style={{ fontSize: '0.64rem', fontWeight: '700', color: '#059669', background: '#ecfdf5', padding: '2px 7px', borderRadius: '4px' }}>
            ● Online
          </span>
        </div>

        {/* ======================================================== */}
        {/* SCENARIO A: EXACT SERVICE FOUND (e.g. Income, Caste, GST) */}
        {/* ======================================================== */}
        {result && result.type === 'SERVICE_FOUND' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.82rem', color: '#334155', fontWeight: '600' }}>
              {result.replyIntro}
            </div>

            {/* Service Header Card */}
            <div style={{ background: '#f8fafc', borderRadius: '10px', border: '1px solid #cbd5e1', padding: '10px 12px' }}>
              {(() => {
                const { primary, secondary } = splitBilingualTitle(result.matchedService.responseTitle || result.matchedService.title);
                return (
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '800', color: '#0f172a' }}>
                      📄 {primary}
                    </h4>
                    {secondary && (
                      <div style={{ fontSize: '0.80rem', fontWeight: '600', color: '#059669', marginTop: '2px' }}>
                        {secondary}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div style={{ marginTop: '6px' }}>
                <ChatbotContentRenderer
                  content={result.matchedService.description}
                  currentTitle={result.matchedService.title}
                  compact={true}
                />
              </div>
            </div>

            {/* Service Action Buttons */}
            {result.matchedService.actions && result.matchedService.actions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                {result.matchedService.actions.map(act => (
                  <button
                    key={act.id}
                    onClick={() => onSendToWhatsApp(act.message || `வணக்கம் சுபி இ-சேவை, ${result.matchedService.title} விண்ணப்பிக்க விரும்புகிறேன்.`)}
                    style={{
                      background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '0.84rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 6px rgba(37, 211, 102, 0.25)'
                    }}
                  >
                    <MessageCircle size={15} />
                    <span>{act.button_text}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Related Alternative Suggestions */}
            {result.alternatives && result.alternatives.length > 0 && (
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                  தொடர்புடைய பிற சேவைகள் (Related Services):
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {result.alternatives.map(alt => (
                    <button
                      key={alt.id}
                      onClick={() => onExecuteQuery(alt.title)}
                      style={{
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '16px',
                        padding: '6px 11px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        color: '#0f172a',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>🔍</span>
                      <span>{alt.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* SCENARIO B: BUSINESS HUB (வணிகம் & MSME / GST / FSSAI)   */}
        {/* ======================================================== */}
        {result && result.type === 'BUSINESS_HUB' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.94rem', fontWeight: '800', color: '#065f46', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🏢</span>
              <span>{result.replyTitle}</span>
            </div>

            <p style={{ margin: 0, fontSize: '0.82rem', color: '#334155', lineHeight: '1.5' }}>
              {result.replyText}
            </p>

            {/* 4 Pillars of Business Support */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
              {result.highlights.map((h, i) => (
                <div
                  key={i}
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '8px',
                    padding: '8px 10px'
                  }}
                >
                  <div style={{ fontSize: '0.84rem', fontWeight: '800', color: '#166534', marginBottom: '2px' }}>
                    {h.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#334155', lineHeight: '1.45' }}>
                    {h.desc}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Clickable Business Services */}
            <div style={{ marginTop: '6px' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: '800', color: '#047857', display: 'block', marginBottom: '6px' }}>
                உடனடியாக ஆவணங்கள் & வழிகாட்டல் பார்க்க கிளிக் செய்யவும்:
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {result.quickServices.map(qs => (
                  <button
                    key={qs.id}
                    onClick={() => onExecuteQuery(qs.title)}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #10b981',
                      borderRadius: '9px',
                      padding: '9px 12px',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      color: '#065f46',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                    }}
                  >
                    <span>📄 {qs.title}</span>
                    <ChevronRight size={15} style={{ color: '#10b981' }} />
                  </button>
                ))}
              </div>
            </div>

            {/* WhatsApp Business Action */}
            <button
              onClick={() => onSendToWhatsApp(result.whatsappAction.prefill)}
              style={{
                background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '0.84rem',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '6px',
                boxShadow: '0 2px 8px rgba(37, 211, 102, 0.3)'
              }}
            >
              <MessageCircle size={16} />
              <span>{result.whatsappAction.text}</span>
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* SCENARIO C: GREETING & WELCOME                            */}
        {/* ======================================================== */}
        {result && result.type === 'GREETING' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.94rem', fontWeight: '800', color: '#065f46', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} style={{ color: '#10b981' }} />
              <span>{result.replyTitle}</span>
            </div>

            <p style={{ margin: 0, fontSize: '0.82rem', color: '#334155', lineHeight: '1.5' }}>
              {result.replyText}
            </p>

            <span style={{ fontSize: '0.74rem', fontWeight: '800', color: '#64748b', marginTop: '4px' }}>
              விரைவு விருப்பங்கள் (Quick Suggestions):
            </span>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {result.quickChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => onExecuteQuery(chip.query)}
                  style={{
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    borderRadius: '20px',
                    padding: '7px 12px',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    color: '#065f46',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SCENARIO D: CONTACT & TIMINGS / LOCATION                  */}
        {/* ======================================================== */}
        {result && result.type === 'CONTACT_INFO' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.94rem', fontWeight: '800', color: '#065f46' }}>
              {result.replyTitle}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '4px 0' }}>
              {result.details.map((d, i) => (
                <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1e293b', marginBottom: '2px' }}>
                    {d.label}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#334155', fontWeight: '500' }}>
                    {d.value}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => onSendToWhatsApp(result.whatsappAction.prefill)}
              style={{
                background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '0.84rem',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '4px'
              }}
            >
              <MessageCircle size={16} />
              <span>{result.whatsappAction.text}</span>
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* SCENARIO E: FEES & CHARGES INQUIRY                        */}
        {/* ======================================================== */}
        {result && result.type === 'FEES_INFO' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.94rem', fontWeight: '800', color: '#065f46' }}>
              {result.replyTitle}
            </div>

            <p style={{ margin: 0, fontSize: '0.82rem', color: '#334155', lineHeight: '1.5' }}>
              {result.replyText}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '4px 0' }}>
              {result.details.map((d, i) => (
                <div key={i} style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', padding: '8px 10px' }}>
                  <div style={{ fontSize: '0.80rem', fontWeight: '800', color: '#92400e', marginBottom: '2px' }}>
                    {d.label}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#78350f' }}>
                    {d.value}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => onSendToWhatsApp(result.whatsappAction.prefill)}
              style={{
                background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '0.84rem',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <MessageCircle size={16} />
              <span>{result.whatsappAction.text}</span>
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* SCENARIO F: SMART FALLBACK (UNMATCHED QUERY)              */}
        {/* ======================================================== */}
        {result && result.type === 'UNKNOWN_FALLBACK' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.90rem', fontWeight: '800', color: '#0f172a' }}>
              {result.replyTitle}
            </div>

            <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: '1.5' }}>
              {result.replyText}
            </p>

            {/* Popular Services Suggestions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '4px 0' }}>
              {result.suggestedServices.map(s => (
                <button
                  key={s.id}
                  onClick={() => onExecuteQuery(s.title)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '8px 11px',
                    fontSize: '0.80rem',
                    fontWeight: '700',
                    color: '#1e293b',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>📄 {s.title}</span>
                  <ChevronRight size={14} style={{ color: '#64748b' }} />
                </button>
              ))}
            </div>

            <button
              onClick={() => onSendToWhatsApp(result.whatsappAction.prefill)}
              style={{
                background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '0.84rem',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '4px'
              }}
            >
              <MessageCircle size={16} />
              <span>{result.whatsappAction.text}</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Return to Main Menu / Categories Button */}
      <button
        onClick={onBackToMenu}
        style={{
          background: '#ffffff',
          border: '1.5px solid #075e54',
          borderRadius: '10px',
          padding: '8px 12px',
          fontSize: '0.78rem',
          fontWeight: '800',
          color: '#075e54',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
          justifyContent: 'center',
          marginTop: '4px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <ArrowLeft size={15} />
        <span>← சேவைகளுக்குத் திரும்பு (Back to Main Categories)</span>
      </button>
    </div>
  );
}
