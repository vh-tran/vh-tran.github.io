(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const colors = {
    paper: "#fceeed",
    ink: "#202632",
    muted: "#746c6d",
    red: "#dc5f67",
    redDeep: "#a93d4a",
    blue: "#4c7f9e",
    green: "#3c9275",
    gold: "#c69242"
  };

  function initHeroLock() {
    const aBar = document.getElementById("hero-a-bar");
    const bBar = document.getElementById("hero-b-bar");
    const aValue = document.getElementById("hero-a-value");
    const bValue = document.getElementById("hero-b-value");
    const gapValue = document.getElementById("hero-balance-value");
    if (!aBar || !bBar || !aValue || !bValue || !gapValue) return;

    const fixedGap = 2.4;
    const start = performance.now();

    function paint(now) {
      const t = reducedMotion ? 0.8 : (now - start) / 1000;
      const a2 = 4.9 + 1.32 * Math.sin(t * 0.82) + 0.35 * Math.sin(t * 1.71);
      const b2 = a2 - fixedGap;
      aBar.style.width = `${18 + (a2 / 7) * 76}%`;
      bBar.style.width = `${18 + (b2 / 7) * 76}%`;
      aValue.textContent = a2.toFixed(2);
      bValue.textContent = b2.toFixed(2);
      gapValue.textContent = fixedGap.toFixed(2);
      if (!reducedMotion) requestAnimationFrame(paint);
    }

    requestAnimationFrame(paint);
  }

  function initToyLab() {
    const canvas = document.getElementById("toy-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const playButton = document.getElementById("toy-play");
    const replayButton = document.getElementById("toy-replay");
    const newStartButton = document.getElementById("toy-new-start");
    const forcesButton = document.getElementById("toy-forces");
    const targetSlider = document.getElementById("toy-target");
    const speedSlider = document.getElementById("toy-speed");
    const targetOutput = document.getElementById("toy-target-output");
    const speedOutput = document.getElementById("toy-speed-output");
    const lossOutput = document.getElementById("toy-loss");
    const lossNote = document.getElementById("toy-loss-note");
    const invariantOutput = document.getElementById("toy-invariant");
    const driftOutput = document.getElementById("toy-drift");
    const timeOutput = document.getElementById("toy-time");

    const world = 3.45;
    const presets = [
      { a: 2.22, b: 0.72 },
      { a: -2.28, b: 0.55 },
      { a: 0.72, b: 2.15 },
      { a: 1.78, b: -1.08 },
      { a: -0.86, b: -2.25 }
    ];
    let presetIndex = 0;
    let target = Number(targetSlider.value);
    let speed = Number(speedSlider.value);
    let playing = !reducedMotion;
    let showForces = true;
    let state = { ...presets[0] };
    let initial = { ...state };
    let h0 = invariant(state);
    let flowTime = 0;
    let trail = [{ ...state }];
    let sparks = [];
    let cssWidth = 900;
    let cssHeight = 620;
    let scale = 1;
    let originX = 0;
    let originY = 0;
    let lastFrame = performance.now();
    let accumulator = 0;
    let visible = true;

    function invariant(point) {
      return point.a * point.a - point.b * point.b;
    }

    function loss(point) {
      const error = point.a * point.b - target;
      return 0.5 * error * error;
    }

    function vector(point) {
      const error = point.a * point.b - target;
      return {
        a: -error * point.b,
        b: -error * point.a
      };
    }

    function add(p, q, factor) {
      return { a: p.a + factor * q.a, b: p.b + factor * q.b };
    }

    function rk4(point, dt) {
      const k1 = vector(point);
      const k2 = vector(add(point, k1, dt / 2));
      const k3 = vector(add(point, k2, dt / 2));
      const k4 = vector(add(point, k3, dt));
      return {
        a: point.a + dt * (k1.a + 2 * k2.a + 2 * k3.a + k4.a) / 6,
        b: point.b + dt * (k1.b + 2 * k2.b + 2 * k3.b + k4.b) / 6
      };
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cssWidth = Math.max(320, rect.width);
      cssHeight = Math.max(480, rect.height);
      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const padX = Math.max(45, cssWidth * 0.065);
      const padY = Math.max(42, cssHeight * 0.075);
      scale = Math.min((cssWidth - padX * 2) / (world * 2), (cssHeight - padY * 2) / (world * 2));
      originX = cssWidth / 2;
      originY = cssHeight / 2;
      draw();
    }

    function toCanvas(point) {
      return {
        x: originX + point.a * scale,
        y: originY - point.b * scale
      };
    }

    function fromCanvas(x, y) {
      return {
        a: Math.max(-world, Math.min(world, (x - originX) / scale)),
        b: Math.max(-world, Math.min(world, (originY - y) / scale))
      };
    }

    function withClip(drawer) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, cssWidth, cssHeight);
      ctx.clip();
      drawer();
      ctx.restore();
    }

    function drawGrid() {
      ctx.save();
      ctx.lineWidth = 1;
      for (let value = -3; value <= 3; value += 1) {
        const x = originX + value * scale;
        const y = originY - value * scale;
        ctx.strokeStyle = value === 0 ? "rgba(32,38,50,.18)" : "rgba(32,38,50,.055)";
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, cssHeight);
        ctx.moveTo(0, y);
        ctx.lineTo(cssWidth, y);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(32,38,50,.5)";
      ctx.font = "10px 'Source Serif 4', Georgia, serif";
      ctx.textAlign = "right";
      ctx.fillText("a", cssWidth - 18, originY - 10);
      ctx.textAlign = "left";
      ctx.fillText("b", originX + 10, 18);
      ctx.restore();
    }

    function traceImplicitDifference(h, style) {
      ctx.save();
      ctx.strokeStyle = style.color;
      ctx.lineWidth = style.width;
      ctx.globalAlpha = style.alpha;
      if (style.dash) ctx.setLineDash(style.dash);

      const branches = [];
      const steps = 260;
      if (h >= 0) {
        const minA = Math.sqrt(Math.max(0, h));
        for (const signA of [-1, 1]) {
          for (const signB of [-1, 1]) {
            const points = [];
            for (let i = 0; i <= steps; i += 1) {
              const absA = minA + (world - minA) * (i / steps);
              const a = signA * absA;
              const b = signB * Math.sqrt(Math.max(0, a * a - h));
              if (Math.abs(b) <= world) points.push({ a, b });
            }
            branches.push(points);
          }
        }
      } else {
        const minB = Math.sqrt(Math.max(0, -h));
        for (const signA of [-1, 1]) {
          for (const signB of [-1, 1]) {
            const points = [];
            for (let i = 0; i <= steps; i += 1) {
              const absB = minB + (world - minB) * (i / steps);
              const b = signB * absB;
              const a = signA * Math.sqrt(Math.max(0, b * b + h));
              if (Math.abs(a) <= world) points.push({ a, b });
            }
            branches.push(points);
          }
        }
      }

      for (const points of branches) {
        if (points.length < 2) continue;
        ctx.beginPath();
        points.forEach((point, index) => {
          const p = toCanvas(point);
          if (index === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      }
      ctx.restore();
    }

    function traceProduct(product, style) {
      ctx.save();
      ctx.strokeStyle = style.color;
      ctx.lineWidth = style.width;
      ctx.globalAlpha = style.alpha;
      if (style.dash) ctx.setLineDash(style.dash);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        let started = false;
        const minAbs = Math.max(0.06, Math.abs(product) / world);
        for (let i = 0; i <= 350; i += 1) {
          const absA = minAbs + (world - minAbs) * (i / 350);
          const a = side * absA;
          const b = product / a;
          if (Math.abs(b) > world) {
            started = false;
            continue;
          }
          const p = toCanvas({ a, b });
          if (!started) {
            ctx.moveTo(p.x, p.y);
            started = true;
          } else {
            ctx.lineTo(p.x, p.y);
          }
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawLandscape() {
      const lossOffsets = [0.42, 0.86, 1.35];
      for (const offset of lossOffsets) {
        traceProduct(target + offset, { color: colors.blue, width: 1, alpha: .09 });
        traceProduct(target - offset, { color: colors.blue, width: 1, alpha: .09 });
      }

      const nearby = [-7, -4, -2, 0, 2, 4, 7];
      for (const h of nearby) {
        if (Math.abs(h - h0) < 0.3) continue;
        traceImplicitDifference(h, { color: colors.redDeep, width: 1, alpha: .10 });
      }

      traceProduct(target, { color: colors.blue, width: 2.1, alpha: .9, dash: [5, 7] });
      traceImplicitDifference(h0, { color: colors.red, width: 3.1, alpha: .96 });
    }

    function drawVectorField() {
      if (!showForces) return;
      ctx.save();
      ctx.strokeStyle = "rgba(32,38,50,.16)";
      ctx.fillStyle = "rgba(32,38,50,.16)";
      ctx.lineWidth = 1;
      const gap = cssWidth < 650 ? 1.15 : .88;
      for (let a = -2.8; a <= 2.8; a += gap) {
        for (let b = -2.8; b <= 2.8; b += gap) {
          const v = vector({ a, b });
          const norm = Math.hypot(v.a, v.b);
          if (norm < .025) continue;
          const length = Math.min(15, 6 + Math.log1p(norm) * 3);
          const ux = v.a / norm;
          const uy = v.b / norm;
          const p = toCanvas({ a, b });
          const ex = p.x + ux * length;
          const ey = p.y - uy * length;
          ctx.beginPath();
          ctx.moveTo(p.x - ux * length * .35, p.y + uy * length * .35);
          ctx.lineTo(ex, ey);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(ex - ux * 3.8 + uy * 2.5, ey + uy * 3.8 + ux * 2.5);
          ctx.lineTo(ex - ux * 3.8 - uy * 2.5, ey + uy * 3.8 - ux * 2.5);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();
    }

    function endpointForRail() {
      const discriminant = Math.sqrt(h0 * h0 + 4 * target * target);
      let aAbs = Math.sqrt(Math.max(0, (discriminant + h0) / 2));
      let bAbs = Math.sqrt(Math.max(0, (discriminant - h0) / 2));
      if (Math.abs(target) < 1e-8) {
        if (h0 >= 0) {
          return { a: Math.sign(initial.a || 1) * Math.sqrt(Math.max(0, h0)), b: 0 };
        }
        return { a: 0, b: Math.sign(initial.b || 1) * Math.sqrt(Math.max(0, -h0)) };
      }
      if (h0 >= 0) {
        const a = Math.sign(initial.a || target || 1) * aAbs;
        return { a, b: target / a };
      }
      const b = Math.sign(initial.b || target || 1) * bAbs;
      return { a: target / b, b };
    }

    function drawEndpoint() {
      const endpoint = endpointForRail();
      const p = toCanvas(endpoint);
      const near = Math.hypot(state.a - endpoint.a, state.b - endpoint.b) < .16;
      const pulse = reducedMotion ? 0 : (Math.sin(performance.now() / 290) + 1) / 2;
      ctx.save();
      ctx.strokeStyle = colors.green;
      ctx.fillStyle = "rgba(60,146,117,.12)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (near ? 14 : 10) + (near ? pulse * 6 : 0), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = colors.green;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "700 9px 'Source Serif 4', Georgia, serif";
      ctx.textAlign = endpoint.a > 0 ? "right" : "left";
      ctx.fillText("reachable finish", p.x + (endpoint.a > 0 ? -11 : 11), p.y - 13);
      ctx.restore();
    }

    function drawTrail() {
      if (trail.length < 2) return;
      for (let i = 1; i < trail.length; i += 1) {
        const from = toCanvas(trail[i - 1]);
        const to = toCanvas(trail[i]);
        const age = i / trail.length;
        ctx.strokeStyle = `rgba(60,146,117,${.08 + age * .7})`;
        ctx.lineWidth = 1.2 + age * 2.4;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      }
    }

    function drawSparks() {
      const now = performance.now();
      sparks = sparks.filter((spark) => now - spark.birth < 760);
      ctx.save();
      for (const spark of sparks) {
        const age = (now - spark.birth) / 760;
        const p = toCanvas(spark);
        ctx.globalAlpha = 1 - age;
        ctx.fillStyle = colors.gold;
        ctx.beginPath();
        ctx.arc(p.x + spark.vx * age, p.y + spark.vy * age, 2.2 * (1 - age), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawCurrentPoint() {
      const p = toCanvas(state);
      const v = vector(state);
      const norm = Math.hypot(v.a, v.b);
      if (showForces && norm > .015) {
        const ux = v.a / norm;
        const uy = v.b / norm;
        const arrow = Math.min(46, 22 + Math.log1p(norm) * 8);
        ctx.save();
        ctx.strokeStyle = colors.ink;
        ctx.fillStyle = colors.ink;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + ux * arrow, p.y - uy * arrow);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p.x + ux * arrow, p.y - uy * arrow, 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      const pulse = reducedMotion ? 0 : (Math.sin(performance.now() / 210) + 1) / 2;
      ctx.save();
      ctx.fillStyle = `rgba(60,146,117,${.10 + pulse * .08})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 15 + pulse * 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.green;
      ctx.strokeStyle = colors.paper;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    function drawLabels() {
      ctx.save();
      ctx.font = "italic 12px 'Source Serif 4', Georgia, serif";
      ctx.fillStyle = colors.redDeep;
      ctx.fillText(`your rail  h = ${h0.toFixed(2)}`, 25, cssHeight - 26);
      ctx.fillStyle = colors.blue;
      ctx.textAlign = "right";
      ctx.fillText(`zero loss  ab = ${target.toFixed(2)}`, cssWidth - 25, 35);
      ctx.restore();
    }

    function draw() {
      ctx.clearRect(0, 0, cssWidth, cssHeight);
      withClip(() => {
        drawGrid();
        drawVectorField();
        drawLandscape();
        drawTrail();
        drawEndpoint();
        drawSparks();
        drawCurrentPoint();
        drawLabels();
      });
    }

    function updateReadouts() {
      const currentLoss = loss(state);
      const drift = invariant(state) - h0;
      lossOutput.textContent = currentLoss < .001 ? currentLoss.toExponential(1) : currentLoss.toFixed(3);
      lossNote.textContent = currentLoss < .0004 ? "arrived ✓" : "falling ↓";
      invariantOutput.textContent = h0.toFixed(2);
      driftOutput.textContent = Math.abs(drift).toExponential(2);
      timeOutput.textContent = flowTime.toFixed(1);
    }

    function reset(point = initial) {
      state = { ...point };
      initial = { ...point };
      h0 = invariant(point);
      flowTime = 0;
      accumulator = 0;
      trail = [{ ...point }];
      sparks = [];
      playing = !reducedMotion;
      playButton.textContent = playing ? "pause" : "play";
      updateReadouts();
      draw();
    }

    function stepSimulation(frameSeconds) {
      accumulator += Math.min(frameSeconds, .05) * speed;
      const dt = .0025;
      let loops = 0;
      while (accumulator >= dt && loops < 80) {
        state = rk4(state, dt);
        accumulator -= dt;
        flowTime += dt;
        loops += 1;
      }
      if (loops > 0) {
        if (trail.length === 0 || Math.hypot(
          state.a - trail[trail.length - 1].a,
          state.b - trail[trail.length - 1].b
        ) > .012) {
          trail.push({ ...state });
          if (trail.length > 340) trail.shift();
          if (trail.length % 12 === 0) {
            const phase = trail.length * 1.618;
            sparks.push({
              ...state,
              vx: Math.cos(phase) * 18,
              vy: Math.sin(phase) * 18,
              birth: performance.now()
            });
          }
        }
      }
    }

    function animate(now) {
      const frameSeconds = (now - lastFrame) / 1000;
      lastFrame = now;
      if (visible && playing) stepSimulation(frameSeconds);
      if (visible) {
        updateReadouts();
        draw();
      }
      requestAnimationFrame(animate);
    }

    playButton.addEventListener("click", () => {
      playing = !playing;
      playButton.textContent = playing ? "pause" : "play";
    });

    replayButton.addEventListener("click", () => reset(initial));

    newStartButton.addEventListener("click", () => {
      presetIndex = (presetIndex + 1) % presets.length;
      reset(presets[presetIndex]);
    });

    forcesButton.addEventListener("click", () => {
      showForces = !showForces;
      forcesButton.setAttribute("aria-pressed", String(showForces));
      forcesButton.textContent = showForces ? "forces on" : "forces off";
      draw();
    });

    targetSlider.addEventListener("input", () => {
      target = Number(targetSlider.value);
      targetOutput.textContent = target.toFixed(2);
      reset(initial);
    });

    speedSlider.addEventListener("input", () => {
      speed = Number(speedSlider.value);
      speedOutput.textContent = `${speed.toFixed(speed % 1 === 0 ? 0 : 1)}×`;
    });

    function choosePoint(event) {
      const rect = canvas.getBoundingClientRect();
      const point = fromCanvas(event.clientX - rect.left, event.clientY - rect.top);
      reset(point);
    }

    canvas.addEventListener("pointerdown", (event) => {
      canvas.setPointerCapture(event.pointerId);
      choosePoint(event);
    });
    canvas.addEventListener("pointermove", (event) => {
      if (canvas.hasPointerCapture(event.pointerId)) choosePoint(event);
    });
    canvas.addEventListener("pointerup", (event) => {
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    });

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const visibilityObserver = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
    }, { rootMargin: "150px" });
    visibilityObserver.observe(canvas);

    targetOutput.textContent = target.toFixed(2);
    speedOutput.textContent = "1×";
    updateReadouts();
    resize();
    requestAnimationFrame(animate);
  }

  function initTwoPathLab() {
    const canvas = document.getElementById("two-path-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const playButton = document.getElementById("two-path-play");
    const replayButton = document.getElementById("two-path-replay");
    const newStartButton = document.getElementById("two-path-new-start");
    const forcesButton = document.getElementById("two-path-forces");
    const targetSlider = document.getElementById("two-path-target");
    const speedSlider = document.getElementById("two-path-speed");
    const targetOutput = document.getElementById("two-path-target-output");
    const speedOutput = document.getElementById("two-path-speed-output");
    const lossOutput = document.getElementById("two-path-loss");
    const lossNote = document.getElementById("two-path-loss-note");
    const modelOutput = document.getElementById("two-path-output");
    const driftOutput = document.getElementById("two-path-drift");
    const routeOneOutput = document.getElementById("two-path-route-one");
    const routeTwoOutput = document.getElementById("two-path-route-two");
    const totalOutput = document.getElementById("two-path-total");
    const delta11Output = document.getElementById("two-path-delta-11");
    const delta12Output = document.getElementById("two-path-delta-12");
    const delta22Output = document.getElementById("two-path-delta-22");
    const status = document.getElementById("two-path-status");
    const parameterInputs = {
      a: document.getElementById("two-path-a"),
      b: document.getElementById("two-path-b"),
      c: document.getElementById("two-path-c"),
      d: document.getElementById("two-path-d")
    };
    const parameterOutputs = {
      a: document.getElementById("two-path-a-output"),
      b: document.getElementById("two-path-b-output"),
      c: document.getElementById("two-path-c-output"),
      d: document.getElementById("two-path-d-output")
    };

    const presets = [
      { a: 1.6, b: .1, c: .2, d: 1.4 },
      { a: 1.75, b: -.55, c: 1.1, d: .35 },
      { a: -.85, b: 1.65, c: 1.7, d: 1.05 },
      { a: .72, b: 1.9, c: -1.55, d: -.58 }
    ];
    const parameterNames = ["a", "b", "c", "d"];
    const highlightMap = {
      h11: ["a", "b"],
      h12: ["a", "b", "c", "d"],
      h22: ["c", "d"]
    };
    let presetIndex = 0;
    let target = Number(targetSlider.value);
    let speed = Number(speedSlider.value);
    let playing = !reducedMotion;
    let showForces = true;
    let initial = { ...presets[0] };
    let state = { ...initial };
    let p0 = { x: initial.a + initial.b, y: initial.c + initial.d };
    let q0 = { x: initial.a - initial.b, y: initial.c - initial.d };
    let h0 = matrixInvariant(initial);
    let tau = 0;
    let flowTime = 0;
    let accumulator = 0;
    let width = 900;
    let height = 640;
    let visible = true;
    let activeGate = null;
    let dragBase = null;
    let resumeAfterDrag = false;
    let hoveredCell = null;
    let pinnedCell = null;
    let pinUntil = 0;
    let arrivedAnnounced = false;
    let lastFrame = performance.now();
    let layout = null;

    function matrixInvariant(point) {
      return {
        h11: point.a * point.a - point.b * point.b,
        h12: point.a * point.c - point.b * point.d,
        h22: point.c * point.c - point.d * point.d
      };
    }

    function matrixNorm(matrix) {
      return Math.sqrt(matrix.h11 * matrix.h11 + 2 * matrix.h12 * matrix.h12 + matrix.h22 * matrix.h22);
    }

    function stateAt(nextTau) {
      const boundedTau = Math.max(-7, Math.min(7, nextTau));
      const expNegative = Math.exp(-boundedTau);
      const expPositive = Math.exp(boundedTau);
      const ux = (expNegative * p0.x + expPositive * q0.x) / 2;
      const vx = (expNegative * p0.x - expPositive * q0.x) / 2;
      const uy = (expNegative * p0.y + expPositive * q0.y) / 2;
      const vy = (expNegative * p0.y - expPositive * q0.y) / 2;
      return { a: ux, b: vx, c: uy, d: vy };
    }

    function prediction(point) {
      return point.a * point.b + point.c * point.d;
    }

    function errorAt(nextTau) {
      return prediction(stateAt(nextTau)) - target;
    }

    function rk4Tau(value, dt) {
      const k1 = errorAt(value);
      const k2 = errorAt(value + dt * k1 / 2);
      const k3 = errorAt(value + dt * k2 / 2);
      const k4 = errorAt(value + dt * k3);
      return value + dt * (k1 + 2 * k2 + 2 * k3 + k4) / 6;
    }

    function gradients(point) {
      const error = prediction(point) - target;
      return {
        a: -error * point.b,
        b: -error * point.a,
        c: -error * point.d,
        d: -error * point.c
      };
    }

    function updateParameterControls() {
      parameterNames.forEach(function (name) {
        parameterInputs[name].value = initial[name].toFixed(2);
        parameterOutputs[name].textContent = initial[name].toFixed(2);
      });
    }

    function resetRail(point, resume, message) {
      initial = { ...point };
      p0 = { x: initial.a + initial.b, y: initial.c + initial.d };
      q0 = { x: initial.a - initial.b, y: initial.c - initial.d };
      h0 = matrixInvariant(initial);
      tau = 0;
      flowTime = 0;
      accumulator = 0;
      state = { ...initial };
      arrivedAnnounced = false;
      playing = resume && !reducedMotion;
      playButton.textContent = playing ? "pause" : "play";
      updateParameterControls();
      if (message) status.textContent = message;
      updateReadouts();
      draw(performance.now());
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(320, rect.width);
      height = Math.max(520, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layout = computeLayout();
      draw(performance.now());
    }

    function computeLayout() {
      const compact = width < 720;
      if (compact) {
        return {
          compact: true,
          plot: { x: 20, y: 62, width: width - 40, height: 320 },
          origin: { x: width / 2, y: 228 },
          scale: Math.min(44, (width - 62) / 6.5),
          meter: { x: 32, y: 421, width: width - 64 },
          panel: { x: 22, y: 462, width: width - 44, height: 138 },
          vectorTips: {},
          cellRects: {}
        };
      }
      const plotWidth = width * .67;
      return {
        compact: false,
        plot: { x: 34, y: 58, width: plotWidth, height: height - 120 },
        origin: { x: 34 + plotWidth * .50, y: 285 },
        scale: Math.min(66, plotWidth / 7.2),
        meter: { x: 64, y: height - 48, width: plotWidth - 60 },
        panel: { x: width * .73, y: 96, width: width * .24, height: 324 },
        vectorTips: {},
        cellRects: {}
      };
    }

    function drawBackground() {
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      const origin = layout.origin;
      const scale = layout.scale;
      ctx.strokeStyle = "rgba(32,38,50,.065)";
      ctx.lineWidth = 1;
      for (let value = -3; value <= 3; value += 1) {
        const x = origin.x + value * scale;
        const y = origin.y - value * scale;
        ctx.beginPath();
        ctx.moveTo(x, layout.plot.y);
        ctx.lineTo(x, layout.plot.y + layout.plot.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(layout.plot.x, y);
        ctx.lineTo(layout.plot.x + layout.plot.width, y);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(32,38,50,.28)";
      ctx.beginPath();
      ctx.moveTo(layout.plot.x, origin.y);
      ctx.lineTo(layout.plot.x + layout.plot.width, origin.y);
      ctx.moveTo(origin.x, layout.plot.y);
      ctx.lineTo(origin.x, layout.plot.y + layout.plot.height);
      ctx.stroke();
      drawText("first coordinate · a or b", layout.plot.x + layout.plot.width - 3, origin.y + 19, { align: "right", size: 8 });
      drawText("second coordinate · c or d", origin.x + 10, layout.plot.y + 12, { size: 8 });
      ctx.restore();
    }

    function drawText(text, x, y, options) {
      const settings = options || {};
      ctx.save();
      ctx.fillStyle = settings.color || colors.muted;
      ctx.font = (settings.weight || "700") + " " + (settings.size || 9) + "px " + (settings.family || "'Source Serif 4', Georgia, serif");
      ctx.textAlign = settings.align || "left";
      ctx.globalAlpha = settings.alpha == null ? 1 : settings.alpha;
      ctx.fillText(text, x, y);
      ctx.restore();
    }

    function vectorComponents(point, name) {
      return name === "u" ? { x: point.a, y: point.c } : { x: point.b, y: point.d };
    }

    function screenPoint(vector) {
      return {
        x: layout.origin.x + vector.x * layout.scale,
        y: layout.origin.y - vector.y * layout.scale
      };
    }

    function drawArrow(from, to, color, widthValue, alpha) {
      const angle = Math.atan2(to.y - from.y, to.x - from.x);
      const head = 10;
      ctx.save();
      ctx.globalAlpha = alpha == null ? 1 : alpha;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = widthValue;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(to.x, to.y);
      ctx.lineTo(to.x - Math.cos(angle - .48) * head, to.y - Math.sin(angle - .48) * head);
      ctx.lineTo(to.x - Math.cos(angle + .48) * head, to.y - Math.sin(angle + .48) * head);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function drawTrajectory(name, color) {
      if (Math.abs(tau) < .002) return;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.globalAlpha = .23;
      ctx.lineWidth = 1.4;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      for (let index = 0; index <= 28; index += 1) {
        const point = screenPoint(vectorComponents(stateAt(tau * index / 28), name));
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      const start = screenPoint(vectorComponents(initial, name));
      ctx.fillStyle = colors.paper;
      ctx.strokeStyle = color;
      ctx.globalAlpha = .62;
      ctx.beginPath();
      ctx.arc(start.x, start.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    function drawVelocity(tip, derivative, color, label) {
      const magnitude = Math.hypot(derivative.x, derivative.y);
      if (!showForces || magnitude < .003) return;
      const factor = Math.min(28, 10 + Math.log1p(magnitude) * 12) / magnitude;
      const end = {
        x: tip.x + derivative.x * factor,
        y: tip.y - derivative.y * factor
      };
      drawArrow(tip, end, color, 1.25, .48);
      if (!layout.compact) drawText(label, end.x + 5, end.y - 4, { color: colors.muted, size: 8, alpha: .85 });
    }

    function drawVector(name, color, force, now) {
      const vector = vectorComponents(state, name);
      const tip = screenPoint(vector);
      const origin = layout.origin;
      const selectedCell = pinnedCell && now < pinUntil ? pinnedCell : hoveredCell;
      const highlightX = selectedCell === "h11" || selectedCell === "h12";
      const highlightY = selectedCell === "h22" || selectedCell === "h12";
      layout.vectorTips[name] = { x: tip.x, y: tip.y, radius: 32 };

      ctx.save();
      ctx.strokeStyle = color;
      ctx.globalAlpha = highlightX ? .62 : .24;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.moveTo(origin.x, tip.y);
      ctx.lineTo(tip.x, tip.y);
      ctx.stroke();
      ctx.globalAlpha = highlightY ? .62 : .24;
      ctx.beginPath();
      ctx.moveTo(tip.x, origin.y);
      ctx.lineTo(tip.x, tip.y);
      ctx.stroke();
      ctx.restore();

      drawArrow(origin, tip, color, activeGate === name ? 4.4 : 3.2, 1);
      ctx.save();
      const pulse = activeGate === name && !reducedMotion ? 3 + Math.sin(now / 150) * 2 : 0;
      ctx.fillStyle = colors.paper;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 8 + pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const labelX = Math.min(layout.plot.x + layout.plot.width - 68, Math.max(layout.plot.x + 8, tip.x + (vector.x >= 0 ? 13 : -76)));
      const labelY = Math.min(layout.plot.y + layout.plot.height - 17, Math.max(layout.plot.y + 22, tip.y + (vector.y >= 0 ? -18 : 24)));
      const firstName = name === "u" ? "a" : "b";
      const secondName = name === "u" ? "c" : "d";
      drawText(name + " = (" + firstName + "," + secondName + ")", labelX, labelY, { color: color, size: 11 });
      drawText("(" + vector.x.toFixed(2) + ", " + vector.y.toFixed(2) + ")", labelX, labelY + 15, { color: colors.muted, size: 9 });

      const derivative = name === "u"
        ? { x: force.a, y: force.c }
        : { x: force.b, y: force.d };
      drawVelocity(tip, derivative, color, name === "u" ? "u moves along v" : "v moves along u");
    }

    function drawAngle() {
      const u = vectorComponents(state, "u");
      const v = vectorComponents(state, "v");
      if (Math.hypot(u.x, u.y) < .05 || Math.hypot(v.x, v.y) < .05) return;
      const first = Math.atan2(-u.y, u.x);
      const second = Math.atan2(-v.y, v.x);
      let delta = second - first;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      const radius = layout.compact ? 29 : 36;
      ctx.save();
      ctx.strokeStyle = "rgba(32,38,50,.34)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(layout.origin.x, layout.origin.y, radius, first, first + delta, delta < 0);
      ctx.stroke();
      ctx.restore();
      const degrees = Math.round(Math.abs(delta) * 180 / Math.PI);
      drawText(degrees + "°", layout.origin.x + 42, layout.origin.y - 16, { color: colors.muted, size: 8 });
    }

    function drawDotMeter(now, total) {
      const meter = layout.meter;
      const range = 5.5;
      const position = function (value) {
        return meter.x + (Math.max(-range, Math.min(range, value)) + range) / (range * 2) * meter.width;
      };
      const currentX = position(total);
      const targetX = position(target);
      const arrived = Math.abs(total - target) < .01;
      ctx.save();
      drawText("dot product", meter.x, meter.y - 17, { color: colors.ink, size: 9 });
      drawText("move the dot to the target", meter.x + meter.width, meter.y - 17, { align: "right", size: 8 });
      ctx.strokeStyle = "rgba(32,38,50,.28)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(meter.x, meter.y);
      ctx.lineTo(meter.x + meter.width, meter.y);
      ctx.stroke();
      [-3, 0, 3].forEach(function (tick) {
        const x = position(tick);
        ctx.beginPath();
        ctx.moveTo(x, meter.y - 4);
        ctx.lineTo(x, meter.y + 4);
        ctx.stroke();
        drawText(String(tick), x, meter.y + 17, { align: "center", size: 7 });
      });
      ctx.strokeStyle = colors.green;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(targetX, meter.y - 13);
      ctx.lineTo(targetX, meter.y + 13);
      ctx.stroke();
      drawText("target " + target.toFixed(2), targetX, meter.y - 18, { color: colors.green, align: "center", size: 8 });
      if (arrived && !reducedMotion) {
        ctx.fillStyle = "rgba(60,146,117,.12)";
        ctx.beginPath();
        ctx.arc(currentX, meter.y, 13 + 3 * Math.sin(now / 180), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = arrived ? colors.green : colors.ink;
      ctx.strokeStyle = colors.paper;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(currentX, meter.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      drawText("u·v " + total.toFixed(2), currentX, meter.y + 31, { color: arrived ? colors.green : colors.ink, align: "center", size: 9 });
      ctx.restore();
    }

    function drawMatrixCell(x, y, cellWidth, cellHeight, key, label, value, mirrored, now) {
      const highlighted = (pinnedCell && now < pinUntil ? pinnedCell : hoveredCell) === key;
      layout.cellRects[label] = { x: x, y: y, width: cellWidth, height: cellHeight, key: key };
      const strength = Math.min(.16, Math.abs(value) / 12);
      ctx.save();
      ctx.fillStyle = value >= 0
        ? "rgba(183,95,85," + (strength + (mirrored ? .015 : .035)) + ")"
        : "rgba(51,100,132," + (strength + (mirrored ? .015 : .035)) + ")";
      ctx.strokeStyle = highlighted ? colors.redDeep : "rgba(32,38,50,.16)";
      ctx.lineWidth = highlighted ? 2 : 1;
      ctx.fillRect(x, y, cellWidth, cellHeight);
      ctx.strokeRect(x, y, cellWidth, cellHeight);
      drawText(label, x + 7, y + 13, { color: colors.muted, size: 7, alpha: mirrored ? .65 : 1 });
      drawText(value.toFixed(2), x + cellWidth / 2, y + cellHeight / 2 + 6, {
        color: value >= 0 ? colors.redDeep : colors.blue,
        align: "center",
        size: layout.compact ? 10 : 12,
        alpha: mirrored ? .68 : 1
      });
      ctx.restore();
    }

    function drawLockboard(now) {
      const panel = layout.panel;
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,.23)";
      ctx.strokeStyle = "rgba(32,38,50,.17)";
      ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
      ctx.strokeRect(panel.x, panel.y, panel.width, panel.height);
      drawText("FIXED FROM THIS START", panel.x + 13, panel.y + 20, { color: colors.redDeep, size: 8 });
      drawText("H = uuᵀ − vvᵀ", panel.x + panel.width - 13, panel.y + 20, { color: colors.ink, size: 9, align: "right" });

      const gap = layout.compact ? 5 : 7;
      const sidePadding = layout.compact ? 12 : 17;
      const topPadding = layout.compact ? 33 : 46;
      const bottomPadding = layout.compact ? 10 : 30;
      const cellWidth = (panel.width - sidePadding * 2 - gap) / 2;
      const cellHeight = (panel.height - topPadding - bottomPadding - gap) / 2;
      const x1 = panel.x + sidePadding;
      const x2 = x1 + cellWidth + gap;
      const y1 = panel.y + topPadding;
      const y2 = y1 + cellHeight + gap;
      layout.cellRects = {};
      drawMatrixCell(x1, y1, cellWidth, cellHeight, "h11", "H₁₁", h0.h11, false, now);
      drawMatrixCell(x2, y1, cellWidth, cellHeight, "h12", "H₁₂", h0.h12, false, now);
      drawMatrixCell(x1, y2, cellWidth, cellHeight, "h12", "H₂₁", h0.h12, true, now);
      drawMatrixCell(x2, y2, cellWidth, cellHeight, "h22", "H₂₂", h0.h22, false, now);
      if (!layout.compact) {
        drawLock(ctx, panel.x + 22, panel.y + panel.height - 20, 15, colors.redDeep);
        drawText("the arrows move; these four values do not", panel.x + 38, panel.y + panel.height - 15, { color: colors.muted, size: 8 });
      }
      ctx.restore();
    }

    function draw(now) {
      if (!layout) return;
      drawBackground();
      const total = prediction(state);
      const force = gradients(state);
      drawTrajectory("u", colors.red);
      drawTrajectory("v", colors.blue);
      drawAngle();
      drawVector("u", colors.red, force, now);
      drawVector("v", colors.blue, force, now);
      drawDotMeter(now, total);
      drawLockboard(now);
    }

    function updateReadouts() {
      const routeOne = state.a * state.b;
      const routeTwo = state.c * state.d;
      const total = routeOne + routeTwo;
      const error = total - target;
      const currentLoss = .5 * error * error;
      const currentH = matrixInvariant(state);
      const driftMatrix = {
        h11: currentH.h11 - h0.h11,
        h12: currentH.h12 - h0.h12,
        h22: currentH.h22 - h0.h22
      };
      const drift = matrixNorm(driftMatrix) / Math.max(1, matrixNorm(h0));
      lossOutput.textContent = currentLoss < .001 ? currentLoss.toExponential(1) : currentLoss.toFixed(3);
      lossNote.textContent = currentLoss < 5e-6 ? "arrived ✓" : "falling ↓";
      modelOutput.textContent = total.toFixed(2);
      driftOutput.textContent = drift.toExponential(2);
      routeOneOutput.textContent = routeOne.toFixed(2);
      routeTwoOutput.textContent = routeTwo.toFixed(2);
      totalOutput.textContent = total.toFixed(2);
      delta11Output.textContent = h0.h11.toFixed(2);
      delta12Output.textContent = h0.h12.toFixed(2);
      delta22Output.textContent = h0.h22.toFixed(2);
      if (currentLoss < 5e-6 && !arrivedAnnounced) {
        status.textContent = "The two routes reached the target. All three independent matrix values remained locked.";
        arrivedAnnounced = true;
      }
    }

    function stepSimulation(frameSeconds) {
      accumulator += Math.min(frameSeconds, .05) * speed;
      let loops = 0;
      while (accumulator > 1e-6 && loops < 120) {
        const error = errorAt(tau);
        if (Math.abs(error) < 1e-8) {
          accumulator = 0;
          break;
        }
        const dt = Math.min(.003, accumulator, .025 / Math.max(.001, Math.abs(error)));
        tau = Math.max(-7, Math.min(7, rk4Tau(tau, dt)));
        accumulator -= dt;
        flowTime += dt;
        loops += 1;
      }
      state = stateAt(tau);
    }

    function animate(now) {
      const frameSeconds = (now - lastFrame) / 1000;
      lastFrame = now;
      if (visible && playing && !activeGate) stepSimulation(frameSeconds);
      if (pinnedCell && now >= pinUntil) pinnedCell = null;
      if (visible) {
        updateReadouts();
        draw(now);
      }
      requestAnimationFrame(animate);
    }

    function pointerPoint(event) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
    }

    function cellAt(point) {
      const cells = Object.values(layout.cellRects || {});
      const match = cells.find(function (cell) {
        return point.x >= cell.x && point.x <= cell.x + cell.width &&
          point.y >= cell.y && point.y <= cell.y + cell.height;
      });
      return match ? match.key : null;
    }

    function vectorAt(point) {
      let best = null;
      let bestDistance = Infinity;
      ["u", "v"].forEach(function (name) {
        const tip = layout.vectorTips[name];
        if (!tip) return;
        const distance = Math.hypot(point.x - tip.x, point.y - tip.y);
        if (distance < tip.radius && distance < bestDistance) {
          best = name;
          bestDistance = distance;
        }
      });
      return best;
    }

    function dragVector(name, point) {
      const xValue = Math.max(-3, Math.min(3, (point.x - layout.origin.x) / layout.scale));
      const yValue = Math.max(-3, Math.min(3, (layout.origin.y - point.y) / layout.scale));
      const next = { ...dragBase };
      if (name === "u") {
        next.a = xValue;
        next.c = yValue;
      } else {
        next.b = xValue;
        next.d = yValue;
      }
      return next;
    }

    canvas.addEventListener("pointerdown", function (event) {
      const point = pointerPoint(event);
      const cell = cellAt(point);
      if (cell) {
        pinnedCell = cell;
        pinUntil = performance.now() + 2200;
        status.textContent = cell === "h12"
          ? "The off-diagonal lock links all four weights."
          : "This diagonal lock links the two weights on one route.";
        draw(performance.now());
        return;
      }
      const vector = vectorAt(point);
      if (!vector) return;
      activeGate = vector;
      dragBase = { ...state };
      resumeAfterDrag = playing;
      playing = false;
      playButton.textContent = "play";
      canvas.setPointerCapture(event.pointerId);
      event.preventDefault();
    });

    canvas.addEventListener("pointermove", function (event) {
      const point = pointerPoint(event);
      if (activeGate) {
        const next = dragVector(activeGate, point);
        resetRail(next, false, "");
        draw(performance.now());
        return;
      }
      hoveredCell = cellAt(point);
      const vector = vectorAt(point);
      canvas.style.cursor = hoveredCell ? "pointer" : vector ? "move" : "grab";
    });

    canvas.addEventListener("pointerleave", function () {
      if (!activeGate) {
        hoveredCell = null;
        canvas.style.cursor = "grab";
      }
    });

    function endDrag(event) {
      if (!activeGate) return;
      const changedVector = activeGate;
      activeGate = null;
      dragBase = null;
      playing = resumeAfterDrag && !reducedMotion;
      playButton.textContent = playing ? "pause" : "play";
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      status.textContent = "New start chosen by dragging vector " + changedVector + ". This initialization creates a new locked matrix.";
    }

    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);

    playButton.addEventListener("click", function () {
      playing = !playing;
      playButton.textContent = playing ? "pause" : "play";
    });
    replayButton.addEventListener("click", function () {
      resetRail(initial, true, "Replaying from the current initialization.");
    });
    newStartButton.addEventListener("click", function () {
      presetIndex = (presetIndex + 1) % presets.length;
      resetRail(presets[presetIndex], true, "A new two-route initialization is running.");
    });
    forcesButton.addEventListener("click", function () {
      showForces = !showForces;
      forcesButton.setAttribute("aria-pressed", String(showForces));
      forcesButton.textContent = showForces ? "forces on" : "forces off";
      draw(performance.now());
    });
    targetSlider.addEventListener("input", function () {
      target = Number(targetSlider.value);
      targetOutput.textContent = target.toFixed(2);
      resetRail(initial, true, "");
    });
    targetSlider.addEventListener("change", function () {
      status.textContent = "Target changed to " + target.toFixed(2) + ". The same initialization now follows the same locked matrix.";
    });
    speedSlider.addEventListener("input", function () {
      speed = Number(speedSlider.value);
      speedOutput.textContent = speed.toFixed(speed % 1 === 0 ? 0 : 1) + "×";
    });

    parameterNames.forEach(function (name) {
      parameterInputs[name].addEventListener("input", function () {
        const next = { ...initial };
        next[name] = Number(parameterInputs[name].value);
        resetRail(next, true, "");
      });
      parameterInputs[name].addEventListener("change", function () {
        status.textContent = "Starting value " + name + " set to " + initial[name].toFixed(2) + ".";
      });
    });

    new ResizeObserver(resize).observe(canvas);
    new IntersectionObserver(function (entries) {
      visible = entries[0] ? entries[0].isIntersecting : true;
    }, { rootMargin: "150px" }).observe(canvas);

    targetOutput.textContent = target.toFixed(2);
    speedOutput.textContent = "1×";
    updateParameterControls();
    updateReadouts();
    resize();
    requestAnimationFrame(animate);
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function drawLock(ctx, x, y, size, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(1.3, size * .09);
    ctx.beginPath();
    ctx.arc(x, y - size * .15, size * .28, Math.PI, 0);
    ctx.stroke();
    roundedRect(ctx, x - size * .4, y - size * .08, size * .8, size * .62, size * .12);
    ctx.globalAlpha = .13;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y + size * .18, size * .06, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function initArchitecture() {
    const canvas = document.getElementById("architecture-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const tabs = Array.from(document.querySelectorAll("[data-arch]"));
    const replay = document.getElementById("architecture-replay");
    const kicker = document.getElementById("architecture-kicker");
    const title = document.getElementById("architecture-title");
    const definition = document.getElementById("architecture-definition");
    const formula = document.getElementById("architecture-formula");
    const caption = document.getElementById("architecture-caption");
    const corner = document.getElementById("architecture-corner");
    const content = {
      mha: {
        kicker: "multi-head attention",
        title: "The vector lock becomes a matrix lock.",
        definition: "moving: Qᵢ and Kᵢ",
        formula: [
          "QᵢᵀQᵢ − KᵢᵀKᵢ = constant",
          "also: VᵢᵀVᵢ − OᵢᵀOᵢ = constant"
        ],
        caption: "Every cell in the Gram difference stays fixed.",
        corner: "moving matrices → fixed fingerprint"
      },
      rope: {
        kicker: "rotary position attention",
        title: "Rotation splits the lock into 2-D blocks.",
        definition: "moving: one Q/K pair per block",
        formula: [
          "∥Qᵢ⁽ʲ⁾∥F² − ∥Kᵢ⁽ʲ⁾∥F² = constant",
          "also: VᵢᵀVᵢ − OᵢᵀOᵢ = constant"
        ],
        caption: "Direction rotates; each block’s red–blue energy gap does not.",
        corner: "one energy lock per 2-D block"
      },
      moe: {
        kicker: "dense softmax mixture-of-experts",
        title: "Softmax cannot move the router’s center.",
        definition: "moving: router rows Wᵣ",
        formula: [
          "Σᵣ Wᵣ = constant",
          "also: ∥A⁽ʳ⁾:,j∥² − ∥C⁽ʳ⁾j,:∥² = constant"
        ],
        caption: "The router rows spread in pairs, so their center remains pinned.",
        corner: "moving rows → fixed centroid"
      }
    };
    let mode = "mha";
    let start = performance.now();
    let width = 800;
    let height = 590;
    let visible = true;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(300, rect.width);
      height = Math.max(360, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(performance.now());
    }

    function background() {
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.strokeStyle = "rgba(32,38,50,.055)";
      for (let y = 58; y < height; y += 58) {
        ctx.beginPath();
        ctx.moveTo(28, y);
        ctx.lineTo(width - 28, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    function label(text, x, y, align, color, size) {
      ctx.save();
      ctx.fillStyle = color || colors.muted;
      ctx.font = "700 " + (size || 10) + "px 'Source Serif 4', Georgia, serif";
      ctx.textAlign = align || "left";
      ctx.fillText(text, x, y);
      ctx.restore();
    }

    function gram(matrix) {
      return [
        matrix[0] * matrix[0] + matrix[2] * matrix[2],
        matrix[0] * matrix[1] + matrix[2] * matrix[3],
        matrix[0] * matrix[1] + matrix[2] * matrix[3],
        matrix[1] * matrix[1] + matrix[3] * matrix[3]
      ];
    }

    function subtractMatrices(first, second) {
      return first.map(function (value, index) { return value - second[index]; });
    }

    function drawMatrixTile(matrix, x, y, size, tileLabel, hue, locked, pulse) {
      const gap = 5;
      const cell = (size - gap) / 2;
      label(tileLabel, x + size / 2, y - 15, "center", locked ? colors.redDeep : colors.ink, 10);
      if (locked) {
        ctx.save();
        ctx.strokeStyle = "rgba(169,61,74," + (.35 + pulse * .35) + ")";
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 10, y - 30, size + 20, size + 57);
        ctx.restore();
      }
      matrix.forEach(function (value, index) {
        const row = Math.floor(index / 2);
        const col = index % 2;
        const strength = .08 + Math.min(.38, Math.abs(value) * .14);
        ctx.fillStyle = hue === "red"
          ? "rgba(183,95,85," + strength + ")"
          : hue === "blue"
            ? "rgba(51,100,132," + strength + ")"
            : value >= 0
              ? "rgba(183,95,85," + strength + ")"
              : "rgba(51,100,132," + strength + ")";
        ctx.fillRect(x + col * (cell + gap), y + row * (cell + gap), cell, cell);
        ctx.strokeStyle = "rgba(32,38,50,.15)";
        ctx.strokeRect(x + col * (cell + gap), y + row * (cell + gap), cell, cell);
        label(value.toFixed(2), x + col * (cell + gap) + cell / 2, y + row * (cell + gap) + cell / 2 + 4, "center", colors.ink, 9);
      });
      if (locked) {
        drawLock(ctx, x + size / 2, y + size + 17, 15, colors.redDeep);
        label("unchanged", x + size / 2 + 18, y + size + 21, "left", colors.redDeep, 8);
      }
    }

    function drawMha(t) {
      const q0 = [1.35, -.35, .45, 1.10];
      const k0 = [.55, .25, -.30, .72];
      const theta = .46 * Math.sin(t * .72);
      const ch = Math.cosh(theta);
      const sh = Math.sinh(theta);
      const q = q0.map(function (value, index) { return ch * value + sh * k0[index]; });
      const k = k0.map(function (value, index) { return sh * q0[index] + ch * value; });
      const fingerprint = subtractMatrices(gram(q), gram(k));
      const compact = width < 620;
      const pulse = Math.exp(-t * 2.2);

      if (compact) {
        const movingSize = 104;
        drawMatrixTile(q, 22, 80, movingSize, "Q moves", "red", false, 0);
        drawMatrixTile(k, width - 22 - movingSize, 80, movingSize, "K moves", "blue", false, 0);
        label("−", width / 2, 135, "center", colors.muted, 18);
        label("their Gram difference", width / 2, 218, "center", colors.muted, 9);
        drawMatrixTile(fingerprint, width / 2 - 66, 253, 132, "QᵀQ − KᵀK", "mixed", true, pulse);
        return;
      }

      const movingSize = Math.min(126, width * .145);
      const fixedSize = Math.min(148, width * .17);
      const qX = width * .07;
      const kX = width * .36;
      const hX = width * .75 - fixedSize / 2;
      const y = height / 2 - movingSize / 2;
      drawMatrixTile(q, qX, y, movingSize, "Q moves", "red", false, 0);
      drawMatrixTile(k, kX, y, movingSize, "K moves", "blue", false, 0);
      label("−", width * .295, height / 2 + 4, "center", colors.muted, 22);
      label("take the Gram matrices", width * .57, height / 2 - 12, "center", colors.muted, 9);
      label("→", width * .57, height / 2 + 14, "center", colors.redDeep, 22);
      drawMatrixTile(fingerprint, hX, height / 2 - fixedSize / 2, fixedSize, "QᵀQ − KᵀK", "mixed", true, pulse);
      label("both matrices change", width * .275, height - 47, "center", colors.muted, 9);
      label("every output cell is fixed", hX + fixedSize / 2, height - 47, "center", colors.redDeep, 9);
    }

    function drawVectorArrow(origin, angle, length, color, lineWidth) {
      const end = { x: origin.x + Math.cos(angle) * length, y: origin.y + Math.sin(angle) * length };
      const head = 9;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = lineWidth || 3;
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(end.x - Math.cos(angle - .48) * head, end.y - Math.sin(angle - .48) * head);
      ctx.lineTo(end.x - Math.cos(angle + .48) * head, end.y - Math.sin(angle + .48) * head);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return end;
    }

    function drawRopeBlock(x, y, cardWidth, cardHeight, index, t) {
      const delta = 1.05 + index * .28;
      const kEnergy = 1.05 + .45 * (1 + Math.sin(t * .82 + index * 1.1)) / 2;
      const qEnergy = kEnergy + delta;
      const maxLength = Math.min(cardWidth * .27, cardHeight * .25);
      const scale = maxLength / Math.sqrt(2.8);
      const center = { x: x + cardWidth / 2, y: y + cardHeight * .45 };
      const rotation = t * (.58 + index * .08) + index * .65;
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,.18)";
      ctx.strokeStyle = "rgba(32,38,50,.15)";
      ctx.fillRect(x, y, cardWidth, cardHeight);
      ctx.strokeRect(x, y, cardWidth, cardHeight);
      ctx.strokeStyle = "rgba(32,38,50,.11)";
      ctx.beginPath();
      ctx.moveTo(center.x - maxLength - 12, center.y);
      ctx.lineTo(center.x + maxLength + 12, center.y);
      ctx.moveTo(center.x, center.y - maxLength - 12);
      ctx.lineTo(center.x, center.y + maxLength + 12);
      ctx.stroke();
      drawVectorArrow(center, rotation + .50, Math.sqrt(qEnergy) * scale, colors.red, 3.2);
      drawVectorArrow(center, rotation - .36, Math.sqrt(kEnergy) * scale, colors.blue, 3.2);
      ctx.strokeStyle = "rgba(198,146,66,.75)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(center.x, center.y, 28, rotation - .36, rotation + .50);
      ctx.stroke();
      ctx.restore();
      label("RoPE block " + (index + 1), x + 13, y + 20, "left", colors.ink, 9);
      label("Q", center.x + Math.cos(rotation + .50) * (Math.sqrt(qEnergy) * scale + 13), center.y + Math.sin(rotation + .50) * (Math.sqrt(qEnergy) * scale + 13), "center", colors.redDeep, 9);
      label("K", center.x + Math.cos(rotation - .36) * (Math.sqrt(kEnergy) * scale + 13), center.y + Math.sin(rotation - .36) * (Math.sqrt(kEnergy) * scale + 13), "center", colors.blue, 9);
      ctx.fillStyle = "rgba(183,95,85,.065)";
      ctx.fillRect(x + 12, y + cardHeight - 42, cardWidth - 24, 28);
      label("∥Q∥² − ∥K∥² = " + delta.toFixed(2) + "  🔒", x + cardWidth / 2, y + cardHeight - 24, "center", colors.redDeep, 9);
    }

    function drawRope(t) {
      const compact = width < 620;
      if (compact) {
        drawRopeBlock(28, 62, width - 56, 154, 0, t);
        drawRopeBlock(28, 239, width - 56, 154, 1, t);
        return;
      }
      const cardWidth = Math.min(330, width * .37);
      const cardHeight = 245;
      const gap = Math.min(54, width * .07);
      const startX = (width - cardWidth * 2 - gap) / 2;
      drawRopeBlock(startX, 77, cardWidth, cardHeight, 0, t);
      drawRopeBlock(startX + cardWidth + gap, 77, cardWidth, cardHeight, 1, t);
      label("the arrows rotate and change length", width / 2, height - 47, "center", colors.muted, 9);
    }

    function routerOffsets(t) {
      const p = {
        x: 108 * Math.sin(t * .62),
        y: 54 * Math.sin(t * .91 + .4)
      };
      const q = {
        x: 72 * Math.sin(t * .83 + 1.5),
        y: 98 * Math.sin(t * .55 + 2.1)
      };
      return [p, { x: -p.x, y: -p.y }, q, { x: -q.x, y: -q.y }];
    }

    function drawMoe(t) {
      const compact = width < 620;
      const centroid = { x: width / 2, y: compact ? 218 : height / 2 };
      const scale = compact ? .72 : 1;
      const palette = [colors.red, colors.red, colors.blue, colors.blue];
      ctx.save();
      ctx.strokeStyle = "rgba(32,38,50,.11)";
      ctx.beginPath();
      ctx.moveTo(compact ? 34 : width * .15, centroid.y);
      ctx.lineTo(compact ? width - 34 : width * .85, centroid.y);
      ctx.moveTo(centroid.x, compact ? 55 : 55);
      ctx.lineTo(centroid.x, compact ? 380 : height - 55);
      ctx.stroke();
      for (let trail = 14; trail >= 0; trail -= 1) {
        const past = routerOffsets(t - trail * .045);
        ctx.globalAlpha = .025 + (14 - trail) * .004;
        past.forEach(function (offset, index) {
          ctx.fillStyle = palette[index];
          ctx.beginPath();
          ctx.arc(centroid.x + offset.x * scale, centroid.y + offset.y * scale, 2, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      ctx.restore();

      const offsets = routerOffsets(t);
      offsets.forEach(function (offset, index) {
        const point = { x: centroid.x + offset.x * scale, y: centroid.y + offset.y * scale };
        ctx.strokeStyle = "rgba(32,38,50,.15)";
        ctx.beginPath();
        ctx.moveTo(centroid.x, centroid.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
        ctx.fillStyle = palette[index];
        ctx.strokeStyle = colors.paper;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        label("W" + (index + 1), point.x, point.y - 15, "center", palette[index], 9);
      });

      ctx.strokeStyle = colors.redDeep;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centroid.x - 11, centroid.y);
      ctx.lineTo(centroid.x + 11, centroid.y);
      ctx.moveTo(centroid.x, centroid.y - 11);
      ctx.lineTo(centroid.x, centroid.y + 11);
      ctx.stroke();
      drawLock(ctx, centroid.x, centroid.y + 34, 17, colors.redDeep);
      label("fixed center", centroid.x, centroid.y + 72, "center", colors.redDeep, 10);
      label("W₁ + W₂ + W₃ + W₄ never changes", centroid.x, centroid.y + 90, "center", colors.muted, 9);
      label("paired motion cancels at the center", width / 2, height - 42, "center", colors.muted, 9);
    }

    function draw(now) {
      background();
      const t = reducedMotion ? 1.3 : (now - start) / 1000;
      if (mode === "mha") drawMha(t);
      else if (mode === "rope") drawRope(t);
      else drawMoe(t);
    }

    function select(next) {
      mode = next;
      start = performance.now();
      const item = content[mode];
      kicker.textContent = item.kicker;
      title.textContent = item.title;
      definition.textContent = item.definition;
      formula.innerHTML = item.formula.map(function (line) {
        return "<span>" + line + "</span>";
      }).join("");
      caption.textContent = item.caption;
      corner.textContent = item.corner;
      tabs.forEach(function (tab) {
        const active = tab.dataset.arch === mode;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", String(active));
      });
      draw(start);
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () { select(tab.dataset.arch); });
    });
    replay.addEventListener("click", function () {
      start = performance.now();
      draw(start);
    });

    new ResizeObserver(resize).observe(canvas);
    new IntersectionObserver(function (entries) {
      visible = entries[0] ? entries[0].isIntersecting : true;
    }, { rootMargin: "150px" }).observe(canvas);

    function frame(now) {
      if (visible) draw(now);
      requestAnimationFrame(frame);
    }
    select(mode);
    resize();
    requestAnimationFrame(frame);
  }

  function initExperiments() {
    const canvas = document.getElementById("experiment-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const tabs = Array.from(document.querySelectorAll("[data-experiment]"));
    const dataset = document.getElementById("experiment-dataset");
    const block = document.getElementById("experiment-block");
    const rates = document.getElementById("experiment-rates");
    const replay = document.getElementById("experiment-replay");
    const playhead = document.getElementById("experiment-playhead");
    const configs = {
      mha: {
        dataset: "ImageNet-1K",
        block: "multi-head attention",
        rates: ["10⁻³", "2×10⁻³", "3×10⁻³"],
        amplitude: [.18, .31, .49]
      },
      rope: {
        dataset: "WikiText-103",
        block: "rotary position attention",
        rates: ["2×10⁻⁶", "5×10⁻⁶", "10⁻⁵"],
        amplitude: [.15, .27, .43]
      },
      moe: {
        dataset: "WikiText-103",
        block: "softmax MoE gating",
        rates: ["2×10⁻⁶", "5×10⁻⁶", "10⁻⁵"],
        amplitude: [.12, .24, .39]
      }
    };
    const lineColors = [colors.red, colors.blue, colors.gold];
    let mode = "mha";
    let start = performance.now();
    let width = 800;
    let height = 555;
    let visible = true;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(300, rect.width);
      height = Math.max(390, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(performance.now());
    }

    function curveValue(x, rateIndex, seed) {
      const config = configs[mode];
      const amp = config.amplitude[rateIndex];
      const seedShift = (seed - 4.5) * .009;
      const wave = Math.sin(x * (7.2 + seed * .19) + seed * 1.77) * .025;
      const smallerWave = Math.sin(x * 19 + seed * .63) * .011;
      return Math.max(0, x * (amp * (.12 + .88 * Math.pow(x, .72)) + seedShift + wave + smallerWave));
    }

    function draw(now) {
      ctx.clearRect(0, 0, width, height);
      const left = Math.max(55, width * .09);
      const right = Math.max(100, width * .12);
      const top = 40;
      const bottom = 54;
      const chartW = width - left - right;
      const chartH = height - top - bottom;
      const progress = reducedMotion ? 1 : Math.min(1, (now - start) / 5200);

      ctx.save();
      ctx.fillStyle = "rgba(183,95,85,.055)";
      ctx.fillRect(left, top + chartH * .78, chartW, chartH * .22);
      ctx.fillStyle = colors.redDeep;
      ctx.font = "700 8px 'Source Serif 4', Georgia, serif";
      ctx.textAlign = "left";
      ctx.fillText("near-initialization band", left + 9, top + chartH - 10);
      ctx.strokeStyle = "rgba(32,38,50,.09)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 3; i += 1) {
        const y = top + chartH * i / 3;
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(left + chartW, y);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(32,38,50,.25)";
      ctx.beginPath();
      ctx.moveTo(left, top);
      ctx.lineTo(left, top + chartH);
      ctx.lineTo(left + chartW, top + chartH);
      ctx.stroke();

      ctx.fillStyle = colors.muted;
      ctx.font = "700 9px 'Source Serif 4', Georgia, serif";
      ctx.textAlign = "right";
      ctx.fillText("more drift", left - 10, top + 4);
      ctx.fillText("0", left - 10, top + chartH + 3);
      ctx.textAlign = "left";
      ctx.fillText("start", left, top + chartH + 27);
      ctx.textAlign = "right";
      ctx.fillText("training steps", left + chartW, top + chartH + 27);
      ctx.save();
      ctx.translate(18, top + chartH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.fillText("drift from initialization", 0, 0);
      ctx.restore();

      for (let rate = 0; rate < 3; rate += 1) {
        for (let seed = 0; seed < 10; seed += 1) {
          ctx.strokeStyle = lineColors[rate];
          ctx.globalAlpha = .08;
          ctx.lineWidth = 1;
          ctx.beginPath();
          const points = 90;
          for (let i = 0; i <= points * progress; i += 1) {
            const x = i / points;
            const yValue = curveValue(x, rate, seed);
            const px = left + x * chartW;
            const py = top + chartH - yValue * chartH / .72;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }

        ctx.globalAlpha = 1;
        ctx.strokeStyle = lineColors[rate];
        ctx.lineWidth = 3;
        ctx.beginPath();
        const points = 110;
        for (let i = 0; i <= points * progress; i += 1) {
          const x = i / points;
          let mean = 0;
          for (let seed = 0; seed < 10; seed += 1) mean += curveValue(x, rate, seed) / 10;
          const px = left + x * chartW;
          const py = top + chartH - mean * chartH / .72;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        if (progress > .02) {
          const x = progress;
          let mean = 0;
          for (let seed = 0; seed < 10; seed += 1) mean += curveValue(x, rate, seed) / 10;
          const px = left + x * chartW;
          const py = top + chartH - mean * chartH / .72;
          ctx.fillStyle = lineColors[rate];
          ctx.beginPath();
          ctx.arc(px, py, 4.5, 0, Math.PI * 2);
          ctx.fill();
          if (progress > .12 && width >= 620) {
            const offsets = [-10, 1, 12];
            ctx.font = "700 9px 'Source Serif 4', Georgia, serif";
            ctx.textAlign = "left";
            ctx.fillText(configs[mode].rates[rate], px + 9, py + offsets[rate]);
          }
        }
      }
      ctx.restore();
      playhead.style.opacity = progress < 1 ? ".8" : "0";
      playhead.style.left = (left + chartW * progress) / width * 100 + "%";
    }

    function select(next) {
      mode = next;
      start = performance.now();
      const config = configs[mode];
      dataset.textContent = config.dataset;
      block.textContent = config.block;
      rates.innerHTML = config.rates.map(function (rate, index) {
        return "<span><i class=\"rate-" + ["one", "two", "three"][index] + "\"></i>" + rate + "</span>";
      }).join("");
      tabs.forEach(function (tab) {
        const active = tab.dataset.experiment === mode;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", String(active));
      });
      draw(start);
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () { select(tab.dataset.experiment); });
    });
    replay.addEventListener("click", function () {
      start = performance.now();
      draw(start);
    });
    new ResizeObserver(resize).observe(canvas);
    new IntersectionObserver(function (entries) {
      visible = entries[0] ? entries[0].isIntersecting : true;
      if (visible && performance.now() - start > 9000) start = performance.now();
    }, { rootMargin: "100px" }).observe(canvas);

    function frame(now) {
      if (visible) draw(now);
      requestAnimationFrame(frame);
    }
    select(mode);
    resize();
    requestAnimationFrame(frame);
  }

  function initComparison() {
    const canvas = document.getElementById("comparison-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const tabs = Array.from(document.querySelectorAll("[data-comparison]"));
    const conservedFormula = document.getElementById("conserved-formula");
    const controlFormula = document.getElementById("control-formula");
    const replay = document.getElementById("comparison-replay");
    const formulas = {
      mha: ["QᵀQ − KᵀK", "QᵀQ + KᵀK"],
      rope: ["∥Q⁽ʲ⁾∥F² − ∥K⁽ʲ⁾∥F²", "column-0 energy − column-1 energy"],
      moe: ["Σᵣ Wᵣ", "first router row W₀"]
    };
    let mode = "mha";
    let start = performance.now();
    let width = 800;
    let height = 390;
    let visible = true;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(300, rect.width);
      height = Math.max(320, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(performance.now());
    }

    function conservedValue(x, seed) {
      return x * (.012 * Math.sin(x * 17 + seed * 1.8) + (seed - 4.5) * .0017);
    }

    function controlValue(x, seed) {
      const modeFactor = mode === "moe" ? .88 : mode === "rope" ? 1.1 : 1;
      return -modeFactor * x * (.16 + seed * .006 + .17 * x) + .025 * x * Math.sin(x * 12 + seed);
    }

    function meanValue(valueFunction, x) {
      let value = 0;
      for (let seed = 0; seed < 10; seed += 1) value += valueFunction(x, seed) / 10;
      return value;
    }

    function drawSeries(valueFunction, color, progress) {
      const compact = width < 620;
      const left = compact ? 52 : Math.max(55, width * .075);
      const right = compact ? 58 : Math.max(115, width * .14);
      const top = 38;
      const bottom = 48;
      const chartW = width - left - right;
      const chartH = height - top - bottom;
      const minValue = -.48;
      const maxValue = .12;
      const point = function (x, value) {
        return {
          x: left + x * chartW,
          y: top + (maxValue - value) / (maxValue - minValue) * chartH
        };
      };
      for (let seed = 0; seed < 10; seed += 1) {
        ctx.strokeStyle = color;
        ctx.globalAlpha = .075;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i <= 100 * progress; i += 1) {
          const x = i / 100;
          const p = point(x, valueFunction(x, seed));
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i <= 120 * progress; i += 1) {
        const x = i / 120;
        const p = point(x, meanValue(valueFunction, x));
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      return point(progress, meanValue(valueFunction, progress));
    }

    function draw(now) {
      ctx.clearRect(0, 0, width, height);
      const progress = reducedMotion ? 1 : Math.min(1, (now - start) / 4800);
      const compact = width < 620;
      const left = compact ? 52 : Math.max(55, width * .075);
      const right = compact ? 58 : Math.max(115, width * .14);
      const top = 38;
      const bottom = 48;
      const chartW = width - left - right;
      const chartH = height - top - bottom;
      const minValue = -.48;
      const maxValue = .12;
      const yFor = function (value) { return top + (maxValue - value) / (maxValue - minValue) * chartH; };
      const baseline = yFor(0);
      const bandTop = yFor(.025);
      const bandBottom = yFor(-.025);

      ctx.fillStyle = "rgba(183,95,85,.055)";
      ctx.fillRect(left, bandTop, chartW, bandBottom - bandTop);
      ctx.strokeStyle = "rgba(32,38,50,.08)";
      for (let i = 0; i <= 3; i += 1) {
        const y = top + chartH * i / 3;
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(left + chartW, y);
        ctx.stroke();
      }
      ctx.save();
      ctx.strokeStyle = "rgba(32,38,50,.32)";
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(left, baseline);
      ctx.lineTo(left + chartW, baseline);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = colors.muted;
      ctx.font = "700 8px 'Source Serif 4', Georgia, serif";
      ctx.textAlign = "left";
      if (!compact) ctx.fillText("Δ = 0 · initial value", left + 7, baseline - 8);
      ctx.textAlign = "right";
      ctx.fillText("training steps →", left + chartW, top + chartH + 27);
      ctx.save();
      ctx.translate(18, top + chartH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.fillText("change from start", 0, 0);
      ctx.restore();

      const conservedPoint = drawSeries(conservedValue, colors.red, progress);
      const controlPoint = drawSeries(controlValue, colors.blue, progress);
      ctx.fillStyle = "rgba(51,100,132,.075)";
      ctx.fillRect(conservedPoint.x - 2, Math.min(conservedPoint.y, controlPoint.y), 4, Math.abs(controlPoint.y - conservedPoint.y));
      ctx.strokeStyle = "rgba(32,38,50,.16)";
      ctx.beginPath();
      ctx.moveTo(conservedPoint.x, top);
      ctx.lineTo(conservedPoint.x, top + chartH);
      ctx.stroke();

      [
        { point: conservedPoint, color: colors.red, text: compact ? "locked 🔒" : "conserved 🔒", offset: -11 },
        { point: controlPoint, color: colors.blue, text: "control", offset: 15 }
      ].forEach(function (item) {
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(item.point.x, item.point.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = "700 " + (compact ? 8 : 10) + "px 'Source Serif 4', Georgia, serif";
        ctx.textAlign = "left";
        ctx.fillText(item.text, item.point.x + 10, item.point.y + item.offset);
      });

      ctx.fillStyle = colors.ink;
      ctx.beginPath();
      ctx.arc(left, baseline, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.muted;
      ctx.font = "700 8px 'Source Serif 4', Georgia, serif";
      ctx.textAlign = "left";
      ctx.fillText("same start", left + 8, baseline + 16);
    }

    function select(next) {
      mode = next;
      start = performance.now();
      conservedFormula.textContent = formulas[mode][0];
      controlFormula.textContent = formulas[mode][1];
      tabs.forEach(function (tab) {
        const active = tab.dataset.comparison === mode;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", String(active));
      });
      draw(start);
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () { select(tab.dataset.comparison); });
    });
    replay.addEventListener("click", function () {
      start = performance.now();
      draw(start);
    });
    new ResizeObserver(resize).observe(canvas);
    new IntersectionObserver(function (entries) {
      visible = entries[0] ? entries[0].isIntersecting : true;
      if (visible && performance.now() - start > 8000) start = performance.now();
    }, { rootMargin: "100px" }).observe(canvas);

    function frame(now) {
      if (visible) draw(now);
      requestAnimationFrame(frame);
    }
    select(mode);
    resize();
    requestAnimationFrame(frame);
  }

  function initTakeaway() {
    const lab = document.getElementById("takeaway-lab");
    const canvas = document.getElementById("takeaway-canvas");
    if (!lab || !canvas) return;
    const ctx = canvas.getContext("2d");
    const replayButton = document.getElementById("takeaway-replay");
    const progressInput = document.getElementById("takeaway-progress");
    const outputReadout = document.getElementById("takeaway-output");
    const lossReadout = document.getElementById("takeaway-loss");
    const finishAReadout = document.getElementById("takeaway-finish-a");
    const finishBReadout = document.getElementById("takeaway-finish-b");
    const verdict = document.getElementById("takeaway-verdict");

    const target = 1.2;
    const startOutput = .4;
    const startA = { a: 1.6, b: .25 };
    const startB = { a: .25, b: 1.6 };
    const invariantMagnitude = startA.a * startA.a - startA.b * startA.b;
    const runs = [
      { name: "A", start: startA, h: invariantMagnitude, color: colors.red },
      { name: "B", start: startB, h: -invariantMagnitude, color: colors.blue }
    ];
    let width = 900;
    let height = 450;
    let progress = reducedMotion ? 1 : 0;
    let playing = !reducedMotion;
    let visible = true;
    let hasEntered = false;
    let lastFrame = performance.now();
    let layout = null;

    function stateFor(h, product) {
      const discriminant = Math.sqrt(h * h + 4 * product * product);
      const aSquared = Math.max(0, (h + discriminant) / 2);
      const a = Math.sqrt(aSquared);
      return { a: a, b: a > 1e-9 ? product / a : 0 };
    }

    runs.forEach(function (run) {
      run.finish = stateFor(run.h, target);
    });

    function formatPoint(point) {
      return "(" + point.a.toFixed(2) + ", " + point.b.toFixed(2) + ")";
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(300, rect.width);
      height = Math.max(360, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const compact = width < 620;
      layout = {
        compact: compact,
        left: compact ? 46 : 72,
        right: compact ? 24 : 48,
        top: compact ? 72 : 64,
        bottom: compact ? 50 : 52,
        max: compact ? 2.28 : 2.25
      };
      draw(performance.now());
    }

    function screenPoint(point) {
      const chartWidth = width - layout.left - layout.right;
      const chartHeight = height - layout.top - layout.bottom;
      return {
        x: layout.left + point.a / layout.max * chartWidth,
        y: layout.top + chartHeight - point.b / layout.max * chartHeight
      };
    }

    function label(text, x, y, options) {
      const settings = options || {};
      ctx.save();
      ctx.fillStyle = settings.color || colors.muted;
      ctx.font = (settings.weight || "700") + " " + (settings.size || 9) + "px 'Source Serif 4', Georgia, serif";
      ctx.textAlign = settings.align || "left";
      ctx.globalAlpha = settings.alpha == null ? 1 : settings.alpha;
      ctx.fillText(text, x, y);
      ctx.restore();
    }

    function drawAxes() {
      const origin = screenPoint({ a: 0, b: 0 });
      const topLeft = screenPoint({ a: 0, b: layout.max });
      const topRight = screenPoint({ a: layout.max, b: layout.max });
      ctx.save();
      ctx.strokeStyle = "rgba(32,38,50,.07)";
      ctx.lineWidth = 1;
      [.5, 1, 1.5, 2].forEach(function (tick) {
        const vertical = screenPoint({ a: tick, b: 0 });
        const horizontal = screenPoint({ a: 0, b: tick });
        ctx.beginPath();
        ctx.moveTo(vertical.x, layout.top);
        ctx.lineTo(vertical.x, origin.y);
        ctx.moveTo(layout.left, horizontal.y);
        ctx.lineTo(width - layout.right, horizontal.y);
        ctx.stroke();
        label(tick.toFixed(1), vertical.x, origin.y + 18, { align: "center", size: 7, weight: "400" });
        label(tick.toFixed(1), layout.left - 9, horizontal.y + 3, { align: "right", size: 7, weight: "400" });
      });
      ctx.strokeStyle = "rgba(32,38,50,.28)";
      ctx.beginPath();
      ctx.moveTo(topLeft.x, topLeft.y);
      ctx.lineTo(origin.x, origin.y);
      ctx.lineTo(width - layout.right, origin.y);
      ctx.stroke();
      ctx.restore();
      label("b", layout.left - 15, layout.top + 2, { align: "center", color: colors.ink, size: 10 });
      label("a", topRight.x + 7, origin.y + 4, { color: colors.ink, size: 10 });
    }

    function drawTargetCurve() {
      ctx.save();
      ctx.strokeStyle = colors.green;
      ctx.lineWidth = 2.4;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      let drawing = false;
      for (let step = 0; step <= 180; step += 1) {
        const a = target / layout.max + (layout.max - target / layout.max) * step / 180;
        const b = target / a;
        const point = screenPoint({ a: a, b: b });
        if (!drawing) {
          ctx.moveTo(point.x, point.y);
          drawing = true;
        } else {
          ctx.lineTo(point.x, point.y);
        }
      }
      ctx.stroke();
      ctx.restore();
      const labelPoint = screenPoint(layout.compact ? { a: .63, b: target / .63 } : { a: .72, b: target / .72 });
      label("same target · loss = 0", labelPoint.x + 6, labelPoint.y - 10, { color: colors.green, size: layout.compact ? 8 : 9 });
    }

    function drawInvariantCurve(run) {
      ctx.save();
      ctx.strokeStyle = run.color;
      ctx.globalAlpha = .25;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let drawing = false;
      for (let step = 0; step <= 200; step += 1) {
        const a = layout.max * step / 200;
        const bSquared = a * a - run.h;
        if (bSquared < 0) continue;
        const b = Math.sqrt(bSquared);
        if (b > layout.max) continue;
        const point = screenPoint({ a: a, b: b });
        if (!drawing) {
          ctx.moveTo(point.x, point.y);
          drawing = true;
        } else {
          ctx.lineTo(point.x, point.y);
        }
      }
      ctx.stroke();
      ctx.restore();
    }

    function easedProgress(value) {
      return value * value * (3 - 2 * value);
    }

    function productAt(value) {
      return startOutput + (target - startOutput) * easedProgress(value);
    }

    function drawRun(run, now) {
      const currentProduct = productAt(progress);
      const current = stateFor(run.h, currentProduct);
      const start = screenPoint(run.start);
      const finish = screenPoint(run.finish);
      const point = screenPoint(current);

      ctx.save();
      ctx.strokeStyle = run.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let step = 0; step <= 70; step += 1) {
        const local = progress * step / 70;
        const trailPoint = screenPoint(stateFor(run.h, productAt(local)));
        if (step === 0) ctx.moveTo(trailPoint.x, trailPoint.y);
        else ctx.lineTo(trailPoint.x, trailPoint.y);
      }
      ctx.stroke();

      ctx.fillStyle = colors.paper;
      ctx.strokeStyle = run.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(start.x, start.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.globalAlpha = .72;
      ctx.beginPath();
      ctx.arc(finish.x, finish.y, 8, 0, Math.PI * 2);
      ctx.stroke();
      if (progress > .985 && !reducedMotion) {
        ctx.globalAlpha = .10;
        ctx.fillStyle = colors.green;
        ctx.beginPath();
        ctx.arc(finish.x, finish.y, 15 + 3 * Math.sin(now / 190), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.fillStyle = run.color;
      ctx.strokeStyle = colors.paper;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      const startLabelX = run.name === "A" ? start.x - 11 : start.x + 11;
      const startAlign = run.name === "A" ? "right" : "left";
      label("start " + run.name, startLabelX, start.y + (run.name === "A" ? 23 : -15), {
        align: startAlign,
        color: run.color,
        size: 9
      });
      if (!layout.compact) {
        label("h = " + (run.h > 0 ? "+" : "−") + Math.abs(run.h).toFixed(2) + "  🔒", startLabelX, start.y + (run.name === "A" ? 38 : -30), {
          align: startAlign,
          color: run.color,
          size: 8
        });
      }
      label(run.name, point.x + (run.name === "A" ? 11 : -11), point.y - 10, {
        align: run.name === "A" ? "left" : "right",
        color: run.color,
        size: 10
      });
      if (progress > .9) {
        label("finish " + run.name, finish.x + (run.name === "A" ? 11 : -11), finish.y + (run.name === "A" ? -11 : 19), {
          align: run.name === "A" ? "left" : "right",
          color: run.color,
          size: 9
        });
      }
    }

    function updateReadouts() {
      const product = productAt(progress);
      const error = product - target;
      outputReadout.textContent = product.toFixed(2);
      lossReadout.textContent = (.5 * error * error).toFixed(3);
      progressInput.value = progress.toFixed(3);
      verdict.classList.toggle("is-finished", progress > .985);
    }

    function draw(now) {
      if (!layout) return;
      ctx.clearRect(0, 0, width, height);
      drawAxes();
      drawTargetCurve();
      runs.forEach(drawInvariantCurve);
      runs.forEach(function (run) { drawRun(run, now); });
      if (progress < .08) {
        const midpoint = screenPoint({ a: 1.05, b: 1.05 });
        label("same output 0.40 · same loss 0.320", midpoint.x, layout.top + 24, {
          align: "center",
          color: colors.ink,
          size: layout.compact ? 8 : 10
        });
      }
      updateReadouts();
    }

    function replay() {
      progress = 0;
      playing = !reducedMotion;
      lastFrame = performance.now();
      draw(lastFrame);
    }

    replayButton.addEventListener("click", replay);
    progressInput.addEventListener("input", function () {
      progress = Number(progressInput.value);
      playing = false;
      draw(performance.now());
    });

    new ResizeObserver(resize).observe(canvas);
    new IntersectionObserver(function (entries) {
      visible = entries[0] ? entries[0].isIntersecting : true;
      if (visible && !hasEntered) {
        hasEntered = true;
        replay();
      }
    }, { rootMargin: "80px" }).observe(lab);

    function frame(now) {
      const elapsed = Math.min(.05, (now - lastFrame) / 1000);
      lastFrame = now;
      if (visible && playing) {
        progress = Math.min(1, progress + elapsed / 3.4);
        if (progress >= 1) playing = false;
        draw(now);
      }
      requestAnimationFrame(frame);
    }

    finishAReadout.textContent = formatPoint(runs[0].finish);
    finishBReadout.textContent = formatPoint(runs[1].finish);
    resize();
    requestAnimationFrame(frame);
  }

  initHeroLock();
  initToyLab();
  initTwoPathLab();
  initArchitecture();
  initExperiments();
  initComparison();
  initTakeaway();
})();
