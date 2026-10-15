# ==============================================================================
# PROYECTO DE TESIS DE GRADO / PASANTÍAS
# Sistema de Control de Asistencias, Horarios y Agenda Escolar - U.E. La Constancia
# Archivo: app.py (Servidor Principal Flask REST API + SQLite)
# ==============================================================================

import os
from flask import Flask, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from models import (
    db, Usuario, Evento, AsistenciaDiaria, Configuracion,
    HorarioPersonal, PlantillaHorario, DetallePlantillaHorario,
    AsignacionHorario, ClaseHorario, Permiso
)

app = Flask(__name__)
app.config['SECRET_KEY'] = 'clave_secreta_institucional_tesis_constancia_2026'
instance_dir = os.path.join(app.root_path, 'instance')
os.makedirs(instance_dir, exist_ok=True)
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(instance_dir, 'sistema_academico.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

try:
    ZONA_HORARIA = ZoneInfo('America/Caracas')
except Exception:
    ZONA_HORARIA = timezone(timedelta(hours=-4))

db.init_app(app)

def ahora_venezuela():
    return datetime.now(ZONA_HORARIA).replace(tzinfo=None)

def dias_laborables(config):
    return {int(dia) for dia in (config.dias_laborables or '0,1,2,3,4').split(',') if dia.strip().isdigit()}

def horario_de_usuario(usuario, fecha, config=None):
    horario = HorarioPersonal.query.filter_by(usuario_id=usuario.id, dia_semana=fecha.weekday()).first()
    if horario:
        return horario.hora_entrada, horario.hora_salida
    return usuario.hora_entrada or (config.hora_entrada_oficial if config else '07:30'), usuario.hora_salida or '15:30'

# --- API RESTful & Endpoints para la Tesis ---

@app.route('/api/auth/login', methods=['POST'])
def api_login():
    data = request.get_json() or {}
    correo = data.get('correo', '').strip().lower()
    password = data.get('password', '')

    usuario = Usuario.query.filter_by(correo=correo).first()
    if usuario and usuario.check_password(password):
        return jsonify({
            'ok': True,
            'usuario': {
                'id': usuario.id,
                'nombre': usuario.nombre,
                'apellido': usuario.apellido,
                'correo': usuario.correo,
                'rol': usuario.rol,
                'departamento': usuario.departamento
            }
        })
    return jsonify({'ok': False, 'message': 'Credenciales de acceso inválidas'}), 401

@app.route('/api/asistencia/registrar', methods=['POST'])
def api_registrar_asistencia():
    """Registra la asistencia individual vía escaneo QR evaluando puntualidad"""
    data = request.get_json() or {}
    usuario_id = data.get('usuario_id')
    usuario = Usuario.query.get(usuario_id)
    if not usuario:
        return jsonify({'ok': False, 'message': 'Usuario no encontrado'}), 404

    momento = ahora_venezuela()
    fecha_hoy = momento.date()

    if AsistenciaDiaria.query.filter_by(usuario_id=usuario_id, fecha=fecha_hoy).first():
        return jsonify({'ok': False, 'message': 'Ya existe una asistencia registrada para hoy'})

    config = Configuracion.query.first()
    if fecha_hoy.weekday() not in dias_laborables(config):
        return jsonify({'ok': False, 'message': 'Hoy no es un día laborable configurado'})

    hora_entrada, _ = horario_de_usuario(usuario, fecha_hoy, config)
    limite = datetime.strptime(hora_entrada, "%H:%M").time()
    limite_dt = datetime.combine(fecha_hoy, limite)
    minutos = max(0, int((momento - limite_dt).total_seconds() // 60))
    estado = "A tiempo" if momento.time() <= limite else "Tarde"

    asistencia = AsistenciaDiaria(
        usuario_id=usuario_id, fecha=fecha_hoy, hora_registro=momento,
        estado=estado, minutos_retraso=minutos
    )
    db.session.add(asistencia)
    db.session.commit()

    return jsonify({
        'ok': True,
        'message': 'Asistencia registrada correctamente.',
        'estado': estado,
        'hora': momento.strftime('%I:%M %p')
    })

@app.route('/api/asistencia/sincronizar_offline', methods=['POST'])
def api_sincronizar_offline():
    """Sincroniza la cola local generada por el Service Worker PWA de Portería"""
    data = request.get_json() or {}
    registros = data.get('registros', [])
    guardados = 0

    for item in registros:
        usuario_id = item.get('usuario_id')
        dt = datetime.fromisoformat(item.get('timestamp'))
        fecha = dt.date()

        if not AsistenciaDiaria.query.filter_by(usuario_id=usuario_id, fecha=fecha).first():
            config = Configuracion.query.first()
            u = Usuario.query.get(usuario_id)
            if u:
                hora_entrada, _ = horario_de_usuario(u, fecha, config)
                limite = datetime.strptime(hora_entrada, "%H:%M").time()
                limite_dt = datetime.combine(fecha, limite)
                minutos = max(0, int((dt - limite_dt).total_seconds() // 60))
                estado = "A tiempo" if dt.time() <= limite else "Tarde"

                db.session.add(AsistenciaDiaria(
                    usuario_id=usuario_id, fecha=fecha, hora_registro=dt,
                    estado=estado, minutos_retraso=minutos, registrada_manualmente=False
                ))
                guardados += 1

    db.session.commit()
    return jsonify({'ok': True, 'sincronizados': guardados})

@app.route('/api/permisos/solicitar', methods=['POST'])
def api_solicitar_permiso():
    data = request.get_json() or {}
    usuario_id = data.get('usuario_id')
    u = Usuario.query.get(usuario_id)
    config = Configuracion.query.first()
    usados = Permiso.query.filter_by(usuario_id=usuario_id).filter(Permiso.estado != 'Rechazado').count()
    limite = u.limite_permisos if u and u.limite_permisos is not None else config.limite_permisos

    if usados >= limite:
        return jsonify({'ok': False, 'message': f'Límite de {limite} permisos alcanzado'}), 400

    f_inicio = datetime.strptime(data['fecha_inicio'], '%Y-%m-%d').date()
    f_fin = datetime.strptime(data['fecha_fin'], '%Y-%m-%d').date()
    permiso = Permiso(
        usuario_id=usuario_id, fecha_inicio=f_inicio, fecha_fin=f_fin,
        motivo=data.get('motivo', 'Otro'), observaciones=data.get('observaciones'),
        archivo_adjunto=data.get('archivo_adjunto')
    )
    db.session.add(permiso)
    db.session.commit()
    return jsonify({'ok': True, 'message': 'Solicitud enviada correctamente'})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        if not Usuario.query.filter_by(correo='director@institucion.edu').first():
            admin = Usuario(nombre='Director', apellido='General', correo='director@institucion.edu', rol='directivo')
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.commit()
    app.run(host='0.0.0.0', port=5000, debug=True)
