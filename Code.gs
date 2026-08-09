/**
 * WhatsBro TNService - Google Workspace Serverless Backend
 * Language: Google Apps Script
 * Description: Serves as the JSON API backend using Google Sheets as the database and Google Drive for uploads.
 * Setup: Create a Google Spreadsheet, open "Extensions > Apps Script", paste this code, and deploy as a Web App.
 * Configuration: Set Web App access to "Execute as: Me" and "Who has access: Anyone".
 */

// --- GLOBAL CONFIGURATION ---
var ROOT_FOLDER_NAME = "WhatsBroTNService_Uploads";

// --- ROBUST FORMATTING HELPERS ---
function formatDateString(val) {
  if (val === undefined || val === null || val === "") return "";
  if (val instanceof Date) {
    try {
      var tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone() || "GMT";
      return Utilities.formatDate(val, tz, "yyyy-MM-dd");
    } catch (e) {
      try {
        return Utilities.formatDate(val, "GMT", "yyyy-MM-dd");
      } catch (err) {
        // Fallback
      }
    }
  }
  var str = val.toString().trim();
  if (str.indexOf("'") === 0) {
    str = str.substring(1);
  }
  
  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  
  // Handle formatted date strings from spreadsheets
  try {
    var d = new Date(str);
    if (!isNaN(d.getTime())) {
      var tz = "GMT";
      try { tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(); } catch(e) {}
      return Utilities.formatDate(d, tz, "yyyy-MM-dd");
    }
  } catch (e) {
    // Fallback
  }
  
  return str;
}

function formatNumberString(val) {
  if (val === undefined || val === null || val === "") return "";
  var str = val.toString().trim();
  
  // Strip leading single quote if it was added for text-forcing in sheets
  if (str.indexOf("'") === 0) {
    str = str.substring(1);
  }
  
  // Handle scientific notation (like 1.23456789012e11)
  if (str.indexOf("e") !== -1 || str.indexOf("E") !== -1) {
    var num = Number(str);
    if (!isNaN(num)) {
      return num.toFixed(0);
    }
  }
  
  // Remove trailing .0 if it's formatted as double
  if (str.endsWith(".0")) {
    return str.substring(0, str.length - 2);
  }
  
  return str;
}

function generateUniqueId() {
  return "ann-" + Date.now() + Math.random().toString(36).substring(2, 6);
}

// --- API ENTRY POINTS ---

/**
 * Handle HTTP GET Requests.
 * Exposes read operations.
 */
function doGet(e) {
  try {
    var action = e.parameter.action;
    var responseData;
    
    // Auto-initialize spreadsheets and headers on first run
    initSpreadsheet();
    
    switch (action) {
      case "getForms":
        responseData = getFormsAction();
        break;
      case "getFormById":
        responseData = getFormByIdAction(e.parameter.id);
        break;
      case "getPosts":
        responseData = getPostsAction();
        break;
      case "getJobs":
        responseData = getJobsAction();
        break;
      case "getUsers":
        responseData = getUsersAction();
        break;
      case "getSubmissions":
        responseData = getSubmissionsAction();
        break;
      case "getUserStatus":
        responseData = getUserStatusAction(e.parameter.phone, e.parameter.dob, e.parameter.aadhar);
        break;
      case "getUserSubmissions":
        responseData = getUserSubmissionsAction(e.parameter.aadhar);
        break;
      case "getFeedback":
        responseData = getFeedbackAction();
        break;
      case "getSettings":
        responseData = getSettingsAction();
        break;
      case "getAnnouncements":
        responseData = getAnnouncementsAction();
        break;
      case "getProducts":
        responseData = getProductsAction();
        break;
      case "getTemperedGlass":
        responseData = getTemperedGlassAction();
        break;
      case "getRedirects":
        responseData = getRedirectsAction();
        break;
      case "getRedirectById":
        responseData = getRedirectByIdAction(e.parameter.id);
        break;
      default:
        return jsonResponse({ success: false, error: "Invalid GET Action: " + action }, 400);
    }
    
    return jsonResponse({ success: true, data: responseData });
  } catch (err) {
    logError("doGet", err);
    return jsonResponse({ success: false, error: err.toString() }, 500);
  }
}

/**
 * Handle HTTP POST Requests.
 * Exposes create, update, delete, and file upload operations.
 */
function doPost(e) {
  try {
    // Parse the JSON request body
    var requestBody = JSON.parse(e.postData.contents);
    var action = requestBody.action;
    var responseData;
    
    // Auto-initialize spreadsheets and headers on first run
    initSpreadsheet();
    
    switch (action) {
      // Authentication and Citizen Profiles
      case "registerUser":
        responseData = registerUserAction(requestBody.payload);
        break;
      case "loginUser":
        responseData = loginUserAction(requestBody.payload);
        break;
      case "notifyAdminLogin":
        responseData = notifyAdminLoginAction(requestBody.payload);
        break;
      case "checkAadhar":
        responseData = checkAadharAction(requestBody.payload);
        break;
      case "sendOtp":
        responseData = sendOtpAction(requestBody.payload);
        break;
      case "verifyOtp":
        responseData = verifyOtpAction(requestBody.payload);
        break;
      case "updateUserProfile":
        responseData = updateUserProfileAction(requestBody.userId, requestBody.payload);
        break;
        
      // Forms Template Operations
      case "createForm":
        responseData = createFormAction(requestBody.payload);
        break;
      case "updateForm":
        responseData = updateFormAction(requestBody.id, requestBody.payload);
        break;
      case "deleteForm":
        responseData = deleteFormAction(requestBody.id);
        break;
      case "duplicateForm":
        responseData = duplicateFormAction(requestBody.id);
        break;
        
      // Posts Operations
      case "createPost":
        responseData = createPostAction(requestBody.payload);
        break;
      case "updatePost":
        responseData = updatePostAction(requestBody.id, requestBody.payload);
        break;
      case "deletePost":
        responseData = deletePostAction(requestBody.id);
        break;
        
      // Jobs Operations
      case "createJob":
        responseData = createJobAction(requestBody.payload);
        break;
      case "updateJob":
        responseData = updateJobAction(requestBody.id, requestBody.payload);
        break;
      case "deleteJob":
        responseData = deleteJobAction(requestBody.id);
        break;
        
      // Submission Operations
      case "submitFormResponse":
        responseData = submitFormResponseAction(requestBody.payload);
        break;
      case "adminUpdateSubmission":
        responseData = adminUpdateSubmissionAction(requestBody.id, requestBody.payload);
        break;
      case "submitInfoRequestResponse":
        responseData = submitInfoRequestResponseAction(requestBody.id, requestBody.payload);
        break;
      case "deleteSubmission":
        responseData = deleteSubmissionAction(requestBody.id);
        break;
      case "deleteUserAndSubmissions":
        responseData = deleteUserAndSubmissionsAction(requestBody.aadhar);
        break;

      // Feedback Operations
      case "submitFeedback":
        responseData = submitFeedbackAction(requestBody.payload);
        break;
      case "deleteFeedback":
        responseData = deleteFeedbackAction(requestBody.id);
        break;
      case "replyFeedback":
        responseData = replyFeedbackAction(requestBody.id, requestBody.responseText);
        break;
        
      // File Uploads directly to Google Drive
      case "uploadFile":
        responseData = uploadFileAction(requestBody);
        break;
        
      // Settings Operations
      case "updateSettings":
        responseData = updateSettingsAction(requestBody.payload);
        break;
      case "verifyAdminLogin":
        responseData = verifyAdminLoginAction(requestBody.payload);
        break;
        
      // Announcement Operations
      case "createAnnouncement":
        responseData = createAnnouncementAction(requestBody.payload);
        break;
      case "updateAnnouncement":
        responseData = updateAnnouncementAction(requestBody.id, requestBody.payload);
        break;
      case "deleteAnnouncement":
        responseData = deleteAnnouncementAction(requestBody.id);
        break;
      case "createProduct":
        responseData = createProductAction(requestBody.payload);
        break;
      case "updateProduct":
        responseData = updateProductAction(requestBody.id, requestBody.payload);
        break;
      case "deleteProduct":
        responseData = deleteProductAction(requestBody.id);
        break;
      case "createTemperedGlass":
        responseData = createTemperedGlassAction(requestBody.payload);
        break;
      case "createRedirect":
        responseData = createRedirectAction(requestBody.payload);
        break;
      case "deleteRedirect":
        responseData = deleteRedirectAction(requestBody.id);
        break;
      case "getRedirects":
        responseData = getRedirectsAction();
        break;
      case "updateTemperedGlass":
        responseData = updateTemperedGlassAction(requestBody.id, requestBody.payload);
        break;
      case "deleteTemperedGlass":
        responseData = deleteTemperedGlassAction(requestBody.id);
        break;
        
      default:
        return jsonResponse({ success: false, error: "Invalid POST Action: " + action }, 400);
    }
    
    return jsonResponse({ success: true, data: responseData });
  } catch (err) {
    logError("doPost", err);
    return jsonResponse({ success: false, error: err.toString() }, 500);
  }
}

// --- DATABASE SERVICE ACTIONS ---

// --- 1. POSTS ACTIONS ---

function getPostsAction() {
  var rows = getRowsFromSheet("Posts");
  // Sort posts ascending by order_index, then by id descending (newest first for same index)
  rows.sort(function(a, b) {
    var orderA = parseInt(a.order_index) || 0;
    var orderB = parseInt(b.order_index) || 0;
    if (orderA !== orderB) return orderA - orderB;
    return b.id - a.id; 
  });
  return rows;
}

function createPostAction(postData) {
  var sheet = getSheet("Posts");
  var id = Date.now();
  var newPost = {
    id: id,
    title: postData.title || "",
    description: postData.description || "",
    img_url: postData.img_url || "",
    apply_url: postData.apply_url || "",
    order_index: parseInt(postData.order_index) || 0,
    coming_soon: postData.coming_soon !== undefined ? String(postData.coming_soon) : "false",
    created_at: new Date().toISOString()
  };
  
  appendObjectToSheet(sheet, newPost);
  return newPost;
}

