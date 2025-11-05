import React from 'react';
import './App.css'; 
//Importem el component que hem creat
import ExpressionDetector from './ExpressionDetector'; 

function App() {
  return (
    <div className="App">
      <ExpressionDetector /> // Cridem al component
    </div>
  );
}

export default App;