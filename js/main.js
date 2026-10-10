// Inmediata ejecución para evitar parpadeo (FOUC) del modo lectura
(function initImmediateReadingMode() {
  try {
    const savedMode = localStorage.getItem('colombianopedia_reading_mode');
    if (savedMode === 'pergamino') {
      document.documentElement.setAttribute('data-reading-mode', 'pergamino');
    }
  } catch (e) {}
})();

document.addEventListener('DOMContentLoaded', () => {
  initReadingMode();
  initTimelineScrollAnimation();
  initDetailDrawer();
  initDictionarySearch();
  initAmbientAudioSynth();
  initUniversalSearch();
  initEfemeridesWidget();
  initPatrimonioCounters();
  initParallaxFallback();
  initMuseumCards3D();
  initHeroGoldenStardust();
  initServiceWorkerAndPWA();
});

/**
 * Registro de PWA (Service Worker, Manifest y Favicon)
 */
function initServiceWorkerAndPWA() {
  if (!document.querySelector('link[rel="manifest"]')) {
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = 'manifest.json';
    document.head.appendChild(link);
  }
  if (!document.querySelector('link[rel="icon"]')) {
    const favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.type = 'image/svg+xml';
    favicon.href = 'assets/images/icon-colombianopedia.svg';
    document.head.appendChild(favicon);
  }
  if (!document.querySelector('meta[name="theme-color"]')) {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = '#06080d';
    document.head.appendChild(meta);
  }

  if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker activo con scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registro omitido:', err);
        });
    });
  }
}

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
 * ==============================================================================
 * SINTETIZADOR DE PAISAJES SONOROS REGIONALES (WEB AUDIO API PROCEDURAL)
 * 4 Presets: Páramo Andino, Selva Amazónica, Océano Pacífico, Llanos Orientales
 * ==============================================================================
 */
function initAmbientAudioSynth() {
  let container = document.querySelector('.audio-capsule-widget');
  if (!container) {
    container = document.createElement('div');
    container.className = 'audio-capsule-widget';
    container.innerHTML = `
      <div class="audio-presets-popover" role="menu" aria-label="Seleccionar paisaje sonoro">
        <button type="button" class="audio-preset-btn active" data-preset="paramo">🏔️ Páramo Andino</button>
        <button type="button" class="audio-preset-btn" data-preset="amazonia">🌿 Selva Amazónica</button>
        <button type="button" class="audio-preset-btn" data-preset="pacifico">🌊 Océano Pacífico</button>
        <button type="button" class="audio-preset-btn" data-preset="llanos">🌾 Llanos Orientales</button>
      </div>
      <div class="audio-capsule-main" role="button" aria-expanded="false" aria-label="Control de audio ambiental">
        <button type="button" class="audio-capsule-btn-toggle" title="Activar/Silenciar sonido ambiente">🔊</button>
        <span class="audio-capsule-label">Páramo</span>
        <span class="audio-capsule-arrow" style="font-size: 0.65rem; color: var(--accent-gold); transition: transform 0.2s;">▲</span>
      </div>
    `;
    document.body.appendChild(container);
  }

  const capsuleMain = container.querySelector('.audio-capsule-main');
  const toggleBtn = container.querySelector('.audio-capsule-btn-toggle');
  const labelEl = container.querySelector('.audio-capsule-label');
  const arrowEl = container.querySelector('.audio-capsule-arrow');
  const popover = container.querySelector('.audio-presets-popover');
  const presetBtns = container.querySelectorAll('.audio-preset-btn');

  let audioCtx = null;
  let isPlaying = false;
  let currentPreset = localStorage.getItem('colombianopedia_audio_preset') || 'paramo';
  let activeNodes = [];
  let masterGain = null;

  const PRESET_NAMES = {
    paramo: 'Páramo',
    amazonia: 'Amazonía',
    pacifico: 'Pacífico',
    llanos: 'Llanos'
  };

  labelEl.textContent = PRESET_NAMES[currentPreset] || 'Páramo';

  // Sincronizar botón activo
  presetBtns.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-preset') === currentPreset);
  });

  // Generador de ruido rosa/blanco
  function createNoiseBuffer(ctx) {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  function clearActiveNodes() {
    activeNodes.forEach(node => {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch (e) {}
    });
    activeNodes = [];
  }

  function buildPresetGraph(ctx, preset, targetGain) {
    clearActiveNodes();
    const noiseBuffer = createNoiseBuffer(ctx);

    if (preset === 'paramo') {
      // 1. VIENTO ANDINO
      const windSource = ctx.createBufferSource();
      windSource.buffer = noiseBuffer;
      windSource.loop = true;

      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.Q.value = 3.5;
      windFilter.frequency.value = 380;

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.11;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 230;

      lfo.connect(lfoGain);
      lfoGain.connect(windFilter.frequency);
      windSource.connect(windFilter);
      windFilter.connect(targetGain);

      lfo.start();
      windSource.start();
      activeNodes.push(windSource, lfo, windFilter, lfoGain);

      // 2. ARROYO GLACIAR
      const streamSource = ctx.createBufferSource();
      streamSource.buffer = noiseBuffer;
      streamSource.loop = true;

      const streamFilter = ctx.createBiquadFilter();
      streamFilter.type = 'lowpass';
      streamFilter.frequency.value = 240;

      streamSource.connect(streamFilter);
      streamFilter.connect(targetGain);
      streamSource.start();
      activeNodes.push(streamSource, streamFilter);

    } else if (preset === 'amazonia') {
      // 1. LLUVIA EN DOSEL Y VEGETACIÓN TROPICAL
      const rainSource = ctx.createBufferSource();
      rainSource.buffer = noiseBuffer;
      rainSource.loop = true;

      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = 'bandpass';
      rainFilter.Q.value = 1.2;
      rainFilter.frequency.value = 1400;

      const rainGain = ctx.createGain();
      rainGain.gain.value = 0.85;

      rainSource.connect(rainFilter);
      rainFilter.connect(rainGain);
      rainGain.connect(targetGain);
      rainSource.start();
      activeNodes.push(rainSource, rainFilter, rainGain);

      // 2. GRILLOS Y CICADAS NOCTURNAS PROCEDURALES
      const cricketOsc = ctx.createOscillator();
      cricketOsc.type = 'sine';
      cricketOsc.frequency.value = 4300;

      const cricketLFO = ctx.createOscillator();
      cricketLFO.frequency.value = 15;
      const cricketLFOGain = ctx.createGain();
      cricketLFOGain.gain.value = 0.6;

      const cricketEnvLFO = ctx.createOscillator();
      cricketEnvLFO.frequency.value = 0.35;
      const cricketEnvGain = ctx.createGain();
      cricketEnvGain.gain.value = 0.08;

      const cricketMasterGain = ctx.createGain();
      cricketMasterGain.gain.value = 0.06;

      cricketOsc.connect(cricketMasterGain);
      cricketMasterGain.connect(targetGain);

      cricketOsc.start();
      cricketLFO.start();
      cricketEnvLFO.start();
      activeNodes.push(cricketOsc, cricketLFO, cricketLFOGain, cricketEnvLFO, cricketEnvGain, cricketMasterGain);

    } else if (preset === 'pacifico') {
      // 1. OLEAJE DEL OCÉANO PACÍFICO (Ciclos lentos de resaca)
      const surfSource = ctx.createBufferSource();
      surfSource.buffer = noiseBuffer;
      surfSource.loop = true;

      const surfFilter = ctx.createBiquadFilter();
      surfFilter.type = 'lowpass';
      surfFilter.Q.value = 1.8;
      surfFilter.frequency.value = 350;

      const surfGain = ctx.createGain();
      surfGain.gain.value = 0.05;

      const surfLFO = ctx.createOscillator();
      surfLFO.frequency.value = 0.09;
      const surfLFOGain = ctx.createGain();
      surfLFOGain.gain.value = 0.45;

      surfLFO.connect(surfLFOGain);
      surfLFOGain.connect(surfGain.gain);
      surfSource.connect(surfFilter);
      surfFilter.connect(surfGain);
      surfGain.connect(targetGain);

      surfLFO.start();
      surfSource.start();
      activeNodes.push(surfSource, surfFilter, surfGain, surfLFO, surfLFOGain);

      // 2. AGUACERO CÁLIDO TROPICAL
      const seaRainSource = ctx.createBufferSource();
      seaRainSource.buffer = noiseBuffer;
      seaRainSource.loop = true;

      const seaRainFilter = ctx.createBiquadFilter();
      seaRainFilter.type = 'highpass';
      seaRainFilter.frequency.value = 2600;
      const seaRainGain = ctx.createGain();
      seaRainGain.gain.value = 0.15;

      seaRainSource.connect(seaRainFilter);
      seaRainFilter.connect(seaRainGain);
      seaRainGain.connect(targetGain);
      seaRainSource.start();
      activeNodes.push(seaRainSource, seaRainFilter, seaRainGain);

    } else if (preset === 'llanos') {
      // 1. VIENTO CÁLIDO DE SABANA ABIERTA
      const plainsWind = ctx.createBufferSource();
      plainsWind.buffer = noiseBuffer;
      plainsWind.loop = true;

      const plainsFilter = ctx.createBiquadFilter();
      plainsFilter.type = 'bandpass';
      plainsFilter.Q.value = 2.2;
      plainsFilter.frequency.value = 620;

      const plainsLFO = ctx.createOscillator();
      plainsLFO.frequency.value = 0.16;
      const plainsLFOGain = ctx.createGain();
      plainsLFOGain.gain.value = 280;

      plainsLFO.connect(plainsLFOGain);
      plainsLFOGain.connect(plainsFilter.frequency);
      plainsWind.connect(plainsFilter);
      plainsFilter.connect(targetGain);

      plainsLFO.start();
      plainsWind.start();
      activeNodes.push(plainsWind, plainsFilter, plainsLFO, plainsLFOGain);

      // 2. SUSURRO DE MORICHAL Y HUMEDAL
      const grassSource = ctx.createBufferSource();
      grassSource.buffer = noiseBuffer;
      grassSource.loop = true;

      const grassFilter = ctx.createBiquadFilter();
      grassFilter.type = 'lowpass';
      grassFilter.frequency.value = 180;
      const grassGain = ctx.createGain();
      grassGain.gain.value = 0.5;

      grassSource.connect(grassFilter);
      grassFilter.connect(grassGain);
      grassGain.connect(targetGain);
      grassSource.start();
      activeNodes.push(grassSource, grassFilter, grassGain);
    }
  }

  function startSound() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.22, audioCtx.currentTime + 1.8);
    masterGain.connect(audioCtx.destination);

    buildPresetGraph(audioCtx, currentPreset, masterGain);

    isPlaying = true;
    capsuleMain.classList.add('playing');
    toggleBtn.innerHTML = '🔇';
    toggleBtn.title = 'Silenciar paisaje sonoro';
    document.querySelectorAll('.sound-bar').forEach(b => b.classList.add('playing'));
  }

  function stopSound() {
    if (!audioCtx || !masterGain) return;
    masterGain.gain.setValueAtTime(masterGain.gain.value, audioCtx.currentTime);
    masterGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
    document.querySelectorAll('.sound-bar').forEach(b => b.classList.remove('playing'));

    setTimeout(() => {
      clearActiveNodes();
      isPlaying = false;
      capsuleMain.classList.remove('playing');
      toggleBtn.innerHTML = '🔊';
      toggleBtn.title = 'Activar paisaje sonoro';
    }, 800);
  }

  function switchPreset(newPreset) {
    if (newPreset === currentPreset && isPlaying) return;
    currentPreset = newPreset;
    localStorage.setItem('colombianopedia_audio_preset', currentPreset);
    labelEl.textContent = PRESET_NAMES[currentPreset] || 'Páramo';

    presetBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-preset') === currentPreset);
    });

    if (isPlaying && audioCtx && masterGain) {
      masterGain.gain.linearRampToValueAtTime(0.02, audioCtx.currentTime + 0.4);
      setTimeout(() => {
        buildPresetGraph(audioCtx, currentPreset, masterGain);
        masterGain.gain.linearRampToValueAtTime(0.22, audioCtx.currentTime + 1.2);
      }, 420);
    } else if (!isPlaying) {
      startSound();
    }
  }

  // Interacción: Toggle Play / Mute
  capsuleMain.addEventListener('click', (e) => {
    if (e.target === arrowEl || e.target.classList.contains('audio-capsule-arrow')) {
      const isOpen = popover.classList.toggle('open');
      arrowEl.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
      return;
    }
    if (isPlaying) {
      stopSound();
    } else {
      startSound();
    }
  });

  // Abrir menú con contextmenu
  capsuleMain.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    popover.classList.toggle('open');
  });

  // Selección de presets en popover
  presetBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const p = btn.getAttribute('data-preset');
      switchPreset(p);
      popover.classList.remove('open');
      arrowEl.style.transform = 'rotate(0deg)';
    });
  });

  // Cerrar popover al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      popover.classList.remove('open');
      arrowEl.style.transform = 'rotate(0deg)';
    }
  });
}

