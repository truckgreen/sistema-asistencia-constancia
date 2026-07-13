# Documentación del Sistema de Control de Asistencias

## 1. Introducción

Este documento describe el sistema de control de asistencias diseñado para la institución educativa "U.E. La Constancia". El sistema está desarrollado con Flask y ofrece administración de usuarios, planificación de actividades, control de asistencia mediante QR y reportes de auditoría.

## 2. Alcance

El proyecto cubre los siguientes requisitos:

- Gestión de usuarios con roles diferenciados: directivo y personal.
- Panel de control para directivos con gestión de personal, planificación y configuración.
- Panel de personal con historial de asistencias y registro mediante escaneo de QR.
- Generación de códigos QR válidos para el proceso de registro de asistencia.
- Registro de inasistencias justificadas con adjuntos.
- Agenda institucional y calendario de eventos.
- Reportes filtrables de asistencia e inasistencia.

## 3. Tecnologías utilizadas

- Python 3.x
- Flask
- Flask-SQLAlchemy
- SQLite
- Werkzeug
- qrcode
- html5-qrcode (frontend)
- Bootstrap 5
- FullCalendar

## 4. Estructura del proyecto

Carpeta raíz:

- `app.py`: archivo principal de la aplicación Flask.
- `models.py`: definición de los modelos de datos y la configuración de SQLAlchemy.
- `requirements.txt`: dependencias del proyecto.
- `templates/`: vistas HTML de la aplicación.
- `static/`: recursos estáticos como CSS, JS e imágenes.
- `instance/`: carpeta local de configuración y datos de la aplicación.

Plantillas principales:

- `templates/base.html`
- `templates/login.html`
- `templates/director.html`
- `templates/personal.html`
- `templates/qr_panel.html`
- `templates/director_usuarios.html`
- `templates/director_configuracion.html`
- `templates/director_planificacion.html`
- `templates/reporte.html`

## 5. Configuración e inicio

Variables de configuración relevantes en `app.py`:

- `SECRET_KEY`: clave para el manejo de sesiones.
- `SQLALCHEMY_DATABASE_URI`: `sqlite:///sistema_academico.db`.
- `SQLALCHEMY_TRACK_MODIFICATIONS`: deshabilitado para rendimiento.

Al iniciar la aplicación:

- Se crea la base de datos y las tablas si no existen.
- Se cargan efemérides institucionales predefinidas.
- Se crea una configuración inicial con la hora oficial de entrada `07:30`.
- Se crea un usuario directivo predeterminado con correo `director@institucion.edu` y contraseña `admin123`.

El servidor se ejecuta por defecto en el puerto `8080` con host `0.0.0.0`.

## 6. Modelo de datos

### Usuario (`usuarios`)

- `id`: entero, clave primaria.
- `nombre`: cadena.
- `apellido`: cadena.
- `correo`: cadena única.
- `password_hash`: hash de contraseña.
- `telefono`: cadena opcional.
- `fecha_nacimiento`: fecha opcional.
- `rol`: cadena, identifica `directivo` o `personal`.
- Relación con `AsistenciaDiaria`.

### Evento (`eventos`)

- `id`: entero, clave primaria.
- `titulo`: texto del evento.
- `fecha_inicio`: datetime.
- `fecha_fin`: datetime.
- `tipo`: `clase`, `feriado` o `institucional`.
- `profesor_id`: clave foránea opcional a `usuarios`.

### AsistenciaDiaria (`asistencias_diarias`)

- `id`: entero, clave primaria.
- `usuario_id`: clave foránea a `usuarios`.
- `fecha`: fecha del registro.
- `hora_registro`: fecha y hora del servidor.
- `estado`: `A tiempo`, `Tarde`, `Ausente` o `Inasistencia Reportada`.
- `motivo`: texto breve.
- `observaciones`: texto de justificación.
- `archivo_adjunto`: nombre de archivo almacenado.

### Configuración (`configuracion`)

- `id`: entero, clave primaria.
- `hora_entrada_oficial`: hora de entrada límite en formato `HH:MM`.

## 7. Endpoints y rutas principales

### Autenticación

- `/` (GET, POST): inicio de sesión.
- `/logout`: cierre de sesión.

### Directivo

- `/directivo`: dashboard del directivo.
- `/directivo/reporte`: reporte de asistencias.
- `/directivo/usuarios`: gestión de usuarios.
- `/directivo/planificacion`: planificación de actividades.
- `/directivo/configuracion_vista`: vista de configuración.
- `/directivo/configurar_hora` (POST): actualización de hora de entrada.
- `/directivo/crear_usuario` (POST): crear usuario.
- `/directivo/editar_usuario/<id>` (POST): editar usuario.
- `/directivo/eliminar_usuario/<id>`: eliminar usuario.
- `/directivo/generar_qr`: generar código QR para registro.
- `/directivo/crear_evento` (POST): crear evento.
- `/directivo/modificar_evento` (POST): modificar evento.

### Personal

