'use client';

import React, { useEffect } from 'react';
import { SigmaContainer, useLoadGraph, useSigma } from '@react-sigma/core';
import { useLayoutForceAtlas2 } from '@react-sigma/layout-forceatlas2';
import Graph from 'graphology';
import { NetworkPerson } from '@/types/network';
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
            scalingRatio: 10,
            adjustSizes: true,
        },
    });

    useEffect(() => {
        const graph = new Graph();

        // Add Nodes
        people.forEach((person) => {
            const isUser = person.id === currentUserId;
            graph.addNode(person.id, {
                label: person.name,
                x: Math.random(),
                y: Math.random(),
                size: isUser ? 15 : 8,
                color: person.starColor || '#8E5BFF',
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
                    labelFont: 'Inter, system-ui, sans-serif',
                    labelWeight: '600',
                    labelSize: 12,
                    labelColor: { color: '#333' },
                    renderEdgeLabels: false,
                    defaultNodeColor: '#8E5BFF',
                    defaultEdgeColor: '#e5e7eb',
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

