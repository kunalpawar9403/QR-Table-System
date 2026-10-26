import React, { useState, useEffect } from 'react';
import { Printer, ArrowLeft, QrCode, Sparkles, Wifi, ExternalLink } from 'lucide-react';
import '../styles/qr-stands.css';

export default function QrStandsApp({ onBack }) {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('all');
  const [printingSingleId, setPrintingSingleId] = useState(null);

  useEffect(() => {
    fetch('/api/tables')
      .then((res) => res.json())
      .then(setTables)
      .catch(() => {});
  }, []);

  const handlePrintSingle = (tableId) => {
    setPrintingSingleId(tableId);
    document.body.classList.add('printing-single-stand-only');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-single-stand-only');
        setPrintingSingleId(null);
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

  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.classList.remove('printing-single-stand-only');
      document.body.classList.remove('printing-all-stands-only');
      setPrintingSingleId(null);
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

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select
            className="dash-form-select"
            style={{ width: 180, margin: 0 }}
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

      <div className="stands-grid">
        {displayedTables.map((t) => {
          const isTarget = printingSingleId === t.id;
          return (
            <div
              key={t.id}
              className={`qr-stand-card ${isTarget ? 'is-target-stand' : ''}`}
              data-table-id={t.id}
            >
              <div className="stand-top-clip" />

              <div className="stand-brand-header">
                <div className="stand-crest-badge">
                  <Sparkles size={12} style={{ color: '#d97706' }} />
                  <span>LUXURY DINING</span>
                  <Sparkles size={12} style={{ color: '#d97706' }} />
                </div>
                <h2 className="stand-brand-title">Spice Garden</h2>
                <div className="stand-tagline">Fine Dining & Smart Ordering</div>
              </div>

              <div className="stand-qr-box">
                <div className="stand-corner top-left" />
                <div className="stand-corner top-right" />
                <div className="stand-corner bottom-left" />
                <div className="stand-corner bottom-right" />
                <img
                  src={`/api/qrcode/${t.id}`}
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

              <div className="no-print" style={{ display: 'flex', gap: 8, width: '100%', marginTop: 14 }}>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ flex: 1, fontSize: '0.8rem', padding: '8px 12px' }}
                  onClick={() => handlePrintSingle(t.id)}
                >
                  <Printer size={14} /> Print Stand
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '8px 12px' }}
                  onClick={() => window.open(`/?table=${t.id}`, '_blank')}
                  title="Test Live Customer Menu"
                >
                  <ExternalLink size={14} /> Menu
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
