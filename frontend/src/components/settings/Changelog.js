import React, { useEffect, useState } from 'react';
import { API } from '../../api/config';

const Changelog = ({ listId }) => {
  const [changelog, setChangelog] = useState([]);
  const [showLog, setShowLog] = useState(false);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    const fetchChangelog = async () => {
      try {
        const response = await API.get(`/changelog/${listId}`);
        setChangelog(response.data);
      } catch (error) {
        console.error('Error fetching changelog:', error);
      }
    };

    if (showLog) {
      fetchChangelog();
    }
  }, [listId, showLog]);

  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  const getChangeType = (action) => {
    const actionPart = action.split('|')[1]?.trim() || '';
    
    if (actionPart.startsWith('Added')) return 'NEW';
    if (actionPart.startsWith('Changed') || actionPart.startsWith('Updated')) return 'UPDATE';
    if (actionPart.startsWith('Deleted') || actionPart.startsWith('Removed')) return 'REMOVE';
    return 'INFO';
  };

  const getChangeColor = (type) => {
    switch (type) {
      case 'NEW':
        return '#4CAF50';
      case 'UPDATE':
        return '#FFC107';
      case 'REMOVE':
        return '#F44336';
      default:
        return '#2196F3';
    }
  };

  const filteredChangelog = changelog.filter(entry => {
    if (filter === 'ALL') return true;
    return getChangeType(entry.action) === filter;
  });

  return (
    <div>
      <h2>Changelog</h2>
      <button onClick={() => setShowLog(!showLog)}>
        {showLog ? 'Hide' : 'Show'} Changelog
      </button>
      {showLog && (
        <div>
          <div style={{ marginBottom: '10px' }}>
            <label>Filter by type: </label>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="ALL">All</option>
              <option value="NEW">New</option>
              <option value="UPDATE">Update</option>
              <option value="REMOVE">Remove</option>
            </select>
          </div>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {filteredChangelog.map(entry => (
              <li key={entry.id} style={{ marginBottom: '10px', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
                <div>
                  <strong style={{ color: getChangeColor(getChangeType(entry.action)) }}>
                    {getChangeType(entry.action)}
                  </strong> {formatDateTime(entry.timestamp)} - {entry.username} {entry.action}
                </div>
                {entry.details && (
                  <div style={{ marginTop: '5px', paddingLeft: '10px' }}>
                    <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                      {JSON.stringify(entry.details, null, 2)}
                    </pre>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Changelog;