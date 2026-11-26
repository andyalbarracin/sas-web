'use client';

import { useState } from 'react';

/** Pantalla de acceso: se pide un enlace mágico por email. */
export default function Login({ problem, dev, demo }: { problem: string | null; dev: boolean; demo: boolean }) {
  const [email, setEmail] = useState(dev ? 'dev@localhost.dev' : '');
  const [state, setState] = useState<'idle' | 'busy' | 'sent'>('idle');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('busy');
    setErr('');
    const r = await fetch('/api/admin/magic/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.ok) {
      // modo desarrollo: ir directo al enlace
      if (typeof j.link === 'string') {
        location.assign(j.link);
        return;
      }
      setState('sent');
      setMsg(j.dev ? `${j.message} En desarrollo, el enlace aparece en la consola del servidor.` : j.message);
    } else {
      setState('idle');
      setErr(j.error || 'No se pudo enviar el enlace.');
    }
  }

  async function enterDemo() {
    setState('busy');
    setErr('');
    const r = await fetch('/api/admin/demo', { method: 'POST' });
    if (r.ok) {
      location.replace('/admin');
      return;
    }
    setState('idle');
    setErr('El acceso de prueba no está disponible.');
  }

  return (
    <main className="a-login">
      <form className="a-login-card" onSubmit={submit}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/sas-logo.svg" alt="SAS South America Supplier" width={220} height={36} />
        <h1>Panel del sitio</h1>
        {problem ? (
          <p className="a-err" role="alert">
            El acceso no está configurado: {problem}
          </p>
        ) : state === 'sent' ? (
          <>
            <p className="a-note" role="status">
              {msg}
            </p>
            <button type="button" className="a-btn a-btn-quiet" onClick={() => setState('idle')}>
              Usar otro email
            </button>
          </>
        ) : (
          <>
            <label htmlFor="email">Email</label>
            <input id="email" className="a-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
            {err ? (
              <p className="a-err" role="alert">
                {err}
              </p>
            ) : null}
            <button className="a-btn a-btn-primary" type="submit" disabled={state === 'busy' || !email}>
              {state === 'busy' ? 'Enviando…' : 'Enviarme un enlace para ingresar'}
            </button>
            <p className="a-hint">Te llega un enlace que vence en 15 minutos y sirve una sola vez. Sin contraseñas.</p>
            {dev ? <p className="a-hint">Modo desarrollo: tocá el botón y entrás directo, sin email real.</p> : null}
            {demo ? (
              <button type="button" className="a-btn a-btn-quiet" onClick={enterDemo} disabled={state === 'busy'}>
                Entrar sin email (acceso de prueba)
              </button>
            ) : null}
          </>
        )}
      </form>
    </main>
  );
}
