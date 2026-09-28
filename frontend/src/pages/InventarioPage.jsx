import { useCallback, useState } from 'react';
import DataTable from '../components/DataTable.jsx';
import EncabezadoPagina from '../components/EncabezadoPagina.jsx';
import Antetitulo from '../components/ui/Antetitulo.jsx';
import Aviso from '../components/ui/Aviso.jsx';
import Boton from '../components/ui/Boton.jsx';
import Campo from '../components/ui/Campo.jsx';
import Panel from '../components/ui/Panel.jsx';
import Vacio from '../components/ui/Vacio.jsx';
import { useFetch } from '../hooks/useFetch.js';
import * as inventarioService from '../services/inventarioService.js';

const VACIO = { nombre: '', precio: '', stock: '' };

const precioFormateado = (precio) => Number(precio).toLocaleString('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 2
});

export default function InventarioPage({ user }) {
  const puedeEditar = ['manager', 'admin'].includes(user?.role);
  const { datos: inventario, cargando, error, recargar } = useFetch(useCallback(() => inventarioService.listar(), []));
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [aviso, setAviso] = useState(null);
  const [guardando, setGuardando] = useState(false);

  function editar(item) {
    setEditando(item);
    setForm({ nombre: item.nombre, precio: item.precio, stock: item.stock });
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
      const datos = { ...form, precio: Number(form.precio), stock: Number(form.stock) };
      const guardado = editando
        ? await inventarioService.actualizar(editando.id, datos)
        : await inventarioService.crear(datos);
      setAviso({ tipo: 'success', texto: editando ? `«${guardado.nombre}» actualizado.` : `«${guardado.nombre}» agregado al inventario.` });
      cancelar();
      recargar();
    } catch (e) {
      setErrores(e.data?.errores || {});
      setAviso({ tipo: 'error', texto: e.message });
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(item) {
    if (!window.confirm(`¿Eliminar «${item.nombre}» del inventario?`)) return;
    setAviso(null);
    try {
      await inventarioService.eliminar(item.id);
      if (editando?.id === item.id) cancelar();
      setAviso({ tipo: 'success', texto: `«${item.nombre}» eliminado del inventario.` });
      recargar();
    } catch (e) {
      setAviso({ tipo: 'error', texto: e.message });
    }
  }

  const campo = (nombre) => ({
    name: nombre,
    value: form[nombre],
    onChange: (e) => setForm({ ...form, [nombre]: e.target.value })
  });

  const columnas = [
    { campo: 'nombre', titulo: 'Nombre', render: (item) => <strong>{item.nombre}</strong> },
    { campo: 'precio', titulo: 'Precio', render: (item) => precioFormateado(item.precio) },
    { campo: 'stock', titulo: 'Stock', render: (item) => item.stock }
  ];
  if (puedeEditar) {
    columnas.push({
      campo: 'acciones',
      titulo: '',
      className: 'whitespace-nowrap text-right',
      render: (item) => (
        <span className="inline-flex gap-3.5">
          <Boton variante="enlace" onClick={() => editar(item)}>Editar</Boton>
          <Boton variante="enlace" onClick={() => eliminar(item)}>Eliminar</Boton>
        </span>
      )
    });
  }

  return (
    <>
      <EncabezadoPagina antetitulo="Gestión" titulo="Inventario" descripcion="Elementos disponibles, precios y stock para la operación de eventos." />
      <div className={`grid grid-cols-1 items-start gap-4 ${puedeEditar ? 'lg:grid-cols-[minmax(0,1fr)_380px]' : ''}`}>
        <Panel>
          {aviso && <Aviso tipo={aviso.tipo} className="m-3.5"><p>{aviso.texto}</p></Aviso>}
          {error && <Aviso tipo="error" className="m-3.5">{error}</Aviso>}
          {cargando && !inventario.length
            ? <Vacio>Cargando…</Vacio>
            : <DataTable columnas={columnas} datos={inventario} vacio="No hay elementos en el inventario." seleccionadoId={editando?.id} />}
        </Panel>

        {puedeEditar && (
          <Panel lateral>
            <Antetitulo className="mb-2">{editando ? 'Actualizar elemento' : 'Nuevo elemento'}</Antetitulo>
            <h2 className="mb-4 text-xl font-bold">{editando ? editando.nombre : 'Agregar al inventario'}</h2>
            <form className="grid gap-4" onSubmit={guardar} noValidate>
              <Campo etiqueta="Nombre" error={errores.nombre}><input type="text" maxLength={150} required {...campo('nombre')} /></Campo>
              <Campo etiqueta="Precio" error={errores.precio}><input type="number" min="0" step="0.01" required {...campo('precio')} /></Campo>
              <Campo etiqueta="Stock" error={errores.stock}><input type="number" min="0" step="1" required {...campo('stock')} /></Campo>
              <p className="text-xs text-stone-500">El precio admite hasta dos decimales y el stock debe ser un número entero.</p>
              <div className="flex gap-2.5">
                <Boton type="submit" className="flex-1" disabled={guardando}>
                  <span>{editando ? 'Guardar cambios' : 'Agregar elemento'}</span><span aria-hidden="true">→</span>
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