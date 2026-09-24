// ==========================================
// 1. PWA 서비스 워커 및 실제 설치 동작 로직
// ==========================================

// ① 서비스 워커 등록
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('Service Worker 등록 완료:', reg.scope))
      .catch((err) => console.error('Service Worker 등록 실패:', err));
  });
}

let deferredPrompt = null;
const installBtn = document.getElementById('install-btn');

// ② 브라우저가 앱 설치 준비가 완료되었을 때 발생시키는 이벤트 수신
window.addEventListener('beforeinstallprompt', (e) => {
  // 브라우저 기본 자동 프롬프트 창 방지
  e.preventDefault();
  // 설치 이벤트를 변수에 저장 (클릭 시 실행용)
  deferredPrompt = e;

  // 설치 버튼 활성화 및 표시
  if (installBtn) {
    installBtn.style.display = 'block';
    installBtn.innerText = '📲 앱으로 설치하기';
  }
});

// ③ 버튼 클릭 시 '실제 앱 설치 팝업' 실행
if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      // 1. 보관해둔 설치 프롬프트 팝업 띄우기
      deferredPrompt.prompt();

      // 2. 사용자의 선택(설치 / 취소) 기다리기
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`[PWA] 사용자 선택: ${outcome}`);

      // 3. 사용 완료 후 프롬프트 초기화 및 버튼 숨기기
      deferredPrompt = null;
      installBtn.style.display = 'none';
    } else {
      // 이벤트 수신이 안 된 경우 안내 메시지 표시
      alert('브라우저 우측 상단 주소창 끝의 [컴퓨터/다운로드 💻/↓] 아이콘을 누르면 바로 설치할 수 있습니다.');
    }
  });
}

// ④ 이미 웹 앱 형태로 실행 중이거나 설치가 끝난 경우 처리
window.addEventListener('appinstalled', () => {
  console.log('[PWA] 설치가 성공적으로 완료되었습니다.');
  if (installBtn) installBtn.style.display = 'none';
  deferredPrompt = null;
});


// ==========================================
// 2. 대기 시스템 & 파일 업로드 로직
// ==========================================

let currentBookContent = "";
let currentBookTitle = "";
let activeTicketId = null;

const bookFileInput = document.getElementById('book-file');
if (bookFileInput) {
  bookFileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      document.getElementById('file-label-text').innerText = `📖 ${file.name}`;
      const reader = new FileReader();
      reader.onload = function(event) {
        currentBookContent = event.target.result;
        currentBookTitle = file.name.replace('.txt', '');
      };
      reader.readAsText(file);
    }
  });
}

document.addEventListener('DOMContentLoaded', updateUI);

function registerWaiting() {
  const name = document.getElementById('user-name').value.trim();
  const phone = document.getElementById('user-phone').value.trim();

  if (!name || !phone) {
    alert('성함과 연락처를 입력해 주세요.');
    return;
  }

  if (!currentBookContent) {
    alert('대기 동안 읽으실 도서 파일(.txt)을 선택해 주세요.');
    return;
  }

  const tickets = JSON.parse(localStorage.getItem('hagyeom_waiting_tickets') || '[]');
  const waitingNumber = tickets.length + 101;

  const newTicket = {
    id: Date.now().toString(),
    number: waitingNumber,
    name: name,
    phone: phone,
    bookTitle: currentBookTitle,
    bookContent: currentBookContent,
    scrollTop: 0,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  tickets.push(newTicket);
  localStorage.setItem('hagyeom_waiting_tickets', JSON.stringify(tickets));

  document.getElementById('user-name').value = '';
  document.getElementById('user-phone').value = '';
  document.getElementById('file-label-text').innerText = '📄 도서 파일(.txt) 선택하기';
  currentBookContent = "";
  currentBookTitle = "";

  alert(`[대기 접수 완료]\n대기번호: ${waitingNumber}번`);
  updateUI();
}

function updateUI() {
  const tickets = JSON.parse(localStorage.getItem('hagyeom_waiting_tickets') || '[]');
  
  const countEl = document.getElementById('total-waiting-count');
  const timeEl = document.getElementById('estimated-time');
  if (countEl) countEl.innerText = `${tickets.length}팀`;
  if (timeEl) timeEl.innerText = tickets.length * 10;

  const listDiv = document.getElementById('my-waiting-list');
  if (!listDiv) return;

  listDiv.innerHTML = '';

  if (tickets.length === 0) {
    listDiv.innerHTML = '<p style="color: #a6adc8; text-align: center; padding: 20px 0;">현재 접수된 대기 내역이 없습니다.</p>';
    return;
  }

  tickets.forEach((ticket) => {
    const card = document.createElement('div');
    card.className = 'waiting-card';
    card.innerHTML = `
      <div class="wait-info">
        <h4>No. ${ticket.number} (${ticket.name}님)</h4>
        <p>📖 ${ticket.bookTitle}</p>
        <p style="font-size: 0.75em; color: #6c7086;">접수시간: ${ticket.timestamp}</p>
      </div>
      <button class="enter-btn" onclick="enterReader('${ticket.id}')">바로 입장</button>
    `;
    listDiv.appendChild(card);
  });
}

function enterReader(ticketId) {
  const tickets = JSON.parse(localStorage.getItem('hagyeom_waiting_tickets') || '[]');
  const ticket = tickets.find(t => t.id === ticketId);
  if (!ticket) return;

  activeTicketId = ticketId;
  document.getElementById('reader-title').innerText = `[No.${ticket.number}] ${ticket.bookTitle}`;
  
  const contentDiv = document.getElementById('reader-content');
  contentDiv.innerText = ticket.bookContent;

  document.getElementById('reader-view').style.display = 'flex';

  setTimeout(() => {
    contentDiv.scrollTop = ticket.scrollTop || 0;
  }, 50);
}

function saveProgress() {
  if (!activeTicketId) return;

  const contentDiv = document.getElementById('reader-content');
  const tickets = JSON.parse(localStorage.getItem('hagyeom_waiting_tickets') || '[]');
  const ticketIndex = tickets.findIndex(t => t.id === activeTicketId);

  if (ticketIndex !== -1) {
    tickets[ticketIndex].scrollTop = contentDiv.scrollTop;
    localStorage.setItem('hagyeom_waiting_tickets', JSON.stringify(tickets));
  }
}

function closeReader() {
  document.getElementById('reader-view').style.display = 'none';
  activeTicketId = null;
}