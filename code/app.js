// =============================
// CONFIGURACIÓN DE PARCIALES Y API
// =============================
const APIS_PARCIALES = {
    1: "https://script.googleusercontent.com/macros/echo?user_content_key=F50kUuixg_1_YNRBwi-XJB9Irsas9MzbLt4HIRZSSQW6mLPfwDXhVX1mvQ0tFXI9qN3e22ahv33gsDNlgmxmCNfjzRWAR42Hm5_BxDlH2jW0nuo2oDemN9CCS2h10ox_1xSncGQajx_ryfhECjZEnH7FvHuoCA3aY6oYh_uPeR7OGIv6mE7OArfLpHEi2SkZG7auUhcX8GvYge8pF1VBKFasVhBWVkFc&lib=MlfAK7sYzDUKhAPiLWJ3BQCiYTb7JmIRw",
    2: "https://script.google.com/macros/s/AKfycby_mP3ow6lHHhp5KoZ2cp-JvapWOc6bCEDHQqEdko2k9D1Y-ali/exec",
    3: "https://script.google.com/macros/s/AKfycbwh4AaAthKZ9R9n0aaYdXa4GnINTOWVImp1s9C5U6ZifKUBw6o2/exec"
};

const NOMENCLATURA_PARCIALES = {
    1: { actBase: 0, cuestBase: 0, numItems: 3, prefijoAct: 'ACTIVIDAD', prefijoCuest: 'CUESTIONARIO' },
    2: { actBase: 3, cuestBase: 3, numItems: 3, prefijoAct: 'ACTIVIDAD', prefijoCuest: 'CUESTIONARIO' },
    3: { actBase: 6, cuestBase: 6, numItems: 3, prefijoAct: 'ACTIVIDAD', prefijoCuest: 'CUESTIONARIO' }
};

let parcialActual = 1; // Por defecto Parcial 1 (el valor del select)


// Variables globales para las instancias de Chart.js y DataTables
let calificacionesChart, equiposChart, aprobacionChart;

// Constantes para el sistema de puntuación
const PESOS = {
    PROMEDIO_FINAL: 0.35,      // 35% del puntaje total
    ENTREGAS: 0.25,           // 25% del puntaje total
    PROYECTO: 0.15,           // 15% del puntaje total
    BITACORA: 0.15,           // 15% del puntaje total
    ASISTENCIA: 0.10          // 10% del puntaje total
};

// Variables globales para rankings
let rankingsGlobal = {
    topEstudiantes: [],
    peoresEstudiantes: [],
    rankingEquipos: [],
    rankingGrupos: []
};
let actividadesChart2, cuestionariosRadarChart, proyectoEntregaChart, bitacoraEntregaChart, puntosExtraChart, entregasActividadesChart, entregasCuestionariosChart, proyectoCalificacionesChart, bitacoraCalificacionesChart;
let estudianteCardCharts = {};

let dataTable, topEstudiantesDataTable, reprobadosDataTable;

let estudiantes = [];
// Variables globales para almacenar los datos de cada parcial
let datosP1 = [];
let datosP2 = [];
let datosP3 = [];
let allDataLoaded = false;
let tipoGraficaActividades = 'barras';
let gruposPromedioChart;

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

function getApiUrlActual() {
    return APIS_PARCIALES[parcialActual];
}

function getNomenclaturaActual() {
    const config = NOMENCLATURA_PARCIALES[parcialActual];
    if (!config) {
        console.error("Configuración de nomenclatura no encontrada para el parcial:", parcialActual);
        return { actividades: [], cuestionarios: [], config: { actBase: 0, cuestBase: 0, numItems: 0, prefijoAct: '', prefijoCuest: '' } };
    }
    const actividades = [];
    const cuestionarios = [];
    for (let i = 1; i <= config.numItems; i++) {
        actividades.push(`${config.prefijoAct}${config.actBase + i}`);
        cuestionarios.push(`${config.prefijoCuest}${config.cuestBase + i}`);
    }
    return { actividades, cuestionarios, config };
}


function getChartColors(isDark, onCard = false) {
    if (isDark) { 
        if (onCard) {
            return {
                isDark: true, primary: colorPalette.primaryPurple, secondary: colorPalette.secondaryPurplePink,
                success: colorPalette.statusGreen, info: colorPalette.accentBlue, warning: colorPalette.accentYellow,
                danger: colorPalette.statusRedPink, text: colorPalette.textPrimary, border: colorPalette.borderDark,
                grid: 'rgba(156, 163, 175, 0.1)', white: colorPalette.white, darkTextOnLightBg: colorPalette.pageBackground,
                cardBg: colorPalette.cardBackground, cardTextMuted: colorPalette.textSecondary,
            };
        }
        return {
            isDark: true, primary: colorPalette.primaryPurple, secondary: colorPalette.secondaryPurplePink,
            success: colorPalette.statusGreen, info: colorPalette.accentBlue, warning: colorPalette.accentYellow,
            danger: colorPalette.statusRedPink, text: colorPalette.textPrimary, border: colorPalette.borderDark,
            grid: 'rgba(156, 163, 175, 0.15)', white: colorPalette.white, darkTextOnLightBg: colorPalette.pageBackground,
            cardBg: colorPalette.cardBackground, cardText: colorPalette.textPrimary, cardTextMuted: colorPalette.textSecondary,
            cardBorder: colorPalette.borderDark,
        };
    } else { 
        return {
            isDark: false, primary: '#0D6EFD', secondary: '#6C757D', success: '#198754', info: '#0DCAF0',
            warning: '#FFC107', danger: '#DC3545', text: '#212529', border: 'rgba(0, 0, 0, 0.1)',
            grid: 'rgba(0, 0, 0, 0.1)', white: '#FFFFFF', darkTextOnLightBg: '#212529',
            cardBg: '#FFFFFF', cardText: '#212529', cardTextMuted: 'rgba(33, 37, 41, 0.75)',
            cardBorder: 'rgba(0, 0, 0, 0.125)',
        };
    }
}


// Function to load all three parcials data at startup
function cargarTodosLosParciales() {
    const urls = Object.values(APIS_PARCIALES);
    const promises = urls.map((url, index) => {
        return $.ajax({
            url: url,
            type: 'GET',
            dataType: 'json'
        }).then(data => {
            console.log(`Datos cargados para Parcial ${index + 1}`);
            return data;
        }).catch(error => {
            console.error(`Error al cargar datos del Parcial ${index + 1}:`, error);
            return [];
        });
    });
    
    return Promise.all(promises)
        .then(responses => {
            datosP1 = responses[0];
            datosP2 = responses[1];
            datosP3 = responses[2];
            allDataLoaded = true;
            console.log('Todos los datos de parciales han sido cargados');
            return true;
        })
        .catch(error => {
            console.error('Error al cargar todos los parciales:', error);
            return false;
        });
}

