import React, { useState } from 'react';
import Landing from './components/Landing';
import Workspace from './components/Workspace';

function App() {
  const [view, setView] = useState('landing'); // 'landing' or 'workspace'

  return (
    <>
      {view === 'landing' ? (
        <Landing setView={setView} />
      ) : (
        <Workspace setView={setView} />
      )}
    </>
  );
}

export default App;