function updatePostAction(id, postData) {
  var sheet = getSheet("Posts");
  var rowIndex = findRowIndexById(sheet, id);
  if (rowIndex === -1) throw new Error("Post template not found.");
  
  var existingRow = getRowObject(sheet, rowIndex);
  existingRow.title = postData.title !== undefined ? postData.title : existingRow.title;
  existingRow.description = postData.description !== undefined ? postData.description : existingRow.description;
  existingRow.img_url = postData.img_url !== undefined ? postData.img_url : existingRow.img_url;
  existingRow.apply_url = postData.apply_url !== undefined ? postData.apply_url : existingRow.apply_url;
  if (postData.order_index !== undefined) existingRow.order_index = parseInt(postData.order_index) || 0;
  existingRow.coming_soon = postData.coming_soon !== undefined ? String(postData.coming_soon) : existingRow.coming_soon;
  
  updateRowObject(sheet, rowIndex, existingRow);
  return existingRow;
}

function deletePostAction(id) {
  var sheet = getSheet("Posts");
  var rowIndex = findRowIndexById(sheet, id);
  if (rowIndex === -1) throw new Error("Post template not found.");
  sheet.deleteRow(rowIndex);
  return { id: id, success: true };
}

// --- 1B. JOBS ACTIONS ---

function getJobsAction() {
  var rows = getRowsFromSheet("Jobs");
  // Sort jobs ascending by order_index, then by id descending (newest first for same index)
  rows.sort(function(a, b) { 
    var orderA = parseInt(a.order_index) || 0;
    var orderB = parseInt(b.order_index) || 0;
    if (orderA !== orderB) return orderA - orderB;
    return b.id - a.id; 
  });
  return rows;
}

function createJobAction(jobData) {
  var sheet = getSheet("Jobs");
  var id = Date.now();
  var newJob = {
    id: id,
    title: jobData.title || "",
    description: jobData.description || "",
    img_url: jobData.img_url || "",
    apply_url: jobData.apply_url || "",
    details_doc: jobData.details_doc || "",
    button_name: jobData.button_name || "",
    order_index: parseInt(jobData.order_index) || 0,
    coming_soon: jobData.coming_soon !== undefined ? String(jobData.coming_soon) : "false",
    start_date: jobData.start_date || "",
    end_date: jobData.end_date || "",
    created_at: new Date().toISOString()
  };
  
  appendObjectToSheet(sheet, newJob);
  return newJob;
}

function updateJobAction(id, jobData) {
  var sheet = getSheet("Jobs");
  var rowIndex = findRowIndexById(sheet, id);
  if (rowIndex === -1) throw new Error("Job alert not found.");
  
  var existingRow = getRowObject(sheet, rowIndex);
  existingRow.title = jobData.title !== undefined ? jobData.title : existingRow.title;
  existingRow.description = jobData.description !== undefined ? jobData.description : existingRow.description;
  existingRow.img_url = jobData.img_url !== undefined ? jobData.img_url : existingRow.img_url;
  existingRow.apply_url = jobData.apply_url !== undefined ? jobData.apply_url : existingRow.apply_url;
  existingRow.details_doc = jobData.details_doc !== undefined ? jobData.details_doc : existingRow.details_doc;
  existingRow.button_name = jobData.button_name !== undefined ? jobData.button_name : existingRow.button_name;
  if (jobData.order_index !== undefined) existingRow.order_index = parseInt(jobData.order_index) || 0;
  existingRow.coming_soon = jobData.coming_soon !== undefined ? String(jobData.coming_soon) : existingRow.coming_soon;
  existingRow.start_date = jobData.start_date !== undefined ? jobData.start_date : existingRow.start_date;
  existingRow.end_date = jobData.end_date !== undefined ? jobData.end_date : existingRow.end_date;
  
  updateRowObject(sheet, rowIndex, existingRow);
  return existingRow;
}

function deleteJobAction(id) {
  var sheet = getSheet("Jobs");
  var rowIndex = findRowIndexById(sheet, id);
  if (rowIndex === -1) throw new Error("Job alert not found.");
  sheet.deleteRow(rowIndex);
  return { id: id, success: true };
}

// --- 2. FORMS ACTIONS ---

function getFormsAction() {
  var rows = getRowsFromSheet("Forms");
  // Sort forms ascending by order_index, then by id descending (newest first for same index)
  rows.sort(function(a, b) { 
    var orderA = parseInt(a.order_index) || 0;
    var orderB = parseInt(b.order_index) || 0;
    if (orderA !== orderB) return orderA - orderB;
    return b.id - a.id; 
  });
  return rows.map(function(row) {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      fee: parseInt(row.fee) || 0,
      instructions: row.instructions,
      required_fields: parseJsonField(row.required_fields),
      required_docs: parseJsonField(row.required_docs),
      custom_docs: parseJsonField(row.custom_docs),
      fields: parseJsonField(row.fields),
      img_url: row.img_url || "",
      order_index: parseInt(row.order_index) || 0,
      coming_soon: row.coming_soon || "false",
      created_at: row.created_at
    };
  });
}

function getFormByIdAction(id) {
  var sheet = getSheet("Forms");
  var rowIndex = findRowIndexById(sheet, id);
  if (rowIndex === -1) throw new Error("Form template not found.");
  
  var row = getRowObject(sheet, rowIndex);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    fee: parseInt(row.fee) || 0,
    instructions: row.instructions,
    required_fields: parseJsonField(row.required_fields),
    required_docs: parseJsonField(row.required_docs),
    custom_docs: parseJsonField(row.custom_docs),
    fields: parseJsonField(row.fields),
    img_url: row.img_url || "",
    order_index: parseInt(row.order_index) || 0,
    coming_soon: row.coming_soon || "false",
    created_at: row.created_at
  };
}

function createFormAction(formData) {
  var sheet = getSheet("Forms");
  var formId = "form-" + Math.random().toString(36).substring(2, 10);
  
  var newForm = {
    id: formId,
    title: formData.title,
    description: formData.description || "",
    category: formData.category || "E sevai",
    fee: parseInt(formData.fee) || 0,
    instructions: formData.instructions || "",
    required_fields: typeof formData.required_fields === "string" ? formData.required_fields : JSON.stringify(formData.required_fields || []),
    required_docs: typeof formData.required_docs === "string" ? formData.required_docs : JSON.stringify(formData.required_docs || []),
    custom_docs: typeof formData.custom_docs === "string" ? formData.custom_docs : JSON.stringify(formData.custom_docs || []),
    fields: typeof formData.fields === "string" ? formData.fields : JSON.stringify(formData.fields || []),
    img_url: formData.img_url || "",
    order_index: parseInt(formData.order_index) || 0,
    coming_soon: formData.coming_soon !== undefined ? String(formData.coming_soon) : "false",
    created_at: new Date().toISOString()
  };
  
  appendObjectToSheet(sheet, newForm);
  return newForm;
}

function updateFormAction(id, formData) {
  var sheet = getSheet("Forms");
  var rowIndex = findRowIndexById(sheet, id);
  if (rowIndex === -1) throw new Error("Form template not found.");
  
  var existingRow = getRowObject(sheet, rowIndex);
  if (formData.title !== undefined) existingRow.title = formData.title;
  if (formData.description !== undefined) existingRow.description = formData.description;
  if (formData.category !== undefined) existingRow.category = formData.category;
  if (formData.fee !== undefined) existingRow.fee = parseInt(formData.fee) || 0;
  if (formData.instructions !== undefined) existingRow.instructions = formData.instructions;
  if (formData.required_fields !== undefined) existingRow.required_fields = typeof formData.required_fields === "string" ? formData.required_fields : JSON.stringify(formData.required_fields);
  if (formData.required_docs !== undefined) existingRow.required_docs = typeof formData.required_docs === "string" ? formData.required_docs : JSON.stringify(formData.required_docs);
  if (formData.custom_docs !== undefined) existingRow.custom_docs = typeof formData.custom_docs === "string" ? formData.custom_docs : JSON.stringify(formData.custom_docs);
  if (formData.fields !== undefined) existingRow.fields = typeof formData.fields === "string" ? formData.fields : JSON.stringify(formData.fields);
  if (formData.img_url !== undefined) existingRow.img_url = formData.img_url;
  if (formData.order_index !== undefined) existingRow.order_index = parseInt(formData.order_index) || 0;
  if (formData.coming_soon !== undefined) existingRow.coming_soon = String(formData.coming_soon);
  
  updateRowObject(sheet, rowIndex, existingRow);
  return existingRow;
}

function deleteFormAction(id) {
  var sheet = getSheet("Forms");
  var rowIndex = findRowIndexById(sheet, id);
  if (rowIndex === -1) throw new Error("Form template not found.");
  sheet.deleteRow(rowIndex);
  
  // Also delete associated submissions
  var subSheet = getSheet("Submissions");
  var subData = subSheet.getDataRange().getValues();
  var subHeaders = subData[0];
  var formIdColIndex = subHeaders.indexOf("form_id");
  
  if (formIdColIndex !== -1) {
    // Delete rows bottom-to-top to maintain valid indices
    for (var r = subData.length - 1; r >= 1; r--) {
      if (subData[r][formIdColIndex] === id) {
        subSheet.deleteRow(r + 1);
      }
    }
  }
  
  return { id: id, success: true };
}

function duplicateFormAction(id) {
  var form = getFormByIdAction(id);
  var duplicatedForm = {
    title: form.title + " (Copy)",
    description: form.description,
    category: form.category,
    fee: form.fee,
    instructions: form.instructions,
    required_fields: form.required_fields,
    required_docs: form.required_docs,
    custom_docs: form.custom_docs,
    fields: form.fields,
    img_url: form.img_url,
    order_index: form.order_index,
    coming_soon: form.coming_soon
  };
  return createFormAction(duplicatedForm);
}

// --- 3. CITIZEN AUTHENTICATION ACTIONS ---

