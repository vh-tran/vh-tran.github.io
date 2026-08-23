(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const palette = {
    ink: "#1a150e",
    muted: "#786d67",
    rule: "rgba(55, 42, 37, 0.16)",
    faint: "rgba(55, 42, 37, 0.075)",
    accent: "#b75f55",
    accentSoft: "rgba(183, 95, 85, 0.22)",
    blue: "#294fa7",
    blueSoft: "rgba(41, 79, 167, 0.18)",
    green: "#527d67",
    panel: "rgba(255, 255, 255, 0.16)"
  };

  function setupCanvas(canvas, draw) {
    const context = canvas.getContext("2d");
    const size = { width: 0, height: 0, dpr: 1 };

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      size.width = Math.max(1, rect.width);
      size.height = Math.max(1, rect.height);
      size.dpr = dpr;
      canvas.width = Math.round(size.width * dpr);
      canvas.height = Math.round(size.height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(performance.now());
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    return { context, size, resize };
  }

  function mapPoint(a, b, width, height, extent = 3.3, equalUnits = false) {
    const sharedScale = Math.min(width * 0.44, height * 0.42);
    const scaleX = equalUnits ? sharedScale : width * 0.44;
    const scaleY = equalUnits ? sharedScale : height * 0.42;
    return {
      x: width / 2 + (a / extent) * scaleX,
      y: height / 2 - (b / extent) * scaleY
    };
  }

  function drawHyperbola(context, width, height, constant, color, lineWidth, extent = 3.3, equalUnits = false) {
    context.save();
    context.strokeStyle = color;
    context.lineWidth = lineWidth;

    const drawBranch = (sign) => {
      context.beginPath();
      let started = false;
      const samples = 180;
      for (let index = 0; index <= samples; index += 1) {
        const t = -extent + (2 * extent * index) / samples;
        let a;
        let b;
        if (constant > 0.0001) {
          b = t;
          a = sign * Math.sqrt(Math.max(0, b * b + constant));
        } else if (constant < -0.0001) {
          a = t;
          b = sign * Math.sqrt(Math.max(0, a * a - constant));
        } else {
          a = t;
          b = sign * t;
        }
        if (Math.abs(a) > extent * 1.18 || Math.abs(b) > extent * 1.18) {
          started = false;
          continue;
        }
        const point = mapPoint(a, b, width, height, extent, equalUnits);
        if (!started) {
          context.moveTo(point.x, point.y);
          started = true;
        } else {
          context.lineTo(point.x, point.y);
        }
      }
      context.stroke();
    };

    drawBranch(1);
    drawBranch(-1);
    context.restore();
  }

  function drawGrid(context, width, height, extent, sparse = false, equalUnits = false) {
    context.save();
    context.lineWidth = 1;
    context.strokeStyle = palette.faint;
    const step = sparse ? 1 : 0.5;
    for (let value = -Math.floor(extent); value <= Math.floor(extent); value += step) {
      const verticalA = mapPoint(value, -extent, width, height, extent, equalUnits);
      const verticalB = mapPoint(value, extent, width, height, extent, equalUnits);
      context.beginPath();
      context.moveTo(verticalA.x, verticalA.y);
      context.lineTo(verticalB.x, verticalB.y);
      context.stroke();

      const horizontalA = mapPoint(-extent, value, width, height, extent, equalUnits);
      const horizontalB = mapPoint(extent, value, width, height, extent, equalUnits);
      context.beginPath();
      context.moveTo(horizontalA.x, horizontalA.y);
      context.lineTo(horizontalB.x, horizontalB.y);
      context.stroke();
    }
    context.strokeStyle = palette.rule;
    const xAxisA = mapPoint(-extent, 0, width, height, extent, equalUnits);
    const xAxisB = mapPoint(extent, 0, width, height, extent, equalUnits);
    const yAxisA = mapPoint(0, -extent, width, height, extent, equalUnits);
    const yAxisB = mapPoint(0, extent, width, height, extent, equalUnits);
    context.beginPath();
    context.moveTo(xAxisA.x, xAxisA.y);
    context.lineTo(xAxisB.x, xAxisB.y);
    context.moveTo(yAxisA.x, yAxisA.y);
    context.lineTo(yAxisB.x, yAxisB.y);
    context.stroke();
    context.restore();
  }

  const heroCanvas = document.getElementById("hero-space");
  if (heroCanvas) {
    let heroSurface;
    let heroVisible = true;
    let heroFrame = null;

    function scheduleHero() {
      if (prefersReducedMotion || !heroVisible || heroFrame !== null) return;
      heroFrame = requestAnimationFrame((timestamp) => {
        heroFrame = null;
        drawHero(timestamp);
      });
    }

    function drawHero(timestamp) {
      if (!heroSurface) return;
      const { context, size } = heroSurface;
      const { width, height } = size;
      context.clearRect(0, 0, width, height);
      context.fillStyle = palette.panel;
      context.fillRect(0, 0, width, height);
      drawGrid(context, width, height, 3.4, true);

      [-3.2, -1.6, -0.6, 0, 0.7, 1.8, 3.4].forEach((constant) => {
        drawHyperbola(context, width, height, constant, palette.rule, 1, 3.4);
      });

      const time = prefersReducedMotion ? 0 : timestamp / 1000;
      const particles = [
        { constant: 1.25, phase: 0.2, color: palette.accent, side: 1 },
        { constant: -1.05, phase: 2.4, color: palette.blue, side: 1 },
        { constant: 2.3, phase: 4.1, color: palette.green, side: -1 }
      ];

      particles.forEach((particle, particleIndex) => {
        const parameter = Math.sin(time * (0.48 + particleIndex * 0.08) + particle.phase) * 1.05;
        let a;
        let b;
        if (particle.constant > 0) {
          a = particle.side * Math.sqrt(particle.constant) * Math.cosh(parameter);
          b = Math.sqrt(particle.constant) * Math.sinh(parameter);
        } else {
          a = Math.sqrt(-particle.constant) * Math.sinh(parameter);
          b = particle.side * Math.sqrt(-particle.constant) * Math.cosh(parameter);
        }
        const point = mapPoint(a, b, width, height, 3.4);

        context.save();
        context.fillStyle = particle.color;
        context.shadowColor = particle.color;
        context.shadowBlur = 12;
        context.beginPath();
        context.arc(point.x, point.y, 4.8, 0, Math.PI * 2);
        context.fill();
        context.restore();
      });

      context.fillStyle = palette.muted;
      context.font = "12px 'Source Serif 4', Georgia, serif";
      context.fillText("b", width / 2 + 8, 18);
      context.fillText("a", width - 18, height / 2 - 8);
      context.fillText("each curve: a² − b² = constant", 14, height - 14);

      scheduleHero();
    }

    heroSurface = setupCanvas(heroCanvas, drawHero);
    const heroObserver = new IntersectionObserver((entries) => {
      const wasVisible = heroVisible;
      heroVisible = entries[0].isIntersecting;
      if (heroVisible && !wasVisible) scheduleHero();
    }, { threshold: 0.05 });
    heroObserver.observe(heroCanvas);
    scheduleHero();
  }

  const parameterCanvas = document.getElementById("parameter-canvas");
  if (!parameterCanvas) return;

  const controls = {
    modeButtons: Array.from(document.querySelectorAll("[data-mode]")),
    target: document.getElementById("target-slider"),
    targetOutput: document.getElementById("target-output"),
    startA: document.getElementById("start-a-slider"),
    startAOutput: document.getElementById("start-a-output"),
    startB: document.getElementById("start-b-slider"),
    startBOutput: document.getElementById("start-b-output"),
    step: document.getElementById("step-slider"),
    stepOutput: document.getElementById("step-output"),
    stepControl: document.getElementById("step-control"),
    play: document.getElementById("play-button"),
    reset: document.getElementById("reset-button"),
    loss: document.getElementById("loss-value"),
    invariant: document.getElementById("invariant-value"),
    initialInvariant: document.getElementById("initial-invariant-value"),
    timeLabel: document.getElementById("time-label"),
    time: document.getElementById("time-value")
  };

  const state = {
    a: 2.2,
    b: 0.7,
    initialA: 2.2,
    initialB: 0.7,
    target: 1.2,
    step: 0.04,
    mode: "flow",
    running: !prefersReducedMotion,
    elapsed: 0,
    iterations: 0,
    accumulator: 0,
    trail: [],
    dragging: false,
    visible: true
  };

  function invariant(a = state.a, b = state.b) {
    return a * a - b * b;
  }

  function loss(a = state.a, b = state.b) {
    const error = a * b - state.target;
    return 0.5 * error * error;
  }

  function velocity(a, b) {
    const error = a * b - state.target;
    return { a: -error * b, b: -error * a };
  }

  function rk4(a, b, dt) {
    const k1 = velocity(a, b);
    const k2 = velocity(a + (k1.a * dt) / 2, b + (k1.b * dt) / 2);
    const k3 = velocity(a + (k2.a * dt) / 2, b + (k2.b * dt) / 2);
    const k4 = velocity(a + k3.a * dt, b + k3.b * dt);
    return {
      a: a + (dt / 6) * (k1.a + 2 * k2.a + 2 * k3.a + k4.a),
      b: b + (dt / 6) * (k1.b + 2 * k2.b + 2 * k3.b + k4.b)
    };
  }

  function resetSimulation(a = state.initialA, b = state.initialB) {
    state.a = a;
    state.b = b;
    state.initialA = a;
    state.initialB = b;
    state.elapsed = 0;
    state.iterations = 0;
    state.accumulator = 0;
    state.trail = [{ a, b }];
    controls.startA.value = String(a);
    controls.startB.value = String(b);
    controls.startAOutput.value = Number(a).toFixed(2);
    controls.startBOutput.value = Number(b).toFixed(2);
    updateReadout();
    drawParameter(performance.now());
  }

  function formatNumber(value, digits = 4) {
    if (!Number.isFinite(value)) return "—";
    if (Math.abs(value) < 0.00005) return "0";
    return value.toFixed(digits);
  }

  function updateReadout() {
    controls.loss.textContent = formatNumber(loss(), 5);
    controls.invariant.textContent = formatNumber(invariant(), 4);
    controls.initialInvariant.textContent = formatNumber(invariant(state.initialA, state.initialB), 4);
    controls.timeLabel.textContent = state.mode === "flow" ? "flow time" : "GD steps";
    controls.time.textContent = state.mode === "flow" ? state.elapsed.toFixed(2) : String(state.iterations);
    controls.play.textContent = state.running ? "pause" : "play";
  }

  function setMode(mode) {
    state.mode = mode;
    controls.modeButtons.forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    controls.stepControl.hidden = mode !== "gd";
    resetSimulation();
  }

  controls.modeButtons.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
  controls.target.addEventListener("input", () => {
    state.target = Number(controls.target.value);
    controls.targetOutput.value = state.target.toFixed(2);
    resetSimulation();
  });
  controls.startA.addEventListener("input", () => {
    resetSimulation(Number(controls.startA.value), state.initialB);
  });
  controls.startB.addEventListener("input", () => {
    resetSimulation(state.initialA, Number(controls.startB.value));
  });
  controls.step.addEventListener("input", () => {
    state.step = Number(controls.step.value);
    controls.stepOutput.value = state.step.toFixed(3);
    resetSimulation();
  });
  controls.play.addEventListener("click", () => {
    state.running = !state.running;
    updateReadout();
    if (state.running) requestAnimationFrame(animateParameter);
  });
  controls.reset.addEventListener("click", () => resetSimulation());

  let parameterSurface;
  const extent = 3.3;

  function drawArrow(context, from, vector, color, label, width, height, projection = "tangent") {
    const unitScale = Math.min(width * 0.44, height * 0.42);
    const pixelVector = projection === "normal"
      ? { x: vector.a / unitScale, y: -vector.b / unitScale }
      : { x: vector.a * unitScale, y: -vector.b * unitScale };
    const magnitude = Math.hypot(pixelVector.x, pixelVector.y);
    if (magnitude < 1e-8) return;
    const scale = Math.min(68, Math.max(34, Math.min(width, height) * 0.09));
    const dx = (pixelVector.x / magnitude) * scale;
    const dy = (pixelVector.y / magnitude) * scale;
    const endX = from.x + dx;
    const endY = from.y + dy;
    const angle = Math.atan2(dy, dx);
    context.save();
    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(endX, endY);
    context.stroke();
    context.beginPath();
    context.moveTo(endX, endY);
    context.lineTo(endX - 8 * Math.cos(angle - 0.45), endY - 8 * Math.sin(angle - 0.45));
    context.lineTo(endX - 8 * Math.cos(angle + 0.45), endY - 8 * Math.sin(angle + 0.45));
    context.closePath();
    context.fill();
    context.font = "12px 'Source Serif 4', Georgia, serif";
    context.fillText(label, endX + 6, endY - 5);
    context.restore();
  }

  function drawVectorField(context, width, height) {
    context.save();
    context.strokeStyle = "rgba(55, 42, 37, 0.12)";
    context.fillStyle = "rgba(55, 42, 37, 0.12)";
    context.lineWidth = 1;
    const countX = Math.max(7, Math.floor(width / 105));
    const countY = Math.max(5, Math.floor(height / 105));
    for (let ix = 0; ix <= countX; ix += 1) {
      for (let iy = 0; iy <= countY; iy += 1) {
        const a = -extent + (2 * extent * ix) / countX;
        const b = -extent + (2 * extent * iy) / countY;
        const vector = velocity(a, b);
        const unitScale = Math.min(width * 0.44, height * 0.42);
        const pixelVector = { x: vector.a * unitScale, y: -vector.b * unitScale };
        const magnitude = Math.hypot(pixelVector.x, pixelVector.y);
        if (magnitude < 0.001) continue;
        const point = mapPoint(a, b, width, height, extent, true);
        const length = 8;
        const dx = (pixelVector.x / magnitude) * length;
        const dy = (pixelVector.y / magnitude) * length;
        context.beginPath();
        context.moveTo(point.x - dx * 0.5, point.y - dy * 0.5);
        context.lineTo(point.x + dx * 0.5, point.y + dy * 0.5);
        context.stroke();
        context.beginPath();
        context.arc(point.x + dx * 0.5, point.y + dy * 0.5, 1.4, 0, Math.PI * 2);
        context.fill();
      }
    }
    context.restore();
  }

  function drawParameter() {
    if (!parameterSurface) return;
    const { context, size } = parameterSurface;
    const { width, height } = size;
    context.clearRect(0, 0, width, height);
    drawGrid(context, width, height, extent, false, true);
    drawVectorField(context, width, height);

    [-5, -3, -1.5, 0, 1.5, 3, 5].forEach((constant) => {
      drawHyperbola(context, width, height, constant, palette.rule, 1, extent, true);
    });

    const initialInvariant = invariant(state.initialA, state.initialB);
    drawHyperbola(context, width, height, initialInvariant, palette.accent, 2.2, extent, true);

    if (state.trail.length > 1) {
      context.save();
      context.strokeStyle = state.mode === "flow" ? palette.blue : palette.green;
      context.lineWidth = 2.3;
      context.beginPath();
      state.trail.forEach((trailPoint, index) => {
        const point = mapPoint(trailPoint.a, trailPoint.b, width, height, extent, true);
        if (index === 0) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
      });
      context.stroke();
      context.restore();
    }

    const current = mapPoint(state.a, state.b, width, height, extent, true);
    context.save();
    context.fillStyle = palette.ink;
    context.beginPath();
    context.arc(current.x, current.y, 5.2, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(255,255,255,0.9)";
    context.lineWidth = 2;
    context.stroke();
    context.restore();

    const motion = velocity(state.a, state.b);
    const normal = { a: 2 * state.a, b: -2 * state.b };
    drawArrow(context, current, motion, palette.blue, "−∇L", width, height, "tangent");
    drawArrow(context, current, normal, palette.accent, "∇h", width, height, "normal");

    context.save();
    context.fillStyle = palette.muted;
    context.font = "12px 'Source Serif 4', Georgia, serif";
    const horizontalEnd = mapPoint(extent, 0, width, height, extent, true);
    const verticalEnd = mapPoint(0, extent, width, height, extent, true);
    context.fillText("b", verticalEnd.x + 8, verticalEnd.y + 12);
    context.fillText("a", horizontalEnd.x - 8, horizontalEnd.y - 8);
    context.fillStyle = palette.accent;
    context.fillText(`highlighted level set: a² − b² = ${initialInvariant.toFixed(3)}`, 14, 21);
    context.restore();
  }

  parameterSurface = setupCanvas(parameterCanvas, drawParameter);

  function pointerToParameters(event) {
    const rect = parameterCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const unitScale = Math.min(rect.width * 0.44, rect.height * 0.42);
    const a = ((x - rect.width / 2) / unitScale) * extent;
    const b = -((y - rect.height / 2) / unitScale) * extent;
    return {
      a: Math.max(-extent, Math.min(extent, a)),
      b: Math.max(-extent, Math.min(extent, b))
    };
  }

  function updateInitialization(event) {
    const point = pointerToParameters(event);
    resetSimulation(point.a, point.b);
  }

  parameterCanvas.addEventListener("pointerdown", (event) => {
    state.dragging = true;
    parameterCanvas.setPointerCapture(event.pointerId);
    updateInitialization(event);
  });
  parameterCanvas.addEventListener("pointermove", (event) => {
    if (state.dragging) updateInitialization(event);
  });
  parameterCanvas.addEventListener("pointerup", (event) => {
    state.dragging = false;
    parameterCanvas.releasePointerCapture(event.pointerId);
  });
  parameterCanvas.addEventListener("pointercancel", () => {
    state.dragging = false;
  });

  let lastTimestamp = performance.now();
  function animateParameter(timestamp) {
    if (!state.running || !state.visible) return;
    const frameSeconds = Math.min(0.05, Math.max(0, (timestamp - lastTimestamp) / 1000));
    lastTimestamp = timestamp;

    if (!state.dragging && loss() > 1e-10) {
      if (state.mode === "flow") {
        const substeps = 5;
        const dt = (frameSeconds * 0.72) / substeps;
        for (let index = 0; index < substeps; index += 1) {
          const next = rk4(state.a, state.b, dt);
          state.a = next.a;
          state.b = next.b;
          state.elapsed += dt;
        }
      } else {
        state.accumulator += frameSeconds;
        while (state.accumulator >= 0.075) {
          const vector = velocity(state.a, state.b);
          state.a += state.step * vector.a;
          state.b += state.step * vector.b;
          state.iterations += 1;
          state.accumulator -= 0.075;
        }
      }

      if (Math.abs(state.a) > 5 || Math.abs(state.b) > 5 || !Number.isFinite(state.a + state.b)) {
        state.running = false;
      } else {
        const last = state.trail[state.trail.length - 1];
        if (!last || Math.hypot(last.a - state.a, last.b - state.b) > 0.012) {
          state.trail.push({ a: state.a, b: state.b });
          if (state.trail.length > 900) state.trail.shift();
        }
      }
    }

    updateReadout();
    drawParameter(timestamp);
    if (state.running) requestAnimationFrame(animateParameter);
  }

  const labObserver = new IntersectionObserver((entries) => {
    const wasVisible = state.visible;
    state.visible = entries[0].isIntersecting;
    if (state.visible && !wasVisible && state.running) {
      lastTimestamp = performance.now();
      requestAnimationFrame(animateParameter);
    }
  }, { threshold: 0.02 });
  labObserver.observe(parameterCanvas);

  controls.targetOutput.value = state.target.toFixed(2);
  controls.stepOutput.value = state.step.toFixed(3);
  setMode(state.mode);
  if (state.running) requestAnimationFrame(animateParameter);

  const architectureCanvas = document.getElementById("architecture-canvas");
  if (architectureCanvas) {
    const architectureTabs = Array.from(document.querySelectorAll("[data-architecture]"));
    const architecturePlay = document.getElementById("atlas-play-button");
    const architecturePanel = document.getElementById("architecture-panel");
    const architectureCopy = {
      kicker: document.getElementById("architecture-kicker"),
      title: document.getElementById("architecture-title"),
      summary: document.getElementById("architecture-summary"),
      formula: document.getElementById("architecture-formula"),
      meaning: document.getElementById("architecture-meaning")
    };
    const architectureData = {
      gelu: {
        kicker: "no universal rail",
        title: "GELU and SiLU leave only constant laws",
        summary: "Across every dataset and initialization, the available update directions rule out a nonconstant global C¹ conservation law for the studied feedforward block.",
        formula: "h ≡ c on Θ",
        meaning: "This is for one-hidden-layer, bias-free GELU or SiLU networks in the paper’s universal setting. It does not rule out incidental quantities that stay fixed along one particular run.",
        label: "Schematic of update directions spanning the local parameter plane."
      },
      swiglu: {
        kicker: "multiplicative balance",
        title: "SwiGLU keeps each A/C balance",
        summary: "For every hidden unit, the output-side column and gate-side row can change substantially while their difference of squared norms stays fixed.",
        formula: "‖A<sub>:,i</sub>‖² − ‖C<sub>i,:</sub>‖² = constant",
        meaning: "The moving point is a signed scalar cross-section of that balance. B can move during training; the characterization says a nonconstant conservation law cannot depend on B.",
        label: "Animated scalar cross-section of a SwiGLU A/C norm balance."
      },
      mha: {
        kicker: "matrix-valued balances",
        title: "Attention preserves full Gram differences",
        summary: "Within each head, the query/key pair and value/output pair move while two symmetric matrix differences remain fixed.",
        formula: "Q<sub>i</sub>ᵀQ<sub>i</sub> − K<sub>i</sub>ᵀK<sub>i</sub> = constant<br />V<sub>i</sub>ᵀV<sub>i</sub> − O<sub>i</sub>ᵀO<sub>i</sub> = constant",
        meaning: "Each moving rail is only a scalar slice. The full result preserves every diagonal and off-diagonal entry of the two Gram-matrix differences. Fixed sinusoidal positional encodings keep this structure.",
        label: "Two animated scalar slices of the matrix-valued attention balances."
      },
      rope: {
        kicker: "rotation changes the rail",
        title: "RoPE splits Q/K balance by frequency block",
        summary: "Rotary position embeddings replace the full query/key Gram difference with one Frobenius-energy balance for each two-dimensional frequency block.",
        formula: "‖Q<sub>i</sub><sup>(j)</sup>‖<sub>F</sub>² − ‖K<sub>i</sub><sup>(j)</sup>‖<sub>F</sub>² = constant<br />V<sub>i</sub>ᵀV<sub>i</sub> − O<sub>i</sub>ᵀO<sub>i</sub> = constant",
        meaning: "The wheels show three Q/K rotary blocks whose energies change but remain balanced. The V/O Gram difference is unchanged from vanilla attention.",
        label: "Animated query and key vectors in three RoPE frequency blocks."
      },
      moe: {
        kicker: "experts plus router",
        title: "MoE adds a fixed router center of mass",
        summary: "Every SwiGLU expert keeps its internal A/C balances. Softmax routing adds a separate constraint: the sum of router rows cannot move.",
        formula: "‖A<sub>r,:,i</sub>‖² − ‖C<sub>r,i,:</sub>‖² = constant<br />Σ<sub>r</sub> W<sub>r</sub> = constant",
        meaning: "The triangle’s vertices are router rows; they move while their marked centroid stays fixed. The paper’s stated sparse result uses renormalized Top-k softmax gating with k > 1.",
        label: "Animated softmax-router rows with a fixed centroid and expert balance meters."
      }
    };
    const atlasState = {
      selected: "swiglu",
      running: !prefersReducedMotion,
      visible: true,
      frame: null
    };
    let architectureSurface;

    function atlasBackground(context, width, height) {
      context.clearRect(0, 0, width, height);
      context.fillStyle = palette.panel;
      context.fillRect(0, 0, width, height);
      context.save();
      context.strokeStyle = palette.faint;
      context.lineWidth = 1;
      for (let y = 0; y <= height; y += 52) {
        context.beginPath();
        context.moveTo(0, y + 0.5);
        context.lineTo(width, y + 0.5);
        context.stroke();
      }
      context.restore();
    }

    function atlasText(context, textValue, x, y, options = {}) {
      context.save();
      context.fillStyle = options.color || palette.muted;
      context.font = `${options.weight || 400} ${options.size || 12}px 'Source Serif 4', Georgia, serif`;
      context.textAlign = options.align || "left";
      context.textBaseline = options.baseline || "alphabetic";
      context.fillText(textValue, x, y);
      context.restore();
    }

    function drawScalarBalance(context, region, timestamp, options) {
      const { x, y, width, height } = region;
      const centerX = x + width * 0.5;
      const centerY = y + height * 0.54;
      const scale = Math.min(width * 0.145, height * 0.19);
      const constant = options.constant || 1.45;
      const root = Math.sqrt(constant);

      context.save();
      context.strokeStyle = palette.rule;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(x + 12, centerY);
      context.lineTo(x + width - 12, centerY);
      context.moveTo(centerX, y + 28);
      context.lineTo(centerX, y + height - 20);
      context.stroke();

      [-1, 1].forEach((side) => {
        context.beginPath();
        for (let index = 0; index <= 100; index += 1) {
          const u = -1.35 + (2.7 * index) / 100;
          const first = side * root * Math.cosh(u);
          const second = root * Math.sinh(u);
          const px = centerX + first * scale;
          const py = centerY - second * scale;
          if (index === 0) context.moveTo(px, py);
          else context.lineTo(px, py);
        }
        context.strokeStyle = options.railColor || palette.accent;
        context.lineWidth = 2;
        context.stroke();
      });

      const phase = Math.sin(timestamp * 0.00062 + (options.phase || 0)) * 1.05;
      const first = root * Math.cosh(phase);
      const second = root * Math.sinh(phase);
      const pointX = centerX + first * scale;
      const pointY = centerY - second * scale;
      context.fillStyle = options.pointColor || palette.blue;
      context.shadowColor = options.pointColor || palette.blue;
      context.shadowBlur = 11;
      context.beginPath();
      context.arc(pointX, pointY, options.pointRadius || 5, 0, Math.PI * 2);
      context.fill();
      context.restore();

      atlasText(context, options.title, x + 14, y + 21, { color: palette.ink, weight: 600, size: 13 });
      atlasText(context, options.xLabel, x + width - 16, centerY - 8, { align: "right" });
      atlasText(context, options.yLabel, centerX + 8, y + 39);
      atlasText(context, options.caption || "difference of squares stays fixed", x + 14, y + height - 8, { size: 11 });
    }

    function drawGelu(context, width, height, timestamp) {
      const centerX = width * 0.5;
      const centerY = height * 0.49;
      const radius = Math.min(width, height) * 0.19;
      const wobble = prefersReducedMotion ? 0 : timestamp * 0.00022;

      context.save();
      context.setLineDash([5, 6]);
      context.strokeStyle = palette.accentSoft;
      context.lineWidth = 2;
      context.beginPath();
      context.ellipse(centerX, centerY, radius * 1.5, radius * 0.82, 0.18, 0, Math.PI * 2);
      context.stroke();
      context.restore();

      for (let index = 0; index < 8; index += 1) {
        const angle = (index / 8) * Math.PI * 2 + wobble * (index % 2 ? -1 : 1);
        const length = radius * (0.72 + 0.18 * Math.sin(timestamp * 0.001 + index));
        const endX = centerX + Math.cos(angle) * length;
        const endY = centerY + Math.sin(angle) * length;
        const head = 7;
        context.save();
        context.strokeStyle = index % 2 ? palette.blue : palette.green;
        context.fillStyle = context.strokeStyle;
        context.globalAlpha = 0.78;
        context.lineWidth = 1.6;
        context.beginPath();
        context.moveTo(centerX, centerY);
        context.lineTo(endX, endY);
        context.stroke();
        context.translate(endX, endY);
        context.rotate(angle);
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(-head, -3.5);
        context.lineTo(-head, 3.5);
        context.closePath();
        context.fill();
        context.restore();
      }

      context.fillStyle = palette.ink;
      context.beginPath();
      context.arc(centerX, centerY, 5.5, 0, Math.PI * 2);
      context.fill();
      atlasText(context, "candidate level curve", centerX + radius * 0.88, centerY - radius * 0.72, { color: palette.accent, size: 11 });
      atlasText(context, "update directions across all datasets", centerX, height - 54, { align: "center", color: palette.ink, size: 13, weight: 600 });
      atlasText(context, "a universal ∇h must be perpendicular to all of them—so ∇h = 0", centerX, height - 32, { align: "center", size: 11 });
    }

    function drawSwiGlu(context, width, height, timestamp) {
      drawScalarBalance(context, { x: width * 0.08, y: height * 0.08, width: width * 0.84, height: height * 0.8 }, timestamp, {
        title: "one hidden-unit cross-section",
        xLabel: "aᵢ signed slice",
        yLabel: "cᵢ signed slice",
        caption: "the point moves; aᵢ² − cᵢ² does not",
        constant: 1.6,
        pointColor: palette.blue
      });
    }

    function drawMha(context, width, height, timestamp) {
      const stacked = width < 520;
      const regions = stacked
        ? [
          { x: width * 0.07, y: height * 0.04, width: width * 0.86, height: height * 0.43 },
          { x: width * 0.07, y: height * 0.51, width: width * 0.86, height: height * 0.43 }
        ]
        : [
          { x: width * 0.03, y: height * 0.08, width: width * 0.46, height: height * 0.82 },
          { x: width * 0.51, y: height * 0.08, width: width * 0.46, height: height * 0.82 }
        ];
      drawScalarBalance(context, regions[0], timestamp, {
        title: "query / key slice",
        xLabel: "q",
        yLabel: "k",
        caption: "a scalar view of QᵀQ − KᵀK",
        constant: 1.25,
        phase: 0.2,
        pointColor: palette.blue
      });
      drawScalarBalance(context, regions[1], timestamp, {
        title: "value / output slice",
        xLabel: "v",
        yLabel: "o",
        caption: "a scalar view of VᵀV − OᵀO",
        constant: 0.85,
        phase: 1.7,
        railColor: palette.green,
        pointColor: palette.accent
      });
    }

    function drawRope(context, width, height, timestamp) {
      const wheelY = height * 0.47;
      const wheelRadius = Math.min(width / 9.5, height * 0.18, 62);
      for (let index = 0; index < 3; index += 1) {
        const centerX = width * (0.2 + index * 0.3);
        const phase = timestamp * 0.00052 + index * 1.45;
        const keyNorm = 0.58 + 0.1 * Math.sin(timestamp * 0.001 + index);
        const difference = 0.38 + index * 0.09;
        const queryNorm = Math.sqrt(keyNorm * keyNorm + difference);
        const queryLength = queryNorm * wheelRadius;
        const keyLength = keyNorm * wheelRadius;

        context.save();
        context.strokeStyle = palette.rule;
        context.lineWidth = 1;
        context.beginPath();
        context.arc(centerX, wheelY, wheelRadius, 0, Math.PI * 2);
        context.stroke();
        context.setLineDash([3, 4]);
        context.beginPath();
        context.arc(centerX, wheelY, wheelRadius * 0.55, 0, Math.PI * 2);
        context.stroke();
        context.restore();

        const vectors = [
          { angle: phase, length: queryLength, color: palette.blue, label: "Q" },
          { angle: phase + 1.15, length: keyLength, color: palette.accent, label: "K" }
        ];
        vectors.forEach((vector) => {
          const endX = centerX + Math.cos(vector.angle) * vector.length;
          const endY = wheelY + Math.sin(vector.angle) * vector.length;
          context.save();
          context.strokeStyle = vector.color;
          context.fillStyle = vector.color;
          context.lineWidth = 2.2;
          context.beginPath();
          context.moveTo(centerX, wheelY);
          context.lineTo(endX, endY);
          context.stroke();
          context.beginPath();
          context.arc(endX, endY, 3.6, 0, Math.PI * 2);
          context.fill();
          context.restore();
          atlasText(context, vector.label, endX + 6, endY - 4, { color: vector.color, weight: 600, size: 11 });
        });
        atlasText(context, `Q/K block ${index + 1}`, centerX, wheelY - wheelRadius - 18, { align: "center", color: palette.ink, weight: 600, size: 12 });
        atlasText(context, `Δ${index + 1} = ${difference.toFixed(2)}`, centerX, wheelY + wheelRadius + 24, { align: "center", color: palette.accent, size: 11 });
      }
      atlasText(context, "each Δj = ‖Q(j)‖F² − ‖K(j)‖F² stays fixed", width * 0.5, height - 48, { align: "center", color: palette.ink, weight: 600, size: 13 });
      atlasText(context, "V/O keeps the vanilla attention Gram balance", width * 0.5, height - 27, { align: "center", size: 11 });
    }

    function drawMoe(context, width, height, timestamp) {
      const centerX = width * 0.5;
      const centerY = height * 0.38;
      const scale = Math.min(width, height) * 0.19;
      const t = timestamp * 0.00072;
      const base = [
        { x: -0.95, y: -0.35 },
        { x: 0.78, y: -0.48 },
        { x: 0.17, y: 0.83 }
      ];
      const deltaA = { x: 0.28 * Math.sin(t), y: 0.2 * Math.cos(t * 1.3) };
      const deltaB = { x: 0.22 * Math.cos(t * 0.9 + 0.5), y: 0.24 * Math.sin(t * 1.1) };
      const deltas = [deltaA, deltaB, { x: -deltaA.x - deltaB.x, y: -deltaA.y - deltaB.y }];
      const points = base.map((point, index) => ({
        x: centerX + (point.x + deltas[index].x) * scale,
        y: centerY - (point.y + deltas[index].y) * scale
      }));
      const centroid = {
        x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
        y: points.reduce((sum, point) => sum + point.y, 0) / points.length
      };

      context.save();
      context.strokeStyle = palette.rule;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(width * 0.12, centerY);
      context.lineTo(width * 0.88, centerY);
      context.moveTo(centerX, height * 0.09);
      context.lineTo(centerX, height * 0.67);
      context.stroke();
      context.strokeStyle = palette.blue;
      context.lineWidth = 2;
      context.beginPath();
      points.forEach((point, index) => {
        if (index === 0) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
      });
      context.closePath();
      context.stroke();
      points.forEach((point, index) => {
        context.fillStyle = [palette.blue, palette.green, palette.accent][index];
        context.beginPath();
        context.arc(point.x, point.y, 5.2, 0, Math.PI * 2);
        context.fill();
        atlasText(context, `W${index + 1}`, point.x + 8, point.y - 7, { color: context.fillStyle, weight: 600, size: 11 });
      });
      context.strokeStyle = palette.accent;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(centroid.x - 7, centroid.y);
      context.lineTo(centroid.x + 7, centroid.y);
      context.moveTo(centroid.x, centroid.y - 7);
      context.lineTo(centroid.x, centroid.y + 7);
      context.stroke();
      context.restore();

      atlasText(context, "router rows move", width * 0.14, 29, { color: palette.ink, weight: 600, size: 13 });
      atlasText(context, "fixed centroid", centroid.x + 10, centroid.y + 17, { color: palette.accent, size: 11 });

      const meterY = height * 0.79;
      const meterWidth = Math.min(48, width * 0.065);
      for (let index = 0; index < 3; index += 1) {
        const groupX = width * (0.25 + index * 0.25);
        const cNorm = 0.62 + 0.13 * Math.sin(t * 1.3 + index * 1.2);
        const aNorm = Math.sqrt(cNorm * cNorm + 0.45 + index * 0.08);
        context.fillStyle = palette.blueSoft;
        context.fillRect(groupX - meterWidth - 3, meterY - aNorm * 52, meterWidth, aNorm * 52);
        context.fillStyle = palette.accentSoft;
        context.fillRect(groupX + 3, meterY - cNorm * 52, meterWidth, cNorm * 52);
        atlasText(context, `expert ${index + 1}`, groupX, meterY + 18, { align: "center", size: 10 });
      }
      atlasText(context, "A", width * 0.08, meterY - 28, { color: palette.blue, weight: 600, size: 11 });
      atlasText(context, "C", width * 0.08, meterY - 11, { color: palette.accent, weight: 600, size: 11 });
      atlasText(context, "expert A/C norm balances", width * 0.5, height - 18, { align: "center", color: palette.ink, weight: 600, size: 12 });
    }

    function drawArchitecture(timestamp = performance.now()) {
      if (!architectureSurface) return;
      const { context, size } = architectureSurface;
      const { width, height } = size;
      atlasBackground(context, width, height);
      if (atlasState.selected === "gelu") drawGelu(context, width, height, timestamp);
      if (atlasState.selected === "swiglu") drawSwiGlu(context, width, height, timestamp);
      if (atlasState.selected === "mha") drawMha(context, width, height, timestamp);
      if (atlasState.selected === "rope") drawRope(context, width, height, timestamp);
      if (atlasState.selected === "moe") drawMoe(context, width, height, timestamp);
    }

    function scheduleArchitecture() {
      if (!atlasState.running || !atlasState.visible || atlasState.frame !== null) return;
      atlasState.frame = requestAnimationFrame((timestamp) => {
        atlasState.frame = null;
        drawArchitecture(timestamp);
        scheduleArchitecture();
      });
    }

    function updateArchitecturePlay() {
      architecturePlay.textContent = atlasState.running ? "pause animation" : "play animation";
      architecturePlay.setAttribute("aria-pressed", String(atlasState.running));
    }

    function selectArchitecture(name, focusTab = false) {
      if (!architectureData[name]) return;
      atlasState.selected = name;
      const data = architectureData[name];
      architectureCopy.kicker.textContent = data.kicker;
      architectureCopy.title.textContent = data.title;
      architectureCopy.summary.textContent = data.summary;
      architectureCopy.formula.innerHTML = data.formula;
      architectureCopy.meaning.textContent = data.meaning;
      architectureCanvas.setAttribute("aria-label", data.label);
      architectureTabs.forEach((tab) => {
        const active = tab.dataset.architecture === name;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
        if (active) {
          architecturePanel.setAttribute("aria-labelledby", tab.id);
          if (focusTab) tab.focus();
        }
      });
      drawArchitecture();
      scheduleArchitecture();
    }

    architectureTabs.forEach((tab, index) => {
      tab.addEventListener("click", () => selectArchitecture(tab.dataset.architecture));
      tab.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        let nextIndex = index;
        if (event.key === "ArrowLeft") nextIndex = (index - 1 + architectureTabs.length) % architectureTabs.length;
        if (event.key === "ArrowRight") nextIndex = (index + 1) % architectureTabs.length;
        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = architectureTabs.length - 1;
        selectArchitecture(architectureTabs[nextIndex].dataset.architecture, true);
      });
    });
    architecturePlay.addEventListener("click", () => {
      atlasState.running = !atlasState.running;
      updateArchitecturePlay();
      drawArchitecture();
      scheduleArchitecture();
    });

    architectureSurface = setupCanvas(architectureCanvas, drawArchitecture);
    const architectureObserver = new IntersectionObserver((entries) => {
      atlasState.visible = entries[0].isIntersecting;
      if (atlasState.visible) scheduleArchitecture();
    }, { threshold: 0.02 });
    architectureObserver.observe(architectureCanvas);
    updateArchitecturePlay();
    selectArchitecture("swiglu");
  }

  const proofFlow = document.getElementById("proof-flow");
  if (proofFlow) {
    const proofSteps = Array.from(proofFlow.querySelectorAll("[data-proof-step]"));
    let proofIndex = 0;
    let proofTimer = null;
    let proofVisible = false;

    function showProofStep(index) {
      proofIndex = index;
      proofSteps.forEach((step, stepIndex) => step.classList.toggle("is-active", stepIndex === index));
    }

    function stopProof() {
      if (proofTimer !== null) window.clearInterval(proofTimer);
      proofTimer = null;
    }

    function startProof() {
      if (prefersReducedMotion || !proofVisible || proofTimer !== null) return;
      proofTimer = window.setInterval(() => showProofStep((proofIndex + 1) % proofSteps.length), 1750);
    }

    if (prefersReducedMotion) {
      proofSteps.forEach((step) => step.classList.add("is-active"));
    } else {
      const proofObserver = new IntersectionObserver((entries) => {
        proofVisible = entries[0].isIntersecting;
        if (proofVisible) startProof();
        else stopProof();
      }, { threshold: 0.25 });
      proofObserver.observe(proofFlow);
    }
  }

  const errorCanvas = document.getElementById("error-canvas");
  if (errorCanvas) {
    const errorControls = {
      scheduleButtons: Array.from(document.querySelectorAll("[data-schedule]")),
      step: document.getElementById("error-step-slider"),
      stepOutput: document.getElementById("error-step-output"),
      replay: document.getElementById("replay-error-button"),
      iteration: document.getElementById("error-iteration"),
      drift: document.getElementById("error-drift"),
      driver: document.getElementById("error-driver")
    };
    const errorState = {
      schedule: "constant",
      step: 0.05,
      series: [],
      cursor: 0,
      running: !prefersReducedMotion,
      visible: true,
      lastTimestamp: performance.now(),
      frame: null
    };
    let errorSurface;

    function computeErrorSeries() {
      let a = 2.2;
      let b = 0.7;
      const target = 1.2;
      const initial = a * a - b * b;
      let sumSquares = 0;
      const series = [{ iteration: 0, drift: 0, driver: 0 }];
      for (let iteration = 1; iteration <= 240; iteration += 1) {
        const tau = errorState.schedule === "constant" ? errorState.step : errorState.step / iteration;
        const error = a * b - target;
        const nextA = a - tau * error * b;
        const nextB = b - tau * error * a;
        a = nextA;
        b = nextB;
        sumSquares += tau * tau;
        const current = a * a - b * b;
        const drift = Math.abs(current - initial);
        if (!Number.isFinite(drift)) break;
        series.push({ iteration, drift, driver: sumSquares });
      }
      errorState.series = series;
    }

    function formatScientific(value) {
      if (value === 0) return "0";
      if (value >= 0.01) return value.toFixed(4);
      const superscript = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
      return value.toExponential(2).replace(/e([+-]?)(\d+)/, (_, sign, exponent) => {
        const raised = exponent.split("").map((digit) => superscript[digit]).join("");
        return `×10${sign === "-" ? "⁻" : ""}${raised}`;
      });
    }

    function chartText(context, textValue, x, y, options = {}) {
      context.save();
      context.fillStyle = options.color || palette.muted;
      context.font = `${options.weight || 400} ${options.size || 12}px 'Source Serif 4', Georgia, serif`;
      context.textAlign = options.align || "left";
      context.fillText(textValue, x, y);
      context.restore();
    }

    function updateErrorReadout() {
      const index = Math.min(errorState.series.length - 1, Math.max(0, Math.floor(errorState.cursor)));
      const point = errorState.series[index] || { iteration: 0, drift: 0, driver: 0 };
      errorControls.iteration.textContent = String(point.iteration);
      errorControls.drift.textContent = formatScientific(point.drift);
      errorControls.driver.textContent = point.driver.toFixed(5);
    }

    function drawError() {
      if (!errorSurface || errorState.series.length === 0) return;
      const { context, size } = errorSurface;
      const { width, height } = size;
      const margin = {
        left: Math.min(67, width * 0.16),
        right: 24,
        top: 48,
        bottom: 47
      };
      const chartWidth = Math.max(10, width - margin.left - margin.right);
      const chartHeight = Math.max(10, height - margin.top - margin.bottom);
      const finalIndex = errorState.series.length - 1;
      const visibleIndex = Math.min(finalIndex, Math.max(0, Math.floor(errorState.cursor)));
      const maximumDrift = Math.max(1e-7, ...errorState.series.map((point) => point.drift)) * 1.12;
      const xFor = (iteration) => margin.left + (iteration / Math.max(1, finalIndex)) * chartWidth;
      const yFor = (drift) => margin.top + chartHeight - (drift / maximumDrift) * chartHeight;

      context.clearRect(0, 0, width, height);
      context.fillStyle = palette.panel;
      context.fillRect(0, 0, width, height);
      context.save();
      context.strokeStyle = palette.faint;
      context.fillStyle = palette.muted;
      context.lineWidth = 1;
      context.font = "11px 'Source Serif 4', Georgia, serif";
      context.textAlign = "right";
      for (let index = 0; index <= 4; index += 1) {
        const ratio = index / 4;
        const y = margin.top + chartHeight - ratio * chartHeight;
        context.beginPath();
        context.moveTo(margin.left, y);
        context.lineTo(width - margin.right, y);
        context.stroke();
        context.fillText(formatScientific(maximumDrift * ratio), margin.left - 8, y + 4);
      }
      context.textAlign = "center";
      for (let iteration = 0; iteration <= 240; iteration += 60) {
        const x = xFor(iteration);
        context.fillText(String(iteration), x, height - margin.bottom + 20);
      }
      context.restore();

      context.save();
      context.strokeStyle = palette.rule;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(margin.left, margin.top);
      context.lineTo(margin.left, height - margin.bottom);
      context.lineTo(width - margin.right, height - margin.bottom);
      context.stroke();
      context.restore();

      if (visibleIndex > 0) {
        context.save();
        context.strokeStyle = errorState.schedule === "constant" ? palette.accent : palette.blue;
        context.lineWidth = 2.4;
        context.beginPath();
        for (let index = 0; index <= visibleIndex; index += 1) {
          const point = errorState.series[index];
          const x = xFor(point.iteration);
          const y = yFor(point.drift);
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.stroke();
        const current = errorState.series[visibleIndex];
        context.fillStyle = context.strokeStyle;
        context.beginPath();
        context.arc(xFor(current.iteration), yFor(current.drift), 4.5, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }

      chartText(context, "absolute conservation drift", margin.left, 23, { color: palette.ink, weight: 600, size: 13 });
      chartText(context, errorState.schedule === "constant" ? "constant τ" : "τ₀/(k+1)", width - margin.right, 23, { align: "right", color: errorState.schedule === "constant" ? palette.accent : palette.blue, size: 12 });
      chartText(context, "gradient-descent iteration", margin.left + chartWidth * 0.5, height - 9, { align: "center", size: 11 });
      updateErrorReadout();
    }

    function scheduleErrorAnimation() {
      if (!errorState.running || !errorState.visible || errorState.frame !== null) return;
      errorState.frame = requestAnimationFrame((timestamp) => {
        errorState.frame = null;
        const elapsed = Math.min(0.08, Math.max(0, (timestamp - errorState.lastTimestamp) / 1000));
        errorState.lastTimestamp = timestamp;
        errorState.cursor += elapsed * 74;
        if (errorState.cursor >= errorState.series.length - 1) {
          errorState.cursor = errorState.series.length - 1;
          errorState.running = false;
        }
        drawError();
        scheduleErrorAnimation();
      });
    }

    function replayError() {
      computeErrorSeries();
      errorState.cursor = prefersReducedMotion ? errorState.series.length - 1 : 0;
      errorState.running = !prefersReducedMotion;
      errorState.lastTimestamp = performance.now();
      drawError();
      scheduleErrorAnimation();
    }

    errorControls.scheduleButtons.forEach((button) => {
      button.addEventListener("click", () => {
        errorState.schedule = button.dataset.schedule;
        errorControls.scheduleButtons.forEach((scheduleButton) => {
          const active = scheduleButton === button;
          scheduleButton.classList.toggle("is-active", active);
          scheduleButton.setAttribute("aria-pressed", String(active));
        });
        replayError();
      });
    });
    errorControls.step.addEventListener("input", () => {
      errorState.step = Number(errorControls.step.value);
      errorControls.stepOutput.value = errorState.step.toFixed(3);
      replayError();
    });
    errorControls.replay.addEventListener("click", () => {
      computeErrorSeries();
      errorState.cursor = 0;
      errorState.running = true;
      errorState.lastTimestamp = performance.now();
      drawError();
      scheduleErrorAnimation();
    });

    computeErrorSeries();
    if (prefersReducedMotion) errorState.cursor = errorState.series.length - 1;
    errorSurface = setupCanvas(errorCanvas, drawError);
    const errorObserver = new IntersectionObserver((entries) => {
      errorState.visible = entries[0].isIntersecting;
      if (errorState.visible) {
        errorState.lastTimestamp = performance.now();
        scheduleErrorAnimation();
      }
    }, { threshold: 0.02 });
    errorObserver.observe(errorCanvas);
    errorControls.stepOutput.value = errorState.step.toFixed(3);
    drawError();
    scheduleErrorAnimation();
  }

  const revealSections = Array.from(document.querySelectorAll(".story-section"));
  if (!prefersReducedMotion && "IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -7% 0px", threshold: 0.05 });
    revealSections.forEach((section) => {
      section.classList.add("reveal-ready");
      if (section.getBoundingClientRect().top < window.innerHeight * 0.94) section.classList.add("is-revealed");
      else revealObserver.observe(section);
    });
  } else {
    revealSections.forEach((section) => section.classList.add("is-revealed"));
  }
})();
