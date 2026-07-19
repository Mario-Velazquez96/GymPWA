#!/usr/bin/env node
/**
 * check-rls.mjs — verificación operacional de RLS (feature 01_supabase_schema_and_rls).
 *
 * Uso:  node scripts/check-rls.mjs
 *
 * Lee de .env.local: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, E2E_EMAIL,
 * E2E_PASSWORD. Nunca imprime los valores de esas variables.
 *
 * Checks:
 *   (a) R7 — cliente anon SIN sesión: select en las 5 tablas → 0 filas, sin error.
 *   (b) R8 — usuario autenticado inserta en workout_logs con user_id AJENO → rechazado.
 *   (c) R6 — insert con el user_id propio → aceptado; la fila se borra al final (cleanup).
 *
 * Sin dependencias: solo Node ≥ 18 (fetch global). Sale con código ≠ 0 si algún
 * check falla. Si las tablas aún no existen, lo distingue de un fallo real de RLS.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TABLES = ['exercises', 'plans', 'plan_days', 'plan_exercises', 'workout_logs'];
const FOREIGN_USER_ID = '00000000-0000-0000-0000-000000000001';

// ---------------------------------------------------------------- utilidades

function loadEnvLocal() {
  let raw;
  try {
    raw = readFileSync(resolve(ROOT, '.env.local'), 'utf8');
  } catch {
    fail('.env.local no encontrado. Copia .env.example → .env.local y complétalo.');
    process.exit(1);
  }
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let value = m[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[m[1]] = value;
  }
  return env;
}

let failures = 0;
function pass(msg) {
  console.log(`  PASS  ${msg}`);
}
function fail(msg) {
  failures += 1;
  console.log(`  FAIL  ${msg}`);
}
function info(msg) {
  console.log(`  ....  ${msg}`);
}

async function parseBody(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** ¿El error significa "la tabla no existe todavía" (migraciones sin aplicar)? */
function isMissingTable(status, body) {
  if (typeof body === 'object' && body !== null) {
    if (body.code === 'PGRST205' || body.code === '42P01') return true;
    const msg = `${body.message ?? ''}`;
    if (/could not find the table|does not exist/i.test(msg)) return true;
  }
  return status === 404;
}

function missingTableMsg(table) {
  return `${table}: la tabla no existe (aún no se aplican las migraciones — pega 001_schema.sql y luego 002_rls.sql en el SQL Editor)`;
}

// ------------------------------------------------------------------- checks

async function checkAnonSelect(url, anonKey) {
  console.log('\n[a] R7 — anon sin sesión: select en cada tabla debe devolver 0 filas');
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
  for (const table of TABLES) {
    const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, { headers });
    const body = await parseBody(res);
    if (res.ok && Array.isArray(body) && body.length === 0) {
      pass(`${table}: 0 filas, sin error`);
    } else if (res.ok && Array.isArray(body)) {
      fail(`${table}: el anon SIN sesión leyó ${body.length} fila(s) — RLS no está filtrando`);
    } else if (isMissingTable(res.status, body)) {
      fail(missingTableMsg(table));
    } else {
      fail(`${table}: respuesta inesperada (HTTP ${res.status})`);
    }
  }
}

async function signIn(url, anonKey, email, password) {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await parseBody(res);
  if (!res.ok || typeof body !== 'object' || !body.access_token || !body.user?.id) {
    fail(
      `No se pudo iniciar sesión con E2E_EMAIL/E2E_PASSWORD (HTTP ${res.status}). ` +
        'Verifica que el usuario exista en Authentication → Users del dashboard.',
    );
    return null;
  }
  pass('Sesión iniciada con el usuario E2E');
  return { token: body.access_token, userId: body.user.id };
}

