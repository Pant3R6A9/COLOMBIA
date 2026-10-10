/**
 * ==============================================================================
 * CENTRO DE INVESTIGACIÓN Y CONSULTA DE LA COMISIÓN DE LA VERDAD (CEV)
 * Basado en los 10 Tomos del Informe Final 'Hay Futuro si Hay Verdad' y HRDAG
 * ==============================================================================
 */

(function initCentroVerdad() {
  let datasets = {
    forense: null,
    historico: null,
    recomendaciones: null,
    territorioHumano: null
  };

  let isLoaded = false;

  async function loadAllCEVData() {
    if (isLoaded) return datasets;
    try {
      const [resForense, resHistorico, resRecom, resTerritorio] = await Promise.all([
        fetch('data/cev_datos_forenses_dih.json').then(r => r.json()),
        fetch('data/cev_relato_historico_etapas.json').then(r => r.json()),
        fetch('data/cev_hallazgos_recomendaciones.json').then(r => r.json()),
        fetch('data/cev_territorio_etnico_humano.json').then(r => r.json())
      ]);

      datasets.forense = resForense;
      datasets.historico = resHistorico;
      datasets.recomendaciones = resRecom;
      datasets.territorioHumano = resTerritorio;
      isLoaded = true;
      return datasets;
    } catch (err) {
      console.error('Error cargando datasets de la Comisión de la Verdad:', err);
      return null;
    }
  }

  // Inicializar al cargar el DOM
  document.addEventListener('DOMContentLoaded', () => {
    setupTomoCardsInteractivity();
    setupForenseSearchFilter();

    const dossierCiteBtn = document.getElementById('dossier-cite-btn');
    if (dossierCiteBtn) {
      dossierCiteBtn.addEventListener('click', () => {
        if (window.ColombianopediaCitations) {
          window.ColombianopediaCitations.openModal({
            title: "Dossier Especial: Memoria, Verdad y Secretos de la Amazonía",
            author: "Colombianopedia & Comisión para el Esclarecimiento de la Verdad",
            year: "2026",
            bibtexKey: "colombianopedia_memoria_amazonia_2026",
            url: `${window.location.origin}/memoria.html`,
            note: "Arqueología Pleistocénica de Chiribiquete, Terra Preta, Genocidio Cauchero e Informe Final de la CEV."
          });
        }
      });
    }
  });

  /**
   * Configura las tarjetas de los 10 tomos para abrir expedientes exhaustivos
   */
  function setupTomoCardsInteractivity() {
    const cards = document.querySelectorAll('.tomo-card');
    cards.forEach((card, index) => {
      const tomoIndex = index + 1; // 1 a 10
      card.setAttribute('data-tomo-num', tomoIndex);
      // Reemplazar data-drawer genérico con apertura dinámica personalizada
      card.removeAttribute('data-drawer');
      card.style.cursor = 'pointer';

      card.addEventListener('click', (e) => {
        e.preventDefault();
        openTomoExpedienteModal(tomoIndex);
      });
    });
  }

  /**
   * Abre el cajón lateral con el expediente de máxima densidad por cada tomo
   */
  async function openTomoExpedienteModal(tomoNum) {
    const data = await loadAllCEVData();
    if (!data) return;

    let drawer = document.querySelector('.detail-drawer');
    if (!drawer) {
      drawer = document.createElement('div');
      drawer.className = 'detail-drawer';
      drawer.innerHTML = `
        <button class="drawer-close" aria-label="Cerrar panel">&times;</button>
        <div class="drawer-content"></div>
      `;
      document.body.appendChild(drawer);
      drawer.querySelector('.drawer-close').addEventListener('click', () => {
        drawer.classList.remove('open');
      });
    }

    const content = drawer.querySelector('.drawer-content');
    content.innerHTML = renderTomoDetailedHTML(tomoNum, data);

    // Inyectar barra de acciones académicas (Citar y Descargar)
    const actionStrip = document.createElement('div');
    actionStrip.className = 'tomo-actions-strip';
    actionStrip.style.cssText = 'display:flex; gap:0.6rem; margin-bottom:1.2rem; flex-wrap:wrap;';
    actionStrip.innerHTML = `
      <button type="button" class="atlas-action-btn tomo-cite-btn" title="Citar este Tomo en APA 7, Chicago y BibTeX">
        <span>📜</span> <span>Citar este Tomo</span>
      </button>
      <button type="button" class="atlas-action-btn atlas-action-btn--emerald tomo-export-btn" title="Descargar expediente en Markdown">
        <span>📥</span> <span>Descargar Expediente (.md)</span>
      </button>
    `;

    const subTitle = content.querySelector('div[style*="font-family:var(--font-mono)"]') || content.querySelector('h2');
    if (subTitle) {
      subTitle.after(actionStrip);
    } else {
      content.prepend(actionStrip);
    }

    actionStrip.querySelector('.tomo-cite-btn').addEventListener('click', () => {
      const tomoTitle = content.querySelector('h2') ? content.querySelector('h2').textContent.trim() : `Tomo ${tomoNum}`;
      if (window.ColombianopediaCitations) {
        window.ColombianopediaCitations.openModal({
          title: `Informe Final: Hay Futuro si Hay Verdad. Tomo ${String(tomoNum).padStart(2, '0')}: ${tomoTitle}`,
          author: `Comisión para el Esclarecimiento de la Verdad, la Convivencia y la No Repetición (CEV)`,
          year: "2022",
          bibtexKey: `cev_tomo_${tomoNum}_2022`,
          url: `${window.location.origin}/memoria.html#comision-verdad`,
          note: `Publicación oficial del Estado colombiano y el Sistema Integral para la Paz. Presidencia Padre Francisco de Roux.`
        });
      }
    });

    actionStrip.querySelector('.tomo-export-btn').addEventListener('click', () => {
      const tomoTitle = content.querySelector('h2') ? content.querySelector('h2').textContent.trim() : `Tomo ${tomoNum}`;
      const textData = content.innerText || content.textContent;
      const mdContent = `# COMISIÓN DE LA VERDAD (CEV) — INFORME FINAL (2022)
## TOMO ${String(tomoNum).padStart(2, '0')}: ${tomoTitle.toUpperCase()}
**Entidad Responsable:** Comisión para el Esclarecimiento de la Verdad, la Convivencia y la No Repetición  
**Presidencia:** Padre Francisco de Roux  
**Fecha Oficial:** 28 de junio de 2022  
**Portal de Consulta:** Colombianopedia (https://colombianopedia.vercel.app/memoria.html)

---

${textData}

---
*Ficha descargada desde Colombianopedia — Acervo Nacional de la Memoria y la Paz.*
`;
      if (window.ColombianopediaCitations) {
        window.ColombianopediaCitations.downloadFile(`cev_tomo_${String(tomoNum).padStart(2, '0')}_expediente.md`, mdContent);
      }
    });

    drawer.classList.add('open');

    // Inicializar pestañas internas del drawer
    setupInnerDrawerTabs(content);
  }

  /**
   * Renderiza el contenido estructurado de cada tomo
   */
  function renderTomoDetailedHTML(tomoNum, data) {
    switch (tomoNum) {
      case 1:
        return `
          <div class="document-badge" style="background:rgba(212,175,55,0.15); color:var(--accent-gold, #d4af37);">Tomo 01 • Ética y Nación</div>
          <h2 style="font-family:var(--font-title, serif); color:#fff; margin-bottom:0.6rem;">Convocatoria a la Paz Grande</h2>
          <div style="font-family:var(--font-mono); font-size:0.75rem; color:#94a3b8; margin-bottom:1.5rem;">
            Declaración Institucional del Pleno de Comisionados • Presidencia Padre Francisco de Roux
          </div>
          <div class="drawer-tabs-nav" style="display:flex; gap:0.5rem; margin-bottom:1.5rem; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:0.5rem;">
            <button class="tomo-subtab active" data-tab="tab-declaracion">Proclama Ética</button>
            <button class="tomo-subtab" data-tab="tab-principios">Bases de Reconciliación</button>
          </div>
          <div class="tomo-subtab-pane active" id="tab-declaracion">
            <blockquote style="border-left:3px solid var(--accent-gold, #d4af37); padding-left:1.2rem; font-style:italic; color:#fef08a; margin-bottom:1.5rem; line-height:1.7;">
              «Traemos un mensaje de dolor y de esperanza a la sociedad colombiana. Nos resistimos a aceptar que el sufrimiento de más de nueve millones de víctimas haya sido inevitable. La verdad nos llama a mirarnos sin miedo, a reconocer las responsabilidades éticas colectivas y a construir un porvenir donde nunca más un ser humano sea asesinado por sus ideas.»
            </blockquote>
            <p style="color:#cbd5e1; font-size:0.95rem; line-height:1.8;">
              El Tomo 01 no es un inventario forense, sino la interpelación moral a la nación: examina cómo una democracia formal convivió durante seis décadas con masacres cotidianas y por qué es indispensable que el dolor de los campesinos, indígenas y soldados sea asumido como propio por las élites y la ciudadanía urbana.
            </p>
          </div>
          <div class="tomo-subtab-pane" id="tab-principios" style="display:none;">
            <h4 style="color:#fff; margin-bottom:0.8rem; font-family:var(--font-title);">Los Tres Pilares de la Paz Grande:</h4>
            <ul style="color:#cbd5e1; font-size:0.9rem; line-height:1.7; padding-left:1.2rem;">
              <li><strong>1. Ruptura de la Normalización:</strong> Superar la indiferencia ante la muerte violenta y desterrar la justificación ideológica de cualquier homicidio.</li>
              <li><strong>2. Reconocimiento de Responsabilidades:</strong> Compromiso del Estado, guerrillas, paramilitares y terceros civiles de reconocer el daño sin atenuantes.</li>
              <li><strong>3. Transformación Institucional:</strong> Garantizar que las instituciones de seguridad y justicia sirvan a la ciudadanía y no a doctrinas de guerra perpetua.</li>
            </ul>
          </div>
        `;

      case 2:
        const rec = data.recomendaciones;
        return `
          <div class="document-badge" style="background:rgba(16,185,129,0.15); color:#10b981;">Tomo 02 • Factores Estructurales</div>
          <h2 style="font-family:var(--font-title, serif); color:#fff; margin-bottom:0.6rem;">Hallazgos y Recomendaciones</h2>
          <div style="font-family:var(--font-mono); font-size:0.75rem; color:#94a3b8; margin-bottom:1.5rem;">
            Diagnóstico de Persistencia y Agenda de 88 Reformas de Estado
          </div>
          <div class="drawer-tabs-nav" style="display:flex; gap:0.5rem; margin-bottom:1.5rem; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:0.5rem;">
            <button class="tomo-subtab active" data-tab="tab-factores">4 Factores de Persistencia</button>
            <button class="tomo-subtab" data-tab="tab-recom">Recomendaciones de No Repetición</button>
          </div>
          <div class="tomo-subtab-pane active" id="tab-factores">
            ${rec.cuatro_factores_persistencia.map(f => `
              <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:1.2rem; margin-bottom:1rem;">
                <h4 style="color:var(--accent-gold, #d4af37); margin-bottom:0.5rem; font-size:1.05rem;">${f.titulo}</h4>
                <p style="color:#cbd5e1; font-size:0.88rem; line-height:1.6; margin-bottom:0.6rem;">${f.diagnostico_cev}</p>
                <div style="font-size:0.8rem; color:#f87171; border-top:1px dashed rgba(255,255,255,0.1); padding-top:0.5rem;">
                  <strong>Impacto:</strong> ${f.impacto_documentado}
                </div>
              </div>
            `).join('')}
          </div>
          <div class="tomo-subtab-pane" id="tab-recom" style="display:none;">
            ${rec.bloques_recomendaciones_no_repeticion.map(b => `
              <div style="margin-bottom:1.5rem;">
                <h4 style="color:#38bdf8; font-family:var(--font-title); font-size:1rem; margin-bottom:0.4rem;">${b.nombre_eje}</h4>
                <p style="color:#94a3b8; font-size:0.82rem; margin-bottom:0.6rem;">${b.descripcion}</p>
                <ul style="color:#cbd5e1; font-size:0.85rem; line-height:1.6; padding-left:1.2rem;">
                  ${b.recomendaciones_clave.map(r => `<li>${r}</li>`).join('')}
                </ul>
              </div>
            `).join('')}
          </div>
        `;

      case 3:
        const hist = data.historico;
        return `
          <div class="document-badge" style="background:rgba(239,68,68,0.15); color:#ef4444;">Tomo 03 • Historia Forense</div>
          <h2 style="font-family:var(--font-title, serif); color:#fff; margin-bottom:0.6rem;">No Matarás: Las 5 Etapas del Conflicto</h2>
          <div style="font-family:var(--font-mono); font-size:0.75rem; color:#94a3b8; margin-bottom:1.5rem;">
            Historiografía Analítica Integral (1958 – 2016)
          </div>
          <div class="tomo-timeline-accordion">
            ${hist.periodizacion_cinco_etapas.map(et => `
              <div style="background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:1.2rem; margin-bottom:1.2rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                  <span style="font-family:var(--font-mono); font-size:0.75rem; color:var(--accent-gold, #d4af37); font-weight:700;">ETAPA ${et.etapa_numero} (${et.periodo_anos})</span>
                </div>
                <h4 style="color:#fff; font-family:var(--font-title); font-size:1.1rem; margin-bottom:0.6rem;">${et.nombre_etapa}</h4>
                <p style="color:#cbd5e1; font-size:0.88rem; line-height:1.6; margin-bottom:1rem;">${et.contexto_politico_nacional}</p>
                <div style="border-left:2px solid #38bdf8; padding-left:1rem; margin-bottom:0.8rem;">
                  <strong style="color:#38bdf8; font-size:0.8rem; text-transform:uppercase; letter-spacing:0.05em;">Hitos Críticos:</strong>
                  ${et.hitos_militares_y_sociales.map(h => `
                    <div style="margin-top:0.4rem; font-size:0.82rem; color:#e2e8f0;">
                      <span style="color:var(--accent-gold); font-weight:700;">${h.ano}:</span> <strong>${h.hito}</strong> — ${h.descripcion}
                    </div>
                  `).join('')}
                </div>
                <div style="font-size:0.82rem; color:#94a3b8; font-style:italic; border-top:1px dashed rgba(255,255,255,0.1); padding-top:0.5rem;">
                  <strong>Tesis CEV:</strong> ${et.tesis_explicativa_cev}
                </div>
              </div>
            `).join('')}
          </div>
        `;

      case 4:
        const forData = data.forense;
        const c = forData.cifras_consolidadas_verificadas;
        return `
          <div class="document-badge" style="background:rgba(239,68,68,0.2); color:#f87171;">Tomo 04 • Infracciones al DIH & DD.HH.</div>
          <h2 style="font-family:var(--font-title, serif); color:#fff; margin-bottom:0.6rem;">Hasta la Guerra Tiene Límites</h2>
          <div style="font-family:var(--font-mono); font-size:0.75rem; color:#94a3b8; margin-bottom:1.5rem;">
            Cruce de 112 Bases de Datos con HRDAG & JEP (1958 – 2016)
          </div>
          <div class="drawer-tabs-nav" style="display:flex; gap:0.5rem; margin-bottom:1.5rem; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:0.5rem;">
            <button class="tomo-subtab active" data-tab="tab-cifras">Telemetría de Víctimas</button>
            <button class="tomo-subtab" data-tab="tab-patrones">Macro-Patrones Forenses</button>
            <button class="tomo-subtab" data-tab="tab-voces">Testimonios Desclasificados</button>
          </div>
          <div class="tomo-subtab-pane active" id="tab-cifras">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1.5rem;">
              <div style="background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.3); border-radius:6px; padding:1rem; text-align:center;">
                <div style="font-size:1.8rem; font-weight:800; color:#ef4444; font-family:var(--font-mono);">${c.homicidios_conflicto.total_estimado_integrado.toLocaleString('es-CO')}</div>
                <div style="font-size:0.75rem; color:#cbd5e1; text-transform:uppercase;">Homicidios en Conflicto (80% civiles)</div>
              </div>
              <div style="background:rgba(212,175,55,0.08); border:1px solid rgba(212,175,55,0.3); border-radius:6px; padding:1rem; text-align:center;">
                <div style="font-size:1.8rem; font-weight:800; color:var(--accent-gold); font-family:var(--font-mono);">${c.desaparicion_forzada.total_victimas_documentadas.toLocaleString('es-CO')}</div>
                <div style="font-size:0.75rem; color:#cbd5e1; text-transform:uppercase;">Desaparición Forzada (Hornos y Ríos)</div>
              </div>
              <div style="background:rgba(56,189,248,0.08); border:1px solid rgba(56,189,248,0.3); border-radius:6px; padding:1rem; text-align:center;">
                <div style="font-size:1.8rem; font-weight:800; color:#38bdf8; font-family:var(--font-mono);">${c.desplazamiento_forzado.total_victimas_acumuladas.toLocaleString('es-CO')}</div>
                <div style="font-size:0.75rem; color:#cbd5e1; text-transform:uppercase;">Desplazados Forzados (8.2M personas)</div>
              </div>
              <div style="background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.3); border-radius:6px; padding:1rem; text-align:center;">
                <div style="font-size:1.8rem; font-weight:800; color:#10b981; font-family:var(--font-mono);">${c.secuestro_toma_rehenes.total_victimas.toLocaleString('es-CO')}</div>
                <div style="font-size:0.75rem; color:#cbd5e1; text-transform:uppercase;">Secuestros Documentados</div>
              </div>
            </div>
            <div style="background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:1.2rem;">
              <h4 style="color:#fff; font-size:0.95rem; margin-bottom:0.6rem;">Distribución de Responsabilidad en Homicidios (HRDAG):</h4>
              <p style="font-size:0.85rem; color:#cbd5e1; line-height:1.6;">
                • Paramilitares: 45.0% (~205.000 víctimas)<br>
                • Guerrillas: 27.0% (~122.000 víctimas)<br>
                • Agentes Estatales directos e indirectos: 16.0% (~74.000 víctimas)<br>
                • No identificado / otros: 12.0%
              </p>
            </div>
          </div>
          <div class="tomo-subtab-pane" id="tab-patrones" style="display:none;">
            ${forData.macro_patrones_criminales_forenses.map(p => `
              <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:1.2rem; margin-bottom:1.2rem;">
                <span style="font-family:var(--font-mono); font-size:0.75rem; color:#f87171; font-weight:700;">${p.id}</span>
                <h4 style="color:#fff; font-size:1.05rem; margin-bottom:0.4rem;">${p.nombre}</h4>
                <p style="color:#cbd5e1; font-size:0.85rem; line-height:1.6; margin-bottom:0.8rem;">${p.logica_operativa}</p>
                <div style="border-top:1px dashed rgba(255,255,255,0.1); padding-top:0.6rem;">
                  <strong style="color:var(--accent-gold); font-size:0.78rem;">Casos Emblemáticos Documentados:</strong>
                  ${p.casos_emblematicos.map(ce => `
                    <div style="margin-top:0.4rem; font-size:0.82rem; color:#e2e8f0;">
                      • <strong>${ce.caso}:</strong> ${ce.hechos_documentados}
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
          <div class="tomo-subtab-pane" id="tab-voces" style="display:none;">
            ${forData.archivo_testimonial_textual.map(t => `
              <div style="background:rgba(0,0,0,0.5); border:1px solid rgba(212,175,55,0.3); border-radius:8px; padding:1.2rem; margin-bottom:1rem;">
                <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--accent-gold); font-family:var(--font-mono); margin-bottom:0.4rem;">
                  <span>${t.codigo_cev}</span>
                  <span>${t.fecha_evento}</span>
                </div>
                <div style="font-weight:700; color:#fff; font-size:0.9rem; margin-bottom:0.4rem;">${t.testigo}</div>
                <p style="color:#cbd5e1; font-size:0.85rem; font-style:italic; line-height:1.7; margin:0;">${t.cita_textual}</p>
              </div>
            `).join('')}
          </div>
        `;

      case 5:
        const terr = data.territorioHumano.tomo_05_catorce_macroregiones;
        return `
          <div class="document-badge" style="background:rgba(56,189,248,0.15); color:#38bdf8;">Tomo 05 • Geografía del Dolor</div>
          <h2 style="font-family:var(--font-title, serif); color:#fff; margin-bottom:0.6rem;">Colombia Adentro: 14 Macro-Regiones</h2>
          <div style="font-family:var(--font-mono); font-size:0.75rem; color:#94a3b8; margin-bottom:1.5rem;">
            Radiografía de Micro-Cuencas, Corredores y Ciudades (CEV 2022)
          </div>
          <div style="display:flex; flex-direction:column; gap:1rem;">
            ${terr.map(r => `
              <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:1.2rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.3rem;">
                  <h4 style="color:var(--accent-gold); font-size:1rem; margin:0;">${r.nombre}</h4>
                  <span style="font-size:0.75rem; color:#94a3b8; font-family:var(--font-mono);">${r.departamentos.join(', ')}</span>
                </div>
                <p style="color:#cbd5e1; font-size:0.85rem; line-height:1.6; margin-bottom:0.6rem;">${r.dinamica_central}</p>
                <div style="font-size:0.8rem; color:#f87171; border-top:1px dashed rgba(255,255,255,0.1); padding-top:0.4rem;">
                  <strong>Impactos:</strong> ${r.impactos_documentados}
                </div>
              </div>
            `).join('')}
          </div>
        `;

      case 6:
        const gen = data.territorioHumano.tomo_06_genero_y_diversidad;
        return `
          <div class="document-badge" style="background:rgba(236,72,153,0.15); color:#ec4899;">Tomo 06 • Género y Diversidades</div>
          <h2 style="font-family:var(--font-title, serif); color:#fff; margin-bottom:0.6rem;">Mi Cuerpo es la Verdad</h2>
          <div style="font-family:var(--font-mono); font-size:0.75rem; color:#94a3b8; margin-bottom:1.5rem;">
            Violencias Basadas en Género y Liderazgos de Resiliencia
          </div>
          <div style="background:rgba(236,72,153,0.08); border:1px solid rgba(236,72,153,0.3); border-radius:8px; padding:1.2rem; margin-bottom:1.2rem;">
            <p style="color:#cbd5e1; font-size:0.9rem; line-height:1.7; margin-bottom:0.8rem;">${gen.diagnostico_central}</p>
            <div style="display:flex; gap:1.5rem; font-family:var(--font-mono); font-size:0.82rem; color:#fff;">
              <span><strong>Víctimas Documentadas:</strong> ${gen.cifras_clave.victimas_violencia_sexual_documentadas.toLocaleString('es-CO')}</span>
              <span><strong>Mujeres:</strong> ${gen.cifras_clave.porcentaje_mujeres}%</span>
            </div>
          </div>
          <h4 style="color:#fff; font-size:0.95rem; margin-bottom:0.6rem;">Patrones Documentados:</h4>
          ${gen.patrones_documentados.map(p => `
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:1rem; margin-bottom:0.8rem;">
              <strong style="color:#ec4899; font-size:0.9rem;">${p.patron}</strong>
              <p style="color:#cbd5e1; font-size:0.85rem; line-height:1.6; margin-top:0.3rem; margin-bottom:0;">${p.descripcion}</p>
            </div>
          `).join('')}
          <div style="background:rgba(0,0,0,0.4); border-left:3px solid #ec4899; padding:0.8rem 1rem; margin-top:1rem; font-size:0.85rem; color:#cbd5e1;">
            <strong>Redes de Resistencia:</strong> ${gen.resistencias_destacadas}
          </div>
        `;

      case 7:
        const etn = data.territorioHumano.tomo_07_capitulo_etnico;
        return `
          <div class="document-badge" style="background:rgba(16,185,129,0.15); color:#10b981;">Tomo 07 • Capítulo Étnico</div>
          <h2 style="font-family:var(--font-title, serif); color:#fff; margin-bottom:0.6rem;">Resistir No es Aguantar</h2>
          <div style="font-family:var(--font-mono); font-size:0.75rem; color:#94a3b8; margin-bottom:1.5rem;">
            Pueblos Indígenas, Comunidades Afrocolombianas y Daño Biocultural
          </div>
          <p style="color:#cbd5e1; font-size:0.92rem; line-height:1.7; margin-bottom:1.2rem;">${etn.diagnostico_central}</p>
          <div style="background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.3); border-radius:8px; padding:1.2rem; margin-bottom:1.2rem;">
            <h4 style="color:#10b981; font-size:0.95rem; margin-bottom:0.4rem;">Pueblos Indígenas en Riesgo de Exterminio (Auto 004/2009):</h4>
            <p style="color:#cbd5e1; font-size:0.85rem; line-height:1.6; margin:0;">${etn.pueblos_indigenas_en_riesgo}</p>
          </div>
          <h4 style="color:#fff; font-size:0.95rem; margin-bottom:0.6rem;">Afectaciones a Pueblos Afrodescendientes:</h4>
          <ul style="color:#cbd5e1; font-size:0.85rem; line-height:1.7; padding-left:1.2rem;">
            ${etn.afectaciones_afrodescendientes.map(a => `<li>${a}</li>`).join('')}
          </ul>
        `;

      case 8:
        const exi = data.territorioHumano.tomo_08_exilio_diaspora;
        return `
          <div class="document-badge" style="background:rgba(168,85,247,0.15); color:#a855f7;">Tomo 08 • Diáspora y Exilio</div>
          <h2 style="font-family:var(--font-title, serif); color:#fff; margin-bottom:0.6rem;">La Colombia Fuera de Colombia</h2>
          <div style="font-family:var(--font-mono); font-size:0.75rem; color:#94a3b8; margin-bottom:1.5rem;">
            Primer Tomo Mundial Dedicado al Exilio Forzado Transnacional
          </div>
          <div style="background:rgba(168,85,247,0.08); border:1px solid rgba(168,85,247,0.3); border-radius:8px; padding:1.2rem; margin-bottom:1.2rem;">
            <div style="font-size:1.6rem; font-weight:800; color:#a855f7; font-family:var(--font-mono); margin-bottom:0.3rem;">+1.000.000 de Personas</div>
            <p style="color:#cbd5e1; font-size:0.85rem; line-height:1.6; margin:0;">Forzadas a huir de Colombia hacia el exterior entre 1958 y 2016.</p>
          </div>
          <p style="color:#cbd5e1; font-size:0.88rem; line-height:1.7; margin-bottom:0.8rem;">
            <strong>Países Receptores:</strong> ${exi.geografia_exilio}
          </p>
          <p style="color:#cbd5e1; font-size:0.88rem; line-height:1.7; margin-bottom:0.8rem;">
            <strong>Perfiles Perseguidos:</strong> ${exi.perfiles_perseguidos}
          </p>
          <p style="color:#94a3b8; font-size:0.85rem; line-height:1.6; border-top:1px dashed rgba(255,255,255,0.1); padding-top:0.6rem;">
            <strong>Impacto Psicosocial:</strong> ${exi.impacto_psicosocial}
          </p>
        `;

      case 9:
        const nin = data.territorioHumano.tomo_09_ninez_adolescencia;
        return `
          <div class="document-badge" style="background:rgba(245,158,11,0.15); color:#f59e0b;">Tomo 09 • Niñez en el Conflicto</div>
          <h2 style="font-family:var(--font-title, serif); color:#fff; margin-bottom:0.6rem;">No es un Mal Menor</h2>
          <div style="font-family:var(--font-mono); font-size:0.75rem; color:#94a3b8; margin-bottom:1.5rem;">
            Reclutamiento Ilícito, Escuelas Atacadas y Huérfanos de la Guerra
          </div>
          <div style="background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.3); border-radius:8px; padding:1.2rem; margin-bottom:1.2rem;">
            <div style="font-size:1.6rem; font-weight:800; color:#f59e0b; font-family:var(--font-mono); margin-bottom:0.3rem;">${nin.cifras_clave.menores_reclutados_documentados.toLocaleString('es-CO')} Niñas y Niños</div>
            <p style="color:#cbd5e1; font-size:0.85rem; line-height:1.6; margin:0;">Reclutados forzadamente. Promedio de edad de entrada: ${nin.cifras_clave.edad_promedio_de_reclutamiento}.</p>
          </div>
          <p style="color:#cbd5e1; font-size:0.88rem; line-height:1.7; margin-bottom:0.8rem;">${nin.diagnostico_central}</p>
          <ul style="color:#cbd5e1; font-size:0.85rem; line-height:1.7; padding-left:1.2rem;">
            ${nin.impactos_escolares_y_vitales.map(i => `<li>${i}</li>`).join('')}
          </ul>
        `;

      case 10:
        const pol = data.territorioHumano.tomo_10_polifonia_testimonios;
        return `
          <div class="document-badge" style="background:rgba(212,175,55,0.15); color:var(--accent-gold);">Tomo 10 • Memoria Coral</div>
          <h2 style="font-family:var(--font-title, serif); color:#fff; margin-bottom:0.6rem;">Cuando los Pájaros no Cantaban</h2>
          <div style="font-family:var(--font-mono); font-size:0.75rem; color:#94a3b8; margin-bottom:1.5rem;">
            Testimonios Desnudos y Relatos en Primera Persona (Sin Intermediación)
          </div>
          <p style="color:#cbd5e1; font-size:0.88rem; line-height:1.7; margin-bottom:1.2rem;">${pol.naturaleza_del_acervo}</p>
          ${pol.extractos_testimoniales_emblematicos.map(e => `
            <div style="background:rgba(0,0,0,0.5); border:1px solid rgba(212,175,55,0.3); border-radius:8px; padding:1.2rem; margin-bottom:1rem;">
              <strong style="color:var(--accent-gold); font-size:0.9rem; font-family:var(--font-title);">${e.voz}</strong>
              <p style="color:#f8fafc; font-style:italic; font-size:0.88rem; line-height:1.7; margin-top:0.4rem; margin-bottom:0;">${e.texto}</p>
            </div>
          `).join('')}
        `;

      default:
        return `<p>Tomo no encontrado.</p>`;
    }
  }

  /**
   * Configura las subpestañas dentro del drawer
   */
  function setupInnerDrawerTabs(container) {
    const tabs = container.querySelectorAll('.tomo-subtab');
    const panes = container.querySelectorAll('.tomo-subtab-pane');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => {
          t.classList.remove('active');
          t.style.borderBottom = 'none';
          t.style.color = '#94a3b8';
        });
        panes.forEach(p => p.style.display = 'none');

        tab.classList.add('active');
        tab.style.color = '#fff';
        tab.style.borderBottom = '2px solid var(--accent-gold, #d4af37)';

        const targetId = tab.getAttribute('data-tab');
        const targetPane = container.querySelector('#' + targetId);
        if (targetPane) targetPane.style.display = 'block';
      });
    });
  }

  /**
   * Buscador interactivo por criterios en la cabecera de la sección CEV
   */
  function setupForenseSearchFilter() {
    const input = document.getElementById('cev-search-input');
    if (!input) return;

    input.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const cards = document.querySelectorAll('.tomo-card');

      cards.forEach(card => {
        const title = (card.querySelector('.tomo-title') || {}).textContent || '';
        const sub = (card.querySelector('.tomo-sub') || {}).textContent || '';
        const num = (card.querySelector('.tomo-number') || {}).textContent || '';
        const match = title.toLowerCase().includes(q) || sub.toLowerCase().includes(q) || num.toLowerCase().includes(q);
        card.style.display = match ? 'block' : 'none';
      });
    });
  }
})();
