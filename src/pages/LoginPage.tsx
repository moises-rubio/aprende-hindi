import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authErrorMessage, loginWithEmail, registerWithEmail, resetPassword } from '../services/authService';

type Mode = 'login' | 'register' | 'reset';

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'reset') {
      setBusy(true);
      try {
        await resetPassword(email);
        setResetSent(true);
      } catch (err) {
        setError(authErrorMessage(err));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'register') {
        await registerWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
      navigate('/');
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setResetSent(false);
  };

  const titles: Record<Mode, string> = {
    login: 'Iniciar sesión',
    register: 'Crear cuenta',
    reset: 'Recuperar contraseña',
  };

  return (
    <main className="page">
      <div className="card auth-card">
        <h1>{titles[mode]}</h1>
        {mode !== 'reset' && (
          <p className="muted">
            {mode === 'login'
              ? 'Inicia sesión para guardar tu progreso en la nube y continuar en cualquier dispositivo.'
              : 'Crea una cuenta para guardar tu progreso en la nube. Tu avance actual como invitado se conservará.'}
          </p>
        )}
        {mode === 'reset' && !resetSent && (
          <p className="muted">
            Escribe tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
          </p>
        )}

        {mode === 'reset' && resetSent ? (
          <div>
            <p>
              📧 Si existe una cuenta con el correo <strong>{email}</strong>, te hemos enviado un enlace
              para restablecer tu contraseña. Revisa tu bandeja de entrada (y la carpeta de spam).
            </p>
            <button type="button" className="btn btn-primary" onClick={() => switchMode('login')}>
              Volver a iniciar sesión
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <label className="form-label" htmlFor="email">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              className="text-input auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            {mode !== 'reset' && (
              <>
                <label className="form-label" htmlFor="password">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  className="text-input auth-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              </>
            )}

            {mode === 'register' && (
              <>
                <label className="form-label" htmlFor="confirmPassword">
                  Confirmar contraseña
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="text-input auth-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </>
            )}

            {mode === 'login' && (
              <p className="auth-forgot">
                <button type="button" className="link-button" onClick={() => switchMode('reset')}>
                  ¿Olvidaste tu contraseña?
                </button>
              </p>
            )}

            {error && (
              <p className="warning" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="btn btn-primary btn-big" disabled={busy}>
              {busy
                ? 'Un momento…'
                : mode === 'login'
                  ? 'Iniciar sesión'
                  : mode === 'register'
                    ? 'Crear cuenta'
                    : 'Enviar enlace'}
            </button>
          </form>
        )}

        {mode !== 'reset' && (
          <p className="auth-toggle">
            {mode === 'login' ? (
              <>
                ¿No tienes cuenta?{' '}
                <button type="button" className="link-button" onClick={() => switchMode('register')}>
                  Regístrate
                </button>
              </>
            ) : (
              <>
                ¿Ya tienes cuenta?{' '}
                <button type="button" className="link-button" onClick={() => switchMode('login')}>
                  Inicia sesión
                </button>
              </>
            )}
          </p>
        )}
        {mode === 'reset' && !resetSent && (
          <p className="auth-toggle">
            <button type="button" className="link-button" onClick={() => switchMode('login')}>
              Volver a iniciar sesión
            </button>
          </p>
        )}

        <p className="muted small">
          <Link to="/">Continuar sin cuenta →</Link>
        </p>
      </div>
    </main>
  );
}
