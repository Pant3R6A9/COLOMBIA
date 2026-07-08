// ==========================================
// CORE JAVASCRIPT: COLOMBIA EN EL TIEMPO
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  initTimelineScrollAnimation();
  initDetailDrawer();
  initDictionarySearch();
  initAmbientAudioSynth();
});

/**
 * Revelado de elementos de la línea de tiempo mediante scroll
 */
function initTimelineScrollAnimation() {
  const items = document.querySelectorAll('.timeline-item');
  if (items.length === 0) return;

  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -100px 0px',
    threshold: 0.15
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  items.forEach(item => {
    item.style.opacity = '0';
    item.style.transform = 'translateY(30px)';
    item.style.transition = 'all 0.6s cubic-bezier(0.165, 0.84, 0.44, 1)';
    observer.observe(item);
  });

  const style = document.createElement('style');
  style.textContent = `
    .timeline-item.visible {
      opacity: 1 !important;
      transform: translateY(0) !important;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Cajones de detalle laterales (drawers)
 */
function initDetailDrawer() {
  let drawer = document.querySelector('.detail-drawer');
  if (!drawer) {
    drawer = document.createElement('div');
    drawer.className = 'detail-drawer';
    drawer.innerHTML = `
      <button class="drawer-close" aria-label="Cerrar panel">&times;</button>
      <div class="drawer-content"></div>
    `;
    document.body.appendChild(drawer);
  }

  const drawerContent = drawer.querySelector('.drawer-content');
  const closeBtn = drawer.querySelector('.drawer-close');

  const closeDrawer = () => {
    drawer.classList.remove('open');
    const fills = drawerContent.querySelectorAll('.chart-bar-fill');
    fills.forEach(fill => fill.style.width = '0');
  };

  closeBtn.addEventListener('click', closeDrawer);
  
  document.addEventListener('click', (e) => {
    if (drawer.classList.contains('open') && 
        !drawer.contains(e.target) && 
        !e.target.closest('.timeline-content')) {
      closeDrawer();
    }
  });

  const cards = document.querySelectorAll('.timeline-content[data-drawer]');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const templateId = card.getAttribute('data-drawer');
      const template = document.getElementById(templateId);

      if (template) {
        drawerContent.innerHTML = '';
        const clone = template.content.cloneNode(true);
        drawerContent.appendChild(clone);

        drawer.classList.add('open');

        setTimeout(() => {
          const fills = drawerContent.querySelectorAll('.chart-bar-fill');
          fills.forEach(fill => {
            const width = fill.getAttribute('data-width');
            fill.style.width = width + '%';
          });
        }, 150);
      }
    });
  });
}

/**
 * Filtrado de búsqueda en tiempo real para el diccionario Muysccubun
 */
function initDictionarySearch() {
  const searchInput = document.getElementById('diccionario-search');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const cards = document.querySelectorAll('.glossary-card');

    cards.forEach(card => {
      const word = card.querySelector('.glossary-word').textContent.toLowerCase();
      const meaning = card.querySelector('.glossary-meaning').textContent.toLowerCase();
      
      if (word.includes(query) || meaning.includes(query)) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });
  });
}

/**
 * Sintetizador de sonido ambiental procedural (Viento Andino y Río)
 * utilizando Web Audio API sin requerir dependencias ni descargas.
 */
function initAmbientAudioSynth() {
  // Crear botón flotante
  let btn = document.querySelector('.audio-toggle');
  if (!btn) {
    btn = document.createElement('button');
    btn.className = 'audio-toggle';
    btn.innerHTML = '🔊';
    btn.title = 'Activar sonido ambiente andino';
    document.body.appendChild(btn);
  }

  let audioCtx = null;
  let isPlaying = false;
  let windSource = null;
  let riverSource = null;
  let masterGain = null;

  // Generador de ruido rosa/blanco
  function createNoiseBuffer(ctx) {
    const bufferSize = ctx.sampleRate * 2; // 2 segundos de buffer
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0, b1, b2, b3, b4, b5, b6;
    b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Filtro para ruido rosa (pink noise)
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 * 0.5362;
      data[i] *= 0.11; // normalizar
      b6 = white * 0.115926;
    }
    return buffer;
  }

  function startSound() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 2); // fade-in de 2 seg
    masterGain.connect(audioCtx.destination);

    const noiseBuffer = createNoiseBuffer(audioCtx);

    // --- SINTETIZADOR DE VIENTO ---
    windSource = audioCtx.createBufferSource();
    windSource.buffer = noiseBuffer;
    windSource.loop = true;

    // Filtro pasa-banda dinámico para modular ráfagas de viento
    const windFilter = audioCtx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.Q.value = 4.0;
    windFilter.frequency.value = 400;

    // LFO (Oscilador de baja frecuencia) para modular el soplo
    const lfo = audioCtx.createOscillator();
    lfo.frequency.value = 0.12; // Modulación cada 8 segundos

    const lfoGain = audioCtx.createGain();
    lfoGain.gain.value = 250; // Amplitud del barrido del viento

    lfo.connect(lfoGain);
    lfoGain.connect(windFilter.frequency);
    windSource.connect(windFilter);
    windFilter.connect(masterGain);

    lfo.start();
    windSource.start();

    // --- SINTETIZADOR DE RÍO / CASCADA ---
    riverSource = audioCtx.createBufferSource();
    riverSource.buffer = noiseBuffer;
    riverSource.loop = true;

    const riverFilter = audioCtx.createBiquadFilter();
    riverFilter.type = 'lowpass';
    riverFilter.frequency.value = 220; // Sonido amortiguado de agua corriente

    riverSource.connect(riverFilter);
    riverFilter.connect(masterGain);
    riverSource.start();

    isPlaying = true;
    btn.innerHTML = '🔇';
    btn.title = 'Silenciar ambiente';
  }

  function stopSound() {
    if (!audioCtx) return;
    masterGain.gain.setValueAtTime(masterGain.gain.value, audioCtx.currentTime);
    masterGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1); // fade-out

    setTimeout(() => {
      if (windSource) windSource.stop();
      if (riverSource) riverSource.stop();
      audioCtx.close();
      isPlaying = false;
      btn.innerHTML = '🔊';
      btn.title = 'Activar sonido ambiente andino';
    }, 1000);
  }

  btn.addEventListener('click', () => {
    if (isPlaying) {
      stopSound();
    } else {
      startSound();
    }
  });
}
