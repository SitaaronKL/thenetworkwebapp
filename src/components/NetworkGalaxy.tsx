'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { NetworkPerson } from '@/types/network';

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { 
    ssr: false,
    loading: () => <div style={{ height: '100%', width: '100%' }} /> 
});

interface NetworkGalaxyProps {
    people: NetworkPerson[];
    currentUserId: string;
    onPersonClick?: (person: NetworkPerson) => void;
}

export default React.memo(function NetworkGalaxy({
    people,
    currentUserId,
    onPersonClick: _ignored
}: NetworkGalaxyProps) {
    const [isInverted, setIsInverted] = useState(false);
    const fgRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

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
        };

        window.addEventListener('resize', updateDimensions);
        updateDimensions();

        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    const graphData = useMemo(() => {
        const nodes = people.map((p, i) => {
            const isUser = p.id === currentUserId;
            // Initial Positioning: User at center (0, 0), others in a wide circle around
            
            let x = isUser ? 0 : 0;
            let y = isUser ? 0 : 0;

            if (!isUser) {
                // Distribute others in a wide circle around (0, 0)
                const count = people.length - 1 || 1;
                const angle = (i / count) * Math.PI * 2;
                const radius = 450; // Default spacing
                x = Math.cos(angle) * radius;
                y = Math.sin(angle) * radius;
            }

            return {
                id: p.id,
                name: p.name,
                val: isUser ? 35 : 25, // Default node sizes
                color: p.starColor || '#8E5BFF',
                imgUrl: p.imageUrl,
                img: null as HTMLImageElement | null,
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

    // Apply Obsidian-like Physics and set initial zoom
    useEffect(() => {
        if (fgRef.current) {
            const fg = fgRef.current;
            
            // 1. Charge Force (Repulsion) - Very strong to keep nodes far apart
            fg.d3Force('charge').strength(-3000).distanceMax(5000);

            // 2. Link Force - Default spring distance
            fg.d3Force('link').distance(375);

            // 3. Center Force - Very weak to allow open layout
            fg.d3Force('center').strength(0.01);
            
            // Set initial zoom level (0.7 = more zoomed out)
            fg.zoom(0.7, 0);
            
            // Reheat to apply new forces
            fg.d3ReheatSimulation();
        }
    }, [graphData]);

    const drawNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const r = node.val;
        const { x, y } = node;

        // Draw background circle
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI, false);
        ctx.fillStyle = node.color;
        ctx.fill();

        // Draw image if available
        if (node.imgUrl) {
            if (!node.img) {
                const img = new Image();
                img.src = node.imgUrl;
                img.onload = () => {
                    node.img = img;
                };
                node.img = img;
            } else if (node.img.complete && node.img.naturalWidth > 0) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(x, y, r, 0, 2 * Math.PI, false);
                ctx.clip();
                try {
                    ctx.drawImage(node.img, x - r, y - r, r * 2, r * 2);
                } catch (e) {}
                ctx.restore();
            }
        }
        
        // Draw Label
        if (node.name) {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = isInverted ? '#ffffff' : '#000000';
            ctx.font = '600 12px Inter, system-ui, sans-serif';
            ctx.fillText(node.name, x, y + r + 6);
        }
    }, [isInverted]);

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* Background */}
            <div style={{ position: 'absolute', inset: 0, background: '#ffffff', zIndex: 0 }} />

            {/* Graph Layer */}
            <div style={{
                position: 'absolute',
                inset: 0,
                zIndex: 1,
                background: 'transparent',
                filter: isInverted ? 'invert(1) hue-rotate(180deg)' : 'none',
                transition: 'filter 0.3s'
            }}>
                {dimensions.width > 0 && (
                    <ForceGraph2D
                        ref={fgRef}
                        width={dimensions.width}
                        height={dimensions.height}
                        graphData={graphData}
                        nodeLabel={() => ''}
                        nodeCanvasObject={drawNode}
                        enableNodeDrag={true} // Dragging enabled
                        onNodeClick={() => {}} // Click disabled
                        linkColor={() => '#e5e7eb'}
                        backgroundColor="transparent"
                        
                        // Physics Settings for "Obsidian Feel"
                        // Lower decay -> Fluid movement, higher velocity decay -> Less bouncy
                        d3AlphaDecay={0.01} 
                        d3VelocityDecay={0.4} 
                        cooldownTicks={Infinity}
                        
                        // No warmup ticks - we initialize positions manually
                        warmupTicks={0} 
                    />
                )}
            </div>
        </div>
    );
});
