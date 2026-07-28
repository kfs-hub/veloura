/* ==========================================================================
   VELOURA DOTS - Minimal Luxe Light Mandala Canvas Visualizer
   Draws shimmering, geometric dot mandala rings in Regal Gold, Ruby Crimson, and Charcoal over Warm Ivory.
   ========================================================================== */

(function () {
    const canvas = document.getElementById('mandalaCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width, height, centerX, centerY;
    let rotationAngle = 0;

    // Palette Colors for Light Theme
    const colors = {
        gold: '#C5A059',
        goldLight: '#D4AF37',
        ruby: '#B81D24',
        charcoal: '#1A1A1E',
        pearl: '#FFFFFF',
        subtleGold: 'rgba(197, 160, 89, 0.4)'
    };

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = canvas.offsetHeight || window.innerHeight;
        centerX = width / 2;
        centerY = height / 2;
    }

    window.addEventListener('resize', resize);
    resize();

    function drawDot(x, y, radius, color, glow = false) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        if (glow) {
            ctx.shadowColor = 'rgba(197, 160, 89, 0.4)';
            ctx.shadowBlur = radius * 2.5;
        } else {
            ctx.shadowBlur = 0;
        }
        ctx.fill();
        ctx.shadowBlur = 0; // reset
    }

    function drawRing(radius, dotCount, dotRadius, color, angleOffset = 0, glow = false) {
        for (let i = 0; i < dotCount; i++) {
            const angle = (i * Math.PI * 2) / dotCount + angleOffset;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            drawDot(x, y, dotRadius, color, glow);
        }
    }

    function drawPetalPattern(innerR, outerR, petals, color1, color2, angleOffset = 0) {
        for (let i = 0; i < petals; i++) {
            const baseAngle = (i * Math.PI * 2) / petals + angleOffset;

            for (let step = 1; step <= 4; step++) {
                const r = innerR + (outerR - innerR) * (step / 4);
                const dotR = step === 4 ? 4.5 : (3.2 - step * 0.4);
                const x = centerX + Math.cos(baseAngle) * r;
                const y = centerY + Math.sin(baseAngle) * r;
                const color = (step % 2 === 0) ? color1 : color2;
                drawDot(x, y, Math.max(dotR, 1.8), color, step === 4);
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        ctx.save();
        rotationAngle += 0.0015;

        // Dynamic scale factor for phone viewports
        const scale = Math.min(1, Math.max(0.45, width / 680));

        // Outer delicate boundary circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, 320 * scale, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(197, 160, 89, 0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Central Orb
        drawDot(centerX, centerY, 12 * scale, colors.goldLight, true);
        drawDot(centerX, centerY, 6 * scale, colors.ruby, false);

        // Ring 1 - Charcoal inner ring
        drawRing(30 * scale, 12, 2.5 * scale, colors.charcoal, rotationAngle * 0.5);

        // Ring 2 - Gold & Ruby Petals
        drawPetalPattern(40 * scale, 90 * scale, 16, colors.gold, colors.ruby, -rotationAngle);

        // Ring 3 - Ruby accent ring
        drawRing(115 * scale, 24, 3.5 * scale, colors.ruby, rotationAngle * 0.8, true);

        // Ring 4 - Outer Gold Petal Starburst
        drawPetalPattern(130 * scale, 210 * scale, 24, colors.goldLight, colors.charcoal, rotationAngle * 0.5);

        // Ring 5 - Perimeter Ruby Orbs
        drawRing(240 * scale, 32, 4.5 * scale, colors.ruby, -rotationAngle * 0.3, true);

        // Ring 6 - Outer Metallic Gold Halo
        drawRing(285 * scale, 48, 2.8 * scale, colors.gold, rotationAngle * 0.2);

        ctx.restore();

        requestAnimationFrame(animate);
    }

    animate();
})();
