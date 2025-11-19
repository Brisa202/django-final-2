import { useEffect, useRef, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import axios from '../api/axios';
import { 
    DollarSign, Boxes, Hourglass, AlertTriangle, ChevronRight, 
    Calendar, TrendingUp, TrendingDown 
} from 'lucide-react';
import { 
    PieChart, Pie, Cell,
    Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

// --- Componentes Reutilizables ---
const Stat = ({ Icon, title, value, loading, color = '#d4af37' }) => (
    <div className="card stat" style={{ borderLeft: `5px solid ${color}` }}>
        <div className="stat-ic" style={{ color }}>
            <Icon size={20} strokeWidth={2.4} />
        </div>
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

// 🌟 Fechas por defecto (últimos 30 días)
const getDefaultDates = () => {
    const today = new Date();
    const end = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const start = new Date(end);
    start.setDate(end.getDate() - 30);

    const formatDate = (date) => date.toISOString().split('T')[0];

    return { 
        startDate: formatDate(start), 
        endDate: formatDate(end) 
    };
};

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState('');
    const [securityAlert, setSecurityAlert] = useState(null);

    // Fechas para el gráfico de pagos
    const defaultDates = getDefaultDates();
    const [startDate, setStartDate] = useState(defaultDates.startDate);
    const [endDate, setEndDate] = useState(defaultDates.endDate);

    // Datos para el gráfico de PAGOS
    const [paymentsChartData, setPaymentsChartData] = useState([]); 
    const [loadingPaymentsChart, setLoadingPaymentsChart] = useState(true);
    const [periodIngresos, setPeriodIngresos] = useState(0);
    const [periodEgresos, setPeriodEgresos] = useState(0);

    // Datos para la distribución de formas de pago
    const [pieData, setPieData] = useState([]);

    const timerRef = useRef(null);
    const bcRef = useRef(null);

    // --- Carga de métricas principales y actividad reciente ---
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

    // --- Carga de datos del GRÁFICO DE PAGOS (para totales) ---
    const fetchPaymentsFlow = useCallback(async (start, end) => {
        if (!start || !end) {
            setPaymentsChartData([]);
            setPeriodIngresos(0);
            setPeriodEgresos(0);
            setLoadingPaymentsChart(false);
            return;
        }

        try {
            setLoadingPaymentsChart(true);
            setErr('');

            const response = await axios.get('/api/metrics/payments-flow/', {
                params: {
                    start_date: start,
                    end_date: end
                }
            });

            const data = Array.isArray(response.data?.chart_data)
                ? response.data.chart_data
                : [];

            setPaymentsChartData(data);
            setPeriodIngresos(response.data?.total_ingresos || 0);
            setPeriodEgresos(response.data?.total_egresos || 0);
        } catch (e) {
            console.error('Error fetching payments flow:', e);
            setPaymentsChartData([]);
            setPeriodIngresos(0);
            setPeriodEgresos(0);
            if (e?.response?.status === 400) {
                setErr(e.response.data?.error || 'Error en las fechas del gráfico de pagos.');
            } else {
                setErr('Error al cargar datos del gráfico de pagos.');
            }
        } finally {
            setLoadingPaymentsChart(false);
        }
    }, []);

    // --- Carga de distribución de formas de pago ---
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
                { name: "Efectivo", value: 45, color: "#10b981" }, 
                { name: "Transferencia", value: 55, color: "#3b82f6" }
            ]);
        } catch (e) {
            console.error('Error fetching payment distribution:', e);
            setPieData([
                { name: "Efectivo", value: 45, color: "#10b981" },
                { name: "Transferencia", value: 55, color: "#3b82f6" }
            ]);
        }
    }, []);

    // --- Filtro de fechas para el gráfico de PAGOS ---
    const handleDateFilter = () => {
        if (!startDate || !endDate) {
            alert('Por favor selecciona ambas fechas');
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            alert('La fecha de inicio no puede ser mayor a la fecha de fin');
            return;
        }
        fetchPaymentsFlow(startDate, endDate);
    };

    // --- Efecto inicial + polling ---
    useEffect(() => {
        // 1. Cargar resumen y actividad
        fetchAll();
        // 2. Cargar distribución de formas de pago
        fetchPaymentDistribution();
        // 3. Cargar gráfico de pagos con fechas por defecto
        fetchPaymentsFlow(defaultDates.startDate, defaultDates.endDate);

        // Polling solo para resumen y actividad
        const startPolling = () => {
            clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                if (document.visibilityState === 'visible') fetchAll();
            }, POLL_MS);
        };
        startPolling();

        // Alertas de seguridad
        const alertMessage = localStorage.getItem('security_alert_message');
        if (alertMessage) {
            setSecurityAlert(alertMessage);
            localStorage.removeItem('security_alert_message');
        }

        const onVisibility = () => {
            if (document.visibilityState === 'visible') fetchAll();
        };
        document.addEventListener('visibilitychange', onVisibility);

        // Canal para otras pestañas
        bcRef.current = new BroadcastChannel('dashboard');
        bcRef.current.onmessage = (ev) => {
            if (ev?.data === 'invalidate') fetchAll();
        };

        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
            clearInterval(timerRef.current);
            bcRef.current?.close();
        };
    }, [fetchAll, fetchPaymentDistribution, fetchPaymentsFlow]);

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
                <Stat 
                    Icon={Hourglass} 
                    title="Pedidos Pendientes" 
                    value={stats?.pedidos_pendientes} 
                    loading={loading} 
                    color="#3b82f6" 
                />
                <Stat 
                    Icon={Boxes} 
                    title="Alquileres (total)" 
                    value={stats?.alquileres_total} 
                    loading={loading} 
                    color="#f97316" 
                />
                <Stat 
                    Icon={AlertTriangle} 
                    title="Incidentes Abiertos" 
                    value={stats?.incidentes_abiertos} 
                    loading={loading} 
                    color="#ef4444" 
                />
            </div>

            {/* Gráfico de PAGOS (Torta: Ingresos vs Egresos) */}
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
                            💰 Flujo de Pagos (Ingresos vs Egresos)
                        </h3>
                        <small style={{ color: '#8b7355', fontWeight: '500' }}>
                            Filtra por rango de fechas para analizar el movimiento de caja
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
                            disabled={loadingPaymentsChart || loading}
                            style={{
                                background: (loadingPaymentsChart || loading) 
                                    ? '#e5dcc5' 
                                    : 'linear-gradient(135deg, #d4af37 0%, #c9a136 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '0.5rem 1.25rem',
                                fontWeight: '600',
                                boxShadow: (loadingPaymentsChart || loading) 
                                    ? 'none' 
                                    : '0 2px 8px rgba(212, 175, 55, 0.3)',
                                transition: 'all 0.3s ease',
                                cursor: (loadingPaymentsChart || loading) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {loadingPaymentsChart ? 'Cargando...' : 'Aplicar Filtro'}
                        </button>
                    </div>
                </div>

                {/* Totales del período */}
                <div className="grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <Stat 
                        Icon={TrendingUp} 
                        title="Total Ingresos (Período)" 
                        value={formatCurrency(periodIngresos)} 
                        loading={loadingPaymentsChart} 
                        color="#10b981"
                    />
                    <Stat 
                        Icon={TrendingDown} 
                        title="Total Egresos (Período)" 
                        value={formatCurrency(periodEgresos)} 
                        loading={loadingPaymentsChart} 
                        color="#ef4444"
                    />
                    <Stat 
                        Icon={DollarSign} 
                        title="Balance Neto (Período)" 
                        value={formatCurrency(balanceNeto)} 
                        loading={loadingPaymentsChart} 
                        color={balanceColor}
                    />
                </div>

                {/* Gráfico de torta: Ingresos vs Egresos del período */}
                {loadingPaymentsChart ? (
                    <div style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <p style={{ color: '#8b7355', fontWeight: '500' }}>Cargando análisis de pagos...</p>
                    </div>
                ) : (periodIngresos === 0 && periodEgresos === 0) ? (
                    <div style={{ 
                        height: '320px', 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center', 
                        justifyContent: 'center',
                        gap: '1rem',
                        padding: '2rem'
                    }}>
                        <div style={{ fontSize: '3rem', opacity: 0.3 }}>
                            🧁
                        </div>
                        <p style={{ 
                            color: '#8b7355', 
                            fontSize: '1rem', 
                            fontWeight: '500',
                            textAlign: 'center',
                            maxWidth: '500px',
                            margin: 0
                        }}>
                            No hay pagos registrados (ingresos ni egresos) para el período seleccionado.
                        </p>
                        <small style={{ 
                            color: '#a0927d', 
                            fontSize: '0.875rem',
                            textAlign: 'center',
                            maxWidth: '500px'
                        }}>
                            Intenta cambiar el rango de fechas o registrar nuevos movimientos de caja.
                        </small>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={320}>
                        <PieChart>
                            <Pie
                                data={[
                                    { name: 'Ingresos', value: periodIngresos },
                                    { name: 'Egresos', value: periodEgresos },
                                ]}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={110}
                                paddingAngle={4}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                            >
                                <Cell key="ingresos" fill="#10b981" />
                                <Cell key="egresos" fill="#ef4444" />
                            </Pie>
                            <Tooltip 
                                formatter={(value, name) => [formatCurrency(value), name]}
                                contentStyle={{ 
                                    backgroundColor: '#fffef9', 
                                    border: '2px solid #d4af37',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 12px rgba(212, 175, 55, 0.2)',
                                    fontWeight: '500'
                                }}
                            />
                            <Legend wrapperStyle={{ fontWeight: '600' }} />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Segunda fila: Pie + Actividad */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 400px) 1fr', gap: '2rem' }}>
                {/* Distribución de Pagos */}
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
                        {loading && activity.length === 0 && (
                            <p style={{ color: '#8b7355', fontWeight: '500' }}>Cargando…</p>
                        )}
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
