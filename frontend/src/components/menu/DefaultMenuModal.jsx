import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Sparkles,
  Search,
  CheckCircle2,
  UtensilsCrossed,
  Layers,
  RefreshCw,
  Plus,
  AlertTriangle,
  Info
} from 'lucide-react';

export default function DefaultMenuModal({
  isOpen,
  onClose,
  existingMenu = [],
  onImportSuccess,
  authFetch,
  addToast
}) {
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [importing, setImporting] = useState(false);
  const [catalogItems, setCatalogItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [importMode, setImportMode] = useState('merge'); // 'merge' or 'replace'

  // Load TableMint default template on open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadCatalog() {
      setLoadingTemplate(true);
      try {
        const res = await authFetch('/api/menu/default-template');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            const items = data.items || [];
            setCatalogItems(items);
            setCategories(data.categories || []);
            // Pre-select all items by default
            setSelectedIds(new Set(items.map((it) => it.id || it.name)));
          }
        } else {
          if (isMounted) addToast('Failed to load TableMint default catalog', 'error');
        }
      } catch (err) {
        if (isMounted) addToast('Error connecting to TableMint menu library', 'error');
      } finally {
        if (isMounted) setLoadingTemplate(false);
      }
    }

    loadCatalog();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Existing item names set for duplicate warning
  const existingNamesSet = useMemo(() => {
    return new Set(existingMenu.map((m) => (m.name || '').trim().toLowerCase()));
  }, [existingMenu]);

  // Filtered catalog items
  const filteredItems = useMemo(() => {
    return catalogItems.filter((item) => {
      const matchCat = activeCategory === 'all' || item.category === activeCategory;
      const matchSearch =
        !searchQuery ||
        (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.category || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [catalogItems, activeCategory, searchQuery]);

  // Toggle item selection
  const toggleItem = (itemId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Select all filtered / Deselect
  const toggleSelectAllFiltered = () => {
    const allFilteredSelected = filteredItems.every((it) => selectedIds.has(it.id || it.name));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredItems.forEach((it) => next.delete(it.id || it.name));
      } else {
        filteredItems.forEach((it) => next.add(it.id || it.name));
      }
      return next;
    });
  };

  // Execute import
  const handleImport = async () => {
    if (selectedIds.size === 0) {
      addToast('Please select at least 1 dish to import', 'error');
      return;
    }

    setImporting(true);
    try {
      const res = await authFetch('/api/menu/seed-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: importMode,
          selectedIds: Array.from(selectedIds)
        })
      });

      if (res.ok) {
        const data = await res.json();
        addToast(
          importMode === 'replace'
            ? `Default menu loaded successfully (${data.count} items)!`
            : `Added TableMint default dishes to your menu (${data.count} total items)!`,
          'success'
        );
        if (onImportSuccess) await onImportSuccess();
        onClose();
      } else {
        const err = await res.json().catch(() => ({}));
        addToast(err.error || 'Failed to import default menu', 'error');
      }
    } catch (err) {
      addToast('Error importing TableMint default menu', 'error');
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !importing) onClose();
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 20,
          width: '100%',
          maxWidth: 960,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          animation: 'scaleIn 0.2s ease-out'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '24px 28px 20px',
            background: 'linear-gradient(135deg, #062D22 0%, #0d4a38 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(16, 185, 129, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#34d399'
                }}
              >
                <Sparkles size={20} />
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                TableMint Default Menu Catalog
              </h3>
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  padding: '3px 10px',
                  borderRadius: 999,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#a7f3d0'
                }}
              >
                {catalogItems.length} Curated Dishes
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#cbd5e1', maxWidth: 640, lineHeight: 1.5 }}>
              Kickstart your digital menu with TableMint's high-standard restaurant library. Complete with HD food
              photos, standardized categories, dish descriptions, and recommended prices.
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={importing}
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: 'none',
              borderRadius: 10,
              width: 36,
              height: 36,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.15s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Import Mode Switcher */}
        <div
          style={{
            padding: '16px 28px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
              Import Strategy:
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setImportMode('merge')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1.5px solid',
                  borderColor: importMode === 'merge' ? '#059669' : '#cbd5e1',
                  background: importMode === 'merge' ? '#ecfdf5' : '#ffffff',
                  color: importMode === 'merge' ? '#065f46' : '#475569',
                  transition: 'all 0.15s'
                }}
              >
                Merge with Existing (Safe)
              </button>
              <button
                type="button"
                onClick={() => setImportMode('replace')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1.5px solid',
                  borderColor: importMode === 'replace' ? '#dc2626' : '#cbd5e1',
                  background: importMode === 'replace' ? '#fef2f2' : '#ffffff',
                  color: importMode === 'replace' ? '#991b1b' : '#475569',
                  transition: 'all 0.15s'
                }}
              >
                Replace All (Fresh Start)
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#64748b' }}>
            {importMode === 'merge' ? (
              <>
                <Info size={16} color="#059669" />
                <span>Existing custom dishes are preserved. Duplicates will be safely skipped.</span>
              </>
            ) : (
              <>
                <AlertTriangle size={16} color="#dc2626" />
                <span style={{ color: '#b91c1c', fontWeight: 600 }}>
                  Warning: Existing {existingMenu.length} dishes will be replaced with default catalog.
                </span>
              </>
            )}
          </div>
        </div>

        {/* Search & Category Filter Toolbar */}
        <div
          style={{
            padding: '14px 28px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            {/* Search Input */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#f1f5f9',
                borderRadius: 10,
                padding: '8px 14px',
                flex: 1,
                maxWidth: 420
              }}
            >
              <Search size={16} color="#64748b" />
              <input
                type="text"
                placeholder="Search default dishes by name, category, or ingredients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  width: '100%',
                  fontSize: '0.88rem',
                  color: '#0f172a'
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Selection Quick Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Selected: <strong style={{ color: '#0f172a' }}>{selectedIds.size}</strong> of {catalogItems.length}
              </span>
              <button
                type="button"
                onClick={toggleSelectAllFiltered}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  padding: '6px 12px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer'
                }}
              >
                {filteredItems.every((it) => selectedIds.has(it.id || it.name))
                  ? 'Deselect Category'
                  : 'Select All in Category'}
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 4
            }}
          >
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              style={{
                padding: '5px 12px',
                borderRadius: 999,
                fontSize: '0.8rem',
                fontWeight: 600,
                border: '1px solid',
                borderColor: activeCategory === 'all' ? '#059669' : '#e2e8f0',
                background: activeCategory === 'all' ? '#059669' : '#ffffff',
                color: activeCategory === 'all' ? '#ffffff' : '#64748b',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              All Items ({catalogItems.length})
            </button>
            {categories.map((cat) => {
              const count = catalogItems.filter((i) => i.category === cat).length;
              const formattedName = cat.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 999,
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: activeCategory === cat ? '#059669' : '#e2e8f0',
                    background: activeCategory === cat ? '#059669' : '#ffffff',
                    color: activeCategory === cat ? '#ffffff' : '#64748b',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {formattedName} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Dishes Preview Scrollable Grid */}
        <div
          style={{
            padding: '20px 28px',
            overflowY: 'auto',
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
            gap: 14,
            background: '#fafafa'
          }}
        >
          {loadingTemplate ? (
            <div style={{ gridColumn: '1 / -1', padding: '60px 0', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto 12px', color: '#059669' }} />
              <p style={{ fontWeight: 600 }}>Loading TableMint starter catalog...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '40px 0', textAlign: 'center', color: '#64748b' }}>
              <UtensilsCrossed size={36} style={{ margin: '0 auto 10px', color: '#cbd5e1' }} />
              <p style={{ fontWeight: 600 }}>No dishes found matching your search</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const id = item.id || item.name;
              const isSelected = selectedIds.has(id);
              const isDuplicate = existingNamesSet.has((item.name || '').trim().toLowerCase());

              return (
                <div
                  key={id}
                  onClick={() => toggleItem(id)}
                  style={{
                    background: isSelected ? '#ffffff' : '#f8fafc',
                    border: '1.5px solid',
                    borderColor: isSelected ? '#10b981' : '#e2e8f0',
                    borderRadius: 14,
                    padding: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 4px 12px rgba(16, 185, 129, 0.1)' : 'none',
                    opacity: isSelected ? 1 : 0.65
                  }}
                >
                  {/* Selection Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleItem(id)}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: 18,
                      height: 18,
                      accentColor: '#059669',
                      cursor: 'pointer'
                    }}
                  />

                  {/* Dish Thumbnail */}
                  <div
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 10,
                      overflow: 'hidden',
                      background: '#e2e8f0',
                      flexShrink: 0,
                      position: 'relative'
                    }}
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#94a3b8'
                        }}
                      >
                        <UtensilsCrossed size={20} />
                      </div>
                    )}

                    {/* Veg/Non-Veg dot */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        width: 12,
                        height: 12,
                        borderRadius: 3,
                        background: '#ffffff',
                        border: `1.5px solid ${item.isVeg ? '#16a34a' : '#dc2626'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <div
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          background: item.isVeg ? '#16a34a' : '#dc2626'
                        }}
                      />
                    </div>
                  </div>

                  {/* Dish Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: '0.92rem',
                          fontWeight: 700,
                          color: '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {item.name}
                      </h4>
                      <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#059669', flexShrink: 0 }}>
                        ₹{item.price}
                      </span>
                    </div>

                    <p
                      style={{
                        margin: '2px 0 4px',
                        fontSize: '0.78rem',
                        color: '#64748b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {item.description || item.category}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: '#f1f5f9',
                          color: '#475569',
                          fontWeight: 600,
                          textTransform: 'capitalize'
                        }}
                      >
                        {item.category?.replace(/-/g, ' ')}
                      </span>
                      {isDuplicate && importMode === 'merge' && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            padding: '1px 5px',
                            borderRadius: 4,
                            background: '#fef3c7',
                            color: '#b45309',
                            fontWeight: 600
                          }}
                        >
                          Already in Menu
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 28px',
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ fontSize: '0.86rem', color: '#64748b' }}>
            <span>Ready to import </span>
            <strong style={{ color: '#059669' }}>{selectedIds.size} dishes</strong>
            <span> into your menu</span>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={importing}
              style={{
                padding: '10px 18px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleImport}
              disabled={importing || selectedIds.size === 0}
              style={{
                padding: '10px 24px',
                borderRadius: 10,
                border: 'none',
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: '#ffffff',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: importing || selectedIds.size === 0 ? 'not-allowed' : 'pointer',
                opacity: importing || selectedIds.size === 0 ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
              }}
            >
              {importing ? (
                <>
                  <RefreshCw className="animate-spin" size={16} />
                  <span>Importing Catalog...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>
                    {importMode === 'replace'
                      ? `Replace & Import ${selectedIds.size} Dishes`
                      : `Add ${selectedIds.size} Dishes to Menu`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
