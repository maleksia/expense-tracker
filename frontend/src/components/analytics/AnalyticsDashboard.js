import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import { format, parseISO, isWithinInterval } from 'date-fns';

function AnalyticsDashboard({ expenses }) {
  const { theme } = useTheme();
  const [filteredExpenses, setFilteredExpenses] = useState(expenses);
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPayer, setSelectedPayer] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [payerData, setPayerData] = useState([]);
  const [stats, setStats] = useState({
    totalSpent: '0',
    avgExpense: '0',
    maxExpense: '0',
    totalExpenses: 0
  });
  const clearFilters = () => {
    setDateRange({ start: '', end: '' });
    setSelectedCategory('all');
    setSelectedPayer('all');
    setSortBy('date');
  };
  const COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#65a30d', '#0891b2', '#6366f1'];

  const uniqueCategories = [...new Set(expenses.map(e => e.category))];
  const uniquePayers = [...new Set(expenses.map(e => e.payer))];

  // Filter expenses based on selected filters
  useEffect(() => {
    let filtered = [...expenses];

    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(expense => {
        const expenseDate = parseISO(expense.date);
        return isWithinInterval(expenseDate, {
          start: parseISO(dateRange.start),
          end: parseISO(dateRange.end)
        });
      });
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(e => e.category === selectedCategory);
    }

    if (selectedPayer !== 'all') {
      filtered = filtered.filter(e => e.payer === selectedPayer);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'amount':
          return Number(b.amount) - Number(a.amount);
        case 'date':
          return parseISO(b.date) - parseISO(a.date);
        default:
          return 0;
      }
    });

    setFilteredExpenses(filtered);
  }, [expenses, dateRange, selectedCategory, selectedPayer, sortBy]);

  // Process data for charts
  useEffect(() => {
    if (filteredExpenses.length > 0) {
      // Monthly spending
      const monthlySpending = filteredExpenses.reduce((acc, expense) => {
        const month = format(parseISO(expense.date), 'MMM yyyy');
        acc[month] = (acc[month] || 0) + expense.amount;
        return acc;
      }, {});

      // Category distribution
      const categorySpending = filteredExpenses.reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
        return acc;
      }, {});

      // Payer distribution
      const payerSpending = filteredExpenses.reduce((acc, expense) => {
        acc[expense.payer] = (acc[expense.payer] || 0) + expense.amount;
        return acc;
      }, {});

      let sortedMonthlyData = Object.entries(monthlySpending)
        .map(([month, amount]) => ({
          month,
          amount: Number(amount.toFixed(2))
        }));

      // Apply sorting based on sortBy
      sortedMonthlyData.sort((a, b) => {
        switch (sortBy) {
          case 'amount':
            return Number(b.amount) - Number(a.amount);
          case 'date':
            return parseISO(format(new Date(`${a.month} 01`), 'yyyy-MM-dd')) -
              parseISO(format(new Date(`${b.month} 01`), 'yyyy-MM-dd'));
          default:
            return 0;
        }
      });

      setMonthlyData(sortedMonthlyData);

      setCategoryData(Object.entries(categorySpending).map(([name, value]) => ({
        name,
        value: Number(value.toFixed(2))
      })));

      setPayerData(Object.entries(payerSpending).map(([name, value]) => ({
        name,
        value: Number(value.toFixed(2))
      })));

      const totalSpent = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      setStats({
        totalSpent: totalSpent.toFixed(2),
        avgExpense: (totalSpent / filteredExpenses.length).toFixed(2),
        maxExpense: Math.max(...filteredExpenses.map(exp => exp.amount)).toFixed(2),
        totalExpenses: filteredExpenses.length
      });
    }
  }, [filteredExpenses, sortBy]);

  return (
    <div style={{ padding: '20px', color: theme.text }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2>Expense Analytics</h2>
        <button
          onClick={clearFilters}
          style={{
            backgroundColor: theme.surface,
            color: theme.primary,
            border: `1px solid ${theme.primary}`,
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Clear Filters
        </button>
      </div>

      {/* Filters Section */}
      <div style={{
        backgroundColor: theme.surface,
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px'
      }}>
        <div>
          <label>Date Range</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: `1px solid ${theme.border}`,
                backgroundColor: theme.background,
                color: theme.text
              }}
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: `1px solid ${theme.border}`,
                backgroundColor: theme.background,
                color: theme.text
              }}
            />
          </div>
        </div>

        <div>
          <label>Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: `1px solid ${theme.border}`,
              backgroundColor: theme.background,
              color: theme.text
            }}
          >
            <option value="all">All Categories</option>
            {uniqueCategories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Payer</label>
          <select
            value={selectedPayer}
            onChange={(e) => setSelectedPayer(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: `1px solid ${theme.border}`,
              backgroundColor: theme.background,
              color: theme.text
            }}
          >
            <option value="all">All Payers</option>
            {uniquePayers.map(payer => (
              <option key={payer} value={payer}>{payer}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: `1px solid ${theme.border}`,
              backgroundColor: theme.background,
              color: theme.text
            }}
          >
            <option value="date">Date</option>
            <option value="amount">Amount</option>
          </select>
        </div>
      </div>
      {/* Charts Section with Smooth Transitions */}
      <div style={{ marginBottom: '30px', backgroundColor: theme.surface, padding: '20px', borderRadius: '8px' }}>
        <h3>Monthly Spending Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              height={60}
              tick={{ angle: -45, textAnchor: 'end' }}
            />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="amount"
              stroke={theme.primary}
              animationDuration={500}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <StatCard title="Total Spent" value={`€${stats.totalSpent}`} theme={theme} />
        <StatCard title="Average Expense" value={`€${stats.avgExpense}`} theme={theme} />
        <StatCard title="Largest Expense" value={`€${stats.maxExpense}`} theme={theme} />
        <StatCard title="Total Transactions" value={stats.totalExpenses} theme={theme} />
      </div>

      {/* New Weekly Trend Chart */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>

      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '20px'
      }}>
        {/* Category Distribution */}
        <div style={{ backgroundColor: theme.surface, padding: '20px', borderRadius: '8px' }}>
          <h3>Spending by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, value, percent }) =>
                  `${name}: €${value.toFixed(2)} (${(percent * 100).toFixed(1)}%)`
                }
                labelLine={true}
              >
                {categoryData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => `€${value.toFixed(2)}`}
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Payer Distribution */}
        <div style={{ backgroundColor: theme.surface, padding: '20px', borderRadius: '8px' }}>
          <h3>Spending by Payer</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={payerData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill={theme.primary} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, theme }) {
  return (
    <div style={{
      backgroundColor: theme.surface,
      padding: '20px',
      borderRadius: '8px',
      textAlign: 'center'
    }}>
      <h4 style={{ margin: '0 0 10px 0', color: theme.text }}>{title}</h4>
      <p style={{
        margin: 0,
        fontSize: '24px',
        fontWeight: 'bold',
        color: theme.primary
      }}>
        {value}
      </p>
    </div>
  );
}

export default AnalyticsDashboard;