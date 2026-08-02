/**
 * WhatsBro TNService - Database Service
 * Interfaces between the React Frontend and the Google Apps Script Web App API.
 * Exposes a fallback mock system to allow local development and testing if the API is offline or not configured.
 */

import mockData from '../data.json';

// Get Google Apps Script Web App URL from Environment Variables
const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL || '';

if (!GOOGLE_SCRIPT_URL) {
  console.warn(
    "Google Apps Script Web App URL not configured! " +
    "Defining VITE_GOOGLE_SCRIPT_URL in your environment variables (.env) is required for dynamic operations. " +
    "Falling back to local browser storage and static data.json mock for offline demo mode."
  );
}

// --- HELPER: FILE TO BASE64 ENCODER ---
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => {
    // Extract base64 segment from Data URL string (remove prefix 'data:*/*;base64,')
    const base64Str = reader.result.split(',')[1];
    resolve(base64Str);
  };
  reader.onerror = (error) => reject(error);
});

// --- HELPER: CENTRALIZED JSON REST API CALLS ---
const callApi = async (action, payload = {}) => {
  if (!GOOGLE_SCRIPT_URL) {
    return callMockFallback(action, payload);
  }

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // Bypass CORS preflight requests in Google Apps Script
      },
      body: JSON.stringify({
        action,
        ...payload
      })
    });

    if (!response.ok) {
      throw new Error(`API returned HTTP Status ${response.status}`);
    }

    const json = await response.json();
    if (!json.success) {
      throw new Error(json.error || "Unknown Apps Script Execution Failure");
    }

    console.log(`[API POST] Action: ${action} | Response:`, json.data);
    return json.data;
  } catch (err) {
    console.warn(`Google API Network Error on action [${action}]. Falling back to offline mock database:`, err);
    return callMockFallback(action, payload);
  }
};

