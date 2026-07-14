(function () {
    'use strict';

    let widgetCounter = 0;
    const initializedWidgets = [];

    function isDesktop() {
        return window.matchMedia('(min-width: 992px)').matches;
    }

    function createBezier(p1, p2) {
        const midX = p1.x + (p2.x - p1.x) * 0.5;
        return `M ${p1.x} ${p1.y} C ${midX} ${p1.y}, ${midX} ${p2.y}, ${p2.x} ${p2.y}`;
    }

    function initWidget(widgetEl) {
        widgetCounter += 1;
        const instanceId = `fgw-${widgetCounter}`;

        const gradRootId = `${instanceId}-grad-root`;
        const gradActiveId = `${instanceId}-grad-active`;
        widgetEl.querySelectorAll('[data-grad]').forEach(grad => {
            grad.id = grad.dataset.grad === 'root' ? gradRootId : gradActiveId;
        });

        const svg = widgetEl.querySelector('.fui-connections');
        const rootNode = widgetEl.querySelector('.fui-node-root');
        const tabs = widgetEl.querySelectorAll('.fui-card-graph[data-category]');

        // --- Streamlined panel state toggle (Animations removed from here) ---
        function showPanel(category) {
            widgetEl.querySelectorAll('.fui-l2-panel').forEach(panel => {
                if (panel.dataset.panel === category) {
                    panel.classList.remove('d-none');
                    panel.classList.add('d-flex');
                } else {
                    panel.classList.add('d-none');
                    panel.classList.remove('d-flex');
                }
            });
        }

        // --- drawConnections: Re-renders the lines based on active elements ---
        function drawConnections(instantReveal = true, hideRootLines = false) {
            if (!svg || getComputedStyle(svg).display === 'none') return;

            const defs = svg.querySelector('defs').outerHTML;
            svg.innerHTML = defs;

            const l1Nodes = widgetEl.querySelectorAll('.fui-card-graph');
            const activeL1 = widgetEl.querySelector('.fui-card-graph.active');
            const visiblePanel = widgetEl.querySelector('.fui-l2-panel:not(.d-none)');
            const l2Nodes = visiblePanel ? visiblePanel.querySelectorAll('.fui-l2-node') : [];

            const svgRect = svg.getBoundingClientRect();
            if (svgRect.width === 0 && svgRect.height === 0) return;

            function getRightCoords(el) {
                const rect = el.getBoundingClientRect();
                return { x: rect.right - svgRect.left, y: rect.top + (rect.height / 2) - svgRect.top };
            }
            function getLeftCoords(el) {
                const rect = el.getBoundingClientRect();
                return { x: rect.left - svgRect.left, y: rect.top + (rect.height / 2) - svgRect.top };
            }

            if (!rootNode) return;
            const rootCoords = getRightCoords(rootNode);
            rootCoords.x -= 20;

            // Render root lines
            l1Nodes.forEach(l1 => {
                const l1Coords = getLeftCoords(l1);
                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.setAttribute("d", createBezier(rootCoords, l1Coords));
                path.setAttribute("class", "fui-path-line fui-root-line");
                path.setAttribute("stroke", `url(#${gradRootId})`);
                svg.appendChild(path);

                if (hideRootLines) {
                    const length = path.getTotalLength();
                    path.style.strokeDasharray = length;
                    path.style.strokeDashoffset = length;
                }
            });

            // Render active L1 to L2 lines
            if (activeL1 && l2Nodes.length > 0) {
                const activeCoords = getRightCoords(activeL1);
                l2Nodes.forEach(l2 => {
                    const l2Coords = getLeftCoords(l2);
                    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    path.setAttribute("d", createBezier(activeCoords, l2Coords));
                    path.setAttribute("class", "fui-path-line fui-active-line");
                    path.setAttribute("stroke", `url(#${gradActiveId})`);
                    svg.appendChild(path);

                    if (!instantReveal) {
                        const length = path.getTotalLength();
                        path.style.strokeDasharray = length;
                        path.style.strokeDashoffset = length;
                    }
                });
            }
        }

        // --- Click Event Handlers for L1 Tabs ---
        tabs.forEach(tab => {
            tab.addEventListener('click', function () {
                if (this.classList.contains('active')) return;

                tabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');

                const category = this.dataset.category;
                showPanel(category);
                
                // Regenerate lines with active line configurations unrevealed (instantReveal = false)
                drawConnections(false, false);

                // Fetch references inside the current panel layout context
                const activeNodes = widgetEl.querySelectorAll(".fui-l2-panel:not(.d-none) .fui-l2-node");
                const activeLines = widgetEl.querySelectorAll(".fui-active-line");

                // Execute high precision cross-browser structural GSAP timeline sequence
                const tl = gsap.timeline();

                tl.fromTo(activeLines, 
                    { strokeDashoffset: (i, target) => target.getTotalLength() },
                    { strokeDashoffset: 0, duration: 0.6, ease: "power2.inOut", stagger: 0.02 }
                )
                .fromTo(activeNodes,
                    { opacity: 0, x: -20 },
                    { opacity: 1, duration: 0.35, x: 0, stagger: 0.03, ease: "power2.out" },
                    "-=0.4" // Seamlessly overlap path and node appearance animations
                );
            });
        });

        // --- INITIAL SETUP: Render Default State Statically ---
        const initialTab = widgetEl.querySelector('.fui-card-graph[data-category].active');
        if (initialTab) {
            showPanel(initialTab.dataset.category);
        }
        
        // Render all layers with fully complete opacity and static lines on page load
        drawConnections(true, false);

        // Explicitly set starting active properties instantly
        gsap.set(rootNode, { opacity: 1, y: 0 });
        gsap.set(widgetEl.querySelectorAll(".fui-card-graph"), { opacity: 1, x: 0 });
        gsap.set(widgetEl.querySelectorAll(".fui-l2-node"), { opacity: 1, x: 0 });

        // --- RESIZE LIFECYCLE MANAGEMENT ---
        if (typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(entries => {
                const box = entries[0].contentRect;
                if (box.width === 0 || box.height === 0) return;
                drawConnections(true, false);
            });
            ro.observe(widgetEl);
        }

        initializedWidgets.push({ widgetEl, drawConnections });
    }

    function initAll() {
        document.querySelectorAll('[data-graph-widget]').forEach(initWidget);

        document.addEventListener('shown.bs.tab', () => {
            initializedWidgets.forEach(w => {
                w.drawConnections(true, false);
            });
        });
    }

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            initializedWidgets.forEach(w => {
                w.drawConnections(true, false);
            });
        }, 100);
    });

    setTimeout(initAll, 100);
})();