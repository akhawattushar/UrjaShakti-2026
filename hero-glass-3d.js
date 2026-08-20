/* ============================================================
   src/components/UrjaHero3D.js (equivalent)
   ------------------------------------------------------------
   "ENERGY BLOSSOM" — a premium glass 3D hero for Urja Shakti 2026.

   Concept (deliberately chosen, not generic):
   The Urja Shakti mark itself is a three-petal flower formed from
   overlapping circles. This scene turns that mark into a slow,
   living piece of glass sculpture:

     - three interlocking glass "petal loops" in the brand's
       orange / pink / green, arranged the way the logo's petals
       overlap — Urja (energy) + Shakti (a woman's strength),
       blossoming
     - a warm glass core at the centre that glows like a sunrise —
       energy at the source
     - two slender outer rings that turn like orbits — momentum,
       progress, a cycle continuing forward
     - fine embers that drift slowly upward through the scene —
       rising, not falling; strength ascending

   No photography is used anywhere in this scene — it is entirely
   procedural glass/light, so there is nothing to source, license,
   or replace later. The only image involved is the Urja Shakti
   logo itself, kept legible on its own glass plate.

   Design intent (per brief):
   - premium, controlled, slow movement — not a gaming animation
   - warm neutral background, orange/pink/green brand accents
   - real glass: transmission + clearcoat, soft reflections
   - degrades gracefully if WebGL/Three.js is unavailable
   - respects prefers-reduced-motion
   - pauses when off-screen or the tab is hidden (perf)

   Usage: window.UrjaHero3D.init({
     containerId: "hero3d",
     logoSrc: "assets/logo/urja-shakti-logo.png"
   });
   ============================================================ */
