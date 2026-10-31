import React, { useState } from 'react';
import { X, Sparkles, Upload, AlertCircle, Info, Trash2 } from 'lucide-react';

export default function MenuOcrModal({
  isOpen,
  onClose,
  onImportSuccess,
  authFetch,
  addToast
}) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [importing, setImporting] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    if (selected.type.startsWith('image/')) {
      const url = URL.createObjectURL(selected);
      setPreviewUrl(url);
    } else {
      setPreviewUrl('');
    }
  };

  const handleProcessImage = async () => {
    if (!file) {
      addToast('Please select a menu photo or PDF', 'warning');
      return;
    }

    setProcessing(true);
    try {
      const res = await authFetch('/api/menu/ocr-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setExtractedData(data);
      } else {
        addToast(data.message || 'Failed to extract menu data', 'error');
      }
    } catch {
      addToast('Network error while processing menu image', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateItemField = (idx, field, value) => {
    setExtractedData(prev => {
      const list = [...(prev.sampleExtracted || prev.extractedItems || [])];
      list[idx] = { ...list[idx], [field]: value };
      return {
        ...prev,
        sampleExtracted: list
      };
    });
  };

  const handleDeleteItem = (idx) => {
    setExtractedData(prev => {
      const list = (prev.sampleExtracted || prev.extractedItems || []).filter((_, i) => i !== idx);
      return {
        ...prev,
        sampleExtracted: list
      };
    });
  };

  const handleConfirmImport = async () => {
    const items = extractedData.sampleExtracted || extractedData.extractedItems || [];
    if (items.length === 0) {
      addToast('No items available to import', 'warning');
      return;
    }

    setImporting(true);
    try {
      const res = await authFetch('/api/menu/import-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addToast(`Successfully imported ${data.importedCount} items from menu extraction!`, 'success');
        if (onImportSuccess) onImportSuccess(data);
        onClose();
      } else {
        addToast(data.error || 'Failed to commit extracted items', 'error');
      }
    } catch {
      addToast('Error saving extracted menu items', 'error');
    } finally {
      setImporting(false);
    }
  };

  const itemsToReview = extractedData?.sampleExtracted || extractedData?.extractedItems || [];

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="dash-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 840, width: '94vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="dash-modal-header" style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={20} style={{ color: '#9333ea' }} />
              Menu Photo / PDF Extraction
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '3px 0 0' }}>
              Upload your paper menu photo or PDF scan. Review and correct extracted items before publishing.
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {!extractedData ? (
            <div>
              {/* Upload Drop Area */}
              <div
                style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: 14,
                  padding: '40px 20px',
                  textAlign: 'center',
                  background: '#faf5ff',
                  cursor: 'pointer',
                  marginBottom: 20
                }}
                onClick={() => document.getElementById('ocr-file-input')?.click()}
              >
                <Upload size={36} style={{ color: '#9333ea', marginBottom: 12 }} />
                <p style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  {file ? `Selected file: ${file.name}` : 'Click to select or drop a menu photo (JPG, PNG) or PDF'}
                </p>
                <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4 }}>
                  Ensure food item names and prices are clearly lit and legible
                </p>
                <input
                  id="ocr-file-input"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>

              {previewUrl && (
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <img
                    src={previewUrl}
                    alt="Menu preview"
                    style={{ maxHeight: 220, borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  />
                </div>
              )}

              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '14px 16px',
                fontSize: '0.84rem',
                color: '#64748b',
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start'
              }}>
                <Info size={18} style={{ color: '#0284c7', flexShrink: 0, marginTop: 2 }} />
                <span>
                  <strong>Safe Review Policy:</strong> Extracted dishes are never automatically published.
                  You will review every item name, category, and price in an editable table before anything is saved to your live menu.
                </span>
              </div>
            </div>
          ) : (
            <div>
              {/* Configuration Status Notice */}
              {!extractedData.configured && (
                <div style={{
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: 12,
                  padding: '12px 16px',
                  marginBottom: 16,
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start'
                }}>
                  <AlertCircle size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: '0.82rem', color: '#92400e' }}>
                    <strong>OCR Key Notice:</strong> {extractedData.message}
                    <br />
                    Below is a sample extracted review table ready for your confirmation or editing.
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
                  Extracted Items Review ({itemsToReview.length})
                </span>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Click any cell to edit before importing
                </span>
              </div>

              {/* Review Table */}
              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                <table className="admin-clean-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <th>Item Name</th>
                      <th>Category</th>
                      <th style={{ width: 100 }}>Price (₹)</th>
                      <th style={{ width: 90 }}>Type</th>
                      <th style={{ width: 90 }}>Confidence</th>
                      <th style={{ width: 45 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsToReview.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontSize: '0.78rem', color: '#64748b' }}>{idx + 1}</td>
                        <td>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateItemField(idx, 'name', e.target.value)}
                            className="dash-form-input"
                            style={{ height: 32, fontSize: '0.82rem' }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={item.category}
                            onChange={(e) => handleUpdateItemField(idx, 'category', e.target.value)}
                            className="dash-form-input"
                            style={{ height: 32, fontSize: '0.82rem' }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => handleUpdateItemField(idx, 'price', e.target.value)}
                            className="dash-form-input"
                            style={{ height: 32, fontSize: '0.82rem' }}
                          />
                        </td>
                        <td>
                          <select
                            value={item.isVeg ? 'veg' : 'non-veg'}
                            onChange={(e) => handleUpdateItemField(idx, 'isVeg', e.target.value === 'veg')}
                            className="dash-form-select"
                            style={{ height: 32, fontSize: '0.8rem', padding: '0 6px' }}
                          >
                            <option value="veg">Veg</option>
                            <option value="non-veg">Non-Veg</option>
                          </select>
                        </td>
                        <td>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 12,
                            background: item.confidence === 'high' ? '#ecfdf5' : '#fffbeb',
                            color: item.confidence === 'high' ? '#059669' : '#d97706'
                          }}>
                            {item.confidence || 'high'}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(idx)}
                            className="btn-row-dots"
                            title="Remove Item"
                          >
                            <Trash2 size={13} style={{ color: '#ef4444' }} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button type="button" onClick={onClose} className="btn-brand-outline">
            Cancel
          </button>

          {!extractedData ? (
            <button
              type="button"
              disabled={processing || !file}
              onClick={handleProcessImage}
              className="btn-brand-primary"
              style={{ padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Sparkles size={16} />
              {processing ? 'Analyzing Image...' : 'Extract Menu Items →'}
            </button>
          ) : (
            <button
              type="button"
              disabled={importing || itemsToReview.length === 0}
              onClick={handleConfirmImport}
              className="btn-brand-primary"
              style={{ padding: '8px 24px' }}
            >
              {importing ? 'Importing...' : `Confirm & Import ${itemsToReview.length} Extracted Items`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
