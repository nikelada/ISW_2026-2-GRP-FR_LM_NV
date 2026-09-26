import { useCallback, useEffect, useState } from 'react';
import DataTable from '../components/DataTable.jsx';
import EncabezadoPagina from '../components/EncabezadoPagina.jsx';
import Antetitulo from '../components/ui/Antetitulo.jsx';
import Aviso from '../components/ui/Aviso.jsx';
import Boton from '../components/ui/Boton.jsx';
import Campo from '../components/ui/Campo.jsx';
import Panel from '../components/ui/Panel.jsx';
import Vacio from '../components/ui/Vacio.jsx';
import { useFetch } from '../hooks/useFetch.js';
import * as clienteService from '../services/clienteService.js';
import { esProduccion } from '../utils/roles.js';

const VACIO = { nombre: '', telefono: '', correo: '' };

// Gestionar clientes: registrar y actualizar los datos de un cliente.
export default function ClientesPage({ user, onNavegar }) {
  const puedeEditar = esProduccion(user);
  const [busqueda, setBusqueda] = useState('');
  const [q, setQ] = useState('');
  const { datos: clientes, cargando, error, recargar } = useFetch(useCallback(() => clienteService.listar(q), [q]));

  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [aviso, setAviso] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setQ(busqueda.trim()), 250);
    return () => clearTimeout(timer);
  }, [busqueda]);

  function editar(cliente) {
    setEditando(cliente);
    setForm({ nombre: cliente.nombre, telefono: cliente.telefono, correo: cliente.correo });
    setErrores({});
    setAviso(null);
  }

  function cancelar() {
    setEditando(null);
    setForm(VACIO);
    setErrores({});
  }

  async function guardar(event) {
    event.preventDefault();
    setGuardando(true);
    setAviso(null);
    try {
      const guardado = editando
        ? await clienteService.actualizar(editando.id, form)
        : await clienteService.crear(form);
      setAviso({ tipo: 'success', texto: editando ? `Datos de «${guardado.nombre}» actualizados.` : `Cliente «${guardado.nombre}» registrado y disponible para nuevas solicitudes.` });
      cancelar();
      recargar();
    } catch (e) {
      setErrores(e.data?.errores || {});
      setAviso({ tipo: 'error', texto: e.message });
    } finally {
      setGuardando(false);
    }
  }

  const campo = (nombre) => ({
    name: nombre,
    value: form[nombre],
    onChange: (e) => setForm({ ...form, [nombre]: e.target.value })
  });

  const columnas = [
    { campo: 'nombre', titulo: 'Nombre', render: (c) => <strong>{c.nombre}</strong> },
    { campo: 'telefono', titulo: 'Teléfono' },
    { campo: 'correo', titulo: 'Correo' }
  ];
  if (puedeEditar) {
    columnas.push({
      campo: 'acciones',
      titulo: '',
      className: 'whitespace-nowrap text-right',
      render: (c) => (
        <span className="inline-flex gap-3.5">
          <Boton variante="enlace" onClick={() => editar(c)}>Editar</Boton>
          <Boton variante="enlace" onClick={() => onNavegar(`solicitudes?nueva=1&cliente=${c.id}`)}>Nueva solicitud</Boton>
        </span>
      )
    });
  }

  return (
    <>
      <EncabezadoPagina antetitulo="Gestión" titulo="Clientes" descripcion="Clientes registrados y disponibles para asociarlos a nuevas solicitudes." />
      <div className={`grid grid-cols-1 items-start gap-4 ${puedeEditar ? 'lg:grid-cols-[minmax(0,1fr)_380px]' : ''}`}>
        <Panel>
          <div className="flex gap-2.5 border-b border-stone-200 p-3.5">
            <input type="search" placeholder="Buscar por nombre, correo o teléfono" aria-label="Buscar clientes" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          {error && <Aviso tipo="error" className="m-3.5">{error}</Aviso>}
          {cargando && !clientes.length
            ? <Vacio>Cargando…</Vacio>
            : <DataTable columnas={columnas} datos={clientes} vacio="No hay clientes que coincidan con la búsqueda." seleccionadoId={editando?.id} />}
        </Panel>

        {puedeEditar && (
          <Panel lateral>
            <Antetitulo className="mb-2">{editando ? 'Actualizar datos' : 'Nuevo cliente'}</Antetitulo>
            <h2 className="mb-4 text-xl font-bold">{editando ? editando.nombre : 'Registrar cliente'}</h2>
            {aviso && <Aviso tipo={aviso.tipo}><p>{aviso.texto}</p></Aviso>}
            <form className="grid gap-4" onSubmit={guardar} noValidate>
              <Campo etiqueta="Nombre" error={errores.nombre}><input type="text" maxLength={150} {...campo('nombre')} /></Campo>
              <Campo etiqueta="Teléfono" error={errores.telefono}><input type="tel" maxLength={30} {...campo('telefono')} /></Campo>
              <Campo etiqueta="Correo" error={errores.correo}><input type="email" maxLength={255} {...campo('correo')} /></Campo>
              <p className="text-xs text-stone-500">Todos los campos son obligatorios.</p>
              <div className="flex gap-2.5">
                <Boton type="submit" className="flex-1" disabled={guardando}>
                  <span>{editando ? 'Guardar cambios' : 'Registrar cliente'}</span><span aria-hidden="true">→</span>
                </Boton>
                {editando && <Boton variante="secundario" onClick={cancelar}>Cancelar</Boton>}
              </div>
            </form>
          </Panel>
        )}
      </div>
    </>
  );
}
