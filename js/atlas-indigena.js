/**
 * Gran Atlas Vivo de los Pueblos Indígenas de Colombia
 * Colombianopedia - Sistema Interactivo de Etnografía Nacional
 * 
 * Consume dinámicamente el censo maestro de 115 naciones y los 13 datasets
 * regionales temáticos en 'data/' (~1.87 MB de acervos estructurados).
 */

(function () {
  'use strict';

  // ==========================================
  // CONFIGURACIÓN DE FUENTES DE DATOS
  // ==========================================
  const DATA_SOURCES = {
    censo: 'data/censo_maestro_115_pueblos_indigenas.json',
    vaupes_tukanas: 'data/tribus_vaupes_tukanas.json',
    apaporis_arawak: 'data/tribus_apaporis_arawak.json',
    nomadas_maku: 'data/tribus_nomadas_maku.json',
    caqueta_chiribiquete: 'data/tribus_caqueta_chiribiquete.json',
    guainia_inirida: 'data/tribus_guainia_inirida.json',
    llanos_frontera: 'data/tribus_llanos_frontera.json',
    darien_caribe: 'data/tribus_darien_caribe_remanente.json',
    andes_interandinos: 'data/tribus_andes_interandinos.json',
    caribe_sierra_nevada: 'data/indigenas_caribe_sierra_nevada.json',
    pacifico_choco: 'data/indigenas_pacifico_choco.json',
    andes_macizo: 'data/indigenas_andes_macizo.json',
    orinoquia_sabanas: 'data/indigenas_orinoquia_sabanas.json',
    amazonia_etnografia: 'data/indigenas_amazonia_etnografia.json',
    secretos_amazonia: 'data/secretos_amazonia_documentada.json'
  };

  // Macro-regiones oficiales requeridas
  const MACRO_REGIONS = [
    { id: 'all', label: 'Todos (115)', count: 115 },
    { id: 'caribe_sierra', label: 'Caribe y Sierra Nevada', count: 11 },
    { id: 'pacifico_choco', label: 'Pacífico y Chocó', count: 7 },
    { id: 'andes_macizo', label: 'Andes y Macizo', count: 21 },
    { id: 'orinoquia_sabanas', label: 'Orinoquía y Sabanas', count: 18 },
    { id: 'amazonia_profunda', label: 'Amazonía Profunda', count: 58 }
  ];

  // Listado oficial de pueblos priorizados en Auto 004/2009 de la Corte Constitucional
  const AUTO_004_PUEBLOS_SET = new Set([
    'awa', 'kankuamo', 'wiwa', 'jiw', 'nukak', 'nukak_maku', 'sikuani', 'embera',
    'embera_katio', 'embera_chami', 'embera_dobida', 'embera_eyabida', 'wounaan',
    'zenu', 'yanacona', 'pastos', 'quillacingas', 'pijao', 'nasa', 'misak', 'hitnu',
    'cuiba', 'saliba', 'achagua', 'piapoco', 'huitoto', 'bora', 'ocaina', 'muinane',
    'andoke', 'karijona', 'coreguaje', 'siona', 'kofan', 'tariano', 'makuna',
    'yukpa', 'chimila', 'betoye', 'eperara_siapidara', 'barasano', 'wayuu', 'totoro'
  ]);

  // Aliases de enlace directo entre censo y monografías regionales
  const DIRECT_MONOGRAPH_ALIASES = {
    'barasano_del_sur': 'barasana',
    'barasano_norte': 'barasano_del_norte',
    'kuna_tule': 'guna_dule',
    'hupda_maku': 'hupda_jupda',
    'kakua_maku': 'kakua_bara_maku',
    'embera_katio': 'embera',
    'embera_chami': 'embera',
    'embera_eyabida': 'embera',
    'embera_dobida': 'embera',
    'yuri': 'yuri',
    'passe': 'passe',
    'carabayo': 'carabayo',
    'chimila': 'chimila_ette_ennaka',
    'sikuani': 'sikuani',
    'zenu': 'zenu',
    'wayuu': 'wayuu'
  };

  // ==========================================
  // ESTADO GLOBAL DE LA APLICACIÓN
  // ==========================================
  const State = {
    rawDatasets: {},
    allPueblos: [],
    monographsIndex: new Map(),
    activeRegion: 'all',
    activeFamily: 'all',
    searchQuery: '',
    currentOpenPueblo: null,
    currentActiveTab: 'cosmovision'
  };

  // ==========================================
  // UTILIDADES DE TEXTO Y LIMPIEZA
  // ==========================================
  function cleanString(str) {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function highlightMatches(text, query) {
    if (!text) return '';
    if (!query || query.trim() === '') return escapeHTML(text);

    const safeText = escapeHTML(text);
    const escapedQuery = query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return safeText.replace(regex, '<mark class="atlas-highlight">$1</mark>');
  }

  // ==========================================
  // CLASIFICACIÓN REGIONAL Y LINGÜÍSTICA
  // ==========================================
  function classifyMacroRegion(pueblo) {
    const reg = (pueblo.region || '') + ' ' + (pueblo.depto || '');
    if (/caribe|sierra nevada|perij[aá]|guajira|cesar|magdalena/i.test(pueblo.region)) {
      if (!/antioquia.*choc[oó]/i.test(reg)) return 'Caribe y Sierra Nevada';
    }
    if (/pac[ií]fico|choc[oó]|dari[eé]n/i.test(pueblo.region)) {
      return 'Pacífico y Chocó';
    }
    if (/andina|macizo|magdalena medio|nari[nñ]o|cauca|huila|tolima|santander|boyac[aá]|cundinamarca/i.test(pueblo.region)) {
      return 'Andes y Macizo';
    }
    if (/orinoqu[ií]a|sabana|llanos|meta|vichada|arauca|casanare/i.test(pueblo.region)) {
      return 'Orinoquía y Sabanas';
    }
    if (/amazon[ií]a|vaup[eé]s|chiribiquete|sibundoy|guain[ií]a|pur[eé]|mirit[ií]|apaporis|caquet[aá]|putumayo|amazonas/i.test(pueblo.region)) {
      return 'Amazonía Profunda';
    }
    return 'Amazonía Profunda';
  }

  function classifyMacroFamily(familyStr) {
    if (!familyStr) return 'Otras / En Reemergencia';
    const f = familyStr.toLowerCase();
    if (f.includes('arawak')) return 'Arawak';
    if (f.includes('chibcha')) return 'Chibcha';
    if (f.includes('tukano') || f.includes('tucano')) return 'Tukano';
    if (f.includes('nadahup') || f.includes('maku') || f.includes('makú') || f.includes('kakua')) return 'Nadahup / Makú';
    if (f.includes('caribe')) return 'Caribe';
    if (f.includes('barbacoa')) return 'Barbacoana';
    if (f.includes('guahib')) return 'Guahibana';
    if (f.includes('choco') || f.includes('chocó')) return 'Chocó';
    if (f.includes('huitoto') || f.includes('witoto') || f.includes('bora') || f.includes('muinane') || f.includes('andoke')) return 'Witoto-Bora';
    if (f.includes('saliba') || f.includes('sáliba') || f.includes('piaroa')) return 'Sáliba-Piaroa';
    if (f.includes('quechua') || f.includes('inga')) return 'Quechua';
    if (f.includes('tupi') || f.includes('tupí')) return 'Tupí-Guaraní';
    if (f.includes('tikuna') || f.includes('yuri') || f.includes('yurí')) return 'Tikuna-Yurí';
    if (f.includes('aislada') || f.includes('paezana') || f.includes('kamentsa') || f.includes('kamëntsá') || f.includes('peba') || f.includes("a'ingae")) {
      return 'Lenguas Aisladas / Independientes';
    }
    return 'Otras / En Reemergencia';
  }

  // ==========================================
  // CARGA ASÍNCRONA DE DATOS
  // ==========================================
  async function loadAllDatasets() {
    const loadingBanner = document.getElementById('atlas-loading-indicator');
    const loadingText = document.getElementById('atlas-loading-text');

    const totalFiles = Object.keys(DATA_SOURCES).length;
    let loadedCount = 0;

    const promises = Object.entries(DATA_SOURCES).map(async ([key, path]) => {
      try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`HTTP ${response.status} en ${path}`);
        const data = await response.json();
        loadedCount++;
        if (loadingText) {
          loadingText.textContent = `Sincronizando acervos etnográficos y censo maestro (${loadedCount}/${totalFiles})...`;
        }
        return { key, data };
      } catch (err) {
        console.warn(`[Gran Atlas] Aviso: no se pudo cargar ${path}:`, err);
        return { key, data: null };
      }
    });

    const results = await Promise.all(promises);
    results.forEach(({ key, data }) => {
      if (data) State.rawDatasets[key] = data;
    });

    if (loadingBanner) {
      loadingBanner.style.opacity = '0';
      setTimeout(() => {
        loadingBanner.style.display = 'none';
      }, 400);
    }
  }

  // ==========================================
  // EXTRACCIÓN Y NORMALIZACIÓN DE PUEBLOS
  // ==========================================
  function indexMonographs() {
    const index = State.monographsIndex;

    Object.entries(State.rawDatasets).forEach(([fileKey, dataset]) => {
      if (!dataset || fileKey === 'censo') return;

      const candidates = [];

      for (const [k, v] of Object.entries(dataset)) {
        if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') {
          if (['monografias_exhaustivas_de_las_ocho_naciones', 'naciones_indigenas', 'pueblos_indigenas', 'pueblos', 'pueblos_indigenas_sabanas_fronterizas'].includes(k)) {
            candidates.push(...v);
          }
        } else if (k === 'monografias_detalladas_pueblos' && typeof v === 'object' && v !== null) {
          for (const [subk, subv] of Object.entries(v)) {
            if (typeof subv === 'object') {
              const copy = { ...subv };
              if (!copy.id) copy.id = subk;
              candidates.push(copy);
            }
          }
        }
      }

      candidates.forEach(pueblo => {
        const id = pueblo.id || (pueblo.identificacion && pueblo.identificacion.id);
        if (id) {
          index.set(cleanString(id), { fileKey, pueblo });
        }
        const names = [
          pueblo.nombre,
          pueblo.nombre_comun,
          pueblo.autonimo,
          pueblo.autodenominacion,
          pueblo.autoetnonimo,
          pueblo.identificacion && pueblo.identificacion.nombre_comun
        ];
        names.forEach(name => {
          if (typeof name === 'string' && name.trim().length > 2) {
            index.set(cleanString(name), { fileKey, pueblo });
          }
        });
      });
    });
  }

  function buildMasterNations() {
    const censoList = (State.rawDatasets.censo && State.rawDatasets.censo.catalogo_completo_115) || [];

    State.allPueblos = censoList.map((cItem, index) => {
      const cleanId = cleanString(cItem.id);
      const cleanName = cleanString(cItem.nombre);

      // Búsqueda de monografía asociada
      let matchedMono = null;
      const targetAlias = DIRECT_MONOGRAPH_ALIASES[cItem.id] || cItem.id;
      const cleanAlias = cleanString(targetAlias);

      if (State.monographsIndex.has(cleanAlias)) {
        matchedMono = State.monographsIndex.get(cleanAlias);
      } else if (State.monographsIndex.has(cleanId)) {
        matchedMono = State.monographsIndex.get(cleanId);
      } else if (State.monographsIndex.has(cleanName)) {
        matchedMono = State.monographsIndex.get(cleanName);
      } else {
        for (const [key, value] of State.monographsIndex.entries()) {
          if ((cleanId.length > 3 && key.includes(cleanId)) || (key.length > 3 && cleanId.includes(key))) {
            matchedMono = value;
            break;
          }
        }
      }

      const monoData = matchedMono ? matchedMono.pueblo : {};
      const fileKey = matchedMono ? matchedMono.fileKey : null;

      // Autodenominación vernácula enriquecida
      let vernacula = monoData.autonimo ||
        monoData.autodenominacion ||
        monoData.autoetnonimo ||
        (monoData.identificacion && monoData.identificacion.autonimo_ipa) ||
        extractParentheses(cItem.nombre);

      if (!vernacula || vernacula === cItem.nombre) {
        vernacula = deriveVernacularName(cItem.nombre, cItem.familia);
      }

      // Demografía estimada
      const demografia = extractDemografia(monoData, cItem);

      // Estado de protección Auto 004
      const isAuto004 = AUTO_004_PUEBLOS_SET.has(cItem.id) ||
        AUTO_004_PUEBLOS_SET.has(cleanId) ||
        (monoData.situacion_juridica_y_auto_004 != null) ||
        JSON.stringify(monoData).toLowerCase().includes('auto 004');

      const macroRegion = classifyMacroRegion(cItem);
      const macroFamily = classifyMacroFamily(cItem.familia);

      return {
        id: cItem.id,
        indexNum: index + 1,
        nombre: cItem.nombre,
        vernacula: vernacula,
        familia: cItem.familia,
        macroFamilia: macroFamily,
        region: macroRegion,
        subregion: cItem.region,
        depto: cItem.depto,
        demografia: demografia,
        isAuto004: isAuto004,
        fileKey: fileKey,
        monoData: monoData
      };
    });
  }

  function extractParentheses(str) {
    if (!str) return '';
    const match = str.match(/\(([^)]+)\)/);
    return match ? match[1] : '';
  }

  function deriveVernacularName(nombre, familia) {
    const clean = nombre.replace(/\([^)]+\)/g, '').trim();
    return clean;
  }

  function extractDemografia(mono, censo) {
    if (!mono) return 'Registrado en Censo Nacional';
    if (typeof mono.poblacion_estimada_colombia === 'number') {
      return `${mono.poblacion_estimada_colombia.toLocaleString('es-CO')} personas`;
    }
    if (mono.demografia) {
      if (typeof mono.demografia === 'string') return mono.demografia;
      if (typeof mono.demografia === 'object') {
        const p = mono.demografia.poblacion_total_colombia_censo_dane_2018 ||
                  mono.demografia.censo_dane_2018 ||
                  mono.demografia.total_censado_dane_2018 ||
                  mono.demografia.poblacion_estimada_total;
        if (p) return `${p} (Censo DANE)`;
      }
    }
    if (mono.demografia_y_censo) {
      if (typeof mono.demografia_y_censo === 'string') return mono.demografia_y_censo;
      if (typeof mono.demografia_y_censo.poblacion_total === 'string') return mono.demografia_y_censo.poblacion_total;
    }
    return 'Población protegida por Resguardos Ancestrales';
  }

  // ==========================================
  // CONSTRUCCIÓN DEL CONTENIDO DE PESTAÑAS (6 TABS)
  // ==========================================
  function generateTabContent(pueblo, tabKey) {
    const mono = pueblo.monoData || {};
    const fileKey = pueblo.fileKey;
    const raw = State.rawDatasets[fileKey] || {};

    switch (tabKey) {
      case 'cosmovision':
        return buildCosmovisionTab(pueblo, mono, raw);
      case 'medicina':
        return buildMedicinaTab(pueblo, mono, raw);
      case 'tecnologias':
        return buildTecnologiasTab(pueblo, mono, raw);
      case 'arquitectura':
        return buildArquitecturaTab(pueblo, mono, raw);
      case 'lideres':
        return buildLideresTab(pueblo, mono, raw);
      case 'derechos':
        return buildDerechosTab(pueblo, mono, raw);
      default:
        return '<p class="atlas-empty-note">Seleccione una dimensión monográfica.</p>';
    }
  }

  // 1. COSMOVISIÓN Y MITOS
  function buildCosmovisionTab(pueblo, mono, raw) {
    let specificContent = '';

    const cosmoFields = [
      'cosmovision_y_mito_de_origen',
      'cosmovision_y_filosofia',
      'cosmogonia_rituales_y_espiritualidad',
      'cosmovision_y_espiritualidad',
      'cosmovision_y_mitologia_fundacional',
      'cosmovision_y_mitologia',
      'cosmovision_resumen'
    ];

    for (const f of cosmoFields) {
      if (mono[f]) {
        specificContent += renderStructuredField(mono[f], 'Cosmovisión Específica y Mitos Fundacionales');
        break;
      }
    }

    let regionalCosmo = '';
    if (pueblo.region === 'Caribe y Sierra Nevada') {
      regionalCosmo = `
        <div class="atlas-monograph-card">
          <h4><span class="atlas-icon">🌌</span> La Ley de Origen y la Filosofía de Aluna</h4>
          <p>Para los pueblos de la Sierra Nevada (Kogui, Arhuaco, Wiwa y Kankuamo), <strong>Aluna</strong> es la dimensión espiritual e intangible donde el cosmos existió en forma de pensamiento puro antes de condensarse en la materia física. Los <em>Mamos</em> (sabios espirituales) mantienen el equilibrio de la Madre Tierra (<strong>Séshizha</strong>) mediante el pagamento espiritual (<em>Ezwama</em>) a lo largo de la sagrada <strong>Línea Negra</strong>.</p>
        </div>
      `;
    } else if (pueblo.region === 'Pacífico y Chocó') {
      regionalCosmo = `
        <div class="atlas-monograph-card">
          <h4><span class="atlas-icon">🌊</span> Los Tres Mundos y la Creación de Caragabí</h4>
          <p>En la cosmología Chocó (Emberá y Wounaan), el cosmos está estratificado en tres esferas: el supramundo de los espíritus celestes, el mundo intermedio humano (<em>Dona</em>) y el inframundo de las fuerzas telúricas y de agua (gobernado por los <em>Jai</em>). <strong>Caragabí</strong> es el héroe civilizador que arrancó el árbol de agua para formar los ríos navegables del Chocó.</p>
        </div>
      `;
    } else if (pueblo.region === 'Andes y Macizo') {
      regionalCosmo = `
        <div class="atlas-monograph-card">
          <h4><span class="atlas-icon">⛰️</span> Uma Kiwe: La Madre Tierra y los Espíritus del Agua</h4>
          <p>En el pensamiento Nasa y del Macizo Colombiano, <strong>Uma Kiwe</strong> es un ser vivo que siente y respira. Las lagunas de páramo son úteros cósmicos de donde nacieron los héroes protectores como <strong>Juan Tama de la Estrella</strong> y <strong>Llibán</strong> (hijo del Trueno). Los <em>The'walas</em> armonizan a la comunidad mediante la lectura del pulso corporal.</p>
        </div>
      `;
    } else if (pueblo.region === 'Orinoquía y Sabanas') {
      regionalCosmo = `
        <div class="atlas-monograph-card">
          <h4><span class="atlas-icon">🌳</span> Kaliawiri: El Árbol Primordial de los Alimentos</h4>
          <p>El mito del árbol <strong>Kaliawiri</strong> narra cómo en el inicio de los tiempos existía un solo árbol que producía todos los frutos, semillas y yucas. Al ser talado por los seres creadores primordiales, su tronco cayó convirtiéndose en las serranías de la Orinoquía y sus ramas derramaron los ríos y las plantas cultivables por las sabanas.</p>
        </div>
      `;
    } else {
      regionalCosmo = `
        <div class="atlas-monograph-card">
          <h4><span class="atlas-icon">🐍</span> La Anaconda Ancestral de la Creación (He Biki / Canoa Culebra)</h4>
          <p>En la cosmovisión de las naciones amazónicas y tukanas, la humanidad emergió de la <strong>Canoa Anaconda</strong> que ascendió desde el Océano de Leche (la Vía Láctea) a través del Río Amazonas, Río Negro y Río Vaupés, parando en cada raudal sagrado (<em>Ipanoré</em>) para desembarcar a los ancestros de cada clan clanil con sus cantos y bastones de mando.</p>
        </div>
      `;
    }

    return `
      <div class="atlas-tab-pane">
        <h3 class="atlas-tab-title">🌌 Cosmovisión, Deidades y Mitos de Origen</h3>
        ${specificContent || '<div class="atlas-monograph-card"><p>Tradición cosmogónica resguardada por linajes de sabedores y ancianos del consejo territorial.</p></div>'}
        ${regionalCosmo}
      </div>
    `;
  }

  // 2. MEDICINA Y FARMACOPEA
  function buildMedicinaTab(pueblo, mono, raw) {
    let specificContent = '';

    const medFields = [
      'medicina_ancestral_y_farmacopea',
      'farmacopea_sagrada_y_medicina_tradicional',
      'medicina_botanica_y_chamanismo',
      'medicina_tradicional_farmacopea_y_travesia',
      'medicina_farmacologia_y_chamanismo',
      'sistema_medico_chamanismo_y_etnobotanica',
      'medicina_y_sabiduria',
      'sistema_chamanico_y_medicina',
      'medicina_botanica_y_ritos_sagrados'
    ];

    for (const f of medFields) {
      if (mono[f]) {
        specificContent += renderStructuredField(mono[f], 'Farmacopea Tradicional y Botánica Propia');
        break;
      }
    }

    // Cuadro de Plantas Maestras y Principios Activos
    const masterPlantsHTML = `
      <div class="atlas-monograph-card">
        <h4><span class="atlas-icon">🌿</span> Matriz de Plantas Maestras, Bioquímica y Farmacopea Sagrada</h4>
        <div class="atlas-table-responsive">
          <table class="atlas-data-table">
            <thead>
              <tr>
                <th>Planta / Remedio</th>
                <th>Nombre Científico</th>
                <th>Principio Activo</th>
                <th>Uso Ritual y Curativo</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Coca / Mambe / Ayú</strong></td>
                <td><em>Erythroxylum coca</em></td>
                <td>Alcaloides tropánicos (metilecgonina)</td>
                <td>Mambeadas con ceniza de yarumo o cal de concha en el poporo; abre la palabra dulce y disipa el cansancio.</td>
              </tr>
              <tr>
                <td><strong>Yagé / Ayahuasca</strong></td>
                <td><em>Banisteriopsis caapi</em> + <em>Diplopterys cabrerana</em></td>
                <td>Harmina, Harmalina y N,N-DMT</td>
                <td>Liana sagrada para purga espiritual, diagnosis de enfermedades y viaje perceptivo a los orígenes cósmicos.</td>
              </tr>
              <tr>
                <td><strong>Tabaco / Ambil</strong></td>
                <td><em>Nicotiana tabacum</em> / <em>N. rustica</em></td>
                <td>Nicotina natural concentrada</td>
                <td>Pasta cocida de ambil o rapé; limpia las vías energéticas y sella acuerdos comunitarios y rezos de protección.</td>
              </tr>
              <tr>
                <td><strong>Yopo</strong></td>
                <td><em>Anadenanthera peregrina</em></td>
                <td>Bufotenina y 5-MeO-DMT</td>
                <td>Polvo de semillas tostadas inhalado con tubos de hueso; conexión directa con los dueños espirituales de los morichales.</td>
              </tr>
              <tr>
                <td><strong>Curare</strong></td>
                <td><em>Strychnos toxifera</em> / <em>Chondrodendron</em></td>
                <td>D-tubocurarina</td>
                <td>Veneno neuromuscular para cerbatanas de cacería; bloquea receptores nicotínicos sin alterar la carne consumible.</td>
              </tr>
              <tr>
                <td><strong>Jagua / Kipará</strong></td>
                <td><em>Genipa americana</em></td>
                <td>Genipina</td>
                <td>Pintura corporal ceremonial que repele insectos, hongos y radiación solar, además de marcar clanes e iniciaciones.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    return `
      <div class="atlas-tab-pane">
        <h3 class="atlas-tab-title">🌿 Farmacopea Sagrada, Chamanismo y Plantas Maestras</h3>
        ${specificContent}
        ${masterPlantsHTML}
      </div>
    `;
  }

  // 3. TECNOLOGÍAS Y CULTIVO
  function buildTecnologiasTab(pueblo, mono, raw) {
    let specificContent = '';

    const tecFields = [
      'tecnologias_y_cultura_material',
      'sistemas_productivos_y_tecnologias',
      'formas_de_cultivo_y_tecnologias',
      'soberania_alimentaria',
      'cultivo_y_tecnologia_yuca_brava',
      'tecnologias_materiales',
      'tecnologias_emblematicas',
      'formas_de_cultivo_y_chagra_agroforestal',
      'economia_y_tecnologias_ancestrales',
      'arqueologia_y_tecnologias'
    ];

    for (const f of tecFields) {
      if (mono[f]) {
        specificContent += renderStructuredField(mono[f], 'Tecnologías Propias y Sistemas de Cultivo');
        break;
      }
    }

    const agroTechHTML = `
      <div class="atlas-monograph-card">
        <h4><span class="atlas-icon">🌾</span> Complejo Tecnológico Agroforestal: La Chagra, el Tul y la Yuca Brava</h4>
        <div class="atlas-feature-grid">
          <div class="atlas-feature-box">
            <strong>El Sebucán o Tipití</strong>
            <p>Prensa tubular elástica de fibra vegetal (cumare o tirite) que comprime mecánicamente la masa de yuca brava (<em>Manihot esculenta</em>) para exprimir el jugo cianogénico mortal (<em>yare</em>), transformándolo en fariña, casabe y salsa cocida <em>tucupí</em>.</p>
          </div>
          <div class="atlas-feature-box">
            <strong>La Chagra Agroforestal</strong>
            <p>Sistema milenario de policultivo estratificado por niveles de altura: palmas de dosel (canangucha, asaí), estrato medio (plátano, chontaduro, yuca) y sotobosque (ají, piña, plantas medicinales), con rotación y barbecho de 15 años sin químicos.</p>
          </div>
          <div class="atlas-feature-box">
            <strong>Macroingeniería Zenú y Terrazas</strong>
            <p>Red prehispánica de más de 500.000 hectáreas de camellones artificiales y canales hidráulicos en el San Jorge y Sinú, capaces de controlar crecientes estacionales y generar estanques piscícolas permanentes con microverticalidad ecológica.</p>
          </div>
          <div class="atlas-feature-box">
            <strong>Cestería Matemática y Tejeduría</strong>
            <p>Canastos <em>balay</em> (waja) con geometrías cosmológicas en caña brava; cestería de Werregue en el Pacífico con tintes minerales; y mochilas de lana y algodón tejidas como mapas del pensamiento y la matriz de la vida.</p>
          </div>
        </div>
      </div>
    `;

    return `
      <div class="atlas-tab-pane">
        <h3 class="atlas-tab-title">🌾 Tecnologías Ancestrales, Chagra y Sistemas de Cultivo</h3>
        ${specificContent}
        ${agroTechHTML}
      </div>
    `;
  }

  // 4. ARQUITECTURA SAGRADA
  function buildArquitecturaTab(pueblo, mono, raw) {
    let specificContent = '';

    const arqFields = [
      'arquitectura_sagrada_y_vivienda',
      'arquitectura_sagrada_la_maloca_tukana_wii',
      'arquitectura_sagrada_la_maloca',
      'arquitectura_sagrada_y_espacio_cosmico',
      'arquitectura_e_ingenieria_fluvial',
      'arquitectura_textileria_y_simbologia',
      'arquitectura_tradicional',
      'modo_de_vida_nomada_y_campamento_he_waya'
    ];

    for (const f of arqFields) {
      if (mono[f]) {
        specificContent += renderStructuredField(mono[f], 'Arquitectura Sagrada y Espacio Habitacional');
        break;
      }
    }

    const archArchetypesHTML = `
      <div class="atlas-monograph-card">
        <h4><span class="atlas-icon">🏛️</span> Los Cuatro Monumentos Arquitectónicos Sagrados de Colombia</h4>
        <div class="atlas-feature-grid">
          <div class="atlas-feature-box">
            <strong>1. La Maloca Amazónica (Wii / Komünerü)</strong>
            <p>El cosmos viviente en madera y palma de caraná. Su cumbrera orientada Este-Oeste sigue el recorrido del sol. Los cuatro postes centrales (<em>kumu yuka</em>) encarnan los pilares del universo, y en su centro se ubica el <strong>mambeadero</strong> nocturno para el diálogo de paz.</p>
          </div>
          <div class="atlas-feature-box">
            <strong>2. La Kankurwa de la Sierra Nevada</strong>
            <p>Templo cónico circular erigido sobre lajas de piedra pulida con vigas de madera incorruptible y techo de paja que culmina en dos varas orientadas a los solsticios. Espacio de deliberación donde los Mamos mayores realizan el pagamento espiritual.</p>
          </div>
          <div class="atlas-feature-box">
            <strong>3. El Tambo Palafítico del Pacífico</strong>
            <p>Vivienda comunitaria elevada sobre pilotes de madera de mangle o chonta a 3 metros del suelo para sortear mareas y crecientes de ríos torrenciales. Estructura abierta sin muros ciegos que facilita la ventilación bioclimática natural en la pluviselva.</p>
          </div>
          <div class="atlas-feature-box">
            <strong>4. La Tulpa Andina del Macizo</strong>
            <p>El fogón circular de tres piedras sagradas que preside la casa comunal Nasa y Misak. En torno al fuego se templa la palabra comunitaria, se educa a los jóvenes y se planifican las asambleas territoriales del Cabildo y la Guardia.</p>
          </div>
        </div>
      </div>
    `;

    return `
      <div class="atlas-tab-pane">
        <h3 class="atlas-tab-title">🏛️ Arquitectura Sagrada, Templos Cósmicos y Hábitat Vernáculo</h3>
        ${specificContent}
        ${archArchetypesHTML}
      </div>
    `;
  }

  // 5. LÍDERES Y RESISTENCIA
  function buildLideresTab(pueblo, mono, raw) {
    let specificContent = '';

    const lidFields = [
      'historia_y_resistencia',
      'liderazgo_politico_y_resistencia_historica',
      'liderazgo_historia_y_resistencia',
      'memoria_historica_y_retos',
      'memoria_historica_genocidio_y_resistencia',
      'liderazgo_cosmovision_y_ley_de_origen',
      'historia_contacto_y_resistencia',
      'lucha_historica_y_resistencia',
      'reivindicacion_y_proceso_de_reetnizacion'
    ];

    for (const f of lidFields) {
      if (mono[f]) {
        specificContent += renderStructuredField(mono[f], 'Memoria Histórica y Héroes de la Resistencia');
        break;
      }
    }

    const heroesHTML = `
      <div class="atlas-monograph-card">
        <h4><span class="atlas-icon">🏹</span> Héroes de la Dignidad Indígena y la Resistencia Histórica</h4>
        <div class="atlas-timeline-list">
          <div class="atlas-timeline-entry">
            <span class="atlas-badge">1538 &bull; Siglo XVI</span>
            <strong>La Cacica Gaitana (Guaitipán)</strong>
            <p>Líder del Alto Magdalena que organizó la confederación de naciones Yalcones, Pijaos y Paeces frente al régimen de encomiendas de Pedro de Añasco, encarnando la dignidad inquebrantable de los pueblos andinos.</p>
          </div>
          <div class="atlas-timeline-entry">
            <span class="atlas-badge">Siglo XVII</span>
            <strong>Juan Tama de la Estrella</strong>
            <p>Sabio legislador y cacique Nasa nacido míticamente de la laguna de Juan Tama. Obtuvo de la Corona española los títulos reales de los Resguardos de Pitayó, Jambaló y Toribío, blindando la propiedad inalienable de las tierras comunales.</p>
          </div>
          <div class="atlas-timeline-entry">
            <span class="atlas-badge">1880–1967</span>
            <strong>Manuel Quintín Lame Chantre</strong>
            <p>Líder nasa que combatió el terraje y la servidumbre feudal en Cauca y Tolima. Redactó tratados de filosofía jurídica autóctona (<em>En defensa de mi raza</em>) y sentó las bases del movimiento comunal de los cabildos.</p>
          </div>
          <div class="atlas-timeline-entry">
            <span class="atlas-badge">1950–2001</span>
            <strong>Kimy Pernía Domicó</strong>
            <p>Gran líder Emberá Katío del Alto Sinú, defensor de los derechos bioculturales del río Sinú frente a la represa de Urrá; mártir de la defensa ambiental desaparecido forzadamente por su denuncia internacional.</p>
          </div>
          <div class="atlas-timeline-entry">
            <span class="atlas-badge">Presente &bull; Siglo XXI</span>
            <strong>Guardia Indígena Nacional (Kiwe Thegnas)</strong>
            <p>Cuerpo de protección civil desarmado y pacífico reconocido internacionalmente (Premio Front Line Defenders). Portan bastones de mando de chonta con cintas de colores para expulsar actores armados y resguardar la autonomía comunitaria.</p>
          </div>
        </div>
      </div>
    `;

    return `
      <div class="atlas-tab-pane">
        <h3 class="atlas-tab-title">🏹 Líderes Históricos, Memorias de Dignidad y Guardia Indígena</h3>
        ${specificContent}
        ${heroesHTML}
      </div>
    `;
  }

  // 6. DERECHOS Y PROTECCIÓN CONSTITUCIONAL
  function buildDerechosTab(pueblo, mono, raw) {
    let specificContent = '';

    const jurFields = [
      'situacion_juridica_y_auto_004',
      'marco_juridico_derechos_colectivos_y_auto_004',
      'marco_juridico_y_jurisprudencia_constitucional',
      'drama_humanitario_relaciones_interetnicas_y_derechos',
      'defensa_de_titulos_colectivos_resguardos_y_derechos_bioculturales',
      'estado_vulnerabilidad_actual',
      'retos_actuales',
      'gobernanza_y_retos_actuales'
    ];

    for (const f of jurFields) {
      if (mono[f]) {
        specificContent += renderStructuredField(mono[f], 'Situación Jurídica y Derechos Territoriales');
        break;
      }
    }

    const auto004AlertHTML = pueblo.isAuto004 ? `
      <div class="atlas-alert-box atlas-alert-warning">
        <h4>⚖️ Pueblo Amparado por el Auto 004 de 2009 de la Corte Constitucional</h4>
        <p>La Corte Constitucional de Colombia declaró a esta nación en <strong>grave riesgo inminente de exterminio físico y cultural</strong> debido a las dinámicas del conflicto armado, el despojo territorial, el desplazamiento forzado y el confinamiento, ordenando al Gobierno Nacional la creación urgente de un <em>Plan de Salvaguarda Étnica</em> con consulta previa obligatoria.</p>
      </div>
    ` : `
      <div class="atlas-alert-box atlas-alert-info">
        <h4>⚖️ Blindaje Territorial Constitucional</h4>
        <p>Amparado por los artículos 7, 8, 10, 246 y 330 de la Constitución Política de Colombia de 1991, así como el Convenio 169 de la OIT sobre propiedad colectiva inembargable, inalienable e imprescriptible.</p>
      </div>
    `;

    const jurisprudenceHTML = `
      <div class="atlas-monograph-card">
        <h4><span class="atlas-icon">📜</span> Hitos Jurisprudenciales y Blindaje de Derechos Colectivos</h4>
        <div class="atlas-feature-grid">
          <div class="atlas-feature-box">
            <strong>Constitución Política de 1991</strong>
            <p>Reconoce el carácter pluriétnico y multicultural de Colombia (Art. 7), consagra la oficialidad de las lenguas indígenas en sus territorios (Art. 10) y dota de validez legal a la <strong>Jurisdicción Especial Indígena</strong> (Art. 246).</p>
          </div>
          <div class="atlas-feature-box">
            <strong>Convenio 169 de la OIT (Ley 21 de 1991)</strong>
            <p>Establece la <strong>Consulta Previa, Libre e Informada</strong> como derecho fundamental de obligatorio cumplimiento antes de cualquier concesión minera, petrolera, hidroeléctrica o legislativa que impacte sus territorios ancestrales.</p>
          </div>
          <div class="atlas-feature-box">
            <strong>Sentencia T-025 de 2004</strong>
            <p>Declara el <em>Estado de Cosas Inconstitucional</em> por la crisis humanitaria del desplazamiento forzado y crea la Sala Especial de Seguimiento para proteger las vidas de las poblaciones étnicas en Colombia.</p>
          </div>
          <div class="atlas-feature-box">
            <strong>Decreto 1232 de 2018 (PIACI)</strong>
            <p>Establece el régimen de intangibilidad territorial y no contacto obligatorio para los <em>Pueblos Indígenas en Aislamiento Voluntario</em> (como los Yuri, Passé y Carabayo en el PNN Río Puré), previniendo su exterminio biológico.</p>
          </div>
        </div>
      </div>
    `;

    return `
      <div class="atlas-tab-pane">
        <h3 class="atlas-tab-title">⚖️ Derechos Colectivos, Auto 004/2009 y Jurisprudencia Constitucional</h3>
        ${auto004AlertHTML}
        ${specificContent}
        ${jurisprudenceHTML}
      </div>
    `;
  }

  // ==========================================
  // FORMATEO DE CAMPOS COMPLEJOS Y OBJETOS
  // ==========================================
  function renderStructuredField(data, defaultTitle) {
    if (!data) return '';

    if (typeof data === 'string') {
      return `
        <div class="atlas-monograph-card">
          <h4>${escapeHTML(defaultTitle)}</h4>
          <p>${escapeHTML(data).replace(/\n/g, '<br>')}</p>
        </div>
      `;
    }

    if (Array.isArray(data)) {
      const items = data.map(item => {
        if (typeof item === 'string') return `<li>${escapeHTML(item)}</li>`;
        if (typeof item === 'object') return `<li>${JSON.stringify(item)}</li>`;
        return `<li>${item}</li>`;
      }).join('');
      return `
        <div class="atlas-monograph-card">
          <h4>${escapeHTML(defaultTitle)}</h4>
          <ul class="atlas-bullet-list">${items}</ul>
        </div>
      `;
    }

    if (typeof data === 'object') {
      let cards = '';
      for (const [key, val] of Object.entries(data)) {
        const title = formatKeyTitle(key);
        if (typeof val === 'string') {
          cards += `
            <div class="atlas-subfield">
              <strong>${escapeHTML(title)}:</strong>
              <p>${escapeHTML(val)}</p>
            </div>
          `;
        } else if (Array.isArray(val)) {
          const listHtml = val.map(x => `<li>${escapeHTML(typeof x === 'object' ? JSON.stringify(x) : String(x))}</li>`).join('');
          cards += `
            <div class="atlas-subfield">
              <strong>${escapeHTML(title)}:</strong>
              <ul class="atlas-bullet-list">${listHtml}</ul>
            </div>
          `;
        } else if (typeof val === 'object' && val !== null) {
          cards += `
            <div class="atlas-subfield">
              <strong>${escapeHTML(title)}:</strong>
              <pre class="atlas-code-block">${escapeHTML(JSON.stringify(val, null, 2))}</pre>
            </div>
          `;
        }
      }
      return `
        <div class="atlas-monograph-card">
          <h4>${escapeHTML(defaultTitle)}</h4>
          <div class="atlas-subfields-container">${cards}</div>
        </div>
      `;
    }

    return '';
  }

  function formatKeyTitle(key) {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  // ==========================================
  // RENDERIZADO DE LA GRILLA DE TARJETAS
  // ==========================================
  function renderCardsGrid() {
    const grid = document.getElementById('atlas-grid');
    const counterBadge = document.getElementById('atlas-results-count');
    const query = State.searchQuery.trim().toLowerCase();

    if (!grid) return;

    // Filtrar pueblos
    const filtered = State.allPueblos.filter(pueblo => {
      // Filtro de Región
      if (State.activeRegion !== 'all') {
        const targetRegionObj = MACRO_REGIONS.find(r => r.id === State.activeRegion);
        if (targetRegionObj && pueblo.region !== targetRegionObj.label) {
          return false;
        }
      }

      // Filtro de Familia
      if (State.activeFamily !== 'all') {
        if (pueblo.macroFamilia !== State.activeFamily) {
          return false;
        }
      }

      // Filtro de Búsqueda Predictiva en Vivo
      if (query !== '') {
        const textToSearch = cleanString([
          pueblo.nombre,
          pueblo.vernacula,
          pueblo.familia,
          pueblo.region,
          pueblo.subregion,
          pueblo.depto,
          pueblo.id
        ].join(' '));

        const cleanQ = cleanString(query);
        if (!textToSearch.includes(cleanQ)) {
          return false;
        }
      }

      return true;
    });

    // Actualizar contador
    if (counterBadge) {
      counterBadge.textContent = `${filtered.length} de ${State.allPueblos.length} naciones`;
    }

    // Estado vacío si no hay coincidencias
    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="atlas-empty-state">
          <div class="atlas-empty-icon">🔍</div>
          <h3>No se hallaron naciones con los filtros seleccionados</h3>
          <p>Intenta con otro término de búsqueda o restablece los filtros de región y familia lingüística.</p>
          <button type="button" class="btn btn-secondary" id="btn-reset-filters">Restablecer Todos los Filtros</button>
        </div>
      `;
      const btnReset = document.getElementById('btn-reset-filters');
      if (btnReset) {
        btnReset.addEventListener('click', resetFilters);
      }
      return;
    }

    // Renderizado eficiente con DocumentFragment
    const fragment = document.createDocumentFragment();

    filtered.forEach(pueblo => {
      const card = document.createElement('div');
      card.className = 'atlas-card';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('data-id', pueblo.id);

      const highlightedName = highlightMatches(pueblo.nombre, State.searchQuery);
      const highlightedVernacula = highlightMatches(pueblo.vernacula, State.searchQuery);
      const highlightedDepto = highlightMatches(pueblo.depto, State.searchQuery);

      const auto004Badge = pueblo.isAuto004 ? `
        <span class="atlas-badge atlas-badge-warning" title="Amparado por el Auto 004/2009 de la Corte Constitucional">
          ⚖️ Auto 004
        </span>
      ` : '';

      card.innerHTML = `
        <div class="atlas-card-header">
          <div class="atlas-card-title-group">
            <span class="atlas-card-num">#${String(pueblo.indexNum).padStart(3, '0')}</span>
            <h3 class="atlas-card-title">${highlightedName}</h3>
          </div>
          <div class="atlas-card-vernacular">
            Autodenominación: <em>${highlightedVernacula}</em>
          </div>
        </div>

        <div class="atlas-card-badges">
          <span class="atlas-badge atlas-badge-family" title="Familia Lingüística">
            🗣️ ${escapeHTML(pueblo.familia)}
          </span>
          <span class="atlas-badge atlas-badge-region" title="Región Natural">
            📍 ${escapeHTML(pueblo.region)}
          </span>
          ${auto004Badge}
        </div>

        <div class="atlas-card-meta">
          <div class="atlas-meta-row">
            <span class="atlas-meta-label">Cuencas / Territorio:</span>
            <span class="atlas-meta-value">${highlightedDepto}</span>
          </div>
          <div class="atlas-meta-row">
            <span class="atlas-meta-label">Demografía censal:</span>
            <span class="atlas-meta-value">${escapeHTML(pueblo.demografia)}</span>
          </div>
        </div>

        <div class="atlas-card-footer">
          <button type="button" class="atlas-btn-explore" aria-label="Abrir monografía de ${escapeHTML(pueblo.nombre)}">
            <span>Explorar Monografía</span>
            <span class="atlas-arrow">&rarr;</span>
          </button>
        </div>
      `;

      // Apertura del Drawer al hacer clic o presionar Enter
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        openMonographDrawer(pueblo);
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          openMonographDrawer(pueblo);
        }
      });

      fragment.appendChild(card);
    });

    grid.innerHTML = '';
    grid.appendChild(fragment);
  }

  // ==========================================
  // PANEL DESLIZANTE LATERAL (DRAWER MONOGRÁFICO)
  // ==========================================
  function openMonographDrawer(pueblo) {
    State.currentOpenPueblo = pueblo;

    const drawer = document.getElementById('atlas-drawer');
    const backdrop = document.getElementById('atlas-backdrop');
    if (!drawer || !backdrop) return;

    // Header del Drawer
    const titleEl = document.getElementById('drawer-pueblo-title');
    const vernacularEl = document.getElementById('drawer-pueblo-vernacular');
    const familyEl = document.getElementById('drawer-pueblo-family');
    const regionEl = document.getElementById('drawer-pueblo-region');
    const deptoEl = document.getElementById('drawer-pueblo-depto');
    const demoEl = document.getElementById('drawer-pueblo-demo');
    const auto004El = document.getElementById('drawer-pueblo-auto004');

    if (titleEl) titleEl.textContent = pueblo.nombre;
    if (vernacularEl) vernacularEl.textContent = pueblo.vernacula;
    if (familyEl) familyEl.textContent = pueblo.familia;
    if (regionEl) regionEl.textContent = pueblo.region;
    if (deptoEl) deptoEl.textContent = pueblo.depto;
    if (demoEl) demoEl.textContent = pueblo.demografia;

    if (auto004El) {
      if (pueblo.isAuto004) {
        auto004El.style.display = 'inline-flex';
        auto004El.textContent = '⚖️ Protegido por Auto 004/2009 (Corte Constitucional)';
      } else {
        auto004El.style.display = 'none';
      }
    }

    // Cargar contenido de la pestaña activa (por defecto Cosmovisión)
    State.currentActiveTab = 'cosmovision';
    updateDrawerTabsUI();
    renderActiveTabContent();

    // Mostrar drawer
    drawer.classList.add('open');
    backdrop.classList.add('open');
    document.body.classList.add('atlas-drawer-open');

    // Mover foco accesible
    const closeBtn = document.getElementById('drawer-close-btn');
    if (closeBtn) closeBtn.focus();
  }

  function closeMonographDrawer() {
    const drawer = document.getElementById('atlas-drawer');
    const backdrop = document.getElementById('atlas-backdrop');
    if (drawer) drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    document.body.classList.remove('atlas-drawer-open');
    State.currentOpenPueblo = null;
  }

  function updateDrawerTabsUI() {
    const tabButtons = document.querySelectorAll('.atlas-drawer-tab');
    tabButtons.forEach(btn => {
      const tabKey = btn.getAttribute('data-tab');
      if (tabKey === State.currentActiveTab) {
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      }
    });
  }

  function renderActiveTabContent() {
    const contentArea = document.getElementById('drawer-tab-content');
    if (!contentArea || !State.currentOpenPueblo) return;

    contentArea.innerHTML = `
      <div class="atlas-tab-loading">
        <div class="atlas-mini-spinner"></div>
        <span>Cargando dimensión monográfica...</span>
      </div>
    `;

    setTimeout(() => {
      contentArea.innerHTML = generateTabContent(State.currentOpenPueblo, State.currentActiveTab);
      contentArea.scrollTop = 0;
    }, 50);
  }

  // ==========================================
  // EVENTOS Y CONTROLES INTERACTIVOS
  // ==========================================
  function setupEventListeners() {
    // 1. Buscador Predictivo en Vivo
    const searchInput = document.getElementById('atlas-search-input');
    const searchClear = document.getElementById('atlas-search-clear');

    if (searchInput) {
      let debounceTimeout = null;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimeout);
        const val = e.target.value;
        debounceTimeout = setTimeout(() => {
          State.searchQuery = val;
          if (searchClear) {
            searchClear.style.display = val.length > 0 ? 'block' : 'none';
          }
          renderCardsGrid();
        }, 120);
      });
    }

    if (searchClear && searchInput) {
      searchClear.addEventListener('click', () => {
        searchInput.value = '';
        State.searchQuery = '';
        searchClear.style.display = 'none';
        searchInput.focus();
        renderCardsGrid();
      });
    }

    // 2. Pills de Región Natural
    const regionPills = document.querySelectorAll('.atlas-region-pill');
    regionPills.forEach(pill => {
      pill.addEventListener('click', () => {
        regionPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        State.activeRegion = pill.getAttribute('data-region') || 'all';
        renderCardsGrid();
      });
    });

    // 3. Dropdown de Familia Lingüística
    const familySelect = document.getElementById('atlas-family-select');
    if (familySelect) {
      familySelect.addEventListener('change', (e) => {
        State.activeFamily = e.target.value;
        renderCardsGrid();
      });
    }

    // 4. Pestañas del Drawer
    const drawerTabs = document.querySelectorAll('.atlas-drawer-tab');
    drawerTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabKey = tab.getAttribute('data-tab');
        if (tabKey && tabKey !== State.currentActiveTab) {
          State.currentActiveTab = tabKey;
          updateDrawerTabsUI();
          renderActiveTabContent();
        }
      });
    });

    // 5. Cierre del Drawer
    const closeBtn = document.getElementById('drawer-close-btn');
    const backdrop = document.getElementById('atlas-backdrop');

    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMonographDrawer();
      });
    }

    if (backdrop) {
      backdrop.addEventListener('click', () => {
        closeMonographDrawer();
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const drawer = document.getElementById('atlas-drawer');
        if (drawer && drawer.classList.contains('open')) {
          closeMonographDrawer();
        }
      }
    });

    // Botón de restablecer filtros en cabecera si existe
    const headerResetBtn = document.getElementById('atlas-reset-all');
    if (headerResetBtn) {
      headerResetBtn.addEventListener('click', resetFilters);
    }
  }

  function resetFilters() {
    State.activeRegion = 'all';
    State.activeFamily = 'all';
    State.searchQuery = '';

    const searchInput = document.getElementById('atlas-search-input');
    const searchClear = document.getElementById('atlas-search-clear');
    if (searchInput) searchInput.value = '';
    if (searchClear) searchClear.style.display = 'none';

    const familySelect = document.getElementById('atlas-family-select');
    if (familySelect) familySelect.value = 'all';

    const regionPills = document.querySelectorAll('.atlas-region-pill');
    regionPills.forEach(p => {
      if (p.getAttribute('data-region') === 'all') {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });

    renderCardsGrid();
  }

  function populateFamilySelect() {
    const select = document.getElementById('atlas-family-select');
    if (!select) return;

    // Calcular frecuencias de macro-familias
    const familyCounts = {};
    State.allPueblos.forEach(p => {
      familyCounts[p.macroFamilia] = (familyCounts[p.macroFamilia] || 0) + 1;
    });

    const sortedFamilies = Object.entries(familyCounts).sort((a, b) => b[1] - a[1]);

    let optionsHTML = '<option value="all">Todas las Familias Lingüísticas (115)</option>';
    sortedFamilies.forEach(([fam, count]) => {
      optionsHTML += `<option value="${escapeHTML(fam)}">${escapeHTML(fam)} (${count})</option>`;
    });

    select.innerHTML = optionsHTML;
  }

  // ==========================================
  // INICIALIZACIÓN PRINCIPAL
  // ==========================================
  async function initAtlas() {
    try {
      await loadAllDatasets();
      indexMonographs();
      buildMasterNations();
      populateFamilySelect();
      setupEventListeners();
      renderCardsGrid();
    } catch (err) {
      console.error('[Gran Atlas] Error durante la inicialización:', err);
      const grid = document.getElementById('atlas-grid');
      if (grid) {
        grid.innerHTML = `
          <div class="atlas-empty-state">
            <div class="atlas-empty-icon">⚠️</div>
            <h3>Error al cargar los datos etnográficos</h3>
            <p>${escapeHTML(err.message)}</p>
          </div>
        `;
      }
    }
  }

  // Ejecución cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAtlas);
  } else {
    initAtlas();
  }

})();
