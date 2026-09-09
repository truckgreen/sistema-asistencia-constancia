import os
import socket
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash
from werkzeug.utils import secure_filename
from models import (db, Usuario, Evento, AsistenciaDiaria, Configuracion,
                     HorarioPersonal, Permiso, AsignacionHorario)
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from sqlalchemy import extract, inspect, text
import secrets
import string
import qrcode
import io
import base64
from routes.horarios import horarios_bp
from routes.auth import auth_bp
from routes.directivo import directivo_bp
from routes.personal import personal_bp
from routes.api import api_bp

# --- Configuración de la Aplicación ---
app = Flask(__name__)
# Definición de la llave secreta para el manejo seguro de sesiones (cookies cifradas)
app.config['SECRET_KEY'] = 'clave_secreta_institucional_estricta_constancia'

# Ubicación local de la base de datos y carpeta de archivos adjuntos.
instance_db_path = os.path.join(app.root_path, 'instance', 'sistema_academico.db')
os.makedirs(os.path.dirname(instance_db_path), exist_ok=True)
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{instance_db_path.replace('\\', '/') }"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = os.path.join(app.root_path, 'static', 'uploads')
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB máximo para adjuntos
try:
    ZONA_HORARIA = ZoneInfo('America/Caracas')
except Exception:
    # Venezuela mantiene UTC-4 y no aplica horario de verano.
    ZONA_HORARIA = timezone(timedelta(hours=-4))

