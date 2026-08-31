import initialSeedData from '../config/chatbotFlow.json';

const STORAGE_KEY_PUBLISHED = 'whatsbro_chatbot_published';
const STORAGE_KEY_DRAFT = 'whatsbro_chatbot_draft';

// Helper to normalize flows ensuring required fields exist
const normalizeNode = (node) => {
  if (!node || typeof node !== 'object') return null;

  const normalized = {
    id: node.id || `node_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    parent_id: node.parent_id !== undefined ? node.parent_id : null,
    title: node.title || 'Untitled Node',
    description: node.description || '',
    button_text: node.button_text || node.title || 'Option',
    status: node.status === 'disabled' ? 'disabled' : 'published',
    sort_order: Number(node.sort_order) || 0,
    created_at: node.created_at || new Date().toISOString(),
    updated_at: node.updated_at || new Date().toISOString(),
    children: Array.isArray(node.children)
      ? node.children.map(normalizeNode).filter(Boolean)
      : []
  };

  if (node.response && typeof node.response === 'object') {
    normalized.response = {
      title: node.response.title || '',
      description: node.response.description || '',
      actions: Array.isArray(node.response.actions)
        ? node.response.actions.map(act => ({
            id: act.id || `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            type: act.type || 'url', // 'url' | 'whatsapp_msg' | 'whatsapp_share'
            button_text: act.button_text || 'Action',
            url: act.url || '',
            message: act.message || '',
            share_content: act.share_content || ''
          }))
        : []
    };
  }

  return normalized;
};

const normalizeFlows = (flows) => {
  if (!Array.isArray(flows)) return [];
  return flows.map(normalizeNode).filter(Boolean);
};

// Merge existing flows with seed flows ensuring all default categories exist
const mergeWithSeedFlows = (existingFlows) => {
  const normalizedExisting = normalizeFlows(existingFlows || []);
  const existingIds = new Set(normalizedExisting.map(f => f.id));
  const seedFlows = normalizeFlows(initialSeedData.flows || []);

  const missingSeedFlows = seedFlows.filter(sf => !existingIds.has(sf.id));
  if (missingSeedFlows.length > 0) {
    return [...normalizedExisting, ...missingSeedFlows];
  }
  return normalizedExisting;
};

/**
 * Get Published Chatbot Flows.
 * In Production: Always uses the bundled chatbotFlow.json (single source of truth).
 * In Development: Uses localStorage draft/published or chatbotFlow.json.
 */
export const getPublishedFlows = () => {
  // If in production environment, bundled chatbotFlow.json is the authoritative source
  if (import.meta.env.PROD) {
    return normalizeFlows(initialSeedData.flows || []);
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY_PUBLISHED);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed.flows)) {
        return mergeWithSeedFlows(parsed.flows);
      }
    }
  } catch (err) {
    console.error('Failed to read published chatbot flows from localStorage:', err);
  }
  // Fallback to initial seed configuration
  return normalizeFlows(initialSeedData.flows || []);
};

/**
 * Get Draft Chatbot Flows for Admin Editor.
 */
export const getDraftFlows = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_DRAFT);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed.flows)) {
        return mergeWithSeedFlows(parsed.flows);
      }
    }
  } catch (err) {
    console.error('Failed to read draft chatbot flows from localStorage:', err);
  }
  return getPublishedFlows();
};

/**
 * Save Draft Configuration to localStorage and directly to disk (src/config/chatbotFlow.json in dev).
 */
export const saveDraftFlows = async (flows) => {
  const normalized = normalizeFlows(flows);
  const payload = {
    version: '1.0',
    updated_at: new Date().toISOString(),
    flows: normalized
  };
  localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(payload));

  // Sync directly to src/config/chatbotFlow.json via local dev server
  if (import.meta.env.DEV) {
    try {
      await fetch('/api/chatbot/save-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.warn('[Chatbot Storage] Local disk save endpoint unreachable:', err);
    }
  }

  return normalized;
};

/**
 * Publish Configuration to Production:
 * 1. Saves to localStorage
 * 2. Writes directly to src/config/chatbotFlow.json
 * 3. Commits & Pushes to GitHub main to trigger Vercel deployment
 */
export const publishDraftFlows = async (flows, commitMessage = '') => {
  const normalized = normalizeFlows(flows);
  const payload = {
    version: '1.0',
    updated_at: new Date().toISOString(),
    flows: normalized,
    commitMessage: commitMessage || `Update chatbot flows from Admin Portal [${new Date().toLocaleString()}]`
  };

  localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(payload));
  localStorage.setItem(STORAGE_KEY_PUBLISHED, JSON.stringify(payload));

  let gitResult = null;

  // Sync to disk & Push to GitHub in dev
  if (import.meta.env.DEV) {
    try {
      const response = await fetch('/api/chatbot/publish-and-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to push to GitHub');
      }
      gitResult = data;
    } catch (err) {
      console.error('[Chatbot Storage] Publish & push failure:', err);
      throw err;
    }
  }

  window.dispatchEvent(new CustomEvent('chatbot-config-published'));
  return { flows: normalized, git: gitResult };
};

