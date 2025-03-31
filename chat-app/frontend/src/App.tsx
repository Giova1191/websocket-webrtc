
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './components/Login';
import Chat from './components/Chat';
import './App.css';

function App() {
  const [isAuth, setIsAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/current-user', {
        credentials: 'include',
      });
      const data = await response.json();
      setIsAuth(!!data.user);
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuth(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

 
  const handleLogin = () => {
    setIsAuth(true);
  };

  if (isLoading) {
    return <div className="loading">Caricamento...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={isAuth ? <Navigate to="/chat" /> : <Login onLogin={handleLogin} />} />
        <Route path="/chat" element={isAuth ? <Chat /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to={isAuth ? "/chat" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;