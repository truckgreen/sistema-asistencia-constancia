# ==============================================================================
# PROYECTO DE TESIS DE GRADO / PASANTÍAS
# Sistema de Control de Asistencias, Horarios y Agenda Escolar - U.E. La Constancia
# Archivo: models.py (Modelado de Datos con SQLAlchemy y SQLite)
# ==============================================================================

from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()

class Usuario(db.Model):
    """
    Entidad Usuario: Gestiona las credenciales y fichas laborales del personal
    (Directivo, Personal Docente, Administrativo y Obrero).
    """
    __tablename__ = 'usuarios'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(50), nullable=False)
    apellido = db.Column(db.String(50), nullable=False)
    correo = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    
    telefono = db.Column(db.String(20))
    fecha_nacimiento = db.Column(db.Date)

    hora_entrada = db.Column(db.String(5), default='07:30')
    hora_salida = db.Column(db.String(5), default='15:30')
    limite_permisos = db.Column(db.Integer, default=3)
    
    rol = db.Column(db.String(30), nullable=False) # 'directivo', 'personal', 'administrativo', 'obrero'
    departamento = db.Column(db.String(80))

    asistencias = db.relationship('AsistenciaDiaria', backref='usuario', cascade="all, delete-orphan")
    horarios = db.relationship('HorarioPersonal', backref='usuario', cascade="all, delete-orphan")
    asignaciones_horario = db.relationship('AsignacionHorario', backref='usuario', cascade="all, delete-orphan")
    permisos = db.relationship('Permiso', backref='usuario', cascade="all, delete-orphan")
    clases_horario = db.relationship('ClaseHorario', backref='docente', cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class Evento(db.Model):
    """
    Entidad Evento: Calendario y agenda académica (clases, efemérides y reuniones).
    """
    __tablename__ = 'eventos'
    id = db.Column(db.Integer, primary_key=True)
    titulo = db.Column(db.String(150), nullable=False)
    fecha_inicio = db.Column(db.DateTime, nullable=False)
    fecha_fin = db.Column(db.DateTime, nullable=False)
    tipo = db.Column(db.String(30), nullable=False) # 'clase', 'feriado', 'institucional'
    profesor_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)


class AsistenciaDiaria(db.Model):
    """
    Entidad AsistenciaDiaria: Libro digital de asistencia y auditoría por escaneo de QR.
    """
    __tablename__ = 'asistencias_diarias'
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    fecha = db.Column(db.Date, default=datetime.now().date)
    hora_registro = db.Column(db.DateTime, default=datetime.now)
    estado = db.Column(db.String(30)) # 'A tiempo', 'Tarde', 'Inasistencia Reportada', 'Inasistencia Aprobada', 'Inasistencia Rechazada', 'Ausente'
    minutos_retraso = db.Column(db.Integer, default=0)
    registrada_manualmente = db.Column(db.Boolean, default=False)
    
    motivo = db.Column(db.String(100))
    observaciones = db.Column(db.Text)
    archivo_adjunto = db.Column(db.String(200))


class Configuracion(db.Model):
    """
    Entidad Configuracion: Parámetros operativos institucionales.
    """
    __tablename__ = 'configuracion'
    id = db.Column(db.Integer, primary_key=True)
    hora_entrada_oficial = db.Column(db.String(5), default="07:30")
    hora_salida_oficial = db.Column(db.String(5), default="15:30")
    dias_laborables = db.Column(db.String(20), default='0,1,2,3,4')
    limite_permisos = db.Column(db.Integer, default=3)


class HorarioPersonal(db.Model):
    """
    Entidad HorarioPersonal: Jornada semanal individual de cada funcionario (0=Lun ... 6=Dom).
    """
    __tablename__ = 'horarios_personales'
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    dia_semana = db.Column(db.Integer, nullable=False)
    hora_entrada = db.Column(db.String(5), nullable=False)
    hora_salida = db.Column(db.String(5), nullable=False)


class PlantillaHorario(db.Model):
    """
    Entidad PlantillaHorario: Plantilla reutilizable semanal para roles o departamentos.
    """
    __tablename__ = 'plantillas_horario'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False, unique=True)
    descripcion = db.Column(db.String(255))
    activa = db.Column(db.Boolean, default=True, nullable=False)
    detalles = db.relationship('DetallePlantillaHorario', backref='plantilla', cascade='all, delete-orphan')
    asignaciones = db.relationship('AsignacionHorario', backref='plantilla', cascade='all, delete-orphan')


class DetallePlantillaHorario(db.Model):
    __tablename__ = 'detalles_plantilla_horario'
    id = db.Column(db.Integer, primary_key=True)
    plantilla_id = db.Column(db.Integer, db.ForeignKey('plantillas_horario.id'), nullable=False)
    dia_semana = db.Column(db.Integer, nullable=False)
    hora_entrada = db.Column(db.String(5), nullable=False)
    hora_salida = db.Column(db.String(5), nullable=False)


class AsignacionHorario(db.Model):
    __tablename__ = 'asignaciones_horario'
    id = db.Column(db.Integer, primary_key=True)
    plantilla_id = db.Column(db.Integer, db.ForeignKey('plantillas_horario.id'), nullable=False)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)
    rol = db.Column(db.String(30))
    departamento = db.Column(db.String(80))
    fecha_inicio = db.Column(db.Date, nullable=False)
    fecha_fin = db.Column(db.Date, nullable=True)
    prioridad = db.Column(db.Integer, default=0, nullable=False)
    creada_en = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class ClaseHorario(db.Model):
    """
    Entidad ClaseHorario: Cátedra individual asignada al docente dentro de un curso / grado.
    """
    __tablename__ = 'clases_horario'
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    curso = db.Column(db.String(80))
    nombre = db.Column(db.String(120), nullable=False)
    tipo = db.Column(db.String(20), default='clase', nullable=False) # 'clase', 'receso'
    dia_semana = db.Column(db.Integer, nullable=False)
    hora_inicio = db.Column(db.String(5), nullable=False)
    hora_fin = db.Column(db.String(5), nullable=False)
    aula = db.Column(db.String(80))


class Permiso(db.Model):
    """
    Entidad Permiso: Solicitudes de licencias y ausencias justificadas.
    """
    __tablename__ = 'permisos'
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    fecha_inicio = db.Column(db.Date, nullable=False)
    fecha_fin = db.Column(db.Date, nullable=False)
    motivo = db.Column(db.String(100), nullable=False)
    observaciones = db.Column(db.Text)
    archivo_adjunto = db.Column(db.String(200))
    estado = db.Column(db.String(30), default='Pendiente') # 'Pendiente', 'Aprobado', 'Rechazado'
    creado_en = db.Column(db.DateTime, default=datetime.utcnow)
