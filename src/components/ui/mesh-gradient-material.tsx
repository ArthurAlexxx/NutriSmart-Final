
'use client'
import { shaderMaterial } from '@react-three/drei';
import { extend, useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';

const MeshGradientMaterial = shaderMaterial(
  {
    u_time: 0,
    u_colors: [],
    u_amplitude: 0.5,
    u_speed: 0.3,
  },
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  `
    uniform float u_time;
    uniform float u_amplitude;
    uniform float u_speed;
    uniform vec3 u_colors[5];
    varying vec2 vUv;

    void main() {
      vec2 p = vUv * 2.0 - 1.0;
      vec3 final_color = vec3(0.0);
      
      for(int i = 0; i < 5; i++) {
        float time_offset = float(i) * 1.5;
        float speed_mult = float(i) * 0.4 + 1.0;
        
        vec2 center = vec2(
          sin(u_time * u_speed * 0.3 * speed_mult + time_offset) * u_amplitude,
          cos(u_time * u_speed * 0.4 * speed_mult + time_offset) * u_amplitude
        );
        
        float dist = distance(p, center);
        float strength = smoothstep(0.7, 0.0, dist);
        
        final_color += u_colors[i] * strength;
      }
      
      gl_FragColor = vec4(final_color, 1.0);
    }
  `
);

extend({ MeshGradientMaterial });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      meshGradientMaterial: any;
    }
  }
}

interface MeshGradientProps {
  colors?: string[];
  u_amplitude?: number;
  u_speed?: number;
  u_time?: number;
  wireframe?: boolean;
}

export function MeshGradientMaterial({
  colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'],
  u_amplitude = 0.5,
  u_speed = 0.3,
  wireframe = false,
  ...props
}: MeshGradientProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null!);

  const u_colors = useMemo(() => {
    return colors.map((color) => new THREE.Color(color));
  }, [colors]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.u_time.value = state.clock.getElapsedTime();
    }
  });

  return (
    <meshGradientMaterial
      ref={materialRef}
      u_colors={u_colors}
      u_amplitude={u_amplitude}
      u_speed={u_speed}
      wireframe={wireframe}
      {...props}
    />
  );
}

export { MeshGradientMaterial as MeshGradientShaderType };
