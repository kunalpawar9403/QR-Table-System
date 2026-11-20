import React from 'react';
import { Plus, FileSpreadsheet, Sparkles, Tag, UtensilsCrossed, ArrowRight } from 'lucide-react';

export default function EmptyMenuState({
  onAddManual,
  onManualAdd,
  onImportCsv,
  onCsvImport,
  onUploadOcr,
  onOcrImport,
  onSelectCategories,
  onManageCategories,
  onOpenDefaultMenu,
  onLoadDemo,
  onLoadDemoMenu,
  loadingDemo = false
}) {
  const handleAddManual = onAddManual || onManualAdd;
  const handleImportCsv = onImportCsv || onCsvImport;
  const handleUploadOcr = onUploadOcr || onOcrImport;
  const handleSelectCategories = onSelectCategories || onManageCategories;
  const handleDefaultMenu = onOpenDefaultMenu || onLoadDemo || onLoadDemoMenu;

  return (
    <div
      className="empty-menu-state-wrapper"
      style={{
        background: '#ffffff',
        borderRadius: 20,
        border: '1px solid #e2e8f0',
        padding: '48px 24px',
        margin: '16px 0 28px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
        textAlign: 'center'
      }}
    >
      {/* Central Illustration Badge */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: 'linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%)',
          color: '#0369A1',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
          boxShadow: '0 8px 16px rgba(2, 132, 199, 0.15)'
        }}
      >
        <UtensilsCrossed size={36} />
      </div>

      <h3
        style={{
          fontSize: '1.55rem',
          fontWeight: 800,
          color: '#0f172a',
          marginBottom: 8,
          letterSpacing: '-0.02em'
        }}
      >
        Your restaurant menu is ready to be launched
      </h3>
      <p
        style={{
          fontSize: '0.95rem',
          color: '#64748b',
          maxWidth: 620,
          margin: '0 auto 36px',
          lineHeight: 1.6
        }}
      >
        Every new restaurant on TableMint can either launch instantly with our <strong>curated default starter catalog</strong> of 80 dishes, or build from scratch manually, via spreadsheet, or photo scan.
      </p>

      {/* Featured TableMint Default Starter Menu Banner Card */}
      <div
        className="empty-menu-featured-banner"
        onClick={handleDefaultMenu}
        style={{
          maxWidth: 1040,
          margin: '0 auto 24px',
          background: 'linear-gradient(135deg, #0B132B 0%, #0369A1 100%)',
          borderRadius: 18,
          padding: '24px 28px',
          cursor: 'pointer',
          textAlign: 'left',
          color: '#ffffff',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          boxShadow: '0 12px 30px rgba(15, 23, 42, 0.18)',
          border: '1px solid rgba(2, 132, 199, 0.3)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 16px 36px rgba(15, 23, 42, 0.25)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = '0 12px 30px rgba(15, 23, 42, 0.18)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, maxWidth: 650 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'rgba(2, 132, 199, 0.2)',
              border: '1px solid rgba(2, 132, 199, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#7DD3FC',
              flexShrink: 0
            }}
          >
            <Sparkles size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span
                style={{
                  background: '#0284C7',
                  color: '#0F172A',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: 6,
                  letterSpacing: '0.04em'
                }}
              >
                Recommended for New Restaurants
              </span>
              <span style={{ fontSize: '0.82rem', color: '#BAE6FD', fontWeight: 600 }}>
                1-Click Instant Setup
              </span>
            </div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.01em' }}>
              Launch with TableMint Default Menu (80 Curated Dishes)
            </h4>
            <p style={{ fontSize: '0.88rem', color: '#cbd5e1', margin: 0, lineHeight: 1.5 }}>
              Includes Starters, North Indian, Biryanis, Tandoori, Chinese, Soups, Desserts, and Drinks. All with HD food photos, veg/non-veg tags, descriptions, and customizable pricing.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="empty-menu-featured-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (handleDefaultMenu) handleDefaultMenu();
          }}
          disabled={loadingDemo}
          style={{
            background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 12,
            padding: '12px 24px',
            fontSize: '0.92rem',
            fontWeight: 800,
            cursor: loadingDemo ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
            whiteSpace: 'nowrap'
          }}
        >
          {loadingDemo ? (
            'Loading Catalog...'
          ) : (
            <>
              Explore & Add Default Menu <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>

      {/* 4 Additional Action Cards Grid */}
      <div
        className="empty-menu-cards-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))',
          gap: 16,
          maxWidth: 1040,
          margin: '0 auto 32px',
          textAlign: 'left'
        }}
      >
        {/* Card 1: Create Manually */}
        <div
          onClick={handleAddManual}
          style={{
            background: '#fafafa',
            border: '1.5px solid #e2e8f0',
            borderRadius: 16,
            padding: 24,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#0284C7';
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 10px 24px rgba(2, 132, 199, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#E0F2FE',
                color: '#0369A1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14
              }}
            >
              <Plus size={22} />
            </div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
              Create Manually
            </h4>
            <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, marginBottom: 16 }}>
              Add individual dishes with custom variants (Half/Full), add-ons, photos, and veg indicators.
            </p>
          </div>
          <span
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#0369A1',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            Add Single Item <ArrowRight size={15} />
          </span>
        </div>

        {/* Card 2: Import CSV/Excel */}
        <div
          onClick={handleImportCsv}
          style={{
            background: '#fafafa',
            border: '1.5px solid #e2e8f0',
            borderRadius: 16,
            padding: 24,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#0284c7';
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 10px 24px rgba(2, 132, 199, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#f0f9ff',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14
              }}
            >
              <FileSpreadsheet size={22} />
            </div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
              Import Spreadsheet
            </h4>
            <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, marginBottom: 16 }}>
              Upload your CSV or Excel menu sheet. Preview and validate rows before importing.
            </p>
          </div>
          <span
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            Upload CSV / Excel <ArrowRight size={15} />
          </span>
        </div>

        {/* Card 3: Photo / PDF Extraction */}
        <div
          onClick={handleUploadOcr}
          style={{
            background: '#fafafa',
            border: '1.5px solid #e2e8f0',
            borderRadius: 16,
            padding: 24,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#9333ea';
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 10px 24px rgba(147, 51, 234, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#faf5ff',
                color: '#9333ea',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14
              }}
            >
              <Sparkles size={22} />
            </div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
              Menu Photo / PDF
            </h4>
            <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, marginBottom: 16 }}>
              Upload an image or scan of your printed menu for quick review and conversion.
            </p>
          </div>
          <span
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#9333ea',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            Upload Menu Photo <ArrowRight size={15} />
          </span>
        </div>

        {/* Card 4: Suggested Categories */}
        <div
          onClick={handleSelectCategories}
          style={{
            background: '#fafafa',
            border: '1.5px solid #e2e8f0',
            borderRadius: 16,
            padding: 24,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#F59E0B';
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 10px 24px rgba(217, 119, 6, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#fffbeb',
                color: '#F59E0B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14
              }}
            >
              <Tag size={22} />
            </div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
              Standard Categories
            </h4>
            <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, marginBottom: 16 }}>
              Start by picking standard categories like Starters, Main Course, Biryani, and Beverages.
            </p>
          </div>
          <span
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#F59E0B',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            Choose Categories <ArrowRight size={15} />
          </span>
        </div>
      </div>
    </div>
  );
}
