// Variables globales para las instancias de Chart.js y DataTables
let calificacionesChart, equiposChart, aprobacionChart;
let actividadesChart2, cuestionariosRadarChart, proyectoEntregaChart, bitacoraEntregaChart, puntosExtraChart, entregasActividadesChart, entregasCuestionariosChart, proyectoCalificacionesChart, bitacoraCalificacionesChart;
let estudianteCardCharts = {};

let dataTable, topEstudiantesDataTable, reprobadosDataTable;

let estudiantes = [];
let tipoGraficaActividades = 'barras';

// Paleta de colores para JS (Chart.js) - Basada en la imagen de ejemplo
const colorPalette = {
    primaryPurple: '#7F56D9',      // Morado principal (botones "Level 3", "Open level")
    secondaryPurplePink: '#A450E4',// Morado/rosa más claro (fondo tarjeta "ID 32124")
    accentBlue: '#5C86FF',         // Azul de acento general
    cardBackground: '#2C2F3B',     // Fondo de tarjetas y elementos más oscuros (ej. countdown)
    pageBackground: '#1D1E26',     // Fondo general más oscuro de la página
    statusGreen: '#22C55E',        // Verde para estado "Active"
    statusRedPink: '#F75A7F',      // Rosa/Rojo para "Blocked" o peligro
    accentYellow: '#FACC15',       // Amarillo para cantidades BNB, advertencias
    textPrimary: '#F3F4F6',        // Color de texto principal (gris claro/blanco roto)
    textSecondary: '#9CA3AF',      // Texto atenuado
    borderDark: '#3E4252',         // Bordes sutiles
    white: '#FFFFFF',

    // Manteniendo algunos nombres originales para compatibilidad, mapeados a la nueva paleta
    cyan: '#5C86FF',              // Mapeado a accentBlue
    pink: '#F75A7F',              // Mapeado a statusRedPink
    strongBlue: '#7F56D9',        // Mapeado a primaryPurple
    darkBlueCardBg: '#2C2F3B',    // Mapeado a cardBackground
    teal: '#22C55E',              // Mapeado a statusGreen
    mauve: '#A450E4',             // Mapeado a secondaryPurplePink
    gray1: '#3E4252',             // Mapeado a borderDark
    gray2: '#4B5563',             // Un gris un poco más claro
    gray3: '#374151',             // Otro gris
    veryDarkGray: '#1F2937',      // Gris muy oscuro, cercano al fondo de página
    lightTextDarkTheme: '#F3F4F6',// Mapeado a textPrimary
    cardText: '#F3F4F6',          // Mapeado a textPrimary
    cardTextMuted: '#9CA3AF',     // Mapeado a textSecondary
    cardBorder: '#3E4252',        // Mapeado a borderDark
};


function getChartColors(isDark, onCard = false) {
    // Para la imagen de ejemplo, asumimos que isDark es true para el tema principal.
    // La lógica onCard es útil si los elementos del gráfico en tarjeta difieren ligeramente.
    if (isDark) { // Tema oscuro siempre para esta paleta
        if (onCard) {
            return {
                isDark: true,
                primary: colorPalette.primaryPurple,
                secondary: colorPalette.secondaryPurplePink,
                success: colorPalette.statusGreen,
                info: colorPalette.accentBlue,
                warning: colorPalette.accentYellow,
                danger: colorPalette.statusRedPink,
                text: colorPalette.textPrimary,
                border: colorPalette.borderDark,
                grid: 'rgba(156, 163, 175, 0.1)', // textSecondary con alpha bajo
                white: colorPalette.white,
                darkTextOnLightBg: colorPalette.pageBackground,
                cardBg: colorPalette.cardBackground,
                cardTextMuted: colorPalette.textSecondary,
            };
        }
        // Colores generales para gráficos (si no están en una tarjeta o son iguales)
        return {
            isDark: true,
            primary: colorPalette.primaryPurple,
            secondary: colorPalette.secondaryPurplePink,
            success: colorPalette.statusGreen,
            info: colorPalette.accentBlue,
            warning: colorPalette.accentYellow,
            danger: colorPalette.statusRedPink,
            text: colorPalette.textPrimary,
            border: colorPalette.borderDark,
            grid: 'rgba(156, 163, 175, 0.15)',
            white: colorPalette.white,
            darkTextOnLightBg: colorPalette.pageBackground,
            cardBg: colorPalette.cardBackground,
            cardText: colorPalette.textPrimary,
            cardTextMuted: colorPalette.textSecondary,
            cardBorder: colorPalette.borderDark,
        };
    } else { // Fallback para tema claro (puedes definir una paleta clara separada si es necesario)
        return {
            isDark: false,
            primary: '#0D6EFD', // Bootstrap blue
            secondary: '#6C757D', // Bootstrap secondary
            success: '#198754', // Bootstrap success
            info: '#0DCAF0',    // Bootstrap info
            warning: '#FFC107', // Bootstrap warning
            danger: '#DC3545',  // Bootstrap danger
            text: '#212529',    // Bootstrap dark text
            border: 'rgba(0, 0, 0, 0.1)',
            grid: 'rgba(0, 0, 0, 0.1)',
            white: '#FFFFFF',
            darkTextOnLightBg: '#212529',
            cardBg: '#FFFFFF',
            cardText: '#212529',
            cardTextMuted: 'rgba(33, 37, 41, 0.75)',
            cardBorder: 'rgba(0, 0, 0, 0.125)',
        };
    }
}


