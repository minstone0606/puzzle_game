const board = document.getElementById("board");
const piecesContainer = document.getElementById("pieces");
const stageDisplay = document.getElementById("stageDisplay");
const timerDisplay = document.getElementById("timerDisplay");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const passBtn = document.getElementById("passBtn");

// --- 게임 상태 변수 ---
let boardState = Array(100).fill(false);
let currentStage = 1;
const MAX_STAGE = 5;
let timerInterval = null;
let timeLeft = 240; // 4분
let isGameStarted = false; // 게임 시작 여부
let isPaused = false;      // 일시정지 여부

// 테트리스 Shape 데이터
const SHAPES = [
    { name: "O", blocks: [[0,0],[1,0],[0,1],[1,1]] },
    { name: "I", blocks: [[0,0],[1,0],[2,0],[3,0]] },
    { name: "L", blocks: [[0,0],[0,1],[0,2],[1,2]] },
    { name: "J", blocks: [[1,0],[1,1],[1,2],[0,2]] },
    { name: "T", blocks: [[0,0],[1,0],[2,0],[1,1]] },
    { name: "S", blocks: [[1,0],[2,0],[0,1],[1,1]] },
    { name: "Z", blocks: [[0,0],[1,0],[1,1],[2,1]] },
    { name: "DOT", blocks: [[0,0]] },
    { name: "2LINE", blocks: [[0,0],[1,0]] },
    { name: "3LINE", blocks: [[0,0],[1,0],[2,0]] },
    { name: "5LINE", blocks: [[0,0],[1,0],[2,0],[3,0],[4,0]] }
];

// ----- 초기화 -----
function initGame() {
    createBoardGrid();
    
    // 버튼 이벤트 연결
    startBtn.addEventListener("click", startGameHandler);
    pauseBtn.addEventListener("click", togglePauseHandler);
    passBtn.addEventListener("click", passPieceHandler);

    // 초기 버튼 상태 설정
    pauseBtn.disabled = true;
    passBtn.disabled = true;
    stageDisplay.innerText = "PRESS START";
}

function createBoardGrid() {
    board.innerHTML = "";
    for (let i = 0; i < 100; i++) {
        const c = document.createElement("div");
        c.className = "cell";
        board.appendChild(c);
    }
}

// ----- 게임 흐름 제어 -----

// 1. 게임 시작 버튼 클릭 시
function startGameHandler() {
    if (isGameStarted) return; // 이미 시작했으면 무시

    isGameStarted = true;
    startBtn.disabled = true;   // 시작 버튼 비활성화
    startBtn.style.display = "none"; // 혹은 숨기기
    pauseBtn.disabled = false;  // 일시정지 활성화
    passBtn.disabled = false;   // 패스 활성화

    startStage(1);
}

// 2. 일시정지 버튼 클릭 시
function togglePauseHandler() {
    if (!isGameStarted) return;

    if (isPaused) {
        // 재개 (Resume)
        isPaused = false;
        pauseBtn.innerText = "⏸ 일시정지";
        pauseBtn.style.backgroundColor = "#9e9e9e"; // 회색 복귀
        board.style.opacity = "1"; // 보드 밝게
        startTimer(); // 타이머 다시 시작
    } else {
        // 일시정지 (Pause)
        isPaused = true;
        pauseBtn.innerText = "▶ 다시 하기";
        pauseBtn.style.backgroundColor = "#4caf50"; // 초록색(강조)
        board.style.opacity = "0.5"; // 보드 흐리게 (생각은 할 수 있게)
        clearInterval(timerInterval); // 타이머 멈춤
    }
}

