// src/pages/ProductCreate.jsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { CATEGORIAS } from './products/categories';
import { ArrowLeft } from 'lucide-react';
import { inSet, isNonNegNumber, isRequired, isURL } from '../utils/validators';
import { confirm, success, error } from './alerts';

export default function ProductCreate() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('vajilla');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [activo, setActivo] = useState(true);

  // solo lectura (cuando edita)
  const [stockReservado, setStockReservado] = useState(0);
  const [stockDisponible, setStockDisponible] = useState(0);

  // para detectar cambios en edición
  const [initialData, setInitialData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [errs, setErrs] = useState({});

  // ==============================
  // Cargar datos si es edición
  // ==============================
  useEffect(() => {
    if (!isEdit) return;

    (async () => {
      try {
        const { data } = await axios.get(`/api/productos/${id}/`);

        const dataLoaded = {
          nombre: data.nombre || '',
          descripcion: data.descripcion || '',
          categoria: data.categoria || 'vajilla',
          precio: String(data.precio ?? ''),
          stock: String(data.stock ?? ''),
          imagenUrl: data.imagen_url || '',
          activo: Boolean(data.activo),
        };

        setNombre(dataLoaded.nombre);
        setDescripcion(dataLoaded.descripcion);
        setCategoria(dataLoaded.categoria);
        setPrecio(dataLoaded.precio);
        setStock(dataLoaded.stock);
        setImagenUrl(dataLoaded.imagenUrl);
        setActivo(dataLoaded.activo);
        setStockReservado(Number(data.stock_reservado || 0));
        setStockDisponible(Number(data.stock_disponible || 0));

        setInitialData(dataLoaded);
      } catch (e) {
        await error({
          title: 'Error',
          message: 'No se pudo cargar el producto.',
        });
      }
    })();
  }, [id, isEdit]);

  // ==============================
  // Detectar cambios (como EmployeeCreate)
  // ==============================
  const editForm = useMemo(
    () => ({
      nombre,
      descripcion,
      categoria,
      precio,
      stock,
      imagenUrl,
      activo,
    }),
    [nombre, descripcion, categoria, precio, stock, imagenUrl, activo]
  );

  const isEditDirty = useMemo(() => {
    if (!isEdit || !initialData) return false;
    return JSON.stringify(editForm) !== JSON.stringify(initialData);
  }, [isEdit, editForm, initialData]);

  // ¿Hay algo escrito en el alta?
  const createHasData = useMemo(() => {
    if (isEdit) return false;
    return (
      nombre.trim() !== '' ||
      descripcion.trim() !== '' ||
      categoria !== 'vajilla' ||
      precio.trim() !== '' ||
      stock.trim() !== '' ||
      imagenUrl.trim() !== ''
    );
  }, [isEdit, nombre, descripcion, categoria, precio, stock, imagenUrl]);

  // ==============================
  // Validación
  // ==============================
  const validate = () => {
    const e = {};
    const CAT_VALUES = CATEGORIAS.map((c) => c.value);

    if (!isRequired(nombre)) e.nombre = 'Nombre es obligatorio.';
    if (!isRequired(descripcion)) e.descripcion = 'Descripción es obligatoria.';
    if (!inSet(categoria, CAT_VALUES)) e.categoria = 'Categoría inválida.';
    if (!isRequired(precio) || !isNonNegNumber(precio))
      e.precio = 'Precio es obligatorio y debe ser ≥ 0.';
    if (!isRequired(stock) || !isNonNegNumber(stock))
      e.stock = 'Stock es obligatorio y debe ser ≥ 0.';

    if (!isRequired(imagenUrl)) {
      e.imagen_url = 'URL de imagen es obligatoria.';
    } else if (!isURL(imagenUrl)) {
      e.imagen_url = 'URL de imagen inválida (debe empezar con http/https).';
    }

    return e;
  };

  // ==============================
  // Volver / Cancelar (misma lógica que EmployeeCreate)
  // ==============================
  const handleBack = async (e) => {
    if (e) e.preventDefault();

    // Alta
    if (!isEdit) {
      if (!createHasData) {
        navigate('/productos');
        return;
      }

      const ok = await confirm({
        title: 'Tenés datos cargados en el formulario',
        message:
          'Si salís ahora, los datos cargados se van a perder.\n\n¿Seguro que querés volver a productos?',
        okText: 'Salir igualmente',
        cancelText: 'Cancelar',
        tone: 'warn',
      });

      if (ok) navigate('/productos');
      return;
    }

    // Edición
    if (!isEditDirty) {
      navigate('/productos');
      return;
    }

    const ok = await confirm({
      title: 'Tenés cambios sin guardar',
      message:
        'Si salís ahora, las modificaciones realizadas se van a perder.\n\n¿Seguro que querés volver a productos?',
      okText: 'Salir igualmente',
      cancelText: 'Cancelar',
      tone: 'warn',
    });

    if (ok) navigate('/productos');
  };

  // ==============================
  // Submit
  // ==============================
  const onSubmit = async (e) => {
    e.preventDefault();
    const eMap = validate();
    setErrs(eMap);

    if (Object.keys(eMap).length) {
      await error({
        title: 'Error en el formulario',
        message:
          'Por favor, corregí los errores en el formulario antes de continuar.',
      });
      return;
    }

    try {
      setLoading(true);
      const payload = {
        nombre,
        descripcion,
        categoria,
        precio: Number(precio || 0),
        stock: Number(stock || 0),
        imagen_url: imagenUrl,
        activo,
      };

      if (!isEdit) {
        await axios.post('/api/productos/', payload);

        const bc = new BroadcastChannel('dashboard');
        bc.postMessage('invalidate');
        bc.close();

        const goList = await confirm({
          title: 'Producto creado correctamente',
          okText: 'Volver a la lista',
          cancelText: 'Crear otro',
          tone: 'success',
        });

        if (goList) {
          navigate('/productos', {
            replace: true,
            state: { created: true, name: nombre },
          });
        } else {
          // reset al crear otro
          setNombre('');
          setDescripcion('');
          setCategoria('vajilla');
          setPrecio('');
          setStock('');
          setImagenUrl('');
          setActivo(true);
          setErrs({});
        }
      } else {
        await axios.patch(`/api/productos/${id}/`, payload);

        const bc = new BroadcastChannel('dashboard');
        bc.postMessage('invalidate');
        bc.close();

        await success({ title: 'Cambios guardados', message: '' });
        navigate('/productos', {
          replace: true,
          state: { updated: true, name: nombre },
        });
      }
    } catch (err) {
      const m = err?.response?.data
        ? JSON.stringify(err.response.data)
        : err.message;
      await error({ title: 'Operación fallida', message: m });
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // Botón deshabilitado (igual lógica)
  // ==============================
  const isSubmitDisabled =
    loading ||
    (!isEdit && !createHasData) ||
    (isEdit && !isEditDirty);

  // ==============================
  // Render
  // ==============================
  if (!isAdmin) {
    return (
      <Layout>
        <div className="card">
          <h3>Acceso restringido</h3>
          <p className="muted">
            Solo los administradores pueden gestionar productos.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="card form-wrapper">
        {/* Header superior (diseño igual) */}
        <div className="form-header-top">
          <a href="#" onClick={handleBack} className="back-btn">
            <ArrowLeft size={18} />
            Volver a productos
          </a>

          <h2 className="form-title">
            {isEdit ? 'Editar producto' : 'Nuevo producto'}
          </h2>
        </div>

        <form onSubmit={onSubmit} className="form-grid">
          {/* Nombre */}
          <div className="form-group">
            <label>Nombre del producto</label>
            <input
              type="text"
              className={`input ${errs.nombre ? 'input-error' : ''}`}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              aria-label="Nombre del producto"
            />
            {errs.nombre && <p className="text-error">{errs.nombre}</p>}
          </div>

          {/* Categoría */}
          <div className="form-group">
            <label>Categoría</label>
            <select
              className={`input ${errs.categoria ? 'input-error' : ''}`}
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              aria-label="Categoría"
            >
              {CATEGORIAS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            {errs.categoria && <p className="text-error">{errs.categoria}</p>}
          </div>

          {/* Descripción */}
          <div className="form-group col-span-2">
            <label>Descripción</label>
            <textarea
              className={`input textarea ${
                errs.descripcion ? 'input-error' : ''
              }`}
            rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              aria-label="Descripción del producto"
            />
            {errs.descripcion && (
              <p className="text-error">{errs.descripcion}</p>
            )}
          </div>

          {/* Precio y stock */}
          <div className="form-group">
            <label>Precio</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={`input ${errs.precio ? 'input-error' : ''}`}
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              aria-label="Precio del producto"
            />
            {errs.precio && <p className="text-error">{errs.precio}</p>}
          </div>

          <div className="form-group">
            <label>Stock total</label>
            <input
              type="number"
              min="0"
              className={`input ${errs.stock ? 'input-error' : ''}`}
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              aria-label="Stock total"
            />
            {errs.stock && <p className="text-error">{errs.stock}</p>}
          </div>

          {/* Reservado / disponible solo en edición */}
          {isEdit && (
            <>
              <div className="info-box">
                <h4>Reservado</h4>
                <p>{stockReservado}</p>
              </div>
              <div className="info-box">
                <h4>Disponible</h4>
                <p>{stockDisponible}</p>
              </div>
            </>
          )}

          {/* Imagen */}
          <div className="form-group col-span-2">
            <label>URL de la imagen</label>
            <input
              type="url"
              className={`input ${errs.imagen_url ? 'input-error' : ''}`}
              value={imagenUrl}
              onChange={(e) => setImagenUrl(e.target.value)}
              aria-label="URL de la imagen"
            />
            {errs.imagen_url && (
              <p className="text-error">{errs.imagen_url}</p>
            )}

            <div className="image-preview">
              {imagenUrl ? (
                <img src={imagenUrl} alt="preview" />
              ) : (
                <span className="muted">Preview de la imagen</span>
              )}
            </div>
          </div>

          {/* Activo */}
          <label className="switch-row">
            <input
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
            />
            Producto activo
          </label>

          {/* Botones */}
          <div className="form-actions">
            <button className="btn-gold" disabled={isSubmitDisabled}>
              {loading
                ? isEdit
                  ? 'Guardando...'
                  : 'Creando...'
                : isEdit
                ? 'Guardar cambios'
                : 'Crear producto'}
            </button>

            <a href="#" onClick={handleBack} className="btn-cancelar">
              Cancelar
            </a>
          </div>
        </form>
      </div>

      {/* ESTILOS INLINE PARA EL FORM (sin cambios de diseño) */}
      <style>{`
        .form-wrapper {
          padding: 32px;
          border-radius: 18px;
        }

        .form-header-top {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 22px;
        }

        .back-btn {
          display: flex;
          gap: 8px;
          align-items: center;
          color: #555;
          font-size: 14px;
          text-decoration: none;
          cursor: pointer;
        }

        .back-btn:hover {
          color: #111;
        }

        .form-title {
          font-size: 26px;
          font-weight: 700;
          color: #111;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 22px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 14px;
          font-weight: 600;
          color: #444;
        }

        .col-span-2 {
          grid-column: span 2;
        }

        .input {
          padding: 12px 14px;
          background: #f3f4f6;
          border-radius: 10px;
          border: 1px solid transparent;
          font-size: 14px;
          outline: none;
          transition: 0.2s;
        }

        .input:focus {
          border-color: #c9a72c;
          background: #ffffff;
        }

        .input-error {
          border-color: #dc2626 !important;
          background: #fee2e2;
        }

        .textarea {
          resize: vertical;
        }

        .text-error {
          color: #dc2626;
          font-size: 13px;
          margin-top: -4px;
        }

        .info-box {
          background: #eef2ff;
          padding: 14px;
          border-radius: 12px;
          text-align: center;
        }
        .info-box h4 {
          margin: 0;
          font-size: 14px;
          color: #444;
        }
        .info-box p {
          margin: 6px 0 0;
          font-size: 20px;
          font-weight: 700;
          color: #111;
        }

        .image-preview {
          margin-top: 10px;
          border: 1px dashed #d4d4d8;
          border-radius: 12px;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 170px;
          overflow: hidden;
          background: #fafafa;
        }
        .image-preview img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .switch-row {
          display: flex;
          align-items: center;
          gap: 10px;
          grid-column: span 2;
          font-size: 14px;
          cursor: pointer;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          grid-column: span 2;
          justify-content: flex-end;
          margin-top: 8px;
        }

        .btn-gold {
          background: #ffd700;
          padding: 12px 22px;
          border-radius: 10px;
          border: 1px solid #d6b73f;
          font-weight: 600;
          cursor: pointer;
          color: #111;
          transition: 0.2s;
        }
        .btn-gold:hover:enabled {
          background: #f4c430;
        }
        .btn-gold:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: #e5e7eb;
          color: #9ca3af;
          border-color: #d1d5db;
        }

        .btn-cancelar {
          background: #e5e7eb;
          padding: 12px 22px;
          border-radius: 10px;
          font-weight: 600;
          color: #333;
          text-decoration: none;
          cursor: pointer;
          display: inline-block;
        }
        .btn-cancelar:hover {
          background: #d4d4d8;
        }

        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
          .col-span-2,
          .switch-row,
          .form-actions {
            grid-column: span 1;
          }
          .form-wrapper {
            padding: 20px;
          }
        }
      `}</style>
    </Layout>
  );
}


