import React, { useEffect, useState, useRef } from 'react';
import { Stomp } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WebSocketChat = ( ) => {  
  const auctionId = 1; //초기 옥션 1로 임시 설정 테스트용
  const [message, setMessage] = useState(''); //클라이언트가 보낼 채팅내역
  const [chatMessages, setChatMessages] = useState([]); //서버가 응답한 채팅내역
  //옥션 정보
  const [auctionData, setAuctionData] = useState({
    currentBid: 100,  // 예시로 기본값 설정
    highestBidder: 'User123', // 예시로 기본값 설정    
  });
  //입찰
  const [bidAmount, setBidAmount] = useState(auctionData.startingPrice); // 초기값은 현재 최고 입찰가
  const [highestBid, setHighestBid] = useState(auctionData.currentBid); // 최고 입찰가 상태

  const stompClient = useRef(null); // stompClient를 useRef로 선언하여 참조 유지
  const connected = useRef(false); // WebSocket 연결 상태를 useRef로 관리 , useState로 관리하니까 리렌더링에 영향을 받아서 유지가 잘 안되는 것 같음음
  // 페이지가 렌더링되면 한 번만 실행
  useEffect(() => {   

    //경매 정보 요청
    const fetchAuctionData = async () => {      
        const response = await fetch(`http://localhost:8088/api/auction/${auctionId}`);
        
        // 응답 상태가 200이 아닐 경우 예외 처리
        if (!response.ok) {
          throw new Error('경매 데이터를 불러오는 데 실패했습니다.');
        }

        const auctionData = await response.json();
        console.log(auctionData);  
        console.log(auctionData.auctionInfo); //경매 조회 데이터        
              
        setAuctionData(auctionData.auctionInfo);
        setBidAmount(auctionData.auctionInfo.startingPrice);   
    };
    fetchAuctionData();

   
    //서버 엔드포인트
    const socket = new SockJS('http://localhost:8088/ws-connect');
    stompClient.current = Stomp.over(socket);

    // 서버와 연결
    stompClient.current.connect({}, () => {
      connected.current = true;
      console.log('Connected to WebSocket server');

      // 채팅 구독
      stompClient.current.subscribe('/topic/chat', (response) => {
        // console.log(response);        
        const getChatData = JSON.parse(response.body);
        console.log(getChatData);
        
        setChatMessages((prevMessages) => [...prevMessages, response.body]); //STOMP응답에서 문자열 본문이 있을 경우 response.body 사용 
      });

      // 경매 구독
      stompClient.current.subscribe('/topic/bid', (response) => {
        const HighestBidData = JSON.parse(response.body);
        console.log(HighestBidData);         
        // setAuctionData(HighestBidData);
      });
    });

    // 컴포넌트 언마운트 시 연결 해제
    return () => {
      if (stompClient.current) {
        stompClient.current.disconnect();
        console.log('Disconnected from WebSocket server');
      }
    };
  }, []); // 빈 배열로 의존성 추가하여 한 번만 연결 설정

  // // 경매 정보 구독
  // useEffect(() => {
  //   if (stompClient.current && auctionId) {
  //     stompClient.current.subscribe(`/topic/bid`, (response) => {
  //       const auctionUpdate = JSON.parse(response.body);
  //       setAuctionData(auctionUpdate);
  //       setHighestBid(auctionUpdate.currentBid); // 최고 입찰가 실시간 업데이트
  //     });
  //   }
  // }, [auctionId]); // auctionId가 변경될 때마다 다시 구독

  // 메시지 전송 함수
  const sendMessage = () => {
    if (connected && message.trim() !== '') {
      const payload = {
        userId: "5", // 실제 값으로 대체할 수 있습니다.
        auctionId: 1, // props에서 받은 auctionId 사용
        message: message,
      };

      if (stompClient.current) {
        stompClient.current.send(`/auction/${payload.auctionId}/chat`, {}, JSON.stringify(payload));
      }

      setMessage(''); // 메시지 전송 후 입력창 비우기
    }
  };

  // 입찰가 증가 함수
  const handleBidIncrease = () => {
    setBidAmount((prevBid) => prevBid + 100); // 예: 100단위로 증가
  };

  // 입찰가 감소 함수
  const handleBidDecrease = () => {
    if (bidAmount > auctionData.currentBid + 100) {
      setBidAmount((prevBid) => prevBid - 100);
    }
  };

  // 응찰 버튼 클릭 시 입찰 처리
  const handleBidSubmit = () => {
    if (bidAmount > auctionData.currentBid) {
      const payload = {
        userId: "100", // 실제 사용자 ID로 대체
        auctionId: 1, // 실제 경매방 번호로 대체
        bidAmount: bidAmount,
      };

      //응찰 데이터 전송
      if (stompClient.current) {
        stompClient.current.send(`/auction/${payload.auctionId}/bid`, {}, JSON.stringify(payload));
        setHighestBid(bidAmount); // 최고 입찰가 업데이트
        alert('최고가 입찰 성공!');
      }
    } else {
      alert('최고가보다 낮은 금액은 입찰이 불가능합니다.');
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
      {/* 경매 정보 */}
      <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f8f8f8', borderRadius: '8px' }}>
        <h2>Online Auction : {auctionData.title}</h2>
        <div>
          <p><strong>Current Bid:</strong> ${auctionData.currentBid}</p>
          <p><strong>Highest Bidder:</strong> {auctionData.highestBidder}</p>
        </div>
      </div>   

      {/* 입찰 */}
      <h3>Place Your Bid</h3>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
        {/* -버튼 */}
        <button onClick={handleBidDecrease} style={{ padding: '8px 12px', backgroundColor: '#f1f1f1', border: '1px solid #ccc', borderRadius: '5px', marginRight: '10px' }}>-</button>
        {/* 입찰 가격 설정 */}
        <input 
          type="number" 
          value={bidAmount} 
          onChange={(e) => setBidAmount(Number(e.target.value))} 
          style={{ padding: '10px', width: '120px', textAlign: 'center', borderRadius: '5px', border: '1px solid #ccc', marginRight: '10px' }}
        />
        {/* +버튼 */}
        <button onClick={handleBidIncrease} style={{ padding: '8px 12px', backgroundColor: '#f1f1f1', border: '1px solid #ccc', borderRadius: '5px' }}>+</button>
        {/* 입찰 버튼 */}
        <button onClick={handleBidSubmit} style={{ padding: '10px 15px', marginLeft: '20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px' }}>Place Bid</button>
      </div>  
      <div>
        {/* 현재 입찰가 */}
        <p><strong>Current Highest Bid:</strong> ${highestBid}</p>
      </div>

      {/* 채팅 영역 */}
      <div>
        <h3>Live Chat</h3>
        <div style={{ height: '300px', overflowY: 'scroll', marginBottom: '15px', padding: '10px', backgroundColor: '#f9f9f9', border: '1px solid #ddd', borderRadius: '8px' }}>
          <ul style={{ listStyleType: 'none', padding: '0' }}>
            {/* 메세지 */}                
            {chatMessages.map((msg, index) => (
              <li key={index} style={{ marginBottom: '10px' }}>
                <strong>User {index + 1}:</strong> {msg}
              </li>
            ))}
          </ul>
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message"
            style={{ padding: '10px', width: '80%', borderRadius: '5px', border: '1px solid #ccc' }}
          />
          <button onClick={sendMessage} style={{ padding: '10px 15px', marginLeft: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px' }}>Send</button>
        </div>
      </div>
    </div>
  );
};

export default WebSocketChat;