function startStage(stage) {
    currentStage = stage;
    stageDisplay.innerText = `STAGE ${currentStage} / ${MAX_STAGE}`;
    
    // 시간 계산: 1단계 240초(4분) - (단계-1)*15초
    timeLeft = 240 - ((currentStage - 1) * 15);
    updateTimerDisplay();

    // 보드 및 조각 초기화
    boardState.fill(false);
    const piecesOnBoard = board.querySelectorAll('.piece');
    piecesOnBoard.forEach(p => p.remove());
    
    piecesContainer.innerHTML = "";
    maintainPieceStock();

    startTimer();
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        if (isPaused) return; // (안전장치) 일시정지면 시간 줄이지 않음

        timeLeft--;
        updateTimerDisplay();

        // [조건 1 수정] 유일한 게임 종료 조건: 시간 초과
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert("⏰ 시간 초과! 게임 오버!");
            location.reload(); 
        }
    }, 1000);
}

function updateTimerDisplay() {
    const min = Math.floor(timeLeft / 60);
    const sec = timeLeft % 60;
    timerDisplay.innerText = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}


// ----- 조각 생성 및 관리 -----
function rotateBlocks(blocks) {
    const rotated = blocks.map(([x, y]) => [-y, x]);
    const minX = Math.min(...rotated.map(b => b[0]));
    const minY = Math.min(...rotated.map(b => b[1]));
    return rotated.map(([x, y]) => [x - minX, y - minY]);
}

function createPiece(shapeData) {
    const piece = document.createElement("div");
    piece.className = "piece";

    let blocks = shapeData.blocks.map(b => [...b]); 
    const rotateCount = Math.floor(Math.random() * 4);
    for(let i=0; i<rotateCount; i++) {
        blocks = rotateBlocks(blocks);
    }

    renderPieceBlocks(piece, blocks);
    
    piece.onmousedown = startDrag;
    piece.oncontextmenu = rotatePieceHandler;

    piecesContainer.appendChild(piece);
}

function renderPieceBlocks(piece, blocks) {
    piece.innerHTML = ''; 
    piece.dataset.shape = JSON.stringify(blocks);
    const maxX = Math.max(...blocks.map(b => b[0]));
    const maxY = Math.max(...blocks.map(b => b[1]));
    piece.style.width = `${(maxX + 1) * 40}px`;
    piece.style.height = `${(maxY + 1) * 40}px`;

    blocks.forEach(([x, y]) => {
        const block = document.createElement("div");
        block.className = "piece-block";
        block.style.left = `${x * 40}px`;
        block.style.top = `${y * 40}px`;
        piece.appendChild(block);
    });
}

// ----- 조작 핸들러 (일시정지/시작 전 체크 추가) -----

function rotatePieceHandler(e) {
    e.preventDefault();
    // [조건 2,3] 게임 시작 전이거나 일시정지 상태면 조작 불가
    if (!isGameStarted || isPaused) return;

    const piece = e.target.closest('.piece');
    if (!piece) return;

    const currentBlocks = JSON.parse(piece.dataset.shape);
    const newBlocks = rotateBlocks(currentBlocks);

    if (piece.parentElement === board) {
        const currentX = parseInt(piece.dataset.gridX);
        const currentY = parseInt(piece.dataset.gridY);
        updateBoardState(piece, false); 
        if (checkCollision(newBlocks, currentX, currentY)) {
            renderPieceBlocks(piece, newBlocks);
            updateBoardState(piece, true);
        } else {
            updateBoardState(piece, true);
        }
    } else {
        renderPieceBlocks(piece, newBlocks);
    }
}

function passPieceHandler() {
    // [조건 2,3] 조작 불가 체크
    if (!isGameStarted || isPaused) return;

    const pieces = Array.from(piecesContainer.children).filter(el => el.classList.contains('piece'));
    if (pieces.length === 0) {
        alert("교체할 조각이 없습니다!");
        return;
    }
    pieces[0].remove();
    addRandomPiece();
    // checkGameOver 호출 삭제됨 (요청사항 반영)
}

// ----- 드래그 앤 드롭 -----
let currentPiece = null;
let offsetX = 0, offsetY = 0;
let startParent = null;

