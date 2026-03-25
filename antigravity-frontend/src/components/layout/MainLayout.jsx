import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import './MainLayout.css';

const MainLayout = () => {
    return (
        <div className="main-layout">
            <Sidebar />
            <div className="content-area">
                <TopBar />
                <main className="page-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