$(document).ready(function () {
    const apiUrl = 'https://script.google.com/macros/s/AKfycby_mP3ow6lHHhp5KoZ2cp-JvapWOc6bCEDHQqEdko2k9D1Y-ali/exec';
    $('.loading').show();

    initializeDashboardSections();
    initializeSidebarToggler();
    initializeChartDefaults();

    $.ajax({
        url: apiUrl,
        type: 'GET',
        dataType: 'json',
        success: function (data) {
            estudiantes = data;
            actualizarFiltros(data);
            const isDarkInitial = document.documentElement.classList.contains('dark') || document.documentElement.getAttribute('data-bs-theme') === 'dark';
            handleSectionChange('visionGeneral', estudiantes, getChartColors(isDarkInitial));
            $('.loading').hide();
        },
        error: function (error) {
            console.error('Error al cargar los datos:', error);
            $('.loading').text('Error al cargar los datos.').show();
        }
    });

    function initializeChartDefaults() {
        const isDark = document.documentElement.classList.contains('dark') || document.documentElement.getAttribute('data-bs-theme') === 'dark';
        const currentChartColors = getChartColors(isDark, false); // false para defaults generales

        Chart.defaults.color = currentChartColors.text;
        Chart.defaults.borderColor = currentChartColors.grid;
        Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'attributes' && (mutation.attributeName === 'data-bs-theme' || mutation.attributeName === 'class')) {
                    const newIsDark = document.documentElement.classList.contains('dark') || document.documentElement.getAttribute('data-bs-theme') === 'dark';
                    const newChartColorsGeneral = getChartColors(newIsDark, false);
                    const newChartColorsCard = getChartColors(newIsDark, true);

                    Chart.defaults.color = newChartColorsGeneral.text; 
                    Chart.defaults.borderColor = newChartColorsGeneral.grid;

                    Object.values(Chart.instances).forEach(instance => {
                        if (instance) {
                            const isOnCard = $(instance.canvas).closest('.card').length > 0;
                            const colorsToApply = isOnCard ? newChartColorsCard : newChartColorsGeneral;

                            instance.options.color = colorsToApply.text; 
                            if (instance.options.plugins.legend) instance.options.plugins.legend.labels.color = colorsToApply.text;
                            if (instance.options.plugins.title) instance.options.plugins.title.color = colorsToApply.text;

                            if (instance.options.scales.x) {
                                instance.options.scales.x.ticks.color = colorsToApply.text;
                                instance.options.scales.x.grid.color = colorsToApply.grid;
                            }
                            if (instance.options.scales.y) {
                                instance.options.scales.y.ticks.color = colorsToApply.text;
                                instance.options.scales.y.grid.color = colorsToApply.grid;
                            }
                            if (instance.options.scales.r) {
                                instance.options.scales.r.ticks.color = colorsToApply.text;
                                instance.options.scales.r.angleLines.color = colorsToApply.grid;
                                instance.options.scales.r.grid.color = colorsToApply.grid;
                                instance.options.scales.r.pointLabels.color = colorsToApply.text;
                            }
                            instance.update();
                        }
                    });
                    const activeSectionId = $('.sidebar .nav-link.active').data('section') || 'visionGeneral';
                    // Determinar si el cambio de tema requiere colores de tarjeta para la sección actual
                    const sectionIsCardHeavy = ['visionGeneral', 'rendimientoActividades', 'analisisGruposEquipos'].includes(activeSectionId);
                    const colorsForSectionReload = sectionIsCardHeavy ? newChartColorsCard : newChartColorsGeneral;
                    handleSectionChange(activeSectionId, estudiantes, colorsForSectionReload);
                }
            });
        });
        observer.observe(document.documentElement, { attributes: true });
    }

    function initializeSidebarToggler() {
        $('#sidebarToggle').on('click', function () {
            $('#sidebarMenu').toggleClass('active');
            setTimeout(() => {
                if (dataTable && $('#listaEstudiantes').hasClass('active')) dataTable.columns.adjust().draw();
                if (topEstudiantesDataTable && $('#topEstudiantes').hasClass('active')) topEstudiantesDataTable.columns.adjust().draw();
                if (reprobadosDataTable && $('#alumnosReprobados').hasClass('active')) reprobadosDataTable.columns.adjust().draw();
                Object.values(Chart.instances).forEach(instance => {
                    if (instance && $(instance.canvas).closest('.section-content').hasClass('active')) {
                        // instance.resize(); // Descomentar si es necesario, pero puede ser intensivo
                    }
                });
            }, 350); // Duración de la transición de la sidebar
        });
    }

    function initializeDashboardSections() {
        const navLinks = $('.sidebar .nav-link');
        navLinks.on('click', function (e) {
            e.preventDefault();
            const sectionId = $(this).data('section');
            if ($(this).hasClass('active')) return;

            navLinks.removeClass('active');
            $(this).addClass('active');

            $('.section-content').removeClass('active');
            $('#' + sectionId).addClass('active');

            const isDark = document.documentElement.classList.contains('dark');
            // Usar colores de tarjeta si la sección es de tipo "card-heavy"
            const sectionIsCardHeavy = ['visionGeneral', 'rendimientoActividades', 'analisisGruposEquipos'].includes(sectionId);
            const colorsForSection = getChartColors(isDark, sectionIsCardHeavy);
            handleSectionChange(sectionId, estudiantes, colorsForSection);
        });
    }

    function handleSectionChange(sectionId, data, chartColors) {
        if (!data) {
            console.warn("handleSectionChange: Datos no disponibles aún.");
            return;
        }
        
        const cardSpecificChartColors = getChartColors(chartColors.isDark, true);

        if (data.length === 0 && sectionId !== 'visionGeneral' && sectionId !== 'rendimientoActividades') {
            if ($(`#${sectionId}`).find('table.dataTable').length > 0) {
                const dtInstance = $(`#${sectionId}`).find('table.dataTable').DataTable();
                if (dtInstance && typeof dtInstance.clear === 'function') { // Verificar si es una instancia de DataTable
                   dtInstance.clear().draw();
                }
            }
            if (sectionId === 'analisisGruposEquipos') {
                generarSeccionesPorGrupoYEquipo([], cardSpecificChartColors);
            }
            return;
        }

        const datosFiltrados = obtenerDatosFiltrados(data);

        switch (sectionId) {
            case 'visionGeneral':
                calcularEstadisticas(datosFiltrados);
                actualizarRankings(datosFiltrados);
                crearGraficosPrincipales(datosFiltrados, cardSpecificChartColors); 
                break;
            case 'listaEstudiantes':
                inicializarTablaEstudiantes(datosFiltrados); // Tablas usan colores generales manejados por CSS/Bootstrap
                break;
            case 'topEstudiantes':
                inicializarTablaTopEstudiantes(datosFiltrados);
                break;
            case 'alumnosReprobados':
                actualizarTablaReprobados(datosFiltrados);
                break;
            case 'analisisGruposEquipos':
                generarSeccionesPorGrupoYEquipo(datosFiltrados, cardSpecificChartColors); 
                break;
            case 'rendimientoActividades':
                analizarYCrearGraficosDeActividades(datosFiltrados, cardSpecificChartColors); 
                break;
        }
    }

    function obtenerDatosFiltrados(datosOriginales) {
        const grupoSeleccionado = $('#grupoFilter').val();
        const equipoSeleccionado = $('#equipoFilter').val();
        const estadoSeleccionado = $('#estadoFilter').val();

        if (!datosOriginales) return [];

        return datosOriginales.filter(est => {
            let cumple = true;
            if (grupoSeleccionado && est.GRUPO !== grupoSeleccionado) cumple = false;
            if (equipoSeleccionado && est.EQUIPO !== equipoSeleccionado) cumple = false;
            if (estadoSeleccionado) {
                const finalNum = parseFloat(est.FINAL);
                if (estadoSeleccionado === 'Aprobado' && finalNum < 6) cumple = false;
                if (estadoSeleccionado === 'Reprobado' && finalNum >= 6) cumple = false;
            }
            return cumple;
        });
    }

    function cargarDatosFiltrados() {
        if (estudiantes.length === 0) return;
        $('.loading').show();
        const activeSectionId = $('.sidebar .nav-link.active').data('section') || 'visionGeneral';
        const isDark = document.documentElement.classList.contains('dark');
        
        const sectionIsCardHeavy = ['visionGeneral', 'rendimientoActividades', 'analisisGruposEquipos'].includes(activeSectionId);
        const colorsForSection = getChartColors(isDark, sectionIsCardHeavy);
        
        handleSectionChange(activeSectionId, estudiantes, colorsForSection);
        $('.loading').hide();
    }

    $('#grupoFilter, #equipoFilter, #estadoFilter').on('change', function () {
        if ($(this).is('#grupoFilter')) {
            const grupoSel = $(this).val();
            const equiposPorGrupo = {};
            const todosLosEquiposSet = new Set();
            estudiantes.forEach(est => {
                if (est.EQUIPO) {
                    todosLosEquiposSet.add(est.EQUIPO);
                    if (est.GRUPO) {
                        if (!equiposPorGrupo[est.GRUPO]) equiposPorGrupo[est.GRUPO] = new Set();
                        equiposPorGrupo[est.GRUPO].add(est.EQUIPO);
                    }
                }
            });
            actualizarFiltroEquipos(grupoSel, equiposPorGrupo, [...todosLosEquiposSet].sort(), $('#equipoFilter').val());
        }
        cargarDatosFiltrados();
    });

    $('#resetFilters').on('click', function () {
        $('#grupoFilter, #equipoFilter, #estadoFilter').val('');
        actualizarFiltroEquipos('', {}, [...new Set(estudiantes.map(e => e.EQUIPO).filter(Boolean))].sort());
        cargarDatosFiltrados();
    });

    function actualizarFiltros(datos) {
        const gruposUnicos = [...new Set(datos.map(item => item.GRUPO).filter(Boolean))].sort();
        const $grupoFilter = $('#grupoFilter');
        const grupoActual = $grupoFilter.val();
        $grupoFilter.empty().append('<option value="">Todos los grupos</option>');
        gruposUnicos.forEach(grupo => $grupoFilter.append(`<option value="${grupo}">${grupo}</option>`));
        if (gruposUnicos.includes(grupoActual)) $grupoFilter.val(grupoActual);

        const equiposPorGrupo = {};
        const todosLosEquiposSet = new Set();
        datos.forEach(est => {
            if (est.EQUIPO) {
                todosLosEquiposSet.add(est.EQUIPO);
                if (est.GRUPO) {
                    if (!equiposPorGrupo[est.GRUPO]) equiposPorGrupo[est.GRUPO] = new Set();
                    equiposPorGrupo[est.GRUPO].add(est.EQUIPO);
                }
            }
        });
        actualizarFiltroEquipos($grupoFilter.val(), equiposPorGrupo, [...todosLosEquiposSet].sort(), $('#equipoFilter').val());
    }

    function actualizarFiltroEquipos(grupoSeleccionado, equiposPorGrupo, todosLosEquipos, equipoActual) {
        const $equipoFilter = $('#equipoFilter');
        $equipoFilter.empty().append('<option value="">Todos los equipos</option>');
        let equiposAMostrar = [];
        if (grupoSeleccionado && equiposPorGrupo[grupoSeleccionado]) {
            equiposAMostrar = Array.from(equiposPorGrupo[grupoSeleccionado]).sort();
        } else {
            equiposAMostrar = todosLosEquipos;
        }
        equiposAMostrar.forEach(equipo => $equipoFilter.append(`<option value="${equipo}">${equipo}</option>`));
        if (equiposAMostrar.includes(equipoActual)) $equipoFilter.val(equipoActual);
        else $equipoFilter.val('');
    }

    function calcularEstadisticas(datos) {
        if (!datos || datos.length === 0) {
            $('#totalEstudiantes, #totalAprobados, #totalReprobados, #promedioGeneral').text('0');
            $('#porcentajeAprobados, #porcentajeReprobados, #porcentajeAprobacion').text('0%');
            return;
        }
        const totalEstudiantesVal = datos.length;
        const aprobadosVal = datos.filter(e => parseFloat(e.FINAL) >= 6).length;
        const reprobadosVal = totalEstudiantesVal - aprobadosVal;
        const porcAprob = totalEstudiantesVal > 0 ? (aprobadosVal / totalEstudiantesVal * 100) : 0;
        const porcReprob = totalEstudiantesVal > 0 ? (reprobadosVal / totalEstudiantesVal * 100) : 0;
        const sumaCalif = datos.reduce((sum, e) => sum + parseFloat(e.FINAL || 0), 0);
        const promGral = totalEstudiantesVal > 0 ? (sumaCalif / totalEstudiantesVal) : 0;

        $('#totalEstudiantes').text(totalEstudiantesVal);
        $('#totalAprobados').text(aprobadosVal);
        $('#porcentajeAprobados').text(`${porcAprob.toFixed(1)}%`);
        $('#totalReprobados').text(reprobadosVal);
        $('#porcentajeReprobados').text(`${porcReprob.toFixed(1)}%`);
        $('#porcentajeAprobacion').text(`${porcAprob.toFixed(1)}%`);
        $('#promedioGeneral').text(promGral.toFixed(1));
    }

    function actualizarRankings(datos) {
        if (!datos || datos.length === 0) {
            $('#mejorEstudiante, #peorEstudiante, #mejorEquipo, #peorEquipo, #mejorGrupo, #peorGrupo').text('-');
            $('#puntajeMejorEstudiante, #puntajePeorEstudiante, #promedioMejorEquipo, #promedioPeorEquipo, #promedioMejorGrupo, #promedioPeorGrupo').text('0.0');
            return;
        }
        const ordenados = [...datos].sort((a, b) => parseFloat(b.FINAL || 0) - parseFloat(a.FINAL || 0));
        $('#mejorEstudiante').text(ordenados[0]?.COMPLETO || '-');
        $('#puntajeMejorEstudiante').text(parseFloat(ordenados[0]?.FINAL || 0).toFixed(1));
        $('#peorEstudiante').text(ordenados[ordenados.length - 1]?.COMPLETO || '-');
        $('#puntajePeorEstudiante').text(parseFloat(ordenados[ordenados.length - 1]?.FINAL || 0).toFixed(1));

        const gruposData = {}, equiposData = {};
        datos.forEach(e => {
            if (e.GRUPO) { if (!gruposData[e.GRUPO]) gruposData[e.GRUPO] = { s: 0, c: 0 }; gruposData[e.GRUPO].s += parseFloat(e.FINAL || 0); gruposData[e.GRUPO].c++; }
            if (e.EQUIPO) { if (!equiposData[e.EQUIPO]) equiposData[e.EQUIPO] = { s: 0, c: 0 }; equiposData[e.EQUIPO].s += parseFloat(e.FINAL || 0); equiposData[e.EQUIPO].c++; }
        });

        let mejorG = { n: '-', p: -1 }, peorG = { n: '-', p: 11 }, mejorE = { n: '-', p: -1 }, peorE = { n: '-', p: 11 };
        Object.entries(gruposData).forEach(([n, d]) => { const p = d.c > 0 ? d.s / d.c : 0; if (p > mejorG.p) mejorG = { n, p }; if (d.c > 0 && p < peorG.p) peorG = { n, p }; });
        Object.entries(equiposData).forEach(([n, d]) => { const p = d.c > 0 ? d.s / d.c : 0; if (p > mejorE.p) mejorE = { n, p }; if (d.c > 0 && p < peorE.p) peorE = { n, p }; });

        $('#mejorGrupo').text(mejorG.n); $('#promedioMejorGrupo').text(mejorG.p !== -1 ? mejorG.p.toFixed(1) : '0.0');
        $('#peorGrupo').text(peorG.n); $('#promedioPeorGrupo').text(peorG.p !== 11 ? peorG.p.toFixed(1) : '0.0');
        $('#mejorEquipo').text(mejorE.n); $('#promedioMejorEquipo').text(mejorE.p !== -1 ? mejorE.p.toFixed(1) : '0.0');
        $('#peorEquipo').text(peorE.n); $('#promedioPeorEquipo').text(peorE.p !== 11 ? peorE.p.toFixed(1) : '0.0');
    }
    
    // --- SECCIÓN DE TABLAS (FUERA DE TARJETAS, USAN COLORES GENERALES) ---
    function inicializarTablaEstudiantes(datos) {
        const tableId = '#estudiantesTable';
        if ($.fn.DataTable.isDataTable(tableId)) {
            dataTable.clear().rows.add(datos).draw();
        } else {
            dataTable = $(tableId).DataTable({
                data: datos,
                columns: [{ data: 'ID' }, { data: 'COMPLETO' }, { data: 'NICK' }, { data: 'GRUPO' }, { data: 'EQUIPO' }, { data: 'TOTALASIS' },
                { data: 'FINAL', render: rSemaforoTabla }, { data: 'Edo', render: rEstadoBadgeTabla }],
                language: { url: '//cdn.datatables.net/plug-ins/1.11.5/i18n/es-ES.json' }, pageLength: 10,
                lengthMenu: [[10, 25, 50, -1], [10, 25, 50, 'Todos']], responsive: true,
                order: [[3, 'asc'], [1, 'asc']]
            });
        }
        if (dataTable) dataTable.columns.adjust().responsive.recalc();
    }

    function inicializarTablaTopEstudiantes(datos) {
        const tableId = '#topEstudiantesTable';
        const mejoresPorG = {}; datos.forEach(e => { const g = e.GRUPO || 'Sin Grupo'; const cal = parseFloat(e.FINAL); if (!mejoresPorG[g] || cal > parseFloat(mejoresPorG[g].FINAL)) mejoresPorG[g] = e; });
        const topData = Object.values(mejoresPorG).sort((a, b) => parseFloat(b.FINAL) - parseFloat(a.FINAL)).slice(0, 10);

        if ($.fn.DataTable.isDataTable(tableId)) {
            topEstudiantesDataTable.clear().rows.add(topData).draw();
        } else {
            topEstudiantesDataTable = $(tableId).DataTable({
                data: topData,
                columns: [{ data: null, render: (d, t, r, m) => m.row + 1 }, { data: 'COMPLETO' }, { data: 'GRUPO' }, { data: 'EQUIPO' }, { data: 'FINAL', render: rCalBadgeTabla }],
                order: [[4, 'desc']], pageLength: 10, searching: false, info: false, lengthChange: false, responsive: true,
                language: { url: '//cdn.datatables.net/plug-ins/1.11.5/i18n/es-ES.json' }
            });
        }
        if (topEstudiantesDataTable) topEstudiantesDataTable.columns.adjust().responsive.recalc();
    }

    function actualizarTablaReprobados(datos) {
        const tableId = '#reprobadosTable';
        const reprobData = datos.filter(e => parseFloat(e.FINAL) < 6)
            .map(e => ({ ...e, GRUPO: e.GRUPO || '', FINAL_NUM: parseFloat(e.FINAL) }))
            .sort((a, b) => { if (a.GRUPO < b.GRUPO) return -1; if (a.GRUPO > b.GRUPO) return 1; if (a.COMPLETO < b.COMPLETO) return -1; if (a.COMPLETO > b.COMPLETO) return 1; return 0; });

        const isDark = document.documentElement.classList.contains('dark');
        const generalColors = getChartColors(isDark, false);


        if ($.fn.DataTable.isDataTable(tableId)) {
            reprobadosDataTable.clear().rows.add(reprobData).draw();
        } else {
            reprobadosDataTable = $(tableId).DataTable({
                data: reprobData,
                columns: [{ data: 'COMPLETO' }, { data: 'GRUPO' }, { data: 'FINAL_NUM', render: d => `<span style="color: ${generalColors.danger}; font-weight: bold;">${d.toFixed(1)}</span>` }],
                order: [[1, 'asc'], [0, 'asc']], pageLength: 10, responsive: true,
                language: { url: '//cdn.datatables.net/plug-ins/1.11.5/i18n/es-MX.json' }
            });
        }
        if (reprobadosDataTable) reprobadosDataTable.columns.adjust().responsive.recalc();
    }
    
    // Renders para DataTables (colores generales, no de tarjeta)
    function rSemaforoTabla(data) {
        const c = parseFloat(data) || 0;
        const isDark = document.documentElement.classList.contains('dark');
        const generalColors = getChartColors(isDark, false); 
        const colorSemaforo = c < 6 ? generalColors.danger : c < 8 ? generalColors.secondary : generalColors.success;
        const textColor = isDark ? generalColors.text : (c < 6 ? generalColors.danger : generalColors.text); // En modo claro, el texto del semáforo puede tomar el color del punto si es reprobado

        return `<div class="semaforo-calificacion"><span class="punto-semaforo" style="background-color:${colorSemaforo};"></span><span class="texto-semaforo" style="color: ${textColor}">${c.toFixed(1)}</span></div>`;
    }

    function rEstadoBadgeTabla(d, t, r) {
        const c = parseFloat(r.FINAL || 0);
        const isDark = document.documentElement.classList.contains('dark');
        const generalColors = getChartColors(isDark, false);
        const bgColor = c < 6 ? generalColors.danger : generalColors.success;
        const textColor = colorPalette.white; // Forzar texto blanco en badges como en la imagen
        return `<span class="badge" style="background-color:${bgColor} !important; color:${textColor} !important;">${c < 6 ? 'Reprobado' : 'Aprobado'}</span>`;
    }

    function rCalBadgeTabla(data) {
        const c = parseFloat(data);
        const isDark = document.documentElement.classList.contains('dark');
        const generalColors = getChartColors(isDark, false);
        const bgColor = c >= 6 ? generalColors.success : generalColors.danger;
        const textColor = colorPalette.white; // Forzar texto blanco
        return `<span class="badge" style="background-color:${bgColor} !important; color:${textColor} !important;">${c.toFixed(1)}</span>`;
    }


    $('#descargarReprobadosBtn').off('click').on('click', function () {
        const datosFiltradosActuales = obtenerDatosFiltrados(estudiantes);
        const reprobadosDescarga = datosFiltradosActuales.filter(e => parseFloat(e.FINAL) < 6)
            .sort((a, b) => { if ((a.GRUPO || '') < (b.GRUPO || '')) return -1; if ((a.GRUPO || '') > (b.GRUPO || '')) return 1; if (a.COMPLETO < b.COMPLETO) return -1; if (a.COMPLETO > b.COMPLETO) return 1; return 0; });

        let csv = 'Grupo,Nombre,Calificacion Final\n' + reprobadosDescarga.map(e => `"${e.GRUPO || ''}","${e.COMPLETO}",${parseFloat(e.FINAL).toFixed(1)}`).join('\n');
        let blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        let link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `alumnos_reprobados_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    });

    // --- FUNCIONES DE CREACIÓN DE GRÁFICOS (DENTRO DE TARJETAS, USAN chartColors específicos) ---
    function crearGraficosPrincipales(datos, chartColors) { // chartColors aquí son los de tarjeta
        if (!datos) return;
        if (calificacionesChart) { calificacionesChart.destroy(); calificacionesChart = null; }
        if (equiposChart) { equiposChart.destroy(); equiposChart = null; }
        if (aprobacionChart) { aprobacionChart.destroy(); aprobacionChart = null; }

        const commonOptions = {
            responsive: true, maintainAspectRatio: false, animation: { duration: 500 },
            scales: {
                x: { ticks: { color: chartColors.text }, grid: { color: chartColors.grid } },
                y: { ticks: { color: chartColors.text }, grid: { color: chartColors.grid } }
            },
            plugins: { 
                legend: { labels: { color: chartColors.text } }, 
                title: { color: chartColors.text },
                tooltip: {
                    backgroundColor: colorPalette.cardBackground, // Usar un fondo de tooltip consistente
                    titleColor: colorPalette.textPrimary,
                    bodyColor: colorPalette.textPrimary,
                    borderColor: colorPalette.borderDark,
                    borderWidth: 1
                }
            }
        };

        if (document.getElementById('calificacionesChart') && datos.length > 0) {
            const califCounts = Array(10).fill(0);
            datos.forEach(e => { const c = Math.min(9, Math.floor(parseFloat(e.FINAL) || 0)); if (!isNaN(c) && c >= 0) califCounts[c]++; });
            calificacionesChart = new Chart(document.getElementById('calificacionesChart').getContext('2d'), {
                type: 'bar',
                data: { labels: ['0-1', '1-2', '2-3', '3-4', '4-5', '5-6', '6-7', '7-8', '8-9', '9-10'], datasets: [{ label: 'Estudiantes', data: califCounts, backgroundColor: `${chartColors.primary}B3` }] },
                options: { ...commonOptions, plugins: { ...commonOptions.plugins, legend: { display: false }, title: { display: true, text: 'Distribución de Calificaciones' } }, scales: { ...commonOptions.scales, y: { ...commonOptions.scales.y, beginAtZero: true, ticks: { precision: 0, color: chartColors.text } } } }
            });
        } else if (document.getElementById('calificacionesChart')) { $(document.getElementById('calificacionesChart')).parent().html('<canvas id="calificacionesChart"></canvas><p class="text-center text-card-text-muted-custom small mt-5">No hay datos para mostrar.</p>') }

        if (document.getElementById('equiposChart') && datos.length > 0) {
            const eqData = {}; datos.forEach(e => { if (e.EQUIPO) { if (!eqData[e.EQUIPO]) eqData[e.EQUIPO] = { s: 0, c: 0 }; eqData[e.EQUIPO].s += parseFloat(e.FINAL || 0); eqData[e.EQUIPO].c++; } });
            const eqSorted = Object.entries(eqData).map(([n, d]) => ({ n, p: d.c > 0 ? d.s / d.c : 0 })).sort((a, b) => b.p - a.p);
            equiposChart = new Chart(document.getElementById('equiposChart').getContext('2d'), {
                type: 'bar',
                data: { labels: eqSorted.map(e => e.n), datasets: [{ label: 'Promedio', data: eqSorted.map(e => e.p.toFixed(1)), backgroundColor: `${chartColors.success}B3` }] },
                options: { ...commonOptions, plugins: { ...commonOptions.plugins, legend: { display: false }, title: { display: true, text: 'Promedio por Equipo' } }, scales: { ...commonOptions.scales, y: { ...commonOptions.scales.y, beginAtZero: true, max: 10, ticks: { precision: 1, color: chartColors.text } } } }
            });
        } else if (document.getElementById('equiposChart')) { $(document.getElementById('equiposChart')).parent().html('<canvas id="equiposChart"></canvas><p class="text-center text-card-text-muted-custom small mt-5">No hay datos de equipos para mostrar.</p>') }

        if (document.getElementById('aprobacionChart') && datos.length > 0) {
            const aprob = datos.filter(e => parseFloat(e.FINAL) >= 6).length;
            const reprob = datos.length - aprob;
            aprobacionChart = new Chart(document.getElementById('aprobacionChart').getContext('2d'), {
                type: 'doughnut',
                data: { labels: ['Aprobados', 'Reprobados'], datasets: [{ data: [aprob, reprob], backgroundColor: [`${chartColors.success}B3`, `${chartColors.danger}B3`], borderColor: chartColors.border, borderWidth: 1 }] }, 
                options: { ...commonOptions, cutout: '60%', plugins: { ...commonOptions.plugins, legend: { position: 'bottom' }, title: { display: true, text: 'Estado de Aprobación' } } }
            });
        } else if (document.getElementById('aprobacionChart')) { $(document.getElementById('aprobacionChart')).parent().html('<canvas id="aprobacionChart"></canvas><p class="text-center text-card-text-muted-custom small mt-5">No hay datos para mostrar.</p>') }
    }

    function analizarYCrearGraficosDeActividades(datos, chartColors) { // chartColors para tarjetas
        if (!datos || datos.length === 0) {
            $('#actividadMasEntregada, #actividadMenosEntregada, #cuestionarioMasEntregado, #cuestionarioMenosEntregado').text('-');
            $('#porcentajeMasEntregada, #porcentajeMenosEntregada, #porcentajeCuestionarioMas, #porcentajeCuestionarioMenos, #porcentajeEntregaProyecto, #porcentajeEntregaBitacora, #puntosExtraPorcentaje').text('0%');
            $('#proyectoEntregados, #proyectoPendientes, #proyectoPromedio, #bitacoraEntregados, #bitacoraPendientes, #bitacoraPromedio, #puntosExtraEntregados').text('0');

            const chartsToCleanIds = ['actividadesChart2', 'entregasActividadesChart', 'cuestionariosRadarChart', 'entregasCuestionariosChart', 'proyectoEntregaChart', 'proyectoCalificacionesChart', 'bitacoraEntregaChart', 'bitacoraCalificacionesChart', 'puntosExtraChart'];
            const chartVars = [actividadesChart2, entregasActividadesChart, cuestionariosRadarChart, entregasCuestionariosChart, proyectoEntregaChart, proyectoCalificacionesChart, bitacoraEntregaChart, bitacoraCalificacionesChart, puntosExtraChart];

            chartVars.forEach((chartVar, index) => {
                if (chartVar) {
                    chartVar.destroy();
                    switch (chartsToCleanIds[index]) {
                        case 'actividadesChart2': actividadesChart2 = null; break;
                        case 'entregasActividadesChart': entregasActividadesChart = null; break;
                        case 'cuestionariosRadarChart': cuestionariosRadarChart = null; break;
                        case 'entregasCuestionariosChart': entregasCuestionariosChart = null; break;
                        case 'proyectoEntregaChart': proyectoEntregaChart = null; break;
                        case 'proyectoCalificacionesChart': proyectoCalificacionesChart = null; break;
                        case 'bitacoraEntregaChart': bitacoraEntregaChart = null; break;
                        case 'bitacoraCalificacionesChart': bitacoraCalificacionesChart = null; break;
                        case 'puntosExtraChart': puntosExtraChart = null; break;
                    }
                }
                const canvasId = chartsToCleanIds[index];
                if (document.getElementById(canvasId)) {
                    $(`#${canvasId}`).parent().html(`<canvas id="${canvasId}"></canvas><p class="text-center text-card-text-muted-custom small mt-3">No hay datos.</p>`);
                }
            });
            return;
        }

        const canvasIds = ['actividadesChart2', 'entregasActividadesChart', 'cuestionariosRadarChart', 'entregasCuestionariosChart', 'proyectoEntregaChart', 'proyectoCalificacionesChart', 'bitacoraEntregaChart', 'bitacoraCalificacionesChart', 'puntosExtraChart'];
        canvasIds.forEach(id => {
            const container = $(`#${id}`).parent();
            if (container.find('p.text-card-text-muted-custom').length > 0) { // Recrear canvas si se mostró el mensaje de "no hay datos"
                container.html(`<canvas id="${id}"></canvas>`);
            }
        });


        analizarActividades(datos, chartColors);

        crearGraficaActividadesRendimiento(datos, chartColors);
        crearGraficaEntregasActividades(datos, chartColors);
        crearGraficaRadarCuestionarios(datos, chartColors);
        crearGraficaEntregasCuestionarios(datos, chartColors);
    }

    function analizarActividades(datos, chartColors) {
        const acts = ['ACTIVIDAD4', 'ACTIVIDAD5', 'ACTIVIDAD6'], cuests = ['CUESTIONARIO4', 'CUESTIONARIO5', 'CUESTIONARIO6'];
        const calcStats = (items, prefix) => items.map(item => {
            const ent = datos.filter(e => parseFloat(e[item]) > 0).length;
            const porc = datos.length > 0 ? (ent / datos.length * 100) : 0;
            return { nom: `${prefix} ${item.replace(prefix.toUpperCase(), '')}`, ent, tot: datos.length, porc: porc.toFixed(1) };
        }).sort((a, b) => b.porc - a.porc);

        const statsActs = calcStats(acts, 'Actividad');
        const statsCuests = calcStats(cuests, 'Cuestionario');

        $('#actividadMasEntregada').text(statsActs[0]?.nom || '-'); $('#porcentajeMasEntregada').text(`${statsActs[0]?.porc || 0}% (${statsActs[0]?.ent || 0}/${statsActs[0]?.tot || 0})`);
        $('#actividadMenosEntregada').text(statsActs[statsActs.length - 1]?.nom || '-'); $('#porcentajeMenosEntregada').text(`${statsActs[statsActs.length - 1]?.porc || 0}% (${statsActs[statsActs.length - 1]?.ent || 0}/${statsActs[statsActs.length - 1]?.tot || 0})`);
        $('#cuestionarioMasEntregado').text(statsCuests[0]?.nom || '-'); $('#porcentajeCuestionarioMas').text(`${statsCuests[0]?.porc || 0}% (${statsCuests[0]?.ent || 0}/${statsCuests[0]?.tot || 0})`);
        $('#cuestionarioMenosEntregado').text(statsCuests[statsCuests.length - 1]?.nom || '-'); $('#porcentajeCuestionarioMenos').text(`${statsCuests[statsCuests.length - 1]?.porc || 0}% (${statsCuests[statsCuests.length - 1]?.ent || 0}/${statsCuests[statsCuests.length - 1]?.tot || 0})`);

        const proyBit = ['PROYECTO', 'BITACORA'].reduce((acc, item) => {
            const ent = datos.filter(e => parseFloat(e[item]) > 0);
            const porc = datos.length > 0 ? (ent.length / datos.length * 100) : 0;
            const prom = ent.length > 0 ? ent.reduce((s, e) => s + parseFloat(e[item] || 0), 0) / ent.length : 0;
            acc[item] = { ent: ent.length, tot: datos.length, porc: porc.toFixed(1), prom: prom.toFixed(1), entregados_data: ent.map(e => parseFloat(e[item])) };
            return acc;
        }, {});

        if (proyBit['PROYECTO']) {
            $('#proyectoEntregados').text(proyBit.PROYECTO.ent); $('#proyectoPendientes').text(proyBit.PROYECTO.tot - proyBit.PROYECTO.ent);
            $('#proyectoPromedio').text(proyBit.PROYECTO.prom); $('#porcentajeEntregaProyecto').text(`${proyBit.PROYECTO.porc}%`);
            crearGraficaProyectoEntrega({ entregados: proyBit.PROYECTO.ent, total: proyBit.PROYECTO.tot }, chartColors);
            crearGraficaCalificacionesProyecto(proyBit.PROYECTO.entregados_data, chartColors);
        }
        if (proyBit['BITACORA']) {
            $('#bitacoraEntregados').text(proyBit.BITACORA.ent); $('#bitacoraPendientes').text(proyBit.BITACORA.tot - proyBit.BITACORA.ent);
            $('#bitacoraPromedio').text(proyBit.BITACORA.prom); $('#porcentajeEntregaBitacora').text(`${proyBit.BITACORA.porc}%`);
            crearGraficaBitacoraEntrega({ entregados: proyBit.BITACORA.ent, total: proyBit.BITACORA.tot }, chartColors);
            crearGraficaCalificacionesBitacora(proyBit.BITACORA.entregados_data, chartColors);
        }

        const pex = datos.filter(e => parseFloat(e.PUNTOEX) > 0);
        const pexPorc = datos.length > 0 ? (pex.length / datos.length * 100) : 0;
        $('#puntosExtraEntregados').text(`${pex.length}/${datos.length}`); $('#puntosExtraPorcentaje').text(`${pexPorc.toFixed(1)}%`);
        crearGraficaPuntosExtra(datos, { entregados: pex.length, total: datos.length, porcentaje: pexPorc.toFixed(1) }, chartColors);
    }

    const chartBaseOptions = (chartColors) => ({ // chartColors serán los de tarjeta
        responsive: true, maintainAspectRatio: false,
        scales: {
            x: { ticks: { color: chartColors.text, font: { size: 10 } }, grid: { color: chartColors.grid } },
            y: { ticks: { color: chartColors.text, font: { size: 10 } }, grid: { color: chartColors.grid } }
        },
        plugins: {
            legend: { display: true, labels: { color: chartColors.text, boxWidth: 12, padding: 15, font: { size: 11 } } },
            title: { display: true, color: chartColors.text, font: { size: 13, weight: '500' } },
            tooltip: {
                backgroundColor: colorPalette.cardBackground, 
                titleColor: colorPalette.textPrimary,
                bodyColor: colorPalette.textPrimary,
                borderColor: colorPalette.borderDark,
                borderWidth: 1
            }
        }
    });
    const radarBaseOptions = (chartColors) => ({ // chartColors serán los de tarjeta
        responsive: true, maintainAspectRatio: false,
        scales: {
            r: {
                angleLines: { color: chartColors.grid },
                grid: { color: chartColors.grid },
                pointLabels: { color: chartColors.text, font: { size: 10 } },
                ticks: { color: chartColors.text, backdropColor: 'transparent', stepSize: 2, font: { size: 9 } }
            }
        },
        plugins: {
            legend: { display: true, labels: { color: chartColors.text, boxWidth: 12, padding: 15, font: { size: 10 } } },
            title: { display: false, color: chartColors.text, font: { size: 13, weight: '500' } },
            tooltip: {
                backgroundColor: colorPalette.cardBackground,
                titleColor: colorPalette.textPrimary,
                bodyColor: colorPalette.textPrimary,
                borderColor: colorPalette.borderDark,
                borderWidth: 1
            }
        }
    });


    function crearGraficaActividadesRendimiento(datos, chartColors) {
        const canvasId = 'actividadesChart2';
        if (actividadesChart2) { actividadesChart2.destroy(); actividadesChart2 = null; }
        if (!datos || datos.length === 0 || !document.getElementById(canvasId)) return;
    
        const ctx = document.getElementById(canvasId).getContext('2d');
        const acts = ['ACTIVIDAD4', 'ACTIVIDAD5', 'ACTIVIDAD6'];
        const labels = acts.map(a => `Act ${a.slice(-1)}`);
        
        // Calculate exact counts
        const entregados = acts.map(a => datos.filter(e => parseFloat(e[a]) > 0).length);
        const pendientes = acts.map(a => datos.length - entregados[acts.indexOf(a)]);
        
        // Calculate trend line based on delivery percentage
        const porcentajeEntregas = acts.map(a => datos.length > 0 ? (entregados[acts.indexOf(a)] / datos.length * 100) : 0);
        const xValues = [0, 1, 2];
        
        // Calculate trend line
        const n = xValues.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        for (let i = 0; i < n; i++) {
            sumX += xValues[i];
            sumY += porcentajeEntregas[i];
            sumXY += xValues[i] * porcentajeEntregas[i];
            sumXX += xValues[i] * xValues[i];
        }
        const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const b = (sumY - m * sumX) / n;
        const tendencia = xValues.map(x => m * x + b);
    
        const options = chartBaseOptions(chartColors);
        options.plugins.title.display = false;
        options.plugins.legend.labels.font.size = 10;
        options.scales = {
            y: {
                ...options.scales.y,
                title: { display: true, text: 'Número de Estudiantes', color: chartColors.text },
                ticks: { precision: 0, stepSize: 1 },
                max: datos.length,
                min: 0
            },
            y1: {
                position: 'right',
                title: { display: true, text: '% de Entregas', color: chartColors.text },
                min: 0,
                max: 100,
                grid: { display: false },
                ticks: { callback: value => value + '%' }
            },
            x: { 
                ...options.scales.x,
                grid: { display: false }
            }
        };
        
        // Chart configuration
        const config = {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Entregadas',
                        data: entregados,
                        backgroundColor: `${chartColors.success}D0`,
                        borderColor: chartColors.success,
                        borderWidth: 1,
                        order: 1,
                        barPercentage: 0.4,
                        categoryPercentage: 0.5
                    },
                    {
                        label: 'Pendientes',
                        data: pendientes,
                        backgroundColor: `${chartColors.danger}80`,
                        borderColor: chartColors.danger,
                        borderWidth: 1,
                        order: 1,
                        barPercentage: 0.4,
                        categoryPercentage: 0.5
                    },
                    {
                        label: 'Tendencia (% de entregas)',
                        data: tendencia,
                        type: 'line',
                        borderColor: chartColors.primary,
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointBackgroundColor: chartColors.primary,
                        pointBorderColor: '#fff',
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        fill: false,
                        order: 0,
                        tension: 0.1,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                ...options,
                plugins: {
                    ...options.plugins,
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.raw;
                                const total = context.dataset.label === 'Tendencia (% de entregas)' 
                                    ? '' 
                                    : ` de ${datos.length}`;
                                const percentage = context.dataset.label === 'Tendencia (% de entregas)'
                                    ? ''
                                    : ` (${Math.round((value / datos.length) * 100)}%)`;
                                return `${label}: ${value}${total}${percentage}`;
                            }
                        }
                    }
                }
            }
        };
        
        actividadesChart2 = new Chart(ctx, config);
    }

    function crearGraficaEntregasActividades(datos, chartColors) {
        const canvasId = 'entregasActividadesChart';
        if (entregasActividadesChart) { entregasActividadesChart.destroy(); entregasActividadesChart = null; }
        if (!datos || datos.length === 0 || !document.getElementById(canvasId)) return;
        const ctx = document.getElementById(canvasId).getContext('2d');
        const acts = ['ACTIVIDAD4', 'ACTIVIDAD5', 'ACTIVIDAD6'], labels = acts.map(a => `Act ${a.slice(-1)}`);
        const ent = acts.map(a => datos.filter(e => parseFloat(e[a]) > 0).length);
        const pend = ent.map(v => datos.length - v);
        const options = chartBaseOptions(chartColors);
        options.scales.y.stacked = true; options.scales.x.stacked = true; options.scales.y.ticks.precision = 0;
        options.plugins.title.display = false;

        entregasActividadesChart = new Chart(ctx, { type: 'bar', data: { labels, datasets: [{ label: 'Entregados', data: ent, backgroundColor: `${chartColors.success}B3` }, { label: 'Pendientes', data: pend, backgroundColor: `${chartColors.danger}B3` }] }, options: options });
    }

    function crearGraficaRadarCuestionarios(datos, chartColors) {
        const canvasId = 'cuestionariosRadarChart';
        if (cuestionariosRadarChart) { 
            cuestionariosRadarChart.destroy(); 
            cuestionariosRadarChart = null; 
        }
        if (!datos || datos.length === 0 || !document.getElementById(canvasId)) return;
        
        const ctx = document.getElementById(canvasId).getContext('2d');
        const cuests = ['CUESTIONARIO4', 'CUESTIONARIO5', 'CUESTIONARIO6'];
        const labels = cuests.map(c => `Cuest ${c.slice(-1)}`);
        
        // Calculate exact counts
        const entregados = cuests.map(c => datos.filter(e => parseFloat(e[c]) > 0).length);
        const pendientes = cuests.map(c => datos.length - entregados[cuests.indexOf(c)]);
        
        // Calculate trend line based on delivery percentage
        const porcentajeEntregas = cuests.map(c => datos.length > 0 ? 
            (entregados[cuests.indexOf(c)] / datos.length * 100) : 0);
        const xValues = [0, 1, 2];
        
        // Calculate trend line
        const n = xValues.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        for (let i = 0; i < n; i++) {
            sumX += xValues[i];
            sumY += porcentajeEntregas[i];
            sumXY += xValues[i] * porcentajeEntregas[i];
            sumXX += xValues[i] * xValues[i];
        }
        const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const b = (sumY - m * sumX) / n;
        const tendencia = xValues.map(x => m * x + b);
        
        const options = chartBaseOptions(chartColors);
        options.plugins.title = {
            ...options.plugins.title,
            text: 'Comparativa Cuestionarios',
            display: true
        };
        options.plugins.legend.labels.font.size = 10;
        options.scales = {
            y: {
                ...options.scales.y,
                title: { display: true, text: 'Número de Estudiantes', color: chartColors.text },
                ticks: { precision: 0, stepSize: 1 },
                max: datos.length,
                min: 0
            },
            y1: {
                position: 'right',
                title: { display: true, text: '% de Entregas', color: chartColors.text },
                min: 0,
                max: 100,
                grid: { display: false },
                ticks: { callback: value => value + '%' }
            },
            x: { 
                ...options.scales.x,
                grid: { display: false }
            }
        };
        
        // Chart configuration
        cuestionariosRadarChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Entregados',
                        data: entregados,
                        backgroundColor: `${chartColors.info}D0`,
                        borderColor: chartColors.info,
                        borderWidth: 1,
                        order: 1,
                        barPercentage: 0.4,
                        categoryPercentage: 0.5
                    },
                    {
                        label: 'Pendientes',
                        data: pendientes,
                        backgroundColor: `${chartColors.danger}80`,
                        borderColor: chartColors.danger,
                        borderWidth: 1,
                        order: 1,
                        barPercentage: 0.4,
                        categoryPercentage: 0.5
                    },
                    {
                        label: 'Tendencia (% de entregas)',
                        data: tendencia,
                        type: 'line',
                        borderColor: chartColors.primary,
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointBackgroundColor: chartColors.primary,
                        pointBorderColor: '#fff',
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        fill: false,
                        order: 0,
                        tension: 0.1,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                ...options,
                plugins: {
                    ...options.plugins,
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.raw;
                                const total = context.dataset.label === 'Tendencia (% de entregas)' 
                                    ? '' 
                                    : ` de ${datos.length}`;
                                const percentage = context.dataset.label === 'Tendencia (% de entregas)'
                                    ? ''
                                    : ` (${Math.round((value / datos.length) * 100)}%)`;
                                return `${label}: ${value}${total}${percentage}`;
                            }
                        }
                    }
                }
            }
        });
    }

    function crearGraficaEntregasCuestionarios(datos, chartColors) {
        const canvasId = 'entregasCuestionariosChart';
        if (entregasCuestionariosChart) { entregasCuestionariosChart.destroy(); entregasCuestionariosChart = null; }
        if (!datos || datos.length === 0 || !document.getElementById(canvasId)) return;
        const ctx = document.getElementById(canvasId).getContext('2d');
        const cuests = ['CUESTIONARIO4', 'CUESTIONARIO5', 'CUESTIONARIO6'], labels = cuests.map(c => `Cuest ${c.slice(-1)}`);
        const ent = cuests.map(c => datos.filter(e => parseFloat(e[c]) > 0).length);
        const pend = ent.map(v => datos.length - v);
        const options = chartBaseOptions(chartColors);
        options.scales.y.stacked = true; options.scales.x.stacked = true; options.scales.y.ticks.precision = 0;
        options.plugins.title.display = false;

        entregasCuestionariosChart = new Chart(ctx, { type: 'bar', data: { labels, datasets: [{ label: 'Entregados', data: ent, backgroundColor: `${chartColors.info}B3` }, { label: 'Pendientes', data: pend, backgroundColor: `${chartColors.danger}B3` }] }, options: options });
    }

    function crearGraficaProyectoEntrega(stats, chartColors) {
        const canvasId = 'proyectoEntregaChart';
        if (proyectoEntregaChart) { 
            proyectoEntregaChart.destroy(); 
            proyectoEntregaChart = null; 
        }
        if (!stats || !document.getElementById(canvasId)) return;
        
        const ctx = document.getElementById(canvasId).getContext('2d');
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            },
            elements: {
                arc: {
                    borderWidth: 0
                }
            }
        };
        
        proyectoEntregaChart = new Chart(ctx, { 
            type: 'doughnut', 
            data: { 
                labels: ['Entregados', 'Pendientes'], 
                datasets: [{ 
                    data: [stats.entregados, stats.total - stats.entregados], 
                    backgroundColor: [`${chartColors.success}B3`, `${chartColors.danger}90`], 
                    borderWidth: 0 
                }] 
            }, 
            options: options 
        });
    }
    
    function crearGraficaCalificacionesProyecto(califProy, chartColors) {
        const canvasId = 'proyectoCalificacionesChart';
        if (proyectoCalificacionesChart) { proyectoCalificacionesChart.destroy(); proyectoCalificacionesChart = null; }
        if (!califProy || califProy.length === 0 || !document.getElementById(canvasId)) return;
        const ctx = document.getElementById(canvasId).getContext('2d');
        const rangos = ['0-6', '6-7', '7-8', '8-9', '9-10'], counts = Array(5).fill(0);
        const coloresGrafica = [chartColors.danger, chartColors.warning, chartColors.info, chartColors.secondary, chartColors.success];
        califProy.forEach(c => { if (c < 6) counts[0]++; else if (c < 7) counts[1]++; else if (c < 8) counts[2]++; else if (c < 9) counts[3]++; else counts[4]++; });
        const options = chartBaseOptions(chartColors);
        options.plugins.legend.display = false; options.plugins.title.display = false; options.scales.y.ticks.precision = 0;
        proyectoCalificacionesChart = new Chart(ctx, { type: 'bar', data: { labels: rangos, datasets: [{ label: 'Estudiantes', data: counts, backgroundColor: coloresGrafica.map(c => `${c}B3`) }] }, options: options });
    }
    function crearGraficaBitacoraEntrega(stats, chartColors) {
        const canvasId = 'bitacoraEntregaChart';
        if (bitacoraEntregaChart) { 
            bitacoraEntregaChart.destroy(); 
            bitacoraEntregaChart = null; 
        }
        if (!stats || !document.getElementById(canvasId)) return;
        
        const ctx = document.getElementById(canvasId).getContext('2d');
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            },
            elements: {
                arc: {
                    borderWidth: 0
                }
            }
        };
        
        bitacoraEntregaChart = new Chart(ctx, { 
            type: 'doughnut', 
            data: { 
                labels: ['Entregadas', 'Pendientes'], 
                datasets: [{ 
                    data: [stats.entregados, stats.total - stats.entregados], 
                    backgroundColor: [`${chartColors.info}B3`, `${chartColors.danger}90`], 
                    borderWidth: 0 
                }] 
            }, 
            options: options 
        });
    }
    function crearGraficaCalificacionesBitacora(califBit, chartColors) {
        const canvasId = 'bitacoraCalificacionesChart';
        if (bitacoraCalificacionesChart) { bitacoraCalificacionesChart.destroy(); bitacoraCalificacionesChart = null; }
        if (!califBit || califBit.length === 0 || !document.getElementById(canvasId)) return;
        const ctx = document.getElementById(canvasId).getContext('2d');
        const rangos = ['0-6', '6-7', '7-8', '8-9', '9-10'], counts = Array(5).fill(0);
        const coloresGrafica = [chartColors.danger, chartColors.warning, chartColors.info, chartColors.secondary, chartColors.success];
        califBit.forEach(c => { if (c < 6) counts[0]++; else if (c < 7) counts[1]++; else if (c < 8) counts[2]++; else if (c < 9) counts[3]++; else counts[4]++; });
        const options = chartBaseOptions(chartColors);
        options.plugins.legend.display = false; options.plugins.title.display = false; options.scales.y.ticks.precision = 0;
        bitacoraCalificacionesChart = new Chart(ctx, { type: 'bar', data: { labels: rangos, datasets: [{ label: 'Estudiantes', data: counts, backgroundColor: coloresGrafica.map(c => `${c}B3`) }] }, options: options });
    }
    function crearGraficaPuntosExtra(datos, stats, chartColors) {
        const canvasId = 'puntosExtraChart';
        if (puntosExtraChart) { puntosExtraChart.destroy(); puntosExtraChart = null; }
        if (!datos || datos.length === 0 || !stats || !document.getElementById(canvasId)) return;
        const ctx = document.getElementById(canvasId).getContext('2d');
        const pexCounts = datos.filter(e => parseFloat(e.PUNTOEX) > 0).reduce((acc, e) => { const p = Math.floor(parseFloat(e.PUNTOEX) || 0); acc[p] = (acc[p] || 0) + 1; return acc; }, {});
        const labels = Object.keys(pexCounts).sort((a, b) => a - b).map(p => `${p} pts`);
        const data = Object.values(pexCounts);
        const options = chartBaseOptions(chartColors);
        options.plugins.legend.display = false; options.plugins.title.display = false; options.indexAxis = 'y'; options.scales.x.ticks.precision = 0;
        puntosExtraChart = new Chart(ctx, { type: 'bar', data: { labels, datasets: [{ label: 'Estudiantes', data, backgroundColor: `${chartColors.warning}B3` }] }, options: options }); // Usando warning (amarillo) para Puntos Extra
    }

    function generarSeccionesPorGrupoYEquipo(datos, chartColors) { // chartColors para tarjetas
        const container = $('#estudiantesCardsContainer');
        container.empty();

        Object.values(estudianteCardCharts).forEach(chart => {
            if (chart) chart.destroy();
        });
        estudianteCardCharts = {};

        if (!datos || datos.length === 0) {
            container.html(`<p class="text-center ${chartColors.isDark ? 'text-card-text-muted-custom' : 'text-muted'} mt-8 py-4">No hay datos de estudiantes para mostrar con los filtros actuales.</p>`);
            return;
        }
        
        const cardTemplate = $('#estudianteCardTemplate').prop('content');
        if (!cardTemplate) {
            console.error("Plantilla #estudianteCardTemplate no encontrada");
            container.html(`<p class="text-center text-custom-pink mt-8 py-4">Error: Plantilla de tarjeta de estudiante no encontrada.</p>`);
            return;
        }

        const estudiantesPorGrupo = datos.reduce((acc, est) => {
            const grupo = est.GRUPO || 'Sin Grupo Asignado';
            if (!acc[grupo]) acc[grupo] = [];
            acc[grupo].push(est);
            return acc;
        }, {});

        const nombresDeGrupos = Object.keys(estudiantesPorGrupo).sort((a, b) => {
            if (a === 'Sin Grupo Asignado') return 1; if (b === 'Sin Grupo Asignado') return -1;
            return a.localeCompare(b);
        });

        nombresDeGrupos.forEach(nombreGrupo => {
            const estudiantesDelGrupo = estudiantesPorGrupo[nombreGrupo];
            // Usar clases de Tailwind para el texto del header, que respetarán el tema
            const $grupoHeader = $(`<h2 class="text-2xl font-bold text-dark-text-primary dark:text-dark-text-primary mb-3 pb-2 border-b border-dark-border">${nombreGrupo}</h2>`);
            container.append($grupoHeader);

            const estudiantesPorEquipo = estudiantesDelGrupo.reduce((acc, est) => {
                const equipo = est.EQUIPO || 'Sin Equipo Asignado';
                if (!acc[equipo]) acc[equipo] = [];
                acc[equipo].push(est);
                return acc;
            }, {});

            const nombresDeEquipos = Object.keys(estudiantesPorEquipo).sort((a, b) => {
                if (a === 'Sin Equipo Asignado') return 1; if (b === 'Sin Equipo Asignado') return -1;
                return a.localeCompare(b);
            });

            nombresDeEquipos.forEach(nombreEquipo => {
                const estudiantesDelEquipo = estudiantesPorEquipo[nombreEquipo];
                let equipoHeaderText = nombreEquipo;
                if (nombreEquipo !== 'Sin Equipo Asignado') {
                    equipoHeaderText = `Equipo: ${nombreEquipo}`;
                } else if (Object.keys(estudiantesPorEquipo).length > 1 && nombreGrupo !== 'Sin Grupo Asignado') {
                    equipoHeaderText = `Integrantes Sin Equipo Asignado`;
                } else if (Object.keys(estudiantesPorEquipo).length === 1 && nombreEquipo === 'Sin Equipo Asignado') {
                    equipoHeaderText = '';
                }

                if (equipoHeaderText) {
                     const $equipoHeader = $(`<h3 class="text-xl font-semibold text-dark-text-primary dark:text-dark-text-primary mt-4 mb-4">${equipoHeaderText}</h3>`);
                    container.append($equipoHeader);
                }

                const $cardsGrid = $('<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 mb-8"></div>');
                container.append($cardsGrid);

                estudiantesDelEquipo.sort((a, b) => (a.COMPLETO || '').localeCompare(b.COMPLETO || '')).forEach(estudiante => {
                    const $cardClone = $(cardTemplate.cloneNode(true));
                    const $card = $cardClone.find('.estudiante-card-wrapper');

                    const califFinal = parseFloat(estudiante.FINAL) || 0;
                    const asistencia = parseFloat(estudiante.TOTALASIS) || 0;
                    const puntoEx = parseFloat(estudiante.PUNTOEX) || 0;

                    const nombreCompleto = estudiante.COMPLETO || "N A";
                    const partesNombre = nombreCompleto.split(' ');
                    let iniciales = partesNombre[0] ? partesNombre[0][0] : '';
                    if (partesNombre.length > 1 && partesNombre[1] && partesNombre[1].length > 0) {
                        iniciales += partesNombre[1][0];
                    } else if (partesNombre[0] && partesNombre[0].length > 1) {
                        iniciales = partesNombre[0].substring(0, 2);
                    }
                    $card.find('.estudiante-iniciales').text(iniciales.toUpperCase());

                    $card.find('.estudiante-nombre').text(nombreCompleto);
                    $card.find('.estudiante-nick').text(estudiante.NICK ? `@${estudiante.NICK}` : '-');
                    $card.find('.estudiante-grupo').text(estudiante.GRUPO || '-');
                    $card.find('.estudiante-equipo').text(estudiante.EQUIPO || '-');
                    $card.find('.estudiante-asistencia').text(`${asistencia.toFixed(0)}%`);
                    $card.find('.estudiante-puntoex').text(puntoEx.toFixed(1));

                    const esAprobado = califFinal >= 6;
                    const badgeBgColor = esAprobado ? chartColors.success : chartColors.danger; // Usar success y danger de la paleta de tarjeta
                    const badgeTextColor = colorPalette.white; // Siempre blanco para estos badges
                    const badgeText = esAprobado ? 'Aprobado' : 'Reprobado';
                    $card.find('.estudiante-estado-badge').html(`<span class="px-2 py-0.5 text-xs font-semibold rounded-full" style="background-color:${badgeBgColor}; color:${badgeTextColor};">${badgeText}</span>`);


                    $card.find('.estudiante-calificacion-final').text(califFinal.toFixed(1));
                    const barraCalificacion = $card.find('.estudiante-calificacion-barra');
                    barraCalificacion.css('width', `${califFinal * 10}%`);
                    if (esAprobado) {
                        barraCalificacion.css('background-color', chartColors.success); // Verde
                    } else if (califFinal >= 4) {
                        barraCalificacion.css('background-color', chartColors.warning); // Amarillo
                    } else {
                        barraCalificacion.css('background-color', chartColors.danger); // Rojo/Rosa
                    }

                    const canvas = $card.find('.estudiante-mini-chart')[0];
                    const ctx = canvas.getContext('2d');
                    const estudianteIdUnico = `chart-est-${estudiante.ID || Math.random().toString(36).substr(2, 9)}`;
                    canvas.id = estudianteIdUnico;

                    const dataRendimiento = [
                        parseFloat(estudiante.ACTIVIDAD4) || 0, parseFloat(estudiante.ACTIVIDAD5) || 0, parseFloat(estudiante.ACTIVIDAD6) || 0,
                        parseFloat(estudiante.CUESTIONARIO4) || 0, parseFloat(estudiante.CUESTIONARIO5) || 0, parseFloat(estudiante.CUESTIONARIO6) || 0,
                        parseFloat(estudiante.PROYECTO) || 0, parseFloat(estudiante.BITACORA) || 0,
                    ];
                    const etiquetasRendimiento = ['A4', 'A5', 'A6', 'C4', 'C5', 'C6', 'Proy', 'Bit'];

                    const miniChartOptions = {
                        responsive: true, maintainAspectRatio: false,
                        scales: {
                            y: { beginAtZero: true, max: 10, ticks: { stepSize: 2, font: { size: 9 }, color: chartColors.text }, grid: { color: chartColors.grid, drawTicks: false, } },
                            x: { ticks: { font: { size: 9 }, maxRotation: 0, minRotation: 0, color: chartColors.text }, grid: { display: false } }
                        },
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: { label: context => ` ${context.dataset.label}: ${context.parsed.y.toFixed(1)}` },
                                backgroundColor: colorPalette.cardBackground,
                                titleColor: colorPalette.textPrimary, bodyColor: colorPalette.textPrimary,
                                borderColor: colorPalette.borderDark, borderWidth: 1
                            }
                        }
                    };

                    estudianteCardCharts[estudianteIdUnico] = new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: etiquetasRendimiento,
                            datasets: [{
                                label: 'Calificación', data: dataRendimiento,
                                backgroundColor: dataRendimiento.map(val => val >= 6 ? `${chartColors.success}B3` : `${chartColors.danger}B3`), // Verde para aprobado, Rojo/Rosa para reprobado
                                borderColor: dataRendimiento.map(val => val >= 6 ? chartColors.success : chartColors.danger),
                                borderWidth: 1
                            }]
                        },
                        options: miniChartOptions
                    });
                    $cardsGrid.append($card);
                });
            });
        });
    }

});