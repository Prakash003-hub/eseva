import React, { useState, useEffect, useRef } from 'react';
import defaultCoverImg from '../assets/default-cover.jpg';
import { useSearchParams } from 'react-router-dom';
import {
  getPosts,
  getForms,
  submitFormResponse,
  getUserStatus,
  uploadPaymentScreenshot,
  registerUser,
  updateUserProfile,
  uploadUserDocument,
  uploadSubmissionDocument,
  submitInfoRequestResponse,
  deleteUserDocument,
  loginUser,
  getJobs,
  uploadFileToDrive,
  getSettings,
  getAnnouncements,
  sendOtp,
  verifyOtp,
  checkAadhar,
  getProducts,
  getTemperedGlass
} from '../services/db';
import {
  CheckCircle,
  Download,
  UploadCloud,
  Filter,
  Calendar,
  Phone,
  User,
  CreditCard,
  ChevronRight,
  ArrowLeft,
  Printer,
  FileText,
  FileCheck,
  Upload,
  AlertCircle,
  Eye,
  Check,
  X,
  ShieldAlert,
  Trash2,
  Clock,
  Megaphone,
  Share2,
  ExternalLink
} from 'lucide-react';

const safeJsonParse = (str, fallback = []) => {
  if (!str) return fallback;
  try {
    if (typeof str === 'object') return str;
    return JSON.parse(str);
  } catch (e) {
    console.error("JSON parse error:", e, str);
    return fallback;
  }
};

const normalizeRequiredDocs = (docs) => {
  if (!Array.isArray(docs)) return [];
  return docs.map(d => {
    if (!d) return null;
    if (typeof d === 'string') {
      const defaultVal = ['aadhar', 'smart_card', 'voter_id'].includes(d) ? 2 : 1;
      return { id: d, val: defaultVal };
    }
    return d;
  }).filter(Boolean);
};

const normalizeCustomDocs = (docs) => {
  if (!Array.isArray(docs)) return [];
  return docs.map(d => {
    if (!d) return null;
    if (typeof d === 'string') {
      return { label: d, val: 1 };
    }
    return d;
  }).filter(Boolean);
};

const getGoogleDriveId = (url) => {
  if (!url) return null;
  const fileDMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) return fileDMatch[1];
  const dMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (dMatch && dMatch[1]) return dMatch[1];
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) return idMatch[1];
  return null;
};

const checkIfPdf = (url) => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return lowerUrl.endsWith('.pdf') || lowerUrl.includes('.pdf') || lowerUrl.includes('/file/d/');
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
};

const getFileExtension = (url) => {
  if (!url) return '';
  if (checkIfPdf(url) || url.toLowerCase().includes('pdf') || url.toLowerCase().includes('application/pdf')) return 'PDF';

  const cleanUrl = url.split('?')[0];
  const parts = cleanUrl.split('.');
  if (parts.length > 1) {
    const ext = parts.pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
      return ext.toUpperCase();
    }
    if (ext === 'pdf') return 'PDF';
  }

  if (url.includes('drive.google.com')) {
    return 'IMAGE/PDF';
  }

  return 'FILE';
};

const parseLimit = (limitStr) => {
  if (!limitStr) return { min: 1, max: 8 };
  const trimmed = String(limitStr).trim();
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-');
    const min = parseInt(parts[0]) || 1;
    const max = parseInt(parts[1]) || 8;
    return { min, max };
  } else {
    const max = parseInt(trimmed) || 8;
    return { min: 1, max };
  }
};

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    if (url.includes('drive.google.com') || url.includes('googleusercontent.com') || url.includes('drive.usercontent.google.com')) {
      if (checkIfPdf(url)) {
        return url;
      }
      const driveId = getGoogleDriveId(url);
      if (driveId) {
        return `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`;
      }
    }
    return url;
  }
  if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
    return `http://${window.location.hostname}:8000${url.startsWith('/') ? '' : '/'}${url}`;
  }
  return url;
};

const formatUpiVpa = (vpaOrPhone, method) => {
  if (!vpaOrPhone) return '';
  const trimmed = vpaOrPhone.trim();
  if (/^\d{10}$/.test(trimmed)) {
    if (method === 'phonepe') {
      return `${trimmed}@ybl`;
    }
    return `${trimmed}@okaxis`; // default GPay handle
  }
  return trimmed;
};

