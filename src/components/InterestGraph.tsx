'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { SigmaContainer, useLoadGraph, useSigma } from '@react-sigma/core';
import { useLayoutForceAtlas2 } from '@react-sigma/layout-forceatlas2';
import Graph from 'graphology';
import '@react-sigma/core/lib/style.css';

interface InterestGraphProps {
    interests: string[];
    userFullName?: string;
    onGraphLoaded?: () => void;
}

const GraphController: React.FC<{
    interests: string[];
    userFullName: string;
    onGraphLoaded?: () => void;
    setIsReady: (ready: boolean) => void;
    showLabels: boolean;
}> = ({ interests, userFullName, onGraphLoaded, setIsReady, showLabels }) => {
    const loadGraph = useLoadGraph();
    const sigma = useSigma();

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

        setIsReady(true);
        if (onGraphLoaded) onGraphLoaded();

    }, [interests, userFullName, loadGraph, assignForceAtlas2, onGraphLoaded, setIsReady]);

    return null;
};

export default function InterestGraph({
    interests,
    userFullName = 'Me',
    onGraphLoaded
}: InterestGraphProps) {
    const [isReady, setIsReady] = useState(false);
    const [showLabels, setShowLabels] = useState(true);

    const settings = useMemo(() => ({
        labelFont: 'Inter, system-ui, sans-serif',
        labelWeight: '600',
        labelSize: 14,
        labelColor: { color: '#000000' },
        renderEdgeLabels: false,
        defaultNodeColor: '#06b6d4',
        defaultEdgeColor: 'rgba(0,0,0,0)',
        labelRenderedSizeThreshold: 0,
        defaultDrawNodeHover: () => { },
        // Fine-tune collision grid to allow tight packing
        labelDensity: 1,
        labelGridCellSize: 60, // Much smaller grid cell to prevent aggressive culling
        zIndex: true
    }), []); // Dependencies array is EMPTY to prevent remounts

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }}>

            {/* Label Toggle */}
            <button
                onClick={() => setShowLabels(!showLabels)}
                style={{
                    position: 'absolute',
                    right: '20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 2000,
                    background: 'rgba(0, 0, 0, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '18px',
                    backdropFilter: 'blur(5px)',
                }}
                title={showLabels ? "Hide Labels" : "Show Labels"}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.8)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.6)'}
            >
                {showLabels ? 'T' : 'Ø'}
            </button>

            {/* Graph Container with Fade-In */}
            <div style={{
                width: '100%',
                height: '100%',
                opacity: isReady ? 1 : 0,
                transition: 'opacity 0.7s ease-in'
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
                    />
                </SigmaContainer>
            </div>
        </div>
    );
}
