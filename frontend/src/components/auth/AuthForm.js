import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { baseApiUrl } from '../../api/config';
import { FaChartLine, FaCalculator, FaHistory, FaEye, FaEyeSlash, FaCheck, FaTimes } from 'react-icons/fa';
import { CgSpinner } from 'react-icons/cg';

function AuthForm({ onLogin }) {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validations, setValidations] = useState({
    length: false,
    hasNumber: false,
    hasLetter: false
  });

  const validatePassword = (password) => {
    setValidations({
      length: password.length >= 3,
      hasNumber: /\d/.test(password),
      hasLetter: /[a-zA-Z]/.test(password)
    });
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setFormData({ ...formData, password: newPassword });
    validatePassword(newPassword);
  };

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
      } else {
        // Show success message and switch to login form
        setMessage('Registration successful! You can now log in.');
        setIsLogin(true);
      }
    })
    .catch((error) => {
      setLoading(false);
      if (error.response) {
        // Use the server's error message directly
        setMessage(error.response.data.error || 'An error occurred');
      } else {
        setMessage('Network error. Please try again.');
      }
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
          <div className="form-group">
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              required
              className={formData.username.length > 0 ? 'has-content' : ''}
            />
            <label className="floating-label">Username</label>
          </div>

          <div className="form-group password-group">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handlePasswordChange}
              required
              className={formData.password.length > 0 ? 'has-content' : ''}
            />
            <label className="floating-label">Password</label>
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          {!isLogin && (
            <div className="password-requirements">
              <p className={validations.length ? 'valid' : 'invalid'}>
                {validations.length ? <FaCheck /> : <FaTimes />}
                At least 3 characters
              </p>
              <p className={validations.hasLetter ? 'valid' : 'invalid'}>
                {validations.hasLetter ? <FaCheck /> : <FaTimes />}
                Contains a letter
              </p>
              <p className={validations.hasNumber ? 'valid' : 'invalid'}>
                {validations.hasNumber ? <FaCheck /> : <FaTimes />}
                Contains a number
              </p>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading || (!isLogin && !Object.values(validations).every(Boolean))}
            className="submit-button"
          >
            {loading ? (
              <span className="loading-spinner">
                <CgSpinner className="spinner-icon" />
                Please wait...
              </span>
            ) : (
              isLogin ? 'Login' : 'Register'
            )}
          </button>
        </form>

        {message && (
          <div className={`message ${message.includes('successful') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

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