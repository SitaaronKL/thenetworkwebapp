'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { SigmaContainer, useLoadGraph, useSigma, useRegisterEvents } from '@react-sigma/core';
import { useLayoutForceAtlas2 } from '@react-sigma/layout-forceatlas2';
import Graph from 'graphology';
import '@react-sigma/core/lib/style.css';

interface InterestGraphProps {
    interests: string[];
    userFullName?: string;
    onGraphLoaded?: () => void;
    onInterestClick?: (interest: string) => void;
}

const GraphController: React.FC<{
    interests: string[];
    userFullName: string;
    onGraphLoaded?: () => void;
    setIsReady: (ready: boolean) => void;
    showLabels: boolean;
    onInterestClick?: (interest: string) => void;
}> = ({ interests, userFullName, onGraphLoaded, setIsReady, showLabels, onInterestClick }) => {
    const loadGraph = useLoadGraph();
    const sigma = useSigma();
    const registerEvents = useRegisterEvents();
    const hasInitialized = React.useRef(false);

    // Handle Label Toggle without re-mounting
    useEffect(() => {
        if (!sigma) return;
        // setSetting is the proper method in Sigma v2/v3
        sigma.setSetting('renderLabels', showLabels);
        // Also force refresh to apply change immediately
        sigma.refresh();
    }, [showLabels, sigma]);
    const { assign: assignForceAtlas2 } = useLayoutForceAtlas2({
        iterations: 150,
        settings: {
            gravity: 0.05,
            scalingRatio: 50,
            adjustSizes: true,
            barnesHutOptimize: true,
            linLogMode: false,
        },
    });

    useEffect(() => {
        // Register events
        registerEvents({
            clickNode: (event) => {
                const nodeData = event.node;
                const nodeAttributes = sigma.getGraph().getNodeAttributes(nodeData);

                if (nodeAttributes.isClusterCenter && onInterestClick) {
                    onInterestClick(nodeAttributes.label);
                }
            },
            enterNode: (event) => {
                const nodeData = event.node;
                const nodeAttributes = sigma.getGraph().getNodeAttributes(nodeData);
                if (nodeAttributes.isClusterCenter) {
                    document.body.style.cursor = 'pointer';
                }
            },
            leaveNode: () => {
                document.body.style.cursor = 'default';
            }
        });
    }, [registerEvents, sigma, onInterestClick]);

    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const graph = new Graph();

        const palette = [
            '#06b6d4', '#d946ef', '#8b5cf6', '#3b82f6',
            '#a855f7', '#ec4899', '#14b8a6', '#6366f1',
        ];

        const gaussianRandom = (mean = 0, stdev = 1) => {
            const u = 1 - Math.random();
            const v = Math.random();
            const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
            return z * stdev + mean;
        };

        // Custom Collision-Aware Random Placement
        const placedCenters: { x: number, y: number }[] = [];
        const MIN_DIST = 550;
        const CLOUD_RADIUS = 2000;

        interests.forEach((interest, i) => {
            const color = palette[i % palette.length];
            const centerId = `center-${i}`;

            let cx = 0;
            let cy = 0;
            let valid = false;
            let attempts = 0;

            while (!valid && attempts < 200) {
                const angle = Math.random() * Math.PI * 2;
                const r = Math.sqrt(Math.random()) * CLOUD_RADIUS;
                const candidateX = r * Math.cos(angle);
                const candidateY = r * Math.sin(angle);

                let collision = false;
                for (const other of placedCenters) {
                    const dx = candidateX - other.x;
                    const dy = candidateY - other.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < MIN_DIST) {
                        collision = true;
                        break;
                    }
                }

                if (!collision) {
                    cx = candidateX;
                    cy = candidateY;
                    valid = true;
                }
                attempts++;
            }

            if (!valid) {
                const angle = Math.random() * Math.PI * 2;
                const r = CLOUD_RADIUS + 500;
                cx = r * Math.cos(angle);
                cy = r * Math.sin(angle);
            }

            placedCenters.push({ x: cx, y: cy });


            graph.addNode(centerId, {
                label: interest,
                x: cx,
                y: cy,
                size: 10,
                color: color,
                isClusterCenter: true,
                sectionIndex: i,
                zIndex: 1000,
                fixed: true,
            });

            const particleCount = 100;
            const particleIds: string[] = [];

            for (let j = 0; j < particleCount; j++) {
                const particleId = `p-${i}-${j}`;
                particleIds.push(particleId);

                const px = cx + gaussianRandom(0, 50);
                const py = cy + gaussianRandom(0, 50);

                graph.addNode(particleId, {
                    // label: null,
                    x: px,
                    y: py,
                    size: Math.random() * 2 + 0.5,
                    color: color,
                    sectionIndex: i,
                    zIndex: 0,
                });
            }

            for (let k = 0; k < 3; k++) {
                const randomIdx = Math.floor(Math.random() * particleCount);
                if (!graph.hasEdge(centerId, particleIds[randomIdx])) {
                    graph.addEdge(centerId, particleIds[randomIdx], {
                        size: 0,
                        color: 'rgba(0,0,0,0)',
                        weight: 5
                    });
                }
            }

            particleIds.forEach(pid => {
                if (Math.random() > 0.7) {
                    const targetIdx = Math.floor(Math.random() * particleCount);
                    const targetId = particleIds[targetIdx];
                    if (pid !== targetId && !graph.hasEdge(pid, targetId)) {
                        graph.addEdge(pid, targetId, {
                            size: 0,
                            color: 'rgba(0,0,0,0)',
                            weight: 0.1,
                            hidden: true,
                        });
                    }
                }
            });
        });

        loadGraph(graph);
        assignForceAtlas2();

        // Wait for ForceAtlas2 to fully complete and render
        // Using longer delay to ensure layout is completely stable
        setTimeout(() => {
            setIsReady(true);
            if (onGraphLoaded) onGraphLoaded();
        }, 1000);

    }, [interests, userFullName, loadGraph, assignForceAtlas2, onGraphLoaded, setIsReady]);

    return null;
};

