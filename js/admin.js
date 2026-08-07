/* ==========================================================================
   VELOURA DOTS - Studio Admin Dashboard Application Script
   Handles passcode auth, live commission metrics, detail modal, and product CRUD.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {

    // Auto-refresh interval (30 seconds)
    const POLL_INTERVAL_MS = 30000;
    let pollTimer = null;
    let lastKnownTotal = 0;

    // Human-readable labels for each showcase category value.
    // Keep this in sync with the <option> values in #prodCategory / #editProdCategory
    // and the data-filter buttons on the public homepage gallery.
    const CATEGORY_LABELS = {
        canvas: 'Canvases & Wall Art',
        drinkware: 'Mugs & Drinkware',
        boxes: 'Keepsake Boxes & Decor',
        mdf: 'MDF Boards & Decor',
        custom: 'Custom Items'
    };

    const PASSCODE_KEY = 'veloura_admin_passcode';
    let currentPasscode = sessionStorage.getItem(PASSCODE_KEY) || '';
    let commissionsData = [];
    let productsData = [];
    let activeCommissionId = null;

    // UI Elements
    const authGate = document.getElementById('authGate');
    const authForm = document.getElementById('authForm');
    const passcodeInput = document.getElementById('passcodeInput');
    const authError = document.getElementById('authError');
    const logoutBtn = document.getElementById('logoutBtn');

    const metricTotal = document.getElementById('metricTotal');
    const metricPending = document.getElementById('metricPending');
    const metricInProgress = document.getElementById('metricInProgress');
    const metricCompleted = document.getElementById('metricCompleted');

    const searchFilter = document.getElementById('searchFilter');
    const statusFilter = document.getElementById('statusFilter');
    const commissionsTbody = document.getElementById('commissionsTbody');

    const detailModal = document.getElementById('detailModal');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const modalStatusSelect = document.getElementById('modalStatusSelect');
    const updateStatusBtn = document.getElementById('updateStatusBtn');

    const addProductForm = document.getElementById('addProductForm');
    const productsGrid = document.getElementById('productsGrid');

    // Edit modal elements
    const editProductModal = document.getElementById('editProductModal');
    const editProductForm = document.getElementById('editProductForm');
    const editModalCloseBtn = document.getElementById('editModalCloseBtn');
    const editCancelBtn = document.getElementById('editCancelBtn');

    // Init Auth
    if (currentPasscode) {
        verifyAndLoadData(currentPasscode);
    }

    authForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const code = passcodeInput.value.trim();
        verifyAndLoadData(code);
    });

    logoutBtn.addEventListener('click', function () {
        sessionStorage.removeItem(PASSCODE_KEY);
        currentPasscode = '';
        if (pollTimer) clearInterval(pollTimer);
        authGate.classList.remove('hidden');
        passcodeInput.value = '';
    });

    // Manual Refresh button
    document.addEventListener('click', function (e) {
        if (e.target && e.target.id === 'refreshBtn') {
            e.target.textContent = '↻ Refreshing...';
            loadCommissions().then(() => {
                e.target.innerHTML = '↻ Refresh';
            });
        }
    });

    async function verifyAndLoadData(code) {
        try {
            const res = await fetch('/api/admin/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ passcode: code })
            });
            const data = await res.json();

            if (data.success) {
                currentPasscode = code;
                sessionStorage.setItem(PASSCODE_KEY, code);
                authGate.classList.add('hidden');
                authError.style.display = 'none';
                loadCommissions();
                loadProducts();
                startAutoPoll();
            } else {
                authError.style.display = 'block';
            }
        } catch (err) {
            console.error('Auth error:', err);
            authError.style.display = 'block';
        }
    }

    // Auto-poll: silently re-fetch commissions every 30s
    function startAutoPoll() {
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = setInterval(async () => {
            await loadCommissions(true); // silent = true
        }, POLL_INTERVAL_MS);
    }

    // Toast notification for new orders
    function showToast(message, type = 'info') {
        const existing = document.getElementById('adminToast');
        if (existing) existing.remove();

        const toastIcons = {
            success: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg>',
            delete: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></svg>',
            info: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.5 21c1-4.5 3.5-9.5 3.5-13a4 4 0 0 0-8 0c0 1 .3 2 .8 3"/><path d="M13 8a4 4 0 0 1 4 4c0 3-2 6-3 9"/></svg>'
        };

        const toast = document.createElement('div');
        toast.id = 'adminToast';
        toast.style.cssText = `
            position: fixed; bottom: 28px; right: 28px; z-index: 99999;
            background: #1A1A1E; color: #FFFFFF;
            padding: 14px 22px; border-radius: 10px;
            font-size: 0.9rem; font-weight: 600;
            border-left: 4px solid #C5A059;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2);
            animation: slideInToast 0.3s ease;
            display: flex; align-items: center; gap: 10px;
        `;
        toast.innerHTML = `<span style="color:#C5A059; display:flex; flex-shrink:0;">${toastIcons[type] || toastIcons.info}</span><span>${escapeHtml(message)}</span>`;

        // Add animation
        if (!document.getElementById('toastStyle')) {
            const style = document.createElement('style');
            style.id = 'toastStyle';
            style.textContent = '@keyframes slideInToast { from { opacity:0; transform: translateY(16px); } to { opacity:1; transform: translateY(0); } }';
            document.head.appendChild(style);
        }

        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    // Helper Headers with Admin Passcode
    function getAdminHeaders() {
        return {
            'Content-Type': 'application/json',
            'x-admin-passcode': currentPasscode
        };
    }

    // Fetch Commissions & Populate UI
    async function loadCommissions(silent = false) {
        try {
            const res = await fetch('/api/admin/commissions', {
                headers: getAdminHeaders()
            });
            const data = await res.json();

            if (data.success) {
                const newTotal = data.metrics.total;

                // Notify if new commissions arrived during auto-poll
                if (silent && newTotal > lastKnownTotal && lastKnownTotal > 0) {
                    const diff = newTotal - lastKnownTotal;
                    showToast(`${diff} new commission${diff > 1 ? 's' : ''} received!`, 'success');
                }
                lastKnownTotal = newTotal;

                commissionsData = data.commissions;

                // Update Metrics
                metricTotal.textContent = data.metrics.total;
                metricPending.textContent = data.metrics.pending;
                metricInProgress.textContent = data.metrics.inProgress;
                metricCompleted.textContent = data.metrics.completed;

                renderCommissionsTable();

                // Show last updated time
                const refreshEl = document.getElementById('lastRefreshed');
                if (refreshEl) {
                    refreshEl.textContent = 'Last updated: ' + new Date().toLocaleTimeString();
                }
            }
        } catch (err) {
            console.error('Error loading commissions:', err);
        }
    }

    // Render Commissions Data Table
    function renderCommissionsTable() {
        const query = searchFilter.value.toLowerCase().trim();
        const statusVal = statusFilter.value;

        const filtered = commissionsData.filter(c => {
            const matchesQuery = !query ||
                c.refId.toLowerCase().includes(query) ||
                c.clientName.toLowerCase().includes(query) ||
                c.clientEmail.toLowerCase().includes(query) ||
                (c.clientIg && c.clientIg.toLowerCase().includes(query)) ||
                c.surfaceType.toLowerCase().includes(query);

            const matchesStatus = statusVal === 'ALL' || c.status === statusVal;

            return matchesQuery && matchesStatus;
        });

        commissionsTbody.innerHTML = '';

        if (filtered.length === 0) {
            commissionsTbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center; padding: 40px; color: var(--text-muted);">
                        No commission inquiries found.
                    </td>
                </tr>
            `;
            return;
        }

        filtered.forEach(c => {
            const dateStr = new Date(c.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong style="color: var(--gold-dark);">${c.refId}</strong></td>
                <td>${dateStr}</td>
                <td><strong>${escapeHtml(c.clientName)}</strong></td>
                <td>
                    <div>${escapeHtml(c.clientEmail)}</div>
                    <div style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(c.clientIg || 'No IG')}</div>
                </td>
                <td>${escapeHtml(c.surfaceType)} <br><span style="font-size:0.75rem; color: var(--text-muted);">${escapeHtml(c.surfaceSize)}</span></td>
                <td>${escapeHtml(c.budgetRange)}</td>
                <td><span class="status-badge status-${c.status}">${c.status.replace('_', ' ')}</span></td>
                <td>
                    <button class="btn-inspect" data-id="${c.id}">Inspect &rarr;</button>
                </td>
            `;
            commissionsTbody.appendChild(tr);
        });

        // Add inspect click listeners
        commissionsTbody.querySelectorAll('.btn-inspect').forEach(btn => {
            btn.addEventListener('click', function () {
                const id = this.getAttribute('data-id');
                openDetailModal(id);
            });
        });
    }

    // Filter listeners
    searchFilter.addEventListener('input', renderCommissionsTable);
    statusFilter.addEventListener('change', renderCommissionsTable);

    // =========================================================================
    // LIGHTBOX IMAGE EXPANDER (MOODBOARDS & SHOWCASE)
    // =========================================================================

    const lightboxModal = document.getElementById('lightboxModal');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxCaption = document.getElementById('lightboxCaption');
    const lightboxCloseBtn = document.getElementById('lightboxCloseBtn');

    function openLightbox(src, captionText = '') {
        if (!lightboxModal || !lightboxImg) return;
        lightboxImg.src = src;
        if (lightboxCaption) lightboxCaption.textContent = captionText;
        lightboxModal.classList.add('active');
    }

    function closeLightbox() {
        if (lightboxModal) lightboxModal.classList.remove('active');
    }

    if (lightboxCloseBtn) lightboxCloseBtn.addEventListener('click', closeLightbox);
    if (lightboxModal) {
        lightboxModal.addEventListener('click', (e) => {
            if (e.target === lightboxModal || e.target.classList.contains('lightbox-content')) {
                closeLightbox();
            }
        });
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightboxModal && lightboxModal.classList.contains('active')) {
            closeLightbox();
        }
    });

    // Detail Modal Inspection
    function openDetailModal(id) {
        const item = commissionsData.find(c => c.id === id);
        if (!item) return;

        activeCommissionId = item.id;
        document.getElementById('detailRef').textContent = item.refId;
        document.getElementById('detailClientName').textContent = item.clientName;
        document.getElementById('detailEmail').textContent = item.clientEmail;
        document.getElementById('detailIg').textContent = item.clientIg || 'Not provided';
        document.getElementById('detailSurface').textContent = `${item.surfaceType} (${item.surfaceSize})`;
        document.getElementById('detailPalette').textContent = `${item.colorPalette} (${item.budgetRange})`;
        document.getElementById('detailVision').textContent = item.visionText || 'No custom vision text provided.';
        modalStatusSelect.value = item.status;

        // Render uploaded moodboard thumbnails with click-to-expand Lightbox
        const moodboardGrid = document.getElementById('detailMoodboard');
        moodboardGrid.innerHTML = '';

        if (item.uploadedFiles && item.uploadedFiles.length > 0) {
            item.uploadedFiles.forEach(file => {
                const wrap = document.createElement('div');
                wrap.className = 'moodboard-thumb-wrap';

                const img = document.createElement('img');
                img.src = file.path;
                img.className = 'moodboard-thumb';
                img.alt = file.originalName || 'Attached Moodboard File';
                img.title = 'Click to expand image';

                const zoomBadge = document.createElement('span');
                zoomBadge.className = 'thumb-zoom-icon';
                zoomBadge.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px; margin-right:3px;" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.35-4.35"/></svg>Zoom';

                wrap.appendChild(img);
                wrap.appendChild(zoomBadge);
                wrap.onclick = () => openLightbox(file.path, `${file.originalName || 'Moodboard File'} (${item.clientName})`);
                moodboardGrid.appendChild(wrap);
            });
        } else {
            moodboardGrid.innerHTML = `<span style="font-size: 0.85rem; color: var(--text-muted);">No reference files attached.</span>`;
        }

        detailModal.classList.add('active');
    }

    modalCloseBtn.addEventListener('click', () => detailModal.classList.remove('active'));
    detailModal.addEventListener('click', (e) => {
        if (e.target === detailModal) detailModal.classList.remove('active');
    });

    // Update Status Handler
    updateStatusBtn.addEventListener('click', async function () {
        if (!activeCommissionId) return;

        const newStatus = modalStatusSelect.value;
        try {
            const res = await fetch(`/api/admin/commissions/${activeCommissionId}/status`, {
                method: 'PUT',
                headers: getAdminHeaders(),
                body: JSON.stringify({ status: newStatus })
            });

            const data = await res.json();

            if (data.success) {
                detailModal.classList.remove('active');
                loadCommissions(); // refresh table & metrics
            } else {
                alert(data.message || 'Failed to update status.');
            }
        } catch (err) {
            console.error('Error updating status:', err);
        }
    });

    // Tab Navigation Switcher
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            this.classList.add('active');
            const targetId = this.getAttribute('data-tab');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // =========================================================================
    // PRODUCTS / SHOWCASE INVENTORY
    // =========================================================================

    // Load Products
    async function loadProducts() {
        try {
            const res = await fetch('/api/products');
            const data = await res.json();

            if (data.success) {
                productsData = data.products;
                renderProductsGrid();
            }
        } catch (err) {
            console.error('Error loading products:', err);
        }
    }

    function renderProductsGrid() {
        productsGrid.innerHTML = '';

        productsData.forEach(p => {
            const card = document.createElement('div');
            card.className = 'admin-prod-card';
            const imgCount = (p.imageUrls && p.imageUrls.length > 0) ? p.imageUrls.length : (p.imageUrl ? 1 : 0);
            const badgeHtml = imgCount > 1 ? `<span class="img-count-badge"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px; margin-right:3px;" aria-hidden="true"><path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3"/></svg>${imgCount} Photos</span>` : '';

            card.innerHTML = `
                <div class="admin-prod-img-wrap">
                    <img src="${escapeHtml(p.imageUrl)}" class="admin-prod-img" alt="${escapeHtml(p.title)}" title="Click to expand image" style="cursor: pointer;">
                    ${badgeHtml}
                </div>
                <div class="admin-prod-body">
                    <div class="admin-prod-title">${escapeHtml(p.title)}</div>
                    <div class="admin-prod-spec">${escapeHtml(p.surfaceType)} • ${escapeHtml(p.spec)}</div>
                    <p style="font-size:0.85rem; color: var(--text-secondary); margin-bottom: 16px;">${escapeHtml(p.blurb)}</p>
                    <div class="admin-prod-actions">
                        <button class="btn-edit-prod" data-id="${p.id}"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px; margin-right:4px;" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>Edit</button>
                        <button class="btn-delete-prod" data-id="${p.id}">Delete Artwork</button>
                    </div>
                </div>
            `;

            const imgEl = card.querySelector('.admin-prod-img');
            if (imgEl) {
                const captionText = (p.imageUrls && p.imageUrls.length > 1) ? `${p.title} (1 of ${p.imageUrls.length} photos)` : `${p.title} (${p.surfaceType})`;
                imgEl.onclick = () => openLightbox(p.imageUrl, captionText);
            }

            productsGrid.appendChild(card);
        });

        // Add Edit Listeners
        productsGrid.querySelectorAll('.btn-edit-prod').forEach(btn => {
            btn.addEventListener('click', function () {
                const id = this.getAttribute('data-id');
                openEditModal(id);
            });
        });

        // Add Delete Listeners
        productsGrid.querySelectorAll('.btn-delete-prod').forEach(btn => {
            btn.addEventListener('click', async function () {
                const id = this.getAttribute('data-id');
                if (confirm('Are you sure you want to remove this item from the showcase?')) {
                    try {
                        const res = await fetch(`/api/admin/products/${id}`, {
                            method: 'DELETE',
                            headers: getAdminHeaders()
                        });
                        const data = await res.json();
                        if (data.success) {
                            showToast('Artwork removed from showcase.', 'delete');
                            loadProducts();
                        }
                    } catch (err) {
                        console.error('Error deleting product:', err);
                    }
                }
            });
        });
    }

    // =========================================================================
    // EDIT PRODUCT MODAL (MULTI-IMAGE SUPPORT)
    // =========================================================================

    let existingEditUrls = [];
    let selectedEditFiles = [];

    function openEditModal(id) {
        const product = productsData.find(p => p.id === id);
        if (!product) return;

        // Populate form fields with current product data
        document.getElementById('editProdId').value = product.id;
        document.getElementById('editProdTitle').value = product.title || '';
        document.getElementById('editProdCategory').value = product.category || 'canvas';
        document.getElementById('editProdSurface').value = product.surfaceType || '';
        document.getElementById('editProdSpec').value = product.spec || '';
        document.getElementById('editProdBlurb').value = product.blurb || '';
        document.getElementById('editProdImgUrl').value = product.imageUrl || '';
        
        const fileInput = document.getElementById('editProdImgFile');
        if (fileInput) fileInput.value = '';

        existingEditUrls = (product.imageUrls && product.imageUrls.length > 0) ? [...product.imageUrls] : (product.imageUrl ? [product.imageUrl] : []);
        selectedEditFiles = [];

        renderEditFilePreviews();
        document.getElementById('editModalTitle').textContent = product.title;
        editProductModal.classList.add('active');
    }

    function closeEditModal() {
        editProductModal.classList.remove('active');
    }

    // Close edit modal handlers
    editModalCloseBtn.addEventListener('click', closeEditModal);
    editCancelBtn.addEventListener('click', closeEditModal);
    editProductModal.addEventListener('click', (e) => {
        if (e.target === editProductModal) closeEditModal();
    });

    const editProdImgFileInput = document.getElementById('editProdImgFile');
    if (editProdImgFileInput) {
        editProdImgFileInput.addEventListener('change', function () {
            selectedEditFiles = Array.from(this.files);
            renderEditFilePreviews();
        });
    }

    function renderEditFilePreviews() {
        const container = document.getElementById('editImgPreviews');
        if (!container) return;
        container.innerHTML = '';
        if (existingEditUrls.length === 0 && selectedEditFiles.length === 0) {
            container.style.display = 'none';
            return;
        }
        container.style.display = 'flex';

        // Render existing URLs
        existingEditUrls.forEach((url, index) => {
            const item = document.createElement('div');
            item.className = 'img-thumb-item';
            item.innerHTML = `
                <img src="${escapeHtml(url)}" class="img-thumb-img" alt="Existing ${index + 1}">
                <button type="button" class="img-thumb-remove" title="Remove image">&times;</button>
            `;
            item.querySelector('.img-thumb-remove').onclick = function () {
                existingEditUrls.splice(index, 1);
                renderEditFilePreviews();
            };
            container.appendChild(item);
        });

        // Render new file previews
        selectedEditFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = function (e) {
                const item = document.createElement('div');
                item.className = 'img-thumb-item';
                item.innerHTML = `
                    <img src="${e.target.result}" class="img-thumb-img" alt="New ${index + 1}">
                    <button type="button" class="img-thumb-remove" title="Remove image">&times;</button>
                `;
                item.querySelector('.img-thumb-remove').onclick = function () {
                    selectedEditFiles.splice(index, 1);
                    renderEditFilePreviews();
                };
                container.appendChild(item);
            };
            reader.readAsDataURL(file);
        });
    }

    // Client-side Image Compression Helper (Prevents Vercel 4.5MB payload limits)
    function compressImageFile(file, maxWidth = 1600, maxHeight = 1600, quality = 0.85) {
        return new Promise((resolve) => {
            if (!file || !file.type.startsWith('image/') || file.size < 400 * 1024) {
                return resolve(file);
            }
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth || height > maxHeight) {
                        if (width / height > maxWidth / maxHeight) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        } else {
                            width = Math.round((width * maxHeight) / height);
                            height = maxHeight;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        if (!blob || blob.size >= file.size) {
                            return resolve(file);
                        }
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });
                        resolve(compressedFile);
                    }, 'image/jpeg', quality);
                };
                img.onerror = () => resolve(file);
            };
            reader.onerror = () => resolve(file);
        });
    }

    // Save Edit Form
    editProductForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const id = document.getElementById('editProdId').value;
        const title = document.getElementById('editProdTitle').value.trim();
        const category = document.getElementById('editProdCategory').value;
        const surfaceType = document.getElementById('editProdSurface').value.trim();
        const spec = document.getElementById('editProdSpec').value.trim();
        const blurb = document.getElementById('editProdBlurb').value.trim();
        const imageUrl = document.getElementById('editProdImgUrl').value.trim();

        if (!title) {
            alert('Artwork title is required.');
            return;
        }

        const saveBtn = document.getElementById('saveEditBtn');
        saveBtn.textContent = 'Optimizing & Saving...';
        saveBtn.disabled = true;

        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('category', category);
            formData.append('categoryLabel', CATEGORY_LABELS[category] || category);
            formData.append('surfaceType', surfaceType);
            formData.append('spec', spec);
            formData.append('blurb', blurb);
            if (imageUrl) formData.append('imageUrl', imageUrl);
            formData.append('existingImageUrls', JSON.stringify(existingEditUrls));

            for (const file of selectedEditFiles) {
                const compressed = await compressImageFile(file);
                formData.append('productImages', compressed);
            }

            const res = await fetch(`/api/admin/products/${id}`, {
                method: 'PUT',
                headers: {
                    'x-admin-passcode': currentPasscode
                },
                body: formData
            });

            let data;
            try {
                data = await res.json();
            } catch (jErr) {
                const errText = await res.text().catch(() => '');
                throw new Error(`Server returned HTTP ${res.status}: ${errText || 'Response parse error'}`);
            }

            if (res.ok && data.success) {
                closeEditModal();
                showToast('Artwork updated successfully!', 'success');
                loadProducts(); // refresh the grid
            } else {
                alert(data.message || `Error updating product (Status ${res.status}).`);
            }
        } catch (err) {
            console.error('Error updating product:', err);
            alert(`Save failed: ${err.message || 'Network connection issue'}.`);
        } finally {
            saveBtn.textContent = 'Save Changes';
            saveBtn.disabled = false;
        }
    });

    // =========================================================================
    // ADD PRODUCT FORM (MULTI-IMAGE SUPPORT)
    // =========================================================================

    let selectedAddFiles = [];
    const prodImgFileInput = document.getElementById('prodImgFile');
    const addImgPreviews = document.getElementById('addImgPreviews');

    if (prodImgFileInput) {
        prodImgFileInput.addEventListener('change', function () {
            selectedAddFiles = Array.from(this.files);
            renderAddFilePreviews();
        });
    }

    function renderAddFilePreviews() {
        if (!addImgPreviews) return;
        addImgPreviews.innerHTML = '';
        if (selectedAddFiles.length === 0) {
            addImgPreviews.style.display = 'none';
            return;
        }
        addImgPreviews.style.display = 'flex';

        selectedAddFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = function (e) {
                const item = document.createElement('div');
                item.className = 'img-thumb-item';
                item.innerHTML = `
                    <img src="${e.target.result}" class="img-thumb-img" alt="Preview ${index + 1}">
                    <button type="button" class="img-thumb-remove" title="Remove image">&times;</button>
                `;
                item.querySelector('.img-thumb-remove').onclick = function () {
                    selectedAddFiles.splice(index, 1);
                    renderAddFilePreviews();
                };
                addImgPreviews.appendChild(item);
            };
            reader.readAsDataURL(file);
        });
    }

    // Add Product Form Submit
    addProductForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const title = document.getElementById('prodTitle').value.trim();
        const category = document.getElementById('prodCategory').value;
        const surfaceType = document.getElementById('prodSurface').value.trim() || 'Canvas Art';
        const spec = document.getElementById('prodSpec').value.trim() || 'Custom Spec';
        const blurb = document.getElementById('prodBlurb').value.trim();
        const imageUrl = document.getElementById('prodImgUrl').value.trim();

        if (!title) return;

        const saveBtn = document.getElementById('saveProdBtn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Optimizing & Publishing...';

        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('category', category);
            formData.append('categoryLabel', CATEGORY_LABELS[category] || category);
            formData.append('surfaceType', surfaceType);
            formData.append('spec', spec);
            formData.append('blurb', blurb);
            if (imageUrl) formData.append('imageUrl', imageUrl);
            formData.append('readyToShip', 'true');

            for (const file of selectedAddFiles) {
                const compressed = await compressImageFile(file);
                formData.append('productImages', compressed);
            }

            const res = await fetch('/api/admin/products', {
                method: 'POST',
                headers: {
                    'x-admin-passcode': currentPasscode
                },
                body: formData
            });

            let data;
            try {
                data = await res.json();
            } catch (jErr) {
                const errText = await res.text().catch(() => '');
                throw new Error(`Server returned HTTP ${res.status}: ${errText || 'Response parse error'}`);
            }

            if (res.ok && data.success) {
                addProductForm.reset();
                selectedAddFiles = [];
                renderAddFilePreviews();
                showToast('New artwork published to showcase!', 'success');
                loadProducts();
            } else {
                alert(data.message || `Error adding product (Status ${res.status}).`);
            }
        } catch (err) {
            console.error('Error adding product:', err);
            alert(`Publish failed: ${err.message || 'Network connection issue'}.`);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Publish Artwork';
        }
    });

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
});
