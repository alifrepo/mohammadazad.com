const svg = document.getElementById('connections');

// Bootstrap Modal instance
const detailModalEl = document.getElementById('detailModal');
const detailModal = new bootstrap.Modal(detailModalEl);

// 1. Wire up click-to-open-modal on every static L2 item, once, on load
//    (items are static now, not regenerated, so listeners only need binding once)
function bindL2Modals() {
    document.querySelectorAll('.fui-l2-node').forEach(node => {
        node.addEventListener('click', function () {
            const panel = this.closest('.fui-l2-panel');
            const category = panel ? panel.dataset.panel : '';

            document.getElementById('modal-title').innerText = this.dataset.name;
            document.getElementById('modal-category').innerText = category;
            document.getElementById('modal-gaps').innerText = this.dataset.gap;

            detailModal.show();
        });
    });
}

// 2. Show the static panel matching the given category, hide the rest
function showPanel(category) {
    document.querySelectorAll('.fui-l2-panel').forEach(panel => {
        if (panel.dataset.panel === category) {
            panel.classList.remove('d-none');
            panel.classList.add('d-flex');
        } else {
            panel.classList.add('d-none');
            panel.classList.remove('d-flex');
        }
    });
}

// 3. Draw SVG Connectors (only for the currently visible L2 panel)
function drawConnections() {
    const defs = svg.querySelector('defs').outerHTML;
    svg.innerHTML = defs;

    const rootNode = document.getElementById('node-root');
    const l1Nodes = document.querySelectorAll('.fui-card-graph');
    const activeL1 = document.querySelector('.fui-card-graph.active');
    const visiblePanel = document.querySelector('.fui-l2-panel:not(.d-none)');
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
    function createBezier(p1, p2) {
        const midX = p1.x + (p2.x - p1.x) * 0.5;
        return `M ${p1.x} ${p1.y} C ${midX} ${p1.y}, ${midX} ${p2.y}, ${p2.x} ${p2.y}`;
    }

    const rootCoords = getRightCoords(rootNode);
    rootCoords.x -= 20;

    l1Nodes.forEach(l1 => {
        const l1Coords = getLeftCoords(l1);
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", createBezier(rootCoords, l1Coords));
        path.setAttribute("class", "fui-path-line fui-root-line");
        path.setAttribute("stroke", "url(#grad-root)");
        svg.appendChild(path);
    });

    if (activeL1 && l2Nodes.length > 0) {
        const activeCoords = getRightCoords(activeL1);
        l2Nodes.forEach(l2 => {
            const l2Coords = getLeftCoords(l2);
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", createBezier(activeCoords, l2Coords));
            path.setAttribute("class", "fui-path-line fui-active-line");
            path.setAttribute("stroke", "url(#grad-active)");
            svg.appendChild(path);

            const length = path.getTotalLength();
            path.style.strokeDasharray = length;
            path.style.strokeDashoffset = length;
        });
    }
}

// 4. Tab Click Logic
const tabs = document.querySelectorAll('.fui-card-graph');
tabs.forEach(tab => {
    tab.addEventListener('click', function () {
        if (this.classList.contains('active')) return;

        tabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');

        const category = this.dataset.category;
        showPanel(category);
        drawConnections();

        gsap.fromTo(".fui-l2-panel:not(.d-none) .fui-l2-node",
            { opacity: 0, x: -30 },
            { opacity: 1, duration: 0.4, x: 0, stagger: 0.03, ease: "power2.out" }
        );

        gsap.fromTo(".fui-active-line",
            { strokeDashoffset: (i, target) => target.getTotalLength() },
            { strokeDashoffset: 0, duration: 0.8, ease: "power2.inOut", stagger: 0.02 }
        );
    });
});

// 5. Initial Load Animation
function initialLoad() {
    bindL2Modals();

    const initialTab = document.querySelector('.fui-card-graph.active');
    showPanel(initialTab.dataset.category);
    drawConnections();

    const tl = gsap.timeline();

    document.querySelectorAll('.fui-root-line').forEach(path => {
        const len = path.getTotalLength();
        path.style.strokeDasharray = len;
        path.style.strokeDashoffset = len;
    });

    tl.to("#node-root", { opacity: 1, duration: 0.6, y: 0, ease: "power2.out" })
        .to(".fui-root-line", { strokeDashoffset: 0, duration: 0.8, ease: "power2.inOut", stagger: 0.1 }, "-=0.2")
        .to(".fui-card-graph", { opacity: 1, duration: 0.5, x: 0, stagger: 0.1, ease: "back.out(1.7)" }, "-=0.6")
        .to(".fui-active-line", { strokeDashoffset: 0, duration: 0.8, ease: "power2.inOut", stagger: 0.02 }, "-=0.2")
        .fromTo(".fui-l2-panel:not(.d-none) .fui-l2-node", { opacity: 0, x: -20 }, { opacity: 1, duration: 0.4, x: 0, stagger: 0.03, ease: "power1.out" }, "-=0.8");
}

window.addEventListener('resize', drawConnections);
setTimeout(initialLoad, 100);