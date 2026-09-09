from datetime import datetime

from flask import Blueprint, flash, redirect, render_template, request, session, url_for

from models import (AsignacionHorario, ClaseHorario, DetallePlantillaHorario,
                    HorarioPersonal, PlantillaHorario, Usuario, db)


horarios_bp = Blueprint('horarios', __name__)


def _es_directivo():
    return session.get('rol') == 'directivo'


def _hora_valida(valor):
    datetime.strptime(valor, '%H:%M')
    return valor


@horarios_bp.get('/directivo/horarios')
def gestionar_horarios():
    if not _es_directivo():
        return redirect(url_for('login'))

    plantillas = PlantillaHorario.query.order_by(PlantillaHorario.nombre).all()
    asignaciones = AsignacionHorario.query.order_by(
        AsignacionHorario.fecha_inicio.desc(), AsignacionHorario.id.desc()
    ).all()
    personal = Usuario.query.filter(Usuario.rol != 'directivo').order_by(
        Usuario.apellido, Usuario.nombre
    ).all()
    roles = sorted({usuario.rol for usuario in personal if usuario.rol})
    departamentos = sorted({usuario.departamento for usuario in personal if usuario.departamento})
    usuario_seleccionado = None
    horarios_personales = []
    clases_personales = []
    usuario_id = request.args.get('usuario_id', type=int)
    if usuario_id:
        usuario_seleccionado = Usuario.query.filter(
            Usuario.id == usuario_id, Usuario.rol != 'directivo'
        ).first()
        if usuario_seleccionado:
            horarios_personales = HorarioPersonal.query.filter_by(
                usuario_id=usuario_seleccionado.id
            ).order_by(HorarioPersonal.dia_semana).all()
            clases_personales = ClaseHorario.query.filter_by(
                usuario_id=usuario_seleccionado.id
            ).order_by(ClaseHorario.dia_semana, ClaseHorario.hora_inicio).all()
    return render_template(
        'director_horarios.html',
        plantillas=plantillas,
        asignaciones=asignaciones,
        personal=personal,
        roles=roles,
        departamentos=departamentos,
        usuario_seleccionado=usuario_seleccionado,
        horarios_personales=horarios_personales,
        clases_personales=clases_personales,
    )


@horarios_bp.post('/directivo/horarios/persona/<int:usuario_id>')
def guardar_horario_personal(usuario_id):
    if not _es_directivo():
        return redirect(url_for('login'))
    usuario = Usuario.query.filter(Usuario.id == usuario_id, Usuario.rol != 'directivo').first_or_404()
    try:
        for dia in range(7):
            entrada = request.form.get(f'personal_entrada_{dia}', '').strip()
            salida = request.form.get(f'personal_salida_{dia}', '').strip()
            existente = HorarioPersonal.query.filter_by(
                usuario_id=usuario.id, dia_semana=dia
            ).first()
            if not entrada and not salida:
                if existente:
                    db.session.delete(existente)
                continue
            _hora_valida(entrada)
            _hora_valida(salida)
            if entrada >= salida:
                raise ValueError
            if existente:
                existente.hora_entrada = entrada
                existente.hora_salida = salida
            else:
                db.session.add(HorarioPersonal(
                    usuario_id=usuario.id, dia_semana=dia,
                    hora_entrada=entrada, hora_salida=salida
                ))
    except (TypeError, ValueError):
        flash('Revisa que cada jornada tenga horas válidas de entrada y salida.', 'danger')
        return redirect(url_for('horarios.gestionar_horarios', usuario_id=usuario.id))
    db.session.commit()
    flash(f'Horario individual de {usuario.nombre} {usuario.apellido} actualizado.', 'success')
    return redirect(url_for('horarios.gestionar_horarios', usuario_id=usuario.id))


@horarios_bp.post('/directivo/horarios/clases')
def guardar_clases_horario():
    if not _es_directivo():
        return redirect(url_for('login'))
    try:
        usuario_id = int(request.form['docente_id'])
        docente = Usuario.query.filter(Usuario.id == usuario_id, Usuario.rol != 'directivo').first_or_404()
        ClaseHorario.query.filter_by(usuario_id=docente.id).delete()
        nombres = request.form.getlist('clase_nombre[]')
        dias = request.form.getlist('clase_dia[]')
        entradas = request.form.getlist('clase_entrada[]')
        salidas = request.form.getlist('clase_salida[]')
        aulas = request.form.getlist('clase_aula[]')
        tipos = request.form.getlist('clase_tipo[]')
        curso = request.form.get('curso', '').strip() or None
        for nombre, dia, entrada, salida, aula, tipo in zip(nombres, dias, entradas, salidas, aulas, tipos):
            if not nombre.strip() and not entrada and not salida:
                continue
            _hora_valida(entrada)
            _hora_valida(salida)
            if entrada >= salida or not nombre.strip() or not 0 <= int(dia) <= 6:
                raise ValueError
            db.session.add(ClaseHorario(
                usuario_id=docente.id, curso=curso, nombre=nombre.strip(), tipo=tipo or 'clase',
                dia_semana=int(dia), hora_inicio=entrada, hora_fin=salida,
                aula=aula.strip() or None,
            ))
        db.session.commit()
    except (KeyError, TypeError, ValueError):
        db.session.rollback()
        flash('Revisa el docente, el nombre y las horas de cada clase.', 'danger')
        return redirect(url_for('horarios.gestionar_horarios', usuario_id=request.form.get('docente_id')))
    flash(f'Clases asignadas a {docente.nombre} {docente.apellido}.', 'success')
    return redirect(url_for('horarios.gestionar_horarios', usuario_id=docente.id))


