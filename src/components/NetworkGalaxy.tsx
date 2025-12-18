'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import * as THREE from 'three';
// @ts-ignore
import SpriteText from 'three-spritetext';
import { NetworkPerson } from '@/types/network';

// Dynamic import for 3D Graph
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false });

interface NetworkGalaxyProps {
    people: NetworkPerson[];
    currentUserId: string;
    onPersonClick?: (person: NetworkPerson) => void;
}

export default function NetworkGalaxy({
    people,
    currentUserId,
    onPersonClick
}: NetworkGalaxyProps) {
    const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });
    const graphRef = useRef<any>(null);

    // Construct Graph Data
    useEffect(() => {
        if (!people || people.length === 0) return;

        const nodes: any[] = [];
        const links: any[] = [];
        const drawnLinks = new Set<string>();

        // Find current user node to pin it
        const userNode = people.find(p => p.id === currentUserId);

        people.forEach((person, index) => {
            const isUser = person.id === currentUserId;

            // --- GALAXY ORBITAL LAYOUT ---
            // If it's the user, put at center. 
            // Others orbit at varying radii based on their index (legacy) or simple shell logic.
            let radius = 0;
            let fx = undefined, fy = undefined, fz = undefined;

            if (isUser) {
                fx = 0;
                fy = 0;
                fz = 0;
            } else {
                // Distribute in shells
                // Shell 1: Inner (Radius 40-70)
                // Shell 2: Outer (Radius 80-120)
                const shellIndex = index % 3;
                radius = 50 + (shellIndex * 40) + (Math.random() * 20);

                const phi = Math.acos(-1 + (2 * index) / people.length);
                const theta = Math.sqrt(people.length * Math.PI) * phi;

                fx = radius * Math.cos(theta) * Math.sin(phi);
                fy = radius * Math.sin(theta) * Math.sin(phi);
                fz = radius * Math.cos(phi);
            }

            nodes.push({
                ...person,
                id: person.id,
                name: person.name,
                val: isUser ? 25 : 12,
                color: person.starColor || '#8E5BFF',
                isUser,
                fx, fy, fz
            });

            // Create links based on person.connections
            if (person.connections) {
                person.connections.forEach(targetId => {
                    const linkKey = [person.id, targetId].sort().join('-');
                    if (!drawnLinks.has(linkKey)) {
                        links.push({
                            source: person.id,
                            target: targetId,
                        });
                        drawnLinks.add(linkKey);
                    }
                });
            }
        });

        setGraphData({ nodes, links });
    }, [people, currentUserId]);

    // Add starfield on mount
    useEffect(() => {
        if (!graphRef.current) return;

        const scene = graphRef.current.scene();

        // Starfield
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 3000;
        const positions = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount * 3; i++) {
            positions[i] = (Math.random() - 0.5) * 2000;
        }

        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const starMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.7,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true
        });

        const stars = new THREE.Points(starGeometry, starMaterial);
        scene.add(stars);

        return () => {
            scene.remove(stars);
        };
    }, []);

    // Auto-zoom to fit when data changes
    useEffect(() => {
        if (graphRef.current && graphData.nodes.length > 0) {
            // Give it a small timeout to ensure the graph has rendered
            const timeout = setTimeout(() => {
                graphRef.current.zoomToFit(1000, 20); // Much tighter padding
            }, 500);
            return () => clearTimeout(timeout);
        }
    }, [graphData]);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', background: '#ffffff' }}>
            <ForceGraph3D
                ref={graphRef}
                graphData={graphData}
                backgroundColor="#ffffff"
                showNavInfo={false}

                // Links (Constellation Style)
                linkColor={() => '#ffffff'} // White for dark mode compatibility
                linkWidth={1}
                linkOpacity={0.2}

                // Custom Nodes (Stellar Style)
                nodeThreeObject={(node: any) => {
                    const group = new THREE.Group();

                    // Core sphere
                    const geometry = new THREE.SphereGeometry(node.isUser ? 7 : 4, 32, 32);
                    const material = new THREE.MeshPhysicalMaterial({
                        color: node.color,
                        roughness: 0.2,
                        metalness: 0.8,
                        emissive: node.color,
                        emissiveIntensity: node.isUser ? 1.5 : 0.5,
                        transparent: true,
                        opacity: 0.9,
                    });
                    const sphere = new THREE.Mesh(geometry, material);
                    group.add(sphere);

                    // Add a glow ring for user
                    if (node.isUser) {
                        const ringGeo = new THREE.TorusGeometry(10, 0.2, 16, 100);
                        const ringMat = new THREE.MeshBasicMaterial({ color: node.color, transparent: true, opacity: 0.3 });
                        const ring = new THREE.Mesh(ringGeo, ringMat);
                        ring.rotation.x = Math.PI / 2;
                        group.add(ring);
                    }

                    // Label
                    const sprite = new SpriteText(node.name);
                    sprite.color = '#333333';
                    sprite.textHeight = node.isUser ? 8 : 4;
                    sprite.fontWeight = 'bold';
                    sprite.position.set(0, node.isUser ? 12 : 8, 0);
                    group.add(sprite);

                    return group;
                }}
                nodeThreeObjectExtend={false}

                // Interactions
                onNodeClick={(node: any) => {
                    if (onPersonClick) {
                        onPersonClick(node as NetworkPerson);
                    }

                    // Camera focus
                    const distance = 150;
                    const distRatio = 1 + distance / Math.hypot(node.x || 1, node.y || 1, node.z || 1);
                    graphRef.current?.cameraPosition(
                        { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
                        node,
                        2000
                    );
                }}
            />
        </div>
    );
}
