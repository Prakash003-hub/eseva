import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Copy, ExternalLink, Check, X, Sparkles } from 'lucide-react';
import { verifyAdminLogin, uploadFileToDrive, createRedirect, saveLocalOgImage } from '../services/db';

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
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [aspectRatio, setAspectRatio] = useState('landscape'); // 'landscape' (1200x630) or 'square' (1024x1024)
  const [isProcessingImg, setIsProcessingImg] = useState(false);

  // Generator Output States
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [generatedTargetUrl, setGeneratedTargetUrl] = useState('');
  const [copiedTarget, setCopiedTarget] = useState(false);

  // Helper: Auto extract ID or key from Target Link
  const extractKeyFromTargetUrl = (urlStr) => {
    if (!urlStr) return '';
    const cleanStr = urlStr.trim();
    
    try {
      const parsed = new URL(cleanStr.startsWith('http') ? cleanStr : `https://${cleanStr}`);
      const params = parsed.searchParams;
      const paramId = params.get('formId') || params.get('jobId') || params.get('postId') || params.get('productId') || params.get('id');
      if (paramId) return paramId.trim().toLowerCase();

      // Colon syntax (e.g. ?tab=jobs:JOB759562 or ?tab=apply:FORM123)
      if (cleanStr.includes(':')) {
        const parts = cleanStr.split(':');
        const paramSuffix = parts[parts.length - 1].trim();
        if (paramSuffix) return paramSuffix.toLowerCase().replace(/[^a-z0-9-]/g, '');
      }

      // Path segments e.g. /form/form-slzjghgr, /post/post-123, /job/job-123
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 2) {
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart && lastPart.length > 2 && lastPart !== 'index.html') {
          return lastPart.toLowerCase().replace(/[^a-z0-9-]/g, '');
        }
      } else if (pathParts.length === 1) {
        const singlePart = pathParts[0];
        if (singlePart && singlePart !== 'user' && singlePart !== 'index.html') {
          return singlePart.toLowerCase().replace(/[^a-z0-9-]/g, '');
        }
      }

      // Check tab query param
      const tabParam = params.get('tab');
      if (tabParam) return tabParam.toLowerCase();
    } catch (e) {
      // Fallback
    }

    const matchForm = cleanStr.match(/(?:formId=|^\/form\/|form\/)([a-zA-Z0-9_-]+)/i);
    if (matchForm && matchForm[1]) return matchForm[1].toLowerCase();

    const matchJob = cleanStr.match(/(?:jobId=|^\/job\/|job\/)([a-zA-Z0-9_-]+)/i);
    if (matchJob && matchJob[1]) return matchJob[1].toLowerCase();

    const matchPost = cleanStr.match(/(?:postId=|^\/post\/|post\/)([a-zA-Z0-9_-]+)/i);
    if (matchPost && matchPost[1]) return matchPost[1].toLowerCase();

    return 'link-' + Math.random().toString(36).substring(2, 8);
  };

  const handleTargetUrlChange = (val) => {
    setTargetUrl(val);
    setIsGenerated(false);

    const extractedKey = extractKeyFromTargetUrl(val);
    if (extractedKey && !title) {
      const formattedTitle = extractedKey
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
      setTitle(formattedTitle);
    }
  };

  // Canvas Image Resizer Helper
  const resizeOgImage = (file, aspect = 'landscape') => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const targetWidth = aspect === 'square' ? 1024 : 1200;
        const targetHeight = aspect === 'square' ? 1024 : 630;
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        const imgRatio = img.width / img.height;
        const targetRatio = targetWidth / targetHeight;
        let drawWidth, drawHeight, offsetX, offsetY;

        if (imgRatio > targetRatio) {
          drawHeight = targetHeight;
          drawWidth = targetHeight * imgRatio;
          offsetX = (targetWidth - drawWidth) / 2;
          offsetY = 0;
        } else {
          drawWidth = targetWidth;
          drawHeight = targetWidth / imgRatio;
          offsetX = 0;
          offsetY = (targetHeight - drawHeight) / 2;
        }

        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

        canvas.toBlob((blob) => {
          const resizedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg', lastModified: Date.now() });
          const previewUrl = canvas.toDataURL('image/jpeg', 0.92);
          resolve({ file: resizedFile, preview: previewUrl });
        }, 'image/jpeg', 0.92);
      };
    });
  };

  // Handle Image Upload with Automatic Canvas Crop & Resize
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsProcessingImg(true);
      try {
        const processed = await resizeOgImage(file, aspectRatio);
        setImageFile(processed.file);
        setImagePreview(processed.preview);
        setIsGenerated(false);
      } catch (err) {
        console.error('Image resize error:', err);
      } finally {
        setIsProcessingImg(false);
      }
    }
  };

  // Form submission / Save OG Action
  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!targetUrl) {
      alert("Please paste your Target Link.");
      return;
    }
    if (!imageFile) {
      alert("Please upload an OG Image.");
      return;
    }

    let finalTarget = targetUrl.trim();
    if (!/^https?:\/\//i.test(finalTarget)) {
      finalTarget = 'https://' + finalTarget;
      setTargetUrl(finalTarget);
    }

    const key = extractKeyFromTargetUrl(finalTarget);
    const finalTitle = title.trim() || 'Subi e sevai Service';
    const finalDesc = description.trim() || 'Click to view details on Subi e-sevai portal.';

    setIsGenerating(true);
    try {
      // Save strictly to local project files (public/uploads/ & public/data/og.json)
      const res = await saveLocalOgImage({
        key,
        targetUrl: finalTarget,
        title: finalTitle,
        description: finalDesc,
        imageFile,
        aspect: aspectRatio
      });

      if (!res || !res.success) {
        throw new Error(res?.error || "Make sure you are running 'npm run dev' locally to save project files.");
      }

      setGeneratedTargetUrl(finalTarget);
      setIsGenerated(true);
    } catch (err) {
      console.error(err);
      alert("Failed to save OG Image locally: " + (err.message || err));
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy Target Link
  const handleCopyTarget = () => {
    if (!generatedTargetUrl) return;
    navigator.clipboard.writeText(generatedTargetUrl);
    setCopiedTarget(true);
    setTimeout(() => setCopiedTarget(false), 2000);
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
            <h2 style={{ marginBottom: '8px', color: 'var(--text-light-main)' }}>OG Image Manager Secure Gate</h2>
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
                {isLoggingIn ? 'Verifying...' : 'Unlock Manager'}
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
            <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: '800', color: 'var(--text-light-main)' }}>Direct Link OG Manager</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-light-muted)' }}>Paste any website link & set custom WhatsApp cover image directly</span>
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
                Set OG Cover Image for Target Link
              </h3>
              
              <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                
                {/* Target Link */}
                <div className="premium-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="premium-label" style={{ fontWeight: '700', fontSize: '0.85rem' }}>Paste Target Link *</label>
                  <input 
                    type="text" 
                    value={targetUrl} 
                    onChange={(e) => handleTargetUrlChange(e.target.value)} 
                    placeholder="https://subi-eseva-service.vercel.app/form/form-slzjghgr"
                    required
                    className="premium-input"
                    style={{ padding: '12px', border: '2px solid var(--primary)', borderRadius: '8px', fontSize: '0.85rem', width: '100%', fontWeight: '600' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-light-muted)' }}>
                    Paste the target link (e.g. <code>https://subi-eseva-service.vercel.app/form/form-slzjghgr</code>). When shared on WhatsApp, your uploaded OG image will show up!
                  </span>
                </div>

                {/* OG Image Upload */}
                <div className="premium-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="premium-label" style={{ fontWeight: '700', fontSize: '0.85rem' }}>Upload OG Cover Image *</label>
                  
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

                {/* Target Aspect Ratio */}
                <div className="premium-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="premium-label" style={{ fontWeight: '700', fontSize: '0.85rem' }}>Auto Crop & Resize Format</label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="premium-input"
                    style={{ padding: '8px 12px', fontSize: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}
                  >
                    <option value="landscape">1.91:1 Landscape (1200×630px - Recommended for WhatsApp)</option>
                    <option value="square">1:1 Square (1024×1024px)</option>
                  </select>
                </div>

                {/* Title */}
                <div className="premium-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="premium-label" style={{ fontWeight: '700', fontSize: '0.85rem' }}>Title (Optional)</label>
                  <input 
                    type="text" 
                    value={title} 
                    onChange={(e) => { setTitle(e.target.value); setIsGenerated(false); }} 
                    placeholder="e.g. E-Sevai Service Application"
                    className="premium-input"
                    style={{ padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '0.85rem', width: '100%' }}
                  />
                </div>

                {/* Description */}
                <div className="premium-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="premium-label" style={{ fontWeight: '700', fontSize: '0.85rem' }}>Description (Optional)</label>
                  <textarea 
                    value={description} 
                    onChange={(e) => { setDescription(e.target.value); setIsGenerated(false); }} 
                    placeholder="Apply online with simple details on Subi e-sevai portal."
                    className="premium-input"
                    rows={2}
                    style={{ padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '0.85rem', width: '100%', fontFamily: 'inherit', resize: 'vertical' }}
                  />
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
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    marginTop: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: isGenerating ? 0.7 : 1
                  }}
                >
                  <Sparkles size={18} />
                  {isGenerating ? 'Uploading & Saving OG Image...' : 'Save OG Image for Link'}
                </button>
              </form>
            </div>

            {/* Live WhatsApp Preview Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: '700', color: 'var(--text-light-main)' }}>
                Live WhatsApp Link Preview
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
                  maxWidth: '88%',
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
                  <div style={{ fontSize: '0.8rem', color: '#1f2c34', wordBreak: 'break-all', padding: '4px 6px 0px 4px' }}>
                    {targetUrl || `${window.location.origin}/form/form-slzjghgr`}
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
                <h3 style={{ fontSize: '1.1rem', margin: '0 0 4px 0', color: '#166534', fontWeight: '800' }}>🎉 OG Image Saved for Target Link!</h3>
                <span style={{ fontSize: '0.82rem', color: '#15803d' }}>
                  Your uploaded cover image is stored in Google Drive and set for this link. Share this link directly on WhatsApp to see your cover image!
                </span>
              </div>

              {/* URL Display Box */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#166534' }}>Target Link (Share on WhatsApp):</span>
                <div style={{
                  background: 'white',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-light-main)', wordBreak: 'break-all', flex: 1 }}>
                    {generatedTargetUrl}
                  </span>
                  
                  <button
                    onClick={handleCopyTarget}
                    style={{
                      background: copiedTarget ? '#10b981' : 'var(--primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 14px',
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
                    {copiedTarget ? <Check size={14} /> : <Copy size={14} />}
                    {copiedTarget ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                <a
                  href={generatedTargetUrl}
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
                  <ExternalLink size={16} /> Open Target Page
                </a>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
