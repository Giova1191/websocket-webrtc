import React, { useState } from 'react';

const Register: React.FC = () => {
  const [username, setUsername] = useState('');

  const handleRegister = () => {
    
  };

  return (
    <div>
      <h2>Register</h2>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <button onClick={handleRegister}>Register</button>
    </div>
  );
};

export default Register;