/**
 * ==========================================
 * SISTEMA GLOBAL DE MODO LECTURA PERGAMINO
 * ==========================================
 */
function initReadingMode() {
  const nav = document.querySelector('header nav');
  if (!nav) return;

  let toggleBtn = document.getElementById('readingModeToggle');
  if (!toggleBtn) {
    toggleBtn = document.createElement('button');
    toggleBtn.id = 'readingModeToggle';
    toggleBtn.className = 'reading-mode-toggle';
    toggleBtn.setAttribute('aria-label', 'Alternar modo lectura de pergamino');
    nav.appendChild(toggleBtn);
  }

  const updateButtonText = () => {
    const isParchment = document.documentElement.getAttribute('data-reading-mode') === 'pergamino';
    toggleBtn.innerHTML = isParchment ? '🏛️ <span>Archivo</span>' : '📜 <span>Pergamino</span>';
    toggleBtn.title = isParchment ? 'Cambiar a Modo Archivo Nocturno' : 'Cambiar a Modo Lectura Pergamino (Fondo Claro)';
  };

  updateButtonText();

  toggleBtn.addEventListener('click', () => {
    const isParchment = document.documentElement.getAttribute('data-reading-mode') === 'pergamino';
    if (isParchment) {
      document.documentElement.removeAttribute('data-reading-mode');
      localStorage.setItem('colombianopedia_reading_mode', 'nocturno');
    } else {
      document.documentElement.setAttribute('data-reading-mode', 'pergamino');
      localStorage.setItem('colombianopedia_reading_mode', 'pergamino');
    }
    updateButtonText();
  });
}

/**
 * ==========================================
 * BUSCADOR UNIVERSAL (Cmd+K / Ctrl+K)
 * ==========================================
 */