export default function InterestGraph({
    interests,
    userFullName = 'Me',
    onGraphLoaded,
    onInterestClick
}: InterestGraphProps) {
    const [isReady, setIsReady] = useState(false);
    const [showLabels, setShowLabels] = useState(true);

    // Check mobile once on mount, use ref to avoid re-renders
    const isMobileRef = React.useRef(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);

    // Settings should NOT change after mount to prevent graph re-renders
    const settings = useMemo(() => {
        const mobile = isMobileRef.current;
        return {
        labelFont: 'Inter, system-ui, sans-serif',
        labelWeight: '600',
            labelSize: mobile ? 12 : 14,
        labelColor: { color: '#000000' },
        renderEdgeLabels: false,
        defaultNodeColor: '#06b6d4',
        defaultEdgeColor: 'rgba(0,0,0,0)',
        labelRenderedSizeThreshold: 0,
        defaultDrawNodeHover: () => { },
        // Fine-tune collision grid to allow tight packing
        labelDensity: 1,
            labelGridCellSize: mobile ? 40 : 60, // Smaller on mobile to show more labels
        zIndex: true
        };
    }, []); // Empty deps - settings are fixed after mount

    // For button styling, we can use a simple check
    const isMobile = typeof window !== 'undefined' ? window.innerWidth <= 768 : false;

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', background: '#ffffff' }}>

            {/* Label Toggle - use CSS media queries via className instead */}
            <button
                onClick={() => setShowLabels(!showLabels)}
                className="interest-graph-toggle-btn"
                title={showLabels ? "Hide Labels" : "Show Labels"}
            >
                {showLabels ? 'Θ' : 'λ'}
            </button>
            
            {/* Inline styles for the toggle button with media query support */}
            <style jsx>{`
                .interest-graph-toggle-btn {
                    position: absolute;
                    right: 20px;
                    top: 50%;
                    transform: translateY(-50%);
                    z-index: 2000;
                    background: rgba(0, 0, 0, 0.6);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    color: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 24px;
                    backdrop-filter: blur(5px);
                    font-family: "Times New Roman", serif;
                    line-height: 1;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                }
                
                .interest-graph-toggle-btn:hover {
                    background: rgba(0, 0, 0, 0.8);
                }
                
                @media (max-width: 768px) {
                    .interest-graph-toggle-btn {
                        right: 16px;
                        top: auto;
                        bottom: 24px;
                        transform: none;
                        width: 48px;
                        height: 48px;
                        font-size: 22px;
                    }
                }
            `}</style>

            {/* Graph Container - No fade, instant display */}
            <div style={{
                width: '100%',
                height: '100%'
            }}>
                <SigmaContainer
                    style={{ height: '100%', width: '100%' }}
                    settings={settings}
                >
                    <GraphController
                        interests={interests}
                        userFullName={userFullName}
                        onGraphLoaded={onGraphLoaded}
                        setIsReady={setIsReady}
                        showLabels={showLabels}
                        onInterestClick={onInterestClick}
                    />
                </SigmaContainer>
            </div>
        </div>
    );
}
