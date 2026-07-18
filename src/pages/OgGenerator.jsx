import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Copy, ExternalLink, Check, X, Link } from 'lucide-react';
import { verifyAdminLogin, uploadFileToDrive, createRedirect } from '../services/db';

export default function OgGenerator() {
  const navigate = useNavigate();

  // Authentication State
  const [isAuth, setIsAuth] = useState(() => sessionStorage.getItem('whatsbro_admin_auth') === 'true');
  const [loginPin, setLoginPin] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Form States
  const [targetUrl, setTargetUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  // Generator Output States
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Auto-slugify function
  const slugify = (text) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // remove non-alphanumeric chars
      .replace(/\s+/g, '-')         // replace spaces with hyphens
      .replace(/-+/g, '-')           // remove multiple consecutive hyphens
      .replace(/(^-|-$)/g, '');      // trim leading/trailing hyphens
  };

  // Sync title with slug (if not customized manually yet)
  const [slugModified, setSlugModified] = useState(false);
  const handleTitleChange = (e) => {
    const val = e.target.value;
    setTitle(val);
    if (!slugModified) {
      setSlug(slugify(val));
    }
  };

  const handleSlugChange = (e) => {
    setSlugModified(true);
    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
  };

  // Handle Image Upload
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setIsGenerated(false); // Reset output if image changes
    }
  };

  // Form submission / Generate Action
  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!targetUrl) {
      alert("Please enter a Target URL.");
      return;
    }
    if (!title) {
      alert("Please enter a Title.");
      return;
    }
    if (!slug) {
      alert("Please enter a Slug.");
      return;
    }
    if (!imageFile) {
      alert("Please upload an OG Image.");
      return;
    }

    // Verify target URL has protocol
    let finalTarget = targetUrl.trim();
    if (!/^https?:\/\//i.test(finalTarget)) {
      finalTarget = 'https://' + finalTarget;
      setTargetUrl(finalTarget);
    }

    setIsGenerating(true);
    try {
      // 1. Upload to Google Drive (folder: ["WhatsBroTNService_Uploads", "OG_Images"])
      const folderPath = ["WhatsBroTNService_Uploads", "OG_Images"];
      const driveUrl = await uploadFileToDrive(imageFile, folderPath);
      if (!driveUrl) {
        throw new Error("Failed to upload image to Google Drive storage.");
      }

      // 2. Call API to save link configuration to database
      const payload = {
        id: slug.trim().toLowerCase(),
        target_url: finalTarget,
        title: title.trim(),
        description: description.trim(),
        img_url: driveUrl
      };

      await createRedirect(payload);

      // 3. Form short-link URL using dynamic origin
      // Wait, if running on local dev it uses http://localhost:5173/go/slug
      // If deployed on Vercel it uses https://subionlineservice.vercel.app/go/slug
      const shareUrl = `${window.location.origin}/go/${payload.id}`;
      setGeneratedUrl(shareUrl);
      setIsGenerated(true);
    } catch (err) {
      console.error(err);
      alert("Failed to generate dynamic OG link: " + (err.message || err));
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy Link Action
  const handleCopyLink = () => {
    if (!generatedUrl) return;
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle Admin Login Pin code verification
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      if (!loginPin) throw new Error("Please enter the Admin Code.");
      await verifyAdminLogin(loginPin);
      sessionStorage.setItem('whatsbro_admin_auth', 'true');
      setIsAuth(true);
    } catch (err) {
      setLoginError(err.message || 'Invalid Admin Code.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (!isAuth) {
    return (
      <div className="layout-viewport-container" style={{ background: 'var(--bg-light)', alignItems: 'center' }}>
        <div className="app-mobile-container" style={{ justifyContent: 'center', alignItems: 'center', background: 'white' }}>
          <div className="premium-card" style={{ width: '90%', maxWidth: '400px', textAlign: 'center', borderTop: '6px solid var(--primary)', padding: '32px 24px', borderRadius: '16px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🔒</div>
            <h2 style={{ marginBottom: '8px', color: 'var(--text-light-main)' }}>OG Generator Secure Gate</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-light-muted)', marginBottom: '24px' }}>Restricted Access. Please enter the Admin Code to continue.</p>
            
            <form onSubmit={handleAdminLogin}>
              <div className="premium-input-group" style={{ marginBottom: '20px' }}>
                <input 
                  type="password" 
                  value={loginPin} 
                  onChange={(e) => setLoginPin(e.target.value)} 
                  className="premium-input" 
                  placeholder="Enter 6-digit Code" 
                  required
                  style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.2rem', padding: '12px', border: '1px solid var(--border-light)', borderRadius: '8px', width: '100%' }}
                />
              </div>
              
              {loginError && (
                <div style={{ color: 'var(--error)', fontSize: '0.85rem', marginBottom: '16px', fontWeight: '600' }}>
                  {loginError}
                </div>
              )}
              
              <button 
                type="submit" 
                className="premium-btn premium-btn-primary" 
                disabled={isLoggingIn}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: '700', cursor: 'pointer' }}
              >
                {isLoggingIn ? 'Verifying...' : 'Unlock Generator'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="layout-viewport-container" style={{ background: '#cbd5e1', display: 'flex', justifyContent: 'center' }}>
      <div className="app-mobile-container" style={{ display: 'flex', flexDirection: 'column', background: 'white' }}>
        
        {/* Navigation Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-light)',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
        }}>
          <button 
            onClick={() => navigate('/tnkpadmin?tab=settings')}
            style={{
              background: 'white',
              border: '1px solid var(--border-light)',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-light-main)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: '800', color: 'var(--text-light-main)' }}>Dynamic OG URL Generator</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-light-muted)' }}>Generate database-driven short-links with instant previews</span>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '24px',
            alignItems: 'start'
          }}>
            
            {/* Form Section */}
            <div className="premium-card" style={{ borderTop: '6px solid var(--primary)', padding: '24px', borderRadius: '16px', background: 'white', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', color: 'var(--text-light-main)', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                Create Redirect Link
              </h3>
              
              <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                
                {/* OG Image Upload */}
                <div className="premium-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="premium-label" style={{ fontWeight: '700', fontSize: '0.85rem' }}>Upload OG Image *</label>
                  
                  <div style={{
                    border: '2px dashed var(--primary)',
                    borderRadius: '12px',
                    padding: '24px 16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: imagePreview ? 'rgba(30, 168, 103, 0.02)' : 'var(--bg-light)',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageChange}
                      required={!imageFile}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer'
                      }}
                    />
                    
                    {!imagePreview ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <Upload size={32} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-light-main)' }}>Click to upload cover image</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-light-muted)' }}>PNG, JPG, or WEBP (Recommended: 1200x630px)</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                        <img 
                          src={imagePreview} 
                          alt="Cover upload" 
                          style={{ width: '80px', height: '50px', objectFit: 'cover', borderRadius: '6px', pointerEvents: 'none' }}
                        />
                        <div style={{ textAlign: 'left', flex: 1 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-light-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                            {imageFile.name}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-light-muted)' }}>
                            {(imageFile.size / 1024).toFixed(1)} KB (Change Image)
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setImageFile(null);
                            setImagePreview('');
                            setIsGenerated(false);
                          }}
                          style={{
                            background: '#fee2e2',
                            border: 'none',
                            color: '#ef4444',
                            borderRadius: '50%',
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            zIndex: 10
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Target URL */}
                <div className="premium-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="premium-label" style={{ fontWeight: '700', fontSize: '0.85rem' }}>Target URL *</label>
                  <input 
                    type="text" 
                    value={targetUrl} 
                    onChange={(e) => { setTargetUrl(e.target.value); setIsGenerated(false); }} 
                    placeholder="https://subionlineservice.vercel.app/user?tab=jobs"
                    required
                    className="premium-input"
                    style={{ padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '0.85rem', width: '100%' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-light-muted)' }}>The destination website where the user will be redirected.</span>
                </div>

                {/* Title */}
                <div className="premium-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="premium-label" style={{ fontWeight: '700', fontSize: '0.85rem' }}>Title *</label>
                  <input 
                    type="text" 
                    value={title} 
                    onChange={handleTitleChange} 
                    placeholder="e.g. TNPSC Recruitment"
                    required
                    className="premium-input"
                    style={{ padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '0.85rem', width: '100%' }}
                  />
                </div>

                {/* Description */}
                <div className="premium-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="premium-label" style={{ fontWeight: '700', fontSize: '0.85rem' }}>Description</label>
                  <textarea 
                    value={description} 
                    onChange={(e) => { setDescription(e.target.value); setIsGenerated(false); }} 
                    placeholder="Latest updates on TNPSC Recruitment"
                    className="premium-input"
                    rows={3}
                    style={{ padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '0.85rem', width: '100%', fontFamily: 'inherit', resize: 'vertical' }}
                  />
                </div>

                {/* Slug */}
                <div className="premium-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="premium-label" style={{ fontWeight: '700', fontSize: '0.85rem' }}>Slug/Custom ID *</label>
                  <input 
                    type="text" 
                    value={slug} 
                    onChange={handleSlugChange} 
                    placeholder="e.g. tnpsc-2026"
                    required
                    className="premium-input"
                    style={{ padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '0.85rem', width: '100%', fontWeight: '600', color: 'var(--primary)' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-light-muted)' }}>Unique short code. URL will be: <code>{window.location.origin}/go/{"{slug}"}</code></span>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="premium-btn premium-btn-primary"
                  style={{
                    padding: '12px 18px',
                    borderRadius: '10px',
                    border: 'none',
                    fontWeight: '800',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    marginTop: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: isGenerating ? 0.7 : 1
                  }}
                >
                  {isGenerating ? 'Uploading & Creating Link...' : 'Generate Short Link'}
                </button>
              </form>
            </div>

            {/* Live WhatsApp Preview Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: '700', color: 'var(--text-light-main)' }}>
                Live WhatsApp Preview
              </h3>
              
              {/* Mock Chat Window */}
              <div style={{
                borderRadius: '16px',
                background: '#efeae2', 
                backgroundImage: 'url("/bg_pattern.png")',
                backgroundSize: '240px',
                padding: '20px 16px',
                border: '1px solid var(--border-light)',
                boxShadow: 'var(--shadow-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                minHeight: '260px',
                justifyContent: 'flex-end'
              }}>
                
                {/* WhatsApp Chat Bubble */}
                <div style={{
                  alignSelf: 'flex-end',
                  maxWidth: '85%',
                  background: '#d9fdd3', 
                  borderRadius: '12px 0px 12px 12px',
                  padding: '8px',
                  boxShadow: '0 1px 1px rgba(0, 0, 0, 0.12)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  
                  {/* Link Attachment Card */}
                  <div style={{
                    background: '#f0f2f5',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    borderLeft: '4px solid #128c7e', 
                    cursor: 'pointer'
                  }}>
                    
                    {/* Preview Image */}
                    {imagePreview ? (
                      <div style={{ width: '100%', height: '160px', overflow: 'hidden' }}>
                        <img 
                          src={imagePreview} 
                          alt="Live Preview" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
                        />
                      </div>
                    ) : (
                      <div style={{ width: '100%', height: '100px', background: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>[ No OG Image Selected ]</span>
                      </div>
                    )}

                    {/* Metadata Content */}
                    <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontSize: '0.7rem', color: '#128c7e', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        subionline.in
                      </span>
                      <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1f2c34', lineHeight: '1.2' }}>
                        {title || "Link Title"}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#667781', lineHeight: '1.2', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {description || "Link preview description will appear here..."}
                      </div>
                    </div>
                  </div>

                  {/* Share Link text */}
                  <div style={{ fontSize: '0.85rem', color: '#1f2c34', wordBreak: 'break-all', padding: '4px 6px 0px 4px' }}>
                    {window.location.origin}/go/{slug || 'slug'}
                  </div>

                  {/* Timestamp & double tick */}
                  <div style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: '#667781', marginTop: '2px' }}>
                    <span>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                    <span style={{ color: '#53bdeb', fontWeight: 'bold' }}>✓✓</span>
                  </div>

                </div>

              </div>

            </div>

          </div>

          {/* Generated Output Card */}
          {isGenerated && (
            <div className="premium-card" style={{
              borderLeft: '6px solid var(--success)',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              padding: '24px',
              borderRadius: '16px',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              animation: 'slideUp 0.3s ease-out'
            }}>
              <style>{`
                @keyframes slideUp {
                  from { transform: translateY(20px); opacity: 0; }
                  to { transform: translateY(0); opacity: 1; }
                }
              `}</style>

              <div>
                <h3 style={{ fontSize: '1.1rem', margin: '0 0 4px 0', color: '#166534', fontWeight: '800' }}>🎉 Dynamic Redirect Link is Active!</h3>
                <span style={{ fontSize: '0.8rem', color: '#15803d' }}>Your short URL is configured in the database. Share it on WhatsApp to see previews.</span>
              </div>

              {/* URL Display Box */}
              <div style={{
                background: 'white',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-light-main)', wordBreak: 'break-all', flex: 1 }}>
                  {generatedUrl}
                </span>
                
                <button
                  onClick={handleCopyLink}
                  style={{
                    background: copied ? '#10b981' : '#f1f5f9',
                    color: copied ? 'white' : 'var(--text-light-main)',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy URL'}
                </button>
              </div>

              {/* Action Buttons Row */}
              <div style={{
                display: 'flex',
                gap: '12px'
              }}>
                
                {/* Open Preview */}
                <a
                  href={generatedUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    fontWeight: '800',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    textAlign: 'center',
                    fontSize: '0.85rem'
                  }}
                >
                  <ExternalLink size={16} /> Test Redirection Link
                </a>

              </div>

              {/* Guide/Instructions Box */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '0.8rem',
                color: 'var(--text-light-muted)',
                lineHeight: '1.5'
              }}>
                <strong style={{ display: 'block', color: 'var(--text-light-main)', marginBottom: '4px', fontSize: '0.85rem' }}>
                  💡 How it works:
                </strong>
                <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li>
                    The image was uploaded to Google Drive storage, and metadata is saved to Google Sheets.
                  </li>
                  <li>
                    When shared on WhatsApp, the Vercel function <code>/api/go</code> returns the Open Graph tags dynamically.
                  </li>
                  <li>
                    When clicked by users, they are redirected automatically to the target URL.
                  </li>
                  <li>
                    <strong>No manual file placements or git pushes are required!</strong>
                  </li>
                </ul>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
