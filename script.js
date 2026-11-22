document.addEventListener('DOMContentLoaded', () => {
  /* =========================================================
     1. ЗВУК ЩЕЛЧКА ВЫКЛЮЧАТЕЛЯ (WEB AUDIO API)
     ========================================================= */
  let audioCtx = null;

  function playSwitchClick(isTurningOn) {
    try {
      if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isTurningOn ? 1120 : 860, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.032);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.038);
    } catch (_) {}
  }

  /* =========================================================
     2. ФИЗИКА ПРУЖИНЯЩЕГО ШНУРКА ЛАМПЫ
     ========================================================= */
  const lampSvg = document.getElementById('lampSvg');
  const cordGroup = document.getElementById('cordGroup');
  const cordPath = document.getElementById('cordPath');
  const cordKnob = document.getElementById('cordKnob');
  const cordHitLine = document.getElementById('cordHitLine');
  const cordHitKnob = document.getElementById('cordHitKnob');

  let isLampOn = false;

  const ANCHOR = { x: 256, y: 214 };
  const REST_LENGTH = 121;
  const TRIGGER_PULL_DISTANCE = 42;

  let bob = {
    x: ANCHOR.x,
    y: ANCHOR.y + REST_LENGTH,
    vx: 0,
    vy: 0
  };

  let isDragging = false;
  let dragStartSvg = { x: 0, y: 0 };
  let hasTriggeredDuringDrag = false;
  let pointerMoved = false;

  function toggleLamp() {
    isLampOn = !isLampOn;
    document.body.classList.toggle('lamp-on', isLampOn);
    playSwitchClick(isLampOn);
  }

  function clientToSvg(clientX, clientY) {
    const pt = lampSvg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = lampSvg.getScreenCTM();
    if (!ctm) return { x: ANCHOR.x, y: ANCHOR.y + REST_LENGTH };
    const transformed = pt.matrixTransform(ctm.inverse());
    return { x: transformed.x, y: transformed.y };
  }

  cordGroup.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    isDragging = true;
    hasTriggeredDuringDrag = false;
    pointerMoved = false;
    dragStartSvg = clientToSvg(e.clientX, e.clientY);
    cordGroup.setPointerCapture(e.pointerId);
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDragging) return;

    const pos = clientToSvg(e.clientX, e.clientY);
    if (Math.hypot(pos.x - dragStartSvg.x, pos.y - dragStartSvg.y) > 4) {
      pointerMoved = true;
    }

    const dx = Math.max(-95, Math.min(95, pos.x - ANCHOR.x));
    const dy = Math.max(45, Math.min(205, pos.y - ANCHOR.y));

    bob.x = ANCHOR.x + dx;
    bob.y = ANCHOR.y + dy;
    bob.vx = 0;
    bob.vy = 0;

    if (dy - REST_LENGTH >= TRIGGER_PULL_DISTANCE && !hasTriggeredDuringDrag) {
      hasTriggeredDuringDrag = true;
      toggleLamp();
    }
  });

  window.addEventListener('pointerup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    try {
      cordGroup.releasePointerCapture(e.pointerId);
    } catch (_) {}

    if (!pointerMoved && !hasTriggeredDuringDrag) {
      toggleLamp();
      bob.vy = 9.5;
      bob.vx = (Math.random() > 0.5 ? 1 : -1) * 3.5;
    }
  });

  function updateCordPhysics() {
    if (!isDragging) {
      const targetX = ANCHOR.x;
      const targetY = ANCHOR.y + REST_LENGTH;

      const ax = (targetX - bob.x) * 0.045;
      const ay = (targetY - bob.y) * 0.14;

      bob.vx = (bob.vx + ax) * 0.92;
      bob.vy = (bob.vy + ay) * 0.84;

      bob.x += bob.vx;
      bob.y += bob.vy;
    }

    const midX = (ANCHOR.x + bob.x) / 2 + (bob.x - ANCHOR.x) * 0.15;
    const midY = (ANCHOR.y + bob.y) / 2;

    cordPath.setAttribute(
      'd',
      `M ${ANCHOR.x} ${ANCHOR.y} Q ${midX.toFixed(1)} ${midY.toFixed(1)} ${bob.x.toFixed(1)} ${bob.y.toFixed(1)}`
    );

    const angleDeg = (Math.atan2(bob.x - ANCHOR.x, bob.y - ANCHOR.y) * -180) / Math.PI;
    cordKnob.setAttribute(
      'transform',
      `translate(${bob.x.toFixed(1)}, ${bob.y.toFixed(1)}) rotate(${angleDeg.toFixed(1)})`
    );

    cordHitLine.setAttribute('x2', bob.x.toFixed(1));
    cordHitLine.setAttribute('y2', bob.y.toFixed(1));
    cordHitKnob.setAttribute('cx', bob.x.toFixed(1));
    cordHitKnob.setAttribute('cy', bob.y.toFixed(1));

    requestAnimationFrame(updateCordPhysics);
  }

  requestAnimationFrame(updateCordPhysics);

  /* =========================================================
     3. ТЁПЛЫЕ ОГОНЬКИ В ВОЗДУХЕ + КОНФЕТТИ ПРИ ОДОБРЕНИИ
     ========================================================= */
  const canvas = document.getElementById('particlesCanvas');
  const ctx = canvas.getContext('2d');
  let dustParticles = [];
  let confetti = [];

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  dustParticles = Array.from({ length: 42 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 2 + 0.7,
    vx: (Math.random() - 0.5) * 0.3,
    vy: -Math.random() * 0.4 - 0.1,
    alpha: Math.random() * 0.55 + 0.2,
    phase: Math.random() * Math.PI * 2
  }));

  function launchCelebration() {
    const colors = ['#ffd479', '#ff7eb3', '#7afcff', '#feff9c', '#ff9a76'];
    for (let i = 0; i < 95; i++) {
      confetti.push({
        x: canvas.width * 0.5 + (Math.random() - 0.5) * 200,
        y: canvas.height * 0.55,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 11 - 4,
        size: Math.random() * 7 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 12,
        life: 1
      });
    }
  }

  function animateCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Пылинки в свете лампы
    if (isLampOn) {
      for (const p of dustParticles) {
        p.x += p.vx;
        p.y += p.vy;
        p.phase += 0.015;

        if (p.y < -10) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
        }
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;

        const a = p.alpha * (0.6 + 0.4 * Math.sin(p.phase));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 130, ${a.toFixed(3)})`;
        ctx.fill();
      }
    }

    // Конфетти при одобрении
    for (let i = confetti.length - 1; i >= 0; i--) {
      const c = confetti[i];
      c.x += c.vx;
      c.y += c.vy;
      c.vy += 0.28;
      c.vx *= 0.99;
      c.rotation += c.vRot;
      c.life -= 0.008;

      if (c.life <= 0 || c.y > canvas.height + 20) {
        confetti.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate((c.rotation * Math.PI) / 180);
      ctx.globalAlpha = Math.max(0, c.life);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6);
      ctx.restore();
    }

    requestAnimationFrame(animateCanvas);
  }

  requestAnimationFrame(animateCanvas);

  /* =========================================================
     4. ИНТЕРАКТИВ ПИСЬМА (ВЫБОР ВАРИАНТА И КНОПКИ)
     ========================================================= */
  let selectedChoice = 'Починить мой vivo Y100 после падения';
  const pills = document.querySelectorAll('.option-pill');
  const responseBanner = document.getElementById('responseBanner');
  const approveBtn = document.getElementById('approveBtn');
  const thinkBtn = document.getElementById('thinkBtn');

  pills.forEach((pill) => {
    pill.addEventListener('click', () => {
      pills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      selectedChoice = pill.dataset.choice;
    });
  });

  const gentleArguments = [
    'На временном Galaxy A51 реально тяжело: и пользоваться неудобно, и динамик не пашет 🙏',
    'vivo Y100 сам по себе классный — обидно, что просто неудачно упал на асфальт',
    'Обещаю: уроки, учебники и уборка без напоминаний — слово даю 🤝',
    'Ну пожааалуйста, мам, я даже целый сайт для этого сверстал 😊'
  ];
  let thinkClicks = 0;

  thinkBtn.addEventListener('click', () => {
    const phrase = gentleArguments[thinkClicks % gentleArguments.length];
    thinkClicks++;
    responseBanner.textContent = phrase;
    responseBanner.className = 'response-banner show';
  });

  approveBtn.addEventListener('click', () => {
    launchCelebration();
    responseBanner.innerHTML = `Ура! Выбрано: <strong>«${selectedChoice}»</strong>.<br>Мам, сделай скриншот этого экрана и отправь мне ❤️`;
    responseBanner.className = 'response-banner show approved';
    approveBtn.innerHTML = '<span>Заявка одобрена! 🎉</span>';
  });
});