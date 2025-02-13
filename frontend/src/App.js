import React, { useState, useEffect } from 'react';
import { Route, Routes, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { CurrencyProvider } from './context/CurrencyContext';
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
import ErrorBoundary from './components/common/ErrorBoundary';
import DeletedExpenses from './components/expenses/DeletedExpenses';
import ExpenseListsView from './components/lists/ExpenseListsView';
import { LoadingSpinner, Notification, ConfirmDialog } from './components/common/index';
import NotFound from './components/common/NotFound';


console.log('Hello World!!!');

function AppContent() {
  const { theme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [currentUser, setCurrentUser] = useState(() => {
    return localStorage.getItem('currentUser') || null;
  });
  const [currentList, setCurrentList] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ show: false, message: '' });


  // Fetch expenses whenever currentUser or currentList changes
  useEffect(() => {
    const fetchData = async () => {
      if (currentUser) {
        try {
          if (currentList) {
            const data = await fetchExpenses(currentUser, currentList.id);
            setExpenses(data);
            setErrorMessage('');
          } else {
            setExpenses([]); // Clear expenses when no list is selected
            setErrorMessage('');
          }
        } catch (err) {
          console.error('Failed to fetch expenses:', err);
          setErrorMessage('Failed to fetch expenses');
        }
      }
    };
    
    fetchData();
  }, [currentUser, currentList]);

  // Handle route changes to set currentList based on URL
  useEffect(() => {
    // Fetch list data when listId changes
    const fetchListData = async (listId) => {
      try {
        const response = await fetch(`http://localhost:5000/lists/${listId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch list data');
        }
        const data = await response.json();
        setCurrentList(data);
      } catch (error) {
        console.error('Error fetching list:', error);
        setErrorMessage('Failed to load list');
      }
    };

    const path = location.pathname;
    const match = path.match(/^\/list\/(\d+)/);
    if (match) {
      const listId = parseInt(match[1], 10);
      fetchListData(listId);
    } else {
      setCurrentList(null);
    }
  }, [location.pathname]);

  const handleLogin = (username) => {
    setCurrentUser(username);
    localStorage.setItem('currentUser', username);
    setErrorMessage('');
    navigate(location.state?.from || '/');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setExpenses([]);
    navigate('/login');
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

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDeleteExpense = async (id) => {
    setConfirmDialog({
      show: true,
      message: 'Are you sure you want to delete this expense?',
      onConfirm: async () => {
        setLoading(true);
        try {
          await deleteExpense(id);
          showNotification('Expense deleted successfully', 'success');
          setExpenses(prev => prev.filter(exp => exp.id !== id));
        } catch (error) {
          showNotification('Failed to delete expense', 'error');
        }
        setLoading(false);
        setConfirmDialog({ show: false, message: '' });
      }
    });
  };

  const handleRestore = async (id) => {
    try {
      await restoreExpense(id);
      const updatedExpenses = await fetchExpenses(currentUser, currentList.id);
      setExpenses(updatedExpenses);
    } catch (error) {
      setErrorMessage('Failed to restore expense');
    }
  };

  const handleListSelect = async (listId) => {
    if (currentList?.id === Number(listId)) {
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/lists/${listId}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch list data');
      }
      const listData = await response.json();
      setCurrentList(listData);

      // Fetch expenses for specific list
      const expenses = await fetchExpenses(currentUser, listId);
      setExpenses(expenses);
      // Removed navigate to prevent redirection back to /list/:listId
    } catch (error) {
      setErrorMessage('Failed to fetch list data');
    }
  };

  const ProtectedRoute = ({ children }) => {
    if (!currentUser) {
      return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }
    return children;
  };

  return (
    <div className="app-container" style={{ backgroundColor: theme.background }}>
      {loading && <LoadingSpinner />}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      <ConfirmDialog
        isOpen={confirmDialog.show}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ show: false, message: '' })}
      />

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 1rem',
        width: '100%',
        flex: 1,
        backgroundColor: theme.background,
        color: theme.text,
        minHeight: '100vh'
      }}>
        {currentUser && (
          <Navigation
            onLogout={handleLogout}
            currentList={currentList}
            isListView={location.pathname.includes('/list/')}
          />
        )}

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
          <Route path="/login" element={
            currentUser ? <Navigate to="/" replace /> : <AuthForm onLogin={handleLogin} />
          } />

          {/* Home route - show expense lists */}
          <Route path="/" element={
            <ProtectedRoute>
              <ExpenseListsView
                currentUser={currentUser}
                onListSelect={handleListSelect}
              />
            </ProtectedRoute>
          } />

          {/* List specific routes */}
          <Route path="/list/:listId" element={
            <ProtectedRoute>
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
            <ProtectedRoute>
              <AllExpenses
                currentUser={currentUser}
                expenses={expenses}
                handleDeleteExpense={handleDeleteExpense}
                currentList={currentList}
              />
            </ProtectedRoute>
          } />

          <Route path="/list/:listId/analytics" element={
            <ProtectedRoute>
              <AnalyticsDashboard expenses={expenses} />
            </ProtectedRoute>
          } />

          <Route path="*" element={<NotFound />} />

          <Route path="/list/:listId/deleted" element={
            <ProtectedRoute>
              <DeletedExpenses
                currentUser={currentUser}
                currentList={currentList}
                onRestore={handleRestore}
              />
            </ProtectedRoute>
          } />

          <Route path="/settings" element={
            <ProtectedRoute>
              <Settings
                currentUser={currentUser}
                currentList={currentList}
              />
            </ProtectedRoute>
          } />
          <Route path="/list/:listId/settings" element={
            <ProtectedRoute>
              <Settings
                currentUser={currentUser}
                currentList={currentList}
              />
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <CurrencyProvider>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </CurrencyProvider>
    </ThemeProvider>
  );
}

export default App;