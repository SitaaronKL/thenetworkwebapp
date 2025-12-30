"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr, Preload, Line } from "@react-three/drei";
import * as THREE from "three";

function usePrefersReducedMotion(): boolean {
  const [prefers, setPrefers] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefers(!!query.matches);
    update();
    try {
      query.addEventListener("change", update);
      return () => query.removeEventListener("change", update);
    } catch {
      // Safari fallback
      query.addListener(update);
      return () => query.removeListener(update);
    }
  }, []);
  return prefers;
}

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

type Tracer = {
  id: number;
  start: THREE.Vector3;
  end: THREE.Vector3;
  color: string;
  t: number; // 0..1 progress
  duration: number; // seconds
};

type ConstellationProps = {
  animated?: boolean;
  radius?: number;
  detail?: number;
};

function TracerLines({
  segments,
  animated,
}: {
  segments: [THREE.Vector3, THREE.Vector3][];
  animated: boolean;
}) {
  const tracersRef = useRef<Tracer[]>([]);
  const [, force] = useState(0);
  const idRef = useRef(1);
  const spawnTimerRef = useRef(0);

  // Neon palette: yellow, cyan, magenta, lime
  const colors = useMemo(
    () => ["#FFD300", "#00FFFF", "#FF00FF", "#39FF14"],
    []
  );

  // Spawn a new tracer along an existing edge segment to stick to the graph
  const spawnTracer = () => {
    if (!segments.length) return;
    const [s, e] = segments[Math.floor(Math.random() * segments.length)];
    const start = s;
    const end = e;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const duration = 0.8 + Math.random() * 0.8; // 0.8s - 1.6s
    const id = idRef.current++;
    tracersRef.current = [
      ...tracersRef.current,
      { id, start, end, color, t: 0, duration },
    ];
  };

  useFrame((_, delta) => {
    if (!animated) return;

    // Periodically spawn new tracers
    spawnTimerRef.current += delta;
    const spawnInterval = 1.1; // fewer spawns
    const maxActive = 4; // fewer concurrent lines
    if (
      spawnTimerRef.current >= spawnInterval &&
      tracersRef.current.length < maxActive
    ) {
      spawnTimerRef.current = 0;
      // Spawn a single tracer for subtler frequency
      spawnTracer();
    }

    // Advance tracers
    let changed = false;
    tracersRef.current = tracersRef.current
      .map((tracer) => {
        const nt = tracer.t + delta / tracer.duration;
        if (nt !== tracer.t) changed = true;
        return { ...tracer, t: nt };
      })
      // Remove after finished and faded
      .filter((tracer) => tracer.t < 1.15);

    // Request re-render only when something changed
    if (changed) {
      // lightweight invalidation
      force((v) => (v + 1) % 1000);
    }
  });

  // Easing for head motion
  const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

  return (
    <>
      {tracersRef.current.map((tracer) => {
        const progress = Math.min(1, easeOutCubic(tracer.t));
        const head = new THREE.Vector3().copy(tracer.start).lerp(tracer.end, progress);

        // Opacity ramps down quickly near the end
        const fadeStart = 0.85;
        const alpha =
          progress < fadeStart
            ? 1
            : Math.max(0, 1 - (progress - fadeStart) / (1 - fadeStart));

        // Two-pass line for neon glow: outer (soft) and inner (core)
        const points = [tracer.start, head];

        return (
          <group key={tracer.id}>
            <Line
              points={points}
              color={tracer.color}
              lineWidth={2.2}
              transparent
              opacity={0.24 * alpha}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
            <Line
              points={points}
              color={tracer.color}
              lineWidth={1.15}
              transparent
              opacity={0.85 * alpha}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </group>
        );
      })}
    </>
  );
}

function Constellation({ animated = true, radius = 1.2, detail = 4 }: ConstellationProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const { pointer } = useThree();

  const baseGeometry = useMemo(
    () => new THREE.IcosahedronGeometry(radius, detail),
    [radius, detail]
  );
  const edgesGeometry = useMemo(
    () => new THREE.EdgesGeometry(baseGeometry),
    [baseGeometry]
  );

  const pointsGeometry = useMemo(() => {
    // Use the vertex positions from the base geometry
    const g = new THREE.BufferGeometry();
    const positions = baseGeometry.attributes.position.array as Float32Array;
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [baseGeometry]);

  // Unique vertices to use as star positions for tracers
  const uniqueVertices = useMemo(() => {
    const positions = baseGeometry.attributes.position.array as Float32Array;
    const seen = new Set<string>();
    const verts: THREE.Vector3[] = [];
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      // Round to reduce duplicates due to floating precision
      const key = `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
      if (!seen.has(key)) {
        seen.add(key);
        verts.push(new THREE.Vector3(x, y, z));
      }
    }
    return verts;
  }, [baseGeometry]);

  // Edge segments (pairs of vertices) from the edges geometry
  const edgeSegments = useMemo(() => {
    const segs: [THREE.Vector3, THREE.Vector3][] = [];
    const arr = edgesGeometry.attributes.position
      .array as Float32Array;
    for (let i = 0; i < arr.length; i += 6) {
      const a = new THREE.Vector3(arr[i], arr[i + 1], arr[i + 2]);
      const b = new THREE.Vector3(arr[i + 3], arr[i + 4], arr[i + 5]);
      segs.push([a, b]);
    }
    return segs;
  }, [edgesGeometry]);

  // Parallax and autorotation
  useFrame((_, delta) => {
    if (!animated) return;
    const group = groupRef.current;
    if (!group) return;
    // Subtle autorotation
    group.rotation.y += delta * 0.1;
    // Parallax from pointer (-1..1)
    const targetX = pointer.y * 0.25;
    const targetY = pointer.x * 0.25;
    group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, targetX, 0.05);
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, targetY + group.rotation.y, 0.02);
  });

  return (
    <group ref={groupRef}>
      {/* Constellation lines */}
      <lineSegments geometry={edgesGeometry}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.3} />
      </lineSegments>
      {/* Star points */}
      <points geometry={pointsGeometry}>
        <pointsMaterial
          color="#ffffff"
          size={0.012}
          sizeAttenuation
          transparent
          opacity={0.85}
        />
      </points>
      {/* Neon tracer lines connecting random stars */}
      <TracerLines segments={edgeSegments} animated={animated} />
    </group>
  );
}

export default function ConstellationSphere() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [canWebgl, setCanWebgl] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setCanWebgl(isWebGLAvailable());
    setIsMobile(typeof window !== "undefined" ? window.innerWidth < 768 : false);
  }, []);

  // Static fallback (no WebGL or reduced motion)
  if (prefersReducedMotion || !canWebgl) {
    return (
      <div
        className="hero3d hero3d-static"
        aria-hidden="true"
      />
    );
  }

  // Slightly lower detail on mobile for performance
  const detail = isMobile ? 3 : 4;
  const radius = 1.25;

  return (
    <div className="hero3d" aria-hidden="true">
      <Canvas
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 3.4], fov: 50 }}
        dpr={[1, 1.75]}
        frameloop="always"
      >
        <ambientLight intensity={0.2} />
        <Constellation animated radius={radius} detail={detail} />
        <AdaptiveDpr pixelated />
        <Preload all />
      </Canvas>
    </div>
  );
}
