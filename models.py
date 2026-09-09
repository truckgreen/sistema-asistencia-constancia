from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

# Inicialización de la extensión SQLAlchemy
db = SQLAlchemy()

# models.py
class Usuario(db.Model):
    __tablename__ = 'usuarios'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(50), nullable=False)
    apellido = db.Column(db.String(50), nullable=False)
    correo = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    
    # Campos adicionales que complementan el perfil del usuario.
    telefono = db.Column(db.String(20))
    fecha_nacimiento = db.Column(db.Date)

    # Jornada individual; se usa como respaldo cuando no hay un horario por día.
    hora_entrada = db.Column(db.String(5), default='07:30')
    hora_salida = db.Column(db.String(5), default='15:30')
    limite_permisos = db.Column(db.Integer, default=3)
    
    rol = db.Column(db.String(30), nullable=False)
    departamento = db.Column(db.String(80))

    # Relación con asistencias: elimina los registros asociados cuando se borra el usuario.
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
    Modelo para el calendario académico.
    Registra eventos institucionales, feriados y clases programadas.
    """
    __tablename__ = 'eventos'
    id = db.Column(db.Integer, primary_key=True)
    titulo = db.Column(db.String(150), nullable=False)
    fecha_inicio = db.Column(db.DateTime, nullable=False)
    fecha_fin = db.Column(db.DateTime, nullable=False)
    
    # Tipos admitidos: 'clase', 'feriado', 'institucional'
    tipo = db.Column(db.String(30), nullable=False) 
    
    # Relación opcional: vincula un evento con un profesor específico.
    profesor_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)


class AsistenciaDiaria(db.Model):
    """
    Modelo para el control de asistencia.
    Almacena el registro diario de cada usuario a partir del escaneo del QR.
    """
    __tablename__ = 'asistencias_diarias'
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    
    # Registra el día del evento para evitar registros duplicados en la misma jornada.
    fecha = db.Column(db.Date, default=datetime.now().date)
    
    # Almacena la fecha y hora exacta del registro.
    hora_registro = db.Column(db.DateTime, default=datetime.now)
    
    # Estado del registro según puntualidad o justificación.
    estado = db.Column(db.String(20)) 
    minutos_retraso = db.Column(db.Integer, default=0)
    registrada_manualmente = db.Column(db.Boolean, default=False)
    
    # Campos adicionales para gestionar inasistencias justificadas.
    motivo = db.Column(db.String(100))
    observaciones = db.Column(db.Text)
    archivo_adjunto = db.Column(db.String(200))


class Configuracion(db.Model):
    """
    Modelo administrativo para almacenar variables del entorno escolar.
    Permite modificar la hora oficial de entrada desde el panel directivo.
    """
    __tablename__ = 'configuracion'
    id = db.Column(db.Integer, primary_key=True)
    
    # Formato de tiempo de 24 horas (Ej: "07:30")
    hora_entrada_oficial = db.Column(db.String(5), default="07:30")
    dias_laborables = db.Column(db.String(20), default='0,1,2,3,4')
    limite_permisos = db.Column(db.Integer, default=3)


class HorarioPersonal(db.Model):
    __tablename__ = 'horarios_personales'
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    dia_semana = db.Column(db.Integer, nullable=False)  # Lunes=0 ... Domingo=6
    hora_entrada = db.Column(db.String(5), nullable=False)
    hora_salida = db.Column(db.String(5), nullable=False)


class PlantillaHorario(db.Model):
    """Plantilla reutilizable con la jornada semanal de un grupo de personas."""
    __tablename__ = 'plantillas_horario'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False, unique=True)
    descripcion = db.Column(db.String(255))
    activa = db.Column(db.Boolean, default=True, nullable=False)
    detalles = db.relationship('DetallePlantillaHorario', backref='plantilla',
                               cascade='all, delete-orphan', order_by='DetallePlantillaHorario.dia_semana')
    asignaciones = db.relationship('AsignacionHorario', backref='plantilla',
                                   cascade='all, delete-orphan')


class DetallePlantillaHorario(db.Model):
    """Horario de entrada y salida de una plantilla para un día concreto."""
    __tablename__ = 'detalles_plantilla_horario'
    id = db.Column(db.Integer, primary_key=True)
    plantilla_id = db.Column(db.Integer, db.ForeignKey('plantillas_horario.id'), nullable=False)
    dia_semana = db.Column(db.Integer, nullable=False)
    hora_entrada = db.Column(db.String(5), nullable=False)
    hora_salida = db.Column(db.String(5), nullable=False)
    __table_args__ = (db.UniqueConstraint('plantilla_id', 'dia_semana', name='uq_plantilla_dia'),)


class AsignacionHorario(db.Model):
    """Vigencia de una plantilla para un empleado, rol o departamento."""
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
    """Clase recurrente de la jornada semanal de un docente."""
    __tablename__ = 'clases_horario'
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    curso = db.Column(db.String(80))
    nombre = db.Column(db.String(120), nullable=False)
    tipo = db.Column(db.String(20), default='clase', nullable=False)
    dia_semana = db.Column(db.Integer, nullable=False)
    hora_inicio = db.Column(db.String(5), nullable=False)
    hora_fin = db.Column(db.String(5), nullable=False)
    aula = db.Column(db.String(80))


class Permiso(db.Model):
    __tablename__ = 'permisos'
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    fecha_inicio = db.Column(db.Date, nullable=False)
    fecha_fin = db.Column(db.Date, nullable=False)
    motivo = db.Column(db.String(100), nullable=False)
    observaciones = db.Column(db.Text)
    archivo_adjunto = db.Column(db.String(200))
    estado = db.Column(db.String(30), default='Pendiente')
    creado_en = db.Column(db.DateTime, default=datetime.utcnow)