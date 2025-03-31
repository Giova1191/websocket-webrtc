import { useState } from 'react';
import './Login.css';


interface LoginProps {
  onLogin: () => void;
}


const Login = ({ onLogin }: LoginProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isRegistering ? 'register' : 'login';
    
    try {
      console.log(`Sending ${endpoint} request for user: ${username}`);
      
      const response = await fetch(`http://localhost:5000/api/auth/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      console.log(`Response:`, data);

      if (response.ok) {
        console.log(`Authentication successful`);
        onLogin(); 
      } else {
        console.error(`Authentication failed:`, data);
        setError(data.message || `Errore durante ${isRegistering ? 'la registrazione' : 'il login'}`);
      }
    } catch (err) {
      console.error('Network error:', err);
      setError(`Errore di connessione al server. Verifica che il server sia in esecuzione.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <div className="login-header">
          <h1>{isRegistering ? 'Registrati' : 'Accedi'}</h1>
          <p>alla chat in tempo reale</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              autoComplete="username"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete={isRegistering ? "new-password" : "current-password"}
            />
          </div>
          
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Caricamento...' : isRegistering ? 'Registrati' : 'Accedi'}
          </button>
        </form>
        
        <div className="login-footer">
          <p>
            {isRegistering
                ? 'Hai già un account?'
                : 'Non hai ancora un account?'}
            <button 
                className="toggle-form" 
                onClick={() => setIsRegistering(!isRegistering)}
                disabled={loading}
            >
                {isRegistering ? 'Accedi' : 'Registrati'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;