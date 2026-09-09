# Sistema de Asistencia - U.E. La Constancia

Manual sencillo para entender, ejecutar y mantener el proyecto.

## 1. ¿Qué hace el sistema?

Es una aplicación web hecha con Flask para una institución educativa. Permite:

- Iniciar sesión según el rol del usuario.
- Registrar asistencia mediante código QR.
- Registrar asistencias manuales desde el panel directivo.
- Reportar y revisar justificaciones de inasistencia.
- Solicitar, aprobar y rechazar permisos.
- Administrar docentes y personal.
- Crear horarios por persona.
- Asignar materias, grados, horas y aulas a cada docente.
- Generar un horario escolar imprimible por cada grado.
- Crear actividades y consultarlas en un calendario.

## 2. Cómo ejecutar el proyecto

Desde la carpeta del proyecto:

```powershell
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

Después abre:

```text
http://127.0.0.1:8080
```

Para acceder desde otro equipo de la misma red, usa la IP del computador servidor, por ejemplo:

```text
http://192.168.100.101:8080
```

El archivo SQLite se crea en `instance/sistema_academico.db`. Esa carpeta está ignorada por Git porque contiene datos locales.

## 3. Estructura del proyecto

```text
app.py                         Configuración, inicialización y rutas antiguas
models.py                      Modelos y tablas de la base de datos
routes/                        Blueprints nuevos organizados por módulo
  auth.py                      Rutas auxiliares de autenticación
  directivo.py                 Solicitudes y acciones directivas
  horarios.py                  Horarios, clases y generación imprimible
  personal.py                  Vista del horario del docente
  api.py                       Endpoints JSON
