/**
 * InterestGraph.tsx
 * =================
 * 
 * An interactive visualization of user interests using Sigma.js graph library.
 * Displays interests as colorful particle clusters that users can click to explore.
 * 
 * THEME SYSTEM (Dark-Mode-First Approach)
 * ----------------------------------------
 * This component follows the app's "dark-mode-first" theme strategy:
 * 
 * 1. All colors are styled for DARK MODE by default:
 *    - Background: Black (#000000)
 *    - Labels: White (#ffffff)
 *    - Toggle button: White/dark contrast
 * 
 * 2. LIGHT MODE is achieved via a global CSS filter on <html>:
 *    `filter: invert(1) hue-rotate(180deg)`
 *    This automatically inverts all colors, turning:
 *    - Black backgrounds → White backgrounds
 *    - White text → Black text
 *    - Colors are hue-rotated to maintain their appearance
 * 
 * 3. WHY THIS APPROACH?
 *    - Consistent theming across the entire app
 *    - Single source of truth for theme switching
 *    - No need for duplicate color definitions
 *    - Media elements (images) can be counter-inverted where needed
 * 
 * SIGMA.JS BACKGROUND FIX
 * -----------------------
 * The @react-sigma/core library imports its own stylesheet (line 8) that sets
 * a default WHITE background on the canvas. To override this, we must set
 * `background: '#000000'` on MULTIPLE layers:
 *   - The outer wrapper div
 *   - The inner container div  
 *   - The SigmaContainer's style prop
 * 
 * This ensures no white background "bleeds through" from the library's defaults.
 */

'use client';

import React, { useEffect, useState, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { SigmaContainer, useLoadGraph, useSigma, useRegisterEvents } from '@react-sigma/core';
import { useLayoutForceAtlas2 } from '@react-sigma/layout-forceatlas2';
import Graph from 'graphology';
import { NodeCircleProgram } from 'sigma/rendering';
// NOTE: This import brings in Sigma's default styles, which include a white background.
// We override this with explicit background colors on our container elements.
import '@react-sigma/core/lib/style.css';

// Error boundary to catch WebGL/Sigma rendering errors
interface ErrorBoundaryProps {
    children: ReactNode;
    fallback: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(_: Error): ErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.warn('InterestGraph WebGL error caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback;
        }

        return this.props.children;
    }
}

interface InterestGraphProps {
    interests: string[];
    userFullName?: string;
    onGraphLoaded?: () => void;
    onInterestClick?: (interest: string) => void;
}

// Track if graph has been initialized globally (persists across component remounts)
let globalGraphInitialized = false;
let lastInterestsKey = '';

