import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  findFocusedInteractiveObject,
  getFacilityInteractiveObjects,
  isWalkableFacilityPosition,
} from '../facility/engine';
import { FacilityInteractiveObject, FacilitySaveState } from '../facility/types';
import { soundEngine } from '../game/sound';

interface FacilityViewport3DProps {
  saveState: FacilitySaveState;
  isPausedOrModal: boolean;
  isCinematicCamera?: boolean;
  onUpdatePlayerTransform: (pos: [number, number, number], yaw: number) => void;
  onFocusObjectChange: (obj: FacilityInteractiveObject | null) => void;
  onInteractWithObject: (obj: FacilityInteractiveObject) => void;
}

function createSpaceshipFloorTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Matte dark-slate aerospace deck plating (#18212C)
  ctx.fillStyle = '#18212C';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle brushed deck plates
  ctx.strokeStyle = '#243140';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 500, 500);

  // Inner technical seam lines
  ctx.strokeStyle = '#101720';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 512);
  ctx.moveTo(0, 256);
  ctx.lineTo(512, 256);
  ctx.stroke();

  // Subtle cyan guide micro-ticks at corners
  ctx.fillStyle = 'rgba(34, 211, 238, 0.35)';
  ctx.fillRect(16, 16, 18, 3);
  ctx.fillRect(16, 16, 3, 18);
  ctx.fillRect(478, 16, 18, 3);
  ctx.fillRect(493, 16, 3, 18);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(28, 28);
  return tex;
}

function createHolographicEarthTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Translucent glowing cyan ocean base
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, 'rgba(8, 145, 178, 0.55)');
  grad.addColorStop(0.5, 'rgba(6, 182, 212, 0.38)');
  grad.addColorStop(1, 'rgba(8, 145, 178, 0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // Latitude & Longitude graticule grid lines (matching the holographic globe in the reference photo)
  ctx.strokeStyle = 'rgba(103, 232, 249, 0.55)';
  ctx.lineWidth = 1.5;
  for (let x = 0; x <= 1024; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let y = 0; y <= 512; y += 42.66) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  // Brighter equator & tropic rings
  ctx.strokeStyle = 'rgba(224, 247, 250, 0.85)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, 256);
  ctx.lineTo(1024, 256);
  ctx.stroke();

  // Draw glowing white-cyan continental silhouettes (Africa, Europe, Asia, Americas, Australia)
  ctx.fillStyle = '#E0F7FA';
  ctx.shadowColor = '#22D3EE';
  ctx.shadowBlur = 14;

  const drawContinent = (pts: Array<[number, number]>) => {
    ctx.beginPath();
    pts.forEach(([px, py], i) => {
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
  };

  // Africa (prominent center-front in reference image)
  drawContinent([
    [475, 195],
    [535, 192],
    [575, 215],
    [605, 255],
    [590, 305],
    [562, 368],
    [535, 385],
    [515, 345],
    [502, 285],
    [465, 255],
    [458, 220],
  ]);

  // Europe & Scandinavia
  drawContinent([
    [468, 110],
    [530, 95],
    [585, 112],
    [595, 158],
    [555, 182],
    [505, 182],
    [465, 165],
  ]);

  // Asia & Arabian Peninsula & India
  drawContinent([
    [585, 105],
    [720, 92],
    [835, 120],
    [860, 175],
    [805, 235],
    [755, 265],
    [705, 225],
    [668, 265],
    [635, 218],
    [598, 232],
    [585, 195],
  ]);

  // North America
  drawContinent([
    [135, 95],
    [265, 88],
    [315, 145],
    [275, 210],
    [235, 235],
    [195, 198],
    [145, 155],
  ]);

  // South America
  drawContinent([
    [258, 248],
    [325, 265],
    [358, 315],
    [325, 398],
    [292, 425],
    [272, 355],
    [252, 290],
  ]);

  // Australia
  drawContinent([
    [775, 325],
    [855, 320],
    [872, 368],
    [825, 395],
    [772, 372],
  ]);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createSectorNeonSignTexture(
  cyrillicOrCode: string,
  englishSector: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0F1722';
  ctx.fillRect(0, 0, 512, 128);

  // Subtle dark-slate frame
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.45)';
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, 504, 120);

  // Glowing cyan neon bay title (matching ХЕМОФОРМ / КВАНТОФОРМ / БИОФОРМ in reference photo)
  ctx.shadowColor = '#22D3EE';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#E0F7FA';
  ctx.font = '800 44px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(cyrillicOrCode, 256, 62);

  ctx.shadowBlur = 6;
  ctx.fillStyle = '#38BDF8';
  ctx.font = '600 18px "JetBrains Mono", monospace';
  ctx.fillText(englishSector, 256, 100);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export const FacilityViewport3D: React.FC<FacilityViewport3DProps> = ({
  saveState,
  isPausedOrModal,
  isCinematicCamera = false,
  onUpdatePlayerTransform,
  onFocusObjectChange,
  onInteractWithObject,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [webglFallback, setWebglFallback] = useState(false);
  const [isLoading3D, setIsLoading3D] = useState(true);

  const saveStateRef = useRef(saveState);
  saveStateRef.current = saveState;

  const isPausedRef = useRef(isPausedOrModal);
  isPausedRef.current = isPausedOrModal;

  const isCinematicRef = useRef(isCinematicCamera);
  isCinematicRef.current = isCinematicCamera;

  const onInteractRef = useRef(onInteractWithObject);
  onInteractRef.current = onInteractWithObject;

  const onFocusRef = useRef(onFocusObjectChange);
  onFocusRef.current = onFocusObjectChange;

  const onTransformRef = useRef(onUpdatePlayerTransform);
  onTransformRef.current = onUpdatePlayerTransform;

  // Player kinematic ref
  const playerRef = useRef<{
    x: number;
    y: number;
    z: number;
    yaw: number;
    pitch: number;
    bobPhase: number;
    focusedObject: FacilityInteractiveObject | null;
  }>({
    x: saveState.playerPosition[0],
    y: saveState.playerPosition[1],
    z: saveState.playerPosition[2],
    yaw: saveState.playerYaw,
    pitch: 0,
    bobPhase: 0,
    focusedObject: null,
  });

  // Sync external teleport / waypoint jumps
  useEffect(() => {
    const p = playerRef.current;
    const dist = Math.hypot(
      p.x - saveState.playerPosition[0],
      p.z - saveState.playerPosition[2]
    );
    if (dist > 1.2) {
      p.x = saveState.playerPosition[0];
      p.y = saveState.playerPosition[1];
      p.z = saveState.playerPosition[2];
      p.yaw = saveState.playerYaw;
    }
  }, [saveState.playerPosition, saveState.playerYaw]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglFallback(true);
      return;
    }

    const width = Math.max(320, container.clientWidth || window.innerWidth);
    const height = Math.max(320, container.clientHeight || window.innerHeight);
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglFallback(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0E1722');
    scene.fog = new THREE.FogExp2('#0E1722', 0.016);

    // Studio environment map for realistic white/silver aerospace & metallic reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 110);
    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    // ========================================================================
    // SPACESHIP MATERIALS (Matched to Reference Rotunda Interior)
    // ========================================================================
    const floorTex = createSpaceshipFloorTexture(maxAniso);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.42,
      metalness: 0.48,
    });

    // Aerospace Titanium White (Ceiling dome rings, freestanding consoles, holoprojector ring)
    const shipWhiteMat = new THREE.MeshStandardMaterial({
      color: '#E8EEF5',
      roughness: 0.24,
      metalness: 0.18,
    });

    // Brushed Silver-Alloy (Console trim, ring bevels, structural joints)
    const shipSilverMat = new THREE.MeshStandardMaterial({
      color: '#CBD5E1',
      roughness: 0.28,
      metalness: 0.68,
    });

    // Matte Dark-Slate Bulkhead & Rib Material
    const wallMat = new THREE.MeshStandardMaterial({
      color: '#1A2432',
      roughness: 0.52,
      metalness: 0.58,
    });

    const pillarMat = new THREE.MeshStandardMaterial({
      color: '#121923',
      roughness: 0.36,
      metalness: 0.78,
    });

    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: '#1E293B',
      roughness: 0.32,
      metalness: 0.82,
    });

    // Glowing White-Cyan Dome Cove Light Material
    const whiteCyanEmissiveMat = new THREE.MeshStandardMaterial({
      color: '#F0FDFA',
      emissive: '#67E8F9',
      emissiveIntensity: 1.85,
      roughness: 0.15,
    });

    const cyanEmissiveMat = new THREE.MeshStandardMaterial({
      color: '#22D3EE',
      emissive: '#22D3EE',
      emissiveIntensity: 1.55,
      roughness: 0.18,
    });

    const blueEmissiveMat = new THREE.MeshStandardMaterial({
      color: '#38BDF8',
      emissive: '#0284C7',
      emissiveIntensity: 1.35,
      roughness: 0.22,
    });

    const amberEmissiveMat = new THREE.MeshStandardMaterial({
      color: '#FACC15',
      emissive: '#F59E0B',
      emissiveIntensity: 1.45,
      roughness: 0.2,
    });

    const redEmergencyMat = new THREE.MeshStandardMaterial({
      color: '#EF4444',
      emissive: '#EF4444',
      emissiveIntensity: 1.6,
      roughness: 0.2,
    });

    const greenEmissiveMat = new THREE.MeshStandardMaterial({
      color: '#A3E635',
      emissive: '#84CC16',
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });

    // ========================================================================
    // LIGHTING (Bright White-Cyan Spaceship Bridge Illumination)
    // ========================================================================
    const ambientLight = new THREE.AmbientLight('#D8ECF8', 1.65);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight('#E0F7FA', '#111924', 1.45);
    hemiLight.position.set(0, 7, -3.5);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight('#F8FAFC', 1.75);
    dirLight.position.set(6, 14, 8);
    scene.add(dirLight);

    // Central Hologram & Dome Point Light
    const holoPointLight = new THREE.PointLight('#22D3EE', 3.2, 22);
    holoPointLight.position.set(0, 2.6, -3.5);
    scene.add(holoPointLight);

    // ========================================================================
    // ARCHITECTURE BUILDER HELPERS
    // ========================================================================
    const buildRoom = (
      minX: number,
      maxX: number,
      minZ: number,
      maxZ: number,
      ceilingY = 4.4,
      useWhiteCeiling = false
    ) => {
      const w = maxX - minX;
      const d = maxZ - minZ;
      const cx = (minX + maxX) / 2;
      const cz = (minZ + maxZ) / 2;

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(cx, 0, cz);
      scene.add(floor);

      const ceiling = new THREE.Mesh(
        new THREE.PlaneGeometry(w, d),
        useWhiteCeiling ? shipWhiteMat : wallMat
      );
      ceiling.rotation.x = Math.PI / 2;
      ceiling.position.set(cx, ceilingY, cz);
      scene.add(ceiling);

      // Corner structural ribs
      const corners: Array<[number, number]> = [
        [minX + 0.3, minZ + 0.3],
        [maxX - 0.3, minZ + 0.3],
        [minX + 0.3, maxZ - 0.3],
        [maxX - 0.3, maxZ - 0.3],
      ];
      for (const [px, pz] of corners) {
        const col = new THREE.Mesh(new THREE.BoxGeometry(0.55, ceilingY, 0.55), pillarMat);
        col.position.set(px, ceilingY / 2, pz);
        scene.add(col);
      }
    };

    const addWallSegment = (x1: number, z1: number, x2: number, z2: number, h = 4.4) => {
      const len = Math.hypot(x2 - x1, z2 - z1);
      if (len < 0.1) return;
      const yaw = -Math.atan2(z2 - z1, x2 - x1);
      const midX = (x1 + x2) / 2;
      const midZ = (z1 + z2) / 2;

      const wall = new THREE.Mesh(new THREE.BoxGeometry(len, h, 0.35), wallMat);
      wall.position.set(midX, h / 2, midZ);
      wall.rotation.y = yaw;
      scene.add(wall);

      // Upper white frieze band (matching the sleek white upper wall soffit in the reference image)
      const upperBand = new THREE.Mesh(new THREE.BoxGeometry(len, 0.52, 0.42), shipWhiteMat);
      upperBand.position.set(midX, h - 0.28, midZ);
      upperBand.rotation.y = yaw;
      scene.add(upperBand);

      // Lower brushed-silver baseboard & cyan trim strip
      const strip = new THREE.Mesh(new THREE.BoxGeometry(len, 0.05, 0.39), cyanEmissiveMat);
      strip.position.set(midX, 0.95, midZ);
      strip.rotation.y = yaw;
      scene.add(strip);
    };

    // Build all 7 connected spaceship rooms (Central Command has a bright aerospace white ceiling)
    buildRoom(-6, 6, 18, 28, 4.0, false); // 1. Maintenance Bay 01
    buildRoom(-7, 7, 6, 18, 4.4, false); // 2. Generator Room
    buildRoom(-15, 15, -14, 6, 5.2, true); // 3. Central Command Rotunda Bridge
    buildRoom(-32, -15, -11, 3, 4.4, false); // 4. Communication Centre
    buildRoom(15, 32, -11, 3, 4.4, false); // 5. Archive Vault
    buildRoom(-14, -1, -28, -14, 4.2, false); // 6. Financial Control
    buildRoom(1, 14, -28, -14, 4.2, false); // 7. Systems Repair

    // Perimeter Walls with Doorway Cutouts
    addWallSegment(-6, 28, 6, 28, 4.0);
    addWallSegment(-6, 18, -6, 28, 4.0);
    addWallSegment(6, 18, 6, 28, 4.0);
    addWallSegment(-6, 18, -1.8, 18, 4.0);
    addWallSegment(1.8, 18, 6, 18, 4.0);

    addWallSegment(-7, 6, -7, 18, 4.4);
    addWallSegment(7, 6, 7, 18, 4.4);
    addWallSegment(-7, 6, -2.0, 6, 4.4);
    addWallSegment(2.0, 6, 7, 6, 4.4);

    // Central Command Rotunda Walls
    addWallSegment(-15, 6, -7, 6, 5.2);
    addWallSegment(7, 6, 15, 6, 5.2);
    addWallSegment(-15, -14, -15, -6.0, 5.2);
    addWallSegment(-15, -2.0, -15, 6, 5.2);
    addWallSegment(15, -14, 15, -6.0, 5.2);
    addWallSegment(15, -2.0, 15, 6, 5.2);
    addWallSegment(-15, -14, -9.5, -14, 5.2);
    addWallSegment(-5.5, -14, 5.5, -14, 5.2);
    addWallSegment(9.5, -14, 15, -14, 5.2);

    // Communication Centre (West Wing)
    addWallSegment(-32, -11, -15, -11, 4.4);
    addWallSegment(-32, 3, -15, 3, 4.4);
    addWallSegment(-32, -11, -32, 3, 4.4);

    // Archive Vault (East Wing)
    addWallSegment(15, -11, 32, -11, 4.4);
    addWallSegment(15, 3, 32, 3, 4.4);
    addWallSegment(32, -11, 32, 3, 4.4);

    // Financial Control (NW) & Systems Repair (NE)
    addWallSegment(-14, -28, -1, -28, 4.2);
    addWallSegment(-14, -28, -14, -14, 4.2);
    addWallSegment(-1, -28, -1, -14, 4.2);
    addWallSegment(1, -28, 14, -28, 4.2);
    addWallSegment(1, -28, 1, -14, 4.2);
    addWallSegment(14, -28, 14, -14, 4.2);

    // ========================================================================
    // SPACESHIP COMMAND ROTUNDA HERO ARCHITECTURE (From Reference Photos)
    // ========================================================================
    const rotundaCenterZ = -3.5;

    // 1. Multi-Tiered Recessed Circular Ceiling Dome above (0, 4.5..5.2, -3.5)
    const domeGroup = new THREE.Group();
    domeGroup.position.set(0, 4.75, rotundaCenterZ);

    // Outer white ceiling soffit torus & bright cyan-white neon cove tube
    const outerSoffitRing = new THREE.Mesh(
      new THREE.TorusGeometry(8.2, 0.38, 16, 64),
      shipWhiteMat
    );
    outerSoffitRing.rotation.x = Math.PI / 2;
    outerSoffitRing.position.y = 0.05;
    domeGroup.add(outerSoffitRing);

    const outerNeonCove = new THREE.Mesh(
      new THREE.TorusGeometry(7.72, 0.09, 12, 64),
      whiteCyanEmissiveMat
    );
    outerNeonCove.rotation.x = Math.PI / 2;
    outerNeonCove.position.y = -0.08;
    domeGroup.add(outerNeonCove);

    // Concentric stepped interior dome rings
    const midDomeRing1 = new THREE.Mesh(
      new THREE.TorusGeometry(6.1, 0.26, 14, 56),
      shipSilverMat
    );
    midDomeRing1.rotation.x = Math.PI / 2;
    midDomeRing1.position.y = 0.16;
    domeGroup.add(midDomeRing1);

    const midDomeRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(4.45, 0.24, 14, 48),
      shipWhiteMat
    );
    midDomeRing2.rotation.x = Math.PI / 2;
    midDomeRing2.position.y = 0.24;
    domeGroup.add(midDomeRing2);

    const innerDomeNeon = new THREE.Mesh(
      new THREE.TorusGeometry(2.65, 0.08, 12, 48),
      whiteCyanEmissiveMat
    );
    innerDomeNeon.rotation.x = Math.PI / 2;
    innerDomeNeon.position.y = 0.22;
    domeGroup.add(innerDomeNeon);

    // 12 Radial skylight panels & structural ribs inside the recessed ceiling dome
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 3.2), shipWhiteMat);
      rib.position.set(Math.sin(angle) * 3.55, 0.24, Math.cos(angle) * 3.55);
      rib.rotation.y = angle;
      domeGroup.add(rib);

      // Glowing cyan-tinted skylight panel between ribs
      const panelAngle = angle + Math.PI / 12;
      const skylight = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 0.08, 1.35),
        i % 2 === 0 ? cyanEmissiveMat : blueEmissiveMat
      );
      skylight.position.set(Math.sin(panelAngle) * 3.55, 0.34, Math.cos(panelAngle) * 3.55);
      skylight.rotation.y = panelAngle;
      domeGroup.add(skylight);
    }

    // Central circular glowing white-cyan dome core emitter
    const centerDomeCap = new THREE.Mesh(
      new THREE.CylinderGeometry(1.75, 2.15, 0.26, 36),
      shipWhiteMat
    );
    centerDomeCap.position.y = 0.26;
    domeGroup.add(centerDomeCap);

    const centerDomeLight = new THREE.Mesh(
      new THREE.CylinderGeometry(1.32, 1.32, 0.08, 36),
      whiteCyanEmissiveMat
    );
    centerDomeLight.position.y = 0.11;
    domeGroup.add(centerDomeLight);

    scene.add(domeGroup);

    // 2. Stepped Circular Charcoal & White Rotunda Floor Platform at (0, y, -3.5)
    const outerCharcoalStep = new THREE.Mesh(
      new THREE.CylinderGeometry(6.8, 7.1, 0.05, 64),
      pillarMat
    );
    outerCharcoalStep.position.set(0, 0.025, rotundaCenterZ);
    scene.add(outerCharcoalStep);

    const outerStepRim = new THREE.Mesh(
      new THREE.TorusGeometry(6.85, 0.035, 10, 64),
      shipSilverMat
    );
    outerStepRim.rotation.x = Math.PI / 2;
    outerStepRim.position.set(0, 0.05, rotundaCenterZ);
    scene.add(outerStepRim);

    const midCharcoalStep = new THREE.Mesh(
      new THREE.CylinderGeometry(5.15, 5.35, 0.08, 64),
      darkMetalMat
    );
    midCharcoalStep.position.set(0, 0.055, rotundaCenterZ);
    scene.add(midCharcoalStep);

    const midStepCyanRing = new THREE.Mesh(
      new THREE.TorusGeometry(5.18, 0.03, 10, 64),
      cyanEmissiveMat
    );
    midStepCyanRing.rotation.x = Math.PI / 2;
    midStepCyanRing.position.set(0, 0.095, rotundaCenterZ);
    scene.add(midStepCyanRing);

    // Bright White Circular Platform Pad directly under the holoprojector console (matching reference image)
    const innerWhitePad = new THREE.Mesh(
      new THREE.CylinderGeometry(3.45, 3.55, 0.09, 64),
      shipWhiteMat
    );
    innerWhitePad.position.set(0, 0.095, rotundaCenterZ);
    scene.add(innerWhitePad);

    // 3. 12-Segmented White/Silver Holoprojector Console Ring at (0, y, -3.5)
    const holoConsoleGroup = new THREE.Group();
    holoConsoleGroup.position.set(0, 0.14, rotundaCenterZ);

    for (let i = 0; i < 12; i++) {
      const segAngle = (i / 12) * Math.PI * 2;
      const radius = 2.05;
      const segGroup = new THREE.Group();
      segGroup.position.set(Math.sin(segAngle) * radius, 0, Math.cos(segAngle) * radius);
      segGroup.rotation.y = segAngle;

      // White lower console housing
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.76, 0.56), shipWhiteMat);
      body.position.y = 0.38;
      segGroup.add(body);

      // Dark-slate recessed front grill / access bay
      const frontBay = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.48, 0.06), pillarMat);
      frontBay.position.set(0, 0.35, 0.27);
      segGroup.add(frontBay);

      // Slanted silver top console deck
      const topDeck = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.12, 0.62), shipSilverMat);
      topDeck.position.set(0, 0.8, -0.02);
      topDeck.rotation.x = 0.22;
      segGroup.add(topDeck);

      // Glowing cyan operator touch-screen on top deck
      const screen = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.03, 0.36),
        i % 3 === 0 ? cyanEmissiveMat : blueEmissiveMat
      );
      screen.position.set(0, 0.86, 0.02);
      screen.rotation.x = 0.22;
      segGroup.add(screen);

      // Dark structural divider pillar between segments
      const divider = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.82, 0.62), pillarMat);
      divider.position.set(0.5, 0.41, 0);
      segGroup.add(divider);

      holoConsoleGroup.add(segGroup);
    }

    // Inner projector emitter ring inside the 12-segmented console
    const innerEmitterRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.52, 0.08, 12, 48),
      cyanEmissiveMat
    );
    innerEmitterRing.rotation.x = Math.PI / 2;
    innerEmitterRing.position.y = 0.72;
    holoConsoleGroup.add(innerEmitterRing);

    scene.add(holoConsoleGroup);

    // 4. Glowing Cyan-Blue Holographic Planetary Earth Globe above the 12-Segmented Console
    const earthTex = createHolographicEarthTexture(maxAniso);
    const holoGlobeGroup = new THREE.Group();
    holoGlobeGroup.position.set(0, 2.02, rotundaCenterZ);

    const earthCoreMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.26, 40, 28),
      new THREE.MeshBasicMaterial({
        map: earthTex,
        transparent: true,
        opacity: 0.96,
      })
    );
    // Orient Africa/Europe/Asia toward the main rotunda camera view
    earthCoreMesh.rotation.y = -0.35;
    holoGlobeGroup.add(earthCoreMesh);

    const earthWireShell = new THREE.Mesh(
      new THREE.SphereGeometry(1.31, 24, 16),
      new THREE.MeshBasicMaterial({
        color: '#22D3EE',
        wireframe: true,
        transparent: true,
        opacity: 0.38,
      })
    );
    holoGlobeGroup.add(earthWireShell);

    // Equatorial holographic scanline ring
    const equatorScanRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.42, 0.016, 10, 64),
      whiteCyanEmissiveMat
    );
    equatorScanRing.rotation.x = Math.PI / 2;
    holoGlobeGroup.add(equatorScanRing);

    scene.add(holoGlobeGroup);

    // Tier 2 & Tier 3 Upgrade Visual Rings above Holotable
    const tier2Ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.58, 0.025, 10, 56),
      blueEmissiveMat
    );
    tier2Ring.position.set(0, 2.02, rotundaCenterZ);
    tier2Ring.rotation.x = Math.PI / 3;
    scene.add(tier2Ring);

    const tier3Ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.76, 0.03, 10, 64),
      cyanEmissiveMat
    );
    tier3Ring.position.set(0, 2.02, rotundaCenterZ);
    tier3Ring.rotation.x = -Math.PI / 4;
    scene.add(tier3Ring);

    // 5. Angled Dark-Slate Wall Ribs, Cyan-Lit Bay Windows & Glowing Neon Sector Signs
    const addSectorHeaderSign = (
      x: number,
      y: number,
      z: number,
      rotY: number,
      codeTitle: string,
      subLabel: string
    ) => {
      const signTex = createSectorNeonSignTexture(codeTitle, subLabel, maxAniso);
      const signMat = new THREE.MeshBasicMaterial({ map: signTex });
      const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.05), signMat);
      signMesh.position.set(x, y, z);
      signMesh.rotation.y = rotY;
      scene.add(signMesh);
    };

    // Match the glowing cyan Cyrillic/Sci-Fi headers from the reference photo
    addSectorHeaderSign(-14.72, 3.85, -4.0, Math.PI / 2, 'ХЕМОФОРМ', 'SECTOR 02 // COMM CENTRE');
    addSectorHeaderSign(-5.2, 3.85, -13.72, 0, 'КВАНТОФОРМ', 'SECTOR 04 // FINANCIAL CONTROL');
    addSectorHeaderSign(5.2, 3.85, -13.72, 0, 'БИОФОРМ', 'SECTOR 05 // SYSTEMS REPAIR');
    addSectorHeaderSign(14.72, 3.85, -4.0, -Math.PI / 2, 'АРХИВФОРМ', 'SECTOR 03 // ARCHIVE VAULT');
    addSectorHeaderSign(0, 3.85, 5.72, Math.PI, 'ЭНЕРГОФОРМ', 'SECTOR 01 // GENERATOR BAY');

    // Angled dark-slate structural ribs around Central Command (matching the black angled struts in reference photo)
    const addAngledStructuralRib = (x: number, z: number, rotY: number) => {
      const ribGroup = new THREE.Group();
      ribGroup.position.set(x, 0, z);
      ribGroup.rotation.y = rotY;

      const lowerFoot = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.25, 0.85), pillarMat);
      lowerFoot.position.set(0, 0.62, 0.25);
      lowerFoot.rotation.x = -0.28;
      ribGroup.add(lowerFoot);

      const mainSpine = new THREE.Mesh(new THREE.BoxGeometry(0.52, 3.2, 0.65), pillarMat);
      mainSpine.position.set(0, 2.4, 0);
      ribGroup.add(mainSpine);

      const upperStrut = new THREE.Mesh(new THREE.BoxGeometry(0.58, 1.35, 0.9), pillarMat);
      upperStrut.position.set(0, 4.3, 0.28);
      upperStrut.rotation.x = 0.35;
      ribGroup.add(upperStrut);

      // Glowing white-cyan status bolts on the rib
      const bolt1 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), whiteCyanEmissiveMat);
      bolt1.position.set(0, 1.15, 0.58);
      ribGroup.add(bolt1);

      const bolt2 = bolt1.clone();
      bolt2.position.set(0, 3.85, 0.58);
      ribGroup.add(bolt2);

      scene.add(ribGroup);
    };

    addAngledStructuralRib(-14.4, -9.5, Math.PI / 2);
    addAngledStructuralRib(-14.4, 1.5, Math.PI / 2);
    addAngledStructuralRib(14.4, -9.5, -Math.PI / 2);
    addAngledStructuralRib(14.4, 1.5, -Math.PI / 2);
    addAngledStructuralRib(-10.2, -13.4, 0);
    addAngledStructuralRib(0, -13.4, 0);
    addAngledStructuralRib(10.2, -13.4, 0);

    // Panoramic Cyan-Backlit Observation Bay Windows & Recessed Lab Portals (matching reference photo)
    const addCyanBayWindow = (
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      rotY: number
    ) => {
      const winGroup = new THREE.Group();
      winGroup.position.set(x, y, z);
      winGroup.rotation.y = rotY;

      const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, h + 0.3, 0.18), pillarMat);
      winGroup.add(frame);

      const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), cyanEmissiveMat);
      glass.position.z = 0.11;
      winGroup.add(glass);

      // Horizontal dark structural mullions across the cyan glass
      for (let i = -2; i <= 2; i++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, 0.06), pillarMat);
        bar.position.set(0, i * (h / 5), 0.13);
        winGroup.add(bar);
      }

      scene.add(winGroup);
    };

    addCyanBayWindow(-14.7, 2.0, -10.2, 3.6, 2.1, Math.PI / 2);
    addCyanBayWindow(14.7, 2.0, -10.2, 3.6, 2.1, -Math.PI / 2);

    // Recessed Glass Lab Portals under КВАНТОФОРМ & БИОФОРМ with white interior arches
    const addRecessedLabPortal = (x: number, z: number, rotY: number) => {
      const portalGroup = new THREE.Group();
      portalGroup.position.set(x, 1.9, z);
      portalGroup.rotation.y = rotY;

      const outerBezel = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.5, 0.22), shipSilverMat);
      portalGroup.add(outerBezel);

      const darkInterior = new THREE.Mesh(new THREE.BoxGeometry(4.0, 2.15, 0.25), pillarMat);
      portalGroup.add(darkInterior);

      // White sci-fi wing struts inside the bay window (matching the white Y-struts in the reference bays)
      const leftWing = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.14, 0.28), shipWhiteMat);
      leftWing.position.set(-1.0, -0.15, 0.05);
      leftWing.rotation.z = -0.25;
      portalGroup.add(leftWing);

      const rightWing = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.14, 0.28), shipWhiteMat);
      rightWing.position.set(1.0, -0.15, 0.05);
      rightWing.rotation.z = 0.25;
      portalGroup.add(rightWing);

      const centerRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.28, 0.05, 10, 24),
        whiteCyanEmissiveMat
      );
      centerRing.position.set(0, -0.2, 0.14);
      portalGroup.add(centerRing);

      scene.add(portalGroup);
    };

    addRecessedLabPortal(-5.2, -13.68, 0);
    addRecessedLabPortal(5.2, -13.68, 0);
    addRecessedLabPortal(-14.68, -4.0, Math.PI / 2);

    // 6. Freestanding Sleek White Angled Spaceship Consoles (matching the foreground-left & mid-ground desks in reference photo)
    const buildFreestandingWhiteConsole = (x: number, z: number, rotY: number) => {
      const deskGroup = new THREE.Group();
      deskGroup.position.set(x, 0, z);
      deskGroup.rotation.y = rotY;

      const base = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.88, 0.72), shipWhiteMat);
      base.position.y = 0.44;
      deskGroup.add(base);

      const recessedStripe = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.14, 0.76), pillarMat);
      recessedStripe.position.y = 0.48;
      deskGroup.add(recessedStripe);

      const slantedTop = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.32, 0.65), shipSilverMat);
      slantedTop.position.set(0, 1.02, 0.04);
      slantedTop.rotation.x = 0.35;
      deskGroup.add(slantedTop);

      const displayPanel = new THREE.Mesh(
        new THREE.BoxGeometry(1.65, 0.04, 0.42),
        cyanEmissiveMat
      );
      displayPanel.position.set(0, 1.18, 0.06);
      displayPanel.rotation.x = 0.35;
      deskGroup.add(displayPanel);

      scene.add(deskGroup);
    };

    // Place freestanding white consoles around the rotunda (Upgrade Desk, Fore-left & Mid-ground stations)
    buildFreestandingWhiteConsole(-6.5, -2.0, Math.PI / 5); // Upgrade Terminal Desk
    buildFreestandingWhiteConsole(-7.2, 1.6, Math.PI / 2.3); // Foreground-left white console from photo
    buildFreestandingWhiteConsole(-5.8, -8.2, Math.PI / 6); // Mid-ground white console from photo
    buildFreestandingWhiteConsole(6.8, -7.8, -Math.PI / 5); // Right white console from photo

    // ========================================================================
    // SLIDING BULKHEAD DOORS
    // ========================================================================
    const doorMeshes: Record<
      string,
      { mesh: THREE.Mesh; closedX: number; closedZ: number; axis: 'x' | 'z' }
    > = {};
    const createBulkheadDoor = (
      id: string,
      x: number,
      z: number,
      width: number,
      axis: 'x' | 'z'
    ) => {
      const geo =
        axis === 'x'
          ? new THREE.BoxGeometry(width, 3.4, 0.28)
          : new THREE.BoxGeometry(0.28, 3.4, width);
      const mesh = new THREE.Mesh(geo, shipSilverMat);
      mesh.position.set(x, 1.7, z);
      scene.add(mesh);
      doorMeshes[id] = { mesh, closedX: x, closedZ: z, axis };
    };

    createBulkheadDoor('door_maint_gen', 0, 18.0, 3.6, 'x');
    createBulkheadDoor('door_gen_cmd', 0, 6.0, 4.0, 'x');
    createBulkheadDoor('door_cmd_comm', -15.0, -4.0, 4.0, 'z');
    createBulkheadDoor('door_cmd_archive', 15.0, -4.0, 4.0, 'z');
    createBulkheadDoor('door_cmd_finance', -7.5, -14.0, 4.0, 'x');
    createBulkheadDoor('door_cmd_systems', 7.5, -14.0, 4.0, 'x');

    // ========================================================================
    // SECTOR PROPS & INTERACTIVE MACHINERY
    // ========================================================================
    // 1. Maintenance Bay Cryo-Pod & Reboot Monitor
    const cryoPodGroup = new THREE.Group();
    cryoPodGroup.position.set(-3.2, 0, 24.5);
    const cryoBase = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 0.35, 24), shipWhiteMat);
    cryoBase.position.y = 0.18;
    cryoPodGroup.add(cryoBase);
    const cryoChamber = new THREE.Mesh(
      new THREE.CylinderGeometry(0.88, 0.95, 2.2, 20),
      shipSilverMat
    );
    cryoChamber.position.y = 1.35;
    cryoPodGroup.add(cryoChamber);
    const cryoVisor = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.1, 0.92), cyanEmissiveMat);
    cryoVisor.position.set(0, 1.45, 0.12);
    cryoPodGroup.add(cryoVisor);
    scene.add(cryoPodGroup);

    const rebootMonitor = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.95, 0.12), cyanEmissiveMat);
    rebootMonitor.position.set(2.8, 1.7, 21.5);
    rebootMonitor.rotation.y = -0.4;
    scene.add(rebootMonitor);

    // 2. Generator Room: 3 Breaker Switches, Main Lever & Rotating Turbine Core
    const breakerLeds: THREE.Mesh[] = [];
    [14.5, 12.0, 9.5].forEach((zPos) => {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.95, 0.62), shipWhiteMat);
      box.position.set(-6.2, 1.45, zPos);
      scene.add(box);
      const led = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.24, 0.24),
        redEmergencyMat.clone()
      );
      led.position.set(-5.95, 1.6, zPos);
      scene.add(led);
      breakerLeds.push(led);
    });

    const mainLeverBase = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.35, 0.85), shipWhiteMat);
    mainLeverBase.position.set(5.8, 1.1, 11.5);
    scene.add(mainLeverBase);

    const mainLeverArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.95, 12),
      amberEmissiveMat
    );
    mainLeverArm.position.set(5.5, 1.6, 11.5);
    mainLeverArm.rotation.z = 0.6;
    scene.add(mainLeverArm);

    const turbineGroup = new THREE.Group();
    turbineGroup.position.set(0, 1.8, 12.0);
    const turbineCore = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.1, 4.2, 24),
      shipSilverMat
    );
    turbineCore.rotation.z = Math.PI / 2;
    turbineGroup.add(turbineCore);

    const turbineRing1 = new THREE.Mesh(
      new THREE.TorusGeometry(1.28, 0.1, 12, 32),
      cyanEmissiveMat
    );
    turbineRing1.rotation.y = Math.PI / 2;
    turbineRing1.position.x = -1.1;
    turbineGroup.add(turbineRing1);

    const turbineRing2 = turbineRing1.clone();
    turbineRing2.position.x = 1.1;
    turbineGroup.add(turbineRing2);
    scene.add(turbineGroup);

    // Maya Chen — Chief Systems Engineer 3D Character Figure at (5.5, 0, -2.0)
    const mayaGroup = new THREE.Group();
    mayaGroup.position.set(5.5, 0, -2.0);
    const mayaTorso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 0.75, 8, 16),
      new THREE.MeshStandardMaterial({ color: '#0284C7', roughness: 0.35, metalness: 0.35 })
    );
    mayaTorso.position.y = 1.05;
    mayaGroup.add(mayaTorso);
    const mayaHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.21, 16, 16),
      new THREE.MeshStandardMaterial({ color: '#E2E8F0', roughness: 0.45 })
    );
    mayaHead.position.y = 1.68;
    mayaGroup.add(mayaHead);
    const mayaVisor = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.08, 0.18),
      cyanEmissiveMat
    );
    mayaVisor.position.set(0, 1.7, -0.14);
    mayaGroup.add(mayaVisor);
    scene.add(mayaGroup);

    // Hidden Audio Recorder Log 042 (-9.5, 0.25, 3.2)
    const hiddenRecorderMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.2, 0.35),
      amberEmissiveMat
    );
    hiddenRecorderMesh.position.set(-9.5, 0.25, 3.2);
    scene.add(hiddenRecorderMesh);

    // 4. Communication Centre: Power Relay, Server Racks & Email Workstation
    const commRelayMesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.5, 0.7), amberEmissiveMat);
    commRelayMesh.position.set(-19.5, 1.1, 1.4);
    scene.add(commRelayMesh);

    buildFreestandingWhiteConsole(-25.8, -4.0, Math.PI / 2);

    // Server Blade Racks across Communication Centre & Archive Vault
    [-22, -25, -28, 21, 24, 27].forEach((rx) => {
      [-8.5, 0.5].forEach((rz) => {
        const rack = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.2, 1.2), shipSilverMat);
        rack.position.set(rx, 1.6, rz);
        scene.add(rack);
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.6, 0.15), cyanEmissiveMat);
        strip.position.set(rx, 1.6, rz > 0 ? rz - 0.62 : rz + 0.62);
        scene.add(strip);
      });
    });

    // Archive, Finance & Systems White Spaceship Terminals
    buildFreestandingWhiteConsole(25.8, -4.0, -Math.PI / 2);
    buildFreestandingWhiteConsole(-7.5, -23.0, 0);
    buildFreestandingWhiteConsole(7.5, -23.0, 0);

    // ========================================================================
    // INPUT LISTENERS (WASD, Sprint, Mouse Look, Drag Look, E Interact)
    // ========================================================================
    const keysHeld = new Set<string>();
    let isDraggingLook = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (isPausedRef.current) return;

      keysHeld.add(e.code);

      if (e.code === 'KeyE' && !e.repeat) {
        const focused = playerRef.current.focusedObject;
        if (focused) {
          e.preventDefault();
          soundEngine.playChoreSync();
          onInteractRef.current(focused);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysHeld.delete(e.code);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (isPausedRef.current) return;
      if (e.button === 0) {
        isDraggingLook = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isPausedRef.current) return;
      const p = playerRef.current;
      if (document.pointerLockElement === renderer.domElement) {
        p.yaw -= e.movementX * 0.0024;
        p.pitch = Math.max(-1.1, Math.min(1.1, p.pitch - e.movementY * 0.0022));
      } else if (isDraggingLook) {
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        p.yaw -= dx * 0.0045;
        p.pitch = Math.max(-1.1, Math.min(1.1, p.pitch - dy * 0.0038));
      }
    };

    const handleMouseUp = () => {
      isDraggingLook = false;
    };

    let lastRenderedStateKey = '';
    let currentW = width;
    let currentH = height;
    let pendingResize: { w: number; h: number } | null = null;

    const handleResize = () => {
      if (!container) return;
      const w = Math.max(320, container.clientWidth || window.innerWidth);
      const h = Math.max(320, container.clientHeight || window.innerHeight);
      if (w !== currentW || h !== currentH) {
        pendingResize = { w, h };
        lastRenderedStateKey = '';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('resize', handleResize);
    renderer.domElement.addEventListener('mousedown', handleMouseDown);

    // ========================================================================
    // SIMULATION & RENDER LOOP (with fenceSync afterDraw pacing for software WebGL)
    // ========================================================================
    let disposed = false;
    let frameId = 0;
    let lastTime = performance.now();
    let lastPublishedFocusId = '';
    let firstFrameRendered = false;

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext | null;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        let polls = 0;
        const poll = () => {
          if (disposed) return;
          polls += 1;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED && polls < 40) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    };

    const tick = (now = performance.now()) => {
      if (disposed) return;
      if (pendingResize) {
        currentW = pendingResize.w;
        currentH = pendingResize.h;
        pendingResize = null;
        camera.aspect = currentW / currentH;
        camera.updateProjectionMatrix();
        renderer.setSize(currentW, currentH);
        lastRenderedStateKey = '';
      }
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const st = saveStateRef.current;
      const p = playerRef.current;

      if (!isPausedRef.current) {
        if (keysHeld.has('ArrowLeft')) p.yaw += 1.85 * dt;
        if (keysHeld.has('ArrowRight')) p.yaw -= 1.85 * dt;

        let forwardInput = 0;
        let strafeInput = 0;
        if (keysHeld.has('KeyW') || keysHeld.has('ArrowUp')) forwardInput += 1;
        if (keysHeld.has('KeyS') || keysHeld.has('ArrowDown')) forwardInput -= 1;
        if (keysHeld.has('KeyD')) strafeInput += 1;
        if (keysHeld.has('KeyA')) strafeInput -= 1;

        const isSprinting = keysHeld.has('ShiftLeft') || keysHeld.has('ShiftRight');
        const moveSpeed = isSprinting ? 7.6 : 4.8;

        if (forwardInput !== 0 || strafeInput !== 0) {
          const len = Math.hypot(forwardInput, strafeInput);
          const nf = forwardInput / len;
          const ns = strafeInput / len;

          const sinY = Math.sin(p.yaw);
          const cosY = Math.cos(p.yaw);

          const vx = (-sinY * nf + cosY * ns) * moveSpeed;
          const vz = (-cosY * nf - sinY * ns) * moveSpeed;

          const nextX = p.x + vx * dt;
          const nextZ = p.z + vz * dt;

          if (isWalkableFacilityPosition(nextX, nextZ, st.doorsOpen)) {
            p.x = nextX;
            p.z = nextZ;
          } else if (isWalkableFacilityPosition(nextX, p.z, st.doorsOpen)) {
            p.x = nextX;
          } else if (isWalkableFacilityPosition(p.x, nextZ, st.doorsOpen)) {
            p.z = nextZ;
          }

          p.bobPhase += dt * (isSprinting ? 12 : 8);
          onTransformRef.current([p.x, p.y, p.z], p.yaw);
        }
      }

      // Update camera position & orientation
      // During Main Menu / Story Intro, frame the Spaceship Command Rotunda from the exact angle of the user's reference photo
      if (isCinematicRef.current) {
        const slowSway = isSoftwareGl ? 0.38 : Math.sin(now * 0.00035) * 0.25 + 0.35;
        const camX = -5.6 + Math.sin(slowSway) * 1.4;
        const camZ = 3.2 + Math.cos(slowSway) * 0.8;
        camera.position.set(camX, 2.15, camZ);
        camera.lookAt(0, 2.35, rotundaCenterZ - 0.6);
      } else {
        const bobOffset = Math.sin(p.bobPhase) * 0.045;
        camera.position.set(p.x, p.y + bobOffset, p.z);
        camera.rotation.order = 'YXZ';
        camera.rotation.y = p.yaw;
        camera.rotation.x = p.pitch;
      }

      // Animate sliding bulkhead doors
      for (const [doorKey, info] of Object.entries(doorMeshes)) {
        const isOpen = Boolean(st.doorsOpen[doorKey]);
        const targetOffset = isOpen ? 3.5 : 0;
        if (info.axis === 'x') {
          const targetX = info.closedX + targetOffset;
          info.mesh.position.x = isSoftwareGl
            ? targetX
            : THREE.MathUtils.damp(info.mesh.position.x, targetX, 8, dt);
        } else {
          const targetZ = info.closedZ + targetOffset;
          info.mesh.position.z = isSoftwareGl
            ? targetZ
            : THREE.MathUtils.damp(info.mesh.position.z, targetZ, 8, dt);
        }
      }

      // Animate Breaker LEDs & Main Generator Lever
      st.breakerSwitches.forEach((engaged, idx) => {
        const led = breakerLeds[idx];
        if (led) {
          led.material = engaged ? greenEmissiveMat : redEmergencyMat;
        }
      });
      const targetLeverRot = st.mainGeneratorOnline ? 2.35 : 0.55;
      mainLeverArm.rotation.z = isSoftwareGl
        ? targetLeverRot
        : THREE.MathUtils.damp(mainLeverArm.rotation.z, targetLeverRot, 8, dt);

      // Animate Turbine & Spaceship Lighting
      const turbineSpeed = st.mainGeneratorOnline ? (st.facilityTier >= 3 ? 6.5 : 3.2) : 0.35;
      turbineGroup.rotation.x += dt * turbineSpeed;

      ambientLight.intensity = st.mainGeneratorOnline
        ? st.facilityTier >= 2
          ? 1.95
          : 1.75
        : 1.35;
      hemiLight.intensity = st.mainGeneratorOnline ? 1.55 : 1.15;
      dirLight.intensity = st.mainGeneratorOnline ? 1.9 : 1.35;

      // Animate Holographic Earth Globe & Upgrade Tier Rings
      holoGlobeGroup.rotation.y += dt * 0.45;
      tier2Ring.visible = st.facilityTier >= 2;
      tier3Ring.visible = st.facilityTier >= 3;
      tier2Ring.rotation.z += dt * 0.9;
      tier3Ring.rotation.y -= dt * 1.1;

      // Maya idle breathing motion
      mayaGroup.position.y = Math.sin(now * 0.003) * 0.03;

      // Raycast / look-cone check for interactive object prompt
      const forwardVec: [number, number, number] = [
        -Math.sin(p.yaw) * Math.cos(p.pitch),
        Math.sin(p.pitch),
        -Math.cos(p.yaw) * Math.cos(p.pitch),
      ];
      const objects = getFacilityInteractiveObjects(st);
      const focused = findFocusedInteractiveObject([p.x, p.y, p.z], forwardVec, objects);
      p.focusedObject = focused;

      const focusKey = focused ? `${focused.id}:${focused.label}` : '';
      if (focusKey !== lastPublishedFocusId) {
        lastPublishedFocusId = focusKey;
        onFocusRef.current(focused);
      }

      const stateChangedKey = `${isCinematicRef.current}:${isPausedRef.current}:${st.currentScene}:${st.mainGeneratorOnline}:${st.facilityTier}:${st.doorsOpen.door_maint_gen}:${st.doorsOpen.door_gen_cmd}:${st.doorsOpen.door_cmd_comm}:${st.doorsOpen.door_cmd_archive}:${p.x.toFixed(2)}:${p.z.toFixed(2)}:${p.yaw.toFixed(2)}:${p.pitch.toFixed(2)}`;
      const shouldRender =
        !firstFrameRendered ||
        !isSoftwareGl ||
        keysHeld.size > 0 ||
        isDraggingLook ||
        stateChangedKey !== lastRenderedStateKey;

      if (shouldRender) {
        renderer.render(scene, camera);
        lastRenderedStateKey = stateChangedKey;
      }

      if (!firstFrameRendered) {
        firstFrameRendered = true;
        setIsLoading3D(false);
      }

      if (isSoftwareGl) {
        afterDraw(() => tick(performance.now()));
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick(performance.now());

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.dispose();
    };
  }, []);

  if (webglFallback) {
    const objects = getFacilityInteractiveObjects(saveState);
    return (
      <div className="fixed inset-0 bg-[#09151C] text-slate-100 flex flex-col items-center justify-center p-8 z-0">
        <div className="max-w-3xl w-full hud-panel rounded-xl p-6">
          <div className="ss-banner px-4 py-2 text-center text-xs font-display font-bold tracking-widest uppercase text-[#1EE3CF] mb-4">
            SPACESHIP ROTUNDA BRIDGE // DIRECT TERMINAL ACCESS
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Hardware WebGL acceleration is unavailable in this browser environment. You can operate
            every Spaceship Facility 07 bay, breaker switch, generator lever, and workstation
            directly below:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4 max-h-[60vh] overflow-y-auto pr-1">
            {objects.map((obj, idx) => (
              <button
                key={obj.id}
                type="button"
                onClick={() => onInteractWithObject(obj)}
                className="ss-list-btn text-left cursor-pointer"
              >
                <div className="flex items-center min-w-0">
                  <span className="ss-list-badge">{String(idx + 1).padStart(2, '0')}</span>
                  <div className="truncate">
                    <div className="text-[10px] font-mono uppercase text-[#1EE3CF]">{obj.room}</div>
                    <div className="text-xs font-semibold text-white truncate">{obj.label}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {isLoading3D && (
        <div className="fixed inset-0 z-50 bg-[#09151C] flex flex-col items-center justify-center p-6 text-center">
          <div className="ss-banner px-6 py-2.5 text-xs font-display font-bold uppercase tracking-[0.22em] text-[#1EE3CF]">
            SPACESHIP FACILITY 07 // ROTUNDA ENGINE INITIALIZING
          </div>
          <div className="mt-3 text-base font-display font-bold text-white">
            Loading 3D Spaceship Command Bridge, Earth Hologram &amp; Sector Bays...
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className="fixed inset-0 w-full h-full z-0 cursor-crosshair select-none"
        aria-label="Facility 07 Spaceship Rotunda First-Person 3D Viewport"
      />
    </>
  );
};