templates/                     Páginas HTML de Jinja
static/css/style.css           Estilos visuales
static/js/                     JavaScript del frontend
static/uploads/                Archivos adjuntos de permisos e inasistencias
actualizar_bd.py               Script de actualización de datos antiguos
requirements.txt               Dependencias de Python
```

## 4. Conceptos importantes de Flask

### `app.py`

Es el punto de entrada. Crea el objeto Flask, configura la base de datos, inicializa SQLAlchemy, registra los Blueprints y conserva varias rutas antiguas.

Cuando se ejecuta `python app.py`, se inicia el servidor en el puerto `8080`.

### `models.py`

Define las tablas usando SQLAlchemy. Cada clase representa una tabla de la base de datos:

- `Usuario`: personas que pueden entrar al sistema.
- `AsistenciaDiaria`: registros de entrada, retrasos e inasistencias.
- `Permiso`: solicitudes de permiso con estado.
- `Evento`: actividades del calendario.
- `Configuracion`: parámetros generales.
- `HorarioPersonal`: entrada y salida por día de una persona.
- `PlantillaHorario`: plantilla reutilizable de jornada.
- `DetallePlantillaHorario`: horas de cada día de una plantilla.
- `AsignacionHorario`: asignación por persona, rol o departamento.
- `ClaseHorario`: materia asignada a un docente, con grado, día, hora y aula.

La relación principal de clases es:

```text
Usuario 1 ---- muchas ClaseHorario
```

Por eso una clase siempre se guarda con `usuario_id`, que identifica al docente.

## 5. Roles principales

- `directivo`: puede administrar personal, horarios, solicitudes y reportes.
- `personal`: puede registrar asistencia, solicitar permisos, reportar inasistencias y consultar sus clases.
- `administrativo` y `obrero`: son tipos de personal; sus permisos dependen de cómo se use el sistema.

El usuario directivo inicial se crea automáticamente si no existe:

```text
Correo: director@institucion.edu
Contraseña inicial: admin123
```

Se recomienda cambiar esa contraseña y no usarla en producción.

## 6. Rutas principales

### Autenticación

| Método | Ruta | Función |
|---|---|---|
| `GET`, `POST` | `/` | Login |
| `GET` | `/logout` | Cerrar sesión |

### Panel directivo

| Método | Ruta | Función |
|---|---|---|
| `GET` | `/directivo` | Resumen directivo |
| `GET` | `/directivo/usuarios` | Ver y administrar personal |
| `POST` | `/directivo/crear_usuario` | Crear usuario |
| `POST` | `/directivo/editar_usuario/<id>` | Editar usuario |
| `GET` | `/directivo/eliminar_usuario/<id>` | Eliminar usuario |
| `GET` | `/directivo/reporte` | Libro de asistencias |
| `GET` | `/directivo/solicitudes` | Ver justificaciones y permisos |
| `GET` | `/directivo/configuracion_vista` | Ver parámetros del sistema |
| `POST` | `/directivo/configurar_hora` | Guardar parámetros generales |
| `GET` | `/directivo/generar_qr` | Generar QR de asistencia |
| `POST` | `/directivo/registrar_asistencia_manual` | Registrar asistencia manual |

### Horarios y clases

| Método | Ruta | Función |
|---|---|---|
| `GET` | `/directivo/horarios` | Pantalla de horarios |
| `POST` | `/directivo/horarios/persona/<usuario_id>` | Guardar entrada y salida semanal |
| `POST` | `/directivo/horarios/clases` | Guardar materias del docente |
| `GET` | `/directivo/horarios/generar?usuario_id=2` | Generar horario imprimible |
| `GET` | `/personal/horario` | El docente consulta su horario |
| `POST` | `/directivo/horarios/plantillas` | Crear plantilla de jornada |
| `POST` | `/directivo/horarios/asignaciones` | Asignar plantilla por persona, rol o departamento |
| `POST` | `/directivo/horarios/asignaciones/<id>/eliminar` | Eliminar asignación |

Para separar los horarios por grado, cada materia debe tener un valor diferente en `curso`, por ejemplo:

```text
2 año
3 año
4 año
```

El generador crea una tabla independiente por cada valor de `curso` y cada una sale en una página diferente al imprimir.

### Justificaciones y permisos

| Método | Ruta | Función |
|---|---|---|
| `GET` | `/directivo/solicitudes` | Bandeja de solicitudes |
| `POST` | `/personal/registrar_inasistencia` | Enviar justificación |
| `POST` | `/directivo/inasistencia/<asistencia_id>/aprobar` | Aprobar justificación |
| `POST` | `/directivo/inasistencia/<asistencia_id>/rechazar` | Rechazar justificación |
| `POST` | `/personal/solicitar_permiso` | Solicitar permiso |
| `POST` | `/directivo/permiso/<permiso_id>/aprobar` | Aprobar permiso |
| `POST` | `/directivo/permiso/<permiso_id>/rechazar` | Rechazar permiso |

La pantalla `/directivo/solicitudes` permite filtrar por tipo y estado.

### API y calendario

| Método | Ruta | Función |
|---|---|---|
| `GET` | `/api/eventos` | Eventos del calendario en JSON |
| `GET` | `/api/evento/<evento_id>` | Datos de un evento |
| `GET` | `/api/horarios` | Horarios del usuario autenticado |
| `GET` | `/api/plantillas-horario` | Plantillas para el directivo |

## 7. Flujo para crear un horario docente

1. Entrar como directivo.
2. Abrir **Organización → Personal y departamentos**.
3. Crear el docente con rol `Personal Docente (Profesor)`.
4. Abrir **Organización → Horarios por persona**.
5. Seleccionar al docente.
6. Definir su jornada, por ejemplo `07:00` a `13:00`.
7. En `Curso / grado del horario`, escribir `2 año`.
8. Agregar las materias de ese grado con día, hora y aula.
9. Guardar las clases.
10. Repetir con `3 año` u otro grado si el docente atiende más cursos.
11. Pulsar **Generar horario escolar**.

## 8. Flujo de justificaciones y permisos

### Docente o personal

1. Entra al sistema.
2. Pulsa `Reportar Inasistencia` o `Solicitar Permiso`.
3. Completa fechas, motivo, observaciones y adjunto si corresponde.
4. Envía la solicitud.

### Directivo

1. Abre **Control → Justificaciones y permisos**.
2. Filtra por justificaciones o permisos.
3. Revisa la información y los adjuntos.
4. Pulsa aprobar o rechazar.

## 9. Cómo trabajar con GitHub

El error:

```text
! [rejected] main -> main (non-fast-forward)
```

significa que GitHub tiene commits que todavía no existen en tu computadora. Git evita que tu `push` sobrescriba esos cambios.

Primero guarda tus cambios locales en un commit:

```powershell
git status
git add .
git commit -m "Actualiza horarios y solicitudes"
```

Luego descarga e integra los cambios de GitHub:

```powershell
git pull --rebase origin main
```

Finalmente vuelve a subir:

```powershell
git push origin main
```

Si aparecen conflictos:

```powershell
git status
```

Abre los archivos marcados, decide qué contenido conservar y elimina las marcas:

```text
<<<<<<<
=======
>>>>>>>
```

Después ejecuta:

```powershell
git add .
git rebase --continue
git push origin main
```

Si GitHub contiene un README o archivos iniciales que nunca necesitas conservar, existe la opción de sobrescribir el remoto, pero es destructiva y no debe usarse sin revisar antes:

```powershell
git push --force-with-lease origin main
```

No uses `git reset --hard` ni `git push --force` sin confirmar qué cambios se perderían.

## 10. Comandos útiles para aprender el proyecto

```powershell
# Ver archivos modificados
git status

# Ver cambios
git diff

# Ver historial
git log --oneline --decorate --all

# Ver rutas registradas por Flask
python -c "import app; print(app.app.url_map)"

# Comprobar sintaxis
python -m py_compile app.py models.py routes\*.py
```

## 11. Orden recomendado para aprender el código

1. Leer este archivo.
2. Leer `app.py` para entender la configuración y el arranque.
3. Leer `models.py` para entender los datos.
4. Leer `routes/horarios.py` porque contiene el flujo más completo.
5. Leer `templates/director_horarios.html` para ver cómo el formulario envía datos.
6. Leer `templates/horario_escolar.html` para entender la generación imprimible.
7. Leer `routes/directivo.py` y `templates/directivo_solicitudes.html` para solicitudes.
8. Revisar `routes/personal.py` y `templates/personal.html` para el portal del docente.

Una ruta web normalmente sigue este flujo:

```text
Navegador -> ruta Flask -> consulta/modelo SQLAlchemy -> plantilla Jinja -> HTML
```

Ejemplo para una clase:

```text
Formulario de horarios
  -> POST /directivo/horarios/clases
  -> ClaseHorario
  -> SQLite
  -> GET /directivo/horarios/generar
  -> horario_escolar.html
```
