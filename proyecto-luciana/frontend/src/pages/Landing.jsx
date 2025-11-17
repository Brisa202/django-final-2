import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';

export default function Landing() {
  return (
    <main className="stage">
      <section className="frame">
        <div className="frame-bg" />
        <div className="frame-overlay" />

        <div className="landing-content">
          <img src={logo} alt="HP" className="landing-logo" />
          <h1 className="landing-title">¡Bienvenido a Hollywood Producciones!</h1>
          <p className="landing-sub">Alquiler de vajillas para eventos inolvidables.</p>

          <Link to="/login" className="pill-btn">Iniciar sesión</Link>
        </div>
      </section>
    </main>
  );
}
