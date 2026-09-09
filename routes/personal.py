from flask import Blueprint, redirect, render_template, session, url_for

from models import AsignacionHorario, ClaseHorario, Usuario


personal_bp = Blueprint('personal', __name__)


@personal_bp.get('/personal/horario')
def mi_horario():
    if not session.get('usuario_id'):
        return redirect(url_for('login'))
    usuario = Usuario.query.get_or_404(session['usuario_id'])
    asignaciones = AsignacionHorario.query.filter_by(usuario_id=usuario.id).order_by(
        AsignacionHorario.fecha_inicio.desc()
    ).all()
    clases = ClaseHorario.query.filter_by(usuario_id=usuario.id).order_by(
        ClaseHorario.curso, ClaseHorario.dia_semana, ClaseHorario.hora_inicio
    ).all()
    clases_por_curso = {}
    for clase in clases:
        curso = clase.curso.strip() if clase.curso else 'Sin curso asignado'
        clases_por_curso.setdefault(curso, []).append(clase)
    return render_template('personal_horario.html', usuario=usuario,
                           asignaciones=asignaciones, clases=clases,
                           clases_por_curso=clases_por_curso)