const searchDatabase = [
  // Épocas
  { title: "Época Precolombina / Prehispánica", category: "Época Histórica", url: "precolombina.html", desc: "Desde el origen hasta 1492. Confederación Muisca, Taironas, Quimbayas y San Agustín." },
  { title: "Conquista y Virreinato Colonial", category: "Época Histórica", url: "colonia.html", desc: "1492 - 1810. Orden colonial, Real Expedición Botánica, San Andrés 1803 e Insurrección Comunera." },
  { title: "Independencia y Primeras Repúblicas", category: "Época Histórica", url: "independencia.html", desc: "1810 - 1830. Juntas provinciales, Campaña Libertadora de 1819 y Congreso de Cúcuta." },
  { title: "Siglo XIX: República, Territorio y Guerras", category: "Época Histórica", url: "siglo-xix.html", desc: "1830 - 1899. Abolición de la esclavitud (1851), Comisión Corográfica de Codazzi y Guerra de los Mil Días." },
  { title: "Siglo XX: Tensiones, Bogotazo y Constitución", category: "Época Histórica", url: "siglo-xx.html", desc: "1900 - 1999. Masacre de las Bananeras (1928), 9 de Abril (1948) y Constitución de 1991." },
  { title: "Siglo XXI: Memoria, Paz y Transición", category: "Época Histórica", url: "memoria.html", desc: "2000 - Presente. Acuerdo de Paz de 2016, Comisión de la Verdad y Sistema Integral de Justicia." },

  // Culturas
  { title: "Los Muiscas y el Altiplano", category: "Cultura Indígena", url: "muiscas.html", desc: "Zipazgo de Bacatá, Zacazgo de Hunza, Laguna de Guatavita, El Dorado y lengua Muysccubun." },
  { title: "Los Taironas y Ciudad Perdida (Teyuna)", category: "Cultura Indígena", url: "precolombina.html", desc: "Ingeniería en piedra en la Sierra Nevada de Santa Marta y arquitectura circular." },
  { title: "Orfebrería Quimbaya y el Poporo", category: "Cultura Indígena", url: "precolombina.html", desc: "Maestros metalúrgicos del oro y la tumbaga en el valle del río Cauca." },
  { title: "Cultura Zenú y Canales Hidráulicos", category: "Cultura Indígena", url: "precolombina.html", desc: "Drenaje artificial de más de 500.000 hectáreas en las sabanas del Sinú y San Jorge." },
  { title: "Tumaco-La Tolita", category: "Cultura Indígena", url: "otras-culturas.html", desc: "Escultura cerámica realista y metalurgia milenaria del platino en el litoral pacífico." },
  { title: "Cultura Calima", category: "Cultura Indígena", url: "otras-culturas.html", desc: "Pectorales colosales y orfebrería de poder en el Valle del Cauca." },
  { title: "Parque Arqueológico de San Agustín", category: "Cultura Indígena", url: "otras-culturas.html", desc: "Monolitos funerarios de piedra y deidades felinas en el alto Magdalena (Huila)." },
  { title: "Hipogeos de Tierradentro", category: "Cultura Indígena", url: "otras-culturas.html", desc: "Cámaras funerarias subterráneas talladas en toba volcánica en el Cauca." },

  // Módulos
  { title: "32 Ciudades y Capitales Históricas", category: "Territorio", url: "ciudades-historicas.html", desc: "Mapa de Colombia interactivo con toponimias prehispánicas originales de cada capital." },
  { title: "Mapa Geológico, Volcanes y Riquezas", category: "Geografía y Ciencias", url: "geografia-y-geologia.html", desc: "Falla de Romeral, Cordilleras, Volcán Nevado del Ruiz y minería histórica." },
  { title: "El Iceberg de la Violencia Histórica", category: "Investigación", url: "iceberg-violencia.html", desc: "Visualización en profundidad sobre hitos, actores y archivos del conflicto." },
  { title: "Mitos y Leyendas Sagradas", category: "Cosmogonía", url: "leyendas-ancestrales.html", desc: "Yurupary en el Amazonas, Furatena en Boyacá, Goranchacha y Bochica." },
  { title: "Mentes y Figuras Ilustres", category: "Biografías", url: "mentes-y-figuras.html", desc: "Rodolfo Llinás, Manuel Elkin Patarroyo, Adriana Ocampo y grandes pioneros." },

  // Hitos Documentales AGN
  { title: "El Acta de Independencia de 1810", category: "Archivo Histórico", url: "independencia.html", desc: "El cuaderno original quemado el 9 de abril de 1948 y las copias oficiales conservadas." },
  { title: "La Real Orden de 1803 (San Andrés)", category: "Archivo Histórico", url: "colonia.html", desc: "Soberanía marítima de la Nueva Granada sobre el archipiélago de San Andrés y Providencia." },
  { title: "La Real Expedición Botánica (1783)", category: "Archivo Histórico", url: "colonia.html", desc: "José Celestino Mutis, Francisco José de Caldas y las acuarelas botánicas virreinales." },
  { title: "Ley de Abolición de la Esclavitud (1851)", category: "Archivo Histórico", url: "siglo-xix.html", desc: "Firma de José Hilario López y el Fondo Manumisión del Archivo General de la Nación." },
  { title: "La Masacre de las Bananeras (1928)", category: "Archivo Histórico", url: "siglo-xx.html", desc: "Huelga obrera en Ciénaga, Magdalena, contra la United Fruit Company y cables desclasificados." }
];