function registerUserAction(userData) {
  var sheet = getSheet("Users");
  var phoneClean = userData.phone ? formatNumberString(userData.phone) : "";
  var aadharClean = userData.aadhar ? formatNumberString(userData.aadhar) : "";
  var emailClean = userData.email ? userData.email.trim().toLowerCase() : "";
  
  if (!phoneClean) {
    throw new Error("Phone number is required for registration.");
  }
  if (!aadharClean || aadharClean.length !== 12) {
    throw new Error("A valid 12-digit Aadhaar number is required for registration.");
  }
  if (!emailClean) {
    throw new Error("Email ID is required for registration.");
  }
  
  // Check if Aadhaar or Email is already registered (these are permanent unique identifiers)
  var existingRows = getRowsFromSheet("Users");
  
  var isAadharTaken = existingRows.some(function(u) {
    var uAadhar = u.aadhar ? formatNumberString(u.aadhar) : "";
    return uAadhar === aadharClean;
  });
  
  var isEmailTaken = existingRows.some(function(u) {
    var uEmail = u.email ? u.email.trim().toLowerCase() : "";
    return uEmail === emailClean;
  });
  
  if (isAadharTaken || isEmailTaken) {
    throw new Error("This Aadhaar number and email is already registered. Please login with your Phone number and Aadhaar first 4 digits.");
  }
  
  var dobClean = userData.dob ? formatDateString(userData.dob) : "";
  
  var userId = "usr-" + Math.random().toString(36).substring(2, 10);
  var newUser = {
    id: userId,
    name: userData.name || "",
    name_tamil: userData.name_tamil || "",
    dob: dobClean ? "'" + dobClean : "",
    phone: "'" + phoneClean,
    aadhar: "'" + aadharClean,
    email: emailClean,
    gender: userData.gender || "",
    marital_status: userData.marital_status || "",
    father_name: userData.father_name || "",
    father_name_tamil: userData.father_name_tamil || "",
    mother_name: userData.mother_name || "",
    mother_name_tamil: userData.mother_name_tamil || "",
    community: userData.community || "",
    address: userData.address || "",
    religion: userData.religion || "",
    state: userData.state || "",
    district: userData.district || "",
    taluk: userData.taluk || "",
    revenue_village: userData.revenue_village || "",
    street_name: userData.street_name || "",
    door_no: userData.door_no || "",
    pincode: userData.pincode || "",
    photo_url: userData.photo_url || "",
    aadhar_url_1: userData.aadhar_url_1 || "",
    aadhar_url_2: userData.aadhar_url_2 || "",
    smart_card_url_1: userData.smart_card_url_1 || "",
    smart_card_url_2: userData.smart_card_url_2 || "",
    voter_id_url_1: userData.voter_id_url_1 || "",
    voter_id_url_2: userData.voter_id_url_2 || "",
    signature_url_1: userData.signature_url_1 || "",
    created_at: new Date().toISOString()
  };
  
  appendObjectToSheet(sheet, newUser);
  
  // Strip quotes for returned object
  newUser.phone = phoneClean;
  newUser.aadhar = aadharClean;
  return newUser;
}

function loginUserAction(loginData) {
  var phoneClean = loginData.phone ? formatNumberString(loginData.phone) : "";
  var aadharClean = loginData.aadhar ? formatNumberString(loginData.aadhar) : (loginData.aadhar_prefix ? loginData.aadhar_prefix.toString().trim() : "");
  
  if (!phoneClean) {
    throw new Error("Phone number is required for login.");
  }
  if (!aadharClean) {
    throw new Error("Aadhaar number is required for login.");
  }
  
  var users = getRowsFromSheet("Users");
  var matchedUser = null;
  
  var emailClean = loginData.email ? loginData.email.trim().toLowerCase() : "";

  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    var uPhone = u.phone ? formatNumberString(u.phone) : "";
    var uAadhar = u.aadhar ? formatNumberString(u.aadhar) : "";
    
    if (uPhone === phoneClean && (uAadhar === aadharClean || uAadhar.indexOf(aadharClean) === 0)) {
      matchedUser = u;
      break;
    }
  }
  
  var isNewUser = false;
  if (matchedUser) {
    if (emailClean && matchedUser.email !== emailClean) {
      matchedUser.email = emailClean;
      var usersSheet = getSheet("Users");
      var rIdx = findRowIndexById(usersSheet, matchedUser.id);
      if (rIdx !== -1) {
        updateRowObject(usersSheet, rIdx, matchedUser);
      }
    }
  } else {
    // Search previous submissions to recover stored details if available
    var subRows = getRowsFromSheet("Submissions");
    var userSubs = [];
    for (var j = 0; j < subRows.length; j++) {
      var s = subRows[j];
      var sPhone = s.phone ? formatNumberString(s.phone) : "";
      var sAadhar = s.aadhar ? formatNumberString(s.aadhar) : "";
      if ((phoneClean && sPhone === phoneClean) || (aadharClean && (sAadhar === aadharClean || sAadhar.indexOf(aadharClean) === 0))) {
        userSubs.push(s);
      }
    }

    var recoveredData = {};
    if (userSubs.length > 0) {
      userSubs.sort(function(a, b) { return new Date(b.submitted_at) - new Date(a.submitted_at); });
      var respStr = userSubs[0].responses || {};
      var respObj = {};
      try {
        respObj = typeof respStr === "string" ? JSON.parse(respStr) : respStr;
      } catch (e) {}

      recoveredData = {
        name: respObj["Full Name / பெயர்"] || respObj["Applicant Name"] || respObj["Name"] || respObj["Citizen Name"] || "",
        father_name: respObj["Father Name / தகப்பனார் பெயர்"] || respObj["Father Name"] || respObj["Father / Husband Name"] || "",
        mother_name: respObj["Mother Name / தாயார் பெயர்"] || respObj["Mother Name"] || "",
        address: respObj["Residential Address / முகவரி"] || respObj["Address"] || respObj["Full Address"] || "",
        district: respObj["District / மாவட்டம்"] || respObj["District"] || "",
        taluk: respObj["Taluk / தாலுகா"] || respObj["Taluk"] || "",
        pincode: respObj["Pincode / அஞ்சல் குறியீடு"] || respObj["Pincode"] || "",
        gender: respObj["Gender / பாலினம்"] || respObj["Gender"] || "",
        community: respObj["Community / சமூகம்"] || respObj["Community"] || "",
        dob: userSubs[0].dob || respObj["Date of Birth"] || respObj["DOB"] || "",
        email: respObj["Email Address / மின்னஞ்சல் முகவரி"] || respObj["Email"] || respObj["Email ID"] || ""
      };
    }

    isNewUser = userSubs.length === 0;
    var sheet = getSheet("Users");
    var userId = "usr-" + Math.random().toString(36).substring(2, 10);
    matchedUser = {
      id: userId,
      name: recoveredData.name || "",
      name_tamil: "",
      dob: recoveredData.dob ? "'" + formatDateString(recoveredData.dob) : "",
      phone: "'" + phoneClean,
      aadhar: "'" + aadharClean,
      email: emailClean || recoveredData.email || "",
      gender: recoveredData.gender || "",
      marital_status: "",
      father_name: recoveredData.father_name || "",
      father_name_tamil: "",
      mother_name: recoveredData.mother_name || "",
      mother_name_tamil: "",
      community: recoveredData.community || "",
      address: recoveredData.address || "",
      religion: "",
      state: "Tamil Nadu",
      district: recoveredData.district || "",
      taluk: recoveredData.taluk || "",
      revenue_village: "",
      street_name: "",
      door_no: "",
      pincode: recoveredData.pincode || "",
      created_at: new Date().toISOString()
    };
    appendObjectToSheet(sheet, matchedUser);
  }
  
  // Format matching fields in returned object
  var cleanedUser = {};
  var keys = Object.keys(matchedUser);
  keys.forEach(function(k) {
    cleanedUser[k] = matchedUser[k];
  });
  cleanedUser.phone = formatNumberString(matchedUser.phone);
  cleanedUser.dob = formatDateString(matchedUser.dob);
  cleanedUser.aadhar = formatNumberString(matchedUser.aadhar);
  
  // Silent Admin Email Alert (user not shown)
  try {
    notifyAdminLoginAction({
      phone: phoneClean,
      aadhar: aadharClean,
      isNewUser: isNewUser,
      userName: cleanedUser.name || ""
    });
  } catch (err) {
    logError("loginUserAction_adminEmailAlert", err);
  }

  return cleanedUser;
}

function notifyAdminLoginAction(payload) {
  try {
    var phoneClean = payload.phone ? formatNumberString(payload.phone) : "";
    var aadharClean = payload.aadhar ? formatNumberString(payload.aadhar) : "";
    var isNewUser = payload.isNewUser || false;
    var userName = payload.userName || "";
    
    var settings = getSettingsAction();
    var adminEmail = settings.admin_email || "subionlineservice@gmail.com";
    if (adminEmail && phoneClean && aadharClean) {
      var dStr = Utilities.formatDate(new Date(), "Asia/Kolkata", "dd/MM/yyyy hh:mm a");
      var subject = "User Login Alert: Phone " + phoneClean + " | Aadhaar " + aadharClean;
      var body = "USER LOGIN ALERT\n" +
                 "===================================\n" +
                 "Phone Number: " + phoneClean + "\n" +
                 "Aadhaar Number: " + aadharClean + "\n" +
                 "Status: " + (isNewUser ? "New User (Fresh Profile Created)" : "Returning User (Previous Data Found)") + "\n" +
                 "User Name: " + (userName || "Not set yet") + "\n" +
                 "Timestamp: " + dStr + "\n";
                 
      MailApp.sendEmail({
        to: adminEmail,
        subject: subject,
        body: body
      });
    }
  } catch (err) {
    logError("notifyAdminLoginAction", err);
  }
  return { status: "sent" };
}

function checkAadharAction(payload) {
  var aadhar = payload.aadhar;
  var aadharClean = aadhar ? formatNumberString(aadhar) : "";
  if (!aadharClean || aadharClean.length !== 12) {
    throw new Error("A valid 12-digit Aadhaar number is required.");
  }
  
  var users = getRowsFromSheet("Users");
  var matchedUser = null;
  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    var uAadhar = u.aadhar ? formatNumberString(u.aadhar) : "";
    if (uAadhar === aadharClean) {
      matchedUser = u;
      break;
    }
  }
  
  if (matchedUser) {
    return {
      exists: true,
      user: {
        name: matchedUser.name || "",
        phone: formatNumberString(matchedUser.phone) || "",
        aadhar_prefix: formatNumberString(matchedUser.aadhar).substring(0, 4)
      }
    };
  } else {
    return { exists: false };
  }
}

// --- OTP ACTIONS ---

