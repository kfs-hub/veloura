/* ==========================================================================
   VELOURA DOTS - Main Application Script
   Handles showcase filtering, smooth scrolling, mobile nav, and UI interactions.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Mobile Menu Toggle
    const mobileToggle = document.getElementById('mobileToggle');
    const navMenu = document.getElementById('navMenu');

    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', function () {
            navMenu.classList.toggle('active');
            mobileToggle.classList.toggle('active');
        });

        // Close menu on link click
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                mobileToggle.classList.remove('active');
            });
        });
    }

    // ======================================================================
    // Dynamic Showcase — Fetch products from API and render cards
    // ======================================================================

    const showcaseGrid = document.getElementById('showcaseGrid');

    async function loadShowcaseProducts() {
        try {
            const res = await fetch('/api/products');
            const data = await res.json();

            if (data.success && data.products.length > 0) {
                renderShowcaseCards(data.products);
            } else {
                // Fallback: show a message if no products
                showcaseGrid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #7E8291;">
                        <p style="font-size: 1.1rem;">Showcase items are being curated. Check back soon!</p>
                    </div>
                `;
            }
        } catch (err) {
            console.error('Error loading showcase products:', err);
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // Lightbox Modal for Showcase Images on Main Website
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

    function renderShowcaseCards(products) {
        showcaseGrid.innerHTML = '';

        products.forEach(p => {
            const card = document.createElement('div');
            card.className = 'art-card';
            card.setAttribute('data-category', p.category || 'custom');

            const isCustom = p.category === 'custom';
            const buttonText = isCustom ? 'Commission Object &rarr;' : 'Order Similar &rarr;';
            const images = (p.imageUrls && p.imageUrls.length > 0) ? p.imageUrls : [p.imageUrl || 'showcase images/canvas.png'];
            const hasMultiple = images.length > 1;

            let imageAreaHtml = '';
            if (hasMultiple) {
                const sideThumbsHtml = images.map((url, idx) => `
                    <button type="button" class="side-thumb-btn ${idx === 0 ? 'active' : ''}" data-index="${idx}" title="View photo ${idx + 1}">
                        <img src="${escapeHtml(url)}" alt="${escapeHtml(p.title)} photo ${idx + 1}" class="side-thumb-img">
                    </button>
                `).join('');

                const dotsHtml = images.map((_, idx) => `<span class="carousel-dot ${idx === 0 ? 'active' : ''}" data-index="${idx}"></span>`).join('');

                const slidesHtml = images.map((url, idx) => `
                    <div class="carousel-slide">
                        <img src="${escapeHtml(url)}" alt="Hand-painted dot mandala ${escapeHtml(p.surfaceType)}" class="art-img carousel-img" style="cursor: pointer;" title="Click to view full screen" loading="lazy" data-index="${idx}">
                    </div>
                `).join('');

                imageAreaHtml = `
                    <div class="art-card-image carousel-container">
                        <div class="carousel-track">${slidesHtml}</div>
                        <button class="carousel-nav prev-btn" aria-label="Previous image">&lsaquo;</button>
                        <button class="carousel-nav next-btn" aria-label="Next image">&rsaquo;</button>
                        <div class="art-card-side-thumbs">${sideThumbsHtml}</div>
                        <div class="carousel-dots">${dotsHtml}</div>
                        <span class="surface-badge">${escapeHtml(p.surfaceType)}</span>
                        <span class="multi-photo-tag">📷 ${images.length} Photos</span>
                    </div>
                `;
            } else {
                imageAreaHtml = `
                    <div class="art-card-image">
                        <img src="${escapeHtml(images[0])}" alt="Hand-painted dot mandala ${escapeHtml(p.surfaceType)}" class="art-img" style="cursor: pointer;" title="Click to view full screen" loading="lazy">
                        <span class="surface-badge">${escapeHtml(p.surfaceType)}</span>
                    </div>
                `;
            }

            card.innerHTML = `
                ${imageAreaHtml}
                <div class="art-card-body">
                    <span class="art-category">${escapeHtml(p.categoryLabel || p.category)}</span>
                    <h3 class="art-title">${escapeHtml(p.title)}</h3>
                    <p class="art-blurb">${escapeHtml(p.blurb)}</p>
                    <div class="art-card-footer">
                        <span class="art-spec">${escapeHtml(p.spec)}</span>
                        <button class="btn-link open-commission-item" data-surface="${escapeHtml(p.surfaceType)}"
                            data-palette="${escapeHtml(p.palette)}" data-size="${escapeHtml(p.surfaceSize)}"
                            data-budget="${escapeHtml(p.budgetRange)}"
                            data-timeline="${escapeHtml(p.timelineSelect)}">${buttonText}</button>
                    </div>
                </div>
            `;

            // Lightbox handler for clicking any photo (single image or any slide in the carousel).
            // suppressClick guards against a swipe/drag also firing a click that would pop the lightbox open.
            let suppressClick = false;
            const allImgs = card.querySelectorAll('.art-img');
            allImgs.forEach(imgNode => {
                imgNode.addEventListener('click', () => {
                    if (suppressClick) return;
                    openLightbox(imgNode.src, `${p.title} (${p.surfaceType})`);
                });
            });

            if (hasMultiple) {
                let currentIndex = 0;
                const track = card.querySelector('.carousel-track');
                const prevBtn = card.querySelector('.prev-btn');
                const nextBtn = card.querySelector('.next-btn');
                const dots = card.querySelectorAll('.carousel-dot');
                const sideThumbs = card.querySelectorAll('.side-thumb-btn');
                const slideCount = images.length;

                function setTrack(percent, animate) {
                    track.style.transition = animate ? 'transform 0.38s cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
                    track.style.transform = `translateX(${percent}%)`;
                }

                function updateCarousel(newIdx) {
                    currentIndex = Math.max(0, Math.min(slideCount - 1, newIdx));
                    setTrack(-currentIndex * 100, true);
                    dots.forEach((d, i) => d.classList.toggle('active', i === currentIndex));
                    sideThumbs.forEach((t, i) => t.classList.toggle('active', i === currentIndex));
                    if (prevBtn) prevBtn.style.opacity = currentIndex === 0 ? '0' : '';
                    if (nextBtn) nextBtn.style.opacity = currentIndex === slideCount - 1 ? '0' : '';
                    if (prevBtn) prevBtn.style.pointerEvents = currentIndex === 0 ? 'none' : '';
                    if (nextBtn) nextBtn.style.pointerEvents = currentIndex === slideCount - 1 ? 'none' : '';
                }
                updateCarousel(0);

                if (prevBtn) {
                    prevBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        updateCarousel(currentIndex - 1);
                    });
                }
                if (nextBtn) {
                    nextBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        updateCarousel(currentIndex + 1);
                    });
                }
                dots.forEach(d => {
                    d.addEventListener('click', (e) => {
                        e.stopPropagation();
                        updateCarousel(parseInt(d.getAttribute('data-index'), 10));
                    });
                });
                sideThumbs.forEach(t => {
                    t.addEventListener('click', (e) => {
                        e.stopPropagation();
                        updateCarousel(parseInt(t.getAttribute('data-index'), 10));
                    });
                    t.addEventListener('mouseenter', () => {
                        updateCarousel(parseInt(t.getAttribute('data-index'), 10));
                    });
                });

                // Touch swipe support (mobile): the track follows the finger in real time while
                // dragging, then eases into place on release — like a native photo slider, not a snap-cut.
                const carouselContainer = card.querySelector('.carousel-container');
                let touchStartX = 0;
                let touchStartY = 0;
                let isDragging = false;
                let containerWidth = 1;

                carouselContainer.addEventListener('touchstart', (e) => {
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                    isDragging = false;
                    containerWidth = carouselContainer.offsetWidth || 1;
                }, { passive: true });

                carouselContainer.addEventListener('touchmove', (e) => {
                    const dx = e.touches[0].clientX - touchStartX;
                    const dy = e.touches[0].clientY - touchStartY;

                    if (!isDragging) {
                        // Only claim the gesture once horizontal intent is clear, so vertical page scroll still works
                        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
                        isDragging = true;
                        suppressClick = true;
                    }

                    let dragPercent = (dx / containerWidth) * 100;
                    // Rubber-band resistance at the first/last photo so it doesn't slide off into empty space
                    const atStart = currentIndex === 0 && dragPercent > 0;
                    const atEnd = currentIndex === slideCount - 1 && dragPercent < 0;
                    if (atStart || atEnd) dragPercent *= 0.35;

                    setTrack(-currentIndex * 100 + dragPercent, false);
                }, { passive: true });

                carouselContainer.addEventListener('touchend', (e) => {
                    if (!isDragging) return;
                    const dx = e.changedTouches[0].clientX - touchStartX;
                    const dragPercent = (dx / containerWidth) * 100;

                    if (Math.abs(dragPercent) > 16) {
                        updateCarousel(dragPercent < 0 ? currentIndex + 1 : currentIndex - 1);
                    } else {
                        setTrack(-currentIndex * 100, true);
                    }

                    isDragging = false;
                    // Let the click event that follows touchend fire and see suppressClick=true, then clear it
                    setTimeout(() => { suppressClick = false; }, 50);
                }, { passive: true });
            }

            showcaseGrid.appendChild(card);
        });

        // Re-attach filter behavior to the newly created cards
        initFilterButtons();

        // Re-attach "Order Similar" button handlers
        initCommissionButtons();

        // Trigger stagger animation for the new cards
        triggerStaggerReveal();
    }

    // ======================================================================
    // Showcase Category Filtering (works with dynamic cards)
    // ======================================================================

    function initFilterButtons() {
        const filterBtns = document.querySelectorAll('.filter-btn');
        const artCards = document.querySelectorAll('.art-card');

        filterBtns.forEach(btn => {
            // Remove old listeners by cloning
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);

            newBtn.addEventListener('click', function () {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                const filterValue = this.getAttribute('data-filter');
                const easing = 'opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
                let visibleIndex = 0;

                document.querySelectorAll('.art-card').forEach(card => {
                    const category = card.getAttribute('data-category');
                    const matches = filterValue === 'all' || category === filterValue;

                    if (matches) {
                        const delay = prefersReducedMotion ? 0 : visibleIndex * 0.05;
                        card.style.display = 'flex';
                        card.style.transition = easing;
                        card.style.transitionDelay = `${delay}s`;
                        card.style.opacity = '0';
                        card.style.transform = 'translateY(16px)';
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                                card.style.opacity = '1';
                                card.style.transform = 'translateY(0)';
                            });
                        });
                        visibleIndex++;
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });
    }

    // "Order Similar" Button Handlers in Showcase Cards
    function initCommissionButtons() {
        document.querySelectorAll('.open-commission-item').forEach(button => {
            button.addEventListener('click', function (e) {
                e.preventDefault();
                const surface = this.getAttribute('data-surface');
                const palette = this.getAttribute('data-palette');
                const size = this.getAttribute('data-size');
                const budget = this.getAttribute('data-budget');
                const timeline = this.getAttribute('data-timeline');

                if (window.prefillCommissionForm) {
                    window.prefillCommissionForm({ surface, palette, size, budget, timeline });
                }
            });
        });
    }

    // Trigger stagger reveal animation on newly loaded cards
    function triggerStaggerReveal() {
        if (prefersReducedMotion) {
            document.querySelectorAll('.art-card').forEach(card => {
                card.style.opacity = '1';
                card.style.transform = 'none';
            });
            return;
        }

        const cards = document.querySelectorAll('.art-card');
        cards.forEach((card, i) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(40px)';
            card.style.transition = `opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.1}s, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.1}s`;
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                });
            });
        });
    }

    // Load showcase products on page load
    loadShowcaseProducts();

    // Sticky Header Scroll Effect — triggers when hero section leaves the viewport
    const header = document.getElementById('siteHeader');
    const heroSection = document.getElementById('hero');
    const navLinks = document.querySelectorAll('.nav-link');

    function setScrolledState(scrolled) {
        // Freeze nav-link transitions before the class swap to prevent block artifact
        navLinks.forEach(l => l.classList.add('no-transition'));

        if (scrolled) {
            header.classList.add('scrolled');
            if (navMenu && mobileToggle) {
                navMenu.classList.remove('active');
                mobileToggle.classList.remove('active');
            }
        } else {
            header.classList.remove('scrolled');
        }

        // Re-enable transitions on the next paint so hover still animates
        requestAnimationFrame(() => {
            navLinks.forEach(l => l.classList.remove('no-transition'));
        });
    }

    if (heroSection) {
        const heroObserver = new IntersectionObserver((entries) => {
            // hero is less than 50% visible = halfway scrolled out
            setScrolledState(!entries[0].isIntersecting);
        }, {
            threshold: 0.7,
            rootMargin: '0px 0px 0px 0px'
        });
        heroObserver.observe(heroSection);
    } else {
        // Fallback for pages without a hero section
        window.addEventListener('scroll', () => {
            setScrolledState(window.scrollY > 40);
        }, { passive: true });
    }

    // ======================================================================
    // Scroll Reveal Animations (IntersectionObserver)
    // ======================================================================
    const revealElements = document.querySelectorAll('.reveal');
    const staggerContainers = document.querySelectorAll('.reveal-stagger');

    if (prefersReducedMotion) {
        revealElements.forEach(el => el.classList.add('revealed'));
        staggerContainers.forEach(el => {
            Array.from(el.children).forEach(child => {
                child.style.opacity = '1';
                child.style.transform = 'none';
            });
        });
        return;
    }

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));

    // Stagger children: each child gets .reveal and is observed individually
    const staggerObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Reveal all children with staggered delays
                const children = entry.target.children;
                Array.from(children).forEach((child, i) => {
                    child.style.opacity = '0';
                    child.style.transform = 'translateY(40px)';
                    child.style.transition = `opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.1}s, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.1}s`;
                    // Trigger reflow then animate in
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            child.style.opacity = '1';
                            child.style.transform = 'translateY(0)';
                        });
                    });
                });
                staggerObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -30px 0px'
    });

    staggerContainers.forEach(el => staggerObserver.observe(el));

    // ======================================================================
    // Magnetic Hover — primary CTAs drift gently toward the cursor
    // ======================================================================
    if (!prefersReducedMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        document.querySelectorAll('.btn-hero-outline').forEach(btn => {
            const strength = 0.25;

            btn.addEventListener('mousemove', (e) => {
                const rect = btn.getBoundingClientRect();
                const x = (e.clientX - rect.left - rect.width / 2) * strength;
                const y = (e.clientY - rect.top - rect.height / 2) * strength;
                btn.style.transform = `translate(${x}px, ${y}px)`;
            });

            btn.addEventListener('mouseleave', () => {
                btn.style.transform = '';
            });
        });
    }

});