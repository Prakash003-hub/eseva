import React, { useState, useEffect, useMemo } from 'react';
import defaultCoverImg from '../assets/default-cover.jpg';
import { useSearchParams } from 'react-router-dom';
import { 
  getPosts, 
  createPost, 
  updatePost, 
  deletePost,
  getForms, 
  createForm, 
  updateForm, 
  deleteForm,
  duplicateForm,
  getUsersList,
  getSubmissionsByUser,
  adminUpdateSubmission,
  uploadOutputPdf,
  adminUploadDoc,
  adminDeleteDoc,
  deleteSubmission,
  deleteUserAndSubmissions,
  uploadPostImage,

  getFeedback,
  deleteFeedback,
  replyFeedback,
  getSettings,
  updateSettings,
  uploadFormImage,
  uploadFileToDrive,
  verifyAdminLogin,
  getRedirects,
  createRedirect,
  saveLocalOgImage,
  deleteRedirect,
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  uploadAnnouncementImage,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  getTemperedGlass,
  createTemperedGlass,
  updateTemperedGlass,
  deleteTemperedGlass,
  getJobs,
  createJob,
  updateJob,
  deleteJob,
  uploadJobImage
} from '../services/db';
import { normalizeOgTargetPath, parseOgConfig } from '../utils/og.js';
import { 
  Plus, 
  Trash2, 
  Edit, 
  FileText, 
  Settings, 
  Users, 
  Eye, 
  Save, 
  Check, 
  X, 
  ChevronRight, 
  Search, 
  ArrowUpDown,
  Upload,
  ExternalLink,
  ChevronDown,
  Home,
  ArrowLeft,
  Download,
  Copy,
  Link,

  MessageSquare,
  Star,
  Megaphone,
  Briefcase,
  Package
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

const getLimitLabel = (limitStr) => {
  if (!limitStr) return "1 to 8";
  const trimmed = String(limitStr).trim();
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-');
    return `${parts[0].trim()} to ${parts[1].trim()}`;
  }
  return `1 to ${trimmed}`;
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
    return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  return url;
};

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const highlightText = (text, search) => {
  if (!search || !search.trim()) return text;
  const cleanSearch = search.trim();
  const regex = new RegExp(`(${escapeRegExp(cleanSearch)})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) => 
    regex.test(part) ? (
      <mark key={i} style={{ backgroundColor: '#fef08a', color: '#854d0e', padding: '0 2px', borderRadius: '2px', fontWeight: 'bold' }}>
        {part}
      </mark>
    ) : part
  );
};

const resizeQRImage = (file) => {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      resolve(file);
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const resizedFile = new File([blob], file.name, {
            type: file.type || 'image/png',
            lastModified: Date.now(),
          });
          resolve(resizedFile);
        }, file.type || 'image/png', 0.85);
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

const cropToSquareImage = (file, size = 600) => {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      resolve(file);
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        
        // Find the smaller side for centered crop
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const croppedFile = new File([blob], file.name, {
            type: file.type || 'image/png',
            lastModified: Date.now(),
          });
          resolve(croppedFile);
        }, file.type || 'image/png', 0.85);
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

const handleExportToCsv = (submissionsList, customTitle = "submissions_export") => {
  if (!submissionsList || submissionsList.length === 0) {
    alert("No submissions available to export.");
    return;
  }
  
  // Compile all unique keys (headers) from submissions, including custom responses
  const headers = new Set(["id", "form_id", "user_id", "phone", "dob", "aadhar", "payment_status", "progress_percent", "submitted_at", "progress_desc"]);
  
  submissionsList.forEach(sub => {
    const resp = safeJsonParse(sub.responses, {});
    Object.keys(resp).forEach(k => headers.add(`Response_${k}`));
  });
  
  const headersArray = Array.from(headers);
  
  let csvContent = headersArray.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";
  
  submissionsList.forEach(sub => {
    const resp = safeJsonParse(sub.responses, {});
    const row = headersArray.map(h => {
      let val = "";
      if (h.startsWith("Response_")) {
        const key = h.replace("Response_", "");
        val = resp[key] || "";
      } else {
        val = sub[h] || "";
      }
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvContent += row.join(",") + "\n";
  });
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${customTitle}_${Date.now()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function AdminPortal() {
  // Tab states bound to URL search params
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'posts';
  const setActiveTab = (tabName) => {
    setSearchParams({ tab: tabName });
  };
  
  // Authentication State
  const [isAuth, setIsAuth] = useState(() => sessionStorage.getItem('whatsbro_admin_auth') === 'true');
  const [loginPin, setLoginPin] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Auto-scroll to top when tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);
  
  // Lists
  const [posts, setPosts] = useState([]);
  const [forms, setForms] = useState([]);
  const [users, setUsers] = useState([]);

  const [announcements, setAnnouncements] = useState([]);
  const [editingAnnId, setEditingAnnId] = useState(null);
  const [annForm, setAnnForm] = useState({
    title: '',
    description: '',
    content: '',
    img_url: '',
    button_name: '',
    button_url: '',
    enabled: 'true'
  });
  const [uploadingAnnImg, setUploadingAnnImg] = useState(false);

  // Jobs State & Handlers
  const [jobs, setJobs] = useState([]);
  const [editingJobId, setEditingJobId] = useState(null);
  const [jobForm, setJobForm] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    img_url: '',
    apply_url: '',
    button_name: '',
    details_doc: '',
    coming_soon: false
  });
  const [uploadingJobImg, setUploadingJobImg] = useState(false);

  const fetchAdminJobs = async () => {
    try {
      const data = await getJobs();
      setJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching jobs:', err);
    }
  };

  useEffect(() => {
    if (isAuth) {
      fetchAdminJobs();
    }
  }, [isAuth]);

  const handleJobImageUpload = async (file) => {
    if (!file) return;
    setUploadingJobImg(true);
    try {
      const res = await uploadJobImage(file);
      setJobForm(prev => ({ ...prev, img_url: res.img_url }));
      alert('Job banner image uploaded successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to upload job image.');
    } finally {
      setUploadingJobImg(false);
    }
  };

  const handleJobSubmit = async (e) => {
    e.preventDefault();
    if (!jobForm.title.trim()) {
      alert('Please enter a job title.');
      return;
    }
    try {
      if (editingJobId) {
        await updateJob(editingJobId, jobForm);
        alert('Job alert updated successfully!');
      } else {
        await createJob(jobForm);
        alert('Job alert created successfully!');
      }
      setEditingJobId(null);
      setJobForm({
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        img_url: '',
        apply_url: '',
        button_name: '',
        details_doc: '',
        coming_soon: false
      });
      fetchAdminJobs();
    } catch (err) {
      console.error(err);
      alert('Failed to save job alert.');
    }
  };

  const startEditJob = (job) => {
    setEditingJobId(job.id);
    setJobForm({
      title: job.title || '',
      description: job.description || '',
      start_date: job.start_date || '',
      end_date: job.end_date || '',
      img_url: job.img_url || '',
      apply_url: job.apply_url || '',
      button_name: job.button_name || '',
      details_doc: job.details_doc || '',
      coming_soon: job.coming_soon === true || String(job.coming_soon).toLowerCase() === 'true'
    });
  };

  const handleDeleteJob = async (id) => {
    if (!window.confirm('Are you sure you want to delete this job alert?')) return;
    try {
      await deleteJob(id);
      setJobs(jobs.filter(j => j.id !== id));
      alert('Job alert deleted.');
    } catch (err) {
      console.error(err);
      alert('Failed to delete job alert.');
    }
  };

  // Accessories & Tempered Glass States
  const [products, setProducts] = useState([]);
  const [temperedGlassList, setTemperedGlassList] = useState([]);
  const [adminProductsLoading, setAdminProductsLoading] = useState(false);
  const [tgListLoading, setTgListLoading] = useState(false);
  
  // Dynamic toggle in Product Management
  const [productSubTab, setProductSubTab] = useState('accessories'); // 'accessories' | 'tempered_glass'
  
  // Accessories state & forms
  const [accessorySearch, setAccessorySearch] = useState('');
  const [accessoryCategoryFilter, setAccessoryCategoryFilter] = useState('All');
  const [accessoryBrandFilter, setAccessoryBrandFilter] = useState('All');
  const [accessoryTagFilter, setAccessoryTagFilter] = useState('All');
  const [editingProductId, setEditingProductId] = useState(null);
  const [uploadingProductImg, setUploadingProductImg] = useState(false);
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  
  // Derive unique brands based on products and selected category
  const uniqueBrands = useMemo(() => {
    return Array.from(
      new Set(
        products
          .filter(p => {
            if (accessoryCategoryFilter === 'All') return true;
            const standardCats = ['Phone Cover', 'Headphone', 'Speaker', 'Charger', 'Charger Cable'];
            if (accessoryCategoryFilter === 'Other') {
              return !standardCats.includes(p.Category);
            }
            return p.Category === accessoryCategoryFilter;
          })
          .map(p => (p.Brand === 'Other' ? p.CustomBrand : p.Brand))
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [products, accessoryCategoryFilter]);

  // Derive unique tags based on products, selected category, and selected brand
  const uniqueTags = useMemo(() => {
    return Array.from(
      new Set(
        products
          .filter(p => {
            if (accessoryCategoryFilter !== 'All') {
              const standardCats = ['Phone Cover', 'Headphone', 'Speaker', 'Charger', 'Charger Cable'];
              if (accessoryCategoryFilter === 'Other') {
                if (standardCats.includes(p.Category)) return false;
              } else if (p.Category !== accessoryCategoryFilter) {
                return false;
              }
            }
            if (accessoryBrandFilter !== 'All') {
              const pBrand = p.Brand === 'Other' ? p.CustomBrand : p.Brand;
              if (pBrand !== accessoryBrandFilter && p.Brand !== accessoryBrandFilter) return false;
            }
            return true;
          })
          .map(p => p.TagNumber)
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [products, accessoryCategoryFilter, accessoryBrandFilter]);

  // Reset brand and tag filters if selected option is no longer valid
  useEffect(() => {
    if (accessoryBrandFilter !== 'All' && !uniqueBrands.includes(accessoryBrandFilter)) {
      setAccessoryBrandFilter('All');
    }
  }, [accessoryCategoryFilter, uniqueBrands, accessoryBrandFilter]);

  useEffect(() => {
    if (accessoryTagFilter !== 'All' && !uniqueTags.includes(accessoryTagFilter)) {
      setAccessoryTagFilter('All');
    }
  }, [accessoryCategoryFilter, accessoryBrandFilter, uniqueTags, accessoryTagFilter]);
  
  const [productForm, setProductForm] = useState({
    Category: 'Phone Cover',
    CoverType: 'Case',
    Brand: 'Samsung',
    CustomBrand: '',
    ModelName: '',
    ProductName: '',
    Type: '',
    Price: '',
    TagNumber: '',
    ImageURL: '',
    Count: '1'
  });
  
  // Tempered Glass state & forms
  const [tgSearch, setTgSearch] = useState('');
  const [expandedTgBoxes, setExpandedTgBoxes] = useState({});
  const [editingTgBoxNumber, setEditingTgBoxNumber] = useState(null);
  const [tgForm, setTgForm] = useState({
    BoxNumber: '',
    ModelList: ''
  });
  const [feedbackList, setFeedbackList] = useState([]);
  const [showFeedbackPanel, setShowFeedbackPanel] = useState(false);
  const [feedbackSearchTerm, setFeedbackSearchTerm] = useState('');
  const [replyTextState, setReplyTextState] = useState({});
  const [replySubmitting, setReplySubmitting] = useState({});
  
  // Settings
  const [settings, setSettings] = useState({ 
    admin_email: '', 
    admin_whatsapp_number: '',
    payment_number: '', 
    qr_code_url: '',
    notification_title: '',
    notification_desc: '',
    notification_content: '',
    notification_enabled: 'false'
  });

  // OG Redirects State
  const [redirects, setRedirects] = useState([]);
  const [loadingRedirects, setLoadingRedirects] = useState(false);
  const [ogTargetUrl, setOgTargetUrl] = useState('');
  const [ogTitle, setOgTitle] = useState('');
  const [ogDescription, setOgDescription] = useState('');
  const [ogImageFile, setOgImageFile] = useState(null);
  const [ogImagePreview, setOgImagePreview] = useState('');
  const [ogIsGenerating, setOgIsGenerating] = useState(false);
  const [ogIsGenerated, setOgIsGenerated] = useState(false);
  const [ogGeneratedUrl, setOgGeneratedUrl] = useState('');
  const [ogCopied, setOgCopied] = useState(false);
  
  // Selected user details (Aadhaar click)
  const [selectedUser, setSelectedUser] = useState(null);
  const [userSubmissions, setUserSubmissions] = useState([]);
  const [activeSubmission, setActiveSubmission] = useState(null);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [uploadingPdfId, setUploadingPdfId] = useState(null);
  const [uploadingDocType, setUploadingDocType] = useState(null); // 'receipt' | 'certificate' | 'other' | null
  const [uploadingPostImg, setUploadingPostImg] = useState(false);

  // Server maintenance configuration
  const [serverConfig, setServerConfig] = useState(() => {
    const saved = localStorage.getItem('whatsbro_server_config');
    return saved ? JSON.parse(saved) : { active: true, message: 'Server issues, so pls wait...' };
  });

  const handleServerToggle = (active) => {
    const nextConfig = { ...serverConfig, active };
    localStorage.setItem('whatsbro_server_config', JSON.stringify(nextConfig));
    setServerConfig(nextConfig);
  };

  const handleServerMessageChange = (msg) => {
    const nextConfig = { ...serverConfig, message: msg };
    localStorage.setItem('whatsbro_server_config', JSON.stringify(nextConfig));
    setServerConfig(nextConfig);
  };

  // Filters & search
  const [userSearchTerm, setUserSearchTerm] = useState('');
  
  // Post Editor states
  const [editingPostId, setEditingPostId] = useState(null);
  const [postForm, setPostForm] = useState({ title: '', description: '', img_url: '', apply_url: '', coming_soon: false });
  

  
  // Form Builder states
  const [editingFormId, setEditingFormId] = useState(null);
  const [formBuilder, setFormBuilder] = useState({
    title: '',
    description: '',
    category: 'E sevai',
    fee: 0,
    instructions: '',
    required_fields: [], // List of standard field IDs
    required_docs: [],   // List of default doc IDs ('photo', 'aadhar', etc)
    custom_docs: [],     // List of custom doc upload labels
    fields: [],           // Any extra custom inputs
    img_url: '',          // Form image
    coming_soon: false
  });
  const [uploadingFormImg, setUploadingFormImg] = useState(false);
  
  // Submission Editor states
  const [editingResponses, setEditingResponses] = useState({});
  const [isEditingResponsesMode, setIsEditingResponsesMode] = useState(false);
  const [statusForm, setStatusForm] = useState({
    payment_status: 'unpaid',
    progress_percent: 0,
    progress_desc: '',
    info_request_label: '',
    info_request_type: 'text',
    other_doc_name: '',
    pay_allowed: 'false'
  });

  // 1. Initial Load of DB Data - ONLY IF AUTHENTICATED
  useEffect(() => {
    if (!isAuth) return;
    const loadAllData = async () => {
      try {
        const [postsData, formsData, usersData, feedbackData, settingsData, announcementsData, productsData, tgData] = await Promise.all([
          getPosts(), getForms(), getUsersList(), getFeedback(), getSettings(), getAnnouncements(), getProducts(), getTemperedGlass()
        ]);
        setPosts(postsData);
        setForms(formsData);
        setUsers(usersData);
        setFeedbackList(feedbackData);
        if (settingsData) setSettings(settingsData);
        if (announcementsData) setAnnouncements(announcementsData);
        setProducts(productsData || []);
        setTemperedGlassList(tgData || []);
      } catch (err) {
        console.error("Initial data load error:", err);
      }
    };
    loadAllData();
  }, [isAuth]);

  // 1b. Lazy Load OG Redirects
  const handleRefreshRedirects = async () => {
    setLoadingRedirects(true);
    try {
      const data = await getRedirects();
      setRedirects(data || []);
    } catch (err) {
      console.error("Failed to load redirects:", err);
    } finally {
      setLoadingRedirects(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'og' && isAuth) {
      handleRefreshRedirects();
    }
  }, [activeTab, isAuth]);

  const slugify = (text) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const [ogAspect, setOgAspect] = useState('landscape');
  const [ogIsProcessingImg, setOgIsProcessingImg] = useState(false);
  const [ogCustomPath, setOgCustomPath] = useState('/form/form-slzjghgr');
  const [ogSavedList, setOgSavedList] = useState({});

  const fetchLocalOgList = async () => {
    try {
      const res = await fetch(`/data/og.json?t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        const parsed = parseOgConfig(json);
        const nextList = {};
        parsed.routes.forEach((record) => {
          nextList[record.route_key || record.slug] = {
            id: record.id || record.slug,
            route_type: record.route_type,
            slug: record.slug,
            target_path: record.target_path,
            route_key: record.route_key || record.slug,
            local_asset_path: record.local_asset_path || record.asset_path || '',
            public_page_url: record.public_page_url || record.public_url || '',
            image: record.image || '',
            title: record.title || '',
            description: record.description || '',
            created_at: record.created_at || '',
            updated_at: record.updated_at || ''
          };
        });
        setOgSavedList(nextList);
      }
    } catch (e) {
      console.warn('Failed to load local og.json:', e);
    }
  };

  useEffect(() => {
    fetchLocalOgList();
  }, []);

  const extractKeyFromTargetUrl = (urlStr) => {
    if (!urlStr) return '';
    const cleanStr = urlStr.trim();
    
    try {
      const parsed = new URL(cleanStr.startsWith('http') ? cleanStr : `https://${cleanStr}`);
      const params = parsed.searchParams;
      const paramId = params.get('formId') || params.get('jobId') || params.get('postId') || params.get('productId') || params.get('id');
      if (paramId) return paramId.trim().toLowerCase();

      if (cleanStr.includes(':')) {
        const parts = cleanStr.split(':');
        const paramSuffix = parts[parts.length - 1].trim();
        if (paramSuffix) return paramSuffix.toLowerCase().replace(/[^a-z0-9-]/g, '');
      }

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

  const handleOgTargetUrlChange = (val) => {
    setOgTargetUrl(val);
    setOgIsGenerated(false);

    const key = extractKeyFromTargetUrl(val);
    if (key && !ogTitle) {
      const formattedTitle = key
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
      setOgTitle(formattedTitle);
    }
  };

  const handleOgTitleChange = (e) => {
    setOgTitle(e.target.value);
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

  const handleOgImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setOgIsProcessingImg(true);
      try {
        const processed = await resizeOgImage(file, ogAspect);
        setOgImageFile(processed.file);
        setOgImagePreview(processed.preview);
        setOgIsGenerated(false);
      } catch (err) {
        console.error('Image resize error:', err);
      } finally {
        setOgIsProcessingImg(false);
      }
    }
  };

  const handleOgGenerate = async (e) => {
    e.preventDefault();
    if (!ogTargetUrl) {
      alert("Please paste a Target Link.");
      return;
    }
    if (!ogImageFile) {
      alert("Please upload an OG Image.");
      return;
    }

    let finalTarget = ogTargetUrl.trim();
    if (!/^https?:\/\//i.test(finalTarget)) {
      finalTarget = 'https://' + finalTarget;
      setOgTargetUrl(finalTarget);
    }

    const key = extractKeyFromTargetUrl(finalTarget);
    const finalTitle = ogTitle.trim() || 'Subi e-sevai Service';
    const finalDesc = ogDescription.trim() || 'Click to view details on Subi e-sevai portal.';

    setOgIsGenerating(true);
    try {
      // Save strictly to local project files (public/uploads/ & public/data/og.json)
      const res = await saveLocalOgImage({
        key,
        targetPath: finalTarget,
        targetUrl: finalTarget,
        title: finalTitle,
        description: finalDesc,
        imageFile: ogImageFile,
        aspect: ogAspect
      });

      if (!res || !res.success) {
        throw new Error(res?.error || "Make sure you are running 'npm run dev' locally to save project files.");
      }

      setOgGeneratedUrl(finalTarget);
      setOgIsGenerated(true);
      
      alert("OG Image auto-cropped, resized & saved locally to public/data/og.json & public/uploads/!");
    } catch (err) {
      console.error(err);
      alert("Failed to save OG Image locally: " + (err.message || err));
    } finally {
      setOgIsGenerating(false);
    }
  };

  const handleOgCopyLink = (url) => {
    navigator.clipboard.writeText(url);
    alert("Copied short link to clipboard: " + url);
  };

  const handleDeleteRedirect = async (id) => {
    if (!window.confirm(`Are you sure you want to delete redirect link '${id}'?`)) return;
    try {
      await deleteRedirect(id);
      alert('Redirect deleted successfully!');
      handleRefreshRedirects();
    } catch (err) {
      console.error(err);
      alert('Failed to delete redirect.');
    }
  };

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

  const handleAdminLogout = () => {
    sessionStorage.removeItem('whatsbro_admin_auth');
    setIsAuth(false);
    setLoginPin('');
  };

  const handleRefreshFeedback = async () => {
    try {
      const feedbackData = await getFeedback();
      setFeedbackList(feedbackData);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteFeedback = async (id) => {
    if (!window.confirm('Are you sure you want to delete this feedback/message?')) return;
    try {
      setLoading(true);
      await deleteFeedback(id);
      alert('Feedback deleted successfully.');
      handleRefreshFeedback();
    } catch (e) {
      console.error(e);
      alert('Failed to delete feedback.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendFeedbackResponse = async (id) => {
    const text = replyTextState[id];
    if (!text || !text.trim()) {
      alert('Please enter a response.');
      return;
    }
    
    setReplySubmitting(prev => ({ ...prev, [id]: true }));
    try {
      const updatedItem = await replyFeedback(id, text.trim());
      alert('Response sent successfully.');
      setReplyTextState(prev => ({ ...prev, [id]: '' }));
      setFeedbackList(prev => prev.map(f => f.id === id ? { ...f, admin_response: updatedItem.admin_response, response_at: updatedItem.response_at } : f));
    } catch (e) {
      console.error(e);
      alert('Failed to send response: ' + (e.message || e));
    } finally {
      setReplySubmitting(prev => ({ ...prev, [id]: false }));
    }
  };

  const filteredFeedback = feedbackList.filter(f =>
    (f.user_name && f.user_name.toLowerCase().includes(feedbackSearchTerm.toLowerCase())) ||
    (f.user_phone && f.user_phone.includes(feedbackSearchTerm)) ||
    (f.message && f.message.toLowerCase().includes(feedbackSearchTerm.toLowerCase()))
  );

  const handleRefreshUsers = async () => {
    try {
      const usersData = await getUsersList();
      setUsers(usersData);
      if (selectedUser) {
        const latestUser = usersData.find(u => u.aadhar === selectedUser.aadhar);
        if (latestUser) setSelectedUser(latestUser);
        const subsData = await getSubmissionsByUser(selectedUser.aadhar);
        setUserSubmissions(subsData);
        if (activeSubmission) {
          const updatedActive = subsData.find(s => s.id === activeSubmission.id);
          setActiveSubmission(updatedActive || null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePostImageUpload = async (file) => {
    if (!file) return;
    setUploadingPostImg(true);
    try {
      const croppedFile = await cropToSquareImage(file, 600);
      const res = await uploadPostImage(croppedFile);
      setPostForm(prev => ({ ...prev, img_url: res.img_url }));
      alert('Post image uploaded successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingPostImg(false);
    }
  };

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

  const moveItem = async (type, list, index, direction) => {
    // 1. Sort the list by order_index ascending, fallback to id ascending
    const sorted = sortItems(list);

    // 2. Self-healing: if items have duplicates or undefined/0 order_index, sequentially re-index all of them
    const needsInitialization = sorted.some((x, i) => {
      if (x.order_index === undefined || x.order_index === null || Number(x.order_index) === 0) return true;
      return sorted.findIndex(y => Number(y.order_index) === Number(x.order_index)) !== i;
    });

    if (needsInitialization) {
      for (let i = 0; i < sorted.length; i++) {
        sorted[i].order_index = i;
        try {
        if (type === 'post') await updatePost(sorted[i].id, { order_index: i });
          else if (type === 'form') await updateForm(sorted[i].id, { order_index: i });
        } catch (err) {
          console.error(`Failed to initialize order_index for ${type} ${sorted[i].id}`, err);
        }
      }
    }

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    // 3. Swap the order_index
    const temp = sorted[index].order_index;
    sorted[index].order_index = sorted[targetIndex].order_index;
    sorted[targetIndex].order_index = temp;

    try {
      if (type === 'post') {
        await updatePost(sorted[index].id, { order_index: sorted[index].order_index });
        await updatePost(sorted[targetIndex].id, { order_index: sorted[targetIndex].order_index });
        const res = await getPosts();
        setPosts(res);
      } else if (type === 'form') {
        await updateForm(sorted[index].id, { order_index: sorted[index].order_index });
        await updateForm(sorted[targetIndex].id, { order_index: sorted[targetIndex].order_index });
        const res = await getForms();
        setForms(res);
      }
    } catch (e) {
      console.error("Failed to reorder", e);
    }
  };

  // --- ACCESSORIES PRODUCTS CRUD ---
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProductId) {
        await updateProduct(editingProductId, productForm);
        alert('Product updated successfully!');
      } else {
        await createProduct(productForm);
        alert('New product added successfully!');
      }
      setProductForm({
        Category: 'Phone Cover',
        CoverType: 'Case',
        Brand: 'Samsung',
        CustomBrand: '',
        ModelName: '',
        ProductName: '',
        Type: '',
        Price: '',
        TagNumber: '',
        ImageURL: '',
        Count: '1'
      });
      setEditingProductId(null);
      handleRefreshProducts();
    } catch (err) {
      console.error(err);
      alert('Failed to save product.');
    }
  };

  const startEditProduct = (product) => {
    setEditingProductId(product.ProductID);
    setProductForm({
      Category: product.Category || 'Phone Cover',
      CoverType: product.CoverType || 'Case',
      Brand: product.Brand || 'Samsung',
      CustomBrand: product.CustomBrand || '',
      ModelName: product.ModelName || '',
      ProductName: product.ProductName || '',
      Type: product.Type || '',
      Price: product.Price || '',
      TagNumber: product.TagNumber || '',
      ImageURL: product.ImageURL || '',
      Count: product.Count || '0'
    });
    document.getElementById('product-editor-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleUpdateProductCount = async (product, change) => {
    const currentCount = Number(product.Count || 0);
    const newCount = Math.max(0, currentCount + change);
    if (newCount === currentCount) return;
    
    try {
      // Optimistic UI update
      setProducts(prev => prev.map(p => p.ProductID === product.ProductID ? { ...p, Count: String(newCount) } : p));
      
      // Send backend request
      await updateProduct(product.ProductID, { Count: String(newCount) });
    } catch (err) {
      console.error(err);
      alert('Failed to update product stock count.');
      // Revert state
      setProducts(prev => prev.map(p => p.ProductID === product.ProductID ? { ...p, Count: String(currentCount) } : p));
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteProduct(id);
      alert('Product deleted successfully.');
      if (editingProductId === id) {
        setEditingProductId(null);
        setProductForm({
          Category: 'Phone Cover',
          CoverType: 'Case',
          Brand: 'Samsung',
          CustomBrand: '',
          ModelName: '',
          ProductName: '',
          Type: '',
          Price: '',
          TagNumber: '',
          ImageURL: '',
          Count: '1'
        });
      }
      handleRefreshProducts();
    } catch (err) {
      console.error(err);
      alert('Failed to delete product.');
    }
  };

  const handleProductImageUpload = async (file) => {
    if (!file) return;
    setUploadingProductImg(true);
    try {
      const res = await uploadProductImage(file);
      if (res && res.img_url) {
        setProductForm(prev => ({ ...prev, ImageURL: res.img_url }));
        alert('Product image uploaded to Google Drive successfully!');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to upload product image to Google Drive.');
    } finally {
      setUploadingProductImg(false);
    }
  };

  const handleRefreshProducts = async () => {
    setAdminProductsLoading(true);
    try {
      const data = await getProducts();
      setProducts(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setAdminProductsLoading(false);
    }
  };

  // --- TEMPERED GLASS CRUD ---
  const handleTgSubmit = async (e) => {
    e.preventDefault();
    const box = tgForm.BoxNumber.trim();
    if (!box) {
      alert('Box Number is required.', 'warning');
      return;
    }
    try {
      if (editingTgBoxNumber) {
        await updateTemperedGlass(editingTgBoxNumber, tgForm);
        alert('Tempered Glass entry updated!');
      } else {
        await createTemperedGlass(tgForm);
        alert('New Tempered Glass entry created!');
      }
      setTgForm({ BoxNumber: '', ModelList: '' });
      setEditingTgBoxNumber(null);
      handleRefreshTemperedGlass();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to save Tempered Glass.');
    }
  };

  const startEditTg = (item) => {
    setEditingTgBoxNumber(item.BoxNumber);
    setTgForm({
      BoxNumber: item.BoxNumber,
      ModelList: item.ModelList || ''
    });
    document.getElementById('tg-editor-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteTg = async (boxNumber) => {
    if (!window.confirm(`Are you sure you want to delete box ${boxNumber}?`)) return;
    try {
      await deleteTemperedGlass(boxNumber);
      alert('Tempered Glass entry deleted.');
      if (editingTgBoxNumber === boxNumber) {
        setEditingTgBoxNumber(null);
        setTgForm({ BoxNumber: '', ModelList: '' });
      }
      handleRefreshTemperedGlass();
    } catch (err) {
      console.error(err);
      alert('Failed to delete Tempered Glass.');
    }
  };

  const handleRefreshTemperedGlass = async () => {
    setTgListLoading(true);
    try {
      const data = await getTemperedGlass();
      setTemperedGlassList(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setTgListLoading(false);
    }
  };

  // --- ANNOUNCEMENTS / ADVERTISEMENTS OPERATIONS ---
  const handleAnnImageUpload = async (file) => {
    if (!file) return;
    setUploadingAnnImg(true);
    try {
      const croppedFile = await cropToSquareImage(file, 600);
      const res = await uploadAnnouncementImage(croppedFile);
      setAnnForm(prev => ({ ...prev, img_url: res.img_url }));
      alert('Advertisement banner image uploaded successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingAnnImg(false);
    }
  };

  const handleAnnSubmit = async (e) => {
    e.preventDefault();
    if (!annForm.title.trim()) {
      alert('Please enter an advertisement title / name.');
      return;
    }
    try {
      if (editingAnnId) {
        await updateAnnouncement(editingAnnId, annForm);
        alert('Advertisement updated successfully!');
      } else {
        await createAnnouncement(annForm);
        alert('New advertisement created successfully!');
      }
      setAnnForm({
        title: '',
        description: '',
        content: '',
        img_url: '',
        button_name: '',
        button_url: '',
        enabled: 'true'
      });
      setEditingAnnId(null);
      const annData = await getAnnouncements();
      setAnnouncements(annData || []);
    } catch (err) {
      console.error(err);
      alert('Failed to save advertisement entry.');
    }
  };

  const startEditAnn = (ann) => {
    setEditingAnnId(ann.id);
    setAnnForm({
      title: ann.title || '',
      description: ann.description || '',
      content: ann.content || '',
      img_url: ann.img_url || '',
      button_name: ann.button_name || '',
      button_url: ann.button_url || '',
      enabled: ann.enabled !== undefined ? String(ann.enabled) : 'true'
    });
    document.getElementById('ann-editor-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteAnn = async (id) => {
    if (!window.confirm('Are you sure you want to delete this advertisement entry?')) return;
    try {
      await deleteAnnouncement(id);
      setAnnouncements(announcements.filter(a => a.id !== id));
      if (editingAnnId === id) {
        setEditingAnnId(null);
        setAnnForm({
          title: '',
          description: '',
          content: '',
          img_url: '',
          button_name: '',
          button_url: '',
          enabled: 'true'
        });
      }
      alert('Advertisement deleted.');
    } catch (err) {
      console.error(err);
      alert('Failed to delete advertisement.');
    }
  };

  const handleToggleAnnStatus = async (ann) => {
    const nextStatus = String(ann.enabled).toLowerCase() === 'true' ? 'false' : 'true';
    try {
      await updateAnnouncement(ann.id, { enabled: nextStatus });
      setAnnouncements(prev => prev.map(a => a.id === ann.id ? { ...a, enabled: nextStatus } : a));
    } catch (err) {
      console.error(err);
      alert('Failed to update status.');
    }
  };

  // --- POSTS OPERATIONS ---
  const handlePostSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPostId) {
        await updatePost(editingPostId, postForm);
        alert('Post updated successfully!');
      } else {
        await createPost(postForm);
        alert('New post added successfully!');
      }
      setPostForm({ title: '', description: '', img_url: '', apply_url: '', coming_soon: false });
      setEditingPostId(null);
      const postsData = await getPosts();
      setPosts(postsData);
    } catch (err) {
      console.error(err);
      alert('Failed to save post.');
    }
  };

  const startEditPost = (post) => {
    setEditingPostId(post.id);
    setPostForm({
      title: post.title,
      description: post.description || '',
      img_url: post.img_url || '',
      apply_url: post.apply_url || '',
      coming_soon: post.coming_soon === true || String(post.coming_soon).toLowerCase() === 'true'
    });
    document.getElementById('post-editor-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeletePost = async (id) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await deletePost(id);
      setPosts(posts.filter(p => p.id !== id));
      alert('Post deleted.');
    } catch (err) {
      console.error(err);
      alert('Failed to delete post.');
    }
  };



  const handleFormImageUpload = async (file) => {
    if (!file) return;
    setUploadingFormImg(true);
    try {
      const res = await uploadFormImage(file);
      setFormBuilder(prev => ({ ...prev, img_url: res.img_url }));
      alert('Form image uploaded successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingFormImg(false);
    }
  };

  // --- FORM BUILDER OPERATIONS ---
  const addFieldToBuilder = () => {
    const newField = {
      id: `field_${Date.now()}`,
      label: '',
      type: 'text',
      required: false,
      options: []
    };
    setFormBuilder({ ...formBuilder, fields: [...formBuilder.fields, newField] });
  };

  const updateFieldInBuilder = (index, key, val) => {
    const fieldsCopy = [...formBuilder.fields];
    if (key === 'options') {
      fieldsCopy[index][key] = val.split(',').map(o => o.trim()).filter(Boolean);
    } else {
      fieldsCopy[index][key] = val;
      if (key === 'type' && val === 'repeated') {
        fieldsCopy[index].subFields = fieldsCopy[index].subFields || [];
      }
    }
    setFormBuilder({ ...formBuilder, fields: fieldsCopy });
  };

  const removeFieldFromBuilder = (index) => {
    const fieldsCopy = formBuilder.fields.filter((_, i) => i !== index);
    setFormBuilder({ ...formBuilder, fields: fieldsCopy });
  };

  const handleFormBuilderSubmit = async (e) => {
    e.preventDefault();
    if (formBuilder.required_fields.length === 0 && formBuilder.fields.length === 0) {
      alert('Please select at least one standard field or add a custom question.');
      return;
    }
    
    const hasEmptyLabels = formBuilder.fields.some(f => !f.label.trim());
    if (hasEmptyLabels) {
      alert('All custom questions must have a valid label.');
      return;
    }

    const payload = {
      title: formBuilder.title,
      description: formBuilder.description,
      category: formBuilder.category,
      fee: parseInt(formBuilder.fee) || 0,
      instructions: formBuilder.instructions,
      required_fields: JSON.stringify(formBuilder.required_fields),
      required_docs: JSON.stringify(formBuilder.required_docs),
      custom_docs: JSON.stringify(formBuilder.custom_docs),
      fields: JSON.stringify(formBuilder.fields),
      img_url: formBuilder.img_url,
      coming_soon: formBuilder.coming_soon ? "true" : "false"
    };

    try {
      if (editingFormId) {
        await updateForm(editingFormId, payload);
        alert('Form template updated successfully!');
      } else {
        await createForm(payload);
        alert('New Form template created!');
      }
      resetFormBuilder();
      const formsData = await getForms();
      setForms(formsData);
    } catch (err) {
      console.error(err);
      alert('Failed to save form template.');
    }
  };

  const startEditForm = (form) => {
    setEditingFormId(form.id);
    setFormBuilder({
      title: form.title,
      description: form.description || '',
      category: form.category,
      fee: form.fee || 0,
      instructions: form.instructions || '',
      required_fields: safeJsonParse(form.required_fields),
      required_docs: normalizeRequiredDocs(safeJsonParse(form.required_docs)),
      custom_docs: normalizeCustomDocs(safeJsonParse(form.custom_docs)),
      fields: safeJsonParse(form.fields),
      img_url: form.img_url || '',
      coming_soon: form.coming_soon === true || String(form.coming_soon).toLowerCase() === 'true'
    });
    document.getElementById('form-builder-panel')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteForm = async (id) => {
    if (!window.confirm('Delete this form template? This will also delete all user submissions associated with this form!')) return;
    try {
      await deleteForm(id);
      setForms(forms.filter(f => f.id !== id));
      alert('Form template deleted.');
    } catch (err) {
      console.error(err);
      alert('Failed to delete form.');
    }
  };

  const handleDuplicateForm = async (id) => {
    if (!window.confirm('Are you sure you want to duplicate this form template?')) return;
    try {
      await duplicateForm(id);
      alert('Form template duplicated successfully!');
      const formsData = await getForms();
      setForms(formsData);
    } catch (err) {
      console.error(err);
      alert('Failed to duplicate form.');
    }
  };

  const resetFormBuilder = () => {
    setEditingFormId(null);
    setFormBuilder({
      title: '',
      description: '',
      category: 'E sevai',
      fee: 0,
      instructions: '',
      required_fields: [],
      required_docs: [],
      custom_docs: [],
      fields: [],
      img_url: '',
      coming_soon: false
    });
  };

  // --- USER & SUBMISSIONS OPERATIONS ---
  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    setActiveSubmission(null);
    setIsEditingResponsesMode(false);
    try {
      const subs = await getSubmissionsByUser(user.aadhar);
      setUserSubmissions(subs);
    } catch (err) {
      console.error(err);
      alert('Failed to fetch user submissions.');
    }
  };

  const handleSelectSubmission = (sub) => {
    setActiveSubmission(sub);
    setEditingResponses(safeJsonParse(sub.responses, {}));
    setIsEditingResponsesMode(false);
    setStatusForm({
      payment_status: sub.payment_status,
      progress_percent: sub.progress_percent,
      progress_desc: sub.progress_desc || '',
      info_request_label: sub.info_request_label || '',
      info_request_type: sub.info_request_type || 'text',
      other_doc_name: sub.other_doc_name || '',
      pay_allowed: String(sub.pay_allowed || '').toLowerCase() === 'true' ? 'true' : 'false'
    });
    setTimeout(() => {
      document.getElementById('active-submission-dashboard')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    try {
      const updated = await adminUpdateSubmission(activeSubmission.id, statusForm);
      alert('Submission status updated successfully!');
      setActiveSubmission(updated);
      handleRefreshUsers();
    } catch (err) {
      console.error(err);
      alert('Failed to update status.');
    }
  };

  const handleEditSubmissionResponses = async () => {
    try {
      const payload = { responses: JSON.stringify(editingResponses) };
      const updated = await adminUpdateSubmission(activeSubmission.id, payload);
      alert('User entry data modified successfully!');
      setActiveSubmission(updated);
      setIsEditingResponsesMode(false);
      handleRefreshUsers();
    } catch (err) {
      console.error(err);
      alert('Failed to update user entry data.');
    }
  };

  const handleUploadOutputPdf = async (subId, file) => {
    if (!file) return;
    setUploadingPdfId(subId);
    try {
      const updated = await uploadOutputPdf(subId, file);
      alert('Finished document PDF uploaded successfully! Application marked 100% complete.');
      setActiveSubmission(updated);
      handleRefreshUsers();
    } catch (err) {
      console.error(err);
      alert('Failed to upload PDF document.');
    } finally {
      setUploadingPdfId(null);
    }
  };

  const handleUploadDocAdmin = async (subId, docType, file) => {
    if (!file) return;
    setUploadingDocType(docType);
    try {
      const updated = await adminUploadDoc(subId, docType, file);
      alert(`Official ${docType} uploaded successfully!`);
      setActiveSubmission(updated);
      handleRefreshUsers();
    } catch (err) {
      console.error(err);
      alert(`Failed to upload ${docType}.`);
    } finally {
      setUploadingDocType(null);
    }
  };

  const handleDeleteDocAdmin = async (subId, docType) => {
    if (!window.confirm(`Are you sure you want to delete the uploaded ${docType}?`)) return;
    try {
      const updated = await adminDeleteDoc(subId, docType);
      alert(`${docType} deleted successfully!`);
      setActiveSubmission(updated);
      handleRefreshUsers();
    } catch (err) {
      console.error(err);
      alert(`Failed to delete ${docType}.`);
    }
  };

  const handleDeleteSubmission = async (subId) => {
    if (!window.confirm('Are you sure you want to delete this submission record?')) return;
    try {
      await deleteSubmission(subId);
      alert('Submission deleted.');
      setActiveSubmission(null);
      handleRefreshUsers();
    } catch (err) {
      console.error(err);
      alert('Failed to delete submission.');
    }
  };

  const handleDeleteUser = async (aadhar) => {
    if (!window.confirm(`Are you sure you want to delete this user (Aadhaar: ${aadhar}) and all their application forms?`)) return;
    try {
      await deleteUserAndSubmissions(aadhar);
      alert('User account and submissions deleted completely.');
      setSelectedUser(null);
      setActiveSubmission(null);
      handleRefreshUsers();
    } catch (err) {
      console.error(err);
      alert('Failed to delete user.');
    }
  };

  const filteredUsers = users
    .filter(u => 
      u.phone.includes(userSearchTerm) || 
      u.aadhar.includes(userSearchTerm) ||
      (u.name && u.name.toLowerCase().includes(userSearchTerm.toLowerCase()))
    )
    .sort((a, b) => new Date(b.last_active) - new Date(a.last_active));

  if (!isAuth) {
    return (
      <div className="layout-viewport-container" style={{ background: 'var(--bg-light)', alignItems: 'center' }}>
        <div className="app-mobile-container" style={{ justifyContent: 'center', alignItems: 'center', background: 'white' }}>
          <div className="premium-card" style={{ width: '90%', maxWidth: '400px', textAlign: 'center', borderTop: '6px solid var(--primary)' }}>
            <h2 style={{ marginBottom: '8px' }}>Admin Portal</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-light-muted)', marginBottom: '24px' }}>Restricted Access. Please enter the Admin Code.</p>
            
            <form onSubmit={handleAdminLogin}>
              <div className="premium-input-group">
                <input 
                  type="password" 
                  value={loginPin} 
                  onChange={(e) => setLoginPin(e.target.value)} 
                  className="premium-input" 
                  placeholder="Enter 6-digit Code" 
                  style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.2rem' }}
                />
              </div>
              
              {loginError && (
                <div style={{ color: 'var(--error)', fontSize: '0.85rem', marginBottom: '16px' }}>
                  {loginError}
                </div>
              )}
              
              <button 
                type="submit" 
                className="premium-btn premium-btn-primary" 
                disabled={isLoggingIn}
              >
                {isLoggingIn ? 'Verifying...' : 'Login to Dashboard'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="layout-viewport-container admin-portal-wrapper">
      <div className="app-mobile-container">
        <div className="mobile-frame-content">
      
      {/* Secure Console Terminal Status Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#0f172a', color: 'white', borderRadius: '12px', margin: '16px 16px 0 16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
          <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Subi e sevai Admin Terminal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            onClick={() => { setShowFeedbackPanel(true); handleRefreshFeedback(); }}
            style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: 'bold', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <MessageSquare size={12} /> Feedback ({feedbackList.length})
          </button>
          <button 
            onClick={handleAdminLogout}
            style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: 'bold', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Logout Admin
          </button>
        </div>
      </div>

      {/* Server Status Maintenance Panel */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '12px',
        margin: '12px 16px 0 16px',
        padding: '12px 16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#1e293b', letterSpacing: '0.02em' }}>SERVER MODE STATUS:</span>
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '2px', border: '1px solid #cbd5e1' }}>
            <button
              type="button"
              onClick={() => handleServerToggle(true)}
              style={{
                padding: '4px 12px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: '700',
                backgroundColor: serverConfig.active ? '#10b981' : 'transparent',
                color: serverConfig.active ? 'white' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              ON (Active)
            </button>
            <button
              type="button"
              onClick={() => handleServerToggle(false)}
              style={{
                padding: '4px 12px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: '700',
                backgroundColor: !serverConfig.active ? '#ef4444' : 'transparent',
                color: !serverConfig.active ? 'white' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              OFF (Maintenance)
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', whiteSpace: 'nowrap' }}>Offline Display Notice:</span>
          <input
            type="text"
            value={serverConfig.message}
            onChange={(e) => handleServerMessageChange(e.target.value)}
            placeholder="e.g. Server issues, so pls wait..."
            className="premium-input"
            style={{ padding: '6px 10px', fontSize: '0.75rem', margin: 0, width: '100%', background: '#f8fafc' }}
          />
        </div>
      </div>
      <div style={{ flex: 1, padding: '0 16px' }}>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '16px 0', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('announcements')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: activeTab === 'announcements' ? '2px solid var(--primary)' : '1px solid var(--border-light)',
              background: activeTab === 'announcements' ? 'rgba(16,185,129,0.06)' : 'white',
              cursor: 'pointer',
              fontWeight: activeTab === 'announcements' ? 800 : 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Megaphone size={16} /> Ads / Popups ({announcements.length})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: activeTab === 'settings' ? '2px solid var(--primary)' : '1px solid var(--border-light)',
              background: activeTab === 'settings' ? 'rgba(16,185,129,0.06)' : 'white',
              cursor: 'pointer',
              fontWeight: activeTab === 'settings' ? 800 : 600
            }}
          >
            Settings
          </button>
          <button
            onClick={() => setActiveTab('og')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: activeTab === 'og' ? '2px solid var(--primary)' : '1px solid var(--border-light)',
              background: activeTab === 'og' ? 'rgba(16,185,129,0.06)' : 'white',
              cursor: 'pointer',
              fontWeight: activeTab === 'og' ? 800 : 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: activeTab === 'og' ? 'var(--primary)' : 'var(--text-light-main)'
            }}
          >
            <Link size={16} /> OG Redirects
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: activeTab === 'jobs' ? '2px solid var(--primary)' : '1px solid var(--border-light)',
              background: activeTab === 'jobs' ? 'rgba(16,185,129,0.06)' : 'white',
              cursor: 'pointer',
              fontWeight: activeTab === 'jobs' ? 800 : 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: activeTab === 'jobs' ? 'var(--primary)' : 'var(--text-light-main)'
            }}
          >
            <Briefcase size={16} /> Jobs ({jobs.length})
          </button>
        </div>

        {/* --- TAB: JOBS MANAGER --- */}
        {activeTab === 'jobs' && (
          <div className="desktop-grid-2" style={{ gap: '20px' }}>
            
            {/* Form: Add / Edit Job Alert */}
            <div>
              <div className="premium-card" style={{ padding: '24px', borderTop: '6px solid var(--primary)', background: 'white', borderRadius: '16px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px' }}>
                  {editingJobId ? 'Edit Job Alert' : 'Add New Job Alert'}
                </h3>
                <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '16px' }}>
                  Publish government and recruitment job alerts for citizens.
                </p>

                <form onSubmit={handleJobSubmit}>
                  
                  {/* Job Title */}
                  <div className="premium-input-group">
                    <label className="premium-label">Job Title *</label>
                    <input
                      type="text"
                      value={jobForm.title}
                      onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                      placeholder="e.g. TNPSC Group 4 VAO Notification"
                      className="premium-input"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="premium-input-group">
                    <label className="premium-label">Description (Requirements / Details) *</label>
                    <textarea
                      rows={3}
                      value={jobForm.description}
                      onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                      placeholder="Provide details about the qualification, age limits, pay scale, important dates..."
                      className="premium-input"
                      required
                    />
                  </div>

                  {/* Start Date & End Date */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div className="premium-input-group" style={{ flex: 1 }}>
                      <label className="premium-label">Start Date (Optional)</label>
                      <input
                        type="date"
                        value={jobForm.start_date}
                        onChange={(e) => setJobForm({ ...jobForm, start_date: e.target.value })}
                        className="premium-input"
                      />
                    </div>

                    <div className="premium-input-group" style={{ flex: 1 }}>
                      <label className="premium-label">End Date (Optional)</label>
                      <input
                        type="date"
                        value={jobForm.end_date}
                        onChange={(e) => setJobForm({ ...jobForm, end_date: e.target.value })}
                        className="premium-input"
                      />
                    </div>
                  </div>

                  {/* Job Banner Image */}
                  <div className="premium-input-group">
                    <label className="premium-label">Job Banner Image (Optional)</label>
                    {jobForm.img_url && (
                      <div style={{ marginBottom: '10px', position: 'relative', width: '100%', height: '140px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                        <img
                          src={getImageUrl(jobForm.img_url)}
                          alt="Uploaded banner"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <button
                          type="button"
                          onClick={() => setJobForm(prev => ({ ...prev, img_url: '' }))}
                          className="premium-btn premium-btn-danger"
                          style={{ position: 'absolute', right: '6px', bottom: '6px', width: 'auto', padding: '4px 8px', fontSize: '0.7rem' }}
                        >
                          Remove Image
                        </button>
                      </div>
                    )}
                    <label className="premium-btn premium-btn-secondary" style={{ padding: '12px', fontSize: '0.85rem', display: 'flex', gap: '8px', cursor: 'pointer', background: 'white', border: '1.5px dashed var(--primary)' }}>
                      <Upload size={16} style={{ color: 'var(--primary)' }} />
                      {uploadingJobImg ? 'Uploading banner...' : jobForm.img_url ? 'Change Uploaded Image' : 'Upload Local Image File'}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        disabled={uploadingJobImg}
                        onChange={(e) => handleJobImageUpload(e.target.files[0])}
                      />
                    </label>
                  </div>

                  {/* Apply URL / Link */}
                  <div className="premium-input-group">
                    <label className="premium-label">Apply Link URL (Optional)</label>
                    <input
                      type="text"
                      value={jobForm.apply_url}
                      onChange={(e) => setJobForm({ ...jobForm, apply_url: e.target.value })}
                      placeholder="e.g. /user?tab=apply or https://www.tnpsc.gov.in"
                      className="premium-input"
                    />
                    <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                      Use local routes (e.g. '/user?tab=apply') or full web links. Leave blank to hide the button.
                    </span>
                  </div>

                  {/* Custom Action Button Name */}
                  <div className="premium-input-group">
                    <label className="premium-label">Custom Action Button Name (Optional)</label>
                    <input
                      type="text"
                      value={jobForm.button_name}
                      onChange={(e) => setJobForm({ ...jobForm, button_name: e.target.value })}
                      placeholder="e.g. Apply Now, Register Online, View PDF"
                      className="premium-input"
                    />
                    <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                      Defaults to "Apply Now" if left blank.
                    </span>
                  </div>

                  {/* Rich Document Details */}
                  <div className="premium-input-group">
                    <label className="premium-label">Rich Document Details (Word-like Markdown Formatting)</label>
                    <textarea
                      rows={8}
                      value={jobForm.details_doc}
                      onChange={(e) => setJobForm({ ...jobForm, details_doc: e.target.value })}
                      placeholder="H1: Main Title&#10;H2: Sub-Heading&#10;H3: Paragraph Header&#10;--- (horizontal separator line)&#10;table:&#10;Organization$TNPSC&#10;Post Name$Combined Technical Services&#10;Apply Link$https://apply.tnpscexams.in/"
                      className="premium-input"
                      style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                    />
                    <span style={{ fontSize: '0.68rem', color: '#475569', lineHeight: '1.4', display: 'block', marginTop: '4px' }}>
                      💡 <strong>Formatting Guide:</strong><br />
                      • <strong>H1: Title</strong> | <strong>H2: Heading</strong> | <strong>H3: Sub-Heading</strong><br />
                      • <strong>---</strong> (3 hyphens for horizontal divider line)<br />
                      • <strong>table:</strong> followed by lines separated by <code>$</code> (or <code>,</code>) for green tables<br />
                      • URLs starting with <code>https://</code> in tables or text automatically convert into clickable links!
                    </span>
                  </div>

                  {/* Mark as Coming Soon Checkbox */}
                  <div className="premium-input-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <input
                      type="checkbox"
                      id="job-coming-soon-check"
                      checked={jobForm.coming_soon}
                      onChange={(e) => setJobForm({ ...jobForm, coming_soon: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                    />
                    <label htmlFor="job-coming-soon-check" className="premium-label" style={{ margin: 0, cursor: 'pointer', fontWeight: 'bold' }}>
                      Mark as Coming Soon (Upcoming)
                    </label>
                  </div>

                  {/* Submit / Cancel Buttons */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" className="premium-btn premium-btn-primary" style={{ flex: 2 }}>
                      {editingJobId ? 'Update Job Alert' : 'Publish Job Alert'}
                    </button>
                    {editingJobId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingJobId(null);
                          setJobForm({
                            title: '',
                            description: '',
                            start_date: '',
                            end_date: '',
                            img_url: '',
                            apply_url: '',
                            button_name: '',
                            details_doc: '',
                            coming_soon: false
                          });
                        }}
                        className="premium-btn premium-btn-secondary"
                        style={{ flex: 1 }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                </form>
              </div>
            </div>

            {/* List of Published Jobs */}
            <div>
              <h4 style={{ fontSize: '0.95rem', margin: '0 0 12px 16px', color: 'var(--text-light-muted)' }}>
                Active Job Alerts ({jobs.length} Listings)
              </h4>
              {jobs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', background: 'white', borderRadius: '12px', color: '#94a3b8' }}>
                  No job alerts published yet. Fill out the form on the left to add your first job alert!
                </div>
              ) : (
                jobs.map((job) => (
                  <div key={job.id} className="premium-card admin-item-card" style={{ alignItems: 'flex-start', padding: '14px', marginBottom: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '0.95rem', margin: '0 0 4px 0', color: '#1e293b', fontWeight: '800' }}>
                        {job.title}
                      </h4>
                      <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 6px 0', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {job.description}
                      </p>
                      {job.end_date && (
                        <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 'bold' }}>
                          End: {formatDate(job.end_date)}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => startEditJob(job)}
                        className="premium-btn premium-btn-secondary"
                        style={{ width: '32px', height: '32px', padding: 0 }}
                        title="Edit Job"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteJob(job.id)}
                        className="premium-btn premium-btn-danger"
                        style={{ width: '32px', height: '32px', padding: 0 }}
                        title="Delete Job"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        )}

        {/* --- TAB 1: MANAGE POSTS --- */}
        {activeTab === 'posts' && (
          <div className="desktop-grid-2">
            
            {/* Post Add Form */}
            <div className="premium-card" id="post-editor-form" style={{ borderTop: '6px solid var(--primary)', alignSelf: 'flex-start' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>
                {editingPostId ? 'Edit Post Details' : 'Add New Service Post'}
              </h3>
              <form onSubmit={handlePostSubmit}>
                <div className="premium-input-group">
                  <label className="premium-label">Service Title</label>
                  <input 
                    type="text" 
                    value={postForm.title} 
                    onChange={(e) => setPostForm({ ...postForm, title: e.target.value })} 
                    placeholder="e.g. Income Certificate Online"
                    className="premium-input" 
                    required 
                  />
                </div>

                <div className="premium-input-group">
                  <label className="premium-label">Description (Instagram Caption)</label>
                  <textarea 
                    rows={4}
                    value={postForm.description} 
                    onChange={(e) => setPostForm({ ...postForm, description: e.target.value })} 
                    placeholder="Provide details about the service, processing time, required documents..."
                    className="premium-input" 
                    required 
                  />
                </div>

                 <div className="premium-input-group">
                  <label className="premium-label">Post Banner Image (Optional)</label>
                  
                  {postForm.img_url && (
                    <div style={{ marginBottom: '10px', position: 'relative', width: '140px', height: '140px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                      <img 
                        src={getImageUrl(postForm.img_url)} 
                        alt="Uploaded preview" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#f8fafc' }} 
                      />
                      <button 
                        type="button" 
                        onClick={() => setPostForm(prev => ({ ...prev, img_url: '' }))} 
                        className="premium-btn premium-btn-danger"
                        style={{ position: 'absolute', right: '6px', bottom: '6px', width: 'auto', padding: '4px 8px', fontSize: '0.7rem' }}
                      >
                        Remove Image
                      </button>
                    </div>
                  )}

                  <label className="premium-btn premium-btn-secondary" style={{ padding: '12px', fontSize: '0.85rem', display: 'flex', gap: '8px', cursor: 'pointer', background: 'white', border: '1.5px dashed var(--primary)' }}>
                    <Upload size={16} style={{ color: 'var(--primary)' }} /> 
                    {uploadingPostImg ? 'Uploading image...' : postForm.img_url ? 'Change Uploaded Image' : 'Upload Local Image File'}
                    <input 
                      type="file" 
                      accept="image/*"
                      style={{ display: 'none' }}
                      disabled={uploadingPostImg}
                      onChange={(e) => handlePostImageUpload(e.target.files[0])}
                    />
                  </label>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-light-muted)', display: 'block', marginTop: '6px' }}>
                    Select a local PNG or JPG file. Standard web URL inputs are not allowed.
                  </span>
                </div>

                <div className="premium-input-group">
                  <label className="premium-label">Apply Now URL / Routing (Optional)</label>
                  <input 
                    type="text" 
                    value={postForm.apply_url} 
                    onChange={(e) => setPostForm({ ...postForm, apply_url: e.target.value })} 
                    placeholder="e.g. /user?tab=apply&category=E%20sevai"
                    className="premium-input" 
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-light-muted)' }}>
                    Use local routes (e.g. `/user?tab=apply&category=E sevai`) or full web links. <strong>Leave blank to hide the "Apply Now" button on this post.</strong>
                  </span>
                </div>

                <div className="premium-input-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', marginTop: '10px' }}>
                  <input 
                    type="checkbox" 
                    id="post-coming-soon"
                    checked={postForm.coming_soon} 
                    onChange={(e) => setPostForm({ ...postForm, coming_soon: e.target.checked })} 
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="post-coming-soon" className="premium-label" style={{ margin: 0, cursor: 'pointer', fontWeight: 'bold' }}>
                    Mark as Coming Soon (Upcoming)
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="premium-btn premium-btn-primary" style={{ flex: 2 }}>
                    {editingPostId ? 'Update Post' : 'Publish Post'}
                  </button>
                  {editingPostId && (
                    <button 
                      type="button" 
                      onClick={() => { setEditingPostId(null); setPostForm({ title: '', description: '', img_url: '', apply_url: '', coming_soon: false }) }} 
                      className="premium-btn premium-btn-secondary"
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* List of existing posts */}
            <div>
              <h4 style={{ fontSize: '0.95rem', margin: '0 0 12px 16px', color: 'var(--text-light-muted)' }}>
                Active Posts Feed ({posts.length} Posts)
              </h4>
              {sortItems(posts).map((post, idx) => (
                <div key={post.id} className="premium-card admin-item-card" style={{ alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '0.95rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {post.title}
                      {(post.coming_soon === true || String(post.coming_soon).toLowerCase() === 'true') && (
                        <span className="badge badge-warning" style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px' }}>Coming Soon</span>
                      )}
                    </h4>
                    <p className="text-muted" style={{ fontSize: '0.8rem', WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {post.description}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => moveItem('post', posts, idx, 'up')} className="premium-btn premium-btn-secondary" style={{ width: '36px', height: '36px', padding: 0 }} title="Move Up">↑</button>
                    <button onClick={() => moveItem('post', posts, idx, 'down')} className="premium-btn premium-btn-secondary" style={{ width: '36px', height: '36px', padding: 0 }} title="Move Down">↓</button>
                    <button onClick={() => startEditPost(post)} className="premium-btn premium-btn-secondary" style={{ width: '36px', height: '36px', padding: 0 }} title="Edit Post">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDeletePost(post.id)} className="premium-btn premium-btn-danger" style={{ width: '36px', height: '36px', padding: 0 }} title="Delete Post">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}


        {/* --- TAB: MANAGE ADVERTISEMENTS & POPUPS --- */}
        {activeTab === 'announcements' && (
          <div className="desktop-grid-2">
            
            {/* Announcement / Ad Add & Edit Form */}
            <div className="premium-card" id="ann-editor-form" style={{ borderTop: '6px solid var(--primary)', alignSelf: 'flex-start' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>
                {editingAnnId ? 'Edit Advertisement Popup' : 'Add New Advertisement Popup'}
              </h3>
              <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '16px' }}>
                Configured advertisements will automatically show up in a front popup when users open the application.
              </p>

              <form onSubmit={handleAnnSubmit}>
                <div className="premium-input-group">
                  <label className="premium-label">Advertisement Title (Manual Name) *</label>
                  <input 
                    type="text" 
                    value={annForm.title} 
                    onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })} 
                    placeholder="e.g. Special Offer / New Service Available"
                    className="premium-input" 
                    required 
                  />
                </div>

                <div className="premium-input-group">
                  <label className="premium-label">Message / Content Description</label>
                  <textarea 
                    rows={4}
                    value={annForm.content} 
                    onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })} 
                    placeholder="Describe the promotion or announcement details..."
                    className="premium-input" 
                  />
                </div>

                <div className="premium-input-group">
                  <label className="premium-label">Banner Image (Optional)</label>
                  {annForm.img_url && (
                    <div style={{ marginBottom: '10px', position: 'relative', width: '100%', height: '140px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                      <img 
                        src={getImageUrl(annForm.img_url)} 
                        alt="Uploaded preview" 
                        style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#f8fafc' }} 
                      />
                      <button 
                        type="button" 
                        onClick={() => setAnnForm(prev => ({ ...prev, img_url: '' }))} 
                        className="premium-btn premium-btn-danger"
                        style={{ position: 'absolute', right: '6px', bottom: '6px', width: 'auto', padding: '4px 8px', fontSize: '0.7rem' }}
                      >
                        Remove Image
                      </button>
                    </div>
                  )}

                  <label className="premium-btn premium-btn-secondary" style={{ padding: '12px', fontSize: '0.85rem', display: 'flex', gap: '8px', cursor: 'pointer', background: 'white', border: '1.5px dashed var(--primary)' }}>
                    <Upload size={16} style={{ color: 'var(--primary)' }} /> 
                    {uploadingAnnImg ? 'Uploading image...' : annForm.img_url ? 'Change Uploaded Banner' : 'Upload Banner Image File'}
                    <input 
                      type="file" 
                      accept="image/*"
                      style={{ display: 'none' }}
                      disabled={uploadingAnnImg}
                      onChange={(e) => handleAnnImageUpload(e.target.files[0])}
                    />
                  </label>
                </div>

                <div className="premium-input-group">
                  <label className="premium-label">Action Button Name (Manual Button Label)</label>
                  <input 
                    type="text" 
                    value={annForm.button_name} 
                    onChange={(e) => setAnnForm({ ...annForm, button_name: e.target.value })} 
                    placeholder="e.g. Apply Now, Visit Offer, WhatsApp Us"
                    className="premium-input" 
                  />
                </div>

                <div className="premium-input-group">
                  <label className="premium-label">Action Button Target Link / URL</label>
                  <input 
                    type="text" 
                    value={annForm.button_url} 
                    onChange={(e) => setAnnForm({ ...annForm, button_url: e.target.value })} 
                    placeholder="e.g. /user?tab=apply or web URL link"
                    className="premium-input" 
                  />
                </div>

                <div className="premium-input-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', marginTop: '10px' }}>
                  <input 
                    type="checkbox" 
                    id="ann-enabled-check"
                    checked={String(annForm.enabled).toLowerCase() === 'true'} 
                    onChange={(e) => setAnnForm({ ...annForm, enabled: e.target.checked ? 'true' : 'false' })} 
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                  />
                  <label htmlFor="ann-enabled-check" className="premium-label" style={{ margin: 0, cursor: 'pointer', fontWeight: 'bold' }}>
                    Enable & Show Front Popup on App Open
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="premium-btn premium-btn-primary" style={{ flex: 2 }}>
                    {editingAnnId ? 'Update Advertisement' : 'Create Advertisement'}
                  </button>
                  {editingAnnId && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditingAnnId(null);
                        setAnnForm({ title: '', description: '', content: '', img_url: '', button_name: '', button_url: '', enabled: 'true' });
                      }} 
                      className="premium-btn premium-btn-secondary"
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* List of existing Advertisements */}
            <div>
              <h4 style={{ fontSize: '0.95rem', margin: '0 0 12px 16px', color: 'var(--text-light-muted)' }}>
                Active Advertisements ({announcements.length} Entries)
              </h4>
              {announcements.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', background: 'white', borderRadius: '12px', color: '#94a3b8' }}>
                  No advertisements created yet. Fill out the form on the left to add your first advertisement popup!
                </div>
              ) : (
                announcements.map((ann) => {
                  const isEnabled = String(ann.enabled).toLowerCase() === 'true';
                  return (
                    <div key={ann.id} className="premium-card admin-item-card" style={{ alignItems: 'flex-start', padding: '14px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <h4 style={{ fontSize: '0.95rem', margin: 0, color: '#1e293b', fontWeight: '800' }}>
                            {ann.title || 'Untitled Ad'}
                          </h4>
                          <span 
                            onClick={() => handleToggleAnnStatus(ann)}
                            style={{ 
                              cursor: 'pointer',
                              fontSize: '0.65rem', 
                              fontWeight: 'bold', 
                              padding: '2px 8px', 
                              borderRadius: '12px',
                              background: isEnabled ? '#dcfce7' : '#fee2e2',
                              color: isEnabled ? '#15803d' : '#ef4444',
                              border: isEnabled ? '1px solid #86efac' : '1px solid #fca5a5'
                            }}
                          >
                            {isEnabled ? '● Active (Front Popup)' : '○ Disabled'}
                          </span>
                        </div>
                        {ann.img_url && (
                          <div style={{ width: '100px', height: '60px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1', marginBottom: '8px', background: '#f8fafc' }}>
                            <img src={getImageUrl(ann.img_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        )}
                        <p className="text-muted" style={{ fontSize: '0.8rem', WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '6px' }}>
                          {ann.content || ann.description || 'No content message provided.'}
                        </p>
                        {ann.button_name && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                            Button: "{ann.button_name}" {ann.button_url ? `(${ann.button_url})` : ''}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignSelf: 'center' }}>
                        <button onClick={() => startEditAnn(ann)} className="premium-btn premium-btn-secondary" style={{ width: '36px', height: '36px', padding: 0 }} title="Edit Advertisement">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDeleteAnn(ann.id)} className="premium-btn premium-btn-danger" style={{ width: '36px', height: '36px', padding: 0 }} title="Delete Advertisement">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}

        {/* --- TAB 2: FORM TEMPLATES BUILDER --- */}
        {activeTab === 'forms' && (
          <div className="desktop-grid-2">
            
            {/* Form Builder panel */}
            <div className="premium-card" id="form-builder-panel" style={{ borderTop: '6px solid var(--primary)', alignSelf: 'flex-start' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>
                {editingFormId ? 'Edit Form Template' : 'Google Forms Builder'}
              </h3>
              <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '16px' }}>Configure custom inputs for your users. Phone, DOB, and Aadhaar are automatically required.</p>
              
              <form onSubmit={handleFormBuilderSubmit}>
                <div className="premium-input-group">
                  <label className="premium-label">Form Title (Supports Multi-line / Line-by-Line)</label>
                  <textarea 
                    rows={2}
                    value={formBuilder.title} 
                    onChange={(e) => setFormBuilder({ ...formBuilder, title: e.target.value })} 
                    placeholder="e.g. New Voter ID Card&#10;Apply & Corrections"
                    className="premium-input" 
                    style={{ minHeight: '52px', resize: 'vertical' }}
                    required 
                  />
                  <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Tip: Press Enter to break long form names into multiple lines.</span>
                </div>

                <div className="premium-input-group">
                  <label className="premium-label">Form Description</label>
                  <textarea 
                    rows={2}
                    value={formBuilder.description} 
                    onChange={(e) => setFormBuilder({ ...formBuilder, description: e.target.value })} 
                    placeholder="Instruction for users when filling this form..."
                    className="premium-input" 
                  />
                </div>

                <div className="premium-input-group">
                  <label className="premium-label">Form Category</label>
                  <select 
                    value={formBuilder.category} 
                    onChange={(e) => setFormBuilder({ ...formBuilder, category: e.target.value })}
                    className="premium-input"
                  >
                    <option value="E sevai">E Sevai</option>
                    <option value="pan card">PAN Card</option>
                    <option value="voter id">Voter ID</option>
                    <option value="others">Others</option>
                  </select>
                </div>

                <div className="premium-input-group">
                  <label className="premium-label">Form Image (Optional)</label>
                  {formBuilder.img_url && (
                    <div style={{ marginBottom: '10px', position: 'relative', width: '100%', height: '140px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                      <img 
                        src={getImageUrl(formBuilder.img_url)} 
                        alt="Uploaded preview" 
                        style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#f8fafc' }} 
                      />
                      <button 
                        type="button" 
                        onClick={() => setFormBuilder(prev => ({ ...prev, img_url: '' }))} 
                        className="premium-btn premium-btn-danger"
                        style={{ position: 'absolute', right: '6px', bottom: '6px', width: 'auto', padding: '4px 8px', fontSize: '0.7rem' }}
                      >
                        Remove Image
                      </button>
                    </div>
                  )}
                  <label className="premium-btn premium-btn-secondary" style={{ padding: '12px', fontSize: '0.85rem', display: 'flex', gap: '8px', cursor: 'pointer', background: 'white', border: '1.5px dashed var(--primary)' }}>
                    <Upload size={16} style={{ color: 'var(--primary)' }} /> 
                    {uploadingFormImg ? 'Uploading image...' : formBuilder.img_url ? 'Change Uploaded Image' : 'Upload Local Image File'}
                    <input 
                      type="file" 
                      accept="image/*"
                      style={{ display: 'none' }}
                      disabled={uploadingFormImg}
                      onChange={(e) => handleFormImageUpload(e.target.files[0])}
                    />
                  </label>
                </div>

                <div className="premium-input-group">
                  <label className="premium-label">Service Fee (Receipt Amount in INR) *</label>
                  <input 
                    type="number" 
                    value={formBuilder.fee} 
                    onChange={(e) => setFormBuilder({ ...formBuilder, fee: parseInt(e.target.value) || 0 })} 
                    placeholder="e.g. 50"
                    className="premium-input" 
                    required 
                  />
                </div>

                <div className="premium-input-group">
                  <label className="premium-label">Instructions / Terms & Conditions (Step 1 - one item per line)</label>
                  <textarea 
                    rows={3}
                    value={formBuilder.instructions} 
                    onChange={(e) => setFormBuilder({ ...formBuilder, instructions: e.target.value })} 
                    placeholder="e.g. Applicant must reside in Tamil Nadu.&#10;Must upload original Aadhaar card."
                    className="premium-input" 
                  />
                </div>

                <div className="premium-input-group">
                  <label className="premium-label" style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Select Required Fields</label>
                  
                  {formBuilder.required_fields.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '10px', background: 'rgba(16,185,129,0.06)', border: '1.5px solid var(--primary)', borderRadius: '8px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--primary)', width: '100%' }}>Currently Selected Required Fields ({formBuilder.required_fields.length}):</span>
                      {formBuilder.required_fields.map(fieldId => {
                        const label = [
                          { id: 'name', label: 'Name (English)' },
                          { id: 'name_tamil', label: 'பெயர் ( தமிழில் )' },
                          { id: 'dob', label: 'Date of Birth (DOB)' },
                          { id: 'phone', label: 'Phone no' },
                          { id: 'aadhar', label: 'Aadhaar no' },
                          { id: 'gender', label: 'Gender' },
                          { id: 'marital_status', label: 'Status (married/unmarried)' },
                          { id: 'father_name', label: "Father's Name" },
                          { id: 'father_name_tamil', label: 'தந்தை பெயர் ( தமிழில் )' },
                          { id: 'mother_name', label: "Mother's name" },
                          { id: 'mother_name_tamil', label: 'தாயின் பெயர் ( தமிழில் )' },
                          { id: 'community', label: 'Community' },
                          { id: 'address', label: 'Address' },
                          { id: 'religion', label: 'Religion' },
                          { id: 'state', label: 'State' },
                          { id: 'district', label: 'District' },
                          { id: 'taluk', label: 'Taluk' },
                          { id: 'revenue_village', label: 'Revenue Village ( பாஞ்சாயத்து )' },
                          { id: 'street_name', label: 'Street Name' },
                          { id: 'door_no', label: 'Door no' },
                          { id: 'pincode', label: 'Pin Code' }
                        ].find(x => x.id === fieldId)?.label || fieldId;
                        
                        return (
                          <span key={fieldId} className="badge badge-info" style={{ fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: 'var(--primary)', color: 'white' }}>
                            {label}
                            <X 
                              size={12} 
                              style={{ cursor: 'pointer' }} 
                              onClick={() => {
                                setFormBuilder(prev => ({
                                  ...prev,
                                  required_fields: prev.required_fields.filter(x => x !== fieldId)
                                }));
                              }}
                            />
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <div className="admin-fields-grid" style={{ display: 'grid', gap: '8px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                    {[
                      { id: 'name', label: 'Name (English)' },
                      { id: 'name_tamil', label: 'பெயர் ( தமிழில் )' },
                      { id: 'dob', label: 'Date of Birth (DOB)' },
                      { id: 'phone', label: 'Phone no' },
                      { id: 'aadhar', label: 'Aadhaar no' },
                      { id: 'gender', label: 'Gender' },
                      { id: 'marital_status', label: 'Status (married/unmarried)' },
                      { id: 'father_name', label: "Father's Name" },
                      { id: 'father_name_tamil', label: 'தந்தை பெயர் ( தமிழில் )' },
                      { id: 'mother_name', label: "Mother's name" },
                      { id: 'mother_name_tamil', label: 'தாயின் பெயர் ( தமிழில் )' },
                      { id: 'community', label: 'Community' },
                      { id: 'address', label: 'Address' },
                      { id: 'religion', label: 'Religion' },
                      { id: 'state', label: 'State' },
                      { id: 'district', label: 'District' },
                      { id: 'taluk', label: 'Taluk' },
                      { id: 'revenue_village', label: 'Revenue Village ( பாஞ்சாயத்து )' },
                      { id: 'street_name', label: 'Street Name' },
                      { id: 'door_no', label: 'Door no' },
                      { id: 'pincode', label: 'Pin Code' }
                    ].map(f => {
                      const isChecked = formBuilder.required_fields.includes(f.id);
                      return (
                        <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer', color: '#1e293b' }}>
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={(e) => {
                              const list = e.target.checked 
                                ? [...formBuilder.required_fields, f.id]
                                : formBuilder.required_fields.filter(x => x !== f.id);
                              setFormBuilder({ ...formBuilder, required_fields: list });
                            }}
                          />
                          <span>{f.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="premium-input-group">
                  <label className="premium-label" style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Select Document Uploads</label>
                  
                  {formBuilder.required_docs.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '10px', background: 'rgba(16,185,129,0.06)', border: '1.5px solid var(--primary)', borderRadius: '8px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--primary)', width: '100%' }}>Currently Selected Documents ({formBuilder.required_docs.length}):</span>
                      {normalizeRequiredDocs(formBuilder.required_docs).map(doc => {
                        const docId = doc.id;
                        const label = [
                          { id: 'photo', label: 'Photo' },
                          { id: 'aadhar', label: 'Aadhaar' },
                          { id: 'smart_card', label: 'Smart Card' },
                          { id: 'voter_id', label: 'Voter ID' },
                          { id: 'signature', label: 'Signature' }
                        ].find(x => x.id === docId)?.label || docId;
                        
                        let modeLabel = '';
                        if (doc.val === 1) modeLabel = '(1 File)';
                        else if (doc.val === 2) modeLabel = '(2 Images)';
                        else if (doc.val === 3) modeLabel = '(3 Images)';

                        return (
                          <span key={docId} className="badge badge-info" style={{ fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: 'var(--primary)', color: 'white' }}>
                            {label} {modeLabel}
                            <X 
                              size={12} 
                              style={{ cursor: 'pointer' }} 
                              onClick={() => {
                                setFormBuilder(prev => ({
                                  ...prev,
                                  required_docs: normalizeRequiredDocs(prev.required_docs).filter(x => x.id !== docId)
                                }));
                              }}
                            />
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-light)', marginBottom: '12px' }}>
                    {[
                      { id: 'photo', label: 'Photo Upload (image < 10MB)' },
                      { id: 'aadhar', label: 'Aadhaar Upload (img/pdf < 10MB)' },
                      { id: 'smart_card', label: 'Smart Card Upload (img/pdf < 10MB)' },
                      { id: 'voter_id', label: 'Voter ID Upload (img/pdf < 10MB)' },
                      { id: 'signature', label: 'Signature Upload (img/pdf < 10MB)' }
                    ].map(d => {
                      const normalizedDocs = normalizeRequiredDocs(formBuilder.required_docs);
                      const activeDoc = normalizedDocs.find(x => x.id === d.id);
                      const isChecked = !!activeDoc;
                      
                      return (
                        <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer', color: '#1e293b', margin: 0 }}>
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={(e) => {
                                let list;
                                if (e.target.checked) {
                                  const defaultVal = ['aadhar', 'smart_card', 'voter_id'].includes(d.id) ? 2 : 1;
                                  list = [...normalizedDocs, { id: d.id, val: defaultVal }];
                                } else {
                                  list = normalizedDocs.filter(x => x.id !== d.id);
                                }
                                setFormBuilder({ ...formBuilder, required_docs: list });
                              }}
                            />
                            <span>{d.label}</span>
                          </label>
                          
                          {isChecked && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Files:</span>
                              <select
                                value={activeDoc.val || 1}
                                onChange={(e) => {
                                  const newVal = parseInt(e.target.value) || 1;
                                  const list = normalizedDocs.map(x => x.id === d.id ? { ...x, val: newVal } : x);
                                  setFormBuilder({ ...formBuilder, required_docs: list });
                                }}
                                className="premium-input"
                                style={{ padding: '2px 4px', fontSize: '0.75rem', width: 'auto', height: '24px' }}
                              >
                                <option value={1}>1 File (PDF/Image)</option>
                                <option value={2}>2 Images (Front & Back)</option>
                                <option value={3}>3 Images (Front, Back & Extra)</option>
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ padding: '12px', backgroundColor: '#f1f5f9', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#1e293b' }}>Custom Uploads Required</span>
                      <button 
                        type="button" 
                        onClick={() => {
                          const currentCustom = normalizeCustomDocs(formBuilder.custom_docs);
                          setFormBuilder({ ...formBuilder, custom_docs: [...currentCustom, { label: '', val: 1 }] });
                        }}
                        className="premium-btn premium-btn-success"
                        style={{ padding: '2px 8px', fontSize: '0.75rem', width: 'auto' }}
                      >
                        + Add Custom Label
                      </button>
                    </div>
                    {normalizeCustomDocs(formBuilder.custom_docs).map((doc, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
                        <input 
                          type="text" 
                          placeholder="e.g. Self Declaration Form" 
                          value={doc.label}
                          onChange={(e) => {
                            const list = normalizeCustomDocs(formBuilder.custom_docs);
                            list[idx].label = e.target.value;
                            setFormBuilder({ ...formBuilder, custom_docs: list });
                          }}
                          className="premium-input"
                          style={{ padding: '6px', fontSize: '0.8rem', flex: 2 }}
                          required
                        />
                        <select
                          value={doc.val || 1}
                          onChange={(e) => {
                            const newVal = parseInt(e.target.value) || 1;
                            const list = normalizeCustomDocs(formBuilder.custom_docs);
                            list[idx].val = newVal;
                            setFormBuilder({ ...formBuilder, custom_docs: list });
                          }}
                          className="premium-input"
                          style={{ padding: '4px', fontSize: '0.8rem', flex: 1, height: '32px' }}
                        >
                          <option value={1}>1 File</option>
                          <option value={2}>2 Images</option>
                          <option value={3}>3 Images</option>
                        </select>
                        <button 
                          type="button"
                          onClick={() => {
                            const list = normalizeCustomDocs(formBuilder.custom_docs).filter((_, i) => i !== idx);
                            setFormBuilder({ ...formBuilder, custom_docs: list });
                          }}
                          className="premium-btn premium-btn-danger"
                          style={{ width: '32px', height: '32px', padding: 0 }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Question fields list */}
                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px', marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '0.9rem' }}>Form Fields ({formBuilder.fields.length})</h4>
                    <button 
                      type="button" 
                      onClick={addFieldToBuilder} 
                      className="premium-btn premium-btn-success"
                      style={{ padding: '6px 12px', fontSize: '0.8rem', width: 'auto' }}
                    >
                      <Plus size={14} /> Add Input Question
                    </button>
                  </div>

                  {formBuilder.fields.map((field, idx) => (
                    <div key={field.id} className="premium-card form-builder-question" style={{ margin: '0 0 12px 0', padding: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)' }}>Field #{idx + 1}</span>
                        <button 
                          type="button" 
                          onClick={() => removeFieldFromBuilder(idx)}
                          className="premium-btn premium-btn-danger"
                          style={{ width: '28px', height: '28px', padding: 0 }}
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="premium-input-group" style={{ marginBottom: '8px' }}>
                        <label className="premium-label">Question Label</label>
                        <input 
                          type="text" 
                          value={field.label}
                          onChange={(e) => updateFieldInBuilder(idx, 'label', e.target.value)}
                          placeholder="e.g. Enter Annual Income"
                          className="premium-input"
                          style={{ padding: '8px' }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <label className="premium-label">Input Type</label>
                          <select 
                            value={field.type}
                            onChange={(e) => updateFieldInBuilder(idx, 'type', e.target.value)}
                            className="premium-input"
                            style={{ padding: '8px' }}
                          >
                            <option value="text">Text Input</option>
                            <option value="textarea">Textarea Box</option>
                            <option value="number">Number Box</option>
                            <option value="date">Date picker</option>
                            <option value="select">Dropdown Select</option>
                            <option value="tel">Phone/Mobile Input</option>
                            <option value="checkbox">Multiple Checkbox Options</option>
                            <option value="radio">Radio Button Selection</option>
                            <option value="repeated">Repeated Dynamic Inputs (0-8 Loop)</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-end', height: '36px' }}>
                          <input 
                            type="checkbox" 
                            id={`req-${field.id}`}
                            checked={field.required}
                            onChange={(e) => updateFieldInBuilder(idx, 'required', e.target.checked)}
                          />
                          <label htmlFor={`req-${field.id}`} style={{ fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Required</label>
                        </div>
                      </div>

                      {['select', 'checkbox', 'radio'].includes(field.type) && (
                        <div className="premium-input-group" style={{ marginBottom: 0 }}>
                          <label className="premium-label">Options (comma-separated)</label>
                          <input 
                            type="text"
                            value={field.options ? field.options.join(', ') : ''}
                            onChange={(e) => updateFieldInBuilder(idx, 'options', e.target.value)}
                            placeholder="Option 1, Option 2, Option 3"
                            className="premium-input"
                            style={{ padding: '8px' }}
                          />
                        </div>
                      )}

                      {field.type === 'repeated' && (
                        <div style={{ marginTop: '10px', padding: '12px', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                          <div className="premium-input-group" style={{ marginBottom: '10px' }}>
                            <label className="premium-label" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Limit Range (e.g. "8" or "5-9")</label>
                            <input 
                              type="text"
                              value={field.limit || ''}
                              onChange={(e) => updateFieldInBuilder(idx, 'limit', e.target.value)}
                              placeholder="e.g. 8 (standard 1-8) or 5-9"
                              className="premium-input"
                              style={{ padding: '6px', fontSize: '0.75rem', background: '#ffffff' }}
                            />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#334155' }}>Configure Sub-Fields ({getLimitLabel(field.limit)} Loop)</span>
                            <button
                              type="button"
                              onClick={() => {
                                const list = [...formBuilder.fields];
                                const sub = list[idx].subFields || [];
                                list[idx].subFields = [...sub, { id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, label: '', type: 'text', required: true, options: [] }];
                                setFormBuilder({ ...formBuilder, fields: list });
                              }}
                              className="premium-btn premium-btn-success"
                              style={{ padding: '2px 8px', fontSize: '0.75rem', width: 'auto' }}
                            >
                              + Add Sub-Field
                            </button>
                          </div>
                          {(!field.subFields || field.subFields.length === 0) ? (
                            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, fontStyle: 'italic' }}>No sub-fields added yet. Click "+ Add Sub-Field" to create fields to repeat.</p>
                          ) : (
                            field.subFields.map((subField, sIdx) => (
                              <div key={subField.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px', background: '#ffffff', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--primary)' }}>Sub-Field #{sIdx + 1}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const list = [...formBuilder.fields];
                                      list[idx].subFields = list[idx].subFields.filter((_, i) => i !== sIdx);
                                      setFormBuilder({ ...formBuilder, fields: list });
                                    }}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <input
                                    type="text"
                                    placeholder="Sub-Field Label (e.g. Member Name)"
                                    value={subField.label}
                                    onChange={(e) => {
                                      const list = [...formBuilder.fields];
                                      list[idx].subFields[sIdx].label = e.target.value;
                                      setFormBuilder({ ...formBuilder, fields: list });
                                    }}
                                    className="premium-input"
                                    style={{ padding: '6px', fontSize: '0.75rem', flex: 2 }}
                                    required
                                  />
                                  <select
                                    value={subField.type}
                                    onChange={(e) => {
                                      const list = [...formBuilder.fields];
                                      list[idx].subFields[sIdx].type = e.target.value;
                                      setFormBuilder({ ...formBuilder, fields: list });
                                    }}
                                    className="premium-input"
                                    style={{ padding: '6px', fontSize: '0.75rem', flex: 1.5 }}
                                  >
                                    <option value="text">Text Input</option>
                                    <option value="number">Number Box</option>
                                    <option value="date">Date picker</option>
                                    <option value="select">Dropdown Select</option>
                                  </select>
                                </div>
                                {subField.type === 'select' && (
                                  <input
                                    type="text"
                                    placeholder="Options (comma-separated)"
                                    value={subField.options ? subField.options.join(', ') : ''}
                                    onChange={(e) => {
                                      const list = [...formBuilder.fields];
                                      list[idx].subFields[sIdx].options = e.target.value.split(',').map(x => x.trim()).filter(Boolean);
                                      setFormBuilder({ ...formBuilder, fields: list });
                                    }}
                                    className="premium-input"
                                    style={{ padding: '6px', fontSize: '0.75rem' }}
                                    required
                                  />
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="premium-input-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', marginTop: '10px' }}>
                  <input 
                    type="checkbox" 
                    id="form-coming-soon"
                    checked={formBuilder.coming_soon} 
                    onChange={(e) => setFormBuilder({ ...formBuilder, coming_soon: e.target.checked })} 
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="form-coming-soon" className="premium-label" style={{ margin: 0, cursor: 'pointer', fontWeight: 'bold' }}>
                    Mark as Coming Soon (Upcoming)
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button type="submit" className="premium-btn premium-btn-primary" style={{ flex: 2 }}>
                    {editingFormId ? 'Update Template' : 'Save Form Template'}
                  </button>
                  <button 
                    type="button" 
                    onClick={resetFormBuilder} 
                    className="premium-btn premium-btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Reset
                  </button>
                </div>
              </form>
            </div>

            {/* View Form Templates */}
            <div>
              <h4 style={{ fontSize: '0.95rem', margin: '0 0 12px 16px', color: 'var(--text-light-muted)' }}>
                Configured Templates ({forms.length} Templates)
              </h4>
              {sortItems(forms).map((form, idx) => (
                <div key={form.id} className="premium-card admin-item-card" style={{ alignItems: 'center' }}>
                  {form.img_url && (
                    <div style={{ width: '50px', height: '50px', marginRight: '12px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-light)', flexShrink: 0 }}>
                      <img src={getImageUrl(form.img_url)} alt="Form Image" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                      <span className="badge badge-info">{form.category}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-light-muted)', fontWeight: 600 }}>{safeJsonParse(form.fields).length} custom fields</span>
                    </div>
                    <h4 style={{ fontSize: '0.95rem', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {form.title}
                      {(form.coming_soon === true || String(form.coming_soon).toLowerCase() === 'true') && (
                        <span className="badge badge-warning" style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px' }}>Coming Soon</span>
                      )}
                    </h4>
                    <p className="text-muted" style={{ fontSize: '0.8rem' }}>{form.description}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => moveItem('form', forms, idx, 'up')} className="premium-btn premium-btn-secondary" style={{ width: '36px', height: '36px', padding: 0 }} title="Move Up">↑</button>
                    <button onClick={() => moveItem('form', forms, idx, 'down')} className="premium-btn premium-btn-secondary" style={{ width: '36px', height: '36px', padding: 0 }} title="Move Down">↓</button>
                    <button onClick={() => handleDuplicateForm(form.id)} className="premium-btn premium-btn-success" style={{ width: '36px', height: '36px', padding: 0 }} title="Duplicate Template">
                      <Copy size={16} />
                    </button>
                    <button onClick={() => startEditForm(form)} className="premium-btn premium-btn-secondary" style={{ width: '36px', height: '36px', padding: 0 }} title="Edit Template">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDeleteForm(form.id)} className="premium-btn premium-btn-danger" style={{ width: '36px', height: '36px', padding: 0 }} title="Delete Template">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* --- TAB: SETTINGS --- */}
        {activeTab === 'settings' && (
          <div className="desktop-grid-2">
            <div className="premium-card" style={{ borderTop: '6px solid var(--primary)', alignSelf: 'flex-start' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>
                Platform Settings
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Admin Email */}
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await updateSettings({ admin_email: settings.admin_email });
                    alert('Admin Email saved successfully!');
                  } catch (err) {
                    alert('Failed to save email.');
                  }
                }} className="premium-input-group" style={{ margin: 0 }}>
                  <label className="premium-label">Admin Email Address</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="email" 
                      value={settings.admin_email || ''} 
                      onChange={(e) => setSettings({ ...settings, admin_email: e.target.value })} 
                      placeholder="admin@example.com"
                      className="premium-input" 
                    />
                    <button type="submit" className="premium-btn premium-btn-primary" style={{ width: 'auto', padding: '0 16px' }}>Update</button>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-light-muted)', marginTop: '4px', display: 'block' }}>
                    System notifications will be sent to this email.
                  </span>
                </form>

                {/* Admin WhatsApp Number */}
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const phoneNum = (settings.admin_whatsapp_number || '').trim();
                  if (!phoneNum) {
                    alert('Please enter a WhatsApp number.');
                    return;
                  }
                  try {
                    await updateSettings({ admin_whatsapp_number: phoneNum });
                    alert('Admin WhatsApp Number saved successfully!');
                  } catch (err) {
                    alert('Failed to save WhatsApp number.');
                  }
                }} className="premium-input-group" style={{ margin: 0 }}>
                  <label className="premium-label">Admin WhatsApp Number (for orders & submissions)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      value={settings.admin_whatsapp_number || ''} 
                      onChange={(e) => setSettings({ ...settings, admin_whatsapp_number: e.target.value })} 
                      placeholder="e.g. 919876543210 or 9876543210"
                      className="premium-input" 
                    />
                    <button type="submit" className="premium-btn premium-btn-primary" style={{ width: 'auto', padding: '0 16px' }}>Update</button>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-light-muted)', marginTop: '4px', display: 'block' }}>
                    Orders and form submissions will be routed to this WhatsApp number. Include country code (e.g., 91 for India).
                  </span>
                </form>

                {/* Admin Login Code */}
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await updateSettings({ admin_login_code: settings.admin_login_code });
                    alert('Admin Code saved successfully!');
                  } catch (err) {
                    alert('Failed to save Admin Code.');
                  }
                }} className="premium-input-group" style={{ margin: 0 }}>
                  <label className="premium-label">Admin Login Code (PIN)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      value={settings.admin_login_code || ''} 
                      onChange={(e) => setSettings({ ...settings, admin_login_code: e.target.value })} 
                      placeholder="e.g. 123456"
                      className="premium-input" 
                    />
                    <button type="submit" className="premium-btn premium-btn-primary" style={{ width: 'auto', padding: '0 16px' }}>Update</button>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-light-muted)', marginTop: '4px', display: 'block' }}>
                    Secure 6-digit PIN used to access this Admin Portal.
                  </span>
                </form>

                {/* App Installation Notification Toggle */}
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const isCurrentTrue = String(settings.install_notification_enabled).toLowerCase() === 'true';
                    const newVal = isCurrentTrue ? 'false' : 'true';
                    await updateSettings({ install_notification_enabled: newVal });
                    setSettings({ ...settings, install_notification_enabled: newVal });
                    if (newVal === 'true') {
                      localStorage.removeItem('hide_install_prompt');
                      sessionStorage.removeItem('hide_install_prompt');
                      localStorage.setItem('install_prompt_last_reset', Date.now().toString());
                    }
                    alert(`Installation Notification turned ${newVal === 'true' ? 'ON' : 'OFF'}!`);
                  } catch (err) {
                    alert('Failed to toggle notification setting.');
                  }
                }} className="premium-input-group" style={{ margin: 0 }}>
                  <label className="premium-label">Mobile App Installation Notification</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ flex: 1, padding: '12px 16px', background: '#f8fafc', border: '1.5px solid var(--border-light)', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                      Status: {String(settings.install_notification_enabled).toLowerCase() === 'true' ? <span style={{ color: 'var(--success)' }}>ON (Visible to Users)</span> : <span style={{ color: 'var(--error)' }}>OFF (Hidden)</span>}
                    </div>
                    <button type="submit" className="premium-btn premium-btn-secondary" style={{ width: 'auto', padding: '0 24px', height: '48px' }}>
                      Toggle
                    </button>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-light-muted)', marginTop: '4px', display: 'block' }}>
                    If ON, users will see a prompt suggesting they "Add Subi e sevai to Home Screen".
                  </span>
                </form>

                {/* Payment Number */}
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const num = (settings.payment_number || '').trim();
                  if (!num) {
                    alert('Please enter a payment UPI ID.');
                    return;
                  }
                  if (/^\d{10}$/.test(num)) {
                    const confirmUse = window.confirm(
                      "You entered a 10-digit phone number instead of a full UPI ID / VPA.\n\n" +
                      "For best compatibility, we recommend entering your full UPI ID (e.g., 9385497906@okaxis).\n\n" +
                      "If you proceed, the system will automatically append '@okaxis' when generating Google Pay links for users.\n\n" +
                      "Do you want to save this as a phone number?"
                    );
                    if (!confirmUse) return;
                  }
                  try {
                    await updateSettings({ payment_number: num });
                    alert('Payment UPI ID saved successfully!');
                  } catch (err) {
                    alert('Failed to save Payment UPI ID.');
                  }
                }} className="premium-input-group" style={{ margin: 0 }}>
                  <label className="premium-label">Payment UPI ID / VPA</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      value={settings.payment_number || ''} 
                      onChange={(e) => setSettings({ ...settings, payment_number: e.target.value })} 
                      placeholder="e.g. 9876543210@okaxis"
                      className="premium-input" 
                    />
                    <button type="submit" className="premium-btn premium-btn-primary" style={{ width: 'auto', padding: '0 16px' }}>Update</button>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-light-muted)', marginTop: '4px', display: 'block' }}>
                    Used for direct UPI payments. Enter a full UPI ID (VPA). If you enter just a 10-digit phone number, it will default to Google Pay (@okaxis).
                  </span>
                </form>

                {/* Payment QR */}
                <div className="premium-input-group" style={{ margin: 0 }}>
                  <label className="premium-label">Payment QR Code Upload</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {settings.qr_code_url && (
                      <div style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                        <img src={getImageUrl(settings.qr_code_url)} alt="QR Code" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label className="premium-btn premium-btn-secondary" style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', gap: '6px', cursor: 'pointer', background: 'white', border: '1px dashed var(--primary)', width: 'fit-content' }}>
                        <Upload size={16} style={{ color: 'var(--primary)' }} />
                        <span>{settings.qr_code_url ? 'Replace QR Code' : 'Upload QR Code'}</span>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (file) {
                              try {
                                const resized = await resizeQRImage(file);
                                const url = await uploadFileToDrive(resized, ["WhatsBroTNService_Uploads", "System_Settings"]);
                                setSettings({ ...settings, qr_code_url: url });
                                await updateSettings({ qr_code_url: url });
                                alert('QR Code updated successfully!');
                              } catch (err) {
                                alert("Failed to upload QR code: " + err.message);
                              }
                            }
                          }}
                          style={{ display: 'none' }}
                        />
                      </label>
                      {settings.qr_code_url && (
                        <button 
                          type="button" 
                          onClick={async () => {
                            setSettings({ ...settings, qr_code_url: '' });
                            await updateSettings({ qr_code_url: '' });
                            alert('QR Code deleted successfully!');
                          }}
                          className="premium-btn premium-btn-danger" 
                          style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', gap: '6px', cursor: 'pointer', width: 'fit-content' }}
                        >
                          <Trash2 size={16} /> Delete QR Code
                        </button>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-light-muted)', display: 'block', marginTop: '4px' }}>
                    Upload your GPay/UPI QR Code image. If uploaded, it will be shown to users instead of a dynamically generated one. If hidden, the QR section will be removed.
                  </span>
                </div>

                {/* OG Image Upload - Path to Slug Local Dev Manager */}
                <div className="premium-input-group" style={{ margin: 0, borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
                  <label className="premium-label" style={{ marginBottom: '4px', fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-light-main)' }}>
                    Open Graph (OG) Image Upload (Local Dev Only)
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-light-muted)', display: 'block', marginBottom: '16px', lineHeight: '1.4' }}>
                    Upload any image (square, landscape, or letterboxed). Enter the target path to set the OG image for (e.g. <code>/form/form-slzjghgr</code> or <code>/post/post-101</code> or <code>/</code>). The local development server will automatically crop, resize, compress, and save it to the corresponding asset file in your public directory.
                  </span>

                  {/* Single Upload Card for Custom Path */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1.5px solid var(--border-light)',
                    borderRadius: '16px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    marginBottom: '24px'
                  }}>
                    {/* Path / Slug Input */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1e293b' }}>
                        Target Path / Route (Path to Slug) *
                      </label>
                      <input 
                        type="text" 
                        value={ogCustomPath} 
                        onChange={(e) => setOgCustomPath(e.target.value)}
                        placeholder="e.g. /form/form-slzjghgr or /post/post-101 or /"
                        className="premium-input"
                        style={{ padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '0.85rem', width: '100%', fontWeight: '600', color: 'var(--primary)' }}
                      />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-light-muted)' }}>
                        Quick Select: {' '}
                        <button type="button" onClick={() => setOgCustomPath('/form/form-slzjghgr')} style={{ border: 'none', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px', padding: '2px 6px', fontSize: '0.65rem', cursor: 'pointer', fontWeight: '700' }}>/form/[slug]</button> {' '}
                        <button type="button" onClick={() => setOgCustomPath('/post/post-101')} style={{ border: 'none', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px', padding: '2px 6px', fontSize: '0.65rem', cursor: 'pointer', fontWeight: '700' }}>/post/[slug]</button> {' '}
                        <button type="button" onClick={() => setOgCustomPath('/job/job-202')} style={{ border: 'none', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px', padding: '2px 6px', fontSize: '0.65rem', cursor: 'pointer', fontWeight: '700' }}>/job/[slug]</button> {' '}
                        <button type="button" onClick={() => setOgCustomPath('/')} style={{ border: 'none', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px', padding: '2px 6px', fontSize: '0.65rem', cursor: 'pointer', fontWeight: '700' }}>/ (Default Fallback)</button>
                      </span>
                    </div>

                    {/* Aspect Ratio & File Upload Row */}
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '180px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light-muted)' }}>Target Aspect Ratio</label>
                        <div className="premium-input" style={{ padding: '8px 10px', fontSize: '0.8rem', height: '38px', width: '100%', display: 'flex', alignItems: 'center', fontWeight: 700, color: 'var(--primary)' }}>
                          1.91:1 Landscape (1200x630)
                        </div>
                      </div>

                      <div style={{ flexShrink: 0 }}>
                        <label className="premium-btn premium-btn-primary" style={{ padding: '10px 18px', fontSize: '0.85rem', display: 'flex', gap: '8px', cursor: 'pointer', margin: 0, height: '38px', alignItems: 'center' }}>
                          <Upload size={16} />
                          <span>Upload & Save Asset</span>
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files[0];
                              if (!file) return;
                              if (!ogCustomPath.trim()) {
                                alert("Please enter a Target Path first (e.g. /form/form-slzjghgr).");
                                return;
                              }
                              
                              if (!['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)) {
                                alert("This feature is only available during local development (localhost) because it writes directly to your local 'public/' directory.");
                                return;
                              }

                              const normalizedTarget = normalizeOgTargetPath(ogCustomPath.trim());
                              if (!normalizedTarget.valid) {
                                alert(normalizedTarget.error || 'Invalid target path.');
                                return;
                              }

                              const existingRecord = ogSavedList[normalizedTarget.routeKey];
                              try {
                                const resData = await saveLocalOgImage({
                                  targetPath: normalizedTarget.targetPath,
                                  targetUrl: normalizedTarget.targetPath,
                                  imageFile: file,
                                  aspect: 'landscape',
                                  overwrite: Boolean(existingRecord),
                                  previousKey: existingRecord?.target_path || ''
                                });

                                if (resData?.success) {
                                  alert(`✅ OG Image for '${normalizedTarget.targetPath}' successfully auto-cropped, compressed, and saved locally! Run 'git push' to deploy.`);
                                  fetchLocalOgList();
                                } else {
                                  alert("Failed to process image: " + (resData?.error || 'Unknown error'));
                                }
                              } catch (err) {
                                alert("Error uploading image: " + err.message);
                              }
                            }}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Saved Local OG Images List */}
                  <div style={{ marginTop: '20px', borderTop: '1px dashed var(--border-light)', paddingTop: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: '800', margin: 0, color: 'var(--text-light-main)' }}>
                        Saved Local OG Image Links ({Object.keys(ogSavedList).length})
                      </h4>
                      <button 
                        type="button" 
                        onClick={fetchLocalOgList} 
                        className="premium-btn premium-btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '0.75rem', width: 'auto' }}
                      >
                        Refresh List
                      </button>
                    </div>

                    {Object.keys(ogSavedList).length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border-light)', fontSize: '0.82rem', color: 'var(--text-light-muted)' }}>
                        No custom OG image paths saved yet. Enter a path above and click Upload & Save Asset!
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {Object.entries(ogSavedList).map(([key, item]) => (
                          <div key={key} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            padding: '14px 16px',
                            background: 'white',
                            border: '1px solid var(--border-light)',
                            borderRadius: '12px',
                            boxShadow: 'var(--shadow-sm)',
                            flexWrap: 'wrap'
                          }}>
                            {/* Thumbnail preview */}
                            <div style={{ width: '120px', height: '64px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1', background: '#e2e8f0', flexShrink: 0 }}>
                              <img 
                                src={`${item.image || item.local_asset_path || '/income_og_preview.jpg'}?t=${Date.now()}`} 
                                alt={key} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                onError={(e) => { e.target.src = '/whatsbro_logo.png'; }}
                              />
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: '160px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--primary)', wordBreak: 'break-all' }}>
                                  {item.target_path || item.target_url || `/form/${key}`}
                                </span>
                                <span style={{ fontSize: '0.65rem', background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '4px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                                  ID: {key}
                                </span>
                                <span style={{ fontSize: '0.65rem', background: '#ecfccb', color: '#3f6212', padding: '1px 6px', borderRadius: '4px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                                  {item.route_type || 'route'}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.7rem', color: '#475569', display: 'block' }}>
                                Slug: {item.slug || key}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace', display: 'block', wordBreak: 'break-all' }}>
                                Asset: {item.local_asset_path || item.asset_path || `public/uploads/${item.image?.split('/').pop() || ''}`}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace', display: 'block' }}>
                                Page: {item.public_page_url || item.public_url || item.target_url || ''}
                              </span>
                              {item.title && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-light-muted)', display: 'block', marginTop: '2px' }}>
                                  Title: {item.title}
                                </span>
                              )}
                              {item.created_at && (
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                                  Created: {new Date(item.created_at).toLocaleString()}
                                </span>
                              )}
                              {item.updated_at && item.updated_at !== item.created_at && (
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>
                                  Updated: {new Date(item.updated_at).toLocaleString()}
                                </span>
                              )}
                            </div>

                            {/* Actions: Edit & Delete */}
                            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setOgCustomPath(item.target_path || item.target_url || `/form/${key}`);
                                  if (item.title) setOgTitle(item.title);
                                  if (item.description) setOgDescription(item.description);
                                  window.scrollTo({ top: 350, behavior: 'smooth' });
                                }}
                                className="premium-btn premium-btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '0.75rem', width: 'auto', margin: 0 }}
                              >
                                ✏️ Edit / Replace
                              </button>

                              <button
                                type="button"
                                onClick={async () => {
                                  if (!window.confirm(`Are you sure you want to delete local OG image for '${key}'?`)) return;
                                  try {
                                    const res = await fetch('/api/delete-og-image', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        key: key,
                                        targetPath: item.target_path || item.target_url || key,
                                        slug: item.slug || key,
                                        path: item.target_path || key
                                      })
                                    });
                                    const contentType = res.headers.get('content-type') || '';
                                    if (!res.ok || contentType.includes('text/html')) {
                                      alert("⚠️ Local dev server plugin needs a restart!\n\nPlease stop 'npm run dev' in your terminal (Ctrl + C) and run 'npm run dev' again so Vite loads the /api/delete-og-image handler.");
                                      return;
                                    }
                                    const data = await res.json();
                                    if (data.success) {
                                      alert("✅ OG image deleted successfully!");
                                      fetchLocalOgList();
                                    } else {
                                      alert("Delete failed: " + (data.error || 'Unknown error'));
                                    }
                                  } catch (err) {
                                    alert("⚠️ Local dev server plugin needs a restart!\n\nPlease stop 'npm run dev' in your terminal (Ctrl + C) and run 'npm run dev' again so Vite loads the /api/delete-og-image handler.");
                                  }
                                }}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '0.75rem',
                                  borderRadius: '8px',
                                  border: '1px solid #fecaca',
                                  background: '#fef2f2',
                                  color: '#dc2626',
                                  fontWeight: '700',
                                  cursor: 'pointer'
                                }}
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Public Announcement / Alert Notification Manager */}
                <div style={{ borderTop: '1.5px dashed var(--border-light)', paddingTop: '20px', marginTop: '20px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-light-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Megaphone size={18} style={{ color: 'var(--primary)' }} />
                    Public Announcement Manager
                  </h3>
                  
                  {/* Form to Create/Edit Announcement */}
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!annForm.title.trim()) {
                      alert('Please enter an announcement title.');
                      return;
                    }
                    try {
                      if (editingAnnId) {
                        const updated = await updateAnnouncement(editingAnnId, annForm);
                        setAnnouncements(updated);
                        setEditingAnnId(null);
                        alert('Announcement updated successfully!');
                      } else {
                        await createAnnouncement(annForm);
                        const updatedList = await getAnnouncements();
                        setAnnouncements(updatedList);
                        alert('Announcement created successfully!');
                      }
                      setAnnForm({
                        title: '',
                        description: '',
                        content: '',
                        button_name: '',
                        button_url: '',
                        enabled: 'true'
                      });
                    } catch (err) {
                      alert('Failed to save announcement: ' + err.message);
                    }
                  }} className="premium-card" style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-light-main)', fontWeight: '800' }}>
                      {editingAnnId ? 'Edit Announcement' : 'Add New Announcement'}
                    </h4>
                    
                    <div>
                      <label className="premium-label" style={{ fontSize: '0.75rem' }}>Announcement Title</label>
                      <input 
                        type="text" 
                        value={annForm.title} 
                        onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })} 
                        placeholder="e.g. Server Maintenance / Important Update"
                        className="premium-input" 
                        style={{ padding: '8px 12px', fontSize: '0.85rem', height: '38px' }}
                      />
                    </div>
                    
                    <div>
                      <label className="premium-label" style={{ fontSize: '0.75rem' }}>Brief Description (Shows in preview)</label>
                      <input 
                        type="text" 
                        value={annForm.description} 
                        onChange={(e) => setAnnForm({ ...annForm, description: e.target.value })} 
                        placeholder="e.g. Service offline on Sunday from 2 PM to 5 PM."
                        className="premium-input" 
                        style={{ padding: '8px 12px', fontSize: '0.85rem', height: '38px' }}
                      />
                    </div>

                    <div>
                      <label className="premium-label" style={{ fontSize: '0.75rem' }}>Detailed Content (Shows inside Popup Modal)</label>
                      <textarea 
                        value={annForm.content} 
                        onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })} 
                        placeholder="Provide detailed instructions, timings or contact info..."
                        className="premium-input" 
                        rows={3}
                        style={{ resize: 'vertical', fontFamily: 'inherit', padding: '8px 12px', fontSize: '0.85rem' }}
                      />
                    </div>

                    {/* Button Config */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label className="premium-label" style={{ fontSize: '0.75rem' }}>Action Button Label (Optional)</label>
                        <input 
                          type="text" 
                          value={annForm.button_name} 
                          onChange={(e) => setAnnForm({ ...annForm, button_name: e.target.value })} 
                          placeholder="e.g. Learn More / View Document"
                          className="premium-input" 
                          style={{ padding: '8px 12px', fontSize: '0.85rem', height: '38px' }}
                        />
                      </div>
                      <div>
                        <label className="premium-label" style={{ fontSize: '0.75rem' }}>Action Button URL (Optional)</label>
                        <input 
                          type="text" 
                          value={annForm.button_url} 
                          onChange={(e) => setAnnForm({ ...annForm, button_url: e.target.value })} 
                          placeholder="e.g. https://example.com/info"
                          className="premium-input" 
                          style={{ padding: '8px 12px', fontSize: '0.85rem', height: '38px' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <button type="submit" className="premium-btn premium-btn-primary" style={{ width: 'auto', padding: '0 16px', height: '38px', fontSize: '0.8rem' }}>
                        {editingAnnId ? 'Update Announcement' : 'Add Announcement'}
                      </button>
                      {editingAnnId && (
                        <button 
                          type="button" 
                          onClick={() => {
                            setEditingAnnId(null);
                            setAnnForm({ title: '', description: '', content: '', button_name: '', button_url: '', enabled: 'true' });
                          }}
                          className="premium-btn premium-btn-secondary" 
                          style={{ width: 'auto', padding: '0 16px', height: '38px', fontSize: '0.8rem' }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>

                  {/* List of Current Announcements */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                    <h4 style={{ margin: '8px 0', fontSize: '0.9rem', color: '#475569', fontWeight: '800', textAlign: 'left' }}>Active Announcements ({announcements.length})</h4>
                    {announcements.length === 0 ? (
                      <p style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', margin: 0, textAlign: 'left' }}>No announcements added yet.</p>
                    ) : (
                      announcements.map((ann) => {
                        const isEnabled = String(ann.enabled).toLowerCase() === 'true';
                        return (
                          <div key={ann.id} style={{ background: '#ffffff', border: '1.5px solid var(--border-light)', borderRadius: '10px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left', flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: '800', fontSize: '0.85rem', color: '#1e293b' }}>{ann.title}</span>
                                <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', background: isEnabled ? '#dcfce7' : '#fee2e2', color: isEnabled ? '#15803d' : '#b91c1c' }}>
                                  {isEnabled ? 'ACTIVE' : 'DISABLED'}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.75rem', color: '#475569', lineHeight: '1.4' }}>{ann.description || '(No description)'}</span>
                              {ann.button_name && ann.button_url && (
                                <span style={{ fontSize: '0.65rem', color: '#0f766e', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                  🔗 Link Button: "{ann.button_name}" ({ann.button_url})
                                </span>
                              )}
                            </div>
                            
                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                              <button 
                                type="button"
                                onClick={async () => {
                                  try {
                                    const nextVal = isEnabled ? 'false' : 'true';
                                    const updated = await updateAnnouncement(ann.id, { enabled: nextVal });
                                    setAnnouncements(updated);
                                    alert(`Announcement turned ${nextVal === 'true' ? 'ON' : 'OFF'}!`);
                                  } catch (err) {
                                    alert('Failed to toggle announcement: ' + err.message);
                                  }
                                }}
                                className={`premium-btn ${isEnabled ? 'premium-btn-secondary' : 'premium-btn-success'}`}
                                style={{ padding: '6px 10px', fontSize: '0.75rem', height: '32px', width: 'auto', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                              >
                                {isEnabled ? 'Disable' : 'Enable'}
                              </button>
                              
                              <button 
                                type="button"
                                onClick={() => {
                                  setEditingAnnId(ann.id);
                                  setAnnForm({
                                    title: ann.title || '',
                                    description: ann.description || '',
                                    content: ann.content || '',
                                    button_name: ann.button_name || '',
                                    button_url: ann.button_url || '',
                                    enabled: ann.enabled || 'true'
                                  });
                                }}
                                className="premium-btn premium-btn-secondary"
                                style={{ padding: '6px 8px', fontSize: '0.75rem', height: '32px', width: 'auto', display: 'flex', alignItems: 'center', gap: '4px', border: 'none', cursor: 'pointer' }}
                              >
                                <Edit size={12} /> Edit
                              </button>

                              <button 
                                type="button"
                                onClick={async () => {
                                  const confirmDelete = window.confirm('Are you sure you want to delete this announcement?');
                                  if (!confirmDelete) return;
                                  try {
                                    await deleteAnnouncement(ann.id);
                                    setAnnouncements(announcements.filter(a => a.id !== ann.id));
                                    alert('Announcement deleted!');
                                  } catch (err) {
                                    alert('Failed to delete announcement: ' + err.message);
                                  }
                                }}
                                className="premium-btn premium-btn-danger"
                                style={{ padding: '6px 8px', fontSize: '0.75rem', height: '32px', width: 'auto', display: 'flex', alignItems: 'center', gap: '4px', border: 'none', cursor: 'pointer' }}
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic OG Redirect Link Generator (Settings Tab Column 2) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              <div className="premium-card" style={{ borderTop: '6px solid var(--primary)', margin: 0 }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', color: 'var(--text-light-main)', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                  Create Redirect Link
                </h3>
                
                <form onSubmit={handleOgGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  
                  {/* OG Image Upload */}
                  <div className="premium-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: 0 }}>
                    <label className="premium-label" style={{ fontWeight: '700', fontSize: '0.85rem' }}>Upload OG Image *</label>
                    
                    <div style={{
                      border: '2px dashed var(--primary)',
                      borderRadius: '12px',
                      padding: '24px 16px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: ogImagePreview ? 'rgba(30, 168, 103, 0.02)' : 'var(--bg-light)',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleOgImageChange}
                        required={!ogImageFile}
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
                      
                      {!ogImagePreview ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <Upload size={32} style={{ color: 'var(--primary)' }} />
                          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-light-main)' }}>Click to upload cover image</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-light-muted)' }}>PNG, JPG, or WEBP (Recommended: 1200x630px)</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                          <img 
                            src={ogImagePreview} 
                            alt="Cover upload" 
                            style={{ width: '80px', height: '50px', objectFit: 'cover', borderRadius: '6px', pointerEvents: 'none' }}
                          />
                          <div style={{ textAlign: 'left', flex: 1 }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-light-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                              {ogImageFile.name}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-light-muted)' }}>
                              {(ogImageFile.size / 1024).toFixed(1)} KB (Change Image)
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setOgImageFile(null);
                              setOgImagePreview('');
                              setOgIsGenerated(false);
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
                  <div className="premium-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: 0 }}>
                    <label className="premium-label" style={{ fontWeight: '700', fontSize: '0.85rem' }}>Auto Crop & Resize Format</label>
                    <select
                      value={ogAspect}
                      onChange={(e) => setOgAspect(e.target.value)}
                      className="premium-input"
                      style={{ padding: '8px 12px', fontSize: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}
                    >
                      <option value="landscape">1.91:1 Landscape (1200×630px - Recommended for WhatsApp)</option>
                      <option value="square">1:1 Square (1024×1024px)</option>
                    </select>
                  </div>

                  {/* Target URL */}
                  <div className="premium-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: 0 }}>
                    <label className="premium-label" style={{ fontWeight: '700', fontSize: '0.85rem' }}>Target URL *</label>
                    <input 
                      type="text" 
                      value={ogTargetUrl} 
                      onChange={(e) => handleOgTargetUrlChange(e.target.value)} 
                      placeholder="https://subionlineservice.vercel.app/user?tab=jobs:JOB759562"
                      required
                      className="premium-input"
                      style={{ padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '0.85rem', width: '100%' }}
                    />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-light-muted)' }}>
                      Paste your target link (e.g. <code>https://subi-eseva-service.vercel.app/form/form-slzjghgr</code>). Upload your OG cover image and click save!
                    </span>
                  </div>

                  {/* Title */}
                  <div className="premium-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: 0 }}>
                    <label className="premium-label" style={{ fontWeight: '700', fontSize: '0.85rem' }}>Title</label>
                    <input 
                      type="text" 
                      value={ogTitle} 
                      onChange={handleOgTitleChange} 
                      placeholder="e.g. TNPSC Recruitment (Optional)"
                      className="premium-input"
                      style={{ padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '0.85rem', width: '100%' }}
                    />
                  </div>

                  {/* Description */}
                  <div className="premium-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: 0 }}>
                    <label className="premium-label" style={{ fontWeight: '700', fontSize: '0.85rem' }}>Description</label>
                    <textarea 
                      value={ogDescription} 
                      onChange={(e) => { setOgDescription(e.target.value); setOgIsGenerated(false); }} 
                      placeholder="Latest updates on TNPSC Recruitment (Optional)"
                      className="premium-input"
                      rows={3}
                      style={{ padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '0.85rem', width: '100%', fontFamily: 'inherit', resize: 'vertical' }}
                    />
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={ogIsGenerating}
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
                      opacity: ogIsGenerating ? 0.7 : 1
                    }}
                  >
                    {ogIsGenerating ? 'Saving OG Image...' : 'Save OG Image for Link'}
                  </button>
                </form>
              </div>

              {/* Live WhatsApp Preview Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '0.95rem', margin: 0, fontWeight: '700', color: 'var(--text-light-main)' }}>
                  Live WhatsApp Preview
                </h4>
                
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
                      {ogImagePreview ? (
                        <div style={{ width: '100%', height: '160px', overflow: 'hidden' }}>
                          <img 
                            src={ogImagePreview} 
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
                          {ogTitle || "Link Title"}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#667781', lineHeight: '1.2', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {ogDescription || "Link preview description will appear here..."}
                        </div>
                      </div>
                    </div>

                    {/* Share Link text */}
                    <div style={{ fontSize: '0.85rem', color: '#1f2c34', wordBreak: 'break-all', padding: '4px 6px 0px 4px' }}>
                      {ogTargetUrl || `${window.location.origin}/form/form-slzjghgr`}
                    </div>

                    {/* Timestamp & double tick */}
                    <div style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: '#667781', marginTop: '2px' }}>
                      <span>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                      <span style={{ color: '#53bdeb', fontWeight: 'bold' }}>✓✓</span>
                    </div>

                  </div>
                </div>
              </div>

              {/* Active Redirect Links Section */}
              <div className="premium-card" style={{ borderTop: '6px solid var(--info)', margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                  <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: '800' }}>Active Redirect Links ({redirects.length})</h3>
                  <button 
                    onClick={handleRefreshRedirects} 
                    className="premium-btn premium-btn-secondary" 
                    style={{ width: 'auto', padding: '6px 12px', fontSize: '0.75rem', margin: 0 }}
                  >
                    Refresh List
                  </button>
                </div>

                {loadingRedirects ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-light-muted)' }}>Loading redirect links...</div>
                ) : redirects.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-light-muted)' }}>No redirect links created yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '450px', overflowY: 'auto', paddingRight: '4px' }}>
                    {redirects.map((red) => {
                      const redirectUrl = `${window.location.origin}/go/${red.id}`;
                      return (
                        <div key={red.id} style={{
                          display: 'flex',
                          gap: '12px',
                          padding: '12px',
                          border: '1px solid var(--border-light)',
                          borderRadius: '12px',
                          background: '#f8fafc',
                          alignItems: 'center'
                        }}>
                          {red.img_url ? (
                            <img 
                              src={red.img_url} 
                              alt={red.title} 
                              style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            />
                          ) : (
                            <div style={{ width: '60px', height: '40px', background: '#cbd5e1', borderRadius: '6px' }} />
                          )}

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: '800', margin: '0 0 2px 0', color: 'var(--text-light-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {red.title || red.id}
                            </h4>
                            <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '700', wordBreak: 'break-all' }}>
                              {redirectUrl}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-light-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              Destination: {red.target_url}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button 
                              onClick={() => handleOgCopyLink(redirectUrl)}
                              className="premium-btn premium-btn-secondary"
                              style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0 }}
                              title="Copy URL"
                            >
                              <Copy size={14} />
                            </button>
                            <a 
                              href={red.target_url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="premium-btn premium-btn-secondary"
                              style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0, color: 'var(--text-light-main)' }}
                              title="Visit Destination"
                            >
                              <ExternalLink size={14} />
                            </a>
                            <button 
                              onClick={() => handleDeleteRedirect(red.id)}
                              className="premium-btn premium-btn-danger"
                              style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0 }}
                              title="Delete Link"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* --- TAB: OG REDIRECTS --- */}
        {activeTab === 'og' && (
          <div className="desktop-grid-2">
            
            {/* Create / Form Section */}
            <div className="premium-card" style={{ borderTop: '6px solid var(--primary)', alignSelf: 'flex-start' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', color: 'var(--text-light-main)', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                Create Redirect Link
              </h3>
              
              <form onSubmit={handleOgGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                
                {/* OG Image Upload */}
                <div className="premium-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="premium-label" style={{ fontWeight: '700', fontSize: '0.85rem' }}>Upload OG Image *</label>
                  
                  <div style={{
                    border: '2px dashed var(--primary)',
                    borderRadius: '12px',
                    padding: '24px 16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: ogImagePreview ? 'rgba(30, 168, 103, 0.02)' : 'var(--bg-light)',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleOgImageChange}
                      required={!ogImageFile}
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
                    
                    {!ogImagePreview ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <Upload size={32} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-light-main)' }}>Click to upload cover image</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-light-muted)' }}>PNG, JPG, or WEBP (Recommended: 1200x630px)</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                        <img 
                          src={ogImagePreview} 
                          alt="Cover upload" 
                          style={{ width: '80px', height: '50px', objectFit: 'cover', borderRadius: '6px', pointerEvents: 'none' }}
                        />
                        <div style={{ textAlign: 'left', flex: 1 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-light-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                            {ogImageFile.name}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-light-muted)' }}>
                            {(ogImageFile.size / 1024).toFixed(1)} KB (Change Image)
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setOgImageFile(null);
                            setOgImagePreview('');
                            setOgIsGenerated(false);
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
                    value={ogTargetUrl} 
                    onChange={(e) => { setOgTargetUrl(e.target.value); setOgIsGenerated(false); }} 
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
                    value={ogTitle} 
                    onChange={handleOgTitleChange} 
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
                    value={ogDescription} 
                    onChange={(e) => { setOgDescription(e.target.value); setOgIsGenerated(false); }} 
                    placeholder="Latest updates on TNPSC Recruitment"
                    className="premium-input"
                    rows={3}
                    style={{ padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '0.85rem', width: '100%', fontFamily: 'inherit', resize: 'vertical' }}
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={ogIsGenerating}
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
                    opacity: ogIsGenerating ? 0.7 : 1
                  }}
                >
                  {ogIsGenerating ? 'Saving OG Image...' : 'Save OG Image for Link'}
                </button>
              </form>
            </div>

            {/* Right Column: Preview and Redirects List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Live WhatsApp Preview Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                      {ogImagePreview ? (
                        <div style={{ width: '100%', height: '160px', overflow: 'hidden' }}>
                          <img 
                            src={ogImagePreview} 
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
                          {ogTitle || "Link Title"}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#667781', lineHeight: '1.2', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {ogDescription || "Link preview description will appear here..."}
                        </div>
                      </div>
                    </div>

                    {/* Share Link text */}
                    <div style={{ fontSize: '0.85rem', color: '#1f2c34', wordBreak: 'break-all', padding: '4px 6px 0px 4px' }}>
                      {ogTargetUrl || `${window.location.origin}/form/form-slzjghgr`}
                    </div>

                    {/* Timestamp & double tick */}
                    <div style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: '#667781', marginTop: '2px' }}>
                      <span>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                      <span style={{ color: '#53bdeb', fontWeight: 'bold' }}>✓✓</span>
                    </div>

                  </div>
                </div>
              </div>

              {/* Active Redirect Links Section */}
              <div className="premium-card" style={{ borderTop: '6px solid var(--info)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                  <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: '800' }}>Active Redirect Links ({redirects.length})</h3>
                  <button 
                    onClick={handleRefreshRedirects} 
                    className="premium-btn premium-btn-secondary" 
                    style={{ width: 'auto', padding: '6px 12px', fontSize: '0.75rem', margin: 0 }}
                  >
                    Refresh List
                  </button>
                </div>

                {loadingRedirects ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-light-muted)' }}>Loading redirect links...</div>
                ) : redirects.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-light-muted)' }}>No redirect links created yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '450px', overflowY: 'auto', paddingRight: '4px' }}>
                    {redirects.map((red) => {
                      const redirectUrl = `${window.location.origin}/go/${red.id}`;
                      return (
                        <div key={red.id} style={{
                          display: 'flex',
                          gap: '12px',
                          padding: '12px',
                          border: '1px solid var(--border-light)',
                          borderRadius: '12px',
                          background: '#f8fafc',
                          alignItems: 'center'
                        }}>
                          {red.img_url ? (
                            <img 
                              src={red.img_url} 
                              alt={red.title} 
                              style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            />
                          ) : (
                            <div style={{ width: '60px', height: '40px', background: '#cbd5e1', borderRadius: '6px' }} />
                          )}

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: '800', margin: '0 0 2px 0', color: 'var(--text-light-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {red.title || red.id}
                            </h4>
                            <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '700', wordBreak: 'break-all' }}>
                              {redirectUrl}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-light-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              Destination: {red.target_url}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button 
                              onClick={() => handleOgCopyLink(redirectUrl)}
                              className="premium-btn premium-btn-secondary"
                              style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0 }}
                              title="Copy URL"
                            >
                              <Copy size={14} />
                            </button>
                            <a 
                              href={red.target_url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="premium-btn premium-btn-secondary"
                              style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0, color: 'var(--text-light-main)' }}
                              title="Visit Destination"
                            >
                              <ExternalLink size={14} />
                            </a>
                            <button 
                              onClick={() => handleDeleteRedirect(red.id)}
                              className="premium-btn premium-btn-danger"
                              style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0 }}
                              title="Delete Link"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* --- TAB 6: ACCESSORIES & TEMPERED GLASS PRODUCT MANAGEMENT --- */}
        {activeTab === 'products' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Sub-tabs toggles */}
            <div style={{ display: 'flex', gap: '10px', background: '#f1f5f9', padding: '6px', borderRadius: '12px', margin: '0 0 10px 0' }}>
              <button
                type="button"
                onClick={() => setProductSubTab('accessories')}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  backgroundColor: productSubTab === 'accessories' ? '#ffffff' : 'transparent',
                  color: productSubTab === 'accessories' ? 'var(--primary)' : '#64748b',
                  boxShadow: productSubTab === 'accessories' ? 'var(--shadow-sm)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                🛍️ Accessories Catalog
              </button>
              <button
                type="button"
                onClick={() => setProductSubTab('tempered_glass')}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  backgroundColor: productSubTab === 'tempered_glass' ? '#ffffff' : 'transparent',
                  color: productSubTab === 'tempered_glass' ? 'var(--primary)' : '#64748b',
                  boxShadow: productSubTab === 'tempered_glass' ? 'var(--shadow-sm)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                📱 Tempered Glass Box list
              </button>
            </div>

            {productSubTab === 'accessories' ? (
              <div className="desktop-grid-2">
                
                {/* 1. ADD / EDIT ACCESSORY FORM PANEL */}
                <div className="premium-card" id="product-editor-form" style={{ borderTop: '6px solid var(--primary)', alignSelf: 'flex-start', margin: 0 }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>
                    {editingProductId ? '📝 Edit Accessory Product' : '➕ Add New Accessory'}
                  </h3>
                  
                  <form onSubmit={handleProductSubmit}>
                    
                    <div className="premium-input-group">
                      <label className="premium-label">Accessory Category *</label>
                      <select
                        value={productForm.Category}
                        onChange={(e) => {
                          const cat = e.target.value;
                          setProductForm(prev => ({
                            ...prev,
                            Category: cat,
                            CoverType: cat === 'Phone Cover' ? 'Case' : '',
                            Brand: cat === 'Phone Cover' ? 'Samsung' : '',
                            CustomBrand: '',
                            ModelName: '',
                            ProductName: '',
                            Type: ''
                          }));
                        }}
                        className="premium-input"
                        required
                      >
                        {['Phone Cover', 'Headphone', 'Speaker', 'Charger', 'Charger Cable', 'Other Accessories'].map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    {/* DYNAMIC FIELD RENDERING */}
                    
                    {/* Category = Phone Cover */}
                    {productForm.Category === 'Phone Cover' && (
                      <>
                        <div className="premium-input-group">
                          <label className="premium-label">Cover Type *</label>
                          <select
                            value={productForm.CoverType}
                            onChange={(e) => setProductForm({ ...productForm, CoverType: e.target.value })}
                            className="premium-input"
                            required
                          >
                            <option value="Case">Case</option>
                            <option value="Flip Case">Flip Case</option>
                            <option value="Button Case">Button Case</option>
                          </select>
                        </div>

                        <div className="premium-input-group">
                          <label className="premium-label">Brand *</label>
                          <select
                            value={productForm.Brand}
                            onChange={(e) => setProductForm({ ...productForm, Brand: e.target.value, CustomBrand: e.target.value === 'Other' ? '' : productForm.CustomBrand })}
                            className="premium-input"
                            required
                          >
                            {['Samsung', 'Apple', 'Xiaomi (Redmi)', 'Vivo', 'OPPO', 'realme', 'OnePlus', 'POCO', 'Motorola', 'Nokia', 'Google Pixel', 'Huawei', 'Honor', 'Infinix', 'Tecno', 'iQOO', 'Sony', 'ASUS', 'Nothing', 'Lenovo', 'Micromax', 'Lava', 'Karbonn', 'Itel', 'HTC', 'Other'].map(b => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </select>
                        </div>

                        {productForm.Brand === 'Other' && (
                          <div className="premium-input-group">
                            <label className="premium-label">Custom Brand Name *</label>
                            <input
                              type="text"
                              value={productForm.CustomBrand}
                              onChange={(e) => setProductForm({ ...productForm, CustomBrand: e.target.value })}
                              placeholder="Enter brand name"
                              className="premium-input"
                              required
                            />
                          </div>
                        )}

                        <div className="premium-input-group">
                          <label className="premium-label">Model Name *</label>
                          <input
                            type="text"
                            value={productForm.ModelName}
                            onChange={(e) => {
                              const model = e.target.value;
                              const displayBrand = productForm.Brand === 'Other' ? productForm.CustomBrand : productForm.Brand;
                              setProductForm(prev => ({
                                ...prev,
                                ModelName: model,
                                ProductName: `${displayBrand} ${model} ${prev.CoverType}`
                              }));
                            }}
                            placeholder="e.g. S24 Ultra, iPhone 15 Pro"
                            className="premium-input"
                            required
                          />
                        </div>
                      </>
                    )}

                    {/* Category = Headphone / Speaker */}
                    {(productForm.Category === 'Headphone' || productForm.Category === 'Speaker') && (
                      <div className="premium-input-group">
                        <label className="premium-label">Product Name *</label>
                        <input
                          type="text"
                          value={productForm.ProductName}
                          onChange={(e) => setProductForm({ ...productForm, ProductName: e.target.value })}
                          placeholder="e.g. BassBoost Wireless Headphone"
                          className="premium-input"
                          required
                        />
                      </div>
                    )}

                    {/* Category = Charger */}
                    {productForm.Category === 'Charger' && (
                      <>
                        <div className="premium-input-group">
                          <label className="premium-label">Charger Type *</label>
                          <input
                            type="text"
                            value={productForm.Type}
                            onChange={(e) => setProductForm({ ...productForm, Type: e.target.value })}
                            placeholder="e.g. 33W Fast Charger, Dual Port USB-C"
                            className="premium-input"
                            required
                          />
                        </div>
                        <div className="premium-input-group">
                          <label className="premium-label">Product Name *</label>
                          <input
                            type="text"
                            value={productForm.ProductName}
                            onChange={(e) => setProductForm({ ...productForm, ProductName: e.target.value })}
                            placeholder="e.g. SuperCharge Adapter"
                            className="premium-input"
                            required
                          />
                        </div>
                      </>
                    )}

                    {/* Category = Charger Cable */}
                    {productForm.Category === 'Charger Cable' && (
                      <>
                        <div className="premium-input-group">
                          <label className="premium-label">Cable Type *</label>
                          <input
                            type="text"
                            value={productForm.Type}
                            onChange={(e) => setProductForm({ ...productForm, Type: e.target.value })}
                            placeholder="e.g. Type-C to Lightning, Braided USB-C"
                            className="premium-input"
                            required
                          />
                        </div>
                        <div className="premium-input-group">
                          <label className="premium-label">Product Name *</label>
                          <input
                            type="text"
                            value={productForm.ProductName}
                            onChange={(e) => setProductForm({ ...productForm, ProductName: e.target.value })}
                            placeholder="e.g. SuperSpeed Cable 1.5m"
                            className="premium-input"
                            required
                          />
                        </div>
                      </>
                    )}

                    {/* Category = Other Accessories */}
                    {productForm.Category === 'Other Accessories' && (
                      <>
                        <div className="premium-input-group">
                          <label className="premium-label">Custom Category Name *</label>
                          <input
                            type="text"
                            value={productForm.Category}
                            onChange={(e) => setProductForm({ ...productForm, Category: e.target.value })}
                            placeholder="e.g. Car Mount, OTG Adapter"
                            className="premium-input"
                            required
                          />
                        </div>
                        <div className="premium-input-group">
                          <label className="premium-label">Type / Sub-category *</label>
                          <input
                            type="text"
                            value={productForm.Type}
                            onChange={(e) => setProductForm({ ...productForm, Type: e.target.value })}
                            placeholder="e.g. Magnetic Stand, Type-C OTG"
                            className="premium-input"
                            required
                          />
                        </div>
                        <div className="premium-input-group">
                          <label className="premium-label">Product Name *</label>
                          <input
                            type="text"
                            value={productForm.ProductName}
                            onChange={(e) => setProductForm({ ...productForm, ProductName: e.target.value })}
                            placeholder="e.g. Magnetic Car Vent Mount"
                            className="premium-input"
                            required
                          />
                        </div>
                      </>
                    )}

                    {/* GENERAL OPTIONAL FIELDS */}
                    <div className="premium-input-group">
                      <label className="premium-label">Stock Count (Admin Reference) *</label>
                      <input
                        type="number"
                        value={productForm.Count}
                        onChange={(e) => setProductForm({ ...productForm, Count: e.target.value })}
                        placeholder="e.g. 10"
                        className="premium-input"
                        min="0"
                        required
                      />
                    </div>

                    <div className="premium-input-group">
                      <label className="premium-label">Price (INR, Optional)</label>
                      <input
                        type="number"
                        value={productForm.Price}
                        onChange={(e) => setProductForm({ ...productForm, Price: e.target.value })}
                        placeholder="e.g. 299"
                        className="premium-input"
                      />
                    </div>

                     <div className="premium-input-group">
                      <label className="premium-label">Product Image & Tag Number</label>
                      
                      {productForm.ImageURL && (
                        <div style={{ marginBottom: '10px', position: 'relative', width: '120px', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                          <img 
                            src={getImageUrl(productForm.ImageURL)} 
                            alt="Preview" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#f8fafc' }} 
                          />
                          <button 
                            type="button" 
                            onClick={() => setProductForm(prev => ({ ...prev, ImageURL: '' }))} 
                            className="premium-btn premium-btn-danger"
                            style={{ position: 'absolute', right: '4px', bottom: '4px', width: 'auto', padding: '2px 6px', fontSize: '0.65rem' }}
                          >
                            Remove
                          </button>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <label className="premium-btn premium-btn-secondary" style={{ padding: '10px', fontSize: '0.8rem', display: 'flex', gap: '6px', cursor: 'pointer', background: 'white', border: '1.5px dashed var(--primary)', margin: 0, flex: 1 }}>
                          <Upload size={14} style={{ color: 'var(--primary)' }} /> 
                          {uploadingProductImg ? 'Uploading...' : productForm.ImageURL ? 'Change Image' : 'Select Image'}
                          <input 
                            type="file" 
                            disabled={uploadingProductImg}
                            style={{ display: 'none' }}
                            onChange={(e) => handleProductImageUpload(e.target.files[0])}
                          />
                        </label>
                        
                        <div style={{ flex: 1 }}>
                          <input
                            type="text"
                            value={productForm.TagNumber}
                            onChange={(e) => setProductForm({ ...productForm, TagNumber: e.target.value })}
                            placeholder="Tag Number (Optional)"
                            className="premium-input"
                            style={{ padding: '9px 10px', fontSize: '0.8rem', margin: 0 }}
                          />
                        </div>
                      </div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-light-muted)', display: 'block', marginTop: '4px' }}>
                        Images are stored inside WhatsBroTNService_Uploads / Accessories_Images folder in Google Drive.
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                      <button type="submit" className="premium-btn premium-btn-primary" style={{ flex: 2 }} disabled={uploadingProductImg}>
                        {editingProductId ? 'Update Product' : 'Create Product'}
                      </button>
                      {editingProductId && (
                        <button 
                          type="button" 
                          onClick={() => {
                            setEditingProductId(null);
                            setProductForm({
                              Category: 'Phone Cover',
                              CoverType: 'Case',
                              Brand: 'Samsung',
                              CustomBrand: '',
                              ModelName: '',
                              ProductName: '',
                              Type: '',
                              Price: '',
                              TagNumber: '',
                              ImageURL: '',
                              Count: '1'
                            });
                          }} 
                          className="premium-btn premium-btn-secondary"
                          style={{ flex: 1 }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>

                  </form>
                </div>

                {/* 2. ACCESSORIES LIST VIEW */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  <div className="premium-card" style={{ margin: 0, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <h4 style={{ fontSize: '0.9rem', margin: 0 }}>View & Search Products ({products.length})</h4>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <input 
                        type="text" 
                        value={accessorySearch}
                        onChange={(e) => setAccessorySearch(e.target.value)}
                        placeholder="Search by name, brand, model, tag..."
                        className="premium-input"
                        style={{ padding: '8px 10px', fontSize: '0.8rem', margin: 0, flex: '1 1 200px', minWidth: 0 }}
                      />
                      <select
                        value={accessoryCategoryFilter}
                        onChange={(e) => setAccessoryCategoryFilter(e.target.value)}
                        className="premium-input"
                        style={{ padding: '8px 10px', fontSize: '0.8rem', margin: 0, width: '130px', flex: '1 1 100px' }}
                      >
                        <option value="All">All Categories</option>
                        {['Phone Cover', 'Headphone', 'Speaker', 'Charger', 'Charger Cable'].map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                        <option value="Other">Other Accessories</option>
                      </select>
                      <select
                        value={accessoryBrandFilter}
                        onChange={(e) => setAccessoryBrandFilter(e.target.value)}
                        className="premium-input"
                        style={{ padding: '8px 10px', fontSize: '0.8rem', margin: 0, width: '110px', flex: '1 1 90px' }}
                      >
                        <option value="All">All Brands</option>
                        {uniqueBrands.map(brand => (
                          <option key={brand} value={brand}>{brand}</option>
                        ))}
                      </select>
                      <select
                        value={accessoryTagFilter}
                        onChange={(e) => setAccessoryTagFilter(e.target.value)}
                        className="premium-input"
                        style={{ padding: '8px 10px', fontSize: '0.8rem', margin: 0, width: '110px', flex: '1 1 90px' }}
                      >
                        <option value="All">All Tags</option>
                        {uniqueTags.map(tag => (
                          <option key={tag} value={tag}>{tag}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {adminProductsLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Loading products...</div>
                  ) : (() => {
                    const filtered = products.filter(p => {
                      if (accessoryCategoryFilter !== 'All') {
                        const standardCats = ['Phone Cover', 'Headphone', 'Speaker', 'Charger', 'Charger Cable'];
                        if (accessoryCategoryFilter === 'Other') {
                          if (standardCats.includes(p.Category)) return false;
                        } else {
                          if (p.Category !== accessoryCategoryFilter) return false;
                        }
                      }
                      if (accessoryBrandFilter !== 'All') {
                        const pBrand = p.Brand === 'Other' ? p.CustomBrand : p.Brand;
                        if (pBrand !== accessoryBrandFilter && p.Brand !== accessoryBrandFilter) return false;
                      }
                      if (accessoryTagFilter !== 'All') {
                        if (p.TagNumber !== accessoryTagFilter) return false;
                      }
                      if (accessorySearch.trim() !== '') {
                        const searchOptions = accessorySearch.split(',').map(s => s.trim().toLowerCase().replace(/\s+/g, '')).filter(Boolean);
                        if (searchOptions.length === 0) return true;

                        const name = (p.ProductName || '').toLowerCase().replace(/\s+/g, '');
                        const brand = (p.Brand || '').toLowerCase().replace(/\s+/g, '');
                        const customBrand = (p.CustomBrand || '').toLowerCase().replace(/\s+/g, '');
                        const model = (p.ModelName || '').toLowerCase().replace(/\s+/g, '');
                        const tag = (p.TagNumber || '').toLowerCase().replace(/\s+/g, '');
                        const cat = (p.Category || '').toLowerCase().replace(/\s+/g, '');
                        
                        return searchOptions.some(q => 
                          name.includes(q) || 
                          brand.includes(q) || 
                          customBrand.includes(q) || 
                          model.includes(q) || 
                          tag.includes(q) || 
                          cat.includes(q)
                        );
                      }
                      return true;
                    });

                    if (filtered.length === 0) {
                      return <div style={{ textAlign: 'center', padding: '20px', background: 'white', borderRadius: '12px', color: '#94a3b8' }}>No items found.</div>;
                    }

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '70vh', overflowY: 'auto', paddingRight: '4px' }}>
                        {filtered.map(item => (
                          <div key={item.ProductID} className="premium-card admin-item-card" style={{ padding: '12px', margin: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                            <div style={{ width: '42px', height: '42px', borderRadius: '6px', overflow: 'hidden', background: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {item.ImageURL ? (
                                <img src={getImageUrl(item.ImageURL)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : item.Category === 'Phone Cover' ? (
                                <img src={defaultCoverImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <span style={{ fontSize: '1rem' }}>📦</span>
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase' }}>{item.Category}</span>
                              <h4 style={{ fontSize: '0.85rem', margin: '0 0 2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1e293b' }}>
                                {item.ProductName || `${item.Brand} Case`}
                              </h4>
                              <div style={{ display: 'flex', gap: '8px', fontSize: '0.7rem', color: '#64748b', alignItems: 'center' }}>
                                {item.Price && <span>Price: ₹{item.Price}</span>}
                                {item.TagNumber && <span style={{ color: '#0284c7', background: '#e0f2fe', padding: '0 4px', borderRadius: '3px', fontWeight: 'bold' }}>Tag: {item.TagNumber}</span>}
                                <span style={{ 
                                  color: Number(item.Count || 0) > 0 ? '#16a34a' : '#dc2626', 
                                  background: Number(item.Count || 0) > 0 ? '#f0fdf4' : '#fef2f2', 
                                  padding: '0 4px', 
                                  borderRadius: '3px', 
                                  fontWeight: 'bold' 
                                }}>
                                  Stock: {item.Count || 0}
                                </span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: 'auto', flexShrink: 0 }}>
                              <button 
                                onClick={() => setSelectedProductDetails(item)} 
                                className="premium-btn premium-btn-secondary" 
                                style={{ width: '32px', height: '32px', padding: 0 }} 
                                title="View Details"
                              >
                                <Eye size={14} style={{ color: '#0f172a' }} />
                              </button>
                              <button onClick={() => startEditProduct(item)} className="premium-btn premium-btn-secondary" style={{ width: '32px', height: '32px', padding: 0 }} title="Edit Product">
                                <Edit size={14} />
                              </button>

                              {Number(item.Count || 0) > 0 ? (
                                /* Count Controller (Full) when count > 0 */
                                <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '6px', padding: '2px', border: '1px solid #e2e8f0', gap: '4px' }}>
                                  <button 
                                    onClick={() => handleUpdateProductCount(item, -1)} 
                                    className="premium-btn premium-btn-secondary" 
                                    style={{ width: '22px', height: '22px', padding: 0, fontSize: '0.9rem', minWidth: 'auto', background: 'white' }}
                                    title="Decrease Count"
                                  >
                                    -
                                  </button>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', minWidth: '16px', textAlign: 'center', color: '#334155' }}>
                                    {item.Count || 0}
                                  </span>
                                  <button 
                                    onClick={() => handleUpdateProductCount(item, 1)} 
                                    className="premium-btn premium-btn-secondary" 
                                    style={{ width: '22px', height: '22px', padding: 0, fontSize: '0.9rem', minWidth: 'auto', background: 'white' }}
                                    title="Increase Count"
                                  >
                                    +
                                  </button>
                                </div>
                              ) : (
                                /* When count === 0, show Delete button and optionally Increase button */
                                <>
                                  <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '6px', padding: '2px', border: '1px solid #e2e8f0', gap: '4px' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', minWidth: '16px', textAlign: 'center', color: '#94a3b8', padding: '0 4px' }}>
                                      0
                                    </span>
                                    <button 
                                      onClick={() => handleUpdateProductCount(item, 1)} 
                                      className="premium-btn premium-btn-secondary" 
                                      style={{ width: '22px', height: '22px', padding: 0, fontSize: '0.9rem', minWidth: 'auto', background: 'white' }}
                                      title="Increase Count"
                                    >
                                      +
                                    </button>
                                  </div>
                                  <button onClick={() => handleDeleteProduct(item.ProductID)} className="premium-btn premium-btn-danger" style={{ width: '32px', height: '32px', padding: 0 }} title="Delete Product">
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

              </div>
            ) : (
              <div className="desktop-grid-2">
                
                {/* 1. ADD / EDIT TEMPERED GLASS BOX FORM PANEL */}
                <div className="premium-card" id="tg-editor-form" style={{ borderTop: '6px solid var(--primary)', alignSelf: 'flex-start', margin: 0 }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>
                    {editingTgBoxNumber ? `📝 Edit TG Box: ${editingTgBoxNumber}` : '➕ Add New TG Box'}
                  </h3>
                  
                  <form onSubmit={handleTgSubmit}>
                    
                    <div className="premium-input-group">
                      <label className="premium-label">Box Number *</label>
                      <input
                        type="text"
                        value={tgForm.BoxNumber}
                        onChange={(e) => setTgForm({ ...tgForm, BoxNumber: e.target.value })}
                        placeholder="e.g. B12, A05..."
                        className="premium-input"
                        required
                        disabled={!!editingTgBoxNumber}
                      />
                      {editingTgBoxNumber && <span style={{ fontSize: '0.65rem', color: '#ef4444' }}>Box Number cannot be changed during editing. Delete and re-create if needed.</span>}
                    </div>

                    <div className="premium-input-group">
                      <label className="premium-label">Model List (Comma-separated values) *</label>
                      <textarea
                        rows={6}
                        value={tgForm.ModelList}
                        onChange={(e) => setTgForm({ ...tgForm, ModelList: e.target.value })}
                        placeholder="Samsung A15, Samsung A16, Vivo T3, Redmi Note 13..."
                        className="premium-input"
                        required
                        style={{ fontFamily: 'inherit', resize: 'vertical' }}
                      />
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-light-muted)', display: 'block', marginTop: '4px' }}>
                        Provide a clean, comma-separated list of models. E.g. "Samsung A15, Vivo T3". Substring check is performed when user searches.
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                      <button type="submit" className="premium-btn premium-btn-primary" style={{ flex: 2 }}>
                        {editingTgBoxNumber ? 'Update Box Models' : 'Create Box'}
                      </button>
                      {editingTgBoxNumber && (
                        <button 
                          type="button" 
                          onClick={() => {
                            setEditingTgBoxNumber(null);
                            setTgForm({ BoxNumber: '', ModelList: '' });
                          }} 
                          className="premium-btn premium-btn-secondary"
                          style={{ flex: 1 }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>

                  </form>
                </div>

                {/* 2. TEMPERED GLASS LIST VIEW */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  <div className="premium-card" style={{ margin: 0, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <h4 style={{ fontSize: '0.9rem', margin: 0 }}>View Box Inventory ({temperedGlassList.length})</h4>
                    <input 
                      type="text" 
                      value={tgSearch}
                      onChange={(e) => setTgSearch(e.target.value)}
                      placeholder="Search Box Number or Model..."
                      className="premium-input"
                      style={{ padding: '8px 10px', fontSize: '0.8rem', margin: 0 }}
                    />
                  </div>

                  {tgListLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Loading tempered glass box list...</div>
                  ) : (() => {
                    const filtered = temperedGlassList.filter(t => {
                      if (tgSearch.trim() !== '') {
                        const qClean = tgSearch.toLowerCase().replace(/\s+/g, '');
                        const boxClean = t.BoxNumber.toLowerCase().replace(/\s+/g, '');
                        const modelsClean = (t.ModelList || '').toLowerCase().replace(/\s+/g, '');
                        return boxClean.includes(qClean) || modelsClean.includes(qClean);
                      }
                      return true;
                    });

                    if (filtered.length === 0) {
                      return <div style={{ textAlign: 'center', padding: '20px', background: 'white', borderRadius: '12px', color: '#94a3b8' }}>No entries found.</div>;
                    }

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '70vh', overflowY: 'auto', paddingRight: '4px' }}>
                        {filtered.map(item => {
                          const models = (item.ModelList || '').split(',').map(m => m.trim()).filter(Boolean);
                          const qClean = tgSearch.trim().toLowerCase().replace(/\s+/g, '');
                          const isSearching = qClean.length > 0;
                          const matchedIndices = [];
                          models.forEach((m, idx) => {
                            const mClean = m.toLowerCase().replace(/\s+/g, '');
                            if (isSearching && mClean.includes(qClean)) {
                              matchedIndices.push(idx);
                            }
                          });
                          const hasMatchingModels = matchedIndices.length > 0;
                          const isExpanded = !!expandedTgBoxes[item.BoxNumber] || (isSearching && hasMatchingModels);
                          const maxCollapsedVisible = 6;
                          const visibleModels = isExpanded ? models : models.slice(0, maxCollapsedVisible);
                          const hasMore = models.length > maxCollapsedVisible;

                          const toggleBox = (boxNumber) => {
                            setExpandedTgBoxes(prev => ({
                              ...prev,
                              [boxNumber]: !prev[boxNumber]
                            }));
                          };

                          return (
                            <div key={item.BoxNumber} className="premium-card admin-item-card" style={{ padding: '12px', margin: 0, display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '12px', flexShrink: 0 }}>
                              <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#f0fdf4', border: '1.5px solid #22c55e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, alignSelf: 'center' }}>
                                <span style={{ fontSize: '0.55rem', fontWeight: 'bold', color: '#15803d', textTransform: 'uppercase', lineHeight: '1' }}>BOX</span>
                                <strong style={{ fontSize: '1rem', color: '#166534', fontWeight: '900', marginTop: '2px' }}>{item.BoxNumber}</strong>
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <h4 style={{ fontSize: '0.85rem', margin: '0 0 6px 0', color: '#1e293b', fontWeight: '800' }}>
                                  Models ({ models.length })
                                </h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                  {visibleModels.map((model, idx) => {
                                    const mClean = model.toLowerCase().replace(/\s+/g, '');
                                    const isMatched = isSearching && mClean.includes(qClean);
                                    return (
                                      <span
                                        key={idx}
                                        style={{
                                          display: 'inline-block',
                                          padding: '3px 8px',
                                          borderRadius: '6px',
                                          fontSize: '0.7rem',
                                          fontWeight: '500',
                                          background: isMatched ? '#fef08a' : '#f1f5f9',
                                          color: isMatched ? '#854d0e' : '#334155',
                                          border: isMatched ? '1px solid #eab308' : '1px solid #e2e8f0',
                                          transition: 'all 0.2s ease',
                                        }}
                                      >
                                        {highlightText(model, tgSearch)}
                                      </span>
                                    );
                                  })}
                                  {hasMore && !isSearching && (
                                    <button
                                      type="button"
                                      onClick={() => toggleBox(item.BoxNumber)}
                                      style={{
                                        background: 'rgba(30, 168, 103, 0.08)',
                                        border: 'none',
                                        color: 'var(--primary)',
                                        fontSize: '0.7rem',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        padding: '3px 8px',
                                        borderRadius: '6px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '2px',
                                        outline: 'none',
                                        transition: 'all 0.15s ease'
                                      }}
                                    >
                                      {isExpanded ? 'Show less' : `+${models.length - maxCollapsedVisible} more`}
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '4px', width: 'auto', flexShrink: 0, alignSelf: 'center' }}>
                                <button onClick={() => startEditTg(item)} className="premium-btn premium-btn-secondary" style={{ width: '32px', height: '32px', padding: 0 }} title="Edit Box">
                                  <Edit size={14} />
                                </button>
                                <button onClick={() => handleDeleteTg(item.BoxNumber)} className="premium-btn premium-btn-danger" style={{ width: '32px', height: '32px', padding: 0 }} title="Delete Box">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

              </div>
            )}

          </div>
        )}

        {/* --- TAB 3: USER SUBMISSIONS --- */}
        {activeTab === 'users' && (
          <div>
            {!selectedUser ? (
              // Submissions list sorted by preference
              <div className="premium-card" style={{ borderTop: '6px solid var(--primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h3 style={{ fontSize: '1.1rem', margin: 0 }}>User Registrations Manager ({filteredUsers.length})</h3>
                    <button 
                      onClick={() => handleExportToCsv(users, "citizen_profiles")}
                      className="premium-btn premium-btn-success"
                      style={{ width: 'auto', padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      <Download size={12} /> Export CSV
                    </button>
                  </div>
                  <div style={{ position: 'relative', width: '260px' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light-muted)' }}><Search size={14} /></span>
                    <input 
                      type="text" 
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      placeholder="Search Phone / Aadhaar..." 
                      className="premium-input" 
                      style={{ paddingLeft: '32px', paddingTop: '8px', paddingBottom: '8px', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div style={{ border: '1px solid var(--border-light)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div className="admin-table-header" style={{ display: 'flex', background: '#f1f5f9', padding: '10px 16px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-light-muted)', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ width: '40px' }}>#</span>
                    <span style={{ flex: 1.5 }}>USER NAME</span>
                    <span style={{ flex: 2 }}>AADHAAR CARD NO</span>
                    <span style={{ flex: 1.5 }}>PHONE NUMBER</span>
                    <span style={{ flex: 1.5 }}>DATE OF BIRTH</span>
                    <span style={{ flex: 1.5 }}>LAST SUBMITTED</span>
                    <span style={{ width: '80px', textAlign: 'center' }}>ACTIONS</span>
                  </div>

                  {filteredUsers.length === 0 ? (
                    <div className="text-center" style={{ padding: '30px 20px', color: 'var(--text-light-muted)' }}>
                      No user submissions matched your search query.
                    </div>
                  ) : (
                    filteredUsers.map((user, idx) => (
                      <div key={user.aadhar} className="admin-user-row" style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem' }}>
                        <span style={{ width: '40px', fontWeight: 'bold', color: '#64748b' }}>
                          {idx + 1}
                        </span>
                        <span style={{ flex: 1.5, fontWeight: 700, color: 'var(--primary)' }}>
                          {user.name || 'Citizen User'}
                        </span>
                        <span style={{ flex: 2, fontWeight: 600 }}>
                          {user.aadhar.replace(/(\d{4})/g, '$1 ').trim()}
                        </span>
                        <span style={{ flex: 1.5, color: '#475569' }}>{user.phone}</span>
                        <span style={{ flex: 1.5, color: '#475569' }}>{user.dob}</span>
                        <span style={{ flex: 1.5, color: '#64748b', fontSize: '0.75rem' }}>
                          {new Date(user.last_active).toLocaleString()}
                        </span>
                        <div className="admin-user-actions" style={{ width: '80px', display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button 
                            onClick={() => handleSelectUser(user)} 
                            className="premium-btn premium-btn-primary" 
                            style={{ width: '28px', height: '28px', padding: 0, borderRadius: '6px' }}
                            title="View User Forms"
                          >
                            <Eye size={12} />
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user.aadhar)} 
                            className="premium-btn premium-btn-danger" 
                            style={{ width: '28px', height: '28px', padding: 0, borderRadius: '6px' }}
                            title="Delete User & Forms"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              // Specific User Submissions View
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--border-light)', marginBottom: '16px' }}>
                  <button onClick={() => setSelectedUser(null)} className="premium-btn premium-btn-secondary" style={{ width: '40px', height: '40px', padding: 0, borderRadius: '50%' }}>
                    <ArrowLeft size={18} />
                  </button>
                  <div>
                    <h3 style={{ fontSize: '1rem' }}>User: Aadhaar {selectedUser.aadhar.replace(/(\d{4})/g, '$1 ').trim()}</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-light-muted)' }}>Phone: {selectedUser.phone} | DOB: {selectedUser.dob}</p>
                  </div>
                </div>

                {/* Stored Profile Documents Grid */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', width: '100%', color: '#334155' }}>Citizen Profile Stored Documents:</span>
                  {[
                    { id: 'photo', label: 'Photo', url1: selectedUser.photo_url },
                    { id: 'aadhar', label: 'Aadhaar', url1: selectedUser.aadhar_url_1, url2: selectedUser.aadhar_url_2 },
                    { id: 'smart_card', label: 'Smart Card', url1: selectedUser.smart_card_url_1, url2: selectedUser.smart_card_url_2 },
                    { id: 'voter_id', label: 'Voter ID', url1: selectedUser.voter_id_url_1, url2: selectedUser.voter_id_url_2 },
                    { id: 'signature', label: 'Signature', url1: selectedUser.signature_url_1 }
                  ].map(doc => {
                    if (!doc.url1) return null;
                    return (
                      <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
                        <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{doc.label}:</span>
                        <a href={getImageUrl(doc.url1)} target="_blank" rel="noreferrer" style={{ color: '#10b981', textDecoration: 'none', fontWeight: '700' }}>File 1</a>
                        {doc.url2 && <a href={getImageUrl(doc.url2)} target="_blank" rel="noreferrer" style={{ color: '#10b981', textDecoration: 'none', fontWeight: '700', marginLeft: '4px' }}>File 2</a>}
                      </div>
                    );
                  })}
                  {![selectedUser.photo_url, selectedUser.aadhar_url_1, selectedUser.smart_card_url_1, selectedUser.voter_id_url_1, selectedUser.signature_url_1].some(Boolean) && (
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>No profile documents uploaded yet.</span>
                  )}
                </div>

                <div className="desktop-grid-2">
                  
                  {/* Left Column: List of submissions by this user */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h4 style={{ fontSize: '0.85rem', color: 'var(--text-light-muted)', margin: 0 }}>Submitted Application Forms ({userSubmissions.length})</h4>
                      <button 
                        onClick={() => handleExportToCsv(userSubmissions, `user_submissions_${selectedUser.aadhar}`)}
                        className="premium-btn premium-btn-success"
                        style={{ width: 'auto', padding: '4px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        <Download size={10} /> Export to CSV
                      </button>
                    </div>
                    {[...userSubmissions].sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)).map((sub) => {
                      const associatedFormName = forms.find(f => f.id === sub.form_id)?.title || 'Custom Application';
                      const isDone = parseInt(sub.progress_percent) === 100;
                      const isSelected = activeSubmission?.id === sub.id;
                      
                      const borderColor = isDone ? '#10b981' : '#ef4444';
                      const background = isSelected 
                        ? (isDone ? '#f0fdf4' : '#fef2f2') 
                        : 'white';

                      return (
                        <div 
                          key={sub.id} 
                          onClick={() => handleSelectSubmission(sub)}
                          className="premium-card" 
                          style={{ 
                            cursor: 'pointer', 
                            borderLeft: isSelected ? `6px solid ${borderColor}` : `3px solid ${borderColor}`,
                            borderColor: borderColor,
                            background: background,
                            margin: '0 0 12px 0',
                            boxShadow: isSelected ? '0 4px 6px -1px rgba(0, 0, 0, 0.08)' : '0 1px 3px rgba(0,0,0,0.02)',
                            transition: 'all 0.2s ease-in-out'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: isDone ? '#10b981' : '#ef4444' }}>ID: {sub.id}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {sub.payment_status === 'rejected' ? (
                                <span className="badge badge-danger" style={{ backgroundColor: '#ef4444' }}>Rejected</span>
                              ) : sub.uploaded_pdf_url ? (
                                <span className="badge badge-success" style={{ backgroundColor: '#10b981' }}>Received (Delivered)</span>
                              ) : sub.info_request_label && !sub.info_request_response ? (
                                <span className="badge badge-warning" style={{ backgroundColor: '#f59e0b' }}>Awaiting User Upload</span>
                              ) : sub.info_request_label && sub.info_request_response ? (
                                <span className="badge badge-info" style={{ backgroundColor: '#3b82f6' }}>Response Received</span>
                              ) : sub.payment_status === 'paid' ? (
                                <span className="badge badge-success">Paid</span>
                              ) : sub.payment_screenshot ? (
                                <span className="badge badge-warning">Verify Screenshot</span>
                              ) : (
                                <span className="badge" style={{ backgroundColor: String(sub.pay_allowed).toLowerCase() === 'true' ? '#14b8a6' : '#ef4444' }}>
                                  {String(sub.pay_allowed).toLowerCase() === 'true' ? 'Pay Allowed' : 'Unpaid'}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSubmission(sub.id);
                                }}
                                className="premium-btn premium-btn-danger"
                                style={{ width: '26px', height: '26px', padding: 0, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Delete Submission"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                          <h4 style={{ fontSize: '0.95rem' }}>{associatedFormName}</h4>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.75rem', color: 'var(--text-light-muted)' }}>
                            <span>Progress: {sub.progress_percent}%</span>
                            <span>{new Date(sub.submitted_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right Column: Active submission details, edits, and status dashboard */}
                  {activeSubmission ? (
                    <div className="premium-card" id="active-submission-dashboard" style={{ borderTop: '6px solid var(--primary)', alignSelf: 'flex-start' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '14px' }}>
                        <h4 style={{ fontSize: '1rem' }}>Application Dashboard</h4>
                        <button 
                          onClick={() => handleDeleteSubmission(activeSubmission.id)} 
                          className="premium-btn premium-btn-danger"
                          style={{ width: 'auto', padding: '6px 12px', fontSize: '0.75rem' }}
                        >
                          <Trash2 size={12} /> Delete Form
                        </button>
                      </div>

                      {/* Unified Form values View / Edit */}
                      <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <h4 style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>Form Entry Values</h4>
                          <button 
                            onClick={() => setIsEditingResponsesMode(!isEditingResponsesMode)}
                            className="premium-btn premium-btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.7rem', width: 'auto' }}
                          >
                            {isEditingResponsesMode ? 'Cancel Edit' : 'Edit Entries'}
                          </button>
                        </div>

                        {/* Expandable Screenshot Preview */}
                        {activeSubmission.payment_screenshot && (
                          <div style={{ marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                            <span className="premium-label" style={{ fontSize: '0.75rem' }}>Uploaded Payment Proof:</span>
                            <div style={{ marginTop: '4px', position: 'relative' }}>
                              <img 
                                src={getImageUrl(activeSubmission.payment_screenshot)} 
                                alt="UPI Screenshot" 
                                style={{ width: '100%', maxHeight: '180px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
                              />
                              <a 
                                href={getImageUrl(activeSubmission.payment_screenshot)} 
                                target="_blank" 
                                rel="noreferrer"
                                style={{ position: 'absolute', right: '8px', bottom: '8px', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.65rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                View full <ExternalLink size={10} />
                              </a>
                            </div>
                          </div>
                        )}

                        {isEditingResponsesMode ? (
                          // Form Edit entries Form
                          <div>
                            {Object.entries(editingResponses).map(([fieldId, val]) => (
                              <div key={fieldId} className="premium-input-group" style={{ marginBottom: '10px' }}>
                                <label className="premium-label" style={{ fontSize: '0.75rem' }}>{fieldId}</label>
                                <input 
                                  type="text" 
                                  value={Array.isArray(val) ? val.join(', ') : val}
                                  onChange={(e) => setEditingResponses({ ...editingResponses, [fieldId]: e.target.value })}
                                  className="premium-input"
                                  style={{ padding: '8px', fontSize: '0.85rem' }}
                                />
                              </div>
                            ))}
                            <button 
                              onClick={handleEditSubmissionResponses}
                              className="premium-btn premium-btn-success"
                              style={{ padding: '8px', fontSize: '0.8rem', marginTop: '6px' }}
                            >
                              <Save size={14} /> Save Modified Values
                            </button>
                          </div>
                        ) : (
                          // Normal entries View
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem' }}>
                            {Object.entries(editingResponses).map(([fieldId, val]) => (
                              <div key={fieldId} className="admin-detail-row">
                                <span className="text-muted">{fieldId}:</span>
                                <span style={{ fontWeight: 700, maxWidth: '60%', textAlign: 'right' }}>
                                  {Array.isArray(val) ? val.join(', ') : val}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Combined Visual Documents Explorer (Default Profile + Current Application) */}
                      <div style={{ marginTop: '14px', padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                        <span className="premium-label" style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', color: 'var(--primary)', marginBottom: '12px' }}>
                          Combined Application & Citizen Profile Documents
                        </span>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {/* 1. Citizen Profile Default Documents */}
                          {(() => {
                            const profileDocs = [
                              { id: 'photo', label: 'Photo Upload', scope: 'Profile Default', urls: selectedUser.photo_url ? [selectedUser.photo_url] : [] },
                              { id: 'aadhar', label: 'Aadhaar Upload', scope: 'Profile Default', urls: [selectedUser.aadhar_url_1, selectedUser.aadhar_url_2].filter(Boolean) },
                              { id: 'smart_card', label: 'Smart Card Upload', scope: 'Profile Default', urls: [selectedUser.smart_card_url_1, selectedUser.smart_card_url_2].filter(Boolean) },
                              { id: 'voter_id', label: 'Voter ID Upload', scope: 'Profile Default', urls: [selectedUser.voter_id_url_1, selectedUser.voter_id_url_2].filter(Boolean) },
                              { id: 'signature', label: 'Signature Upload', scope: 'Profile Default', urls: selectedUser.signature_url_1 ? [selectedUser.signature_url_1] : [] }
                            ].filter(d => d.urls.length > 0);

                            // 2. Submission Specific Documents
                            let submissionDocs = [];
                            if (activeSubmission.uploaded_docs) {
                              try {
                                const parsedDocs = JSON.parse(activeSubmission.uploaded_docs);
                                submissionDocs = Object.entries(parsedDocs).map(([docKey, urls]) => {
                                  if (!urls || urls.length === 0) return null;
                                  // Clean up the key label
                                  const displayLabel = docKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                                  return {
                                    id: docKey,
                                    label: displayLabel,
                                    scope: 'This Application',
                                    urls: urls
                                  };
                                }).filter(Boolean);
                              } catch (e) {
                                console.error(e);
                              }
                            }

                            const allDocs = [...profileDocs, ...submissionDocs];

                            if (allDocs.length === 0) {
                              return <p style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>No documents uploaded in profile or application.</p>;
                            }

                            return allDocs.map((doc, docIdx) => (
                              <div key={`${doc.id}-${docIdx}`} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>{doc.label}</span>
                                    <span className={`badge ${doc.scope === 'This Application' ? 'badge-info' : 'badge-success'}`} style={{ fontSize: '0.65rem', padding: '2px 6px', marginLeft: '6px' }}>
                                      {doc.scope}
                                    </span>
                                  </div>
                                  <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 'bold' }}>{doc.urls.length} {doc.urls.length > 1 ? 'Files' : 'File'}</span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {doc.urls.map((url, urlIdx) => {
                                    const isPdf = checkIfPdf(url);
                                    const fullUrl = getImageUrl(url);
                                    const fileLabel = doc.urls.length > 1 ? `Part ${urlIdx + 1}` : 'Document File';
                                    
                                    return (
                                      <div key={urlIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: '#f8fafc', padding: '6px 8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                          {/* Mini Display Thumbnail */}
                                          {isPdf ? (
                                            <div style={{ width: '38px', height: '38px', borderRadius: '6px', background: '#fee2e2', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                                              <FileText size={18} />
                                            </div>
                                          ) : (
                                            <div style={{ width: '38px', height: '38px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                              <img src={fullUrl} alt="Thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                          )}
                                          <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '600' }}>{doc.urls.length > 1 ? `Part ${urlIdx + 1}` : 'Document File'}</span>
                                        </div>

                                        <div style={{ display: 'flex', gap: '6px' }}>
                                          <a 
                                            href={fullUrl} 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className="premium-btn premium-btn-secondary" 
                                            style={{ width: 'auto', padding: '4px 8px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                                          >
                                            <Eye size={11} /> View
                                          </a>
                                          <a 
                                            href={fullUrl} 
                                            download 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className="premium-btn premium-btn-success" 
                                            style={{ width: 'auto', padding: '4px 8px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                                          >
                                            <Download size={11} /> Download
                                          </a>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>

                      {/* Info Request Response View */}
                      {activeSubmission.info_request_label && (
                        <div style={{ marginTop: '14px', padding: '14px', background: '#fffbeb', borderRadius: '10px', border: '1px solid #fde68a', marginBottom: '20px' }}>
                          <span className="premium-label" style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', color: '#b45309', marginBottom: '6px' }}>
                            Requested Info: "{activeSubmission.info_request_label}"
                          </span>
                          {activeSubmission.info_request_response ? (
                            <div style={{ background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}>
                              <span style={{ color: '#475569', display: 'block', fontSize: '0.7rem', fontWeight: '600', marginBottom: '4px' }}>User Response:</span>
                              {(activeSubmission.info_request_response.startsWith('/uploads/') || activeSubmission.info_request_response.startsWith('http')) ? (() => {
                                const fileUrl = getImageUrl(activeSubmission.info_request_response);
                                const isPdf = checkIfPdf(activeSubmission.info_request_response);
                                
                                return (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      {/* Mini Thumbnail / PDF Icon Preview */}
                                      {isPdf ? (
                                        <div style={{ width: '38px', height: '38px', borderRadius: '6px', background: '#fee2e2', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                                          <FileText size={18} />
                                        </div>
                                      ) : (
                                        <div style={{ width: '38px', height: '38px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                          <img src={fileUrl} alt="User Uploaded Response" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                      )}
                                      
                                      <div style={{ textAlign: 'left' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#1e293b', fontWeight: 'bold', display: 'block' }}>User Uploaded File</span>
                                        <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{isPdf ? 'PDF Document' : 'Image Upload'}</span>
                                      </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                      <a 
                                        href={fileUrl} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="premium-btn premium-btn-secondary" 
                                        style={{ width: 'auto', padding: '6px 10px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                                      >
                                        <Eye size={11} /> View
                                      </a>
                                      <a 
                                        href={fileUrl} 
                                        download 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="premium-btn premium-btn-success" 
                                        style={{ width: 'auto', padding: '6px 10px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                                      >
                                        <Download size={11} /> Download
                                      </a>
                                    </div>
                                  </div>
                                );
                              })() : (
                                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '6px', fontWeight: '700', color: '#1e293b' }}>
                                  {activeSubmission.info_request_response}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>Awaiting response from citizen...</span>
                          )}
                        </div>
                      )}

                      {/* Status / PDF upload controller dashboard */}
                      <form onSubmit={handleUpdateStatus} style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                        <h4 style={{ fontSize: '0.85rem', color: 'var(--primary)', marginBottom: '12px' }}>Update Status Panel</h4>

                        <div className="premium-input-group">
                          <label className="premium-label">Payment Status</label>
                          <select 
                            value={statusForm.payment_status}
                            onChange={(e) => setStatusForm({ ...statusForm, payment_status: e.target.value })}
                            className="premium-input"
                          >
                            <option value="unpaid">Unpaid</option>
                            <option value="paid">Paid</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>

                        <div className="premium-input-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', marginBottom: '14px' }}>
                          <input 
                            type="checkbox"
                            id="pay_allowed_checkbox"
                            checked={statusForm.pay_allowed === 'true'}
                            onChange={(e) => setStatusForm({ ...statusForm, pay_allowed: e.target.checked ? 'true' : 'false' })}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                          />
                          <label htmlFor="pay_allowed_checkbox" style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#1e293b', cursor: 'pointer', margin: 0 }}>
                            Allow User to Pay (Verify & Enable UPI)
                          </label>
                        </div>

                        <div className="premium-input-group">
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <label className="premium-label" style={{ margin: 0 }}>Progress Percentage</label>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>{statusForm.progress_percent}%</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            step="5"
                            value={statusForm.progress_percent}
                            onChange={(e) => setStatusForm({ ...statusForm, progress_percent: parseInt(e.target.value) })}
                            style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                          />
                        </div>

                        <div className="premium-input-group">
                          <label className="premium-label">Progress Update Description</label>
                          <textarea 
                            rows={3}
                            value={statusForm.progress_desc}
                            onChange={(e) => setStatusForm({ ...statusForm, progress_desc: e.target.value })}
                            placeholder="Describe current stage e.g. Documents verified, pending government signature."
                            className="premium-input"
                          />
                        </div>

                        <div className="premium-input-group" style={{ background: '#fffbeb', padding: '12px', borderRadius: '10px', border: '1px solid #fde68a', margin: '14px 0' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#b45309', display: 'block', marginBottom: '8px' }}>Request Extra Info / Document from User</span>
                          
                          <div style={{ marginBottom: '8px' }}>
                            <label className="premium-label" style={{ fontSize: '0.75rem', color: '#78350f' }}>Request Label (Leave blank if none)</label>
                            <input 
                              type="text" 
                              value={statusForm.info_request_label}
                              onChange={(e) => setStatusForm({ ...statusForm, info_request_label: e.target.value })}
                              placeholder="e.g. Please upload parent's Income Certificate"
                              className="premium-input"
                              style={{ padding: '8px', fontSize: '0.8rem', background: 'white' }}
                            />
                          </div>

                          <div>
                            <label className="premium-label" style={{ fontSize: '0.75rem', color: '#78350f' }}>Request Type</label>
                            <select 
                              value={statusForm.info_request_type}
                              onChange={(e) => setStatusForm({ ...statusForm, info_request_type: e.target.value })}
                              className="premium-input"
                              style={{ padding: '8px', fontSize: '0.8rem', background: 'white' }}
                            >
                              <option value="text">Text Input</option>
                              <option value="file">File Upload (Image/PDF)</option>
                            </select>
                          </div>
                        </div>

                        <button 
                          type="submit" 
                          className="premium-btn premium-btn-primary"
                          style={{ marginBottom: '16px' }}
                        >
                          Update Status
                        </button>
                      </form>

                      {/* Branded Deliverables Section (Receipt, Certificate, Others) */}
                      <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '16px', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                          <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: '800', marginBottom: '4px' }}>Deliver Application Documents</h4>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-light-muted)', margin: 0 }}>Attach receipts, certificates, or additional files for this submission. The user will be able to view and download them immediately on the status screen.</p>
                        </div>
                        
                        {/* 1. Official Receipt Upload */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#334155', display: 'block' }}>1. Official Receipt Document</span>
                          
                          {activeSubmission.receipt_url ? (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#d1fae5', padding: '8px 10px', borderRadius: '8px', fontSize: '0.75rem', border: '1px solid #a7f3d0' }}>
                              <span style={{ color: '#065f46', fontWeight: 600 }}>📩 Receipt Loaded ({getFileExtension(activeSubmission.receipt_url)})</span>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <a href={getImageUrl(activeSubmission.receipt_url)} target="_blank" rel="noreferrer" style={{ color: '#047857', fontWeight: 800, textDecoration: 'underline' }}>View</a>
                                <label style={{ color: 'var(--primary)', fontWeight: 800, textDecoration: 'underline', cursor: 'pointer', margin: 0 }}>
                                  {uploadingDocType === 'receipt' ? 'Replacing...' : 'Replace'}
                                  <input 
                                    type="file" 
                                    accept="application/pdf,image/*"
                                    style={{ display: 'none' }}
                                    disabled={uploadingDocType !== null}
                                    onChange={(e) => handleUploadDocAdmin(activeSubmission.id, 'receipt', e.target.files[0])}
                                  />
                                </label>
                                <button type="button" onClick={() => handleDeleteDocAdmin(activeSubmission.id, 'receipt')} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Delete</button>
                              </div>
                            </div>
                          ) : (
                            <label className="premium-btn premium-btn-secondary" style={{ padding: '8px 12px', fontSize: '0.75rem', display: 'flex', gap: '6px', cursor: 'pointer', background: 'white', border: '1.5px dashed #cbd5e1' }}>
                              <Upload size={14} style={{ color: 'var(--primary)' }} /> 
                              {uploadingDocType === 'receipt' ? 'Uploading...' : 'Upload Receipt (PDF/Image)'}
                              <input 
                                type="file" 
                                accept="application/pdf,image/*"
                                style={{ display: 'none' }}
                                disabled={uploadingDocType !== null}
                                onChange={(e) => handleUploadDocAdmin(activeSubmission.id, 'receipt', e.target.files[0])}
                              />
                            </label>
                          )}
                        </div>

                        {/* 2. Official Certificate Upload */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#334155', display: 'block' }}>2. Official Certificate / Outcome</span>
                          
                          {activeSubmission.certificate_url ? (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#d1fae5', padding: '8px 10px', borderRadius: '8px', fontSize: '0.75rem', border: '1px solid #a7f3d0' }}>
                              <span style={{ color: '#065f46', fontWeight: 600 }}>📩 Certificate Loaded ({getFileExtension(activeSubmission.certificate_url)})</span>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <a href={getImageUrl(activeSubmission.certificate_url)} target="_blank" rel="noreferrer" style={{ color: '#047857', fontWeight: 800, textDecoration: 'underline' }}>View</a>
                                <label style={{ color: 'var(--primary)', fontWeight: 800, textDecoration: 'underline', cursor: 'pointer', margin: 0 }}>
                                  {uploadingDocType === 'certificate' ? 'Replacing...' : 'Replace'}
                                  <input 
                                    type="file" 
                                    accept="application/pdf,image/*"
                                    style={{ display: 'none' }}
                                    disabled={uploadingDocType !== null}
                                    onChange={(e) => handleUploadDocAdmin(activeSubmission.id, 'certificate', e.target.files[0])}
                                  />
                                </label>
                                <button type="button" onClick={() => handleDeleteDocAdmin(activeSubmission.id, 'certificate')} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Delete</button>
                              </div>
                            </div>
                          ) : (
                            <label className="premium-btn premium-btn-secondary" style={{ padding: '8px 12px', fontSize: '0.75rem', display: 'flex', gap: '6px', cursor: 'pointer', background: 'white', border: '1.5px dashed #cbd5e1' }}>
                              <Upload size={14} style={{ color: 'var(--primary)' }} /> 
                              {uploadingDocType === 'certificate' ? 'Uploading...' : 'Upload Certificate (PDF/Image)'}
                              <input 
                                type="file" 
                                accept="application/pdf,image/*"
                                style={{ display: 'none' }}
                                disabled={uploadingDocType !== null}
                                onChange={(e) => handleUploadDocAdmin(activeSubmission.id, 'certificate', e.target.files[0])}
                              />
                            </label>
                          )}
                        </div>

                        {/* 3. Other/Additional Document Upload */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#334155', display: 'block' }}>
                            3. {activeSubmission.other_doc_name || 'Other / Additional Document'}
                          </span>
                          
                          {/* Label input field */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>Custom Document Name:</span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <input 
                                type="text"
                                value={statusForm.other_doc_name}
                                onChange={(e) => setStatusForm({ ...statusForm, other_doc_name: e.target.value })}
                                placeholder="e.g. Aadhaar Copy, Voter Form"
                                className="premium-input"
                                style={{ padding: '6px 10px', fontSize: '0.75rem', margin: 0, flex: 1 }}
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const updated = await adminUpdateSubmission(activeSubmission.id, { other_doc_name: statusForm.other_doc_name });
                                    alert('Document label saved successfully!');
                                    setActiveSubmission(updated);
                                    handleRefreshUsers();
                                  } catch (e) {
                                    alert('Failed to save document label.');
                                  }
                                }}
                                className="premium-btn premium-btn-success"
                                style={{ width: 'auto', padding: '6px 12px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                Save Label
                              </button>
                            </div>
                          </div>

                          {activeSubmission.other_doc_url ? (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#d1fae5', padding: '8px 10px', borderRadius: '8px', fontSize: '0.75rem', border: '1px solid #a7f3d0', marginTop: '4px' }}>
                              <span style={{ color: '#065f46', fontWeight: 600 }}>📩 Document Loaded ({getFileExtension(activeSubmission.other_doc_url)})</span>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <a href={getImageUrl(activeSubmission.other_doc_url)} target="_blank" rel="noreferrer" style={{ color: '#047857', fontWeight: 800, textDecoration: 'underline' }}>View</a>
                                <label style={{ color: 'var(--primary)', fontWeight: 800, textDecoration: 'underline', cursor: 'pointer', margin: 0 }}>
                                  {uploadingDocType === 'other' ? 'Replacing...' : 'Replace'}
                                  <input 
                                    type="file" 
                                    accept="application/pdf,image/*"
                                    style={{ display: 'none' }}
                                    disabled={uploadingDocType !== null}
                                    onChange={(e) => handleUploadDocAdmin(activeSubmission.id, 'other', e.target.files[0])}
                                  />
                                </label>
                                <button type="button" onClick={() => handleDeleteDocAdmin(activeSubmission.id, 'other')} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Delete</button>
                              </div>
                            </div>
                          ) : (
                            <label className="premium-btn premium-btn-secondary" style={{ padding: '8px 12px', fontSize: '0.75rem', display: 'flex', gap: '6px', cursor: 'pointer', background: 'white', border: '1.5px dashed #cbd5e1', marginTop: '4px' }}>
                              <Upload size={14} style={{ color: 'var(--primary)' }} /> 
                              {uploadingDocType === 'other' ? 'Uploading...' : 'Upload Document (PDF/Image)'}
                              <input 
                                type="file" 
                                accept="application/pdf,image/*"
                                style={{ display: 'none' }}
                                disabled={uploadingDocType !== null}
                                onChange={(e) => handleUploadDocAdmin(activeSubmission.id, 'other', e.target.files[0])}
                              />
                            </label>
                          )}
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="premium-card text-center" style={{ alignSelf: 'center', padding: '30px' }}>
                      <FileText size={48} className="text-muted" style={{ margin: '0 auto 10px auto' }} />
                      <h4 style={{ fontSize: '0.95rem' }}>Select an Application</h4>
                      <p className="text-muted" style={{ fontSize: '0.75rem' }}>Click an application on the left side to see details, edit fields, update status progress, upload output PDFs, or delete record.</p>
                    </div>
                  )}

                </div>

              </div>
            )}
          </div>
        )}

      </div>

      {/* Feedback Panel Modal */}
      {showFeedbackPanel && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15,23,42,0.4)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 99998,
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            width: '100%',
            maxWidth: '520px',
            maxHeight: '85vh',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              color: 'white'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800' }}>
                  <MessageSquare size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                  User Feedback ({feedbackList.length})
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.7rem', opacity: 0.85 }}>View and manage feedback from citizens</p>
              </div>
              <button
                onClick={() => setShowFeedbackPanel(false)}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '8px', padding: '6px 8px', fontSize: '0.8rem', fontWeight: 'bold' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Search */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search by name, phone, or message..."
                  value={feedbackSearchTerm}
                  onChange={(e) => setFeedbackSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 32px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.8rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Feedback List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
              {filteredFeedback.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                  <MessageSquare size={40} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
                  <p style={{ fontSize: '0.85rem', fontWeight: '600', margin: 0 }}>No feedback yet</p>
                  <p style={{ fontSize: '0.7rem', margin: '4px 0 0 0' }}>Feedback from citizens will appear here</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {filteredFeedback.map(fb => (
                    <div key={fb.id} style={{
                      background: '#fafbfc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '14px',
                      transition: 'box-shadow 0.2s',
                      position: 'relative'
                    }}>
                      {/* Badge for Type */}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {(!fb.rating || parseInt(fb.rating) === 0) ? (
                          <span style={{
                            display: 'inline-block',
                            fontSize: '0.62rem',
                            fontWeight: '800',
                            color: '#0284c7',
                            background: '#e0f2fe',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            marginBottom: '6px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em'
                          }}>
                            💬 Support Inquiry
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-block',
                            fontSize: '0.62rem',
                            fontWeight: '800',
                            color: '#15803d',
                            background: '#dcfce7',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            marginBottom: '6px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em'
                          }}>
                            ⭐ Public Review
                          </span>
                        )}
                      </div>

                      {/* User Info Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: '700', color: '#1e293b' }}>{fb.user_name || 'Guest User'}</p>
                          <p style={{ margin: '2px 0 0 0', fontSize: '0.65rem', color: '#64748b' }}>
                            {fb.user_phone ? `📱 ${fb.user_phone}` : ''}
                            {fb.user_phone && fb.user_aadhar ? ' • ' : ''}
                            {fb.user_aadhar ? `Aadhaar: ****${fb.user_aadhar.slice(-4)}` : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteFeedback(fb.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
                          title="Delete feedback"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Star Rating */}
                      {fb.rating && parseInt(fb.rating) > 0 && (
                        <div style={{ marginBottom: '6px', display: 'flex', gap: '2px' }}>
                          {[1, 2, 3, 4, 5].map(s => (
                            <span key={s} style={{
                              fontSize: '0.85rem',
                              color: s <= parseInt(fb.rating) ? '#f59e0b' : '#e2e8f0'
                            }}>★</span>
                          ))}
                          <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginLeft: '4px' }}>({fb.rating}/5)</span>
                        </div>
                      )}

                      {/* Message */}
                      <p style={{
                        margin: 0,
                        fontSize: '0.78rem',
                        color: '#334155',
                        lineHeight: '1.5',
                        background: '#ffffff',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid #f1f5f9'
                      }}>{fb.message}</p>

                      {/* Date */}
                      <p style={{ margin: '8px 0 0 0', fontSize: '0.6rem', color: '#94a3b8', textAlign: 'right' }}>
                        {fb.created_at ? new Date(fb.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}
                      </p>

                      {/* Admin Response Display */}
                      {fb.admin_response && (
                        <div style={{
                          marginTop: '10px',
                          padding: '10px',
                          background: '#f0fdf4',
                          border: '1.5px dashed #b9f6ca',
                          borderRadius: '8px'
                        }}>
                          <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '800', color: '#1b5e20' }}>🛡️ Admin Response:</p>
                          <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#2e7d32', lineHeight: '1.4' }}>{fb.admin_response}</p>
                          <p style={{ margin: '4px 0 0 0', fontSize: '0.58rem', color: '#81c784', textAlign: 'right' }}>
                            {fb.response_at ? new Date(fb.response_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                          </p>
                        </div>
                      )}

                      {/* Response Reply Form */}
                      <div style={{
                        marginTop: '10px',
                        borderTop: '1px solid #e2e8f0',
                        paddingTop: '10px',
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center'
                      }}>
                        <input 
                          type="text" 
                          placeholder={fb.admin_response ? "Update response..." : "Type response to citizen..."}
                          value={replyTextState[fb.id] || ''}
                          onChange={(e) => setReplyTextState(prev => ({ ...prev, [fb.id]: e.target.value }))}
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            fontSize: '0.75rem',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            outline: 'none',
                            background: '#ffffff'
                          }}
                        />
                        <button
                          onClick={() => handleSendFeedbackResponse(fb.id)}
                          disabled={replySubmitting[fb.id]}
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            background: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            opacity: replySubmitting[fb.id] ? 0.7 : 1
                          }}
                        >
                          {replySubmitting[fb.id] ? 'Sending...' : fb.admin_response ? 'Update' : 'Reply'}
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Product Details Modal (Admin View) */}
      {selectedProductDetails && (() => {
        const product = selectedProductDetails;
        const hasImage = product.ImageURL && product.ImageURL.trim() !== '';
        const hasPrice = product.Price && product.Price.trim() !== '';

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
              position: 'relative'
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

              <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#1e293b', margin: '0 0 8px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                Product Details
              </h3>

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
                  <span style={{ fontSize: '2.5rem' }}>📦</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>No Image Available</span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                    {product.Category}
                  </span>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0, lineHeight: '1.3' }}>
                    {product.ProductName || `${product.Brand} Case`}
                  </h4>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                  <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ color: '#64748b', padding: '4px 0', fontWeight: '600' }}>Product ID:</td>
                        <td style={{ textAlign: 'right', fontWeight: '700', color: '#1e293b', fontFamily: 'monospace' }}>{product.ProductID}</td>
                      </tr>
                      {product.TagNumber && (
                        <tr>
                          <td style={{ color: '#64748b', padding: '4px 0', fontWeight: '600' }}>Tag Number:</td>
                          <td style={{ textAlign: 'right', fontWeight: '700', color: '#0284c7' }}>{product.TagNumber}</td>
                        </tr>
                      )}
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
                          <td style={{ color: '#64748b', padding: '4px 0', fontWeight: '600' }}>Price:</td>
                          <td style={{ textAlign: 'right', fontWeight: '900', color: '#0f172a', fontSize: '0.9rem' }}>₹{product.Price}</td>
                        </tr>
                      )}
                      <tr>
                        <td style={{ color: '#64748b', padding: '4px 0', fontWeight: '600' }}>Stock Count:</td>
                        <td style={{ textAlign: 'right', fontWeight: '700', color: Number(product.Count || 0) > 0 ? '#16a34a' : '#dc2626' }}>
                          {product.Count || 0}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  onClick={() => {
                    setSelectedProductDetails(null);
                    startEditProduct(product);
                  }}
                  className="premium-btn premium-btn-primary"
                  style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}
                >
                  Edit Product
                </button>
                <button
                  onClick={() => setSelectedProductDetails(null)}
                  className="premium-btn premium-btn-secondary"
                  style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 99999,
          gap: '14px'
        }}>
          <style>{`
            @keyframes spin-anim {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes pulse-text {
              0%, 100% { opacity: 0.6; }
              50% { opacity: 1; }
            }
          `}</style>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid rgba(16, 185, 129, 0.15)',
            borderTop: '4px solid #10b981',
            borderRadius: '50%',
            animation: 'spin-anim 0.8s linear infinite',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.1)'
          }}></div>
          <span style={{
            fontSize: '0.9rem',
            fontWeight: '800',
            color: '#10b981',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            animation: 'pulse-text 1.5s ease-in-out infinite'
          }}>
            Loading...
          </span>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
