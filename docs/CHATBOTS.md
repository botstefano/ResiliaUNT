# Chatbots de ResiliaUNT

Esta implementación incorpora dos asistentes distintos, conectados a Groq desde el backend de Next.js.

## Nexo — terapeuta

Nexo es un asistente analítico descriptivo. Consulta exclusivamente la cartera sintética vigente asignada al terapeuta autenticado. Resume KPI, distribución por ciclo, tendencias, hábitos registrados, estados de metas y avisos operativos. Las comparaciones son descriptivas: no demuestran efectividad ni causalidad.

Nexo no diagnostica, no clasifica estudiantes por riesgo, no determina urgencia y no toma decisiones clínicas. El rol de supervisor global no está implementado; por eso no hay acceso general a los 200 estudiantes desde cualquier terapeuta.

## Brújula — estudiante

Brújula ayuda con el uso de ResiliaUNT y explica únicamente los indicadores, hábitos, metas y sesiones del estudiante autenticado. No consulta datos de otros estudiantes. No inventa indicaciones profesionales: el esquema actual no registra prescripciones o recomendaciones de hábitos como dato estructurado.

Ante preguntas clínicas sensibles deriva al profesional y permite registrar una solicitud genérica de contacto. Ante expresiones que requieren una respuesta prioritaria, el backend omite Groq, registra un aviso genérico en el panel del terapeuta asignado cuando existe una asignación vigente y muestra opciones para buscar apoyo humano. El aviso no equivale a una llamada, correo o contacto realizado; no se promete respuesta inmediata.

## Privacidad y controles

- Groq se invoca solo desde `src/app/api/chat/route.ts`; las claves no se envían al navegador.
- Groq no genera SQL ni ejecuta herramientas. El backend prepara consultas fijas y valida el alcance antes de llamar al modelo.
- El terapeuta consulta solo estudiantes sintéticos activos asignados a su `id_terapeuta`.
- El estudiante consulta solo el registro sintético propio.
- La implementación no almacena mensajes ni historiales de chat en Supabase.
- `public.chatbot_alertas` solo contiene estudiante, terapeuta, tipo, estado y marcas de tiempo; no guarda el texto que escribió el estudiante.
- RLS está habilitado para la tabla de avisos. Los endpoints realizan comprobaciones de rol y pertenencia antes de usar el cliente privilegiado de servidor.
- El proyecto sigue en modo de datos sintéticos. Antes de incorporar datos reales se necesita una revisión institucional de privacidad, seguridad, consentimiento, retención, salvaguarda y protocolos profesionales.

## Variables de Render

Configurar desde **Environment** del servicio ResiliaUNT. Todas son variables privadas del servidor; nunca usar el prefijo `NEXT_PUBLIC_`.

| Variable | Uso |
|---|---|
| `GROQ_API_KEY` | Clave por defecto compartida por ambos asistentes |
| `GROQ_MODEL` | Modelo por defecto |
| `GROQ_API_KEY_THERAPIST` | Clave opcional exclusiva de Nexo; tiene prioridad sobre la clave general |
| `GROQ_MODEL_THERAPIST` | Modelo opcional exclusivo de Nexo |
| `GROQ_API_KEY_STUDENT` | Clave opcional exclusiva de Brújula; tiene prioridad sobre la clave general |
| `GROQ_MODEL_STUDENT` | Modelo opcional exclusivo de Brújula |
| `GROQ_API_BASE_URL` | Opcional; por defecto `https://api.groq.com/openai/v1` |

Si no hay clave y modelo configurados, el panel se muestra y responde con un aviso de configuración pendiente. No se expone ninguna clave al cliente.

## Rutas

- `POST /api/chat`: conversación efímera, según rol.
- `GET /api/chatbot/alerts`: avisos pendientes del terapeuta.
- `POST /api/chatbot/alerts`: solicitud de contacto del estudiante, sin texto libre.
- `PATCH /api/chatbot/alerts`: marcar un aviso propio como atendido.

## Migración de datos

La migración `013_chatbot_alertas.sql` crea la tabla de avisos y sus políticas RLS. En el entorno Supabase conectado, esta migración fue aplicada directamente; el archivo se conserva en el repositorio para reproducibilidad.
