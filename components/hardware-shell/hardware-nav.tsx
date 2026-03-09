'use client'

import { useRef, useMemo, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { RoundedBox, Html } from '@react-three/drei'
import * as THREE from 'three'
import { cn } from '@/lib/utils'

// Shader for tactile button surfaces
const buttonMaterialShader = {
  uniforms: {
    uColor: { value: new THREE.Color('#eae6e1') },
    uPressed: { value: 0.0 },
    uHovered: { value: 0.0 },
    uActive: { value: 0.0 },
    uLightPosition: { value: new THREE.Vector3(2, 4, 5) },
    uViewPosition: { value: new THREE.Vector3(0, 0, 3) },
  },
  vertexShader: `
    uniform float uPressed;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    
    void main() {
      vNormal = normalize(normalMatrix * normal);
      
      // Slight inward press when active
      vec3 pos = position;
      pos.z -= uPressed * 0.02;
      
      vPosition = pos;
      vec4 worldPos = modelMatrix * vec4(pos, 1.0);
      vWorldPosition = worldPos.xyz;
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform float uPressed;
    uniform float uHovered;
    uniform float uActive;
    uniform vec3 uLightPosition;
    uniform vec3 uViewPosition;
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    
    void main() {
      vec3 normal = normalize(vNormal);
      vec3 lightDir = normalize(uLightPosition - vWorldPosition);
      vec3 viewDir = normalize(uViewPosition - vWorldPosition);
      vec3 halfDir = normalize(lightDir + viewDir);
      
      // Base color with active state tint
      vec3 baseColor = uColor;
      
      // Ambient
      vec3 ambient = 0.45 * baseColor;
      
      // Diffuse with wrap lighting
      float diff = max(dot(normal, lightDir), 0.0);
      diff = diff * 0.5 + 0.5;
      vec3 diffuse = 0.55 * diff * baseColor;
      
      // Specular
      float spec = pow(max(dot(normal, halfDir), 0.0), 24.0);
      vec3 specular = 0.12 * spec * vec3(1.0);
      
      // Fresnel rim
      float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.5);
      vec3 rim = 0.06 * fresnel * vec3(1.0);
      
      // Inner bevel shadow
      float bevelShadow = smoothstep(0.0, 0.08, vUv.x) * 
                          smoothstep(0.0, 0.08, 1.0 - vUv.x) * 
                          smoothstep(0.0, 0.08, vUv.y) * 
                          smoothstep(0.0, 0.08, 1.0 - vUv.y);
      bevelShadow = mix(0.88, 1.0, bevelShadow);
      
      // Pressed state darkening
      float pressDarken = mix(1.0, 0.92, uPressed);
      
      // Hover brightening
      float hoverBrighten = mix(1.0, 1.04, uHovered);
      
      vec3 finalColor = (ambient + diffuse + specular + rim) * bevelShadow * pressDarken * hoverBrighten;
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
}

interface NavButton3DProps {
  label: string
  isActive: boolean
  position: [number, number, number]
  width?: number
  onClick: () => void
  isDark?: boolean
}

function NavButton3D({ label, isActive, position, width = 1.8, onClick, isDark = false }: NavButton3DProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)
  const { camera } = useThree()
  
  const material = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      ...buttonMaterialShader,
      uniforms: {
        ...buttonMaterialShader.uniforms,
        uColor: { value: new THREE.Color(isDark ? '#2d2b28' : '#eae6e1') },
        uViewPosition: { value: camera.position.clone() },
      },
    })
    return mat
  }, [isDark, camera.position])
  
  useFrame(({ camera }) => {
    if (material.uniforms) {
      material.uniforms.uViewPosition.value.copy(camera.position)
      material.uniforms.uHovered.value = THREE.MathUtils.lerp(
        material.uniforms.uHovered.value,
        hovered ? 1 : 0,
        0.15
      )
      material.uniforms.uPressed.value = THREE.MathUtils.lerp(
        material.uniforms.uPressed.value,
        pressed ? 1 : 0,
        0.2
      )
      material.uniforms.uActive.value = THREE.MathUtils.lerp(
        material.uniforms.uActive.value,
        isActive ? 1 : 0,
        0.1
      )
    }
  })
  
  return (
    <group position={position}>
      <RoundedBox
        ref={meshRef}
        args={[width, 0.7, 0.15]}
        radius={0.08}
        smoothness={4}
        material={material}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => { setHovered(false); setPressed(false) }}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => { setPressed(false); onClick() }}
      />
      
      {/* LED indicator */}
      <mesh position={[width * 0.35, 0.25, 0.08]}>
        <circleGeometry args={[0.035, 16]} />
        <meshBasicMaterial 
          color={isActive ? '#4ade80' : (isDark ? '#4a4845' : '#c8c5c0')} 
        />
      </mesh>
      
      {/* Label via HTML overlay */}
      <Html
        position={[0, -0.08, 0.08]}
        center
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <span 
          className={cn(
            "text-[11px] font-light tracking-wide whitespace-nowrap",
            isDark ? "text-neutral-300" : "text-neutral-600"
          )}
          style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}
        >
          {label}
        </span>
      </Html>
    </group>
  )
}

interface HardwareNavProps {
  tabs: Array<{ id: string; label: string }>
  activeTab: string
  onTabChange: (id: string) => void
  isDark?: boolean
  className?: string
}

export function HardwareNav({ tabs, activeTab, onTabChange, isDark = false, className }: HardwareNavProps) {
  const totalWidth = tabs.length * 2 + 0.3
  
  return (
    <div className={cn("w-full h-20", className)}>
      <Canvas
        camera={{ position: [0, 0, 3.5], fov: 30 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 4, 5]} intensity={0.7} />
        <directionalLight position={[-2, 1, 3]} intensity={0.25} />
        
        {/* Nav tray background */}
        <RoundedBox
          args={[totalWidth + 0.4, 1.0, 0.12]}
          radius={0.12}
          smoothness={4}
          position={[0, 0, -0.1]}
        >
          <meshStandardMaterial 
            color={isDark ? '#1f1e1c' : '#dedad5'} 
            roughness={0.85}
            metalness={0.05}
          />
        </RoundedBox>
        
        {/* Navigation buttons */}
        {tabs.map((tab, index) => {
          const xOffset = (index - (tabs.length - 1) / 2) * 2
          return (
            <NavButton3D
              key={tab.id}
              label={tab.label}
              isActive={activeTab === tab.id}
              position={[xOffset, 0, 0]}
              onClick={() => onTabChange(tab.id)}
              isDark={isDark}
            />
          )
        })}
      </Canvas>
    </div>
  )
}
