import React, { useState } from 'react';
import { X, Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle, AlertCircle, Trash2 } from 'lucide-react';

const SAMPLE_CSV = `Category,Item Name,Price,Description,Food Type,Availability
Starters,Paneer Tikka,220,Cottage cheese marinated in yogurt and tandoori spices,Veg,Available
Starters,Chicken Tikka,260,Tender boneless chicken roasted in clay oven,Non-Veg,Available
Main Course,Paneer Butter Masala,280,Rich creamy tomato gravy with cottage cheese,Veg,Available
Main Course,Butter Chicken,320,Signature tender chicken in velvety butter gravy,Non-Veg,Available
Biryani and Rice,Chicken Biryani,350,Fragrant basmati rice dum cooked with spices and chicken,Non-Veg,Available
Biryani and Rice,Jeera Rice,160,Basmati rice tempered with cumin seeds,Veg,Available
Breads,Butter Naan,60,Traditional Indian flatbread brushed with fresh butter,Veg,Available
Breads,Garlic Naan,75,Flatbread infused with roasted garlic and coriander,Veg,Available
Beverages,Sweet Lassi,90,Traditional chilled churned yogurt beverage,Veg,Available
Desserts,Gulab Jamun (2 pcs),80,Deep fried milk dumplings soaked in cardamom sugar syrup,Veg,Available`;

