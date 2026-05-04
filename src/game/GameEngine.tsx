import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { getVoxelsForLevel } from './VoxelModels';
import { COLORS, PHYSICS } from '../constants';
import { EarthquakeData, WeatherData } from '../services/dataService';

interface GameEngineProps {
  level: number;
  micVolume: number;
  isLive: boolean;
  earthquakeData: EarthquakeData | null;
  weatherData: WeatherData | null;
  onLevelComplete: () => void;
  onCollectibleCollected: (type: string) => void;
}

const GameEngine: React.FC<GameEngineProps> = ({ 
  level, 
  micVolume, 
  isLive, 
  earthquakeData, 
  weatherData,
  onLevelComplete,
  onCollectibleCollected
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    player: THREE.Group;
    voxelMap: Set<string>;
    instancedVoxels: THREE.InstancedMesh;
    instancedFloor: THREE.InstancedMesh;
    collectibles: THREE.Group;
  } | null>(null);

  // Use refs for physics to avoid React re-render bottleneck
  const physicsState = useRef({
    velocity: new THREE.Vector3(),
    onGround: false,
    coins: 0,
    hasKey: false
  });

  const keysRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.background);
    scene.fog = new THREE.FogExp2(COLORS.background, 0.05);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true }); // MSAA off for performance on low-end
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio
    containerRef.current.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(COLORS.primary, 15, 60);
    scene.add(pointLight);

    const player = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1.8, 0.8),
      new THREE.MeshStandardMaterial({ color: COLORS.secondary, emissive: COLORS.secondary, emissiveIntensity: 1 })
    );
    player.add(body);
    scene.add(player);

    // Geometry is shared across all instances
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const instancedVoxels = new THREE.InstancedMesh(boxGeo, new THREE.MeshStandardMaterial(), 500);
    const instancedFloor = new THREE.InstancedMesh(boxGeo, new THREE.MeshStandardMaterial({ color: 0x111111 }), 1000);
    scene.add(instancedVoxels);
    scene.add(instancedFloor);

    const collectibles = new THREE.Group();
    scene.add(collectibles);

    sceneRef.current = { 
      scene, camera, renderer, player, 
      voxelMap: new Set(), 
      instancedVoxels, instancedFloor, 
      collectibles 
    };

    loadLevel(level);

    const onKeyDown = (e: KeyboardEvent) => keysRef.current[e.code] = true;
    const onKeyUp = (e: KeyboardEvent) => keysRef.current[e.code] = false;
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const onMouseDown = (e: MouseEvent) => {
        // Explosion logic simplified
    };
    window.addEventListener('mousedown', onMouseDown);

    let frameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      const delta = Math.min(clock.getDelta(), 0.1); // Cap delta for stability
      const time = clock.getElapsedTime();

      updatePhysics(delta);
      updateWorldEffects(time);
      
      pointLight.position.copy(player.position).add(new THREE.Vector3(0, 2, 0));
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
      cancelAnimationFrame(frameId);
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => { loadLevel(level); }, [level]);

  const loadLevel = (n: number) => {
    if (!sceneRef.current) return;
    const { instancedVoxels, instancedFloor, voxelMap, collectibles, player } = sceneRef.current;
    
    voxelMap.clear();
    while(collectibles.children.length > 0) collectibles.remove(collectibles.children[0]);

    const levelVoxels = getVoxelsForLevel(n);
    const color = new THREE.Color(COLORS.levelColors[10 - n] || COLORS.primary);
    instancedVoxels.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    instancedVoxels.count = levelVoxels.length;
    instancedVoxels.material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.1 });

    const dummy = new THREE.Object3D();
    levelVoxels.forEach((v, i) => {
      dummy.position.set(v.x, v.y, v.z);
      dummy.updateMatrix();
      instancedVoxels.setMatrixAt(i, dummy.matrix);
      voxelMap.add(`${v.x},${v.y},${v.z}`);
    });
    instancedVoxels.instanceMatrix.needsUpdate = true;

    // Floor
    let floorIdx = 0;
    for(let x = -15; x <= 15; x++) {
      for(let z = -15; z <= 15; z++) {
        const key = `${x},-1,${z}`;
        if (!voxelMap.has(key)) {
            dummy.position.set(x, -1, z);
            dummy.updateMatrix();
            instancedFloor.setMatrixAt(floorIdx++, dummy.matrix);
            voxelMap.add(key);
        }
      }
    }
    instancedFloor.count = floorIdx;
    instancedFloor.instanceMatrix.needsUpdate = true;

    // Collectibles & Key (Keep as separate meshes for simplicity/rotation)
    for(let i = 0; i < 5; i++) {
        const c = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshStandardMaterial({ color: COLORS.accent }));
        c.position.set((Math.random() - 0.5) * 10, 1, (Math.random() - 0.5) * 10);
        c.userData = { type: 'coin' };
        collectibles.add(c);
    }
    const k = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.1, 8, 16), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    k.position.set((Math.random() - 0.5) * 15, 2, (Math.random() - 0.5) * 15);
    k.userData = { type: 'key' };
    collectibles.add(k);

    player.position.set(0, 5, 12);
    physicsState.current = { velocity: new THREE.Vector3(), onGround: false, coins: 0, hasKey: false };
  };

  const updatePhysics = (dt: number) => {
    if (!sceneRef.current) return;
    const { player, voxelMap, camera, collectibles } = sceneRef.current;
    const { velocity, onGround } = physicsState.current;

    const direction = new THREE.Vector3();
    const front = Number(keysRef.current['KeyS'] || keysRef.current['ArrowDown']) - Number(keysRef.current['KeyW'] || keysRef.current['ArrowUp']);
    const side = Number(keysRef.current['KeyA'] || keysRef.current['ArrowLeft']) - Number(keysRef.current['KeyD'] || keysRef.current['ArrowRight']);

    direction.set(side, 0, front).normalize().multiplyScalar(PHYSICS.runSpeed).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
    velocity.x = -direction.x;
    velocity.z = direction.z;

    if (onGround && keysRef.current['Space']) {
      velocity.y = PHYSICS.jumpStrength * (micVolume > 0.4 ? 1.5 : 1);
    }
    velocity.y += PHYSICS.gravity;

    const nextPos = player.position.clone().add(velocity);
    let grounded = false;

    const check = (p: THREE.Vector3) => voxelMap.has(`${Math.round(p.x)},${Math.round(p.y)},${Math.round(p.z)}`);

    if (check(nextPos.clone().sub(new THREE.Vector3(0, 1, 0)))) {
        if (velocity.y < 0) { velocity.y = 0; grounded = true; nextPos.y = Math.round(nextPos.y - 1) + 1.5; }
    }
    if (check(nextPos.clone().add(new THREE.Vector3(0.5, 0, 0))) || check(nextPos.clone().add(new THREE.Vector3(-0.5, 0, 0)))) { velocity.x = 0; nextPos.x = player.position.x; }
    if (check(nextPos.clone().add(new THREE.Vector3(0, 0, 0.5))) || check(nextPos.clone().add(new THREE.Vector3(0, 0, -0.5)))) { velocity.z = 0; nextPos.z = player.position.z; }

    player.position.copy(nextPos);
    physicsState.current.onGround = grounded;

    camera.position.set(player.position.x, player.position.y + 3, player.position.z + 8);
    camera.lookAt(player.position.clone().add(new THREE.Vector3(0, 1, 0)));

    collectibles.children.forEach((c: any) => {
        c.rotation.y += dt * 2;
        if (player.position.distanceTo(c.position) < 1.2) {
            onCollectibleCollected(c.userData.type);
            if (c.userData.type === 'coin') {
                physicsState.current.coins++;
            } else if (c.userData.type === 'key') {
                physicsState.current.hasKey = true;
            }
            collectibles.remove(c);
        }
    });

    if (physicsState.current.hasKey && player.position.z < -6) onLevelComplete();
  };

  const updateWorldEffects = (time: number) => {
    if (!sceneRef.current) return;
    const { instancedVoxels, scene } = sceneRef.current;

    const dist = micVolume * 0.5;
    if (dist > 0.05) {
        const dummy = new THREE.Object3D();
        const mat = new THREE.Matrix4();
        for(let i = 0; i < instancedVoxels.count; i++) {
            instancedVoxels.getMatrixAt(i, mat);
            dummy.matrix.copy(mat);
            dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
            const s = 1 + Math.sin(time * 10 + dummy.position.x) * dist;
            dummy.scale.set(s, s, s);
            dummy.updateMatrix();
            instancedVoxels.setMatrixAt(i, dummy.matrix);
        }
        instancedVoxels.instanceMatrix.needsUpdate = true;
    }

    if (level === 8 && earthquakeData && isLive) scene.position.y = Math.sin(time * 20) * (earthquakeData.magnitude * 0.05);
    if (level === 9 && weatherData && isLive) scene.fog = new THREE.FogExp2(weatherData.condition === 'Rain' ? 0x222222 : 0x050505, 0.05);
  };

  return <div ref={containerRef} className="w-full h-full" />;
};

export default GameEngine;
