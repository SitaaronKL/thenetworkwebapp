# Graph Visualization Stack Documentation

**Sigma.js + Gephi Lite**

This document describes the graph visualization stack used in this web application, combining **Sigma.js** for high-performance in-browser rendering and **Gephi Lite** for interactive graph exploration and analysis.

---

## Overview

### What this stack does

* Renders **large graphs (thousands of nodes/edges)** efficiently in the browser
* Enables **interactive exploration, filtering, layouts, and metrics**
* Supports **authoring in Gephi / Gephi Lite** and **rendering on the web**

### Core components

* **Sigma.js** → Graph rendering & interaction (WebGL)
* **Graphology** → Graph data model & algorithms
* **Gephi Lite** → Visual exploration, analysis, and authoring tool

---

## Architecture

```
Graph Data (CSV / GEXF / GraphML)
        ↓
   Graphology
 (data model + algorithms)
        ↓
     Sigma.js
(WebGL rendering + interactions)
        ↓
   Web Application UI
```

### Responsibilities

* **Graphology**

  * Stores nodes & edges
  * Runs layouts (ForceAtlas2, etc.)
  * Computes metrics (degree, betweenness, communities)

* **Sigma.js**

  * Renders graphs using WebGL
  * Handles zoom, pan, hover, selection
  * Optimized for large graphs

* **Gephi Lite**

  * Visual graph editor & analyzer
  * Runs layouts and metrics visually
  * Exports graphs for web use

---

## Sigma.js

### What it is

**Sigma.js** is an open-source JavaScript library for visualizing large graphs in the browser using **WebGL**, built on top of **Graphology**.

### Why Sigma.js

* Fast rendering for **large graphs**
* GPU-accelerated (WebGL)
* Designed specifically for **networks**, unlike general visualization tools

### Installation

#### Using npm

```bash
npm install sigma graphology
```

#### Using CDN

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/sigma.js/2.4.0/sigma.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/graphology/0.25.4/graphology.umd.min.js"></script>
```

---

### Basic Usage Example

```js
import Graph from "graphology";
import Sigma from "sigma";

const graph = new Graph();

graph.addNode("1", {
  label: "Node 1",
  x: 0,
  y: 0,
  size: 10,
  color: "blue",
});

graph.addNode("2", {
  label: "Node 2",
  x: 1,
  y: 1,
  size: 20,
  color: "red",
});

graph.addEdge("1", "2", {
  size: 5,
  color: "purple",
});

const renderer = new Sigma(graph, document.getElementById("container"));
```

---

## Sigma.js Use Cases

### 1. Display

* Render a static graph
* Nodes have predefined position, size, color
* Common when exporting from Gephi

### 2. Explore

* Hover to inspect nodes
* Search nodes
* Highlight neighborhoods

### 3. Interact

* Drag & drop nodes
* Create or remove nodes and edges
* Real-time graph editing

### 4. Customize

* Custom node shapes
* Images inside nodes
* Different renderers per node type

---

## Frequently Asked Questions (Sigma.js)

**Where do graph algorithms live?**
→ In **Graphology**, not Sigma.js.

**CSV to graph?**
→ Parse CSV → build graph with Graphology → render with Sigma.js.

**Why not D3.js?**

* D3: SVG/Canvas → better for small, custom visuals
* Sigma.js: WebGL → better for **large networks**

**React support?**
→ Use `@react-sigma`

**Angular support?**
→ Possible, but requires manual lifecycle handling

---

## Gephi Lite

### What it is

**Gephi Lite** is an open-source, browser-based network analysis tool — a lighter, web-native version of Gephi.

* No installation
* Runs fully in the browser
* Data stays local (or optionally GitHub-backed)

🔗 [https://lite.gephi.org/](https://lite.gephi.org/)

---

## Gephi Lite Core Features

### Import

* CSV (Source / Target)
* GEXF
* GraphML
* GitHub-hosted files

### Graph View

* Zoom, pan, drag nodes
* Lasso / rectangle selection
* Touch & multitouch support

### Data Table

* Inspect nodes & edges
* Edit attributes
* Add columns
* Search & sort

---

## Visual Customization (Gephi Lite)

### Appearance

* Color nodes/edges by attribute or metric
* Size nodes by degree or centrality
* Dynamic legends auto-generated

### Labels

* Control label density
* Scale labels by node size
* Adjustable label thresholds

---

## Layouts

### ForceAtlas2

* Force-directed layout
* Tunable parameters:

  * Scaling
  * Prevent overlap
  * Adjust sizes
* Used to spatialize networks meaningfully

---

## Metrics & Analysis

Available metrics include:

* Degree
* Betweenness centrality
* Community detection (modularity)
* Network structure metrics

Metrics are stored as node attributes and can be reused for:

* Coloring
* Sizing
* Filtering

---

## Filtering

* Filter nodes or edges by:

  * Attributes
  * Degree
  * Topology
* Interactive histograms show remaining graph context

---

## Export & Persistence

### Export

* Graph files: `.gexf`
* Images: `.png`

### Save project

* Local `.json`
* GitHub Gist (optional)

---

## Sigma.js + Gephi Lite Workflow

**Recommended workflow**

1. Explore & analyze graph in **Gephi Lite**
2. Apply layouts, metrics, filters
3. Export graph as **GEXF**
4. Load graph into **Graphology**
5. Render in app using **Sigma.js**

---

## Embedding & Integration

### Embed Gephi Lite

* Use iFrame with graph URL

### Control via JavaScript

* Gephi Lite provides a JS driver
* Supports programmatic control of:

  * Layouts
  * Filters
  * Appearance
  * Data

---

## In the Wild

Projects using Sigma.js include:

* Gephi Lite
* GraphCommons
* Retina
* Polinode
* BloodHound
* ipysigma (Jupyter)
* MARVEL Graphs

---

## Licensing

* **Sigma.js** → MIT License
* **Gephi Lite** → GPL-3.0

---

## References

* Sigma.js: [https://sigmajs.org](https://sigmajs.org)
* Sigma.js GitHub: [https://github.com/jacomyal/sigma.js](https://github.com/jacomyal/sigma.js)
* Gephi Lite: [https://lite.gephi.org](https://lite.gephi.org)
* Gephi Docs: [https://docs.gephi.org/lite](https://docs.gephi.org/lite)

---

If you want, I can next:

* **Translate this into UI copy**
* **Design an information architecture / sidebar**
* **Map features → screens**
* **Create empty Figma section labels**