function initUniversalSearch() {
  let backdrop = document.querySelector('.search-modal-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'search-modal-backdrop';
    backdrop.innerHTML = `
      <div class="search-modal-box" role="dialog" aria-modal="true" aria-label="Buscador de la Colombianopedia">
        <div class="search-modal-header">
          <span style="font-size: 1.25rem;">🔍</span>
          <input type="text" class="search-modal-input" placeholder="Escribe para buscar (ej: Muisca, 1851, Sal, Bananeras, Cali)..." autocomplete="off">
          <button class="search-close-btn" style="background:transparent;border:none;color:var(--text-secondary);font-size:1.5rem;cursor:pointer;">&times;</button>
        </div>
        <div class="search-modal-results">
          <!-- Resultados dinámicos -->
        </div>
        <div class="search-modal-footer">
          <span>Navegar: <kbd>↑</kbd> <kbd>↓</kbd> · Abrir: <kbd>Enter</kbd></span>
          <span>Cerrar: <kbd>Esc</kbd></span>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
  }

  const modalBox = backdrop.querySelector('.search-modal-box');
  const searchInput = backdrop.querySelector('.search-modal-input');
  const resultsContainer = backdrop.querySelector('.search-modal-results');
  const closeBtn = backdrop.querySelector('.search-close-btn');

  function openSearch() {
    backdrop.classList.add('active');
    searchInput.value = '';
    renderResults(searchDatabase.slice(0, 7)); // Mostrar destacados iniciales
    setTimeout(() => searchInput.focus(), 100);
  }

  function closeSearch() {
    backdrop.classList.remove('active');
  }

  closeBtn.addEventListener('click', closeSearch);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeSearch();
  });

  // Atajos de teclado: Cmd+K / Ctrl+K y '/'
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      backdrop.classList.contains('active') ? closeSearch() : openSearch();
    } else if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      openSearch();
    } else if (e.key === 'Escape' && backdrop.classList.contains('active')) {
      closeSearch();
    }
  });

  // Triggers en el DOM
  document.querySelectorAll('.universal-search-trigger').forEach(trigger => {
    trigger.addEventListener('click', openSearch);
  });

  // Función de normalización de texto (eliminar tildes y diacríticos)
  function cleanText(str) {
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function renderResults(items) {
    resultsContainer.innerHTML = '';
    if (items.length === 0) {
      resultsContainer.innerHTML = `
        <div style="padding: 2rem; text-align: center; color: var(--text-secondary);">
          <p>No se encontraron resultados para tu búsqueda.</p>
          <span style="font-size: 0.8rem; opacity: 0.7;">Prueba buscando términos como "Oro", "Cartagena", "Paz", "Muisca" o "1810".</span>
        </div>
      `;
      return;
    }

    items.forEach((item, idx) => {
      const row = document.createElement('a');
      row.href = item.url;
      row.className = `search-result-row ${idx === 0 ? 'selected' : ''}`;
      row.innerHTML = `
        <div>
          <div style="font-weight: 600; font-size: 0.95rem; margin-bottom: 0.2rem; color: var(--text-primary);">${item.title}</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.3;">${item.desc}</div>
        </div>
        <span class="search-category-pill">${item.category}</span>
      `;
      row.addEventListener('click', () => {
        closeSearch();
      });
      row.addEventListener('mouseenter', () => {
        resultsContainer.querySelectorAll('.search-result-row.selected').forEach(r => r.classList.remove('selected'));
        row.classList.add('selected');
      });
      resultsContainer.appendChild(row);
    });
  }

  // Navegación por teclado en resultados (Flecha Abajo, Flecha Arriba, Enter)
  searchInput.addEventListener('keydown', (e) => {
    const rows = resultsContainer.querySelectorAll('.search-result-row');
    if (!rows.length) return;
    let selectedIdx = Array.from(rows).findIndex(r => r.classList.contains('selected'));

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (selectedIdx >= 0) rows[selectedIdx].classList.remove('selected');
      selectedIdx = (selectedIdx + 1) % rows.length;
      rows[selectedIdx].classList.add('selected');
      rows[selectedIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (selectedIdx >= 0) rows[selectedIdx].classList.remove('selected');
      selectedIdx = (selectedIdx - 1 + rows.length) % rows.length;
      rows[selectedIdx].classList.add('selected');
      rows[selectedIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIdx >= 0 && rows[selectedIdx]) {
        const dest = rows[selectedIdx].href;
        closeSearch();
        window.location.href = dest;
      }
    }
  });

  // Carga asíncrona de los 5 datasets JSON generados
  let isDatasetsLoaded = false;
  async function loadExternalDatasets() {
    if (isDatasetsLoaded) return;
    try {
      const fetchPromises = [
        fetch('data/civilizaciones_prehispanicas.json').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('data/colonia_documentos_agn.json').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('data/independencia_siglo_xix.json').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('data/siglo_xx_memoria.json').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('data/regiones_folclor_municipios.json').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('data/indigenas_caribe_sierra_nevada.json').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('data/indigenas_pacifico_choco.json').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('data/indigenas_andes_macizo.json').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('data/indigenas_orinoquia_sabanas.json').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('data/indigenas_amazonia_etnografia.json').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('data/secretos_amazonia_documentada.json').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('data/tribus_vaupes_tukanas.json').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('data/tribus_apaporis_arawak.json').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('data/tribus_nomadas_maku.json').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('data/tribus_caqueta_chiribiquete.json').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('data/tribus_guainia_inirida.json').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('data/tribus_llanos_frontera.json').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('data/tribus_darien_caribe_remanente.json').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('data/tribus_andes_interandinos.json').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('data/censo_maestro_115_pueblos_indigenas.json').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('data/cev_datos_forenses_dih.json').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('data/cev_hallazgos_recomendaciones.json').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('data/cev_relato_historico_etapas.json').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('data/cev_territorio_etnico_humano.json').then(r => r.ok ? r.json() : null).catch(() => null)
      ];

      const [
        precolombina, colonia, sigloXIX, sigloXX, regiones,
        indigCaribe, indigPacifico, indigAndes, indigOrinoquia, indigAmazonia, secretosAmazonia,
        vaupesTukano, apaporisArawak, nomadasMaku, caquetaChiribiquete, guainiaInirida,
        llanosFrontera, darienCaribe, andesInterandinos, censoMaestro,
        cevForenses, cevHallazgos, cevRelato, cevTerritorio
      ] = await Promise.all(fetchPromises);

      // 1. Civilizaciones Prehispánicas y Museo del Oro
      if (precolombina && precolombina.civilizaciones) {
        precolombina.civilizaciones.forEach(c => {
          searchDatabase.push({
            title: `${c.nombre} (${c.periodo})`,
            category: "Civilización Prehispánica",
            url: `precolombina.html#${c.id}`,
            desc: `${c.ubicacion_geografica}. ${c.tecnologia_destacada ? c.tecnologia_destacada.substring(0, 120) + '...' : ''}`
          });
          if (c.piezas_museo_oro) {
            c.piezas_museo_oro.forEach(p => {
              searchDatabase.push({
                title: `${p.nombre} [${p.codigo || 'Museo del Oro'}]`,
                category: "Pieza Museo del Oro",
                url: `precolombina.html#${c.id}`,
                desc: (p.descripcion_tecnica || p.significado_simbolico || '').substring(0, 130) + '...'
              });
            });
          }
        });
      }

      // 2. Archivo Colonial AGN
      if (Array.isArray(colonia)) {
        colonia.forEach(doc => {
          searchDatabase.push({
            title: doc.titulo,
            category: "Archivo Colonial AGN",
            url: "colonia.html",
            desc: `${doc.fecha}. ${doc.resumen_historico ? doc.resumen_historico.substring(0, 130) + '...' : ''}`
          });
        });
      }

      // 3. Independencia y Siglo XIX
      if (sigloXIX) {
        if (sigloXIX.campana_libertadora_1819 && sigloXIX.campana_libertadora_1819.hitos_estrategicos) {
          sigloXIX.campana_libertadora_1819.hitos_estrategicos.forEach(h => {
            searchDatabase.push({
              title: h.denominacion || h.nombre,
              category: "Independencia 1819",
              url: "independencia.html",
              desc: `${h.fecha || ''} - ${(h.importancia_tactica || h.descripcion || '')}`.substring(0, 140)
            });
          });
        }
        if (sigloXIX.guerras_civiles_nacionales && sigloXIX.guerras_civiles_nacionales.listado_exhaustivo_de_las_9_guerras) {
          sigloXIX.guerras_civiles_nacionales.listado_exhaustivo_de_las_9_guerras.forEach(g => {
            searchDatabase.push({
              title: `${g.denominacion} (${g.periodo})`,
              category: "Guerra Civil Siglo XIX",
              url: "siglo-xix.html",
              desc: (g.detonante_y_contexto || g.saldo_y_consecuencias || '').substring(0, 140)
            });
          });
        }
      }

      // 4. Siglo XX y Memoria
      if (sigloXX && sigloXX.capitulos_historicos) {
        sigloXX.capitulos_historicos.forEach(cap => {
          searchDatabase.push({
            title: cap.titulo,
            category: "Memoria Siglo XX / XXI",
            url: "siglo-xx.html",
            desc: (cap.resumen_ejecutivo || cap.contexto_historico || '').substring(0, 140)
          });
        });
      }

      // 5. Regiones Naturales, Municipios Patrimoniales y Mitos
      if (regiones) {
        if (regiones.regiones_naturales) {
          regiones.regiones_naturales.forEach(reg => {
            searchDatabase.push({
              title: `Región ${reg.nombre}`,
              category: "Región Natural",
              url: "ciudades-historicas.html",
              desc: `${reg.relieve ? reg.relieve.descripcion.substring(0, 130) + '...' : ''}`
            });
          });
        }
        if (regiones.red_municipios_patrimoniales) {
          regiones.red_municipios_patrimoniales.forEach(m => {
            searchDatabase.push({
              title: `${m.nombre} (${m.departamento}) - Toponimia: ${m.toponimia_aborigen ? m.toponimia_aborigen.origen : ''}`,
              category: "Municipio Patrimonial",
              url: "ciudades-historicas.html",
              desc: `Fundado en ${m.fundacion ? m.fundacion.año : ''}. ${(m.estilo_arquitectonico ? m.estilo_arquitectonico.tecnicas_constructivas : '')}`.substring(0, 140)
            });
          });
        }
        if (regiones.atlas_mitos_y_leyendas) {
          regiones.atlas_mitos_y_leyendas.forEach(l => {
            searchDatabase.push({
              title: `Mito: ${l.nombre}`,
              category: "Mito y Leyenda",
              url: "leyendas-ancestrales.html",
              desc: `${l.region_de_origen}. ${(l.relato_narrativo ? l.relato_narrativo.substring(0, 130) + '...' : '')}`
            });
          });
        }
      }

      // 6. Pueblos Indígenas del Caribe y Sierra Nevada (Deep link al drawer)
      if (indigCaribe && indigCaribe.pueblos) {
        const caribePueblos = Array.isArray(indigCaribe.pueblos) ? indigCaribe.pueblos : Object.values(indigCaribe.pueblos);
        caribePueblos.forEach(p => {
          const name = p.nombre || p.etnonimo;
          searchDatabase.push({
            title: `Pueblo ${name} (${p.familia_linguistica || 'Caribe / Sierra'})`,
            category: "Pueblo Indígena Caribe",
            url: `otras-culturas.html?pueblo=${encodeURIComponent(cleanText(name))}`,
            desc: (p.cosmovision_y_ley_de_origen || p.resumen || p.ubicacion_geografica || '').substring(0, 140)
          });
        });
      }

      // 7. Pueblos Indígenas del Pacífico y Chocó
      if (indigPacifico && indigPacifico.pueblos_indigenas) {
        indigPacifico.pueblos_indigenas.forEach(p => {
          searchDatabase.push({
            title: `Pueblo ${p.nombre} (${p.familia_linguistica})`,
            category: "Pueblo Indígena Pacífico",
            url: `otras-culturas.html?pueblo=${encodeURIComponent(cleanText(p.nombre))}`,
            desc: (p.cosmovision || p.descripcion || p.territorio_y_distribucion || '').substring(0, 140)
          });
        });
      }

      // 8. Pueblos Indígenas de los Andes y Macizo
      if (indigAndes && indigAndes.pueblos_indigenas) {
        indigAndes.pueblos_indigenas.forEach(p => {
          const name = p.nombre || p.denominacion || p.id;
          searchDatabase.push({
            title: `Pueblo ${name} (${p.familia_linguistica || 'Andes'})`,
            category: "Pueblo Indígena Andino",
            url: `otras-culturas.html?pueblo=${encodeURIComponent(cleanText(name))}`,
            desc: (p.cosmovision || p.descripcion_etnografica || p.territorio || '').substring(0, 140)
          });
        });
      }

      // 9. Pueblos Indígenas de la Orinoquía y Llanos
      if (indigOrinoquia && indigOrinoquia.pueblos_indigenas) {
        indigOrinoquia.pueblos_indigenas.forEach(p => {
          const name = p.nombre || p.autodenominacion;
          searchDatabase.push({
            title: `Pueblo ${name} (${p.familia_linguistica})`,
            category: "Pueblo Indígena Orinoquía",
            url: `otras-culturas.html?pueblo=${encodeURIComponent(cleanText(name))}`,
            desc: (p.cosmovision || p.descripcion || '').substring(0, 140)
          });
        });
      }

      // 10. Pueblos Indígenas de la Amazonía Profunda
      if (indigAmazonia && indigAmazonia.pueblos_indigenas) {
        indigAmazonia.pueblos_indigenas.forEach(p => {
          const name = p.nombre || p.autonimo;
          searchDatabase.push({
            title: `Pueblo ${name} (${p.familia_linguistica})`,
            category: "Pueblo Indígena Amazonía",
            url: `otras-culturas.html?pueblo=${encodeURIComponent(cleanText(name))}`,
            desc: (p.cosmovision || p.resumen || p.territorio_y_cuencas || '').substring(0, 140)
          });
        });
      }

      // 11. Secretos Documentados del Amazonas
      if (secretosAmazonia && secretosAmazonia.secciones) {
        Object.entries(secretosAmazonia.secciones).forEach(([key, sec]) => {
          searchDatabase.push({
            title: sec.titulo || key,
            category: "Enigma Amazónico Documentado",
            url: "memoria.html",
            desc: (sec.resumen_cientifico || sec.descripcion || '').substring(0, 140)
          });
        });
      }

      // 12. Clanes Tukano del Vaupés
      if (vaupesTukano && vaupesTukano.monografias_exhaustivas_de_las_ocho_naciones) {
        vaupesTukano.monografias_exhaustivas_de_las_ocho_naciones.forEach(p => {
          const name = p.nombre_comun || p.nombre;
          searchDatabase.push({
            title: `Pueblo ${name} (${p.filiacion_linguistica?.idioma || 'Tukano Oriental'})`,
            category: "Pueblo Indígena Vaupés",
            url: `otras-culturas.html?pueblo=${encodeURIComponent(cleanText(name))}`,
            desc: (p.cosmovision_y_filosofia?.mito_origen || p.resumen || p.significado_etnonimo || '').substring(0, 140)
          });
        });
      }

      // 13. Clanes del Apaporis y Arawak
      if (apaporisArawak && apaporisArawak.naciones_indigenas) {
        apaporisArawak.naciones_indigenas.forEach(p => {
          const name = p.nombre || p.id;
          searchDatabase.push({
            title: `Pueblo ${name} (${p.perfil_etnolinguistico?.afiliacion_linguistica || 'Apaporis'})`,
            category: "Pueblo Indígena Apaporis",
            url: `otras-culturas.html?pueblo=${encodeURIComponent(cleanText(name))}`,
            desc: (p.cosmologia_y_mitologia?.anaconda_canoa || p.resumen || '').substring(0, 140)
          });
        });
      }

      // 14. Nómadas Nadahup / Makú
      if (nomadasMaku && nomadasMaku.monografias_detalladas_pueblos) {
        Object.values(nomadasMaku.monografias_detalladas_pueblos).forEach(p => {
          const name = p.pueblo || p.nombre || p.id;
          searchDatabase.push({
            title: `Pueblo ${name} (${p.linguistica?.familia || 'Nadahup / Makú'})`,
            category: "Pueblo Indígena Nómada",
            url: `otras-culturas.html?pueblo=${encodeURIComponent(cleanText(name))}`,
            desc: (p.etnoecologia_y_patron_nomada?.ciclos_estacionales || p.resumen || '').substring(0, 140)
          });
        });
      }

      // 15. Caquetá, Putumayo y Chiribiquete
      if (caquetaChiribiquete && caquetaChiribiquete.pueblos_indigenas) {
        caquetaChiribiquete.pueblos_indigenas.forEach(p => {
          const name = p.nombre || p.id;
          searchDatabase.push({
            title: `Pueblo ${name} (${p.filiacion_linguistica?.familia || 'Caquetá / Putumayo'})`,
            category: "Pueblo Indígena Caquetá",
            url: `otras-culturas.html?pueblo=${encodeURIComponent(cleanText(name))}`,
            desc: (p.cosmovision_y_mitologia?.origen_sagrado || p.resumen || '').substring(0, 140)
          });
        });
      }

      // 16. Cuenca de Guainía, Atabapo e Inírida
      if (guainiaInirida && guainiaInirida.pueblos_indigenas) {
        guainiaInirida.pueblos_indigenas.forEach(p => {
          const name = p.nombre || p.id;
          searchDatabase.push({
            title: `Pueblo ${name} (${p.filiacion_linguistica?.familia || 'Guainía / Río Negro'})`,
            category: "Pueblo Indígena Guainía",
            url: `otras-culturas.html?pueblo=${encodeURIComponent(cleanText(name))}`,
            desc: (p.cosmovision_y_mitologia?.ciclo_mitico || p.resumen || '').substring(0, 140)
          });
        });
      }

      // 17. Sabanas Fronterizas de Arauca y Vichada
      if (llanosFrontera && llanosFrontera.pueblos_indigenas_sabanas_fronterizas) {
        llanosFrontera.pueblos_indigenas_sabanas_fronterizas.forEach(p => {
          const name = p.nombre || p.id;
          searchDatabase.push({
            title: `Pueblo ${name} (${p.filiacion_linguistica?.familia || 'Llanos / Sabanas'})`,
            category: "Pueblo Indígena Llanos",
            url: `otras-culturas.html?pueblo=${encodeURIComponent(cleanText(name))}`,
            desc: (p.cosmovision_y_espiritualidad?.origen_mitico || p.resumen || '').substring(0, 140)
          });
        });
      }

      // 18. Darién y Caribe Remanente
      if (darienCaribe && darienCaribe.pueblos) {
        darienCaribe.pueblos.forEach(p => {
          const name = p.nombre || p.id;
          searchDatabase.push({
            title: `Pueblo ${name} (${p.filiacion_linguistica?.familia || 'Darién / Caribe'})`,
            category: "Pueblo Indígena Darién / Caribe",
            url: `otras-culturas.html?pueblo=${encodeURIComponent(cleanText(name))}`,
            desc: (p.cosmovision_y_espiritualidad?.origen_sagrado || p.resumen || '').substring(0, 140)
          });
        });
      }

      // 19. Valles Interandinos y Cauca
      if (andesInterandinos && andesInterandinos.pueblos_indigenas) {
        andesInterandinos.pueblos_indigenas.forEach(p => {
          const name = p.nombre || p.id;
          searchDatabase.push({
            title: `Pueblo ${name} (${p.filiacion_linguistica?.familia || 'Andes Interandinos'})`,
            category: "Pueblo Indígena Andino",
            url: `otras-culturas.html?pueblo=${encodeURIComponent(cleanText(name))}`,
            desc: (p.etnohistoria_y_resistencia?.origen_ancestral || p.resumen || '').substring(0, 140)
          });
        });
      }

      // 20. Censo Maestro de las 115 Naciones Indígenas
      if (censoMaestro && censoMaestro.catalogo_completo_115) {
        censoMaestro.catalogo_completo_115.forEach(p => {
          searchDatabase.push({
            title: `Censo Oficial: Pueblo ${p.nombre} (${p.familia})`,
            category: "Censo Canónico 115 Pueblos",
            url: `otras-culturas.html?pueblo=${encodeURIComponent(cleanText(p.nombre))}`,
            desc: `Nación indígena colombiana en ${p.region} (${p.depto}). Familia lingüística: ${p.familia}. Reconocida por DANE y ONIC.`
          });
        });
      }

      // 21. Comisión de la Verdad: Datos Forenses y DIH
      if (cevForenses) {
        if (cevForenses.cifras_consolidadas_verificadas) {
          searchDatabase.push({
            title: "CEV Cifra: 450.664 Homicidios en el Conflicto Armado",
            category: "Comisión de la Verdad - Forense",
            url: "memoria.html#cev-cifras",
            desc: "Estimación estadística conjunta CEV-JEP-DNP (1985-2018) con modelo de captura-recaptura para superar el subregistro."
          });
          searchDatabase.push({
            title: "CEV Cifra: 121.768 Desapariciones Forzadas",
            category: "Comisión de la Verdad - Forense",
            url: "memoria.html#cev-cifras",
            desc: "Crímen de lesa humanidad documentado en alianza con la Unidad de Búsqueda de Personas dadas por Desaparecidas (UBPD)."
          });
          searchDatabase.push({
            title: "CEV Cifra: 50.707 Secuestros y Tomas de Rehenes",
            category: "Comisión de la Verdad - Forense",
            url: "memoria.html#cev-cifras",
            desc: "Violaciones al DIH perpetradas por FARC-EP y ELN con fines extorsivos, políticos y de control territorial."
          });
          searchDatabase.push({
            title: "CEV Cifra: 8.000.000+ Desplazamientos Forzados",
            category: "Comisión de la Verdad - Forense",
            url: "memoria.html#cev-cifras",
            desc: "Éxodo masivo de comunidades campesinas, afrodescendientes e indígenas hacia periferias urbanas."
          });
        }
        if (cevForenses.macro_patrones_criminales_forenses) {
          cevForenses.macro_patrones_criminales_forenses.forEach(pat => {
            searchDatabase.push({
              title: `Patrón DIH: ${pat.nombre}`,
              category: "Macro-Patrón Criminal CEV",
              url: "memoria.html#cev-patrones",
              desc: `${pat.logica_operativa || ''}`.substring(0, 140)
            });
            if (pat.casos_emblematicos) {
              pat.casos_emblematicos.forEach(c => {
                searchDatabase.push({
                  title: `Caso Judicial: ${c.nombre || c.caso || c.municipio}`,
                  category: "Caso Emblemático DIH",
                  url: "memoria.html#cev-casos",
                  desc: `${c.departamento ? c.departamento + '. ' : ''}${c.ano ? c.ano + '. ' : ''}${(c.descripcion || c.impacto || '')}`.substring(0, 140)
                });
              });
            }
          });
        }
        if (cevForenses.archivo_testimonial_textual) {
          cevForenses.archivo_testimonial_textual.forEach(t => {
            searchDatabase.push({
              title: `Testimonio CEV [${t.codigo_cev}]: ${t.testigo}`,
              category: "Voz de la Verdad CEV",
              url: "memoria.html#cev-testimonios",
              desc: `"${(t.cita_textual || '').substring(0, 130)}..." (${t.fecha_evento || ''})`
            });
          });
        }
      }

      // 22. Comisión de la Verdad: Hallazgos y Recomendaciones
      if (cevHallazgos) {
        if (cevHallazgos.cuatro_factores_persistencia) {
          cevHallazgos.cuatro_factores_persistencia.forEach(f => {
            searchDatabase.push({
              title: `Persistencia del Conflicto: ${f.titulo}`,
              category: "CEV - Hallazgos Centrales",
              url: "memoria.html#cev-hallazgos",
              desc: (f.diagnostico_cev || f.impacto_documentado || '').substring(0, 140)
            });
          });
        }
        if (cevHallazgos.bloques_recomendaciones_no_repeticion) {
          cevHallazgos.bloques_recomendaciones_no_repeticion.forEach(r => {
            searchDatabase.push({
              title: `Recomendación No Repetición: ${r.nombre_eje}`,
              category: "CEV - No Repetición",
              url: "memoria.html#cev-recomendaciones",
              desc: (r.descripcion || '').substring(0, 140)
            });
          });
        }
      }

      // 23. Comisión de la Verdad: Relato Histórico y Etapas
      if (cevRelato && cevRelato.periodizacion_cinco_etapas) {
        cevRelato.periodizacion_cinco_etapas.forEach(e => {
          searchDatabase.push({
            title: `Etapa Histórica (${e.periodo_anos}): ${e.nombre_etapa}`,
            category: "CEV - Relato Histórico",
            url: "memoria.html#cev-etapas",
            desc: (e.tesis_explicativa_cev || e.contexto_politico_nacional || '').substring(0, 140)
          });
        });
      }

      // 24. Comisión de la Verdad: Tomos Territoriales y Étnicos
      if (cevTerritorio) {
        if (cevTerritorio.tomo_05_catorce_macroregiones) {
          cevTerritorio.tomo_05_catorce_macroregiones.forEach(m => {
            searchDatabase.push({
              title: `Macro-región CEV: ${m.nombre} (Tomo 05: Colombia Adentro)`,
              category: "CEV - Macro-regiones",
              url: "memoria.html#cev-macroregiones",
              desc: `Departamentos: ${Array.isArray(m.departamentos) ? m.departamentos.join(', ') : m.departamentos}. ${(m.dinamica_central || '')}`.substring(0, 140)
            });
          });
        }
        searchDatabase.push({
          title: "Tomo 06 CEV: Mi Cuerpo es la Verdad (Género y Diversidad)",
          category: "CEV - Tomo Oficial",
          url: "memoria.html#cev-genero",
          desc: "Violencias diferenciales contra mujeres y personas LGBTIQ+ en el conflicto armado y resistencias comunitarias."
        });
        searchDatabase.push({
          title: "Tomo 07 CEV: Resistencias de los Pueblos Étnicos",
          category: "CEV - Tomo Oficial",
          url: "memoria.html#cev-etnico",
          desc: "Afectaciones colectivas a pueblos indígenas, afrocolombianos, negros, palenqueros y raizales."
        });
        searchDatabase.push({
          title: "Tomo 08 CEV: La Colombia Fuera de Colombia (Exilio)",
          category: "CEV - Tomo Oficial",
          url: "memoria.html#cev-exilio",
          desc: "Primer informe de una comisión de la verdad sobre víctimas forzadas a migrar al exterior (24 países)."
        });
        searchDatabase.push({
          title: "Tomo 09 CEV: No es un Mal Menor (Niñez y Juventud)",
          category: "CEV - Tomo Oficial",
          url: "memoria.html#cev-ninez",
          desc: "Impactos en la infancia, orfandad, escuelas atacadas y reclutamiento forzado durante la guerra."
        });
        searchDatabase.push({
          title: "Tomo 10 CEV: Cuando los Pájaros no Cantaban (Polifonía)",
          category: "CEV - Tomo Oficial",
          url: "memoria.html#cev-testimonios",
          desc: "Acervo de testimonios líricos, dolores y cantos de dignidad de las víctimas del conflicto colombiano."
        });
      }

      // 25. Centro Geológico, Volcanes y Fallas Tectónicas
      const geologiaNodos = [
        { title: "Volcán Nevado del Ruiz (5.321 msnm)", category: "Geología y Volcanes", url: "geografia-y-geologia.html#ruiz", desc: "Estratovolcán activo en la Cordillera Central. Tragedia de Armero (1985) y monitoreo sismológico continuo del SGC." },
        { title: "Volcán Galeras (4.276 msnm, Pasto)", category: "Geología y Volcanes", url: "geografia-y-geologia.html#galeras", desc: "Uno de los volcanes más activos de Colombia y del Cinturón de Fuego del Pacífico, dominando la ciudad de Pasto." },
        { title: "Volcán Cerro Machín (Tolima)", category: "Geología y Volcanes", url: "geografia-y-geologia.html#machin", desc: "Volcán altamente explosivo en Cajamarca (Tolima). Anillos piroclásticos y vigilancia tectónica prioritaria." },
        { title: "Volcán Nevado del Huila (5.364 msnm)", category: "Geología y Volcanes", url: "geografia-y-geologia.html#huila", desc: "Punto más alto de la Cordillera Central y territorio sagrado de la nación Nasa." },
        { title: "Volcán Puracé (Cauca)", category: "Geología y Volcanes", url: "geografia-y-geologia.html#purace", desc: "Estratovolcán andino con fuentes termales y fumarolas sulfurosas en la cadena volcánica de los Coconucos." },
        { title: "Volcán Cumbal (Nariño, 4.764 msnm)", category: "Geología y Volcanes", url: "geografia-y-geologia.html#cumbal", desc: "El gigante del nudo de los Pastos, con glaciares remanentes y lagunas volcánicas tutelares." },
        { title: "Falla de Romeral (Sistema Tectónico Mayor)", category: "Tectónica y Fallas", url: "geografia-y-geologia.html#romeral", desc: "Mega-falla tectónica activa de rumbo norte-sur que separa la Cordillera Central de la Occidental." },
        { title: "Falla de Algeciras (Huila / Caquetá)", category: "Tectónica y Fallas", url: "geografia-y-geologia.html#algeciras", desc: "Sistema tectónico transpresivo en el flanco oriental del Macizo Colombiano." },
        { title: "Falla del Borde Llanero", category: "Tectónica y Fallas", url: "geografia-y-geologia.html#bordellanero", desc: "Frontera tectónica entre la Cordillera Oriental y la cuenca de los Llanos Orientales." },
        { title: "Esmeraldas de Muzo, Coscuez y Chivor", category: "Riqueza Mineral", url: "geografia-y-geologia.html#esmeraldas", desc: "Los yacimientos de esmeraldas hidrotermales más puros y cotizados del planeta en las pizarras de Boyacá." },
        { title: "Catedral y Salina de Zipaquirá", category: "Riqueza Mineral", url: "geografia-y-geologia.html#zipaquira", desc: "Domo de sal fósil de 250 millones de años (Cretácico), explotado desde tiempos precolombinos por los Muiscas." },
        { title: "Alerta Ecológica: Río Atrato (Sentencia T-622/16)", category: "Alerta Ambiental", url: "geografia-y-geologia.html#atrato", desc: "Primer río de Colombia declarado sujeto de derechos ante la devastación de la minería de dragas y mercurio." }
      ];
      geologiaNodos.forEach(n => searchDatabase.push(n));

      isDatasetsLoaded = true;
    } catch (err) {
      console.warn("Carga parcial de datasets:", err);
    }
  }

  // Cargar en segundo plano al iniciar
  loadExternalDatasets();

  searchInput.addEventListener('input', (e) => {
    const q = cleanText(e.target.value.trim());
    if (!q) {
      renderResults(searchDatabase.slice(0, 7));
      return;
    }

    const matches = searchDatabase.filter(item => {
      const t = cleanText(item.title);
      const d = cleanText(item.desc);
      const c = cleanText(item.category);
      return t.includes(q) || d.includes(q) || c.includes(q);
    });

    renderResults(matches);
  });
}

