import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { baseApiUrl } from '../../api/config';
import { FaChartLine, FaCalculator, FaHistory } from 'react-icons/fa';

function AuthForm({ onLogin }) {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    const url = isLogin ? '/login' : '/register';

    axios.post(`${baseApiUrl}${url}`, JSON.stringify(formData), {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then((response) => {
      setLoading(false);
      setMessage(response.data.message);
      if (isLogin) {
        onLogin(formData.username);
        navigate('/');
      }
    })
    .catch((error) => {
      setLoading(false);
      if (error.response) {
        setMessage(error.response.data.error || 'An error occurred');
      } else {
        setMessage('An error occurred. Please try again.');
      }
      console.error('Error:', error);
    });
  };

  return (
    <div className="landing-page">
      <div className="welcome-section">
        <h1>Simplify Your Shared Expenses</h1>
        <p className="app-description">
          ExpenseShare makes it effortless to track, split, and manage shared expenses with anyone. 
          Say goodbye to complicated spreadsheets and awkward money conversations.
        </p>
        <div className="features-list">
          <div className="feature-item">
            <h3><FaChartLine /> Track Expenses</h3>
            <p>Record and categorize shared expenses in real-time with an intuitive interface</p>
          </div>
          <div className="feature-item">
            <h3><FaCalculator /> Smart Splitting</h3>
            <p>Automatically calculate who owes what with precise splitting algorithms</p>
          </div>
          <div className="feature-item">
            <h3><FaHistory /> Complete History</h3>
            <p>Access detailed transaction history and generate expense reports anytime</p>
          </div>
        </div>
      </div>

      <div className="auth-form-container">
        <h2>{isLogin ? 'Login' : 'Register'}</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={(e) => setFormData({...formData, username: e.target.value})}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Register')}
          </button>
        </form>
        {message && <p className="message">{message}</p>}
        <button 
          className="switch-button"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
        </button>
      </div>
    </div>
  );
}

export default AuthForm;