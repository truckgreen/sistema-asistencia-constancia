from flask import Blueprint, jsonify, session

from models import AsignacionHorario, PlantillaHorario


api_bp = Blueprint('api', __name__, url_prefix='/api')


@api_bp.get('/horarios')
def horarios():
    if not session.get('usuario_id'):
        return jsonify({'error': 'Autenticación requerida'}), 401
    asignaciones = AsignacionHorario.query.filter_by(usuario_id=session['usuario_id']).all()
    return jsonify([{
        'id': asignacion.id,
        'plantilla': asignacion.plantilla.nombre,
        'fecha_inicio': asignacion.fecha_inicio.isoformat(),
        'fecha_fin': asignacion.fecha_fin.isoformat() if asignacion.fecha_fin else None,
        'detalles': [{
            'dia_semana': detalle.dia_semana,
            'hora_entrada': detalle.hora_entrada,
            'hora_salida': detalle.hora_salida,
        } for detalle in asignacion.plantilla.detalles],
    } for asignacion in asignaciones])


@api_bp.get('/plantillas-horario')
def plantillas_horario():
    if session.get('rol') != 'directivo':
        return jsonify({'error': 'Acceso denegado'}), 403
    return jsonify([{
        'id': plantilla.id,
        'nombre': plantilla.nombre,
        'activa': plantilla.activa,
        'detalles': [{
            'dia_semana': detalle.dia_semana,
            'hora_entrada': detalle.hora_entrada,
            'hora_salida': detalle.hora_salida,
        } for detalle in plantilla.detalles],
    } for plantilla in PlantillaHorario.query.order_by(PlantillaHorario.nombre).all()])