function sendOtpAction(payload) {
  var email = payload.email ? payload.email.trim().toLowerCase() : "";
  if (!email) throw new Error("Email address is required.");
  
  // Generate 6-digit OTP
  var otp = Math.floor(100000 + Math.random() * 900000).toString();
  var expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes
  
  // Store OTP in OTP sheet (overwrite if same email exists)
  var otpSheet = getSheet("OTP");
  var otpRows = otpSheet.getDataRange().getValues();
  var headers = otpRows[0];
  var emailCol = headers.indexOf("email");
  var existingRow = -1;
  
  if (emailCol !== -1) {
    for (var r = 1; r < otpRows.length; r++) {
      if (otpRows[r][emailCol] && otpRows[r][emailCol].toString().trim().toLowerCase() === email) {
        existingRow = r + 1; // 1-indexed sheet row
        break;
      }
    }
  }
  
  if (existingRow > 0) {
    // Update existing row
    var otpCol = headers.indexOf("otp");
    var expiresCol = headers.indexOf("expires_at");
    otpSheet.getRange(existingRow, otpCol + 1).setValue(otp);
    otpSheet.getRange(existingRow, expiresCol + 1).setValue(expiresAt);
  } else {
    appendObjectToSheet(otpSheet, { email: email, otp: otp, expires_at: expiresAt });
  }
  
  // Send email
  try {
    MailApp.sendEmail({
      to: email,
      subject: "Subi e sevai - Your OTP Verification Code",
      htmlBody: '<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px;">'
        + '<h2 style="color:#047857;text-align:center;">Subi e sevai</h2>'
        + '<p style="text-align:center;color:#64748b;">Your OTP verification code is:</p>'
        + '<div style="text-align:center;margin:20px 0;">'
        + '<span style="font-size:2rem;font-weight:900;letter-spacing:8px;color:#1e293b;background:#f0fdf4;padding:10px 20px;border-radius:8px;border:2px solid #10b981;">' + otp + '</span>'
        + '</div>'
        + '<p style="text-align:center;color:#94a3b8;font-size:0.8rem;">This code expires in 5 minutes. Do not share it with anyone.</p>'
        + '</div>'
    });
  } catch (mailErr) {
    throw new Error("Failed to send OTP email. Please try again later.");
  }
  
  return { sent: true, email: email };
}

function verifyOtpAction(payload) {
  var email = payload.email ? payload.email.trim().toLowerCase() : "";
  var userOtp = payload.otp ? payload.otp.toString().trim() : "";
  
  if (!email || !userOtp) throw new Error("Email and OTP are required.");
  
  var otpSheet = getSheet("OTP");
  var otpRows = otpSheet.getDataRange().getValues();
  var headers = otpRows[0];
  var emailCol = headers.indexOf("email");
  var otpCol = headers.indexOf("otp");
  var expiresCol = headers.indexOf("expires_at");
  
  for (var r = 1; r < otpRows.length; r++) {
    var rowEmail = otpRows[r][emailCol] ? otpRows[r][emailCol].toString().trim().toLowerCase() : "";
    if (rowEmail === email) {
      var storedOtp = otpRows[r][otpCol] ? otpRows[r][otpCol].toString().trim() : "";
      var expiresAt = otpRows[r][expiresCol] ? otpRows[r][expiresCol].toString() : "";
      
      // Check expiry
      if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
        // Delete expired row
        otpSheet.deleteRow(r + 1);
        throw new Error("OTP has expired. Please request a new one.");
      }
      
      if (storedOtp === userOtp) {
        // Valid OTP — delete row and return success
        otpSheet.deleteRow(r + 1);
        return { verified: true, email: email };
      } else {
        throw new Error("Invalid OTP. Please check and try again.");
      }
    }
  }
  
  throw new Error("No OTP found for this email. Please request a new one.");
}

function updateUserProfileAction(userId, profileData) {
  var sheet = getSheet("Users");
  var rowIndex = findRowIndexById(sheet, userId);
  if (rowIndex === -1) throw new Error("User profile not found.");
  
  var existingUser = getRowObject(sheet, rowIndex);
  
  // Map and update only defined values — but BLOCK permanent fields
  var keys = Object.keys(profileData);
  keys.forEach(function(key) {
    if (profileData[key] !== undefined && key !== "id") {
      // Block permanent fields from being changed
      if (key === "aadhar" || key === "email") {
        return; // Skip — these are permanent and cannot be changed
      }
      var val = profileData[key];
      if (key === "phone") {
        existingUser[key] = "'" + formatNumberString(val);
      } else if (key === "dob") {
        existingUser[key] = "'" + formatDateString(val);
      } else {
        existingUser[key] = val;
      }
    }
  });
  
  updateRowObject(sheet, rowIndex, existingUser);
  
  // Return cleaned user object
  var cleanedUser = {};
  var rKeys = Object.keys(existingUser);
  rKeys.forEach(function(k) {
    cleanedUser[k] = existingUser[k];
  });
  cleanedUser.phone = formatNumberString(existingUser.phone);
  cleanedUser.dob = formatDateString(existingUser.dob);
  cleanedUser.aadhar = formatNumberString(existingUser.aadhar);
  
  return cleanedUser;
}

// --- 4. SUBMISSIONS & DATA COLLECTION ACTIONS ---

