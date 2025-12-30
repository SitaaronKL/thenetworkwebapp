"use client";

import { useEffect, useRef, useLayoutEffect } from "react";
import { Renderer, Program, Mesh, Triangle, Color } from "ogl";

import "./Threads.css";

const vertexShader = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform float iTime;
uniform vec3 iResolution;
uniform vec3 uColor;
uniform float uAmplitude;
uniform float uDistance;
uniform vec2 uMouse;

#define PI 3.1415926538

const int u_line_count = 40;
const float u_line_width = 7.0;
const float u_line_blur = 10.0;

float Perlin2D(vec2 P) {
    vec2 Pi = floor(P);
    vec4 Pf_Pfmin1 = P.xyxy - vec4(Pi, Pi + 1.0);
    vec4 Pt = vec4(Pi.xy, Pi.xy + 1.0);
    Pt = Pt - floor(Pt * (1.0 / 71.0)) * 71.0;
    Pt += vec2(26.0, 161.0).xyxy;
    Pt *= Pt;
    Pt = Pt.xzxz * Pt.yyww;
    vec4 hash_x = fract(Pt * (1.0 / 951.135664));
    vec4 hash_y = fract(Pt * (1.0 / 642.949883));
    vec4 grad_x = hash_x - 0.49999;
    vec4 grad_y = hash_y - 0.49999;
    vec4 grad_results = inversesqrt(grad_x * grad_x + grad_y * grad_y)
        * (grad_x * Pf_Pfmin1.xzxz + grad_y * Pf_Pfmin1.yyww);
    grad_results *= 1.4142135623730950;
    vec2 blend = Pf_Pfmin1.xy * Pf_Pfmin1.xy * Pf_Pfmin1.xy
               * (Pf_Pfmin1.xy * (Pf_Pfmin1.xy * 6.0 - 15.0) + 10.0);
    vec4 blend2 = vec4(blend, vec2(1.0 - blend));
    return dot(grad_results, blend2.zxzx * blend2.wwyy);
}

float pixel(float count, vec2 resolution) {
    return (1.0 / max(resolution.x, resolution.y)) * count;
}

