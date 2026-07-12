(function () {
    'use strict';

    let widgetCounter = 0;
    const initializedWidgets = [];

    function createBezier(p1, p2) {
        const midX = p1.x + (p2.x - p1.x) * 0.5;
        return `M ${p1.x} ${p1.y} C ${midX} ${p1.y}, ${midX} ${p2.y}, ${p2.x} ${p2.y}`;
    }

    function initWidget(widgetEl) {
        widgetCounter += 1;
        const instanceId = `fgw-${widgetCounter}`;

        // --- 1. Namespace the two SVG gradients so multiple widgets never
        //         share/collide on #grad-root / #grad-active ---
        const gradRootId = `${instanceId}-grad-root`;
        const gradActiveId = `${instanceId}-grad-active`;
        widgetEl.querySelectorAll('[data-grad]').forEach(grad => {
            grad.id = grad.dataset.grad === 'root' ? gradRootId : gradActiveId;
        });

        // --- 2. Scoped element refs for this widget instance only ---
        const svg = widgetEl.querySelector('.fui-connections');
        const rootNode = widgetEl.querySelector('.fui-node-root');
        const tabs = widgetEl.querySelectorAll('.fui-card-graph[data-category]');

        function showPanel(category) {
            widgetEl.querySelectorAll('.fui-l2-panel').forEach(panel => {
                if (panel.dataset.panel === category) {
                    panel.classList.remove('d-none');
                    panel.classList.add('d-flex');

                    // Restart the CSS entrance animation (fui-panel-in) on every
                    // switch. Removing then re-adding the class in the same tick
                    // gets batched by the browser, so force a reflow in between
                    // or the animation silently won't replay on repeat clicks.
                    panel.classList.remove('fui-panel-enter');
                    void panel.offsetWidth;
                    panel.classList.add('fui-panel-enter');
                } else {
                    panel.classList.add('d-none');
                    panel.classList.remove('d-flex', 'fui-panel-enter');
                }
            });
        }

        function drawConnections() {
            if (!svg || getComputedStyle(svg).display === 'none') return;

            const defs = svg.querySelector('defs').outerHTML;
            svg.innerHTML = defs;

            const l1Nodes = widgetEl.querySelectorAll('.fui-card-graph');
            const activeL1 = widgetEl.querySelector('.fui-card-graph.active');
            const visiblePanel = widgetEl.querySelector('.fui-l2-panel:not(.d-none)');
            const l2Nodes = visiblePanel ? visiblePanel.querySelectorAll('.fui-l2-node') : [];

            const svgRect = svg.getBoundingClientRect();

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

            l1Nodes.forEach(l1 => {
                const l1Coords = getLeftCoords(l1);
                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.setAttribute("d", createBezier(rootCoords, l1Coords));
                path.setAttribute("class", "fui-path-line fui-root-line");
                path.setAttribute("stroke", `url(#${gradRootId})`);
                svg.appendChild(path);
            });

            if (activeL1 && l2Nodes.length > 0) {
                const activeCoords = getRightCoords(activeL1);
                l2Nodes.forEach(l2 => {
                    const l2Coords = getLeftCoords(l2);
                    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    path.setAttribute("d", createBezier(activeCoords, l2Coords));
                    path.setAttribute("class", "fui-path-line fui-active-line");
                    path.setAttribute("stroke", `url(#${gradActiveId})`);
                    svg.appendChild(path);

                    const length = path.getTotalLength();
                    path.style.strokeDasharray = length;
                    path.style.strokeDashoffset = length;
                });
            }
        }

        // --- 4. Tab click logic (category tabs only -- e.g. "Who I am"
        //         has no data-category and just opens its modal via
        //         Bootstrap's data-api, untouched by this logic) ---
        tabs.forEach(tab => {
            tab.addEventListener('click', function () {
                if (this.classList.contains('active')) return;

                tabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');

                const category = this.dataset.category;
                showPanel(category);
                drawConnections();

                gsap.fromTo(
                    widgetEl.querySelectorAll(".fui-l2-panel:not(.d-none) .fui-l2-node"),
                    { opacity: 0, x: -30 },
                    { opacity: 1, duration: 0.4, x: 0, stagger: 0.03, ease: "power2.out" }
                );

                gsap.fromTo(
                    widgetEl.querySelectorAll(".fui-active-line"),
                    { strokeDashoffset: (i, target) => target.getTotalLength() },
                    { strokeDashoffset: 0, duration: 0.8, ease: "power2.inOut", stagger: 0.02 }
                );
            });
        });

        // --- 5. Initial load animation for this widget ---
        const initialTab = widgetEl.querySelector('.fui-card-graph[data-category].active');
        if (initialTab) {
            showPanel(initialTab.dataset.category);
        }
        drawConnections();

        const tl = gsap.timeline();

        widgetEl.querySelectorAll('.fui-root-line').forEach(path => {
            const len = path.getTotalLength();
            path.style.strokeDasharray = len;
            path.style.strokeDashoffset = len;
        });

        tl.to(rootNode, { opacity: 1, duration: 0.6, y: 0, ease: "power2.out" })
            .to(widgetEl.querySelectorAll(".fui-root-line"), { strokeDashoffset: 0, duration: 0.8, ease: "power2.inOut", stagger: 0.1 }, "-=0.2")
            .to(widgetEl.querySelectorAll(".fui-card-graph"), { opacity: 1, duration: 0.5, x: 0, stagger: 0.1, ease: "back.out(1.7)" }, "-=0.6")
            .to(widgetEl.querySelectorAll(".fui-active-line"), { strokeDashoffset: 0, duration: 0.8, ease: "power2.inOut", stagger: 0.02 }, "-=0.2")
            .fromTo(widgetEl.querySelectorAll(".fui-l2-panel:not(.d-none) .fui-l2-node"), { opacity: 0, x: -20 }, { opacity: 1, duration: 0.4, x: 0, stagger: 0.03, ease: "power1.out" }, "-=0.8");

        initializedWidgets.push({ widgetEl, drawConnections });
    }

    function initAll() {
        document.querySelectorAll('[data-graph-widget]').forEach(initWidget);
    }

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            initializedWidgets.forEach(w => w.drawConnections());
        }, 100);
    });

    setTimeout(initAll, 100);
})();