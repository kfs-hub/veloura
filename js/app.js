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

    function renderShowcaseCards(products) {
        showcaseGrid.innerHTML = '';

        products.forEach(p => {
            const card = document.createElement('div');
            card.className = 'art-card';
            card.setAttribute('data-category', p.category || 'custom');

            const isCustom = p.category === 'custom';
            const buttonText = isCustom ? 'Commission Object &rarr;' : 'Order Similar &rarr;';

            card.innerHTML = `
                <div class="art-card-image">
                    <img src="${escapeHtml(p.imageUrl)}" alt="Hand-painted dot mandala ${escapeHtml(p.surfaceType)}" class="art-img">
                    <span class="surface-badge">${escapeHtml(p.surfaceType)}</span>
                </div>
                <div class="art-card-body">
                    <span class="art-category">${escapeHtml(p.categoryLabel || p.category)}</span>
                    <h3 class="art-title">${escapeHtml(p.title)}</h3>
                    <p class="art-blurb">${escapeHtml(p.blurb)}</p>
                    <div class="art-card-footer">
                        <span class="art-spec">${escapeHtml(p.spec)}</span>
                        <button class="btn-link open-commission-item" data-surface="${escapeHtml(p.surfaceType)}"
                            data-palette="${escapeHtml(p.palette)}">${buttonText}</button>
                    </div>
                </div>
            `;
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

                if (window.prefillCommissionForm) {
                    window.prefillCommissionForm(surface, palette);
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

    // Sticky Header Scroll Effect (AICM Floating Style)
    const header = document.getElementById('siteHeader');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 40) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

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
