(function () {
    'use strict';

    let widgetCounter = 0;
    const initializedWidgets = [];
    const hasGsap = typeof gsap !== 'undefined';

    function isDesktop() {
        return window.matchMedia('(min-width: 992px)').matches;
    }

    function createBezier(p1, p2) {
        const midX = p1.x + (p2.x - p1.x) * 0.5;
        return `M ${p1.x} ${p1.y} C ${midX} ${p1.y}, ${midX} ${p2.y}, ${p2.x} ${p2.y}`;
    }

    // --- ENTRANCE ANIMATION FOR TAB SWITCHING (CLEAN SLATE) ---
    function animateWidgetEntrance(widgetEl, drawConnectionsFn) {
        const rootNode = widgetEl.querySelector('.fui-node-root');
        const l1Cards = widgetEl.querySelectorAll('.fui-card-graph');
        const activeNodes = widgetEl.querySelectorAll(".fui-l2-panel:not(.d-none) .fui-l2-node");

        // Mobile/Tablet Viewport: Standard instantaneous reveal (no lines, no layouts blocking)
        if (!isDesktop()) {
            const activeTab = widgetEl.querySelector('.fui-card-graph[data-category].active');
            const activeCategory = activeTab ? activeTab.dataset.category : null;
            
            widgetEl.querySelectorAll('.fui-l2-panel').forEach(panel => {
                if (panel.dataset.panel === activeCategory) {
                    panel.classList.remove('d-none');
                    panel.classList.add('d-flex');
                } else {
                    panel.classList.add('d-none');
                    panel.classList.remove('d-flex');
                }
            });
            
            widgetEl.querySelectorAll('.fui-node, .fui-card-graph, .fui-l2-node').forEach(el => {
                el.style.opacity = '1';
                el.style.transform = 'none';
            });
            return;
        }

        if (hasGsap) {
            // 1. Instantly suppress opacities to zero inside the paint frame
            gsap.killTweensOf([rootNode, l1Cards, activeNodes]);
            gsap.set([rootNode, l1Cards, activeNodes], { opacity: 0 });

            // 2. Generate path references pre-hidden at birth (hideRootActivePaths = true)
            drawConnectionsFn(false, true, true);

            // Double frame loop forces stable layout calculations before stroke draw
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const activeLines = widgetEl.querySelectorAll('.fui-active-line');
                    const rootLines = widgetEl.querySelectorAll('.fui-root-line');

                    rootLines.forEach(line => {
                        const length = line.getTotalLength() || 350;
                        line.style.strokeDasharray = length;
                        line.style.strokeDashoffset = length;
                    });

                    activeLines.forEach(line => {
                        const length = line.getTotalLength() || 350;
                        line.style.strokeDasharray = length;
                        line.style.strokeDashoffset = length;
                    });

                    const mainTl = gsap.timeline();

                    mainTl
                        // Root central orb pop-in
                        .fromTo(rootNode, 
                            { opacity: 0, scale: 0.8 }, 
                            { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(1.5)" }
                        )
                        // Make root paths visible safely inside the layout tick
                        .set(rootLines, { opacity: 1, visibility: "visible" }, "-=0.2")
                        .to(rootLines, {
                            strokeDashoffset: 0,
                            duration: 0.6,
                            ease: "power2.inOut",
                            stagger: 0.02
                        }, "-=0.2")
                        // Stagger slide-in of L1 tab options
                        .fromTo(l1Cards, 
                            { opacity: 0, x: -12 }, 
                            { opacity: 1, x: 0, duration: 0.35, stagger: 0.04, ease: "power2.out" },
                            "-=0.5"
                        )
                        // Make active L2 connections visible and draw them in
                        .set(activeLines, { opacity: 1, visibility: "visible" }, "-=0.3")
                        .to(activeLines, {
                            strokeDashoffset: 0,
                            duration: 0.5,
                            ease: "power2.inOut",
                            stagger: 0.02
                        }, "-=0.3")
                        // L2 sub-nodes slide in gracefully
                        .fromTo(activeNodes,
                            { opacity: 0, x: -16 },
                            { opacity: 1, duration: 0.3, x: 0, stagger: 0.03, ease: "power2.out" },
                            "-=0.35"
                        );
                });
            });
        } else {
            drawConnectionsFn(true, false, false);
            rootNode.style.opacity = '1';
            l1Cards.forEach(card => card.style.opacity = '1');
            activeNodes.forEach(node => {
                node.style.opacity = '1';
                node.style.transform = 'none';
            });
        }
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

        function drawConnections(instantReveal = true, hideRootLines = false, hideRootActivePaths = false) {
            if (!svg || getComputedStyle(svg).display === 'none') return;

            const oldPaths = svg.querySelectorAll('.fui-path-line');
            oldPaths.forEach(p => p.remove());

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

            const fragment = document.createDocumentFragment();

            l1Nodes.forEach(l1 => {
                const l1Coords = getLeftCoords(l1);
                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.setAttribute("d", createBezier(rootCoords, l1Coords));
                path.setAttribute("class", "fui-path-line fui-root-line");
                path.setAttribute("stroke", `url(#${gradRootId})`);
                
                if (hideRootActivePaths) {
                    path.style.opacity = "0";
                    path.style.visibility = "hidden";
                } else {
                    path.style.opacity = "1";
                    path.style.visibility = "visible";
                }

                const length = path.getTotalLength() || 350;
                if (hideRootLines) {
                    path.style.strokeDasharray = length;
                    path.style.strokeDashoffset = length;
                } else {
                    path.style.strokeDasharray = "none";
                    path.style.strokeDashoffset = "0";
                }

                fragment.appendChild(path);
            });

            if (activeL1 && l2Nodes.length > 0) {
                const activeCoords = getRightCoords(activeL1);
                l2Nodes.forEach(l2 => {
                    const l2Coords = getLeftCoords(l2);
                    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    path.setAttribute("d", createBezier(activeCoords, l2Coords));
                    path.setAttribute("class", "fui-path-line fui-active-line");
                    path.setAttribute("stroke", `url(#${gradActiveId})`);
                    
                    if (!instantReveal) {
                        path.style.opacity = "0";
                        path.style.visibility = "hidden";
                    } else {
                        path.style.opacity = "1";
                        path.style.visibility = "visible";
                    }

                    const length = path.getTotalLength() || 350;
                    if (!instantReveal) {
                        path.style.strokeDasharray = length;
                        path.style.strokeDashoffset = length;
                    } else {
                        path.style.strokeDasharray = "none";
                        path.style.strokeDashoffset = "0";
                    }

                    fragment.appendChild(path);
                });
            }

            svg.appendChild(fragment);
        }

        tabs.forEach(tab => {
            tab.addEventListener('click', function () {
                if (this.classList.contains('active')) return;

                tabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');

                if (!isDesktop()) {
                    const track = widgetEl.querySelector('.fui-l1-slider-track');
                    if (track) {
                        const offsetLeft = this.offsetLeft;
                        const cardWidth = this.offsetWidth;
                        const trackWidth = track.offsetWidth;
                        track.scrollTo({
                            left: offsetLeft - (trackWidth / 2) + (cardWidth / 2),
                            behavior: 'smooth'
                        });
                    }
                }

                const category = this.dataset.category;
                showPanel(category);
                
                if (!isDesktop()) {
                    widgetEl.querySelectorAll('.fui-node, .fui-card-graph, .fui-l2-node').forEach(el => {
                        el.style.opacity = '1';
                        el.style.transform = 'none';
                    });
                    return;
                }

                drawConnections(false, false, false);

                const activeNodes = widgetEl.querySelectorAll(".fui-l2-panel:not(.d-none) .fui-l2-node");
                const activeLines = widgetEl.querySelectorAll(".fui-active-line");

                if (hasGsap) {
                    gsap.killTweensOf([activeNodes, activeLines]);
                    gsap.set(activeNodes, { opacity: 0, x: -16 });
                    
                    requestAnimationFrame(() => {
                        activeLines.forEach(line => {
                            const length = line.getTotalLength() || 350;
                            line.style.strokeDasharray = length;
                            line.style.strokeDashoffset = length;
                        });

                        const tl = gsap.timeline();
                        tl.set(activeLines, { opacity: 1, visibility: "visible" })
                          .to(activeLines, {
                              strokeDashoffset: 0,
                              duration: 0.55,
                              ease: "power2.inOut",
                              stagger: 0.02
                          })
                          .to(activeNodes, {
                              opacity: 1,
                              x: 0,
                              duration: 0.3,
                              stagger: 0.03,
                              ease: "power2.out"
                          }, "-=0.35");
                    });
                } else {
                    activeLines.forEach(line => {
                        line.style.strokeDashoffset = '0';
                        line.style.opacity = '1';
                        line.style.visibility = 'visible';
                    });
                    activeNodes.forEach(node => {
                        node.style.opacity = '1';
                        node.style.transform = 'translateX(0)';
                    });
                }
            });
        });

        if (!isDesktop()) {
            const initialMobileTab = widgetEl.querySelector('.fui-card-graph[data-category].active');
            if (initialMobileTab) {
                showPanel(initialMobileTab.dataset.category);
            }
            widgetEl.querySelectorAll('.fui-node, .fui-card-graph, .fui-l2-node').forEach(el => {
                el.style.opacity = '1';
                el.style.transform = 'none';
            });
        } else {
            const initialTab = widgetEl.querySelector('.fui-card-graph[data-category].active');
            if (initialTab) {
                showPanel(initialTab.dataset.category);
            }
        }
        
        const parentTabPane = widgetEl.closest('.tab-pane');
        const isActiveTab = parentTabPane && parentTabPane.classList.contains('active');

        if (isActiveTab) {
            drawConnections(true, false, false);
            if (hasGsap) {
                gsap.set(rootNode, { opacity: 1, y: 0 });
                gsap.set(widgetEl.querySelectorAll(".fui-card-graph"), { opacity: 1, x: 0 });
                gsap.set(widgetEl.querySelectorAll(".fui-l2-node"), { opacity: 1, x: 0 });
            } else {
                rootNode.style.opacity = '1';
                widgetEl.querySelectorAll(".fui-card-graph, .fui-l2-node").forEach(el => el.style.opacity = '1');
            }
        }

        if (typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(entries => {
                const box = entries[0].contentRect;
                if (box.width === 0 || box.height === 0) return;
                drawConnections(true, false, false);
            });
            ro.observe(widgetEl);
        }

        initializedWidgets.push({ widgetEl, drawConnections, parentTabPane });
    }

    function initAll() {
        document.querySelectorAll('[data-graph-widget]').forEach(initWidget);

        document.addEventListener('shown.bs.tab', (event) => {
            const targetId = event.target.getAttribute('href') || event.target.getAttribute('data-bs-target');
            
            initializedWidgets.forEach(w => {
                if (w.parentTabPane && `#${w.parentTabPane.id}` === targetId) {
                    // Trigger entrance timeline instantly without timeout roadblocks now that fadeInLeft is removed
                    animateWidgetEntrance(w.widgetEl, w.drawConnections);
                } else {
                    if (isDesktop()) {
                        w.drawConnections(true, false, false);
                    }
                }
            });
        });
    }

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            initializedWidgets.forEach(w => {
                if (!isDesktop()) {
                    const activeMobileTab = w.widgetEl.querySelector('.fui-card-graph[data-category].active');
                    if (activeMobileTab) {
                        w.widgetEl.querySelectorAll('.fui-l2-panel').forEach(panel => {
                            if (panel.dataset.panel === activeMobileTab.dataset.category) {
                                panel.classList.remove('d-none');
                                panel.classList.add('d-flex');
                            } else {
                                panel.classList.add('d-none');
                                panel.classList.remove('d-flex');
                            }
                        });
                    }
                    w.widgetEl.querySelectorAll('.fui-node, .fui-card-graph, .fui-l2-node').forEach(el => {
                        el.style.opacity = '1';
                        el.style.transform = 'none';
                    });
                } else {
                    const activeTab = w.widgetEl.querySelector('.fui-card-graph[data-category].active');
                    if (activeTab) {
                        w.widgetEl.querySelectorAll('.fui-l2-panel').forEach(panel => {
                            if (panel.dataset.panel === activeTab.dataset.category) {
                                panel.classList.remove('d-none');
                                panel.classList.add('d-flex');
                            } else {
                                panel.classList.add('d-none');
                                panel.classList.remove('d-flex');
                            }
                        });
                    }
                }
                w.drawConnections(true, false, false);
            });
        }, 150);
    });

    setTimeout(initAll, 100);
})();