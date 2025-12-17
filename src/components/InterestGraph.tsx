'use client';

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import * as THREE from 'three';
// @ts-ignore
import SpriteText from 'three-spritetext';

// Dynamic import for 3D Graph (SSR disable is crucial)
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false });

interface InterestGraphProps {
    interests: string[];
    userFullName?: string;
    onGraphLoaded?: () => void;
}

export default function InterestGraph({
    interests,
    userFullName = 'Me',
    onGraphLoaded
}: InterestGraphProps) {
    const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });
    const [showLabels, setShowLabels] = useState(true);
    const graphRef = useRef<any>(null);

    // Construct Graph Data
    useEffect(() => {
        // Central Node: User
        const nodes: any[] = [{
            id: 'user',
            name: userFullName,
            val: 30,
            color: '#FFFFFF', // White star for user
            isUser: true
        }];
        const links: any[] = [];

        // Nebula Palette (Cosmic Colors)
        const palette = [
            '#06b6d4', // Cyan
            '#d946ef', // Magenta
            '#8b5cf6', // Violet
            '#3b82f6', // Blue
            '#a855f7', // Purple
            '#ec4899', // Pink
            '#14b8a6', // Teal
            '#6366f1', // Indigo
        ];

        interests.forEach((interest, i) => {
            const id = `interest-${i}`;

            // --- ORBITAL LAYOUT LOGIC ---
            // Distribute nodes in rings based on index/importance
            // Ring 1: First 5 items (Radius 40)
            // Ring 2: Next 8 items (Radius 70)
            // Ring 3: Rest (Radius 100)

            let radius = 50;
            if (i > 4) radius = 80;
            if (i > 12) radius = 110;

            // Angle: Distributed evenly + random offset
            const goldenAngle = Math.PI * (3 - Math.sqrt(5));
            const theta = i * goldenAngle;

            // Position on XZ plane with slight Y variation
            const fx = radius * Math.cos(theta);
            const fz = radius * Math.sin(theta);
            const fy = (Math.random() - 0.5) * 20; // Thin disk

            // Interest Nodes
            nodes.push({
                id,
                name: interest,
                val: 15,
                color: palette[i % palette.length],
                isUser: false,
                fx, fy, fz
            });

            // Link to Center
            links.push({
                source: 'user',
                target: id
            });
        });

        // If empty
        if (interests.length === 0) {
            nodes.push({ id: 'empty', name: 'No Interests Yet', val: 10, color: '#9CA3AF', isUser: false, fx: 30, fy: 0, fz: 0 });
            links.push({ source: 'user', target: 'empty' });
        }

        setGraphData({ nodes, links });
        if (onGraphLoaded) onGraphLoaded();
    }, [interests, userFullName, onGraphLoaded]); // Added onGraphLoaded to dependencies

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* Toggle Labels Button */}
            <button
                onClick={() => setShowLabels(!showLabels)}
                className="hover:scale-105 active:scale-95"
                style={{
                    position: 'absolute',
                    bottom: '40px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 20,
                    padding: '12px 24px',
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: '50px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '14px',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                    color: '#333',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    outline: 'none'
                }}
            >
                <span style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: showLabels ? '#10B981' : '#9CA3AF'
                }}></span>
                {showLabels ? 'Hide Labels' : 'Show Labels'}
            </button>

            <ForceGraph3D
                ref={graphRef}
                graphData={graphData}
                nodeLabel="name"
                backgroundColor="#ffffff" // 'transparent' causes parsing error in three.js
                showNavInfo={false}

                // Links
                linkColor={() => '#e5e7eb'} // Light gray links
                linkWidth={1.5}
                linkOpacity={0.6}

                // Custom Nodes
                nodeThreeObject={(node: any) => {
                    const group = new THREE.Group();

                    // Sphere
                    const sphereSize = node.isUser ? 6 : 4;
                    const geometry = new THREE.SphereGeometry(sphereSize, 32, 32);
                    // Make user node glossy black, interests matte colored
                    const material = new THREE.MeshPhysicalMaterial({
                        color: node.color,
                        roughness: node.isUser ? 0.3 : 0.7,
                        metalness: node.isUser ? 0.5 : 0.1,
                        clearcoat: node.isUser ? 1.0 : 0.0,
                    });
                    const mesh = new THREE.Mesh(geometry, material);
                    group.add(mesh);

                    // Text Label
                    if (showLabels) {
                        const sprite = new SpriteText(node.name);
                        sprite.color = '#1f2937'; // Dark gray text
                        sprite.textHeight = node.isUser ? 8 : 5;
                        sprite.fontWeight = '500';
                        sprite.fontFace = 'Inter, system-ui, sans-serif';
                        sprite.position.set(0, node.isUser ? 10 : 8, 0); // Position above sphere
                        sprite.backgroundColor = false; // transparent
                        group.add(sprite);
                    }

                    return group;
                }}
                nodeThreeObjectExtend={false}

                // Interactions
                onNodeClick={(node: any) => {
                    // Focus on node
                    const distance = 40;
                    const distRatio = 1 + distance / Math.hypot(node.x ?? 0, node.y ?? 0, node.z ?? 0);
                    graphRef.current?.cameraPosition(
                        { x: (node.x ?? 0) * distRatio, y: (node.y ?? 0) * distRatio, z: (node.z ?? 0) * distRatio }, // new position
                        node, // lookAt ({ x, y, z })
                        3000  // ms transition duration
                    );
                }}
            />
        </div>
    );
}
