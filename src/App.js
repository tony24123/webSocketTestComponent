
import './App.css';
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Button from './Button';
import WebSocketTest from './WebSocketTest';

function App() {
  return (    
    <Router>

      <Routes>
        {/* 경로가 '/'와 정확히 일치하는 경우 Button컴포넌트트 렌더링 */}
        <Route path="/" element={ <Button/> } />
        
        {/* 상품 ID를 URL 파라미터로 받는 경로 */}
        {/* 값을 받을때 getProductIdToURL 이름이 같아야함 */}
        <Route path="/auction/:getProductIdToURL" element={<WebSocketTest/>} />   
        
        </Routes>

    </Router>    
  );
}

export default App;
