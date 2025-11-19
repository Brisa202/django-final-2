import { useState, useEffect, useRef } from 'react';
import { X, Search, User } from 'lucide-react';

export default function ClientSearchSelector({ 
  clientes, 
  selectedClientId, 
  onClientSelect, 
  onClientClear,
  error,
  touched 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredClients, setFilteredClients] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceTimer = useRef(null);
  const dropdownRef = useRef(null);

  // Encontrar el cliente seleccionado - manejar tanto string como number
  const selectedClient = clientes.find(c => {
    if (!selectedClientId) return false;
    return c.id === Number(selectedClientId) || c.id === selectedClientId;
  });

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrar clientes con debounce
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      filterClients(searchTerm);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchTerm, clientes]);

  const filterClients = (term) => {
    if (!term.trim()) {
      setFilteredClients([]);
      setShowDropdown(false);
      return;
    }

    const searchLower = term.toLowerCase().trim();
    const filtered = clientes.filter(client => {
      if (!client.activo) return false; // Solo activos
      const fullName = `${client.nombre} ${client.apellido}`.toLowerCase();
      const documento = client.documento?.toString() || '';
      
      return fullName.includes(searchLower) || 
             documento.includes(searchLower) ||
             client.nombre.toLowerCase().includes(searchLower) ||
             client.apellido.toLowerCase().includes(searchLower);
    });

    setFilteredClients(filtered);
    setShowDropdown(filtered.length > 0);
  };

  const handleSelectClient = (client) => {
    onClientSelect(client.id);
    setSearchTerm('');
    setFilteredClients([]);
    setShowDropdown(false);
  };

  const handleClearClient = () => {
    onClientClear();
    setSearchTerm('');
    setFilteredClients([]);
    setShowDropdown(false);
  };

  // Limpiar búsqueda cuando cambia el cliente seleccionado desde afuera
  useEffect(() => {
    if (selectedClientId && selectedClient) {
      setSearchTerm('');
      setFilteredClients([]);
      setShowDropdown(false);
    }
  }, [selectedClientId]);

  const formatPhone = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('54')) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 9)} ${cleaned.slice(9)}`;
    }
    return phone;
  };

  // Si hay un cliente seleccionado, mostrar la tarjeta
  if (selectedClient) {
    return (
      <div style={{
        border: error && touched ? '2px solid #ef4444' : '2px solid #c9a961',
        borderRadius: 12,
        padding: 20,
        background: '#FFFBF0',
        position: 'relative'
      }}>
        <button
          type="button"
          onClick={handleClearClient}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: '#FEE',
            border: '1px solid #FCC',
            borderRadius: 6,
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            color: '#C00',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#FDD';
            e.target.style.borderColor = '#FAA';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = '#FEE';
            e.target.style.borderColor = '#FCC';
          }}
        >
          <X size={14} />
          Cambiar cliente
        </button>

        <div style={{ paddingRight: 140 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              background: '#c9a961',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <User size={24} />
            </div>
            <div>
              <h3 style={{ 
                fontSize: 20, 
                fontWeight: 600, 
                margin: 0, 
                color: '#1a1a1a' 
              }}>
                {selectedClient.nombre} {selectedClient.apellido}
              </h3>
              <p style={{ 
                fontSize: 14, 
                color: '#666', 
                margin: '4px 0 0 0' 
              }}>
                Cliente seleccionado
              </p>
            </div>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: 16,
            paddingTop: 12,
            borderTop: '1px solid #E5E7EB'
          }}>
            <div>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>
                DNI/CUIT
              </div>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#1a1a1a' }}>
                {selectedClient.documento}
              </div>
            </div>

            {selectedClient.telefono && (
              <div>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>
                  Teléfono
                </div>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#1a1a1a' }}>
                  {formatPhone(selectedClient.telefono)}
                </div>
              </div>
            )}

            {selectedClient.email && (
              <div>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>
                  Email
                </div>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#1a1a1a' }}>
                  {selectedClient.email}
                </div>
              </div>
            )}

            {selectedClient.direccion && (
              <div>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>
                  Dirección
                </div>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#1a1a1a' }}>
                  {selectedClient.direccion}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Si no hay cliente seleccionado, mostrar el buscador
  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search 
          size={18} 
          style={{
            position: 'absolute',
            left: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#9CA3AF',
            pointerEvents: 'none'
          }}
        />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nombre, apellido o DNI..."
          autoComplete="off"
          style={{
            width: '100%',
            padding: '12px 16px 12px 44px',
            fontSize: 14,
            border: error && touched ? '2px solid #ef4444' : '1px solid #d1d5db',
            borderRadius: 8,
            background: error && touched ? '#fef2f2' : '#fff',
            color: '#1a1a1a',
            outline: 'none',
            transition: 'border 0.2s',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => {
            if (!error) e.target.style.borderColor = '#c9a961';
            if (filteredClients.length > 0) setShowDropdown(true);
          }}
          onBlur={(e) => {
            if (!error) e.target.style.borderColor = '#d1d5db';
          }}
        />
      </div>

      {error && touched && (
        <div style={{
          fontSize: 12,
          color: '#ef4444',
          marginTop: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 4
        }}>
          {error}
        </div>
      )}

      {showDropdown && filteredClients.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: 8,
          background: 'white',
          border: '1px solid #E5E7EB',
          borderRadius: 8,
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
          maxHeight: 400,
          overflowY: 'auto',
          zIndex: 50
        }}>
          {filteredClients.map((client) => (
            <div
              key={client.id}
              onClick={() => handleSelectClient(client)}
              style={{
                padding: '14px 16px',
                cursor: 'pointer',
                borderBottom: '1px solid #F3F4F6',
                transition: 'background 0.15s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#FFFBF0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'start',
                gap: 12
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#1a1a1a',
                    marginBottom: 4
                  }}>
                    {client.nombre} {client.apellido}
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: 16,
                    fontSize: 13,
                    color: '#666'
                  }}>
                    <span>DNI: {client.documento}</span>
                    {client.telefono && (
                      <span>Tel: {formatPhone(client.telefono)}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDropdown && filteredClients.length === 0 && searchTerm.trim() && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: 8,
          padding: 16,
          background: 'white',
          border: '1px solid #E5E7EB',
          borderRadius: 8,
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          textAlign: 'center',
          color: '#666',
          fontSize: 14,
          zIndex: 50
        }}>
          No se encontraron clientes
        </div>
      )}
    </div>
  );
}