function submitFormResponseAction(payload) {
  var sheet = getSheet("Submissions");
  var phoneClean = payload.phone ? formatNumberString(payload.phone) : "";
  var dobClean = payload.dob ? formatDateString(payload.dob) : "";
  var aadharClean = payload.aadhar ? formatNumberString(payload.aadhar) : "";
  
  // Search for existing submission for this form_id + user to prevent creating duplicate rows
  var existingSubId = payload.id || "";
  if (!existingSubId && payload.form_id && (aadharClean || phoneClean)) {
    var subRows = getRowsFromSheet("Submissions");
    for (var k = 0; k < subRows.length; k++) {
      var sRow = subRows[k];
      var sFormId = sRow.form_id ? sRow.form_id.toString() : "";
      var sPhone = sRow.phone ? formatNumberString(sRow.phone) : "";
      var sAadhar = sRow.aadhar ? formatNumberString(sRow.aadhar) : "";

      if (sFormId === payload.form_id.toString() && ((aadharClean && sAadhar === aadharClean) || (phoneClean && sPhone === phoneClean))) {
        var isAlreadyFinal = sRow.payment_status && sRow.payment_status !== "draft";
        var isNewSubmitFinal = payload.payment_status && payload.payment_status !== "draft";

        if (isAlreadyFinal && isNewSubmitFinal) {
          throw new Error("You have already submitted an application for this service. Duplicate submissions are not permitted.");
        }

        existingSubId = sRow.id;
        break;
      }
    }
  }

  var subId = existingSubId || "sub-" + Math.random().toString(36).substring(2, 10);
  
  // Find linked user_id and email if they have a registered profile
  var userId = "";
  var userEmail = "";
  try {
    // Look up user by phone + aadhar prefix (new login format)
    var users = getRowsFromSheet("Users");
    for (var i = 0; i < users.length; i++) {
      var u = users[i];
      var uPhone = u.phone ? formatNumberString(u.phone) : "";
      var uAadhar = u.aadhar ? formatNumberString(u.aadhar) : "";
      if (uPhone === phoneClean || (aadharClean && uAadhar === aadharClean)) {
        userId = u.id;
        userEmail = u.email ? u.email.trim().toLowerCase() : "";
        break;
      }
    }
  } catch (e) {
    // User not registered, leave user_id blank
  }
  
  var responsesPack = payload.responses || {};
  var responsesString = typeof responsesPack === "string" ? responsesPack : JSON.stringify(responsesPack);
  
  // Get form title for email
  var formTitle = payload.form_title || "Application";
  try {
    if (payload.form_id) {
      var formObj = getFormByIdAction(payload.form_id);
      if (formObj && formObj.title) formTitle = formObj.title;
    }
  } catch(e) {}
  
  var newSubmission = {
    id: subId,
    form_id: payload.form_id,
    user_id: userId,
    phone: "'" + phoneClean,
    dob: "'" + dobClean,
    aadhar: aadharClean ? "'" + aadharClean : "",
    responses: responsesString,
    uploaded_docs: typeof payload.uploaded_docs === "string" ? payload.uploaded_docs : JSON.stringify(payload.uploaded_docs || {}),
    payment_status: payload.payment_status || "unpaid",
    payment_screenshot: payload.payment_screenshot || "",
    progress_percent: parseInt(payload.progress_percent) || 10,
    progress_desc: payload.progress_desc || "Application submitted successfully. Awaiting payment verification.",
    uploaded_pdf_url: payload.uploaded_pdf_url || "",
    submitted_at: new Date().toISOString(),
    info_request_label: payload.info_request_label || "",
    info_request_type: payload.info_request_type || "text",
    info_request_response: payload.info_request_response || ""
  };
  
  // --- DYNAMIC COLUMN MAPPING SYSTEM ---
  var responsesObj = typeof responsesPack === "string" ? JSON.parse(responsesPack) : responsesPack;
  var responseKeys = Object.keys(responsesObj);
  
  responseKeys.forEach(function(qKey) {
    var colName = "Custom_" + qKey;
    ensureColumnExists(sheet, colName);
    newSubmission[colName] = responsesObj[qKey];
  });
  
  // Write or Append the submission
  var rowIndex = findRowIndexById(sheet, subId);
  if (rowIndex === -1) {
    appendObjectToSheet(sheet, newSubmission);
  } else {
    var existingSub = getRowObject(sheet, rowIndex);
    var updateKeys = Object.keys(newSubmission);
    updateKeys.forEach(function(k) {
      if (newSubmission[k] !== undefined) existingSub[k] = newSubmission[k];
    });
    updateRowObject(sheet, rowIndex, existingSub);
  }

  // Update user's profile with these uploaded documents so they are saved to the user profile
  if (userId) {
    try {
      var usersSheet = getSheet("Users");
      var userRowIndex = findRowIndexById(usersSheet, userId);
      if (userRowIndex !== -1) {
        var userObj = getRowObject(usersSheet, userRowIndex);
        var userUpdated = false;
        
        var uploadedDocsObj = {};
        if (payload.uploaded_docs) {
          uploadedDocsObj = typeof payload.uploaded_docs === "string" ? JSON.parse(payload.uploaded_docs) : payload.uploaded_docs;
        }
        
        if (uploadedDocsObj.photo && uploadedDocsObj.photo.length > 0) {
          userObj.photo_url = uploadedDocsObj.photo[0];
          userUpdated = true;
        }
        if (uploadedDocsObj.signature && uploadedDocsObj.signature.length > 0) {
          userObj.signature_url_1 = uploadedDocsObj.signature[0];
          userUpdated = true;
        }
        if (uploadedDocsObj.aadhar) {
          if (uploadedDocsObj.aadhar.length > 0) {
            userObj.aadhar_url_1 = uploadedDocsObj.aadhar[0];
            userUpdated = true;
          }
          if (uploadedDocsObj.aadhar.length > 1) {
            userObj.aadhar_url_2 = uploadedDocsObj.aadhar[1];
            userUpdated = true;
          }
        }
        if (uploadedDocsObj.smart_card) {
          if (uploadedDocsObj.smart_card.length > 0) {
            userObj.smart_card_url_1 = uploadedDocsObj.smart_card[0];
            userUpdated = true;
          }
          if (uploadedDocsObj.smart_card.length > 1) {
            userObj.smart_card_url_2 = uploadedDocsObj.smart_card[1];
            userUpdated = true;
          }
        }
        if (uploadedDocsObj.voter_id) {
          if (uploadedDocsObj.voter_id.length > 0) {
            userObj.voter_id_url_1 = uploadedDocsObj.voter_id[0];
            userUpdated = true;
          }
          if (uploadedDocsObj.voter_id.length > 1) {
            userObj.voter_id_url_2 = uploadedDocsObj.voter_id[1];
            userUpdated = true;
          }
        }
        
        if (userUpdated) {
          updateRowObject(usersSheet, userRowIndex, userObj);
        }
      }
    } catch (userDocErr) {
      logError("submitFormResponse_updateUserDocs", userDocErr);
    }
  }
  
  // Send receipt email to user if email available and not a draft
  var targetEmail = userEmail || payload.email || (responsesObj["Email Address / மின்னஞ்சல் முகவரி"] || responsesObj["Email"] || "");
  if (targetEmail && payload.payment_status !== "draft") {
    try {
      var fee = 0;
      try { fee = getFormByIdAction(payload.form_id).fee || 0; } catch(e) {}
      var submittedDate = new Date();
      var dateStr = Utilities.formatDate(submittedDate, "Asia/Kolkata", "dd/MM/yyyy");
      var timeStr = Utilities.formatDate(submittedDate, "Asia/Kolkata", "hh:mm a");
      
      MailApp.sendEmail({
        to: targetEmail,
        subject: "Subi e sevai - Application Receipt (" + formTitle + ")",
        htmlBody: '<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;">'
          + '<div style="text-align:center;border-bottom:2px dashed #10b981;padding-bottom:14px;margin-bottom:16px;">'
          + '<h2 style="color:#047857;margin:0 0 4px 0;font-size:1.3rem;">' + formTitle + '</h2>'
          + '<span style="color:#10b981;font-size:0.8rem;font-weight:700;">SUBI E SEVAI</span><br/>'
          + '<span style="color:#64748b;font-size:0.7rem;">Official E-Receipt</span>'
          + '</div>'
          + '<table style="width:100%;font-size:0.85rem;border-collapse:collapse;">'
          + '<tr><td style="color:#64748b;padding:6px 0;">Receipt ID:</td><td style="font-weight:700;color:#10b981;text-align:right;">' + subId + '</td></tr>'
          + '<tr><td style="color:#64748b;padding:6px 0;">Phone:</td><td style="font-weight:700;text-align:right;">' + phoneClean + '</td></tr>'
          + '<tr><td style="color:#64748b;padding:6px 0;">Date:</td><td style="font-weight:700;text-align:right;">' + dateStr + '</td></tr>'
          + '<tr><td style="color:#64748b;padding:6px 0;">Time:</td><td style="font-weight:700;text-align:right;">' + timeStr + '</td></tr>'
          + '<tr><td colspan="2" style="border-top:1px dashed #cbd5e1;padding-top:10px;"></td></tr>'
          + '<tr><td style="color:#64748b;padding:6px 0;">Service Fee:</td><td style="font-weight:800;font-size:1rem;text-align:right;">Rs. ' + fee + '</td></tr>'
          + '<tr><td style="color:#64748b;padding:6px 0;">Payment Status:</td><td style="text-align:right;"><span style="background:#fef2f2;color:#ef4444;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:700;">UNPAID</span></td></tr>'
          + '</table>'
          + '<p style="text-align:center;color:#94a3b8;font-size:0.75rem;margin-top:16px;">Thank you for using Subi e sevai Portal.</p>'
          + '</div>'
      });
    } catch (emailErr) {
      // Don't fail the submission if email fails
      logError("submitFormResponse_email", emailErr);
    }
  }

  // Send email to the admin if admin_email is configured
  try {
    var settings = getSettingsAction();
    var adminEmail = settings.admin_email;
    if (adminEmail && payload.payment_status !== "draft") {
      var applicantName = "";
      if (userId) {
        var usersArr = getRowsFromSheet("Users");
        for (var u = 0; u < usersArr.length; u++) {
          if (usersArr[u].id === userId) {
            applicantName = usersArr[u].name || "";
            break;
          }
        }
      }
      
      var submittedDate = new Date();
      var dStr = Utilities.formatDate(submittedDate, "Asia/Kolkata", "dd/MM/yyyy");
      var tStr = Utilities.formatDate(submittedDate, "Asia/Kolkata", "hh:mm a");

      var adminSubject = "New Application Received: " + formTitle;
      var adminBody = "A new application has been submitted.\n\n" +
                      "Applicant Name: " + applicantName + "\n" +
                      "Certificate Name: " + formTitle + "\n" +
                      "Date: " + dStr + "\n" +
                      "Time: " + tStr + "\n" +
                      "Aadhaar No: " + aadharClean + "\n" +
                      "Phone No: " + phoneClean + "\n";
      
      MailApp.sendEmail({
        to: adminEmail,
        subject: adminSubject,
        body: adminBody
      });
    }
  } catch (adminEmailErr) {
    logError("submitFormResponse_adminEmail", adminEmailErr);
  }
  
  // Clean returned object
  newSubmission.phone = phoneClean;
  newSubmission.dob = dobClean;
  newSubmission.aadhar = aadharClean;
  return newSubmission;
}

function adminUpdateSubmissionAction(id, updateData) {
  var sheet = getSheet("Submissions");
  var rowIndex = findRowIndexById(sheet, id);
  if (rowIndex === -1) throw new Error("Submission record not found.");
  
  var existingSub = getRowObject(sheet, rowIndex);
  var oldStatus = existingSub.payment_status || "";
  var oldProgress = existingSub.progress_percent || 0;
  
  // Map standard and dynamic updates
  var keys = Object.keys(updateData);
  keys.forEach(function(key) {
    if (updateData[key] !== undefined && key !== "id") {
      var val = updateData[key];
      if (key === "phone") {
        existingSub[key] = "'" + formatNumberString(val);
      } else if (key === "dob") {
        existingSub[key] = "'" + formatDateString(val);
      } else if (key === "aadhar") {
        existingSub[key] = val ? "'" + formatNumberString(val) : "";
      } else {
        existingSub[key] = val;
      }
    }
  });
  
  updateRowObject(sheet, rowIndex, existingSub);
  
  // Send email notification if status or progress changed
  var newStatus = existingSub.payment_status || "";
  var newProgress = parseInt(existingSub.progress_percent) || 0;
  var statusChanged = (oldStatus !== newStatus) || (parseInt(oldProgress) !== newProgress);
  
  if (statusChanged) {
    // Find user email from Users sheet
    var subAadhar = existingSub.aadhar ? formatNumberString(existingSub.aadhar) : "";
    var subPhone = existingSub.phone ? formatNumberString(existingSub.phone) : "";
    var userEmail = "";
    
    try {
      var users = getRowsFromSheet("Users");
      for (var i = 0; i < users.length; i++) {
        var u = users[i];
        var uAadhar = u.aadhar ? formatNumberString(u.aadhar) : "";
        var uPhone = u.phone ? formatNumberString(u.phone) : "";
        if ((subAadhar && uAadhar === subAadhar) || (subPhone && uPhone === subPhone)) {
          userEmail = u.email ? u.email.trim().toLowerCase() : "";
          break;
        }
      }
    } catch(e) {}
    
    if (userEmail) {
      try {
        // Get form title
        var formTitle = "Application";
        try {
          var formObj = getFormByIdAction(existingSub.form_id);
          if (formObj && formObj.title) formTitle = formObj.title;
        } catch(e) {}
        
        var progressDesc = existingSub.progress_desc || "Status updated.";
        var statusBadge = newStatus === 'paid' 
          ? '<span style="background:#f0fdf4;color:#10b981;padding:3px 10px;border-radius:6px;font-weight:700;">' + newStatus.toUpperCase() + '</span>'
          : '<span style="background:#fef2f2;color:#ef4444;padding:3px 10px;border-radius:6px;font-weight:700;">' + (newStatus || 'UNPAID').toUpperCase() + '</span>';
        
        MailApp.sendEmail({
          to: userEmail,
          subject: "Subi e sevai - Application Status Update (" + formTitle + ")",
          htmlBody: '<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;">'
            + '<div style="text-align:center;margin-bottom:16px;">'
            + '<h2 style="color:#047857;margin:0;">Subi e sevai</h2>'
            + '<p style="color:#64748b;font-size:0.8rem;">Application Status Update</p>'
            + '</div>'
            + '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:16px;">'
            + '<table style="width:100%;font-size:0.85rem;border-collapse:collapse;">'
            + '<tr><td style="color:#64748b;padding:6px 0;">Application ID:</td><td style="font-weight:700;text-align:right;">' + id + '</td></tr>'
            + '<tr><td style="color:#64748b;padding:6px 0;">Service:</td><td style="font-weight:700;text-align:right;">' + formTitle + '</td></tr>'
            + '<tr><td style="color:#64748b;padding:6px 0;">Progress:</td><td style="font-weight:700;text-align:right;color:#10b981;">' + newProgress + '%</td></tr>'
            + '<tr><td style="color:#64748b;padding:6px 0;">Payment Status:</td><td style="text-align:right;">' + statusBadge + '</td></tr>'
            + '</table>'
            + '</div>'
            + '<div style="background:#f0fdf4;border-left:4px solid #10b981;padding:12px;border-radius:0 8px 8px 0;">'
            + '<p style="margin:0;font-size:0.85rem;color:#1e293b;"><strong>Update:</strong> ' + progressDesc + '</p>'
            + '</div>'
            + '<p style="text-align:center;color:#94a3b8;font-size:0.75rem;margin-top:16px;">Login to Subi e sevai to view full details.</p>'
            + '</div>'
        });
      } catch (emailErr) {
        logError("adminUpdateSubmission_email", emailErr);
      }
    }
  }
  
  // Clean returned object
  var cleanedSub = {};
  var rKeys = Object.keys(existingSub);
  rKeys.forEach(function(k) {
    cleanedSub[k] = existingSub[k];
  });
  cleanedSub.phone = formatNumberString(existingSub.phone);
  cleanedSub.dob = formatDateString(existingSub.dob);
  cleanedSub.aadhar = formatNumberString(existingSub.aadhar);
  return cleanedSub;
}

