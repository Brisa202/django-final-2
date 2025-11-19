// src/components/ProductLineItem.jsx
import { useState, useEffect, useRef } from 'react';
import { Search, XCircle, Trash2 } from 'lucide-react';

export default function ProductLineItem({ 
  productos = [], 
  value = null, 
  onChange, 
  onRemove,
  error = null 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [isFocused, setIsFocused] = useState(false);
  
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  // Si viene un valor inicial, cargarlo
  useEffect(() => {
    if (value && value.producto) {
      const prod = productos.find(p => p.id === value.producto);
      if (prod) {
        setSelectedProduct(prod);
        setCantidad(value.cantidad || 1);
      }
    }
  }, [value, productos]);

  // Cerrar resultados al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrar productos con debounce
  const filteredProducts = searchTerm.trim() 
    ? productos.filter(p => 
        p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : productos;

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Debounce de 150ms
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setShowResults(true);
    }, 150);
  };

  const handleSelectProduct = (producto) => {
    setSelectedProduct(producto);
    setSearchTerm('');
    setShowResults(false);
    setCantidad(1);
    
    // Notificar al padre
    if (onChange) {
      onChange({
        producto: producto.id,
        producto_nombre: producto.nombre,
        precio_unit: producto.precio || 0,
        cantidad: 1,
      });
    }
  };

  const handleCantidadChange = (newCantidad) => {
    const cant = Math.max(1, parseInt(newCantidad) || 1);
    setCantidad(cant);
    
    if (onChange && selectedProduct) {
      onChange({
        producto: selectedProduct.id,
        producto_nombre: selectedProduct.nombre,
        precio_unit: selectedProduct.precio || 0,
        cantidad: cant,
      });
    }
  };

  const handleRemoveProduct = () => {
    setSelectedProduct(null);
    setSearchTerm('');
    setCantidad(1);
    setShowResults(false);
    if (onRemove) onRemove();
  };

  const subtotal = selectedProduct 
    ? (selectedProduct.precio || 0) * cantidad 
    : 0;

  const stockDisponible = selectedProduct
    ? (selectedProduct.stock_disponible ?? 
       Math.max(0, (selectedProduct.stock ?? 0) - (selectedProduct.stock_reservado ?? 0)))
    : 0;

  const styles = {
    container: {
      position: 'relative',
      width: '100%',
    },
    // Estilos del buscador
    searchWrapper: {
      position: 'relative',
      width: '100%',
    },
    searchInput: (hasError) => ({
      width: '100%',
      padding: '11px 44px',
      borderRadius: 24,
      border: hasError 
        ? '1px solid #ef4444' 
        : isFocused 
        ? '1px solid #4285f4' 
        : '1px solid #dfe1e5',
      background: 'white',
      fontSize: 14,
      outline: 'none',
      boxSizing: 'border-box',
      transition: 'all 0.2s ease',
      boxShadow: isFocused 
        ? '0 1px 6px rgba(32,33,36,0.28)' 
        : hasError
        ? '0 1px 6px rgba(239,68,68,0.2)'
        : '0 1px 2px rgba(0,0,0,0.1)',
      color: '#202124',
      fontFamily: 'arial, sans-serif',
    }),
    searchIcon: {
      position: 'absolute',
      left: 14,
      top: '50%',
      transform: 'translateY(-50%)',
      pointerEvents: 'none',
      color: '#9aa0a6',
    },
    clearButton: {
      position: 'absolute',
      right: 12,
      top: '50%',
      transform: 'translateY(-50%)',
      border: 'none',
      background: 'transparent',
      padding: 4,
      cursor: 'pointer',
      color: '#70757a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '50%',
      transition: 'background 0.15s ease',
    },
    resultsDropdown: {
      position: 'absolute',
      top: 'calc(100% + 6px)',
      left: 0,
      right: 0,
      maxHeight: 400,
      overflowY: 'auto',
      background: 'white',
      borderRadius: 8,
      boxShadow: '0 4px 6px rgba(32,33,36,0.28)',
      zIndex: 50,
      border: '1px solid #e5e7eb',
    },
    resultItem: {
      padding: '12px 16px',
      cursor: 'pointer',
      borderBottom: '1px solid #f1f3f4',
      transition: 'background 0.1s ease',
    },
    resultItemName: {
      fontSize: 14,
      fontWeight: 500,
      color: '#202124',
      marginBottom: 4,
    },
    resultItemDetails: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 12,
      color: '#5f6368',
    },
    emptyResults: {
      padding: '20px 16px',
      fontSize: 14,
      color: '#5f6368',
      textAlign: 'center',
    },
    // Estilos de la fila de producto seleccionado
    productRow: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
      gap: 12,
      alignItems: 'center',
      padding: 12,
      background: 'white',
      borderRadius: 8,
      border: '1px solid #e5e7eb',
    },
    readOnlyField: {
      padding: '8px 12px',
      background: '#f9fafb',
      border: '1px solid #e5e7eb',
      borderRadius: 6,
      fontSize: 13,
      color: '#374151',
    },
    editableField: {
      padding: '8px 12px',
      background: 'white',
      border: '1px solid #d1d5db',
      borderRadius: 6,
      fontSize: 13,
      color: '#111827',
      outline: 'none',
      transition: 'border 0.15s ease',
    },
    label: {
      fontSize: 11,
      fontWeight: 500,
      color: '#6b7280',
      marginBottom: 4,
      textTransform: 'uppercase',
    },
    deleteButton: {
      padding: 8,
      border: 'none',
      background: 'transparent',
      color: '#ef4444',
      cursor: 'pointer',
      borderRadius: 6,
      transition: 'background 0.15s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorText: {
      fontSize: 12,
      color: '#ef4444',
      marginTop: 4,
    },
    stockBadge: {
      fontSize: 11,
      padding: '2px 8px',
      borderRadius: 12,
      background: '#f0fdf4',
      color: '#166534',
      fontWeight: 500,
      marginTop: 4,
      display: 'inline-block',
    },
  };

  // Si hay un producto seleccionado, mostrar la fila
  if (selectedProduct) {
    return (
      <div style={styles.container}>
        <div style={styles.productRow}>
          {/* Nombre del producto */}
          <div>
            <div style={styles.label}>Producto</div>
            <div style={styles.readOnlyField}>
              {selectedProduct.nombre}
              {selectedProduct.codigo && (
                <span style={{ color: '#9ca3af', marginLeft: 8 }}>
                  ({selectedProduct.codigo})
                </span>
              )}
            </div>
            <div style={styles.stockBadge}>
              Stock: {stockDisponible}
            </div>
          </div>

          {/* Precio unitario (solo lectura) */}
          <div>
            <div style={styles.label}>Precio Unit.</div>
            <div style={styles.readOnlyField}>
              ${Number(selectedProduct.precio || 0).toLocaleString('es-AR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>

          {/* Cantidad (editable) */}
          <div>
            <div style={styles.label}>Cantidad</div>
            <input
              type="number"
              min="1"
              max={stockDisponible}
              value={cantidad}
              onChange={(e) => handleCantidadChange(e.target.value)}
              style={styles.editableField}
              onFocus={(e) => e.target.style.borderColor = '#4285f4'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>

          {/* Subtotal */}
          <div>
            <div style={styles.label}>Subtotal</div>
            <div style={{ ...styles.readOnlyField, fontWeight: 600, color: '#c9a961' }}>
              ${subtotal.toLocaleString('es-AR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>

          {/* Botón eliminar */}
          <button
            type="button"
            onClick={handleRemoveProduct}
            style={styles.deleteButton}
            onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            title="Eliminar producto"
          >
            <Trash2 size={18} />
          </button>
        </div>

        {error && <div style={styles.errorText}>{error}</div>}
      </div>
    );
  }

  // Si no hay producto seleccionado, mostrar el buscador
  return (
    <div style={styles.container} ref={searchRef}>
      <div style={styles.searchWrapper}>
        <span style={styles.searchIcon}>
          <Search size={16} />
        </span>
        
        <input
          type="text"
          value={searchTerm}
          onChange={handleSearchChange}
          onFocus={() => {
            setIsFocused(true);
            setShowResults(true);
          }}
          onBlur={() => setIsFocused(false)}
          placeholder="Buscar producto..."
          style={styles.searchInput(!!error)}
          autoComplete="off"
        />

        {searchTerm && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setShowResults(false);
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f1f3f4'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            style={styles.clearButton}
          >
            <XCircle size={18} />
          </button>
        )}

        {/* Dropdown de resultados */}
        {showResults && (
          <div style={styles.resultsDropdown}>
            {filteredProducts.length === 0 ? (
              <div style={styles.emptyResults}>
                No se encontraron productos
              </div>
            ) : (
              filteredProducts.map((producto) => {
                const disp = producto.stock_disponible ?? 
                  Math.max(0, (producto.stock ?? 0) - (producto.stock_reservado ?? 0));
                
                return (
                  <div
                    key={producto.id}
                    style={styles.resultItem}
                    onMouseDown={(e) => {
                      e.preventDefault(); // Evita que se pierda el foco
                      handleSelectProduct(producto);
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <div style={styles.resultItemName}>
                      {producto.nombre}
                    </div>
                    <div style={styles.resultItemDetails}>
                      <span>
                        {producto.codigo && `Cód: ${producto.codigo}`}
                      </span>
                      <span>
                        Stock: {disp}
                      </span>
                      <span style={{ fontWeight: 600, color: '#c9a961' }}>
                        ${Number(producto.precio || 0).toLocaleString('es-AR')}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {error && <div style={styles.errorText}>{error}</div>}
    </div>
  );
}