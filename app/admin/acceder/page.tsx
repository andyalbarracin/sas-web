'use client';

import { useEffect, useState } from 'react';

/**
 * Página de destino del enlace mágico. El token llega en el fragmento (#t=...),
 * y se canjea recién cuando la persona toca «Ingresar»: así los escáneres de
 * enlaces del correo no lo gastan.
 */
export default function Acceder() {
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle');
  const [err, setErr] = useState('');

  useEffect(() => {
    const t = new URLSearchParams(location.hash.slice(1)).get('t');
    if (t) {
      setToken(t);
      // quita el token de la barra de direcciones y del historial
      history.replaceState(null, '', location.pathname);
      // en desarrollo se entra sin tocar «Ingresar» (no hay escáneres de correo)
      if (process.env.NODE_ENV !== 'production') enter(t);
    } else {
      // en desarrollo (Strict Mode) el efecto corre dos veces: no pisar el token ya leído
      setToken((prev) => prev ?? '');
    }
  }, []);

  async function enter(value = token) {
    if (!value) return;
    setState('busy');
    const r = await fetch('/api/admin/magic/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: value }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.ok) {
      location.replace('/admin');
      return;
    }
    setState('error');
    setErr(j.error || 'No se pudo ingresar.');
  }

  return (
    <main className="a-login">
      <div className="a-login-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/sas-logo.svg" alt="SAS South America Supplier" width={220} height={36} />
        <h1>Ingresar al panel</h1>
        {token === null ? null : !token ? (
          <>
            <p className="a-hint">Este enlace está incompleto. Pedí uno nuevo desde la pantalla de acceso.</p>
            <a className="a-btn a-btn-primary" href="/admin">
              Pedir un enlace
            </a>
          </>
        ) : state === 'error' ? (
          <>
            <p className="a-err" role="alert">
              {err}
            </p>
            <a className="a-btn a-btn-primary" href="/admin">
              Pedir un enlace nuevo
            </a>
          </>
        ) : (
          <>
            <p className="a-hint">Confirmá para abrir el panel en este navegador. La sesión dura 12 horas.</p>
            <button type="button" className="a-btn a-btn-primary" onClick={() => enter()} disabled={state === 'busy'}>
              {state === 'busy' ? 'Ingresando…' : 'Ingresar'}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