- `/personal`: panel del personal.
- `/asistencia/registrar` (GET): registra asistencia tras escaneo de QR.
- `/personal/registrar_inasistencia` (POST): registrar inasistencia justificada.

### APIs

- `/api/eventos`: retorna eventos en JSON para el calendario.
- `/api/evento/<evento_id>`: datos de un evento específico.

## 8. Descripción de procesos

### Flujo de inicio de sesión

- El formulario de login se procesa en `/`.
- El sistema valida correo y contraseña.
- Si el login es exitoso, se direcciona a `dashboard_directivo` o `dashboard_personal` según el rol.
- Se preserva un parámetro `next` cuando el acceso se origina desde otra ruta, especialmente durante el flujo del QR.

### Generación de QR

- La ruta `/directivo/generar_qr` construye la URL de registro en función del host de la petición.
- Cuando el servidor se accede por `localhost` o `127.0.0.1`, se intenta obtener la IP local real.
- El QR codifica la URL de `/asistencia/registrar` como destino de registro.
- La plantilla `qr_panel.html` muestra el QR en formato `data:image/png;base64`.

### Registro de asistencia

- El endpoint `/asistencia/registrar` requiere sesión activa.
- Si el usuario no está autenticado, se redirige a `/` con `next=/asistencia/registrar`.
- El sistema comprueba si ya existe un registro del día para el usuario.
- Calcula el estado comparando la hora actual con `hora_entrada_oficial`.
- Registra la asistencia y presenta una página de confirmación con redirección automática al panel.

### Gestión de inasistencias

- En el panel de personal, se abre un modal para reportar inasistencia.
- El formulario se envía a `/personal/registrar_inasistencia`.
- El sistema guarda motivo, observaciones y archivo adjunto en `static/uploads`.
- El registro se marca como `Inasistencia Reportada`.

## 9. Plantillas de interfaz

### `base.html`

Proporciona estructura general, barra de navegación y carga de recursos globales.
Contiene la lógica para mostrar el menú de navegación según el rol.

### `login.html`

Formulario de autenticación con manejo del parámetro `next`.
Incluye estilos y validaciones básicas.

### `director.html`

Dashboard directivo con acceso a:

- QR de registro.
- Reportes de asistencia.
- Agenda y eventos.
- Gestión de usuarios y configuración.

### `personal.html`

Dashboard de personal con:

- Calendario de actividades.
- Historial de asistencia.
- Modal para escaneo de QR.
- Modal para reporte de inasistencias.

### `qr_panel.html`

Vista dedicada a mostrar el código QR generado por el directivo.
Incluye opción de impresión y enlace de retorno al dashboard.

### `director_usuarios.html`

Formulario para crear usuarios y tabla de gestión de personal.
Incluye edición y eliminación de registros.

### `director_configuracion.html`

Formulario para ajuste de la hora oficial de entrada.
Define la regla de puntualidad para el sistema.

### `director_planificacion.html`

Formulario para crear eventos en el calendario.
Permite seleccionar tipo de actividad y asignar docente responsable.

### `reporte.html`

Tabla de auditoría que permite filtrar por rol, usuario, tipo de registro y rango de fechas.

## 10. Flujos clave

### Flujo de QR y registro de asistencia

1. El directivo genera el QR en `/directivo/generar_qr`.
2. El QR se muestra en `qr_panel.html`.
3. El personal escanea el QR desde su dispositivo.
4. El dispositivo abre la URL `/asistencia/registrar`.
5. Si no hay sesión activa, el usuario inicia sesión.
6. Se guarda la asistencia y se muestra la confirmación.

### Flujo de planificación

1. El directivo crea un evento en `director_planificacion.html`.
2. El evento se guarda en la base de datos.
3. El calendario del dashboard se actualiza desde `/api/eventos`.

### Flujo de reportes

1. El directivo accede a `/directivo/reporte`.
2. Aplica filtros de rol, usuario, tipo de registro y fechas.
3. El sistema muestra la tabla de asistencias.
4. Se puede consultar detalle de inasistencias justificadas.

## 11. Consideraciones de seguridad

- El acceso a rutas administrativas está protegido mediante roles y sesión.
- Se utiliza `SECRET_KEY` para firmar las cookies de sesión.
- Las contraseñas se almacenan en hash mediante Werkzeug.
- Los archivos adjuntos se guardan con nombre seguro utilizando `secure_filename`.

## 12. Recomendaciones de mantenimiento

- Cambiar el valor de `SECRET_KEY` en producción.
- Asegurar la carpeta `static/uploads` con permisos adecuados.
- Mantener el servidor y dependencias actualizadas.
- Verificar que el puerto `8080` esté disponible y accesible en la red local.
- Revisar periódicamente la base de datos SQLite para respaldos.

## 13. Archivos clave

- `app.py`: lógica de la aplicación.
- `models.py`: definición de entidades y relaciones.
- `requirements.txt`: dependencias.
- `templates/`: vistas HTML.
- `static/`: recursos de estilo y scripts.
- `documentacion_del_sistema.pdf`: documentación en formato PDF generada anteriormente.
