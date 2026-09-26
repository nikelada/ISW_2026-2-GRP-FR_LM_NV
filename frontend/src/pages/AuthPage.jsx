import { useState } from 'react';
import Aviso from '../components/ui/Aviso.jsx';
import Boton from '../components/ui/Boton.jsx';
import Campo from '../components/ui/Campo.jsx';
import { login, register } from '../services/authService.js';
import { saveSession } from '../utils/session.js';

export default function AuthPage({ onAuthenticated }) {
  const [modo, setModo] = useState('login');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const esLogin = modo === 'login';

  function cambiarModo() {
    setModo(esLogin ? 'registro' : 'login');
    setError('');
  }

  async function enviar(event) {
    event.preventDefault();
    setEnviando(true);
    setError('');
    const datos = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const session = esLogin ? await login(datos) : await register(datos);
      saveSession(session);
      onAuthenticated(session.user);
    } catch (e) {
      setError(e.message);
      setEnviando(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-6">
      <section className="w-full max-w-sm rounded-lg border border-stone-200 bg-white p-8">
        <h1 className="mb-1 text-2xl font-bold">NES Eventos</h1>
        <p className="mb-6 text-sm text-stone-500">{esLogin ? 'Inicia sesión para continuar.' : 'Crea una cuenta nueva.'}</p>
        <form key={modo} className="grid gap-4" onSubmit={enviar}>
          {!esLogin && <Campo etiqueta="Nombre"><input name="name" type="text" autoComplete="name" required /></Campo>}
          {!esLogin && (
            <Campo etiqueta="Área">
              <select name="role">
                <option value="usuario">Producción y Comercial</option>
                <option value="manager">Gerencia</option>
                <option value="admin">Administración</option>
              </select>
            </Campo>
          )}
          <Campo etiqueta="Correo"><input name="email" type="email" autoComplete="email" required /></Campo>
          <Campo etiqueta="Contraseña">
            <input name="password" type="password" autoComplete={esLogin ? 'current-password' : 'new-password'} required />
          </Campo>
          {!esLogin && <p className="text-xs text-stone-500">La contraseña debe tener al menos 8 caracteres.</p>}
          {error && <Aviso tipo="error" className=""><p>{error}</p></Aviso>}
          <Boton type="submit" disabled={enviando}>
            <span>{enviando ? 'Enviando…' : esLogin ? 'Ingresar' : 'Crear cuenta'}</span><span aria-hidden="true">→</span>
          </Boton>
        </form>
        <p className="mt-5 text-center text-sm text-stone-500">
          {esLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
          <Boton variante="enlace" onClick={cambiarModo}>{esLogin ? 'Crear una' : 'Iniciar sesión'}</Boton>
        </p>
      </section>
    </main>
  );
}