/**
 * Reset Draft & Published cache to original bundled seed configuration.
 */
export const resetToSeedData = async () => {
  localStorage.removeItem(STORAGE_KEY_PUBLISHED);
  localStorage.removeItem(STORAGE_KEY_DRAFT);
  const seedFlows = normalizeFlows(initialSeedData.flows || []);
  await saveDraftFlows(seedFlows);
  return seedFlows;
};

/**
 * Reset Draft to match Published Config.
 */
export const resetDraftToPublished = () => {
  const published = getPublishedFlows();
  saveDraftFlows(published);
  return published;
};

/**
 * Export Chatbot Configuration to downloadable JSON file.
 */
export const exportChatbotConfig = (flows) => {
  const normalized = normalizeFlows(flows);
  const dataStr = JSON.stringify({
    version: '1.0',
    exported_at: new Date().toISOString(),
    flows: normalized
  }, null, 2);

  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chatbot-config_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Validate Chatbot Configuration Schema and Logic.
 */
export const validateChatbotConfig = (flows) => {
  const errors = [];
  const visitedIds = new Set();

  const traverse = (nodes, pathStr = '') => {
    if (!Array.isArray(nodes)) return;

    nodes.forEach((node, index) => {
      const location = `${pathStr} -> ${node.title || `Item ${index + 1}`}`;

      if (!node.id) {
        errors.push(`Missing node ID at ${location}`);
      } else if (visitedIds.has(node.id)) {
        errors.push(`Duplicate node ID detected: "${node.id}" at ${location}`);
      } else {
        visitedIds.add(node.id);
      }

      if (!node.title || !node.title.trim()) {
        errors.push(`Empty title/name at ${location}`);
      }

      if (!node.button_text || !node.button_text.trim()) {
        errors.push(`Empty button text at ${location}`);
      }

      // Check response actions validation
      if (node.response) {
        const res = node.response;
        if (!res.title || !res.title.trim()) {
          errors.push(`Response title missing at ${location}`);
        }
        if (Array.isArray(res.actions)) {
          res.actions.forEach((act, aIdx) => {
            if (!act.button_text || !act.button_text.trim()) {
              errors.push(`Action #${aIdx + 1} missing button text at ${location}`);
            }
            if (act.type === 'url' && (!act.url || !act.url.trim())) {
              errors.push(`Action "${act.button_text}" missing URL link at ${location}`);
            }
            if (act.type === 'whatsapp_msg' && (!act.message || !act.message.trim())) {
              errors.push(`Action "${act.button_text}" missing WhatsApp message text at ${location}`);
            }
            if (act.type === 'whatsapp_share' && (!act.share_content || !act.share_content.trim())) {
              errors.push(`Action "${act.button_text}" missing WhatsApp share content at ${location}`);
            }
          });
        }
      }

      if (Array.isArray(node.children) && node.children.length > 0) {
        traverse(node.children, location);
      }
    });
  };

  traverse(flows, 'Root Requests');
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Import and parse JSON configuration file string.
 */
export const importChatbotConfig = (jsonString) => {
  try {
    const parsed = JSON.parse(jsonString);
    let flowsToImport = [];

    if (Array.isArray(parsed)) {
      flowsToImport = parsed;
    } else if (parsed && Array.isArray(parsed.flows)) {
      flowsToImport = parsed.flows;
    } else {
      throw new Error('Invalid JSON format: JSON must contain a top-level "flows" array.');
    }

    const normalized = normalizeFlows(flowsToImport);
    const validation = validateChatbotConfig(normalized);

    if (!validation.isValid) {
      throw new Error(`Configuration validation failed:\n- ${validation.errors.join('\n- ')}`);
    }

    return normalized;
  } catch (err) {
    throw new Error(err.message || 'Failed to parse JSON file.');
  }
};

/**
 * Deep Duplicate a Node Hierarchy with freshly generated IDs.
 */
export const duplicateNodeHierarchy = (node, parentId = null) => {
  const newId = `node_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return {
    ...node,
    id: newId,
    parent_id: parentId,
    title: `${node.title} (Copy)`,
    button_text: `${node.button_text} (Copy)`,
    children: Array.isArray(node.children)
      ? node.children.map(child => duplicateNodeHierarchy(child, newId))
      : [],
    response: node.response
      ? {
          ...node.response,
          actions: Array.isArray(node.response.actions)
            ? node.response.actions.map(act => ({
                ...act,
                id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
              }))
            : []
        }
      : undefined
  };
};
