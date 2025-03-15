import React from 'react'
import { useNavigate } from 'react-router-dom';

const Button = () => {
    
    const navigate = useNavigate();
    const navigateToAuction = (getProductIdToURL) => {
      // 상품 ID를 URL에 파라미터로 전달
      navigate(`/auction/${getProductIdToURL}`);
    };

 
  return (
    <div>
      <h1>경매방 생성</h1>
      <button onClick={() => navigateToAuction(4)}>상품 4번 보기</button>
      <button onClick={() => navigateToAuction(10)}>상품 10번</button>
    </div>
  )
}

export default Button;