const STANDARD_FIELDS = {
  name: { label: 'Applicant Name', type: 'text', required: true },
  name_tamil: { label: 'பெயர் ( தமிழில் )', type: 'text', required: false },
  dob: { label: 'Date of Birth (DOB)', type: 'date', required: true },
  phone: { label: 'Mobile Number', type: 'tel', required: true },
  aadhar: { label: 'Aadhaar Number', type: 'text', required: false },
  gender: { label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: false },
  marital_status: { label: 'Marital Status', type: 'select', options: ['Unmarried', 'Married', 'Divorced', 'Widowed'], required: false },
  father_name: { label: 'Father', type: 'text', required: false },
  father_name_tamil: { label: 'தந்தை பெயர் ( தமிழில் )', type: 'text', required: false },
  mother_name: { label: "Mother Name", type: 'text', required: false },
  mother_name_tamil: { label: 'தாயின் பெயர் ( தமிழில் )', type: 'text', required: false },
  religion: { label: 'Religion', type: 'select', options: ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other'], required: false },
  community: { label: 'Community', type: 'select', options: ['OC', 'BC', 'MBC', 'SC', 'ST', 'DNC', 'BCM'], required: false },
  state: { label: 'State', type: 'select', options: ['Tamil Nadu', 'Puducherry', 'Kerala', 'Karnataka', 'Andhra Pradesh'], required: false },
  district: { label: 'District', type: 'select', options: ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Erode', 'Vellore', 'Thoothukudi', 'Thanjavur', 'Kancheepuram', 'Tiruvallur', 'Tiruvannamalai', 'Viluppuram', 'Cuddalore', 'Pudukkottai', 'Karur', 'Namakkal', 'Dharmapuri', 'Krishnagiri', 'The Nilgiris', 'Theni', 'Dindigul', 'Virudhunagar', 'Sivaganga', 'Ramanathapuram', 'Tiruppur', 'Tenkasi', 'Chengalpattu', 'Ranipet', 'Tirupathur', 'Kallakurichi', 'Mayiladuthurai'], required: false },
  taluk: { label: 'Taluk', type: 'text', required: false },
  revenue_village: { label: 'Revenue Village ( பாஞ்சாயத்து )', type: 'text', required: false },
  street_name: { label: 'Street Name', type: 'text', required: false },
  door_no: { label: 'Door no', type: 'text', required: false },
  pincode: { label: 'Pin Code', type: 'number', required: false },
  address: { label: 'Address', type: 'textarea', required: false },

  photo: { label: 'Photo Upload (image < 10MB)' },
  aadhar_doc: { label: 'Aadhaar Upload (img/pdf < 10MB)' },
  smart_card: { label: 'Smart Card Upload (img/pdf < 10MB)' },
  voter_id: { label: 'Voter ID Upload (img/pdf < 10MB)' },
  signature: { label: 'Signature Upload (img/pdf < 10MB)' }
};

const cleanPhone = (phone) => {
  if (!phone) return '';
  let cleaned = phone.toString().replace(/\D/g, '');
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  return cleaned;
};

const MarqueeRow = ({
  rowItems,
  speedRowIndex,
  setSelectedProductDetails,
  handleWhatsAppShare,
  subIndex
}) => {
  const [maxVisible, setMaxVisible] = useState(4);
  const [visibleItems, setVisibleItems] = useState([]);
  const [fadingIndex, setFadingIndex] = useState(null);

  // Dynamically calculate maxVisible based on container/viewport width for responsive web apps (phones, tablets, laptops, desktop monitors)
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 680) {
        setMaxVisible(3); // Mobile Phones (< 450px) & Large Phones / Phablets (450px - 680px): 3 columns
      } else if (width < 960) {
        setMaxVisible(4); // Tablets & Small Laptops (680px - 960px): 4 columns
      } else {
        setMaxVisible(5); // Desktop Monitors & Wide Displays (≥ 960px): 5 columns
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize visible items
  useEffect(() => {
    setVisibleItems(rowItems.slice(0, maxVisible));
  }, [rowItems, maxVisible]);

  useEffect(() => {
    if (rowItems.length <= maxVisible) return;

    // Stagger the initial delay based on subIndex
    const initialDelay = 800 + subIndex * 1200;
    
    let intervalId;
    const timeoutId = setTimeout(() => {
      // Start the periodic swapping interval
      intervalId = setInterval(() => {
        // Pick a random index to fade out
        const randomIndex = Math.floor(Math.random() * Math.min(rowItems.length, maxVisible));
        
        // Step 1: Start fade out
        setFadingIndex(randomIndex);

        // Step 2: Swap content after fade-out transition (500ms)
        setTimeout(() => {
          setVisibleItems((prevVisible) => {
            const currentIds = prevVisible.map(item => item.ProductID);
            // Reserve pool is items in rowItems that are not currently visible
            const reservePool = rowItems.filter(item => !currentIds.includes(item.ProductID));
            
            if (reservePool.length === 0) {
              const fallbackItem = rowItems[Math.floor(Math.random() * rowItems.length)];
              const next = [...prevVisible];
              next[randomIndex] = fallbackItem;
              return next;
            }

            const newItem = reservePool[Math.floor(Math.random() * reservePool.length)];
            const next = [...prevVisible];
            next[randomIndex] = newItem;
            return next;
          });

          // Step 3: Fade back in
          setFadingIndex(null);
        }, 500);

      }, 4000 + Math.random() * 2000); // Randomize interval duration slightly (4s to 6s)
    }, initialDelay);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [rowItems, subIndex, maxVisible]);

  return (
    <div
      className="showcase-marquee-row"
      style={{
        overflow: 'hidden',
        display: 'flex',
        gap: '8px',
        width: '100%',
        padding: '6px 0',
        justifyContent: 'center',
        flexWrap: 'nowrap',
        maskImage: 'none',
        WebkitMaskImage: 'none'
      }}
    >
      {visibleItems.map((product, idx) => {
        const isFading = fadingIndex === idx;
        const hasImage = product.ImageURL && product.ImageURL.trim() !== '';
        const hasPrice = product.Price && product.Price.trim() !== '';

        return (
          <div
            key={`${product.ProductID}-${idx}`}
            onClick={() => {
              if (isFading) return;
              setSelectedProductDetails(product);
            }}
            className="showcase-product-card"
            style={{
              flex: '1 1 0px',
              maxWidth: '130px',
              minWidth: '95px',
              height: '210px',
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              cursor: 'pointer',
              opacity: isFading ? 0 : 1,
              transform: isFading ? 'scale(0.95)' : 'scale(1)',
              transition: 'opacity 0.5s ease, transform 0.5s ease'
            }}
          >
            {/* Image Wrapper */}
            <div className="showcase-image-wrapper" style={{ height: '90px' }}>
              {hasImage ? (
                <img
                  src={getImageUrl(product.ImageURL)}
                  alt={product.ProductName || 'Accessory'}
                  onError={(e) => { e.target.style.display = 'none'; }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : product.Category === 'Phone Cover' ? (
                <img
                  src={defaultCoverImg}
                  alt="Default Cover"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '4px' }}>
                  <span style={{ fontSize: '1.4rem' }}>📦</span>
                  <span style={{ fontSize: '0.6rem', fontWeight: 'bold', textTransform: 'uppercase' }}>No Image</span>
                </div>
              )}
            </div>

            {/* Card Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 }}>
              <span style={{
                fontSize: '0.6rem',
                fontWeight: '800',
                color: 'var(--primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {product.Category}
              </span>

              <h5 style={{
                fontSize: '0.72rem',
                fontWeight: '700',
                color: '#1e293b',
                margin: 0,
                lineHeight: '1.25',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {product.Category === 'Phone Cover'
                  ? `${product.Brand === 'Other' ? product.CustomBrand : product.Brand} ${product.ModelName}`
                  : (product.ProductName || `${product.Brand} Case`)}
              </h5>

              {product.Category !== 'Phone Cover' && (product.Brand || product.ModelName) && (
                <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {product.Brand === 'Other' ? product.CustomBrand : product.Brand} {product.ModelName}
                </span>
              )}

              {product.Category === 'Phone Cover' && product.CoverType && (
                <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {product.CoverType}
                </span>
              )}

              {hasPrice && (
                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: '800' }}>
                    ₹{product.Price}
                  </strong>
                  <span style={{ fontSize: '0.55rem', color: '#22c55e', background: '#f0fdf4', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>In Stock</span>
                </div>
              )}

              {/* Buy & Share Buttons */}
              <div
                style={{
                  marginTop: hasPrice ? '6px' : 'auto',
                  display: 'flex',
                  gap: '4px',
                  width: '100%'
                }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isFading) return;
                    setSelectedProductDetails(product);
                  }}
                  className="premium-btn premium-btn-primary"
                  style={{
                    flex: 1,
                    padding: '4px 0',
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                    margin: 0,
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Buy
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isFading) return;
                    const title = product.Category === 'Phone Cover'
                      ? `${product.Brand === 'Other' ? product.CustomBrand : product.Brand} ${product.ModelName} Cover`
                      : (product.ProductName || `${product.Brand} Case`);
                    const text = `Category: ${product.Category}${product.Price ? `\nPrice: ₹${product.Price}` : ''}\nBuy high-quality mobile accessories at SUBI Online Service.`;
                    handleWhatsAppShare(title, text, '/user?tab=accessories');
                  }}
                  className="premium-btn premium-btn-secondary"
                  style={{
                    flex: 1,
                    padding: '4px 0',
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                    margin: 0,
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  title="Share on WhatsApp"
                >
                  <Share2 size={10} />
                </button>
              </div>

            </div>
          </div>
        );
      })}
    </div>
  );
};

export default function UserPortal({ currentUser, onUpdateProfile, onLoginTrigger }) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab states: 'home' | 'apply' | 'status' | 'accessories'
  const activeTab = searchParams.get('tab') || 'home';
  const initialCategory = searchParams.get('category') || '';

  const [posts, setPosts] = useState([]);
  const [forms, setForms] = useState([]);
  const [jobs, setJobs] = useState([]);

  // Accessories & Tempered Glass states
  const [products, setProducts] = useState([]);
  const [temperedGlassList, setTemperedGlassList] = useState([]);

  // Search Tempered Glass states
  const [tgSearchQuery, setTgSearchQuery] = useState('');
  const [tgSearchResult, setTgSearchResult] = useState(null);

  // Catalog Filters
  const [selectedAccessoryCategory, setSelectedAccessoryCategory] = useState('All');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [selectedModel, setSelectedModel] = useState('');
  const [accessorySearchKeyword, setAccessorySearchKeyword] = useState('');

  // Accessory Details Modal
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [ogMetadata, setOgMetadata] = useState(null);

  const [selectedJobDetails, setSelectedJobDetails] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || 'all');
  const [systemSettings, setSystemSettings] = useState({});

  // Loading & error states
  const [loading, setLoading] = useState(false);
  const [searchingStatus, setSearchingStatus] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [formsLoading, setFormsLoading] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(false);

  // Auto-scroll to top when tab or selected job changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab, selectedJobDetails]);
  const [error, setError] = useState('');

  // Install Prompt State
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [activeAnnIndex, setActiveAnnIndex] = useState(0);

  const handleCloseAnnouncement = () => {
    if (activeAnnIndex < announcements.length - 1) {
      setActiveAnnIndex(prev => prev + 1);
    } else {
      setShowAnnouncementModal(false);
      setActiveAnnIndex(0);
    }
  };

  // Wizard States
  const [selectedForm, setSelectedForm] = useState(null);
  const [wizardStep, setWizardStep] = useState(1);
  // 1: Instructions, 2: Fill/Verify, 3: Preview, 4: Upload Docs, 5: Receipt

  const [formData, setFormData] = useState({}); // Dynamic and standard values
  const [agreeCheckbox, setAgreeCheckbox] = useState(false);

  // Document upload state
  // Stores file selections: { [docKey]: { type: 'pdf' | 'images', file1, file2 } }
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [uploadStatuses, setUploadStatuses] = useState({});
  const [uploadedUrls, setUploadedUrls] = useState({});
  const [uploadProgress, setUploadProgress] = useState('');
  const [submissionResult, setSubmissionResult] = useState(null);
  const [lastResponsesPack, setLastResponsesPack] = useState(null);
  const [lastDocReferencesPack, setLastDocReferencesPack] = useState(null);

  // Status Lookup States
  const [lookupType, setLookupType] = useState('phone'); // 'phone' or 'aadhar'
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupAadhar, setLookupAadhar] = useState('');
  const [lookupDob, setLookupDob] = useState('');
  const [userApplications, setUserApplications] = useState([]);
  const [hasSearchedStatus, setHasSearchedStatus] = useState(false);
  const [uploadingScreenshotId, setUploadingScreenshotId] = useState(null);



  // Guest Verification States
  const [showGuestVerification, setShowGuestVerification] = useState(false);
  const [guestAadhar, setGuestAadhar] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [guestOtp, setGuestOtp] = useState('');
  const [lookupAadharStatus, setLookupAadharStatus] = useState(null); // 'checking', 'new_user', 'existing_user'
  const [matchedUserPrefills, setMatchedUserPrefills] = useState(null);
  const [guestVerifyError, setGuestVerifyError] = useState('');
  const [verifyingAadhar, setVerifyingAadhar] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const [infoRequestTexts, setInfoRequestTexts] = useState({});
  const [infoRequestFiles, setInfoRequestFiles] = useState({});
  const [deletedSavedDocs, setDeletedSavedDocs] = useState({});
  const [duplicateSubmissionError, setDuplicateSubmissionError] = useState('');
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  // Refresh key: incrementing this forces the status useEffect to re-fetch data
  // even when activeTab and currentUser references haven't changed.
  const [statusRefreshKey, setStatusRefreshKey] = useState(0);

  // Tracks when userApplications was last populated after a submission.
  // Prevents the status useEffect from overwriting fresh data with stale Google Sheets data.
  const lastStatusFetchRef = useRef(0);

  const sendSubmissionToWhatsApp = (submission, formInfo, responsesPack, docReferencesPack) => {
    const adminWhatsApp = systemSettings.admin_whatsapp_number || '9385497906';
    const formattedAdminWhatsApp = cleanPhone(adminWhatsApp);

    let msg = `*NEW FORM SUBMISSION*\n`;
    msg += `----------------------------------\n`;
    msg += `*Service:* ${(formInfo && formInfo.title) ? formInfo.title : (selectedForm && selectedForm.title) ? selectedForm.title : 'Service'}\n`;
    msg += `*Receipt ID:* ${submission.id}\n`;
    msg += `*Submitted At:* ${new Date(submission.submitted_at).toLocaleString('en-IN')}\n\n`;

    msg += `*APPLICANT PROFILE:*\n\`\`\`\n`;
    msg += `${"Phone".padEnd(12, ' ')} : ${submission.phone}\n`;
    msg += `${"Aadhaar".padEnd(12, ' ')} : ${submission.aadhar}\n`;
    msg += `\`\`\`\n`;

    msg += `*FORM DETAILS:*\n`;
    if (responsesPack && Object.keys(responsesPack).length > 0) {
      msg += `\`\`\`\n`;
      const responseKeys = Object.keys(responsesPack);
      const maxKeyLen = Math.max(...responseKeys.map(k => k.length), 10);
      responseKeys.forEach(key => {
        msg += `${key.padEnd(maxKeyLen, ' ')} : ${responsesPack[key]}\n`;
      });
      msg += `\`\`\`\n`;
    } else {
      msg += `No form details.\n`;
    }
    msg += `\n`;

    if (docReferencesPack && Object.keys(docReferencesPack).length > 0) {
      msg += `*UPLOADED DOCUMENTS:*\n`;
      Object.keys(docReferencesPack).forEach(docKey => {
        const urls = docReferencesPack[docKey];
        if (urls && urls.length > 0) {
          msg += `- *${docKey}:*\n  ${urls.join('\n  ')}\n`;
        }
      });
    }

    msg += `\n----------------------------------\n`;
    msg += `Please process this application. Thank you!`;

    const encoded = encodeURIComponent(msg);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${encodeURIComponent(formattedAdminWhatsApp)}&text=${encoded}`;
    window.open(whatsappUrl, '_blank');
  };

  // Premium custom Toast Alerts system (Intercepts and upgrades native alert dialogs)
  const [toast, setToast] = useState(null);
  const [toastTimeoutId, setToastTimeoutId] = useState(null);

  const alert = (message, type = 'success') => {
    if (toastTimeoutId) {
      clearTimeout(toastTimeoutId);
    }

    let alertType = type;
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('fail') || lowerMessage.includes('error') || lowerMessage.includes('exceed') || lowerMessage.includes('not permitted') || lowerMessage.includes('exceeds')) {
      alertType = 'error';
    } else if (lowerMessage.includes('please') || lowerMessage.includes('check') || lowerMessage.includes('enter') || lowerMessage.includes('already applied') || lowerMessage.includes('required')) {
      alertType = 'warning';
    }

    setToast({ message, type: alertType });

    const id = setTimeout(() => {
      setToast(null);
      setToastTimeoutId(null);
    }, 4500);
    setToastTimeoutId(id);
  };

  const handleInfoRequestSubmit = async (appId, type) => {
    setLoading(true);
    try {
      if (type === 'file') {
        const file = infoRequestFiles[appId];
        if (!file) {
          alert('Please select a file to upload.');
          return;
        }
        await submitInfoRequestResponse(appId, file, true);
      } else {
        const text = infoRequestTexts[appId] || '';
        if (!text.trim()) {
          alert('Please enter a response.');
          return;
        }
        await submitInfoRequestResponse(appId, text, false);
      }
      alert('Information submitted successfully! Thank you.');

      // Refresh list
      const phoneVal = currentUser?.phone || lookupPhone;
      const dobVal = lookupDob || '';
      const aadharVal = currentUser?.aadhar || lookupAadhar;
      const data = await getUserStatus(phoneVal, dobVal, aadharVal);
      setUserApplications(data);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to submit response.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSavedDoc = async (docKey) => {
    if (!currentUser) return;
    const docLabel = STANDARD_FIELDS[docKey]?.label || docKey;
    if (!window.confirm(`Are you sure you want to delete and replace your stored ${docLabel}? This will physically delete the file from the server.`)) {
      return;
    }
    setLoading(true);
    try {
      const updatedUser = await deleteUserDocument(currentUser.id, docKey);
      onUpdateProfile(updatedUser);
      setDeletedSavedDocs(prev => ({ ...prev, [docKey]: true }));
      alert(`Stored ${docLabel} has been successfully deleted from the server. Please select and upload your new file.`);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to delete stored document.');
    } finally {
      setLoading(false);
    }
  };

  async function fetchPosts() {
    setPostsLoading(true);
    try {
      const postsData = await getPosts();
      setPosts(postsData);
    } catch (err) {
      console.error(err);
      setError('Failed to connect to Google Workspace Apps Script Web App to load latest updates.');
    } finally {
      setPostsLoading(false);
    }
  }

  async function fetchForms() {
    setFormsLoading(true);
    try {
      const formsData = await getForms();
      setForms(formsData);
    } catch (err) {
      console.error(err);
      setError('Failed to connect to Google Workspace Apps Script Web App to load application forms.');
    } finally {
      setFormsLoading(false);
    }
  }

  async function fetchJobs() {
    setJobsLoading(true);
    try {
      const jobsData = await getJobs();
      setJobs(jobsData);
    } catch (err) {
      console.error(err);
      setError('Failed to connect to Google Workspace Apps Script Web App to load job alerts.');
    } finally {
      setJobsLoading(false);
    }
  }

  const [accessoryProductsLoading, setAccessoryProductsLoading] = useState(false);

  const fetchProductsAndTG = () => {
    setAccessoryProductsLoading(true);
    getProducts().then(data => {
      if (data) setProducts(data);
    }).catch(err => console.error('Failed to load products', err))
      .finally(() => setAccessoryProductsLoading(false));

    getTemperedGlass().then(data => {
      if (data) setTemperedGlassList(data);
    }).catch(err => console.error('Failed to load tempered glass', err));
  };

  useEffect(() => {
    fetchPosts();
    fetchForms();
    fetchJobs();
    fetchProductsAndTG();
    getSettings().then(data => {
      if (data) setSystemSettings(data);
    }).catch(err => console.error('Failed to load settings', err));
    getAnnouncements().then(data => {
      if (data) {
        const activeAnns = data.filter(a => String(a.enabled).toLowerCase() === 'true');
        setAnnouncements(activeAnns);
        if (activeAnns.length > 0) {
          setShowAnnouncementModal(true);
        }
      }
    }).catch(err => console.error('Failed to load announcements', err));
  }, []);

  // Load og.json fallback metadata on mount
  useEffect(() => {
    fetch('/data/og.json')
      .then(res => res.json())
      .then(data => setOgMetadata(data))
      .catch(err => console.error('Failed to load og.json metadata:', err));
  }, []);

  // Redirect to correct tab if shared link parameters are present
  useEffect(() => {
    const formIdParam = searchParams.get('formId');
    const jobIdParam = searchParams.get('jobId');
    const postIdParam = searchParams.get('postId');
    const productIdParam = searchParams.get('productId');

    if (formIdParam && activeTab !== 'apply') {
      setSearchParams({ tab: 'apply', formId: formIdParam });
    } else if (jobIdParam && activeTab !== 'home') {
      setSearchParams({ tab: 'home', jobId: jobIdParam });
    } else if (postIdParam && activeTab !== 'home') {
      setSearchParams({ tab: 'home', postId: postIdParam });
    } else if (productIdParam && activeTab !== 'accessories') {
      setSearchParams({ tab: 'accessories', productId: productIdParam });
    }
  }, [searchParams, activeTab]);

  // Deep linking: Auto-select Form
  useEffect(() => {
    const formIdParam = searchParams.get('formId');
    if (formIdParam && forms.length > 0 && activeTab === 'apply') {
      const targetForm = forms.find(f => String(f.id) === String(formIdParam));
      if (targetForm && (!selectedForm || selectedForm.id !== targetForm.id)) {
        selectFormToFill(targetForm);
      }
    }
  }, [forms, searchParams, activeTab, selectedForm]);

  // Deep linking: Auto-open Job Detail Modal
  useEffect(() => {
    const jobIdParam = searchParams.get('jobId');
    if (jobIdParam && jobs.length > 0 && activeTab === 'home') {
      const targetJob = jobs.find(j => String(j.id) === String(jobIdParam));
      if (targetJob && (!selectedJobDetails || selectedJobDetails.id !== targetJob.id)) {
        setSelectedJobDetails(targetJob);
      }
    }
  }, [jobs, searchParams, activeTab, selectedJobDetails]);

  // Deep linking: Auto-open Product Detail Modal
  useEffect(() => {
    const productIdParam = searchParams.get('productId');
    if (productIdParam && products.length > 0 && activeTab === 'accessories') {
      const targetProduct = products.find(p => String(p.ProductID) === String(productIdParam));
      if (targetProduct && (!selectedProductDetails || selectedProductDetails.ProductID !== targetProduct.ProductID)) {
        setSelectedProductDetails(targetProduct);
      }
    }
  }, [products, searchParams, activeTab, selectedProductDetails]);

  // Deep linking: Auto-scroll to Post
  useEffect(() => {
    const postIdParam = searchParams.get('postId');
    if (postIdParam && posts.length > 0 && activeTab === 'home') {
      setTimeout(() => {
        const el = document.getElementById(`post-${postIdParam}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('highlight-flash');
          setTimeout(() => el.classList.remove('highlight-flash'), 2500);
        }
      }, 500);
    }
  }, [posts, searchParams, activeTab]);

  // Dynamic Document Title and Description Updater
  useEffect(() => {
    const formIdParam = searchParams.get('formId');
    const jobIdParam = searchParams.get('jobId');
    const postIdParam = searchParams.get('postId');
    const productIdParam = searchParams.get('productId');

    let currentTitle = 'SUBI Online Service - Portal';
    let currentDesc = 'Apply for online services, check products, and stay updated.';

    if (formIdParam) {
      const targetForm = forms.find(f => String(f.id) === String(formIdParam));
      if (targetForm) {
        currentTitle = targetForm.title;
        currentDesc = targetForm.description || currentDesc;
      } else if (ogMetadata && ogMetadata.form) {
        currentTitle = ogMetadata.form.title;
        currentDesc = ogMetadata.form.description;
      }
    } else if (jobIdParam) {
      const targetJob = jobs.find(j => String(j.id) === String(jobIdParam));
      if (targetJob) {
        currentTitle = targetJob.title;
        currentDesc = targetJob.description || currentDesc;
      } else if (ogMetadata && ogMetadata.job) {
        currentTitle = ogMetadata.job.title;
        currentDesc = ogMetadata.job.description;
      }
    } else if (postIdParam) {
      const targetPost = posts.find(p => String(p.id) === String(postIdParam));
      if (targetPost) {
        currentTitle = targetPost.title;
        currentDesc = targetPost.description || currentDesc;
      } else if (ogMetadata && ogMetadata.post) {
        currentTitle = ogMetadata.post.title;
        currentDesc = ogMetadata.post.description;
      }
    } else if (productIdParam) {
      const targetProduct = products.find(p => String(p.ProductID) === String(productIdParam));
      if (targetProduct) {
        currentTitle = targetProduct.ProductName || `${targetProduct.Brand} ${targetProduct.ModelName}`;
        currentDesc = `Price: ₹${targetProduct.Price} | Category: ${targetProduct.Category} | Brand: ${targetProduct.Brand}`;
      } else if (ogMetadata && ogMetadata.product) {
        currentTitle = ogMetadata.product.title;
        currentDesc = ogMetadata.product.description;
      }
    }

    // Set document title
    document.title = currentTitle;

    // Set description meta tag
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', currentDesc);

    // Determine OG Image
    let currentImg = '/income_og_preview.jpg';

    if (formIdParam) {
      const targetForm = forms.find(f => String(f.id) === String(formIdParam));
      if (targetForm && targetForm.img_url) {
        currentImg = getImageUrl(targetForm.img_url);
      } else {
        currentImg = '/form_og_preview.jpg';
      }
    } else if (jobIdParam) {
      const targetJob = jobs.find(j => String(j.id) === String(jobIdParam));
      if (targetJob && targetJob.img_url) {
        currentImg = getImageUrl(targetJob.img_url);
      } else {
        currentImg = '/job_og_preview.jpg';
      }
    } else if (postIdParam) {
      const targetPost = posts.find(p => String(p.id) === String(postIdParam));
      if (targetPost && targetPost.img_url) {
        currentImg = getImageUrl(targetPost.img_url);
      } else {
        currentImg = '/post_og_preview.jpg';
      }
    } else if (productIdParam) {
      const targetProduct = products.find(p => String(p.ProductID) === String(productIdParam));
      if (targetProduct && targetProduct.ImageURL) {
        currentImg = getImageUrl(targetProduct.ImageURL);
      } else {
        currentImg = '/product_og_preview.jpg';
      }
    } else {
      // Fallback based on activeTab
      if (activeTab === 'accessories') {
        currentImg = '/product_og_preview.jpg';
      } else if (activeTab === 'jobs') {
        currentImg = '/job_og_preview.jpg';
      } else if (activeTab === 'apply') {
        currentImg = '/form_og_preview.jpg';
      } else {
        currentImg = '/income_og_preview.jpg';
      }
    }

    const absoluteImgUrl = currentImg.startsWith('http')
      ? currentImg
      : `${window.location.protocol}//${window.location.host}${currentImg}`;

    // Set Open Graph image
    let metaOgImg = document.querySelector('meta[property="og:image"]');
    if (!metaOgImg) {
      metaOgImg = document.createElement('meta');
      metaOgImg.setAttribute('property', 'og:image');
      document.head.appendChild(metaOgImg);
    }
    metaOgImg.setAttribute('content', absoluteImgUrl);

    // Set Twitter image
    let metaTwitterImg = document.querySelector('meta[name="twitter:image"]');
    if (!metaTwitterImg) {
      metaTwitterImg = document.createElement('meta');
      metaTwitterImg.name = 'twitter:image';
      document.head.appendChild(metaTwitterImg);
    }
    metaTwitterImg.setAttribute('content', absoluteImgUrl);
  }, [searchParams, activeTab, forms, jobs, posts, products, ogMetadata]);

  // WhatsApp share utility
  const handleWhatsAppShare = (title, text, url) => {
    const absoluteUrl = url.startsWith('http')
      ? url
      : `${window.location.protocol}//${window.location.host}${url}`;

    const message = `*${title}*\n${text}\n\nApply/View here: ${absoluteUrl}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('[PWA] beforeinstallprompt event fired & deferred.');
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    console.log('[Install Check] systemSettings loaded:', systemSettings);
    if (systemSettings && String(systemSettings.install_notification_enabled).toLowerCase() === 'true') {
      const dismissedAt = sessionStorage.getItem('install_prompt_dismissed_at');
      const lastReset = localStorage.getItem('install_prompt_last_reset');

      let shouldShow = true;
      if (dismissedAt) {
        if (!lastReset || Number(dismissedAt) >= Number(lastReset)) {
          shouldShow = false;
        }
      }

      console.log('[Install Check] shouldShow:', shouldShow, '| dismissedAt:', dismissedAt, '| lastReset:', lastReset);
      if (shouldShow) {
        console.log('[Install Check] Triggering installation prompt in 2 seconds...');
        const timer = setTimeout(() => {
          setShowInstallPrompt(true);
          console.log('[Install Check] showInstallPrompt set to true');
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [systemSettings]);

  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  // Load User profile data into form when entering step 2
  useEffect(() => {
    if (selectedForm && wizardStep === 2) {
      const initialFields = {};
      let fieldsConfig = safeJsonParse(selectedForm.required_fields, []);

      const isCase2 = currentUser && !!(currentUser.district || currentUser.religion || currentUser.state || currentUser.father_name);

      if (selectedForm.category && selectedForm.category.toLowerCase() === 'e sevai' && !isCase2) {
        const canFields = [
          'aadhar', 'phone', 'name', 'name_tamil', 'gender', 'marital_status', 'dob',
          'father_name', 'mother_name', 'father_name_tamil', 'mother_name_tamil',
          'religion', 'community', 'state', 'district', 'taluk', 'revenue_village',
          'street_name', 'door_no', 'pincode', 'address'
        ];
        fieldsConfig = Array.from(new Set([...canFields, ...fieldsConfig]));
      }

      // If user is logged in, prefill standard fields from profile
      if (currentUser) {
        fieldsConfig.forEach(fieldId => {
          if (fieldId === 'marital_status') {
            initialFields['marital_status'] = currentUser.marital_status || '';
          } else {
            initialFields[fieldId] = currentUser[fieldId] || '';
          }
        });
      }

      // Prefill custom fields from user profile custom_fields
      if (currentUser && currentUser.custom_fields) {
        try {
          const parsedCustom = typeof currentUser.custom_fields === 'string'
            ? JSON.parse(currentUser.custom_fields)
            : currentUser.custom_fields;

          if (parsedCustom && typeof parsedCustom === 'object') {
            const customFields = safeJsonParse(selectedForm.fields, []);
            customFields.forEach(f => {
              if (f.type === 'repeated') {
                // Prefill count
                if (parsedCustom[f.id] !== undefined) {
                  initialFields[f.id] = parsedCustom[f.id];
                } else if (parsedCustom[f.label] !== undefined) {
                  initialFields[f.id] = parsedCustom[f.label];
                }
                // Prefill members
                const count = parseInt(initialFields[f.id] || parsedCustom[f.id] || parsedCustom[f.label]) || 0;
                for (let i = 1; i <= count; i++) {
                  (f.subFields || []).forEach(sub => {
                    const subFieldKey = `${f.id}_member_${i}_${sub.id}`;
                    if (parsedCustom[subFieldKey] !== undefined) {
                      initialFields[subFieldKey] = parsedCustom[subFieldKey];
                    }
                  });
                }
              } else {
                if (parsedCustom[f.label] !== undefined) {
                  initialFields[f.id] = parsedCustom[f.label];
                }
              }
            });
          }
        } catch (e) {
          console.error("Error parsing profile custom fields for autofill:", e);
        }
      }

      setFormData(prev => ({ ...initialFields, ...prev }));
    }
  }, [selectedForm, wizardStep, currentUser]);

  const handleTabChange = (tabName) => {
    setSearchParams({ tab: tabName });
    // Reset wizard states
    if (tabName !== 'apply') {
      setSelectedForm(null);
      setWizardStep(1);
      setFormData({});
      setUploadedFiles({});
      setSubmissionResult(null);
      setAgreeCheckbox(false);
      setDeletedSavedDocs({});
      setDuplicateSubmissionError('');
    }
  };

  const selectFormToFill = async (form) => {
    if (form.coming_soon === true || String(form.coming_soon).toLowerCase() === 'true') {
      setSelectedForm(form);
      setWizardStep(1);
      setFormData({});
      setUploadedFiles({});
      setAgreeCheckbox(false);
      setDeletedSavedDocs({});
      setDuplicateSubmissionError('');
      return;
    }
    if (currentUser && currentUser.aadhar) {
      setLoading(true);
      try {
        const userSubs = await getUserStatus(currentUser.phone, '', currentUser.aadhar);
        if (Array.isArray(userSubs) && userSubs.some(s => s.form_id === form.id && s.payment_status !== 'draft')) {
          alert(`You have already applied for the ${form.title}. You cannot apply more than once.`);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error("Error checking pre-existing application:", err);
      } finally {
        setLoading(false);
      }
    }
    setSelectedForm(form);
    setWizardStep(1);
    setFormData({});
    setUploadedFiles({});
    setAgreeCheckbox(false);
    setDeletedSavedDocs({});
    setDuplicateSubmissionError('');
  };

  const handleFieldChange = (fieldId, val) => {
    setFormData(prev => ({ ...prev, [fieldId]: val }));

    // Early duplicate check when Aadhaar is entered (12 digits)
    if (fieldId === 'aadhar' && val && val.match(/^\d{12}$/) && selectedForm) {
      checkDuplicateSubmission(val);
    } else if (fieldId === 'aadhar' && (!val || !val.match(/^\d{12}$/))) {
      setDuplicateSubmissionError('');
    }
  };

  const checkDuplicateSubmission = async (aadharValue) => {
    setCheckingDuplicate(true);
    try {
      const targetPhone = formData.phone || currentUser?.phone || '';
      const targetDob = '';
      const userSubs = await getUserStatus(targetPhone, targetDob, aadharValue);
      if (Array.isArray(userSubs) && userSubs.some(s => s.form_id === selectedForm.id && s.payment_status !== 'draft')) {
        setDuplicateSubmissionError(`You have already applied for "${selectedForm.title}". You cannot apply more than once. You are already applicable for this certificate.`);
      } else {
        setDuplicateSubmissionError('');
      }
    } catch (err) {
      console.error('Error checking duplicate submission:', err);
      setDuplicateSubmissionError('');
    } finally {
      setCheckingDuplicate(false);
    }
  };

  // --- WIZARD STEPS PROGRESSION ---

  // Proceed from Step 1 (Instructions) to Step 2 (Form details)
  const handleProceedToForm = () => {
    if (!currentUser) {
      setShowGuestVerification(true);
      setGuestAadhar('');
      setGuestEmail('');
      setShowOtpInput(false);
      setGuestOtp('');
      setLookupAadharStatus(null);
      setMatchedUserPrefills(null);
      setGuestVerifyError('');
    } else {
      setWizardStep(2);
    }
  };

  const handleVerifyGuestAadhar = async (e) => {
    e.preventDefault();
    if (!guestAadhar || !guestAadhar.match(/^\d{12}$/)) {
      setGuestVerifyError("Please enter a valid 12-digit Aadhaar number.");
      return;
    }
    setGuestVerifyError("");
    setVerifyingAadhar(true);
    try {
      const res = await checkAadhar(guestAadhar);
      if (res && res.exists) {
        setLookupAadharStatus('existing_user');
        setMatchedUserPrefills(res.user);
      } else {
        setLookupAadharStatus('new_user');
      }
    } catch (err) {
      console.error(err);
      setGuestVerifyError(err.message || "Failed to verify Aadhaar.");
    } finally {
      setVerifyingAadhar(false);
    }
  };

  const handleSendGuestOtp = async () => {
    if (!guestEmail || !guestEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setGuestVerifyError("Please enter a valid Email address.");
      return;
    }
    setGuestVerifyError("");
    setSendingOtp(true);
    try {
      await sendOtp(guestEmail);
      setShowOtpInput(true);
      alert("OTP sent to your email address!");
    } catch (err) {
      console.error(err);
      setGuestVerifyError(err.message || "Failed to send OTP.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyGuestOtp = async (e) => {
    e.preventDefault();
    if (!guestOtp || guestOtp.length !== 6) {
      setGuestVerifyError("Please enter the 6-digit OTP code.");
      return;
    }
    setGuestVerifyError("");
    setVerifyingOtp(true);
    try {
      const res = await verifyOtp(guestEmail, guestOtp);
      if (res && res.verified) {
        alert("Verification successful!");
        setFormData(prev => ({
          ...prev,
          aadhar: guestAadhar,
          email: guestEmail
        }));
        setShowGuestVerification(false);
        setWizardStep(2);
      } else {
        setGuestVerifyError("Invalid OTP. Please check and try again.");
      }
    } catch (err) {
      console.error(err);
      setGuestVerifyError(err.message || "Verification failed.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Proceed from Step 2 (Form details) to Step 3 (Preview)
  const handleValidateForm = async (e) => {
    e.preventDefault();

    // Block if duplicate submission detected
    if (duplicateSubmissionError) {
      alert(duplicateSubmissionError);
      return;
    }

    // Check validation of standard required fields
    let reqFields = safeJsonParse(selectedForm.required_fields, []);
    const isCase2 = currentUser && !!(currentUser.district || currentUser.religion || currentUser.state || currentUser.father_name);

    if (selectedForm.category && selectedForm.category.toLowerCase() === 'e sevai' && !isCase2) {
      const canFields = [
        'aadhar', 'phone', 'name', 'name_tamil', 'gender', 'marital_status', 'dob',
        'father_name', 'mother_name', 'father_name_tamil', 'mother_name_tamil',
        'religion', 'community', 'state', 'district', 'taluk', 'revenue_village',
        'street_name', 'door_no', 'pincode', 'address'
      ];
      reqFields = Array.from(new Set([...canFields, ...reqFields]));
    }
    const missing = [];

    reqFields.forEach(fieldId => {
      const isFieldRequired = STANDARD_FIELDS[fieldId]?.required || (selectedForm.category && selectedForm.category.toLowerCase() === 'e sevai');
      if (isFieldRequired && !formData[fieldId]) {
        missing.push(STANDARD_FIELDS[fieldId]?.label || fieldId);
      }
    });

    // Dynamic fields verification
    const customFields = safeJsonParse(selectedForm.fields, []);
    customFields.forEach(f => {
      if (f.required && !formData[f.id]) {
        missing.push(f.label);
      }
    });

    if (missing.length > 0) {
      alert(`Please fill in all required fields: ${missing.join(', ')}`);
      return;
    }

    // Phone / Aadhaar validation checks
    if (formData.phone && !formData.phone.match(/^\d{10}$/)) {
      alert('Please enter a valid 10-digit Phone Number');
      return;
    }
    if (formData.aadhar && !formData.aadhar.match(/^\d{12}$/)) {
      alert('Please enter a valid 12-digit Aadhaar Number');
      return;
    }

    setLoading(true);
    try {
      if (!currentUser) {
        // User not registered: automatically register them on the fly
        const regPayload = {
          name: formData.name || 'User Profile',
          name_tamil: formData.name_tamil || undefined,
          email: guestEmail || formData.email || undefined,
          dob: formData.dob || '',
          phone: formData.phone || '',
          aadhar: formData.aadhar || undefined,
          gender: formData.gender || undefined,
          marital_status: formData.marital_status || undefined,
          father_name: formData.father_name || undefined,
          father_name_tamil: formData.father_name_tamil || undefined,
          mother_name: formData.mother_name || undefined,
          mother_name_tamil: formData.mother_name_tamil || undefined,
          community: formData.community || undefined,
          address: formData.address || undefined,
          religion: formData.religion || undefined,
          state: formData.state || undefined,
          district: formData.district || undefined,
          taluk: formData.taluk || undefined,
          revenue_village: formData.revenue_village || undefined,
          street_name: formData.street_name || undefined,
          door_no: formData.door_no || undefined,
          pincode: formData.pincode || undefined
        };

        const registeredUser = await registerUser(regPayload);
        onUpdateProfile(registeredUser);
        alert('Welcome! We have registered your details in SUBI Online Service so you can pre-fill forms easily in the future.');
      } else {
        // User is logged in: update profile with any inline corrections
        const updatePayload = {
          name: formData.name,
          name_tamil: formData.name_tamil || undefined,
          dob: formData.dob || '',
          phone: formData.phone || '',
          aadhar: formData.aadhar || undefined,
          gender: formData.gender || undefined,
          marital_status: formData.marital_status || undefined,
          father_name: formData.father_name || undefined,
          father_name_tamil: formData.father_name_tamil || undefined,
          mother_name: formData.mother_name || undefined,
          mother_name_tamil: formData.mother_name_tamil || undefined,
          community: formData.community || undefined,
          address: formData.address || undefined,
          religion: formData.religion || undefined,
          state: formData.state || undefined,
          district: formData.district || undefined,
          taluk: formData.taluk || undefined,
          revenue_village: formData.revenue_village || undefined,
          street_name: formData.street_name || undefined,
          door_no: formData.door_no || undefined,
          pincode: formData.pincode || undefined
        };
        const updated = await updateUserProfile(currentUser.id, updatePayload);
        onUpdateProfile(updated);
      }
      setWizardStep(3); // Proceed to Step 3 (Preview)
    } catch (err) {
      console.error(err);
      alert(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Proceed from Step 3 (Preview) to Step 4 (Upload Docs)
  const handleProceedToUploads = () => {
    if (!agreeCheckbox) {
      alert('Please check the terms and conditions checkbox to proceed.');
      return;
    }
    setWizardStep(4);
  };

  // Animated upload text
  useEffect(() => {
    let interval;
    const hasUploading = Object.values(uploadStatuses).some(s => s === 'uploading');
    if (hasUploading) {
      interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev === 'Uploading.') return 'Uploading..';
          if (prev === 'Uploading..') return 'Uploading...';
          return 'Uploading.';
        });
      }, 500);
    } else {
      setUploadProgress('');
    }
    return () => clearInterval(interval);
  }, [uploadStatuses]);

  const handleImmediateUpload = async (docKey, maxFiles, fileInputIdx, file) => {
    if (!file) return;

    // Check size limit (10MB limit for each upload)
    const limit = 10 * 1024 * 1024;
    if (file.size > limit) {
      alert(`File size exceeds limit. Files must be less than 10MB.`);
      return;
    }

    setUploadStatuses(prev => ({ ...prev, [docKey]: `uploading_${fileInputIdx}` }));
    if (!uploadProgress) setUploadProgress('Uploading.');

    try {
      let folderPath = ['TN_Sevai_App', 'Submissions', 'Temp'];
      if (currentUser) {
        folderPath = ['TN_Sevai_App', 'Users', currentUser.phone || 'Unknown', 'Documents'];
      }

      const fileUrl = await uploadFileToDrive(file, folderPath);

      setUploadedUrls(prev => {
        const current = prev[docKey] || { maxFiles };
        let nextUrls;
        if (maxFiles === 1) {
          nextUrls = { maxFiles: 1, url1: fileUrl, name1: file.name };
        } else {
          nextUrls = { ...current, maxFiles, [`url${fileInputIdx}`]: fileUrl, [`name${fileInputIdx}`]: file.name };
        }

        // Determine if upload is fully complete
        let isComplete = false;
        if (maxFiles === 1) {
          isComplete = !!nextUrls.url1;
        } else if (maxFiles === 2) {
          isComplete = !!(nextUrls.url1 && nextUrls.url2);
        } else if (maxFiles === 3) {
          isComplete = !!(nextUrls.url1 && nextUrls.url2 && nextUrls.url3);
        }

        setUploadStatuses(statusPrev => ({ ...statusPrev, [docKey]: isComplete ? 'uploaded' : 'partial' }));

        return { ...prev, [docKey]: nextUrls };
      });
    } catch (err) {
      console.error(err);
      alert("Failed to upload " + docKey);
      setUploadStatuses(prev => ({ ...prev, [docKey]: 'failed' }));
    }
  };

  const renderDocumentUploadZone = (docKeyOrLabel, isCustom) => {
    // Determine max files (1, 2, or 3) from selectedForm config
    let maxFiles = 1;
    if (isCustom) {
      const custDocs = normalizeCustomDocs(safeJsonParse(selectedForm.custom_docs, []));
      const docConfig = custDocs.find(x => x.label === docKeyOrLabel);
      if (docConfig) maxFiles = docConfig.val || 1;
    } else {
      const reqDocs = normalizeRequiredDocs(safeJsonParse(selectedForm.required_docs, []));
      const docConfig = reqDocs.find(x => x.id === docKeyOrLabel);
      if (docConfig) maxFiles = docConfig.val || 1;
      // photo and signature are always 1
      if (['photo', 'signature'].includes(docKeyOrLabel)) maxFiles = 1;
    }

    // Get saved profile URL (only for required standard fields)
    const getSavedDocUrl = () => {
      if (isCustom || !currentUser) return null;
      if (docKeyOrLabel === 'photo') return currentUser.photo_url;
      if (docKeyOrLabel === 'signature') return currentUser.signature_url_1;
      return currentUser[`${docKeyOrLabel}_url_1`] || currentUser[`${docKeyOrLabel}_url` || ''];
    };

    const savedUrl = getSavedDocUrl();
    const savedUrl2 = !isCustom && currentUser ? currentUser[`${docKeyOrLabel}_url_2`] : null;
    const hasSavedDoc = !!savedUrl && !deletedSavedDocs[docKeyOrLabel];

    if (hasSavedDoc) {
      // Render beautiful premium small preview card with Replace/Delete button
      return (
        <div key={docKeyOrLabel} className="document-upload-zone" style={{ padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #10b981', background: '#f0fdf4', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Small Display Thumbnail (Front) */}
            {checkIfPdf(savedUrl) ? (
              <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#fee2e2', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                <FileText size={22} />
              </div>
            ) : (
              <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img
                  src={getImageUrl(savedUrl)}
                  alt="Preview Front"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            )}

            {/* Small Display Thumbnail (Back) - if maxFiles >= 2 and exists */}
            {maxFiles >= 2 && savedUrl2 && (
              checkIfPdf(savedUrl2) ? (
                <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#fee2e2', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                  <FileText size={22} />
                </div>
              ) : (
                <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img
                    src={getImageUrl(savedUrl2)}
                    alt="Preview Back"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )
            )}

            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#1e293b', textTransform: 'capitalize', display: 'block' }}>
                {STANDARD_FIELDS[docKeyOrLabel]?.label || docKeyOrLabel} <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 'bold' }}>[Saved]</span>
              </span>
              <div style={{ display: 'flex', gap: '10px', marginTop: '2px' }}>
                <a
                  href={getImageUrl(savedUrl)}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '0.75rem', color: '#047857', textDecoration: 'underline', fontWeight: '700' }}
                >
                  {maxFiles >= 2 ? 'View Front' : 'View File'}
                </a>
                {maxFiles >= 2 && savedUrl2 && (
                  <a
                    href={getImageUrl(savedUrl2)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: '0.75rem', color: '#047857', textDecoration: 'underline', fontWeight: '700' }}
                  >
                    View Back
                  </a>
                )}
              </div>
            </div>
          </div>
          {/* Delete/Replace button */}
          <button
            type="button"
            onClick={() => handleDeleteSavedDoc(docKeyOrLabel)}
            className="premium-btn premium-btn-danger"
            style={{ width: 'auto', padding: '6px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '6px' }}
          >
            <Trash2 size={14} /> Delete & Replace
          </button>
        </div>
      );
    }

    const uploadStatus = uploadStatuses[docKeyOrLabel];
    const isUploaded = uploadStatus === 'uploaded';
    const freshlyUploaded = uploadedUrls[docKeyOrLabel];

    return (
      <div key={docKeyOrLabel} className="document-upload-zone" style={{ padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#1e293b', textTransform: 'capitalize' }}>
            {STANDARD_FIELDS[docKeyOrLabel]?.label || docKeyOrLabel} <span style={{ color: 'var(--error)' }}>*</span>
          </span>
          {isUploaded && (
            <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle size={14} /> Uploaded
            </span>
          )}
        </div>

        {isUploaded && freshlyUploaded ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', background: '#f0fdf4', border: '1px solid #10b981', borderRadius: '6px' }}>
            <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: '600', flex: 1, marginRight: '8px', wordBreak: 'break-all' }}>
              {maxFiles === 1
                ? freshlyUploaded.name1
                : maxFiles === 2
                  ? `${freshlyUploaded.name1} & ${freshlyUploaded.name2}`
                  : `${freshlyUploaded.name1}, ${freshlyUploaded.name2} & ${freshlyUploaded.name3}`
              }
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <a
                href={getImageUrl(freshlyUploaded.url1)}
                target="_blank"
                rel="noreferrer"
                className="premium-btn premium-btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.75rem', textDecoration: 'none' }}
              >
                {maxFiles === 1 ? 'View' : 'View Front'}
              </a>
              {maxFiles >= 2 && freshlyUploaded.url2 && (
                <a
                  href={getImageUrl(freshlyUploaded.url2)}
                  target="_blank"
                  rel="noreferrer"
                  className="premium-btn premium-btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.75rem', textDecoration: 'none' }}
                >
                  View Back
                </a>
              )}
              {maxFiles >= 3 && freshlyUploaded.url3 && (
                <a
                  href={getImageUrl(freshlyUploaded.url3)}
                  target="_blank"
                  rel="noreferrer"
                  className="premium-btn premium-btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.75rem', textDecoration: 'none' }}
                >
                  View Part 3
                </a>
              )}
              <button
                type="button"
                onClick={() => {
                  setUploadedUrls(prev => {
                    const copy = { ...prev };
                    delete copy[docKeyOrLabel];
                    return copy;
                  });
                  setUploadStatuses(prev => {
                    const copy = { ...prev };
                    delete copy[docKeyOrLabel];
                    return copy;
                  });
                }}
                className="premium-btn premium-btn-danger"
                style={{ padding: '4px 10px', fontSize: '0.75rem', border: 'none', cursor: 'pointer' }}
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {/* Input 1 */}
              <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    {maxFiles === 1 ? 'File:' : 'Front Side:'}
                  </span>
                  {freshlyUploaded?.url1 && (
                    <span style={{ color: '#10b981', fontSize: '0.65rem', fontWeight: 'bold' }}>✓ Uploaded</span>
                  )}
                </div>
                {uploadStatus === 'uploading_1' ? (
                  <div style={{ padding: '8px', background: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', border: '1px solid #0369a1' }}>
                    <div className="spinner" style={{ width: '12px', height: '12px', border: '2px solid #0369a1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    <span>Uploading...</span>
                  </div>
                ) : (
                  <label className="premium-btn premium-btn-secondary" style={{
                    padding: '8px',
                    fontSize: '0.75rem',
                    display: 'flex',
                    gap: '4px',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    background: freshlyUploaded?.url1 ? '#f0fdf4' : 'white',
                    border: freshlyUploaded?.url1 ? '1px solid #10b981' : '1px dashed var(--primary)',
                    color: freshlyUploaded?.url1 ? '#166534' : 'inherit'
                  }}>
                    <Upload size={14} style={{ color: freshlyUploaded?.url1 ? '#10b981' : 'var(--primary)' }} />
                    <span>{freshlyUploaded?.url1 ? 'Replace File' : 'Upload File'}</span>
                    <input
                      type="file"
                      accept={maxFiles === 1 && !['photo', 'signature'].includes(docKeyOrLabel) ? 'application/pdf,image/*' : 'image/*'}
                      onChange={(e) => handleImmediateUpload(docKeyOrLabel, maxFiles, 1, e.target.files[0])}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>

              {/* Input 2 */}
              {maxFiles >= 2 && (
                <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Back Side:</span>
                    {freshlyUploaded?.url2 && (
                      <span style={{ color: '#10b981', fontSize: '0.65rem', fontWeight: 'bold' }}>✓ Uploaded</span>
                    )}
                  </div>
                  {uploadStatus === 'uploading_2' ? (
                    <div style={{ padding: '8px', background: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', border: '1px solid #0369a1' }}>
                      <div className="spinner" style={{ width: '12px', height: '12px', border: '2px solid #0369a1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                      <span>Uploading...</span>
                    </div>
                  ) : (
                    <label className="premium-btn premium-btn-secondary" style={{
                      padding: '8px',
                      fontSize: '0.75rem',
                      display: 'flex',
                      gap: '4px',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      background: freshlyUploaded?.url2 ? '#f0fdf4' : 'white',
                      border: freshlyUploaded?.url2 ? '1px solid #10b981' : '1px dashed var(--primary)',
                      color: freshlyUploaded?.url2 ? '#166534' : 'inherit'
                    }}>
                      <Upload size={14} style={{ color: freshlyUploaded?.url2 ? '#10b981' : 'var(--primary)' }} />
                      <span>{freshlyUploaded?.url2 ? 'Replace Back' : 'Upload Back'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImmediateUpload(docKeyOrLabel, maxFiles, 2, e.target.files[0])}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                </div>
              )}

              {/* Input 3 */}
              {maxFiles >= 3 && (
                <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Additional Side:</span>
                    {freshlyUploaded?.url3 && (
                      <span style={{ color: '#10b981', fontSize: '0.65rem', fontWeight: 'bold' }}>✓ Uploaded</span>
                    )}
                  </div>
                  {uploadStatus === 'uploading_3' ? (
                    <div style={{ padding: '8px', background: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', border: '1px solid #0369a1' }}>
                      <div className="spinner" style={{ width: '12px', height: '12px', border: '2px solid #0369a1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                      <span>Uploading...</span>
                    </div>
                  ) : (
                    <label className="premium-btn premium-btn-secondary" style={{
                      padding: '8px',
                      fontSize: '0.75rem',
                      display: 'flex',
                      gap: '4px',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      background: freshlyUploaded?.url3 ? '#f0fdf4' : 'white',
                      border: freshlyUploaded?.url3 ? '1px solid #10b981' : '1px dashed var(--primary)',
                      color: freshlyUploaded?.url3 ? '#166534' : 'inherit'
                    }}>
                      <Upload size={14} style={{ color: freshlyUploaded?.url3 ? '#10b981' : 'var(--primary)' }} />
                      <span>{freshlyUploaded?.url3 ? 'Replace Extra' : 'Upload Extra'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImmediateUpload(docKeyOrLabel, maxFiles, 3, e.target.files[0])}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Proceed from Step 4 (Upload Docs) to Step 5 (Receipt) - Perform uploads and save submission
  const handleFinalWizardSubmit = async () => {
    const rawRequiredDocs = safeJsonParse(selectedForm.required_docs, []);
    const rawCustomDocs = safeJsonParse(selectedForm.custom_docs, []);

    const requiredDocsList = normalizeRequiredDocs(rawRequiredDocs).map(d => d.id);
    const customDocsList = normalizeCustomDocs(rawCustomDocs).map(d => d.label);
    const missing = [];

    // Verify all required documents are selected OR exist in profile
    requiredDocsList.forEach(docKey => {
      const isAlreadyUploaded = currentUser && !deletedSavedDocs[docKey] && (
        (docKey === 'photo' && currentUser.photo_url) ||
        (docKey === 'signature' && currentUser.signature_url_1) ||
        currentUser[`${docKey}_url_1`] ||
        currentUser[`${docKey}_url`]
      );
      const isSelectedLocal = uploadedUrls[docKey] && (uploadedUrls[docKey].url1 || uploadedUrls[docKey].url2 || uploadedUrls[docKey].url3);

      if (!isAlreadyUploaded && !isSelectedLocal) {
        missing.push(STANDARD_FIELDS[docKey]?.label || docKey);
      }
    });

    customDocsList.forEach(docLabel => {
      const isSelectedLocal = uploadedUrls[docLabel] && (uploadedUrls[docLabel].url1 || uploadedUrls[docLabel].url2 || uploadedUrls[docLabel].url3);
      if (!isSelectedLocal) {
        missing.push(docLabel);
      }
    });

    if (missing.length > 0) {
      alert(`Please upload files for: ${missing.join(', ')}`);
      return;
    }

    setLoading(true);
    setUploadProgress('Checking application status...');

    try {
      // Check if already applied (Form ID + User Aadhar check)
      const targetAadhar = formData.aadhar || currentUser?.aadhar || '';
      const targetPhone = formData.phone || currentUser?.phone || '';
      const targetDob = '';

      if (targetAadhar) {
        const userSubs = await getUserStatus(targetPhone, targetDob, targetAadhar);
        if (Array.isArray(userSubs) && userSubs.some(s => s.form_id === selectedForm.id && s.payment_status !== 'draft')) {
          alert(`You have already applied for this service (${selectedForm.title})! Multiple applications are not permitted.`);
          setLoading(false);
          return;
        }
      }

      setUploadProgress('Storing application data...');
      // 1. Package response answers (split standard fields and custom fields)
      const reqFieldsKeys = safeJsonParse(selectedForm.required_fields, []);
      const customFields = safeJsonParse(selectedForm.fields, []);
      const responsesPack = {};

      reqFieldsKeys.forEach(fieldId => {
        responsesPack[STANDARD_FIELDS[fieldId]?.label || fieldId] = formData[fieldId] || '';
      });

      customFields.forEach(f => {
        if (f.type === 'repeated') {
          const count = parseInt(formData[f.id]) || 0;
          responsesPack[f.label || 'Count'] = count;
          const { min } = parseLimit(f.limit);
          for (let i = min; i <= count; i++) {
            (f.subFields || []).forEach(sub => {
              const subFieldKey = `${f.id}_member_${i}_${sub.id}`;
              const subLabel = `#${i} - ${sub.label}`;
              responsesPack[subLabel] = formData[subFieldKey] || '';
            });
          }
        } else {
          responsesPack[f.label] = formData[f.id] || '';
        }
      });

      // 2. Prepare documents payload using uploadedUrls and currentUser saved docs
      const docReferencesPack = {};
      requiredDocsList.forEach(docKey => {
        if (deletedSavedDocs[docKey]) return; // Skip if deleted/replaced!

        const hasSavedUrl1 = currentUser && currentUser[`${docKey}_url_1` || ''];
        const hasSavedUrl2 = currentUser && currentUser[`${docKey}_url_2` || ''];
        const isPhotoSavedUrl = docKey === 'photo' && currentUser && currentUser.photo_url;
        const isSignatureSavedUrl = docKey === 'signature' && currentUser && currentUser.signature_url_1;

        const freshlyUploaded = uploadedUrls[docKey];

        if (freshlyUploaded) {
          docReferencesPack[docKey] = [freshlyUploaded.url1, freshlyUploaded.url2, freshlyUploaded.url3].filter(Boolean);
        } else if (isPhotoSavedUrl) {
          docReferencesPack['photo'] = [currentUser.photo_url];
        } else if (isSignatureSavedUrl) {
          docReferencesPack['signature'] = [currentUser.signature_url_1];
        } else if (hasSavedUrl1) {
          docReferencesPack[docKey] = [hasSavedUrl1];
          if (hasSavedUrl2) docReferencesPack[docKey].push(hasSavedUrl2);
        }
      });

      customDocsList.forEach(docLabel => {
        const freshlyUploaded = uploadedUrls[docLabel];
        if (freshlyUploaded) {
          docReferencesPack[docLabel] = [freshlyUploaded.url1, freshlyUploaded.url2, freshlyUploaded.url3].filter(Boolean);
        }
      });

      // 3. Create Submission record in Backend, including uploadedDocs
      const submission = await submitFormResponse(
        selectedForm.id,
        formData.phone || currentUser?.phone || '',
        formData.dob || currentUser?.dob || '',
        formData.aadhar || currentUser?.aadhar || '',
        responsesPack,
        "submitted",
        docReferencesPack
      );

      setSubmissionResult(submission);
      setLastResponsesPack(responsesPack);
      setLastDocReferencesPack(docReferencesPack);

      // Save filled custom fields to user profile for future auto-filling
      if (currentUser) {
        let currentCustom = {};
        if (currentUser.custom_fields) {
          try {
            currentCustom = typeof currentUser.custom_fields === 'string'
              ? JSON.parse(currentUser.custom_fields)
              : currentUser.custom_fields;
          } catch (e) {
            console.error("Error parsing user custom fields:", e);
          }
        }

        // Merge custom field responses from this submission
        const customFields = safeJsonParse(selectedForm.fields, []);
        customFields.forEach(f => {
          if (f.type === 'repeated') {
            currentCustom[f.id] = formData[f.id]; // Save the count
            currentCustom[f.label] = formData[f.id]; // Also save with label as fallback
            const count = parseInt(formData[f.id]) || 0;
            for (let i = 1; i <= count; i++) {
              (f.subFields || []).forEach(sub => {
                const subFieldKey = `${f.id}_member_${i}_${sub.id}`;
                if (formData[subFieldKey] !== undefined) {
                  currentCustom[subFieldKey] = formData[subFieldKey];
                }
              });
            }
          } else {
            if (formData[f.id] !== undefined) {
              currentCustom[f.label] = formData[f.id];
            }
          }
        });

        // Save back to user profile
        try {
          await updateUserProfile(currentUser.id, {
            custom_fields: JSON.stringify(currentCustom)
          });
        } catch (err) {
          console.error("Failed to sync custom fields to profile:", err);
        }
      }

      if (currentUser) {
        // Simply reload the profile locally
        const latestProfile = await loginUser({ dob: currentUser.dob, phone: currentUser.phone }).catch(() => null);
        if (latestProfile && latestProfile.id) {
          onUpdateProfile(latestProfile);
        }
      }

      // Automatically trigger WhatsApp redirect
      try {
        sendSubmissionToWhatsApp(submission, selectedForm, responsesPack, docReferencesPack);
      } catch (err) {
        console.error("WhatsApp redirect failed or was blocked:", err);
      }

      setUploadProgress('');
      setWizardStep(5); // Final Step: Get Receipt
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to complete document uploads.');
      setUploadProgress('');
    } finally {
      setLoading(false);
    }
  };



  // --- LOOKUP & SCREENSHOT PROOF ---
  const handleStatusLookup = async (e) => {
    e.preventDefault();
    const phoneVal = lookupType === 'phone' ? lookupPhone.trim() : '';
    const aadharVal = lookupType === 'aadhar' ? lookupAadhar.trim() : '';
    const dobVal = lookupDob.trim();

    if (lookupType === 'phone' && !phoneVal) {
      alert('Please enter your Phone number.');
      return;
    }
    if (lookupType === 'aadhar' && !aadharVal) {
      alert('Please enter your Aadhaar number.');
      return;
    }

    setSearchingStatus(true);
    try {
      console.log('[Fetch] Manual status lookup initiated:', { phone: phoneVal, dob: dobVal, aadhar: aadharVal });
      const data = await getUserStatus(phoneVal, dobVal, aadharVal);
      console.log('[Fetch] Manual status lookup received', data?.length, 'applications');
      setUserApplications(data);
      setHasSearchedStatus(true);
      console.log('[State] userApplications updated with', data?.length, 'records from manual lookup');
    } catch (err) {
      console.error('[Fetch] Manual status lookup error:', err);
      alert(err.message || 'No submissions found with these credentials.');
    } finally {
      setSearchingStatus(false);
    }
  };



  const handleScreenshotUpload = async (subId, file) => {
    if (!file) return;
    setUploadingScreenshotId(subId);
    try {
      await uploadPaymentScreenshot(subId, file);
      alert('Payment proof uploaded successfully! Admin will verify your payment details.');

      // Refresh list
      const phoneVal = currentUser?.phone || lookupPhone;
      const dobVal = lookupDob || '';
      const aadharVal = currentUser?.aadhar || lookupAadhar;
      const data = await getUserStatus(phoneVal, dobVal, aadharVal);
      setUserApplications(data);
    } catch (err) {
      console.error(err);
      alert('Failed to upload screenshot.');
    } finally {
      setUploadingScreenshotId(null);
    }
  };

  const handleUpiPay = (fee, submissionId, paymentNo, method) => {
    const pa = formatUpiVpa(paymentNo, method);
    const am = fee;

    let targetUrl = `upi://pay?pa=${pa}&am=${am}&cu=INR`;
    if (method === 'phonepe') {
      targetUrl = `phonepe://pay?pa=${pa}&am=${am}&cu=INR`;
    } else if (method === 'gpay') {
      targetUrl = `gpay://upi/pay?pa=${pa}&am=${am}&cu=INR`;
    }

    // Attempt to open the specific payment application
    window.location.href = targetUrl;

    // Smart Fallback: If the target app is not installed, the browser remains in focus.
    // After 1.5 seconds, we fall back to the generic upi:// scheme to trigger the system chooser.
    const fallbackUrl = `upi://pay?pa=${pa}&am=${am}&cu=INR`;
    setTimeout(() => {
      if (document.hasFocus()) {
        window.location.href = fallbackUrl;
      }
    }, 1500);
  };

  const printReceipt = () => {
    const applicantName = formData.name || currentUser?.name || 'N/A';
    const phoneNo = submissionResult.phone || 'N/A';
    const certName = selectedForm.title || 'N/A';
    const fee = selectedForm.fee || 0;
    const status = (submissionResult.payment_status || 'unpaid').toUpperCase();
    const receiptId = submissionResult.id || 'N/A';
    const submittedDate = submissionResult.submitted_at
      ? new Date(submissionResult.submitted_at)
      : new Date();
    const dateStr = submittedDate.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = submittedDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const aadharNo = submissionResult.aadhar ? submissionResult.aadhar.replace(/(\d{4})/g, '$1 ').trim() : 'N/A';

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>SUBI Online Service Receipt - ${receiptId}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', sans-serif; background: #fff; color: #1e293b; padding: 30px; }
          .receipt { max-width: 480px; margin: 0 auto; border: 2px dashed #10b981; border-radius: 16px; padding: 28px; position: relative; }
          .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 3rem; color: #10b981; opacity: 0.04; font-weight: 900; pointer-events: none; }
          .header { text-align: center; border-bottom: 1.5px dashed #cbd5e1; padding-bottom: 14px; margin-bottom: 18px; }
          .header h2 { font-size: 1.3rem; color: #047857; font-weight: 900; text-transform: uppercase; margin-bottom: 4px; }
          .header .sub { font-size: 0.75rem; color: #10b981; font-weight: 700; }
          .header .sub2 { font-size: 0.65rem; color: #64748b; font-weight: 600; margin-top: 2px; }
          .row { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; font-size: 0.85rem; border-bottom: 1px solid #f1f5f9; }
          .row:last-child { border-bottom: none; }
          .label { color: #64748b; font-weight: 500; }
          .value { font-weight: 700; color: #1e293b; text-align: right; max-width: 55%; word-break: break-all; }
          .value.green { color: #10b981; }
          .value.red { color: #ef4444; }
          .divider { border-top: 1.5px dashed #cbd5e1; margin: 14px 0; }
          .badge { display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.5px; }
          .badge-unpaid { background: #fef2f2; color: #ef4444; border: 1px solid #fca5a5; }
          .badge-paid { background: #f0fdf4; color: #10b981; border: 1px solid #86efac; }
          .footer { text-align: center; margin-top: 16px; font-size: 0.7rem; color: #94a3b8; }
          @media print { body { padding: 10px; } .receipt { border-color: #333; } }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="watermark">SUBI ONLINE SERVICE</div>
          <div class="header">
            <h2>${certName}</h2>
            <div class="sub">SUBI ONLINE SERVICE </div>
            <div class="sub2"> Receipt</div>
          </div>
          <div class="row"><span class="label">Receipt ID:</span><span class="value green">${receiptId}</span></div>
          <div class="row"><span class="label">Applicant Name:</span><span class="value">${applicantName}</span></div>
          <div class="row"><span class="label">Certificate / Service:</span><span class="value">${certName}</span></div>
          <div class="row"><span class="label">Phone Number:</span><span class="value">${phoneNo}</span></div>
          <div class="row"><span class="label">Aadhaar Number:</span><span class="value">${aadharNo}</span></div>
          <div class="row"><span class="label">Date:</span><span class="value">${dateStr}</span></div>
          <div class="row"><span class="label">Time:</span><span class="value">${timeStr}</span></div>
          <div class="divider"></div>
          <div class="row"><span class="label">Service Fee:</span><span class="value" style="font-size:1rem;font-weight:800;">Rs. ${fee}</span></div>
          <div class="row"><span class="label">Payment Status:</span><span class="badge ${status === 'PAID' ? 'badge-paid' : 'badge-unpaid'}">${status}</span></div>
          <div class="footer">Thank you for using SUBI Online Service Portal.<br/>Save this receipt for your records.</div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (printWindow) {
      printWindow.document.write(receiptHtml);
      printWindow.document.close();
    } else {
      alert('Please allow pop-ups to download the receipt.');
    }
  };

  const resumeApplicationDraft = (app) => {
    const targetForm = forms.find(f => f.id === app.form_id);
    if (!targetForm) {
      alert("Form template for this draft is no longer available.");
      return;
    }

    const draftResponses = typeof app.responses === 'string' ? safeJsonParse(app.responses, {}) : (app.responses || {});
    const newFormData = {};

    // 1. Map standard fields
    const reqFieldsKeys = safeJsonParse(targetForm.required_fields, []);
    reqFieldsKeys.forEach(fieldId => {
      const label = STANDARD_FIELDS[fieldId]?.label || fieldId;
      if (draftResponses[label] !== undefined) {
        newFormData[fieldId] = draftResponses[label];
      }
    });

    // 2. Map custom fields
    const customFields = safeJsonParse(targetForm.fields, []);
    customFields.forEach(f => {
      if (f.type === 'repeated') {
        const countLabel = f.label || 'Count';
        if (draftResponses[countLabel] !== undefined) {
          newFormData[f.id] = draftResponses[countLabel];
          const count = parseInt(draftResponses[countLabel]) || 0;
          for (let i = 1; i <= count; i++) {
            (f.subFields || []).forEach(sub => {
              const subFieldKey = `${f.id}_member_${i}_${sub.id}`;
              const subLabel = `${f.label ? f.label.replace('count', '').replace('Count', '').replace(':', '').trim() : 'Item'} #${i} - ${sub.label}`;
              if (draftResponses[subLabel] !== undefined) {
                newFormData[subFieldKey] = draftResponses[subLabel];
              }
            });
          }
        }
      } else {
        if (draftResponses[f.label] !== undefined) {
          newFormData[f.id] = draftResponses[f.label];
        }
      }
    });

    // 3. Map uploaded docs
    if (app.uploaded_docs) {
      try {
        const parsedDocs = typeof app.uploaded_docs === 'string' ? JSON.parse(app.uploaded_docs) : app.uploaded_docs;
        const newUploadedUrls = {};
        const newUploadStatuses = {};
        
        Object.keys(parsedDocs).forEach(docKey => {
          const urls = parsedDocs[docKey];
          if (urls && urls.length > 0) {
            const nextUrls = { maxFiles: urls.length };
            urls.forEach((url, idx) => {
              nextUrls[`url${idx + 1}`] = url;
              nextUrls[`name${idx + 1}`] = url.split('/').pop().split('?').shift() || `file_${idx + 1}`;
            });
            newUploadedUrls[docKey] = nextUrls;
            newUploadStatuses[docKey] = 'uploaded';
          }
        });
        
        setUploadedUrls(newUploadedUrls);
        setUploadStatuses(newUploadStatuses);
      } catch (e) {
        console.error("Failed to parse uploaded_docs on draft resume:", e);
      }
    } else {
      setUploadedUrls({});
      setUploadStatuses({});
    }

    // Load into wizard
    setSelectedForm(targetForm);
    setFormData(newFormData);
    setWizardStep(2); // Go directly to Step 2 (Fill/Verify)
    setSearchParams({ tab: 'apply' }); // Change to apply tab
  };

  const renderMintGreenLoader = (label = "LOADING...") => {
    return (
      <div
        style={{
          padding: '24px',
          gridColumn: 'span 2',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          width: '100%',
          background: 'transparent',
          border: 'none',
          boxShadow: 'none'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div className="shimmer-text" style={{
            margin: 0,
            fontSize: '1.2rem',
            fontWeight: '900',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontFamily: 'system-ui, sans-serif'
          }}>
            {label}
          </div>
          <div className="shimmer-text" style={{
            margin: '4px 0 0 0',
            fontSize: '0.9rem',
            fontWeight: '700',
            letterSpacing: '0.05em'
          }}>
            pls wait.
          </div>
        </div>
      </div>
    );
  };

  // --- SORTING HELPER ---
  const sortItems = (list) => {
    return [...list].sort((a, b) => {
      const orderA = a.order_index === undefined || a.order_index === null ? 0 : Number(a.order_index);
      const orderB = b.order_index === undefined || b.order_index === null ? 0 : Number(b.order_index);
      if (orderA !== orderB) return orderA - orderB;

      const idA = isNaN(a.id) ? a.id : Number(a.id);
      const idB = isNaN(b.id) ? b.id : Number(b.id);
      if (typeof idA === 'number' && typeof idB === 'number') {
        return idB - idA;
      }
      return String(idB).localeCompare(String(idA));
    });
  };

  // --- CATEGORIES HELPER ---
  const filteredForms = selectedCategory === 'all'
    ? forms
    : forms.filter(f => f.category.toLowerCase() === selectedCategory.toLowerCase());

  const serverConfig = (() => {
    try {
      const saved = localStorage.getItem('whatsbro_server_config');
      return saved ? JSON.parse(saved) : { active: true, message: 'Server issues, so pls wait...' };
    } catch (e) {
      return { active: true, message: 'Server issues, so pls wait...' };
    }
  })();

  if (!serverConfig.active) {
    return (
      <div style={{ padding: '24px 16px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="premium-card text-center" style={{ borderTop: '6px solid #ef4444', maxWidth: '400px', width: '100%', padding: '32px 24px', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.1)' }}>
          <AlertCircle size={48} style={{ color: '#ef4444', margin: '0 auto 16px auto', animation: 'pulse-text 2s ease-in-out infinite' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>server issues ,so pls wait...</h3>
          <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '14px', marginTop: '12px' }}>
            <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0, fontWeight: '600', lineHeight: '1.5' }}>
              {serverConfig.message || 'The system is undergoing routine upgrades. Please check back later.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Premium custom Toast Alerts */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 20px',
          borderRadius: '16px',
          background: toast.type === 'error' ? '#fef2f2' : toast.type === 'warning' ? '#fffbeb' : '#f0fdf4',
          border: `1.5px solid ${toast.type === 'error' ? '#fca5a5' : toast.type === 'warning' ? '#fde68a' : '#a7f3d0'}`,
          color: toast.type === 'error' ? '#991b1b' : toast.type === 'warning' ? '#92400e' : '#065f46',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
          maxWidth: '380px',
          width: '90%',
          animation: 'float-card 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
        }}>
          {toast.type === 'error' ? (
            <AlertCircle size={20} style={{ color: '#ef4444', flexShrink: 0 }} />
          ) : toast.type === 'warning' ? (
            <AlertCircle size={20} style={{ color: '#f59e0b', flexShrink: 0 }} />
          ) : (
            <CheckCircle size={20} style={{ color: '#10b981', flexShrink: 0 }} />
          )}
          <span style={{ fontSize: '0.85rem', fontWeight: '700', lineHeight: '1.4', flex: 1, textAlign: 'left' }}>
            {toast.message}
          </span>
          <button
            onClick={() => setToast(null)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: 'inherit', opacity: 0.6 }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div style={{ flex: 1 }}>

        {error && (
          <div className="premium-card" style={{ borderLeft: '4px solid var(--error)', background: '#fee2e2', color: '#991b1b', margin: '16px' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{error}</p>
          </div>
        )}

        {/* --- TAB 1: HOME POSTS --- */}
        {activeTab === 'home' && (
          <div className="desktop-grid-2" style={{ padding: '0 8px' }}>

            {postsLoading ? (
              renderMintGreenLoader("LOADING...")
            ) : posts.length === 0 ? (
              <div className="premium-card text-center" style={{ padding: '40px 20px', gridColumn: 'span 2' }}>
                <p className="text-muted">No services published yet.</p>
              </div>
            ) : (
              sortItems(posts).map((post) => {
                return (
                  <div id={`post-${post.id}`} className="instagram-post-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-light-main)', margin: 0, lineHeight: '1.3' }}>
                      {post.title}
                    </h3>

                    {post.img_url && post.img_url.trim() !== '' && (
                      <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)', background: '#fafafa', width: '100%', aspectRatio: '1 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img
                          src={getImageUrl(post.img_url)}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          alt={post.title}
                        />
                      </div>
                    )}

                    <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
                      {post.description}
                    </p>

                    {(post.coming_soon === true || String(post.coming_soon).toLowerCase() === 'true') ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '4px' }}>
                        <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(245, 158, 11, 0.05)' }}>
                          <Clock size={18} style={{ color: '#d97706', animation: 'pulse-text 2s ease-in-out infinite' }} />
                          <span style={{ color: '#d97706', fontWeight: '800', fontSize: '0.9rem', letterSpacing: '0.05em' }}>updated .... coming soon...</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '4px' }}>
                        {post.apply_url && post.apply_url.trim() !== '' && post.apply_url.trim().toLowerCase() !== 'none' && (
                          <button
                            onClick={() => {
                              if (post.apply_url.startsWith('/user')) {
                                const urlParams = new URLSearchParams(post.apply_url.split('?')[1]);
                                setSearchParams(urlParams);
                              } else {
                                window.open(post.apply_url, '_blank');
                              }
                            }}
                            className="premium-btn premium-btn-primary"
                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '11px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                          >
                            Apply Now <ChevronRight size={18} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleWhatsAppShare(post.title, post.description, `/post/${post.id}`)}
                          className="premium-btn premium-btn-primary"
                          style={{
                            width: post.apply_url && post.apply_url.trim() !== '' && post.apply_url.trim().toLowerCase() !== 'none' ? '42px' : '100%',
                            padding: '11px 0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            fontWeight: 'bold'
                          }}
                          title="Share on WhatsApp"
                        >
                          <Share2 size={18} />
                          {!(post.apply_url && post.apply_url.trim() !== '' && post.apply_url.trim().toLowerCase() !== 'none') && <span>Share on WhatsApp</span>}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* --- TAB 1B: JOB ALERTS --- */}
        {activeTab === 'jobs' && (
          <div className="desktop-grid-2" style={{ padding: '0 8px' }}>
            {selectedJobDetails ? (
              (selectedJobDetails.coming_soon === true || String(selectedJobDetails.coming_soon).toLowerCase() === 'true') ? (
                <div style={{ gridColumn: 'span 2', minHeight: 'calc(100vh - 270px)', display: 'flex', flexDirection: 'column' }}>
                  <div className="premium-card text-center" style={{ flex: 1, padding: '32px 24px', borderTop: '6px solid #f59e0b', background: 'white', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', justifyContent: 'center' }}>
                    <button
                      onClick={() => setSelectedJobDetails(null)}
                      className="premium-btn premium-btn-secondary"
                      style={{ width: 'fit-content', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-start' }}
                    >
                      <ArrowLeft size={16} /> Back to Jobs
                    </button>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
                      <Clock size={48} style={{ color: '#f59e0b', margin: '0 auto', animation: 'pulse-text 2s ease-in-out infinite' }} />
                      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-light-main)', margin: '0', lineHeight: '1.3' }}>
                        {selectedJobDetails.title}
                      </h2>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#d97706', margin: '0' }}>updated .... coming soon...</h3>
                      <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, maxWidth: '360px', lineHeight: '1.5' }}>
                        The details for this job alert are currently being updated. Please check back soon!
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ gridColumn: 'span 2' }}>
                  <div className="premium-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '6px solid var(--primary)', background: 'white', borderRadius: '16px' }}>

                    {/* Nested Details Back Button */}
                    <button
                      onClick={() => setSelectedJobDetails(null)}
                      className="premium-btn premium-btn-secondary"
                      style={{ width: 'fit-content', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}
                    >
                      <ArrowLeft size={16} /> Back to Jobs
                    </button>

                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-light-main)', margin: '0', lineHeight: '1.3' }}>
                      {selectedJobDetails.title}
                    </h2>
                    {(selectedJobDetails.start_date || selectedJobDetails.end_date) && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.8rem', color: '#475569', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', width: 'fit-content', marginTop: '4px', alignItems: 'center' }}>
                        {selectedJobDetails.start_date && (
                          <span><strong>Start Date:</strong> {formatDate(selectedJobDetails.start_date)}</span>
                        )}
                        {selectedJobDetails.start_date && selectedJobDetails.end_date && <span style={{ color: '#cbd5e1' }}>|</span>}
                        {selectedJobDetails.end_date && (
                          <span style={{ color: '#ef4444' }}><strong>Last Date:</strong> {formatDate(selectedJobDetails.end_date)}</span>
                        )}
                      </div>
                    )}

                    {selectedJobDetails.img_url && selectedJobDetails.img_url.trim() !== '' && (
                      <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)', background: '#fafafa', width: '100%', aspectRatio: '1 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '8px 0' }}>
                        <img
                          src={getImageUrl(selectedJobDetails.img_url)}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          alt={selectedJobDetails.title}
                        />
                      </div>
                    )}

                    <p style={{ color: '#475569', fontSize: '1rem', lineHeight: '1.6', margin: 0, paddingBottom: '16px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                      {selectedJobDetails.description}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                      {parseDetailsDoc(selectedJobDetails.details_doc)}
                    </div>

                    {selectedJobDetails.apply_url && selectedJobDetails.apply_url.trim() !== '' && selectedJobDetails.apply_url.trim().toLowerCase() !== 'none' ? (
                      <div style={{ marginTop: '24px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '24px', display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => {
                            const url = selectedJobDetails.apply_url;
                            setSelectedJobDetails(null);
                            if (url.startsWith('/user')) {
                              const urlParams = new URLSearchParams(url.split('?')[1]);
                              setSearchParams(urlParams);
                            } else {
                              window.open(url, '_blank');
                            }
                          }}
                          className="premium-btn premium-btn-primary"
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', fontSize: '1.1rem' }}
                        >
                          {selectedJobDetails.button_name || 'Apply Now'} <ChevronRight size={20} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleWhatsAppShare(selectedJobDetails.title, selectedJobDetails.description, `/job/${selectedJobDetails.id}`)}
                          className="premium-btn premium-btn-primary"
                          style={{ width: '52px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}
                          title="Share on WhatsApp"
                        >
                          <Share2 size={22} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ marginTop: '24px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '24px' }}>
                        <button
                          type="button"
                          onClick={() => handleWhatsAppShare(selectedJobDetails.title, selectedJobDetails.description, `/job/${selectedJobDetails.id}`)}
                          className="premium-btn premium-btn-primary"
                          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', fontSize: '1.1rem', borderRadius: '8px', fontWeight: 'bold' }}
                          title="Share on WhatsApp"
                        >
                          <Share2 size={20} /> Share on WhatsApp
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            ) : jobsLoading ? (
              renderMintGreenLoader("LOADING...")
            ) : jobs.length === 0 ? (
              <div className="premium-card text-center" style={{ padding: '40px 20px', gridColumn: 'span 2' }}>
                <p className="text-muted">No job alerts published yet.</p>
              </div>
            ) : (
              sortItems(jobs).map((job) => {
                const isJobComingSoon = job.coming_soon === true || String(job.coming_soon).toLowerCase() === 'true';
                return (
                  <div key={job.id} className="instagram-post-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-light-main)', margin: 0, lineHeight: '1.3', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      {job.title}
                      {isJobComingSoon && (
                        <span className="badge badge-warning" style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>Upcoming</span>
                      )}
                    </h3>
                    {(job.start_date || job.end_date) && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.75rem', color: '#475569', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', width: 'fit-content', marginTop: '2px', alignItems: 'center' }}>
                        {job.start_date && (
                          <span><strong>Start:</strong> {formatDate(job.start_date)}</span>
                        )}
                        {job.start_date && job.end_date && <span style={{ color: '#cbd5e1' }}>|</span>}
                        {job.end_date && (
                          <span style={{ color: '#ef4444' }}><strong>Last Date:</strong> {formatDate(job.end_date)}</span>
                        )}
                      </div>
                    )}

                    {job.img_url && job.img_url.trim() !== '' && (
                      <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)', background: '#fafafa', width: '100%', aspectRatio: '1 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img
                          src={getImageUrl(job.img_url)}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          alt={job.title}
                        />
                      </div>
                    )}

                    <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
                      {job.description}
                    </p>

                    {((job.apply_url && job.apply_url.trim() !== '' && job.apply_url.trim().toLowerCase() !== 'none') || (job.details_doc && job.details_doc.trim() !== '')) && (
                      <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '4px' }}>
                        <button
                          onClick={() => setSelectedJobDetails(job)}
                          className="premium-btn premium-btn-primary"
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '11px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          {isJobComingSoon ? 'View Details' : 'View Details & Apply'} <ChevronRight size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleWhatsAppShare(job.title, job.description, `/job/${job.id}`)}
                          className="premium-btn premium-btn-primary"
                          style={{ width: '42px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Share on WhatsApp"
                        >
                          <Share2 size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* --- TAB 2: CERTIFICATE APPLICATIONS WIZARD --- */}
        {activeTab === 'apply' && (
          <div>
            {!selectedForm ? (
              // Form selections
              <div style={{ padding: '0 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '16px 0 10px 0' }}>
                  <Filter size={16} className="text-muted" />
                  <span className="premium-label" style={{ margin: 0 }}>Service Category Filter</span>
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="premium-input"
                  style={{ marginBottom: '16px', background: 'white' }}
                >
                  <option value="all">All Categories</option>
                  <option value="E sevai">E Sevai</option>
                  <option value="pan card">PAN Card</option>
                  <option value="voter id">Voter ID</option>
                  <option value="others">Others</option>
                </select>

                {formsLoading ? (
                  renderMintGreenLoader("LOADING...")
                ) : filteredForms.length === 0 ? (
                  <div className="premium-card text-center" style={{ padding: '40px 20px' }}>
                    <p className="text-muted">No form templates found in this category.</p>
                  </div>
                ) : (
                  <div className="desktop-grid-2">
                    {sortItems(filteredForms).map((form) => {
                      const fieldsCount = safeJsonParse(form.required_fields, []).length;
                      const docsCount = safeJsonParse(form.required_docs, []).length;
                      const isAutoUpcoming = fieldsCount === 0 && docsCount === 0;
                      const isManualComingSoon = form.coming_soon === true || String(form.coming_soon).toLowerCase() === 'true';
                      const isUpcoming = isAutoUpcoming; // only disable automatically upcoming forms (0 fields and 0 docs)
                      const showUpcomingLabel = isAutoUpcoming || isManualComingSoon;

                      return (
                        <div key={form.id} className="premium-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <span className="badge badge-info">{form.category}</span>
                            {showUpcomingLabel ? (
                              <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 'bold' }}>Upcoming</span>
                            ) : (
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-light-muted)' }}>Apply</span>
                            )}
                          </div>
                          <h3 style={{ fontSize: '1.15rem', marginBottom: '6px' }}>{form.title}</h3>

                          {form.img_url && (
                            <div style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px', border: '1px solid #e2e8f0' }}>
                              <img src={getImageUrl(form.img_url)} alt={form.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#047857', background: '#ecfdf5', padding: '4px 10px', borderRadius: '6px' }}>
                              Rs ₹{form.fee || 0}
                            </span>
                          </div>

                          <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '16px' }}>{form.description}</p>
                          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                            <button
                              onClick={() => !isUpcoming && selectFormToFill(form)}
                              className={`premium-btn ${isUpcoming ? 'premium-btn-secondary' : 'premium-btn-primary'}`}
                              style={{ flex: 1, padding: '10px', opacity: isUpcoming ? 0.7 : 1, cursor: isUpcoming ? 'not-allowed' : 'pointer' }}
                              disabled={isUpcoming}
                            >
                              {isManualComingSoon ? 'Upcoming soon' : isUpcoming ? 'Upcoming soon' : 'Click to Apply'}
                            </button>
                            {(!isUpcoming || isManualComingSoon) && (
                              <button
                                type="button"
                                onClick={() => handleWhatsAppShare(form.title, `Apply for ${form.title} easily through our E-Sevai portal.`, `/form/${form.id}`)}
                                className="premium-btn premium-btn-primary"
                                style={{ width: '42px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Share on WhatsApp"
                              >
                                <Share2 size={18} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (selectedForm.coming_soon === true || String(selectedForm.coming_soon).toLowerCase() === 'true') ? (
              <div style={{ minHeight: 'calc(100vh - 270px)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderBottom: '1px solid var(--border-light)' }}>
                  <button onClick={() => setSelectedForm(null)} className="premium-btn premium-btn-secondary" style={{ width: '40px', height: '40px', padding: 0, borderRadius: '50%' }}>
                    <ArrowLeft size={18} />
                  </button>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>{selectedForm.title}</h3>
                  </div>
                </div>

                <div style={{ padding: '32px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div className="premium-card text-center" style={{ flex: 1, borderTop: '6px solid #f59e0b', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={48} style={{ color: '#f59e0b', margin: '0 auto', animation: 'pulse-text 2s ease-in-out infinite' }} />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>updated .... coming soon...</h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, maxWidth: '360px', lineHeight: '1.5' }}>
                      This application form is currently being updated and will be available soon. Please check back later.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              // Active 5-Step Application Wizard
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderBottom: '1px solid var(--border-light)' }}>
                  <button onClick={() => setSelectedForm(null)} className="premium-btn premium-btn-secondary" style={{ width: '40px', height: '40px', padding: 0, borderRadius: '50%' }}>
                    <ArrowLeft size={18} />
                  </button>
                  <div>
                    <h3 style={{ fontSize: '1rem' }}>{selectedForm.title}</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-light-muted)' }}>Apply Wizard - Step {wizardStep} of 5</p>
                  </div>
                </div>

                {/* Highly refined HSL-themed 5 Step progress path */}
                <div className="step-wizard" style={{ marginTop: '16px' }}>
                  <div className="step-wizard-line" style={{ height: '3px', background: '#cbd5e1' }}></div>
                  <div className="step-wizard-progress" style={{
                    height: '3px',
                    background: 'var(--primary)',
                    width: `${((wizardStep - 1) / 4) * 100}%`
                  }}></div>
                  {[1, 2, 3, 4, 5].map(step => (
                    <div
                      key={step}
                      className={`step-node ${wizardStep >= step ? 'completed' : ''}`}
                      style={{
                        width: '30px',
                        height: '30px',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        backgroundColor: wizardStep >= step ? 'var(--primary)' : '#e2e8f0',
                        color: wizardStep >= step ? '#ffffff' : '#64748b',
                        border: wizardStep === step ? '2px solid #ffffff' : 'none',
                        boxShadow: wizardStep === step ? '0 0 0 2px var(--primary)' : 'none'
                      }}
                    >
                      {step}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '-10px 16px 20px 16px', fontSize: '0.65rem', color: 'var(--text-light-muted)', fontWeight: 700 }}>
                  <span>Instructions</span>
                  <span>Fill Form</span>
                  <span>Preview</span>
                  <span>Upload Docs</span>
                  <span>Receipt</span>
                </div>

                {/* STEP 1: INSTRUCTIONS & TERMS */}
                {wizardStep === 1 && (
                  <div style={{ padding: '0 16px' }}>
                    {(selectedForm.coming_soon === true || String(selectedForm.coming_soon).toLowerCase() === 'true') ? (
                      <>
                        <div className="premium-card text-center" style={{ borderTop: '6px solid #f59e0b', margin: '0 0 20px 0', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                          <Clock size={48} style={{ color: '#f59e0b', margin: '12px auto 0 auto', animation: 'pulse-text 2s ease-in-out infinite' }} />
                          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>updated .... coming soon...</h3>
                          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, maxWidth: '360px', lineHeight: '1.5' }}>
                            This application form is currently being updated and will be available soon. Please check back later.
                          </p>
                        </div>
                        <button
                          disabled
                          className="premium-btn premium-btn-secondary"
                          style={{ marginBottom: '20px', cursor: 'not-allowed', opacity: 0.6 }}
                        >
                          Unavailable <ChevronRight size={18} />
                        </button>
                      </>
                    ) : showGuestVerification ? (
                      <div className="premium-card" style={{ borderTop: '6px solid var(--primary)', margin: '0 0 20px 0' }}>
                        <h4 style={{ fontSize: '1.1rem', marginBottom: '12px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          🔑 Identity Verification
                        </h4>

                        {guestVerifyError && (
                          <div style={{ color: 'var(--error)', fontSize: '0.8rem', fontWeight: 'bold', background: '#fee2e2', padding: '10px', borderRadius: '8px', marginBottom: '14px', border: '1px solid #fca5a5' }}>
                            ⚠️ {guestVerifyError}
                          </div>
                        )}

                        {lookupAadharStatus === null && (
                          <form onSubmit={handleVerifyGuestAadhar}>
                            <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '14px' }}>
                              Enter your 12-digit Aadhaar number to verify if you have an existing account profile.
                            </p>
                            <div className="premium-input-group">
                              <label className="premium-label">Aadhaar Card Number</label>
                              <input
                                type="text"
                                maxLength={12}
                                value={guestAadhar}
                                onChange={(e) => setGuestAadhar(e.target.value.replace(/\D/g, ''))}
                                placeholder="e.g. 512345678901"
                                className="premium-input"
                                style={{ padding: '10px', fontSize: '0.9rem' }}
                                required
                              />
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                              <button
                                type="button"
                                onClick={() => setShowGuestVerification(false)}
                                className="premium-btn premium-btn-secondary"
                                style={{ flex: 1 }}
                              >
                                Back
                              </button>
                              <button
                                type="submit"
                                className="premium-btn premium-btn-primary"
                                style={{ flex: 1.5 }}
                                disabled={verifyingAadhar}
                              >
                                {verifyingAadhar ? 'Verifying...' : 'Verify Aadhaar'}
                              </button>
                            </div>
                          </form>
                        )}

                        {lookupAadharStatus === 'existing_user' && (
                          <div>
                            <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '14px' }}>
                              A citizen profile already exists with this Aadhaar number for <strong>{matchedUserPrefills?.name || 'Citizen User'}</strong>.
                              <br /><br />
                              Please log in using your Phone number and first 4 digits of Aadhaar to view your pre-filled data.
                            </p>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                              <button
                                type="button"
                                onClick={() => setLookupAadharStatus(null)}
                                className="premium-btn premium-btn-secondary"
                                style={{ flex: 1 }}
                              >
                                Back
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowGuestVerification(false);
                                  onLoginTrigger(matchedUserPrefills?.phone, matchedUserPrefills?.aadhar_prefix);
                                }}
                                className="premium-btn premium-btn-primary"
                                style={{ flex: 1.5 }}
                              >
                                Login to Proceed
                              </button>
                            </div>
                          </div>
                        )}

                        {lookupAadharStatus === 'new_user' && (
                          <div>
                            <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '14px' }}>
                              No registered profile found. Enter your Email ID to receive a verification OTP. Once verified, you can fill and submit the form, and your account will be registered automatically.
                            </p>

                            <div className="premium-input-group" style={{ marginBottom: '14px' }}>
                              <label className="premium-label">Email ID</label>
                              <input
                                type="email"
                                value={guestEmail}
                                onChange={(e) => setGuestEmail(e.target.value)}
                                placeholder="name@example.com"
                                className="premium-input"
                                disabled={showOtpInput}
                                required
                              />
                            </div>

                            {!showOtpInput ? (
                              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                                <button
                                  type="button"
                                  onClick={() => setLookupAadharStatus(null)}
                                  className="premium-btn premium-btn-secondary"
                                  style={{ flex: 1 }}
                                >
                                  Back
                                </button>
                                <button
                                  type="button"
                                  onClick={handleSendGuestOtp}
                                  className="premium-btn premium-btn-primary"
                                  style={{ flex: 1.5 }}
                                  disabled={sendingOtp}
                                >
                                  {sendingOtp ? 'Sending OTP...' : 'Send OTP'}
                                </button>
                              </div>
                            ) : (
                              <form onSubmit={handleVerifyGuestOtp}>
                                <div className="premium-input-group">
                                  <label className="premium-label">Enter 6-digit OTP Code</label>
                                  <input
                                    type="text"
                                    maxLength={6}
                                    value={guestOtp}
                                    onChange={(e) => setGuestOtp(e.target.value.replace(/\D/g, ''))}
                                    placeholder="e.g. 123456"
                                    className="premium-input"
                                    style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '4px', padding: '10px' }}
                                    required
                                  />
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                                  <button
                                    type="button"
                                    onClick={() => setShowOtpInput(false)}
                                    className="premium-btn premium-btn-secondary"
                                    style={{ flex: 1 }}
                                  >
                                    Change Email
                                  </button>
                                  <button
                                    type="submit"
                                    className="premium-btn premium-btn-primary"
                                    style={{ flex: 1.5 }}
                                    disabled={verifyingOtp}
                                  >
                                    {verifyingOtp ? 'Verifying...' : 'Verify & Proceed'}
                                  </button>
                                </div>
                              </form>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="premium-card" style={{ borderTop: '6px solid var(--primary)', margin: '0 0 20px 0' }}>
                          <h4 style={{ fontSize: '1rem', marginBottom: '8px', color: '#1e293b' }}>Application Guide & Terms</h4>
                          {selectedForm.description && (
                            <p style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: '500', marginBottom: '12px', background: '#f1f5f9', padding: '10px', borderRadius: '8px', borderLeft: '3px solid var(--primary)' }}>
                              <strong>Service Description:</strong> {selectedForm.description}
                            </p>
                          )}
                          <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '16px' }}>
                            Please read the following instructions carefully before starting the application.
                          </p>

                          <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                            <h5 style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>Instructions List:</h5>
                            {selectedForm.instructions ? (
                              <ul style={{ paddingLeft: '20px', fontSize: '0.8rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '8px', margin: 0 }}>
                                {selectedForm.instructions.split('\n').filter(Boolean).map((item, idx) => (
                                  <li key={idx}>{item}</li>
                                ))}
                              </ul>
                            ) : (
                              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>No instructions configured by admin. Please fill the details in the next steps.</p>
                            )}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0fdf4', padding: '12px 16px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#065f46' }}>Service Fee:</span>
                            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#047857' }}>Rs. {selectedForm.fee || 0}</span>
                          </div>
                        </div>

                        <button
                          onClick={handleProceedToForm}
                          className="premium-btn premium-btn-primary"
                          style={{ marginBottom: '20px' }}
                        >
                          I Agree, Proceed <ChevronRight size={18} />
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* STEP 2: FILL OR VERIFY DATA */}
                {wizardStep === 2 && (
                  <form onSubmit={handleValidateForm} style={{ padding: '0 16px' }}>
                    {/* Non Logged-in Alert */}
                    {!currentUser && (
                      selectedForm.category && selectedForm.category.toLowerCase() === 'e sevai' ? (
                        <div className="premium-card" style={{ borderLeft: '4px solid #ef4444', backgroundColor: '#fef2f2', color: '#991b1b', margin: '0 0 16px 0', padding: '12px' }}>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 4px 0' }}>
                            <ShieldAlert size={16} /> E-Sevai CAN Registration Required
                          </h4>
                          <p style={{ fontSize: '0.75rem', margin: 0 }}>
                            Guest User: E-Sevai services require a Citizen Access Number (CAN) profile. <strong>We will automatically register your account and store your CAN Details</strong> on submission!
                            <br />
                            <span onClick={onLoginTrigger} style={{ textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold' }}>Click here to Login</span> if you already have a profile.
                          </p>
                        </div>
                      ) : (
                        <div className="premium-card" style={{ borderLeft: '4px solid #ef4444', backgroundColor: '#fef2f2', color: '#991b1b', margin: '0 0 16px 0', padding: '12px' }}>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 4px 0' }}>
                            <ShieldAlert size={16} /> Guest Application Notice
                          </h4>
                          <p style={{ fontSize: '0.75rem', margin: 0 }}>
                            You are currently filling this form as a Guest. <strong>We will automatically register your account on submission</strong> using your DOB and Phone, saving these values so they pre-fill next time!
                            <br />
                            <span onClick={onLoginTrigger} style={{ textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold' }}>Click here to Login</span> if you already have a profile.
                          </p>
                        </div>
                      )
                    )}

                    {currentUser && (
                      selectedForm.category && selectedForm.category.toLowerCase() === 'e sevai' ? (
                        !(currentUser.district || currentUser.religion || currentUser.state || currentUser.father_name) ? (
                          /* Case 1: First-time user / Incomplete CAN Details */
                          <div className="premium-card" style={{ borderLeft: '4px solid #f59e0b', backgroundColor: '#fffbeb', color: '#78350f', margin: '0 0 16px 0', padding: '12px' }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 4px 0' }}>
                              <AlertCircle size={16} /> First-time E-Sevai Citizen Registration (Case 1)
                            </h4>
                            <p style={{ fontSize: '0.75rem', margin: 0 }}>
                              Welcome, <strong>{currentUser.name}</strong>! We could not find any pre-existing CAN Details for your account. Please fill in the complete CAN citizen registration form below; <strong>these values will be securely stored as your default profile data</strong> for all future applications!
                            </p>
                          </div>
                        ) : (
                          /* Case 2: Existing User with stored CAN Details */
                          <div className="premium-card" style={{ borderLeft: '4px solid #10b981', backgroundColor: '#f0fdf4', color: '#065f46', margin: '0 0 16px 0', padding: '12px' }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 4px 0' }}>
                              <CheckCircle size={16} style={{ color: '#10b981' }} /> Stored CAN Profile Loaded (Case 2)
                            </h4>
                            <p style={{ fontSize: '0.75rem', margin: 0 }}>
                              Hello, <strong>{currentUser.name}</strong>! Your stored E-Sevai CAN Profile pre-data has been successfully loaded. If any details have changed, <strong>you can directly correct them below</strong> and we will synchronize them back to your stored profile instantly.
                            </p>
                          </div>
                        )
                      ) : (
                        <div className="premium-card" style={{ borderLeft: '4px solid #10b981', backgroundColor: '#f0fdf4', color: '#065f46', margin: '0 0 16px 0', padding: '10px 14px' }}>
                          <p style={{ fontSize: '0.75rem', fontWeight: '500', margin: 0 }}>
                            Logged In: <strong>{currentUser.name}</strong>. Stored profile values have been prefilled. <strong>Any corrections you make below will automatically update your stored profile!</strong>
                          </p>
                        </div>
                      )
                    )}

                    {duplicateSubmissionError && (
                      <div style={{
                        background: 'linear-gradient(135deg, #fef2f2, #fff1f2)',
                        border: '2px solid #fca5a5',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        animation: 'fadeIn 0.3s ease'
                      }}>
                        <ShieldAlert size={24} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '700', color: '#991b1b' }}>Duplicate Application Detected</p>
                          <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#b91c1c', lineHeight: '1.5' }}>{duplicateSubmissionError}</p>
                        </div>
                      </div>
                    )}

                    <div className="premium-card" style={{ borderTop: '6px solid var(--primary)', margin: '0 0 20px 0' }}>
                      <h4 style={{ fontSize: '0.95rem', marginBottom: '16px', color: '#1e293b' }}>Application Data Form</h4>

                      {/* Render checklist fields chosen by Admin */}
                      {(() => {
                        let fieldsConfig = safeJsonParse(selectedForm.required_fields, []);
                        const isCase2 = currentUser && !!(currentUser.district || currentUser.religion || currentUser.state || currentUser.father_name);

                        if (selectedForm.category && selectedForm.category.toLowerCase() === 'e sevai' && !isCase2) {
                          const canFields = [
                            'aadhar', 'phone', 'name', 'name_tamil', 'gender', 'marital_status', 'dob',
                            'father_name', 'mother_name', 'father_name_tamil', 'mother_name_tamil',
                            'religion', 'community', 'state', 'district', 'taluk', 'revenue_village',
                            'street_name', 'door_no', 'pincode', 'address'
                          ];
                          fieldsConfig = Array.from(new Set([...canFields, ...fieldsConfig]));
                        }

                        return fieldsConfig.map(fieldId => {
                          const fieldConfig = STANDARD_FIELDS[fieldId];
                          if (!fieldConfig) return null;
                          const isRequired = fieldConfig.required || (selectedForm.category && selectedForm.category.toLowerCase() === 'e sevai');

                          return (
                            <div key={fieldId} className="premium-input-group">
                              <label className="premium-label">
                                {fieldConfig.label} {isRequired && <span style={{ color: 'var(--error)' }}>*</span>}
                              </label>

                              {fieldConfig.type === 'select' ? (
                                <select
                                  value={formData[fieldId] || ''}
                                  onChange={(e) => handleFieldChange(fieldId, e.target.value)}
                                  className="premium-input"
                                  required={isRequired}
                                >
                                  <option value="">-- Select option --</option>
                                  {fieldConfig.options.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              ) : fieldConfig.type === 'textarea' ? (
                                <textarea
                                  value={formData[fieldId] || ''}
                                  onChange={(e) => handleFieldChange(fieldId, e.target.value)}
                                  placeholder={`Enter ${fieldConfig.label.toLowerCase()}`}
                                  rows={3}
                                  className="premium-input"
                                  required={isRequired}
                                />
                              ) : (
                                <div style={{ position: 'relative' }}>
                                  <input
                                    type={fieldConfig.type}
                                    value={formData[fieldId] || ''}
                                    onChange={(e) => handleFieldChange(fieldId, e.target.value)}
                                    className="premium-input"
                                    placeholder={`Enter ${fieldConfig.label.toLowerCase()}`}
                                    required={isRequired}
                                    readOnly={fieldId === 'aadhar' && currentUser && !!currentUser.aadhar}
                                    style={fieldId === 'aadhar' && currentUser && currentUser.aadhar ? {
                                      backgroundColor: '#f1f5f9',
                                      color: '#64748b',
                                      cursor: 'not-allowed',
                                      borderColor: '#e2e8f0'
                                    } : {}}
                                  />
                                  {fieldId === 'aadhar' && currentUser && currentUser.aadhar && (
                                    <span style={{
                                      position: 'absolute',
                                      right: '10px',
                                      top: '50%',
                                      transform: 'translateY(-50%)',
                                      fontSize: '0.65rem',
                                      color: '#94a3b8',
                                      fontWeight: '700',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '3px'
                                    }}>
                                      🔒 Permanent
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}

                      {/* Render custom input fields added by Admin */}
                      {safeJsonParse(selectedForm.fields, []).map(f => {
                        if (f.type === 'repeated') {
                          const { min, max } = parseLimit(f.limit);
                          const countValue = parseInt(formData[f.id]) || 0;

                          const optionsList = [];
                          for (let val = min; val <= max; val++) {
                            optionsList.push(val);
                          }

                          const loopIndices = [];
                          if (countValue >= min && countValue <= max) {
                            for (let i = min; i <= countValue; i++) {
                              loopIndices.push(i);
                            }
                          }

                          return (
                            <div key={f.id} style={{ padding: '16px', background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '12px', marginBottom: '16px' }}>
                              <div className="premium-input-group" style={{ marginBottom: '12px' }}>
                                <label className="premium-label" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                                  {f.label || 'Family Members Count'} ({min}-{max}) {f.required && <span style={{ color: 'var(--error)' }}>*</span>}
                                </label>
                                <select
                                  value={formData[f.id] || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    handleFieldChange(f.id, val);
                                  }}
                                  className="premium-input"
                                  required={f.required}
                                >
                                  <option value="">-- Select Count ({min}-{max}) --</option>
                                  {optionsList.map(num => (
                                    <option key={num} value={num}>{num}</option>
                                  ))}
                                </select>
                              </div>

                              {loopIndices.map(i => {
                                return (
                                  <div key={i} style={{ marginTop: '14px', padding: '12px', background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--primary)', marginBottom: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                                      #{i}
                                    </div>

                                    {(f.subFields || []).map(sub => {
                                      const subFieldKey = `${f.id}_member_${i}_${sub.id}`;
                                      return (
                                        <div key={sub.id} className="premium-input-group" style={{ marginBottom: '10px' }}>
                                          <label className="premium-label" style={{ fontSize: '0.75rem' }}>
                                            {sub.label} <span style={{ color: 'var(--error)' }}>*</span>
                                          </label>
                                          {sub.type === 'select' ? (
                                            <select
                                              value={formData[subFieldKey] || ''}
                                              onChange={(e) => handleFieldChange(subFieldKey, e.target.value)}
                                              className="premium-input"
                                              style={{ padding: '8px', fontSize: '0.85rem' }}
                                              required={true}
                                            >
                                              <option value="">-- Choose option --</option>
                                              {sub.options && sub.options.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                              ))}
                                            </select>
                                          ) : (
                                            <input
                                              type={sub.type}
                                              value={formData[subFieldKey] || ''}
                                              onChange={(e) => handleFieldChange(subFieldKey, e.target.value)}
                                              className="premium-input"
                                              style={{ padding: '8px', fontSize: '0.85rem' }}
                                              placeholder={`Enter ${sub.label.toLowerCase()}`}
                                              required={true}
                                            />
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }

                        return (
                          <div key={f.id} className="premium-input-group">
                            <label className="premium-label">{f.label} {f.required && <span style={{ color: 'var(--error)' }}>*</span>}</label>
                            {f.type === 'textarea' ? (
                              <textarea
                                value={formData[f.id] || ''}
                                onChange={(e) => handleFieldChange(f.id, e.target.value)}
                                rows={3}
                                className="premium-input"
                                placeholder="Enter details..."
                                required={f.required}
                              />
                            ) : f.type === 'select' ? (
                              <select
                                value={formData[f.id] || ''}
                                onChange={(e) => handleFieldChange(f.id, e.target.value)}
                                className="premium-input"
                                required={f.required}
                              >
                                <option value="">-- Choose option --</option>
                                {f.options && f.options.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : f.type === 'checkbox' ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                {f.options && f.options.map(opt => {
                                  const currentVals = Array.isArray(formData[f.id]) ? formData[f.id] : (formData[f.id] ? formData[f.id].split(', ') : []);
                                  const isChecked = currentVals.includes(opt);
                                  return (
                                    <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer', color: '#1e293b' }}>
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          const nextVals = e.target.checked
                                            ? [...currentVals, opt]
                                            : currentVals.filter(v => v !== opt);
                                          handleFieldChange(f.id, nextVals.join(', '));
                                        }}
                                      />
                                      <span>{opt}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            ) : f.type === 'radio' ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                {f.options && f.options.map(opt => (
                                  <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer', color: '#1e293b' }}>
                                    <input
                                      type="radio"
                                      name={`custom-radio-${f.id}`}
                                      checked={formData[f.id] === opt}
                                      onChange={() => handleFieldChange(f.id, opt)}
                                      required={f.required}
                                    />
                                    <span>{opt}</span>
                                  </label>
                                ))}
                              </div>
                            ) : (
                              <input
                                type={f.type}
                                value={formData[f.id] || ''}
                                onChange={(e) => handleFieldChange(f.id, e.target.value)}
                                className="premium-input"
                                placeholder="Type answer..."
                                required={f.required}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <button
                      type="submit"
                      className="premium-btn premium-btn-primary"
                      style={{ marginBottom: '20px' }}
                    >
                      Verify Details <ChevronRight size={18} />
                    </button>
                  </form>
                )}

                {/* STEP 3: PREVIEW */}
                {wizardStep === 3 && (
                  <div style={{ padding: '0 16px' }}>
                    <div className="premium-card" style={{ borderLeft: '4px solid var(--primary)', margin: '0 0 16px 0' }}>
                      <h4 style={{ fontSize: '0.95rem', marginBottom: '4px', color: '#1e293b' }}>Summary Preview</h4>
                      <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>Review all form values before locking application.</p>
                    </div>

                    <div className="premium-card" style={{ margin: '0 0 16px 0' }}>
                      <h4 style={{ fontSize: '0.85rem', color: 'var(--primary)', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px', marginBottom: '10px' }}>Application Information</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(() => {
                          const reqFieldsKeys = safeJsonParse(selectedForm.required_fields, []);
                          const customFields = safeJsonParse(selectedForm.fields, []);
                          const previewItems = [];

                          reqFieldsKeys.forEach(fieldId => {
                            previewItems.push({
                              key: fieldId,
                              label: STANDARD_FIELDS[fieldId]?.label || fieldId,
                              value: formData[fieldId] || '—'
                            });
                          });

                          customFields.forEach(f => {
                            if (f.type === 'repeated') {
                              const count = parseInt(formData[f.id]) || 0;
                              previewItems.push({
                                key: f.id,
                                label: f.label || 'Count',
                                value: count
                              });
                               const { min } = parseLimit(f.limit);
                               for (let i = min; i <= count; i++) {
                                (f.subFields || []).forEach(sub => {
                                  const subFieldKey = `${f.id}_member_${i}_${sub.id}`;
                                  const subLabel = `#${i} - ${sub.label}`;
                                  previewItems.push({
                                    key: subFieldKey,
                                    label: subLabel,
                                    value: formData[subFieldKey] || '—'
                                  });
                                });
                              }
                            } else {
                              previewItems.push({
                                key: f.id,
                                label: f.label,
                                value: formData[f.id] || '—'
                              });
                            }
                          });

                          return previewItems.map(item => (
                            <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '4px 0', borderBottom: '1px solid #f8fafc' }}>
                              <span className="text-muted">{item.label}:</span>
                              <span style={{ fontWeight: 700, maxWidth: '60%', textAlign: 'right', wordBreak: 'break-all' }}>{item.value}</span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    <div className="premium-card" style={{ margin: '0 0 20px 0' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', cursor: 'pointer', color: '#1e293b' }}>
                        <input
                          type="checkbox"
                          checked={agreeCheckbox}
                          onChange={(e) => setAgreeCheckbox(e.target.checked)}
                        />
                        <span>I hereby declare that all entries made in this form are correct and true to the best of my knowledge.</span>
                      </label>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
                      <button onClick={() => setWizardStep(2)} className="premium-btn premium-btn-secondary" style={{ flex: 1 }}>Previous</button>
                      <button
                        onClick={async () => {
                          setLoading(true);
                          try {
                            const reqFieldsKeys = safeJsonParse(selectedForm.required_fields, []);
                            const customFields = safeJsonParse(selectedForm.fields, []);
                            const responsesPack = {};

                            reqFieldsKeys.forEach(fieldId => {
                              responsesPack[STANDARD_FIELDS[fieldId]?.label || fieldId] = formData[fieldId] || '';
                            });

                            customFields.forEach(f => {
                              if (f.type === 'repeated') {
                                const count = parseInt(formData[f.id]) || 0;
                                responsesPack[f.label || 'Count'] = count;
                                const { min } = parseLimit(f.limit);
                                for (let i = min; i <= count; i++) {
                                  (f.subFields || []).forEach(sub => {
                                    const subFieldKey = `${f.id}_member_${i}_${sub.id}`;
                                    const subLabel = `#${i} - ${sub.label}`;
                                    responsesPack[subLabel] = formData[subFieldKey] || '';
                                  });
                                }
                              } else {
                                responsesPack[f.label] = formData[f.id] || '';
                              }
                            });
                            await submitFormResponse(
                              selectedForm.id,
                              formData.phone || currentUser?.phone || '',
                              formData.dob || currentUser?.dob || '',
                              formData.aadhar || currentUser?.aadhar || '',
                              responsesPack,
                              "draft"
                            );

                            console.log('[Upload Success] Draft saved successfully.');

                            // Wait briefly for Google Sheets propagation
                            await new Promise(resolve => setTimeout(resolve, 1500));

                            // Synchronize status list immediately in-memory
                            const phoneVal = formData.phone || currentUser?.phone || '';
                            const dobVal = '';
                            const aadharVal = formData.aadhar || currentUser?.aadhar || '';
                            if (phoneVal) {
                              try {
                                console.log('[Fetch] Re-fetching user applications after draft save...');
                                const freshApps = await getUserStatus(phoneVal, dobVal, aadharVal);
                                console.log('[Fetch] Refreshed applications data after draft:', freshApps?.length, 'records');
                                setUserApplications(freshApps);
                                setHasSearchedStatus(true);
                                lastStatusFetchRef.current = Date.now();
                              } catch (e) {
                                console.error("Error refreshing applications list on draft save:", e);
                              }
                            }

                            // Increment refresh key to force status useEffect re-fetch
                            setStatusRefreshKey(prev => prev + 1);

                            alert('Draft saved successfully! You can search/resume your draft using your phone/aadhar in the status tab.');
                          } catch (err) {
                            console.error(err);
                            alert('Failed to save draft. ' + err.message);
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className="premium-btn premium-btn-success"
                        style={{ flex: 1.5 }}
                      >
                        Save Draft
                      </button>
                      <button onClick={handleProceedToUploads} className="premium-btn premium-btn-primary" style={{ flex: 2 }}>Proceed to Docs <ChevronRight size={18} /></button>
                    </div>
                  </div>
                )}

                {/* STEP 4: UPLOAD DOCS WITH FILE SIZE / DUAL SELECTOR */}
                {wizardStep === 4 && (
                  <div style={{ padding: '0 16px' }}>
                    <div className="premium-card" style={{ borderTop: '6px solid var(--primary)', margin: '0 0 20px 0' }}>
                      <h4 style={{ fontSize: '0.95rem', marginBottom: '4px', color: '#1e293b' }}>Upload Required Documents</h4>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '16px' }}>Attach certificate uploads. Photo must be &lt; 7MB, other files &lt; 5MB.</p>

                      {/* Loading status bar */}
                      {uploadProgress && (
                        <div style={{ padding: '12px', background: '#f0fdf4', borderLeft: '4px solid #10b981', borderRadius: '4px', marginBottom: '16px', fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>
                          {uploadProgress}
                        </div>
                      )}

                      {/* Dynamic docs list (chosen by Admin) */}
                      {normalizeRequiredDocs(safeJsonParse(selectedForm.required_docs, [])).map(doc => {
                        return renderDocumentUploadZone(doc.id, false);
                      })}

                      {/* Custom Documents list */}
                      {normalizeCustomDocs(safeJsonParse(selectedForm.custom_docs, [])).map(doc => {
                        return renderDocumentUploadZone(doc.label, true);
                      })}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
                      <button onClick={() => setWizardStep(3)} className="premium-btn premium-btn-secondary" style={{ flex: 1 }}>Previous</button>
                      <button
                        onClick={handleFinalWizardSubmit}
                        disabled={loading}
                        className="premium-btn premium-btn-primary"
                        style={{ flex: 2 }}
                      >
                        {loading ? 'Submitting Application...' : 'Submit Application'}
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 5: RECEIPT */}
                {wizardStep === 5 && submissionResult && (
                  <div style={{ padding: '0 16px' }}>
                    <div className="premium-card text-center" style={{ margin: '0 0 16px 0', borderBottom: '4px solid var(--success)' }}>
                      <CheckCircle size={44} style={{ color: 'var(--success)', margin: '0 auto 10px auto' }} />
                      <h3 style={{ fontSize: '1.2rem', marginBottom: '4px', color: '#1e293b' }}>Application Submitted!</h3>
                      <p className="text-muted" style={{ fontSize: '0.8rem', margin: 0 }}>Your application has been stored securely in SUBI Online Service database.</p>
                    </div>

                    <div className="receipt-wrapper" id="receipt-downloadable-card" style={{ display: 'none' }}>
                      <div className="receipt-watermark" style={{ opacity: 0.05, fontSize: '2.5rem', color: '#10b981' }}>SUBI ONLINE SERVICE</div>
                      <div className="receipt-header" style={{ textAlign: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: '12px', marginBottom: '16px' }}>
                        <h4 style={{ fontSize: '1.25rem', color: '#047857', margin: '0 0 6px 0', fontWeight: '900', textTransform: 'uppercase' }}>{selectedForm.title}</h4>
                        <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '700', display: 'block', marginBottom: '4px' }}>SUBI ONLINE SERVICE</span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>Official SUBI Online Service E-Receipt</span>
                      </div>

                      <div className="receipt-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                        <span className="receipt-item-label" style={{ color: '#64748b' }}>Receipt ID:</span>
                        <span className="receipt-item-val" style={{ color: '#10b981', fontWeight: '700' }}>{submissionResult.id}</span>
                      </div>
                      <div className="receipt-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                        <span className="receipt-item-label" style={{ color: '#64748b' }}>Service Applied:</span>
                        <span className="receipt-item-val" style={{ fontWeight: '700' }}>{selectedForm.title}</span>
                      </div>
                      <div className="receipt-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                        <span className="receipt-item-label" style={{ color: '#64748b' }}>Aadhaar Number:</span>
                        <span className="receipt-item-val" style={{ fontWeight: '700' }}>{submissionResult.aadhar.replace(/(\d{4})/g, '$1 ').trim()}</span>
                      </div>
                      <div className="receipt-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                        <span className="receipt-item-label" style={{ color: '#64748b' }}>Phone Number:</span>
                        <span className="receipt-item-val" style={{ fontWeight: '700' }}>{submissionResult.phone}</span>
                      </div>
                      <div className="receipt-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                        <span className="receipt-item-label" style={{ color: '#64748b' }}>Submission Date:</span>
                        <span className="receipt-item-val" style={{ fontWeight: '700' }}>{new Date(submissionResult.submitted_at).toLocaleDateString()}</span>
                      </div>

                      <div style={{ borderTop: '1px dashed #cbd5e1', margin: '14px 0', paddingTop: '10px' }}>
                        <div className="receipt-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px', alignItems: 'center' }}>
                          <span className="receipt-item-label" style={{ color: '#64748b' }}>Service Fee (INR):</span>
                          <span className="receipt-item-val" style={{ fontSize: '1rem', fontWeight: '800', color: '#1e293b' }}>Rs. {selectedForm.fee || 0}</span>
                        </div>
                        <div className="receipt-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', alignItems: 'center' }}>
                          <span className="receipt-item-label" style={{ color: '#64748b' }}>Verification Status:</span>
                          <span className={`receipt-item-val badge ${submissionResult.payment_status === 'paid' ? 'badge-success' : submissionResult.payment_screenshot ? 'badge-warning' : 'badge-danger'}`} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>
                            {(submissionResult.payment_status || 'unpaid').toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Instant screenshot upload direct link in Receipt */}
                      {submissionResult.payment_status !== 'paid' && (() => {
                        const fee = Number(selectedForm.fee) || 0;
                        if (!fee || fee <= 0) return null;

                        const paymentNo = systemSettings.payment_number || '';
                        const formattedVpa = formatUpiVpa(paymentNo);
                        // Keep UPI URL simple: just pa (payment address) and am (amount)
                        const upiUrl = `upi://pay?pa=${formattedVpa}&am=${fee}`;
                        const qrCodeUrl = systemSettings.qr_code_url;

                        return (
                          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginTop: '16px' }}>
                            <h4 style={{ fontSize: '0.85rem', color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800' }}>
                              <CreditCard size={15} style={{ color: 'var(--primary)' }} /> UPI Payment Transfer
                            </h4>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '12px' }}>
                              {/* Amount Display */}
                              <div style={{ textAlign: 'center' }}>
                                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600', display: 'block', textTransform: 'uppercase' }}>Amount to Pay</span>
                                <span style={{ fontSize: '1.3rem', fontWeight: '900', color: '#10b981' }}>₹{fee}</span>
                              </div>

                              {/* QR Code */}
                              {qrCodeUrl && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '6px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                  <img
                                    src={getImageUrl(qrCodeUrl)}
                                    alt="UPI Payment QR Code"
                                    style={{ width: '120px', height: '120px', objectFit: 'contain' }}
                                  />
                                  <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 'bold' }}>Scan to Pay using GPAY / any UPI</span>
                                </div>
                              )}

                              {/* Intent pay buttons */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '240px', justifyContent: 'center', alignItems: 'center' }}>
                                <button
                                  onClick={() => handleUpiPay(fee, submissionResult.id, paymentNo, 'phonepe')}
                                  className="premium-btn"
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '10px 16px',
                                    width: '100%',
                                    fontSize: '0.8rem',
                                    fontWeight: '800',
                                    borderRadius: '8px',
                                    background: '#5f259f',
                                    color: '#ffffff',
                                    border: 'none',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(95, 37, 159, 0.25)',
                                    transition: 'all 0.25s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.03)';
                                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(95, 37, 159, 0.35)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(95, 37, 159, 0.25)';
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '2px' }}>
                                    <rect x="3" y="3" width="18" height="18" rx="5" ry="5" fill="#ffffff" stroke="#ffffff" />
                                    <path d="M9 17V8h4.5a2.5 2.5 0 1 1 0 5H9.5" stroke="#5f259f" strokeWidth="2.5" />
                                    <path d="M12 13v4" stroke="#5f259f" strokeWidth="2.5" />
                                  </svg>
                                  Pay with <span style={{ fontWeight: '800', letterSpacing: '-0.2px', marginLeft: '4px' }}>PhonePe</span>
                                </button>

                                <button
                                  onClick={() => handleUpiPay(fee, submissionResult.id, paymentNo, 'gpay')}
                                  className="premium-btn"
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '10px 16px',
                                    width: '100%',
                                    fontSize: '0.8rem',
                                    fontWeight: '800',
                                    borderRadius: '8px',
                                    background: '#000000',
                                    color: '#ffffff',
                                    border: 'none',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                    transition: 'all 0.25s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.03)';
                                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.25)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" style={{ marginRight: '2px' }}>
                                    <path fill="#4285F4" d="M24 12.27c0-.81-.07-1.59-.2-2.34H12v4.42h6.08c-.26 1.39-1.04 2.57-2.21 3.34v2.73h3.64c2.13-1.96 3.36-4.85 3.36-8.15z" />
                                    <path fill="#34A853" d="M12 24c3.04 0 5.58-1.01 7.44-2.73l-3.64-2.73c-1.01.68-2.3 1.08-3.8 1.08-2.92 0-5.39-1.97-6.27-4.62H2.04v2.81C3.88 21.05 7.55 24 12 24z" />
                                    <path fill="#FBBC05" d="M5.73 15.02c-.22-.68-.35-1.41-.35-2.18s.13-1.5.35-2.18V7.85H2.04c-.7 1.4-1.1 2.97-1.1 4.63s.4 3.23 1.1 4.63l3.69-2.87z" />
                                    <path fill="#EA4335" d="M12 4.8c1.64 0 3.11.56 4.27 1.66l3.2-3.2C17.58 1.44 15.04 0 12 0 7.55 0 3.88 2.95 2.04 7.02l3.69 2.87c.88-2.65 3.35-4.62 6.27-4.62z" />
                                  </svg>
                                  Pay with <span style={{ fontWeight: '800', letterSpacing: '-0.2px', marginLeft: '4px' }}>GPay</span>
                                </button>
                              </div>
                            </div>

                            <label className="premium-btn premium-btn-success" style={{ padding: '8px 12px', fontSize: '0.75rem', display: 'flex', gap: '8px', cursor: 'pointer', justifyContent: 'center' }}>
                              <UploadCloud size={16} />
                              {uploadingScreenshotId === submissionResult.id ? 'Uploading proof...' : 'Select Payment Proof (Image or PDF File)'}
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                style={{ display: 'none' }}
                                disabled={uploadingScreenshotId !== null}
                                onChange={(e) => handleScreenshotUpload(submissionResult.id, e.target.files[0])}
                              />
                            </label>
                          </div>
                        );
                      })()}

                      <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.7rem', color: '#94a3b8' }}>
                        Thank you for using SUBI Online Service! Save this receipt for your records.
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
                      <button
                        onClick={printReceipt}
                        className="premium-btn premium-btn-success"
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <Printer size={18} /> Download PDF Receipt
                      </button>
                      <button
                        onClick={() => sendSubmissionToWhatsApp(submissionResult, selectedForm, lastResponsesPack, lastDocReferencesPack)}
                        className="premium-btn premium-btn-success"
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#25D366', color: 'white', border: 'none', boxShadow: '0 4px 12px rgba(37, 211, 102, 0.2)' }}
                      >
                        <span style={{ fontSize: '1.1rem' }}>💬</span> Send to WhatsApp
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}



      </div>
      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(248, 250, 252, 0.8)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 99999
        }}>
          <style>{`
            @keyframes spin-clockwise {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes spin-counter-clockwise {
              0% { transform: rotate(360deg); }
              100% { transform: rotate(0deg); }
            }
            @keyframes core-pulse {
              0%, 100% { transform: scale(0.85); opacity: 0.5; box-shadow: 0 0 12px rgba(16, 185, 129, 0.4); }
              50% { transform: scale(1.1); opacity: 1; box-shadow: 0 0 28px rgba(16, 185, 129, 0.9); }
            }
            @keyframes float-card {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-6px); }
            }
            @keyframes pulse-text {
              0%, 100% { opacity: 0.6; transform: scale(0.98); }
              50% { opacity: 1; transform: scale(1); }
            }
          `}</style>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
            padding: '40px 48px',
            borderRadius: '24px',
            background: 'rgba(255, 255, 255, 0.9)',
            border: '1.5px solid rgba(255, 255, 255, 0.6)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.8)',
            animation: 'float-card 4s ease-in-out infinite',
            width: '260px',
            textAlign: 'center'
          }}>
            <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{
                position: 'absolute',
                width: '74px',
                height: '74px',
                border: '4px solid transparent',
                borderTopColor: '#10b981',
                borderBottomColor: '#10b981',
                borderRadius: '50%',
                animation: 'spin-clockwise 1.2s cubic-bezier(0.53, 0.21, 0.29, 0.83) infinite'
              }}></div>
              <div style={{
                position: 'absolute',
                width: '54px',
                height: '54px',
                border: '3px solid transparent',
                borderLeftColor: '#6366f1',
                borderRightColor: '#6366f1',
                borderRadius: '50%',
                animation: 'spin-counter-clockwise 1s linear infinite'
              }}></div>
              <div style={{
                width: '28px',
                height: '28px',
                backgroundColor: '#10b981',
                borderRadius: '50%',
                animation: 'core-pulse 2s ease-in-out infinite'
              }}></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{
                fontSize: '0.85rem',
                fontWeight: '900',
                color: '#10b981',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                animation: 'pulse-text 2s ease-in-out infinite'
              }}>
                {uploadProgress || 'Loading...'}
              </span>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>
                Please wait a moment
              </span>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 4: ACCESSORIES SHOP CATALOG & TEMPERED GLASS LOOKUP --- */}
      {activeTab === 'accessories' && (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* 1. SEARCH TEMPERED GLASS BOX LOOKUP REMOVED FROM TOP */}

          {/* 2. ACCESSORIES CATALOG */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 4px' }}>
              <h3 style={{ fontSize: '1.15rem', color: '#0f172a', fontWeight: '800' }}>🛍️ Accessories Catalog</h3>
              {products.length > 0 && (
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>Available All Items</span>
              )}
            </div>
            {/* Filters Panel */}
            <div className="premium-card" style={{ margin: 0, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {/* Category & Brand Filters */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Category</label>
                  <select
                    value={selectedAccessoryCategory}
                    onChange={(e) => setSelectedAccessoryCategory(e.target.value)}
                    className="premium-input"
                    style={{ padding: '8px 10px', fontSize: '0.8rem', margin: 0, background: '#f8fafc' }}
                  >
                    {['All', 'Phone Cover', 'Headphone', 'Speaker', 'Charger', 'Charger Cable', 'Other Accessories'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Brand</label>
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="premium-input"
                    style={{ padding: '8px 10px', fontSize: '0.8rem', margin: 0, background: '#f8fafc' }}
                  >
                    <option value="All">All Brands</option>
                    {['Samsung', 'Apple', 'Xiaomi (Redmi)', 'Vivo', 'OPPO', 'realme', 'OnePlus', 'POCO', 'Motorola', 'Nokia', 'Google Pixel', 'Huawei', 'Honor', 'Infinix', 'Tecno', 'iQOO', 'Sony', 'ASUS', 'Nothing', 'Lenovo', 'Micromax', 'Lava', 'Karbonn', 'Itel', 'HTC', 'Other'].map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Model & Keyword Filters */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Model Name</label>
                  <input
                    type="text"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    placeholder="e.g. S24, iPhone 15..."
                    className="premium-input"
                    style={{ padding: '8px 10px', fontSize: '0.8rem', margin: 0, background: '#f8fafc' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Search Keyword</label>
                  <input
                    type="text"
                    value={accessorySearchKeyword}
                    onChange={(e) => setAccessorySearchKeyword(e.target.value)}
                    placeholder="Search product name, brand..."
                    className="premium-input"
                    style={{ padding: '8px 10px', fontSize: '0.8rem', margin: 0, background: '#f8fafc' }}
                  />
                </div>
              </div>

            </div>

            {/* Products Listing Grid */}
            {accessoryProductsLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                Loading products...
              </div>
            ) : (() => {
              const filtered = products.filter(item => {
                if (selectedAccessoryCategory !== 'All') {
                  if (selectedAccessoryCategory === 'Other Accessories') {
                    const standardCats = ['Phone Cover', 'Headphone', 'Speaker', 'Charger', 'Charger Cable'];
                    if (standardCats.includes(item.Category)) return false;
                  } else {
                    if (item.Category !== selectedAccessoryCategory) return false;
                  }
                }

                if (selectedBrand !== 'All') {
                  if (item.Brand !== selectedBrand) return false;
                }

                if (selectedModel.trim() !== '') {
                  const mQuery = selectedModel.toLowerCase();
                  const modelName = (item.ModelName || '').toLowerCase();
                  if (!modelName.includes(mQuery)) return false;
                }

                if (accessorySearchKeyword.trim() !== '') {
                  const searchOptions = accessorySearchKeyword.split(',').map(s => s.trim().toLowerCase().replace(/\s+/g, '')).filter(Boolean);
                  if (searchOptions.length > 0) {
                    const name = (item.ProductName || '').toLowerCase().replace(/\s+/g, '');
                    const brand = (item.Brand || '').toLowerCase().replace(/\s+/g, '');
                    const customBrand = (item.CustomBrand || '').toLowerCase().replace(/\s+/g, '');
                    const model = (item.ModelName || '').toLowerCase().replace(/\s+/g, '');
                    const type = (item.Type || '').toLowerCase().replace(/\s+/g, '');
                    const category = (item.Category || '').toLowerCase().replace(/\s+/g, '');
                    const tag = (item.TagNumber || '').toLowerCase().replace(/\s+/g, '');

                    const match = searchOptions.some(q =>
                      name.includes(q) ||
                      brand.includes(q) ||
                      customBrand.includes(q) ||
                      model.includes(q) ||
                      type.includes(q) ||
                      category.includes(q) ||
                      tag.includes(q)
                    );

                    if (!match) return false;
                  }
                }

                return true;
              });

              if (filtered.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '40px 20px', background: '#ffffff', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold' }}>No accessories match your filters.</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>Try choosing another category or clearing search keywords.</p>
                  </div>
                );
              }

              const categoriesToDisplay = [
                { key: 'Phone Cover', label: 'Phone Covers', emoji: '📱' },
                { key: 'Headphone', label: 'Headphones', emoji: '🎧' },
                { key: 'Speaker', label: 'Speakers', emoji: '🔊' },
                { key: 'Charger', label: 'Chargers', emoji: '🔌' },
                { key: 'Charger Cable', label: 'Charger Cables', emoji: '⚡' },
                { key: 'Other Accessories', label: 'Other Accessories', emoji: '📦' }
              ];

              const standardCats = ['Phone Cover', 'Headphone', 'Speaker', 'Charger', 'Charger Cable'];

              const grouped = categoriesToDisplay.reduce((acc, cat) => {
                acc[cat.key] = filtered.filter(item => {
                  if (cat.key === 'Other Accessories') {
                    return !standardCats.includes(item.Category);
                  }
                  return item.Category === cat.key;
                });
                return acc;
              }, {});

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', paddingBottom: '20px' }}>
                  {categoriesToDisplay.map((cat, index) => {
                    const items = grouped[cat.key] || [];
                    if (items.length === 0) return null;

                    if (cat.key === 'Phone Cover') {
                      // Partition items into exactly 5 rows (mandatory)
                      const numRows = 5;
                      const partitionedRows = Array.from({ length: numRows }, () => []);
                      items.forEach((item, idx) => {
                        partitionedRows[idx % numRows].push(item);
                      });
                      const activeRows = partitionedRows.filter(row => row.length > 0);

                      return (
                        <div key={cat.key} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {/* Category Section Header */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            paddingBottom: '8px',
                            borderBottom: '2px solid #f1f5f9',
                            margin: '8px 4px 0 4px'
                          }}>
                            <span style={{ fontSize: '1.25rem' }}>{cat.emoji}</span>
                            <h4 style={{
                              fontSize: '0.95rem',
                              color: '#1e293b',
                              fontWeight: '800',
                              margin: 0,
                              flex: 1
                            }}>
                              {cat.label}
                            </h4>
                            <span style={{
                              fontSize: '0.7rem',
                              color: 'var(--primary)',
                              background: 'rgba(16,185,129,0.08)',
                              padding: '2px 8px',
                              borderRadius: '20px',
                              fontWeight: '700'
                            }}>
                              100+ items
                            </span>
                          </div>

                          {/* Sub-rows marquee waterfall tracks */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {activeRows.map((rowItems, subIndex) => {
                              // Cycle speeds 1 to 5, staggered with subIndex
                              const speedRowIndex = ((index + subIndex) % 5) + 1;

                              return (
                                <MarqueeRow
                                  key={subIndex}
                                  rowItems={rowItems}
                                  speedRowIndex={speedRowIndex}
                                  setSelectedProductDetails={setSelectedProductDetails}
                                  handleWhatsAppShare={handleWhatsAppShare}
                                  subIndex={subIndex}
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    } else {
                      // 2 Column grid layout
                      return (
                        <div key={cat.key} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {/* Category Section Header */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            paddingBottom: '8px',
                            borderBottom: '2px solid #f1f5f9',
                            margin: '8px 4px 0 4px'
                          }}>
                            <span style={{ fontSize: '1.25rem' }}>{cat.emoji}</span>
                            <h4 style={{
                              fontSize: '0.95rem',
                              color: '#1e293b',
                              fontWeight: '800',
                              margin: 0,
                              flex: 1
                            }}>
                              {cat.label}
                            </h4>
                            <span style={{
                              fontSize: '0.7rem',
                              color: 'var(--primary)',
                              background: 'rgba(16,185,129,0.08)',
                              padding: '2px 8px',
                              borderRadius: '20px',
                              fontWeight: '700'
                            }}>
                              100+ items
                            </span>
                          </div>

                          {/* Responsive Responsive Grid across Phones, Tablets, Laptops & Desktop Monitors */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                            gap: '12px',
                            padding: '4px'
                          }}>
                            {items.map((product) => {
                              const hasImage = product.ImageURL && product.ImageURL.trim() !== '';
                              const hasPrice = product.Price && product.Price.trim() !== '';

                              return (
                                <div
                                  key={product.ProductID}
                                  onClick={() => setSelectedProductDetails(product)}
                                  className="showcase-product-card"
                                  style={{
                                    width: '100%',
                                    minHeight: '210px',
                                    height: 'auto',
                                    padding: '10px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    boxSizing: 'border-box'
                                  }}
                                >
                                  {/* Image Wrapper */}
                                  <div className="showcase-image-wrapper" style={{ height: '90px', width: '100%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: '6px' }}>
                                    {hasImage ? (
                                      <img
                                        src={getImageUrl(product.ImageURL)}
                                        alt={product.ProductName || 'Accessory'}
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                      />
                                    ) : (
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '4px' }}>
                                        <span style={{ fontSize: '1.4rem' }}>📦</span>
                                        <span style={{ fontSize: '0.6rem', fontWeight: 'bold', textTransform: 'uppercase' }}>No Image</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Card Info */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 }}>
                                    <span style={{
                                      fontSize: '0.6rem',
                                      fontWeight: '800',
                                      color: 'var(--primary)',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.02em',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}>
                                      {product.Category}
                                    </span>

                                    <h5 style={{
                                      fontSize: '0.72rem',
                                      fontWeight: '700',
                                      color: '#1e293b',
                                      margin: 0,
                                      lineHeight: '1.25',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}>
                                      {product.ProductName || `${product.Brand} Case`}
                                    </h5>

                                    {(product.Brand || product.ModelName) && (
                                      <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {product.Brand === 'Other' ? product.CustomBrand : product.Brand} {product.ModelName}
                                      </span>
                                    )}

                                    {hasPrice && (
                                      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <strong style={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: '800' }}>
                                          ₹{product.Price}
                                        </strong>
                                        <span style={{ fontSize: '0.55rem', color: '#22c55e', background: '#f0fdf4', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>In Stock</span>
                                      </div>
                                    )}

                                    {/* Buy & Share Buttons */}
                                    <div
                                      style={{
                                        marginTop: hasPrice ? '6px' : 'auto',
                                        display: 'flex',
                                        gap: '4px',
                                        width: '100%'
                                      }}
                                    >
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedProductDetails(product);
                                        }}
                                        className="premium-btn premium-btn-primary"
                                        style={{
                                          flex: 1,
                                          padding: '4px 0',
                                          fontSize: '0.65rem',
                                          fontWeight: 'bold',
                                          margin: 0,
                                          borderRadius: '6px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          border: 'none',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Buy
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const title = product.ProductName || `${product.Brand} Case`;
                                          const text = `Category: ${product.Category}${product.Price ? `\nPrice: ₹${product.Price}` : ''}\nBuy high-quality mobile accessories at SUBI Online Service.`;
                                          handleWhatsAppShare(title, text, '/user?tab=accessories');
                                        }}
                                        className="premium-btn premium-btn-secondary"
                                        style={{
                                          flex: 1,
                                          padding: '4px 0',
                                          fontSize: '0.65rem',
                                          fontWeight: 'bold',
                                          margin: 0,
                                          borderRadius: '6px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          border: 'none',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Share
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              );
            })()}
          </div>

          {/* 3. SEARCH TEMPERED GLASS BOX LOOKUP */}
          <div className="premium-card" style={{ borderTop: '6px solid var(--primary)', margin: '20px 0 16px 0' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🔍 Search Tempered Glass Box
            </h3>
            <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '16px' }}>
              Enter your mobile model name to find and enquire about tempered glass.
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              const query = tgSearchQuery.trim().toLowerCase();
              if (!query) {
                alert('Please enter a model name.');
                return;
              }

              // Remove spaces for comparison
              const queryClean = query.replace(/\s+/g, '');

              // Search in temperedGlassList
              const results = [];
              for (const item of temperedGlassList) {
                const models = (item.ModelList || "").split(',').map(m => m.trim());
                for (const m of models) {
                  const mClean = m.toLowerCase().replace(/\s+/g, '');
                  if (mClean.includes(queryClean)) {
                    results.push({
                      modelName: m,
                      boxNumber: item.BoxNumber
                    });
                  }
                }
              }

              if (results.length > 0) {
                setTgSearchResult({ results, searched: tgSearchQuery });
              } else {
                setTgSearchResult({ notFound: true, searched: tgSearchQuery });
              }
            }} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={tgSearchQuery}
                onChange={(e) => setTgSearchQuery(e.target.value)}
                placeholder="e.g. Samsung A15, Vivo T3..."
                className="premium-input"
                style={{ flex: 1, margin: 0, padding: '10px 14px', fontSize: '0.85rem' }}
              />
              <button type="submit" className="premium-btn premium-btn-primary" style={{ width: 'auto', padding: '10px 20px', whiteSpace: 'nowrap' }}>
                Search Box
              </button>
            </form>

            {tgSearchResult && (
              <div style={{
                marginTop: '16px',
                padding: '16px',
                borderRadius: '12px',
                background: tgSearchResult.notFound ? '#fef2f2' : '#f0fdf4',
                border: tgSearchResult.notFound ? '1px solid #fca5a5' : '1px solid #bbf7d0',
                animation: 'slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
              }}>
                {tgSearchResult.notFound ? (
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 'bold', color: '#991b1b' }}>
                      Model Not Found: "{tgSearchResult.searched}"
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#7f1d1d' }}>
                      No tempered glass found for this model. Please ask the shop counter.
                    </p>
                  </div>
                ) : (
                  <div>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#166534', fontWeight: '600', textAlign: 'center' }}>
                      Matching models found. Click to enquire on WhatsApp:
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {tgSearchResult.results && tgSearchResult.results.map((res, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            const adminWhatsApp = systemSettings.admin_whatsapp_number || '9385497906';
                            const cleanedAdminWhatsApp = cleanPhone(adminWhatsApp);

                            let msg = `Hello SUBI Online Service,\n\nI would like to buy Tempered Glass.\n\n\`\`\`\n`;
                            msg += `${"Product".padEnd(12, ' ')}: Tempered Glass\n`;
                            msg += `${"Model".padEnd(12, ' ')}: ${res.modelName}\n`;
                            msg += `${"Box Number".padEnd(12, ' ')}: ${res.boxNumber}\n`;
                            msg += `\`\`\`\n\nPlease check availability and details.`;

                            const whatsappUrl = `https://api.whatsapp.com/send?phone=${encodeURIComponent(cleanedAdminWhatsApp)}&text=${encodeURIComponent(msg)}`;
                            window.open(whatsappUrl, '_blank');
                          }}
                          className="premium-btn"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            borderRadius: '10px',
                            background: '#ffffff',
                            border: '1px solid #bbf7d0',
                            cursor: 'pointer',
                            textAlign: 'left',
                            width: '100%'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.borderColor = 'var(--primary)';
                            e.currentTarget.style.background = '#f0fdf4';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.borderColor = '#bbf7d0';
                            e.currentTarget.style.background = '#ffffff';
                          }}
                        >
                          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#14532d' }}>
                            📱 {res.modelName}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 'bold' }}>
                            Order ➜
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Accessory Product Details Modal */}
      {selectedProductDetails && (() => {
        const product = selectedProductDetails;
        const hasImage = product.ImageURL && product.ImageURL.trim() !== '';
        const hasPrice = product.Price && product.Price.trim() !== '';

        const handleWhatsAppEnquiry = () => {
          const adminWhatsApp = systemSettings.admin_whatsapp_number || '9385497906';
          const cleanedAdminWhatsApp = cleanPhone(adminWhatsApp);

          let msg = `Hello SUBI Online Service,\n\nI would like to buy this product:\n\n\`\`\`\n`;
          msg += `${"Product Name".padEnd(14, ' ')}: ${product.ProductName || `${product.Brand} Cover Case`}\n`;
          msg += `${"Category".padEnd(14, ' ')}: ${product.Category}\n`;
          if (product.Brand) {
            msg += `${"Brand".padEnd(14, ' ')}: ${product.Brand === 'Other' ? product.CustomBrand : product.Brand}\n`;
          }
          if (product.ModelName) {
            msg += `${"Model".padEnd(14, ' ')}: ${product.ModelName}\n`;
          }
          if (product.TagNumber) {
            msg += `${"Tag Number".padEnd(14, ' ')}: ${product.TagNumber}\n`;
          }
          msg += `\`\`\`\n\nPlease provide availability and price details.`;

          const whatsappUrl = `https://api.whatsapp.com/send?phone=${encodeURIComponent(cleanedAdminWhatsApp)}&text=${encodeURIComponent(msg)}`;
          window.open(whatsappUrl, '_blank');
        };

        return (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 99999,
            padding: '16px'
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              width: '100%', maxWidth: '360px',
              display: 'flex', flexDirection: 'column', gap: '16px',
              position: 'relative',
              animation: 'slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
              <button
                onClick={() => setSelectedProductDetails(null)}
                style={{
                  position: 'absolute',
                  top: '16px', right: '16px',
                  background: '#f1f5f9', border: 'none',
                  color: '#64748b', cursor: 'pointer',
                  width: '28px', height: '28px',
                  borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center'
                }}
              >
                <X size={16} />
              </button>

              {hasImage ? (
                <div style={{
                  width: '100%', height: '200px',
                  borderRadius: '12px', overflow: 'hidden',
                  border: '1px solid #e2e8f0', background: '#f8fafc',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <img
                    src={getImageUrl(product.ImageURL)}
                    alt={product.ProductName}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
              ) : product.Category === 'Phone Cover' ? (
                <div style={{
                  width: '100%', height: '200px',
                  borderRadius: '12px', overflow: 'hidden',
                  border: '1px solid #e2e8f0', background: '#f8fafc',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <img
                    src={defaultCoverImg}
                    alt="Default Cover"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
              ) : (
                <div style={{
                  width: '100%', height: '140px',
                  borderRadius: '12px', border: '1px dashed #cbd5e1',
                  background: '#f8fafc', display: 'flex',
                  flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', color: '#94a3b8', gap: '6px'
                }}>
                  <span style={{ fontSize: '2rem' }}>📦</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Product Image Not Available</span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                    {product.Category}
                  </span>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', margin: 0, lineHeight: '1.3' }}>
                    {product.Category === 'Phone Cover'
                      ? `${product.Brand === 'Other' ? product.CustomBrand : product.Brand} ${product.ModelName}`
                      : (product.ProductName || `${product.Brand} Cover Case`)}
                  </h3>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                  <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                    <tbody>
                      {product.Brand && (
                        <tr>
                          <td style={{ color: '#64748b', padding: '4px 0', fontWeight: '600' }}>Brand:</td>
                          <td style={{ textAlign: 'right', fontWeight: '700', color: '#1e293b' }}>
                            {product.Brand === 'Other' ? product.CustomBrand : product.Brand}
                          </td>
                        </tr>
                      )}
                      {product.ModelName && (
                        <tr>
                          <td style={{ color: '#64748b', padding: '4px 0', fontWeight: '600' }}>Model Name:</td>
                          <td style={{ textAlign: 'right', fontWeight: '700', color: '#1e293b' }}>{product.ModelName}</td>
                        </tr>
                      )}
                      {product.Category === 'Phone Cover' && product.CoverType && (
                        <tr>
                          <td style={{ color: '#64748b', padding: '4px 0', fontWeight: '600' }}>Case Type:</td>
                          <td style={{ textAlign: 'right', fontWeight: '700', color: '#1e293b' }}>{product.CoverType}</td>
                        </tr>
                      )}
                      {product.Type && (
                        <tr>
                          <td style={{ color: '#64748b', padding: '4px 0', fontWeight: '600' }}>Type / Spec:</td>
                          <td style={{ textAlign: 'right', fontWeight: '700', color: '#1e293b' }}>{product.Type}</td>
                        </tr>
                      )}
                      {hasPrice && (
                        <tr>
                          <td style={{ color: '#64748b', padding: '4px 0', fontWeight: '600', fontSize: '0.85rem' }}>Price:</td>
                          <td style={{ textAlign: 'right', fontWeight: '900', color: '#0f172a', fontSize: '1rem' }}>₹{product.Price}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <button
                onClick={handleWhatsAppEnquiry}
                className="premium-btn premium-btn-primary"
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#25D366',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)',
                  marginTop: '8px'
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>💬</span> Buy on WhatsApp
              </button>
            </div>
          </div>
        );
      })()}

      {/* App Install Notification Modal */}
      {showInstallPrompt && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            width: '85%', maxWidth: '320px',
            display: 'flex', flexDirection: 'column', gap: '20px',
            animation: 'slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: '#f8fafc', padding: '8px', border: '1px solid #e2e8f0' }}>
                <img src="/whatsbro_logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b', fontWeight: '800' }}>Install SUBI Online Service</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', marginTop: '6px', lineHeight: '1.4' }}>Add our app to your home screen for quick and easy access!</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                onClick={() => {
                  setShowInstallPrompt(false);
                  sessionStorage.setItem('install_prompt_dismissed_at', Date.now().toString());
                }}
                style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Close
              </button>
              <button
                onClick={async () => {
                  setShowInstallPrompt(false);
                  sessionStorage.setItem('install_prompt_dismissed_at', Date.now().toString());
                  if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    console.log('[PWA] User response to install prompt:', outcome);
                    setDeferredPrompt(null);
                  } else {
                    alert("To install: Tap the browser menu (⋮) or Share icon and select 'Add to Home screen' or 'Install App'.");
                  }
                }}
                className="premium-btn-primary"
                style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', background: 'var(--primary)', color: 'white' }}
              >
                Install
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Announcement Popup Modal */}
      {showAnnouncementModal && announcements.length > 0 && (() => {
        const activeAnn = announcements[activeAnnIndex];
        if (!activeAnn) return null;

        const hasButton = activeAnn.button_name && activeAnn.button_name.trim() !== '' && activeAnn.button_url && activeAnn.button_url.trim() !== '';

        return (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              width: '100%', maxWidth: '380px',
              maxHeight: '85vh',
              display: 'flex', flexDirection: 'column', gap: '16px',
              animation: 'slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', flexShrink: 0 }}>
                <div style={{ textAlign: 'left' }}>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#1e293b', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Megaphone size={16} style={{ color: '#d97706', flexShrink: 0 }} />
                    {activeAnn.title || 'Announcement'}
                  </h4>
                  {announcements.length > 1 && (
                    <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 'bold', display: 'block', marginTop: '2px' }}>
                      Notice {activeAnnIndex + 1} of {announcements.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleCloseAnnouncement}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', padding: 0 }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Content wrapper */}
              <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, paddingRight: '4px' }}>
                {/* Banner Image Preview */}
                {activeAnn.img_url && (
                  <img 
                    src={getImageUrl(activeAnn.img_url)} 
                    alt="Advertisement Banner" 
                    style={{ 
                      maxWidth: '100%', 
                      height: 'auto', 
                      display: 'block', 
                      borderRadius: '10px', 
                      border: '1px solid #e2e8f0',
                      margin: '0 auto',
                      flexShrink: 0 
                    }} 
                  />
                )}

                {/* Body */}
                <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: '1.6', textAlign: 'left', whiteSpace: 'pre-wrap' }}>
                  {activeAnn.content || activeAnn.description || 'No details provided.'}
                </div>
              </div>

              {/* Action Buttons Block */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px', flexShrink: 0 }}>

                {/* Close and Admin Action Buttons side-by-side */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleCloseAnnouncement}
                    className="premium-btn premium-btn-secondary"
                    style={{ flex: 1, padding: '12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', background: '#f1f5f9', color: '#334155' }}
                  >
                    Close
                  </button>

                  {hasButton && (
                    <button
                      onClick={() => {
                        handleCloseAnnouncement();
                        if (activeAnn.button_url.startsWith('http://') || activeAnn.button_url.startsWith('https://')) {
                          window.open(activeAnn.button_url, '_blank');
                        } else {
                          window.location.href = activeAnn.button_url;
                        }
                      }}
                      className="premium-btn-primary"
                      style={{ flex: 1.5, padding: '12px', border: 'none', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      {activeAnn.button_name} <ExternalLink size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}

// --- HELPER: WORD-LIKE DOCUMENT CONTENT PARSER ---
const parseDetailsDoc = (text) => {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let inTable = false;
  let tableHeaders = [];
  let tableRows = [];
  let tableKey = 0;

  const renderTable = () => {
    if (tableHeaders.length === 0 && tableRows.length === 0) return null;
    const currentHeaders = [...tableHeaders];
    const currentRows = [...tableRows];
    const currentKey = `table-${tableKey++}`;

    // Reset table parser state
    tableHeaders = [];
    tableRows = [];
    inTable = false;

    return (
      <div key={currentKey} className="table-responsive" style={{ margin: '14px 0', overflowX: 'auto', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
          {currentHeaders.length > 0 && (
            <thead style={{ background: 'var(--primary)', color: 'white', fontWeight: 'bold' }}>
              <tr>
                {currentHeaders.map((h, i) => (
                  <th key={i} style={{ padding: '8px 12px', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>{h.trim()}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {currentRows.map((row, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                {row.map((cell, cIdx) => (
                  <td key={cIdx} style={{ padding: '8px 12px', color: '#475569' }}>{cell.trim()}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    const line = rawLine.trim();

    // Check if we are inside a table and this line is a table row (contains commas or is part of table)
    if (inTable) {
      if (line === '' || line.startsWith('H1:') || line.startsWith('H2:') || line.startsWith('H3:') || line.startsWith('---') || line.startsWith('line')) {
        // Close previous table
        elements.push(renderTable());
      } else {
        const parts = rawLine.split('$');
        if (tableHeaders.length === 0) {
          tableHeaders = parts;
        } else {
          tableRows.push(parts);
        }
        continue;
      }
    }

    if (line.startsWith('H1:')) {
      elements.push(
        <h4 key={idx} style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: '16px 0 8px 0', borderBottom: '2.5px solid var(--primary)', paddingBottom: '4px' }}>
          {line.substring(3).trim()}
        </h4>
      );
    } else if (line.startsWith('H2:')) {
      elements.push(
        <h5 key={idx} style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', margin: '14px 0 6px 0' }}>
          {line.substring(3).trim()}
        </h5>
      );
    } else if (line.startsWith('H3:')) {
      elements.push(
        <h6 key={idx} style={{ fontSize: '0.95rem', fontWeight: '600', color: '#334155', margin: '12px 0 4px 0' }}>
          {line.substring(3).trim()}
        </h6>
      );
    } else if (line === '---' || line.startsWith('line')) {
      elements.push(
        <hr key={idx} style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.1)', margin: '14px 0' }} />
      );
    } else if (line === 'table:') {
      inTable = true;
      tableHeaders = [];
      tableRows = [];
    } else if (line !== '') {
      // Normal paragraph text
      elements.push(
        <p key={idx} style={{ color: '#475569', fontSize: '0.85rem', lineHeight: '1.5', margin: '6px 0' }}>
          {rawLine}
        </p>
      );
    }
  }

  // If table is still open at the end of text
  if (inTable) {
    elements.push(renderTable());
  }

  return elements;
};