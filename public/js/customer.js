// Customer QR Ordering Logic with Instant Scanner Gate
(function() {
  // App State
  let currentTableId = null;
  let currentTableToken = null;
  let menuData = [];
  let currentCategory = 'all';
  let cart = [];
  let activeOrder = null;
  let selectedModalItem = null;
  let modalCustomizations = {};
  let modalQuantity = 1;
  let videoStream = null;

  // Initialize Socket.io
  const socket = typeof io !== 'undefined' ? io() : null;

  // Pre-fetch menu immediately so it's ready before user even scans!
  fetchMenu();

  // Expose global functions immediately (avoids undefined errors)
  window.simulateScanTable = async function(tableNum) {
    try {
      const res = await fetch(`/api/tables`);
      const tables = await res.json();
      const target = tables.find(t => t.id === tableNum);
      const activeToken = target ? target.sessionToken : null;
      unlockMenuForTable(tableNum, true, activeToken);
    } catch(err) {
      unlockMenuForTable(tableNum, true, null);
    }
  };

  window.resetScanner = function() {
    currentTableId = null;
    currentTableToken = null;
    activeOrder = null;
    cart = [];
    updateCartUI();

    const scannerSection = document.getElementById('scannerSection');
    const menuAppSection = document.getElementById('menuAppSection');
    const expiredSection = document.getElementById('expiredSection');
    const appHeader = document.getElementById('appHeader');
    const trackingView = document.getElementById('trackingView');

    if (scannerSection) scannerSection.style.display = 'flex';
    if (menuAppSection) menuAppSection.style.display = 'none';
    if (expiredSection) expiredSection.style.display = 'none';
    if (appHeader) appHeader.style.display = 'none';
    if (trackingView) trackingView.style.display = 'none';

    stopCamera();
    window.history.pushState({}, '', window.location.pathname);
  };

  // Show Session Expired Gate
  function showSessionExpiredScreen(tableName, reason) {
    stopCamera();
    currentTableId = null;
    currentTableToken = null;
    activeOrder = null;
    cart = [];
    updateCartUI();

    const scannerSection = document.getElementById('scannerSection');
    const menuAppSection = document.getElementById('menuAppSection');
    const expiredSection = document.getElementById('expiredSection');
    const appHeader = document.getElementById('appHeader');
    const trackingView = document.getElementById('trackingView');
    const expiredTableName = document.getElementById('expiredTableName');
    const expiredReasonText = document.getElementById('expiredReasonText');

    if (scannerSection) scannerSection.style.display = 'none';
    if (menuAppSection) menuAppSection.style.display = 'none';
    if (appHeader) appHeader.style.display = 'none';
    if (trackingView) trackingView.style.display = 'none';

    if (expiredTableName) expiredTableName.textContent = tableName || 'This Table';
    if (expiredReasonText && reason) expiredReasonText.innerHTML = `${reason}<br><br>Old links or bookmarks are expired to prevent fraudulent orders.`;
    if (expiredSection) expiredSection.style.display = 'flex';

    showToast('Dining session expired or closed by staff.', 'warning');
    if (window.soundManager) window.soundManager.playClick();
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Check if table and token are in URL: ?table=3&token=...
    const urlParams = new URLSearchParams(window.location.search);
    const tableParam = urlParams.get('table');
    const tokenParam = urlParams.get('token');

    if (tableParam) {
      const parsed = parseInt(tableParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        unlockMenuForTable(parsed, false, tokenParam);
      }
    }

    // Category click bindings
    const categoryPills = document.querySelectorAll('.category-pill');
    categoryPills.forEach(pill => {
      pill.addEventListener('click', () => {
        categoryPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentCategory = pill.dataset.category;
        renderMenu();
      });
    });

    // Camera toggle button
    const btnStartCamera = document.getElementById('btnStartCamera');
    if (btnStartCamera) {
      btnStartCamera.addEventListener('click', toggleCamera);
    }
  });

  // Socket Events
  if (socket) {
    socket.on('order:status_changed', (order) => {
      if (order.tableId === currentTableId) {
        activeOrder = order;
        renderTrackingView(order);
        showToast(`Kitchen update: Order is now ${order.status.toUpperCase()}!`, 'info');
        if (order.status === 'ready' && window.soundManager) {
          window.soundManager.playOrderReady();
        }
      }
    });

    socket.on('menu:updated', (newMenu) => {
      menuData = newMenu;
      renderMenu();
    });

    // Session Expired Event (Admin completed order or cleared table)
    socket.on('table:session_expired', (data) => {
      if (data.tableId === currentTableId) {
        showSessionExpiredScreen(data.tableName || `Table ${currentTableId}`, data.message);
      }
    });

    socket.on('table:vacated', (data) => {
      if (data.tableId === currentTableId) {
        showSessionExpiredScreen(`Table ${currentTableId}`, 'Table has been cleared by staff. Dining session completed.');
      }
    });
  }

  let qrScanInterval = null;

  // Real-time camera QR decoder
  async function scanVideoFrame() {
    const video = document.getElementById('cameraVideo');
    if (!video || !videoStream || video.readyState < 2) return;

    // 1. Try Native BarcodeDetector (Chrome, iOS 17+, Android)
    if ('BarcodeDetector' in window) {
      try {
        const detector = new BarcodeDetector({ formats: ['qr_code'] });
        const codes = await detector.detect(video);
        if (codes && codes.length > 0) {
          handleScannedData(codes[0].rawValue);
          return;
        }
      } catch (e) {}
    }

    // 2. Try jsQR canvas scanning
    if (typeof jsQR !== 'undefined' && video.videoWidth > 0) {
      try {
        if (!window._scanCanvas) {
          window._scanCanvas = document.createElement('canvas');
          window._scanCtx = window._scanCanvas.getContext('2d');
        }
        window._scanCanvas.width = video.videoWidth;
        window._scanCanvas.height = video.videoHeight;
        window._scanCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const imgData = window._scanCtx.getImageData(0, 0, video.videoWidth, video.videoHeight);
        const code = jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: 'dontInvert' });
        if (code && code.data) {
          handleScannedData(code.data);
          return;
        }
      } catch (e) {}
    }
  }

  function handleScannedData(rawText) {
    if (!rawText) return;
    try {
      const url = new URL(rawText, window.location.origin);
      const table = url.searchParams.get('table');
      const token = url.searchParams.get('token');
      if (table) {
        stopCamera();
        unlockMenuForTable(parseInt(table, 10), true, token);
        return;
      }
    } catch (e) {}

    const match = rawText.match(/\b(?:table|t)?\s*(\d+)\b/i);
    if (match && match[1]) {
      stopCamera();
      unlockMenuForTable(parseInt(match[1], 10), true, null);
    }
  }

  // Camera Management
  async function toggleCamera() {
    const btn = document.getElementById('btnStartCamera');
    const video = document.getElementById('cameraVideo');
    const placeholder = document.getElementById('scannerPlaceholder');

    if (videoStream) {
      stopCamera();
      if (btn) btn.innerHTML = '<span>📷 Open Camera Scanner</span>';
      return;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('Camera API not supported in this browser. Please use quick table buttons!', 'warning');
        return;
      }

      videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      if (video) {
        video.srcObject = videoStream;
        video.style.display = 'block';
        video.play();
      }
      if (placeholder) placeholder.style.display = 'none';
      if (btn) btn.innerHTML = '<span>⏹️ Stop Camera</span>';

      showToast('Camera active! Point at table QR stand or tap below.', 'info');

      if (qrScanInterval) clearInterval(qrScanInterval);
      qrScanInterval = setInterval(scanVideoFrame, 350);

    } catch (err) {
      console.warn('Camera error:', err);
      showToast('Camera permission denied or unavailable. Tap any table below to test!', 'warning');
    }
  }

  function stopCamera() {
    if (qrScanInterval) {
      clearInterval(qrScanInterval);
      qrScanInterval = null;
    }
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      videoStream = null;
    }
    const video = document.getElementById('cameraVideo');
    const placeholder = document.getElementById('scannerPlaceholder');
    const btn = document.getElementById('btnStartCamera');

    if (video) video.style.display = 'none';
    if (placeholder) placeholder.style.display = 'flex';
    if (btn) btn.innerHTML = '<span>📷 Open Camera Scanner</span>';
  }

  // Unlock Menu Cards
  async function unlockMenuForTable(tableId, playBeep = false, token = null) {
    const tokenToVerify = token || sessionStorage.getItem('spice_token_' + tableId) || '';

    currentTableId = tableId;
    currentTableToken = tokenToVerify;

    // Verify token with server before unlocking!
    try {
      const verifyRes = await fetch(`/api/tables/${tableId}/verify-token?token=${encodeURIComponent(tokenToVerify)}`);
      if (verifyRes.ok) {
        const verifyData = await verifyRes.json();
        if (verifyData && verifyData.valid === false) {
          showSessionExpiredScreen(verifyData.tableName || `Table ${tableId}`, verifyData.message);
          return;
        }
        if (verifyData && verifyData.activeToken) {
          currentTableToken = verifyData.activeToken;
          sessionStorage.setItem('spice_token_' + tableId, currentTableToken);
        }
      }
    } catch (err) {
      console.warn('Token check error, proceeding with fallback:', err);
    }

    stopCamera();

    if (playBeep && window.soundManager) {
      window.soundManager.playServiceBell();
    }

    const scannerSection = document.getElementById('scannerSection');
    const expiredSection = document.getElementById('expiredSection');
    const menuAppSection = document.getElementById('menuAppSection');
    const appHeader = document.getElementById('appHeader');
    const tableBadgeText = document.getElementById('tableBadgeText');
    const verifiedTableText = document.getElementById('verifiedTableText');

    if (scannerSection) scannerSection.style.display = 'none';
    if (expiredSection) expiredSection.style.display = 'none';
    if (menuAppSection) menuAppSection.style.display = 'block';
    if (appHeader) appHeader.style.display = 'flex';

    if (tableBadgeText) tableBadgeText.textContent = `TABLE ${currentTableId} (ACTIVE 🟢)`;
    if (verifiedTableText) verifiedTableText.textContent = `Table ${currentTableId} • Live Session`;

    showToast(`Table ${currentTableId} Verified! Active dining session unlocked.`, 'success');

    if (socket) {
      socket.emit('join', {
        role: 'customer',
        tableId: currentTableId
      });
    }

    // Always ensure menuData is ready and render immediately
    if (!menuData || menuData.length === 0) {
      await fetchMenu();
    }
    renderMenu();

    checkExistingOrders();
  }

  const DEFAULT_MENU_FALLBACK = [
    {
      id: "item-1",
      name: "Classic Gourmet Veggie Burger",
      category: "burgers",
      price: 249,
      description: "Handcrafted plant-protein patty with melted cheddar, crisp lettuce, farm tomato, caramelized onions, and house special herb mayo on a toasted brioche bun. Served with golden fries.",
      image: "/images/veggie_burger.jpg",
      isVeg: true,
      isSpecial: true,
      available: true
    },
    {
      id: "item-2",
      name: "Artisan Wood-Fired Margherita",
      category: "pizza",
      price: 399,
      description: "Slow-fermented sourdough crust topped with San Marzano tomato sauce, fresh buffalo mozzarella, aromatic sweet basil, and extra virgin olive oil drizzle.",
      image: "/images/artisan_pizza.jpg",
      isVeg: true,
      isSpecial: true,
      available: true
    },
    {
      id: "item-3",
      name: "Creamy Fettuccine Alfredo",
      category: "pasta",
      price: 349,
      description: "Fresh handcrafted fettuccine pasta tossed in silky rich aged Parmigiano-Reggiano sauce, sweet cream butter, cracked tellicherry pepper, and garden parsley.",
      image: "/images/creamy_pasta.jpg",
      isVeg: true,
      isSpecial: false,
      available: true
    },
    {
      id: "item-4",
      name: "Sparkling Berry Citrus Soda",
      category: "drinks",
      price: 149,
      description: "Artisanal crushed wild blackberry and raspberry reduction, sparkling mineral water, fresh mint leaves, and hand-squeezed Key lime over pebble ice.",
      image: "/images/craft_soda.jpg",
      isVeg: true,
      isSpecial: false,
      available: true
    },
    {
      id: "item-5",
      name: "Mediterranean Garden Harvest Bowl",
      category: "bowls",
      price: 289,
      description: "Crisp baby greens, heirloom cherry tomatoes, Persian cucumbers, Kalamata olives, creamy feta, roasted chickpeas, and lemon oregano vinaigrette.",
      image: "/images/green_salad.jpg",
      isVeg: true,
      isSpecial: false,
      available: true
    },
    {
      id: "item-6",
      name: "Signature Espresso Tiramisu",
      category: "desserts",
      price: 229,
      description: "House-baked savoiardi ladyfingers soaked in single-origin espresso, whipped mascarpone cream, dark cocoa powder, and fresh raspberries.",
      image: "/images/dessert.jpg",
      isVeg: true,
      isSpecial: true,
      available: true
    }
  ];

  // Fetch Menu from Server
  async function fetchMenu() {
    try {
      const res = await fetch('/api/menu');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          menuData = data;
        } else {
          menuData = DEFAULT_MENU_FALLBACK;
        }
      } else {
        menuData = DEFAULT_MENU_FALLBACK;
      }
    } catch (err) {
      console.error('Failed to load menu, using fallback:', err);
      menuData = DEFAULT_MENU_FALLBACK;
    }
    if (currentTableId) {
      renderMenu();
    }
  }

  // Check Active Table Orders
  async function checkExistingOrders() {
    if (!currentTableId) return;
    try {
      const res = await fetch(`/api/orders/table/${currentTableId}`);
      const orders = await res.json();
      const active = orders.find(o => !['completed', 'cancelled'].includes(o.status));
      if (active) {
        activeOrder = active;
        renderTrackingView(active);
      }
    } catch (err) {
      console.error('Failed to fetch table orders:', err);
    }
  }

  // Render Menu Cards
  function renderMenu() {
    const menuContainer = document.getElementById('menuContainer');
    if (!menuContainer) return;

    const filtered = currentCategory === 'all' 
      ? menuData 
      : menuData.filter(item => item.category === currentCategory);

    if (!filtered || filtered.length === 0) {
      menuContainer.innerHTML = `
        <div style="text-align:center; padding: 40px 20px; color: #94a3b8;">
          <p style="font-size: 16px; font-weight: 600;">No items in this category right now.</p>
        </div>
      `;
      return;
    }

    menuContainer.innerHTML = filtered.map(item => {
      return `
        <div class="menu-card ${!item.available ? 'item-unavailable' : ''}">
          <div class="menu-card-img-wrap">
            <img src="${item.image}" alt="${item.name}" class="menu-card-img" loading="lazy">
            <span class="dietary-tag">${item.isVeg ? '🟢 VEG' : '🔴 NON-VEG'}</span>
          </div>
          <div class="menu-card-content">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <h4 class="menu-card-title">${item.name}</h4>
                ${item.isSpecial ? '<span style="font-size:10px; background:#fef3c7; color:#b45309; padding:2px 6px; border-radius:4px; font-weight:700;">CHEF PICK</span>' : ''}
              </div>
              <p class="menu-card-desc">${item.description}</p>
            </div>
            <div class="menu-card-footer">
              <span class="menu-card-price">₹${item.price}</span>
              ${item.available 
                ? `<button class="btn-add-item" onclick="openItemCustomizer('${item.id}')">
                    <span>+ Add</span>
                   </button>`
                : `<span style="font-size:12px; font-weight:700; color:#ef4444; background:#fee2e2; padding:4px 8px; border-radius:6px;">Sold Out</span>`
              }
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Open Customizer Modal
  window.openItemCustomizer = function(itemId) {
    const item = menuData.find(i => i.id === itemId);
    if (!item) return;

    selectedModalItem = item;
    modalQuantity = 1;
    modalCustomizations = {};

    if (item.customizations) {
      item.customizations.forEach(group => {
        if (group.options && group.options.length > 0) {
          modalCustomizations[group.name] = group.options[0].name;
        }
      });
    }

    renderCustomizerModal();
    const modal = document.getElementById('customizerModal');
    if (modal) modal.classList.add('active');
  };

  function renderCustomizerModal() {
    const item = selectedModalItem;
    if (!item) return;

    const modalBody = document.getElementById('customizerModalBody');
    const modalImg = document.getElementById('customizerModalImg');
    const modalTitle = document.getElementById('customizerModalTitle');
    const modalDesc = document.getElementById('customizerModalDesc');
    const modalQtyVal = document.getElementById('modalQtyVal');

    if (modalImg) modalImg.src = item.image;
    if (modalTitle) modalTitle.textContent = item.name;
    if (modalDesc) modalDesc.textContent = item.description;
    if (modalQtyVal) modalQtyVal.textContent = modalQuantity;

    let customHtml = '';
    if (item.customizations && item.customizations.length > 0) {
      customHtml = item.customizations.map(group => {
        return `
          <div class="customizer-section">
            <h5 class="customizer-section-title">${group.name}</h5>
            <div class="option-pill-group">
              ${group.options.map(opt => {
                const isSelected = modalCustomizations[group.name] === opt.name;
                return `
                  <button type="button" 
                    class="option-pill ${isSelected ? 'selected' : ''}" 
                    onclick="selectOption('${group.name}', '${opt.name}')">
                    <span>${opt.name}</span>
                    ${opt.price > 0 ? `<span style="color:#059669; font-weight:700;">+₹${opt.price}</span>` : ''}
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('');
    }

    modalBody.innerHTML = customHtml;
    updateCustomizerTotalPrice();
  }

  window.selectOption = function(groupName, optionName) {
    modalCustomizations[groupName] = optionName;
    renderCustomizerModal();
  };

  window.changeModalQty = function(delta) {
    modalQuantity = Math.max(1, modalQuantity + delta);
    const modalQtyVal = document.getElementById('modalQtyVal');
    if (modalQtyVal) modalQtyVal.textContent = modalQuantity;
    updateCustomizerTotalPrice();
  };

  function updateCustomizerTotalPrice() {
    if (!selectedModalItem) return;
    let basePrice = selectedModalItem.price;

    if (selectedModalItem.customizations) {
      selectedModalItem.customizations.forEach(group => {
        const chosen = modalCustomizations[group.name];
        if (chosen) {
          const opt = group.options.find(o => o.name === chosen);
          if (opt && opt.price) basePrice += opt.price;
        }
      });
    }

    const total = basePrice * modalQuantity;
    const btnAddText = document.getElementById('modalAddBtnText');
    if (btnAddText) {
      btnAddText.textContent = `Add to Order • ₹${total}`;
    }
  }

  // Add Item to Cart
  window.confirmAddToCart = function() {
    if (!selectedModalItem) return;

    const chosenOptionsList = Object.entries(modalCustomizations).map(([k, v]) => `${v}`);

    let unitPrice = selectedModalItem.price;
    if (selectedModalItem.customizations) {
      selectedModalItem.customizations.forEach(group => {
        const chosen = modalCustomizations[group.name];
        if (chosen) {
          const opt = group.options.find(o => o.name === chosen);
          if (opt && opt.price) unitPrice += opt.price;
        }
      });
    }

    cart.push({
      id: selectedModalItem.id,
      name: selectedModalItem.name,
      price: unitPrice,
      quantity: modalQuantity,
      options: chosenOptionsList,
      notes: ''
    });

    closeModal('customizerModal');
    updateCartUI();
    showToast(`Added ${modalQuantity}x ${selectedModalItem.name} to order!`, 'success');
  };

  function updateCartUI() {
    const totalCount = cart.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);

    const cartCountBadge = document.getElementById('cartCountBadge');
    if (cartCountBadge) {
      cartCountBadge.textContent = totalCount;
      cartCountBadge.style.display = totalCount > 0 ? 'flex' : 'none';
    }

    const cartBar = document.getElementById('cartBar');
    const cartBarCount = document.getElementById('cartBarCount');
    const cartBarTotal = document.getElementById('cartBarTotal');

    if (cartBar) {
      if (totalCount > 0 && (!activeOrder || ['completed', 'cancelled'].includes(activeOrder.status))) {
        cartBar.style.display = 'flex';
        if (cartBarCount) cartBarCount.textContent = `${totalCount} item${totalCount > 1 ? 's' : ''}`;
        if (cartBarTotal) cartBarTotal.textContent = `₹${subtotal}`;
      } else {
        cartBar.style.display = 'none';
      }
    }
  }

  // Open & Render Cart Sheet
  window.openCartSheet = function() {
    const cartItemsList = document.getElementById('cartItemsList');
    const cartSubtotalEl = document.getElementById('cartSubtotal');
    const cartTaxEl = document.getElementById('cartTax');
    const cartTotalEl = document.getElementById('cartTotal');
    const cartModal = document.getElementById('cartModal');

    if (!cartItemsList) return;

    if (cart.length === 0) {
      cartItemsList.innerHTML = `
        <div style="text-align: center; padding: 40px 10px; color: #94a3b8;">
          <div style="font-size: 40px; margin-bottom: 10px;">🍽️</div>
          <p style="font-weight: 600; font-size: 15px; color:#475569;">Your cart is currently empty</p>
          <p style="font-size: 13px;">Explore the menu to add delicious dishes!</p>
        </div>
      `;
      if (cartSubtotalEl) cartSubtotalEl.textContent = '₹0.00';
      if (cartTaxEl) cartTaxEl.textContent = '₹0.00';
      if (cartTotalEl) cartTotalEl.textContent = '₹0.00';
    } else {
      const subtotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
      const tax = +(subtotal * 0.05).toFixed(2); // 5% GST
      const total = +(subtotal + tax).toFixed(2);

      cartItemsList.innerHTML = cart.map((item, idx) => {
        return `
          <div style="display:flex; justify-content:space-between; align-items:center; padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
            <div style="flex:1;">
              <h5 style="font-size:14px; font-weight:700;">${item.name}</h5>
              ${item.options.length ? `<p style="font-size:12px; color:#64748b;">${item.options.join(' • ')}</p>` : ''}
              <span style="font-size:13px; font-weight:800; color:#0d5f3a;">₹${(item.price * item.quantity)}</span>
            </div>
            <div class="qty-stepper">
              <button class="qty-btn" onclick="updateCartItemQty(${idx}, -1)">-</button>
              <span class="qty-val">${item.quantity}</span>
              <button class="qty-btn" onclick="updateCartItemQty(${idx}, 1)">+</button>
            </div>
          </div>
        `;
      }).join('');

      if (cartSubtotalEl) cartSubtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
      if (cartTaxEl) cartTaxEl.textContent = `₹${tax.toFixed(2)}`;
      if (cartTotalEl) cartTotalEl.textContent = `₹${total.toFixed(2)}`;
    }

    if (cartModal) cartModal.classList.add('active');
  };

  window.updateCartItemQty = function(idx, delta) {
    if (!cart[idx]) return;
    cart[idx].quantity += delta;
    if (cart[idx].quantity <= 0) {
      cart.splice(idx, 1);
    }
    updateCartUI();
    openCartSheet();
  };

  // Submit Order to Kitchen
  window.submitOrderToKitchen = async function() {
    if (cart.length === 0 || !currentTableId) return;

    const specialNotes = document.getElementById('orderNotes')?.value || '';
    const guestName = document.getElementById('guestNameInput')?.value || `Table ${currentTableId} Guest`;
    const btnSubmit = document.getElementById('btnSubmitOrder');

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = `<span>Sending to Kitchen... 🍳</span>`;
    }

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: currentTableId,
          token: currentTableToken,
          guestName,
          notes: specialNotes,
          items: cart
        })
      });

      if (response.status === 403) {
        const errJson = await response.json();
        closeModal('cartModal');
        showSessionExpiredScreen(`Table ${currentTableId}`, errJson.message);
        return;
      }

      if (!response.ok) throw new Error('Order submission failed');

      const order = await response.json();
      activeOrder = order;
      cart = [];
      updateCartUI();
      closeModal('cartModal');

      renderTrackingView(order);
      showToast('Order successfully sent to kitchen!', 'success');
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
      console.error(err);
      showToast('Failed to place order. Please try again.', 'warning');
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `<span>Send Order to Kitchen 🚀</span>`;
      }
    }
  };

  // Tracking Screen
  function renderTrackingView(order) {
    const trackingView = document.getElementById('trackingView');
    if (!trackingView) return;

    const steps = [
      { key: 'new', label: 'Order Sent', icon: '📝' },
      { key: 'preparing', label: 'In Kitchen', icon: '🍳' },
      { key: 'ready', label: 'Ready to Serve', icon: '🛎️' },
      { key: 'served', label: 'Served', icon: '✅' }
    ];

    const currentStatusIndex = steps.findIndex(s => s.key === order.status);
    const itemsSummary = order.items.map(i => `${i.quantity}x ${i.name}`).join(', ');

    trackingView.innerHTML = `
      <div class="tracking-card">
        <div class="tracking-header">
          <span class="badge ${order.status === 'new' ? 'badge-new' : order.status === 'preparing' ? 'badge-preparing' : 'badge-ready'} order-badge-live">
            ${order.status.toUpperCase()}
          </span>
          <h3 style="font-size:20px; font-weight:800; margin-top:6px;">Order #${order.orderNumber}</h3>
          <p style="font-size:13px; color:#64748b;">Table ${order.tableId} • Placed ${new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
        </div>

        <div class="tracking-stepper">
          ${steps.map((step, idx) => {
            const isCompleted = currentStatusIndex > idx;
            const isActive = currentStatusIndex === idx;
            return `
              <div class="step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}">
                <div class="step-circle">${step.icon}</div>
                <span class="step-label">${step.label}</span>
              </div>
            `;
          }).join('')}
        </div>

        <div style="background:#f8fafc; border-radius:12px; padding:12px; margin-top:16px; text-align:left;">
          <div style="font-size:12px; font-weight:700; color:#64748b; text-transform:uppercase;">Items in this order:</div>
          <div style="font-size:13px; font-weight:600; color:#0f172a; margin-top:4px;">${itemsSummary}</div>
          ${order.notes ? `<div style="font-size:12px; color:#b45309; margin-top:4px; font-style:italic;">Note: "${order.notes}"</div>` : ''}
        </div>

        <div style="display:flex; gap:10px; margin-top:16px;">
          <button class="btn btn-secondary btn-sm" style="flex:1;" onclick="requestService('Water Request')">
            💧 Request Water
          </button>
          <button class="btn btn-secondary btn-sm" style="flex:1;" onclick="requestService('Call Waiter')">
            🙋 Call Waiter
          </button>
        </div>
      </div>
    `;

    trackingView.style.display = 'block';
  }

  // Service Request - User simply clicks button; notification sound and message go to Admin
  window.requestService = async function(type) {
    if (!currentTableId) return;

    // Subtle button click feedback on the user's button (no notification popup on user screen)
    if (window.event && window.event.currentTarget) {
      const btn = window.event.currentTarget;
      const originalHtml = btn.innerHTML;
      btn.innerHTML = `<span>✓ Sent</span>`;
      btn.style.opacity = '0.7';
      btn.disabled = true;
      setTimeout(() => {
        btn.innerHTML = originalHtml;
        btn.style.opacity = '1';
        btn.disabled = false;
      }, 2500);
    }

    try {
      await fetch('/api/service-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: currentTableId,
          type
        })
      });
    } catch (err) {
      console.error('Failed to dispatch service request to admin:', err);
    }
  };

  window.closeModal = function(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  };

  window.showToast = function(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${msg}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  };
})();
