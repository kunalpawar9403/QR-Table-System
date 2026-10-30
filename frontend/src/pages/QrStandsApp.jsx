import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, ArrowLeft, QrCode, Sparkles, Wifi, ExternalLink, Share2, Download } from 'lucide-react';
import { authFetch, getCurrentUser } from '../utils/staffAuth';
import '../styles/qr-stands.css';

export default function QrStandsApp({ onBack }) {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('all');
  const [printingSingleTable, setPrintingSingleTable] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const curUser = getCurrentUser();
  const rSlug = curUser?.restaurantSlug || 'tablemint';
  const restParam = rSlug !== 'tablemint' ? `&restaurant=${encodeURIComponent(rSlug)}` : '';

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    authFetch('/api/tables')
      .then((res) => res.json())
      .then(setTables)
      .catch(() => {});
  }, []);

  const handlePrintSingle = (table) => {
    setPrintingSingleTable(table);
    document.body.classList.add('printing-single-stand-only');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-single-stand-only');
        setPrintingSingleTable(null);
      }, 1000);
    }, 150);
  };

  const handlePrintAll = () => {
    document.body.classList.add('printing-all-stands-only');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-all-stands-only');
    }, 1000);
  };

  const handleShareOrDownloadStand = async (table) => {
    const qrUrl = `/api/qrcode/${table.id}${restParam ? `?restaurant=${encodeURIComponent(rSlug)}` : ''}`;
    const scanUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/?table=${table.id}&token=${table.sessionToken || ''}${restParam}`
      : '';

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${table.name || 'Table ' + table.id} - TableMint QR Stand`,
          text: `Scan QR to open digital menu for ${table.name || 'Table ' + table.id}`,
          url: scanUrl
        });
        showToast(`Shared ${table.name || 'Table ' + table.id} QR link!`);
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    // Direct Download Stand PNG
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `${(table.name || 'table-' + table.id).toLowerCase().replace(/\s+/g, '-')}-qr-stand.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Saved ${table.name || 'Table ' + table.id} QR Stand!`);
  };

  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.classList.remove('printing-single-stand-only');
      document.body.classList.remove('printing-all-stands-only');
      setPrintingSingleTable(null);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const displayedTables =
    selectedTable === 'all'
      ? tables
      : tables.filter((t) => String(t.id) === String(selectedTable));

  return (
    <div className="stands-screen-wrap">
      <div className="stands-toolbar no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {onBack && (
            <button className="btn-secondary" onClick={onBack}>
              <ArrowLeft size={16} /> Dashboard
            </button>
          )}
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc' }}>Table Acrylic QR Stands</h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
              Print individual or batch contactless table ordering standees
            </p>
          </div>
        </div>

        <div className="stands-toolbar-actions">
          <select
            className="dash-form-select stands-filter-select"
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
          >
            <option value="all">All Tables ({tables.length})</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name || `Table ${t.id}`}
              </option>
            ))}
          </select>

          <button className="btn-primary" onClick={handlePrintAll}>
            <Printer size={16} /> Print All Stands
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="stands-toast-notification">
          {toastMessage}
        </div>
      )}

      <div className="stands-grid">
        {displayedTables.map((t) => (
          <div
            key={t.id}
            className="qr-stand-card"
            data-table-id={t.id}
          >
            <div className="stand-top-clip" />

            <div className="stand-brand-header">
              <div className="stand-crest-badge">
                <Sparkles size={12} style={{ color: '#00e676' }} />
                <span>LUXURY DINING</span>
                <Sparkles size={12} style={{ color: '#00e676' }} />
              </div>
              <h2 className="stand-brand-title">TableMint</h2>
              <div className="stand-tagline">Smart Restaurant & POS</div>
            </div>

            <div className="stand-qr-box">
              <div className="stand-corner top-left" />
              <div className="stand-corner top-right" />
              <div className="stand-corner bottom-left" />
              <div className="stand-corner bottom-right" />
              <img
                src={`/api/qrcode/${t.id}${restParam ? `?restaurant=${encodeURIComponent(rSlug)}` : ''}`}
                alt={`Table ${t.id} QR`}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>

            <div style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 700, margin: '4px 0 10px' }}>
              Point camera & tap link to open menu
            </div>

            <div className="stand-table-badge">{t.name || `TABLE ${t.id}`}</div>

            <div className="stand-steps-list">
              <div className="stand-step-item">
                <span className="stand-step-num">1</span>
                <span>Open your phone camera & scan QR</span>
              </div>
              <div className="stand-step-item">
                <span className="stand-step-num">2</span>
                <span>Browse our curated menu & customize dishes</span>
              </div>
              <div className="stand-step-item">
                <span className="stand-step-num">3</span>
                <span>Order directly to kitchen & track live status</span>
              </div>
            </div>

            <div className="stand-hospitality-footer" style={{ width: '100%', marginTop: 12, paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: '0.72rem', color: '#475569' }}>
                <Wifi size={13} />
                <span>Guest Wi-Fi: <strong>SpiceGarden_Guest</strong> (No Pass)</span>
              </div>
              <div style={{ fontSize: '0.62rem', color: '#94a3b8', marginTop: 2 }}>Powered by QR Table System</div>
            </div>

            <div className="stand-card-actions no-print">
              <button
                type="button"
                className="btn-primary stand-action-btn"
                onClick={() => handlePrintSingle(t)}
                title="Print single table acrylic stand"
              >
                <Printer size={15} /> Print Stand
              </button>
              <button
                type="button"
                className="btn-secondary stand-action-btn"
                onClick={() => handleShareOrDownloadStand(t)}
                title="Share link or save QR stand image on mobile"
              >
                <Share2 size={15} /> Share / Save
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Single Stand Portal for 1-Page Clean Center Print */}
      {typeof document !== 'undefined' && printingSingleTable && createPortal(
        <div id="single-stand-print-root">
          <div style={{ width: 50, height: 5, background: '#000', margin: '0 auto 10px', borderRadius: 4 }} />
          <div style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>
            ★ LUXURY DINING ★
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '0.06em', fontFamily: 'serif' }}>
            TABLEMINT
          </div>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
            Smart Restaurant & POS
          </div>

          <div style={{ width: 170, height: 170, margin: '0 auto 8px', border: '2px solid #000', borderRadius: 12, padding: 8, background: '#fff' }}>
            <img
              src={`/api/qrcode/${printingSingleTable.id}${restParam ? `?restaurant=${encodeURIComponent(rSlug)}` : ''}`}
              alt={`Table ${printingSingleTable.id} QR Code`}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, marginBottom: 12 }}>
            Point phone camera & tap link to open menu
          </div>

          <div style={{ background: '#000', color: '#fff', padding: '6px 20px', borderRadius: 999, fontWeight: 900, fontSize: '1.2rem', width: 'fit-content', margin: '0 auto 12px' }}>
            {printingSingleTable.name || `TABLE ${printingSingleTable.id}`}
          </div>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#444', marginBottom: 12 }}>
            Capacity: {printingSingleTable.capacity || 4} Guests • Dedicated Server
          </div>

          <div style={{ borderTop: '1px dashed #666', paddingTop: 10, textAlign: 'left', maxWidth: 220, margin: '0 auto 12px', fontSize: '0.74rem', lineHeight: 1.6 }}>
            <div><strong>1.</strong> Open camera or Google Lens & scan QR</div>
            <div><strong>2.</strong> Browse live specials & customize dishes</div>
            <div><strong>3.</strong> Order straight to kitchen & settle bill</div>
          </div>

          <div style={{ borderTop: '1px solid #ccc', paddingTop: 8, fontSize: '0.7rem', color: '#333' }}>
            <div>Guest Wi-Fi: <strong>SpiceGarden_Guest</strong> (No Password)</div>
            <div style={{ fontSize: '0.62rem', color: '#666', marginTop: 2 }}>Powered by QR Table System • 4x6" Acrylic Stand Insert</div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
