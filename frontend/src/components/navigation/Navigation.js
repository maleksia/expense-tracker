import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

function Navigation({ onLogout, currentList, isListView }) {
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

  return (
    <nav style={navStyle}>
      <ul style={{
        display: 'flex',
        listStyle: 'none',
        gap: '2rem',
        margin: 0,
        padding: 0,
        alignItems: 'center'
      }}>
        <li>
          <Link to="/" style={{ color: theme.primary }}>Home</Link>
        </li>

        {isListView && currentList && (
          <>
            <li>
              <Link to={`/list/${currentList.id}`} style={{ color: theme.primary }}>
                New Expense
              </Link>
            </li>
            <li>
              <Link to={`/list/${currentList.id}/all`} style={{ color: theme.primary }}>
                All Expenses
              </Link>
            </li>
            <li>
              <Link to={`/list/${currentList.id}/analytics`} style={{ color: theme.primary }}>
                Analytics
              </Link>
            </li>
            <li>
              <Link to={`/list/${currentList.id}/deleted`} style={{ color: theme.primary }}>
                Deleted Expenses
              </Link>
            </li>
            <li>
              <Link to={`/list/${currentList.id}/settings`} style={{ color: theme.primary }}>
                Settings
              </Link>
            </li>
          </>
        )}

        {!isListView && (
          <li>
            <Link to="/settings" style={{ color: theme.primary }}>Settings</Link>
          </li>
        )}

        <li style={{ marginLeft: 'auto' }}>
          <button
            onClick={onLogout}
            style={{
              backgroundColor: theme.primary,
              color: '#fff',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              fontSize: '14px',
              fontWeight: '500'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = theme.primaryDark}
            onMouseOut={(e) => e.target.style.backgroundColor = theme.primary}
          >
            Logout
          </button>
        </li>
      </ul>
    </nav>
  );
}

export default Navigation;