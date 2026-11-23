# Estado de implementación de ResiliaUNT

## Base funcional añadida

- Inicio de sesión con Supabase Auth y perfil pendiente hasta asignación administrativa.
- Panel administrativo protegido para habilitar perfiles, vincular estudiantes/terapeutas y gestionar asignaciones con historial.
- Separación de portal de estudiante y portal profesional según el rol de `perfiles_app`.
- Tablero con los cuatro KPI oficiales, tendencia mensual y variables complementarias separadas.
- Registro diario de hábitos por estudiante.
- Creación y actualización de metas personales con una observación de estado por fecha.
- Consulta de sesiones propias para el estudiante.
- Vista de cartera, evaluaciones clínicas, evaluación de red de apoyo y programación de sesiones para terapeuta.
- Perfil 360 por estudiante autorizado, con tendencias e historial de hábitos, metas, red de apoyo y sesiones.
- APIs con validación de entrada, comprobación de perfil y uso de cliente Supabase vinculado a la sesión.
- Consultas explícitas a los esquemas PostgreSQL `oltp_resiliencia` y `datamart_resiliencia` desde Supabase JS.
- Creación atómica de metas y de su primer estado, sin dejar metas parcialmente insertadas.
- RLS como segunda capa de autorización en la base de datos.
- Panel administrativo con clave de servicio confinada al servidor y validación de rol en cada operación.
- Refresco del DataMart por RPC de servidor después de operaciones que generan hechos.
- Pruebas unitarias de las funciones de normalización y cálculo de KPI.
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
8. `005_seed_demo.sql` — opcional, solo en desarrollo.
9. `006_validaciones_kpi.sql`

## Límites que siguen vigentes

- La integración de inteligencia artificial no está habilitada en esta fase.
- El sistema no diagnostica ni recomienda tratamientos.
- No se han incorporado notas clínicas narrativas ni relatos personales.
- El seed contiene solamente datos sintéticos de demostración.
- Los rangos y definiciones de los instrumentos deben ser confirmados por el responsable profesional e institucional antes de medir a estudiantes reales.
- El código requiere configuración de un proyecto Supabase, revisión de RLS en ese proyecto y variables seguras en Render para ejecutarse de extremo a extremo.
- Este commit no representa una validación de despliegue ni una autorización institucional para operar con datos reales.
