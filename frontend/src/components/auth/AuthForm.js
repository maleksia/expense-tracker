import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { baseApiUrl } from '../../api/config';
// import { useTheme } from '../../context/ThemeContext';

function AuthForm({ onLogin }) {
  // const { theme } = useTheme();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // const handleChange = (e) => {
  //   setFormData({ ...formData, [e.target.name]: e.target.value });
  // };

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
        onLogin(formData.username); // Call onLogin with the username
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
        <h1>Welcome to ExpenseShare</h1>
        <p className="app-description">
          Track shared expenses, split bills, and manage debts with ease. 
          Perfect for couples, roommates, or friends who share expenses.
        </p>
        <div className="features-list">
          <div className="feature-item">
            <h3>Track Expenses</h3>
            <p>Add and manage shared expenses easily</p>
          </div>
          <div className="feature-item">
            <h3>Calculate Debts</h3>
            <p>See who owes what in real-time</p>
          </div>
          <div className="feature-item">
            <h3>Expense History</h3>
            <p>View and manage past expenses</p>
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