'use client';

import { useEffect, useRef, useState } from 'react';
import type { UIStrings } from '@/lib/i18n';

interface Props {
  lang: 'es' | 'en';
  ui: UIStrings['form'];
  interests: string[];
  success: string;
  fallbackEmail: string;
}

type Errors = Partial<Record<'name' | 'email' | 'message', string>>;

export default function ContactForm({ lang, ui, interests, success, fallbackEmail }: Props) {
  const [state, setState] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [errors, setErrors] = useState<Errors>({});
  const [interest, setInterest] = useState('');
  const started = useRef(Date.now());
  const formRef = useRef<HTMLFormElement>(null);

  // Preselección desde ?tema= (enlaces "Consultar por esta línea")
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('tema');
    if (q) setInterest(q);
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries()) as Record<string, string>;
    const errs: Errors = {};
    if (!data.name?.trim()) errs.name = ui.required;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email || '')) errs.email = ui.invalidEmail;
    if (!data.message?.trim()) errs.message = ui.required;
    setErrors(errs);
    if (Object.keys(errs).length) {
      const first = Object.keys(errs)[0];
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setState('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, lang, elapsed: Date.now() - started.current }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState('ok');
      formRef.current?.reset();
      setInterest('');
    } catch {
      setState('error');
    }
  }

  const err = (k: keyof Errors) =>
    errors[k] ? (
      <span className="err" id={`err-${k}`}>
        {errors[k]}
      </span>
    ) : null;

  return (
    <form className="form" ref={formRef} onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="f-name">{ui.name}</label>
        <input id="f-name" name="name" autoComplete="given-name" required aria-invalid={!!errors.name} aria-describedby={errors.name ? 'err-name' : undefined} />
        {err('name')}
      </div>
      <div className="field">
        <label htmlFor="f-last">{ui.lastName}</label>
        <input id="f-last" name="lastName" autoComplete="family-name" />
      </div>
      <div className="field">
        <label htmlFor="f-company">{ui.company}</label>
        <input id="f-company" name="company" autoComplete="organization" />
      </div>
      <div className="field">
        <label htmlFor="f-phone">{ui.phone}</label>
        <input id="f-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" />
      </div>
      <div className="field">
        <label htmlFor="f-email">{ui.email}</label>
        <input id="f-email" name="email" type="email" autoComplete="email" required aria-invalid={!!errors.email} aria-describedby={errors.email ? 'err-email' : undefined} />
        {err('email')}
      </div>
      <div className="field">
        <label htmlFor="f-interest">{ui.interest}</label>
        <select id="f-interest" name="interest" value={interest} onChange={(e) => setInterest(e.target.value)}>
          <option value="">{ui.interestNone}</option>
          {interests.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
          {interest && !interests.includes(interest) ? <option value={interest}>{interest}</option> : null}
        </select>
      </div>
      <div className="field field-full">
        <label htmlFor="f-msg">{ui.message}</label>
        <textarea id="f-msg" name="message" required aria-invalid={!!errors.message} aria-describedby={`hint-msg${errors.message ? ' err-message' : ''}`} />
        <span className="hint" id="hint-msg">
          {ui.messageHint}
        </span>
        {err('message')}
      </div>
      <div className="hp" aria-hidden="true">
        <label htmlFor="f-web">Web</label>
        <input id="f-web" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {state === 'ok' ? (
        <p className="form-ok" role="status">
          {success}
        </p>
      ) : null}
      {state === 'error' ? (
        <p className="form-bad" role="alert">
          {ui.error} <a href={`mailto:${fallbackEmail}`}>{fallbackEmail}</a>.
        </p>
      ) : null}
      <div className="form-foot">
        <small>{ui.privacy}</small>
        <button className="btn btn-blue" type="submit" disabled={state === 'sending'}>
          {state === 'sending' ? ui.sending : ui.send}
        </button>
      </div>
    </form>
  );
}
