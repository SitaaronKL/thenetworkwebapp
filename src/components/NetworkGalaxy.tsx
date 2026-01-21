'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { NetworkPerson } from '@/types/network';

interface NetworkGalaxyProps {
    people: NetworkPerson[];
    currentUserId: string;
    onPersonClick?: (person: NetworkPerson) => void;
    // Network branching props
    expandedFriendId?: string | null;
    onFriendExpand?: (friendId: string | null) => void;
    friendOfFriendData?: NetworkPerson[];
    mutualConnectionIds?: Set<string>;
    isLoadingFriendNetwork?: boolean;
}

export default React.memo(function NetworkGalaxy({
    people,
    currentUserId,
    onPersonClick,
    expandedFriendId = null,
    onFriendExpand,
    friendOfFriendData = [],
    mutualConnectionIds = new Set(),
    isLoadingFriendNetwork = false
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
    
    // Refs for callbacks and data to avoid stale closures
    const onPersonClickRef = useRef(onPersonClick);
    const onFriendExpandRef = useRef(onFriendExpand);
    const peopleRef = useRef(people);
    const friendOfFriendDataRef = useRef(friendOfFriendData);
    
    // Keep refs updated
    useEffect(() => {
        onPersonClickRef.current = onPersonClick;
        onFriendExpandRef.current = onFriendExpand;
        peopleRef.current = people;
        friendOfFriendDataRef.current = friendOfFriendData;
    }, [onPersonClick, onFriendExpand, people, friendOfFriendData]);
    
    // Helper function to get viewbox scale based on current mobile state
    // Higher value = more zoomed out (can see more of the network)
    const getViewboxScale = () => isMobileRef.current ? 3.2 : 2.4;
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

        // Determine if a node should be greyed out
        const shouldGreyOut = (personId: string): boolean => {
            if (!expandedFriendId) return false;
            if (personId === currentUserId) return false; // Never grey out the user
            if (personId === expandedFriendId) return false; // Never grey out the expanded friend
            return !mutualConnectionIds.has(personId);
        };

        const nodes = ordered.map((p, i) => {
            const isUser = p.id === currentUserId;
            const isExpandedFriend = p.id === expandedFriendId;
            const r = isUser ? 42 : 34;

            // Wide initial ring; D3 simulation mutates x/y after.
            let x = 0;
            let y = 0;
            if (!isUser) {
                const idx = Math.max(0, i - 1);
                const count = Math.max(1, ordered.length - 1);
                const angle = (idx / count) * Math.PI * 2;
                // Reduced radius for tighter initial layout (was 940)
                const radius = isMobileRef.current ? 500 : 700;
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
                y,
                isGreyedOut: shouldGreyOut(p.id),
                isBranchNode: false,
                isExpandedFriend
            };
        });

        // Add branch nodes (friend-of-friend connections) when a friend is expanded
        if (expandedFriendId && friendOfFriendData.length > 0) {
            // Find the expanded friend's node to position branches around it
            const expandedFriendNode = nodes.find(n => n.id === expandedFriendId);
            const friendX = expandedFriendNode?.x || 0;
            const friendY = expandedFriendNode?.y || 0;

            // Calculate the direction FROM user (center) TO friend
            // This is the direction we want to push branch nodes (away from center)
            const directionAngle = Math.atan2(friendY, friendX);

            friendOfFriendData.forEach((fof, index) => {
                // Position branch nodes in an arc AWAY from the user (opposite side of friend from center)
                const totalBranches = friendOfFriendData.length;
                const angleSpread = Math.PI * 0.7; // 126 degrees spread
                const startAngle = directionAngle - angleSpread / 2;
                const angle = totalBranches > 1 
                    ? startAngle + (index / (totalBranches - 1)) * angleSpread
                    : directionAngle; // Single branch goes straight out
                const radius = 180; // Distance from the friend node

                // Check if this branch node is a mutual connection
                const isMutual = mutualConnectionIds.has(fof.id);

                nodes.push({
                    id: fof.id,
                    name: fof.name,
                    r: 28, // Smaller radius for branch nodes
                    color: fof.starColor || '#8E5BFF',
                    imgUrl: fof.imageUrl,
                    x: friendX + Math.cos(angle) * radius,
                    y: friendY + Math.sin(angle) * radius,
                    isGreyedOut: !isMutual, // Grey out if not a mutual connection
                    isBranchNode: true,
                    isExpandedFriend: false
                });
            });
        }

        const links: { source: string; target: string; isBranchLink?: boolean }[] = [];
        const linkSet = new Set<string>();
        const nodeIds = new Set(nodes.map(n => n.id));

        // Get all connections of the expanded friend
        const expandedFriendConnections = new Set<string>();
        if (expandedFriendId) {
            // Always keep the link to the current user
            expandedFriendConnections.add(currentUserId);

            // Add branch nodes (friend-of-friend - not in main network)
            friendOfFriendData.forEach(fof => expandedFriendConnections.add(fof.id));
            
            // Add mutual connections (people in both main network and friend's network)
            mutualConnectionIds.forEach(mutualId => {
                if (mutualId !== currentUserId && mutualId !== expandedFriendId && nodeIds.has(mutualId)) {
                    expandedFriendConnections.add(mutualId);
                }
            });
        }

        // Add main network links (excluding links from expanded friend - those will be added separately)
        people.forEach(p => {
            // Skip links from expanded friend - we'll add those separately
            if (p.id === expandedFriendId) return;
            
            if (p.connections) {
                p.connections.forEach(targetId => {
                    // Skip links to expanded friend - those will be added separately
                    if (targetId === expandedFriendId) return;
                    
                    if (nodeIds.has(targetId)) {
                        const linkKey = [p.id, targetId].sort().join('-');
                        if (!linkSet.has(linkKey)) {
                            linkSet.add(linkKey);
                            links.push({ 
                                source: p.id, 
                                target: targetId, 
                                isBranchLink: false 
                            });
                        }
                    }
                });
            }
        });

        // Add links from expanded friend
        // Purple dashed lines ONLY to mutual connections, grey lines to non-mutuals
        if (expandedFriendId) {
            expandedFriendConnections.forEach(connId => {
                if (nodeIds.has(connId)) {
                    const linkKey = [expandedFriendId, connId].sort().join('-');
                    if (!linkSet.has(linkKey)) {
                        linkSet.add(linkKey);
                        // Only make it purple if it's a mutual connection
                        const isMutual = mutualConnectionIds.has(connId);
                        links.push({ 
                            source: expandedFriendId, 
                            target: connId, 
                            isBranchLink: isMutual // Purple only for mutuals
                        });
                    }
                }
            });
        }

        return { nodes, links };
    }, [people, currentUserId, expandedFriendId, friendOfFriendData, mutualConnectionIds]);

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

        // Tighter layout for better initial view, especially on mobile
        const linkDist = isMobileRef.current ? 350 : 450;
        const simulation = d3.forceSimulation<any>()
            .force('charge', d3.forceManyBody().strength(-800).distanceMax(3000))
            .force('link', d3.forceLink<any, any>().id((d: any) => d.id).distance(linkDist).strength(0.03))
            .force('x', d3.forceX(0).strength(0.02))
            .force('y', d3.forceY(0).strength(0.02))
            .force('collide', d3.forceCollide<any>().radius((d: any) => (d?.r ?? 30) + 12).iterations(2))
            .alphaDecay(0.03) // Slower decay = smoother settling
            .velocityDecay(0.4); // Higher = more friction, less bouncing

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
            const old = new Map<string, any>((node as any).data().map((d: any) => [d.id, d]));
            
            // For existing nodes, preserve their EXACT current position (x, y, vx, vy)
            // Only new nodes get their initial positions from the input
            const nextNodes = nodes.map((d: any) => {
                const existing = old.get(d.id);
                if (existing) {
                    // Preserve position and velocity, only update visual properties
                    return { 
                        ...d, 
                        x: existing.x, 
                        y: existing.y, 
                        vx: existing.vx || 0, 
                        vy: existing.vy || 0,
                        fx: existing.fx,
                        fy: existing.fy
                    };
                }
                return d;
            });
            const nextLinks = links.map((d: any) => ({ ...d }));

            node = (node as any)
                .data(nextNodes, (d: any) => d.id)
                .join(
                    (enter: any) => {
                        const g = enter.append('g').call(drag(simulation));

                        g.append('circle')
                            .attr('r', (d: any) => d.r)
                            .attr('fill', (d: any) => d.color)
                            .attr('stroke', (d: any) => d.isExpandedFriend ? '#000' : '#fff')
                            .attr('stroke-width', (d: any) => d.isExpandedFriend ? 3 : 1.5);

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
                            .style('font-size', (d: any) => d.isBranchNode ? '10px' : '11px')
                            .style('font-weight', '400')
                            .style('fill', isInverted ? '#ffffff' : '#000000')
                            .text((d: any) => d.name || '');

                        // Apply greyscale filter to group
                        g.style('filter', (d: any) => d.isGreyedOut ? 'grayscale(1) opacity(0.4)' : 'none')
                         .style('transition', 'filter 0.3s ease');

                        return g;
                    },
                    (update: any) => {
                        // Update existing nodes
                        update.select('circle')
                            .attr('r', (d: any) => d.r)
                            .attr('fill', (d: any) => d.color)
                            .attr('stroke', (d: any) => d.isExpandedFriend ? '#000' : '#fff')
                            .attr('stroke-width', (d: any) => d.isExpandedFriend ? 3 : 1.5);
                        
                        update.select('image')
                            .attr('x', (d: any) => -d.r)
                            .attr('y', (d: any) => -d.r)
                            .attr('width', (d: any) => d.r * 2)
                            .attr('height', (d: any) => d.r * 2);
                        
                        update.select('text')
                            .style('font-size', (d: any) => d.isBranchNode ? '10px' : '11px');
                        
                        // Update greyscale filter
                        update.style('filter', (d: any) => d.isGreyedOut ? 'grayscale(1) opacity(0.4)' : 'none')
                              .style('transition', 'filter 0.3s ease');
                        
                        return update;
                    }
                );

            link = (link as any)
                .data(nextLinks, (d: any) => `${d.source.id || d.source}-${d.target.id || d.target}`)
                .join(
                    (enter: any) => enter.append('line')
                        .attr('stroke', (d: any) => d.isBranchLink ? '#3b82f6' : '#e5e7eb')
                        .attr('stroke-opacity', (d: any) => d.isBranchLink ? 0.7 : 0.85)
                        .attr('stroke-width', (d: any) => d.isBranchLink ? 2 : 1)
                        .attr('stroke-dasharray', (d: any) => d.isBranchLink ? '5,5' : 'none'),
                    (update: any) => update
                        .attr('stroke', (d: any) => d.isBranchLink ? '#3b82f6' : '#e5e7eb')
                        .attr('stroke-opacity', (d: any) => d.isBranchLink ? 0.7 : 0.85)
                        .attr('stroke-width', (d: any) => d.isBranchLink ? 2 : 1)
                        .attr('stroke-dasharray', (d: any) => d.isBranchLink ? '5,5' : 'none')
                );

            // Add click handlers to all nodes (existing and new)
            // First click expands network, clicking expanded friend or branch node opens profile
            node.style('cursor', (d: any) => d.id === currentUserId ? 'default' : 'pointer')
               .on('click', (event: any, d: any) => {
                   if (d.id === currentUserId) return;
                   
                   // Use refs to get current values (avoids stale closures)
                   const currentPeople = peopleRef.current;
                   const currentFriendOfFriendData = friendOfFriendDataRef.current;
                   const currentOnPersonClick = onPersonClickRef.current;
                   const currentOnFriendExpand = onFriendExpandRef.current;
                   
                   // Find the person in people array or friendOfFriendData
                   const person = currentPeople.find(p => p.id === d.id) || 
                                  currentFriendOfFriendData.find(p => p.id === d.id);
                   
                   if (d.isBranchNode) {
                       // Branch nodes: open profile modal
                       if (person && currentOnPersonClick) {
                           currentOnPersonClick(person);
                       }
                   } else if (currentOnFriendExpand) {
                       // Main network nodes: expand/collapse their network
                       currentOnFriendExpand(d.id);
                   } else if (person && currentOnPersonClick) {
                       // Fallback to old behavior if no onFriendExpand provided
                       currentOnPersonClick(person);
                   }
               });

            // Apply to sim
            simulation.nodes(nextNodes);
            (simulation.force('link') as any).links(nextLinks);

            // STOP the simulation completely to prevent any movement
            simulation.stop();
            
            // Check if we actually have new nodes being added
            const newNodeIds = nextNodes.filter((n: any) => !old.has(n.id)).map((n: any) => n.id);
            const hasNewNodes = newNodeIds.length > 0;
            
            // Only do physics for truly new nodes, otherwise just update visuals
            if (hasNewNodes) {
                // Fix ALL existing nodes in place - they should not move at all
                nextNodes.forEach((n: any) => {
                    if (old.has(n.id)) {
                        n.fx = n.x;
                        n.fy = n.y;
                    }
                });
                
                // Very brief, gentle simulation just to position new nodes
                simulation.alpha(0.05).alphaDecay(0.1).restart();
                
                // Stop simulation completely after new nodes settle
                setTimeout(() => {
                    simulation.stop();
                    // Unfreeze nodes but keep simulation stopped
                    nextNodes.forEach((n: any) => {
                        n.fx = null;
                        n.fy = null;
                    });
                }, 200);
            }
            
            // Always update visual positions without physics
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dimensions.width, dimensions.height]); // Only recreate on dimension changes, NOT on data changes

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
