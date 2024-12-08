import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import {
  fetchExpenses,
  deleteExpense,
  addExpense,
  restoreExpense
} from './api';

import Navigation from './components/navigation/Navigation';
import RecentExpenses from './components/expenses/RecentExpenses';
import AllExpenses from './components/expenses/AllExpenses';
import AnalyticsDashboard from './components/analytics/AnalyticsDashboard';
import Settings from './components/settings/Settings';
import AuthForm from './components/auth/AuthForm';
// import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import DeletedExpenses from './components/expenses/DeletedExpenses';
import './styles/main.css';

function AppContent() {
  const { theme } = useTheme();
  const [currentUser, setCurrentUser] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    if (currentUser) {
      fetchExpenses(currentUser)
        .then(setExpenses)
        .catch(() => setErrorMessage('Failed to fetch expenses'));
    }
  }, [currentUser]);

  const handleLogin = (username) => {
    setCurrentUser(username);
    setErrorMessage('');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setExpenses([]);
  };

  const handleAddExpense = async (expenseData) => {
    try {
      const newExpense = await addExpense({
        ...expenseData,
        username: currentUser,
      });
      setExpenses(prev => [newExpense, ...prev]);
      return true;
    } catch (error) {
      setErrorMessage('Failed to add expense');
      return false;
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      await deleteExpense(id);
      setExpenses(prev => prev.filter(expense => expense.id !== id));
    } catch (error) {
      setErrorMessage('Failed to delete expense');
    }
  };

  const handleRestore = async (id) => {
    try {
      await restoreExpense(id);
      const updatedExpenses = await fetchExpenses(currentUser);
      setExpenses(updatedExpenses);
    } catch (error) {
      setErrorMessage('Failed to restore expense');
    }
  };

  const ProtectedRoute = ({ children }) => {
    if (!currentUser) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '0 1rem',
      backgroundColor: theme.background,
      color: theme.text,
      minHeight: '100vh'
    }}>
      {currentUser && <Navigation onLogout={handleLogout} />}

      <Routes>
        <Route path="/login" element={<AuthForm onLogin={handleLogin} />} />
        <Route path="/" element={
          <ProtectedRoute isAuthenticated={!!currentUser}>
            <RecentExpenses
              currentUser={currentUser}
              expenses={expenses}
              handleAddExpense={handleAddExpense}
              handleDeleteExpense={handleDeleteExpense}
            />
          </ProtectedRoute>
        } />
        <Route path="/all" element={
          <ProtectedRoute>
            <AllExpenses
              currentUser={currentUser}
              expenses={expenses}
              handleDeleteExpense={handleDeleteExpense}
            />
          </ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute>
            <AnalyticsDashboard expenses={expenses} />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings currentUser={currentUser} />
          </ProtectedRoute>
        } />
        <Route path="/deleted" element={
          <ProtectedRoute>
            <DeletedExpenses
              currentUser={currentUser}
              onRestore={handleRestore}
            />
          </ProtectedRoute>
        } />
      </Routes>

      {errorMessage && (
        <p style={{ color: theme.error }}>{errorMessage}</p>
      )}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </Router>
    </ThemeProvider>
  );
}

export default App;