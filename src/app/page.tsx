"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, useGLTF, useTexture } from "@react-three/drei";
import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

/** ----------------------------
 *  Render Settings
 *  ---------------------------- */
function RenderSettings() {
  const { gl } = useThree();

  useEffect(() => {
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.15;
  }, [gl]);

  return null;
}

/** ----------------------------
 *  Diamond Shader
 *  ---------------------------- */
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

      vec2 sphereUV(vec3 dir) {
        dir = normalize(dir);
        float u = atan(dir.z, dir.x) / 6.2831853 + 0.5;
        float v = asin(clamp(dir.y, -1.0, 1.0)) / 3.1415926 + 0.5;
        return vec2(u, v);
      }

      void main() {
        vec3 N = normalize(vN);
        vec3 V = normalize(vV);

        float ndv = clamp(dot(N, V), 0.0, 1.0);
        float fres = pow(1.0 - ndv, 5.0);

        float viewTop = clamp(abs(V.y), 0.0, 1.0);
        float blendTop = smoothstep(0.35, 0.9, viewTop);

        float topVal = texture2D(uTop, sphereUV(N)).r;

        vec3 sideDir = normalize(vec3(N.x, 0.0, N.z));
        float sideVal = texture2D(uSide, sphereUV(sideDir)).r;

        float pattern = mix(sideVal, topVal, blendTop);

        pattern = pow(pattern, 1.0 / uContrast);

        float body = mix(0.08, 0.98, pattern);
        body += fres * uEdgeBoost;

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

/** ----------------------------
 *  Metal presets
 *  ---------------------------- */
type MetalId = "white" | "yellow" | "rose";

function metalColorHex(id: MetalId) {
  if (id === "white") return "#d8d8d8";
  if (id === "yellow") return "#e7c15a";
  return "#e2b2a5";
}

/** ----------------------------
 *  Robust object classification
 *  ---------------------------- */
function nameChainContains(obj: THREE.Object3D, search: string) {
  let cur: THREE.Object3D | null = obj;
  const s = search.toUpperCase();

  while (cur) {
    const n = (cur.name || "").toUpperCase();
    if (n.includes(s)) return true;
    cur = cur.parent;
  }
  return false;
}

function isStoneMesh(obj: any) {
  if (!obj?.isMesh) return false;

  const n = (obj.name || "").toUpperCase();
  const parentHasStone = nameChainContains(obj, "STONE");
  const selfHasStone = n.includes("STONE") || n.includes("DIAMOND");

  const matName = ((obj.material?.name as string) || "").toUpperCase();
  const matHasStone = matName.includes("STONE") || matName.includes("DIAMOND");

  return selfHasStone || parentHasStone || matHasStone;
}

function isShankMetalMesh(obj: any) {
  if (!obj?.isMesh) return false;
  const n = (obj.name || "").toUpperCase();
  return n.includes("METAL_SHANK") || n.includes("SHANK") || nameChainContains(obj, "METAL_SHANK") || nameChainContains(obj, "SHANK");
}

function isHeadMetalMesh(obj: any) {
  if (!obj?.isMesh) return false;
  const n = (obj.name || "").toUpperCase();
  return n.includes("METAL_HEAD") || n.includes("HEAD") || nameChainContains(obj, "METAL_HEAD") || nameChainContains(obj, "HEAD");
}

/** ----------------------------
 *  Apply materials
 *  ---------------------------- */
function applyMaterialsRobust(opts: {
  root: THREE.Object3D;
  shankMat: THREE.Material;
  headMat: THREE.Material;
  diamondMat: THREE.Material;
}) {
  const { root, shankMat, headMat, diamondMat } = opts;

  root.traverse((obj: any) => {
    if (!obj.isMesh) return;

    const name = (obj.name || "").toUpperCase();

    if (name.startsWith("ANCHOR_")) {
      obj.visible = false;
      return;
    }

    if (isStoneMesh(obj)) obj.material = diamondMat;
    else if (isShankMetalMesh(obj)) obj.material = shankMat;
    else if (isHeadMetalMesh(obj)) obj.material = headMat;
    else obj.material = headMat;

    obj.frustumCulled = false;
  });
}

/** ----------------------------
 *  3D Viewer Assembly
 *  ---------------------------- */
type ShankId = "plain" | "diamond";
type DiamondShapeId = "round" | "emerald";

function RingViewer3D({
  shankId,
  diamondShapeId,
  shankMetal,
  headMetal,
  isUserInteracting,
}: {
  shankId: ShankId;
  diamondShapeId: DiamondShapeId;
  shankMetal: MetalId;
  headMetal: MetalId;
  isUserInteracting: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const { scene: shankScene } = useGLTF(`/models/shank_${shankId}.glb`);
  const { scene: headUnitScene } = useGLTF(`/models/headunit_${diamondShapeId}.glb`);

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

  const shankMat = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: metalColorHex(shankMetal),
      metalness: 1,
      roughness: 0.12,
      envMapIntensity: 5.0,
      clearcoat: 0.6,
      clearcoatRoughness: 0.1,
    });
  }, [shankMetal]);

  const headMat = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: metalColorHex(headMetal),
      metalness: 1,
      roughness: 0.12,
      envMapIntensity: 5.0,
      clearcoat: 0.6,
      clearcoatRoughness: 0.1,
    });
  }, [headMetal]);

  useEffect(() => {
    shankScene.position.set(0, 0, 0);
    headUnitScene.position.set(0, 0, 0);

    applyMaterialsRobust({
      root: shankScene,
      shankMat,
      headMat,
      diamondMat: diamondShader,
    });

    applyMaterialsRobust({
      root: headUnitScene,
      shankMat,
      headMat,
      diamondMat: diamondShader,
    });

    if (groupRef.current) {
      groupRef.current.scale.set(80, 80, 80);
      groupRef.current.position.set(0, 0, 0);
    }
  }, [shankId, diamondShapeId, shankMetal, headMetal, shankScene, headUnitScene, shankMat, headMat, diamondShader]);

  useFrame(() => {
    if (!groupRef.current) return;
    if (!isUserInteracting) groupRef.current.rotation.y += 0.003;
  });

  return (
    <group ref={groupRef}>
      <primitive object={shankScene} />
      <primitive object={headUnitScene} />
    </group>
  );
}

