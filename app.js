let calificacionesChart, equiposChart, topEstudiantesChart, aprobacionChart, actividadesChart, cuestionariosRadarChart, proyectoEntregaChart, bitacoraEntregaChart, puntosExtraChart, entregasActividadesChart, entregasCuestionariosChart, proyectoCalificacionesChart, bitacoraCalificacionesChart;
let tipoGraficaActividades = 'radar'; // Tipo de gráfica actual para actividades
let grupoCharts = [];
let equipoCharts = [];

$(document).ready(function() {

    // Función para poblar la tabla de reprobados
    function actualizarTablaReprobados(datos) {
        // Obtener filtros activos
        const grupoSeleccionado = $('#grupoFilter').val();
        const equipoSeleccionado = $('#equipoFilter').val();
        const estadoSeleccionado = $('#estadoFilter').val();

        // Filtrar los reprobados según los filtros activos
        let filtrados = datos.map(e => ({
            ...e,
            // Asegurar que el grupo sea un string vacío si es null/undefined
            GRUPO: e.GRUPO || '',
            // Asegurar que la calificación sea un número
            FINAL_NUM: parseFloat(e.FINAL)
        })).filter(e => {
            let cumple = true;
            if (grupoSeleccionado && e.GRUPO !== grupoSeleccionado) cumple = false;
            if (equipoSeleccionado && e.EQUIPO !== equipoSeleccionado) cumple = false;
            // Solo mostrar reprobados
            if (estadoSeleccionado && estadoSeleccionado !== 'Reprobado') cumple = false;
            if (e.FINAL_NUM >= 6) cumple = false;
            return cumple;
        });

        // Si ya existe la tabla DataTable, destruirla
        if ($.fn.DataTable.isDataTable('#reprobadosTable')) {
            $('#reprobadosTable').DataTable().destroy();
        }

        // Limpiar y poblar la tabla
        const $tbody = $('#reprobadosTableBody');
        $tbody.empty();
        
        // Inicializar DataTable
        const table = $('#reprobadosTable').DataTable({
            data: filtrados,
            columns: [
                { data: 'COMPLETO', title: 'Nombre' },
                { data: 'GRUPO', title: 'Grupo' },
                { 
                    data: 'FINAL_NUM',
                    title: 'Calificación Final',
                    render: function(data) {
                        return `<span class="text-danger fw-bold">${data.toFixed(1)}</span>`;
                    }
                }
            ],
            order: [[1, 'asc'], [0, 'asc']], // Ordenar por Grupo (asc) y luego por Nombre (asc)
            pageLength: 10,
            lengthMenu: [[10, 25, 50, -1], [10, 25, 50, 'Todos']],
            language: {
                url: '//cdn.datatables.net/plug-ins/1.11.5/i18n/es-MX.json',
                lengthMenu: 'Mostrar _MENU_ registros por página',
                zeroRecords: 'No se encontraron registros',
                info: 'Mostrando _START_ a _END_ de _TOTAL_ registros',
                infoEmpty: 'No hay registros disponibles',
                infoFiltered: '(filtrado de _MAX_ registros en total)'
            },
            dom: '<"d-flex justify-content-between align-items-center mb-3"<"d-flex align-items-center"><"d-flex align-items-center">>t<"d-flex justify-content-between align-items-center mt-3"<"dataTables_info"i><"dataTables_paginate"p>>',
            initComplete: function() {
                // Asegurar que la tabla ocupe todo el ancho disponible
                $('.dataTables_wrapper').css('width', '100%');
                
                // Mover el selector de cantidad de registros al lado derecho
                $('.dataTables_length').addClass('me-3');
                $('.dataTables_filter').addClass('ms-3');
            }
        });
    }

    // Evento para mostrar la tabla de reprobados al abrir el colapsable
    $(document).on('shown.bs.collapse', '#reprobadosCollapse', function() {
        if (typeof estudiantes !== 'undefined') {
            actualizarTablaReprobados(estudiantes);
        }
    });

    // Evento para descargar la tabla de reprobados
    $(document).on('click', '#descargarReprobadosBtn', function() {
        // Obtener los datos ordenados directamente del array de estudiantes
        const grupoSeleccionado = $('#grupoFilter').val();
        const equipoSeleccionado = $('#equipoFilter').val();
        
        // Filtrar los reprobados
        let filtrados = estudiantes.filter(e => {
            if (parseFloat(e.FINAL) >= 6) return false;
            if (grupoSeleccionado && e.GRUPO !== grupoSeleccionado) return false;
            if (equipoSeleccionado && e.EQUIPO !== equipoSeleccionado) return false;
            return true;
        });
        
        // Ordenar por grupo y nombre (igual que en la tabla)
        filtrados.sort((a, b) => {
            if (a.GRUPO < b.GRUPO) return -1;
            if (a.GRUPO > b.GRUPO) return 1;
            if (a.COMPLETO < b.COMPLETO) return -1;
            if (a.COMPLETO > b.COMPLETO) return 1;
            return 0;
        });
        
        // Crear el contenido CSV
        let csvContent = 'Grupo,Nombre,Calificacion Final\n' + 
                        filtrados.map(e => `"${e.GRUPO || ''}","${e.COMPLETO}",${parseFloat(e.FINAL).toFixed(1)}`).join('\n');
                        
        let blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
        let link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `alumnos_reprobados_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    const apiUrl = 'https://script.google.com/macros/s/AKfycby_mP3ow6lHHhp5KoZ2cp-JvapWOc6bCEDHQqEdko2k9D1Y-ali/exec';
    let estudiantes = [];
    let dataTable;

    // Mostrar loading
    $('.loading').show();

    // Cargar datos de la API
    $.ajax({
        url: apiUrl,
        type: 'GET',
        dataType: 'json',
        success: function(data) {
            estudiantes = data;
            inicializarTabla(data);
            actualizarFiltros(data);
            actualizarRankings(data);
            crearGraficos(data);
            generarSeccionesPorGrupoYEquipo(data);
            actualizarTablaReprobados(data); // Llamar a la nueva función
            analizarActividades(data); // Analizar actividades entregadas
            $('.loading').hide();
        },
        error: function(error) {
            console.error('Error al cargar los datos:', error);
            $('.loading').text('Error al cargar los datos. Por favor, intente de nuevo más tarde.');
        }
    });

    // Calcular estadísticas generales
    function calcularEstadisticas(datos) {
        if (!datos || datos.length === 0) return;
        
        // Ordenar estudiantes por calificación
        const estudiantesOrdenados = [...datos].sort((a, b) => parseFloat(b.FINAL || 0) - parseFloat(a.FINAL || 0));
        
        // Contadores generales
        const totalEstudiantes = datos.length;
        const aprobados = datos.filter(e => e.Edo === 'Aprobado').length;
        const reprobados = totalEstudiantes - aprobados;
        const porcentajeAprobacion = totalEstudiantes > 0 ? (aprobados / totalEstudiantes * 100).toFixed(1) : 0;
        
        // Calcular promedios
        const sumaCalificaciones = datos.reduce((sum, e) => sum + parseFloat(e.FINAL || 0), 0);
        const promedioGeneral = totalEstudiantes > 0 ? (sumaCalificaciones / totalEstudiantes).toFixed(1) : 0;
        
        // Estadísticas por grupo y equipo
        const grupos = {};
        const equipos = {};
        
        datos.forEach(estudiante => {
            // Procesar por grupo
            const grupo = estudiante.GRUPO || 'Sin Grupo';
            if (!grupos[grupo]) {
                grupos[grupo] = {
                    cantidad: 0,
                    aprobados: 0,
                    sumaCalificaciones: 0,
                    estudiantes: []
                };
            }
            grupos[grupo].cantidad++;
            if (estudiante.Edo === 'Aprobado') grupos[grupo].aprobados++;
            grupos[grupo].sumaCalificaciones += parseFloat(estudiante.FINAL || 0);
            grupos[grupo].estudiantes.push(estudiante);
            
            // Procesar por equipo
            const equipo = estudiante.EQUIPO || 'Sin Equipo';
            if (equipo && equipo.trim() !== '') { // Solo si el estudiante tiene equipo
                if (!equipos[equipo]) {
                    equipos[equipo] = {
                        cantidad: 0,
                        sumaCalificaciones: 0,
                        estudiantes: []
                    };
                }
                equipos[equipo].cantidad++;
                equipos[equipo].sumaCalificaciones += parseFloat(estudiante.FINAL || 0);
                equipos[equipo].estudiantes.push(estudiante);
            }
        });
        
        // Calcular promedios por grupo y encontrar mejor/peor grupo
        let mejorGrupo = { nombre: 'Ninguno', promedio: 0 };
        let peorGrupo = { nombre: 'Ninguno', promedio: 10 };
        
        for (const [nombre, datosGrupo] of Object.entries(grupos)) {
            datosGrupo.promedio = datosGrupo.cantidad > 0 ? (datosGrupo.sumaCalificaciones / datosGrupo.cantidad).toFixed(1) : 0;
            datosGrupo.porcentajeAprobacion = datosGrupo.cantidad > 0 ? (datosGrupo.aprobados / datosGrupo.cantidad * 100).toFixed(1) : 0;
            
            if (parseFloat(datosGrupo.promedio) > parseFloat(mejorGrupo.promedio)) {
                mejorGrupo = { nombre, promedio: datosGrupo.promedio };
            }
            if (parseFloat(datosGrupo.promedio) < parseFloat(peorGrupo.promedio)) {
                peorGrupo = { nombre, promedio: datosGrupo.promedio };
            }
        }
        
        // Calcular promedios por equipo y encontrar mejor/peor equipo
        let mejorEquipo = { nombre: 'Ninguno', promedio: 0 };
        let peorEquipo = { nombre: 'Ninguno', promedio: 10 };
        
        for (const [nombre, datosEquipo] of Object.entries(equipos)) {
            datosEquipo.promedio = datosEquipo.cantidad > 0 ? (datosEquipo.sumaCalificaciones / datosEquipo.cantidad).toFixed(1) : 0;
            
            if (parseFloat(datosEquipo.promedio) > parseFloat(mejorEquipo.promedio)) {
                mejorEquipo = { nombre, promedio: datosEquipo.promedio };
            }
            if (parseFloat(datosEquipo.promedio) < parseFloat(peorEquipo.promedio)) {
                peorEquipo = { nombre, promedio: datosEquipo.promedio };
            }
        }
        
        // Obtener mejor y peor estudiante
        const mejorEstudiante = estudiantesOrdenados.length > 0 ? estudiantesOrdenados[0] : null;
        const peorEstudiante = estudiantesOrdenados.length > 0 ? estudiantesOrdenados[estudiantesOrdenados.length - 1] : null;
        
        // Actualizar la interfaz
        $('#totalEstudiantes').text(totalEstudiantes);
        $('#totalAprobados').text(aprobados);
        $('#totalReprobados').text(reprobados);
        $('#porcentajeAprobados').text(`${((aprobados / totalEstudiantes * 100) || 0).toFixed(1)}%`);
        $('#porcentajeReprobados').text(`${((reprobados / totalEstudiantes * 100) || 0).toFixed(1)}%`);
        $('#porcentajeAprobacion').text(`${porcentajeAprobacion}%`);
        $('#promedioGeneral').text(promedioGeneral);
        
        // Actualizar mejor y peor grupo
        $('#mejorGrupo').text(mejorGrupo.nombre);
        $('#promedioMejorGrupo').text(mejorGrupo.promedio);
        $('#peorGrupo').text(peorGrupo.nombre);
        $('#promedioPeorGrupo').text(peorGrupo.promedio);
        
        // Actualizar mejor y peor equipo si existen
        if (mejorEquipo) {
            $('#mejorEquipo').text(mejorEquipo.nombre);
            $('#promedioMejorEquipo').text(mejorEquipo.promedio);
        }
        if (peorEquipo) {
            $('#peorEquipo').text(peorEquipo.nombre);
            $('#promedioPeorEquipo').text(peorEquipo.promedio);
        }
        
        if (mejorEstudiante) {
            $('#mejorEstudiante').text(mejorEstudiante.COMPLETO || mejorEstudiante.NICK || 'Estudiante');
            $('#puntajeMejorEstudiante').text(parseFloat(mejorEstudiante.FINAL || 0).toFixed(1));
        }
        
        if (peorEstudiante) {
            $('#peorEstudiante').text(peorEstudiante.COMPLETO || peorEstudiante.NICK || 'Estudiante');
            $('#puntajePeorEstudiante').text(parseFloat(peorEstudiante.FINAL || 0).toFixed(1));
        }
        
        // Actualizar tarjetas de equipos
        $('#mejorEquipo').text(mejorEquipo.nombre);
        $('#promedioMejorEquipo').text(mejorEquipo.promedio);
        
        $('#peorEquipo').text(peorEquipo.nombre);
        $('#promedioPeorEquipo').text(peorEquipo.promedio);
        
        return {
            totalEstudiantes,
            aprobados,
            reprobados,
            porcentajeAprobacion,
            promedioGeneral,
            mejorGrupo,
            peorGrupo,
            mejorEquipo,
            peorEquipo,
            mejorEstudiante,
            peorEstudiante,
            grupos,
            equipos
        };
    }

    // Inicializar DataTable
    function inicializarTabla(datos) {
        // Calcular estadísticas primero
        const estadisticas = calcularEstadisticas(datos);
        
        // Inicializar DataTable
        dataTable = $('#estudiantesTable').DataTable({
            data: datos,
            columns: [
                { data: 'ID' },
                { data: 'COMPLETO' },
                { data: 'NICK' },
                { data: 'GRUPO' },
                { data: 'EQUIPO' },
                { data: 'TOTALASIS' },
                { 
                    data: 'FINAL',
                    render: function(data) {
                        const calificacion = parseFloat(data) || 0;
                        let colorClase = '';
                        let texto = calificacion.toFixed(1);
                        
                        // Determinar el color del semáforo
                        if (calificacion < 6) {
                            colorClase = 'semaforo-rojo';
                        } else if (calificacion < 8) {
                            colorClase = 'semaforo-amarillo';
                        } else {
                            colorClase = 'semaforo-verde';
                        }
                        
                        return `
                            <div class="semaforo-calificacion">
                                <span class="punto-semaforo ${colorClase}" title="${texto}"></span>
                                <span class="texto-semaforo">${texto}</span>
                            </div>
                        `;
                    }
                },
                { 
                    data: 'Edo',
                    render: function(data, type, row) {
                        const calificacion = parseFloat(row.FINAL || 0);
                        let clase = '';
                        let texto = data;
                        
                        // Determinar el color del estado (Aprobado/Reprobado)
                        if (calificacion < 6) {
                            clase = 'badge bg-danger';
                            texto = 'Reprobado';
                        } else {
                            clase = 'badge bg-success';
                            texto = 'Aprobado';
                        }
                        
                        return `<span class="${clase}">${texto}</span>`;
                    }
                }
            ],
            language: {
                url: '//cdn.datatables.net/plug-ins/1.11.5/i18n/es-ES.json'
            },
            pageLength: 10,
            dom: 'Bfrtip',
            buttons: [
                'copy', 'csv', 'excel', 'pdf', 'print'
            ],
            drawCallback: function() {
                // Actualizar estadísticas cuando se filtra la tabla
                if (dataTable) {
                    const filteredData = dataTable.rows({ search: 'applied' }).data().toArray();
                    calcularEstadisticas(filteredData);
                }
            }
        });
        
        return estadisticas;
    }

    // Actualizar opciones de los filtros
    function actualizarFiltros(datos) {
        const grupos = [...new Set(datos.map(item => item.GRUPO))];
        
        // Organizar equipos por grupo
        const equiposPorGrupo = {};
        const todosLosEquipos = new Set();
        
        datos.forEach(est => {
            const grupo = est.GRUPO;
            const equipo = est.EQUIPO;
            
            if (equipo) {
                todosLosEquipos.add(equipo);
                
                if (grupo) {
                    if (!equiposPorGrupo[grupo]) {
                        equiposPorGrupo[grupo] = new Set();
                    }
                    equiposPorGrupo[grupo].add(equipo);
                }
            }
        });
        
        // Guardar el grupo y equipo actualmente seleccionados
        const grupoSeleccionado = $('#grupoFilter').val();
        const equipoSeleccionado = $('#equipoFilter').val();
        
        // Actualizar opciones del filtro de grupos
        const $grupoFilter = $('#grupoFilter');
        $grupoFilter.empty().append('<option value="">Todos los grupos</option>');
        
        grupos.sort().forEach(grupo => {
            if (grupo) $grupoFilter.append(`<option value="${grupo}">${grupo}</option>`);
        });
        
        // Restaurar el grupo seleccionado si aún existe
        if (grupoSeleccionado && grupos.includes(grupoSeleccionado)) {
            $grupoFilter.val(grupoSeleccionado);
        }
        
        // Actualizar opciones del filtro de equipos
        actualizarFiltroEquipos(grupoSeleccionado, equiposPorGrupo, [...todosLosEquipos], equipoSeleccionado);
    }

    // Aplicar filtros
    function aplicarFiltros() {
        const grupo = $('#grupoFilter').val();
        const equipo = $('#equipoFilter').val();
        const estado = $('#estadoFilter').val();
        
        dataTable.column(3).search(grupo, false, true);
        dataTable.column(4).search(equipo, false, true);
        dataTable.column(7).search(estado, false, true);
        dataTable.draw();
    }

    // Función para generar las secciones de grupos y equipos
    function generarSeccionesPorGrupoYEquipo(datos) {
        const grupos = {};
        
        // Organizar datos por grupo y equipo
        datos.forEach(est => {
            const grupo = est.GRUPO || 'Sin Grupo';
            const equipo = est.EQUIPO || 'Sin Equipo';
            
            if (!grupos[grupo]) {
                grupos[grupo] = {
                    estudiantes: [],
                    equipos: {}
                };
            }
            
            if (!grupos[grupo].equipos[equipo]) {
                grupos[grupo].equipos[equipo] = [];
            }
            
            grupos[grupo].estudiantes.push(est);
            grupos[grupo].equipos[equipo].push(est);
        });
        
        // Limpiar contenedores
        $('#gruposContainer').empty();
        grupoCharts = [];
        equipoCharts = [];
        
        // Generar secciones para cada grupo
        Object.entries(grupos).sort().forEach(([nombreGrupo, datosGrupo]) => {
            const grupoTemplate = document.getElementById('grupoTemplate').content.cloneNode(true);
            const $grupoSection = $(grupoTemplate);
            
            // Configurar datos del grupo
            $grupoSection.find('.grupo-nombre').text(nombreGrupo);
            
            // Calcular estadísticas del grupo
            const aprobados = datosGrupo.estudiantes.filter(e => parseFloat(e.FINAL) >= 6).length;
            const total = datosGrupo.estudiantes.length;
            const promedio = total > 0 ? 
                datosGrupo.estudiantes.reduce((sum, e) => sum + parseFloat(e.FINAL), 0) / total : 0;
            
            // Mejor estudiante del grupo
            const mejorEstudiante = [...datosGrupo.estudiantes]
                .sort((a, b) => parseFloat(b.FINAL) - parseFloat(a.FINAL))[0];
            
            // Actualizar tarjetas de estadísticas
            if (mejorEstudiante) {
                $grupoSection.find('.mejor-estudiante').text(mejorEstudiante.COMPLETO);
                $grupoSection.find('.mejor-calificacion').text(parseFloat(mejorEstudiante.FINAL).toFixed(1));
            }
            
            $grupoSection.find('.aprobados').text(`${aprobados} (${total > 0 ? Math.round((aprobados/total)*100) : 0}%)`);
            $grupoSection.find('.reprobados').text(`${total - aprobados} (${total > 0 ? Math.round(((total - aprobados)/total)*100) : 0}%)`);
            $grupoSection.find('.promedio').text(promedio.toFixed(1));
            
            // Top 3 del grupo
            const top3 = [...datosGrupo.estudiantes]
                .sort((a, b) => parseFloat(b.FINAL) - parseFloat(a.FINAL))
                .slice(0, 3);
                
            const $top3Body = $grupoSection.find('.top3-body');
            $top3Body.empty();
            
            top3.forEach((est, index) => {
                $top3Body.append(`
                    <tr>
                        <td>${index + 1}</td>
                        <td>${est.COMPLETO}</td>
                        <td>${est.EQUIPO || '-'}</td>
                        <td>${parseFloat(est.FINAL).toFixed(1)}</td>
                    </tr>
                `);
            });
            
            // Generar gráfico de distribución
            const ctx = $grupoSection.find('.grupo-chart')[0].getContext('2d');
            const chart = new Chart(ctx, crearConfiguracionGraficoAprobacion(datosGrupo.estudiantes, `Distribución Grupo ${nombreGrupo}`));
            grupoCharts.push(chart);
            
            // Generar secciones para cada equipo del grupo
            const $equiposContainer = $grupoSection.find('.equipos-container');
            Object.entries(datosGrupo.equipos).sort().forEach(([nombreEquipo, estudiantesEquipo]) => {
                generarSeccionEquipo($equiposContainer, nombreEquipo, estudiantesEquipo);
            });
            
            // Agregar la sección del grupo al contenedor
            $('#gruposContainer').append($grupoSection);
        });
    }
    
    // Función para generar la sección de un equipo
    function generarSeccionEquipo($container, nombreEquipo, estudiantes) {
        const equipoTemplate = document.getElementById('equipoTemplate').content.cloneNode(true);
        const $equipoSection = $(equipoTemplate);
        
        // Configurar datos del equipo
        $equipoSection.find('.equipo-nombre').text(nombreEquipo);
        
        // Calcular estadísticas del equipo
        const total = estudiantes.length;
        const aprobados = estudiantes.filter(e => parseFloat(e.FINAL) >= 6).length;
        const promedio = total > 0 ? 
            estudiantes.reduce((sum, e) => sum + parseFloat(e.FINAL), 0) / total : 0;
        
        // Mejor estudiante del equipo
        const mejorEstudiante = [...estudiantes]
            .sort((a, b) => parseFloat(b.FINAL) - parseFloat(a.FINAL))[0];
        
        if (mejorEstudiante) {
            $equipoSection.find('.mejor-estudiante').text(mejorEstudiante.COMPLETO);
            $equipoSection.find('.mejor-calificacion').text(parseFloat(mejorEstudiante.FINAL).toFixed(1));
        }
        
        $equipoSection.find('.total-miembros').text(total);
        $equipoSection.find('.promedio').text(promedio.toFixed(1));
        
        // Lista de miembros del equipo
        const $miembrosBody = $equipoSection.find('.equipo-miembros');
        estudiantes.forEach(est => {
            const estado = parseFloat(est.FINAL) >= 6 ? 
                '<span class="badge bg-success">Aprobado</span>' : 
                '<span class="badge bg-danger">Reprobado</span>';
                
            $miembrosBody.append(`
                <tr>
                    <td>${est.COMPLETO}</td>
                    <td>${parseFloat(est.FINAL).toFixed(1)}</td>
                    <td>${estado}</td>
                </tr>
            `);
        });
        
        // Generar gráfico de distribución
        const ctx = $equipoSection.find('.equipo-chart')[0].getContext('2d');
        const chart = new Chart(ctx, crearConfiguracionGraficoAprobacion(estudiantes, `Equipo ${nombreEquipo}`));
        equipoCharts.push(chart);
        
        // Agregar la sección del equipo al contenedor
        $container.append($equipoSection);
    }
    
    // Función para crear la configuración del gráfico de aprobación
    function crearConfiguracionGraficoAprobacion(estudiantes, titulo) {
        const aprobados = estudiantes.filter(e => parseFloat(e.FINAL) >= 6).length;
        const total = estudiantes.length;
        const porcentajeAprobados = total > 0 ? (aprobados / total * 100).toFixed(1) : 0;
        
        return {
            type: 'doughnut',
            data: {
                labels: ['Aprobados', 'Reprobados'],
                datasets: [{
                    data: [aprobados, total - aprobados],
                    backgroundColor: ['#28a745', '#dc3545'],
                    borderColor: ['#28a745', '#dc3545'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    title: {
                        display: true,
                        text: `${titulo} (${porcentajeAprobados}% aprob.)`,
                        font: { size: 12 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '70%',
                radius: '90%'
            }
        };
    }
    


    // Función para cargar y mostrar los datos
    function cargarDatos() {
        $('.loading').show();
        
        // Obtener los valores actuales de los filtros
        const grupoSeleccionado = $('#grupoFilter').val();
        const equipoSeleccionado = $('#equipoFilter').val();
        const estadoSeleccionado = $('#estadoFilter').val();
        
        // Filtrar los datos
        let datosFiltrados = [...estudiantes];
        
        if (grupoSeleccionado) {
            datosFiltrados = datosFiltrados.filter(est => est.GRUPO === grupoSeleccionado);
        }
        
        if (equipoSeleccionado) {
            datosFiltrados = datosFiltrados.filter(est => est.EQUIPO === equipoSeleccionado);
        }
        
        if (estadoSeleccionado) {
            if (estadoSeleccionado === 'Aprobado') {
                datosFiltrados = datosFiltrados.filter(est => parseFloat(est.FINAL) >= 6);
            } else if (estadoSeleccionado === 'Reprobado') {
                datosFiltrados = datosFiltrados.filter(est => parseFloat(est.FINAL) < 6);
            }
        }
        
        // Actualizar la tabla con los datos filtrados
        if (dataTable) {
            dataTable.clear().rows.add(datosFiltrados).draw();
        } else {
            inicializarTabla(datosFiltrados);
        }
        
        // Actualizar estadísticas y gráficos con los datos filtrados
        calcularEstadisticas(datosFiltrados);
        actualizarRankings(datosFiltrados);
        actualizarTopEstudiantes(datosFiltrados);
        crearGraficos(datosFiltrados);
        generarSeccionesPorGrupoYEquipo(datosFiltrados);
        
        // Actualizar la tabla de reprobados con los datos filtrados
        actualizarTablaReprobados(datosFiltrados);
        
        $('.loading').hide();
    }
    
    // Función para actualizar el filtro de equipos basado en el grupo seleccionado
    function actualizarFiltroEquipos(grupoSeleccionado, equiposPorGrupo, todosLosEquipos, equipoSeleccionado) {
        const $equipoFilter = $('#equipoFilter');
        
        // Guardar el valor actual del filtro de equipos
        const valorActual = equipoSeleccionado || $equipoFilter.val();
        
        // Limpiar el select de equipos
        $equipoFilter.empty().append('<option value="">Todos los equipos</option>');
        
        // Si hay un grupo seleccionado, mostrar solo los equipos de ese grupo
        if (grupoSeleccionado && equiposPorGrupo[grupoSeleccionado]) {
            const equiposDelGrupo = Array.from(equiposPorGrupo[grupoSeleccionado]).sort();
            equiposDelGrupo.forEach(equipo => {
                $equipoFilter.append(`<option value="${equipo}">${equipo}</option>`);
            });
        } else {
            // Si no hay grupo seleccionado, mostrar todos los equipos
            const equiposOrdenados = [...todosLosEquipos].sort();
            equiposOrdenados.forEach(equipo => {
                $equipoFilter.append(`<option value="${equipo}">${equipo}</option>`);
            });
        }
        
        // Restaurar la selección anterior si aún es válida
        if (valorActual && $equipoFilter.find(`option[value="${valorActual}"]`).length > 0) {
            $equipoFilter.val(valorActual);
        } else {
            $equipoFilter.val('');
        }
    }
    
    // Función para analizar las actividades entregadas
    function analizarActividades(datos) {
        // Verificar si hay datos
        if (!datos || datos.length === 0) return;
        
        // Definir las actividades específicas a analizar
        const actividadesEspecificas = ['ACTIVIDAD4', 'ACTIVIDAD5', 'ACTIVIDAD6'];
        const cuestionariosEspecificos = ['CUESTIONARIO4', 'CUESTIONARIO5', 'CUESTIONARIO6'];
        const proyectoBitacora = ['PROYECTO', 'BITACORA'];
        const puntosExtra = ['PUNTOEX'];
        
        // Almacenar estadísticas de las actividades y cuestionarios
        const estadisticasActividades = [];
        const estadisticasCuestionarios = [];
        const estadisticasProyectoBitacora = {};
        const estadisticasPuntosExtra = {};
        
        // Analizar cada actividad específica
        actividadesEspecificas.forEach(actividad => {
            // Contar cuántos estudiantes entregaron esta actividad
            const entregadas = datos.filter(est => {
                const valor = est[actividad];
                // Considerar como entregada si el valor es mayor a 0
                return valor !== null && valor !== undefined && parseFloat(valor) > 0;
            }).length;
            
            // Calcular porcentaje de entregas
            const porcentaje = (entregadas / datos.length) * 100;
            
            // Formatear nombre para mostrar
            const nombreMostrar = `Actividad ${actividad.replace('ACTIVIDAD', '')}`;
            
            // Añadir a las estadísticas
            estadisticasActividades.push({
                nombre: nombreMostrar,
                actividad: actividad,
                entregadas: entregadas,
                total: datos.length,
                porcentaje: porcentaje.toFixed(1)
            });
        });
        
        // Analizar cada cuestionario específico
        cuestionariosEspecificos.forEach(cuestionario => {
            // Contar cuántos estudiantes entregaron este cuestionario
            const entregadas = datos.filter(est => {
                const valor = est[cuestionario];
                // Considerar como entregado si el valor es mayor a 0
                return valor !== null && valor !== undefined && parseFloat(valor) > 0;
            }).length;
            
            // Calcular porcentaje de entregas
            const porcentaje = (entregadas / datos.length) * 100;
            
            // Formatear nombre para mostrar
            const nombreMostrar = `Cuestionario ${cuestionario.replace('CUESTIONARIO', '')}`;
            
            // Añadir a las estadísticas
            estadisticasCuestionarios.push({
                nombre: nombreMostrar,
                cuestionario: cuestionario,
                entregadas: entregadas,
                total: datos.length,
                porcentaje: porcentaje.toFixed(1)
            });
        });
        
        // Analizar PROYECTO y BITACORA
        proyectoBitacora.forEach(item => {
            // Contar cuántos estudiantes entregaron este ítem
            const entregados = datos.filter(est => {
                const valor = est[item];
                // Considerar como entregado si el valor es mayor a 0
                return valor !== null && valor !== undefined && parseFloat(valor) > 0;
            });
            
            // Calcular porcentaje de entregas
            const porcentaje = (entregados.length / datos.length) * 100;
            
            // Calcular promedio de calificación (solo de los que entregaron)
            let sumaCalificaciones = 0;
            entregados.forEach(est => {
                sumaCalificaciones += parseFloat(est[item] || 0);
            });
            const promedio = entregados.length > 0 ? sumaCalificaciones / entregados.length : 0;
            
            // Guardar estadísticas
            estadisticasProyectoBitacora[item] = {
                entregados: entregados.length,
                total: datos.length,
                porcentaje: porcentaje.toFixed(1),
                promedio: promedio.toFixed(1)
            };
        });
        
        // Analizar PUNTOEX
        puntosExtra.forEach(item => {
            // Contar cuántos estudiantes tienen puntos extra
            const entregados = datos.filter(est => {
                const valor = est[item];
                // Considerar como entregado si el valor es mayor a 0
                return valor !== null && valor !== undefined && parseFloat(valor) > 0;
            });
            
            // Calcular porcentaje de entregas
            const porcentaje = (entregados.length / datos.length) * 100;
            
            // Guardar estadísticas
            estadisticasPuntosExtra[item] = {
                entregados: entregados.length,
                total: datos.length,
                porcentaje: porcentaje.toFixed(1)
            };
        });
        
        // Ordenar actividades por porcentaje de entregas (de mayor a menor)
        estadisticasActividades.sort((a, b) => parseFloat(b.porcentaje) - parseFloat(a.porcentaje));
        
        // Ordenar cuestionarios por porcentaje de entregas (de mayor a menor)
        estadisticasCuestionarios.sort((a, b) => parseFloat(b.porcentaje) - parseFloat(a.porcentaje));
        
        // Obtener la actividad más entregada y la menos entregada
        const actividadMasEntregada = estadisticasActividades.length > 0 ? estadisticasActividades[0] : null;
        const actividadMenosEntregada = estadisticasActividades.length > 0 ? 
                                       estadisticasActividades[estadisticasActividades.length - 1] : null;
        
        // Obtener el cuestionario más entregado y el menos entregado
        const cuestionarioMasEntregado = estadisticasCuestionarios.length > 0 ? estadisticasCuestionarios[0] : null;
        const cuestionarioMenosEntregado = estadisticasCuestionarios.length > 0 ? 
                                         estadisticasCuestionarios[estadisticasCuestionarios.length - 1] : null;
        
        // Actualizar la interfaz para actividades
        if (actividadMasEntregada) {
            $('#actividadMasEntregada').text(actividadMasEntregada.nombre);
            $('#porcentajeMasEntregada').text(`${actividadMasEntregada.porcentaje}% (${actividadMasEntregada.entregadas}/${actividadMasEntregada.total})`);
        }
        
        if (actividadMenosEntregada) {
            $('#actividadMenosEntregada').text(actividadMenosEntregada.nombre);
            $('#porcentajeMenosEntregada').text(`${actividadMenosEntregada.porcentaje}% (${actividadMenosEntregada.entregadas}/${actividadMenosEntregada.total})`);
        }
        
        // Actualizar la interfaz para cuestionarios
        if (cuestionarioMasEntregado) {
            $('#cuestionarioMasEntregado').text(cuestionarioMasEntregado.nombre);
            $('#porcentajeCuestionarioMas').text(`${cuestionarioMasEntregado.porcentaje}% (${cuestionarioMasEntregado.entregadas}/${cuestionarioMasEntregado.total})`);
        }
        
        if (cuestionarioMenosEntregado) {
            $('#cuestionarioMenosEntregado').text(cuestionarioMenosEntregado.nombre);
            $('#porcentajeCuestionarioMenos').text(`${cuestionarioMenosEntregado.porcentaje}% (${cuestionarioMenosEntregado.entregadas}/${cuestionarioMenosEntregado.total})`);
        }
        
        // Crear o actualizar la gráfica de porcentaje de entrega del proyecto
        if (estadisticasProyectoBitacora['PROYECTO']) {
            const proyectoStats = estadisticasProyectoBitacora['PROYECTO'];
            $('#proyectoEntregados').text(proyectoStats.entregados);
            $('#proyectoPendientes').text(proyectoStats.total - proyectoStats.entregados);
            $('#proyectoPromedio').text(proyectoStats.promedio);
            $('#porcentajeEntregaProyecto').text(`${proyectoStats.porcentaje}%`);
            
            // Crear o actualizar la gráfica de porcentaje de entrega del proyecto
            crearGraficaProyectoEntrega(proyectoStats);
            
            // Crear o actualizar la gráfica de distribución de calificaciones del proyecto
            crearGraficaCalificacionesProyecto(datos);
        }
        
        // Actualizar la interfaz para BITACORA
        if (estadisticasProyectoBitacora['BITACORA']) {
            const bitacoraStats = estadisticasProyectoBitacora['BITACORA'];
            $('#bitacoraEntregados').text(`${bitacoraStats.entregados}/${bitacoraStats.total}`);
            $('#bitacoraPendientes').text(`${bitacoraStats.total - bitacoraStats.entregados}/${bitacoraStats.total}`);
            $('#bitacoraPromedio').text(bitacoraStats.promedio);
            $('#porcentajeEntregaBitacora').text(`${bitacoraStats.porcentaje}%`);
            
            // Crear o actualizar la gráfica de porcentaje de entrega de la bitácora
            crearGraficaBitacoraEntrega(bitacoraStats);
            
            // Crear o actualizar la gráfica de distribución de calificaciones de la bitácora
            crearGraficaCalificacionesBitacora(datos);
        }
        
        // Actualizar la interfaz para PUNTOEX
        if (estadisticasPuntosExtra['PUNTOEX']) {
            const puntosExtraStats = estadisticasPuntosExtra['PUNTOEX'];
            $('#puntosExtraEntregados').text(`${puntosExtraStats.entregados}/${puntosExtraStats.total}`);
            $('#puntosExtraPorcentaje').text(`${puntosExtraStats.porcentaje}%`);
            
            // Crear o actualizar la gráfica de puntos extra
            crearGraficaPuntosExtra(datos, puntosExtraStats);
        }
        
        // Crear o actualizar las gráficas para actividades y cuestionarios
        crearGraficaActividades(datos);
        crearGraficaEntregasActividades(datos);
        crearGraficaRadarCuestionarios(datos);
        crearGraficaEntregasCuestionarios(datos);
        
        return {
            actividadMasEntregada,
            actividadMenosEntregada,
            cuestionarioMasEntregado,
            cuestionarioMenosEntregado,
            proyectoBitacora: estadisticasProyectoBitacora,
            todasLasActividades: estadisticasActividades,
            todosLosCuestionarios: estadisticasCuestionarios
        };
    }
    
    // Función para crear o actualizar la gráfica de actividades (radar, barras o dispersión)
    function crearGraficaActividades(datos) {
        // Verificar si hay datos
        if (!datos || datos.length === 0) return;
        
        // Destruir gráfica existente si ya existe
        if (actividadesChart) {
            actividadesChart.destroy();
        }
        
        // Definir las actividades a mostrar en la gráfica
        const actividades = ['ACTIVIDAD4', 'ACTIVIDAD5', 'ACTIVIDAD6'];
        
        // Preparar datos para la gráfica
        const labels = actividades.map(act => `Actividad ${act.replace('ACTIVIDAD', '')}`);
        
        // Calcular porcentajes de entrega para cada actividad
        const porcentajesEntrega = actividades.map(actividad => {
            const entregadas = datos.filter(est => {
                const valor = est[actividad];
                return valor !== null && valor !== undefined && parseFloat(valor) > 0;
            }).length;
            
            return (entregadas / datos.length) * 100;
        });
        
        // Calcular promedios de calificación para cada actividad
        const promediosCalificacion = actividades.map(actividad => {
            const estudiantesConEntrega = datos.filter(est => {
                const valor = est[actividad];
                return valor !== null && valor !== undefined && parseFloat(valor) > 0;
            });
            
            if (estudiantesConEntrega.length === 0) return 0;
            
            const sumaCalificaciones = estudiantesConEntrega.reduce((sum, est) => {
                return sum + parseFloat(est[actividad] || 0);
            }, 0);
            
            return sumaCalificaciones / estudiantesConEntrega.length;
        });
        
        // Crear configuración de la gráfica según el tipo seleccionado
        const ctx = document.getElementById('actividadesChart').getContext('2d');
        
        // Configuración común para todos los tipos de gráficas
        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.raw.toFixed(1);
                            return `${label}: ${value}`;
                        }
                    }
                }
            }
        };
        
        // Configuración específica según el tipo de gráfica
        let chartConfig;
        
        if (tipoGraficaActividades === 'radar') {
            // Convertir porcentajes a escala 1-10 para el radar
            const porcentajesEscalados = porcentajesEntrega.map(p => (p / 10) + 1);
            
            chartConfig = {
                type: 'radar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Porcentaje de Entregas',
                            data: porcentajesEscalados,
                            backgroundColor: 'rgba(54, 162, 235, 0.2)',
                            borderColor: 'rgba(54, 162, 235, 1)',
                            borderWidth: 2,
                            pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                            pointBorderColor: '#fff',
                            pointHoverBackgroundColor: '#fff',
                            pointHoverBorderColor: 'rgba(54, 162, 235, 1)'
                        },
                        {
                            label: 'Promedio de Calificación',
                            data: promediosCalificacion,
                            backgroundColor: 'rgba(255, 99, 132, 0.2)',
                            borderColor: 'rgba(255, 99, 132, 1)',
                            borderWidth: 2,
                            pointBackgroundColor: 'rgba(255, 99, 132, 1)',
                            pointBorderColor: '#fff',
                            pointHoverBackgroundColor: '#fff',
                            pointHoverBorderColor: 'rgba(255, 99, 132, 1)'
                        }
                    ]
                },
                options: {
                    ...commonOptions,
                    scales: {
                        r: {
                            angleLines: {
                                display: true
                            },
                            suggestedMin: 1,
                            suggestedMax: 10,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    }
                }
            };
        } else if (tipoGraficaActividades === 'barras') {
            chartConfig = {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Porcentaje de Entregas',
                            data: porcentajesEntrega,
                            backgroundColor: 'rgba(54, 162, 235, 0.7)',
                            borderColor: 'rgba(54, 162, 235, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Promedio de Calificación (x10)',
                            data: promediosCalificacion.map(p => p * 10), // Multiplicar por 10 para mejor visualización
                            backgroundColor: 'rgba(255, 99, 132, 0.7)',
                            borderColor: 'rgba(255, 99, 132, 1)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    ...commonOptions,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            title: {
                                display: true,
                                text: 'Porcentaje / Calificación (x10)'
                            }
                        }
                    }
                }
            };
        } else if (tipoGraficaActividades === 'dispersion') {
            // Preparar datos para gráfico de dispersión
            const scatterData = actividades.map((act, index) => {
                return {
                    x: porcentajesEntrega[index],
                    y: promediosCalificacion[index] * 10, // Multiplicar por 10 para mejor visualización
                    label: labels[index]
                };
            });
            
            chartConfig = {
                type: 'scatter',
                data: {
                    datasets: [
                        {
                            label: 'Relación Entregas vs Calificación',
                            data: scatterData,
                            backgroundColor: 'rgba(75, 192, 192, 0.7)',
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 1,
                            pointRadius: 8,
                            pointHoverRadius: 10
                        }
                    ]
                },
                options: {
                    ...commonOptions,
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Porcentaje de Entregas'
                            },
                            min: 0,
                            max: 100
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Calificación Promedio (x10)'
                            },
                            min: 0,
                            max: 100
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const point = context.raw;
                                    return `${point.label}: Entregas ${point.x.toFixed(1)}%, Calificación ${(point.y/10).toFixed(1)}`;
                                }
                            }
                        }
                    }
                }
            };
        }
        
        // Crear la gráfica
        actividadesChart = new Chart(ctx, chartConfig);
    }
    
    // Función para cambiar el tipo de gráfica de actividades
    function cambiarTipoGraficaActividades(tipo) {
        tipoGraficaActividades = tipo;
        if (datosEstudiantes && datosEstudiantes.length > 0) {
            crearGraficaActividades(datosEstudiantes);
        }
    }
    
    // Función para crear la gráfica de barras de entregas de actividades
    function crearGraficaEntregasActividades(datos) {
        // Verificar si hay datos
        if (!datos || datos.length === 0) return;
        
        // Destruir gráfica existente si ya existe
        if (entregasActividadesChart) {
            entregasActividadesChart.destroy();
        }
        
        // Definir las actividades a mostrar en la gráfica
        const actividades = ['ACTIVIDAD4', 'ACTIVIDAD5', 'ACTIVIDAD6'];
        const labels = actividades.map(act => act.replace('ACTIVIDAD', 'Act '));
        
        // Calcular cantidad de entregados y pendientes para cada actividad
        const cantidadEntregados = actividades.map(actividad => {
            return datos.filter(est => {
                const valor = est[actividad];
                return valor !== null && valor !== undefined && parseFloat(valor) > 0;
            }).length;
        });
        
        const cantidadPendientes = actividades.map(actividad => {
            return datos.length - datos.filter(est => {
                const valor = est[actividad];
                return valor !== null && valor !== undefined && parseFloat(valor) > 0;
            }).length;
        });
        
        // Crear gráfica de barras para cantidad de entregados
        const ctxBar = document.getElementById('entregasActividadesChart').getContext('2d');
        
        // Configuración para gráfica de barras
        const barConfig = {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Entregados',
                        data: cantidadEntregados,
                        backgroundColor: 'rgba(75, 192, 192, 0.7)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1,
                        borderRadius: 4
                    },
                    {
                        label: 'Pendientes',
                        data: cantidadPendientes,
                        backgroundColor: 'rgba(255, 99, 132, 0.7)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1,
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.raw;
                                const total = datos.length;
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Cantidad de estudiantes'
                        },
                        ticks: {
                            precision: 0 // Solo mostrar enteros
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Actividades'
                        }
                    }
                }
            }
        };
        
        // Crear la gráfica de barras
        entregasActividadesChart = new Chart(ctxBar, barConfig);
    }
    
    // Función para crear la gráfica de barras de entregas de cuestionarios
    function crearGraficaEntregasCuestionarios(datos) {
        // Verificar si hay datos
        if (!datos || datos.length === 0) return;
        
        // Destruir gráfica existente si ya existe
        if (entregasCuestionariosChart) {
            entregasCuestionariosChart.destroy();
        }
        
        // Definir los cuestionarios a mostrar en la gráfica
        const cuestionarios = ['CUESTIONARIO4', 'CUESTIONARIO5', 'CUESTIONARIO6'];
        const labels = cuestionarios.map(cuest => cuest.replace('CUESTIONARIO', 'Cuest '));
        
        // Calcular cantidad de entregados y pendientes para cada cuestionario
        const cantidadEntregados = cuestionarios.map(cuestionario => {
            return datos.filter(est => {
                const valor = est[cuestionario];
                return valor !== null && valor !== undefined && parseFloat(valor) > 0;
            }).length;
        });
        
        const cantidadPendientes = cuestionarios.map(cuestionario => {
            return datos.length - datos.filter(est => {
                const valor = est[cuestionario];
                return valor !== null && valor !== undefined && parseFloat(valor) > 0;
            }).length;
        });
        
        // Crear gráfica de barras para cantidad de entregados
        const ctxBar = document.getElementById('entregasCuestionariosChart').getContext('2d');
        
        // Configuración para gráfica de barras
        const barConfig = {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Entregados',
                        data: cantidadEntregados,
                        backgroundColor: 'rgba(54, 162, 235, 0.7)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1,
                        borderRadius: 4
                    },
                    {
                        label: 'Pendientes',
                        data: cantidadPendientes,
                        backgroundColor: 'rgba(255, 99, 132, 0.7)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1,
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.raw;
                                const total = datos.length;
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Cantidad de estudiantes'
                        },
                        ticks: {
                            precision: 0 // Solo mostrar enteros
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Cuestionarios'
                        }
                    }
                }
            }
        };
        
        // Crear la gráfica de barras
        entregasCuestionariosChart = new Chart(ctxBar, barConfig);
    }
    
    // Función para crear o actualizar la gráfica de radar de cuestionarios
    function crearGraficaRadarCuestionarios(datos) {
        // Verificar si hay datos
        if (!datos || datos.length === 0) return;
        
        // Destruir gráfica existente si ya existe
        if (cuestionariosRadarChart) {
            cuestionariosRadarChart.destroy();
        }
        
        // Definir los cuestionarios a mostrar en la gráfica
        const cuestionarios = ['CUESTIONARIO4', 'CUESTIONARIO5', 'CUESTIONARIO6'];
        
        // Preparar datos para la gráfica
        const labels = cuestionarios.map(cuest => `Cuestionario ${cuest.replace('CUESTIONARIO', '')}`);
        
        // Calcular porcentajes de entrega para cada cuestionario (convertidos a escala 1-10)
        const porcentajesEntrega = cuestionarios.map(cuestionario => {
            const entregadas = datos.filter(est => {
                const valor = est[cuestionario];
                return valor !== null && valor !== undefined && parseFloat(valor) > 0;
            }).length;
            
            // Convertir porcentaje (0-100) a escala 1-10
            const porcentaje = (entregadas / datos.length) * 100;
            return (porcentaje / 10) + 1; // Convertir a escala 1-10 (1 como mínimo)
        });
        
        // Calcular promedios de calificación para cada cuestionario
        const promediosCalificacion = cuestionarios.map(cuestionario => {
            const estudiantesConEntrega = datos.filter(est => {
                const valor = est[cuestionario];
                return valor !== null && valor !== undefined && parseFloat(valor) > 0;
            });
            
            if (estudiantesConEntrega.length === 0) return 0;
            
            const sumaCalificaciones = estudiantesConEntrega.reduce((sum, est) => {
                return sum + parseFloat(est[cuestionario] || 0);
            }, 0);
            
            return sumaCalificaciones / estudiantesConEntrega.length;
        });
        
        // Crear configuración de la gráfica
        const ctx = document.getElementById('cuestionariosRadarChart').getContext('2d');
        cuestionariosRadarChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Porcentaje de Entregas',
                        data: porcentajesEntrega,
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 2,
                        pointBackgroundColor: 'rgba(75, 192, 192, 1)',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: 'rgba(75, 192, 192, 1)'
                    },
                    {
                        label: 'Promedio de Calificación',
                        data: promediosCalificacion,
                        backgroundColor: 'rgba(255, 159, 64, 0.2)',
                        borderColor: 'rgba(255, 159, 64, 1)',
                        borderWidth: 2,
                        pointBackgroundColor: 'rgba(255, 159, 64, 1)',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: 'rgba(255, 159, 64, 1)'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: {
                            display: true
                        },
                        suggestedMin: 1,
                        suggestedMax: 10,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.raw.toFixed(1);
                                return `${label}: ${value}`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Función para crear la gráfica de distribución de calificaciones del proyecto
    function crearGraficaCalificacionesProyecto(datos) {
        // Verificar si hay datos
        if (!datos || datos.length === 0) return;
        
        // Destruir gráfica existente si ya existe
        if (proyectoCalificacionesChart) {
            proyectoCalificacionesChart.destroy();
        }
        
        // Filtrar estudiantes que han entregado el proyecto
        const estudiantesConProyecto = datos.filter(est => {
            const valor = est['PROYECTO'];
            return valor !== null && valor !== undefined && parseFloat(valor) > 0;
        });
        
        // Si no hay entregas, no mostrar gráfica
        if (estudiantesConProyecto.length === 0) return;
        
        // Definir rangos de calificación
        const rangos = ['0-6', '6-7', '7-8', '8-9', '9-10'];
        
        // Contar estudiantes en cada rango
        const conteoRangos = [
            estudiantesConProyecto.filter(est => parseFloat(est['PROYECTO']) >= 0 && parseFloat(est['PROYECTO']) < 6).length,
            estudiantesConProyecto.filter(est => parseFloat(est['PROYECTO']) >= 6 && parseFloat(est['PROYECTO']) < 7).length,
            estudiantesConProyecto.filter(est => parseFloat(est['PROYECTO']) >= 7 && parseFloat(est['PROYECTO']) < 8).length,
            estudiantesConProyecto.filter(est => parseFloat(est['PROYECTO']) >= 8 && parseFloat(est['PROYECTO']) < 9).length,
            estudiantesConProyecto.filter(est => parseFloat(est['PROYECTO']) >= 9 && parseFloat(est['PROYECTO']) <= 10).length
        ];
        
        // Crear gráfica de barras para distribución de calificaciones
        const ctx = document.getElementById('proyectoCalificacionesChart').getContext('2d');
        
        // Colores para los rangos (de rojo a verde)
        const colores = [
            'rgba(255, 99, 132, 0.7)',  // Rojo (0-6)
            'rgba(255, 159, 64, 0.7)',  // Naranja (6-7)
            'rgba(255, 205, 86, 0.7)',  // Amarillo (7-8)
            'rgba(75, 192, 192, 0.7)',  // Azul verdoso (8-9)
            'rgba(54, 162, 235, 0.7)'   // Verde (9-10)
        ];
        
        const bordeColores = [
            'rgba(255, 99, 132, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(255, 205, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(54, 162, 235, 1)'
        ];
        
        // Configuración para gráfica de barras
        const barConfig = {
            type: 'bar',
            data: {
                labels: rangos,
                datasets: [{
                    label: 'Estudiantes',
                    data: conteoRangos,
                    backgroundColor: colores,
                    borderColor: bordeColores,
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const total = estudiantesConProyecto.length;
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${value} estudiantes (${percentage}%)`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Cantidad de estudiantes'
                        },
                        ticks: {
                            precision: 0 // Solo mostrar enteros
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Rango de calificación'
                        }
                    }
                }
            }
        };
        
        // Crear la gráfica de barras
        proyectoCalificacionesChart = new Chart(ctx, barConfig);
    }
    
    // Función para crear o actualizar la gráfica de porcentaje de entrega del proyecto
    function crearGraficaProyectoEntrega(proyectoStats) {
        // Verificar si hay datos
        if (!proyectoStats) return;
        
        // Datos para la gráfica
        const entregados = parseInt(proyectoStats.entregados);
        const pendientes = proyectoStats.total - entregados;
        const porcentaje = parseFloat(proyectoStats.porcentaje);
        
        // Colores para la gráfica
        const colorEntregados = '#4caf50'; // Verde
        const colorPendientes = '#f44336'; // Rojo
        
        // Destruir gráfica existente si ya existe
        if (proyectoEntregaChart) {
            proyectoEntregaChart.destroy();
        }
        
        // Obtener el contexto del canvas
        const ctx = document.getElementById('proyectoEntregaChart').getContext('2d');
        
        // Crear la gráfica de dona
        proyectoEntregaChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Entregados', 'Pendientes'],
                datasets: [{
                    data: [entregados, pendientes],
                    backgroundColor: [colorEntregados, colorPendientes],
                    borderColor: ['#ffffff', '#ffffff'],
                    borderWidth: 2,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateScale: true,
                    animateRotate: true
                }
            }
        });
    }
    
    // Función para crear la gráfica de distribución de calificaciones de la bitácora
    function crearGraficaCalificacionesBitacora(datos) {
        // Verificar si hay datos
        if (!datos || datos.length === 0) return;
        
        // Destruir gráfica existente si ya existe
        if (bitacoraCalificacionesChart) {
            bitacoraCalificacionesChart.destroy();
        }
        
        // Filtrar estudiantes que han entregado la bitácora
        const estudiantesConBitacora = datos.filter(est => {
            const valor = est['BITACORA'];
            return valor !== null && valor !== undefined && parseFloat(valor) > 0;
        });
        
        // Si no hay entregas, no mostrar gráfica
        if (estudiantesConBitacora.length === 0) return;
        
        // Definir rangos de calificación
        const rangos = ['0-6', '6-7', '7-8', '8-9', '9-10'];
        
        // Contar estudiantes en cada rango
        const conteoRangos = [
            estudiantesConBitacora.filter(est => parseFloat(est['BITACORA']) >= 0 && parseFloat(est['BITACORA']) < 6).length,
            estudiantesConBitacora.filter(est => parseFloat(est['BITACORA']) >= 6 && parseFloat(est['BITACORA']) < 7).length,
            estudiantesConBitacora.filter(est => parseFloat(est['BITACORA']) >= 7 && parseFloat(est['BITACORA']) < 8).length,
            estudiantesConBitacora.filter(est => parseFloat(est['BITACORA']) >= 8 && parseFloat(est['BITACORA']) < 9).length,
            estudiantesConBitacora.filter(est => parseFloat(est['BITACORA']) >= 9 && parseFloat(est['BITACORA']) <= 10).length
        ];
        
        // Crear gráfica de barras para distribución de calificaciones
        const ctx = document.getElementById('bitacoraCalificacionesChart').getContext('2d');
        
        // Colores para los rangos (de rojo a verde)
        const colores = [
            'rgba(255, 99, 132, 0.7)',  // Rojo (0-6)
            'rgba(255, 159, 64, 0.7)',  // Naranja (6-7)
            'rgba(255, 205, 86, 0.7)',  // Amarillo (7-8)
            'rgba(75, 192, 192, 0.7)',  // Azul verdoso (8-9)
            'rgba(54, 162, 235, 0.7)'   // Verde (9-10)
        ];
        
        const bordeColores = [
            'rgba(255, 99, 132, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(255, 205, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(54, 162, 235, 1)'
        ];
        
        // Configuración para gráfica de barras
        const barConfig = {
            type: 'bar',
            data: {
                labels: rangos,
                datasets: [{
                    label: 'Estudiantes',
                    data: conteoRangos,
                    backgroundColor: colores,
                    borderColor: bordeColores,
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const total = estudiantesConBitacora.length;
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${value} estudiantes (${percentage}%)`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Cantidad de estudiantes'
                        },
                        ticks: {
                            precision: 0 // Solo mostrar enteros
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Rango de calificación'
                        }
                    }
                }
            }
        };
        
        // Crear la gráfica de barras
        bitacoraCalificacionesChart = new Chart(ctx, barConfig);
    }
    
    // Función para crear o actualizar la gráfica de porcentaje de entrega de la bitácora
    function crearGraficaBitacoraEntrega(bitacoraStats) {
        // Verificar si hay datos
        if (!bitacoraStats) return;
        
        // Datos para la gráfica
        const entregados = parseInt(bitacoraStats.entregados);
        const pendientes = bitacoraStats.total - entregados;
        const porcentaje = parseFloat(bitacoraStats.porcentaje);
        
        // Colores para la gráfica
        const colorEntregados = '#2196f3'; // Azul
        const colorPendientes = '#f44336'; // Rojo
        
        // Destruir gráfica existente si ya existe
        if (bitacoraEntregaChart) {
            bitacoraEntregaChart.destroy();
        }
        
        // Obtener el contexto del canvas
        const ctx = document.getElementById('bitacoraEntregaChart').getContext('2d');
        
        // Crear la gráfica de dona
        bitacoraEntregaChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Entregadas', 'Pendientes'],
                datasets: [{
                    data: [entregados, pendientes],
                    backgroundColor: [colorEntregados, colorPendientes],
                    borderColor: ['#ffffff', '#ffffff'],
                    borderWidth: 2,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateScale: true,
                    animateRotate: true
                }
            }
        });
    }
    
    // Función para crear o actualizar la gráfica de puntos extra
    function crearGraficaPuntosExtra(datos, puntosExtraStats) {
        // Verificar si hay datos
        if (!datos || datos.length === 0 || !puntosExtraStats) return;
        
        // Agrupar estudiantes por cantidad de puntos extra
        const distribucionPuntos = {};
        
        // Recorrer todos los estudiantes
        datos.forEach(estudiante => {
            const puntosExtra = parseFloat(estudiante['PUNTOEX'] || 0);
            
            // Solo considerar estudiantes con puntos extra
            if (puntosExtra > 0) {
                // Redondear a enteros para agrupar
                const puntosRedondeados = Math.floor(puntosExtra);
                
                // Incrementar contador para este valor de puntos
                if (!distribucionPuntos[puntosRedondeados]) {
                    distribucionPuntos[puntosRedondeados] = 0;
                }
                distribucionPuntos[puntosRedondeados]++;
            }
        });
        
        // Convertir a arrays para Chart.js
        const puntosValues = Object.keys(distribucionPuntos).sort((a, b) => parseInt(a) - parseInt(b));
        const estudiantesCount = puntosValues.map(puntos => distribucionPuntos[puntos]);
        
        // Si no hay datos, mostrar mensaje
        if (puntosValues.length === 0) {
            puntosValues.push('Sin datos');
            estudiantesCount.push(0);
        }
        
        // Colores para la gráfica
        const colorBase = '#ffc107'; // Amarillo (color de advertencia)
        const colores = puntosValues.map((_, index) => {
            // Generar tonalidades de amarillo/naranja
            const opacity = 0.4 + (0.6 * index / Math.max(puntosValues.length, 1));
            return `rgba(255, 193, 7, ${opacity})`;
        });
        
        // Destruir gráfica existente si ya existe
        if (puntosExtraChart) {
            puntosExtraChart.destroy();
        }
        
        // Obtener el contexto del canvas
        const ctx = document.getElementById('puntosExtraChart').getContext('2d');
        
        // Crear la gráfica de barras horizontales
        puntosExtraChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: puntosValues.map(p => `${p} puntos`),
                datasets: [{
                    label: 'Estudiantes',
                    data: estudiantesCount,
                    backgroundColor: colores,
                    borderColor: colores.map(c => c.replace('0.7', '1')),
                    borderWidth: 1,
                    borderRadius: 4,
                    maxBarThickness: 30
                }]
            },
            options: {
                indexAxis: 'y', // Barras horizontales
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                return `${value} estudiante${value !== 1 ? 's' : ''}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Número de estudiantes'
                        },
                        ticks: {
                            precision: 0 // Solo mostrar enteros
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Puntos extra'
                        }
                    }
                }
            }
        });
    }
    
    // Evento para actualizar las estadísticas de actividades cuando se abre el acordeón
    $(document).on('shown.bs.collapse', '#actividadesCollapse', function() {
        if (typeof estudiantes !== 'undefined') {
            analizarActividades(estudiantes);
        }
    });
    
    // Event listeners para los filtros
    $('#equipoFilter, #estadoFilter, #grupoFilter').on('change', function() {
        cargarDatos();
        // Actualizar tabla de reprobados cada vez que cambian los filtros
        if (typeof estudiantes !== 'undefined') {
            actualizarTablaReprobados(estudiantes);
        }
    });
    
    // Manejar el cambio en el filtro de grupo para actualizar los equipos disponibles
    $('#grupoFilter').on('change', function() {
        const grupoSeleccionado = $(this).val();
        const equiposPorGrupo = {};
        const todosLosEquipos = new Set();
        
        // Reorganizar los equipos por grupo
        estudiantes.forEach(est => {
            const grupo = est.GRUPO;
            const equipo = est.EQUIPO;
            
            if (equipo) {
                todosLosEquipos.add(equipo);
                
                if (grupo) {
                    if (!equiposPorGrupo[grupo]) {
                        equiposPorGrupo[grupo] = new Set();
                    }
                    equiposPorGrupo[grupo].add(equipo);
                }
            }
        });
        
        // Actualizar el filtro de equipos
        actualizarFiltroEquipos(grupoSeleccionado, equiposPorGrupo, [...todosLosEquipos]);
        
        // Aplicar los filtros
        cargarDatos();
    });
    
    // Botón para limpiar filtros
    $('#resetFilters').on('click', function() {
        $('#grupoFilter, #equipoFilter, #estadoFilter').val('');
        aplicarFiltros();
    });
    
    // Actualizar rankings y estadísticas
    function actualizarRankings(datos) {
        // Mejor y peor estudiante
        const estudiantesOrdenados = [...datos].sort((a, b) => b.FINAL - a.FINAL);
        const mejorEstudiante = estudiantesOrdenados[0];
        const peorEstudiante = estudiantesOrdenados[estudiantesOrdenados.length - 1];
        
        // Actualizar tarjetas
        if (mejorEstudiante) {
            $('#mejorEstudiante').text(mejorEstudiante.COMPLETO);
            $('#puntajeEstudiante').text(`Puntaje: ${parseFloat(mejorEstudiante.FINAL).toFixed(1)}`);
        }
        
        if (peorEstudiante) {
            $('#peorEstudiante').text(peorEstudiante.COMPLETO);
            $('#puntajePeorEstudiante').text(`Puntaje: ${parseFloat(peorEstudiante.FINAL).toFixed(1)}`);
        }
        
        // Calcular promedios por grupo
        const grupos = {};
        datos.forEach(est => {
            if (!grupos[est.GRUPO]) {
                grupos[est.GRUPO] = { suma: 0, cantidad: 0 };
            }
            grupos[est.GRUPO].suma += parseFloat(est.FINAL);
            grupos[est.GRUPO].cantidad++;
        });
        
        // Encontrar mejor y peor grupo
        let mejorGrupo = '', peorGrupo = '';
        let mejorPromedioGrupo = -1, peorPromedioGrupo = 11; // Inicializar con valores fuera del rango 0-10
        
        Object.entries(grupos).forEach(([grupo, datos]) => {
            const promedio = datos.suma / datos.cantidad;
            
            // Verificar mejor grupo
            if (promedio > mejorPromedioGrupo) {
                mejorPromedioGrupo = promedio;
                mejorGrupo = grupo;
            }
            
            // Verificar peor grupo
            if (promedio < peorPromedioGrupo) {
                peorPromedioGrupo = promedio;
                peorGrupo = grupo;
            }
        });
        
        // Actualizar tarjetas de grupos
        if (mejorGrupo) {
            $('#mejorGrupo').text(`Grupo ${mejorGrupo}`);
            $('#promedioGrupo').text(`Promedio: ${mejorPromedioGrupo.toFixed(1)}`);
        }
        
        if (peorGrupo) {
            $('#peorGrupo').text(`Grupo ${peorGrupo}`);
            $('#promedioPeorGrupo').text(`Promedio: ${peorPromedioGrupo.toFixed(1)}`);
        }
        
        // Calcular promedios por equipo
        const equipos = {};
        datos.forEach(est => {
            if (!equipos[est.EQUIPO]) {
                equipos[est.EQUIPO] = { suma: 0, cantidad: 0 };
            }
            equipos[est.EQUIPO].suma += parseFloat(est.FINAL);
            equipos[est.EQUIPO].cantidad++;
        });
        
        // Encontrar mejor y peor equipo
        let mejorEquipo = '', peorEquipo = '';
        let mejorPromedioEquipo = -1, peorPromedioEquipo = 11; // Inicializar con valores fuera del rango 0-10
        
        Object.entries(equipos).forEach(([equipo, datos]) => {
            const promedio = datos.suma / datos.cantidad;
            
            // Verificar mejor equipo
            if (promedio > mejorPromedioEquipo) {
                mejorPromedioEquipo = promedio;
                mejorEquipo = equipo;
            }
            
            // Verificar peor equipo
            if (promedio < peorPromedioEquipo) {
                peorPromedioEquipo = promedio;
                peorEquipo = equipo;
            }
        });
        
        // Actualizar tarjetas de equipos
        if (mejorEquipo) {
            $('#mejorEquipo').text(mejorEquipo);
            $('#promedioEquipo').text(`Promedio: ${mejorPromedioEquipo.toFixed(1)}`);
        }
        
        if (peorEquipo) {
            $('#peorEquipo').text(peorEquipo);
            $('#promedioPeorEquipo').text(`Promedio: ${peorPromedioEquipo.toFixed(1)}`);
        }
    }
    
    // Actualizar top estudiantes (uno por grupo)
    function actualizarTopEstudiantes(datos) {
        // Actualizar el título con el total de estudiantes únicos
        const totalEstudiantes = new Set(datos.map(est => est.ID)).size;
        /* $('.card-header h5').text(`Mejores Estudiantes (${totalEstudiantes} en total)`); */
        
        // Obtener el mejor estudiante de cada grupo
        const mejoresPorGrupo = {};
        
        datos.forEach(est => {
            const grupo = est.GRUPO;
            const calificacion = parseFloat(est.FINAL);
            
            if (!mejoresPorGrupo[grupo] || calificacion > parseFloat(mejoresPorGrupo[grupo].FINAL)) {
                mejoresPorGrupo[grupo] = est;
            }
        });
        
        // Convertir a array, ordenar por calificación y limitar a 10
        const topEstudiantes = Object.values(mejoresPorGrupo)
            .sort((a, b) => b.FINAL - a.FINAL)
            .slice(0, 10);
            
        const tbody = $('#topEstudiantesBody');
        tbody.empty();
        
        topEstudiantes.forEach((est, index) => {
            const row = `
                <tr>
                    <td class="align-middle">${index + 1}</td>
                    <td class="align-middle">${est.COMPLETO}</td>
                    <td class="align-middle">${est.GRUPO}</td>
                    <td class="align-middle">${est.EQUIPO}</td>
                    <td class="align-middle">
                        <span class="badge ${est.FINAL >= 6 ? 'bg-success' : 'bg-danger'}">
                            ${parseFloat(est.FINAL).toFixed(1)}
                        </span>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });
        
        // Inicializar o actualizar DataTable
        if ($.fn.DataTable.isDataTable('#topEstudiantesTable')) {
            $('#topEstudiantesTable').DataTable().destroy();
        }
        
        $('#topEstudiantesTable').DataTable({
            pageLength: 10,
            language: {
                url: '//cdn.datatables.net/plug-ins/1.11.5/i18n/es-ES.json',
                search: 'Buscar:',
                zeroRecords: 'No se encontraron registros',
                info: 'Mostrando _START_ a _END_ de _TOTAL_ registros',
                infoEmpty: 'No hay registros disponibles',
                infoFiltered: '(filtrado de _MAX_ registros en total)'
            },
            order: [[4, 'desc']],
            columnDefs: [
                { orderable: false, targets: [0] },
                { searchable: false, targets: [0, 2, 3, 4] }
            ],
            dom: '<"d-flex justify-content-between align-items-center mb-3"fB>rtip',
            buttons: [
                {
                    extend: 'copy',
                    text: '<i class="fas fa-copy"></i> Copiar',
                    className: 'btn btn-sm btn-outline-secondary',
                    exportOptions: {
                        columns: [0, 1, 2, 3, 4]
                    }
                },
                {
                    extend: 'excel',
                    text: '<i class="fas fa-file-excel"></i> Excel',
                    className: 'btn btn-sm btn-outline-success',
                    exportOptions: {
                        columns: [0, 1, 2, 3, 4]
                    }
                },
                {
                    extend: 'pdf',
                    text: '<i class="fas fa-file-pdf"></i> PDF',
                    className: 'btn btn-sm btn-outline-danger',
                    exportOptions: {
                        columns: [0, 1, 2, 3, 4]
                    }
                },
                {
                    extend: 'print',
                    text: '<i class="fas fa-print"></i> Imprimir',
                    className: 'btn btn-sm btn-outline-primary',
                    exportOptions: {
                        columns: [0, 1, 2, 3, 4]
                    }
                }
            ],
            initComplete: function() {
                $('.dt-buttons button').removeClass('dt-button');
            }
        });
    }
    
    // Crear gráficos
    function crearGraficos(datos) {
        // Destruir gráficos existentes
        if (calificacionesChart) calificacionesChart.destroy();
        if (equiposChart) equiposChart.destroy();
        if (aprobacionChart) aprobacionChart.destroy();
        
        // Destruir gráficos de grupos y equipos
        grupoCharts.forEach(chart => chart.destroy());
        equipoCharts.forEach(chart => chart.destroy());
        grupoCharts = [];
        equipoCharts = [];
        
        // Actualizar top 10 estudiantes
        actualizarTopEstudiantes(datos);
        
        // 1. Gráfico de distribución de calificaciones (más grande)
        const calificaciones = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // 0-9, 1-2, ..., 9-10
        
        datos.forEach(est => {
            const calif = Math.min(9, Math.floor(est.FINAL));
            calificaciones[calif]++;
        });
        
        const ctx1 = document.getElementById('calificacionesChart').getContext('2d');
        calificacionesChart = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: ['0-1', '1-2', '2-3', '3-4', '4-5', '5-6', '6-7', '7-8', '8-9', '9-10'],
                datasets: [{
                    label: 'Número de Estudiantes',
                    data: calificaciones,
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                aspectRatio: 1.5,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Distribución de Calificaciones',
                        font: {
                            size: 16
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Número de Estudiantes',
                            font: {
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            stepSize: 1
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Rango de Calificaciones',
                            font: {
                                weight: 'bold'
                            }
                        }
                    }
                },
                animation: {
                    duration: 1000
                }
            }
        });
        
        // 2. Gráfico de promedios por equipo (más grande)
        const equipos = {};
        datos.forEach(est => {
            if (est.EQUIPO) { // Solo si el estudiante tiene equipo
                if (!equipos[est.EQUIPO]) {
                    equipos[est.EQUIPO] = { suma: 0, cantidad: 0 };
                }
                equipos[est.EQUIPO].suma += parseFloat(est.FINAL);
                equipos[est.EQUIPO].cantidad++;
            }
        });
        
        const equiposLabels = [];
        const equiposData = [];
        
        Object.entries(equipos).forEach(([equipo, datos]) => {
            equiposLabels.push(equipo);
            equiposData.push(parseFloat((datos.suma / datos.cantidad).toFixed(1)));
        });
        
        // Ordenar equipos por promedio
        const equiposOrdenados = equiposLabels.map((equipo, index) => ({
            equipo,
            promedio: equiposData[index]
        })).sort((a, b) => b.promedio - a.promedio);
        
        const equiposLabelsOrdenados = equiposOrdenados.map(e => e.equipo);
        const equiposDataOrdenados = equiposOrdenados.map(e => e.promedio);
        
        const ctx2 = document.getElementById('equiposChart').getContext('2d');
        equiposChart = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: equiposLabelsOrdenados,
                datasets: [{
                    label: 'Promedio',
                    data: equiposDataOrdenados,
                    backgroundColor: 'rgba(75, 192, 192, 0.7)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                aspectRatio: 1.5,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Promedio por Equipo',
                        font: {
                            size: 16
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Promedio: ${context.raw}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 10,
                        title: {
                            display: true,
                            text: 'Calificación Promedio',
                            font: {
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            stepSize: 1
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Equipos',
                            font: {
                                weight: 'bold'
                            }
                        }
                    }
                },
                animation: {
                    duration: 1000
                }
            }
        });
        
        // 3. Gráfico de aprobación - Convertido a barras con opción de apilado
        const aprobados = datos.filter(est => parseFloat(est.FINAL) >= 6).length;
        const reprobados = datos.length - aprobados;
        const porcentajeAprobados = datos.length > 0 ? ((aprobados / datos.length) * 100).toFixed(1) : 0;
        
        // Crear botón de alternar entre vista apilada y agrupada
        const toggleStackedBtn = document.getElementById('toggleStackedBtn');
        if (!toggleStackedBtn) {
            const chartContainer = document.querySelector('#aprobacionChart').parentNode;
            const btn = document.createElement('button');
            btn.id = 'toggleStackedBtn';
            btn.className = 'btn btn-sm btn-outline-primary mb-2';
            btn.innerHTML = '<i class="fas fa-layer-group me-1"></i> Cambiar a vista apilada';
            chartContainer.insertBefore(btn, document.getElementById('aprobacionChart'));
        }
        
        let stacked = false;
        const toggleStacked = () => {
            stacked = !stacked;
            aprobacionChart.options.scales.x.stacked = stacked;
            aprobacionChart.options.scales.y.stacked = stacked;
            document.getElementById('toggleStackedBtn').innerHTML = 
                `<i class="fas fa-layer-group me-1"></i> ${stacked ? 'Cambiar a vista agrupada' : 'Cambiar a vista apilada'}`;
            aprobacionChart.update();
        };
        
        document.getElementById('toggleStackedBtn').onclick = toggleStacked;
        
        const ctx3 = document.getElementById('aprobacionChart').getContext('2d');
        aprobacionChart = new Chart(ctx3, {
            type: 'bar',
            data: {
                labels: ['Estudiantes'],
                datasets: [
                    {
                        label: 'Aprobados',
                        data: [aprobados],
                        backgroundColor: 'rgba(40, 167, 69, 0.7)',
                        borderColor: 'rgba(40, 167, 69, 1)',
                        borderWidth: 1,
                        borderRadius: 4
                    },
                    {
                        label: 'Reprobados',
                        data: [reprobados],
                        backgroundColor: 'rgba(220, 53, 69, 0.7)',
                        borderColor: 'rgba(220, 53, 69, 1)',
                        borderWidth: 1,
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                aspectRatio: 1.5,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: 14
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: `Estado de Aprobación (${porcentajeAprobados}% Aprobados)`,
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        padding: {
                            top: 10,
                            bottom: 20
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: false,
                        title: {
                            display: true,
                            text: 'Estado',
                            font: {
                                weight: 'bold'
                            }
                        }
                    },
                    y: {
                        stacked: false,
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Número de Estudiantes',
                            font: {
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                animation: {
                    duration: 1000
                }
            }
        });
        
        // El gráfico de top 10 estudiantes ha sido reemplazado por una tabla
    }
    
});


