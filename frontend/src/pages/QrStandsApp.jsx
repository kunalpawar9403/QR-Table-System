import React, { useState, useEffect } from 'react';
import { Printer, ArrowLeft, QrCode } from 'lucide-react';
import '../styles/qr-stands.css';

export default function QrStandsApp({ onBack }) {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('all');

  useEffect(() => {
    fetch('/api/tables')
      .then((res) => res.json())
      .then(setTables)
      .catch(() => {});
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
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Table Acrylic QR Stands</h2>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select
            className="customer-name-input"
            style={{ width: 180 }}
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

          <button className="btn-primary" onClick={() => window.print()}>
            <Printer size={16} /> Print Stand Cards
          </button>
        </div>
      </div>

      <div className="stands-grid">
        {displayedTables.map((t) => (
          <div key={t.id} className="qr-stand-card">
            <div className="stand-brand-header">
              <h2 className="stand-brand-title">Spice Garden</h2>
              <div className="stand-tagline">Fine Dining & Smart Ordering</div>
            </div>

            <div className="stand-qr-box">
              <img
                src={`/api/qrcode/${t.id}`}
                alt={`Table ${t.id} QR`}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
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
          </div>
        ))}
      </div>
    </div>
  );
}