const callApiGet = async (action, queryParams = {}) => {
  if (!GOOGLE_SCRIPT_URL) {
    return callMockFallback(action, queryParams);
  }

  try {
    const urlParams = new URLSearchParams({ action, ...queryParams, _t: Date.now() });
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?${urlParams.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API returned HTTP Status ${response.status}`);
    }

    const json = await response.json();
    if (!json.success) {
      throw new Error(json.error || "Unknown Apps Script Execution Failure");
    }

    console.log(`[API GET] Action: ${action} | Records:`, Array.isArray(json.data) ? json.data.length : 'N/A');
    return json.data;
  } catch (err) {
    console.warn(`Google GET API Network Error on action [${action}]. Falling back to offline mock database:`, err);
    return callMockFallback(action, queryParams);
  }
};

// --- HELPER: FILE UPLOADER TO GOOGLE DRIVE ---
export const uploadFileToDrive = async (file, folderPathArray) => {
  if (!file) return null;
  
  try {
    const base64Data = await fileToBase64(file);
    const response = await callApi("uploadFile", {
      fileData: base64Data,
      fileName: file.name,
      mimeType: file.type,
      pathArray: folderPathArray
    });
    
    // For PDFs, use standard Drive Viewer URL for proper in-app preview rendering.
    // For images, use Direct Stream Download URL to allow direct native image rendering.
    if (file.type === 'application/pdf') {
      return response.fileUrl;
    }
    return response.downloadUrl;
  } catch (err) {
    console.error("File upload to Google Drive failed:", err);
    throw new Error("Failed to store file in Google Drive. Make sure file size is under 10MB.");
  }
};

// --- POSTS SERVICE ---
export const getPosts = async () => {
  try {
    const data = await callApiGet("getPosts");
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Error in getPosts:", err);
    return [];
  }
};

export const createPost = async (postData) => {
  return await callApi("createPost", { payload: postData });
};

export const updatePost = async (id, postData) => {
  return await callApi("updatePost", { id, payload: postData });
};

export const deletePost = async (id) => {
  return await callApi("deletePost", { id });
};

export const uploadPostImage = async (file) => {
  // Save post banners in parent upload folder
  const url = await uploadFileToDrive(file, ["WhatsBroTNService_Uploads", "Post_Banners"]);
  return { img_url: url };
};

// --- JOBS SERVICE ---
export const getJobs = async () => {
  try {
    const data = await callApiGet("getJobs");
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Error in getJobs:", err);
    return [];
  }
};

export const createJob = async (jobData) => {
  return await callApi("createJob", { payload: jobData });
};

export const updateJob = async (id, jobData) => {
  return await callApi("updateJob", { id, payload: jobData });
};

export const deleteJob = async (id) => {
  return await callApi("deleteJob", { id });
};

export const uploadJobImage = async (file) => {
  const url = await uploadFileToDrive(file, ["WhatsBroTNService_Uploads", "Job_Banners"]);
  return { img_url: url };
};

// --- FORMS SERVICE ---
export const getForms = async () => {
  try {
    const data = await callApiGet("getForms");
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Error in getForms:", err);
    return [];
  }
};

export const getFormById = async (id) => {
  return await callApiGet("getFormById", { id });
};

export const createForm = async (formData) => {
  return await callApi("createForm", { payload: formData });
};

export const updateForm = async (id, formData) => {
  return await callApi("updateForm", { id, payload: formData });
};

export const deleteForm = async (id) => {
  return await callApi("deleteForm", { id });
};

export const duplicateForm = async (id) => {
  return await callApi("duplicateForm", { id });
};

export const uploadFormImage = async (file) => {
  const url = await uploadFileToDrive(file, ["WhatsBroTNService_Uploads", "Form_Images"]);
  return { img_url: url };
};

// --- SUBMISSIONS SERVICE ---
export const submitFormResponse = async (formId, phone, dob, aadhar, responses, status = "submitted", uploadedDocs = null, email = "", subId = null) => {
  const payload = {
    id: subId || undefined,
    form_id: formId,
    phone,
    dob,
    aadhar,
    email,
    responses,
    payment_status: status === "draft" ? "draft" : "unpaid",
    progress_percent: status === "draft" ? 5 : 10,
    progress_desc: status === "draft" 
      ? "Application saved as Draft. Fill remaining details and submit when ready."
      : "Application submitted successfully. Awaiting payment verification.",
    info_request_label: "",
    info_request_type: "text",
    info_request_response: "",
    uploaded_docs: uploadedDocs ? (typeof uploadedDocs === 'string' ? uploadedDocs : JSON.stringify(uploadedDocs)) : undefined
  };
  
  return await callApi("submitFormResponse", { payload });
};

export const getUserStatus = async (phone, dob, aadhar) => {
  try {
    const data = await callApiGet("getUserStatus", { phone, dob, aadhar });
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Error in getUserStatus:", err);
    return [];
  }
};

// --- CITIZEN PROFILE SERVICES ---
export const registerUser = async (userData) => {
  return await callApi("registerUser", { payload: userData });
};

export const loginUser = async (loginData) => {
  return await callApi("loginUser", { payload: loginData });
};

export const notifyAdminLogin = async (phone, aadhar, isNewUser = false, userName = '') => {
  try {
    return await callApi("notifyAdminLogin", { payload: { phone, aadhar, isNewUser, userName } });
  } catch (err) {
    console.log('[Silent Admin Login Notification Error]', err);
  }
};

export const sendOtp = async (email) => {
  return await callApi("sendOtp", { payload: { email } });
};

export const verifyOtp = async (email, otp) => {
  return await callApi("verifyOtp", { payload: { email, otp } });
};

export const checkAadhar = async (aadhar) => {
  return await callApi("checkAadhar", { payload: { aadhar } });
};

export const verifyAdminLogin = async (code) => {
  return await callApi("verifyAdminLogin", { payload: { code } });
};

export const createRedirect = async (payload) => {
  return await callApi("createRedirect", { payload });
};

export const saveLocalOgImage = async ({ key, targetUrl, title, description, imageFile, aspect = 'landscape' }) => {
  let imageBase64 = '';
  if (imageFile) {
    imageBase64 = await fileToBase64(imageFile);
  }

  try {
    const res = await fetch('/api/upload-og-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key,
        targetUrl,
        title,
        description,
        image: imageBase64,
        aspect
      })
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (e) {
    console.warn('[Local OG Save API] Not running Vite dev server or error:', e);
  }
  return null;
};

export const deleteRedirect = async (id) => {
  return await callApi("deleteRedirect", { id });
};

export const getRedirects = async () => {
  return await callApi("getRedirects");
};

export const updateUserProfile = async (userId, profileData) => {
  return await callApi("updateUserProfile", { userId, payload: profileData });
};

export const uploadUserDocument = async (userId, docType, file1, file2 = null) => {
  // Resolve Folder path hierarchy for neat organization in Drive
  // Path: WhatsBroTNService_Uploads / Citizen_Profiles / User_[userId]
  const path = ["WhatsBroTNService_Uploads", "Citizen_Profiles", `User_${userId}`];
  
  const url1 = await uploadFileToDrive(file1, path);
  const url2 = file2 ? await uploadFileToDrive(file2, path) : null;
  
  const updates = {};
  if (docType === "photo") {
    updates.photo_url = url1;
  } else if (docType === "aadhar") {
    updates.aadhar_url_1 = url1;
    updates.aadhar_url_2 = url2;
  } else if (docType === "smart_card") {
    updates.smart_card_url_1 = url1;
    updates.smart_card_url_2 = url2;
  } else if (docType === "voter_id") {
    updates.voter_id_url_1 = url1;
    updates.voter_id_url_2 = url2;
  } else if (docType === "signature") {
    updates.signature_url_1 = url1;
  }
  
  return await updateUserProfile(userId, updates);
};

export const deleteUserDocument = async (userId, docType) => {
  const updates = {};
  if (docType === "photo") {
    updates.photo_url = "";
  } else if (docType === "aadhar") {
    updates.aadhar_url_1 = "";
    updates.aadhar_url_2 = "";
  } else if (docType === "smart_card") {
    updates.smart_card_url_1 = "";
    updates.smart_card_url_2 = "";
  } else if (docType === "voter_id") {
    updates.voter_id_url_1 = "";
    updates.voter_id_url_2 = "";
  } else if (docType === "signature") {
    updates.signature_url_1 = "";
  }
  
  return await updateUserProfile(userId, updates);
};

export const uploadSubmissionDocument = async (subId, docKey, file1, file2 = null) => {
  // Path: WhatsBroTNService_Uploads / Form_Submissions / Submission_[subId]
  const path = ["WhatsBroTNService_Uploads", "Form_Submissions", `Submission_${subId}`];
  
  const url1 = await uploadFileToDrive(file1, path);
  const url2 = file2 ? await uploadFileToDrive(file2, path) : null;
  
  // Get active submission to read and merge current docs list
  const rawSubs = await callApiGet("getSubmissions");
  const subs = Array.isArray(rawSubs) ? rawSubs : [];
  const sub = subs.find(s => s && s.id === subId);
  if (!sub) throw new Error("Submission not found in spreadsheet database");
  
  let currentDocs = {};
  if (sub.uploaded_docs) {
    currentDocs = typeof sub.uploaded_docs === 'string' ? JSON.parse(sub.uploaded_docs) : sub.uploaded_docs;
  }
  
  currentDocs[docKey] = url2 ? [url1, url2] : [url1];
  
  await callApi("adminUpdateSubmission", {
    id: subId,
    payload: { uploaded_docs: JSON.stringify(currentDocs) }
  });
  
  return {
    success: true,
    doc_key: docKey,
    urls: currentDocs[docKey]
  };
};

export const uploadPaymentScreenshot = async (subId, file) => {
  const path = ["WhatsBroTNService_Uploads", "Payments", `Submission_${subId}`];
  const url = await uploadFileToDrive(file, path);
  
  return await callApi("adminUpdateSubmission", {
    id: subId,
    payload: {
      payment_screenshot: url,
      progress_desc: "Payment receipt uploaded. Admin is verifying your payment details."
    }
  });
};

export const uploadOutputPdf = async (subId, file) => {
  const path = ["WhatsBroTNService_Uploads", "Output_Certificates", `Submission_${subId}`];
  const url = await uploadFileToDrive(file, path);
  
  return await callApi("adminUpdateSubmission", {
    id: subId,
    payload: {
      uploaded_pdf_url: url,
      progress_percent: 100,
      progress_desc: "Congratulations! Your official certificate has been verified, generated and uploaded."
    }
  });
};

export const adminUploadDoc = async (subId, docType, file) => {
  const path = ["WhatsBroTNService_Uploads", "Admin_Official_Docs", `Submission_${subId}`];
  const url = await uploadFileToDrive(file, path);
  
  const columnMap = {
    receipt: 'receipt_url',
    certificate: 'certificate_url',
    other: 'other_doc_url'
  };
  const dbColName = columnMap[docType];
  
  return await callApi("adminUpdateSubmission", {
    id: subId,
    payload: { [dbColName]: url }
  });
};

export const adminDeleteDoc = async (subId, docType) => {
  const columnMap = {
    receipt: 'receipt_url',
    certificate: 'certificate_url',
    other: 'other_doc_url'
  };
  const dbColName = columnMap[docType];
  
  return await callApi("adminUpdateSubmission", {
    id: subId,
    payload: { [dbColName]: "" }
  });
};

/// --- ADMIN USERS LIST SERVICES ---
export const getUsersList = async () => {
  try {
    const rawSubs = await callApiGet("getSubmissions");
    const rawUsers = await callApiGet("getUsers");
    
    const subs = Array.isArray(rawSubs) ? rawSubs : [];
    const users = Array.isArray(rawUsers) ? rawUsers : [];
    
    const seenAadhar = new Set();
    const uniqueUsers = [];
    
    const parseResp = (resp) => {
      if (!resp) return {};
      if (typeof resp === 'string') {
        try { return JSON.parse(resp); } catch (e) { return {}; }
      }
      return resp;
    };
    
    // 1. Process all registered users first (so everyone shows up with complete profile data!)
    for (const u of users) {
      if (u && (u.aadhar || u.phone)) {
        const cleanAadhar = (u.aadhar || '').toString().trim();
        if (cleanAadhar && seenAadhar.has(cleanAadhar)) continue;
        if (cleanAadhar) seenAadhar.add(cleanAadhar);
        
        // Find their latest submission to determine last_active date and fallback fields
        const userSubs = subs.filter(s => s && ((cleanAadhar && s.aadhar && s.aadhar.toString().trim() === cleanAadhar) || (u.phone && s.phone && s.phone.toString().trim() === u.phone.toString().trim())));
        let lastActive = u.created_at || new Date().toISOString();
        let fallbackResp = {};
        if (userSubs.length > 0) {
          userSubs.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
          lastActive = userSubs[0].submitted_at;
          fallbackResp = parseResp(userSubs[0].responses);
        }
        
        const extractedName = u.name || fallbackResp['Full Name / பெயர்'] || fallbackResp['Applicant Name'] || fallbackResp['Name'] || fallbackResp['Citizen Name'] || 'Citizen User';
        
        uniqueUsers.push({
          ...u, // Preserve all user profile properties (father_name, address, district, etc.)
          aadhar: cleanAadhar || u.aadhar || '',
          phone: u.phone || (userSubs[0]?.phone) || '',
          dob: u.dob || (userSubs[0]?.dob) || '',
          last_active: lastActive,
          name: extractedName,
          father_name: u.father_name || fallbackResp['Father Name / தகப்பனார் பெயர்'] || fallbackResp['Father Name'] || fallbackResp['Father / Husband Name'] || '',
          mother_name: u.mother_name || fallbackResp['Mother Name / தாயார் பெயர்'] || fallbackResp['Mother Name'] || '',
          address: u.address || fallbackResp['Residential Address / முகவரி'] || fallbackResp['Address'] || fallbackResp['Full Address'] || '',
          district: u.district || fallbackResp['District / மாவட்டம்'] || fallbackResp['District'] || '',
          taluk: u.taluk || fallbackResp['Taluk / தாலுகா'] || fallbackResp['Taluk'] || '',
          pincode: u.pincode || fallbackResp['Pincode / அஞ்சல் குறியீடு'] || fallbackResp['Pincode'] || '',
          gender: u.gender || fallbackResp['Gender / பாலினம்'] || fallbackResp['Gender'] || '',
          community: u.community || fallbackResp['Community / சமூகம்'] || fallbackResp['Community'] || '',
          photo_url: u.photo_url || null,
          aadhar_url_1: u.aadhar_url_1 || null,
          aadhar_url_2: u.aadhar_url_2 || null,
          smart_card_url_1: u.smart_card_url_1 || null,
          smart_card_url_2: u.smart_card_url_2 || null,
          voter_id_url_1: u.voter_id_url_1 || null,
          voter_id_url_2: u.voter_id_url_2 || null,
          signature_url_1: u.signature_url_1 || null
        });
      }
    }
    
    // 2. Append any submission users who are not registered in the Users sheet (fallback)
    for (const sub of subs) {
      if (sub && (sub.aadhar || sub.phone)) {
        const cleanAadhar = sub.aadhar ? sub.aadhar.toString().trim() : '';
        if (cleanAadhar && !seenAadhar.has(cleanAadhar)) {
          seenAadhar.add(cleanAadhar);
          const resp = parseResp(sub.responses);
          const extractedName = resp['Full Name / பெயர்'] || resp['Applicant Name'] || resp['Name'] || resp['Citizen Name'] || 'Citizen User';

          uniqueUsers.push({
            id: `usr-${cleanAadhar || sub.phone}`,
            aadhar: cleanAadhar,
            phone: sub.phone || '',
            dob: sub.dob || resp['Date of Birth'] || resp['DOB'] || '',
            last_active: sub.submitted_at,
            name: extractedName,
            father_name: resp['Father Name / தகப்பனார் பெயர்'] || resp['Father Name'] || resp['Father / Husband Name'] || '',
            mother_name: resp['Mother Name / தாயார் பெயர்'] || resp['Mother Name'] || '',
            address: resp['Residential Address / முகவரி'] || resp['Address'] || resp['Full Address'] || '',
            district: resp['District / மாவட்டம்'] || resp['District'] || '',
            taluk: resp['Taluk / தாலுகா'] || resp['Taluk'] || '',
            pincode: resp['Pincode / அஞ்சல் குறியீடு'] || resp['Pincode'] || '',
            gender: resp['Gender / பாலினம்'] || resp['Gender'] || '',
            community: resp['Community / சமூகம்'] || resp['Community'] || '',
            photo_url: null,
            aadhar_url_1: null,
            aadhar_url_2: null,
            smart_card_url_1: null,
            smart_card_url_2: null,
            voter_id_url_1: null,
            voter_id_url_2: null,
            signature_url_1: null
          });
        }
      }
    }
    
    return uniqueUsers;
  } catch (err) {
    console.error("Error in getUsersList:", err);
    return [];
  }
};
 
export const getSubmissionsByUser = async (aadhar) => {
  try {
    const data = await callApiGet("getUserSubmissions", { aadhar });
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Error in getSubmissionsByUser:", err);
    return [];
  }
};

export const adminUpdateSubmission = async (subId, updateData) => {
  return await callApi("adminUpdateSubmission", { id: subId, payload: updateData });
};

export const deleteSubmission = async (subId) => {
  return await callApi("deleteSubmission", { id: subId });
};

export const deleteUserAndSubmissions = async (aadhar) => {
  return await callApi("deleteUserAndSubmissions", { aadhar });
};

export const submitInfoRequestResponse = async (subId, valueOrFile, isFile = false) => {
  let responseText = valueOrFile;
  
  if (isFile) {
    const path = ["WhatsBroTNService_Uploads", "Requested_Information", `Submission_${subId}`];
    responseText = await uploadFileToDrive(valueOrFile, path);
  }
  
  return await callApi("submitInfoRequestResponse", {
    id: subId,
    payload: { response: responseText }
  });
};

// --- FEEDBACK SERVICE ---
export const submitFeedback = async (userName, userPhone, userAadhar, message, rating) => {
  const payload = {
    user_name: userName,
    user_phone: userPhone,
    user_aadhar: userAadhar,
    message,
    rating
  };
  return await callApi("submitFeedback", { payload });
};

export const getFeedback = async () => {
  try {
    const data = await callApiGet("getFeedback");
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Error in getFeedback:", err);
    return [];
  }
};

export const deleteFeedback = async (id) => {
  return await callApi("deleteFeedback", { id });
};

export const replyFeedback = async (id, responseText) => {
  return await callApi("replyFeedback", { id, responseText });
};

// --- SETTINGS SERVICE ---
export const getSettings = async () => {
  try {
    return await callApiGet("getSettings");
  } catch (err) {
    console.error("Error in getSettings:", err);
    return {};
  }
};

export const updateSettings = async (settingsData) => {
  return await callApi("updateSettings", { payload: settingsData });
};

// --- ANNOUNCEMENTS SERVICE ---
export const getAnnouncements = async () => {
  try {
    return await callApiGet("getAnnouncements");
  } catch (err) {
    console.error("Error in getAnnouncements:", err);
    return [];
  }
};

export const createAnnouncement = async (payload) => {
  return await callApi("createAnnouncement", { payload });
};

export const updateAnnouncement = async (id, payload) => {
  return await callApi("updateAnnouncement", { id, payload });
};

export const deleteAnnouncement = async (id) => {
  return await callApi("deleteAnnouncement", { id });
};

export const uploadAnnouncementImage = async (file) => {
  const url = await uploadFileToDrive(file, ["WhatsBroTNService_Uploads", "Announcement_Banners"]);
  return { img_url: url };
};

// --- PRODUCTS SERVICE ---
export const getProducts = async () => {
  try {
    const data = await callApiGet("getProducts");
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Error in getProducts:", err);
    return [];
  }
};

export const createProduct = async (productData) => {
  return await callApi("createProduct", { payload: productData });
};

export const updateProduct = async (id, productData) => {
  return await callApi("updateProduct", { id, payload: productData });
};

export const deleteProduct = async (id) => {
  return await callApi("deleteProduct", { id });
};

export const uploadProductImage = async (file) => {
  const url = await uploadFileToDrive(file, ["WhatsBroTNService_Uploads", "Accessories_Images"]);
  return { img_url: url };
};

// --- TEMPERED GLASS SERVICE ---
export const getTemperedGlass = async () => {
  try {
    const data = await callApiGet("getTemperedGlass");
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Error in getTemperedGlass:", err);
    return [];
  }
};

export const createTemperedGlass = async (tgData) => {
  return await callApi("createTemperedGlass", { payload: tgData });
};

export const updateTemperedGlass = async (boxNumber, tgData) => {
  return await callApi("updateTemperedGlass", { id: boxNumber, payload: tgData });
};

export const deleteTemperedGlass = async (boxNumber) => {
  return await callApi("deleteTemperedGlass", { id: boxNumber });
};

// --- MOCK DATABASE FALLBACK SYSTEM (LOCALSTORAGE) ---
const callMockFallback = (action, payload) => {
  console.log(`[Offline Mode] Simulating Action: ${action}`, payload);
  
  // Set up localStorage models
  if (!localStorage.getItem('mock_posts')) {
    localStorage.setItem('mock_posts', JSON.stringify(mockData.posts));
  }
  if (!localStorage.getItem('mock_products')) {
    const defaultProducts = [
      {
        ProductID: "prod-1",
        Category: "Phone Cover",
        CoverType: "Case",
        Brand: "Samsung",
        CustomBrand: "",
        ModelName: "Samsung S24 Ultra",
        ProductName: "Samsung S24 Ultra Clear Case",
        Type: "",
        Price: "299",
        TagNumber: "TAG-S24U-01",
        ImageURL: "",
        Count: "5",
        CreatedDate: new Date().toISOString()
      },
      {
        ProductID: "prod-2",
        Category: "Phone Cover",
        CoverType: "Flip Case",
        Brand: "Apple",
        CustomBrand: "",
        ModelName: "iPhone 15 Pro",
        ProductName: "iPhone 15 Pro Leather Flip Case",
        Type: "",
        Price: "499",
        TagNumber: "TAG-IP15P-02",
        ImageURL: "",
        Count: "0",
        CreatedDate: new Date().toISOString()
      },
      {
        ProductID: "prod-3",
        Category: "Headphone",
        CoverType: "",
        Brand: "Sony",
        CustomBrand: "",
        ModelName: "",
        ProductName: "SUBI BassBoost Wireless Headphone",
        Type: "",
        Price: "999",
        TagNumber: "TAG-HP-03",
        ImageURL: "",
        Count: "3",
        CreatedDate: new Date().toISOString()
      },
      {
        ProductID: "prod-4",
        Category: "Speaker",
        CoverType: "",
        Brand: "JBL",
        CustomBrand: "",
        ModelName: "",
        ProductName: "SUBI Go Portable Bluetooth Speaker",
        Type: "",
        Price: "1499",
        TagNumber: "TAG-SPK-04",
        ImageURL: "",
        Count: "0",
        CreatedDate: new Date().toISOString()
      },
      {
        ProductID: "prod-5",
        Category: "Charger",
        CoverType: "",
        Brand: "Anker",
        CustomBrand: "",
        ModelName: "",
        ProductName: "SUBI SuperCharge Dual Port 33W",
        Type: "Fast Charger",
        Price: "350",
        TagNumber: "TAG-CHG-05",
        ImageURL: "",
        Count: "10",
        CreatedDate: new Date().toISOString()
      }
    ];
    localStorage.setItem('mock_products', JSON.stringify(defaultProducts));
  }
  if (!localStorage.getItem('mock_tempered_glass')) {
    const defaultTG = [
      { BoxNumber: "B12", ModelList: "Samsung A15, Samsung A16, Vivo T3, Redmi Note 13, Oppo A59" },
      { BoxNumber: "B15", ModelList: "iPhone 13, iPhone 14, iPhone 15, iPhone 15 Pro" },
      { BoxNumber: "A04", ModelList: "OnePlus Nord CE 3, OnePlus 11R, Realme 12 Pro, POCO X6" }
    ];
    localStorage.setItem('mock_tempered_glass', JSON.stringify(defaultTG));
  }
  const defaultJobs = [
    {
      id: 1,
      title: "TNPSC Combined Technical Services Exam (CTSE) 2026",
      description: "Tamil Nadu Public Service Commission (TNPSC) Combined Technical Services Examination (CTSE) – ITI / Diploma Level Recruitment 2026 for technical posts in Tamil Nadu Government Departments.",
      img_url: "",
      start_date: "2026-08-01",
      end_date: "2026-08-31",
      apply_url: "https://apply.tnpscexams.in/",
      button_name: "Apply on TNPSC Portal",
      details_doc: `---

H2: Overview

table:
Organization$Tamil Nadu Public Service Commission (TNPSC)
Exam Name$Combined Technical Services Examination (CTSE)
Level$ITI / Diploma Level
Job Type$Tamil Nadu Government Job
Application Mode$Online
Job Location$Tamil Nadu
Last Date$Check Official Notification

---

H2: About Recruitment

Tamil Nadu Public Service Commission (TNPSC) நிறுவனம் Combined Technical Services Examination (CTSE) – ITI / Diploma Level Recruitment 2026 அறிவிப்பை வெளியிட்டுள்ளது. ITI மற்றும் Diploma தகுதியுடைய விண்ணப்பதாரர்கள் தமிழ்நாடு அரசுத் துறைகளில் தொழில்நுட்ப பணியிடங்களுக்கு ஆன்லைனில் விண்ணப்பிக்கலாம்.

---

H2: Vacancy Details

table:
Technical Posts$Various Posts
ITI Level Posts$Various Posts
Diploma Level Posts$Various Posts
Total Vacancies$As Per Official Notification

---

H2: Educational Qualification

table:
ITI Posts$ITI in Relevant Trade
Diploma Posts$Diploma in Relevant Discipline
Experience$As Per Official Notification

அதிகாரப்பூர்வ அறிவிப்பில் குறிப்பிடப்பட்டுள்ள ITI அல்லது Diploma தகுதியை பெற்றவர்கள் விண்ணப்பிக்கலாம்.

---

H2: Age Limit

வயது வரம்பு அதிகாரப்பூர்வ அறிவிப்பின்படி இருக்கும்.

தமிழ்நாடு அரசு விதிகளின்படி வயது தளர்வு வழங்கப்படும்.

---

H2: Salary Details

table:
Salary$As Per TN Government Pay Matrix

தேர்வு செய்யப்படும் விண்ணப்பதாரர்களுக்கு தமிழ்நாடு அரசின் ஊதிய விதிமுறைகளின்படி சம்பளம் மற்றும் பிற சலுகைகள் வழங்கப்படும்.

---

H2: Selection Process

table:
Stage 1$Computer Based Test (CBT)
Stage 2$Certificate Verification
Stage 3$Final Selection

---

H2: Important Dates

table:
Application Start Date$Available Now
Last Date to Apply$Check Official Notification
Exam Date$As Per Schedule

---

H2: How to Apply

1. TNPSC Apply Portal-க்கு செல்லவும்.
2. Official Notification-ஐ முழுமையாக படிக்கவும்.
3. One Time Registration (OTR) செய்து Login செய்யவும்.
4. Online Application Form-ஐ சரியாக நிரப்பவும்.
5. தேவையான ஆவணங்களை பதிவேற்றவும்.
6. விண்ணப்பக் கட்டணத்தை செலுத்தவும்.
7. விண்ணப்பத்தை சமர்ப்பித்து அதன் நகலை பதிவிறக்கம் செய்து வைத்துக் கொள்ளவும்.

---

H2: Important Links

table:
Apply Online$https://apply.tnpscexams.in/
Official Notification$https://www.tnpsc.gov.in/
Official Website$https://www.tnpsc.gov.in/

---`,
      coming_soon: "false",
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      title: "RRB Recruitment 2026 – Apply Online for Various Railway Posts",
      description: "Railway Recruitment Board (RRB) 2026 recruitment notification for Section Controller, Station Master & Goods Manager. Required qualification: Any Degree / ITI. Total 119 Vacancies.",
      img_url: "",
      start_date: "2026-07-15",
      end_date: "2026-08-14",
      apply_url: "/user?tab=apply",
      button_name: "Apply on Citizen Portal",
      details_doc: "H1: RRB Recruitment 2026 – Apply Online for Various Railway Posts\nH2: Railway Recruitment Board (RRB) Overview\n---\nH3: Organization Overview\ntable:\nOrganization, Railway Recruitment Board (RRB)\nPost Name, Various Railway Posts\nApplication Mode, Online\nJob Location, All India\nTotal Vacancies, 119 Posts\n---\nH1: Vacancy Details & Qualifications\nH2: Post-Wise Breakdown\ntable:\nDesignation Post, Qualification, Vacancies\nSection Controller, Any Degree in Electrical/Civil/Mechanical, 45\nStation Master, Any Graduate Degree, 50\nGoods Train Manager, Any Graduate Degree, 24\n---\nH1: Age Limit & Pay Scale\nH2: Eligibility Criteria\nH3: Age Limit: 20 – 33 Years (Age relaxation as per Government rules)\ntable:\nCategory, Minimum Salary, Maximum Salary\nSection Controller, Rs. 35,400 /-, Rs. 1,12,400 /-\nStation Master, Rs. 35,400 /-, Rs. 1,12,400 /-\n---\nH1: Selection Process & Important Dates\ntable:\nStage, Selection Procedure\nStage 1, Computer Based Test (CBT)\nStage 2, Document Verification & Medical Examination\n---\nH3: Important Recruitment Dates\ntable:\nApplication Start Date, Application End Date\n15 July 2026, 14 August 2026",
      coming_soon: "false",
      created_at: new Date().toISOString()
    },
    {
      id: 3,
      title: "TNEB Wireman & Helper Openings 2026",
      description: "Tamil Nadu Electricity Board (TNEB) announces openings for Wireman positions. Required qualification: ITI in Electrical Trade. Age limit: 18-35 years.",
      img_url: "",
      start_date: "2026-07-10",
      end_date: "2026-08-25",
      apply_url: "/user?tab=apply",
      button_name: "Apply on Citizen Portal",
      details_doc: "H1: TNEB ITI Wireman Openings 2026\nH2: Selection Criteria and Key Details\n---\nH3: Category Vacancy Details\ntable:\nCategory, Vacancies, Qualification\nGeneral Turn, 50, ITI in Electrical Trade\nBackward Classes (BC), 45, ITI in Electrical Trade\nMost Backward Classes (MBC), 35, ITI in Electrical Trade\nScheduled Castes / Tribes (SC/ST), 20, ITI in Electrical Trade\n---\nH3: Selection Procedure\nCandidates will be selected based on marks secured in competitive examination followed by document verification.",
      coming_soon: "false",
      created_at: new Date().toISOString()
    }
  ];

  if (!localStorage.getItem('mock_jobs') || !localStorage.getItem('mock_jobs_updated_v3')) {
    localStorage.setItem('mock_jobs', JSON.stringify(defaultJobs));
    localStorage.setItem('mock_jobs_updated_v3', 'true');
  }
  if (!localStorage.getItem('mock_forms')) {
    localStorage.setItem('mock_forms', JSON.stringify(mockData.forms));
  }
  if (!localStorage.getItem('mock_submissions')) {
    localStorage.setItem('mock_submissions', JSON.stringify(mockData.submissions));
  }
  if (!localStorage.getItem('mock_users')) {
    localStorage.setItem('mock_users', JSON.stringify(mockData.users));
  }

  const getMockList = (key) => JSON.parse(localStorage.getItem(key));
  const saveMockList = (key, data) => localStorage.setItem(key, JSON.stringify(data));

  switch (action) {
    case "getPosts":
      return getMockList('mock_posts');
      
    case "createPost": {
      const list = getMockList('mock_posts');
      const newPost = { id: Date.now(), ...payload.payload, created_at: new Date().toISOString() };
      list.push(newPost);
      saveMockList('mock_posts', list);
      return newPost;
    }
    
    case "updatePost": {
      const list = getMockList('mock_posts');
      const idx = list.findIndex(p => p.id === payload.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...payload.payload };
        saveMockList('mock_posts', list);
        return list[idx];
      }
      throw new Error("Post template not found");
    }
    
    case "deletePost": {
      let list = getMockList('mock_posts');
      list = list.filter(p => p.id !== payload.id);
      saveMockList('mock_posts', list);
      return { success: true };
    }
    
    case "getForms":
      return getMockList('mock_forms');
      
    case "getFormById": {
      const list = getMockList('mock_forms');
      const form = list.find(f => f.id === payload.id);
      if (!form) throw new Error("Form not found");
      return form;
    }
    
    case "createForm": {
      const list = getMockList('mock_forms');
      const newForm = { id: `form-${Math.random().toString(36).substring(2, 8)}`, ...payload.payload, created_at: new Date().toISOString() };
      list.push(newForm);
      saveMockList('mock_forms', list);
      return newForm;
    }
    
    case "updateForm": {
      const list = getMockList('mock_forms');
      const idx = list.findIndex(f => f.id === payload.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...payload.payload };
        saveMockList('mock_forms', list);
        return list[idx];
      }
      throw new Error("Form template not found");
    }
    
    case "deleteForm": {
      let list = getMockList('mock_forms');
      list = list.filter(f => f.id !== payload.id);
      saveMockList('mock_forms', list);
      return { success: true };
    }
    
    case "duplicateForm": {
      const list = getMockList('mock_forms');
      const form = list.find(f => f.id === payload.id);
      if (!form) throw new Error("Form template not found");
      const dupe = { ...form, id: `form-${Math.random().toString(36).substring(2, 8)}`, title: `${form.title} (Copy)`, created_at: new Date().toISOString() };
      list.push(dupe);
      saveMockList('mock_forms', list);
      return dupe;
    }
    
    case "loginUser": {
      const list = getMockList('mock_users');
      const phoneClean = (payload.payload.phone || '').toString().replace(/\D/g, '');
      const aadharClean = (payload.payload.aadhar || payload.payload.aadhar_prefix || '').toString().replace(/\D/g, '');
      const emailInput = (payload.payload.email || '').toString().trim();
      
      let idx = list.findIndex(x => {
        const uPhone = (x.phone || '').toString().replace(/\D/g, '');
        const uAadhar = (x.aadhar || '').toString().replace(/\D/g, '');
        return (phoneClean && uPhone === phoneClean) || (aadharClean && (uAadhar === aadharClean || uAadhar.startsWith(aadharClean)));
      });

      let u = idx !== -1 ? list[idx] : null;
      let isNewUser = false;

      if (u) {
        // If email provided during login, update existing user profile email
        if (emailInput && u.email !== emailInput) {
          u.email = emailInput;
          list[idx] = u;
          saveMockList('mock_users', list);
        }
      } else {
        // Search previous submissions to recover stored details if available
        const subs = getMockList('mock_submissions') || [];
        const userSubs = subs.filter(s => {
          const sPhone = (s.phone || '').toString().replace(/\D/g, '');
          const sAadhar = (s.aadhar || '').toString().replace(/\D/g, '');
          return (phoneClean && sPhone === phoneClean) || (aadharClean && sAadhar === aadharClean);
        });

        let recoveredData = {};
        if (userSubs.length > 0) {
          userSubs.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
          let resp = userSubs[0].responses || {};
          if (typeof resp === 'string') {
            try { resp = JSON.parse(resp); } catch (e) { resp = {}; }
          }
          recoveredData = {
            name: resp['Full Name / பெயர்'] || resp['Applicant Name'] || resp['Name'] || resp['Citizen Name'] || '',
            father_name: resp['Father Name / தகப்பனார் பெயர்'] || resp['Father Name'] || resp['Father / Husband Name'] || '',
            mother_name: resp['Mother Name / தாயார் பெயர்'] || resp['Mother Name'] || '',
            address: resp['Residential Address / முகவரி'] || resp['Address'] || resp['Full Address'] || '',
            district: resp['District / மாவட்டம்'] || resp['District'] || '',
            taluk: resp['Taluk / தாலுகா'] || resp['Taluk'] || '',
            pincode: resp['Pincode / அஞ்சல் குறியீடு'] || resp['Pincode'] || '',
            gender: resp['Gender / பாலினம்'] || resp['Gender'] || '',
            community: resp['Community / சமூகம்'] || resp['Community'] || '',
            dob: userSubs[0].dob || resp['Date of Birth'] || resp['DOB'] || '',
            email: resp['Email Address / மின்னஞ்சல் முகவரி'] || resp['Email'] || resp['Email ID'] || ''
          };
        }

        isNewUser = userSubs.length === 0;
        u = {
          id: `usr-${Date.now()}`,
          phone: phoneClean,
          aadhar: aadharClean,
          name: recoveredData.name || '',
          name_tamil: '',
          dob: recoveredData.dob || '',
          gender: recoveredData.gender || '',
          marital_status: '',
          father_name: recoveredData.father_name || '',
          father_name_tamil: '',
          mother_name: recoveredData.mother_name || '',
          mother_name_tamil: '',
          community: recoveredData.community || '',
          address: recoveredData.address || '',
          religion: '',
          state: 'Tamil Nadu',
          district: recoveredData.district || '',
          taluk: recoveredData.taluk || '',
          revenue_village: '',
          street_name: '',
          door_no: '',
          pincode: recoveredData.pincode || '',
          email: emailInput || recoveredData.email || '',
          created_at: new Date().toISOString()
        };
        list.push(u);
        saveMockList('mock_users', list);
      }

      // Silent admin alert (fire & forget background alert)
      notifyAdminLogin(phoneClean, aadharClean, isNewUser, u.name).catch(() => {});

      return u;
    }

    case "notifyAdminLogin": {
      console.log(`[Silent Admin Alert] User login: Phone=${payload.payload.phone}, Aadhaar=${payload.payload.aadhar}, isNewUser=${payload.payload.isNewUser}`);
      return { status: "sent" };
    }
    
    case "registerUser": {
      const list = getMockList('mock_users');
      const exists = list.some(x => x.dob === payload.payload.dob && x.phone === payload.payload.phone);
      if (exists) throw new Error("User profile already exists.");
      const newUser = { id: list.length + 1, ...payload.payload, created_at: new Date().toISOString() };
      list.push(newUser);
      saveMockList('mock_users', list);
      return newUser;
    }
    
    case "updateUserProfile": {
      const list = getMockList('mock_users');
      const idx = list.findIndex(x => x.id === payload.userId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...payload.payload };
        saveMockList('mock_users', list);
        return list[idx];
      }
      throw new Error("Profile not found");
    }
    
    case "submitFormResponse": {
      const list = getMockList('mock_submissions');
      const p = payload.payload;
      const phoneClean = (p.phone || '').toString().replace(/\D/g, '');
      const aadharClean = (p.aadhar || '').toString().replace(/\D/g, '');
      const formId = p.form_id;

      // Find existing submission for this form_id + user to prevent duplicate rows
      let idx = -1;
      if (p.id) {
        idx = list.findIndex(s => s.id === p.id);
      } else if (formId && (aadharClean || phoneClean)) {
        idx = list.findIndex(s => s.form_id === formId && ((aadharClean && (s.aadhar || '').toString().replace(/\D/g, '') === aadharClean) || (phoneClean && (s.phone || '').toString().replace(/\D/g, '') === phoneClean)));
      }

      if (idx !== -1) {
        const existing = list[idx];
        const isAlreadyFinal = existing.payment_status && existing.payment_status !== 'draft';
        const isNewSubmitFinal = p.payment_status && p.payment_status !== 'draft';

        if (isAlreadyFinal && isNewSubmitFinal) {
          throw new Error("You have already submitted an application for this service. Duplicate submissions are not permitted.");
        }

        list[idx] = {
          ...existing,
          ...p,
          id: existing.id,
          submitted_at: isNewSubmitFinal ? new Date().toISOString() : (existing.submitted_at || new Date().toISOString())
        };
        saveMockList('mock_submissions', list);
        return list[idx];
      }

      const sub = {
        id: p.id || `sub-${Math.random().toString(36).substring(2, 8)}`,
        submitted_at: new Date().toISOString(),
        ...p
      };
      list.push(sub);
      saveMockList('mock_submissions', list);
      return sub;
    }
    
    case "getSubmissions":
      return getMockList('mock_submissions');
      
    case "getUsers":
      return getMockList('mock_users');
      
    case "getUserStatus": {
      const list = getMockList('mock_submissions');
      return list.filter(s => s.dob === payload.dob && (s.phone === payload.phone || s.aadhar === payload.aadhar));
    }
    
    case "getUserSubmissions": {
      const list = getMockList('mock_submissions');
      return list.filter(s => s.aadhar === payload.aadhar);
    }
    
    case "adminUpdateSubmission": {
      const list = getMockList('mock_submissions');
      const idx = list.findIndex(s => s.id === payload.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...payload.payload };
        saveMockList('mock_submissions', list);
        return list[idx];
      }
      throw new Error("Submission not found");
    }
    
    case "submitInfoRequestResponse": {
      const list = getMockList('mock_submissions');
      const idx = list.findIndex(s => s.id === payload.id);
      if (idx !== -1) {
        list[idx].info_request_response = payload.payload.response;
        saveMockList('mock_submissions', list);
        return list[idx];
      }
      throw new Error("Submission not found");
    }
    
    case "deleteSubmission": {
      let list = getMockList('mock_submissions');
      list = list.filter(s => s.id !== payload.id);
      saveMockList('mock_submissions', list);
      return { success: true };
    }
    
    case "deleteUserAndSubmissions": {
      let subs = getMockList('mock_submissions');
      subs = subs.filter(s => s.aadhar !== payload.aadhar);
      saveMockList('mock_submissions', subs);
      
      let users = getMockList('mock_users');
      users = users.filter(u => u.aadhar !== payload.aadhar);
      saveMockList('mock_users', users);
      return { success: true };
    }
    
    case "getJobs":
      return getMockList('mock_jobs');
      
    case "createJob": {
      const list = getMockList('mock_jobs');
      const newJob = { id: Date.now(), ...payload.payload, created_at: new Date().toISOString() };
      list.push(newJob);
      saveMockList('mock_jobs', list);
      return newJob;
    }
    
    case "updateJob": {
      const list = getMockList('mock_jobs');
      const idx = list.findIndex(j => j.id === payload.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...payload.payload };
        saveMockList('mock_jobs', list);
        return list[idx];
      }
      throw new Error("Job alert not found");
    }
    
    case "deleteJob": {
      let list = getMockList('mock_jobs');
      list = list.filter(j => j.id !== payload.id);
      saveMockList('mock_jobs', list);
      return { success: true };
    }
    
    case "submitFeedback": {
      const feedList = JSON.parse(localStorage.getItem('mock_feedback') || '[]');
      const newFb = {
        id: `fb-${Math.random().toString(36).substring(2, 8)}`,
        ...payload.payload,
        created_at: new Date().toISOString()
      };
      feedList.push(newFb);
      localStorage.setItem('mock_feedback', JSON.stringify(feedList));
      return newFb;
    }
    
    case "getFeedback":
      return JSON.parse(localStorage.getItem('mock_feedback') || '[]');
      
    case "deleteFeedback": {
      let feedList = JSON.parse(localStorage.getItem('mock_feedback') || '[]');
      feedList = feedList.filter(f => f.id !== payload.id);
      localStorage.setItem('mock_feedback', JSON.stringify(feedList));
      return { success: true };
    }
    
    case "replyFeedback": {
      let feedList = JSON.parse(localStorage.getItem('mock_feedback') || '[]');
      const index = feedList.findIndex(f => f.id === payload.id);
      if (index !== -1) {
        feedList[index].admin_response = payload.responseText;
        feedList[index].response_at = new Date().toISOString();
        localStorage.setItem('mock_feedback', JSON.stringify(feedList));
        return feedList[index];
      }
      throw new Error("Feedback entry not found.");
    }
    
    case "getSettings":
      return JSON.parse(localStorage.getItem('mock_settings') || '{"admin_email":""}');
      
    case "updateSettings": {
      const currentSettings = JSON.parse(localStorage.getItem('mock_settings') || '{"admin_email":""}');
      const mergedSettings = { ...currentSettings, ...payload.payload };
      localStorage.setItem('mock_settings', JSON.stringify(mergedSettings));
      return mergedSettings;
    }

    case "getAnnouncements":
      return JSON.parse(localStorage.getItem('mock_announcements') || '[]');
      
    case "createAnnouncement": {
      const annList = JSON.parse(localStorage.getItem('mock_announcements') || '[]');
      const newAnn = {
        id: 'ann-' + Date.now(),
        title: payload.payload.title || "",
        description: payload.payload.description || "",
        content: payload.payload.content || "",
        img_url: payload.payload.img_url || "",
        button_name: payload.payload.button_name || "",
        button_url: payload.payload.button_url || "",
        enabled: payload.payload.enabled !== undefined ? String(payload.payload.enabled) : "true",
        created_at: new Date().toISOString()
      };
      annList.push(newAnn);
      localStorage.setItem('mock_announcements', JSON.stringify(annList));
      return newAnn;
    }
    
    case "updateAnnouncement": {
      let annList = JSON.parse(localStorage.getItem('mock_announcements') || '[]');
      annList = annList.map(a => a.id === payload.id ? { ...a, ...payload.payload } : a);
      localStorage.setItem('mock_announcements', JSON.stringify(annList));
      return annList;
    }
    
    case "deleteAnnouncement": {
      let annList = JSON.parse(localStorage.getItem('mock_announcements') || '[]');
      annList = annList.filter(a => a.id !== payload.id);
      localStorage.setItem('mock_announcements', JSON.stringify(annList));
      return { success: true };
    }
    
    case "uploadFile":
      // Return the base64 directly as a data URL for mock mode so images actually appear
      const dataUrl = `data:${payload.mimeType || 'image/png'};base64,${payload.fileData}`;
      return {
        fileName: payload.fileName,
        fileUrl: dataUrl,
        downloadUrl: dataUrl
      };
      
    case "sendOtp":
      console.log(`[Mock] Simulating OTP send to ${payload.payload.email}`);
      return { success: true, message: `OTP sent to ${payload.payload.email}` };

    case "verifyOtp":
      console.log(`[Mock] Simulating OTP verification for ${payload.payload.email} with OTP ${payload.payload.otp}`);
      // Accept any 6-digit OTP for testing, or specifically '123456'
      if (payload.payload.otp === '123456' || (payload.payload.otp && payload.payload.otp.length === 6)) {
        return { success: true, verified: true };
      }
      return { success: false, verified: false };
      
    case "checkAadhar": {
      console.log(`[Mock] Simulating Aadhar check for ${payload.payload.aadhar}`);
      const list = getMockList('mock_users') || [];
      const cleaned = payload.payload.aadhar.replace(/\s/g, '');
      const matched = list.find(u => u.aadhar.replace(/\s/g, '') === cleaned);
      if (matched) {
        return {
          exists: true,
          user: {
            name: matched.name || "Mock User",
            phone: matched.phone || "",
            aadhar_prefix: matched.aadhar.substring(0, 4)
          }
        };
      }
      return { exists: false };
    }
      
    case "verifyAdminLogin":
      console.log(`[Mock] Simulating Admin Login with code ${payload.payload.code}`);
      if (payload.payload.code === "123456") return { success: true };
      throw new Error("Invalid Admin Code");
      
    case "createRedirect": {
      const list = getMockList('mock_redirects') || [];
      const id = (payload.payload.id || "").toLowerCase();
      const newRedirect = {
        id,
        target_url: payload.payload.target_url,
        title: payload.payload.title,
        description: payload.payload.description,
        img_url: payload.payload.img_url,
        created_at: new Date().toISOString()
      };
      const existingIdx = list.findIndex(r => r.id === id);
      if (existingIdx !== -1) {
        list[existingIdx] = newRedirect;
      } else {
        list.push(newRedirect);
      }
      saveMockList('mock_redirects', list);
      return newRedirect;
    }

    case "deleteRedirect": {
      const list = getMockList('mock_redirects') || [];
      const filtered = list.filter(r => r.id !== payload.id);
      saveMockList('mock_redirects', filtered);
      return { id: payload.id, success: true };
    }

    case "getRedirects":
      return getMockList('mock_redirects') || [];
      
    case "getProducts":
      return getMockList('mock_products');
      
    case "createProduct": {
      const list = getMockList('mock_products');
      const newProd = {
        ProductID: "prod-" + Date.now(),
        CreatedDate: new Date().toISOString(),
        ...payload.payload
      };
      list.push(newProd);
      saveMockList('mock_products', list);
      return newProd;
    }
    
    case "updateProduct": {
      const list = getMockList('mock_products');
      const idx = list.findIndex(p => p.ProductID === payload.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...payload.payload };
        saveMockList('mock_products', list);
        return list[idx];
      }
      throw new Error("Product not found");
    }
    
    case "deleteProduct": {
      let list = getMockList('mock_products');
      list = list.filter(p => p.ProductID !== payload.id);
      saveMockList('mock_products', list);
      return { success: true };
    }
    
    case "getTemperedGlass":
      return getMockList('mock_tempered_glass');
      
    case "createTemperedGlass": {
      const list = getMockList('mock_tempered_glass');
      const box = (payload.payload.BoxNumber || "").toString().trim();
      if (!box) throw new Error("Box Number is required.");
      if (list.some(x => x.BoxNumber.toLowerCase() === box.toLowerCase())) {
        throw new Error(`Box Number '${box}' already exists.`);
      }
      const newTG = { ...payload.payload, BoxNumber: box };
      list.push(newTG);
      saveMockList('mock_tempered_glass', list);
      return newTG;
    }
    
    case "updateTemperedGlass": {
      const list = getMockList('mock_tempered_glass');
      const idx = list.findIndex(t => t.BoxNumber.toLowerCase() === payload.id.toLowerCase());
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...payload.payload };
        saveMockList('mock_tempered_glass', list);
        return list[idx];
      }
      throw new Error("Tempered glass entry not found");
    }
    
    case "deleteTemperedGlass": {
      let list = getMockList('mock_tempered_glass');
      list = list.filter(t => t.BoxNumber.toLowerCase() !== payload.id.toLowerCase());
      saveMockList('mock_tempered_glass', list);
      return { success: true };
    }
      
    default:
      console.warn("Unimplemented mock action: " + action);
      return null;
  }
};
