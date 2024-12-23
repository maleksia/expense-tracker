import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import {
  fetchExpenses,
  deleteExpense,
  addExpense,
  restoreExpense,
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
import ExpenseListsView from './components/lists/ExpenseListsView';

function AppContent() {
  const { theme } = useTheme();
  const [currentUser, setCurrentUser] = useState(null);
  const [currentList, setCurrentList] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    if (currentUser && currentList) {
      fetchExpenses(currentUser, currentList.id)
        .then(setExpenses)
        .catch(() => setErrorMessage('Failed to fetch expenses'));
    } else if (currentUser && !currentList) {
      fetchExpenses(currentUser)
        .then(setExpenses)
        .catch(() => setErrorMessage('Failed to fetch expenses'));
    }
  }, [currentUser, currentList]);

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
      if (!currentList) {
        setErrorMessage('No list selected');
        return false;
      }

      const newExpense = await addExpense({
        ...expenseData,
        username: currentUser,
        list_id: currentList.id
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

  const handleListSelect = async (listId) => {
    try {
      const response = await fetch(`http://localhost:5000/lists/${listId}`);
      const listData = await response.json();
      setCurrentList(listData);

      // Fetch expenses for specific list
      const expenses = await fetchExpenses(currentUser, listId);
      setExpenses(expenses);
    } catch (error) {
      setErrorMessage('Failed to fetch list data');
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

      {currentUser && (
        <Navigation
          onLogout={handleLogout}
          currentList={currentList}
        />
      )}

      {/* Display errorMessage if exists */}
      {errorMessage && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '10px',
          borderRadius: '4px',
          margin: '10px 0'
        }}>
          {errorMessage}
        </div>
      )}

      <Routes>
        <Route path="/login" element={<AuthForm onLogin={handleLogin} />} />

        {/* Home route - show expense lists */}
        <Route path="/" element={
          <ProtectedRoute isAuthenticated={!!currentUser}>
            <ExpenseListsView
              currentUser={currentUser}
              onListSelect={handleListSelect}
            />
          </ProtectedRoute>
        } />

        {/* List specific routes */}
        <Route path="/list/:listId" element={
          <ProtectedRoute isAuthenticated={!!currentUser}>
            <RecentExpenses
              currentUser={currentUser}
              currentList={currentList}
              expenses={expenses}
              handleAddExpense={handleAddExpense}
              handleDeleteExpense={handleDeleteExpense}
            />
          </ProtectedRoute>
        } />

        <Route path="/list/:listId/all" element={
          <ProtectedRoute isAuthenticated={!!currentUser}>
            <AllExpenses
              currentUser={currentUser}
              expenses={expenses}
              handleDeleteExpense={handleDeleteExpense}
            />
          </ProtectedRoute>
        } />

        <Route path="/list/:listId/analytics" element={
          <ProtectedRoute isAuthenticated={!!currentUser}>
            <AnalyticsDashboard expenses={expenses} />
          </ProtectedRoute>
        } />

        <Route path="/list/:listId/deleted" element={
          <ProtectedRoute isAuthenticated={!!currentUser}>
            <DeletedExpenses
              currentUser={currentUser}
              currentList={currentList}
              onRestore={handleRestore}
            />
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute isAuthenticated={!!currentUser}>
            <Settings
              currentUser={currentUser}
              currentList={currentList}
            />
          </ProtectedRoute>
        } />
      </Routes>
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