$(document).ready(function () {
    // Show loading on page load
    showLoading();

    initializeDashboardSections();
    initializeSidebarToggler();
    initializeChartDefaults();

    parcialActual = parseInt($('#parcialFilter').val()) || 1;
    
    // Cargar todos los parciales al inicio
    cargarTodosLosParciales().then(() => {
        cargarDatosDelParcialSeleccionado();
    });


    function debugStudentData(students) {
        if (!students || students.length === 0) {
            console.warn('No hay datos de estudiantes para depurar');
            return;
        }
        const firstStudent = students[0];
        console.log('Primer estudiante:', firstStudent);
        console.log('Claves disponibles en el estudiante:', Object.keys(firstStudent));
        const importantFields = ['NOMBRE', 'GRUPO', 'EQUIPO', 'FINAL', 'ENTREGAS', 'CALIF_PROYECTO', 'CALIF_BITACORA', 'ASISTENCIA'];
        const missingFields = importantFields.filter(field => !(field in firstStudent));
        if (missingFields.length > 0) console.warn('Campos faltantes en los datos del estudiante:', missingFields);
        else console.log('Todos los campos importantes están presentes');
    }

    // Function to show loading state with overlay and skeletons
function showLoading(sectionId) {
    // Add loading active class to body
    $('body').addClass('loading-active');
    
    // Show the loading overlay
    $('.loading-overlay').addClass('active');
    
    // Show the appropriate skeleton based on section
    if (sectionId) {
        $(`.${sectionId}-skeleton`).addClass('active');
    } else {
        $('.visionGeneral-skeleton').addClass('active');
    }
    
    // Hide actual content
    $('.section-content').addClass('loading-blur');
}

// Function to hide loading state
function hideLoading() {
    // Remove loading active class from body
    $('body').removeClass('loading-active');
    
    // Hide the loading overlay
    $('.loading-overlay').removeClass('active');
    
    // Hide all skeletons
    $('.skeleton-container').removeClass('active');
    
    // Show actual content
    $('.section-content').removeClass('loading-blur');
}

function cargarDatosDelParcialSeleccionado() {
        // Show loading state
        showLoading();
        
        // Reset filters
        $('#grupoFilter, #equipoFilter, #estadoFilter').val(''); 
        $('#mobileGrupoFilter, #mobileEquipoFilter, #mobileEstadoFilter').val('');

        // Si los datos ya están cargados, usarlos directamente
        if (allDataLoaded) {
            let data;
            switch(parcialActual) {
                case 1:
                    data = datosP1;
                    break;
                case 2:
                    data = datosP2;
                    break;
                case 3:
                    data = datosP3;
                    break;
                default:
                    data = [];
            }
            
            if (data && data.length > 0) {
                estudiantes = data;
                console.log(`Usando datos precargados para Parcial ${parcialActual}:`);
                debugStudentData(estudiantes);

                actualizarFiltros(estudiantes);

                const activeSectionId = $('.sidebar .nav-link.active').data('section') || 'visionGeneral';
                const isDark = document.documentElement.classList.contains('dark');
                const sectionIsCardHeavy = ['visionGeneral', 'rendimientoActividades', 'analisisGruposEquipos', 'topEstudiantes'].includes(activeSectionId);
                const colorsForSection = getChartColors(isDark, sectionIsCardHeavy);
                
                handleSectionChange(activeSectionId, estudiantes, colorsForSection);

                // Hide loading state
                hideLoading();
                return;
            }
        }

        // Si los datos no están cargados o están vacíos, cargarlos mediante AJAX
        const apiUrl = getApiUrlActual();

        $.ajax({
            url: apiUrl,
            type: 'GET',
            dataType: 'json',
            success: function (data) {
                estudiantes = data;

                // Guardar los datos en la variable global correspondiente
                switch(parcialActual) {
                    case 1:
                        datosP1 = data;
                        break;
                    case 2:
                        datosP2 = data;
                        break;
                    case 3:
                        datosP3 = data;
                        break;
                }

                console.log(`Datos cargados para Parcial ${parcialActual}:`);
                debugStudentData(estudiantes);

                actualizarFiltros(data); 

                const activeSectionId = $('.sidebar .nav-link.active').data('section') || 'visionGeneral';
                const isDark = document.documentElement.classList.contains('dark');
                const sectionIsCardHeavy = ['visionGeneral', 'rendimientoActividades', 'analisisGruposEquipos', 'topEstudiantes'].includes(activeSectionId);
                const colorsForSection = getChartColors(isDark, sectionIsCardHeavy);
                
                handleSectionChange(activeSectionId, estudiantes, colorsForSection);

                // Hide loading state
                hideLoading();
            },
            error: function (error) {
                console.error(`Error al cargar los datos del Parcial ${parcialActual}:`, error);
                // Show error in loading overlay
                $('.loading-content p').text('Error al cargar los datos. Intente de nuevo.');
                // Keep overlay visible but hide skeletons
                $('.skeleton-container').removeClass('active');
                estudiantes = []; 
                handleSectionChange($('.sidebar .nav-link.active').data('section') || 'visionGeneral', estudiantes, getChartColors(document.documentElement.classList.contains('dark'), false));
            }
        });
    }


    function initializeChartDefaults() {
        const isDark = document.documentElement.classList.contains('dark') || document.documentElement.getAttribute('data-bs-theme') === 'dark';
        const currentChartColors = getChartColors(isDark, false); 

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
                    const sectionIsCardHeavy = ['visionGeneral', 'rendimientoActividades', 'analisisGruposEquipos', 'topEstudiantes'].includes(activeSectionId); 
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
                if (dataTable && $('#listaEstudiantes').hasClass('active')) dataTable.columns.adjust().responsive.recalc();
                if (topEstudiantesDataTable && $('#topEstudiantes').hasClass('active')) topEstudiantesDataTable.columns.adjust().responsive.recalc();
                if (reprobadosDataTable && $('#alumnosReprobados').hasClass('active')) reprobadosDataTable.columns.adjust().responsive.recalc();
                Object.values(Chart.instances).forEach(instance => {
                    if (instance && $(instance.canvas).closest('.section-content').hasClass('active')) {
                        // instance.resize(); 
                    }
                });
            }, 350); 
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
            
            // Si la sección es topEstudiantes (ranking), ocultar el spinner de carga inmediatamente
            if (sectionId === 'topEstudiantes') {
                hideLoading();
            }

            const isDark = document.documentElement.classList.contains('dark');
            const sectionIsCardHeavy = ['visionGeneral', 'rendimientoActividades', 'analisisGruposEquipos', 'topEstudiantes'].includes(sectionId);
            const colorsForSection = getChartColors(isDark, sectionIsCardHeavy);
            handleSectionChange(sectionId, estudiantes, colorsForSection);
        });
    }

    function handleSectionChange(sectionId, data, chartColors) {
        // Mostrar loading para todas las secciones excepto topEstudiantes (ranking)
        if (sectionId !== 'topEstudiantes') {
            showLoading(sectionId);
        }
        
        if (!data) {
            console.warn("handleSectionChange: Datos no disponibles aún.");
            return;
        }

        const cardSpecificChartColors = getChartColors(chartColors.isDark, true);

        if (data.length === 0 && sectionId !== 'visionGeneral' && sectionId !== 'rendimientoActividades') {
            if ($(`#${sectionId}`).find('table.dataTable').length > 0) {
                const dtInstance = $(`#${sectionId}`).find('table.dataTable').DataTable();
                if (dtInstance && typeof dtInstance.clear === 'function') { 
                    dtInstance.clear().draw();
                }
            }
            if (sectionId === 'analisisGruposEquipos') {
                generarSeccionesPorGrupoYEquipo([], cardSpecificChartColors);
            }
            if (sectionId === 'topEstudiantes') {
                actualizarRankings([], cardSpecificChartColors); 
            }
             if (sectionId === 'visionGeneral') { 
                calcularEstadisticas([]);
                crearGraficosPrincipales([], cardSpecificChartColors);
            }
             if (sectionId === 'rendimientoActividades') {
                analizarYCrearGraficosDeActividades([], cardSpecificChartColors);
            }
            
            // Hide loading screens once the data is processed
            hideLoading();
            return;
        }

        const datosFiltrados = obtenerDatosFiltrados(data);

        switch (sectionId) {
            case 'visionGeneral':
                calcularEstadisticas(datosFiltrados);
                crearGraficosPrincipales(datosFiltrados, cardSpecificChartColors);
                break;
            case 'listaEstudiantes':
                inicializarTablaEstudiantes(datosFiltrados);
                break;
            case 'topEstudiantes':
                actualizarRankings(datosFiltrados); 
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
        
        // Hide loading screens after data processing is complete
        hideLoading();
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
                if (estadoSeleccionado === 'Aprobado' && (isNaN(finalNum) || finalNum < 6)) cumple = false;
                if (estadoSeleccionado === 'Reprobado' && (isNaN(finalNum) || finalNum >= 6)) cumple = false;
            }
            return cumple;
        });
    }

    function cargarDatosFiltrados() {
        if (estudiantes.length === 0 && parcialActual !== 0) { 
            hideLoading();
            return;
        }
        showLoading();
        const activeSectionId = $('.sidebar .nav-link.active').data('section') || 'visionGeneral';
        const isDark = document.documentElement.classList.contains('dark');

        const sectionIsCardHeavy = ['visionGeneral', 'rendimientoActividades', 'analisisGruposEquipos', 'topEstudiantes'].includes(activeSectionId); 
        const colorsForSection = getChartColors(isDark, sectionIsCardHeavy);

        handleSectionChange(activeSectionId, estudiantes, colorsForSection);
        $('.loading').hide();
    }
    
    $('#parcialFilter, #mobileParcialFilter').on('change', function() {
        parcialActual = parseInt($(this).val());
        if ($(this).attr('id') === 'parcialFilter') {
            $('#mobileParcialFilter').val(parcialActual);
        } else {
            $('#parcialFilter').val(parcialActual);
        }
        console.log("Cambiando a Parcial: " + parcialActual);
        cargarDatosDelParcialSeleccionado(); 
        
        if ($(this).attr('id') === 'mobileParcialFilter' && typeof toggleMobileMenu === 'function') {
            // toggleMobileMenu(false); 
        }
    });


    $('#grupoFilter, #equipoFilter, #estadoFilter').on('change', function () {
        if ($(this).is('#grupoFilter')) {
            const grupoSel = $(this).val();
            const equiposPorGrupo = {};
            const todosLosEquiposSet = new Set();
            (estudiantes || []).forEach(est => { 
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
        actualizarFiltroEquipos('', {}, [...new Set((estudiantes || []).map(e => e.EQUIPO).filter(Boolean))].sort());
        cargarDatosFiltrados();
    });
    
    $('#mobileResetFilters').on('click', function () {
        $('#mobileGrupoFilter, #mobileEquipoFilter, #mobileEstadoFilter').val('');
        $('#parcialFilter').val($('#mobileParcialFilter').val()); 
        $('#grupoFilter').val($('#mobileGrupoFilter').val());
        $('#equipoFilter').val($('#mobileEquipoFilter').val());
        $('#estadoFilter').val($('#mobileEstadoFilter').val());
        $('#resetFilters').click(); 
        toggleMobileMenu(false);
    });


    function actualizarFiltros(datos) {
        if (!datos) datos = []; 
        const gruposUnicos = [...new Set(datos.map(item => item.GRUPO).filter(Boolean))].sort();
        const $grupoFilter = $('#grupoFilter');
        const grupoActual = $grupoFilter.val();
        $grupoFilter.empty().append('<option value="">Todos los grupos</option>');
        gruposUnicos.forEach(grupo => $grupoFilter.append(`<option value="${grupo}">${grupo}</option>`));
        if (gruposUnicos.includes(grupoActual)) $grupoFilter.val(grupoActual);
        else $grupoFilter.val(''); 

        const $mobileGrupoFilter = $('#mobileGrupoFilter');
        const mobileGrupoActual = $mobileGrupoFilter.val();
         $mobileGrupoFilter.empty().append('<option value="">Todos los grupos</option>');
        gruposUnicos.forEach(grupo => $mobileGrupoFilter.append(`<option value="${grupo}">${grupo}</option>`));
        if (gruposUnicos.includes(mobileGrupoActual)) $mobileGrupoFilter.val(mobileGrupoActual);
        else $mobileGrupoFilter.val('');


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
        
        const $mobileEquipoFilter = $('#mobileEquipoFilter');
        $mobileEquipoFilter.empty().append('<option value="">Todos los equipos</option>');
        equiposAMostrar.forEach(equipo => $mobileEquipoFilter.append(`<option value="${equipo}">${equipo}</option>`));

        if (equiposAMostrar.includes(equipoActual)) {
            $equipoFilter.val(equipoActual);
            $mobileEquipoFilter.val(equipoActual);
        } else {
            $equipoFilter.val('');
            $mobileEquipoFilter.val('');
        }
    }

    function calcularDesviacionEstandar(valores) {
        const n = valores.length;
        if (n === 0) return 0;
        const media = valores.reduce((a, b) => a + b, 0) / n;
        const sumaCuadrados = valores.map(x => Math.pow(x - media, 2)).reduce((a, b) => a + b, 0);
        return Math.sqrt(sumaCuadrados / n);
    }

    function normalizar(valor, max = 100, min = 0) {
        if (max === min) return 0; 
        return (parseFloat(valor || 0) - min) / (max - min);
    }

    function calcularPuntuacion(estudiante) {
        const puntuacionesNormalizadas = {
            promedio: normalizar(estudiante.FINAL, 10, 0),
            entregas: normalizar(estudiante.ENTREGAS, 100, 0),
            proyecto: normalizar(estudiante.CALIF_PROYECTO, 10, 0),
            bitacora: normalizar(estudiante.CALIF_BITACORA, 10, 0),
            asistencia: normalizar(estudiante.ASISTENCIA, 100, 0)
        };
        const puntuacionesPonderadas = {
            promedio: (puntuacionesNormalizadas.promedio || 0) * PESOS.PROMEDIO_FINAL,
            entregas: (puntuacionesNormalizadas.entregas || 0) * PESOS.ENTREGAS,
            proyecto: (puntuacionesNormalizadas.proyecto || 0) * PESOS.PROYECTO,
            bitacora: (puntuacionesNormalizadas.bitacora || 0) * PESOS.BITACORA,
            asistencia: (puntuacionesNormalizadas.asistencia || 0) * PESOS.ASISTENCIA
        };
        const puntuacionTotalBruta = Object.values(puntuacionesPonderadas).reduce((sum, val) => sum + (val || 0), 0) * 100;
        return {
            ...estudiante,
            puntuacionTotal: Math.min(100, Math.max(0, puntuacionTotalBruta)), 
            detallePuntuaciones: puntuacionesPonderadas 
        };
    }

    function calcularPuntuacionGrupo(estudiantesDelGrupo) {
        if (!estudiantesDelGrupo || estudiantesDelGrupo.length === 0) return 0;
        const puntuacionesInd = estudiantesDelGrupo.map(e => {
            return typeof e.puntuacionTotal === 'number' ? e.puntuacionTotal : calcularPuntuacion(e).puntuacionTotal;
        });
        const promedio = puntuacionesInd.reduce((a, b) => a + b, 0) / puntuacionesInd.length;
        const desviacion = calcularDesviacionEstandar(puntuacionesInd);
        const bonificacionEquidad = Math.max(0, (1 - (desviacion / 50)) * 5); 
        return Math.min(100, promedio + bonificacionEquidad);
    }

    function calcularRankingsAvanzados(estudiantesData) {
        const estudiantesConPuntuacion = estudiantesData.map(est => calcularPuntuacion(est));
        const estudiantesOrdenados = [...estudiantesConPuntuacion].sort((a, b) =>
            (b.puntuacionTotal || 0) - (a.puntuacionTotal || 0) 
        );
        const porEquipo = {};
        const porGrupo = {};
        estudiantesConPuntuacion.forEach(est => {
            const equipo = est.EQUIPO || 'Sin Equipo';
            if (!porEquipo[equipo]) porEquipo[equipo] = [];
            porEquipo[equipo].push(est);
            const grupo = est.GRUPO || 'Sin Grupo';
            if (!porGrupo[grupo]) porGrupo[grupo] = [];
            porGrupo[grupo].push(est);
        });
        const rankingEquipos = Object.entries(porEquipo).map(([nombreEquipo, miembrosEquipo]) => ({
            nombre: nombreEquipo,
            puntuacion: calcularPuntuacionGrupo(miembrosEquipo),
            cantidad: miembrosEquipo.length,
            estudiantes: miembrosEquipo.map(e => ({
                nombre: e.NOMBRE,
                puntuacion: e.puntuacionTotal
            })).sort((a, b) => (b.puntuacion || 0) - (a.puntuacion || 0))
        })).sort((a, b) => (b.puntuacion || 0) - (a.puntuacion || 0));
        const rankingGrupos = Object.entries(porGrupo).map(([nombreGrupo, miembrosGrupo]) => ({
            nombre: nombreGrupo,
            puntuacion: calcularPuntuacionGrupo(miembrosGrupo),
            cantidad: miembrosGrupo.length,
            equipos: Object.keys(porEquipo)
                .filter(eqNombre => porEquipo[eqNombre].some(e => e.GRUPO === nombreGrupo))
                .map(eqNombre => ({
                    nombre: eqNombre,
                    puntuacion: calcularPuntuacionGrupo(porEquipo[eqNombre].filter(e => e.GRUPO === nombreGrupo)) 
                }))
                .sort((a, b) => (b.puntuacion || 0) - (a.puntuacion || 0))
        })).sort((a, b) => (b.puntuacion || 0) - (a.puntuacion || 0));
        rankingsGlobal = {
            topEstudiantes: estudiantesOrdenados.slice(0, 10),
            peoresEstudiantes: [...estudiantesOrdenados].reverse().slice(0, 10),
            rankingEquipos,
            rankingGrupos,
            todosEstudiantes: estudiantesOrdenados
        };
        return rankingsGlobal;
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
        console.log('Actualizando rankings con datos (cantidad):', datos ? datos.length : 0);
        const $topEstudiantesSection = $('#topEstudiantes'); 
        if (!datos || datos.length === 0) {
            console.warn('No hay datos para actualizar rankings, limpiando elementos.');
            $topEstudiantesSection.find('#mejorEstudiante, #peorEstudiante, #mejorEquipo, #peorEquipo, #mejorGrupo, #peorGrupo').text('-');
            $topEstudiantesSection.find('#puntajeMejorEstudiante, #puntajePeorEstudiante, #promedioMejorEquipo, #promedioPeorEquipo, #promedioMejorGrupo, #promedioPeorGrupo').text('0.0');
            $topEstudiantesSection.find('#topEstudiantesContainer, #peoresEstudiantesContainer, #topEquiposContainer, #rankingGruposContainer').html('<div class="text-center text-muted py-4">No hay datos para mostrar con los filtros actuales.</div>');
            return;
        }
        let datosProcesados = [...datos];
        if (datosProcesados.length > 0) {
            const primerDato = datosProcesados[0];
            if (primerDato && !primerDato.NOMBRE && primerDato.nombre) {
                console.warn('Los datos usan minúsculas, mapeando a mayúsculas para rankings.');
                datosProcesados = datosProcesados.map(est => ({
                    ...est, NOMBRE: est.nombre || est.NOMBRE || '', COMPLETO: est.completo || est.COMPLETO || est.nombre || '', 
                    GRUPO: est.grupo || est.GRUPO || '', EQUIPO: est.equipo || est.EQUIPO || '', FINAL: est.final || est.FINAL || 0,
                    ENTREGAS: est.entregas || est.ENTREGAS || 0, CALIF_PROYECTO: est.calif_proyecto || est.CALIF_PROYECTO || 0,
                    CALIF_BITACORA: est.calif_bitacora || est.CALIF_BITACORA || 0, ASISTENCIA: est.asistencia || est.ASISTENCIA || 0
                }));
            } else if (primerDato && !primerDato.COMPLETO && primerDato.NOMBRE) {
                datosProcesados = datosProcesados.map(est => ({ ...est, COMPLETO: est.COMPLETO || est.NOMBRE || '', }));
            }
        }
        try {
            console.log('Calculando rankings avanzados...');
            const rankings = calcularRankingsAvanzados(datosProcesados);
            console.log('Rankings calculados:', rankings);

            const mejorEstudiante = rankings.topEstudiantes && rankings.topEstudiantes[0];
            const peorEstudiante = rankings.peoresEstudiantes && rankings.peoresEstudiantes[0];
            if (mejorEstudiante) {
                const nombreMejor = mejorEstudiante.COMPLETO || mejorEstudiante.NOMBRE || 'Estudiante destacado';
                $topEstudiantesSection.find('#mejorEstudiante').text(nombreMejor);
                $topEstudiantesSection.find('#puntajeMejorEstudiante').text(typeof mejorEstudiante.puntuacionTotal === 'number' ? mejorEstudiante.puntuacionTotal.toFixed(1) : '0.0');
            } else {
                $topEstudiantesSection.find('#mejorEstudiante').text('-'); $topEstudiantesSection.find('#puntajeMejorEstudiante').text('0.0');
            }
            if (peorEstudiante) {
                const nombrePeor = peorEstudiante.COMPLETO || peorEstudiante.NOMBRE || 'Estudiante';
                $topEstudiantesSection.find('#peorEstudiante').text(nombrePeor);
                $topEstudiantesSection.find('#puntajePeorEstudiante').text(typeof peorEstudiante.puntuacionTotal === 'number' ? peorEstudiante.puntuacionTotal.toFixed(1) : '0.0');
            } else {
                $topEstudiantesSection.find('#peorEstudiante').text('-'); $topEstudiantesSection.find('#puntajePeorEstudiante').text('0.0');
            }

            const mejorEquipo = rankings.rankingEquipos && rankings.rankingEquipos[0];
            const peorEquipo = rankings.rankingEquipos && rankings.rankingEquipos.length > 0 ? rankings.rankingEquipos[rankings.rankingEquipos.length - 1] : null;
            if (mejorEquipo && mejorEquipo.nombre) {
                $topEstudiantesSection.find('#mejorEquipo').text(mejorEquipo.nombre);
                $topEstudiantesSection.find('#promedioMejorEquipo').text(typeof mejorEquipo.puntuacion === 'number' ? mejorEquipo.puntuacion.toFixed(1) : '0.0');
            } else {
                $topEstudiantesSection.find('#mejorEquipo').text('-'); $topEstudiantesSection.find('#promedioMejorEquipo').text('0.0');
            }
            if (peorEquipo && peorEquipo.nombre) {
                $topEstudiantesSection.find('#peorEquipo').text(peorEquipo.nombre);
                $topEstudiantesSection.find('#promedioPeorEquipo').text(typeof peorEquipo.puntuacion === 'number' ? peorEquipo.puntuacion.toFixed(1) : '0.0');
            } else {
                $topEstudiantesSection.find('#peorEquipo').text('-'); $topEstudiantesSection.find('#promedioPeorEquipo').text('0.0');
            }

            const mejorGrupo = rankings.rankingGrupos && rankings.rankingGrupos[0];
            const peorGrupo = rankings.rankingGrupos && rankings.rankingGrupos.length > 0 ? rankings.rankingGrupos[rankings.rankingGrupos.length - 1] : null;
            if (mejorGrupo && mejorGrupo.nombre) {
                $topEstudiantesSection.find('#mejorGrupo').text(mejorGrupo.nombre);
                $topEstudiantesSection.find('#promedioMejorGrupo').text(typeof mejorGrupo.puntuacion === 'number' ? mejorGrupo.puntuacion.toFixed(1) : '0.0');
            } else {
                $topEstudiantesSection.find('#mejorGrupo').text('-'); $topEstudiantesSection.find('#promedioMejorGrupo').text('0.0');
            }
            if (peorGrupo && peorGrupo.nombre) {
                $topEstudiantesSection.find('#peorGrupo').text(peorGrupo.nombre);
                $topEstudiantesSection.find('#promedioPeorGrupo').text(typeof peorGrupo.puntuacion === 'number' ? peorGrupo.puntuacion.toFixed(1) : '0.0');
            } else {
                $topEstudiantesSection.find('#peorGrupo').text('-'); $topEstudiantesSection.find('#promedioPeorGrupo').text('0.0');
            }

            let topEstudiantesHtml = '';
            if (rankings.topEstudiantes && rankings.topEstudiantes.length > 0) {
                topEstudiantesHtml = rankings.topEstudiantes.map((est, index) => {
                    const nombre = est.COMPLETO || est.NOMBRE || 'Estudiante';
                    const puntuacion = typeof est.puntuacionTotal === 'number' ? est.puntuacionTotal : 0;
                    const highlightClassDark = 'dark:bg-gray-700'; 
                    const highlightClassLight = 'bg-slate-200'; 
                    const itemClasses = `flex items-center justify-between mb-1 p-3 rounded-md text-sm ${index < 3 ? `font-semibold ${highlightClassLight} ${highlightClassDark}` : '' }`;
                    return `
                        <div class="${itemClasses}">
                            <div class="flex items-center">
                                <span class="me-3 ${index < 3 ? 'text-yellow-400' : 'text-gray-500 dark:text-gray-400'}" style="width: 24px; text-align: center;">
                                    ${index < 3 ? ['🥇', '🥈', '🥉'][index] : `${index + 1}.`}
                                </span>
                                <span class="text-gray-800 dark:text-gray-200">${nombre}</span>
                            </div>
                            <span class="font-medium text-gray-700 dark:text-gray-300">${puntuacion.toFixed(1)}%</span>
                        </div>
                    `;
                }).join('');
            } else {
                topEstudiantesHtml = '<div class="text-center text-gray-500 dark:text-gray-400 py-4">No hay datos de estudiantes para mostrar</div>';
            }
            $topEstudiantesSection.find('#topEstudiantesContainer').html(topEstudiantesHtml);

            let peoresEstudiantesHtml = '';
            if (rankings.peoresEstudiantes && rankings.peoresEstudiantes.length > 0) {
                peoresEstudiantesHtml = rankings.peoresEstudiantes.slice(0, 10).map((est, index) => {
                    const nombre = est.COMPLETO || est.NOMBRE || 'Estudiante';
                    const puntuacion = typeof est.puntuacionTotal === 'number' ? est.puntuacionTotal : 0;
                    return `
                        <div class="flex items-center justify-between mb-1 p-3 rounded-md text-sm">
                            <div class="flex items-center">
                                <span class="me-3 text-gray-500 dark:text-gray-400" style="width: 24px; text-align: center;">${index + 1}.</span>
                                <span class="text-gray-800 dark:text-gray-200">${nombre}</span>
                            </div>
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-pink text-white">
                                ${puntuacion.toFixed(1)}%
                            </span>
                        </div>
                    `;
                }).join('');
            } else {
                peoresEstudiantesHtml = '<div class="text-center text-gray-500 dark:text-gray-400 py-4">No hay estudiantes en esta categoría.</div>';
            }
            $topEstudiantesSection.find('#peoresEstudiantesContainer').html(peoresEstudiantesHtml);

            let topEquiposHtml = '';
            if (rankings.rankingEquipos && rankings.rankingEquipos.length > 0) {
                topEquiposHtml = rankings.rankingEquipos.slice(0, 5).map((equipo, index) => {
                    const nombre = equipo.nombre || 'Sin nombre';
                    const puntuacion = typeof equipo.puntuacion === 'number' ? equipo.puntuacion : 0;
                    const cantidad = equipo.cantidad || 0;
                    const highlightClassDark = 'dark:bg-gray-700';
                    const highlightClassLight = 'bg-slate-200';
                    const itemClasses = `mb-3 p-3 rounded-md ${index < 3 ? `${highlightClassLight} ${highlightClassDark}` : ''}`;
                    return `
                        <div class="${itemClasses}">
                            <div class="flex items-center justify-between mb-1">
                                <div class="flex items-center">
                                    <span class="me-2 font-bold ${index < 3 ? 'text-yellow-400' : 'text-gray-500 dark:text-gray-400'}" style="width: 24px; text-align: center;">
                                        ${index < 3 ? ['🥇', '🥈', '🥉'][index] : `${index + 1}.`}
                                    </span>
                                    <span class="font-semibold text-gray-800 dark:text-gray-200">
                                        ${nombre}
                                        <small class="text-gray-500 dark:text-gray-400">(${cantidad} est.)</small>
                                    </span>
                                </div>
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-green text-white">
                                    ${puntuacion.toFixed(1)}%
                                </span>
                            </div>
                            <div class="progress mt-1" style="height: 6px;">
                                <div class="progress-bar bg-brand-green" style="width: ${puntuacion.toFixed(1)}%"></div>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                topEquiposHtml = '<div class="text-center text-gray-500 dark:text-gray-400 py-4">No hay datos de equipos para mostrar</div>';
            }
            $topEstudiantesSection.find('#topEquiposContainer').html(topEquiposHtml);

            let rankingGruposHtml = '';
            if (rankings.rankingGrupos && rankings.rankingGrupos.length > 0) {
                rankingGruposHtml = rankings.rankingGrupos.map((grupo, index) => {
                    const nombreGrupo = grupo.nombre || 'Sin nombre';
                    const cantidadGrupo = grupo.cantidad || 0;
                    const puntuacionGrupo = typeof grupo.puntuacion === 'number' ? grupo.puntuacion : 0;
                    const topEquipo = (grupo.equipos && grupo.equipos.length > 0) ? grupo.equipos[0] : { nombre: 'N/A', puntuacion: 0 };
                    const highlightClassDark = 'dark:bg-gray-700';
                    const highlightClassLight = 'bg-slate-200';
                    const cardClasses = `card mb-2 shadow-sm ${index < 1 ? `${highlightClassLight} ${highlightClassDark}` : 'bg-card-bg-custom'}`;
                    return `
                        <div class="${cardClasses}">
                            <div class="card-body p-3">
                                <div class="flex items-center">
                                    <div class="me-3 font-bold text-lg ${index < 1 ? 'text-yellow-400' : 'text-gray-500 dark:text-gray-400'}" style="width: 30px;">
                                        #${index + 1}
                                    </div>
                                    <div class="flex-grow-1">
                                        <h5 class="mb-0 font-semibold text-gray-800 dark:text-gray-200">${nombreGrupo}</h5>
                                        <small class="text-gray-500 dark:text-gray-400">
                                            ${cantidadGrupo} est. • 
                                            Mejor equipo: ${topEquipo.nombre} (${topEquipo.puntuacion.toFixed(1)}%)
                                        </small>
                                    </div>
                                    <div class="text-end" style="width: 100px;">
                                        <div class="font-bold text-xl text-brand-purple">${puntuacionGrupo.toFixed(1)}%</div>
                                        <div class="progress mt-1" style="height: 6px;">
                                            <div class="progress-bar bg-brand-purple" style="width: ${puntuacionGrupo.toFixed(1)}%"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                rankingGruposHtml = '<div class="text-center text-gray-500 dark:text-gray-400 py-4">No hay datos de grupos para mostrar</div>';
            }
            $topEstudiantesSection.find('#rankingGruposContainer').html(rankingGruposHtml);
            console.log('Rankings actualizados exitosamente para los elementos visibles.');
        } catch (error) {
            console.error('Error al actualizar rankings:', error);
            $topEstudiantesSection.find('#topEstudiantesContainer, #peoresEstudiantesContainer, #topEquiposContainer, #rankingGruposContainer').html('<div class="text-center text-red-500 py-4">Error al cargar rankings.</div>');
        }
    }


    function inicializarTablaEstudiantes(datos) {
        const tableId = '#estudiantesTable';
        if ($.fn.DataTable.isDataTable(tableId)) {
            dataTable.clear().rows.add(datos || []).draw();
        } else {
            dataTable = $(tableId).DataTable({
                data: datos || [],
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
        const topDataGeneral = [...(datos || [])].sort((a, b) => parseFloat(b.FINAL || 0) - parseFloat(a.FINAL || 0)).slice(0, 10);

        if ($.fn.DataTable.isDataTable(tableId)) {
            topEstudiantesDataTable.clear().rows.add(topDataGeneral).draw();
        } else {
            topEstudiantesDataTable = $(tableId).DataTable({
                data: topDataGeneral,
                columns: [
                    { data: null, render: (d, t, r, m) => m.row + 1, title: '#' },
                    { data: 'COMPLETO', title: 'Nombre' }, { data: 'GRUPO', title: 'Grupo' },
                    { data: 'EQUIPO', title: 'Equipo' }, { data: 'FINAL', render: rCalBadgeTabla, title: 'Cal. Final' }
                ],
                order: [[4, 'desc']], pageLength: 10, searching: false, info: false, lengthChange: false, responsive: true,
                language: { url: '//cdn.datatables.net/plug-ins/1.11.5/i18n/es-ES.json' }
            });
        }
        if (topEstudiantesDataTable) topEstudiantesDataTable.columns.adjust().responsive.recalc();
    }

    function actualizarTablaReprobados(datos) {
        const tableId = '#reprobadosTable';
        const reprobData = (datos || []).filter(e => parseFloat(e.FINAL) < 6)
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
        if (reprobadosDataTable && reprobadosDataTable.responsive) { // Comprobación añadida
             reprobadosDataTable.columns.adjust().responsive.recalc();
        } else if (reprobadosDataTable) {
            reprobadosDataTable.columns.adjust().draw(); // Fallback si responsive no está listo
        }
    }

    function rSemaforoTabla(data) {
        const c = parseFloat(data) || 0;
        const isDark = document.documentElement.classList.contains('dark');
        const generalColors = getChartColors(isDark, false);
        const colorSemaforo = c < 6 ? generalColors.danger : c < 8 ? generalColors.secondary : generalColors.success;
        const textColor = isDark ? generalColors.text : (c < 6 ? generalColors.danger : generalColors.text);
        return `<div class="semaforo-calificacion"><span class="punto-semaforo" style="background-color:${colorSemaforo};"></span><span class="texto-semaforo" style="color: ${textColor}">${c.toFixed(1)}</span></div>`;
    }
    function rEstadoBadgeTabla(d, t, r) {
        const c = parseFloat(r.FINAL || 0);
        const isDark = document.documentElement.classList.contains('dark');
        const generalColors = getChartColors(isDark, false);
        const bgColor = c < 6 ? generalColors.danger : generalColors.success;
        const textColor = colorPalette.white;
        return `<span class="badge" style="background-color:${bgColor} !important; color:${textColor} !important;">${c < 6 ? 'Reprobado' : 'Aprobado'}</span>`;
    }
    function rCalBadgeTabla(data) {
        const c = parseFloat(data);
        const isDark = document.documentElement.classList.contains('dark');
        const generalColors = getChartColors(isDark, false);
        const bgColor = c >= 6 ? generalColors.success : generalColors.danger;
        const textColor = colorPalette.white;
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

    function crearGraficosPrincipales(datos, chartColors) { 
        if (!datos) datos = [];
        if (calificacionesChart) { calificacionesChart.destroy(); calificacionesChart = null; }
        if (equiposChart) { equiposChart.destroy(); equiposChart = null; }
        if (aprobacionChart) { aprobacionChart.destroy(); aprobacionChart = null; }
        if (gruposPromedioChart) { gruposPromedioChart.destroy(); gruposPromedioChart = null; }

        const commonOptions = {
            responsive: true, maintainAspectRatio: false, animation: { duration: 500 },
            scales: {
                x: { ticks: { color: chartColors.text }, grid: { color: chartColors.grid } },
                y: { ticks: { color: chartColors.text }, grid: { color: chartColors.grid } }
            },
            plugins: {
                legend: { labels: { color: chartColors.text } }, title: { color: chartColors.text },
                tooltip: { backgroundColor: colorPalette.cardBackground, titleColor: colorPalette.textPrimary, bodyColor: colorPalette.textPrimary, borderColor: colorPalette.borderDark, borderWidth: 1 }
            }
        };

        if (document.getElementById('calificacionesChart')) {
            $(document.getElementById('calificacionesChart')).parent().find('p.text-card-text-muted-custom').remove(); 
            if (datos.length > 0) {
                const califCounts = Array(10).fill(0);
                datos.forEach(e => { const c = Math.min(9, Math.floor(parseFloat(e.FINAL) || 0)); if (!isNaN(c) && c >= 0) califCounts[c]++; });
                calificacionesChart = new Chart(document.getElementById('calificacionesChart').getContext('2d'), {
                    type: 'bar', data: { labels: ['0-1', '1-2', '2-3', '3-4', '4-5', '5-6', '6-7', '7-8', '8-9', '9-10'], datasets: [{ label: 'Estudiantes', data: califCounts, backgroundColor: `${chartColors.primary}B3` }] },
                    options: { ...commonOptions, plugins: { ...commonOptions.plugins, legend: { display: false }, title: { display: true, text: 'Distribución de Calificaciones' } }, scales: { ...commonOptions.scales, y: { ...commonOptions.scales.y, beginAtZero: true, ticks: { precision: 0, color: chartColors.text } } } }
                });
            } else { $(document.getElementById('calificacionesChart')).parent().append('<p class="text-center text-card-text-muted-custom small mt-5">No hay datos para mostrar.</p>') }
        }

        if (document.getElementById('equiposChart')) {
             $(document.getElementById('equiposChart')).parent().find('p.text-card-text-muted-custom').remove();
            if (datos.length > 0) {
                const eqData = {}; datos.forEach(e => { if (e.EQUIPO) { if (!eqData[e.EQUIPO]) eqData[e.EQUIPO] = { s: 0, c: 0 }; eqData[e.EQUIPO].s += parseFloat(e.FINAL || 0); eqData[e.EQUIPO].c++; } });
                const eqSorted = Object.entries(eqData).map(([n, d]) => ({ n, p: d.c > 0 ? d.s / d.c : 0 })).sort((a, b) => b.p - a.p);
                 if (eqSorted.length > 0) {
                    equiposChart = new Chart(document.getElementById('equiposChart').getContext('2d'), {
                        type: 'bar', data: { labels: eqSorted.map(e => e.n), datasets: [{ label: 'Promedio', data: eqSorted.map(e => e.p.toFixed(1)), backgroundColor: `${chartColors.success}B3` }] },
                        options: { ...commonOptions, plugins: { ...commonOptions.plugins, legend: { display: false }, title: { display: true, text: 'Promedio por Equipo' } }, scales: { ...commonOptions.scales, y: { ...commonOptions.scales.y, beginAtZero: true, max: 10, ticks: { precision: 1, color: chartColors.text } } } }
                    });
                } else { $(document.getElementById('equiposChart')).parent().append('<p class="text-center text-card-text-muted-custom small mt-5">No hay datos de equipos para mostrar.</p>') }
            } else { $(document.getElementById('equiposChart')).parent().append('<p class="text-center text-card-text-muted-custom small mt-5">No hay datos para mostrar.</p>') }
        }

        if (document.getElementById('aprobacionChart')) {
            $(document.getElementById('aprobacionChart')).parent().find('p.text-card-text-muted-custom').remove();
            if (datos.length > 0) {
                const aprob = datos.filter(e => parseFloat(e.FINAL) >= 6).length;
                const reprob = datos.length - aprob;
                aprobacionChart = new Chart(document.getElementById('aprobacionChart').getContext('2d'), {
                    type: 'doughnut', data: { labels: ['Aprobados', 'Reprobados'], datasets: [{ data: [aprob, reprob], backgroundColor: [`${chartColors.success}B3`, `${chartColors.danger}B3`], borderColor: chartColors.border, borderWidth: 1 }] },
                    options: { ...commonOptions, cutout: '60%', plugins: { ...commonOptions.plugins, legend: { position: 'bottom' }, title: { display: true, text: 'Estado de Aprobación' } } }
                });
            } else { $(document.getElementById('aprobacionChart')).parent().append('<p class="text-center text-card-text-muted-custom small mt-5">No hay datos para mostrar.</p>') }
        }
        
        const canvasGruposPromedio = document.getElementById('gruposPromedioChart');
        if (canvasGruposPromedio) {
            $(canvasGruposPromedio).parent().find('p.text-card-text-muted-custom').remove();
            if (datos.length > 0) {
                const gruposData = {};
                datos.forEach(e => {
                    const grupo = e.GRUPO || 'Sin Grupo Asignado';
                    if (!gruposData[grupo]) gruposData[grupo] = { suma: 0, contador: 0 };
                    gruposData[grupo].suma += parseFloat(e.FINAL || 0); gruposData[grupo].contador++;
                });
                const gruposProcesados = Object.entries(gruposData).map(([nombre, data]) => ({ nombre, promedio: data.contador > 0 ? (data.suma / data.contador) : 0 }))
                    .sort((a, b) => { if (a.nombre === 'Sin Grupo Asignado') return 1; if (b.nombre === 'Sin Grupo Asignado') return -1; return a.nombre.localeCompare(b.nombre); });
                if (gruposProcesados.length > 0) {
                    const isHorizontal = gruposProcesados.length > 6;
                    let finalScales = {};
                    if (isHorizontal) {
                        finalScales.x = { beginAtZero: true, max: 10, ticks: { precision: 1, color: chartColors.text, font: { size: 10 } }, grid: { color: chartColors.grid } };
                        finalScales.y = { ticks: { color: chartColors.text, font: { size: 10 } }, grid: { display: false } };
                    } else {
                        finalScales.x = { ticks: { color: chartColors.text, font: { size: 10 } }, grid: { display: false } };
                        finalScales.y = { beginAtZero: true, max: 10, ticks: { precision: 1, color: chartColors.text, font: { size: 10 } }, grid: { color: chartColors.grid } };
                    }
                    gruposPromedioChart = new Chart(document.getElementById('gruposPromedioChart').getContext('2d'), {
                        type: 'bar', data: { labels: gruposProcesados.map(g => g.nombre), datasets: [{ label: 'Promedio Final', data: gruposProcesados.map(g => g.promedio.toFixed(1)), backgroundColor: `${chartColors.info}B3`, borderColor: chartColors.info, borderWidth: 1 }] },
                        options: { responsive: true, maintainAspectRatio: false, indexAxis: isHorizontal ? 'y' : 'x', plugins: { legend: { display: false }, title: { display: true, text: 'Promedio Final por Grupo', color: chartColors.text, font: { size: 14 } }, tooltip: { callbacks: { label: ctx => `Promedio: ${ctx.raw}` } } }, scales: finalScales, animation: { duration: 500 } }
                    });
                } else { $(canvasGruposPromedio).parent().append('<p class="text-center text-card-text-muted-custom small mt-5">No hay datos de grupos para mostrar.</p>'); }
            } else { $(canvasGruposPromedio).parent().append('<p class="text-center text-card-text-muted-custom small mt-5">No hay datos para mostrar.</p>'); }
        }
    }


    function analizarYCrearGraficosDeActividades(datos, chartColors) {
        if (!datos) datos = []; 
        
        $('#actividadMasEntregada, #actividadMenosEntregada, #cuestionarioMasEntregado, #cuestionarioMenosEntregado').text('-');
        $('#porcentajeMasEntregada, #porcentajeMenosEntregada, #porcentajeCuestionarioMas, #porcentajeCuestionarioMenos, #porcentajeEntregaProyecto, #porcentajeEntregaBitacora, #puntosExtraPorcentaje').text('0% (0/0)');
        $('#proyectoEntregados, #proyectoPendientes, #proyectoPromedio, #bitacoraEntregados, #bitacoraPendientes, #bitacoraPromedio, #puntosExtraEntregados').text('0');

        const chartsToCleanIds = ['actividadesChart2', 'entregasActividadesChart', 'cuestionariosRadarChart', 'entregasCuestionariosChart', 'proyectoEntregaChart', 'proyectoCalificacionesChart', 'bitacoraEntregaChart', 'bitacoraCalificacionesChart', 'puntosExtraChart'];
        const chartVars = [actividadesChart2, entregasActividadesChart, cuestionariosRadarChart, entregasCuestionariosChart, proyectoEntregaChart, proyectoCalificacionesChart, bitacoraEntregaChart, bitacoraCalificacionesChart, puntosExtraChart];
        chartVars.forEach((chartVar, index) => {
            if (chartVar) { chartVar.destroy(); }
            switch (chartsToCleanIds[index]) {
                case 'actividadesChart2': actividadesChart2 = null; break; case 'entregasActividadesChart': entregasActividadesChart = null; break;
                case 'cuestionariosRadarChart': cuestionariosRadarChart = null; break; case 'entregasCuestionariosChart': entregasCuestionariosChart = null; break;
                case 'proyectoEntregaChart': proyectoEntregaChart = null; break; case 'proyectoCalificacionesChart': proyectoCalificacionesChart = null; break;
                case 'bitacoraEntregaChart': bitacoraEntregaChart = null; break; case 'bitacoraCalificacionesChart': bitacoraCalificacionesChart = null; break;
                case 'puntosExtraChart': puntosExtraChart = null; break;
            }
            const canvasId = chartsToCleanIds[index];
            if (document.getElementById(canvasId)) {
                const parent = $(`#${canvasId}`).parent();
                parent.find('p.text-card-text-muted-custom').remove(); 
                if (datos.length === 0) { 
                    parent.append('<p class="text-center text-card-text-muted-custom small mt-3">No hay datos.</p>');
                }
            }
        });
        
        if (datos.length === 0) return; 

        const canvasIds = ['actividadesChart2', 'entregasActividadesChart', 'cuestionariosRadarChart', 'entregasCuestionariosChart', 'proyectoEntregaChart', 'proyectoCalificacionesChart', 'bitacoraEntregaChart', 'bitacoraCalificacionesChart', 'puntosExtraChart'];
        canvasIds.forEach(id => {
            const container = $(`#${id}`).parent();
            container.find('p.text-card-text-muted-custom').remove(); 
        });

        analizarActividades(datos, chartColors); 
        crearGraficaActividadesRendimiento(datos, chartColors);
        crearGraficaEntregasActividades(datos, chartColors);
        crearGraficaRadarCuestionarios(datos, chartColors); 
        crearGraficaEntregasCuestionarios(datos, chartColors);
    }

    function analizarActividades(datos, chartColors) {
        const nomenclatura = getNomenclaturaActual();
        const actsKeys = nomenclatura.actividades; 
        const cuestsKeys = nomenclatura.cuestionarios;
    
        const calcStats = (itemKeys, prefix, baseNum) => {
            if (!itemKeys || itemKeys.length === 0) return [{ nom: '-', ent: 0, tot: datos.length, porc: '0.0' }];
            return itemKeys.map((itemKey, index) => {
                const ent = datos.filter(e => e[itemKey] && parseFloat(e[itemKey]) > 0).length; 
                const porc = datos.length > 0 ? (ent / datos.length * 100) : 0;
                return { nom: `${prefix} ${baseNum + index + 1}`, ent, tot: datos.length, porc: porc.toFixed(1), key: itemKey };
            }).sort((a, b) => parseFloat(b.porc) - parseFloat(a.porc)); 
        };
    
        const statsActs = calcStats(actsKeys, 'Actividad', nomenclatura.config.actBase);
        const statsCuests = calcStats(cuestsKeys, 'Cuestionario', nomenclatura.config.cuestBase);
    
        if (statsActs.length > 0 && statsActs[0].ent > 0) { 
            $('#actividadMasEntregada').text(statsActs[0]?.nom || '-'); 
            $('#porcentajeMasEntregada').text(`${statsActs[0]?.porc || 0}% (${statsActs[0]?.ent || 0}/${statsActs[0]?.tot || 0})`);
            $('#actividadMenosEntregada').text(statsActs[statsActs.length - 1]?.nom || '-'); 
            $('#porcentajeMenosEntregada').text(`${statsActs[statsActs.length - 1]?.porc || 0}% (${statsActs[statsActs.length - 1]?.ent || 0}/${statsActs[statsActs.length - 1]?.tot || 0})`);
        } else {
             $('#actividadMasEntregada, #actividadMenosEntregada').text('-');
             $('#porcentajeMasEntregada, #porcentajeMenosEntregada').text('0% (0/0)');
        }

        if (statsCuests.length > 0 && statsCuests[0].ent > 0) {
            $('#cuestionarioMasEntregado').text(statsCuests[0]?.nom || '-'); 
            $('#porcentajeCuestionarioMas').text(`${statsCuests[0]?.porc || 0}% (${statsCuests[0]?.ent || 0}/${statsCuests[0]?.tot || 0})`);
            $('#cuestionarioMenosEntregado').text(statsCuests[statsCuests.length - 1]?.nom || '-'); 
            $('#porcentajeCuestionarioMenos').text(`${statsCuests[statsCuests.length - 1]?.porc || 0}% (${statsCuests[statsCuests.length - 1]?.ent || 0}/${statsCuests[statsCuests.length - 1]?.tot || 0})`);
        } else {
            $('#cuestionarioMasEntregado, #cuestionarioMenosEntregado').text('-');
            $('#porcentajeCuestionarioMas, #porcentajeCuestionarioMenos').text('0% (0/0)');
        }
        
        const proyBit = ['PROYECTO', 'BITACORA'].reduce((acc, item) => {
            const ent = datos.filter(e => e[item] && parseFloat(e[item]) > 0); 
            const porc = datos.length > 0 ? (ent.length / datos.length * 100) : 0;
            const prom = ent.length > 0 ? ent.reduce((s, eVal) => s + parseFloat(eVal[item] || 0), 0) / ent.length : 0;
            acc[item] = { ent: ent.length, tot: datos.length, porc: porc.toFixed(1), prom: prom.toFixed(1), entregados_data: ent.map(eVal => parseFloat(eVal[item])) };
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
    
        const pex = datos.filter(e => e.PUNTOEX && parseFloat(e.PUNTOEX) > 0); 
        const pexPorc = datos.length > 0 ? (pex.length / datos.length * 100) : 0;
        $('#puntosExtraEntregados').text(`${pex.length}/${datos.length}`); $('#puntosExtraPorcentaje').text(`${pexPorc.toFixed(1)}%`);
        crearGraficaPuntosExtra(datos, { entregados: pex.length, total: datos.length, porcentaje: pexPorc.toFixed(1) }, chartColors);
    }

    const chartBaseOptions = (chartColors) => ({
        responsive: true, maintainAspectRatio: false,
        scales: {
            x: { ticks: { color: chartColors.text, font: { size: 10 } }, grid: { color: chartColors.grid } },
            y: { ticks: { color: chartColors.text, font: { size: 10 } }, grid: { color: chartColors.grid } }
        },
        plugins: {
            legend: { display: true, labels: { color: chartColors.text, boxWidth: 12, padding: 15, font: { size: 11 } } },
            title: { display: true, color: chartColors.text, font: { size: 13, weight: '500' } },
            tooltip: { backgroundColor: colorPalette.cardBackground, titleColor: colorPalette.textPrimary, bodyColor: colorPalette.textPrimary, borderColor: colorPalette.borderDark, borderWidth: 1 }
        }
    });
    
    function crearGraficaActividadesRendimiento(datos, chartColors) {
        const canvasId = 'actividadesChart2';
        if (actividadesChart2) { actividadesChart2.destroy(); actividadesChart2 = null; }
        if (!datos || datos.length === 0 || !document.getElementById(canvasId)) return;

        const nomenclatura = getNomenclaturaActual();
        const actsKeys = nomenclatura.actividades;
        if (actsKeys.length === 0) { $(`#${canvasId}`).parent().append('<p class="text-center text-card-text-muted-custom small mt-1">No hay Actividades.</p>'); return; }
        
        const labels = actsKeys.map((actKey, index) => `Act ${nomenclatura.config.actBase + index + 1}`);
        const entregados = actsKeys.map(aKey => datos.filter(e => e[aKey] && parseFloat(e[aKey]) > 0).length);
        const pendientes = actsKeys.map((aKey, i) => datos.length - entregados[i]);
        const porcentajeEntregas = actsKeys.map((a, i) => datos.length > 0 ? (entregados[i] / datos.length * 100) : 0);
        const xValues = actsKeys.map((_, i) => i);
        
        const ctx = document.getElementById(canvasId).getContext('2d');
        let tendencia = [];
        if (xValues.length >= 2) {
            const n = xValues.length; let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
            for (let i = 0; i < n; i++) { sumX += xValues[i]; sumY += porcentajeEntregas[i]; sumXY += xValues[i] * porcentajeEntregas[i]; sumXX += xValues[i] * xValues[i]; }
            const mSlope = (n * sumXX - sumX * sumX) !== 0 ? (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) : 0;
            const bIntercept = (sumY - mSlope * sumX) / n;
            tendencia = xValues.map(x => (mSlope * x + bIntercept));
        } else if (xValues.length === 1) { tendencia = [porcentajeEntregas[0]]; }

        const chartConfig = { 
            type: 'bar', data: { labels: labels, datasets: [
                    { label: 'Entregadas', data: entregados, backgroundColor: `${chartColors.success}D0`, borderColor: chartColors.success, borderWidth: 1, order: 1, barPercentage: 0.4, categoryPercentage: 0.5 },
                    { label: 'Pendientes', data: pendientes, backgroundColor: `${chartColors.danger}80`, borderColor: chartColors.danger, borderWidth: 1, order: 1, barPercentage: 0.4, categoryPercentage: 0.5 }
                ]
            },
            options: chartBaseOptions(chartColors) 
        };
        chartConfig.options.plugins.title.display = false; chartConfig.options.plugins.legend.labels.font.size = 10;
        chartConfig.options.scales = {
            y: { ...chartConfig.options.scales.y, title: { display: true, text: 'Número de Estudiantes', color: chartColors.text }, ticks: { precision: 0, stepSize: Math.max(1, Math.ceil(datos.length / 5)) }, max: datos.length, min: 0 },
            y1: { position: 'right', title: { display: true, text: '% de Entregas', color: chartColors.text }, min: 0, max: 100, grid: { display: false }, ticks: { callback: value => value.toFixed(0) + '%' } },
            x: { ...chartConfig.options.scales.x, grid: { display: false } }
        };
        chartConfig.options.plugins.tooltip = { ...chartConfig.options.plugins.tooltip, callbacks: {
                label: function (context) {
                    const label = context.dataset.label || ''; const value = context.raw; let content = `${label}: ${value}`;
                    if (context.dataset.label !== 'Tendencia (% de entregas)') { content += ` de ${datos.length} (${Math.round((value / datos.length) * 100)}%)`; } else { content += '%'; }
                    return content;
                }
        }};
        if (tendencia.length > 0) {
            chartConfig.data.datasets.push({
                label: 'Tendencia (% de entregas)', data: tendencia, type: 'line', borderColor: chartColors.primary, borderWidth: 2, borderDash: [5, 5], 
                pointBackgroundColor: chartColors.primary, pointBorderColor: chartColors.white, pointRadius: 4, pointHoverRadius: 6, fill: false, order: 0, tension: 0.1, yAxisID: 'y1'
            });
        }
        actividadesChart2 = new Chart(ctx, chartConfig);
    }

    function crearGraficaEntregasActividades(datos, chartColors) {
        const canvasId = 'entregasActividadesChart';
        if (entregasActividadesChart) { entregasActividadesChart.destroy(); entregasActividadesChart = null; }
        if (!datos || datos.length === 0 || !document.getElementById(canvasId)) return;
        
        const nomenclatura = getNomenclaturaActual();
        const actsKeys = nomenclatura.actividades;
        if (actsKeys.length === 0) { $(`#${canvasId}`).parent().append('<p class="text-center text-card-text-muted-custom small mt-1">No hay Actividades.</p>'); return; }

        const labels = actsKeys.map((actKey, index) => `Act ${nomenclatura.config.actBase + index + 1}`);
        const ent = actsKeys.map(aKey => datos.filter(e => e[aKey] && parseFloat(e[aKey]) > 0).length);
        const pend = ent.map(v => datos.length - v);
        
        const options = chartBaseOptions(chartColors);
        options.scales.y.stacked = true; options.scales.x.stacked = true; options.scales.y.ticks.precision = 0;
        options.scales.y.max = datos.length; options.plugins.title.display = false;
        entregasActividadesChart = new Chart(document.getElementById(canvasId).getContext('2d'), { type: 'bar', data: { labels, datasets: [{ label: 'Entregados', data: ent, backgroundColor: `${chartColors.success}B3` }, { label: 'Pendientes', data: pend, backgroundColor: `${chartColors.danger}B3` }] }, options: options });
    }

    function crearGraficaRadarCuestionarios(datos, chartColors) { 
        const canvasId = 'cuestionariosRadarChart';
        if (cuestionariosRadarChart) { cuestionariosRadarChart.destroy(); cuestionariosRadarChart = null; }
        if (!datos || datos.length === 0 || !document.getElementById(canvasId)) return;

        const nomenclatura = getNomenclaturaActual();
        const cuestsKeys = nomenclatura.cuestionarios;
        if (cuestsKeys.length === 0) { $(`#${canvasId}`).parent().append('<p class="text-center text-card-text-muted-custom small mt-1">No hay Cuestionarios.</p>'); return; }

        const labels = cuestsKeys.map((cuestKey, index) => `Cuest ${nomenclatura.config.cuestBase + index + 1}`);
        const entregados = cuestsKeys.map(cKey => datos.filter(e => e[cKey] && parseFloat(e[cKey]) > 0).length);
        const pendientes = cuestsKeys.map((cKey, i) => datos.length - entregados[i]);
        const porcentajeEntregas = cuestsKeys.map((c, i) => datos.length > 0 ? (entregados[i] / datos.length * 100) : 0);
        const xValues = cuestsKeys.map((_, i) => i);
        
        const ctx = document.getElementById(canvasId).getContext('2d');
        let tendencia = [];
        if (xValues.length >= 2) {
            const n = xValues.length; let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
            for (let i = 0; i < n; i++) { sumX += xValues[i]; sumY += porcentajeEntregas[i]; sumXY += xValues[i] * porcentajeEntregas[i]; sumXX += xValues[i] * xValues[i]; }
            const mSlope = (n * sumXX - sumX * sumX) !== 0 ? (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) : 0;
            const bIntercept = (sumY - mSlope * sumX) / n;
            tendencia = xValues.map(x => (mSlope * x + bIntercept));
        } else if (xValues.length === 1) { tendencia = [porcentajeEntregas[0]]; }

        const chartConfig = {
            type: 'bar', data: { labels: labels, datasets: [
                    { label: 'Entregados', data: entregados, backgroundColor: `${chartColors.info}D0`, borderColor: chartColors.info, borderWidth: 1, order: 1, barPercentage: 0.4, categoryPercentage: 0.5 },
                    { label: 'Pendientes', data: pendientes, backgroundColor: `${chartColors.danger}80`, borderColor: chartColors.danger, borderWidth: 1, order: 1, barPercentage: 0.4, categoryPercentage: 0.5 }
                ]
            },
            options: chartBaseOptions(chartColors)
        };
        chartConfig.options.plugins.title = { ...chartConfig.options.plugins.title, text: 'Comparativa Cuestionarios', display: true };
        chartConfig.options.plugins.legend.labels.font.size = 10;
        chartConfig.options.scales = {
            y: { ...chartConfig.options.scales.y, title: { display: true, text: 'Número de Estudiantes', color: chartColors.text }, ticks: { precision: 0, stepSize: Math.max(1, Math.ceil(datos.length / 5)) }, max: datos.length, min: 0 },
            y1: { position: 'right', title: { display: true, text: '% de Entregas', color: chartColors.text }, min: 0, max: 100, grid: { display: false }, ticks: { callback: value => value.toFixed(0) + '%' } },
            x: { ...chartConfig.options.scales.x, grid: { display: false } }
        };
        chartConfig.options.plugins.tooltip = { ...chartConfig.options.plugins.tooltip, callbacks: {
                label: function (context) {
                    const label = context.dataset.label || ''; const value = context.raw; let content = `${label}: ${value}`;
                    if (context.dataset.label !== 'Tendencia (% de entregas)') { content += ` de ${datos.length} (${Math.round((value / datos.length) * 100)}%)`; } else { content += '%'; }
                    return content;
                }
        }};
        if (tendencia.length > 0) {
            chartConfig.data.datasets.push({
                label: 'Tendencia (% de entregas)', data: tendencia, type: 'line', borderColor: chartColors.primary, borderWidth: 2, borderDash: [5, 5],
                pointBackgroundColor: chartColors.primary, pointBorderColor: chartColors.white, pointRadius: 4, pointHoverRadius: 6, fill: false, order: 0, tension: 0.1, yAxisID: 'y1'
            });
        }
        cuestionariosRadarChart = new Chart(ctx, chartConfig);
    }

    function crearGraficaEntregasCuestionarios(datos, chartColors) {
        const canvasId = 'entregasCuestionariosChart';
        if (entregasCuestionariosChart) { entregasCuestionariosChart.destroy(); entregasCuestionariosChart = null; }
        if (!datos || datos.length === 0 || !document.getElementById(canvasId)) return;

        const nomenclatura = getNomenclaturaActual();
        const cuestsKeys = nomenclatura.cuestionarios;
        if (cuestsKeys.length === 0) { $(`#${canvasId}`).parent().append('<p class="text-center text-card-text-muted-custom small mt-1">No hay Cuestionarios.</p>'); return; }
        
        const labels = cuestsKeys.map((cuestKey, index) => `Cuest ${nomenclatura.config.cuestBase + index + 1}`);
        const ent = cuestsKeys.map(cKey => datos.filter(e => e[cKey] && parseFloat(e[cKey]) > 0).length);
        const pend = ent.map(v => datos.length - v);
        
        const options = chartBaseOptions(chartColors);
        options.scales.y.stacked = true; options.scales.x.stacked = true; options.scales.y.ticks.precision = 0;
        options.scales.y.max = datos.length; options.plugins.title.display = false;
        entregasCuestionariosChart = new Chart(document.getElementById(canvasId).getContext('2d'), { type: 'bar', data: { labels, datasets: [{ label: 'Entregados', data: ent, backgroundColor: `${chartColors.info}B3` }, { label: 'Pendientes', data: pend, backgroundColor: `${chartColors.danger}B3` }] }, options: options });
    }

    function crearGraficaProyectoEntrega(stats, chartColors) {
        const canvasId = 'proyectoEntregaChart';
        if (proyectoEntregaChart) { proyectoEntregaChart.destroy(); proyectoEntregaChart = null; }
        if (!stats || !document.getElementById(canvasId) || stats.total === 0) { 
            if (document.getElementById(canvasId)) $(`#${canvasId}`).parent().append('<p class="text-center text-card-text-muted-custom small mt-1">No hay datos</p>');
            return;
        }
        const ctx = document.getElementById(canvasId).getContext('2d');
        const options = { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (context) { const label = context.label || ''; const value = context.raw; const total = context.dataset.data.reduce((a, b) => a + b, 0); const percentage = total > 0 ? Math.round((value / total) * 100) : 0; return `${label}: ${value} (${percentage}%)`;}}}}, elements: { arc: { borderWidth: 0 } } };
        proyectoEntregaChart = new Chart(ctx, { type: 'doughnut', data: { labels: ['Entregados', 'Pendientes'], datasets: [{ data: [stats.entregados, stats.total - stats.entregados], backgroundColor: [`${chartColors.success}B3`, `${chartColors.danger}90`], borderWidth: 0 }] }, options: options });
    }
    function crearGraficaCalificacionesProyecto(califProy, chartColors) {
        const canvasId = 'proyectoCalificacionesChart';
        if (proyectoCalificacionesChart) { proyectoCalificacionesChart.destroy(); proyectoCalificacionesChart = null; }
        if (!califProy || califProy.length === 0 || !document.getElementById(canvasId)) {
            if (document.getElementById(canvasId)) $(`#${canvasId}`).parent().append('<p class="text-center text-card-text-muted-custom small mt-1">No hay calificaciones</p>');
            return;
        }
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
        if (bitacoraEntregaChart) { bitacoraEntregaChart.destroy(); bitacoraEntregaChart = null; }
        if (!stats || !document.getElementById(canvasId) || stats.total === 0) {
            if (document.getElementById(canvasId)) $(`#${canvasId}`).parent().append('<p class="text-center text-card-text-muted-custom small mt-1">No hay datos</p>');
            return;
        }
        const ctx = document.getElementById(canvasId).getContext('2d');
        const options = { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (context) { const label = context.label || ''; const value = context.raw; const total = context.dataset.data.reduce((a, b) => a + b, 0); const percentage = total > 0 ? Math.round((value / total) * 100) : 0; return `${label}: ${value} (${percentage}%)`;}}}}, elements: { arc: { borderWidth: 0 } } };
        bitacoraEntregaChart = new Chart(ctx, { type: 'doughnut', data: { labels: ['Entregadas', 'Pendientes'], datasets: [{ data: [stats.entregados, stats.total - stats.entregados], backgroundColor: [`${chartColors.info}B3`, `${chartColors.danger}90`], borderWidth: 0 }] }, options: options });
    }
    function crearGraficaCalificacionesBitacora(califBit, chartColors) {
        const canvasId = 'bitacoraCalificacionesChart';
        if (bitacoraCalificacionesChart) { bitacoraCalificacionesChart.destroy(); bitacoraCalificacionesChart = null; }
        if (!califBit || califBit.length === 0 || !document.getElementById(canvasId)) {
            if (document.getElementById(canvasId)) $(`#${canvasId}`).parent().append('<p class="text-center text-card-text-muted-custom small mt-1">No hay calificaciones</p>');
            return;
        }
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
        if (!datos || datos.length === 0 || !stats || !document.getElementById(canvasId) || stats.entregados === 0) {
            if (document.getElementById(canvasId)) $(`#${canvasId}`).parent().append('<p class="text-center text-card-text-muted-custom small mt-1">No hay Puntos Extra</p>');
            return;
        }
        const ctx = document.getElementById(canvasId).getContext('2d');
        const pexCounts = datos.filter(e => e.PUNTOEX && parseFloat(e.PUNTOEX) > 0).reduce((acc, e) => { const p = Math.floor(parseFloat(e.PUNTOEX) || 0); acc[p] = (acc[p] || 0) + 1; return acc; }, {});
        const labels = Object.keys(pexCounts).sort((a, b) => a - b).map(p => `${p} pts`);
        const data = Object.values(pexCounts);
        const options = chartBaseOptions(chartColors);
        options.plugins.legend.display = false; options.plugins.title.display = false; options.indexAxis = 'y'; options.scales.x.ticks.precision = 0;
        puntosExtraChart = new Chart(ctx, { type: 'bar', data: { labels, datasets: [{ label: 'Estudiantes', data, backgroundColor: `${chartColors.warning}B3` }] }, options: options });
    }

    function generarSeccionesPorGrupoYEquipo(datos, chartColors) {
        const container = $('#estudiantesCardsContainer');
        container.empty();
        Object.values(estudianteCardCharts).forEach(chart => { if (chart) chart.destroy(); });
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
            if (!acc[grupo]) acc[grupo] = []; acc[grupo].push(est); return acc;
        }, {});
        const nombresDeGrupos = Object.keys(estudiantesPorGrupo).sort((a, b) => { if (a === 'Sin Grupo Asignado') return 1; if (b === 'Sin Grupo Asignado') return -1; return a.localeCompare(b); });

        nombresDeGrupos.forEach(nombreGrupo => {
            const estudiantesDelGrupo = estudiantesPorGrupo[nombreGrupo];
            const $grupoHeader = $(`<h2 class="grupo-header text-2xl font-bold text-dark-text-primary dark:text-dark-text-primary mb-3 pb-2 border-b border-dark-border">${nombreGrupo}</h2>`);
            container.append($grupoHeader);
            const estudiantesPorEquipo = estudiantesDelGrupo.reduce((acc, est) => {
                const equipo = est.EQUIPO || 'Sin Equipo Asignado';
                if (!acc[equipo]) acc[equipo] = []; acc[equipo].push(est); return acc;
            }, {});
            const nombresDeEquipos = Object.keys(estudiantesPorEquipo).sort((a, b) => { if (a === 'Sin Equipo Asignado') return 1; if (b === 'Sin Equipo Asignado') return -1; return a.localeCompare(b); });

            nombresDeEquipos.forEach(nombreEquipo => {
                const estudiantesDelEquipo = estudiantesPorEquipo[nombreEquipo];
                let equipoHeaderText = nombreEquipo;
                if (nombreEquipo !== 'Sin Equipo Asignado') equipoHeaderText = `Equipo: ${nombreEquipo}`;
                else if (Object.keys(estudiantesPorEquipo).length > 1 && nombreGrupo !== 'Sin Grupo Asignado') equipoHeaderText = `Integrantes Sin Equipo Asignado`;
                else if (Object.keys(estudiantesPorEquipo).length === 1 && nombreEquipo === 'Sin Equipo Asignado') equipoHeaderText = '';
                if (equipoHeaderText) {
                    const $equipoHeader = $(`<h3 class="equipo-header text-xl font-semibold text-dark-text-primary dark:text-dark-text-primary mt-4 mb-4">${equipoHeaderText}</h3>`);
                    container.append($equipoHeader);
                }
                const $cardsGrid = $('<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 mb-8"></div>');
                container.append($cardsGrid);

                estudiantesDelEquipo.sort((a, b) => (a.COMPLETO || '').localeCompare(b.COMPLETO || '')).forEach(estudiante => {
                    const $cardClone = $(cardTemplate.cloneNode(true));
                    const $card = $cardClone.find('.estudiante-card-wrapper');
                    $card.addClass('estudiante-card');
                    if (estudiante.ID) $card.attr('data-id', estudiante.ID);
                    const califFinal = parseFloat(estudiante.FINAL) || 0;
                    const asistencia = parseFloat(estudiante.TOTALASIS) || 0;
                    const puntoEx = parseFloat(estudiante.PUNTOEX) || 0;
                    const nombreCompleto = estudiante.COMPLETO || "N A";
                    const partesNombre = nombreCompleto.split(' ');
                    let iniciales = partesNombre[0] ? partesNombre[0][0] : '';
                    if (partesNombre.length > 1 && partesNombre[1] && partesNombre[1].length > 0) iniciales += partesNombre[1][0];
                    else if (partesNombre[0] && partesNombre[0].length > 1) iniciales = partesNombre[0].substring(0, 2);
                    $card.find('.estudiante-iniciales').text(iniciales.toUpperCase());
                    $card.find('.estudiante-nombre').text(nombreCompleto);
                    $card.find('.estudiante-nick').text(estudiante.NICK ? `@${estudiante.NICK}` : '-');
                    $card.find('.estudiante-id').text(estudiante.ID || 'ID');
                    $card.find('.estudiante-grupo').text(estudiante.GRUPO || '-');
                    $card.find('.estudiante-equipo').text(estudiante.EQUIPO || '-');
                    $card.find('.estudiante-asistencia').text(`${asistencia.toFixed(0)}%`);
                    $card.find('.estudiante-puntoex').text(puntoEx.toFixed(1));
                    const esAprobado = califFinal >= 6;
                    const badgeBgColor = esAprobado ? chartColors.success : chartColors.danger;
                    const badgeTextColor = colorPalette.white;
                    const badgeText = esAprobado ? 'Aprobado' : 'Reprobado';
                    $card.find('.estudiante-estado-badge').html(`<span class="px-2 py-0.5 text-xs font-semibold rounded-full" style="background-color:${badgeBgColor}; color:${badgeTextColor};">${badgeText}</span>`);
                    $card.find('.estudiante-calificacion-final').text(califFinal.toFixed(1));
                    const barraCalificacion = $card.find('.estudiante-calificacion-barra');
                    barraCalificacion.css('width', `${califFinal * 10}%`);
                    if (esAprobado) barraCalificacion.css('background-color', chartColors.success);
                    else if (califFinal >= 4) barraCalificacion.css('background-color', chartColors.warning);
                    else barraCalificacion.css('background-color', chartColors.danger);

                    const canvas = $card.find('.estudiante-mini-chart')[0];
                    const ctx = canvas.getContext('2d');
                    const estudianteIdUnico = `chart-est-${estudiante.ID || Math.random().toString(36).substr(2, 9)}`;
                    canvas.id = estudianteIdUnico;

                    const nomenclatura = getNomenclaturaActual();
                    const clavesActividades = nomenclatura.actividades;
                    const clavesCuestionarios = nomenclatura.cuestionarios;
                    const dataRendimiento = [];
                    clavesActividades.forEach(actKey => { dataRendimiento.push(parseFloat(estudiante[actKey]) || 0); });
                    clavesCuestionarios.forEach(cuestKey => { dataRendimiento.push(parseFloat(estudiante[cuestKey]) || 0); });
                    dataRendimiento.push(parseFloat(estudiante.PROYECTO) || 0); dataRendimiento.push(parseFloat(estudiante.BITACORA) || 0);
                    const etiquetasRendimiento = [
                        ...clavesActividades.map((actKey, index) => `A${nomenclatura.config.actBase + index + 1}`),
                        ...clavesCuestionarios.map((cuestKey, index) => `C${nomenclatura.config.cuestBase + index + 1}`),
                        'Proy', 'Bit'
                    ];
                    const miniChartOptions = {
                        responsive: true, maintainAspectRatio: false,
                        scales: { y: { beginAtZero: true, max: 10, ticks: { stepSize: 2, font: { size: 9 }, color: chartColors.text }, grid: { color: chartColors.grid, drawTicks: false, } }, x: { ticks: { font: { size: 9 }, maxRotation: 0, minRotation: 0, color: chartColors.text }, grid: { display: false } } },
                        plugins: { legend: { display: false }, tooltip: { callbacks: { label: context => ` ${context.dataset.label}: ${context.parsed.y.toFixed(1)}` }, backgroundColor: colorPalette.cardBackground, titleColor: colorPalette.textPrimary, bodyColor: colorPalette.textPrimary, borderColor: colorPalette.borderDark, borderWidth: 1 } }
                    };
                    estudianteCardCharts[estudianteIdUnico] = new Chart(ctx, {
                        type: 'bar', data: { labels: etiquetasRendimiento, datasets: [{ label: 'Calificación', data: dataRendimiento, backgroundColor: dataRendimiento.map(val => val >= 6 ? `${chartColors.success}B3` : `${chartColors.danger}B3`), borderColor: dataRendimiento.map(val => val >= 6 ? chartColors.success : chartColors.danger), borderWidth: 1 }] },
                        options: miniChartOptions
                    });
                    $cardsGrid.append($card);
                });
            });
        });
        $(document).trigger('cardsGenerated');
    }

    let allStudentCards = [];
    function filterStudentCards(searchTerm) {
        if (!searchTerm.trim()) {
            $('.estudiante-card').show();
            $('.grupo-header, .equipo-header').show(); 
            $('.grupo-header').each(function () {
                const $grupoHeader = $(this); let hasVisibleCardsInGroup = false;
                $grupoHeader.nextUntil('.grupo-header').filter('.grid').each(function () { if ($(this).find('.estudiante-card:visible').length > 0) { hasVisibleCardsInGroup = true; return false; } });
                if ($grupoHeader.nextUntil('.grupo-header, .equipo-header').filter('.estudiante-card:visible').length > 0) hasVisibleCardsInGroup = true;
                if (hasVisibleCardsInGroup) {
                    $grupoHeader.show();
                    $grupoHeader.nextUntil('.grupo-header').filter('.equipo-header').each(function () {
                        const $equipoHeader = $(this);
                        if ($equipoHeader.nextUntil('.equipo-header, .grupo-header').find('.estudiante-card:visible').length > 0 || $equipoHeader.nextUntil('.equipo-header, .grupo-header').filter('.grid').find('.estudiante-card:visible').length > 0) {
                            $equipoHeader.show();
                        } else {
                            $equipoHeader.hide();
                        }
                    });
                } else {
                    $grupoHeader.hide(); $grupoHeader.nextUntil('.grupo-header').filter('.equipo-header').hide();
                }
            });
            return;
        }
        const searchLower = searchTerm.toLowerCase().trim(); let anyMatchOverall = false;
        $('.estudiante-card').each(function () {
            const $card = $(this); const cardText = $card.text().toLowerCase(); const cardId = ($card.data('id') || '').toString().toLowerCase(); const cardName = $card.find('.estudiante-nombre').text().toLowerCase();
            if (cardText.includes(searchLower) || cardId.includes(searchLower) || cardName.includes(searchLower)) { $card.show(); anyMatchOverall = true; } else { $card.hide(); }
        });
        $('#estudiantesCardsContainer .no-results-message').remove();
        $('.grupo-header').each(function () {
            const $grupoHeader = $(this); let hasVisibleCardsInGroup = false; let currentElement = $grupoHeader.next();
            while (currentElement.length && !currentElement.hasClass('grupo-header')) {
                if (currentElement.hasClass('estudiante-card') && currentElement.is(':visible')) { hasVisibleCardsInGroup = true; break; }
                if (currentElement.hasClass('grid') && currentElement.find('.estudiante-card:visible').length > 0) { hasVisibleCardsInGroup = true; break; }
                currentElement = currentElement.next();
            }
            if (hasVisibleCardsInGroup) {
                $grupoHeader.show(); currentElement = $grupoHeader.next();
                while (currentElement.length && !currentElement.hasClass('grupo-header')) {
                    if (currentElement.hasClass('equipo-header')) {
                        const $equipoHeader = currentElement; let hasVisibleCardsInEquipo = false; let nextElementInEquipo = $equipoHeader.next();
                        while (nextElementInEquipo.length && !nextElementInEquipo.hasClass('equipo-header') && !nextElementInEquipo.hasClass('grupo-header')) {
                            if (nextElementInEquipo.hasClass('estudiante-card') && nextElementInEquipo.is(':visible')) { hasVisibleCardsInEquipo = true; break; }
                            if (nextElementInEquipo.hasClass('grid') && nextElementInEquipo.find('.estudiante-card:visible').length > 0) { hasVisibleCardsInEquipo = true; break; }
                            nextElementInEquipo = nextElementInEquipo.next();
                        }
                        if (hasVisibleCardsInEquipo) $equipoHeader.show(); else $equipoHeader.hide();
                    }
                    currentElement = currentElement.next();
                }
            } else {
                $grupoHeader.hide(); currentElement = $grupoHeader.next();
                while (currentElement.length && !currentElement.hasClass('grupo-header')) { if (currentElement.hasClass('equipo-header')) currentElement.hide(); currentElement = currentElement.next(); }
            }
        });
        if (!anyMatchOverall) $('#estudiantesCardsContainer').append(`<div class="text-center text-muted py-4 no-results-message">No se encontraron estudiantes que coincidan con "${searchTerm}"</div>`);
    }

    const $mobileMenu = $('.mobile-filters-menu'); const $mobileMenuButton = $('#mobileMenuButton'); const $closeMobileMenu = $('#closeMobileMenu'); const $overlay = $('<div class="mobile-filters-overlay"></div>'); $('body').append($overlay);
    function toggleMobileMenu(show) { if (show) { $mobileMenu.addClass('show'); $overlay.addClass('show'); $('body').addClass('mobile-menu-open'); } else { $mobileMenu.removeClass('show'); $overlay.removeClass('show'); $('body').removeClass('mobile-menu-open'); } }
    $mobileMenuButton.on('click', function () { toggleMobileMenu(true); }); $closeMobileMenu.on('click', function () { toggleMobileMenu(false); }); $overlay.on('click', function () { toggleMobileMenu(false); });
    $(window).on('resize', function () { if ($(window).width() >= 768) { toggleMobileMenu(false); } });

    $('#grupoFilter, #equipoFilter, #estadoFilter').on('change', function () { const id = $(this).attr('id'); $(`#mobile${id.charAt(0).toUpperCase() + id.slice(1)}`).val($(this).val()); });
    $('#mobileGrupoFilter, #mobileEquipoFilter, #mobileEstadoFilter').on('change', function () { const id = $(this).attr('id').replace('mobile', ''); $(`#${id.charAt(0).toLowerCase() + id.slice(1)}`).val($(this).val()).trigger('change'); });
    $('#resetFilters').on('click', function () { $('#mobileGrupoFilter, #mobileEquipoFilter, #mobileEstadoFilter').val(''); });
    $('#mobileApplyFilters').on('click', function () { toggleMobileMenu(false); });
    $('#mobileDarkModeToggle').on('click', function () { $('#darkModeToggle').click(); const isDark = document.documentElement.classList.contains('dark'); $(this).html(isDark ? '<i class="fas fa-sun me-2"></i>Modo Claro' : '<i class="fas fa-moon me-2"></i>Modo Oscuro'); });
    $('#darkModeToggle').on('click', function () { const isDark = document.documentElement.classList.contains('dark'); $('#mobileDarkModeToggle').html(!isDark ? '<i class="fas fa-sun me-2"></i>Modo Claro' : '<i class="fas fa-moon me-2"></i>Modo Oscuro'); });

    const $searchInput = $('#estudianteSearch'); const $clearButton = $('#clearSearch');
    function updateClearButtonVisibility() { if ($searchInput.val().trim() !== '') $clearButton.show(); else $clearButton.hide(); }
    $searchInput.on('input', function () { const searchTerm = $(this).val(); filterStudentCards(searchTerm); updateClearButtonVisibility(); });
    $clearButton.on('click', function () { $searchInput.val('').trigger('input'); });
    $(document).on('cardsGenerated', function () { allStudentCards = $('.estudiante-card').toArray(); const currentSearchTerm = $searchInput.val(); if (currentSearchTerm.trim()) filterStudentCards(currentSearchTerm); updateClearButtonVisibility(); });
});