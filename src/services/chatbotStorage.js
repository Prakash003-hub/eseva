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
 * chatbotFlow.json is the authoritative Single Source of Truth for all users.
 */
export const getPublishedFlows = () => {
  return normalizeFlows(initialSeedData.flows || []);
};

/**
 * Get Draft Chatbot Flows for Admin Editor.
 * Loads latest flows directly from chatbotFlow.json.
 */
export const getDraftFlows = () => {
  return normalizeFlows(initialSeedData.flows || []);
};

/**
 * Save Configuration directly to src/config/chatbotFlow.json on disk.
 */
export const saveDraftFlows = async (flows) => {
  const normalized = normalizeFlows(flows);
  const payload = {
    version: '1.0',
    updated_at: new Date().toISOString(),
    flows: normalized
  };

  // Sync directly to src/config/chatbotFlow.json via local dev server
  if (import.meta.env.DEV) {
    try {
      const res = await fetch('/api/chatbot/save-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to save to disk');
      }
    } catch (err) {
      console.warn('[Chatbot Storage] Local disk save endpoint error:', err);
      throw err;
    }
  }

  window.dispatchEvent(new CustomEvent('chatbot-config-published'));
  return normalized;
};

/**
 * Save & Publish: Writes directly to src/config/chatbotFlow.json on disk.
 */
export const publishDraftFlows = async (flows) => {
  return await saveDraftFlows(flows);
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
  return getPublishedFlows();
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