export default function MenuCsvImportModal({
  isOpen,
  onClose,
  onImportSuccess,
  authFetch,
  addToast
}) {
  const [step, setStep] = useState('upload'); // 'upload' | 'preview'
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [validating, setValidating] = useState(false);
  const [previewResult, setPreviewResult] = useState(null);
  const [importing, setImporting] = useState(false);

  if (!isOpen) return null;

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'TableMint_Menu_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Downloaded sample template: TableMint_Menu_Template.csv', 'info');
  };

  const parseCsvText = (text) => {
    const lines = text.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      // Split line by comma, taking into account quoted fields
      const rowTokens = [];
      let inQuotes = false;
      let curToken = '';

      for (let c of lines[i]) {
        if (c === '"' || c === "'") {
          inQuotes = !inQuotes;
        } else if (c === ',' && !inQuotes) {
          rowTokens.push(curToken.trim().replace(/^["']|["']$/g, ''));
          curToken = '';
        } else {
          curToken += c;
        }
      }
      rowTokens.push(curToken.trim().replace(/^["']|["']$/g, ''));

      const rowObj = {};
      headers.forEach((h, idx) => {
        rowObj[h] = rowTokens[idx] || '';
      });
      rows.push(rowObj);
    }

    return rows;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result;
      if (typeof text === 'string') {
        setCsvText(text);
      }
    };
    reader.readAsText(file);
  };

  const handleValidateAndPreview = async () => {
    if (!csvText.trim()) {
      addToast('Please upload a CSV file or paste menu rows', 'warning');
      return;
    }
    const rawRows = parseCsvText(csvText);
    if (rawRows.length === 0) {
      addToast('No valid data rows found in CSV', 'error');
      return;
    }

    setValidating(true);
    try {
      const res = await authFetch('/api/menu/import-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: rawRows })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPreviewResult(data);
        setStep('preview');
      } else {
        addToast(data.error || 'Failed to parse menu rows', 'error');
      }
    } catch (err) {
      addToast('Network error while validating CSV', 'error');
    } finally {
      setValidating(false);
    }
  };

  const handleUpdateRowField = (idx, field, value) => {
    setPreviewResult(prev => {
      const updatedRows = [...prev.rows];
      const target = { ...updatedRows[idx], [field]: value };

      // Re-validate row locally
      const errors = [];
      if (!target.name.trim()) errors.push('Item name is required');
      const p = parseFloat(target.price);
      if (isNaN(p) || p < 0) errors.push('Price must be a valid positive number');

      target.price = isNaN(p) ? 0 : p;
      target.errors = errors;
      target.isValid = errors.length === 0;

      updatedRows[idx] = target;
      const validCount = updatedRows.filter(r => r.isValid).length;

      return {
        ...prev,
        validCount,
        invalidCount: updatedRows.length - validCount,
        rows: updatedRows
      };
    });
  };

  const handleDeleteRow = (idx) => {
    setPreviewResult(prev => {
      const updatedRows = prev.rows.filter((_, i) => i !== idx);
      const validCount = updatedRows.filter(r => r.isValid).length;
      return {
        ...prev,
        totalRows: updatedRows.length,
        validCount,
        invalidCount: updatedRows.length - validCount,
        rows: updatedRows
      };
    });
  };

  const handleConfirmImport = async () => {
    if (!previewResult || previewResult.validCount === 0) {
      addToast('No valid rows available to import', 'warning');
      return;
    }

    const validRows = previewResult.rows.filter(r => r.isValid);

    setImporting(true);
    try {
      const res = await authFetch('/api/menu/import-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: validRows })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addToast(`Successfully imported ${data.importedCount} menu item(s)!`, 'success');
        if (onImportSuccess) onImportSuccess(data);
        onClose();
      } else {
        addToast(data.error || 'Failed to import menu items', 'error');
      }
    } catch (err) {
      addToast('Network error while importing menu', 'error');
    } finally {
      setImporting(false);
    }
  };

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
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Import Menu via Excel / CSV
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '3px 0 0' }}>
              Upload your menu spreadsheet, preview row validation, and import directly to your database.
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Step 1: Upload & Paste View */}
        {step === 'upload' && (
          <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
            {/* Download Template Banner */}
            <div style={{
              background: '#f0fdf4',
              border: '1.5px dashed #86efac',
              borderRadius: 14,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
              flexWrap: 'wrap',
              gap: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <FileSpreadsheet size={28} style={{ color: '#059669' }} />
                <div>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#065f46', margin: 0 }}>
                    Download Official TableMint Menu Template
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: '#047857', margin: '2px 0 0' }}>
                    Formatted with standard headers: Category, Item Name, Price, Description, Food Type
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadSample}
                className="btn-brand-primary"
                style={{ fontSize: '0.82rem', padding: '7px 16px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Download size={14} /> Download Sample CSV
              </button>
            </div>

            {/* File Upload Drop Area */}
            <div
              style={{
                border: '2px dashed #cbd5e1',
                borderRadius: 14,
                padding: '36px 20px',
                textAlign: 'center',
                background: '#f8fafc',
                cursor: 'pointer',
                marginBottom: 20
              }}
              onClick={() => document.getElementById('csv-file-input')?.click()}
            >
              <Upload size={32} style={{ color: '#64748b', marginBottom: 10 }} />
              <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                {fileName ? `Selected file: ${fileName}` : 'Click to browse or drop your CSV / Excel file here'}
              </p>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 4 }}>
                Supports UTF-8 CSV, TXT, or Excel exported sheets
              </p>
              <input
                id="csv-file-input"
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </div>

            {/* Direct Paste Alternative */}
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 6 }}>
                Or Paste CSV Data Directly:
              </label>
              <textarea
                rows={6}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Category,Item Name,Price,Description,Food Type&#10;Starters,Paneer Tikka,220,Tandoori cottage cheese,Veg&#10;Main Course,Butter Chicken,320,Tender chicken in butter gravy,Non-Veg"
                className="dash-form-textarea"
                style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}
              />
            </div>
          </div>
        )}

        {/* Step 2: Row Validation & Preview Table */}
        {step === 'preview' && previewResult && (
          <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
            {/* Summary KPI Banner */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              marginBottom: 16,
              flexWrap: 'wrap',
              gap: 12
            }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={16} style={{ color: '#059669' }} />
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#059669' }}>
                    {previewResult.validCount} Valid Items
                  </span>
                </div>
                {previewResult.invalidCount > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={16} style={{ color: '#dc2626' }} />
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#dc2626' }}>
                      {previewResult.invalidCount} Invalid Rows (fix below or remove)
                    </span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setStep('upload')}
                style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
              >
                ← Back to Upload
              </button>
            </div>

            {/* Editable Table */}
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
              <table className="admin-clean-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ width: 45 }}>#</th>
                    <th>Item Name</th>
                    <th>Category</th>
                    <th style={{ width: 100 }}>Price (₹)</th>
                    <th style={{ width: 90 }}>Type</th>
                    <th>Validation</th>
                    <th style={{ width: 50 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {previewResult.rows.map((row, idx) => (
                    <tr key={idx} style={{ background: row.isValid ? '#ffffff' : '#fef2f2' }}>
                      <td style={{ fontSize: '0.78rem', color: '#64748b' }}>{row.rowNum}</td>
                      <td>
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => handleUpdateRowField(idx, 'name', e.target.value)}
                          className="dash-form-input"
                          style={{
                            height: 32,
                            fontSize: '0.82rem',
                            borderColor: row.errors.some(e => e.includes('name')) ? '#ef4444' : '#e2e8f0'
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={row.category}
                          onChange={(e) => handleUpdateRowField(idx, 'category', e.target.value)}
                          className="dash-form-input"
                          style={{ height: 32, fontSize: '0.82rem' }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={row.price}
                          onChange={(e) => handleUpdateRowField(idx, 'price', e.target.value)}
                          className="dash-form-input"
                          style={{
                            height: 32,
                            fontSize: '0.82rem',
                            borderColor: row.errors.some(e => e.includes('Price')) ? '#ef4444' : '#e2e8f0'
                          }}
                        />
                      </td>
                      <td>
                        <select
                          value={row.isVeg ? 'veg' : 'non-veg'}
                          onChange={(e) => handleUpdateRowField(idx, 'isVeg', e.target.value === 'veg')}
                          className="dash-form-select"
                          style={{ height: 32, fontSize: '0.8rem', padding: '0 6px' }}
                        >
                          <option value="veg">Veg</option>
                          <option value="non-veg">Non-Veg</option>
                        </select>
                      </td>
                      <td>
                        {row.isValid ? (
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle2 size={13} /> Ready
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <AlertCircle size={13} /> {row.errors.join(', ')}
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(idx)}
                          className="btn-row-dots"
                          title="Remove row from import"
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

        {/* Footer Actions */}
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

          {step === 'upload' ? (
            <button
              type="button"
              disabled={validating || !csvText.trim()}
              onClick={handleValidateAndPreview}
              className="btn-brand-primary"
              style={{ padding: '8px 24px' }}
            >
              {validating ? 'Validating...' : 'Validate & Preview Menu →'}
            </button>
          ) : (
            <button
              type="button"
              disabled={importing || previewResult?.validCount === 0}
              onClick={handleConfirmImport}
              className="btn-brand-primary"
              style={{ padding: '8px 24px' }}
            >
              {importing ? 'Importing...' : `Confirm & Import ${previewResult?.validCount || 0} Items`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
