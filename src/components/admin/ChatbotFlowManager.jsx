import React, { useState, useEffect, useMemo } from 'react';
import {
  getDraftFlows,
  saveDraftFlows,
  publishDraftFlows,
  resetDraftToPublished,
  resetToSeedData,
  exportChatbotConfig,
  importChatbotConfig,
  validateChatbotConfig,
  duplicateNodeHierarchy
} from '../../services/chatbotStorage';
import {
  Plus,
  Trash2,
  Edit,
  Save,
  CheckCircle,
  X,
  ChevronRight,
  ChevronDown,
  Upload,
  Download,
  Copy,
  Eye,
  RefreshCw,
  MessageSquare,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Globe,
  ExternalLink,
  Share2,
  FolderPlus,
  CornerDownRight,
  FileText
} from 'lucide-react';

export default function ChatbotFlowManager() {
  const [flows, setFlows] = useState([]);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [expandedNodeIds, setExpandedNodeIds] = useState(new Set());
  
  // Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [parentNodeId, setParentNodeId] = useState(null);

  // Preview Modal State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Delete Warning Modal State
  const [deletingNode, setDeletingNode] = useState(null);

  // Notifications / Alerts
  const [alertMsg, setAlertMsg] = useState({ text: '', type: '' });

  // Load initial draft flows
  useEffect(() => {
    const draft = getDraftFlows();
    setFlows(draft);
    // Expand root nodes by default
    const rootIds = new Set(draft.map(f => f.id));
    setExpandedNodeIds(rootIds);
  }, []);

  const showAlert = (text, type = 'info') => {
    setAlertMsg({ text, type });
    setTimeout(() => setAlertMsg({ text: '', type: '' }), 5000);
  };

  // Toggle expand/collapse of tree node
  const toggleExpandNode = (nodeId) => {
    setExpandedNodeIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set();
    const collect = (nodes) => {
      nodes.forEach(n => {
        allIds.add(n.id);
        if (Array.isArray(n.children)) collect(n.children);
      });
    };
    collect(flows);
    setExpandedNodeIds(allIds);
  };

  const collapseAll = () => {
    setExpandedNodeIds(new Set());
  };

  // Save Draft to LocalStorage
  const handleSaveDraft = (updatedFlows = flows) => {
    try {
      saveDraftFlows(updatedFlows);
      setFlows(updatedFlows);
      setHasUnpublishedChanges(true);
      showAlert('Draft configuration saved successfully.', 'success');
    } catch (err) {
      showAlert('Failed to save draft: ' + err.message, 'error');
    }
  };

  // Publish Draft to Production
  const handlePublish = () => {
    const validation = validateChatbotConfig(flows);
    if (!validation.isValid) {
      showAlert(`Cannot publish! Please fix configuration errors:\n${validation.errors.join(', ')}`, 'error');
      return;
    }

    try {
      publishDraftFlows(flows);
      setHasUnpublishedChanges(false);
      showAlert('🚀 Chatbot flow published to production! Live for all users.', 'success');
    } catch (err) {
      showAlert('Failed to publish: ' + err.message, 'error');
    }
  };

  // Reset Draft to Published
  const handleResetDraft = () => {
    if (!window.confirm('Reset draft to current published production configuration? Any unsaved edits will be discarded.')) return;
    const published = resetDraftToPublished();
    setFlows(published);
    setHasUnpublishedChanges(false);
    showAlert('Draft reset to published configuration.', 'info');
  };

  const handleResetToSeed = () => {
    if (window.confirm('Reset all chatbot flows to original seed dataset (all 9 service categories)?')) {
      const seed = resetToSeedData();
      setFlows(seed);
      showAlert('Reset all flows to default 9-category dataset.', 'success');
    }
  };

  // Export JSON File
  const handleExport = () => {
    try {
      exportChatbotConfig(flows);
      showAlert('Chatbot configuration exported as JSON file.', 'success');
    } catch (err) {
      showAlert('Failed to export: ' + err.message, 'error');
    }
  };

  // Import JSON File
  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonContent = event.target.result;
        const imported = importChatbotConfig(jsonContent);
        setFlows(imported);
        handleSaveDraft(imported);
        showAlert('Configuration imported and saved to draft!', 'success');
      } catch (err) {
        showAlert('Import failed: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // --- RECURSIVE NODE MODIFICATION HELPERS ---
  const updateNodeInTree = (tree, targetId, updateFn) => {
    return tree.map(node => {
      if (node.id === targetId) {
        return updateFn(node);
      }
      if (Array.isArray(node.children) && node.children.length > 0) {
        return {
          ...node,
          children: updateNodeInTree(node.children, targetId, updateFn)
        };
      }
      return node;
    });
  };

  const addNodeToTree = (tree, parentId, newNode) => {
    if (!parentId) {
      return [...tree, newNode];
    }
    return tree.map(node => {
      if (node.id === parentId) {
        return {
          ...node,
          children: [...(node.children || []), newNode]
        };
      }
      if (Array.isArray(node.children) && node.children.length > 0) {
        return {
          ...node,
          children: addNodeToTree(node.children, parentId, newNode)
        };
      }
      return node;
    });
  };

  const removeNodeFromTree = (tree, targetId) => {
    return tree.filter(node => node.id !== targetId).map(node => {
      if (Array.isArray(node.children) && node.children.length > 0) {
        return {
          ...node,
          children: removeNodeFromTree(node.children, targetId)
        };
      }
      return node;
    });
  };

  const reorderNodeInTree = (tree, targetId, direction) => {
    const index = tree.findIndex(n => n.id === targetId);
    if (index !== -1) {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= tree.length) return tree;
      const updated = [...tree];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated;
    }
    return tree.map(node => {
      if (Array.isArray(node.children) && node.children.length > 0) {
        return {
          ...node,
          children: reorderNodeInTree(node.children, targetId, direction)
        };
      }
      return node;
    });
  };

  // --- ACTIONS ON NODES ---
  const handleOpenAddNode = (parentId = null) => {
    setParentNodeId(parentId);
    setEditingNode({
      id: `node_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      parent_id: parentId,
      title: '',
      button_text: '',
      description: '',
      status: 'published',
      sort_order: 0,
      hasResponse: false,
      response: {
        title: '',
        description: '',
        actions: []
      }
    });
    setIsEditorOpen(true);
  };

  const handleOpenEditNode = (node) => {
    setParentNodeId(node.parent_id);
    setEditingNode({
      ...node,
      hasResponse: !!node.response,
      response: node.response ? {
        title: node.response.title || '',
        description: node.response.description || '',
        actions: Array.isArray(node.response.actions) ? node.response.actions : []
      } : {
        title: '',
        description: '',
        actions: []
      }
    });
    setIsEditorOpen(true);
  };

  const handleSaveNodeForm = (e) => {
    e.preventDefault();
    if (!editingNode.title.trim()) {
      alert('Node Title is required.');
      return;
    }
    if (!editingNode.button_text.trim()) {
      alert('Button Text is required.');
      return;
    }

    let finalResponse = undefined;
    if (editingNode.hasResponse) {
      if (!editingNode.response.title.trim()) {
        alert('Response Title is required when Final Response is enabled.');
        return;
      }
      finalResponse = {
        title: editingNode.response.title.trim(),
        description: editingNode.response.description || '',
        actions: (editingNode.response.actions || []).map(a => ({
          ...a,
          button_text: a.button_text.trim(),
          url: a.url ? a.url.trim() : '',
          message: a.message ? a.message.trim() : '',
          share_content: a.share_content ? a.share_content.trim() : ''
        }))
      };
    }

    const payload = {
      id: editingNode.id,
      parent_id: editingNode.parent_id,
      title: editingNode.title.trim(),
      button_text: editingNode.button_text.trim(),
      description: editingNode.description || '',
      status: editingNode.status || 'published',
      sort_order: Number(editingNode.sort_order) || 0,
      updated_at: new Date().toISOString(),
      children: editingNode.children || [],
      response: finalResponse
    };

    let updatedFlows;
    const exists = flows.some(n => findNode(flows, payload.id));
    if (exists) {
      updatedFlows = updateNodeInTree(flows, payload.id, existing => ({
        ...existing,
        ...payload
      }));
    } else {
      updatedFlows = addNodeToTree(flows, parentNodeId, payload);
    }

    handleSaveDraft(updatedFlows);
    setIsEditorOpen(false);
    setEditingNode(null);
    if (parentNodeId) setExpandedNodeIds(prev => new Set(prev).add(parentNodeId));
  };

  const findNode = (nodes, id) => {
    for (const n of nodes) {
      if (n.id === id) return n;
      if (Array.isArray(n.children)) {
        const found = findNode(n.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const handleToggleStatus = (nodeId) => {
    const updated = updateNodeInTree(flows, nodeId, node => ({
      ...node,
      status: node.status === 'disabled' ? 'published' : 'disabled'
    }));
    handleSaveDraft(updated);
  };

  const handleDuplicateNode = (node) => {
    const duplicated = duplicateNodeHierarchy(node, node.parent_id);
    const updated = addNodeToTree(flows, node.parent_id, duplicated);
    handleSaveDraft(updated);
    showAlert(`Duplicated "${node.title}" and its children hierarchy.`, 'success');
  };

  const handleMoveNode = (nodeId, direction) => {
    const updated = reorderNodeInTree(flows, nodeId, direction);
    handleSaveDraft(updated);
  };

  const confirmDeleteNode = (node) => {
    setDeletingNode(node);
  };

  const executeDeleteNode = () => {
    if (!deletingNode) return;
    const updated = removeNodeFromTree(flows, deletingNode.id);
    handleSaveDraft(updated);
    setDeletingNode(null);
    showAlert('Node deleted.', 'info');
  };

  // Add Action Item in Editor Form
  const handleAddResponseAction = (type = 'url') => {
    if (!editingNode) return;
    const newAction = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: type,
      button_text: type === 'url' ? 'Apply Online' : type === 'whatsapp_msg' ? 'WhatsApp Message' : 'Share on WhatsApp',
      url: type === 'url' ? '/user?tab=apply' : '',
      message: type === 'whatsapp_msg' ? 'Hi Subi E-Sevai, I need details about this service.' : '',
      share_content: type === 'whatsapp_share' ? 'Check out this service on Subi E-Sevai!' : ''
    };
    setEditingNode(prev => ({
      ...prev,
      response: {
        ...prev.response,
        actions: [...(prev.response?.actions || []), newAction]
      }
    }));
  };

  const handleRemoveResponseAction = (actionId) => {
    setEditingNode(prev => ({
      ...prev,
      response: {
        ...prev.response,
        actions: (prev.response?.actions || []).filter(a => a.id !== actionId)
      }
    }));
  };

  const handleUpdateResponseAction = (actionId, key, val) => {
    setEditingNode(prev => ({
      ...prev,
      response: {
        ...prev.response,
        actions: (prev.response?.actions || []).map(a => a.id === actionId ? { ...a, [key]: val } : a)
      }
    }));
  };

  // --- RECURSIVE TREE ITEM COMPONENT ---
  const renderTreeNode = (node, depth = 0) => {
    const isExpanded = expandedNodeIds.has(node.id);
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;
    const isDisabled = node.status === 'disabled';

    return (
      <div key={node.id} style={{ marginLeft: depth > 0 ? '20px' : '0', marginBottom: '8px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px',
          borderRadius: '10px',
          background: isDisabled ? '#f8fafc' : depth === 0 ? '#ffffff' : '#f1f5f9',
          border: `1.5px solid ${isDisabled ? '#cbd5e1' : depth === 0 ? '#10b981' : '#e2e8f0'}`,
          boxShadow: depth === 0 ? '0 2px 4px rgba(0,0,0,0.03)' : 'none',
          opacity: isDisabled ? 0.65 : 1,
          transition: 'all 0.15s'
        }}>
          {/* Expand/Collapse Chevron */}
          <button
            type="button"
            onClick={() => toggleExpandNode(node.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              visibility: hasChildren ? 'visible' : 'hidden'
            }}
          >
            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>

          {/* Node Icon */}
          <div style={{
            color: depth === 0 ? '#10b981' : node.response ? '#8b5cf6' : '#3b82f6',
            display: 'flex',
            alignItems: 'center'
          }}>
            {depth === 0 ? <FolderPlus size={18} /> : node.response ? <FileText size={16} /> : <CornerDownRight size={16} />}
          </div>

          {/* Title & Details */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: '800', color: '#1e293b' }}>
                {node.title}
              </span>
              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1', fontWeight: '600' }}>
                {node.button_text}
              </span>
              {node.response && (
                <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: '#f3e8ff', color: '#7e22ce', fontWeight: '700' }}>
                  ✓ Final Response ({node.response.actions?.length || 0} Actions)
                </span>
              )}
              {isDisabled && (
                <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: '#fef2f2', color: '#ef4444', fontWeight: '700' }}>
                  Disabled
                </span>
              )}
            </div>
            {node.description && (
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {node.description}
              </p>
            )}
          </div>

          {/* Node Action Buttons */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <button
              onClick={() => handleOpenAddNode(node.id)}
              className="premium-btn premium-btn-secondary"
              style={{ padding: '4px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Add Child Option under this node"
            >
              <Plus size={14} /> Child
            </button>
            <button
              onClick={() => handleOpenEditNode(node)}
              className="premium-btn premium-btn-secondary"
              style={{ width: '28px', height: '28px', padding: 0 }}
              title="Edit Node"
            >
              <Edit size={14} />
            </button>
            <button
              onClick={() => handleDuplicateNode(node)}
              className="premium-btn premium-btn-secondary"
              style={{ width: '28px', height: '28px', padding: 0 }}
              title="Duplicate Node Flow"
            >
              <Copy size={14} />
            </button>
            <button
              onClick={() => handleMoveNode(node.id, 'up')}
              className="premium-btn premium-btn-secondary"
              style={{ width: '28px', height: '28px', padding: 0 }}
              title="Move Up"
            >
              <ArrowUp size={14} />
            </button>
            <button
              onClick={() => handleMoveNode(node.id, 'down')}
              className="premium-btn premium-btn-secondary"
              style={{ width: '28px', height: '28px', padding: 0 }}
              title="Move Down"
            >
              <ArrowDown size={14} />
            </button>
            <button
              onClick={() => handleToggleStatus(node.id)}
              style={{
                width: '28px',
                height: '28px',
                padding: 0,
                border: 'none',
                borderRadius: '6px',
                background: isDisabled ? '#dcfce7' : '#fee2e2',
                color: isDisabled ? '#15803d' : '#b91c1c',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={isDisabled ? 'Enable Option' : 'Disable Option'}
            >
              {isDisabled ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => confirmDeleteNode(node)}
              className="premium-btn premium-btn-danger"
              style={{ width: '28px', height: '28px', padding: 0 }}
              title="Delete Node"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Render Children Recursively */}
        {hasChildren && isExpanded && (
          <div style={{ borderLeft: '2px dashed #cbd5e1', marginLeft: '12px', paddingLeft: '8px', marginTop: '6px' }}>
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Alert Banner */}
      {alertMsg.text && (
        <div style={{
          padding: '10px 16px',
          borderRadius: '8px',
          fontSize: '0.85rem',
          fontWeight: '700',
          backgroundColor: alertMsg.type === 'error' ? '#fef2f2' : alertMsg.type === 'success' ? '#f0fdf4' : '#eff6ff',
          color: alertMsg.type === 'error' ? '#991b1b' : alertMsg.type === 'success' ? '#166534' : '#1e40af',
          borderLeft: `5px solid ${alertMsg.type === 'error' ? '#ef4444' : alertMsg.type === 'success' ? '#10b981' : '#3b82f6'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>{alertMsg.text}</span>
          <button onClick={() => setAlertMsg({ text: '', type: '' })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Header Toolbar */}
      <div className="premium-card" style={{ borderTop: '6px solid #10b981', padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '900', color: '#1e293b', margin: 0 }}>
                Chatbot Flow Manager
              </h2>
              {hasUnpublishedChanges ? (
                <span className="badge badge-warning" style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                  ● Draft Unsaved to Production
                </span>
              ) : (
                <span className="badge badge-success" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                  ✓ Live & Synced
                </span>
              )}
            </div>
            <p className="text-muted" style={{ fontSize: '0.78rem', margin: '4px 0 0 0' }}>
              Visually create, nest, reorder, edit and test dynamic chatbot request → response flows for all users.
            </p>
          </div>

          {/* Action Toolbar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button
              onClick={() => handleOpenAddNode(null)}
              className="premium-btn premium-btn-primary"
              style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} /> Create Request
            </button>

            <button
              onClick={() => setIsPreviewOpen(true)}
              className="premium-btn"
              style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', background: '#8b5cf6', color: 'white', border: 'none' }}
            >
              <Eye size={16} /> Preview Flow
            </button>

            <button
              onClick={handlePublish}
              className="premium-btn"
              style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', background: '#10b981', color: 'white', border: 'none' }}
            >
              <CheckCircle size={16} /> Publish Flow
            </button>

            <button
              onClick={() => handleSaveDraft()}
              className="premium-btn premium-btn-secondary"
              style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Save size={14} /> Save Draft
            </button>

            <button
              onClick={handleExport}
              className="premium-btn premium-btn-secondary"
              style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Export configuration as downloadable chatbot-config.json"
            >
              <Download size={14} /> Export JSON
            </button>

            <label className="premium-btn premium-btn-secondary" style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', margin: 0 }}>
              <Upload size={14} /> Import JSON
              <input type="file" accept=".json" onChange={handleImportFile} style={{ display: 'none' }} />
            </label>

            <button
              onClick={handleResetDraft}
              className="premium-btn premium-btn-secondary"
              style={{ padding: '8px 10px', fontSize: '0.78rem', color: '#64748b' }}
              title="Discard draft & reload published version"
            >
              <RefreshCw size={14} /> Reset
            </button>

            <button
              onClick={handleResetToSeed}
              className="premium-btn premium-btn-secondary"
              style={{ padding: '8px 10px', fontSize: '0.78rem', color: '#0284c7' }}
              title="Reset all flows to default 9-category dataset"
            >
              <RefreshCw size={14} /> Seed Dataset
            </button>
          </div>
        </div>
      </div>

      {/* Tree Monitor Operations & Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>
          Total Top-Level Requests: {flows.length}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={expandAll} className="premium-btn premium-btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
            Expand All
          </button>
          <button onClick={collapseAll} className="premium-btn premium-btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
            Collapse All
          </button>
        </div>
      </div>

      {/* Tree Structure List */}
      <div className="premium-card" style={{ padding: '16px' }}>
        {flows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
            <FolderPlus size={48} style={{ margin: '0 auto 12px auto', display: 'block', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1rem', color: '#475569', margin: '0 0 4px 0' }}>No Requests Configured Yet</h3>
            <p style={{ fontSize: '0.8rem', margin: '0 0 16px 0' }}>Click "Create Request" above to add your first chatbot request flow.</p>
            <button onClick={() => handleOpenAddNode(null)} className="premium-btn premium-btn-primary">
              + Create Request
            </button>
          </div>
        ) : (
          flows.map(node => renderTreeNode(node, 0))
        )}
      </div>

      {/* --- NODE EDITOR MODAL --- */}
      {isEditorOpen && editingNode && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: '16px'
        }}>
          <div className="premium-card" style={{
            width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto',
            background: 'white', borderRadius: '16px', padding: '24px', position: 'relative'
          }}>
            <button
              onClick={() => setIsEditorOpen(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b', margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              {parentNodeId ? 'Add Child Option' : 'Configure Request / Option'}
            </h3>

            <form onSubmit={handleSaveNodeForm} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Title */}
              <div className="premium-input-group">
                <label className="premium-label">Option Title / Name *</label>
                <input
                  type="text"
                  value={editingNode.title}
                  onChange={(e) => setEditingNode({ ...editingNode, title: e.target.value })}
                  placeholder="e.g. Income Certificate or Urban Area"
                  className="premium-input"
                  required
                />
              </div>

              {/* Button Text */}
              <div className="premium-input-group">
                <label className="premium-label">Chatbot Button Text *</label>
                <input
                  type="text"
                  value={editingNode.button_text}
                  onChange={(e) => setEditingNode({ ...editingNode, button_text: e.target.value })}
                  placeholder="e.g. [A] or [Income Certificate]"
                  className="premium-input"
                  required
                />
              </div>

              {/* Description */}
              <div className="premium-input-group">
                <label className="premium-label">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={editingNode.description}
                  onChange={(e) => setEditingNode({ ...editingNode, description: e.target.value })}
                  placeholder="Subtext explanation shown under the option..."
                  className="premium-input"
                />
              </div>

              {/* Status Toggle */}
              <div className="premium-input-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="node-status-check"
                  checked={editingNode.status !== 'disabled'}
                  onChange={(e) => setEditingNode({ ...editingNode, status: e.target.checked ? 'published' : 'disabled' })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10b981' }}
                />
                <label htmlFor="node-status-check" className="premium-label" style={{ margin: 0, cursor: 'pointer', fontWeight: 'bold' }}>
                  Enable Option in Chatbot
                </label>
              </div>

              {/* Toggle Final Response Configurator */}
              <div style={{ borderTop: '1.5px dashed #cbd5e1', paddingTop: '14px', marginTop: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <input
                    type="checkbox"
                    id="has-response-check"
                    checked={editingNode.hasResponse}
                    onChange={(e) => setEditingNode({ ...editingNode, hasResponse: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#8b5cf6' }}
                  />
                  <label htmlFor="has-response-check" className="premium-label" style={{ margin: 0, cursor: 'pointer', fontWeight: '800', color: '#7e22ce' }}>
                    Configure Final Response for this Node
                  </label>
                </div>

                {editingNode.hasResponse && (
                  <div style={{ background: '#f9fafb', border: '1.5px solid #e9d5ff', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    
                    {/* Response Title */}
                    <div className="premium-input-group">
                      <label className="premium-label" style={{ color: '#6b21a8' }}>Response Headline / Title *</label>
                      <input
                        type="text"
                        value={editingNode.response.title}
                        onChange={(e) => setEditingNode({
                          ...editingNode,
                          response: { ...editingNode.response, title: e.target.value }
                        })}
                        placeholder="e.g. Income Certificate Details"
                        className="premium-input"
                        required
                      />
                    </div>

                    {/* Response Description */}
                    <div className="premium-input-group">
                      <label className="premium-label" style={{ color: '#6b21a8' }}>Response Content / Description *</label>
                      <textarea
                        rows={4}
                        value={editingNode.response.description}
                        onChange={(e) => setEditingNode({
                          ...editingNode,
                          response: { ...editingNode.response, description: e.target.value }
                        })}
                        placeholder="Enter guidelines, Tamil/English details, required documents..."
                        className="premium-input"
                        required
                      />
                    </div>

                    {/* Response Multiple Action Buttons */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#6b21a8' }}>
                          Response Action Buttons ({editingNode.response.actions?.length || 0})
                        </span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => handleAddResponseAction('url')}
                            className="premium-btn premium-btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                          >
                            + URL Button
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddResponseAction('whatsapp_msg')}
                            className="premium-btn premium-btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                          >
                            + WhatsApp Msg
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddResponseAction('whatsapp_share')}
                            className="premium-btn premium-btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                          >
                            + WhatsApp Share
                          </button>
                        </div>
                      </div>

                      {/* Action items list */}
                      {(editingNode.response.actions || []).map((action, aIdx) => (
                        <div key={action.id} style={{ background: 'white', border: '1px solid #d8b4fe', borderRadius: '10px', padding: '10px', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#7e22ce' }}>
                              Action #{aIdx + 1}: {action.type.toUpperCase()}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveResponseAction(action.id)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="text"
                              value={action.button_text}
                              onChange={(e) => handleUpdateResponseAction(action.id, 'button_text', e.target.value)}
                              placeholder="Button Text"
                              className="premium-input"
                              style={{ flex: 1, padding: '6px 10px', fontSize: '0.8rem' }}
                              required
                            />
                            <select
                              value={action.type}
                              onChange={(e) => handleUpdateResponseAction(action.id, 'type', e.target.value)}
                              className="premium-input"
                              style={{ width: '140px', padding: '6px 10px', fontSize: '0.8rem' }}
                            >
                              <option value="url">URL Link</option>
                              <option value="whatsapp_msg">WhatsApp Msg</option>
                              <option value="whatsapp_share">WhatsApp Share</option>
                            </select>
                          </div>

                          {action.type === 'url' && (
                            <input
                              type="text"
                              value={action.url}
                              onChange={(e) => handleUpdateResponseAction(action.id, 'url', e.target.value)}
                              placeholder="Target URL e.g. https://... or /user?tab=apply"
                              className="premium-input"
                              style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                              required
                            />
                          )}

                          {action.type === 'whatsapp_msg' && (
                            <input
                              type="text"
                              value={action.message}
                              onChange={(e) => handleUpdateResponseAction(action.id, 'message', e.target.value)}
                              placeholder="Prefilled message for WhatsApp chat..."
                              className="premium-input"
                              style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                              required
                            />
                          )}

                          {action.type === 'whatsapp_share' && (
                            <input
                              type="text"
                              value={action.share_content}
                              onChange={(e) => handleUpdateResponseAction(action.id, 'share_content', e.target.value)}
                              placeholder="Content/message to share on WhatsApp..."
                              className="premium-input"
                              style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                              required
                            />
                          )}
                        </div>
                      ))}
                    </div>

                  </div>
                )}
              </div>

              {/* Submit / Cancel Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button type="submit" className="premium-btn premium-btn-primary" style={{ flex: 2 }}>
                  Save Node & Options
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="premium-btn premium-btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION WARNING MODAL --- */}
      {deletingNode && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: '16px'
        }}>
          <div className="premium-card" style={{ maxWidth: '420px', width: '100%', padding: '24px', background: 'white', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#ef4444', marginBottom: '12px' }}>
              <AlertTriangle size={28} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0, color: '#1e293b' }}>
                Delete Confirmation Warning
              </h3>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: '1.5' }}>
              Are you sure you want to delete <strong>"{deletingNode.title}"</strong>?
              {Array.isArray(deletingNode.children) && deletingNode.children.length > 0 && (
                <span style={{ color: '#b91c1c', fontWeight: 'bold', display: 'block', marginTop: '8px' }}>
                  ⚠️ Warning: This node contains {deletingNode.children.length} nested child option(s) which will also be permanently deleted!
                </span>
              )}
            </p>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={executeDeleteNode} className="premium-btn premium-btn-danger" style={{ flex: 1 }}>
                Yes, Delete
              </button>
              <button onClick={() => setDeletingNode(null)} className="premium-btn premium-btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- INTERACTIVE ADMIN PREVIEW MODAL --- */}
      {isPreviewOpen && (
        <AdminChatbotPreviewModal flows={flows} onClose={() => setIsPreviewOpen(false)} />
      )}

    </div>
  );
}

/**
 * Interactive Admin Chatbot Preview Component
 * Emulates full user flow testing inside admin panel
 */
function AdminChatbotPreviewModal({ flows, onClose }) {
  // Navigation stack array of node IDs: [] = root level
  const [navStack, setNavStack] = useState([]);

  // Active current nodes list
  const currentNodes = useMemo(() => {
    if (navStack.length === 0) {
      return flows.filter(f => f.status !== 'disabled');
    }
    
    let current = flows;
    let found = null;

    for (const id of navStack) {
      found = current.find(n => n.id === id);
      if (found && Array.isArray(found.children)) {
        current = found.children;
      }
    }

    if (found && found.response) {
      return { isFinalResponse: true, node: found };
    }

    return current.filter(n => n.status !== 'disabled');
  }, [flows, navStack]);

  const handleSelectOption = (node) => {
    setNavStack(prev => [...prev, node.id]);
  };

  const handleBack = () => {
    setNavStack(prev => prev.slice(0, -1));
  };

  const handleResetMainMenu = () => {
    setNavStack([]);
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: '16px'
    }}>
      <div className="premium-card" style={{
        maxWidth: '440px', width: '100%', background: '#f8fafc', borderRadius: '20px',
        padding: 0, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Preview Header */}
        <div style={{ background: '#0f172a', color: 'white', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></span>
            <span style={{ fontSize: '0.9rem', fontWeight: '800' }}>Admin Live Chatbot Preview</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Chat Body */}
        <div style={{ padding: '18px', minHeight: '380px', maxHeight: '520px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Bot Bubble Header */}
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px 14px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.82rem', color: '#1e293b', fontWeight: '700', marginBottom: '6px' }}>
              👋 How can we help you today?
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Click any configured request / option below to test the dynamic navigation flow.
            </div>
          </div>

          {/* Render Options or Final Response */}
          {currentNodes.isFinalResponse ? (
            <div style={{ background: '#ffffff', border: '2px solid #8b5cf6', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#7e22ce', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Final Response Content
              </span>
              
              <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                {currentNodes.node.response.title}
              </h4>

              <p style={{ fontSize: '0.82rem', color: '#475569', margin: 0, whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                {currentNodes.node.response.description}
              </p>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                {(currentNodes.node.response.actions || []).map(action => (
                  <button
                    key={action.id}
                    onClick={() => {
                      if (action.type === 'url') alert(`Simulating URL Click: Opens ${action.url}`);
                      else if (action.type === 'whatsapp_msg') alert(`Simulating WhatsApp Msg Click: Prefills "${action.message}"`);
                      else if (action.type === 'whatsapp_share') alert(`Simulating WhatsApp Share Click: Shares "${action.share_content}"`);
                    }}
                    className="premium-btn premium-btn-primary"
                    style={{
                      width: '100%', padding: '10px', fontSize: '0.82rem', fontWeight: '700',
                      background: action.type === 'url' ? '#10b981' : '#25d366', color: 'white', border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    {action.type === 'url' ? <ExternalLink size={14} /> : action.type === 'whatsapp_msg' ? <MessageSquare size={14} /> : <Share2 size={14} />}
                    {action.button_text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Array.isArray(currentNodes) && currentNodes.length > 0 ? (
                currentNodes.map(node => (
                  <button
                    key={node.id}
                    onClick={() => handleSelectOption(node)}
                    className="premium-btn premium-btn-secondary"
                    style={{
                      width: '100%', textAlign: 'left', padding: '12px 14px', fontSize: '0.85rem',
                      borderRadius: '12px', background: 'white', border: '1.5px solid #cbd5e1', color: '#1e293b',
                      fontWeight: '700', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}
                  >
                    <span>{node.button_text}</span>
                    <ChevronRight size={16} style={{ color: '#94a3b8' }} />
                  </button>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.8rem' }}>
                  No active options configured under this node.
                </div>
              )}
            </div>
          )}

          {/* Navigation Controls: Back & Main Menu */}
          {navStack.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
              <button
                onClick={handleBack}
                className="premium-btn premium-btn-secondary"
                style={{ flex: 1, padding: '8px', fontSize: '0.78rem', fontWeight: '700' }}
              >
                ← Back
              </button>
              <button
                onClick={handleResetMainMenu}
                className="premium-btn premium-btn-secondary"
                style={{ flex: 1, padding: '8px', fontSize: '0.78rem', fontWeight: '700' }}
              >
                🏠 Main Menu
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
