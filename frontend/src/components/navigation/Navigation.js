import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

function Navigation({ onLogout }) {
  const { theme } = useTheme();

  const navStyle = {
    padding: '1rem',
    backgroundColor: theme.surface,
    marginBottom: '2rem',
    borderBottom: `1px solid ${theme.border}`,
    position: 'sticky',
    top: 0,
    zIndex: 100
  };

  const navListStyle = {
    display: 'flex',
    listStyle: 'none',
    gap: '2rem',
    margin: 0,
    padding: 0,
    alignItems: 'center'
  };

  const linkStyle = {
    color: theme.primary,
    textDecoration: 'none',
    fontWeight: '500',
    transition: 'opacity 0.2s ease',
    ':hover': {
      opacity: 0.8
    }
  };

  const buttonStyle = {
    backgroundColor: theme.primary,
    color: '#fff',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    marginLeft: 'auto'
  };

  return (
    <nav style={navStyle}>
      <ul style={navListStyle}>
        <li><Link to="/" style={linkStyle}>Home</Link></li>
        <li><Link to="/all" style={linkStyle}>All Expenses</Link></li>
        <li><Link to="/analytics" style={linkStyle}>Analytics</Link></li>
        <li><Link to="/settings" style={linkStyle}>Settings</Link></li>
        <li><Link to="/deleted"  style={linkStyle}>Deleted Expenses</Link></li>
        <li style={{ marginLeft: 'auto' }}>
          <button
            onClick={onLogout}
            style={buttonStyle}
          >
            Logout
          </button>
        </li>
      </ul>
    </nav>
  );
}

export default Navigation;