function startDrag(e) {
    // [조건 2,3] 게임 시작 전이거나 일시정지 상태면 드래그 불가
    if (!isGameStarted || isPaused) return;
    if (e.button === 2) return; 

    currentPiece = e.target.closest('.piece');
    if (!currentPiece) return;
    
    startParent = currentPiece.parentElement;
    if (startParent === board) updateBoardState(currentPiece, false);

    const rect = currentPiece.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    document.body.appendChild(currentPiece);
    currentPiece.style.position = "absolute";
    currentPiece.style.zIndex = "1000";
    currentPiece.style.margin = "0";

    movePieceTo(e.clientX, e.clientY);

    document.onmousemove = dragPiece;
    document.onmouseup = dropPiece;
}

function dragPiece(e) {
    if (!currentPiece) return;
    movePieceTo(e.clientX, e.clientY);
}

function movePieceTo(cx, cy) {
    currentPiece.style.left = `${cx - offsetX}px`;
    currentPiece.style.top = `${cy - offsetY}px`;
}

function dropPiece(e) {
    document.onmousemove = null;
    document.onmouseup = null;

    if (!currentPiece) return;

    const boardRect = board.getBoundingClientRect();
    const pieceRect = currentPiece.getBoundingClientRect();
    const relativeX = pieceRect.left - boardRect.left;
    const relativeY = pieceRect.top - boardRect.top;

    const cellX = Math.round(relativeX / 40);
    const cellY = Math.round(relativeY / 40);

    if (canPlace(currentPiece, cellX, cellY)) {
        placePiece(currentPiece, cellX, cellY);
    } else {
        if (startParent === board) returnToStock(currentPiece);
        else returnToStock(currentPiece);
    }
    
    currentPiece = null;
    checkComplete();
}

// ----- 유틸리티 -----
function checkCollision(blocks, x, y) {
    for (let [bx, by] of blocks) {
        const px = x + bx;
        const py = y + by;
        if (px < 0 || px >= 10 || py < 0 || py >= 10) return false;
        if (boardState[py * 10 + px]) return false;
    }
    return true;
}

function canPlace(piece, x, y) {
    const shape = JSON.parse(piece.dataset.shape);
    return checkCollision(shape, x, y);
}

function placePiece(piece, x, y) {
    board.appendChild(piece);
    piece.style.position = "absolute";
    piece.style.left = `${x * 40}px`;
    piece.style.top = `${y * 40}px`;
    piece.style.margin = "0";
    piece.style.zIndex = "";
    piece.dataset.gridX = x;
    piece.dataset.gridY = y;

    updateBoardState(piece, true);
    maintainPieceStock(); 
}

function returnToStock(piece) {
    piece.style.position = "relative";
    piece.style.left = "";
    piece.style.top = "";
    piece.style.margin = "0 auto";
    piece.style.zIndex = "";
    piecesContainer.appendChild(piece);
}

function updateBoardState(piece, isFilled) {
    const shape = JSON.parse(piece.dataset.shape);
    const x = parseInt(piece.dataset.gridX); 
    const y = parseInt(piece.dataset.gridY);

    if (isNaN(x) || isNaN(y)) return;

    shape.forEach(([bx, by]) => {
        const idx = (y + by) * 10 + (x + bx);
        if (idx >= 0 && idx < 100) boardState[idx] = isFilled;
    });
}

function addRandomPiece() {
    const randomShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    createPiece(randomShape);
}

function maintainPieceStock() {
    let count = 0;
    for(let i=0; i<piecesContainer.children.length; i++){
        if(piecesContainer.children[i].classList.contains('piece')) count++;
    }
    while (count < 3) {
        addRandomPiece();
        count++;
    }
    // [수정됨] 여기서 checkGameOver를 더 이상 호출하지 않음
}

function checkComplete() {
    if (boardState.every(v => v === true)) {
        clearInterval(timerInterval); 
        setTimeout(() => {
            if (currentStage < MAX_STAGE) {
                alert(`🎉 STAGE ${currentStage} 클리어!\n다음 단계로 이동합니다! (시간 단축 -15초)`);
                startStage(currentStage + 1); 
            } else {
                alert("🏆 축하합니다! 모든 스테이지를 클리어하셨습니다!");
                location.reload(); 
            }
        }, 100);
    }
}

// 최초 실행 (대기 상태)
initGame();