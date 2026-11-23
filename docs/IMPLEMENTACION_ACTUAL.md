# Estado de implementación de ResiliaUNT

## Base funcional añadida

- Inicio de sesión y recuperación de contraseña con Supabase Auth; el perfil nuevo queda pendiente hasta asignación administrativa.
- Panel administrativo protegido para crear estudiantes, terapeutas y salas; invitar usuarios por correo; habilitar perfiles; vincular estudiantes/terapeutas y gestionar asignaciones con historial.
- Separación de portal de estudiante y portal profesional según el rol de `perfiles_app`, con guardas por rol también a nivel de página.
- Tablero con los cuatro KPI oficiales, tendencia mensual y variables complementarias separadas. El KPI de red activa utiliza la última valoración por estudiante dentro del período para evitar ponderación por frecuencia de evaluación.
- Correlaciones exploratorias de Pearson hábitos–resiliencia y hábitos–pensamientos intrusivos. Las observaciones mensuales se agregan por estudiante antes de calcular, se exige un mínimo de 10 estudiantes con datos emparejados y se presentan como asociaciones descriptivas, no causales.
- Registro diario de hábitos por estudiante.
- Exportación CSV del tablero con los cuatro KPI y variables complementarias agregadas, sin nombres, códigos ni UUID.
- Creación y actualización de metas personales con una observación de estado por fecha.
- Consulta de sesiones propias para el estudiante.
- Vista de cartera, evaluaciones clínicas, evaluación de red de apoyo y programación de sesiones para terapeuta.
- Perfil 360 por estudiante autorizado, con tendencias e historial de hábitos, metas, red de apoyo y sesiones.
- APIs con validación de entrada, comprobación de perfil y uso de cliente Supabase vinculado a la sesión.
- Consultas explícitas a los esquemas PostgreSQL `oltp_resiliencia` y `datamart_resiliencia` desde Supabase JS.
- Tipos TypeScript generados desde PostgreSQL para las 23 tablas de aplicación; clientes Supabase server, browser y admin usan el contrato `Database`.
- Creación atómica de metas y de su primer estado, sin dejar metas parcialmente insertadas.
- RLS como segunda capa de autorización en la base de datos.
- Panel administrativo con clave de servicio confinada al servidor y validación de rol en cada operación.
- Refresco del DataMart por RPC de servidor después de operaciones que generan hechos.
- Pruebas unitarias de normalización, porcentajes, selección de última observación y correlación de Pearson.
- Workflow de GitHub Actions para TypeScript, pruebas, ESLint y build.
- Endpoint `/api/health` para comprobación de disponibilidad del servicio.

## Orden de ejecución de SQL

1. `001_oltp.sql`
2. `002_datamart.sql`
3. `003_security_rls.sql`
4. `007_permisos_escritura_api.sql` — permisos mínimos de escritura para evaluaciones y sesiones.
5. `008_meta_transaccional.sql` — crea una meta y su estado inicial en una transacción.
6. `009_admin_asignaciones.sql` — habilita el historial de relaciones terapeuta–estudiante y permisos mínimos del panel administrativo.
7. `004_etl.sql`
8. `010_hardening_rls.sql` — mueve los helpers SECURITY DEFINER a `resilia_private` (no exponer ese esquema) y separa políticas de lectura/escritura.
9. `011_foreign_key_indexes.sql` — índices de soporte para claves foráneas.
10. `005_seed_demo.sql` — opcional, solo en desarrollo.
11. `006_validaciones_kpi.sql`

## Límites que siguen vigentes

- La integración de inteligencia artificial no está habilitada en esta fase.
- El sistema no diagnostica ni recomienda tratamientos.
- No se han incorporado notas clínicas narrativas ni relatos personales.
- El seed contiene solamente datos sintéticos de demostración.
- Los rangos y definiciones de los instrumentos deben ser confirmados por el responsable profesional e institucional antes de medir a estudiantes reales.
- El proyecto Supabase `ResiliaUNT` está conectado; se aplicaron las migraciones 001–004, 007–011 y se cargó el seed exclusivamente sintético.
- El primer perfil administrador ya fue habilitado en Supabase Auth después de comprobar que el correo estaba confirmado. La base registra un administrador y no quedan perfiles pendientes.
- La base contiene 40 estudiantes demo, 400 evaluaciones clínicas, 800 registros de hábitos, 80 metas, 800 estados de meta y 400 valoraciones de red de apoyo. Los cuatro hechos del DataMart fueron cotejados con OLTP y no se detectaron claves huérfanas.
- RLS está habilitado en todas las tablas de la aplicación; los asesores de seguridad y salud de Supabase no reportan avisos. Los índices de soporte de claves foráneas se añadieron en la migración 011.
- El propietario del proyecto confirmó que `oltp_resiliencia` y `datamart_resiliencia` ya están agregados a **API → Exposed schemas**. `resilia_private` debe permanecer sin exponer. Quedan pendientes la configuración de URL/callbacks de Auth, las variables de entorno de Render y las pruebas E2E con cuentas separadas.
- El CI de GitHub Actions valida tipos, pruebas unitarias, lint y compilación de producción; no reemplaza las pruebas E2E del despliegue.
- El repositorio mantiene visibilidad pública; como el contenido actual es sintético puede conservarse así. Nunca subir datos personales ni credenciales.
- Este commit no representa una validación de despliegue ni una autorización institucional para operar con datos reales.
