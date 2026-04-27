"use client";

import { useEffect, useRef } from "react";

/**
 * Fondo Three.js: malla de partículas doradas que reacciona al ratón.
 * Renderiza en un canvas full-screen detrás de todo (z=-1, pointer-events:none).
 * Carga Three dinámicamente (solo cliente) para no romper SSR ni inflar bundle inicial.
 */
export function Background3D() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !ref.current) return;
    const canvas = ref.current;
    let cleanup: (() => void) | null = null;

    let cancelled = false;
    (async () => {
      const THREE = await import("three");
      if (cancelled || !ref.current) return;

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight, false);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
      camera.position.z = 20;

      // Geometría: nube de partículas
      const COUNT = 1500;
      const positions = new Float32Array(COUNT * 3);
      for (let i = 0; i < COUNT; i++) {
        positions[i * 3]     = (Math.random() - 0.5) * 60;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

      const mat = new THREE.PointsMaterial({
        size: 0.06,
        color: 0xc9a961,
        transparent: true,
        opacity: 0.75,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const points = new THREE.Points(geo, mat);
      scene.add(points);

      // Pequeñas líneas conectoras (tipo constelación) entre puntos cercanos al cursor
      const lineGeo = new THREE.BufferGeometry();
      const lineMat = new THREE.LineBasicMaterial({ color: 0xc9a961, transparent: true, opacity: 0.18 });
      const lineSegments = new THREE.LineSegments(lineGeo, lineMat);
      scene.add(lineSegments);

      const mouse = new THREE.Vector2(0, 0);
      const target = new THREE.Vector2(0, 0);

      const onMove = (e: MouseEvent) => {
        target.x = (e.clientX / window.innerWidth) * 2 - 1;
        target.y = -((e.clientY / window.innerHeight) * 2 - 1);
      };
      const onResize = () => {
        renderer.setSize(window.innerWidth, window.innerHeight, false);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("resize", onResize);

      let raf = 0;
      const tick = (t: number) => {
        // Suaviza el movimiento del ratón
        mouse.x += (target.x - mouse.x) * 0.04;
        mouse.y += (target.y - mouse.y) * 0.04;

        // Rotación lenta + parallax con cursor
        points.rotation.y = t * 0.00007 + mouse.x * 0.25;
        points.rotation.x = t * 0.00005 + mouse.y * 0.20;

        // Líneas conectoras: solo entre primeros 80 puntos (perf)
        const linePos: number[] = [];
        const SAMPLE = 80;
        const positions = points.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < SAMPLE; i++) {
          for (let j = i + 1; j < SAMPLE; j++) {
            const dx = positions[i * 3] - positions[j * 3];
            const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
            const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist < 6) {
              linePos.push(
                positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2],
                positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2],
              );
            }
          }
        }
        lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePos, 3));
        lineGeo.computeBoundingSphere();

        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("resize", onResize);
        geo.dispose();
        mat.dispose();
        lineGeo.dispose();
        lineMat.dispose();
        renderer.dispose();
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="fixed inset-0 -z-10 h-screen w-screen pointer-events-none"
    />
  );
}
