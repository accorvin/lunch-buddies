import React from 'react';
import { AuthProvider } from './AuthContext';
import LunchBuddyApp from './LunchBuddyApp';

function App() {
  return (
    <AuthProvider>
      <LunchBuddyApp />
    </AuthProvider>
  );
}

export default App;
