import React, { useEffect, useState, useRef } from 'react';
import { Stomp } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import {useParams} from 'react-router-dom';

//방만들기 버튼 클릭시 상품id url로 전송 -> useParams로 받아서 사용 
const WebSocketChat = () => {   

  const { getProductIdToURL } = useParams(); // URL에서 productId 파라미터를 가져옴 -> 상품 id로 해당 경매 생성 + 상품 id로 경매 조회
  // const [productId, setProductId] = useState(4); 

  // 채팅 상태변수
  const [message, setMessage] = useState(''); //클라이언트가 보낼 채팅내역
  const [chatMessages, setChatMessages] = useState([]); //서버가 응답한 채팅내역
  // 경매 상태변수
  const [auctionData, setAuctionData] = useState({}); // 현재 경매 정보
  // 입찰 상태변수 
  const [bidAmount, setBidAmount] = useState(''); // 입찰가 , 초기값은 경매시작가
  const [highestBid, setHighestBid] = useState(''); // 최고 입찰가 상태

  const stompClient = useRef({}); // stompClient를 useRef로 선언하여 참조 유지 // 각 경매방에 대한 stompClient 관리
  const connected = useRef({}); // 각 경매방에 대한 연결 상태 관리 , useState로 관리하니까 리렌더링에 영향을 받아서 유지가 잘 안되는 것 같음
 

  // 상품id로 해당 경매 조회 후 경매 데이터로 초기 세팅
  useEffect(() => {       

    console.log(`url에서 받아온 값${getProductIdToURL}`);    
     //url에서 받아온 상품 아이디로 조회

    //경매 정보 요청 - 방에 입장했을 때 초기 설정
    const fetchAuctionData = async () => {      
        //상품 id로 경매 정보 요청
        const response = await fetch(`http://localhost:8088/api/auction/${getProductIdToURL}`);
        
        // 응답 상태가 200이 아닐 경우 예외 처리
        if (!response.ok) {
          throw new Error('경매 데이터를 불러오는 데 실패했습니다.');
        }

        //응답받은 경매 정보 접근하기
        const getAuctionData = await response.json();
        console.log(getAuctionData);  
        console.log(getAuctionData.auctionInfo);  
        const foundAuctionData = getAuctionData.auctionInfo; // auctionInfo안에 데이터 담겨있음
              
        setAuctionData(foundAuctionData);  // 경매 정보

        // 입찰자가 없을 시 최고가는 경매 시작가로 설정됨 + 새로고침시 사용자의 입찰금액도 현재 최고 입찰가로 설정됨
        if(foundAuctionData.currentPrice === null){
          //경매 초기세팅
          setHighestBid(foundAuctionData.startingPrice); 
          setBidAmount(foundAuctionData.startingPrice);   
          console.log("입찰자가 없어서 최고가는 경매 시작가로 설정됩니다.");               
        }else{
          //진행 중인 경매 세팅
          setHighestBid(foundAuctionData.currentPrice);  
          setBidAmount(foundAuctionData.currentPrice);  
          console.log(`현재 최고 입찰가는 ${foundAuctionData.currentPrice}입니다.`);     
        }   
        
        //채팅 초기 세팅
        //경매방 채팅내역 조회 요청
        const chatResponse = await fetch(`http://localhost:8088/api/chat/${foundAuctionData.id}`); 

        // 응답 상태가 200이 아닐 경우 예외 처리
        if (!chatResponse.ok) {
          throw new Error('채팅 데이터를 불러오는 데 실패했습니다.');
        }
        
        //응답받은 채팅 내역 접근하기 
        const getChatData = await chatResponse.json();
        console.log(getChatData);
        console.log(getChatData.chat);
        const foundChatData = getChatData.chat;
        setChatMessages(foundChatData); // 채팅 데이터 초기 설정

        console.log(foundAuctionData);
      };
    fetchAuctionData(); //경매 정보 초기 세팅 후 웹소켓 서버 연결
  }, [getProductIdToURL]); // getProductIdToURL가 변경될 때마다 다시 실행
    
   
  // auctionData가 업데이트된 후 WebSocket 연결 설정
  useEffect(() => {

  // auctionData.id가 존재하고, 해당 경매방에 대해 아직 연결되지 않은 경우
  if (auctionData.id && !connected.current[auctionData.id]) {    
    // WebSocket 연결을 위한 SockJS와 Stomp 설정
    const socket = new SockJS('http://localhost:8088/ws-connect');
    // 각 경매방에 대해 독립적인 웹소켓 클라이언트를 생성
    stompClient.current[auctionData.id] = Stomp.over(socket); 

    // 각 경매방에 WebSocket 서버에 연결
    stompClient.current[auctionData.id]?.connect({}, () => {
      connected.current[auctionData.id] = true;
      console.log('웹소켓 서버 연결');

      // 채팅 구독
      stompClient.current[auctionData.id]?.subscribe(`/topic/chat/${auctionData.id}`, (response) => {
        const getChatData = JSON.parse(response.body);
        setChatMessages((prevMessages) => [...prevMessages, getChatData]);
      });

      // 경매 구독
      stompClient.current[auctionData.id]?.subscribe(`/topic/bid/${auctionData.id}`, (response) => {
        const HighestBidData = JSON.parse(response.body);
        setHighestBid(HighestBidData.bidAmount);
      });
    });
    // 컴포넌트 언마운트 시 연결 해제
    return () => {
      if (stompClient.current[auctionData.id]) {
        stompClient.current[auctionData.id]?.disconnect();
        connected.current[auctionData.id] = false; // 연결 상태 초기화
        console.log('서버 연결 종료');
      }
    };
  }

  // auctionData.id가 없거나 연결된 상태일 때는 웹소켓 연결을 하지 않음
  return undefined;
}, [auctionData]); // auctionData가 변경될 때마다 다시 실행



  // 서버로 메시지 전송 함수
  const sendMessage = () => {
    if (connected.current[auctionData.id] && message.trim() !== '') {

      //현재 테스트용 임의 데이터
      const payload = {
        userId: "5", // 실제 값으로 대체할 수 있습니다.
        auctionId: auctionData.id, 
        message: message,
      };

      // 연결되어있다면 웹소켓을 요청 주소를 통해 JSON데이터 전송  
      // 주소는 백엔드와 일치시켜야함
      if (stompClient.current[auctionData.id]) {
        stompClient.current[auctionData.id].send(`/auction/${payload.auctionId}/chat`, {}, JSON.stringify(payload));
      }
      setMessage(''); // 메시지 전송 후 입력창 비우기
    }
  };

  // 입찰가 증가 함수
  const handleBidIncrease = () => {
    setBidAmount((prevBid) => prevBid + 10000); // 예: 10000단위로 증가
  };

  // 입찰가 감소 함수
  const handleBidDecrease = () => {
    if (bidAmount > auctionData.currentPrice + 10000) {
      setBidAmount((prevBid) => prevBid - 10000);
    }
  };

  // 응찰 버튼 클릭 시 입찰 처리
  const handleBidSubmit = () => {

    // 입찰가가 최고가보다 클 때 서버로 JSON 데이터 전송
    if (bidAmount > highestBid) {
      const payload = {
        userId: "100", // 실제 사용자 ID로 대체
        auctionId: auctionData.id, 
        bidAmount: bidAmount,
      };

      //응찰 데이터 전송
      if (stompClient.current[auctionData.id]) {
        stompClient.current[auctionData.id].send(`/auction/${payload.auctionId}/bid`, {}, JSON.stringify(payload));
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
          <p><strong>Current Bid:</strong> {highestBid}원</p>
          <p><strong>Highest Bidder:</strong> 최고 입찰자</p>
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
        <p><strong>Current Highest Bid:{highestBid}</strong></p>
      </div>

      {/* 채팅 영역 */}
      <div>
        <h3>Live Chat</h3>
        <div style={{ height: '300px', overflowY: 'scroll', marginBottom: '15px', padding: '10px', backgroundColor: '#f9f9f9', border: '1px solid #ddd', borderRadius: '8px', display: 'flex', flexDirection: 'column-reverse' }}> 
          <ul style={{ listStyleType: 'none', padding: '0' }}>
            {/* 메세지 배열 렌더링 */}                
            {chatMessages.map((msg, index) => (
              <li key={index} style={{ marginBottom: '10px' }}>
                {/* id대신 유저의 닉네임으로 변경 필요 */}
                <strong>{index + 1}. UserID - {msg.userId} : </strong>{msg.message} 
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
