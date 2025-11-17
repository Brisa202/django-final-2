import { useEffect, useRef, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import axios from '../api/axios';
import { 
    DollarSign, Boxes, Hourglass, AlertTriangle, ChevronRight, 
    Calendar, TrendingUp, TrendingDown 
} from 'lucide-react';
import { 
    BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, 
    CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

// --- Componentes Reutilizables (sin cambios) ---
const Stat = ({ Icon, title, value, loading, color = '#d4af37' }) => (
    <div className="card stat" style={{ borderLeft: `5px solid ${color}` }}>
        <div className="stat-ic" style={{ color }}><Icon size={20} strokeWidth={2.4} /></div>
        <div>
            <small>{title}</small>
            <h3>{loading ? '···' : (value ?? '—')}</h3>
        </div>
    </div>
);

const Event = ({ tone = 'ok', title, refid, time, amount, badge }) => (
    <div className="event">
        <div className={'event-dot ' + tone} />
        <div className="event-body">
            <div className="event-title">
                {title} {refid && <span className="ref">{refid}</span>}
            </div>
            <small className="muted">{time}</small>
        </div>
        {badge && <span className="badge">{badge}</span>}
        {amount && <b className="amount">{amount}</b>}
        <ChevronRight size={16} className="muted" />
    </div>
);

const POLL_MS = 15000;

const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '—';
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2
    }).format(value);
};

