import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout({ children }) {
  return (
    <div className="dash">
      <Sidebar />
      <div className="dash-main">
        <Topbar />
        <div className="dash-content">
          {children}
        </div>
      </div>
    </div>
  );
}
