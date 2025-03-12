import React, { useEffect, useState, useRef } from 'react';
import { Stomp } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WebSocketChat = ({ auctionId }) => {
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const stompClient = useRef(null); // stompClient를 useRef로 선언하여 참조 유지


  const [auctionData, setAuctionData] = useState({
    currentBid: 100,  // 예시로 기본값 설정
    highestBidder: 'User123', // 예시로 기본값 설정    
  });



  useEffect(() => {
    // WebSocket 연결을 위한 SockJS 클라이언트 설정
    const socket = new SockJS('http://localhost:8088/ws-connect');
    stompClient.current = Stomp.over(socket);

    // 서버와 연결
    stompClient.current.connect({}, () => {
      setConnected(true);
      console.log('Connected to WebSocket server');

      // /topic/chat 경로를 구독하여 메시지를 받음
      stompClient.current.subscribe('/topic/chat', (response) => {
        console.log(response);        
        // 서버로부터 받은 메시지 처리
        setChatMessages((prevMessages) => [...prevMessages, response.body]);
      });
    });

    // 컴포넌트 언마운트 시 연결 해제
    return () => {
      if (stompClient.current) {
        stompClient.current.disconnect();
        console.log('Disconnected from WebSocket server');
      }
    };
  }, []); // 빈 배열로 의존성 추가

  // 메시지 전송 함수
  const sendMessage = () => {
    if (connected && message.trim() !== '') {
      // payload 객체 생성
      const payload = {
        userId: "5", // 실제 값으로 대체할 수 있습니다.
        auctionId: 1, // props에서 받은 auctionId 사용
        message: message, // 여기서 message는 사용자가 입력한 내용
      };

      // JSON으로 변환하여 전송
      if (stompClient.current) {
        stompClient.current.send(`/auction/${payload.auctionId}/chat`, {}, JSON.stringify(payload));
      }

      setMessage(''); // 메시지 전송 후 입력창 비우기
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
      {/* 경매 정보 */}
      <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f8f8f8', borderRadius: '8px' }}>
        <h2>Online Auction - Auction {auctionId}</h2>
        <div>
          <p><strong>Current Bid:</strong> ${auctionData.currentBid}</p>
          <p><strong>Highest Bidder:</strong> {auctionData.highestBidder}</p>          
        </div>
      </div>

      {/* 채팅 영역 */}
      <div>
        <h3>Live Chat</h3>
        <div style={{ height: '300px', overflowY: 'scroll', marginBottom: '15px', padding: '10px', backgroundColor: '#f9f9f9', border: '1px solid #ddd', borderRadius: '8px' }}>
          <ul style={{ listStyleType: 'none', padding: '0' }}>
            {chatMessages.map((msg, index) => (
              <li key={index} style={{ marginBottom: '10px' }}>
                <strong>User {index + 1}:</strong> {msg}
              </li>
            ))}
          </ul>
        </div>

        {/* 채팅 입력창 */}
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
