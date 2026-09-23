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
      resultsContainer.appendChild(row);
    });
  }

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
        fetch('data/censo_maestro_115_pueblos_indigenas.json').then(r => r.ok ? r.json() : null).catch(() => null)
      ];

      const [
        precolombina, colonia, sigloXIX, sigloXX, regiones,
        indigCaribe, indigPacifico, indigAndes, indigOrinoquia, indigAmazonia, secretosAmazonia,
        vaupesTukano, apaporisArawak, nomadasMaku, caquetaChiribiquete, guainiaInirida,
        llanosFrontera, darienCaribe, andesInterandinos, censoMaestro
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

      // 6. Pueblos Indígenas del Caribe y Sierra Nevada
      if (indigCaribe && indigCaribe.pueblos) {
        const caribePueblos = Array.isArray(indigCaribe.pueblos) ? indigCaribe.pueblos : Object.values(indigCaribe.pueblos);
        caribePueblos.forEach(p => {
          searchDatabase.push({
            title: `Pueblo ${p.nombre || p.etnonimo} (${p.familia_linguistica || 'Caribe / Sierra'})`,
            category: "Pueblo Indígena Caribe",
            url: "otras-culturas.html",
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
            url: "otras-culturas.html",
            desc: (p.cosmovision || p.descripcion || p.territorio_y_distribucion || '').substring(0, 140)
          });
        });
      }

      // 8. Pueblos Indígenas de los Andes y Macizo
      if (indigAndes && indigAndes.pueblos_indigenas) {
        indigAndes.pueblos_indigenas.forEach(p => {
          searchDatabase.push({
            title: `Pueblo ${p.nombre || p.denominacion || p.id} (${p.familia_linguistica || 'Andes'})`,
            category: "Pueblo Indígena Andino",
            url: "otras-culturas.html",
            desc: (p.cosmovision || p.descripcion_etnografica || p.territorio || '').substring(0, 140)
          });
        });
      }

      // 9. Pueblos Indígenas de la Orinoquía y Llanos
      if (indigOrinoquia && indigOrinoquia.pueblos_indigenas) {
        indigOrinoquia.pueblos_indigenas.forEach(p => {
          searchDatabase.push({
            title: `Pueblo ${p.nombre || p.autodenominacion} (${p.familia_linguistica})`,
            category: "Pueblo Indígena Orinoquía",
            url: "otras-culturas.html",
            desc: (p.cosmovision || p.descripcion || '').substring(0, 140)
          });
        });
      }

      // 10. Pueblos Indígenas de la Amazonía Profunda
      if (indigAmazonia && indigAmazonia.pueblos_indigenas) {
        indigAmazonia.pueblos_indigenas.forEach(p => {
          searchDatabase.push({
            title: `Pueblo ${p.nombre || p.autonimo} (${p.familia_linguistica})`,
            category: "Pueblo Indígena Amazonía",
            url: "otras-culturas.html",
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
          searchDatabase.push({
            title: `Pueblo ${p.nombre_comun || p.nombre} (${p.filiacion_linguistica?.idioma || 'Tukano Oriental'})`,
            category: "Pueblo Indígena Vaupés",
            url: "otras-culturas.html",
            desc: (p.cosmovision_y_filosofia?.mito_origen || p.resumen || p.significado_etnonimo || '').substring(0, 140)
          });
        });
      }

      // 13. Clanes del Apaporis y Arawak
      if (apaporisArawak && apaporisArawak.naciones_indigenas) {
        apaporisArawak.naciones_indigenas.forEach(p => {
          searchDatabase.push({
            title: `Pueblo ${p.nombre || p.id} (${p.perfil_etnolinguistico?.afiliacion_linguistica || 'Apaporis'})`,
            category: "Pueblo Indígena Apaporis",
            url: "otras-culturas.html",
            desc: (p.cosmologia_y_mitologia?.anaconda_canoa || p.resumen || '').substring(0, 140)
          });
        });
      }

      // 14. Nómadas Nadahup / Makú
      if (nomadasMaku && nomadasMaku.monografias_detalladas_pueblos) {
        Object.values(nomadasMaku.monografias_detalladas_pueblos).forEach(p => {
          searchDatabase.push({
            title: `Pueblo ${p.pueblo || p.nombre || p.id} (${p.linguistica?.familia || 'Nadahup / Makú'})`,
            category: "Pueblo Indígena Nómada",
            url: "otras-culturas.html",
            desc: (p.etnoecologia_y_patron_nomada?.ciclos_estacionales || p.resumen || '').substring(0, 140)
          });
        });
      }

      // 15. Caquetá, Putumayo y Chiribiquete
      if (caquetaChiribiquete && caquetaChiribiquete.pueblos_indigenas) {
        caquetaChiribiquete.pueblos_indigenas.forEach(p => {
          searchDatabase.push({
            title: `Pueblo ${p.nombre || p.id} (${p.filiacion_linguistica?.familia || 'Caquetá / Putumayo'})`,
            category: "Pueblo Indígena Caquetá",
            url: "otras-culturas.html",
            desc: (p.cosmovision_y_mitologia?.origen_sagrado || p.resumen || '').substring(0, 140)
          });
        });
      }

      // 16. Cuenca de Guainía, Atabapo e Inírida
      if (guainiaInirida && guainiaInirida.pueblos_indigenas) {
        guainiaInirida.pueblos_indigenas.forEach(p => {
          searchDatabase.push({
            title: `Pueblo ${p.nombre || p.id} (${p.filiacion_linguistica?.familia || 'Guainía / Río Negro'})`,
            category: "Pueblo Indígena Guainía",
            url: "otras-culturas.html",
            desc: (p.cosmovision_y_mitologia?.ciclo_mitico || p.resumen || '').substring(0, 140)
          });
        });
      }

      // 17. Sabanas Fronterizas de Arauca y Vichada
      if (llanosFrontera && llanosFrontera.pueblos_indigenas_sabanas_fronterizas) {
        llanosFrontera.pueblos_indigenas_sabanas_fronterizas.forEach(p => {
          searchDatabase.push({
            title: `Pueblo ${p.nombre || p.id} (${p.filiacion_linguistica?.familia || 'Llanos / Sabanas'})`,
            category: "Pueblo Indígena Llanos",
            url: "otras-culturas.html",
            desc: (p.cosmovision_y_espiritualidad?.origen_mitico || p.resumen || '').substring(0, 140)
          });
        });
      }

      // 18. Darién y Caribe Remanente
      if (darienCaribe && darienCaribe.pueblos) {
        darienCaribe.pueblos.forEach(p => {
          searchDatabase.push({
            title: `Pueblo ${p.nombre || p.id} (${p.filiacion_linguistica?.familia || 'Darién / Caribe'})`,
            category: "Pueblo Indígena Darién / Caribe",
            url: "otras-culturas.html",
            desc: (p.cosmovision_y_espiritualidad?.origen_sagrado || p.resumen || '').substring(0, 140)
          });
        });
      }

      // 19. Valles Interandinos y Cauca
      if (andesInterandinos && andesInterandinos.pueblos_indigenas) {
        andesInterandinos.pueblos_indigenas.forEach(p => {
          searchDatabase.push({
            title: `Pueblo ${p.nombre || p.id} (${p.filiacion_linguistica?.familia || 'Andes Interandinos'})`,
            category: "Pueblo Indígena Andino",
            url: "otras-culturas.html",
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
            url: "otras-culturas.html",
            desc: `Nación indígena colombiana en ${p.region} (${p.depto}). Familia lingüística: ${p.familia}. Reconocida por DANE y ONIC.`
          });
        });
      }

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