function submitInfoRequestResponseAction(id, payload) {
  var sheet = getSheet("Submissions");
  var rowIndex = findRowIndexById(sheet, id);
  if (rowIndex === -1) throw new Error("Submission record not found.");
  
  var existingSub = getRowObject(sheet, rowIndex);
  existingSub.info_request_response = payload.response;
  
  updateRowObject(sheet, rowIndex, existingSub);
  return existingSub;
}

function deleteSubmissionAction(id) {
  var sheet = getSheet("Submissions");
  var rowIndex = findRowIndexById(sheet, id);
  if (rowIndex === -1) throw new Error("Submission not found.");
  sheet.deleteRow(rowIndex);
  return { id: id, success: true };
}

function deleteUserAndSubmissionsAction(aadhar) {
  var aadharClean = aadhar ? formatNumberString(aadhar) : "";
  if (!aadharClean) return { aadhar: "", success: false, error: "No Aadhaar provided" };

  // 1. Delete all submissions matching this Aadhaar card
  var subSheet = getSheet("Submissions");
  var subData = subSheet.getDataRange().getValues();
  var subHeaders = subData[0];
  var aadharColIndex = subHeaders.indexOf("aadhar");
  
  if (aadharColIndex !== -1) {
    for (var r = subData.length - 1; r >= 1; r--) {
      var cellVal = subData[r][aadharColIndex];
      var cellValStr = cellVal !== undefined && cellVal !== null ? formatNumberString(cellVal) : "";
      if (cellValStr === aadharClean) {
        subSheet.deleteRow(r + 1);
      }
    }
  }
  
  // 2. Delete user profile
  var userSheet = getSheet("Users");
  var userData = userSheet.getDataRange().getValues();
  var userHeaders = userData[0];
  var uAadharIndex = userHeaders.indexOf("aadhar");
  
  if (uAadharIndex !== -1) {
    for (var k = userData.length - 1; k >= 1; k--) {
      var uCellVal = userData[k][uAadharIndex];
      var uCellValStr = uCellVal !== undefined && uCellVal !== null ? formatNumberString(uCellVal) : "";
      if (uCellValStr === aadharClean) {
        userSheet.deleteRow(k + 1);
      }
    }
  }
  
  return { aadhar: aadharClean, success: true };
}

function getUsersAction() {
  var users = getRowsFromSheet("Users");
  return users.map(function(u) {
    var cleaned = {};
    Object.keys(u).forEach(function(key) {
      cleaned[key] = u[key];
    });
    cleaned.phone = formatNumberString(u.phone);
    cleaned.dob = formatDateString(u.dob);
    cleaned.aadhar = formatNumberString(u.aadhar);
    return cleaned;
  });
}

function getSubmissionsAction() {
  var submissions = getRowsFromSheet("Submissions");
  return submissions.map(function(s) {
    return {
      id: s.id,
      form_id: s.form_id,
      user_id: s.user_id,
      phone: formatNumberString(s.phone),
      dob: formatDateString(s.dob),
      aadhar: formatNumberString(s.aadhar),
      responses: s.responses,
      uploaded_docs: s.uploaded_docs,
      payment_status: s.payment_status,
      payment_screenshot: s.payment_screenshot,
      progress_percent: parseInt(s.progress_percent) || 0,
      progress_desc: s.progress_desc,
      uploaded_pdf_url: s.uploaded_pdf_url,
      submitted_at: s.submitted_at,
      info_request_label: s.info_request_label,
      info_request_type: s.info_request_type,
      info_request_response: s.info_request_response,
      receipt_url: s.receipt_url || "",
      certificate_url: s.certificate_url || "",
      other_doc_url: s.other_doc_url || "",
      other_doc_name: s.other_doc_name || ""
    };
  });
}

function getUserStatusAction(phone, dob, aadhar) {
  var submissions = getRowsFromSheet("Submissions");
  var dobClean = dob ? formatDateString(dob) : "";
  var phoneClean = phone ? formatNumberString(phone) : "";
  var aadharClean = aadhar ? formatNumberString(aadhar) : "";
  
  var filtered = submissions.filter(function(sub) {
    var subPhone = sub.phone ? formatNumberString(sub.phone) : "";
    var subAadhar = sub.aadhar ? formatNumberString(sub.aadhar) : "";
    var subDob = sub.dob ? formatDateString(sub.dob) : "";
    
    // Match by Aadhar (primary identifier)
    if (aadharClean && subAadhar === aadharClean) {
      return true;
    }
    // Match by Phone
    if (phoneClean && subPhone === phoneClean) {
      // If DOB is provided, additionally match DOB
      if (dobClean) {
        return subDob === dobClean;
      }
      return true;
    }
    return false;
  });
  
  // Sort submissions descending by submitted_at
  filtered.sort(function(a, b) {
    return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
  });
  
  // Format returned list items
  return filtered.map(function(s) {
    var item = {};
    Object.keys(s).forEach(function(key) {
      item[key] = s[key];
    });
    item.phone = formatNumberString(s.phone);
    item.dob = formatDateString(s.dob);
    item.aadhar = formatNumberString(s.aadhar);
    return item;
  });
}

function getUserSubmissionsAction(aadhar) {
  var submissions = getRowsFromSheet("Submissions");
  var aadharClean = aadhar ? formatNumberString(aadhar) : "";
  
  var filtered = submissions.filter(function(sub) {
    var subAadhar = sub.aadhar ? formatNumberString(sub.aadhar) : "";
    return subAadhar === aadharClean;
  });
  
  filtered.sort(function(a, b) {
    return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
  });
  
  // Format returned list items
  return filtered.map(function(s) {
    var item = {};
    Object.keys(s).forEach(function(key) {
      item[key] = s[key];
    });
    item.phone = formatNumberString(s.phone);
    item.dob = formatDateString(s.dob);
    item.aadhar = formatNumberString(s.aadhar);
    return item;
  });
}

// --- 4B. FEEDBACK ACTIONS ---

function submitFeedbackAction(payload) {
  var sheet = getSheet("Feedback");
  var feedbackId = "fb-" + Math.random().toString(36).substring(2, 10);
  
  var newFeedback = {
    id: feedbackId,
    user_name: payload.user_name || "Guest User",
    user_phone: payload.user_phone ? "'" + formatNumberString(payload.user_phone) : "",
    user_aadhar: payload.user_aadhar ? "'" + formatNumberString(payload.user_aadhar) : "",
    message: payload.message || "",
    rating: parseInt(payload.rating) || 0,
    created_at: new Date().toISOString()
  };
  
  appendObjectToSheet(sheet, newFeedback);
  
  newFeedback.user_phone = payload.user_phone ? formatNumberString(payload.user_phone) : "";
  newFeedback.user_aadhar = payload.user_aadhar ? formatNumberString(payload.user_aadhar) : "";
  return newFeedback;
}

