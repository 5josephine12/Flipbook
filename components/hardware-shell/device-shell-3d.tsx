'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { RoundedBox, Environment } from '@react-three/drei'
import * as THREE from 'three'

// Custom shader for soft industrial material with realistic lighting
const deviceMaterialShader = {
  uniforms: {
    uColor: { value: new THREE.Color('#e8e4df') },
    uLightPosition: { value: new THREE.Vector3(5, 8, 10) },
    uViewPosition: { value: new THREE.Vector3(0, 0, 5) },
    uAmbientStrength: { value: 0.4 },
    uDiffuseStrength: { value: 0.6 },
    uSpecularStrength: { value: 0.15 },
    uShininess: { value: 16.0 },
    uFresnelPower: { value: 2.0 },
    uEdgeHighlight: { value: 0.08 },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform vec3 uLightPosition;
    uniform vec3 uViewPosition;
    uniform float uAmbientStrength;
    uniform float uDiffuseStrength;
    uniform float uSpecularStrength;
    uniform float uShininess;
    uniform float uFresnelPower;
    uniform float uEdgeHighlight;
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    
    void main() {
      vec3 normal = normalize(vNormal);
      vec3 lightDir = normalize(uLightPosition - vWorldPosition);
      vec3 viewDir = normalize(uViewPosition - vWorldPosition);
      vec3 halfDir = normalize(lightDir + viewDir);
      
      // Ambient
      vec3 ambient = uAmbientStrength * uColor;
      
      // Diffuse (soft wrap lighting for matte material)
      float diff = max(dot(normal, lightDir), 0.0);
      diff = diff * 0.5 + 0.5; // Wrap lighting
      vec3 diffuse = uDiffuseStrength * diff * uColor;
      
      // Specular (subtle for matte plastic)
      float spec = pow(max(dot(normal, halfDir), 0.0), uShininess);
      vec3 specular = uSpecularStrength * spec * vec3(1.0);
      
      // Fresnel edge highlight (soft rim light)
      float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), uFresnelPower);
      vec3 fresnelColor = uEdgeHighlight * fresnel * vec3(1.0);
      
      // Subtle ambient occlusion at edges
      float ao = smoothstep(0.0, 0.3, abs(vUv.x - 0.5) * 2.0) * smoothstep(0.0, 0.3, abs(vUv.y - 0.5) * 2.0);
      ao = mix(0.92, 1.0, ao);
      
      vec3 finalColor = (ambient + diffuse + specular + fresnelColor) * ao;
      
      // Subtle variation for material texture feel
      float noise = fract(sin(dot(vUv * 100.0, vec2(12.9898, 78.233))) * 43758.5453);
      finalColor += (noise - 0.5) * 0.008;
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
}

// Inner screen material - slightly recessed appearance
const screenMaterialShader = {
  uniforms: {
    uColor: { value: new THREE.Color('#f5f3f0') },
    uShadowColor: { value: new THREE.Color('#d8d4cf') },
    uLightPosition: { value: new THREE.Vector3(5, 8, 10) },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vUv = uv;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform vec3 uShadowColor;
    uniform vec3 uLightPosition;
    
    varying vec3 vNormal;
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    
    void main() {
      vec3 normal = normalize(vNormal);
      vec3 lightDir = normalize(uLightPosition - vWorldPosition);
      
      // Soft diffuse
      float diff = max(dot(normal, lightDir), 0.0) * 0.3 + 0.7;
      
      // Inner shadow gradient (recessed feel)
      float shadowTop = smoothstep(0.0, 0.15, vUv.y);
      float shadowLeft = smoothstep(0.0, 0.1, vUv.x);
      float shadowRight = smoothstep(0.0, 0.1, 1.0 - vUv.x);
      float shadowBottom = smoothstep(0.0, 0.05, 1.0 - vUv.y);
      float innerShadow = shadowTop * shadowLeft * shadowRight * shadowBottom;
      
      vec3 finalColor = mix(uShadowColor, uColor, innerShadow) * diff;
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
}

function DeviceFrame({ isDark = false }: { isDark?: boolean }) {
  const frameRef = useRef<THREE.Mesh>(null)
  const screenRef = useRef<THREE.Mesh>(null)
  const { camera } = useThree()
  
  // Update shader uniforms
  const deviceMaterial = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      ...deviceMaterialShader,
      uniforms: {
        ...deviceMaterialShader.uniforms,
        uColor: { value: new THREE.Color(isDark ? '#2a2826' : '#e8e4df') },
        uViewPosition: { value: camera.position },
      },
    })
    return mat
  }, [isDark, camera.position])
  
  const screenMaterial = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      ...screenMaterialShader,
      uniforms: {
        ...screenMaterialShader.uniforms,
        uColor: { value: new THREE.Color(isDark ? '#1a1918' : '#f5f3f0') },
        uShadowColor: { value: new THREE.Color(isDark ? '#141312' : '#d8d4cf') },
      },
    })
    return mat
  }, [isDark])
  
  useFrame(({ camera }) => {
    if (deviceMaterial.uniforms) {
      deviceMaterial.uniforms.uViewPosition.value.copy(camera.position)
    }
  })
  
  return (
    <group>
      {/* Outer device shell */}
      <RoundedBox
        ref={frameRef}
        args={[16, 10, 0.8]}
        radius={0.4}
        smoothness={8}
        material={deviceMaterial}
      />
      
      {/* Inner screen recess */}
      <RoundedBox
        ref={screenRef}
        args={[14.8, 8.8, 0.1]}
        radius={0.25}
        smoothness={4}
        position={[0, 0, 0.36]}
        material={screenMaterial}
      />
      
      {/* Subtle bezel edge highlight */}
      <mesh position={[0, 0, 0.41]}>
        <planeGeometry args={[14.6, 8.6]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  )
}

interface DeviceShell3DProps {
  children?: React.ReactNode
  className?: string
  isDark?: boolean
}

export function DeviceShell3D({ children, className, isDark = false }: DeviceShell3DProps) {
  return (
    <div className={`relative w-full h-full ${className || ''}`}>
      {/* 3D Canvas background */}
      <div className="absolute inset-0 -z-10">
        <Canvas
          camera={{ position: [0, 0, 12], fov: 35 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 8, 10]} intensity={0.8} />
          <directionalLight position={[-3, 2, 5]} intensity={0.3} />
          
          <DeviceFrame isDark={isDark} />
          
          <Environment preset="studio" background={false} />
        </Canvas>
      </div>
      
      {/* DOM content overlay */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  )
}
