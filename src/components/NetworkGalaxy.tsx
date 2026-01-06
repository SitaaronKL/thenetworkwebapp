'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { NetworkPerson } from '@/types/network';

interface NetworkGalaxyProps {
    people: NetworkPerson[];
    currentUserId: string;
    onPersonClick?: (person: NetworkPerson) => void;
}

export default React.memo(function NetworkGalaxy({
    people,
    currentUserId,
    onPersonClick
}: NetworkGalaxyProps) {
    const [isInverted, setIsInverted] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    // Use ref to track mobile state without causing re-renders that break useEffect
    const isMobileRef = useRef(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);

    // D3 state (mirrors the Observable example structure)
    const svgRef = useRef<SVGSVGElement | null>(null);
    const simulationRef = useRef<d3.Simulation<any, undefined> | null>(null);
    const linkSelRef = useRef<d3.Selection<SVGLineElement, any, SVGGElement, unknown> | null>(null);
    const nodeSelRef = useRef<d3.Selection<SVGGElement, any, SVGGElement, unknown> | null>(null);
    const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const containerGroupRef = useRef<SVGGElement | null>(null);
    
    // Helper function to get viewbox scale based on current mobile state
    const getViewboxScale = () => isMobileRef.current ? 2.2 : 1.8;
    // Helper function to get viewbox offset based on current mobile state
    const getViewboxOffsetX = () => isMobileRef.current ? 0 : 180;

    useEffect(() => {
        const checkInverted = () => {
            setIsInverted(document.documentElement.classList.contains('theme-inverted'));
        };
        checkInverted();

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    checkInverted();
                }
            });
        });

        observer.observe(document.documentElement, { attributes: true });

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight
                });
            }
            // Update mobile ref (doesn't cause re-render)
            isMobileRef.current = window.innerWidth <= 768;
        };

        window.addEventListener('resize', updateDimensions);
        updateDimensions();

        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    const graphData = useMemo(() => {
        // Build nodes/links for the D3 update() call.
        // We keep initial positions wide, but the D3 update() will recycle nodes across updates.
        const sorted = [...people].sort((a, b) => a.id.localeCompare(b.id));
        const user = sorted.find(p => p.id === currentUserId);
        const others = sorted.filter(p => p.id !== currentUserId);
        const ordered = user ? [user, ...others] : others;

        const nodes = ordered.map((p, i) => {
            const isUser = p.id === currentUserId;
            const r = isUser ? 42 : 34;

            // Wide initial ring; D3 simulation mutates x/y after.
            let x = 0;
            let y = 0;
            if (!isUser) {
                const idx = Math.max(0, i - 1);
                const count = Math.max(1, ordered.length - 1);
                const angle = (idx / count) * Math.PI * 2;
                const radius = 940; // ~33% closer than 1400
                x = Math.cos(angle) * radius;
                y = Math.sin(angle) * radius;
            }

            return {
                id: p.id,
                name: p.name,
                r,
                color: p.starColor || '#8E5BFF',
                imgUrl: p.imageUrl,
                x,
                y
            };
        });

        const links: { source: string; target: string }[] = [];
        const linkSet = new Set<string>();
        const nodeIds = new Set(nodes.map(n => n.id));

        people.forEach(p => {
            if (p.connections) {
                p.connections.forEach(targetId => {
                    if (nodeIds.has(targetId)) {
                        const linkKey = [p.id, targetId].sort().join('-');
                        if (!linkSet.has(linkKey)) {
                            linkSet.add(linkKey);
                            links.push({ source: p.id, target: targetId });
                        }
                    }
                });
            }
        });

        return { nodes, links };
    }, [people, currentUserId]);

    // Initialize D3 chart once (mirrors the Observable chart = { ... } block)
    useEffect(() => {
        // Wait until we have real dimensions; otherwise we might init at 1x1 and miss the first update.
        if (!containerRef.current || svgRef.current) return;
        if (dimensions.width <= 0 || dimensions.height <= 0) return;

        const width = Math.max(1, dimensions.width || 1);
        const height = Math.max(1, dimensions.height || 1);
        const viewboxScale = getViewboxScale();
        const viewboxOffsetX = getViewboxOffsetX();
        const vbW = width * viewboxScale;
        const vbH = height * viewboxScale;
        const vbOffsetX = viewboxOffsetX * viewboxScale;

        // Reduce spacing by ~33% (closer nodes + shorter links)
        const simulation = d3.forceSimulation<any>()
            .force('charge', d3.forceManyBody().strength(-1740).distanceMax(6000))
            .force('link', d3.forceLink<any, any>().id((d: any) => d.id).distance(600).strength(0.03))
            .force('x', d3.forceX(0).strength(0.02))
            .force('y', d3.forceY(0).strength(0.02))
            .force('collide', d3.forceCollide<any>().radius((d: any) => (d?.r ?? 30) + 16).iterations(2));

        const svg = d3.create('svg')
            .attr('viewBox', [-vbW / 2 + vbOffsetX, -vbH / 2, vbW, vbH])
            .attr('width', width)
            .attr('height', height)
            .attr('style', 'max-width: 100%; height: 100%;')
            .style('touch-action', 'none'); // Prevent default touch behaviors

        // Create a container group that will be transformed by zoom
        const containerGroup = svg.append('g')
            .attr('class', 'zoom-container');
        containerGroupRef.current = containerGroup.node() as SVGGElement;

        // defs for circular image clip (works for all images, no per-node defs)
        const defs = svg.append('defs');
        defs.append('clipPath')
            .attr('id', 'nodeClipCircle')
            .attr('clipPathUnits', 'objectBoundingBox')
            .append('circle')
            .attr('cx', 0.5)
            .attr('cy', 0.5)
            .attr('r', 0.5);

        let link = containerGroup.append('g')
            .attr('stroke', '#e5e7eb')
            .attr('stroke-opacity', 0.85)
            .selectAll<SVGLineElement, any>('line');

        // IMPORTANT: don't apply stroke to the entire node group — it outlines text/images and makes labels look bold/neon.
        // We'll stroke only the circles instead.
        let node = containerGroup.append('g')
            .selectAll<SVGGElement, any>('g');

        const ticked = () => {
            node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);

            link
                .attr('x1', (d: any) => d.source.x)
                .attr('y1', (d: any) => d.source.y)
                .attr('x2', (d: any) => d.target.x)
                .attr('y2', (d: any) => d.target.y);
        };

        simulation.on('tick', ticked);

        const drag = (sim: d3.Simulation<any, undefined>) => {
            function dragstarted(event: any, d: any) {
                // Stop zoom behavior when dragging nodes
                // This prevents zoom from interfering with node dragging
                if (event.sourceEvent) {
                    event.sourceEvent.stopPropagation();
                }
                if (!event.active) sim.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            }

            function dragged(event: any, d: any) {
                d.fx = event.x;
                d.fy = event.y;
            }

            function dragended(event: any, d: any) {
                if (!event.active) sim.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }

            return d3.drag<SVGGElement, any>()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended);
        };

        // Set up zoom behavior
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.2, 4]) // Allow zooming from 20% to 400%
            .filter((event: any) => {
                // Allow zoom on wheel, pinch, and two-finger gestures
                // Prevent zoom on right-click or non-primary mouse buttons
                if (event.type === 'mousedown' && event.button !== 0) return false;
                // Allow all touch events - D3 will handle distinguishing between
                // single touch (pan) and multi-touch (zoom)
                return true;
            })
            .on('zoom', (event: any) => {
                // Apply zoom transform to the container group
                containerGroup.attr('transform', event.transform.toString());
            });

        // Apply zoom to SVG
        svg.call(zoom as any);
        zoomRef.current = zoom;

        // Attach to DOM
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(svg.node() as SVGSVGElement);

        svgRef.current = svg.node() as SVGSVGElement;
        simulationRef.current = simulation;
        linkSelRef.current = link as any;
        nodeSelRef.current = node as any;

        // Store update() behavior (mirrors the Observable update({nodes, links}) { ... })
        (svgRef.current as any).__update = ({ nodes, links }: { nodes: any[]; links: any[] }) => {
            // Recycle old nodes to preserve position & velocity
            const old = new Map((node as any).data().map((d: any) => [d.id, d]));
            const nextNodes = nodes.map((d: any) => ({ ...(old.get(d.id) || {}), ...d }));
            const nextLinks = links.map((d: any) => ({ ...d }));

            node = (node as any)
                .data(nextNodes, (d: any) => d.id)
                .join((enter: any) => {
                    const g = enter.append('g').call(drag(simulation));

                    g.append('circle')
                        .attr('r', (d: any) => d.r)
                        .attr('fill', (d: any) => d.color)
                        .attr('stroke', '#fff')
                        .attr('stroke-width', 1.5);

                    g.append('image')
                        .attr('x', (d: any) => -d.r)
                        .attr('y', (d: any) => -d.r)
                        .attr('width', (d: any) => d.r * 2)
                        .attr('height', (d: any) => d.r * 2)
                        .attr('href', (d: any) => d.imgUrl || '')
                        .attr('preserveAspectRatio', 'xMidYMid slice')
                        .attr('clip-path', 'url(#nodeClipCircle)')
                        .style('display', (d: any) => (d.imgUrl ? 'block' : 'none'));

                    g.append('text')
                        .attr('text-anchor', 'middle')
                        .attr('y', (d: any) => d.r + 18)
                        // Make labels thinner / non-bold for readability
                        .style('font-family', 'Inter, system-ui, sans-serif')
                        .style('font-size', '11px')
                        .style('font-weight', '400')
                        .style('fill', isInverted ? '#ffffff' : '#000000')
                        .text((d: any) => d.name || '');

                    // Add click handler - prevent clicking on own profile
                    if (onPersonClick) {
                        g.style('cursor', (d: any) => d.id === currentUserId ? 'default' : 'pointer')
                         .on('click', (event: any, d: any) => {
                             if (d.id !== currentUserId) {
                                 const person = people.find(p => p.id === d.id);
                                 if (person) {
                                     onPersonClick(person);
                                 }
                             }
                         });
                    }

                    return g;
                });

            link = (link as any)
                .data(nextLinks, (d: any) => `${d.source}-${d.target}`)
                .join('line');

            // Add click handlers to all nodes (existing and new)
            if (onPersonClick) {
                node.style('cursor', (d: any) => d.id === currentUserId ? 'default' : 'pointer')
                   .on('click', (event: any, d: any) => {
                       if (d.id !== currentUserId) {
                           const person = people.find(p => p.id === d.id);
                           if (person) {
                               onPersonClick(person);
                           }
                       }
                   });
            }

            // Apply to sim
            simulation.nodes(nextNodes);
            (simulation.force('link') as any).links(nextLinks);

            // Render now (like the example): restart, tick once, draw immediately
            simulation.alpha(1).restart().tick();
            ticked();

            // Update refs
            linkSelRef.current = link as any;
            nodeSelRef.current = node as any;
        };

        // IMPORTANT: render immediately on init (otherwise update() might have fired before SVG existed)
        (svgRef.current as any).__update(graphData);

        return () => {
            simulation.stop();
            simulationRef.current = null;
            svgRef.current = null;
            linkSelRef.current = null;
            nodeSelRef.current = null;
            zoomRef.current = null;
            containerGroupRef.current = null;
        };
    }, [dimensions.width, dimensions.height, graphData, isInverted]);

    // Keep SVG sized and viewBox centered on resize
    useEffect(() => {
        if (!svgRef.current) return;
        const svg = d3.select(svgRef.current);
        const width = Math.max(1, dimensions.width || 1);
        const height = Math.max(1, dimensions.height || 1);
        const viewboxScale = getViewboxScale();
        const viewboxOffsetX = getViewboxOffsetX();
        const vbW = width * viewboxScale;
        const vbH = height * viewboxScale;
        const vbOffsetX = viewboxOffsetX * viewboxScale;
        svg.attr('width', width)
            .attr('height', height)
            .attr('viewBox', [-vbW / 2 + vbOffsetX, -vbH / 2, vbW, vbH]);
        
        // Re-apply zoom behavior after resize to ensure it still works
        if (zoomRef.current) {
            svg.call(zoomRef.current as any);
        }
    }, [dimensions]);

    // Update graph when data changes
    useEffect(() => {
        if (!svgRef.current) return;
        const updater = (svgRef.current as any).__update;
        if (typeof updater === 'function') {
            updater(graphData);
        }
    }, [graphData]);

    // Keep label color synced with inversion changes (no need to rebuild the graph)
    useEffect(() => {
        if (!svgRef.current) return;
        const svg = d3.select(svgRef.current);
        svg.selectAll('text').style('fill', isInverted ? '#ffffff' : '#000000');
    }, [isInverted]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* Background */}
            <div style={{ position: 'absolute', inset: 0, background: '#ffffff', zIndex: 0 }} />

            {/* Graph Layer (SVG) */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 1,
                    background: 'transparent',
                    filter: isInverted ? 'invert(1) hue-rotate(180deg)' : 'none',
                    transition: 'filter 0.3s'
                }}
            >
                <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
            </div>
        </div>
    );
});
