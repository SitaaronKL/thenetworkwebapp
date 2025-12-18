# InterestGraph Architecture & Implementation Guide

## Overview
The `InterestGraph` component (`src/components/InterestGraph.tsx`) is a specialized **2D WebGL** graph visualization using **Sigma.js** and **Graphology**. It is designed to visualize user interests as distinct, non-overlapping "clouds" of particles surrounding a central label node.

## Technology Stack
- **Rendering**: `@react-sigma/core` (WebGL)
- **Layout Physics**: `@react-sigma/layout-forceatlas2` & Custom Scripted Placement
- **Graph Structure**: `graphology`
- **Framework**: Next.js (Client Component)

## Core Algorithms

### 1. Collision-Aware Random Placement (Smart Cloud)
Instead of a standard Circular or Grid layout, we use a custom **Rejection Sampling** algorithm to place interest centers.
- **Goal**: Create an organic "cloud" look but guarantee no overlap between text labels.
- **Logic**:
  1. Pick a random coordinate within `CLOUD_RADIUS` (2000px).
  2. Check distance against all previously placed centers.
  3. If distance < `MIN_DIST` (550px), reject and retry (up to 200 attempts).
  4. If valid, lock the node (`fixed: true`).
- **Constants**:
  - `CLOUD_RADIUS`: **2000px** (Size of the entire drawing area)
  - `MIN_DIST`: **550px** (Minimum gap between clusters to ensure text visibility on zoom-out)

### 2. Particle Generation (The "Mist")
Each interest center is surrounded by **100 particles** to create a visible cluster/cloud effect.
- **Position**: Gaussian/Normal distribution around the center (`stdev = 50px`).
- **Visuals**:
  - Size: Random `0.5` to `2.5`.
  - Color: Inherits from interest center.
  - **Labels**: `null` (Crucial! Empty strings `''` caused collision bugs. Must be `null` or omitted).
  - **Z-Index**: `0` (Background layer).

### 3. Label Visibility System (Anti-Culling)
Sigma.js naturally hides labels that overlap to prevent clutter ("Occlusion Culling"). We force visibility for the specific centers:
- **`labelGridCellSize: 60`**: Reduced from default (250). A finer grid means Sigma only hides labels if they *physically* overlap very closely. Combined with the `550px` spacing, this guarantees visibility even when zoomed out.
- **`labelRenderedSizeThreshold: 0`**: Ensures labels are rendered even when the camera is zoomed far out.
- **`zIndex: 1000`**: Centers have high Z-Index to prioritize their labels over everything else.

### 4. Direct Settings Manipulation (The Toggle)
To toggle labels ON/OFF without causing a heavy graph reload (flicker):
- We do **NOT** pass the toggle state as a prop to `SigmaContainer` settings (which triggers unmount).
- Instead, we use the `sigma` instance directly inside `GraphController`:
  ```typescript
  sigma.setSetting('renderLabels', showLabels);
  sigma.refresh();
  ```
- This ensures a seamless, instant UI transition.

### 5. Initialization (Flicker Fix)
- The graph component is wrapped in a `div` with `opacity: 0`.
- We use a state `isReady`.
- `isReady` is set to `true` only *after* the graph data is loaded and ForceAtlas2 has started.
- A CSS transition (`opacity 0.7s`) fades the graph in smoothly.

## Settings & Parameters
| Parameter | Value | Reason |
|-----------|-------|--------|
| `ForceAtlas2.gravity` | `0.05` | Keeps particles loose but tethered to centers. |
| `ForceAtlas2.scalingRatio` | `50` | Repulsion strength for particles. |
| `Node Size` (Center) | `10` | Small enough to be subtle, big enough to click. |
| `Label Size` | `14` | Readable standard size. |
| `Edge Weight` (Internal) | `5` | Strong invisible tether for particles. |
