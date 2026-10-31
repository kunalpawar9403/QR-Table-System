import React, { useState } from 'react';
import { X, Plus, Trash2, Edit2, Tag, Check, ArrowUp, ArrowDown } from 'lucide-react';

const SUGGESTED_PRESETS = [
  'Starters',
  'Soups',
  'Salads',
  'Main Course',
  'Indian Main Course',
  'Chinese',
  'South Indian',
  'North Indian',
  'Biryani and Rice',
  'Breads',
  'Beverages',
  'Desserts',
  'Snacks',
  'Combos',
  'Special Offers'
];

export default function CategoryManagementModal({
  isOpen,
  onClose,
  categories = [],
  menu = [],
  onSaveCategory,
  onDeleteCategory,
  onReorderCategories,
  addToast
}) {
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [editingCatId, setEditingCatId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const existingNamesLower = new Set(categories.map(c => c.name.toLowerCase()));

  const handleAddCustom = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    if (existingNamesLower.has(newCatName.trim().toLowerCase())) {
      addToast('Category already exists', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await onSaveCategory({
        name: newCatName.trim(),
        description: newCatDesc.trim(),
        displayOrder: categories.length
      });
      setNewCatName('');
      setNewCatDesc('');
      addToast('Category created', 'success');
    } catch {
      addToast('Failed to create category', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPreset = async (preset) => {
    if (existingNamesLower.has(preset.toLowerCase())) {
      addToast(`"${preset}" is already in your categories`, 'info');
      return;
    }
    try {
      await onSaveCategory({
        name: preset,
        description: '',
        displayOrder: categories.length
      });
      addToast(`Added "${preset}" category`, 'success');
    } catch {
      addToast('Failed to add category', 'error');
    }
  };

  const handleStartEdit = (cat) => {
    setEditingCatId(cat.id);
    setEditName(cat.name);
    setEditDesc(cat.description || '');
  };

  const handleSaveEdit = async (catId) => {
    if (!editName.trim()) return;
    try {
      await onSaveCategory({
        id: catId,
        name: editName.trim(),
        description: editDesc.trim()
      });
      setEditingCatId(null);
      addToast('Category updated', 'success');
    } catch {
      addToast('Failed to update category', 'error');
    }
  };

  const handleDelete = async (cat) => {
    const itemsCount = menu.filter(m => m.category?.toLowerCase() === cat.name.toLowerCase()).length;
    if (itemsCount > 0) {
      const confirmDelete = window.confirm(
        `Category "${cat.name}" contains ${itemsCount} menu item(s). Are you sure you want to delete this category and all its items?`
      );
      if (!confirmDelete) return;
      try {
        await onDeleteCategory(cat.id, 'delete_items');
        addToast(`Category "${cat.name}" and ${itemsCount} item(s) deleted`, 'info');
      } catch {
        addToast('Failed to delete category', 'error');
      }
    } else {
      if (window.confirm(`Delete category "${cat.name}"?`)) {
        try {
          await onDeleteCategory(cat.id, 'prevent');
          addToast(`Category "${cat.name}" deleted`, 'info');
        } catch {
          addToast('Failed to delete category', 'error');
        }
      }
    }
  };

  const handleMove = async (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= categories.length) return;
    const reordered = [...categories];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);
    try {
      await onReorderCategories(reordered.map(c => c.id));
    } catch {
      addToast('Failed to reorder categories', 'error');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="dash-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 640, width: '92vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="dash-modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Manage Menu Categories
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0' }}>
              Organize food categories, add suggested presets, and order your menu tabs.
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>
          {/* Quick Preset Suggested Categories Section */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 8 }}>
              Suggested Categories (Click to Add)
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SUGGESTED_PRESETS.map((preset) => {
                const isAdded = existingNamesLower.has(preset.toLowerCase());
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleAddPreset(preset)}
                    disabled={isAdded}
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      padding: '6px 12px',
                      borderRadius: 20,
                      border: isAdded ? '1px solid #cbd5e1' : '1px solid #10b981',
                      background: isAdded ? '#f1f5f9' : '#ecfdf5',
                      color: isAdded ? '#94a3b8' : '#059669',
                      cursor: isAdded ? 'default' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {isAdded ? <Check size={13} /> : <Plus size={13} />}
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Add Custom Category Form */}
          <form onSubmit={handleAddCustom} style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 16,
            marginBottom: 24
          }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 10 }}>
              Create Custom Category
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Category Name (e.g. Clay Oven Tandoor)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="dash-form-input"
                style={{ height: 40 }}
                required
              />
              <button
                type="submit"
                disabled={submitting || !newCatName.trim()}
                className="btn-brand-primary"
                style={{ height: 40, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={16} /> Add Category
              </button>
            </div>
            <input
              type="text"
              placeholder="Short Description (optional)"
              value={newCatDesc}
              onChange={(e) => setNewCatDesc(e.target.value)}
              className="dash-form-input"
              style={{ marginTop: 8, height: 36, fontSize: '0.82rem' }}
            />
          </form>

          {/* Existing Categories List */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
                Your Categories ({categories.length})
              </span>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Use arrows to adjust customer display order
              </span>
            </div>

            {categories.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 16px', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0 }}>
                  No categories created yet. Click any suggested category above or create your own.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {categories.map((cat, idx) => {
                  const itemCount = menu.filter(m => m.category?.toLowerCase() === cat.name.toLowerCase()).length;
                  const isEditing = editingCatId === cat.id;

                  return (
                    <div
                      key={cat.id || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 10,
                        gap: 12
                      }}
                    >
                      {/* Name & count / Edit form */}
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="dash-form-input"
                            style={{ height: 34, fontSize: '0.85rem' }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(cat.id)}
                            className="btn-brand-primary"
                            style={{ padding: '0 12px', height: 34, fontSize: '0.8rem' }}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCatId(null)}
                            className="btn-brand-outline"
                            style={{ padding: '0 10px', height: 34, fontSize: '0.8rem' }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                          <Tag size={16} style={{ color: '#10b981' }} />
                          <div>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                              {cat.name}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: 8 }}>
                              ({itemCount} item{itemCount !== 1 ? 's' : ''})
                            </span>
                            {cat.description && (
                              <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '2px 0 0' }}>
                                {cat.description}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      {!isEditing && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMove(idx, -1)}
                            className="btn-row-dots"
                            style={{ opacity: idx === 0 ? 0.3 : 1 }}
                            title="Move Up"
                          >
                            <ArrowUp size={15} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === categories.length - 1}
                            onClick={() => handleMove(idx, 1)}
                            className="btn-row-dots"
                            style={{ opacity: idx === categories.length - 1 ? 0.3 : 1 }}
                            title="Move Down"
                          >
                            <ArrowDown size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(cat)}
                            className="btn-row-dots"
                            title="Edit Category"
                          >
                            <Edit2 size={15} style={{ color: '#0284c7' }} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(cat)}
                            className="btn-row-dots"
                            title="Delete Category"
                          >
                            <Trash2 size={15} style={{ color: '#ef4444' }} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} className="btn-brand-primary" style={{ padding: '8px 24px' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
