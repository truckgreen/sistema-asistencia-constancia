from flask import Blueprint, flash, redirect, render_template, request, session, url_for

from models import AsistenciaDiaria, Permiso, PlantillaHorario, db


directivo_bp = Blueprint('directivo', __name__)


@directivo_bp.post('/directivo/horarios/plantillas/<int:plantilla_id>/alternar')
def alternar_plantilla(plantilla_id):
    if session.get('rol') != 'directivo':
        return redirect(url_for('login'))
    plantilla = PlantillaHorario.query.get_or_404(plantilla_id)
    plantilla.activa = not plantilla.activa
    db.session.commit()
    flash('Estado de la plantilla actualizado.', 'success')
    return redirect(url_for('horarios.gestionar_horarios'))


@directivo_bp.get('/directivo/solicitudes')
def solicitudes():
    if session.get('rol') != 'directivo':
        return redirect(url_for('login'))

    estado = request.args.get('estado', 'todos')
    tipo = request.args.get('tipo', 'todos')
    justificaciones_query = AsistenciaDiaria.query.filter(
        AsistenciaDiaria.estado.in_([
            'Inasistencia Reportada', 'Inasistencia Aprobada',
            'Inasistencia Rechazada', 'Ausente'
        ])
    )
    permisos_query = Permiso.query
    if estado != 'todos':
        justificaciones_query = justificaciones_query.filter(AsistenciaDiaria.estado == estado)
        permisos_query = permisos_query.filter(Permiso.estado == estado)
    justificaciones = justificaciones_query.order_by(AsistenciaDiaria.fecha.desc()).all()
    permisos = permisos_query.order_by(Permiso.fecha_inicio.desc()).all()
    if tipo == 'justificaciones':
        permisos = []
    elif tipo == 'permisos':
        justificaciones = []
    return render_template(
        'directivo_solicitudes.html',
        justificaciones=justificaciones,
        permisos=permisos,
        estado=estado,
        tipo=tipo,
    )
