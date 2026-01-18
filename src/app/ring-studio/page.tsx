"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, useTexture } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

function RenderSettings() {
  const { gl } = useThree();

  useEffect(() => {
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.15;
  }, [gl]);

  return null;
}

function makeJADiamondContrastShader(topTex: THREE.Texture, sideTex: THREE.Texture) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: true,
    uniforms: {
      uTop: { value: topTex },
      uSide: { value: sideTex },
      uTime: { value: 0 },
      uAlpha: { value: 0.92 },
      uContrast: { value: 1.25 },
      uEdgeBoost: { value: 1.2 },
      uSparkle: { value: 0.18 },
    },
    vertexShader: `
      varying vec3 vN;
      varying vec3 vV;

      void main() {
        vec4 wPos = modelMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - wPos.xyz);
        gl_Position = projectionMatrix * viewMatrix * wPos;
      }
    `,
    fragmentShader: `
      uniform sampler2D uTop;
      uniform sampler2D uSide;

      uniform float uTime;
      uniform float uAlpha;
      uniform float uContrast;
      uniform float uEdgeBoost;
      uniform float uSparkle;

      varying vec3 vN;
      varying vec3 vV;

      // ✅ normal-based sphere UV (no mesh UVs needed)
      vec2 sphereUV(vec3 dir) {
        dir = normalize(dir);
        float u = atan(dir.z, dir.x) / 6.2831853 + 0.5;
        float v = asin(clamp(dir.y, -1.0, 1.0)) / 3.1415926 + 0.5;
        return vec2(u, v);
      }

      void main() {
        vec3 N = normalize(vN);
        vec3 V = normalize(vV);

        // ✅ Fresnel edge shine
        float ndv = clamp(dot(N, V), 0.0, 1.0);
        float fres = pow(1.0 - ndv, 5.0);

        // ✅ Angle blend (top vs side)
        float viewTop = clamp(abs(V.y), 0.0, 1.0);
        float blendTop = smoothstep(0.35, 0.9, viewTop);

        // ✅ Sample TOP texture using full normal direction
        float topVal = texture2D(uTop, sphereUV(N)).r;

        // ✅ Sample SIDE texture using flattened normal (removes Y)
        vec3 sideDir = normalize(vec3(N.x, 0.0, N.z));
        float sideVal = texture2D(uSide, sphereUV(sideDir)).r;

        float pattern = mix(sideVal, topVal, blendTop);

        // contrast shaping
        pattern = pow(pattern, 1.0 / uContrast);

        // body brightness
        float body = mix(0.08, 0.98, pattern);

        // edge boost
        body += fres * uEdgeBoost;

        // ✅ controlled fire (small)
        float fire = sin(uTime * 1.4 + pattern * 12.0) * sin(uTime * 1.05 + pattern * 16.0);
        fire = abs(fire);
        fire = pow(fire, 10.0) * uSparkle;

        vec3 fireCol = vec3(
          1.0 + fire * 0.9,
          1.0 + fire * 0.25,
          1.0 - fire * 0.65
        );

        vec3 col = vec3(body) * fireCol;
        col = clamp(col, 0.0, 1.0);

        gl_FragColor = vec4(col, uAlpha);
      }
    `,
  });
}

function RingModel({ isUserInteracting }: { isUserInteracting: boolean }) {
  const { scene } = useGLTF("/models/ring_clean.glb");
  const groupRef = useRef<THREE.Group>(null);

  const topTex = useTexture("/textures/diamond_top.png");
  const sideTex = useTexture("/textures/diamond_side.png");

  useEffect(() => {
    [topTex, sideTex].forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = THREE.ClampToEdgeWrapping;
      t.wrapT = THREE.ClampToEdgeWrapping;
      t.needsUpdate = true;
    });
  }, [topTex, sideTex]);

  const diamondShader = useMemo(() => makeJADiamondContrastShader(topTex, sideTex), [topTex, sideTex]);

  useFrame((state) => {
    diamondShader.uniforms.uTime.value = state.clock.elapsedTime;
  });

  const platinumMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: "#d8d8d8",
      metalness: 1,
      roughness: 0.12,
      envMapIntensity: 5.0,
      clearcoat: 0.6,
      clearcoatRoughness: 0.1,
    });
  }, []);

  useEffect(() => {
    let stoneCount = 0;
    let metalCount = 0;

    scene.traverse((obj: any) => {
      if (!obj.isMesh) return;

      const name = (obj.name || "").toUpperCase();

      if (name.startsWith("STONE_MAIN")) {
        obj.material = diamondShader;
        stoneCount++;
      } else {
        obj.material = platinumMaterial;
        metalCount++;
      }

      obj.frustumCulled = false;
    });

    console.log("✅ STONES FOUND:", stoneCount);
    console.log("✅ METAL PARTS FOUND:", metalCount);

    scene.scale.set(80, 80, 80);
    scene.position.set(0, 0, 0);
  }, [scene, platinumMaterial, diamondShader]);

  useFrame(() => {
    if (!groupRef.current) return;
    if (!isUserInteracting) groupRef.current.rotation.y += 0.003;
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}

export default function RingStudioPage() {
  const [isUserInteracting, setIsUserInteracting] = useState(false);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "white" }}>
      <Canvas
        camera={{
          position: [0, 2.8, 6],
          fov: 30,
          near: 0.01,
          far: 250,
        }}
      >
        <RenderSettings />
        <color attach="background" args={["#ffffff"]} />

        <ambientLight intensity={0.25} />
        <directionalLight position={[12, 18, 14]} intensity={6.0} />
        <directionalLight position={[-12, 10, 12]} intensity={3.0} />
        <directionalLight position={[0, -12, -12]} intensity={0.55} />

        <Environment files="/hdr/studio.hdr" background={false} intensity={4.5} />

        <Suspense fallback={null}>
          <RingModel isUserInteracting={isUserInteracting} />
        </Suspense>

        <OrbitControls
          target={[0, 0.8, 0]}
          enablePan={false}
          enableZoom
          rotateSpeed={1.05}
          dampingFactor={0.1}
          enableDamping
          onStart={() => setIsUserInteracting(true)}
          onEnd={() => setIsUserInteracting(false)}
        />
      </Canvas>
    </div>
  );
}