/**
 * ==========================================
 * WIDGET DE EFEMÉRIDES HISTÓRICAS
 * ==========================================
 */
const efemeridesHistoricas = [
  { mes: 7, dia: 20, anio: "1810", titulo: "El Grito de Independencia en Santafé", desc: "El florero de Llorente desata la conformación de la Junta Suprema de Gobierno del Nuevo Reino de Granada.", url: "independencia.html" },
  { mes: 8, dia: 7, anio: "1819", titulo: "Batalla del Puente de Boyacá", desc: "El ejército libertador de Simón Bolívar y Francisco de Paula Santander sella el triunfo de la Campaña Libertadora.", url: "independencia.html" },
  { mes: 4, dia: 9, anio: "1948", titulo: "El Bogotazo y Muerte de Gaitán", desc: "El magnicidio del líder popular Jorge Eliécer Gaitán sacude la capital y marca el rumbo del siglo XX.", url: "siglo-xx.html" },
  { mes: 5, dia: 21, anio: "1851", titulo: "Abolición Definitiva de la Esclavitud", desc: "El presidente José Hilario López sanciona la ley que decreta la libertad absoluta de toda persona esclavizada en Colombia.", url: "siglo-xix.html" },
  { mes: 7, dia: 4, anio: "1991", titulo: "Proclamación de la Constitución de 1991", desc: "Nace la Constitución de los Derechos Humanos, reconociendo a Colombia como un Estado social y pluriétnico.", url: "siglo-xx.html" },
  { mes: 11, dia: 24, anio: "2016", titulo: "Firma del Acuerdo Final de Paz", desc: "Se suscribe en el Teatro Colón el histórico tratado que da paso a la Jurisdicción Especial para la Paz y la Comisión de la Verdad.", url: "memoria.html" },
  { mes: 12, dia: 6, anio: "1928", titulo: "Huelga y Masacre de las Bananeras", desc: "En Ciénaga, Magdalena, tropas del ejército disparan contra los huelguistas de la United Fruit Company.", url: "siglo-xx.html" }
];