function getFeedbackAction() {
  var rows = getRowsFromSheet("Feedback");
  rows.sort(function(a, b) {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  return rows.map(function(f) {
    var item = {};
    Object.keys(f).forEach(function(key) {
      item[key] = f[key];
    });
    item.user_phone = formatNumberString(f.user_phone);
    item.user_aadhar = formatNumberString(f.user_aadhar);
    return item;
  });
}

function deleteFeedbackAction(id) {
  var sheet = getSheet("Feedback");
  var rowIndex = findRowIndexById(sheet, id);
  if (rowIndex === -1) throw new Error("Feedback entry not found.");
  sheet.deleteRow(rowIndex);
  return { id: id, success: true };
}

function replyFeedbackAction(id, responseText) {
  var sheet = getSheet("Feedback");
  var rowIndex = findRowIndexById(sheet, id);
  if (rowIndex === -1) throw new Error("Feedback entry not found.");
  
  var existingRow = getRowObject(sheet, rowIndex);
  existingRow.admin_response = responseText || "";
  existingRow.response_at = new Date().toISOString();
  
  updateRowObject(sheet, rowIndex, existingRow);
  
  existingRow.user_phone = formatNumberString(existingRow.user_phone);
  existingRow.user_aadhar = formatNumberString(existingRow.user_aadhar);
  return existingRow;
}

// --- 4C. SETTINGS ACTIONS ---

function getSettingsAction() {
  var rows = getRowsFromSheet("Settings");
  var settings = {};
  rows.forEach(function(r) {
    if (r.key !== "admin_login_code") {
      settings[r.key] = r.value;
    }
  });
  
  // Expose user count dynamically
  try {
    var usersSheet = getSheet("Users");
    var userCount = Math.max(0, usersSheet.getLastRow() - 1);
    settings["user_count"] = userCount;
  } catch (e) {
    settings["user_count"] = 0;
  }
  
  return settings;
}

function verifyAdminLoginAction(payload) {
  var rows = getRowsFromSheet("Settings");
  var adminCode = "123456"; // Default
  rows.forEach(function(r) {
    if (r.key === "admin_login_code" && r.value) {
      adminCode = r.value.toString().trim();
    }
  });
  
  if (payload.code === adminCode) {
    return { success: true };
  } else {
    throw new Error("Invalid Admin Code");
  }
}

function updateSettingsAction(payload) {
  var sheet = getSheet("Settings");
  var keys = Object.keys(payload);
  
  var values = sheet.getDataRange().getDisplayValues();
  var headers = values[0];
  var keyColIndex = headers.indexOf("key");
  var valColIndex = headers.indexOf("value");
  
  keys.forEach(function(k) {
    var foundRow = -1;
    for (var r = 1; r < values.length; r++) {
      if (values[r][keyColIndex] === k) {
        foundRow = r + 1;
        break;
      }
    }
    if (foundRow !== -1) {
      sheet.getRange(foundRow, valColIndex + 1).setValue(payload[k]);
    } else {
      appendObjectToSheet(sheet, { key: k, value: payload[k] });
    }
  });
  SpreadsheetApp.flush();
  return getSettingsAction();
}

// --- 5. GOOGLE DRIVE FILE UPLOADS ---

function uploadFileAction(requestData) {
  var fileBase64 = requestData.fileData;
  var fileName = requestData.fileName;
  var mimeType = requestData.mimeType;
  var customPath = requestData.pathArray || [ROOT_FOLDER_NAME]; // e.g. ["WhatsBro_Uploads", "Form_Pan_Card", "User_1234"]
  
  // Ensure correct formatting
  if (!fileBase64 || !fileName || !mimeType) {
    throw new Error("Missing file upload payload options: fileData, fileName, mimeType required.");
  }
  
  // Decode base64 contents
  var decodedBytes = Utilities.base64Decode(fileBase64);
  var fileBlob = Utilities.newBlob(decodedBytes, mimeType, fileName);
  
  // Get/Create target folder structure recursively
  var targetFolder = getOrCreateFolderPath(customPath);
  
  // Save file to folder
  var uploadedFile = targetFolder.createFile(fileBlob);
  
  // Enable public sharing so that link is readable anywhere
  uploadedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  // Generate download or shareable links
  return {
    fileName: fileName,
    fileUrl: uploadedFile.getUrl(), // Direct Drive viewer link
    downloadUrl: "https://drive.google.com/uc?export=download&id=" + uploadedFile.getId() // Direct file stream download link
  };
}

// --- DATABASE CORE HELPERS & INITIALIZATION ---

/**
 * Ensures required sheets and standard headers are present.
 */
function initSpreadsheet() {
  // 1. FORMS SHEET
  var formsSheet = ensureSheetExists("Forms", [
    "id", "title", "description", "category", "fee", "instructions", "required_fields", "required_docs", "custom_docs", "fields", "img_url", "order_index", "created_at"
  ]);
  ensureColumnExists(formsSheet, "img_url");
  ensureColumnExists(formsSheet, "order_index");
  ensureColumnExists(formsSheet, "coming_soon");
  
  // 2. USERS PROFILE SHEET
  var usersSheet = ensureSheetExists("Users", [
    "id", "name", "name_tamil", "dob", "phone", "aadhar", "email", "gender", "marital_status", "father_name", "father_name_tamil", "mother_name", "mother_name_tamil", "community", "address", "religion", "state", "district", "taluk", "revenue_village", "street_name", "door_no", "pincode", "photo_url", "aadhar_url_1", "aadhar_url_2", "smart_card_url_1", "smart_card_url_2", "voter_id_url_1", "voter_id_url_2", "signature_url_1", "custom_fields", "created_at"
  ]);
  ensureColumnExists(usersSheet, "custom_fields");
  ensureColumnExists(usersSheet, "email");
  
  // 3. SUBMISSIONS SHEET
  var subSheet = ensureSheetExists("Submissions", [
    "id", "form_id", "user_id", "phone", "dob", "aadhar", "responses", "uploaded_docs", "payment_status", "payment_screenshot", "progress_percent", "progress_desc", "uploaded_pdf_url", "submitted_at", "info_request_label", "info_request_type", "info_request_response", "receipt_url", "certificate_url", "other_doc_url", "other_doc_name"
  ]);
  ensureColumnExists(subSheet, "receipt_url");
  ensureColumnExists(subSheet, "certificate_url");
  ensureColumnExists(subSheet, "other_doc_url");
  ensureColumnExists(subSheet, "other_doc_name");
  ensureColumnExists(subSheet, "pay_allowed");
  
  // 4. POSTS FEED SHEET
  var postsSheet = ensureSheetExists("Posts", [
    "id", "title", "description", "img_url", "apply_url", "order_index", "created_at"
  ]);
  ensureColumnExists(postsSheet, "order_index");
  ensureColumnExists(postsSheet, "coming_soon");

  // 4B. JOBS FEED SHEET
  var jobsSheet = ensureSheetExists("Jobs", [
    "id", "title", "description", "img_url", "apply_url", "details_doc", "button_name", "order_index", "created_at"
  ]);
  ensureColumnExists(jobsSheet, "details_doc");
  ensureColumnExists(jobsSheet, "button_name");
  ensureColumnExists(jobsSheet, "order_index");
  ensureColumnExists(jobsSheet, "coming_soon");
  ensureColumnExists(jobsSheet, "start_date");
  ensureColumnExists(jobsSheet, "end_date");
  
  // 5B. FEEDBACK SHEET
  ensureSheetExists("Feedback", [
    "id", "user_name", "user_phone", "user_aadhar", "message", "rating", "created_at", "admin_response", "response_at"
  ]);
  var feedbackSheet = getSheet("Feedback");
  ensureColumnExists(feedbackSheet, "admin_response");
  ensureColumnExists(feedbackSheet, "response_at");

  // 5C. OTP SHEET
  ensureSheetExists("OTP", [
    "email", "otp", "expires_at"
  ]);

  // 6. SETTINGS SHEET
  var settingsSheet = ensureSheetExists("Settings", ["key", "value"]);
  if (settingsSheet.getLastRow() <= 1) {
    appendObjectToSheet(settingsSheet, { key: "admin_email", value: "" });
    appendObjectToSheet(settingsSheet, { key: "admin_whatsapp_number", value: "919787973615" });
  }

  // 7. SYSTEM ERROR/LOG SHEET
  ensureSheetExists("SystemLog", [
    "timestamp", "context", "message"
  ]);

  // 8. ANNOUNCEMENTS SHEET
  var annSheet = ensureSheetExists("Announcements", [
    "id", "title", "description", "content", "button_name", "button_url", "enabled", "created_at", "img_url"
  ]);
  ensureColumnExists(annSheet, "img_url");
  ensureColumnExists(annSheet, "button_name");
  ensureColumnExists(annSheet, "button_url");
  
  // 9. PRODUCTS SHEET
  var productsSheet = ensureSheetExists("Products", [
    "ProductID", "Category", "CoverType", "Brand", "CustomBrand", "ModelName", "ProductName", "Type", "Price", "TagNumber", "ImageURL", "CreatedDate", "Count"
  ]);
  ensureColumnExists(productsSheet, "Count");

  // 10. TEMPERED GLASS SHEET
  ensureSheetExists("TemperedGlass", [
    "BoxNumber", "ModelList"
  ]);
  
  // 11. REDIRECTS SHEET
  ensureSheetExists("Redirects", [
    "id", "target_url", "title", "description", "img_url", "created_at"
  ]);
  
  // Add initial mockup posts if Posts sheet is empty
  var postsSheet = getSheet("Posts");
  if (postsSheet.getLastRow() === 1) {
    appendObjectToSheet(postsSheet, {
      id: 1,
      title: "E-Sevai Quick Services",
      description: "Apply for Income Certificate, Community Certificate, and Nativity Certificate easily through our portal. Processing time: 3-5 working days.",
      img_url: "",
      apply_url: "/user?tab=apply&category=E%20sevai",
      created_at: new Date().toISOString()
    });
    appendObjectToSheet(postsSheet, {
      id: 2,
      title: "New PAN Card & Corrections",
      description: "Get a new PAN Card in 7 working days or make corrections in your existing PAN Card (Name, DOB, or Photo) with simple document submission.",
      img_url: "",
      apply_url: "/user?tab=apply&category=pan%20card",
      created_at: new Date().toISOString()
    });
    appendObjectToSheet(postsSheet, {
      id: 3,
      title: "Voter ID Registration",
      description: "New Voter Registration, address updates, or replacement voter ID card applications are active. Track status securely.",
      img_url: "",
      apply_url: "/user?tab=apply&category=voter%20id",
      created_at: new Date().toISOString()
    });
  }

  // Add initial mockup jobs if Jobs sheet is empty
  var jobsSheet = getSheet("Jobs");
  if (jobsSheet.getLastRow() === 1) {
    appendObjectToSheet(jobsSheet, {
      id: 1,
      title: "TNEB Wireman Recruitment",
      description: "Tamil Nadu Electricity Board (TNEB) announces openings for Wireman positions. Required qualification: ITI in Electrical Trade. Age limit: 18-35 years. Apply before June 30, 2026.",
      img_url: "",
      apply_url: "/user?tab=apply",
      created_at: new Date().toISOString()
    });
    appendObjectToSheet(jobsSheet, {
      id: 2,
      title: "TNPSC Group 4 Openings",
      description: "TNPSC has released the recruitment notification for Group 4 services including VAO, Junior Assistant, and Typist. Minimum qualification: 10th standard pass. Apply today through the official channel.",
      img_url: "",
      apply_url: "https://www.tnpsc.gov.in",
      created_at: new Date().toISOString()
    });
  }
}

function ensureSheetExists(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var sheet = null;
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().toLowerCase() === name.toLowerCase()) {
      sheet = sheets[i];
      break;
    }
  }
  if (!sheet) {
    sheet = ss.insertSheet(name);
    // Write headers
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e2e8f0");
  }
  return sheet;
}

function getSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().toLowerCase() === name.toLowerCase()) {
      return sheets[i];
    }
  }
  throw new Error("Database Table Sheet not found: " + name);
}

function getRowsFromSheet(sheetName) {
  var sheet = getSheet(sheetName);
  var values = sheet.getDataRange().getDisplayValues();
  if (values.length <= 1) return []; // Only headers
  
  var headers = values[0];
  var rows = [];
  
  for (var r = 1; r < values.length; r++) {
    var rowObject = {};
    for (var c = 0; c < headers.length; c++) {
      rowObject[headers[c]] = values[r][c];
    }
    rows.push(rowObject);
  }
  return rows;
}

function getRowObject(sheet, rowIndex) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  var values = sheet.getRange(rowIndex, 1, 1, headers.length).getDisplayValues()[0];
  var rowObject = {};
  for (var c = 0; c < headers.length; c++) {
    rowObject[headers[c]] = values[c];
  }
  return rowObject;
}

function appendObjectToSheet(sheet, obj) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rowValues = [];
  for (var c = 0; c < headers.length; c++) {
    rowValues.push(obj[headers[c]] !== undefined ? obj[headers[c]] : "");
  }
  sheet.appendRow(rowValues);
}

function updateRowObject(sheet, rowIndex, obj) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rowValues = [];
  for (var c = 0; c < headers.length; c++) {
    rowValues.push(obj[headers[c]] !== undefined ? obj[headers[c]] : "");
  }
  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowValues]);
}