/** ----------------------------
 *  Premium JA-style Buttons (Upgrade #1)
 *  ---------------------------- */
function getMiniIcon(label: string) {
  const l = label.toLowerCase();

  if (l.includes("plain")) return "▭";
  if (l.includes("diamond")) return "✦";
  if (l.includes("round")) return "◯";
  if (l.includes("emerald")) return "▭";

  if (l.includes("white")) return "◻";
  if (l.includes("yellow")) return "◼";
  if (l.includes("rose")) return "◈";

  return "⬚";
}

function OptionButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        minHeight: 92,
        borderRadius: 14,
        padding: "10px 10px 10px",
        border: active ? "2px solid #111" : "1px solid #e5e5e5",
        background: active ? "#fff" : "#fafafa",
        cursor: "pointer",
        transition: "all 180ms ease",
        boxShadow: active ? "0 10px 24px rgba(0,0,0,0.10)" : "none",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 8,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#fff";
        e.currentTarget.style.borderColor = active ? "#111" : "#cfcfcf";
        if (!active) e.currentTarget.style.boxShadow = "0 10px 24px rgba(0,0,0,0.06)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = active ? "#fff" : "#fafafa";
        e.currentTarget.style.borderColor = active ? "#111" : "#e5e5e5";
        e.currentTarget.style.boxShadow = active ? "0 10px 24px rgba(0,0,0,0.10)" : "none";
      }}
    >
      {/* Icon preview */}
      <div
        style={{
          width: "100%",
          height: 40,
          borderRadius: 12,
          background: active ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.035)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          fontWeight: 700,
          color: "#111",
        }}
      >
        {getMiniIcon(label)}
      </div>

      {/* Label */}
      <div
        style={{
          fontSize: 12,
          fontWeight: active ? 800 : 650,
          color: "#111",
          lineHeight: 1.1,
        }}
      >
        {label}
      </div>

      {/* Active tick */}
      {active && (
        <div style={{ fontSize: 11, color: "#111", fontWeight: 700, opacity: 0.85 }}>
          Selected ✓
        </div>
      )}
    </button>
  );
}

