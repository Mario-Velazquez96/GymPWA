# Client Requirement — App de Rutinas de Gimnasio

**Fecha:** 2026-07-18
**Cliente / Usuario final:** Mario (mariovt860@gmail.com) — usuario único, uso personal.

## 1. Objetivo general

Construir una aplicación web (PWA) que Mario pueda abrir en su iPhone mientras está en el gimnasio, para:

1. Ver la rutina de ejercicios que le toca **por día**.
2. Consultar por cada ejercicio su **descripción/instrucciones e imagen o GIF** del movimiento.
3. **Registrar** cuántas series hizo de cada ejercicio y cuánto peso cargó.
4. En semanas siguientes, **comparar** contra lo registrado anteriormente para saber cuánto peso debe cargar (progresión).

## 2. Contexto del ecosistema

El proyecto se divide en **dos repositorios**:

| Repo | Responsabilidad |
|---|---|
| `Gym` (este repo, existente) | Base de datos de ejercicios (`exercises-dataset/`, 1,324 ejercicios con instrucciones en español, imagen y GIF) + **agente entrenador** que genera los planes mensuales y los sube al backend. |
| Repo nuevo (por crear) | La **PWA**: frontend, autenticación, registro de entrenamientos, despliegue. |

Ambos repos se comunican **únicamente a través del backend (Supabase)**. El contrato compartido son los IDs de ejercicio del dataset (`"0001"`–`"1324"`).

## 3. Requerimientos funcionales

### RF-1 — Autenticación
- El usuario debe poder iniciar sesión (login) en la app.
- Al loguearse, ve únicamente las rutinas asignadas a su usuario.

### RF-2 — Rutina del día
- Al abrir la app, mostrar la rutina correspondiente al día actual del plan mensual activo.
- Poder navegar a otros días del plan (ver qué toca mañana, o qué tocó ayer).
- Si el día es de descanso o no tiene rutina asignada, indicarlo claramente.

### RF-3 — Detalle de ejercicio
Por cada ejercicio de la rutina del día mostrar:
- Nombre del ejercicio.
- GIF animado del movimiento (y/o imagen miniatura).
- Instrucciones paso a paso **en español**.
- Series y repeticiones objetivo definidas por el plan.
- Equipo necesario y músculo objetivo (informativo).

### RF-4 — Registro de entrenamiento
- Por cada ejercicio, registrar cada serie realizada: **número de serie, repeticiones y peso cargado** (kg).
- El registro debe ser rápido y usable con una mano, con el teléfono en el gym (botones grandes, mínimo tipeo).
- Los registros quedan guardados con fecha, asociados al usuario y al ejercicio.

### RF-5 — Comparación / progresión
- Al registrar un ejercicio, mostrar al lado lo que se levantó la **última vez / semana anterior** en ese mismo ejercicio (peso y reps por serie).
- Historial consultable por ejercicio (evolución del peso en el tiempo).

### RF-6 — Asignación de rutinas (fuera de la app)
- Las rutinas **no se crean en la app**. Las genera el agente entrenador del repo `Gym` y las sube al backend asignadas al usuario.
- La app solo **lee** planes y rutinas; escribe únicamente registros de entrenamiento.

## 4. Requerimientos del agente entrenador (repo `Gym`)

- Recibe las **metas** del usuario en lenguaje natural (ej. hipertrofia, fuerza, días por semana disponibles, equipo disponible, limitaciones).
- Se comporta como **experto entrenador de gimnasio**.
- Selecciona ejercicios exclusivamente del dataset local (`exercises-dataset/data/exercises.json`), filtrando por grupo muscular y equipo.
- Genera un **plan mensual**: qué ejercicios tocan cada día, con series y repeticiones objetivo.
- Sube el plan a Supabase asignado al usuario.
- En meses siguientes, debe poder leer el **historial de pesos registrados** desde Supabase para progresar las cargas según lo realmente levantado.

## 5. Requerimientos no funcionales

- **Plataforma:** PWA instalable desde Safari en iPhone ("Agregar a pantalla de inicio"). Sin App Store.
- **Costo:** operar dentro de capas gratuitas (Supabase free tier, Vercel/Netlify free tier).
- **Rendimiento:** la rutina del día (~6–8 ejercicios con sus GIFs, ~500 KB) debe cargar rápido con datos móviles dentro del gym.
- **Idioma de la UI y contenidos:** español.
- **Unidades:** kilogramos (kg).
- **Usuarios:** un solo usuario real; la arquitectura no necesita escalar a multiusuario, pero el modelo de datos sí asocia todo a `user_id` (no cuesta nada y deja la puerta abierta).

## 6. Restricciones y licencias

- Código y datos del dataset: licencia MIT.
- Imágenes y GIFs: **© Gym Visual** (redistribuidos con permiso a 180×180). OK para uso personal; mantener la atribución `© Gym visual — https://gymvisual.com/`. **Revisar licencia antes de cualquier uso comercial o publicación de la app.**

## 7. Fuera de alcance (por ahora)

- Publicación en App Store / app nativa.
- Multiusuario real, roles, o funciones sociales.
- Creación/edición de rutinas desde la propia app.
- Nutrición, cardio programado, wearables.