@horarios_bp.get('/directivo/horarios/generar')
def generar_horario():
    if not _es_directivo():
        return redirect(url_for('login'))
    usuario_id = request.args.get('usuario_id', type=int)
    docente = Usuario.query.filter(Usuario.id == usuario_id, Usuario.rol != 'directivo').first_or_404()
    clases = ClaseHorario.query.filter_by(usuario_id=docente.id).order_by(
        ClaseHorario.curso, ClaseHorario.hora_inicio, ClaseHorario.dia_semana
    ).all()
    cursos = {}
    for clase in clases:
        curso = clase.curso.strip() if clase.curso else 'Sin curso asignado'
        cursos.setdefault(curso, []).append(clase)

    horarios = []
    curso_filtro = request.args.get('curso')
    for curso, clases_del_curso in cursos.items():
        if curso_filtro and curso != curso_filtro:
            continue
        bloques = sorted({(clase.hora_inicio, clase.hora_fin) for clase in clases_del_curso})
        horarios.append({'curso': curso, 'clases': clases_del_curso, 'bloques': bloques})
    return render_template('horario_escolar.html', docente=docente, horarios=horarios)


@horarios_bp.post('/directivo/horarios/plantillas')
def crear_plantilla():
    if not _es_directivo():
        return redirect(url_for('login'))

    nombre = request.form.get('nombre', '').strip()
    if not nombre:
        flash('El nombre de la plantilla es obligatorio.', 'danger')
        return redirect(url_for('horarios.gestionar_horarios'))
    if PlantillaHorario.query.filter_by(nombre=nombre).first():
        flash('Ya existe una plantilla con ese nombre.', 'warning')
        return redirect(url_for('horarios.gestionar_horarios'))

    plantilla = PlantillaHorario(
        nombre=nombre,
        descripcion=request.form.get('descripcion', '').strip() or None,
    )
    try:
        for dia in range(7):
            entrada = request.form.get(f'entrada_{dia}')
            salida = request.form.get(f'salida_{dia}')
            if entrada and salida:
                _hora_valida(entrada)
                _hora_valida(salida)
                if entrada >= salida:
                    raise ValueError('La salida debe ser posterior a la entrada.')
                plantilla.detalles.append(DetallePlantillaHorario(
                    dia_semana=dia, hora_entrada=entrada, hora_salida=salida
                ))
        if not plantilla.detalles:
            raise ValueError('Define al menos un día de trabajo.')
    except (TypeError, ValueError):
        flash('Revisa los días y las horas de la plantilla.', 'danger')
        return redirect(url_for('horarios.gestionar_horarios'))

    db.session.add(plantilla)
    db.session.commit()
    flash('Plantilla de horario creada correctamente.', 'success')
    return redirect(url_for('horarios.gestionar_horarios'))


@horarios_bp.post('/directivo/horarios/asignaciones')
def asignar_plantilla():
    if not _es_directivo():
        return redirect(url_for('login'))

    try:
        plantilla_id = int(request.form['plantilla_id'])
        fecha_inicio = datetime.strptime(request.form['fecha_inicio'], '%Y-%m-%d').date()
        fecha_fin_valor = request.form.get('fecha_fin')
        fecha_fin = (datetime.strptime(fecha_fin_valor, '%Y-%m-%d').date()
                     if fecha_fin_valor else None)
        if fecha_fin and fecha_fin < fecha_inicio:
            raise ValueError
    except (KeyError, TypeError, ValueError):
        flash('El período de vigencia no es válido.', 'danger')
        return redirect(url_for('horarios.gestionar_horarios'))

    objetivo = request.form.get('objetivo', 'rol')
    usuario_id = None
    rol = None
    departamento = None
    if objetivo == 'usuario':
        usuario_id = int(request.form['usuario_id'])
        prioridad = 30
    elif objetivo == 'departamento':
        departamento = request.form.get('departamento', '').strip()
        prioridad = 20
    else:
        rol = request.form.get('rol', '').strip()
        prioridad = 10
    if not usuario_id and not rol and not departamento:
        flash('Selecciona un empleado, departamento o rol.', 'danger')
        return redirect(url_for('horarios.gestionar_horarios'))

    db.session.add(AsignacionHorario(
        plantilla_id=plantilla_id, usuario_id=usuario_id, rol=rol,
        departamento=departamento, fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin, prioridad=prioridad,
    ))
    db.session.commit()
    flash('Horario asignado correctamente.', 'success')
    return redirect(url_for('horarios.gestionar_horarios'))


@horarios_bp.post('/directivo/horarios/asignaciones/<int:asignacion_id>/eliminar')
def eliminar_asignacion(asignacion_id):
    if not _es_directivo():
        return redirect(url_for('login'))
    asignacion = AsignacionHorario.query.get_or_404(asignacion_id)
    db.session.delete(asignacion)
    db.session.commit()
    flash('Asignación eliminada.', 'success')
    return redirect(url_for('horarios.gestionar_horarios'))