function ensureColumnExists(sheet, colName) {
  var lastCol = sheet.getLastColumn();
  var headersRange = sheet.getRange(1, 1, 1, lastCol);
  var headers = headersRange.getValues()[0];
  
  if (headers.indexOf(colName) === -1) {
    // Append new column header
    var newColIdx = lastCol + 1;
    sheet.getRange(1, newColIdx).setValue(colName).setFontWeight("bold").setBackground("#cbd5e1");
  }
}

function findRowIndexById(sheet, id) {
  var values = sheet.getDataRange().getDisplayValues();
  var headers = values[0];
  var idColIndex = headers.indexOf("id");
  if (idColIndex === -1) return -1;
  
  var idStr = id.toString().trim();
  for (var r = 1; r < values.length; r++) {
    var cellVal = values[r][idColIndex];
    if (cellVal !== undefined && cellVal !== null && cellVal.toString().trim() === idStr) {
      return r + 1; // 1-indexed row number
    }
  }
  return -1;
}

function getOrCreateFolderPath(pathArray) {
  var folder = DriveApp.getRootFolder();
  for (var i = 0; i < pathArray.length; i++) {
    var name = pathArray[i];
    var folders = folder.getFoldersByName(name);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      var newFolder = folder.createFolder(name);
      newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      folder = newFolder;
    }
  }
  return folder;
}

// --- 4D. ANNOUNCEMENT ACTIONS ---

function getAnnouncementsAction() {
  return getRowsFromSheet("Announcements");
}

function createAnnouncementAction(annData) {
  var sheet = getSheet("Announcements");
  var newAnn = {
    id: generateUniqueId(),
    title: annData.title || "",
    description: annData.description || "",
    content: annData.content || "",
    img_url: annData.img_url || "",
    button_name: annData.button_name || "",
    button_url: annData.button_url || "",
    enabled: annData.enabled !== undefined ? String(annData.enabled) : "true",
    created_at: new Date().toISOString()
  };
  appendObjectToSheet(sheet, newAnn);
  SpreadsheetApp.flush();
  return getAnnouncementsAction();
}

function updateAnnouncementAction(id, annData) {
  var sheet = getSheet("Announcements");
  var rowIndex = findRowIndexById(sheet, id);
  if (rowIndex === -1) throw new Error("Announcement not found.");
  
  var existingRow = getRowObject(sheet, rowIndex);
  if (annData.title !== undefined) existingRow.title = annData.title;
  if (annData.description !== undefined) existingRow.description = annData.description;
  if (annData.content !== undefined) existingRow.content = annData.content;
  if (annData.img_url !== undefined) existingRow.img_url = annData.img_url;
  if (annData.button_name !== undefined) existingRow.button_name = annData.button_name;
  if (annData.button_url !== undefined) existingRow.button_url = annData.button_url;
  if (annData.enabled !== undefined) existingRow.enabled = String(annData.enabled);
  
  updateRowObject(sheet, rowIndex, existingRow);
  SpreadsheetApp.flush();
  return getAnnouncementsAction();
}

function deleteAnnouncementAction(id) {
  var sheet = getSheet("Announcements");
  var rowIndex = findRowIndexById(sheet, id);
  if (rowIndex === -1) throw new Error("Announcement not found.");
  sheet.deleteRow(rowIndex);
  SpreadsheetApp.flush();
  return { success: true };
}

function parseJsonField(val) {
  if (!val) return [];
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return [];
  }
}

function logError(context, err) {
  try {
    var sheet = getSheet("SystemLog");
    sheet.appendRow([new Date().toISOString(), context, err.toString()]);
  } catch (e) {
    // Fail silently to prevent infinite crash loops
  }
}

function jsonResponse(data, statusCode) {
  var outputString = JSON.stringify(data);
  return ContentService.createTextOutput(outputString)
    .setMimeType(ContentService.MimeType.JSON);
}

// --- 6. PRODUCTS & TEMPERED GLASS ACTIONS ---

function findRowIndexByColumn(sheet, columnName, val) {
  var values = sheet.getDataRange().getDisplayValues();
  var headers = values[0];
  var colIndex = headers.indexOf(columnName);
  if (colIndex === -1) return -1;
  
  var valStr = val.toString().trim();
  for (var r = 1; r < values.length; r++) {
    var cellVal = values[r][colIndex];
    if (cellVal !== undefined && cellVal !== null && cellVal.toString().trim() === valStr) {
      return r + 1; // 1-indexed row number
    }
  }
  return -1;
}

function getProductsAction() {
  return getRowsFromSheet("Products");
}

function createProductAction(productData) {
  var sheet = getSheet("Products");
  var id = "prod-" + Date.now() + Math.random().toString(36).substring(2, 6);
  var newProduct = {
    ProductID: id,
    Category: productData.Category || "",
    CoverType: productData.CoverType || "",
    Brand: productData.Brand || "",
    CustomBrand: productData.CustomBrand || "",
    ModelName: productData.ModelName || "",
    ProductName: productData.ProductName || "",
    Type: productData.Type || "",
    Price: productData.Price || "",
    TagNumber: productData.TagNumber || "",
    ImageURL: productData.ImageURL || "",
    Count: productData.Count !== undefined ? String(productData.Count) : "0",
    CreatedDate: new Date().toISOString()
  };
  
  appendObjectToSheet(sheet, newProduct);
  return newProduct;
}

function updateProductAction(id, productData) {
  var sheet = getSheet("Products");
  var rowIndex = findRowIndexByColumn(sheet, "ProductID", id);
  if (rowIndex === -1) throw new Error("Product not found.");
  
  var existingRow = getRowObject(sheet, rowIndex);
  if (productData.Category !== undefined) existingRow.Category = productData.Category;
  if (productData.CoverType !== undefined) existingRow.CoverType = productData.CoverType;
  if (productData.Brand !== undefined) existingRow.Brand = productData.Brand;
  if (productData.CustomBrand !== undefined) existingRow.CustomBrand = productData.CustomBrand;
  if (productData.ModelName !== undefined) existingRow.ModelName = productData.ModelName;
  if (productData.ProductName !== undefined) existingRow.ProductName = productData.ProductName;
  if (productData.Type !== undefined) existingRow.Type = productData.Type;
  if (productData.Price !== undefined) existingRow.Price = productData.Price;
  if (productData.TagNumber !== undefined) existingRow.TagNumber = productData.TagNumber;
  if (productData.ImageURL !== undefined) existingRow.ImageURL = productData.ImageURL;
  if (productData.Count !== undefined) existingRow.Count = String(productData.Count);
  
  updateRowObject(sheet, rowIndex, existingRow);
  return existingRow;
}

function deleteProductAction(id) {
  var sheet = getSheet("Products");
  var rowIndex = findRowIndexByColumn(sheet, "ProductID", id);
  if (rowIndex === -1) throw new Error("Product not found.");
  sheet.deleteRow(rowIndex);
  return { ProductID: id, success: true };
}

function getTemperedGlassAction() {
  return getRowsFromSheet("TemperedGlass");
}

function createTemperedGlassAction(tgData) {
  var sheet = getSheet("TemperedGlass");
  var boxNumber = (tgData.BoxNumber || "").toString().trim();
  if (!boxNumber) throw new Error("Box Number is required.");
  
  // Check duplicates
  var rowIndex = findRowIndexByColumn(sheet, "BoxNumber", boxNumber);
  if (rowIndex !== -1) {
    throw new Error("Box Number '" + boxNumber + "' already exists.");
  }
  
  var newTG = {
    BoxNumber: boxNumber,
    ModelList: tgData.ModelList || ""
  };
  
  appendObjectToSheet(sheet, newTG);
  return newTG;
}

function updateTemperedGlassAction(boxNumber, tgData) {
  var sheet = getSheet("TemperedGlass");
  var rowIndex = findRowIndexByColumn(sheet, "BoxNumber", boxNumber);
  if (rowIndex === -1) throw new Error("Tempered Glass entry not found.");
  
  var existingRow = getRowObject(sheet, rowIndex);
  if (tgData.ModelList !== undefined) existingRow.ModelList = tgData.ModelList;
  if (tgData.BoxNumber !== undefined && tgData.BoxNumber.toString().trim() !== boxNumber) {
    var newBox = tgData.BoxNumber.toString().trim();
    var dupIndex = findRowIndexByColumn(sheet, "BoxNumber", newBox);
    if (dupIndex !== -1) throw new Error("Box Number '" + newBox + "' already exists.");
    existingRow.BoxNumber = newBox;
  }
  
  updateRowObject(sheet, rowIndex, existingRow);
  return existingRow;
}

function deleteTemperedGlassAction(boxNumber) {
  var sheet = getSheet("TemperedGlass");
  var rowIndex = findRowIndexByColumn(sheet, "BoxNumber", boxNumber);
  if (rowIndex === -1) throw new Error("Tempered Glass entry not found.");
  sheet.deleteRow(rowIndex);
  return { BoxNumber: boxNumber, success: true };
}

// --- REDIRECTS OPERATIONS ---
function getRedirectsAction() {
  return getRowsFromSheet("Redirects");
}

function getRedirectByIdAction(id) {
  var sheet = getSheet("Redirects");
  var rowIndex = findRowIndexByColumn(sheet, "id", id);
  if (rowIndex === -1) {
    throw new Error("Redirect not found for ID: " + id);
  }
  return getRowObject(sheet, rowIndex);
}

function createRedirectAction(payload) {
  var sheet = getSheet("Redirects");
  var id = (payload.id || "").toString().trim().toLowerCase();
  if (!id) throw new Error("ID/Slug is required.");
  
  var redirectObj = {
    id: id,
    target_url: (payload.target_url || "").toString().trim(),
    title: (payload.title || "").toString().trim(),
    description: (payload.description || "").toString().trim(),
    img_url: (payload.img_url || "").toString().trim(),
    created_at: new Date().toISOString()
  };
  
  var rowIndex = findRowIndexByColumn(sheet, "id", id);
  if (rowIndex !== -1) {
    updateRowObject(sheet, rowIndex, redirectObj);
  } else {
    appendObjectToSheet(sheet, redirectObj);
  }
  SpreadsheetApp.flush();
  return redirectObj;
}

function deleteRedirectAction(id) {
  var sheet = getSheet("Redirects");
  var rowIndex = findRowIndexByColumn(sheet, "id", id);
  if (rowIndex === -1) throw new Error("Redirect not found.");
  sheet.deleteRow(rowIndex);
  SpreadsheetApp.flush();
  return { id: id, success: true };
}
