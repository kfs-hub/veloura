/* ==========================================================================
   VELOURA DOTS - Custom Commission Request Form & Live Estimator Script (Light Theme)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('commissionForm');
    if (!form) return;

    // Elements
    const surfaceInputs = document.querySelectorAll('input[name="surfaceType"]');
    const surfaceCards = document.querySelectorAll('.surface-radio-card');
    const sizeSelect = document.getElementById('surfaceSize');
    const paletteInputs = document.querySelectorAll('input[name="colorPalette"]');
    const paletteOptions = document.querySelectorAll('.palette-option');
    const timelineSelect = document.getElementById('timelineSelect');
    const budgetSelect = document.getElementById('budgetRange');
    
    // Live Summary Elements
    const summarySurface = document.getElementById('summarySurface');
    const summarySize = document.getElementById('summarySize');
    const summaryPalette = document.getElementById('summaryPalette');
    const summaryTimeline = document.getElementById('summaryTimeline');
    const estimatedPrice = document.getElementById('estimatedPrice');
    const previewGraphic = document.getElementById('previewGraphic');

    // File Upload Elements
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const filePreviewList = document.getElementById('filePreviewList');
    let uploadedFiles = [];

    // Modal Elements
    const modal = document.getElementById('confirmationModal');
    const modalClose = document.getElementById('modalClose');
    const modalDoneBtn = document.getElementById('modalDoneBtn');
    const refId = document.getElementById('refId');
    const modalEmail = document.getElementById('modalEmail');
    const modalIg = document.getElementById('modalIg');

    // Color definitions for SVG live render (Light Theme Friendly)
    const paletteColors = {
        'Veloura Classic': { primary: '#C5A059', secondary: '#B81D24', bg: '#FAF8F5', dot: '#1A1A1E' },
        'Celestial Moonlight': { primary: '#3B82F6', secondary: '#1E1B4B', bg: '#F8FAFC', dot: '#64748B' },
        'Emerald Sanctuary': { primary: '#059669', secondary: '#D4AF37', bg: '#F0FDF4', dot: '#064E3B' },
        'Custom Palette': { primary: '#E0A98B', secondary: '#B81D24', bg: '#FAF5EC', dot: '#C5A059' }
    };

    // Estimated Pricing Table
    const priceMatrix = {
        'Canvas Art': {
            'Small (6x6 in / 12 oz)': '$95 – $140',
            'Medium (10x10 in / 16 oz)': '$185 – $240',
            'Large (16x16 in / Large Box)': '$320 – $420',
            'Statement (24x24 in+)': '$580 – $850',
            'Custom Dimensions': 'Quote on Request'
        },
        'Ceramic Mug': {
            'Small (6x6 in / 12 oz)': '$65 – $85',
            'Medium (10x10 in / 16 oz)': '$85 – $110',
            'Large (16x16 in / Large Box)': '$120 – $150',
            'Statement (24x24 in+)': '$180 – $220',
            'Custom Dimensions': 'Quote on Request'
        },
        'Stainless Bottle': {
            'Small (6x6 in / 12 oz)': '$85 – $110',
            'Medium (10x10 in / 16 oz)': '$110 – $145',
            'Large (16x16 in / Large Box)': '$150 – $190',
            'Statement (24x24 in+)': '$220 – $280',
            'Custom Dimensions': 'Quote on Request'
        },
        'Wooden Box': {
            'Small (6x6 in / 12 oz)': '$110 – $150',
            'Medium (10x10 in / 16 oz)': '$175 – $230',
            'Large (16x16 in / Large Box)': '$260 – $340',
            'Statement (24x24 in+)': '$450 – $600',
            'Custom Dimensions': 'Quote on Request'
        },
        'Custom Object': {
            'Small (6x6 in / 12 oz)': '$80 – $120',
            'Medium (10x10 in / 16 oz)': '$140 – $200',
            'Large (16x16 in / Large Box)': '$250 – $380',
            'Statement (24x24 in+)': '$480 – $750',
            'Custom Dimensions': 'Quote on Request'
        }
    };

    // Update Live Preview Graphic SVG
    function renderPreviewSVG(paletteName) {
        const theme = paletteColors[paletteName] || paletteColors['Veloura Classic'];
        previewGraphic.innerHTML = `
            <svg viewBox="0 0 160 160" width="100%" height="100%">
                <rect width="160" height="160" rx="12" fill="${theme.bg}" stroke="#C5A059" stroke-width="1" />
                <circle cx="80" cy="80" r="70" fill="none" stroke="${theme.primary}" stroke-width="1" stroke-dasharray="3 3"/>
                <circle cx="80" cy="80" r="50" fill="none" stroke="${theme.secondary}" stroke-width="1.5"/>
                <circle cx="80" cy="80" r="12" fill="${theme.primary}"/>
                
                <!-- Inner Ring -->
                <circle cx="80" cy="52" r="4.5" fill="${theme.secondary}"/>
                <circle cx="108" cy="80" r="4.5" fill="${theme.secondary}"/>
                <circle cx="80" cy="108" r="4.5" fill="${theme.secondary}"/>
                <circle cx="52" cy="80" r="4.5" fill="${theme.secondary}"/>

                <!-- Outer Petals -->
                <circle cx="100" cy="60" r="3.5" fill="${theme.dot}"/>
                <circle cx="100" cy="100" r="3.5" fill="${theme.dot}"/>
                <circle cx="60" cy="100" r="3.5" fill="${theme.dot}"/>
                <circle cx="60" cy="60" r="3.5" fill="${theme.dot}"/>

                <circle cx="80" cy="24" r="5.5" fill="${theme.primary}"/>
                <circle cx="136" cy="80" r="5.5" fill="${theme.primary}"/>
                <circle cx="80" cy="136" r="5.5" fill="${theme.primary}"/>
                <circle cx="24" cy="80" r="5.5" fill="${theme.primary}"/>
            </svg>
        `;
    }

    // Update Live Summary Text & Price
    function updateSummary() {
        const selectedSurface = document.querySelector('input[name="surfaceType"]:checked')?.value || 'Canvas Art';
        const selectedSize = sizeSelect.value;
        const selectedPalette = document.querySelector('input[name="colorPalette"]:checked')?.value || 'Veloura Classic';
        const selectedTimeline = timelineSelect.value;

        summarySurface.textContent = selectedSurface;
        summarySize.textContent = selectedSize.split('(')[0].trim();
        summaryPalette.textContent = selectedPalette;
        summaryTimeline.textContent = selectedTimeline;

        // Calculate Price
        const priceStr = priceMatrix[selectedSurface]?.[selectedSize] || '$150 – $300';
        estimatedPrice.textContent = priceStr;

        renderPreviewSVG(selectedPalette);
    }

    // Event Listeners for Controls
    surfaceCards.forEach(card => {
        card.addEventListener('click', function () {
            surfaceCards.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            const radio = this.querySelector('input');
            if (radio) radio.checked = true;
            updateSummary();
        });
    });

    paletteOptions.forEach(opt => {
        opt.addEventListener('click', function () {
            paletteOptions.forEach(o => o.classList.remove('active'));
            this.classList.add('active');
            const radio = this.querySelector('input');
            if (radio) radio.checked = true;
            updateSummary();
        });
    });

    sizeSelect.addEventListener('change', updateSummary);
    timelineSelect.addEventListener('change', updateSummary);

    // Initial render
    updateSummary();

    // Drag and Drop File Uploader
    if (dropzone && fileInput) {
        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.remove('dragover');
            });
        });

        dropzone.addEventListener('drop', (e) => {
            const files = Array.from(e.dataTransfer.files);
            handleFiles(files);
        });

        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            handleFiles(files);
        });
    }

    function handleFiles(files) {
        files.forEach(file => {
            if (!file.type.startsWith('image/')) return;
            uploadedFiles.push(file);
        });
        renderFileChips();
    }

    function renderFileChips() {
        filePreviewList.innerHTML = '';
        uploadedFiles.forEach((file, index) => {
            const chip = document.createElement('span');
            chip.className = 'file-chip';
            chip.innerHTML = `🖼️ ${file.name.substring(0, 16)}... <span style="cursor:pointer; margin-left:6px;" data-index="${index}">&times;</span>`;
            filePreviewList.appendChild(chip);
        });

        // Add delete handler
        filePreviewList.querySelectorAll('span[data-index]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                uploadedFiles.splice(idx, 1);
                renderFileChips();
            });
        });
    }

    // Form Submission & API Integration Function
    async function handleFormSubmit(e) {
        if (e) e.preventDefault();

        const nameInput = document.getElementById('clientName');
        const emailInput = document.getElementById('clientEmail');

        const name = nameInput ? nameInput.value.trim() : '';
        const email = emailInput ? emailInput.value.trim() : '';
        const ig = document.getElementById('clientIg')?.value.trim() || '';
        const visionText = document.getElementById('visionText')?.value.trim() || '';
        const surfaceSize = document.getElementById('surfaceSize')?.value || '';
        const budgetRange = document.getElementById('budgetRange')?.value || '';
        const timelineSelect = document.getElementById('timelineSelect')?.value || '';

        const activeSurface = document.querySelector('.surface-radio-card.active input')?.value || 'Canvas Art';
        const activePalette = document.querySelector('.palette-option.active input')?.value || 'Veloura Classic';

        if (!name) {
            alert('Please enter your name.');
            if (nameInput) nameInput.focus();
            return;
        }

        if (!email) {
            alert('Please enter your email address.');
            if (emailInput) emailInput.focus();
            return;
        }

        const submitBtn = document.getElementById('submitCommission');
        const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span>Submitting Request...</span>`;
        }

        // Build FormData
        const formData = new FormData();
        formData.append('clientName', name);
        formData.append('clientEmail', email);
        formData.append('clientIg', ig);
        formData.append('surfaceType', activeSurface);
        formData.append('surfaceSize', surfaceSize);
        formData.append('colorPalette', activePalette);
        formData.append('visionText', visionText);
        formData.append('budgetRange', budgetRange);
        formData.append('timelineSelect', timelineSelect);

        // Append files
        uploadedFiles.forEach(file => {
            formData.append('referenceFiles', file);
        });

        try {
            console.log('[Commission] Sending submission request to /api/commissions...');
            const response = await fetch('/api/commissions', {
                method: 'POST',
                body: formData
            });

            console.log('[Commission] Response status:', response.status);
            const result = await response.json();
            console.log('[Commission] Response body:', result);

            if (response.ok && result.success && result.commission) {
                // ✅ Success — show ref ID from PostgreSQL
                refId.textContent = result.commission.refId;
                modalEmail.textContent = result.commission.clientEmail;
                modalIg.textContent = result.commission.clientIg || 'Not provided';
                modal.classList.add('active');
            } else {
                // Server error (e.g. PostgreSQL offline)
                console.error('[Commission] Server error:', result.message);
                alert('⚠️ Submission failed: ' + (result.message || 'Database unavailable. Ensure PostgreSQL service is running.'));
            }
        } catch (err) {
            console.error('[Commission] Network/fetch error:', err);
            alert('⚠️ Network Error: Could not connect to the server at http://localhost:5500.');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        }
    }

    form.addEventListener('submit', handleFormSubmit);

    const submitBtnEl = document.getElementById('submitCommission');
    if (submitBtnEl) {
        submitBtnEl.addEventListener('click', function(e) {
            if (form.checkValidity && !form.checkValidity()) {
                form.reportValidity();
                return;
            }
            handleFormSubmit(e);
        });
    }

    // Close Modal Handler
    function closeModal() {
        modal.classList.remove('active');
        form.reset();
        uploadedFiles = [];
        renderFileChips();
        updateSummary();
    }

    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalDoneBtn) modalDoneBtn.addEventListener('click', closeModal);
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    // Expose prefill function for Showcase "Order Similar" buttons
    window.prefillCommissionForm = function (surface, palette) {
        // Find matching surface card
        surfaceCards.forEach(card => {
            const input = card.querySelector('input');
            if (input && input.value === surface) {
                card.click();
            }
        });

        // Find matching palette option
        paletteOptions.forEach(opt => {
            const paletteVal = opt.getAttribute('data-palette');
            if (paletteVal === palette) {
                opt.click();
            }
        });

        // Scroll to form
        const section = document.getElementById('commission');
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    };
});
