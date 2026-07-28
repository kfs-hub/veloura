/* ==========================================================================
   VELOURA DOTS - Studio Admin Dashboard Application Script
   Handles passcode auth, live commission metrics, detail modal, and product CRUD.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {

    // Auto-refresh interval (30 seconds)
    const POLL_INTERVAL_MS = 30000;
    let pollTimer = null;
    let lastKnownTotal = 0;

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
    function showToast(message) {
        const existing = document.getElementById('adminToast');
        if (existing) existing.remove();

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
        `;
        toast.textContent = message;

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
                    showToast(`✨ ${diff} new commission${diff > 1 ? 's' : ''} received!`);
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

        // Render uploaded moodboard thumbnails
        const moodboardGrid = document.getElementById('detailMoodboard');
        moodboardGrid.innerHTML = '';

        if (item.uploadedFiles && item.uploadedFiles.length > 0) {
            item.uploadedFiles.forEach(file => {
                const img = document.createElement('img');
                img.src = file.path;
                img.className = 'moodboard-thumb';
                img.alt = file.originalName;
                img.onclick = () => window.open(file.path, '_blank');
                moodboardGrid.appendChild(img);
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
            card.innerHTML = `
                <img src="${escapeHtml(p.imageUrl)}" class="admin-prod-img" alt="${escapeHtml(p.title)}">
                <div class="admin-prod-body">
                    <div class="admin-prod-title">${escapeHtml(p.title)}</div>
                    <div class="admin-prod-spec">${escapeHtml(p.surfaceType)} • ${escapeHtml(p.spec)}</div>
                    <p style="font-size:0.85rem; color: var(--text-secondary); margin-bottom: 16px;">${escapeHtml(p.blurb)}</p>
                    <button class="btn-delete-prod" data-id="${p.id}">Delete Artwork</button>
                </div>
            `;
            productsGrid.appendChild(card);
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
                            loadProducts();
                        }
                    } catch (err) {
                        console.error('Error deleting product:', err);
                    }
                }
            });
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
        const imageUrl = document.getElementById('prodImgUrl').value.trim() || 'showcase images/canvas.png';

        if (!title) return;

        try {
            const res = await fetch('/api/admin/products', {
                method: 'POST',
                headers: getAdminHeaders(),
                body: JSON.stringify({
                    title,
                    category,
                    surfaceType,
                    spec,
                    blurb,
                    imageUrl,
                    readyToShip: true
                })
            });

            const data = await res.json();

            if (data.success) {
                addProductForm.reset();
                loadProducts();
            } else {
                alert(data.message || 'Error adding product.');
            }
        } catch (err) {
            console.error('Error adding product:', err);
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
category,
    surfaceType,
    spec,
    blurb,
    imageUrl,
    readyToShip: true
                })
            });

const data = await res.json();

if (data.success) {
    addProductForm.reset();
    loadProducts();
} else {
    alert(data.message || 'Error adding product.');
}
        } catch (err) {
    console.error('Error adding product:', err);
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