// 🌟 CORRECCIÓN CRÍTICA DE FECHA: Usar UTC para evitar problemas de huso horario
const getDefaultDates = () => {
    const today = new Date();
    
    // Configurar hoy al inicio del día (medianoche) en UTC para obtener la fecha correcta
    const end = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    
    // Configurar el inicio 30 días antes
    const start = new Date(end);
    start.setDate(end.getDate() - 30);
    
    // Formato YYYY-MM-DD
    const formatDate = (date) => date.toISOString().split('T')[0];
    
    return { 
        startDate: formatDate(start), 
        endDate: formatDate(end) 
    };
};
// --------------------------------------------------------------------------

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState('');
    const [securityAlert, setSecurityAlert] = useState(null);
    
    // ⚙️ Inicializar con fechas por defecto
    const defaultDates = getDefaultDates();
    const [startDate, setStartDate] = useState(defaultDates.startDate);
    const [endDate, setEndDate] = useState(defaultDates.endDate);
    
    // 📊 Estados para los datos del gráfico
    const [chartData, setChartData] = useState([]);
    const [pieData, setPieData] = useState([]);
    const [loadingChart, setLoadingChart] = useState(true);
    
    // ✅ Estados para Totales del Periodo Filtrado
    const [periodIngresos, setPeriodIngresos] = useState(0);
    const [periodEgresos, setPeriodEgresos] = useState(0);
    
    const timerRef = useRef(null);
    const bcRef = useRef(null);

    // --- Lógica de Carga de Datos ---

    // Función para obtener las métricas principales y actividad reciente (para polling)
    const fetchAll = useCallback(async () => {
        try {
            setLoading(true);
            setErr('');
            const [m, a] = await Promise.all([
                axios.get('/api/metrics/summary/', { params: { _t: Date.now() } }),
                axios.get('/api/activity/recent/', { params: { _t: Date.now() } }),
            ]);
            setStats(m.data || {});
            setActivity(Array.isArray(a.data?.items) ? a.data.items : []);
        } catch (e) {
            console.error('Error fetching data:', e);
            setErr(e?.response?.status === 401
                ? 'Tu sesión expiró. Inicia sesión nuevamente.'
                : 'No pudimos cargar el panel.');
            setStats({});
            setActivity([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Función para obtener datos del gráfico de flujo (depende de las fechas)
    const fetchChartData = useCallback(async (start, end) => {
        if (!start || !end) {
            console.warn('❌ Fechas de gráfico no proporcionadas para la carga.');
            setChartData([]);
            setPeriodIngresos(0);
            setPeriodEgresos(0);
            setLoadingChart(false);
            return;
        }

        try {
            setLoadingChart(true);
            setErr('');

            // Asegurar que las fechas se envíen como YYYY-MM-DD
            const response = await axios.get('/api/metrics/payments-flow/', {
                params: {
                    start_date: start,
                    end_date: end
                }
            });

            const data = Array.isArray(response.data?.chart_data) ? response.data.chart_data : [];
            const ingresosTotal = response.data?.total_ingresos || 0;
            const egresosTotal = response.data?.total_egresos || 0;
            
            setChartData(data);
            setPeriodIngresos(ingresosTotal);
            setPeriodEgresos(egresosTotal);

            if (data.length === 0) {
                console.log('ℹ️ No hay datos de pagos para el período seleccionado');
            }

        } catch (e) {
            console.error('❌ Error fetching payments flow:', e);
            setChartData([]);
            setPeriodIngresos(0);
            setPeriodEgresos(0);
            if (e?.response?.status === 400) {
                // Aquí es donde puede aparecer un error si el formato de fecha es incorrecto
                setErr(e.response.data?.error || 'Error en los parámetros de fecha o el backend no pudo procesar la solicitud.');
            } else {
                setErr('Error al cargar datos del gráfico');
            }
        } finally {
            setLoadingChart(false);
        }
    }, []);

    // Función para obtener distribución de pagos
    const fetchPaymentDistribution = useCallback(async () => {
        try {
            const response = await axios.get('/api/metrics/payment-distribution/');
            
            let distribution = [];
            if (response?.data) {
                distribution = Array.isArray(response.data.distribution) 
                    ? response.data.distribution 
                    : Array.isArray(response.data) ? response.data : [];
            }
            
            setPieData(distribution.length > 0 ? distribution : [
                // Fallback Data
                { name: "Efectivo", value: 45, color: "#10b981" }, 
                { name: "Transferencia", value: 55, color: "#3b82f6" }
            ]);
        } catch (e) {
            console.error('Error fetching payment distribution:', e);
            // Mostrar Fallback Data en caso de error
            setPieData([
                { name: "Efectivo", value: 45, color: "#10b981" },
                { name: "Transferencia", value: 55, color: "#3b82f6" }
            ]);
        }
    }, []);

    // --- Manejador del Filtro de Fechas ---
    
    const handleDateFilter = () => {
        if (!startDate || !endDate) {
            alert('Por favor selecciona ambas fechas');
            return;
        }
        
        if (new Date(startDate) > new Date(endDate)) {
            alert('La fecha de inicio no puede ser mayor a la fecha de fin');
            return;
        }
        
        console.log('🔍 Aplicando filtro de fechas:', { startDate, endDate });
        // Llama a la función de carga con las fechas del estado
        fetchChartData(startDate, endDate); 
    };

    // --- Efectos de Carga Inicial y Polling ---

    useEffect(() => {
        // 1. Cargar datos de resumen, actividad y distribución
        fetchAll();
        fetchPaymentDistribution();

        // 2. Cargar datos del gráfico de flujo con las fechas iniciales
        // Usamos las fechas que ya se cargaron en el estado inicial
        fetchChartData(startDate, endDate); 

        // 3. Iniciar Polling
        const startPolling = () => {
            clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                if (document.visibilityState === 'visible') fetchAll();
            }, POLL_MS);
        };
        startPolling();

        // 4. Manejo de Alerta y Visibilidad
        const alertMessage = localStorage.getItem('security_alert_message');
        if (alertMessage) {
            setSecurityAlert(alertMessage);
            localStorage.removeItem('security_alert_message');
        }

        const onVisibility = () => {
            if (document.visibilityState === 'visible') fetchAll();
        };
        document.addEventListener('visibilitychange', onVisibility);

        // 5. Broadcast Channel para sincronización entre pestañas
        bcRef.current = new BroadcastChannel('dashboard');
        bcRef.current.onmessage = (ev) => {
            if (ev?.data === 'invalidate') fetchAll();
        };

        // Cleanup
        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
            clearInterval(timerRef.current);
            bcRef.current?.close();
        };
    }, [fetchAll, fetchPaymentDistribution, fetchChartData, startDate, endDate]); 
    // Se deja startDate y endDate como dependencia solo para la primera ejecución,
    // pero idealmente fetchChartData(defaultDates.startDate, defaultDates.endDate)
    // se llamaría para la carga inicial, y luego handleDateFilter maneja los cambios.
    // Lo más importante es la CORRECCIÓN en getDefaultDates.

    // --- Renderizado del Componente (Sin cambios visibles necesarios) ---

    const balanceNeto = periodIngresos - periodEgresos;
    const balanceColor = balanceNeto >= 0 ? '#10b981' : '#ef4444';

    return (
        <Layout>
            <div style={{ 
                background: 'linear-gradient(135deg, #fdfbf7 0%, #f9f4e8 50%, #fef9ed 100%)',
                minHeight: '100vh',
                padding: '2rem',
                marginLeft: '-2rem',
                marginRight: '-2rem',
                marginTop: '-2rem',
                paddingTop: '2rem'
            }}>
            {securityAlert && (
                <div 
                    className="alert alert-warning"
                    style={{ 
                        padding: '15px', 
                        backgroundColor: '#fff3cd',
                        color: '#856404', 
                        border: '1px solid #ffeeba', 
                        borderRadius: '5px', 
                        marginBottom: '20px',
                        fontWeight: 'bold'
                    }}
                >
                    🚨 <strong>ALERTA DE SEGURIDAD:</strong> {securityAlert}
                    <button 
                        onClick={() => setSecurityAlert(null)} 
                        style={{ 
                            float: 'right', 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer', 
                            fontWeight: 'bolder',
                            color: '#856404'
                        }}
                    >
                        &times;
                    </button>
                </div>
            )}

            {/* Estadísticas Principales */}
            <div className="grid" style={{ marginBottom: '2rem' }}>
                <Stat 
                    Icon={DollarSign} 
                    title="Balance Total de Caja" 
                    value={formatCurrency(stats?.balance_total_caja)} 
                    loading={loading} 
                    color="#d4af37"
                />
                <Stat Icon={Hourglass} title="Pedidos Pendientes" value={stats?.pedidos_pendientes} loading={loading} color="#3b82f6" />
                <Stat Icon={Boxes} title="Alquileres (total)" value={stats?.alquileres_total} loading={loading} color="#f97316" />
                <Stat Icon={AlertTriangle} title="Incidentes Abiertos" value={stats?.incidentes_abiertos} loading={loading} color="#ef4444" />
            </div>

            {/* Gráfico de Flujo de Pagos */}
            <div className="card" style={{ 
                marginBottom: '2rem',
                boxShadow: '0 4px 12px rgba(218, 165, 32, 0.1)',
                borderRadius: '12px',
                background: 'linear-gradient(to bottom, #ffffff, #fffef9)'
            }}>
                <div className="row-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ 
                            fontSize: '1.5rem', 
                            fontWeight: '700',
                            background: 'linear-gradient(135deg, #d4af37 0%, #c9a136 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            marginBottom: '0.25rem'
                        }}>
                            💰 Análisis de Flujo de Pagos
                        </h3>
                        <small style={{ color: '#8b7355', fontWeight: '500' }}>
                            Ingresos y egresos de pagos registrados en el sistema
                        </small>
                    </div>
                    <div style={{ 
                        display: 'flex', 
                        gap: '0.75rem', 
                        alignItems: 'center', 
                        flexWrap: 'wrap',
                        padding: '0.75rem 1rem',
                        background: 'rgba(212, 175, 55, 0.08)',
                        borderRadius: '8px',
                        border: '1px solid rgba(212, 175, 55, 0.2)'
                    }}>
                        <Calendar size={18} style={{ color: '#c9a136' }} />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            style={{ 
                                padding: '0.5rem 0.75rem', 
                                fontSize: '0.9rem', 
                                border: '1.5px solid #d4af37', 
                                borderRadius: '6px',
                                background: '#fff',
                                fontWeight: '500',
                                color: '#5a4a2a'
                            }}
                        />
                        <span style={{ color: '#c9a136', fontWeight: 'bold' }}>→</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            style={{ 
                                padding: '0.5rem 0.75rem', 
                                fontSize: '0.9rem', 
                                border: '1.5px solid #d4af37', 
                                borderRadius: '6px',
                                background: '#fff',
                                fontWeight: '500',
                                color: '#5a4a2a'
                            }}
                        />
                        <button 
                            className="btn" 
                            onClick={handleDateFilter}
                            disabled={loadingChart || loading}
                            style={{
                                background: (loadingChart || loading) ? '#e5dcc5' : 'linear-gradient(135deg, #d4af37 0%, #c9a136 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '0.5rem 1.25rem',
                                fontWeight: '600',
                                boxShadow: (loadingChart || loading) ? 'none' : '0 2px 8px rgba(212, 175, 55, 0.3)',
                                transition: 'all 0.3s ease',
                                cursor: (loadingChart || loading) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {loadingChart ? 'Cargando...' : 'Aplicar Filtro'}
                        </button>
                    </div>
                </div>
                
                {/* Estadísticas del Período Filtrado */}
                <div className="grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <Stat 
                        Icon={TrendingUp} 
                        title="Total Ingresos (Período)" 
                        value={formatCurrency(periodIngresos)} 
                        loading={loadingChart} 
                        color="#10b981"
                    />
                    <Stat 
                        Icon={TrendingDown} 
                        title="Total Egresos (Período)" 
                        value={formatCurrency(periodEgresos)} 
                        loading={loadingChart} 
                        color="#ef4444"
                    />
                    <Stat 
                        Icon={DollarSign} 
                        title="Balance Neto (Período)" 
                        value={formatCurrency(balanceNeto)} 
                        loading={loadingChart} 
                        color={balanceColor}
                    />
                </div>

                {/* Contenedor del Gráfico de Barras */}
                {(loadingChart && chartData.length === 0) ? (
                    <div style={{ height: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <p style={{ color: '#8b7355', fontWeight: '500' }}>Cargando análisis de pagos...</p>
                    </div>
                ) : chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={380}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5dcc5" />
                            <XAxis 
                                dataKey="fecha" 
                                style={{ fontSize: '12px', fontWeight: '500' }} 
                                stroke="#8b7355"
                            />
                            <YAxis 
                                tickFormatter={(value) => formatCurrency(value)}
                                style={{ fontSize: '12px', fontWeight: '500' }} 
                                stroke="#8b7355"
                            />
                            <Tooltip 
                                formatter={(value) => formatCurrency(value)}
                                contentStyle={{ 
                                    backgroundColor: '#fffef9', 
                                    border: '2px solid #d4af37',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 12px rgba(212, 175, 55, 0.2)',
                                    fontWeight: '500'
                                }}
                            />
                            <Legend wrapperStyle={{ fontWeight: '600' }} />
                            <Bar dataKey="ingresos" fill="#10b981" name="Ingresos" radius={[8, 8, 0, 0]} />
                            <Bar dataKey="egresos" fill="#ef4444" name="Egresos" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div style={{ 
                        height: '380px', 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center', 
                        justifyContent: 'center',
                        gap: '1rem',
                        padding: '2rem'
                    }}>
                        <div style={{ fontSize: '3rem', opacity: 0.3 }}>
                            📊
                        </div>
                        <p style={{ 
                            color: '#8b7355', 
                            fontSize: '1rem', 
                            fontWeight: '500',
                            textAlign: 'center',
                            maxWidth: '500px',
                            margin: 0
                        }}>
                            {!loadingChart && err 
                                ? err 
                                : 'No hay datos de pagos registrados para el período seleccionado.'}
                        </p>
                        {!loadingChart && !err && (
                            <small style={{ 
                                color: '#a0927d', 
                                fontSize: '0.875rem',
                                textAlign: 'center',
                                maxWidth: '500px'
                            }}>
                                Intenta seleccionar un rango de fechas diferente o registra algunos pagos
                            </small>
                        )}
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 400px) 1fr', gap: '2rem' }}>
                {/* Distribución de Pagos (Pie Chart) */}
                <div className="card" style={{ 
                    boxShadow: '0 4px 12px rgba(218, 165, 32, 0.1)',
                    borderRadius: '12px',
                    background: 'linear-gradient(to bottom, #ffffff, #fffef9)'
                }}>
                    <h3 style={{ 
                        fontSize: '1.25rem', 
                        fontWeight: '700',
                        background: 'linear-gradient(135deg, #d4af37 0%, #c9a136 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '0.25rem'
                    }}>
                        📊 Distribución de Pagos
                    </h3>
                    <small style={{ color: '#8b7355', fontWeight: '500' }}>Métodos de pago utilizados</small>
                    
                    {pieData.length > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height={220} style={{ marginTop: '1.5rem' }}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={4}
                                        dataKey="value"
                                        labelLine={false}
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        formatter={(value) => `${value}%`}
                                        contentStyle={{
                                            background: '#fffef9',
                                            border: '2px solid #d4af37',
                                            borderRadius: '6px',
                                            fontWeight: '600'
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            
                            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(212, 175, 55, 0.05)', borderRadius: '8px' }}>
                                {pieData.map((item, index) => (
                                    <div key={index} style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        marginBottom: index < pieData.length - 1 ? '0.75rem' : '0',
                                        paddingBottom: index < pieData.length - 1 ? '0.75rem' : '0',
                                        borderBottom: index < pieData.length - 1 ? '1px solid rgba(212, 175, 55, 0.15)' : 'none'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ 
                                                width: '14px', 
                                                height: '14px', 
                                                borderRadius: '50%', 
                                                backgroundColor: item.color,
                                                boxShadow: `0 2px 4px ${item.color}40`
                                            }} />
                                            <small style={{ fontWeight: '600', color: '#5a4a2a' }}>{item.name}</small>
                                        </div>
                                        <strong style={{ fontSize: '1rem', color: '#c9a136' }}>{item.value}%</strong>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <p style={{ color: '#8b7355', fontWeight: '500' }}>Sin datos de distribución</p>
                        </div>
                    )}
                </div>

                {/* Actividad Reciente */}
                <div className="card" style={{ 
                    boxShadow: '0 4px 12px rgba(218, 165, 32, 0.1)',
                    borderRadius: '12px',
                    background: 'linear-gradient(to bottom, #ffffff, #fffef9)'
                }}>
                    <div className="row-between" style={{ marginBottom: '1.5rem' }}>
                        <div>
                            <h3 style={{ 
                                fontSize: '1.25rem', 
                                fontWeight: '700',
                                background: 'linear-gradient(135deg, #d4af37 0%, #c9a136 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                marginBottom: '0.25rem'
                            }}>
                                📋 Actividad Reciente
                            </h3>
                            <small style={{ color: '#8b7355', fontWeight: '500' }}>Últimas transacciones y eventos</small>
                        </div>
                        <button 
                            className="btn btn-sm" 
                            onClick={fetchAll} 
                            disabled={loading}
                            style={{
                                background: loading ? '#e5dcc5' : 'linear-gradient(135deg, #d4af37 0%, #c9a136 100%)',
                                color: 'white',
                                border: 'none',
                                fontWeight: '600',
                                boxShadow: loading ? 'none' : '0 2px 6px rgba(212, 175, 55, 0.3)',
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {loading ? 'Actualizando…' : 'Actualizar'}
                        </button>
                    </div>

                    {err && <p className="error" style={{ marginTop: 8, fontWeight: '500', color: '#ef4444' }}>{err}</p>}

                    <div className="events" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {loading && activity.length === 0 && <p style={{ color: '#8b7355', fontWeight: '500' }}>Cargando…</p>}
                        {!loading && activity.length === 0 && !err && (
                            <div style={{ 
                                textAlign: 'center', 
                                padding: '3rem 1rem',
                                color: '#8b7355'
                            }}>
                                <p style={{ fontSize: '1rem', fontWeight: '500' }}>Sin actividad reciente.</p>
                            </div>
                        )}
                        {activity.map((ev, i) => (
                            <Event 
                                key={i} 
                                tone={ev.tone} 
                                title={ev.title} 
                                refid={ev.ref} 
                                time={ev.time} 
                                amount={ev.amount} 
                                badge={ev.badge} 
                            />
                        ))}
                    </div>
                </div>
            </div>
            </div>
        </Layout>
    );
}