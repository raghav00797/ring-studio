"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Suspense, useEffect } from "react";
import * as THREE from "three";

function RingModel() {
  const gltf = useGLTF("/models/ring_mesh.glb");

  useEffect(() => {
    const scene = gltf.scene;

    // Measure size
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);

    console.log("Ring size:", size);

    // Center ring
    const center = new THREE.Vector3();
    box.getCenter(center);
    scene.position.sub(center);

    // Normalize scale (CRITICAL)
    const TARGET_SIZE = 10;
    const scale = TARGET_SIZE / maxDim;
    scene.scale.setScalar(scale);

    // Simple visible gold material
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.material = new THREE.MeshStandardMaterial({
          color: "#d4af37",
          metalness: 1,
          roughness: 0.3,
        });
        mesh.frustumCulled = false;
      }
    });
  }, [gltf]);

  return <primitive object={gltf.scene} />;
}

export default function RingStudioClient() {
  return (
    <div style={{ width: "100vw", height: "100vh", background: "black" }}>
      <Canvas camera={{ position: [0, 6, 14], fov: 45, near: 0.01, far: 1000 }}>
        {/* Lights */}
        <ambientLight intensity={1} />
        <directionalLight position={[10, 15, 20]} intensity={3} />
        <directionalLight position={[-10, 10, 10]} intensity={1.5} />

        {/* Ring */}
        <Suspense fallback={null}>
          <RingModel />
        </Suspense>

        {/* Controls */}
        <OrbitControls
          enablePan={false}
          enableZoom
          rotateSpeed={0.9}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
    </div>
  );
}