function initEfemeridesWidget() {
  const container = document.getElementById('efemerides-box');
  if (!container) return;

  const hoy = new Date();
  const mesActual = hoy.getMonth() + 1;
  const diaActual = hoy.getDate();

  // Buscar si coincide hoy, o de lo contrario mostrar un hito emblemático
  let evento = efemeridesHistoricas.find(e => e.mes === mesActual && e.dia === diaActual);
  if (!evento) {
    // Si no coincide exactamente, seleccionar uno destacado según el día del mes
    evento = efemeridesHistoricas[diaActual % efemeridesHistoricas.length];
  }

  container.innerHTML = `
    <div class="efemerides-banner">
      <div>
        <span class="efemerides-date-badge">📜 Archivo Histórico · Hito del ${evento.dia}/${evento.mes} (${evento.anio})</span>
        <h3 class="efemerides-title">${evento.titulo}</h3>
        <p style="font-size: 0.9rem; color: var(--text-secondary); margin: 0; line-height: 1.5;">
          ${evento.desc}
        </p>
      </div>
      <a href="${evento.url}" class="btn btn-primary" style="white-space: nowrap; flex-shrink: 0;">
        Explorar Época &rarr;
      </a>
    </div>
  `;
}

/**
 * ==========================================
 * CONTADOR ANIMADO DE PATRIMONIO VIVO
 * ==========================================
 */