/** ----------------------------
 *  Section wrapper
 *  ---------------------------- */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 13, letterSpacing: 0.2, color: "#444", marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

/** ----------------------------
 *  Main Page (JA style layout)
 *  ---------------------------- */
export default function RingStudioPage() {
  const [isUserInteracting, setIsUserInteracting] = useState(false);

  const [shankId, setShankId] = useState<ShankId>("plain");
  const [diamondShapeId, setDiamondShapeId] = useState<DiamondShapeId>("round");

  const [shankMetal, setShankMetal] = useState<MetalId>("white");
  const [headMetal, setHeadMetal] = useState<MetalId>("white");

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#ffffff",
        display: "grid",
        gridTemplateColumns: "520px 1fr",
      }}
    >
      {/* LEFT Viewer */}
      <div style={{ padding: 18 }}>
        <div style={{ marginBottom: 10, fontSize: 12, color: "#777" }}>◀ BACK TO GALLERY</div>

        <div
          style={{
            background: "linear-gradient(180deg, #e7e7e7, #bdbdbd)",
            borderRadius: 14,
            height: "calc(100vh - 60px)",
            position: "relative",
            overflow: "hidden",
            border: "1px solid #eee",
          }}
        >
          <Canvas
            camera={{
              position: [0, 2.8, 6],
              fov: 30,
              near: 0.01,
              far: 250,
            }}
          >
            <RenderSettings />
            <ambientLight intensity={0.25} />
            <directionalLight position={[12, 18, 14]} intensity={6.0} />
            <directionalLight position={[-12, 10, 12]} intensity={3.0} />
            <directionalLight position={[0, -12, -12]} intensity={0.55} />
            <Environment files="/hdr/studio.hdr" background={false} />

            <Suspense fallback={null}>
              <RingViewer3D
                shankId={shankId}
                diamondShapeId={diamondShapeId}
                shankMetal={shankMetal}
                headMetal={headMetal}
                isUserInteracting={isUserInteracting}
              />
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
      </div>

      {/* RIGHT Controls */}
      <div style={{ padding: "24px 26px", overflowY: "auto", borderLeft: "1px solid #f0f0f0" }}>
        <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>Ring Studio</div>

        {/* ✅ Upgrade #2: GRID layout like JA */}
        <Section title="Shank Type">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 12,
              maxWidth: 340,
            }}
          >
            <OptionButton active={shankId === "plain"} label="Plain Shank" onClick={() => setShankId("plain")} />
            <OptionButton active={shankId === "diamond"} label="Diamond Shank" onClick={() => setShankId("diamond")} />
          </div>
        </Section>

        <Section title="Diamond Shape">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 12,
              maxWidth: 340,
            }}
          >
            <OptionButton active={diamondShapeId === "round"} label="Round" onClick={() => setDiamondShapeId("round")} />
            <OptionButton
              active={diamondShapeId === "emerald"}
              label="Emerald"
              onClick={() => setDiamondShapeId("emerald")}
            />
          </div>
        </Section>

        <Section title="Shank Metal Color">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 12,
              maxWidth: 340,
            }}
          >
            <OptionButton active={shankMetal === "white"} label="White" onClick={() => setShankMetal("white")} />
            <OptionButton active={shankMetal === "yellow"} label="Yellow" onClick={() => setShankMetal("yellow")} />
            <OptionButton active={shankMetal === "rose"} label="Rose" onClick={() => setShankMetal("rose")} />
          </div>
        </Section>

        <Section title="Head Metal Color">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 12,
              maxWidth: 340,
            }}
          >
            <OptionButton active={headMetal === "white"} label="White" onClick={() => setHeadMetal("white")} />
            <OptionButton active={headMetal === "yellow"} label="Yellow" onClick={() => setHeadMetal("yellow")} />
            <OptionButton active={headMetal === "rose"} label="Rose" onClick={() => setHeadMetal("rose")} />
          </div>
        </Section>
      </div>
    </div>
  );
}
