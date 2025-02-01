import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const NotFound = () => {
  const { theme } = useTheme();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '80vh',
      color: theme.text
    }}>
      <h1>404</h1>
      <p>Page Not Found</p>
      <Link to="/" style={{ color: theme.primary }}>Go to Home</Link>
    </div>
  );
};

export default NotFound;