(function (global) {
  "use strict";

  function init(opts) {
    const options = Object.assign(
      { containerId: "hero3d", logoSrc: "assets/logo/urja-shakti-logo.png" },
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
    camera.position.set(0, 0.3, 6.2);
    camera.lookAt(0, 0, 0);
    const baseCameraPos = camera.position.clone();

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    if ("outputEncoding" in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
    if ("physicallyCorrectLights" in renderer) renderer.physicallyCorrectLights = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
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
    scene.add(new THREE.AmbientLight(0xfff4ea, 0.62));
    const keyLight = new THREE.DirectionalLight(0xfff0e0, 1.15);
    keyLight.position.set(2.2, 3.2, 4.4);
    scene.add(keyLight);
    const lOrange = new THREE.PointLight(0xE97417, 1.7, 16); lOrange.position.set(-2.6, 1.5, 2.3); scene.add(lOrange);
    const lPink   = new THREE.PointLight(0xD41E73, 1.4, 16); lPink.position.set(2.5, -1.0, 2.0);   scene.add(lPink);
    const lGreen  = new THREE.PointLight(0x479A3B, 1.0, 16); lGreen.position.set(0, -2.1, -2.0);   scene.add(lGreen);

    const group = new THREE.Group();
    group.rotation.x = 0.14;
    scene.add(group);

    // ---------- sunrise core: a warm glowing centre, wrapped in real glass ----------
    const glowOuter = new THREE.Mesh(
      new THREE.SphereGeometry(0.62, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xffb066, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    group.add(glowOuter);
    const glowInner = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd9a8, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    group.add(glowInner);

    const coreGeo = new THREE.SphereGeometry(0.5, isSmall ? 32 : 48, isSmall ? 32 : 48);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0xfff6ea,
      transparent: true,
      transmission: 1.0,
      thickness: 0.9,
      roughness: 0.05,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      ior: 1.4,
      reflectivity: 0.6,
      opacity: 1,
      envMapIntensity: 1,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    // ---------- three glass "petal loops" — the logo's flower, made physical ----------
    // Each is a partial torus (an open arc, not a full ring) so it reads as a
    // petal/leaf loop rather than a plain circle, echoing the brand mark.
    const petalColors = [0xE97417, 0xD41E73, 0x479A3B];
    const petals = [];
    const PETAL_COUNT = 3;
    for (let i = 0; i < PETAL_COUNT; i++) {
      const arcGeo = new THREE.TorusGeometry(1.05, 0.045, 12, isSmall ? 48 : 80, Math.PI * 1.55);
      const arcMat = new THREE.MeshPhysicalMaterial({
        color: petalColors[i],
        transparent: true,
        opacity: 0.55,
        roughness: 0.12,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
        ior: 1.35,
        side: THREE.DoubleSide,
      });
      const petal = new THREE.Mesh(arcGeo, arcMat);
      const angle = (i / PETAL_COUNT) * Math.PI * 2;
      petal.rotation.z = angle;
      petal.rotation.x = 0.55;
      petal.userData.baseZ = angle;
      petal.userData.phase = i * 2.1;
      group.add(petal);
      petals.push(petal);
    }

    // ---------- two slow outer rings — momentum, a cycle carrying forward ----------
    const ringMatBase = { transparent: true, roughness: 0.15, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.15, ior: 1.3 };
    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(1.85, 0.022, 12, isSmall ? 60 : 100),
      new THREE.MeshPhysicalMaterial(Object.assign({ color: 0xffffff, opacity: 0.3 }, ringMatBase))
    );
    ring1.rotation.x = 1.2; ring1.rotation.y = 0.25;
    group.add(ring1);

    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(2.15, 0.016, 12, isSmall ? 60 : 100),
      new THREE.MeshPhysicalMaterial(Object.assign({ color: 0xD41E73, opacity: 0.22 }, ringMatBase))
    );
    ring2.rotation.x = -0.5; ring2.rotation.y = -0.35;
    group.add(ring2);

    // ---------- the Urja Shakti logo, on its own glass plate ----------
    const loader = new THREE.TextureLoader();
    const frameGeo = new THREE.PlaneGeometry(1.02, 1.02);
    const frameMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, transparent: true, opacity: 0.46,
      roughness: 0.2, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.2,
      side: THREE.DoubleSide, depthWrite: false,
    });
    const logoFrame = new THREE.Mesh(frameGeo, frameMat);
    logoFrame.position.set(0, 0.03, 1.42);
    group.add(logoFrame);

    const planeGeo = new THREE.PlaneGeometry(0.86, 0.86);
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.94,
      side: THREE.DoubleSide, depthWrite: false,
    });
    const logoPlane = new THREE.Mesh(planeGeo, planeMat);
    logoPlane.position.set(0, 0.03, 1.45);
    group.add(logoPlane);

    loader.load(options.logoSrc, (tex) => {
      if ("colorSpace" in tex) tex.colorSpace = "srgb"; else if ("encoding" in tex) tex.encoding = THREE.sRGBEncoding;
      planeMat.map = tex;
      planeMat.needsUpdate = true;
    }, undefined, () => { /* silently skip — plate stays a soft glass pane */ });

    // ---------- rising embers — strength ascending, not falling ----------
    const emberCount = isSmall ? 22 : 36;
    const emberGeo = new THREE.BufferGeometry();
    const emberPos = new Float32Array(emberCount * 3);
    const emberColor = new Float32Array(emberCount * 3);
    const emberSpeed = new Float32Array(emberCount);
    const emberDrift = new Float32Array(emberCount);
    const palette = [[0.914, 0.455, 0.09], [0.831, 0.118, 0.451], [0.28, 0.604, 0.231]];
    for (let i = 0; i < emberCount; i++) {
      const r = 0.6 + Math.random() * 2.0;
      const theta = Math.random() * Math.PI * 2;
      emberPos[i * 3] = Math.cos(theta) * r;
      emberPos[i * 3 + 1] = -2.4 + Math.random() * 4.2;
      emberPos[i * 3 + 2] = Math.sin(theta) * r * 0.6;
      const c = palette[i % palette.length];
      emberColor[i * 3] = c[0]; emberColor[i * 3 + 1] = c[1]; emberColor[i * 3 + 2] = c[2];
      emberSpeed[i] = 0.08 + Math.random() * 0.1;
      emberDrift[i] = Math.random() * Math.PI * 2;
    }
    emberGeo.setAttribute("position", new THREE.BufferAttribute(emberPos, 3));
    emberGeo.setAttribute("color", new THREE.BufferAttribute(emberColor, 3));
    const embers = new THREE.Points(emberGeo, new THREE.PointsMaterial({
      size: 0.04, vertexColors: true, transparent: true, opacity: 0.7,
      sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    scene.add(embers);

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
      group.rotation.y = 0.3;
      renderer.render(scene, camera);
      return;
    }

    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      if (document.hidden || !visible) return;
      const t = clock.getElapsedTime();

      // slow, controlled — never fast, never gamey
      group.rotation.y = t * 0.05;
      group.position.y = Math.sin(t * 0.32) * 0.05;

      glowInner.scale.setScalar(1 + Math.sin(t * 0.8) * 0.06);
      core.rotation.y = t * 0.08;

      petals.forEach((p) => {
        p.rotation.z = p.userData.baseZ + Math.sin(t * 0.12 + p.userData.phase) * 0.05;
        p.rotation.x = 0.55 + Math.cos(t * 0.1 + p.userData.phase) * 0.04;
      });

      ring1.rotation.z = t * 0.055;
      ring2.rotation.z = -t * 0.04;

      logoFrame.rotation.y = Math.sin(t * 0.2) * 0.06;
      logoPlane.rotation.y = Math.sin(t * 0.2) * 0.06;
      logoFrame.position.y = 0.03 + Math.sin(t * 0.35) * 0.04;
      logoPlane.position.y = 0.03 + Math.sin(t * 0.35) * 0.04;

      // embers drift slowly upward, wrapping back to the bottom — rising energy
      const pos = emberGeo.attributes.position.array;
      for (let i = 0; i < emberCount; i++) {
        pos[i * 3 + 1] += emberSpeed[i] * 0.016;
        pos[i * 3] += Math.sin(t * 0.4 + emberDrift[i]) * 0.0016;
        if (pos[i * 3 + 1] > 2.2) pos[i * 3 + 1] = -2.4;
      }
      emberGeo.attributes.position.needsUpdate = true;

      camera.position.x += (baseCameraPos.x + targetX * 0.32 - camera.position.x) * 0.04;
      camera.position.y += (baseCameraPos.y - targetY * 0.18 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    }
    animate();
  }

  global.UrjaHero3D = { init: init };
})(window);
