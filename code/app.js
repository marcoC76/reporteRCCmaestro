// Variables globales para las instancias de Chart.js y DataTables
let calificacionesChart, equiposChart, aprobacionChart;
let actividadesChart2, cuestionariosRadarChart, proyectoEntregaChart, bitacoraEntregaChart, puntosExtraChart, entregasActividadesChart, entregasCuestionariosChart, proyectoCalificacionesChart, bitacoraCalificacionesChart;
let grupoCharts = [], equipoCharts = [];

let dataTable, topEstudiantesDataTable, reprobadosDataTable;

let estudiantes = [];
let tipoGraficaActividades = 'barras'; // o 'radar', 'dispersion' - Tipo por defecto para actividadesChart2

$(document).ready(function() {
    const apiUrl = 'https://script.google.com/macros/s/AKfycby_mP3ow6lHHhp5KoZ2cp-JvapWOc6bCEDHQqEdko2k9D1Y-ali/exec';
    $('.loading').show();

    initializeDashboardSections();
    initializeSidebarToggler();
    initializeChartDefaults(); // Configurar defaults para Chart.js

    $.ajax({
        url: apiUrl,
        type: 'GET',
        dataType: 'json',
        success: function(data) {
            estudiantes = data;
            actualizarFiltros(data);
            // Carga inicial para la sección por defecto ('visionGeneral')
            handleSectionChange('visionGeneral', estudiantes);
            $('.loading').hide();
        },
        error: function(error) {
            console.error('Error al cargar los datos:', error);
            $('.loading').text('Error al cargar los datos.').show();
        }
    });

    function initializeChartDefaults() {
        // Configurar Chart.js para que se adapte mejor al tema oscuro de Bootstrap
        Chart.defaults.borderColor = $('body').css('border-color') || '#dee2e6'; // Usa el color de borde del body
        Chart.defaults.color = $('body').css('color') || '#212529'; // Usa el color de texto del body
        
        // Detectar cambios en el tema de Bootstrap para actualizar colores de Chart.js
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-bs-theme') {
                    Chart.defaults.borderColor = getComputedStyle(document.body).getPropertyValue('--bs-border-color-translucent') || '#dee2e6';
                    Chart.defaults.color = getComputedStyle(document.body).getPropertyValue('--bs-body-color') || '#212529';
                    // Actualizar gráficos existentes si es necesario
                    Object.values(Chart.instances).forEach(instance => {
                        if (instance) instance.update();
                    });
                }
            });
        });
        observer.observe(document.documentElement, { attributes: true });
    }

    function initializeSidebarToggler() {
        $('#sidebarToggle').on('click', function() {
            $('#sidebarMenu').toggleClass('active');
            // Forzar un reajuste de DataTables y gráficos si están visibles
            // Esto es un poco "fuerza bruta", pero puede ayudar si los tamaños no se actualizan
            setTimeout(() => {
                if (dataTable && $('#listaEstudiantes').hasClass('active')) dataTable.columns.adjust().draw();
                if (topEstudiantesDataTable && $('#topEstudiantes').hasClass('active')) topEstudiantesDataTable.columns.adjust().draw();
                if (reprobadosDataTable && $('#alumnosReprobados').hasClass('active')) reprobadosDataTable.columns.adjust().draw();
                Object.values(Chart.instances).forEach(instance => {
                    if (instance && $(instance.canvas).closest('.section-content').hasClass('active')) {
                         // instance.resize(); // Comentado, Chart.js 3+ maneja mejor esto
                    }
                });
            }, 350); // Después de la transición del sidebar
        });
    }

    function initializeDashboardSections() {
        const navLinks = $('.sidebar .nav-link');
        navLinks.on('click', function(e) {
            e.preventDefault();
            const sectionId = $(this).data('section');
            if ($(this).hasClass('active')) return; // No hacer nada si ya está activa

            navLinks.removeClass('active');
            $(this).addClass('active');

            $('.section-content').removeClass('active');
            $('#' + sectionId).addClass('active');
            
            // Desplazar al inicio de la sección (útil en móviles)
            // $('.main-content').scrollTop(0); // O $('#' + sectionId)[0].scrollIntoView();

            handleSectionChange(sectionId, estudiantes);
        });
    }

    function handleSectionChange(sectionId, data) {
        if (!data) { // Si data es undefined (primera llamada antes de AJAX)
            console.warn("handleSectionChange: Datos no disponibles aún.");
            return;
        }
        if (data.length === 0 && sectionId !== 'visionGeneral' && sectionId !== 'rendimientoActividades') {
             // Si no hay estudiantes, la mayoría de las secciones no tendrán qué mostrar.
             // Limpiar contenido específico de la sección si es necesario.
             // Por ejemplo, para tablas, mostrar "No hay datos".
             // Los gráficos ya tienen manejo de datos vacíos en sus funciones de creación.
            if ($(`#${sectionId}`).find('table.dataTable').length > 0) {
                const dtInstance = $(`#${sectionId}`).find('table.dataTable').DataTable();
                dtInstance.clear().draw();
                // Opcional: dtInstance.destroy() y limpiar el HTML.
            }
            return;
        }
        
        const datosFiltrados = obtenerDatosFiltrados(data);

        switch (sectionId) {
            case 'visionGeneral':
                calcularEstadisticas(datosFiltrados);
                actualizarRankings(datosFiltrados);
                crearGraficosPrincipales(datosFiltrados);
                break;
            case 'listaEstudiantes':
                inicializarTablaEstudiantes(datosFiltrados);
                break;
            case 'topEstudiantes':
                inicializarTablaTopEstudiantes(datosFiltrados);
                break;
            case 'alumnosReprobados':
                actualizarTablaReprobados(datosFiltrados);
                break;
            case 'analisisGruposEquipos':
                generarSeccionesPorGrupoYEquipo(datosFiltrados);
                break;
            case 'rendimientoActividades':
                // Esta función interna debe llamar a analizarActividades y luego a los creadores de gráficos
                analizarYCrearGraficosDeActividades(datosFiltrados);
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
        handleSectionChange(activeSectionId, estudiantes); // Vuelve a procesar la sección activa con los filtros
        $('.loading').hide();
    }

    $('#grupoFilter, #equipoFilter, #estadoFilter').on('change', function() {
        // Si cambia el filtro de grupo, actualiza el de equipos antes de cargar datos
        if ($(this).is('#grupoFilter')) {
            const grupoSel = $(this).val();
            const equiposPorGrupo = {};
            const todosLosEquiposSet = new Set();
            estudiantes.forEach(est => {
                if(est.EQUIPO) {
                    todosLosEquiposSet.add(est.EQUIPO);
                    if(est.GRUPO) {
                        if(!equiposPorGrupo[est.GRUPO]) equiposPorGrupo[est.GRUPO] = new Set();
                        equiposPorGrupo[est.GRUPO].add(est.EQUIPO);
                    }
                }
            });
            actualizarFiltroEquipos(grupoSel, equiposPorGrupo, [...todosLosEquiposSet].sort(), $('#equipoFilter').val());
        }
        cargarDatosFiltrados();
    });
    
    $('#resetFilters').on('click', function() {
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
        if(gruposUnicos.includes(grupoActual)) $grupoFilter.val(grupoActual);

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
            equiposAMostrar = todosLosEquipos; // Asume que ya están ordenados
        }
        equiposAMostrar.forEach(equipo => $equipoFilter.append(`<option value="${equipo}">${equipo}</option>`));
        if (equiposAMostrar.includes(equipoActual)) $equipoFilter.val(equipoActual);
        else $equipoFilter.val('');
    }

    // --- FUNCIONES DE CÁLCULO Y ACTUALIZACIÓN DE DOM (TARJETAS, ETC.) ---
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
            if(e.GRUPO) { if(!gruposData[e.GRUPO]) gruposData[e.GRUPO] = {s:0, c:0}; gruposData[e.GRUPO].s += parseFloat(e.FINAL||0); gruposData[e.GRUPO].c++; }
            if(e.EQUIPO) { if(!equiposData[e.EQUIPO]) equiposData[e.EQUIPO] = {s:0, c:0}; equiposData[e.EQUIPO].s += parseFloat(e.FINAL||0); equiposData[e.EQUIPO].c++; }
        });
        
        let mejorG = {n:'-', p:-1}, peorG = {n:'-', p:11}, mejorE = {n:'-', p:-1}, peorE = {n:'-', p:11};
        Object.entries(gruposData).forEach(([n,d]) => { const p = d.c > 0 ? d.s/d.c : 0; if(p > mejorG.p) mejorG = {n,p}; if(d.c > 0 && p < peorG.p) peorG = {n,p}; });
        Object.entries(equiposData).forEach(([n,d]) => { const p = d.c > 0 ? d.s/d.c : 0; if(p > mejorE.p) mejorE = {n,p}; if(d.c > 0 && p < peorE.p) peorE = {n,p}; });

        $('#mejorGrupo').text(mejorG.n); $('#promedioMejorGrupo').text(mejorG.p !== -1 ? mejorG.p.toFixed(1) : '0.0');
        $('#peorGrupo').text(peorG.n); $('#promedioPeorGrupo').text(peorG.p !== 11 ? peorG.p.toFixed(1) : '0.0');
        $('#mejorEquipo').text(mejorE.n); $('#promedioMejorEquipo').text(mejorE.p !== -1 ? mejorE.p.toFixed(1) : '0.0');
        $('#peorEquipo').text(peorE.n); $('#promedioPeorEquipo').text(peorE.p !== 11 ? peorE.p.toFixed(1) : '0.0');
    }

    // --- FUNCIONES DE CREACIÓN DE GRÁFICOS PRINCIPALES ---
    function crearGraficosPrincipales(datos) {
        if (!datos) return;
        // Destruir gráficos existentes
        if (calificacionesChart) { calificacionesChart.destroy(); calificacionesChart = null; }
        if (equiposChart) { equiposChart.destroy(); equiposChart = null; }
        if (aprobacionChart) { aprobacionChart.destroy(); aprobacionChart = null; }
        
        const commonOptions = { responsive: true, maintainAspectRatio: false, animation: { duration: 500 } };

        // Calificaciones
        if (document.getElementById('calificacionesChart') && datos.length > 0) {
            const califCounts = Array(10).fill(0);
            datos.forEach(e => { const c = Math.min(9, Math.floor(parseFloat(e.FINAL) || 0)); if (!isNaN(c) && c >= 0) califCounts[c]++; });
            calificacionesChart = new Chart(document.getElementById('calificacionesChart').getContext('2d'), {
                type: 'bar',
                data: { labels: ['0-1', '1-2', '2-3', '3-4', '4-5', '5-6', '6-7', '7-8', '8-9', '9-10'], datasets: [{ label: 'Estudiantes', data: califCounts, backgroundColor: 'rgba(var(--bs-primary-rgb), 0.7)' }] },
                options: {...commonOptions, plugins: { legend: { display: false }, title: { display: true, text: 'Distribución de Calificaciones' } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
            });
        } else if (document.getElementById('calificacionesChart')) { $(document.getElementById('calificacionesChart')).parent().html('<p class="text-center text-muted small mt-5">No hay datos para mostrar.</p>')}

        // Equipos
        if (document.getElementById('equiposChart') && datos.length > 0) {
            const eqData = {}; datos.forEach(e => { if(e.EQUIPO){ if(!eqData[e.EQUIPO]) eqData[e.EQUIPO]={s:0,c:0}; eqData[e.EQUIPO].s+=parseFloat(e.FINAL||0); eqData[e.EQUIPO].c++; }});
            const eqSorted = Object.entries(eqData).map(([n,d])=>({n, p: d.c>0?d.s/d.c:0})).sort((a,b)=>b.p-a.p);
            equiposChart = new Chart(document.getElementById('equiposChart').getContext('2d'), {
                type: 'bar',
                data: { labels: eqSorted.map(e=>e.n), datasets: [{ label: 'Promedio', data: eqSorted.map(e=>e.p.toFixed(1)), backgroundColor: 'rgba(25, 135, 84, 0.7)' }] }, // Verde Bootstrap
                options: {...commonOptions, plugins: { legend: { display: false }, title: { display: true, text: 'Promedio por Equipo' } }, scales: { y: { beginAtZero: true, max: 10, ticks: { precision: 1 } } } }
            });
        } else if (document.getElementById('equiposChart')) { $(document.getElementById('equiposChart')).parent().html('<p class="text-center text-muted small mt-5">No hay datos de equipos para mostrar.</p>')}
        
        // Aprobación
        if (document.getElementById('aprobacionChart') && datos.length > 0) {
            const aprob = datos.filter(e => parseFloat(e.FINAL) >= 6).length;
            const reprob = datos.length - aprob;
            aprobacionChart = new Chart(document.getElementById('aprobacionChart').getContext('2d'), {
                type: 'doughnut',
                data: { labels: ['Aprobados', 'Reprobados'], datasets: [{ data: [aprob, reprob], backgroundColor: ['rgba(25, 135, 84, 0.7)', 'rgba(220, 53, 69, 0.7)'] }] },
                options: {...commonOptions, cutout: '60%', plugins: { legend: { position: 'bottom' }, title: { display: true, text: 'Estado de Aprobación' } } }
            });
        } else if (document.getElementById('aprobacionChart')) { $(document.getElementById('aprobacionChart')).parent().html('<p class="text-center text-muted small mt-5">No hay datos para mostrar.</p>')}
    }
    
    // --- FUNCIONES DE INICIALIZACIÓN DE DATATABLES ---
    function inicializarTablaEstudiantes(datos) {
        const tableId = '#estudiantesTable';
        if ($.fn.DataTable.isDataTable(tableId)) {
            dataTable.clear().rows.add(datos).draw();
        } else {
            dataTable = $(tableId).DataTable({
                data: datos,
                columns: [ { data: 'ID' }, { data: 'COMPLETO' }, { data: 'NICK' }, { data: 'GRUPO' }, { data: 'EQUIPO' }, { data: 'TOTALASIS' },
                    { data: 'FINAL', render: rSemaforo }, { data: 'Edo', render: rEstadoBadge } ],
                language: { url: '//cdn.datatables.net/plug-ins/1.11.5/i18n/es-ES.json' }, pageLength: 10,
                lengthMenu: [[10, 25, 50, -1], [10, 25, 50, 'Todos']], responsive: true,
                order: [[3, 'asc'], [1, 'asc']]
            });
        }
        if (dataTable) dataTable.columns.adjust().responsive.recalc();
    }

    function inicializarTablaTopEstudiantes(datos) {
        const tableId = '#topEstudiantesTable';
        const mejoresPorG = {}; datos.forEach(e => { const g = e.GRUPO || 'Sin Grupo'; const cal = parseFloat(e.FINAL); if(!mejoresPorG[g] || cal > parseFloat(mejoresPorG[g].FINAL)) mejoresPorG[g]=e; });
        const topData = Object.values(mejoresPorG).sort((a,b) => parseFloat(b.FINAL)-parseFloat(a.FINAL)).slice(0,10);

        if ($.fn.DataTable.isDataTable(tableId)) {
            topEstudiantesDataTable.clear().rows.add(topData).draw();
        } else {
            topEstudiantesDataTable = $(tableId).DataTable({
                data: topData,
                columns: [ {data:null, render:(d,t,r,m)=>m.row+1}, {data:'COMPLETO'}, {data:'GRUPO'}, {data:'EQUIPO'}, {data:'FINAL',render:rCalBadge} ],
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
            .sort((a,b)=>{ if(a.GRUPO<b.GRUPO)return -1; if(a.GRUPO>b.GRUPO)return 1; if(a.COMPLETO<b.COMPLETO)return -1; if(a.COMPLETO>b.COMPLETO)return 1; return 0;});

        if ($.fn.DataTable.isDataTable(tableId)) {
            reprobadosDataTable.clear().rows.add(reprobData).draw();
        } else {
           reprobadosDataTable = $(tableId).DataTable({
                data: reprobData,
                columns: [ { data: 'COMPLETO' }, { data: 'GRUPO' }, { data: 'FINAL_NUM', render: d => `<span class="text-danger fw-bold">${d.toFixed(1)}</span>` }],
                order: [[1, 'asc'], [0, 'asc']], pageLength: 10, responsive: true,
                language: { url: '//cdn.datatables.net/plug-ins/1.11.5/i18n/es-MX.json' }
            });
        }
        if (reprobadosDataTable) reprobadosDataTable.columns.adjust().responsive.recalc();
    }
    // Renders para DataTables
    function rSemaforo(data) { const c=parseFloat(data)||0; const cl=c<6?'semaforo-rojo':c<8?'semaforo-amarillo':'semaforo-verde'; return `<div class="semaforo-calificacion"><span class="punto-semaforo ${cl}"></span><span class="texto-semaforo">${c.toFixed(1)}</span></div>`; }
    function rEstadoBadge(d,t,r) { const c=parseFloat(r.FINAL||0); return `<span class="badge ${c<6?'bg-danger':'bg-success'}">${c<6?'Reprobado':'Aprobado'}</span>`;}
    function rCalBadge(data) { return `<span class="badge ${parseFloat(data)>=6?'bg-success':'bg-danger'}">${parseFloat(data).toFixed(1)}</span>`;}

    $('#descargarReprobadosBtn').off('click').on('click', function() {
        const datosFiltradosActuales = obtenerDatosFiltrados(estudiantes);
        const reprobadosDescarga = datosFiltradosActuales.filter(e => parseFloat(e.FINAL) < 6)
            .sort((a,b)=>{ if((a.GRUPO||'')<(b.GRUPO||''))return -1;if((a.GRUPO||'')>(b.GRUPO||''))return 1;if(a.COMPLETO<b.COMPLETO)return -1;if(a.COMPLETO>b.COMPLETO)return 1;return 0;});
        
        let csv = 'Grupo,Nombre,Calificacion Final\n' + reprobadosDescarga.map(e => `"${e.GRUPO||''}","${e.COMPLETO}",${parseFloat(e.FINAL).toFixed(1)}`).join('\n');
        let blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        let link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `alumnos_reprobados_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    });

    // --- ANÁLISIS Y GRÁFICOS DE ACTIVIDADES (SECCIÓN RENDIMIENTO) ---
    function analizarYCrearGraficosDeActividades(datos) {
        // Limpiar DOM y destruir gráficos si no hay datos
        if (!datos || datos.length === 0) {
            $('#actividadMasEntregada, #actividadMenosEntregada, #cuestionarioMasEntregado, #cuestionarioMenosEntregado').text('-');
            $('#porcentajeMasEntregada, #porcentajeMenosEntregada, #porcentajeCuestionarioMas, #porcentajeCuestionarioMenos, #porcentajeEntregaProyecto, #porcentajeEntregaBitacora, #puntosExtraPorcentaje').text('0%');
            $('#proyectoEntregados, #proyectoPendientes, #proyectoPromedio, #bitacoraEntregados, #bitacoraPendientes, #bitacoraPromedio, #puntosExtraEntregados').text('0');
            
            const chartsToClean = [actividadesChart2, entregasActividadesChart, cuestionariosRadarChart, entregasCuestionariosChart, proyectoEntregaChart, proyectoCalificacionesChart, bitacoraEntregaChart, bitacoraCalificacionesChart, puntosExtraChart];
            chartsToClean.forEach((chart, index) => {
                if (chart) { chart.destroy(); 
                    // Asignar null a la variable global correcta
                    if (index === 0) actividadesChart2 = null; else if (index === 1) entregasActividadesChart = null; // ... y así sucesivamente
                }
                // Limpiar contenedor del canvas
                const canvasId = ['actividadesChart2', 'entregasActividadesChart', 'cuestionariosRadarChart', 'entregasCuestionariosChart', 'proyectoEntregaChart', 'proyectoCalificacionesChart', 'bitacoraEntregaChart', 'bitacoraCalificacionesChart', 'puntosExtraChart'][index];
                if (document.getElementById(canvasId)) $(`#${canvasId}`).parent().html('<p class="text-center text-muted small mt-3">No hay datos.</p>');
            });
            return;
        }

        // Si hay datos, primero asegurar que los canvas estén presentes
        const canvasIds = ['actividadesChart2', 'entregasActividadesChart', 'cuestionariosRadarChart', 'entregasCuestionariosChart', 'proyectoEntregaChart', 'proyectoCalificacionesChart', 'bitacoraEntregaChart', 'bitacoraCalificacionesChart', 'puntosExtraChart'];
        canvasIds.forEach(id => {
            const container = $(`#${id}`).parent();
            if (container.find('canvas').length === 0) {
                container.html(`<canvas id="${id}"></canvas>`);
            }
        });
        
        // Llama a la lógica de análisis que actualiza las tarjetas
        const statsCompletas = analizarActividades(datos); // Esta función actualiza los #IDs de las tarjetas
        
        // Llama a las funciones de creación de gráficos para esta sección
        crearGraficaActividadesRendimiento(datos);
        crearGraficaEntregasActividades(datos);
        crearGraficaRadarCuestionarios(datos);
        crearGraficaEntregasCuestionarios(datos);
        // Las siguientes ya son llamadas dentro de analizarActividades si los datos existen:
        // crearGraficaProyectoEntrega, crearGraficaCalificacionesProyecto, etc.
    }

    function analizarActividades(datos) { // Esta función principalmente calcula y actualiza los #IDs de las tarjetas
        const acts = ['ACTIVIDAD4','ACTIVIDAD5','ACTIVIDAD6'], cuests = ['CUESTIONARIO4','CUESTIONARIO5','CUESTIONARIO6'];
        const calcStats = (items, prefix) => items.map(item => {
            const ent = datos.filter(e => parseFloat(e[item]) > 0).length;
            const porc = datos.length > 0 ? (ent / datos.length * 100) : 0;
            return { nom: `${prefix} ${item.replace(prefix.toUpperCase(), '')}`, ent, tot: datos.length, porc: porc.toFixed(1) };
        }).sort((a,b) => b.porc - a.porc);

        const statsActs = calcStats(acts, 'Actividad');
        const statsCuests = calcStats(cuests, 'Cuestionario');

        $('#actividadMasEntregada').text(statsActs[0]?.nom || '-'); $('#porcentajeMasEntregada').text(`${statsActs[0]?.porc || 0}% (${statsActs[0]?.ent||0}/${statsActs[0]?.tot||0})`);
        $('#actividadMenosEntregada').text(statsActs[statsActs.length-1]?.nom || '-'); $('#porcentajeMenosEntregada').text(`${statsActs[statsActs.length-1]?.porc || 0}% (${statsActs[statsActs.length-1]?.ent||0}/${statsActs[statsActs.length-1]?.tot||0})`);
        $('#cuestionarioMasEntregado').text(statsCuests[0]?.nom || '-'); $('#porcentajeCuestionarioMas').text(`${statsCuests[0]?.porc || 0}% (${statsCuests[0]?.ent||0}/${statsCuests[0]?.tot||0})`);
        $('#cuestionarioMenosEntregado').text(statsCuests[statsCuests.length-1]?.nom || '-'); $('#porcentajeCuestionarioMenos').text(`${statsCuests[statsCuests.length-1]?.porc || 0}% (${statsCuests[statsCuests.length-1]?.ent||0}/${statsCuests[statsCuests.length-1]?.tot||0})`);

        const proyBit = ['PROYECTO', 'BITACORA'].reduce((acc, item) => {
            const ent = datos.filter(e => parseFloat(e[item]) > 0);
            const porc = datos.length > 0 ? (ent.length / datos.length * 100) : 0;
            const prom = ent.length > 0 ? ent.reduce((s,e) => s + parseFloat(e[item]||0), 0) / ent.length : 0;
            acc[item] = { ent: ent.length, tot: datos.length, porc: porc.toFixed(1), prom: prom.toFixed(1) };
            return acc;
        }, {});

        if(proyBit['PROYECTO']) {
            $('#proyectoEntregados').text(proyBit.PROYECTO.ent); $('#proyectoPendientes').text(proyBit.PROYECTO.tot - proyBit.PROYECTO.ent);
            $('#proyectoPromedio').text(proyBit.PROYECTO.prom); $('#porcentajeEntregaProyecto').text(`${proyBit.PROYECTO.porc}%`);
            crearGraficaProyectoEntrega(proyBit.PROYECTO); crearGraficaCalificacionesProyecto(datos);
        }
        if(proyBit['BITACORA']) {
            $('#bitacoraEntregados').text(`${proyBit.BITACORA.ent}/${proyBit.BITACORA.tot}`); $('#bitacoraPendientes').text(`${proyBit.BITACORA.tot - proyBit.BITACORA.ent}/${proyBit.BITACORA.tot}`);
            $('#bitacoraPromedio').text(proyBit.BITACORA.prom); $('#porcentajeEntregaBitacora').text(`${proyBit.BITACORA.porc}%`);
            crearGraficaBitacoraEntrega(proyBit.BITACORA); crearGraficaCalificacionesBitacora(datos);
        }
        
        const pex = datos.filter(e => parseFloat(e.PUNTOEX) > 0);
        const pexPorc = datos.length > 0 ? (pex.length / datos.length * 100) : 0;
        $('#puntosExtraEntregados').text(`${pex.length}/${datos.length}`); $('#puntosExtraPorcentaje').text(`${pexPorc.toFixed(1)}%`);
        crearGraficaPuntosExtra(datos, {entregados: pex.length, total: datos.length, porcentaje: pexPorc.toFixed(1)});
    }
    
    // --- GRÁFICOS ESPECÍFICOS DE LA SECCIÓN DE RENDIMIENTO ---
    // (Estas funciones deben destruir y recrear sus respectivos gráficos)
    function crearGraficaActividadesRendimiento(datos) {
        const canvasId = 'actividadesChart2';
        if (actividadesChart2) { actividadesChart2.destroy(); actividadesChart2 = null; }
        if (!datos || datos.length === 0 || !document.getElementById(canvasId)) return;

        const ctx = document.getElementById(canvasId).getContext('2d');
        const acts = ['ACTIVIDAD4', 'ACTIVIDAD5', 'ACTIVIDAD6'], labels = acts.map(a => `Act ${a.slice(-1)}`);
        const entregasP = acts.map(a => datos.length > 0 ? (datos.filter(e=>parseFloat(e[a])>0).length / datos.length * 100) : 0);
        const promCalif = acts.map(a => { const d=datos.filter(e=>parseFloat(e[a])>0); return d.length>0 ? d.reduce((s,e)=>s+parseFloat(e[a]||0),0)/d.length : 0; });

        let config;
        if (tipoGraficaActividades === 'radar') {
            config = { type:'radar', data:{labels, datasets:[{label:'Entregas',data:entregasP.map(p=>(p/10)+1),borderColor:'rgb(54,162,235)',backgroundColor:'rgba(54,162,235,0.2)'},{label:'Promedio',data:promCalif,borderColor:'rgb(255,99,132)',backgroundColor:'rgba(255,99,132,0.2)'}]}, options:{responsive:true,maintainAspectRatio:false,scales:{r:{min:1,max:10,ticks:{stepSize:1}}}}};
        } else { // barras (default)
            config = { type:'bar', data:{labels, datasets:[{label:'Entregas (%)',data:entregasP,backgroundColor:'rgba(var(--bs-primary-rgb),0.7)'},{label:'Prom. Calif. (x10)',data:promCalif.map(p=>p*10),backgroundColor:'rgba(var(--bs-danger-rgb),0.7)'}]}, options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true,max:100}}}};
        }
        actividadesChart2 = new Chart(ctx, config);
    }

    function crearGraficaEntregasActividades(datos) {
        const canvasId = 'entregasActividadesChart';
        if (entregasActividadesChart) { entregasActividadesChart.destroy(); entregasActividadesChart = null; }
        if (!datos || datos.length === 0 || !document.getElementById(canvasId)) return;
        const ctx = document.getElementById(canvasId).getContext('2d');
        const acts = ['ACTIVIDAD4','ACTIVIDAD5','ACTIVIDAD6'], labels = acts.map(a=>`Act ${a.slice(-1)}`);
        const ent = acts.map(a=>datos.filter(e=>parseFloat(e[a])>0).length);
        const pend = ent.map(v => datos.length - v);
        entregasActividadesChart = new Chart(ctx, {type:'bar',data:{labels,datasets:[{label:'Entregados',data:ent,backgroundColor:'rgba(25,135,84,0.7)'},{label:'Pendientes',data:pend,backgroundColor:'rgba(220,53,69,0.7)'}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true,stacked:true,ticks:{precision:0}},x:{stacked:true}}}});
    }

    function crearGraficaRadarCuestionarios(datos) {
        const canvasId = 'cuestionariosRadarChart';
        if (cuestionariosRadarChart) { cuestionariosRadarChart.destroy(); cuestionariosRadarChart = null; }
        if (!datos || datos.length === 0 || !document.getElementById(canvasId)) return;
        const ctx = document.getElementById(canvasId).getContext('2d');
        const cuests = ['CUESTIONARIO4','CUESTIONARIO5','CUESTIONARIO6'], labels = cuests.map(c=>`Cuest ${c.slice(-1)}`);
        const entregasP = cuests.map(c => datos.length > 0 ? (datos.filter(e=>parseFloat(e[c])>0).length / datos.length * 10) : 0); // escala 0-10
        const promCalif = cuests.map(c => { const d=datos.filter(e=>parseFloat(e[c])>0); return d.length>0 ? d.reduce((s,e)=>s+parseFloat(e[c]||0),0)/d.length : 0; });
        cuestionariosRadarChart = new Chart(ctx, {type:'radar',data:{labels,datasets:[{label:'Entregas (0-10)',data:entregasP,borderColor:'rgb(75,192,192)',backgroundColor:'rgba(75,192,192,0.2)'},{label:'Prom. Calif.',data:promCalif,borderColor:'rgb(255,159,64)',backgroundColor:'rgba(255,159,64,0.2)'}]},options:{responsive:true,maintainAspectRatio:false,scales:{r:{min:0,max:10,ticks:{stepSize:1}}}}});
    }
    
    function crearGraficaEntregasCuestionarios(datos) {
        const canvasId = 'entregasCuestionariosChart';
        if (entregasCuestionariosChart) { entregasCuestionariosChart.destroy(); entregasCuestionariosChart = null; }
        if (!datos || datos.length === 0 || !document.getElementById(canvasId)) return;
        const ctx = document.getElementById(canvasId).getContext('2d');
        const cuests = ['CUESTIONARIO4','CUESTIONARIO5','CUESTIONARIO6'], labels = cuests.map(c=>`Cuest ${c.slice(-1)}`);
        const ent = cuests.map(c=>datos.filter(e=>parseFloat(e[c])>0).length);
        const pend = ent.map(v => datos.length - v);
        entregasCuestionariosChart = new Chart(ctx, {type:'bar',data:{labels,datasets:[{label:'Entregados',data:ent,backgroundColor:'rgba(var(--bs-primary-rgb),0.7)'},{label:'Pendientes',data:pend,backgroundColor:'rgba(var(--bs-danger-rgb),0.7)'}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true,stacked:true,ticks:{precision:0}},x:{stacked:true}}}});
    }

    function crearGraficaProyectoEntrega(stats) {
        const canvasId = 'proyectoEntregaChart';
        if (proyectoEntregaChart) { proyectoEntregaChart.destroy(); proyectoEntregaChart = null; }
        if (!stats || !document.getElementById(canvasId)) return;
        const ctx = document.getElementById(canvasId).getContext('2d');
        proyectoEntregaChart = new Chart(ctx, {type:'doughnut',data:{labels:['Entregados','Pendientes'],datasets:[{data:[stats.entregados, stats.total-stats.entregados],backgroundColor:['rgba(25,135,84,0.7)','rgba(220,53,69,0.5)']}]},options:{responsive:true,maintainAspectRatio:false,cutout:'70%',plugins:{legend:{display:false}}}});
    }
    function crearGraficaCalificacionesProyecto(datos) {
        const canvasId = 'proyectoCalificacionesChart';
        if (proyectoCalificacionesChart) { proyectoCalificacionesChart.destroy(); proyectoCalificacionesChart = null; }
        if (!datos || datos.length === 0 || !document.getElementById(canvasId)) return;
        const ctx = document.getElementById(canvasId).getContext('2d');
        const califProy = datos.filter(e=>parseFloat(e.PROYECTO)>0).map(e=>parseFloat(e.PROYECTO));
        const rangos = ['0-6','6-7','7-8','8-9','9-10'], counts = Array(5).fill(0);
        califProy.forEach(c => { if(c<6)counts[0]++; else if(c<7)counts[1]++; else if(c<8)counts[2]++; else if(c<9)counts[3]++; else counts[4]++; });
        proyectoCalificacionesChart = new Chart(ctx, {type:'bar',data:{labels:rangos,datasets:[{label:'Estudiantes',data:counts,backgroundColor:['#dc3545','#fd7e14','#ffc107','#198754','#0d6efd'].map(c=>`${c}B3`)}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{precision:0}}}}});
    }
    function crearGraficaBitacoraEntrega(stats) {
        const canvasId = 'bitacoraEntregaChart';
        if (bitacoraEntregaChart) { bitacoraEntregaChart.destroy(); bitacoraEntregaChart = null; }
        if (!stats || !document.getElementById(canvasId)) return;
        const ctx = document.getElementById(canvasId).getContext('2d');
        bitacoraEntregaChart = new Chart(ctx, {type:'doughnut',data:{labels:['Entregadas','Pendientes'],datasets:[{data:[stats.entregados, stats.total-stats.entregados],backgroundColor:['rgba(13,202,240,0.7)','rgba(220,53,69,0.5)']}]},options:{responsive:true,maintainAspectRatio:false,cutout:'70%',plugins:{legend:{display:false}}}});
    }
    function crearGraficaCalificacionesBitacora(datos) {
        const canvasId = 'bitacoraCalificacionesChart';
        if (bitacoraCalificacionesChart) { bitacoraCalificacionesChart.destroy(); bitacoraCalificacionesChart = null; }
        if (!datos || datos.length === 0 || !document.getElementById(canvasId)) return;
        const ctx = document.getElementById(canvasId).getContext('2d');
        const califBit = datos.filter(e=>parseFloat(e.BITACORA)>0).map(e=>parseFloat(e.BITACORA));
        const rangos = ['0-6','6-7','7-8','8-9','9-10'], counts = Array(5).fill(0);
        califBit.forEach(c => { if(c<6)counts[0]++; else if(c<7)counts[1]++; else if(c<8)counts[2]++; else if(c<9)counts[3]++; else counts[4]++; });
        bitacoraCalificacionesChart = new Chart(ctx, {type:'bar',data:{labels:rangos,datasets:[{label:'Estudiantes',data:counts,backgroundColor:['#dc3545','#fd7e14','#ffc107','#198754','#0d6efd'].map(c=>`${c}B3`)}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{precision:0}}}}});
    }
    function crearGraficaPuntosExtra(datos, stats) {
        const canvasId = 'puntosExtraChart';
        if (puntosExtraChart) { puntosExtraChart.destroy(); puntosExtraChart = null; }
        if (!datos || datos.length === 0 || !stats || !document.getElementById(canvasId)) return;
        const ctx = document.getElementById(canvasId).getContext('2d');
        const pexCounts = datos.filter(e=>parseFloat(e.PUNTOEX)>0).reduce((acc,e)=>{ const p=Math.floor(parseFloat(e.PUNTOEX)||0); acc[p]=(acc[p]||0)+1; return acc; }, {});
        const labels = Object.keys(pexCounts).sort((a,b)=>a-b).map(p=>`${p} pts`);
        const data = Object.values(pexCounts);
        puntosExtraChart = new Chart(ctx, {type:'bar',data:{labels,datasets:[{label:'Estudiantes',data,backgroundColor:'rgba(255,193,7,0.7)'}]},options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,ticks:{precision:0}}}}});
    }

    // --- SECCIONES DE GRUPOS Y EQUIPOS ---
    function generarSeccionesPorGrupoYEquipo(datos) {
        const container = $('#gruposContainer');
        container.empty();
        if(grupoCharts) grupoCharts.forEach(chart => chart.destroy());
        if(equipoCharts) equipoCharts.forEach(chart => chart.destroy());
        grupoCharts = []; equipoCharts = [];

        if (!datos || datos.length === 0) {
            container.html('<p class="text-center text-muted">No hay datos de grupos o equipos para mostrar con los filtros actuales.</p>');
            return;
        }
        
        const grupos = {};
        datos.forEach(est => {
            const g = est.GRUPO || 'Sin Grupo', eq = est.EQUIPO || 'Sin Equipo';
            if (!grupos[g]) grupos[g] = { ests: [], eqs: {} };
            if (!grupos[g].eqs[eq]) grupos[g].eqs[eq] = [];
            grupos[g].ests.push(est); grupos[g].eqs[eq].push(est);
        });
        
        Object.entries(grupos).sort().forEach(([nombreG, dataG]) => {
            const template = $('#grupoTemplate').prop('content');
            if (!template) { console.error("Plantilla #grupoTemplate no encontrada"); return; }
            const $gSection = $(template.cloneNode(true));
            $gSection.find('.grupo-nombre').text(nombreG);
            // ... (Lógica para poblar estadísticas del grupo y top3)
            const aprob = dataG.ests.filter(e => parseFloat(e.FINAL) >= 6).length, total = dataG.ests.length;
            const prom = total > 0 ? dataG.ests.reduce((s,e) => s + parseFloat(e.FINAL||0), 0) / total : 0;
            const mejorE = [...dataG.ests].sort((a,b) => parseFloat(b.FINAL||0) - parseFloat(a.FINAL||0))[0];
            if(mejorE) { $gSection.find('.mejor-estudiante').text(mejorE.COMPLETO); $gSection.find('.mejor-calificacion').text(parseFloat(mejorE.FINAL||0).toFixed(1));}
            $gSection.find('.aprobados').text(`${aprob} (${total>0?Math.round(aprob/total*100):0}%)`);
            $gSection.find('.reprobados').text(`${total-aprob} (${total>0?Math.round((total-aprob)/total*100):0}%)`);
            $gSection.find('.promedio').text(prom.toFixed(1));
            const top3 = [...dataG.ests].sort((a,b) => parseFloat(b.FINAL||0) - parseFloat(a.FINAL||0)).slice(0,3);
            const $top3B = $gSection.find('.top3-body'); $top3B.empty();
            top3.forEach((e,i) => $top3B.append(`<tr><td>${i+1}</td><td>${e.COMPLETO}</td><td>${e.EQUIPO||'-'}</td><td>${parseFloat(e.FINAL||0).toFixed(1)}</td></tr>`));
            
            const ctxG = $gSection.find('.grupo-chart')[0].getContext('2d');
            grupoCharts.push(new Chart(ctxG, crearConfiguracionGraficoAprobacion(dataG.ests, `Grupo ${nombreG}`)));
            
            const $eqsContainer = $gSection.find('.equipos-container');
            Object.entries(dataG.eqs).sort().forEach(([nombreEq, estsEq]) => {
                generarSeccionEquipo($eqsContainer, nombreEq, estsEq);
            });
            container.append($gSection);
        });
    }
    function generarSeccionEquipo($container, nombreEq, estudiantes) {
        const template = $('#equipoTemplate').prop('content');
        if (!template) { console.error("Plantilla #equipoTemplate no encontrada"); return; }
        const $eqSection = $(template.cloneNode(true));
        $eqSection.find('.equipo-nombre').text(nombreEq);
        // ... (Lógica para poblar estadísticas del equipo)
        const total = estudiantes.length;
        const prom = total > 0 ? estudiantes.reduce((s,e) => s + parseFloat(e.FINAL||0), 0) / total : 0;
        const mejorE = [...estudiantes].sort((a,b) => parseFloat(b.FINAL||0) - parseFloat(a.FINAL||0))[0];
        if(mejorE) { $eqSection.find('.mejor-estudiante').text(mejorE.COMPLETO); $eqSection.find('.mejor-calificacion').text(parseFloat(mejorE.FINAL||0).toFixed(1));}
        $eqSection.find('.total-miembros').text(total); $eqSection.find('.promedio').text(prom.toFixed(1));
        const $miembrosB = $eqSection.find('.equipo-miembros');
        estudiantes.forEach(e => $miembrosB.append(`<tr><td>${e.COMPLETO}</td><td>${parseFloat(e.FINAL||0).toFixed(1)}</td><td>${rEstadoBadge(null,null,e)}</td></tr>`));

        const ctxEq = $eqSection.find('.equipo-chart')[0].getContext('2d');
        equipoCharts.push(new Chart(ctxEq, crearConfiguracionGraficoAprobacion(estudiantes, `Equipo ${nombreEq}`)));
        $container.append($eqSection);
    }
    function crearConfiguracionGraficoAprobacion(estudiantes, titulo) {
        if (!estudiantes || estudiantes.length === 0) return {type:'doughnut', data:{labels:['Sin Datos'], datasets:[{data:[1], backgroundColor:['#ccc']}]}, options:{responsive:true, maintainAspectRatio:false, plugins:{title:{display:true,text:titulo+ ' (Sin Datos)'}}}};
        const aprob = estudiantes.filter(e => parseFloat(e.FINAL) >= 6).length, total = estudiantes.length;
        const porcAprob = total > 0 ? (aprob / total * 100).toFixed(1) : 0;
        return {
            type: 'doughnut', data: { labels: ['Aprobados', 'Reprobados'], datasets: [{ data: [aprob, total - aprob], backgroundColor: ['rgba(25,135,84,0.7)', 'rgba(220,53,69,0.7)'], borderWidth:1, borderColor: $('html').attr('data-bs-theme') === 'dark' ? '#343a40' : '#fff'}] }, // Borde para separar segmentos
            options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels:{boxWidth:12, padding:10} }, title: { display: true, text: `${titulo} (${porcAprob}% aprob.)`, font: { size: 11 } } } }
        };
    }

}); // Fin de $(document).ready()