/* ============================================================
   src/components/UrjaHero3D.js (equivalent)
   ------------------------------------------------------------
   A premium "glass exhibition" 3D hero for Urja Shakti 2026:
   a translucent glass core, two slow-turning glass rings, and a
   handful of floating glass panels — some carrying the Urja
   Shakti logo, some carrying subtle, low-opacity photographs of
   real women achievers (see assets/data/women-achievers.js).

   Design intent (per brief):
   - premium, controlled, slow movement — not a gaming animation
   - warm neutral background, orange/pink/green brand accents
   - real glass: transmission + clearcoat, soft reflections
   - photos are atmosphere, not a bio section: low opacity, blurred
   - degrades gracefully if WebGL/Three.js is unavailable
   - respects prefers-reduced-motion
   - pauses when off-screen or the tab is hidden (perf)

   Usage: window.UrjaHero3D.init({
     containerId: "hero3d",
     logoSrc: "assets/logo/urja-shakti-logo.png",
     achievers: window.WOMEN_ACHIEVERS || []
   });
   ============================================================ */
(function (global) {
  "use strict";

  function init(opts) {
    const options = Object.assign(
      { containerId: "hero3d", logoSrc: "assets/logo/urja-shakti-logo.png", achievers: [] },
      opts || {}
    );
    const wrap = document.getElementById(options.containerId);
    if (!wrap) return;

    const fallbackImg = wrap.querySelector(".hero3d-fallback img");
    if (fallbackImg) fallbackImg.src = options.logoSrc;

    if (typeof THREE === "undefined") {
      wrap.classList.add("no-webgl");
      return;
    }

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch (err) {
      wrap.classList.add("no-webgl");
      return;
    }
    if (!renderer) {
      wrap.classList.add("no-webgl");
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isSmall = window.innerWidth < 640;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.35, 6.4);
    camera.lookAt(0, 0, 0);
    const baseCameraPos = camera.position.clone();

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    if ("outputEncoding" in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
    if ("physicallyCorrectLights" in renderer) renderer.physicallyCorrectLights = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0x000000, 0);
    wrap.appendChild(renderer.domElement);

    function sizeRenderer() {
      const w = wrap.clientWidth, h = wrap.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }

    // ---------- lighting: warm ambient + brand-colour accent lights ----------
    scene.add(new THREE.AmbientLight(0xfff4ea, 0.6));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
    keyLight.position.set(2.2, 3.4, 4.5);
    scene.add(keyLight);
    const lOrange = new THREE.PointLight(0xE97417, 1.6, 16); lOrange.position.set(-2.8, 1.6, 2.4); scene.add(lOrange);
    const lPink   = new THREE.PointLight(0xD41E73, 1.4, 16); lPink.position.set(2.6, -1.0, 2.0);   scene.add(lPink);
    const lGreen  = new THREE.PointLight(0x479A3B, 1.0, 16); lGreen.position.set(0, -2.2, -2.0);   scene.add(lGreen);

    const group = new THREE.Group();
    group.rotation.x = 0.12;
    scene.add(group);

    // ---------- central glass structure (sphere with real transmission) ----------
    const coreGeo = new THREE.SphereGeometry(0.95, isSmall ? 32 : 48, isSmall ? 32 : 48);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      transmission: 1.0,
      thickness: 1.1,
      roughness: 0.06,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      ior: 1.4,
      reflectivity: 0.55,
      opacity: 1,
      envMapIntensity: 1,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    // faint inner glow so the glass core reads even without a full environment map
    const innerGlowGeo = new THREE.SphereGeometry(0.5, 24, 24);
    const innerGlowMat = new THREE.MeshBasicMaterial({
      color: 0xffcf9e, transparent: true, opacity: 0.22,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    group.add(new THREE.Mesh(innerGlowGeo, innerGlowMat));

    // ---------- two slow glass rings ----------
    const ringMatBase = { transparent: true, roughness: 0.15, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.15, ior: 1.3 };
    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(1.7, 0.028, 12, isSmall ? 60 : 100),
      new THREE.MeshPhysicalMaterial(Object.assign({ color: 0xE97417, opacity: 0.35 }, ringMatBase))
    );
    ring1.rotation.x = 1.15; ring1.rotation.y = 0.3;
    group.add(ring1);

    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(2.05, 0.02, 12, isSmall ? 60 : 100),
      new THREE.MeshPhysicalMaterial(Object.assign({ color: 0xD41E73, opacity: 0.28 }, ringMatBase))
    );
    ring2.rotation.x = -0.55; ring2.rotation.y = -0.4;
    group.add(ring2);

    // ---------- floating glass panels (logo + women achievers) ----------
    const loader = new THREE.TextureLoader();
    const panels = [];

    function makePanel(textureUrl, { x, y, z, w, h, opacity, frameOpacity, frameColor }) {
      const panelGroup = new THREE.Group();
      panelGroup.position.set(x, y, z);

      // frosted glass frame, slightly larger than the photo
      const frameGeo = new THREE.PlaneGeometry(w + 0.14, h + 0.14);
      const frameMat = new THREE.MeshPhysicalMaterial({
        color: frameColor, transparent: true, opacity: frameOpacity,
        roughness: 0.2, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.2,
        side: THREE.DoubleSide, depthWrite: false,
      });
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.z = -0.02;
      panelGroup.add(frame);

      // photo / logo plane — soft, low-opacity, "seen through glass"
      const planeGeo = new THREE.PlaneGeometry(w, h);
      const planeMat = new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: opacity,
        side: THREE.DoubleSide, depthWrite: false,
      });
      const plane = new THREE.Mesh(planeGeo, planeMat);
      panelGroup.add(plane);

      loader.load(textureUrl, (tex) => {
        if ("colorSpace" in tex) tex.colorSpace = "srgb"; else if ("encoding" in tex) tex.encoding = THREE.sRGBEncoding;
        planeMat.map = tex;
        planeMat.needsUpdate = true;
      }, undefined, () => { /* silently skip a missing image — panel stays a soft glass pane */ });

      group.add(panelGroup);
      panels.push({ obj: panelGroup, phase: Math.random() * Math.PI * 2, speed: 0.4 + Math.random() * 0.3 });
      return panelGroup;
    }

    // Urja Shakti logo — kept clearer than the achiever panels (brand mark, not atmosphere)
    makePanel(options.logoSrc, {
      x: 0, y: 0.02, z: 1.35, w: 0.95, h: 0.95,
      opacity: 0.92, frameOpacity: 0.5, frameColor: 0xffffff,
    });

    // women achievers — subtle, translucent, arranged loosely around the core
    const achievers = (options.achievers || []).slice(0, 6);
    const layout = [
      { x: -1.95, y: 1.05, z: -0.4, w: 0.78, h: 0.98 },
      { x: 1.9,   y: 0.85, z: 0.15, w: 0.78, h: 0.98 },
      { x: -1.6,  y: -1.15, z: 0.5,  w: 0.72, h: 0.9 },
      { x: 1.7,   y: -1.05, z: -0.5, w: 0.72, h: 0.9 },
      { x: 0,     y: 1.95, z: -0.9,  w: 0.68, h: 0.86 },
      { x: 0,     y: -2.0, z: -0.2,  w: 0.68, h: 0.86 },
    ];
    achievers.forEach((person, i) => {
      const L = layout[i % layout.length];
      makePanel(person.photo, {
        x: L.x, y: L.y, z: L.z, w: L.w, h: L.h,
        opacity: 0.42, frameOpacity: 0.3, frameColor: 0xffffff,
      });
    });

    // ---------- slow, sparse depth particles ----------
    const particleCount = isSmall ? 26 : 42;
    const positions = new Float32Array(particleCount * 3);
    const colorsArr = new Float32Array(particleCount * 3);
    const palette = [[0.914, 0.455, 0.09], [0.831, 0.118, 0.451], [0.28, 0.604, 0.231]];
    for (let i = 0; i < particleCount; i++) {
      const r = 2.4 + Math.random() * 1.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
      positions[i * 3 + 2] = r * Math.cos(phi) * 0.5;
      const c = palette[i % palette.length];
      colorsArr[i * 3] = c[0]; colorsArr[i * 3 + 1] = c[1]; colorsArr[i * 3 + 2] = c[2];
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute("color", new THREE.BufferAttribute(colorsArr, 3));
    const particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({
      size: 0.035, vertexColors: true, transparent: true, opacity: 0.55,
      sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    scene.add(particles);

    sizeRenderer();
    if ("ResizeObserver" in window) { new ResizeObserver(sizeRenderer).observe(wrap); }
    window.addEventListener("resize", sizeRenderer);
    window.addEventListener("orientationchange", sizeRenderer);

    // pause off-screen / hidden tab — keeps this lightweight
    let visible = true;
    new IntersectionObserver((entries) => {
      entries.forEach((e) => { visible = e.isIntersecting; });
    }, { threshold: 0.05 }).observe(wrap);

    // subtle mouse parallax (desktop only, disabled with reduced motion)
    let targetX = 0, targetY = 0;
    if (!reduceMotion && window.matchMedia("(hover: hover)").matches) {
      wrap.addEventListener("pointermove", (e) => {
        const rect = wrap.getBoundingClientRect();
        targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      });
      wrap.addEventListener("pointerleave", () => { targetX = 0; targetY = 0; });
    }

    if (reduceMotion) {
      group.rotation.y = 0.35;
      renderer.render(scene, camera);
      return;
    }

    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      if (document.hidden || !visible) return;
      const t = clock.getElapsedTime();

      // slow, controlled — never fast, never gamey
      group.rotation.y = t * 0.045;
      group.position.y = Math.sin(t * 0.35) * 0.05;
      ring1.rotation.z = t * 0.06;
      ring2.rotation.z = -t * 0.045;
      particles.rotation.y = -t * 0.02;

      panels.forEach((p) => {
        p.obj.position.y += 0; // base position is fixed on layout; float around it:
        p.obj.rotation.y = Math.sin(t * 0.25 * p.speed + p.phase) * 0.12;
        p.obj.position.z += Math.sin(t * 0.2 * p.speed + p.phase) * 0.0009;
      });

      camera.position.x += (baseCameraPos.x + targetX * 0.35 - camera.position.x) * 0.04;
      camera.position.y += (baseCameraPos.y - targetY * 0.2 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    }
    animate();
  }

  global.UrjaHero3D = { init: init };
})(window);
