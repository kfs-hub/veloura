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
    const previewImage = document.getElementById('previewImage');

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

    // Preview image per color palette — paste your image paths here.
    // Recommended source aspect ratio close to 4:3 (matches the preview box);
    // anything else will still display correctly since it's cropped with
    // object-fit: cover, but a 4:3-ish source will crop the least.
    const paletteImages = {
        'Veloura Classic': '/color palette/cropped_circle_image (4).png',
        'Celestial Moonlight': '/color palette/cropped_circle_image (3).png',
        'Emerald Sanctuary': '/color palette/cropped_circle_image (5).png',
        'Custom Palette': '/color palette/Gemini_Generated_Image_1dqwfz1dqwfz1dqw-removebg-preview.png'
    };

    // Update Live Preview Image
    function renderPreviewImage(paletteName) {
        const src = paletteImages[paletteName];
        if (src) {
            previewImage.src = src;
            previewImage.alt = `${paletteName} palette preview`;
            previewImage.style.opacity = '1';
        } else {
            // No path set yet for this palette — keep the box empty rather
            // than showing a broken image icon.
            previewImage.removeAttribute('src');
            previewImage.alt = `${paletteName} palette preview coming soon`;
            previewImage.style.opacity = '0';
        }
    }
    previewImage.addEventListener('error', () => {
        previewImage.style.opacity = '0';
    });

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

        renderPreviewImage(selectedPalette);
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
        submitBtnEl.addEventListener('click', function (e) {
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
