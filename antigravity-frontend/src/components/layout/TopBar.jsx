import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LuLogOut } from 'react-icons/lu';
import './TopBar.css';

const TopBar = ({ titulo = "Dashboard" }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // Simulación de flag SUNAT
    const SUNAT_HABILITADO = true;

    const handleLogout = () => {
        logout();
    };

    return (
        <header className="topbar">
            <div className="topbar-left">
                <h2 className="topbar-title">{titulo}</h2>
            </div>

            <div className="topbar-right">
                <div className="sunat-status">
                    <span className={`status-dot ${SUNAT_HABILITADO ? 'online' : 'offline'}`}></span>
                    <span className="status-text">
                        {SUNAT_HABILITADO ? 'SUNAT Online' : 'SUNAT Offline'}
                    </span>
                </div>

                <div className="user-profile">
                    <div className="user-info">
                        <span className="user-email">{user?.email || 'admin@maquimpower.com'}</span>
                    </div>
                    <div className="user-avatar" title={user?.email}>
                        {user?.email?.[0].toUpperCase() || 'A'}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default TopBar;
