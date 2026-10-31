import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';

export default function MenuItemModal({
  isOpen,
  onClose,
  dish = null,
  categories = [],
  onSaveDish,
  addToast
}) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    description: '',
    image: '',
    isVeg: true,
    foodType: 'veg',
    status: 'published',
    isSpecial: false,
    featured: false,
    prepTime: '10-15 mins',
    variants: [],
    addons: []
  });

  const [newVariantName, setNewVariantName] = useState('');
  const [newVariantPrice, setNewVariantPrice] = useState('');
  const [newAddonName, setNewAddonName] = useState('');
  const [newAddonPrice, setNewAddonPrice] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (dish) {
      setFormData({
        name: dish.name || '',
        category: dish.category || (categories[0]?.name || 'Main Course'),
        price: dish.price !== undefined ? dish.price : '',
        description: dish.description || '',
        image: dish.image || '',
        isVeg: dish.isVeg !== undefined ? dish.isVeg : true,
        foodType: dish.foodType || (dish.isVeg === false ? 'non-veg' : 'veg'),
        status: dish.status || 'published',
        isSpecial: Boolean(dish.isSpecial),
        featured: Boolean(dish.featured),
        prepTime: dish.prepTime || '10-15 mins',
        variants: Array.isArray(dish.variants) ? [...dish.variants] : [],
        addons: Array.isArray(dish.addons) ? [...dish.addons] : []
      });
      setShowCustomCategory(false);
    } else {
      setFormData({
        name: '',
        category: categories[0]?.name || 'Main Course',
        price: '',
        description: '',
        image: '',
        isVeg: true,
        foodType: 'veg',
        status: 'published',
        isSpecial: false,
        featured: false,
        prepTime: '10-15 mins',
        variants: [],
        addons: []
      });
      setShowCustomCategory(false);
    }
  }, [dish, categories, isOpen]);

  if (!isOpen) return null;

  const handleAddVariant = () => {
    if (!newVariantName.trim() || !newVariantPrice) return;
    const priceNum = parseFloat(newVariantPrice);
    if (isNaN(priceNum) || priceNum < 0) return;

    setFormData(prev => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          id: `var_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name: newVariantName.trim(),
          price: priceNum
        }
      ]
    }));
    setNewVariantName('');
    setNewVariantPrice('');
  };

  const handleRemoveVariant = (idx) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== idx)
    }));
  };

  const handleAddAddon = () => {
    if (!newAddonName.trim() || !newAddonPrice) return;
    const priceNum = parseFloat(newAddonPrice);
    if (isNaN(priceNum) || priceNum < 0) return;

    setFormData(prev => ({
      ...prev,
      addons: [
        ...prev.addons,
        {
          id: `addon_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name: newAddonName.trim(),
          price: priceNum
        }
      ]
    }));
    setNewAddonName('');
    setNewAddonPrice('');
  };

  const handleRemoveAddon = (idx) => {
    setFormData(prev => ({
      ...prev,
      addons: prev.addons.filter((_, i) => i !== idx)
    }));
  };

  const handleSubmit = async (e, saveAndAddAnother = false, forceDraft = false) => {
    if (e) e.preventDefault();
    if (!formData.name.trim()) {
      addToast('Please enter an item name', 'warning');
      return;
    }
    const basePrice = parseFloat(formData.price);
    if (isNaN(basePrice) || basePrice < 0) {
      addToast('Please enter a valid price', 'warning');
      return;
    }

    const finalCategory = showCustomCategory && customCategoryInput.trim()
      ? customCategoryInput.trim()
      : (formData.category || 'Main Course');

    const payload = {
      ...formData,
      category: finalCategory,
      price: basePrice,
      isVeg: formData.foodType === 'veg' || formData.foodType === 'vegan',
      status: forceDraft ? 'draft' : formData.status
    };

    setSubmitting(true);
    try {
      await onSaveDish(payload, dish?.id);
      if (saveAndAddAnother) {
        setFormData({
          name: '',
          category: finalCategory,
          price: '',
          description: '',
          image: '',
          isVeg: true,
          foodType: 'veg',
          status: 'published',
          isSpecial: false,
          featured: false,
          prepTime: '10-15 mins',
          variants: [],
          addons: []
        });
        addToast(`Item saved! You can add another item now.`, 'success');
      } else {
        onClose();
        addToast(dish ? 'Dish updated successfully' : 'Dish added to menu', 'success');
      }
    } catch {
      addToast('Error saving menu item', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1150 }}>
      <div
        className="dash-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 660, width: '92vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="dash-modal-header" style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {dish ? 'Edit Menu Item' : 'Add New Menu Item'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '3px 0 0' }}>
              Fill in item details, set variants, pricing, and dietary preferences.
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={(e) => handleSubmit(e, false, false)} style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>
          {/* Item Name */}
          <div className="dash-form-group" style={{ marginBottom: 14 }}>
            <label className="dash-form-label">
              Item Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Paneer Butter Masala"
              className="dash-form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {/* Category & Base Price Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12, marginBottom: 14 }}>
            <div className="dash-form-group" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="dash-form-label">Category *</label>
                <button
                  type="button"
                  onClick={() => setShowCustomCategory(!showCustomCategory)}
                  style={{ background: 'none', border: 'none', color: '#10b981', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {showCustomCategory ? 'Pick Existing' : '+ New Category'}
                </button>
              </div>

              {showCustomCategory ? (
                <input
                  type="text"
                  placeholder="New category name..."
                  value={customCategoryInput}
                  onChange={(e) => setCustomCategoryInput(e.target.value)}
                  className="dash-form-input"
                  required
                />
              ) : (
                <select
                  className="dash-form-select"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {categories.map((c) => (
                    <option key={c.id || c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                  {categories.length === 0 && (
                    <option value="Main Course">Main Course</option>
                  )}
                </select>
              )}
            </div>

            <div className="dash-form-group" style={{ margin: 0 }}>
              <label className="dash-form-label">Base Price (₹) *</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                placeholder="250"
                className="dash-form-input"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
          </div>

          {/* Food Type & Publication State */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12, marginBottom: 14 }}>
            <div className="dash-form-group" style={{ margin: 0 }}>
              <label className="dash-form-label">Dietary Type</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { id: 'veg', label: 'Veg', color: '#059669', bg: '#ecfdf5' },
                  { id: 'non-veg', label: 'Non-Veg', color: '#dc2626', bg: '#fef2f2' },
                  { id: 'egg', label: 'Egg', color: '#d97706', bg: '#fffbeb' }
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, foodType: type.id, isVeg: type.id === 'veg' })}
                    style={{
                      flex: 1,
                      padding: '7px 0',
                      borderRadius: 8,
                      border: formData.foodType === type.id ? `2px solid ${type.color}` : '1px solid #e2e8f0',
                      background: formData.foodType === type.id ? type.bg : '#ffffff',
                      color: formData.foodType === type.id ? type.color : '#64748b',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="dash-form-group" style={{ margin: 0 }}>
              <label className="dash-form-label">Publish Status</label>
              <select
                className="dash-form-select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="published">Published (Visible on QR)</option>
                <option value="draft">Draft (Hidden from customers)</option>
                <option value="unavailable">Unavailable / Sold Out</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="dash-form-group" style={{ marginBottom: 14 }}>
            <label className="dash-form-label">Item Description</label>
            <textarea
              className="dash-form-textarea"
              rows={2}
              placeholder="Fresh cottage cheese cooked in creamy tomato butter gravy with aromatic spices..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Image URL & Prep Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12, marginBottom: 14 }}>
            <div className="dash-form-group" style={{ margin: 0 }}>
              <label className="dash-form-label">Image URL</label>
              <input
                type="text"
                placeholder="/images/paneer_butter_masala.jpg"
                className="dash-form-input"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              />
            </div>
            <div className="dash-form-group" style={{ margin: 0 }}>
              <label className="dash-form-label">Preparation Time</label>
              <input
                type="text"
                placeholder="10-15 mins"
                className="dash-form-input"
                value={formData.prepTime}
                onChange={(e) => setFormData({ ...formData, prepTime: e.target.value })}
              />
            </div>
          </div>

          {/* Advanced: Variants Section (Half / Full, S / M / L) */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 14,
            marginBottom: 14
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                Pricing Variants (e.g. Half / Full, S / M / L)
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Optional
              </span>
            </div>

            {formData.variants.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {formData.variants.map((v, i) => (
                  <div key={v.id || i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    fontSize: '0.84rem'
                  }}>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{v.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontWeight: 700, color: '#059669' }}>₹{v.price}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(i)}
                        className="btn-row-dots"
                        style={{ padding: 2 }}
                        title="Remove Variant"
                      >
                        <Trash2 size={13} style={{ color: '#ef4444' }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
              <input
                type="text"
                placeholder="Variant (e.g. Half)"
                value={newVariantName}
                onChange={(e) => setNewVariantName(e.target.value)}
                className="dash-form-input"
                style={{ height: 34, fontSize: '0.82rem' }}
              />
              <input
                type="number"
                placeholder="Price (₹)"
                value={newVariantPrice}
                onChange={(e) => setNewVariantPrice(e.target.value)}
                className="dash-form-input"
                style={{ height: 34, fontSize: '0.82rem' }}
              />
              <button
                type="button"
                onClick={handleAddVariant}
                className="btn-brand-primary"
                style={{ height: 34, padding: '0 12px', fontSize: '0.78rem' }}
              >
                + Add
              </button>
            </div>
          </div>

          {/* Advanced: Add-ons Section */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 14,
            marginBottom: 14
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                Add-ons & Customizations (e.g. Extra Cheese ₹30)
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Optional
              </span>
            </div>

            {formData.addons.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {formData.addons.map((a, i) => (
                  <div key={a.id || i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    fontSize: '0.84rem'
                  }}>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{a.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontWeight: 700, color: '#059669' }}>+₹{a.price}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAddon(i)}
                        className="btn-row-dots"
                        style={{ padding: 2 }}
                        title="Remove Addon"
                      >
                        <Trash2 size={13} style={{ color: '#ef4444' }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
              <input
                type="text"
                placeholder="Addon (e.g. Extra Butter)"
                value={newAddonName}
                onChange={(e) => setNewAddonName(e.target.value)}
                className="dash-form-input"
                style={{ height: 34, fontSize: '0.82rem' }}
              />
              <input
                type="number"
                placeholder="Price (₹)"
                value={newAddonPrice}
                onChange={(e) => setNewAddonPrice(e.target.value)}
                className="dash-form-input"
                style={{ height: 34, fontSize: '0.82rem' }}
              />
              <button
                type="button"
                onClick={handleAddAddon}
                className="btn-brand-primary"
                style={{ height: 34, padding: '0 12px', fontSize: '0.78rem' }}
              >
                + Add
              </button>
            </div>
          </div>
        </form>

        {/* Footer Actions (Section 4.C: Save Item, Save & Add Another, Save as Draft, Cancel) */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10
        }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-brand-outline"
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            Cancel
          </button>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={submitting}
              onClick={(e) => handleSubmit(e, false, true)}
              className="btn-brand-outline"
              style={{ padding: '8px 14px', fontSize: '0.85rem', borderColor: '#cbd5e1' }}
            >
              Save as Draft
            </button>

            {!dish && (
              <button
                type="button"
                disabled={submitting}
                onClick={(e) => handleSubmit(e, true, false)}
                className="btn-brand-outline"
                style={{ padding: '8px 14px', fontSize: '0.85rem', color: '#059669', borderColor: '#10b981' }}
              >
                Save & Add Another
              </button>
            )}

            <button
              type="button"
              disabled={submitting}
              onClick={(e) => handleSubmit(e, false, false)}
              className="btn-brand-primary"
              style={{ padding: '8px 22px', fontSize: '0.85rem' }}
            >
              {submitting ? 'Saving...' : (dish ? 'Save Changes' : 'Save Item')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
