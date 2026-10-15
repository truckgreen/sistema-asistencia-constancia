# Sistema de Asistencia, Horarios y Agenda Escolar - U.E. "La Constancia"

Aplicación web integral desarrollada en **React (Vite + TypeScript + Tailwind CSS)** para la gestión y control de asistencias, emisión y escaneo de códigos QR, asignación de horarios por docente y departamento, control de permisos institucionales y generación de horarios escolares oficiales.

## Módulos y Funcionalidades

### 1. Consola Ejecutiva del Directivo
- **Métricas en tiempo real**: Marcaciones del día, puntualidad ("A tiempo"), ingresos "Con retraso" con conteo de minutos excedidos, y justificaciones de inasistencia pendientes.
- **Gestión de Justificaciones e Inasistencias**: Aprobación y rechazo inmediato de solicitudes justificadas con visualización de motivos y constancias adjuntas.
- **Gestión de Permisos**: Resolución de permisos institucionales controlados contra el límite máximo anual fijado.
- **Registro Manual de Asistencia**: Marcaje administrativo para excepciones o funcionarios sin dispositivo.
- **Cumpleañeros del Día**: Detección automática según la nómina de personal.
- **Agenda y Visor de Actividades**: Calendario interactivo semanal con filtrado por docente titular, código de color para clases, feriados oficiales y eventos institucionales.

### 2. Estación Centralizada de Registro QR
- Código QR vectorial de alta resolución listo para escanear en portería.
- Reloj institucional sincronizado.
- Botón de impresión directa para fijar en carteleras físicas.
- Simulador de escaneo interactivo.

### 3. Libro Digital de Asistencia (Auditoría)
- Historial completo de marcaciones con filtros multidimensionales: por Rol (Docente, Administrativo, Obrero), por Funcionario, por Tipo (Asistencias / Inasistencias) y por rango de fechas.
- Exportación a formato CSV para conciliación administrativa.
- Impresión del libro de asistencia.

### 4. Gestión de Horarios y Cátedras
- Configuración de jornadas semanales individuales por empleado con presets rápidos (ej. 07:00 - 13:00 L-V).
- Matriz visual interactiva de horas vs. días de la semana con resaltado de bloques horarios.
- Asignación de materias, aulas y recreos por curso y grado.
- Generador de **Horario Escolar Oficial** imprimible en formato académico retro.
- Creación de plantillas de horario reutilizables y asignación por rol o departamento.

### 5. Gestión del Talento Humano
- Nómina activa con desglose de cargos, departamentos, teléfonos y jornadas.
- Incorporación de nuevo personal con generación de contraseñas de seguridad.
- Edición de fichas y eliminación de funcionarios.

### 6. Parámetros del Sistema
- Hora límite oficial de entrada.
- Días hábiles laborables configurables.
- Límite de permisos anuales por funcionario.

### 7. Panel del Personal (Docentes y Empleados)
- Mi Cronograma de Dictado: visualización de cátedras y clases asignadas.
- Registro de asistencia mediante escáner QR.
- Formulario de solicitud de permisos con cálculo de saldo disponible.
- Justificación de inasistencias con soporte para adjuntar constancias médicas o documentos.
- Historial individual de puntualidad con registro de minutos de retraso.
- Consulta de clases por grado y jornada.

## Ejecución en Desarrollo

```bash
npm install
npm run dev
```

El servidor iniciará en `http://0.0.0.0:3000`.