const GraphController: React.FC<{
    interests: string[];
    userFullName: string;
    onGraphLoaded?: () => void;
    setIsReady: (ready: boolean) => void;
    showLabels: boolean;
    onInterestClick?: (interest: string) => void;
    isMobile: boolean;
}> = ({ interests, userFullName, onGraphLoaded, setIsReady, showLabels, onInterestClick, isMobile }) => {
    const loadGraph = useLoadGraph();
    const sigma = useSigma();
    const registerEvents = useRegisterEvents();
    const hasInitialized = React.useRef(false);
    
    // Create a stable key for the current interests
    const interestsKey = interests.join('-');
    
    // Store isMobile in a ref so it doesn't cause hook recreation
    const isMobileRef = React.useRef(isMobile);

    // Handle Label Toggle without re-mounting
    useEffect(() => {
        if (!sigma) return;
        // Only refresh if graph has been initialized (has nodes)
        const graph = sigma.getGraph();
        if (!graph || graph.order === 0) return;
        
        // setSetting is the proper method in Sigma v2/v3
        try {
            sigma.setSetting('renderLabels', showLabels);
            // Also force refresh to apply change immediately
            sigma.refresh();
        } catch (e) {
            // Ignore errors during refresh (node program may not be ready yet)
            console.warn('Sigma refresh warning:', e);
        }
    }, [showLabels, sigma]);
    
    // Memoize ForceAtlas2 settings to prevent hook recreation
    // PERFORMANCE: Reduced iterations from 150 to 50 for faster loading
    const forceAtlasSettings = useMemo(() => ({
        iterations: 50,
        settings: {
            gravity: isMobileRef.current ? 0.02 : 0.05,
            scalingRatio: isMobileRef.current ? 80 : 50,
            adjustSizes: true,
            barnesHutOptimize: true,
            linLogMode: false,
        },
    }), []);
    
    const { assign: assignForceAtlas2 } = useLayoutForceAtlas2(forceAtlasSettings);

    useEffect(() => {
        if (!sigma) return;
        
        // Register events
        registerEvents({
            clickNode: (event) => {
                const nodeData = event.node;
                const graph = sigma.getGraph();
                if (!graph || graph.order === 0) return;
                const nodeAttributes = graph.getNodeAttributes(nodeData);

                if (nodeAttributes.isClusterCenter && onInterestClick) {
                    onInterestClick(nodeAttributes.label);
                }
            },
            enterNode: (event) => {
                const nodeData = event.node;
                const graph = sigma.getGraph();
                if (!graph || graph.order === 0) return;
                const nodeAttributes = graph.getNodeAttributes(nodeData);
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
        // Skip if already initialized with same interests (prevents reload on tab switch)
        if (hasInitialized.current) {
            // If interests haven't changed, just call onGraphLoaded immediately
            if (interestsKey === lastInterestsKey && globalGraphInitialized) {
                setIsReady(true);
                if (onGraphLoaded) onGraphLoaded();
            }
            return;
        }
        
        // Check if graph was previously initialized with same interests
        if (globalGraphInitialized && interestsKey === lastInterestsKey) {
            hasInitialized.current = true;
            setIsReady(true);
            if (onGraphLoaded) onGraphLoaded();
            return;
        }
        
        hasInitialized.current = true;
        lastInterestsKey = interestsKey;

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
        // On mobile: use elliptical distribution (taller than wide) to use vertical space
        const mobile = isMobileRef.current;
        const placedCenters: { x: number, y: number }[] = [];
        const MIN_DIST = mobile ? 600 : 550; // Larger on mobile to prevent collisions
        const CLOUD_RADIUS_X = mobile ? 600 : 2000; // Narrower horizontally on mobile
        const CLOUD_RADIUS_Y = mobile ? 3000 : 2000; // Much taller vertically on mobile
        const particleSpread = mobile ? 30 : 50; // Tighter particle clouds on mobile

        interests.forEach((interest, i) => {
            const color = palette[i % palette.length];
            const centerId = `center-${i}`;

            let cx = 0;
            let cy = 0;
            let valid = false;
            let attempts = 0;

            while (!valid && attempts < 200) {
                const angle = Math.random() * Math.PI * 2;
                const r = Math.sqrt(Math.random());
                // Elliptical distribution: different radii for X and Y
                const candidateX = r * CLOUD_RADIUS_X * Math.cos(angle);
                const candidateY = r * CLOUD_RADIUS_Y * Math.sin(angle);

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
                cx = (CLOUD_RADIUS_X + 300) * Math.cos(angle);
                cy = (CLOUD_RADIUS_Y + 300) * Math.sin(angle);
            }

            placedCenters.push({ x: cx, y: cy });


            graph.addNode(centerId, {
                label: interest,
                x: cx,
                y: cy,
                size: mobile ? 8 : 10, // Slightly smaller centers on mobile
                color: color,
                isClusterCenter: true,
                sectionIndex: i,
                zIndex: 1000,
                fixed: true,
            });

            // PERFORMANCE: Reduced particle count for faster loading (was 100/70)
            const particleCount = mobile ? 35 : 50;
            const particleIds: string[] = [];

            for (let j = 0; j < particleCount; j++) {
                const particleId = `p-${i}-${j}`;
                particleIds.push(particleId);

                const px = cx + gaussianRandom(0, particleSpread);
                const py = cy + gaussianRandom(0, particleSpread);

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

            // PERFORMANCE: Removed inter-particle edges - they were invisible anyway
            // and caused O(n) iterations per cluster. Just add minimal edges for layout.
            if (particleIds.length > 0) {
                graph.addEdge(centerId, particleIds[0], {
                    size: 0,
                    color: 'rgba(0,0,0,0)',
                    weight: 5
                });
            }
        });

        loadGraph(graph);
        assignForceAtlas2();

        // PERFORMANCE: Reduced delay from 1000ms to 300ms
        // ForceAtlas2 completes quickly with fewer iterations
        setTimeout(() => {
            globalGraphInitialized = true;
            setIsReady(true);
            if (onGraphLoaded) onGraphLoaded();
        }, 300);

    }, [interests, userFullName, loadGraph, assignForceAtlas2, onGraphLoaded, setIsReady, interestsKey]);

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
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const [isContainerReady, setIsContainerReady] = useState(false);

    // Check mobile once on mount, use ref to avoid re-renders
    const isMobileRef = React.useRef(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);

    /**
     * Sigma.js Renderer Settings
     * 
     * IMPORTANT: Settings are memoized with empty deps to prevent graph re-renders.
     * Changing settings after mount causes Sigma to reinitialize, losing graph state.
     * 
     * THEME: Labels use white (#ffffff) for dark mode. The global invert filter
     * will automatically make them black when light mode is active.
     */
    const settings = useMemo(() => {
        const mobile = isMobileRef.current;
        return {
            // Node program registration for Sigma v3
            nodeProgramClasses: {
                circle: NodeCircleProgram,
            },
            defaultNodeType: 'circle',
            labelFont: 'Inter, system-ui, sans-serif',
            labelWeight: '600',
            labelSize: mobile ? 12 : 14,
            // THEME: White labels for dark mode - inverts to black in light mode
            labelColor: { color: '#ffffff' },
            renderEdgeLabels: false,
            defaultNodeColor: '#06b6d4',
            defaultEdgeColor: 'rgba(0,0,0,0)',
            labelRenderedSizeThreshold: 0,
            defaultDrawNodeHover: () => { },
            // Fine-tune collision grid to allow tight packing
            labelDensity: mobile ? 0.5 : 1, // Lower density on mobile to reduce overlaps
            labelGridCellSize: mobile ? 80 : 60, // Larger on mobile to reduce label collisions
            zIndex: true,
            // Avoid crashes when the graph is inside a hidden tab/zero-width container.
            // We still guard render based on container size below.
            allowInvalidContainer: true
        };
    }, []); // Empty deps - settings are fixed after mount

    // For button styling, we can use a simple check
    const isMobile = typeof window !== 'undefined' ? window.innerWidth <= 768 : false;

    /**
     * Component Render
     * 
     * THEME LAYERING (all black backgrounds for dark mode):
     * 1. Outer div: background: #000000 - catches any gaps
     * 2. Inner container div: background: #000000 - wraps Sigma
     * 3. SigmaContainer style: background: #000000 - overrides library default
     * 
     * All three layers are needed because:
     * - Sigma's imported CSS sets a white background on its canvas
     * - CSS specificity requires inline styles to override
     * - Multiple layers ensure no white "bleeds through" during render
     */
    useEffect(() => {
        if (!containerRef.current) return;
        const node = containerRef.current;
        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            const { width, height } = entry.contentRect;
            // Only set to ready when dimensions are valid
            // Never set back to false once ready (prevents unmount on tab switch)
            if (width > 0 && height > 0) {
                setIsContainerReady(true);
            }
            // Don't set to false when hidden - keep the graph mounted
        });
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000000' }}>

            {/* 
              Label Toggle Button
              A pill-shaped horizontal toggle that shows/hides interest labels on the graph.
              Positioned at the top center of the graph container.
            */}
            <div
                onClick={() => setShowLabels(!showLabels)}
                className="interest-graph-toggle-btn"
                title={showLabels ? "Hide Labels" : "Show Labels"}
            />
            
            {/* 
              Toggle Button Styles (using styled-jsx for media query support)
              
              THEME: Styled for dark mode with white/black contrast.
              - Active (labels on): White background, black knob (knob on right)
              - Inactive (labels off): Dark gray background, white knob (knob on left)
              Global invert filter will flip these for light mode.
              
              POSITION: Top center, horizontal orientation
            */}
            <style jsx>{`
                .interest-graph-toggle-btn {
                    position: absolute;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 10;
                    width: 64px;
                    height: 34px;
                    border-radius: 999px;
                    background: ${showLabels ? '#ffffff' : '#333333'};
                    border: 1px solid ${showLabels ? '#ffffff' : '#555555'};
                    cursor: pointer;
                    transition: background 0.15s ease, border 0.15s ease;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
                }
                
                .interest-graph-toggle-btn::after {
                    content: "";
                    position: absolute;
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    background: ${showLabels ? '#000000' : '#ffffff'};
                    top: 2px;
                    left: ${showLabels ? '32px' : '2px'};
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
                    transition: left 0.15s ease;
                }
                
                .interest-graph-toggle-btn:hover {
                    opacity: 0.9;
                }
                
                @media (max-width: 768px) {
                    .interest-graph-toggle-btn {
                        top: 16px;
                    }
                }
            `}</style>

            {/* 
              Graph Container
              
              CRITICAL: Both this div AND the SigmaContainer need explicit black backgrounds.
              The @react-sigma/core library's CSS (imported at top) sets a white background
              on the Sigma canvas by default. We must override at multiple levels to ensure
              the dark theme is properly applied.
              
              Without these overrides, the graph would appear white even though the rest
              of the page is dark, breaking the theme consistency.
            */}
            <div
                ref={containerRef}
                style={{
                    width: '100%',
                    height: '100%',
                    minWidth: '1px',
                    minHeight: '1px',
                    background: '#000000'
                }}
            >
                {isContainerReady ? (
                    <ErrorBoundary 
                        fallback={
                            <div style={{ 
                                display: 'flex', 
                                flexDirection: 'column',
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                height: '100%', 
                                color: '#fff',
                                padding: '20px',
                                textAlign: 'center'
                            }}>
                                <p style={{ marginBottom: '16px', fontSize: '16px' }}>Your interests:</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                                    {interests.map((interest, i) => (
                                        <span 
                                            key={i} 
                                            style={{ 
                                                padding: '8px 16px', 
                                                background: '#6366f1', 
                                                borderRadius: '20px',
                                                fontSize: '14px',
                                                cursor: onInterestClick ? 'pointer' : 'default'
                                            }}
                                            onClick={() => onInterestClick?.(interest)}
                                        >
                                            {interest}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        }
                    >
                        <SigmaContainer
                            style={{ height: '100%', width: '100%', background: '#000000' }}
                            settings={settings}
                        >
                            <GraphController
                                interests={interests}
                                userFullName={userFullName}
                                onGraphLoaded={onGraphLoaded}
                                setIsReady={setIsReady}
                                showLabels={showLabels}
                                onInterestClick={onInterestClick}
                                isMobile={isMobileRef.current}
                            />
                        </SigmaContainer>
                    </ErrorBoundary>
                ) : null}
            </div>
        </div>
    );
}
