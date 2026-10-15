# Documentación de Arquitectura Tecnológica para Tesis de Grado

## Sistema de Control de Asistencias, Gestión de Horarios y Estación de Portería PWA
**Institución Beneficiaria:** U.E. "La Constancia"  
**Autor del Proyecto:** Equipo Tesista

---

### 1. Justificación y Selección de Lenguajes (Capítulo III / Marco Metodológico)

Para la sustentación de la tesis, el proyecto se estructura bajo una **Arquitectura Cliente-Servidor Desacoplada (Headless Web Architecture) con Capacidades PWA Offline**:

1. **Lenguaje y Entorno del Backend:**
   - **Python 3.10+ / Flask:** Seleccionado por su robustez, sintaxis limpia, seguridad criptográfica en manejo de contraseñas (`Werkzeug pbkdf2:sha256`) y agilidad para implementar endpoints RESTful.
   - **SQLAlchemy ORM:** Abstracción relacional orientada a objetos que garantiza la integridad referencial y previene inyecciones SQL.
   - **Base de Datos SQLite3:** Base de datos relacional serverless, ideal para despliegues escolares locales o embebidos en el servidor institucional.

2. **Lenguaje y Entorno del Frontend:**
   - **HTML5, CSS3 (Tailwind Framework) y JavaScript/TypeScript (React):** Interfaz SPA (Single Page Application) que elimina la recarga de página, optimiza el consumo de datos y ofrece retroalimentación visual inmediata.
   - **PWA (Progressive Web App) y Service Worker:** Estándar W3C que permite a la aplicación ser instalada en teléfonos y computadoras, funcionando de forma autónoma sin conexión a Internet (Modo Portería Offline).

---

### 2. Estructura del Módulo Python (Backend)

```
tesis_python_backend/
├── app.py             # Servidor REST API, rutas de autenticación, puntualidad y sincronización offline
├── models.py          # Definición de tablas relacionales (Usuario, AsistenciaDiaria, Evento, Horarios, etc.)
├── requirements.txt   # Dependencias de Python necesarias
└── instance/          # Base de datos SQLite (sistema_academico.db)
```

---

### 3. Mecanismo de Funcionamiento PWA Offline para Portería

1. **Instalación:** El vigilante o encargado de portería accede a la aplicación y pulsa el botón **"Instalar App"** en el navegador.
2. **Caché de Recursos:** El Service Worker almacena en caché local (`CacheStorage`) todos los archivos esenciales (interfaz, estilos, lógica de validación).
3. **Escaneo sin Internet:** Al escanear un código QR durante una caída de red o corte de luz, el sistema almacena la marcación en una cola segura en `localStorage`.
4. **Sincronización Automática:** Cuando se detecta nuevamente conectividad a Internet, la cola se transmite al endpoint `/api/asistencia/sincronizar_offline` y se asienta formalmente en el Libro Digital Escolar.
