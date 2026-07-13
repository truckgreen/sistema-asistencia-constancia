document.addEventListener('DOMContentLoaded', function() {
    var calendarEl = document.getElementById('calendar');
    
    if (calendarEl) {
        // Validación del entorno: Determina si es la vista del director por la existencia del filtro institucional
        var esDirector = document.getElementById('filtroProfesor') !== null;

        var calendar = new FullCalendar.Calendar(calendarEl, {
            // Si es profesor, muestra la grilla de tiempo semanal de forma directa; si es director, la vista mensual general
            initialView: esDirector ? 'dayGridMonth' : 'timeGridWeek',
            locale: 'es',
            weekends: false, // Restringe el calendario exclusivamente de lunes a viernes
            slotMinTime: '07:00:00', // Límite horario escolar de inicio
            slotMaxTime: '18:00:00', // Límite horario escolar de cierre
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: esDirector ? 'dayGridMonth,timeGridWeek,timeGridDay' : 'timeGridWeek,timeGridDay'
            },
            events: function(fetchInfo, successCallback, failureCallback) {
                var filtroProfesor = document.getElementById('filtroProfesor');
                var profesorId = filtroProfesor ? filtroProfesor.value : 'todos';
                
                fetch('/api/eventos?profesor_id=' + profesorId)
                    .then(response => response.json())
                    .then(data => successCallback(data))
                    .catch(error => failureCallback(error));
            },
            eventClick: function(info) {
                if (esDirector) {
                    // Carga dinámica de datos del evento en el modal de modificación directiva
                    fetch('/api/evento/' + info.event.id)
                        .then(response => response.json())
                        .then(data => {
                            document.getElementById('mod_evento_id').value = data.id;
                            document.getElementById('mod_titulo').value = data.titulo;
                            document.getElementById('mod_tipo').value = data.tipo;
                            document.getElementById('mod_fecha_inicio').value = data.fecha_inicio;
                            document.getElementById('mod_fecha_fin').value = data.fecha_fin;
                            
                            var bloqueProf = document.getElementById('mod_bloqueProfesor');
                            if (data.tipo === 'clase') {
                                bloqueProf.classList.remove('d-none');
                                document.getElementById('mod_profesor_id').value = data.profesor_id;
                            } else {
                                bloqueProf.classList.add('d-none');
                            }
                            
                            var modal = new bootstrap.Modal(document.getElementById('modalModificar'));
                            modal.show();
                        });
                } else {
                    alert('Asignación Académica: ' + info.event.title);
                }
            }
        });

        calendar.render();

        var filtroProfesor = document.getElementById('filtroProfesor');
        if (filtroProfesor) {
            filtroProfesor.addEventListener('change', function() {
                calendar.refetchEvents();
            });
        }
    }
});