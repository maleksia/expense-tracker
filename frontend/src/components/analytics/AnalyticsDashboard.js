import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { FaUserCog, FaChartLine, FaTrophy } from 'react-icons/fa';

function AnalyticsDashboard({ expenses }) {
  const { theme } = useTheme();
  const [filteredExpenses, setFilteredExpenses] = useState(expenses);
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPayerWithStatus, setSelectedPayerWithStatus] = useState('all');  // Changed from selectedPayer
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
  const [topExpenses, setTopExpenses] = useState([]);
  const [dayOfWeekData, setDayOfWeekData] = useState([]);
  const clearFilters = () => {
    setDateRange({ start: '', end: '' });
    setSelectedCategory('all');
    setSelectedPayerWithStatus('all');
    setSortBy('date');
  };
  const COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#65a30d', '#0891b2', '#6366f1'];

  const uniqueCategories = [...new Set(expenses.map(e => e.category))];
  const uniquePayers = [...new Set(expenses.map(e => `${e.payerType}:${e.payer}`))].map(p => {
    const [payerType, name] = p.split(':');
    return { payerType, name };
  });

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

    // Updated payer filter to use full status:name combination
    if (selectedPayerWithStatus !== 'all') {
      const [selectedType, selectedName] = selectedPayerWithStatus.split(':');
      filtered = filtered.filter(e => 
        e.payerType === selectedType && e.payer === selectedName
      );
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
  }, [expenses, dateRange, selectedCategory, selectedPayerWithStatus, sortBy]);

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

      // Payer distribution - separate registered and non-registered
      const payerSpending = filteredExpenses.reduce((acc, expense) => {
        const key = `${expense.payerType}:${expense.payer}`;
        acc[key] = (acc[key] || 0) + expense.amount;
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

      setPayerData(Object.entries(payerSpending).map(([key, value]) => {
        const [payerType, name] = key.split(':');
        return {
          name,
          value: Number(value.toFixed(2)),
          payerType
        };
      }));

      const totalSpent = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      setStats({
        totalSpent: totalSpent.toFixed(2),
        avgExpense: (totalSpent / filteredExpenses.length).toFixed(2),
        maxExpense: Math.max(...filteredExpenses.map(exp => exp.amount)).toFixed(2),
        totalExpenses: filteredExpenses.length
      });
    }
  }, [filteredExpenses, sortBy]);

  // Add new useEffect for additional analytics
  useEffect(() => {
    if (filteredExpenses.length > 0) {
      // Get top 5 expenses
      const sortedExpenses = [...filteredExpenses]
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      // Calculate total spending per day of week (not average)
      const daySpending = filteredExpenses.reduce((acc, expense) => {
        const day = format(parseISO(expense.date), 'EEEE');
        if (!acc[day]) {
          acc[day] = 0;
        }
        acc[day] += expense.amount;
        return acc;
      }, {});

      // Define weekday order
      const weekdayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      
      // Create ordered data array with totals
      const orderedDayData = weekdayOrder.map(day => ({
        day: day.slice(0, 3), // Use three-letter abbreviations
        total: daySpending[day] ? Number(daySpending[day].toFixed(2)) : 0
      }));

      setTopExpenses(sortedExpenses);
      setDayOfWeekData(orderedDayData);
    }
  }, [filteredExpenses]);

  const renderPayer = (payer, payerType) => {
    const isRegistered = payerType === 'registered';
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        backgroundColor: isRegistered ? `${theme.primary}15` : theme.surface,
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '0.95rem'
      }}>
        {isRegistered && <FaUserCog style={{ color: theme.primary }} />}
        <span style={{ color: theme.text }}>{payer}</span>
      </div>
    );
  };

  // Update the Payer Distribution chart
  const PayerChart = () => (
    <div style={{ backgroundColor: theme.surface, padding: '20px', borderRadius: '8px' }}>
      <h3>Spending by Payer</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={payerData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name"
            tick={({ x, y, payload }) => {
              const isRegistered = payerData[payload.index]?.payerType === 'registered';
              return (
                <g transform={`translate(${x},${y})`}>
                  <text x={0} y={0} dy={16} textAnchor="middle" fill={theme.text}>
                    {isRegistered ? '👤 ' : ''}{payload.value}
                  </text>
                </g>
              );
            }}
          />
          <YAxis />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div style={{
                    backgroundColor: theme.surface,
                    padding: '10px',
                    border: `1px solid ${theme.border}`,
                    borderRadius: '4px'
                  }}>
                    <p style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: '0' }}>
                      {data.payerType === 'registered' && <FaUserCog style={{ color: theme.primary }} />}
                      {data.name}
                    </p>
                    <p style={{ margin: '5px 0 0 0' }}>€{data.value.toFixed(2)}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend />
          <Bar dataKey="value">
            {payerData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  // Update the payer filter to use full status+name combination
  const PayerFilter = () => (
    <div>
      <label>Payer</label>
      <select
        value={selectedPayerWithStatus}
        onChange={(e) => setSelectedPayerWithStatus(e.target.value)}
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
        {uniquePayers.map(({ name, payerType }) => (
          <option key={`${payerType}:${name}`} value={`${payerType}:${name}`}>
            {payerType === 'registered' ? '👤 ' : ''}{name}
          </option>
        ))}
      </select>
    </div>
  );

  const TopExpensesTable = () => (
    <div style={{ backgroundColor: theme.surface, padding: '20px', borderRadius: '8px' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <FaTrophy style={{ color: theme.primary }} />
        Top Expenses
      </h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: `1px solid ${theme.border}` }}>Description</th>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: `1px solid ${theme.border}` }}>Amount</th>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: `1px solid ${theme.border}` }}>Date</th>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: `1px solid ${theme.border}` }}>Payer</th>
            </tr>
          </thead>
          <tbody>
            {topExpenses.map((expense, index) => (
              <tr key={expense.id}>
                <td style={{ padding: '8px', borderBottom: `1px solid ${theme.border}` }}>{expense.description}</td>
                <td style={{ padding: '8px', borderBottom: `1px solid ${theme.border}` }}>€{expense.amount.toFixed(2)}</td>
                <td style={{ padding: '8px', borderBottom: `1px solid ${theme.border}` }}>
                  {format(parseISO(expense.date), 'dd.MM.yyyy')}
                </td>
                <td style={{ padding: '8px', borderBottom: `1px solid ${theme.border}` }}>
                  {renderPayer(expense.payer, expense.payerType)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const DayOfWeekChart = () => (
    <div style={{ backgroundColor: theme.surface, padding: '20px', borderRadius: '8px' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <FaChartLine style={{ color: theme.primary }} />
        Total Spending by Day
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={dayOfWeekData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="day"
            height={50}
            tick={{
              angle: 0,
              textAnchor: 'middle',
              dy: 10
            }}
          />
          <YAxis />
          <Tooltip formatter={(value) => `€${value.toFixed(2)}`} />
          <Bar dataKey="total">
            {dayOfWeekData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

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

        <PayerFilter />

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

        {/* Updated Payer Distribution */}
        <PayerChart />
      </div>

      {/* Add new analytics sections */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <TopExpensesTable />
        <DayOfWeekChart />
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