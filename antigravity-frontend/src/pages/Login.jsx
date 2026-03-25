import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginService } from '../api/auth';

export default function Login() {
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    // src/pages/Login.jsx

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        console.log("--- INICIO DE LOGIN ---");
        console.log("Enviando a:", import.meta.env.VITE_API_URL);
        console.log("Datos:", { email: credentials.email });

        try {
            const data = await loginService(credentials.email, credentials.password);
            console.log("Respuesta Exitosa:", data);
            navigate('/');
        } catch (err) {
            // Aquí capturamos el 401 y lo detallamos
            console.error("ERROR EN LOGIN:");
            console.error("- Mensaje:", err.message);
            setError(err.message);
        } finally {
            setLoading(false);
            console.log("--- FIN DE PROCESO ---");
        }
    };

    return (
        <div style={styles.container}>
            <form onSubmit={handleSubmit} style={styles.card}>
                <h2>Maquimpower</h2>
                <p>Ingresa tus credenciales para continuar</p>

                {error && <div style={styles.error}>{error}</div>}

                <input
                    type="email"
                    name="email"
                    placeholder="Correo electrónico"
                    onChange={handleChange}
                    required
                    style={styles.input}
                />

                <input
                    type="password"
                    name="password"
                    placeholder="Contraseña"
                    onChange={handleChange}
                    required
                    style={styles.input}
                />

                <button type="submit" disabled={loading} style={styles.button}>
                    {loading ? 'Validando...' : 'Iniciar Sesión'}
                </button>
            </form>
        </div>
    );
}

// Estilos rápidos para que no se vea vacío
const styles = {
    container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f4f4f4' },
    card: { padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px', textAlign: 'center' },
    input: { width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' },
    button: { width: '100%', padding: '10px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    error: { backgroundColor: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '14px' }
};