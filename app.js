// ==========================================
// 1. PWA 서비스 워커 및 설치 버튼 강제 활성화
// ==========================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('Service Worker 등록 성공:', reg.scope))
      .catch((err) => console.error('Service Worker 등록 실패:', err));
  });
}

let deferredPrompt;
const installBtn = document.getElementById('install-btn');

// 브라우저 PWA 이벤트 감지
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) {
    installBtn.style.display = 'block';
    installBtn.innerText = '📲 앱으로 설치하기';
  }
});

// PWA 이벤트를 지원하지 않거나 이미 설치된 경우에도 버튼을 보여주는 예외 처리
window.addEventListener('load', () => {
  setTimeout(() => {
    if (installBtn && installBtn.style.display !== 'block') {
      // 이미 PWA 창(standalone)으로 열린 게 아니라면 버튼 강제 표시
      if (!window.matchMedia('(display-mode: standalone)').matches) {
        installBtn.style.display = 'block';
        installBtn.innerText = '📲 앱 설치 (주소창 우측 [💻/↓] 아이콘 클릭)';
        installBtn.onclick = () => {
          if (deferredPrompt) {
            deferredPrompt.prompt();
          } else {
            alert('브라우저 우측 상단 주소창 끝에 있는 [컴퓨터/다운로드 아이콘 💻/↓]을 눌러 설치해 주세요!');
          }
        };
      }
    }
  }, 1000);
});

// 설치 버튼 클릭 이벤트
if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA 설치 응답: ${outcome}`);
      deferredPrompt = null;
      installBtn.style.display = 'none';
    }
  });
}

window.addEventListener('appinstalled', () => {
  console.log('PWA 설치 완료');
  if (installBtn) installBtn.style.display = 'none';
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