function initPatrimonioCounters() {
  const counters = document.querySelectorAll('.stat-number[data-target]');
  if (counters.length === 0) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.getAttribute('data-target'), 10);
        let current = 0;
        const duration = 1400; // ms
        const startTime = performance.now();

        function updateCount(currentTime) {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          // Easing cúbico
          const easeOut = 1 - Math.pow(1 - progress, 3);
          current = Math.floor(easeOut * target);
          el.textContent = current.toLocaleString('es-CO');

          if (progress < 1) {
            requestAnimationFrame(updateCount);
          } else {
            el.textContent = target.toLocaleString('es-CO');
          }
        }

        requestAnimationFrame(updateCount);
        obs.unobserve(el);
      }
    });
  }, { threshold: 0.3 });

  counters.forEach(c => observer.observe(c));
}

/**
 * ==========================================
 * FALLBACK DE PARALLAX SCROLL-DRIVEN
 * (Para navegadores que no soportan CSS view-timeline)
 * ==========================================
 */
function initParallaxFallback() {
  // Verificar soporte nativo de Scroll-driven animations
  const supportsScrollTimeline = window.CSS && CSS.supports && CSS.supports('(animation-timeline: view()) and (animation-range: entry)');
  if (supportsScrollTimeline) return; // Si el navegador lo soporta nativo por GPU, no usar JS

  const heroWrapper = document.querySelector('.scrolly-hero-container');
  if (!heroWrapper) return;

  const layerSky = heroWrapper.querySelector('.layer-sky');
  const layerMountains = heroWrapper.querySelector('.layer-mountains');
  const layerMist = heroWrapper.querySelector('.layer-mist');
  const layerPalms = heroWrapper.querySelector('.layer-palms');
  const layerJungle = heroWrapper.querySelector('.layer-jungle');
  const layerLeaves = heroWrapper.querySelector('.layer-foreground-leaves');
  const pinnedText = heroWrapper.querySelector('.hero-pinned-text');

  let ticking = false;

  function onScroll() {
    const rect = heroWrapper.getBoundingClientRect();
    const windowH = window.innerHeight;

    if (rect.bottom > 0 && rect.top < windowH) {
      const scrollProgress = Math.max(0, -rect.top / (rect.height - windowH));

      if (layerSky) layerSky.style.transform = `translateY(${scrollProgress * 50}px)`;
      if (layerMountains) layerMountains.style.transform = `translateY(${scrollProgress * 110}px) scale(${1 + scrollProgress * 0.04})`;
      if (layerMist) {
        layerMist.style.transform = `translateY(${-scrollProgress * 30}px) scale(${1 + scrollProgress * 0.25})`;
        layerMist.style.opacity = `${0.35 + scrollProgress * 0.4}`;
      }
      if (layerPalms) layerPalms.style.transform = `translateY(${scrollProgress * 190}px) scale(${1 + scrollProgress * 0.08})`;
      if (layerJungle) layerJungle.style.transform = `translateY(${scrollProgress * 280}px) scale(${1 + scrollProgress * 0.12})`;
      if (layerLeaves) layerLeaves.style.transform = `translateY(${scrollProgress * 420}px) scale(${1 + scrollProgress * 0.3})`;
      if (pinnedText) {
        pinnedText.style.opacity = `${Math.max(0, 1 - scrollProgress * 1.8)}`;
        pinnedText.style.transform = `translateY(${-scrollProgress * 70}px)`;
      }
    }
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
}

/**
 * ==========================================
 * SISTEMA DE MUSEO DE VANGUARDIA (AWWWARDS TIER)
 * ==========================================
 */

/**
 * 1. Reflejo Especular Dinámico y Tilt 3D Tangible
 */
function initMuseumCards3D() {
  const cards = document.querySelectorAll(
    '.museum-card-3d, .glass-card, .monumental-card, .culture-card, .chapter-card, .episode-card, .patrimonio-card, .power-card, .tomo-card, .legend-card, .deity-card'
  );
  if (!cards.length) return;

  cards.forEach(card => {
    let bounds = null;

    function onPointerEnter() {
      bounds = card.getBoundingClientRect();
      card.style.transition = 'transform 0.1s ease-out, box-shadow 0.3s ease, border-color 0.3s ease';
    }

    function onPointerMove(e) {
      if (!bounds) bounds = card.getBoundingClientRect();
      const x = e.clientX - bounds.left;
      const y = e.clientY - bounds.top;
      const w = bounds.width;
      const h = bounds.height;

      const px = Math.max(0, Math.min(100, (x / w) * 100));
      const py = Math.max(0, Math.min(100, (y / h) * 100));

      card.style.setProperty('--mouse-x', `${px.toFixed(1)}%`);
      card.style.setProperty('--mouse-y', `${py.toFixed(1)}%`);

      // Inclinación 3D sutil (física sobria de galería de arte)
      const rotX = ((0.5 - (y / h)) * 7).toFixed(2);
      const rotY = (((x / w) - 0.5) * 7).toFixed(2);
      card.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-4px)`;
    }

    function onPointerLeave() {
      card.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.5s ease, border-color 0.3s ease';
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
      card.style.removeProperty('--mouse-x');
      card.style.removeProperty('--mouse-y');
      bounds = null;
    }

    card.addEventListener('pointerenter', onPointerEnter, { passive: true });
    card.addEventListener('pointermove', onPointerMove, { passive: true });
    card.addEventListener('pointerleave', onPointerLeave, { passive: true });
  });
}

/**
 * 2. Motor de Polvo de Oro Cósmico y Partículas Ambientales
 */
function initHeroGoldenStardust() {
  let canvasList = Array.from(document.querySelectorAll('.hero-particles-canvas'));

  if (canvasList.length === 0) {
    const heroTarget = document.querySelector(
      '.scrolly-hero-container, .hero-content-split, .hero-precolombina, .hero-colonia, .hero-independencia, .hero-muisca, .dossier-hero, .hero-mentes, .hero-leyendas, #hero-section'
    );
    if (heroTarget) {
      const c = document.createElement('canvas');
      c.className = 'hero-particles-canvas';
      if (getComputedStyle(heroTarget).position === 'static') {
        heroTarget.style.position = 'relative';
      }
      heroTarget.prepend(c);
      canvasList.push(c);
    }
  }

  canvasList.forEach(canvas => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let particles = [];
    const PARTICLE_COUNT = 40;

    function resize() {
      const parent = canvas.parentElement || document.body;
      const rect = parent.getBoundingClientRect();
      width = canvas.width = rect.width || window.innerWidth;
      height = canvas.height = Math.max(300, rect.height || 500);
    }

    resize();
    window.addEventListener('resize', resize, { passive: true });

    class GoldenParticle {
      constructor() {
        this.reset(true);
      }
      reset(initial = false) {
        this.x = Math.random() * width;
        this.y = initial ? Math.random() * height : height + 10;
        this.size = Math.random() * 2.2 + 0.6;
        this.speedY = Math.random() * 0.4 + 0.15;
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.baseAlpha = Math.random() * 0.55 + 0.2;
        this.alpha = this.baseAlpha;
        this.twinkleSpeed = Math.random() * 0.025 + 0.008;
        this.twinklePhase = Math.random() * Math.PI * 2;
        const golds = [
          '212, 175, 55',
          '245, 215, 127',
          '255, 235, 170',
          '230, 190, 70'
        ];
        this.color = golds[Math.floor(Math.random() * golds.length)];
      }
      update() {
        this.y -= this.speedY;
        this.x += this.speedX + Math.sin(this.y * 0.015) * 0.25;
        this.twinklePhase += this.twinkleSpeed;
        this.alpha = this.baseAlpha * (0.6 + 0.4 * Math.sin(this.twinklePhase));

        if (this.y < -15 || this.x < -15 || this.x > width + 15) {
          this.reset();
        }
      }
      draw() {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color}, ${this.alpha})`;
        ctx.shadowColor = `rgba(${this.color}, 0.8)`;
        ctx.shadowBlur = this.size * 3;
        ctx.fill();
        ctx.restore();
      }
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(new GoldenParticle());
    }

    let isVisible = true;
    document.addEventListener('visibilitychange', () => {
      isVisible = !document.hidden;
    });

    function renderLoop() {
      if (isVisible) {
        ctx.clearRect(0, 0, width, height);
        for (let i = 0; i < particles.length; i++) {
          particles[i].update();
          particles[i].draw();
        }
      }
      requestAnimationFrame(renderLoop);
    }
    renderLoop();
  });
}

