/* ==========================================================================
   VELOURA DOTS - Custom Commission Request Form & Live Estimator Script (Light Theme)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('commissionForm');
    if (!form) return;

    // Elements
    const surfaceInputs = document.querySelectorAll('input[name="surfaceType"]');
    const surfaceCards = document.querySelectorAll('.surface-radio-card');
    const surfaceRadioGrid = document.getElementById('surfaceRadioGrid');
    const sizeSelect = document.getElementById('surfaceSize');
    const paletteInputs = document.querySelectorAll('input[name="colorPalette"]');
    const paletteOptions = document.querySelectorAll('.palette-option');
    const palettePicker = document.getElementById('palettePicker');
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
        },
        'MDF Board': {
            'Small (6x6 in / 12 oz)': '$70 – $100',
            'Medium (10x10 in / 16 oz)': '$130 – $175',
            'Large (16x16 in / Large Box)': '$220 – $290',
            'Statement (24x24 in+)': '$400 – $560',
            'Custom Dimensions': 'Quote on Request'
        }
    };

    // Update Live Summary Text & Price
    function updateSummary() {
        const selectedSurface = document.querySelector('input[name="surfaceType"]:checked')?.value || '';
        const selectedSize = sizeSelect.value || '';
        const selectedPalette = document.querySelector('input[name="colorPalette"]:checked')?.value || '';
        const selectedTimeline = timelineSelect.value || '';

        summarySurface.textContent = selectedSurface || 'Not selected yet';
        summarySize.textContent = selectedSize ? selectedSize.split('(')[0].trim() : 'Not selected yet';
        summaryPalette.textContent = selectedPalette || 'Not selected yet';
        summaryTimeline.textContent = selectedTimeline || 'Not selected yet';

        // Calculate Price — only once both surface & size are chosen
        if (selectedSurface && selectedSize) {
            const priceStr = priceMatrix[selectedSurface]?.[selectedSize] || '$150 – $300';
            estimatedPrice.textContent = priceStr;
        } else {
            estimatedPrice.textContent = 'Select required options above';
        }

        if (selectedPalette) {
            renderPreviewImage(selectedPalette);
        } else {
            previewImage.removeAttribute('src');
            previewImage.alt = 'Preview of the selected surface';
            previewImage.style.opacity = '0';
        }
    }

    // Event Listeners for Controls
    surfaceCards.forEach(card => {
        card.addEventListener('click', function () {
            surfaceCards.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            const radio = this.querySelector('input');
            if (radio) radio.checked = true;
            surfaceRadioGrid?.classList.remove('field-invalid');
            updateSummary();
        });
    });

    paletteOptions.forEach(opt => {
        opt.addEventListener('click', function () {
            paletteOptions.forEach(o => o.classList.remove('active'));
            this.classList.add('active');
            const radio = this.querySelector('input');
            if (radio) radio.checked = true;
            palettePicker?.classList.remove('field-invalid');
            updateSummary();
        });
    });

    sizeSelect.addEventListener('change', function () {
        sizeSelect.classList.remove('field-invalid');
        updateSummary();
    });
    timelineSelect.addEventListener('change', function () {
        timelineSelect.classList.remove('field-invalid');
        updateSummary();
    });
    budgetSelect.addEventListener('change', function () {
        budgetSelect.classList.remove('field-invalid');
    });

    const clientNameInput = document.getElementById('clientName');
    const clientEmailInput = document.getElementById('clientEmail');
    clientNameInput?.addEventListener('input', () => clientNameInput.classList.remove('field-invalid'));
    clientEmailInput?.addEventListener('input', () => clientEmailInput.classList.remove('field-invalid'));

    // Initial render — nothing is pre-selected, so the summary starts blank
    updateSummary();

    // ----------------------------------------------------------------------
    // Required Field Validation
    // ----------------------------------------------------------------------
    // Compulsory: Surface/Item Category, Surface Size, Color Palette,
    // Budget Range, Delivery Timeline, Name, Email.
    // Everything else (vision text, reference files, Instagram) is optional.
    const requiredFieldDefs = [
        {
            groupEl: surfaceRadioGrid,
            label: 'Choose a Surface / Item Category',
            isValid: () => !!document.querySelector('input[name="surfaceType"]:checked')
        },
        {
            groupEl: sizeSelect,
            label: 'Select a Surface Size / Dimensions',
            isValid: () => !!sizeSelect.value
        },
        {
            groupEl: palettePicker,
            label: 'Choose a Signature Color Palette',
            isValid: () => !!document.querySelector('input[name="colorPalette"]:checked')
        },
        {
            groupEl: budgetSelect,
            label: 'Select a Target Budget Range',
            isValid: () => !!budgetSelect.value
        },
        {
            groupEl: timelineSelect,
            label: 'Select a Delivery Timeline',
            isValid: () => !!timelineSelect.value
        },
        {
            groupEl: clientNameInput,
            label: 'Enter Your Name',
            isValid: () => !!clientNameInput?.value.trim()
        },
        {
            groupEl: clientEmailInput,
            label: 'Enter Your Email Address',
            isValid: () => !!clientEmailInput?.value.trim()
        }
    ];

    function clearFieldErrors() {
        requiredFieldDefs.forEach(def => def.groupEl?.classList.remove('field-invalid'));
    }

    // Validates all compulsory fields, highlights any that are missing, and
    // returns the list of missing field definitions (empty array = valid).
    function validateRequiredFields() {
        clearFieldErrors();
        const missing = requiredFieldDefs.filter(def => !def.isValid());
        missing.forEach(def => def.groupEl?.classList.add('field-invalid'));
        return missing;
    }

    function focusFirstMissing(missing) {
        const first = missing[0];
        if (!first || !first.groupEl) return;
        first.groupEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (typeof first.groupEl.focus === 'function') {
            first.groupEl.focus({ preventScroll: true });
        }
    }

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
            chip.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px; margin-right:3px;" aria-hidden="true"><rect x="3" y="4" width="18" height="14" rx="1.5"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M3 15l5-5 4 4 3-3 6 6"/></svg>${file.name.substring(0, 16)}... <span style="cursor:pointer; margin-left:6px;" data-index="${index}">&times;</span>`;
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

        const activeSurface = document.querySelector('input[name="surfaceType"]:checked')?.value || '';
        const activePalette = document.querySelector('input[name="colorPalette"]:checked')?.value || '';

        const missing = validateRequiredFields();
        if (missing.length > 0) {
            alert('Please fill in all required fields before submitting:\n\n' + missing.map(m => '• ' + m.label).join('\n'));
            focusFirstMissing(missing);
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
                // Success — show ref ID from PostgreSQL
                refId.textContent = result.commission.refId;
                modalEmail.textContent = result.commission.clientEmail;
                modalIg.textContent = result.commission.clientIg || 'Not provided';
                modal.classList.add('active');
            } else {
                // Server error (e.g. PostgreSQL offline)
                console.error('[Commission] Server error:', result.message);
                alert('Submission failed: ' + (result.message || 'Database unavailable. Ensure PostgreSQL service is running.'));
            }
        } catch (err) {
            console.error('[Commission] Network/fetch error:', err);
            alert('Network Error: Could not connect to the server at http://localhost:5500.');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        }
    }

    // "Review My Order" — validate required fields then scroll to the summary card
    const proceedBtn = document.getElementById('proceedToSummary');
    if (proceedBtn) {
        proceedBtn.addEventListener('click', function () {
            const missing = validateRequiredFields();
            if (missing.length > 0) {
                alert('Please fill in all required fields before continuing:\n\n' + missing.map(m => '• ' + m.label).join('\n'));
                focusFirstMissing(missing);
                return;
            }

            // Scroll to the summary card
            const summaryCard = document.getElementById('summarySideCard');
            if (summaryCard) {
                summaryCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

                // Briefly pulse the card to draw the user's eye
                summaryCard.classList.add('summary-highlight');
                setTimeout(() => summaryCard.classList.remove('summary-highlight'), 1200);
            }
        });
    }

    // Submit button lives in the summary card (outside the <form> tag),
    // so we drive submission via a direct click handler.
    const submitBtnEl = document.getElementById('submitCommission');
    if (submitBtnEl) {
        submitBtnEl.addEventListener('click', function (e) {
            handleFormSubmit(e);
        });
    }

    // Close Modal Handler
    function closeModal() {
        modal.classList.remove('active');
        form.reset();
        uploadedFiles = [];
        renderFileChips();
        // Reset visual selection state (radio "active" classes) & clear any error highlights
        surfaceCards.forEach(c => c.classList.remove('active'));
        paletteOptions.forEach(o => o.classList.remove('active'));
        clearFieldErrors();
        updateSummary();
    }

    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalDoneBtn) modalDoneBtn.addEventListener('click', closeModal);
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    // Expose prefill function for Showcase "Order Similar" buttons.
    // Accepts either the legacy two-string signature prefillCommissionForm(surface, palette)
    // or a single options object: prefillCommissionForm({ surface, palette, size, budget, timeline })
    // so admin-defined showcase items can autofill every required field on the form.
    window.prefillCommissionForm = function (surfaceOrOptions, paletteArg) {
        const options = (typeof surfaceOrOptions === 'object' && surfaceOrOptions !== null)
            ? surfaceOrOptions
            : { surface: surfaceOrOptions, palette: paletteArg };

        const { surface, palette, size, budget, timeline } = options;

        // Find matching surface card
        if (surface) {
            surfaceCards.forEach(card => {
                const input = card.querySelector('input');
                if (input && input.value === surface) {
                    card.click();
                }
            });
        }

        // Find matching palette option
        if (palette) {
            paletteOptions.forEach(opt => {
                const paletteVal = opt.getAttribute('data-palette');
                if (paletteVal === palette) {
                    opt.click();
                }
            });
        }

        // Surface size, budget range & delivery timeline are plain <select> elements
        if (size && sizeSelect.querySelector(`option[value="${CSS.escape(size)}"]`)) {
            sizeSelect.value = size;
            sizeSelect.classList.remove('field-invalid');
        }
        if (budget && budgetSelect.querySelector(`option[value="${CSS.escape(budget)}"]`)) {
            budgetSelect.value = budget;
            budgetSelect.classList.remove('field-invalid');
        }
        if (timeline && timelineSelect.querySelector(`option[value="${CSS.escape(timeline)}"]`)) {
            timelineSelect.value = timeline;
            timelineSelect.classList.remove('field-invalid');
        }

        updateSummary();

        // Scroll to form
        const section = document.getElementById('commission');
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    };
});