async function checkSpoofedInsert(url, anonKey, session) {
  console.log('\n[b] R8 — insert en workout_logs con user_id AJENO debe ser rechazado');
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${session.token}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
  const res = await fetch(`${url}/rest/v1/workout_logs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      user_id: FOREIGN_USER_ID,
      exercise_id: '0001',
      set_number: 1,
      reps: 1,
      weight_kg: 0,
    }),
  });
  const body = await parseBody(res);
  if (res.status === 201) {
    fail('el insert con user_id ajeno fue ACEPTADO — falta la policy with check');
    // Cleanup de la fila indebida
    const row = Array.isArray(body) ? body[0] : null;
    if (row?.id) {
      await fetch(`${url}/rest/v1/workout_logs?id=eq.${row.id}`, { method: 'DELETE', headers });
    }
  } else if (isMissingTable(res.status, body)) {
    fail(missingTableMsg('workout_logs'));
  } else if (
    res.status === 403 ||
    (typeof body === 'object' && body !== null && body.code === '42501')
  ) {
    pass('insert con user_id ajeno rechazado (violación de policy RLS)');
  } else {
    fail(`respuesta inesperada al insert con user_id ajeno (HTTP ${res.status})`);
  }
}

async function checkOwnInsert(url, anonKey, session) {
  console.log('\n[c] R6 — insert con el user_id propio debe funcionar (y luego se borra)');
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${session.token}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };

  // workout_logs.exercise_id referencia exercises(id): necesitamos un id real.
  const exRes = await fetch(`${url}/rest/v1/exercises?select=id&limit=1`, { headers });
  const exBody = await parseBody(exRes);
  if (!exRes.ok) {
    if (isMissingTable(exRes.status, exBody)) fail(missingTableMsg('exercises'));
    else fail(`no se pudo leer el catálogo exercises (HTTP ${exRes.status})`);
    return;
  }
  if (!Array.isArray(exBody) || exBody.length === 0) {
    info(
      'SKIP: el catálogo exercises está vacío (el seed pertenece al repo Gym). ' +
        'Vuelve a correr este script después del seed para verificar el insert propio.',
    );
    return;
  }
  const exerciseId = exBody[0].id;

  const insRes = await fetch(`${url}/rest/v1/workout_logs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      user_id: session.userId,
      exercise_id: exerciseId,
      set_number: 1,
      reps: 1,
      weight_kg: 0,
    }),
  });
  const insBody = await parseBody(insRes);
  if (insRes.status !== 201 || !Array.isArray(insBody) || !insBody[0]?.id) {
    if (isMissingTable(insRes.status, insBody)) fail(missingTableMsg('workout_logs'));
    else fail(`el insert con el user_id propio falló (HTTP ${insRes.status})`);
    return;
  }
  pass('insert con el user_id propio aceptado');

  const delRes = await fetch(`${url}/rest/v1/workout_logs?id=eq.${insBody[0].id}`, {
    method: 'DELETE',
    headers,
  });
  if (delRes.ok) pass('fila de prueba eliminada (cleanup)');
  else fail(`no se pudo borrar la fila de prueba (HTTP ${delRes.status}) — bórrala a mano`);
}

// --------------------------------------------------------------------- main

async function main() {
  console.log('check-rls.mjs — verificación de RLS contra el proyecto Supabase\n');

  const env = loadEnvLocal();
  const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'E2E_EMAIL', 'E2E_PASSWORD'];
  const missing = required.filter((k) => !env[k]);
  if (missing.length > 0) {
    fail(`Faltan variables en .env.local: ${missing.join(', ')}`);
    process.exit(1);
  }

  const url = env.VITE_SUPABASE_URL.replace(/\/+$/, '');
  const anonKey = env.VITE_SUPABASE_ANON_KEY;

  await checkAnonSelect(url, anonKey);

  console.log('\n[auth] Iniciando sesión como el usuario E2E');
  const session = await signIn(url, anonKey, env.E2E_EMAIL, env.E2E_PASSWORD);
  if (session) {
    await checkSpoofedInsert(url, anonKey, session);
    await checkOwnInsert(url, anonKey, session);
  } else {
    fail('checks (b) y (c) omitidos: sin sesión');
  }

  console.log(
    failures === 0
      ? '\nResultado: todos los checks PASARON.'
      : `\nResultado: ${failures} check(s) FALLARON.`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  fail(`Error inesperado: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
