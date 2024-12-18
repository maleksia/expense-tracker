import React from 'react';
import { useLocation } from 'react-router-dom';
import HomeSettings from './HomeSettings';
import ListSettings from './ListSettings';

function Settings({ currentUser, currentList }) {
  const location = useLocation();
  const isListSettings = location.pathname.includes('/list/');

  return isListSettings ? (
    <ListSettings currentUser={currentUser} currentList={currentList} />
  ) : (
    <HomeSettings />
  );
}

export default Settings;