# Inicialización de la base de datos con la aplicación Flask
db.init_app(app)
app.register_blueprint(horarios_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(directivo_bp)
app.register_blueprint(personal_bp)
app.register_blueprint(api_bp)

def ahora_venezuela():
    """Devuelve la hora oficial de la institución, independientemente del servidor."""
    return datetime.now(ZONA_HORARIA).replace(tzinfo=None)

def dias_laborables(config):
    return {int(dia) for dia in (config.dias_laborables or '0,1,2,3,4').split(',') if dia.strip().isdigit()}

def horario_de_usuario(usuario, fecha, config=None):
    horario = HorarioPersonal.query.filter_by(usuario_id=usuario.id, dia_semana=fecha.weekday()).first()
    if horario:
        return horario.hora_entrada, horario.hora_salida

    asignaciones = AsignacionHorario.query.filter(
        AsignacionHorario.fecha_inicio <= fecha,
        (AsignacionHorario.fecha_fin.is_(None) | (AsignacionHorario.fecha_fin >= fecha)),
        ((AsignacionHorario.usuario_id == usuario.id) |
         (AsignacionHorario.usuario_id.is_(None) &
          ((AsignacionHorario.departamento == usuario.departamento) |
           (AsignacionHorario.rol == usuario.rol))))
    ).all()
    asignaciones.sort(key=lambda asignacion: (
        3 if asignacion.usuario_id == usuario.id else
        2 if asignacion.departamento and asignacion.departamento == usuario.departamento else
        1,
        asignacion.prioridad,
        asignacion.fecha_inicio
    ), reverse=True)
    asignaciones = [asignacion for asignacion in asignaciones if asignacion.plantilla.activa]
    if asignaciones:
        detalle = next((detalle for detalle in asignaciones[0].plantilla.detalles
                        if detalle.dia_semana == fecha.weekday()), None)
        if detalle:
            return detalle.hora_entrada, detalle.hora_salida

    return usuario.hora_entrada or (config.hora_entrada_oficial if config else '07:30'), usuario.hora_salida or '15:30'

def actualizar_esquema_existente():
    """Agrega columnas nuevas a instalaciones SQLite creadas con una versión anterior."""
    inspector = inspect(db.engine)
    cambios = {
        'usuarios': [('hora_entrada', "VARCHAR(5) DEFAULT '07:30'"), ('hora_salida', "VARCHAR(5) DEFAULT '15:30'"), ('limite_permisos', 'INTEGER DEFAULT 3'), ('departamento', 'VARCHAR(80)')],
        'asistencias_diarias': [('minutos_retraso', 'INTEGER DEFAULT 0'), ('registrada_manualmente', 'BOOLEAN DEFAULT 0')],
        'configuracion': [('dias_laborables', "VARCHAR(20) DEFAULT '0,1,2,3,4'"), ('limite_permisos', 'INTEGER DEFAULT 3')],
        'clases_horario': [('curso', 'VARCHAR(80)'), ('tipo', "VARCHAR(20) DEFAULT 'clase'")]
    }
    for tabla, columnas in cambios.items():
        existentes = {columna['name'] for columna in inspector.get_columns(tabla)}
        for nombre, definicion in columnas:
            if nombre not in existentes:
                db.session.execute(text(f'ALTER TABLE {tabla} ADD COLUMN {nombre} {definicion}'))
    db.session.commit()

# --- Funciones de Utilidad ---

def get_local_ip():
    """Obtiene la dirección IP local activa de la máquina."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Se utiliza un destino externo únicamente para determinar la interfaz de red activa.
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        # En caso de error, se devuelve una dirección de loopback como respaldo.
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

def generar_contrasena_aleatoria(longitud=12):
    """Genera una contraseña segura con caracteres alfanuméricos y símbolos."""
    caracteres = string.ascii_letters + string.digits + "!@#$%&*"
    return ''.join(secrets.choice(caracteres) for _ in range(longitud))

def cargar_efemerides_iniciales():
    """Puebla la base de datos con fechas institucionales y feriados predefinidos."""
    efemerides = [
        {"titulo": "Inicio Frente Cívico-Militar", "fecha": "2026-01-01", "tipo": "institucional"},
        {"titulo": "Muerte Gral. Ezequiel Zamora", "fecha": "2026-01-10", "tipo": "institucional"},
        {"titulo": "Día de la Divina Pastora", "fecha": "2026-01-14", "tipo": "institucional"},
        {"titulo": "Día del Maestro", "fecha": "2026-01-15", "tipo": "institucional"},
        {"titulo": "Día inicio de la democracia", "fecha": "2026-01-23", "tipo": "institucional"},
        {"titulo": "Día Virgen de La Candelaria", "fecha": "2026-02-02", "tipo": "institucional"},
        {"titulo": "Natalicio Antonio José de Sucre", "fecha": "2026-02-03", "tipo": "institucional"},
        {"titulo": "Natalicio Daniel Florencio O'Leary", "fecha": "2026-02-04", "tipo": "institucional"},
        {"titulo": "Día de la Juventud/Batalla La Victoria", "fecha": "2026-02-12", "tipo": "institucional"},
        {"titulo": "El Caracazo", "fecha": "2026-02-27", "tipo": "institucional"},
        {"titulo": "Día Internacional de la Mujer", "fecha": "2026-03-08", "tipo": "institucional"},
        {"titulo": "Día del Médico/Natalicio J.M. Vargas", "fecha": "2026-03-10", "tipo": "institucional"},
        {"titulo": "Día Mundial del Agua", "fecha": "2026-03-22", "tipo": "institucional"},
        {"titulo": "Día Mundial de la Salud", "fecha": "2026-04-07", "tipo": "institucional"},
        {"titulo": "Día del Panamericanismo", "fecha": "2026-04-14", "tipo": "institucional"},
        {"titulo": "Primer Grito de Independencia", "fecha": "2026-04-19", "tipo": "feriado"},
        {"titulo": "Día de la Tierra", "fecha": "2026-04-22", "tipo": "institucional"},
        {"titulo": "Día del Idioma y del Libro", "fecha": "2026-04-23", "tipo": "institucional"},
        {"titulo": "Día Internacional del Trabajador", "fecha": "2026-05-01", "tipo": "feriado"},
        {"titulo": "Fiesta de la Cruz de Mayo", "fecha": "2026-05-03", "tipo": "institucional"},
        {"titulo": "Día Internacional de la Cruz Roja", "fecha": "2026-05-08", "tipo": "institucional"},
        {"titulo": "Día de la Enfermera", "fecha": "2026-05-12", "tipo": "institucional"},
        {"titulo": "Día del Himno Nacional", "fecha": "2026-05-25", "tipo": "institucional"},
        {"titulo": "Día Internacional del Ambiente", "fecha": "2026-06-05", "tipo": "institucional"},
        {"titulo": "Batalla de Carabobo/Día del Ejército", "fecha": "2026-06-24", "tipo": "feriado"},
        {"titulo": "Día del Periodista", "fecha": "2026-06-27", "tipo": "institucional"},
        {"titulo": "Fallecimiento José Gregorio Hernández", "fecha": "2026-06-29", "tipo": "institucional"},
        {"titulo": "Firma Acta de Independencia", "fecha": "2026-07-05", "tipo": "feriado"},
        {"titulo": "Día Virgen del Carmen", "fecha": "2026-07-16", "tipo": "institucional"},
        {"titulo": "Natalicio Bolívar/Batalla Naval Lago", "fecha": "2026-07-24", "tipo": "feriado"},
        {"titulo": "Fundación de Caracas", "fecha": "2026-07-25", "tipo": "institucional"},
        {"titulo": "Día de la Bandera Nacional", "fecha": "2026-08-03", "tipo": "institucional"},
        {"titulo": "Natalicio Andrés Eloy Blanco", "fecha": "2026-08-04", "tipo": "institucional"},
        {"titulo": "Día del Lic. en Administración", "fecha": "2026-08-26", "tipo": "institucional"},
        {"titulo": "Nacionalización del petróleo", "fecha": "2026-08-29", "tipo": "institucional"},
        {"titulo": "Aparición Virgen de Coromoto", "fecha": "2026-09-08", "tipo": "institucional"},
        {"titulo": "Fundación de la OPEP", "fecha": "2026-09-14", "tipo": "institucional"},
        {"titulo": "Día Preservación Capa de Ozono", "fecha": "2026-09-16", "tipo": "institucional"},
        {"titulo": "Día Internacional de la Paz", "fecha": "2026-09-21", "tipo": "institucional"},
        {"titulo": "Día de la Resistencia Indígena", "fecha": "2026-10-12", "tipo": "feriado"},
        {"titulo": "Natalicio Rafael Urdaneta/Día ONU", "fecha": "2026-10-24", "tipo": "institucional"},
        {"titulo": "Natalicio José Gregorio Hernández", "fecha": "2026-10-26", "tipo": "institucional"},
        {"titulo": "Natalicio Simón Rodríguez", "fecha": "2026-10-28", "tipo": "institucional"},
        {"titulo": "Día de los Fieles Difuntos", "fecha": "2026-11-02", "tipo": "institucional"},
        {"titulo": "Día Virgen de la Chiquinquirá/Alimentación", "fecha": "2026-11-18", "tipo": "institucional"},
        {"titulo": "Día del Estudiante Universitario", "fecha": "2026-11-21", "tipo": "institucional"},
        {"titulo": "Día contra Violencia a la Mujer", "fecha": "2026-11-25", "tipo": "institucional"},
        {"titulo": "Día Mundial contra el SIDA", "fecha": "2026-12-01", "tipo": "institucional"},
        {"titulo": "Día del Profesor Universitario", "fecha": "2026-12-05", "tipo": "institucional"},
        {"titulo": "Día Declaración Derechos Humanos", "fecha": "2026-12-10", "tipo": "institucional"},
        {"titulo": "Muerte del Libertador Simón Bolívar", "fecha": "2026-12-17", "tipo": "institucional"}
    ]
    
    for efem in efemerides:
        fecha_dt = datetime.strptime(efem["fecha"], '%Y-%m-%d')
        # Se asegura que no se creen entradas duplicadas en la tabla de eventos.
        if not Evento.query.filter_by(titulo=efem["titulo"], fecha_inicio=fecha_dt).first():
            nuevo = Evento(titulo=efem["titulo"], fecha_inicio=fecha_dt, fecha_fin=fecha_dt, tipo=efem["tipo"])
            db.session.add(nuevo)
    db.session.commit()

# --- Inicialización del Entorno ---
with app.app_context():
    # Crea las tablas en la base de datos si aún no existen.
    db.create_all()
    actualizar_esquema_existente()
    # Inserta el calendario de efemérides institucionales si no existen registros.
    cargar_efemerides_iniciales()
    
    # Asegura que exista una configuración global para la hora de entrada.
    if not Configuracion.query.first():
        db.session.add(Configuracion(hora_entrada_oficial="07:30", dias_laborables='0,1,2,3,4', limite_permisos=3))
        
    # Crea un usuario directivo por defecto cuando la aplicación se instala por primera vez.
    if not Usuario.query.filter_by(correo='director@institucion.edu').first():
        dir_user = Usuario(nombre='Director', apellido='General', correo='director@institucion.edu', rol='directivo')
        dir_user.set_password('admin123')
        db.session.add(dir_user)
    db.session.commit()

# --- Rutas de Autenticación ---

@app.route('/', methods=['GET', 'POST'])
def login():
    """Gestiona el acceso de usuarios y su redirección final según rol o destino original."""
    next_url = request.args.get('next') or request.form.get('next')
    if request.method == 'POST':
        correo = request.form['correo']
        password = request.form['password']
        usuario = Usuario.query.filter_by(correo=correo).first()
        
        if usuario and usuario.check_password(password):
            session['usuario_id'] = usuario.id
            session['nombre'] = f"{usuario.nombre} {usuario.apellido}"
            session['rol'] = usuario.rol
            if next_url and next_url.startswith('/'):
                return redirect(next_url)
            return redirect(url_for('dashboard_directivo' if usuario.rol == 'directivo' else 'dashboard_personal'))
        
        return render_template('login.html', error="Credenciales de acceso inválidas.", next=next_url)
    return render_template('login.html', next=next_url)

# --- Paneles de Control (Dashboards) ---

@app.route('/directivo/reporte')
def reporte_asistencia():
    """Genera reportes de asistencia filtrados por diversos criterios."""
    if session.get('rol') != 'directivo':
        return redirect(url_for('login'))
    
    # Obtiene los filtros que el directivo puede aplicar sobre los registros.
    rol_filtro = request.args.get('rol')
    usuario_id_filtro = request.args.get('usuario_id')
    tipo_registro = request.args.get('tipo_registro')
    fecha_inicio = request.args.get('fecha_inicio')
    fecha_fin = request.args.get('fecha_fin')
    
    # Inicia la consulta sobre asistencias y une la tabla de usuarios.
    query = AsistenciaDiaria.query.join(Usuario)
    
    if rol_filtro and rol_filtro != 'todos':
        query = query.filter(Usuario.rol == rol_filtro)
    if usuario_id_filtro and usuario_id_filtro != 'todos':
        query = query.filter(Usuario.id == usuario_id_filtro)
    if tipo_registro == 'inasistencias':
        query = query.filter(AsistenciaDiaria.estado.in_([
            'Ausente',
            'Inasistencia Reportada',
            'Inasistencia Aprobada',
            'Inasistencia Rechazada'
        ]))
    elif tipo_registro == 'asistencias':
        query = query.filter(AsistenciaDiaria.estado.notin_([
            'Ausente',
            'Inasistencia Reportada',
            'Inasistencia Aprobada',
            'Inasistencia Rechazada'
        ]))
    
    if fecha_inicio:
        query = query.filter(AsistenciaDiaria.fecha >= datetime.strptime(fecha_inicio, '%Y-%m-%d').date())
    if fecha_fin:
        query = query.filter(AsistenciaDiaria.fecha <= datetime.strptime(fecha_fin, '%Y-%m-%d').date())
        
    # Ordena los resultados por la hora de registro más reciente.
    asistencias = query.order_by(AsistenciaDiaria.hora_registro.desc()).all()
    todos_los_usuarios = Usuario.query.order_by(Usuario.apellido).all()
    
    return render_template(
        'reporte.html',
        asistencias=asistencias,
        usuarios=todos_los_usuarios,
        selected_rol=rol_filtro or 'todos',
        selected_usuario_id=usuario_id_filtro or 'todos',
        selected_tipo_registro=tipo_registro or 'todos',
        fecha_inicio=fecha_inicio or '',
        fecha_fin=fecha_fin or ''
    )

@app.route('/directivo')
def dashboard_directivo():
    """Panel principal del directivo: muestra resumen operativo del día y gestión de justificaciones."""
    if session.get('rol') != 'directivo':
        return redirect(url_for('login'))

<<<<<<< HEAD
    hoy = datetime.now()
=======
    hoy = ahora_venezuela()
>>>>>>> 441bf2c (nose que ahi aqui)
    fecha_hoy = hoy.date()

    registros_hoy = AsistenciaDiaria.query.filter_by(fecha=fecha_hoy).all()
    registros_a_tiempo = [r for r in registros_hoy if r.estado == 'A tiempo']
    registros_tarde = [r for r in registros_hoy if r.estado == 'Tarde']
    solicitudes_pendientes = [r for r in registros_hoy if r.estado == 'Inasistencia Reportada']
<<<<<<< HEAD
=======
    permisos_pendientes = Permiso.query.filter_by(estado='Pendiente').order_by(Permiso.fecha_inicio).all()
>>>>>>> 441bf2c (nose que ahi aqui)
    inasistencias_aprobadas = [r for r in registros_hoy if r.estado == 'Inasistencia Aprobada']
    inasistencias_rechazadas = [r for r in registros_hoy if r.estado == 'Inasistencia Rechazada']

    # Selecciona los usuarios con cumpleaños en la fecha actual.
    cumpleaneros = Usuario.query.filter(
        extract('month', Usuario.fecha_nacimiento) == hoy.month,
        extract('day', Usuario.fecha_nacimiento) == hoy.day
    ).all()

    # Eventos relevantes del día y próximos 7 días.
    inicio_semana = datetime.combine(fecha_hoy, datetime.min.time())
    fin_semana = inicio_semana + timedelta(days=7)
    eventos_externos = Evento.query.filter(
        Evento.tipo != 'clase',
        Evento.fecha_inicio >= inicio_semana,
        Evento.fecha_inicio < fin_semana
    ).order_by(Evento.fecha_inicio.asc()).all()

    profesores = Usuario.query.filter_by(rol='personal').all()
    return render_template(
        'director.html',
        profesores=profesores,
        cumpleaneros=cumpleaneros,
        eventos_externos=eventos_externos,
        registros_hoy=registros_hoy,
        registros_a_tiempo=registros_a_tiempo,
        registros_tarde=registros_tarde,
        solicitudes_pendientes=solicitudes_pendientes,
<<<<<<< HEAD
=======
        permisos_pendientes=permisos_pendientes,
>>>>>>> 441bf2c (nose que ahi aqui)
        inasistencias_aprobadas=inasistencias_aprobadas,
        inasistencias_rechazadas=inasistencias_rechazadas,
        fecha_hoy=fecha_hoy
    )

@app.route('/directivo/planificacion')
def directivo_planificacion():
    """Interfaz para la gestión de actividades."""
    if session.get('rol') != 'directivo': return redirect(url_for('login'))
    profesores = Usuario.query.filter_by(rol='personal').all()
    return render_template('director_planificacion.html', profesores=profesores)

@app.route('/directivo/usuarios')
def directivo_usuarios():
    """Administración de usuarios (registro, edición, eliminación)."""
    if session.get('rol') != 'directivo': return redirect(url_for('login'))
    personal_lista = Usuario.query.filter(Usuario.rol != 'directivo').all()
    return render_template('director_usuarios.html', personal_lista=personal_lista)

@app.route('/directivo/configuracion_vista')
def directivo_configuracion():
    """Interfaz de configuración institucional."""
    if session.get('rol') != 'directivo': return redirect(url_for('login'))
    config = Configuracion.query.first()
    return render_template('director_configuracion.html', config=config)

@app.route('/personal')
def dashboard_personal():
    """Panel del personal con su historial de asistencias."""
    if not session.get('usuario_id'): return redirect(url_for('login'))
    
    mis_registros = AsistenciaDiaria.query.filter_by(
        usuario_id=session['usuario_id']
    ).order_by(AsistenciaDiaria.fecha.desc()).all()
    
    config = Configuracion.query.first()
    usuario = Usuario.query.get(session['usuario_id'])
    permisos_usados = Permiso.query.filter_by(usuario_id=usuario.id).filter(Permiso.estado != 'Rechazado').count()
    return render_template('personal.html', mis_registros=mis_registros, usuario=usuario, config=config,
                           permisos_usados=permisos_usados)

# --- Gestión de Datos y Acciones ---

@app.route('/directivo/configurar_hora', methods=['POST'])
def configurar_hora():
    """Actualiza la hora de entrada en la base de datos."""
    if session.get('rol') != 'directivo':
        return redirect(url_for('login'))
    config = Configuracion.query.first()
    if not config:
        config = Configuracion(hora_entrada_oficial="07:30")
        db.session.add(config)

    nueva_hora = request.form.get('hora_entrada')
    nueva_salida = request.form.get('hora_salida') or '15:30'
    nuevos_dias = request.form.getlist('dias_laborables')
    limite_permisos = request.form.get('limite_permisos', '3')
    try:
        datetime.strptime(nueva_hora, '%H:%M')
        datetime.strptime(nueva_salida, '%H:%M')
        if not 0 <= int(limite_permisos):
            raise ValueError
        config.hora_entrada_oficial = nueva_hora
        config.dias_laborables = ','.join(nuevos_dias) or '0,1,2,3,4'
        config.limite_permisos = int(limite_permisos)
        db.session.commit()
        flash('La hora de entrada oficial fue modificada correctamente.', 'success')
    except (ValueError, TypeError):
        flash('Revise las horas, los días laborables y el límite de permisos.', 'danger')
    return redirect(url_for('directivo_configuracion'))
@app.route('/directivo/crear_usuario', methods=['POST'])
def crear_usuario():
    """Registra un nuevo usuario con generación de contraseña temporal."""
    if session.get('rol') != 'directivo': return redirect(url_for('login'))
    
    nombre = request.form['nombre']
    apellido = request.form['apellido']
    correo = request.form['correo']
    rol = request.form['rol']
    departamento = request.form.get('departamento', '').strip() or None
    telefono = request.form.get('telefono')
    fecha_nac = request.form.get('fecha_nacimiento')
    hora_entrada = request.form.get('hora_entrada') or '07:30'
    hora_salida = request.form.get('hora_salida') or '15:30'
    
    # Evita la creación de un usuario con correo duplicado.
    if Usuario.query.filter_by(correo=correo).first():
        flash('El correo electrónico institucional ya existe.', 'danger')
        return redirect(url_for('directivo_usuarios'))
    
    password_plano = generar_contrasena_aleatoria()
    
    fecha_nacimiento = None
    if fecha_nac:
        try:
            fecha_nacimiento = datetime.strptime(fecha_nac, '%Y-%m-%d')
        except ValueError:
            flash('La fecha de nacimiento no tiene el formato esperado.', 'danger')
            return redirect(url_for('directivo_usuarios'))

    try:
        datetime.strptime(hora_entrada, '%H:%M')
        datetime.strptime(hora_salida, '%H:%M')
    except ValueError:
        flash('El horario debe usar el formato HH:MM.', 'danger')
        return redirect(url_for('directivo_usuarios'))

    nuevo_usuario = Usuario(
        nombre=nombre, apellido=apellido, correo=correo, rol=rol,
        telefono=telefono,
        fecha_nacimiento=fecha_nacimiento,
        departamento=departamento,
        hora_entrada=hora_entrada,
        hora_salida=hora_salida
    )
    nuevo_usuario.set_password(password_plano)
    db.session.add(nuevo_usuario)
    db.session.commit()
    
    flash(f'Personal creado. Contraseña: {password_plano}', 'success')
    return redirect(url_for('directivo_usuarios'))

@app.route('/directivo/editar_usuario/<int:id>', methods=['POST'])
def editar_usuario(id):
    """Actualiza los datos de un usuario existente."""
    if session.get('rol') != 'directivo': return redirect(url_for('login'))
    usuario = Usuario.query.get_or_404(id)
    usuario.nombre = request.form['nombre']
    usuario.apellido = request.form['apellido']
    usuario.rol = request.form['rol']
    usuario.departamento = request.form.get('departamento', '').strip() or None
    usuario.telefono = request.form.get('telefono')
    usuario.hora_entrada = request.form.get('hora_entrada') or usuario.hora_entrada
    usuario.hora_salida = request.form.get('hora_salida') or usuario.hora_salida
    db.session.commit()
    flash('Personal actualizado correctamente.', 'success')
    return redirect(url_for('directivo_usuarios'))

@app.route('/directivo/eliminar_usuario/<int:id>')
def eliminar_usuario(id):
    """Elimina personal del sistema."""
    if session.get('rol') != 'directivo': return redirect(url_for('login'))
    usuario = Usuario.query.get_or_404(id)
    db.session.delete(usuario)
    db.session.commit()
    flash('Personal eliminado del sistema.', 'danger')
    return redirect(url_for('directivo_usuarios'))

# --- Asistencia y QR ---

@app.route('/directivo/generar_qr')
def generar_qr():
    """Genera la imagen del QR usando la IP real de la red local."""
    if session.get('rol') != 'directivo': return redirect(url_for('login'))
    
    # Determina el host y el puerto usados por la petición actual.
    host = request.host.split(':')[0]
    port = request.host.split(':')[1] if ':' in request.host else '80'
    if host in ('127.0.0.1', 'localhost'):
        host_ip = get_local_ip()
        base_url = f"http://{host_ip}:{port}"
    else:
        base_url = request.host_url.rstrip('/')
    enlace_registro = f"{base_url}{url_for('registrar_asistencia')}"
    
    # Construye el código QR; preferimos SVG para evitar depender de PIL.
    qr = qrcode.QRCode(version=1, box_size=10, border=2)
    qr.add_data(enlace_registro)
    qr.make(fit=True)

    qr_svg = None
    qr_b64 = None
    try:
        # Intentamos generar SVG (no necesita Pillow)
        import qrcode.image.svg as qsvg
        img = qr.make_image(image_factory=qsvg.SvgImage)
        buf = io.BytesIO()
        img.save(buf)
        qr_svg = buf.getvalue().decode('utf-8')
        # Algunos backends SVG incluyen una cabecera XML prolog que rompe
        # el render inline cuando se inserta dentro de HTML. La eliminamos.
        if qr_svg.lstrip().startswith('<?xml'):
            idx = qr_svg.find('<svg')
            if idx != -1:
                qr_svg = qr_svg[idx:]
    except Exception:
        # Fallback a PNG (requiere Pillow). Si Pillow no está instalado, esto lanzará el error original.
        img = qr.make_image(fill_color="#002147", back_color="white")
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        qr_b64 = base64.b64encode(buf.getvalue()).decode('utf-8')

    qr_svg_b64 = None
    if qr_svg:
        try:
            qr_svg_b64 = base64.b64encode(qr_svg.encode('utf-8')).decode('utf-8')
        except Exception:
            qr_svg_b64 = None

    return render_template('qr_panel.html', qr_code=qr_b64, qr_svg=qr_svg, qr_svg_b64=qr_svg_b64)

@app.route('/asistencia/registrar', methods=['GET'])
def registrar_asistencia():
    """Evalúa la puntualidad, registra y devuelve una respuesta útil tanto para navegación como para AJAX."""
    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'

    # 1. Si no hay sesión, redirige al login preservando la ruta original.
    if not session.get('usuario_id'):
        message = 'Inicie sesión en su teléfono para escanear el QR.'
        if is_ajax:
            return jsonify({'ok': False, 'message': message, 'redirect': url_for('login', next=request.path)})
        flash(message, 'warning')
        return redirect(url_for('login', next=request.path))

    usuario_id = session['usuario_id']
<<<<<<< HEAD
    fecha_hoy = datetime.now().date()
=======
    fecha_hoy = ahora_venezuela().date()
>>>>>>> 441bf2c (nose que ahi aqui)

    # 2. Si la asistencia ya fue registrada hoy, no permite duplicados.
    existe = AsistenciaDiaria.query.filter_by(usuario_id=usuario_id, fecha=fecha_hoy).first()
    if existe:
        message = 'Ya habías registrado tu asistencia el día de hoy.'
        if is_ajax:
            return jsonify({'ok': False, 'message': message, 'already_registered': True})
        flash(message, 'info')
        return redirect(url_for('dashboard_personal'))

    # 3. Determina el estado de puntualidad a partir de la configuración actual.
    momento = ahora_venezuela()
    hora_actual = momento.time()
    config = Configuracion.query.first()
    if fecha_hoy.weekday() not in dias_laborables(config):
        mensaje = 'Hoy no es un día laborable configurado.'
        if is_ajax:
            return jsonify({'ok': False, 'message': mensaje})
        flash(mensaje, 'info')
        return redirect(url_for('dashboard_personal'))

    hora_entrada, _ = horario_de_usuario(Usuario.query.get(usuario_id), fecha_hoy, config)
    hora_limite = datetime.strptime(hora_entrada, "%H:%M").time()
    limite_dt = datetime.combine(fecha_hoy, hora_limite)
    minutos_retraso = max(0, int((momento - limite_dt).total_seconds() // 60))
    estado = "A tiempo" if hora_actual <= hora_limite else "Tarde"

    nueva_asistencia = AsistenciaDiaria(
        usuario_id=usuario_id, fecha=fecha_hoy, hora_registro=momento, estado=estado,
        minutos_retraso=minutos_retraso
    )
    db.session.add(nueva_asistencia)
    db.session.commit()

    # 4. Para peticiones AJAX, devolvemos JSON; para navegación directa, seguimos mostrando la página de confirmación.
    icono = "✅" if estado == "A tiempo" else "⚠️"
    color_texto = "#198754" if estado == "A tiempo" else "#ffc107"
<<<<<<< HEAD
    hora_str = datetime.now().strftime('%I:%M %p')
=======
    hora_str = momento.strftime('%I:%M %p')
>>>>>>> 441bf2c (nose que ahi aqui)

    if is_ajax:
        return jsonify({'ok': True, 'message': 'Asistencia registrada correctamente.', 'estado': estado, 'hora': hora_str})

    return f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="refresh" content="3;url=/personal" />
        <title>Asistencia Registrada</title>
    </head>
    <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px 20px; background-color: #f8f9fa; height: 100vh; margin: 0;">
        <div style="background: white; padding: 40px 20px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto;">
            <h1 style="font-size: 70px; margin: 0;">{icono}</h1>
            <h2 style="color: #333; margin-top: 15px;">¡Registro Exitoso!</h2>
            <div style="background-color: #f1f4f8; padding: 15px; border-radius: 10px; margin: 20px 0;">
                <p style="margin: 5px 0; color: #555; font-size: 18px;">Estatus: <strong style="color: {color_texto};">{estado}</strong></p>
                <p style="margin: 5px 0; color: #555; font-size: 18px;">Hora: <strong>{hora_str}</strong></p>
            </div>
            <p style="color: #6c757d; font-size: 14px;">Abriendo tu panel en 3 segundos...</p>
        </div>
    </body>
    </html>
    """

@app.route('/api/eventos')
def api_eventos():
    """JSON API que devuelve los eventos del calendario."""
    profesor_id = request.args.get('profesor_id')
    query = Evento.query
    
    if session.get('rol') == 'personal':
        usuario_id = session.get('usuario_id')
        query = query.filter((Evento.tipo != 'clase') | (Evento.profesor_id == usuario_id))
    elif profesor_id and profesor_id != 'todos':
        query = query.filter((Evento.tipo != 'clase') | (Evento.profesor_id == int(profesor_id)))
        
    eventos = query.all()
    colores = {'clase': '#0d6efd', 'feriado': '#dc3545', 'institucional': '#ffc107'}
    
    resultado = [{
        'id': e.id, 'title': e.titulo, 'start': e.fecha_inicio.isoformat(),
        'end': e.fecha_fin.isoformat(), 'backgroundColor': colores.get(e.tipo, '#6c757d'),
        'borderColor': colores.get(e.tipo, '#6c757d'), 'extendedProps': {'tipo': e.tipo}
    } for e in eventos]
    
    return jsonify(resultado)

@app.route('/api/evento/<int:evento_id>')
def api_obtener_evento(evento_id):
    """Devuelve datos de un evento específico para edición."""
    if not session.get('rol'): return jsonify({'status': 'error'}), 403
    evento = Evento.query.get_or_404(evento_id)
    return jsonify({
        'id': evento.id, 'titulo': evento.titulo,
        'fecha_inicio': evento.fecha_inicio.strftime('%Y-%m-%dT%H:%M'),
        'fecha_fin': evento.fecha_fin.strftime('%Y-%m-%dT%H:%M'),
        'tipo': evento.tipo, 'profesor_id': evento.profesor_id
    })

@app.route('/directivo/crear_evento', methods=['POST'])
def crear_evento():
    """Guarda un nuevo evento en la agenda."""
    if session.get('rol') != 'directivo': return redirect(url_for('login'))
    
    try:
        fecha_inicio = datetime.strptime(request.form['fecha_inicio'], '%Y-%m-%dT%H:%M')
        fecha_fin = datetime.strptime(request.form['fecha_fin'], '%Y-%m-%dT%H:%M')
    except (ValueError, TypeError):
        flash('Fechas no válidas. Use el selector de fecha y hora correctamente.', 'danger')
        return redirect(url_for('directivo_planificacion'))

    profesor_id = None
    if request.form.get('tipo') == 'clase' and request.form.get('profesor_id'):
        try:
            profesor_id = int(request.form['profesor_id'])
        except ValueError:
            profesor_id = None

    nuevo_evento = Evento(
        titulo=request.form['titulo'],
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        tipo=request.form['tipo'],
        profesor_id=profesor_id
    )
    db.session.add(nuevo_evento)
    db.session.commit()
    return redirect(url_for('directivo_planificacion'))

@app.route('/directivo/modificar_evento', methods=['POST'])
def modificar_evento():
    """Edita un evento existente."""
    if session.get('rol') != 'directivo': return redirect(url_for('login'))
    evento = Evento.query.get_or_404(request.form.get('evento_id'))
    
    evento.titulo = request.form['titulo']
    evento.fecha_inicio = datetime.strptime(request.form['fecha_inicio'], '%Y-%m-%dT%H:%M')
    evento.fecha_fin = datetime.strptime(request.form['fecha_fin'], '%Y-%m-%dT%H:%M')
    evento.tipo = request.form['tipo']
    evento.profesor_id = int(request.form['profesor_id']) if (evento.tipo == 'clase' and request.form.get('profesor_id')) else None
        
    db.session.commit()
    return redirect(url_for('dashboard_directivo'))

# --- Sesión ---

@app.route('/directivo/inasistencia/<int:asistencia_id>/aprobar', methods=['POST'])
def aprobar_inasistencia(asistencia_id):
    """Aprueba una justificación de inasistencia desde la consola directiva."""
    if session.get('rol') != 'directivo':
        return redirect(url_for('login'))

    registro = AsistenciaDiaria.query.get_or_404(asistencia_id)
    registro.estado = 'Inasistencia Aprobada'
    db.session.commit()
    flash('La justificación fue aprobada correctamente.', 'success')
    return redirect(request.referrer or url_for('dashboard_directivo'))

@app.route('/directivo/inasistencia/<int:asistencia_id>/rechazar', methods=['POST'])
def rechazar_inasistencia(asistencia_id):
    """Rechaza una justificación de inasistencia desde la consola directiva."""
    if session.get('rol') != 'directivo':
        return redirect(url_for('login'))

    registro = AsistenciaDiaria.query.get_or_404(asistencia_id)
    registro.estado = 'Inasistencia Rechazada'
    db.session.commit()
    flash('La justificación fue rechazada.', 'warning')
    return redirect(request.referrer or url_for('dashboard_directivo'))

<<<<<<< HEAD
=======
@app.route('/personal/solicitar_permiso', methods=['POST'])
def solicitar_permiso():
    if not session.get('usuario_id'):
        return redirect(url_for('login'))
    usuario = Usuario.query.get(session['usuario_id'])
    config = Configuracion.query.first()
    usados = Permiso.query.filter_by(usuario_id=usuario.id).filter(Permiso.estado != 'Rechazado').count()
    limite = usuario.limite_permisos if usuario.limite_permisos is not None else config.limite_permisos
    if usados >= limite:
        flash(f'Has alcanzado el límite de {limite} permisos.', 'warning')
        return redirect(url_for('dashboard_personal'))
    try:
        fecha_inicio = datetime.strptime(request.form['fecha_inicio'], '%Y-%m-%d').date()
        fecha_fin = datetime.strptime(request.form['fecha_fin'], '%Y-%m-%d').date()
        if fecha_fin < fecha_inicio:
            raise ValueError
    except (KeyError, ValueError):
        flash('El rango de fechas del permiso no es válido.', 'danger')
        return redirect(url_for('dashboard_personal'))
    archivo = request.files.get('archivo')
    ruta_archivo = None
    if archivo and archivo.filename:
        ruta_archivo = secure_filename(archivo.filename)
        archivo.save(os.path.join(app.config['UPLOAD_FOLDER'], ruta_archivo))
    db.session.add(Permiso(usuario_id=usuario.id, fecha_inicio=fecha_inicio, fecha_fin=fecha_fin,
                            motivo=request.form.get('motivo', 'Otro'),
                            observaciones=request.form.get('observaciones'), archivo_adjunto=ruta_archivo))
    db.session.commit()
    flash('Solicitud de permiso enviada. No generará inasistencia mientras esté pendiente.', 'success')
    return redirect(url_for('dashboard_personal'))

@app.route('/directivo/permiso/<int:permiso_id>/<accion>', methods=['POST'])
def resolver_permiso(permiso_id, accion):
    if session.get('rol') != 'directivo' or accion not in ('aprobar', 'rechazar'):
        return redirect(url_for('login'))
    permiso = Permiso.query.get_or_404(permiso_id)
    permiso.estado = 'Aprobado' if accion == 'aprobar' else 'Rechazado'
    db.session.commit()
    flash(f'Permiso {permiso.estado.lower()} correctamente.', 'success')
    return redirect(request.referrer or url_for('dashboard_directivo'))

@app.route('/directivo/registrar_asistencia_manual', methods=['POST'])
def registrar_asistencia_manual():
    if session.get('rol') != 'directivo':
        return redirect(url_for('login'))
    try:
        usuario_id = int(request.form['usuario_id'])
        fecha = datetime.strptime(request.form['fecha'], '%Y-%m-%d').date()
        hora = datetime.strptime(request.form['hora'], '%H:%M')
    except (KeyError, ValueError):
        flash('Los datos del registro manual no son válidos.', 'danger')
        return redirect(url_for('dashboard_directivo'))
    if AsistenciaDiaria.query.filter_by(usuario_id=usuario_id, fecha=fecha).first():
        flash('Ya existe un registro para esa persona y fecha.', 'warning')
        return redirect(url_for('dashboard_directivo'))
    usuario = Usuario.query.get_or_404(usuario_id)
    config = Configuracion.query.first()
    hora_entrada, _ = horario_de_usuario(usuario, fecha, config)
    limite = datetime.strptime(hora_entrada, '%H:%M')
    minutos = max(0, int((hora - limite).total_seconds() // 60))
    estado = 'Tarde' if minutos else 'A tiempo'
    db.session.add(AsistenciaDiaria(usuario_id=usuario_id, fecha=fecha,
                                    hora_registro=datetime.combine(fecha, hora.time()), estado=estado,
                                    minutos_retraso=minutos, registrada_manualmente=True))
    db.session.commit()
    flash('Asistencia manual registrada correctamente.', 'success')
    return redirect(url_for('dashboard_directivo'))

>>>>>>> 441bf2c (nose que ahi aqui)
@app.route('/logout')
def logout():
    """Cierra la sesión actual."""
    session.clear()
    return redirect(url_for('login'))

@app.route('/personal/registrar_inasistencia', methods=['POST'])
def registrar_inasistencia():
    """Registra una inasistencia (justificada) para el usuario logueado con archivo adjunto."""
    if not session.get('usuario_id'): return redirect(url_for('login'))
    
    usuario_id = session['usuario_id']
    fecha_hoy = ahora_venezuela().date()
    
    # Impide registrar una inasistencia si ya existe un registro para hoy.
    existe = AsistenciaDiaria.query.filter_by(usuario_id=usuario_id, fecha=fecha_hoy).first()
    if existe:
        flash('Ya tienes un registro para hoy.', 'warning')
        return redirect(url_for('dashboard_personal'))
        
    # Procesa el archivo adjunto cuando existe en el formulario.
    archivo = request.files.get('archivo')
    ruta_archivo = None
    if archivo and archivo.filename != '':
        filename = secure_filename(archivo.filename)
        archivo_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        archivo.save(archivo_path)
        ruta_archivo = filename
    
    # Inserta el registro de inasistencia con los detalles proporcionados.
    nueva_inasistencia = AsistenciaDiaria(
        usuario_id=usuario_id, 
        fecha=fecha_hoy, 
        hora_registro=datetime.now(), 
        estado="Inasistencia Reportada",
        motivo=request.form.get('motivo'),
        observaciones=request.form.get('observaciones'),
        archivo_adjunto=ruta_archivo
    )
    db.session.add(nueva_inasistencia)
    db.session.commit()
    
    flash('Inasistencia reportada correctamente.', 'success')
    return redirect(url_for('dashboard_personal'))

if __name__ == '__main__':
    # Ejecuta la aplicación
    app.run(debug=True, host='0.0.0.0', port=8080)  # Cambié el puerto a 8080 para evitar conflictos con otros servicios