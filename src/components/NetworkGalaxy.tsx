'use client';

import React, { useEffect } from 'react';
import { SigmaContainer, useLoadGraph, useSigma } from '@react-sigma/core';
import { useLayoutForceAtlas2 } from '@react-sigma/layout-forceatlas2';
import Graph from 'graphology';
import { NetworkPerson } from '@/types/network';
import { NodeImageProgram } from '@sigma/node-image';
import '@react-sigma/core/lib/style.css';

interface NetworkGalaxyProps {
    people: NetworkPerson[];
    currentUserId: string;
    onPersonClick?: (person: NetworkPerson) => void;
}

const GraphController: React.FC<{
    people: NetworkPerson[];
    currentUserId: string;
    onPersonClick?: (person: NetworkPerson) => void;
}> = ({ people, currentUserId, onPersonClick }) => {
    const loadGraph = useLoadGraph();
    const sigma = useSigma();
    const { assign: assignForceAtlas2 } = useLayoutForceAtlas2({
        iterations: 100,
        settings: {
            gravity: 1,
            scalingRatio: 7.5, // Reduced from 10 to 7.5 (25% shorter lines)
            adjustSizes: true,
        },
    });

    useEffect(() => {
        const graph = new Graph();

        // Add Nodes
        people.forEach((person) => {
            const isUser = person.id === currentUserId;
            const hasImage = !!person.imageUrl;

            graph.addNode(person.id, {
                label: person.name,
                x: Math.random(),
                y: Math.random(),
                // Increased sizes: 15->20 (+33%), 8->12 (+50%)
                size: isUser ? 20 : 12,
                color: person.starColor || '#8E5BFF',
                // Use image type if available, otherwise circle
                type: hasImage ? 'image' : 'circle',
                image: person.imageUrl,
                person: person, // Store original data
            });
        });

        // Add Edges
        const drawnLinks = new Set<string>();
        people.forEach((person) => {
            if (person.connections) {
                person.connections.forEach((targetId) => {
                    if (graph.hasNode(targetId)) {
                        const linkKey = [person.id, targetId].sort().join('-');
                        if (!drawnLinks.has(linkKey)) {
                            graph.addEdge(person.id, targetId, {
                                size: 1,
                                color: '#e5e7eb',
                            });
                            drawnLinks.add(linkKey);
                        }
                    }
                });
            }
        });

        loadGraph(graph);
        assignForceAtlas2();

        // Events
        sigma.on('clickNode', (event) => {
            const nodeData = graph.getNodeAttributes(event.node);
            if (onPersonClick && nodeData.person) {
                onPersonClick(nodeData.person);
            }
        });

        return () => {
            sigma.removeAllListeners();
        };
    }, [people, currentUserId, loadGraph, sigma, assignForceAtlas2, onPersonClick]);

    return null;
};

export default function NetworkGalaxy({
    people,
    currentUserId,
    onPersonClick
}: NetworkGalaxyProps) {
    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', background: '#ffffff' }}>
            <SigmaContainer
                style={{ height: '100%', width: '100%' }}
                settings={{
                    // Register the image program
                    nodeProgramClasses: { image: NodeImageProgram },
                    labelFont: 'Inter, system-ui, sans-serif',
                    labelWeight: '600',
                    labelSize: 12,
                    labelColor: { color: '#333' },
                    renderEdgeLabels: false,
                    defaultNodeColor: '#8E5BFF',
                    defaultEdgeColor: '#e5e7eb',
                    zIndex: true,
                }}
            >
                <GraphController
                    people={people}
                    currentUserId={currentUserId}
                    onPersonClick={onPersonClick}
                />
            </SigmaContainer>
        </div>
    );
}