/**
 * ==============================================================================
 * SISTEMA GLOBAL DE CITACIÓN ACADÉMICA Y EXPORTACIÓN DOCUMENTAL (APA / CHICAGO / BIBTEX)
 * ==============================================================================
 */
window.ColombianopediaCitations = (function() {
  function generateAPA(item) {
    const author = item.author || "Colombianopedia";
    const year = item.year || "2026";
    const title = item.title;
    const site = "La Gran Enciclopedia de la Memoria, las Naciones Originarias y la Tierra";
    const url = item.url || window.location.href;
    return `${author} (${year}). ${title}. En ${site}. Recuperado de ${url}`;
  }

  function generateChicago(item) {
    const author = item.author || "Colombianopedia";
    const year = item.year || "2026";
    const title = item.title;
    const site = "La Gran Enciclopedia de la Memoria, las Naciones Originarias y la Tierra";
    const url = item.url || window.location.href;
    return `${author}. "${title}." ${site}, ${year}. ${url}.`;
  }

  function generateBibTeX(item) {
    const rawKey = (item.bibtexKey || item.title || 'documento')
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, '_')
      .substring(0, 24);
    const key = `colombianopedia_${rawKey}_${item.year || '2026'}`;
    const author = item.author || "Colombianopedia";
    const title = item.title;
    const year = item.year || "2026";
    const url = item.url || window.location.href;
    const note = item.note || "Acervo de Investigación Histórica, Etnográfica y Territorial de Colombia";
    return `@online{${key},
  author    = {${author}},
  title     = {${title}},
  year      = {${year}},
  url       = {${url}},
  publisher = {Colombianopedia},
  note      = {${note}},
  urldate   = {${new Date().toISOString().split('T')[0]}}
}`;
  }

  function downloadFile(filename, content, type = 'text/markdown;charset=utf-8') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function openModal(item) {
    let backdrop = document.querySelector('.citation-modal-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'citation-modal-backdrop';
      backdrop.innerHTML = `
        <div class="citation-modal-box" role="dialog" aria-modal="true" aria-label="Cita Académica">
          <div class="citation-modal-header">
            <div>
              <span class="badge-pill badge-pill--gold" style="margin-bottom:0.4rem; display:inline-block; font-size:0.7rem;">ACERVO ACADÉMICO</span>
              <h3 class="citation-modal-title" style="margin:0; font-family:var(--font-title); color:var(--text-primary); font-size:1.25rem;">Citar esta Investigación</h3>
            </div>
            <button type="button" class="citation-close-btn" aria-label="Cerrar modal">&times;</button>
          </div>
          
          <div class="citation-tabs-nav" style="display:flex; gap:0.5rem; margin:1.2rem 0; border-bottom:1px solid var(--border-glass, rgba(255,255,255,0.1)); padding-bottom:0.6rem;">
            <button type="button" class="citation-tab-btn active" data-format="apa">APA 7ª Edición</button>
            <button type="button" class="citation-tab-btn" data-format="chicago">Chicago 17ª</button>
            <button type="button" class="citation-tab-btn" data-format="bibtex">BibTeX</button>
          </div>

          <div class="citation-text-wrapper" style="position:relative;">
            <textarea readonly class="citation-textarea" rows="4" style="width:100%; border-radius:8px; background:rgba(0,0,0,0.5); border:1px solid rgba(212,175,55,0.3); color:var(--text-primary); padding:1rem; font-family:var(--font-mono, monospace); font-size:0.85rem; line-height:1.6; resize:none; box-sizing:border-box; outline:none;"></textarea>
          </div>

          <div class="citation-modal-footer" style="display:flex; justify-content:space-between; align-items:center; margin-top:1.2rem; flex-wrap:wrap; gap:0.8rem;">
            <span class="citation-feedback" style="font-size:0.8rem; color:var(--accent-emerald, #10b981); font-weight:600; display:none;">✓ Cita copiada al portapapeles</span>
            <div style="display:flex; gap:0.6rem; margin-left:auto;">
              <button type="button" class="pill-btn pill-btn--gold citation-copy-btn">
                <span>📋</span> <span>Copiar Cita</span>
              </button>
              <button type="button" class="pill-btn citation-download-btn" style="background:rgba(255,255,255,0.08); color:var(--text-primary);">
                <span>📥</span> <span>Descargar .bib</span>
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(backdrop);

      backdrop.querySelector('.citation-close-btn').addEventListener('click', () => {
        backdrop.classList.remove('active');
      });
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) backdrop.classList.remove('active');
      });
    }

    const textarea = backdrop.querySelector('.citation-textarea');
    const copyBtn = backdrop.querySelector('.citation-copy-btn');
    const downloadBtn = backdrop.querySelector('.citation-download-btn');
    const feedback = backdrop.querySelector('.citation-feedback');
    const tabBtns = backdrop.querySelectorAll('.citation-tab-btn');

    const updateContent = (format) => {
      tabBtns.forEach(b => {
        if (b.getAttribute('data-format') === format) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });

      if (format === 'apa') {
        textarea.value = generateAPA(item);
        textarea.rows = 3;
        downloadBtn.style.display = 'none';
      } else if (format === 'chicago') {
        textarea.value = generateChicago(item);
        textarea.rows = 3;
        downloadBtn.style.display = 'none';
      } else if (format === 'bibtex') {
        textarea.value = generateBibTeX(item);
        textarea.rows = 7;
        downloadBtn.style.display = 'inline-flex';
      }
    };

    tabBtns.forEach(btn => {
      btn.onclick = () => updateContent(btn.getAttribute('data-format'));
    });

    copyBtn.onclick = () => {
      navigator.clipboard.writeText(textarea.value).then(() => {
        feedback.style.display = 'inline-block';
        copyBtn.querySelector('span:last-child').textContent = '¡Copiado!';
        setTimeout(() => {
          feedback.style.display = 'none';
          copyBtn.querySelector('span:last-child').textContent = 'Copiar Cita';
        }, 2200);
      });
    };

    downloadBtn.onclick = () => {
      const bib = generateBibTeX(item);
      const filename = `${(item.bibtexKey || 'cita').toLowerCase().replace(/[^a-z0-9]/g, '_')}.bib`;
      downloadFile(filename, bib, 'application/x-bibtex');
    };

    updateContent('apa');
    backdrop.classList.add('active');
  }

  return {
    generateAPA,
    generateChicago,
    generateBibTeX,
    downloadFile,
    openModal
  };
})();


