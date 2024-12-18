import React from 'react';
import { useTheme } from '../../context/ThemeContext';

function HomeSettings() {
  const { currentTheme, setCurrentTheme, theme } = useTheme();

  const suggestedFeatures = [
    { title: 'Email Notifications', description: 'Get notified about new expenses' },
    { title: 'Export Data', description: 'Download your expense data' },
    { title: 'Currency Preferences', description: 'Set your preferred currency' },
    { title: 'Language Settings', description: 'Choose your preferred language' }
  ];

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ color: theme.text, marginBottom: '30px' }}>Settings</h2>

      <div style={{ backgroundColor: theme.surface, padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3 style={{ color: theme.text, marginBottom: '15px' }}>Theme</h3>
        <select
          value={currentTheme}
          onChange={(e) => setCurrentTheme(e.target.value)}
          style={{
            padding: '8px',
            borderRadius: '4px',
            border: `1px solid ${theme.border}`,
            backgroundColor: theme.background,
            color: theme.text
          }}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="forest">Forest</option>
        </select>
      </div>

      <div style={{ backgroundColor: theme.surface, padding: '20px', borderRadius: '8px' }}>
        <h3 style={{ color: theme.text, marginBottom: '15px' }}>Coming Soon</h3>
        <div style={{ display: 'grid', gap: '15px' }}>
          {suggestedFeatures.map((feature, index) => (
            <div key={index} style={{
              padding: '15px',
              backgroundColor: theme.background,
              borderRadius: '4px',
              opacity: 0.7
            }}>
              <h4 style={{ color: theme.text, marginBottom: '5px' }}>{feature.title}</h4>
              <p style={{ color: theme.text, margin: 0 }}>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default HomeSettings;