float lineFn(vec2 st, float width, float perc, float offset, vec2 mouse, float time, float amplitude, float distance) {
    float split_offset = (perc * 0.4);
    float split_point = 0.1 + split_offset;

    float amplitude_normal = smoothstep(split_point, 0.7, st.y);
    float amplitude_strength = 0.5;
    float finalAmplitude = amplitude_normal * amplitude_strength
                           * amplitude * (1.0 + (mouse.x - 0.5) * 0.2);

    float time_scaled = time / 10.0 + (mouse.y - 0.5) * 1.0;
    float blur = smoothstep(split_point, split_point + 0.05, st.y) * perc;

    float ynoise = mix(
        Perlin2D(vec2(time_scaled, st.y + perc) * 2.5),
        Perlin2D(vec2(time_scaled, st.y + time_scaled) * 3.5) / 1.5,
        st.y * 0.3
    );

    float x = 0.5 + (perc - 0.5) * distance + ynoise / 2.0 * finalAmplitude;

    float line_start = smoothstep(
        x + (width / 2.0) + (u_line_blur * pixel(1.0, iResolution.xy) * blur),
        x,
        st.x
    );

    float line_end = smoothstep(
        x,
        x - (width / 2.0) - (u_line_blur * pixel(1.0, iResolution.xy) * blur),
        st.x
    );

    return clamp(
        (line_start - line_end) * (1.0 - smoothstep(0.0, 1.0, pow(perc, 0.3))),
        0.0,
        1.0
    );
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    float line_strength = 1.0;
    for (int i = 0; i < u_line_count; i++) {
        float p = float(i) / float(u_line_count);
        line_strength *= (1.0 - lineFn(
            uv,
            u_line_width * pixel(1.0, iResolution.xy) * (1.0 - p),
            p,
            (PI * 1.0) * p,
            uMouse,
            iTime,
            uAmplitude,
            uDistance
        ));
    }

    float colorVal = 1.0 - line_strength;
    
    // Use provided uniform color for the lines
    vec3 baseColor = uColor;
    
    fragColor = vec4(baseColor * colorVal, colorVal);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;

interface ThreadsProps {
  color?: number[];
  colors?: number[][]; // optional palette to cycle through
  amplitude?: number;
  distance?: number;
  enableMouseInteraction?: boolean;
  [key: string]: any;
}

const Threads: React.FC<ThreadsProps> = ({
  color = [1, 1, 1],
  colors,
  amplitude = 1,
  distance = 0,
  enableMouseInteraction = false,
  ...rest
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameId = useRef<number>();

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const renderer = new Renderer({ alpha: true });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    container.appendChild(gl.canvas);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        iTime: { value: 0 },
        iResolution: {
          value: new Color(
            gl.canvas.width,
            gl.canvas.height,
            gl.canvas.width / gl.canvas.height
          ),
        },
        uColor: { value: new Color(...color) },
        uAmplitude: { value: amplitude },
        uDistance: { value: distance },
        uMouse: { value: new Float32Array([0.5, 0.5]) },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });

    function resize() {
      const { clientWidth, clientHeight } = container;
      renderer.setSize(clientWidth, clientHeight);
      program.uniforms.iResolution.value.r = clientWidth;
      program.uniforms.iResolution.value.g = clientHeight;
      program.uniforms.iResolution.value.b = clientWidth / clientHeight;
    }
    window.addEventListener("resize", resize);
    resize();

    let currentMouse = [0.5, 0.5];
    let targetMouse = [0.5, 0.5];

    function handleMouseMove(e: MouseEvent) {
      const x = e.clientX / window.innerWidth;
      const y = 1.0 - (e.clientY / window.innerHeight);
      targetMouse = [x, y];
    }
    function handleMouseLeave() {
      targetMouse = [0.5, 0.5];
    }
    if (enableMouseInteraction) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseleave", handleMouseLeave);
    }

    // Brand secondary palette (normalized 0-1). Order based on style guide.
    const defaultPalette: number[][] = [
      [123 / 255, 209 / 255, 238 / 255], // Soft Sky #7BD1EE
      [255 / 255, 137 / 255,  47 / 255], // Peach Glow #FF892F
      [241 / 255, 218 / 255,  33 / 255], // Lemon Zest #F1DA21
      [132 / 255, 190 / 255,  57 / 255], // Spring Leaf #84BE39
      [244 / 255,  81 / 255,  32 / 255], // Coral Ember #F45120
    ];

    const palette = (colors && colors.length > 0 ? colors : defaultPalette).map(
      (c) => [c[0], c[1], c[2]]
    );

    const secondsPerColor = 6.0;
    const secondsCrossfade = 1.5;

    function lerp(a: number, b: number, t: number) {
      return a + (b - a) * t;
    }

    function update(t: number) {
      if (enableMouseInteraction) {
        const smoothing = 0.05;
        currentMouse[0] += smoothing * (targetMouse[0] - currentMouse[0]);
        currentMouse[1] += smoothing * (targetMouse[1] - currentMouse[1]);
        program.uniforms.uMouse.value[0] = currentMouse[0];
        program.uniforms.uMouse.value[1] = currentMouse[1];
      } else {
        program.uniforms.uMouse.value[0] = 0.5;
        program.uniforms.uMouse.value[1] = 0.5;
      }
      const timeSeconds = t * 0.001;
      program.uniforms.iTime.value = timeSeconds;

      // Palette cycling with smooth crossfade
      const totalColors = palette.length;
      const totalCycleTime = secondsPerColor * totalColors;
      const cycleTime = timeSeconds % totalCycleTime;
      const activeIndex = Math.floor(cycleTime / secondsPerColor) % totalColors;
      const nextIndex = (activeIndex + 1) % totalColors;
      const segmentTime = cycleTime - activeIndex * secondsPerColor;
      const blend = Math.min(
        Math.max((segmentTime - (secondsPerColor - secondsCrossfade)) / secondsCrossfade, 0),
        1
      );

      const current = palette[activeIndex];
      const next = palette[nextIndex];
      const r = lerp(current[0], next[0], blend);
      const g = lerp(current[1], next[1], blend);
      const b = lerp(current[2], next[2], blend);

      const colorUniform = program.uniforms.uColor.value as Color;
      colorUniform.r = r;
      colorUniform.g = g;
      colorUniform.b = b;

      renderer.render({ scene: mesh });
      animationFrameId.current = requestAnimationFrame(update);
    }
    // Render an immediate first frame to avoid initial flash
    program.uniforms.iTime.value = 0;
    program.uniforms.uMouse.value[0] = 0.5;
    program.uniforms.uMouse.value[1] = 0.5;
    renderer.render({ scene: mesh });
    animationFrameId.current = requestAnimationFrame(update);

    return () => {
      if (animationFrameId.current)
        cancelAnimationFrame(animationFrameId.current);
      window.removeEventListener("resize", resize);

      if (enableMouseInteraction) {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseleave", handleMouseLeave);
      }
      if (container.contains(gl.canvas)) container.removeChild(gl.canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [color, amplitude, distance, enableMouseInteraction]);

  return <div ref={containerRef} className="threads-container" {...rest} />;
};

export default Threads; 