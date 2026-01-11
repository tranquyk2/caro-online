// ================= FIREBASE CONFIG =================
firebase.initializeApp({
    apiKey: "AIzaSyDeB-_Frk6I0Wiz_iU00BVhQCj1WUq07Ho",
    authDomain: "caro-online-25b89.firebaseapp.com",
    databaseURL: "https://caro-online-25b89-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "caro-online-25b89",
    storageBucket: "caro-online-25b89.firebasestorage.app",
    messagingSenderId: "188534610510",
    appId: "1:188534610510:web:a5a56c33fc60db221e411f"
  });
  
  const db = firebase.database();
  
  // ================= BIẾN =================
  const BOARD_SIZE = 15; // Bàn cờ 15x15
  let roomId = "";
  let mySymbol = "";
  let myPlayerName = "";
  let gameStartTime = null;
  let moveCount = 0;
  
  const boardDiv = document.getElementById("board");
  const statusText = document.getElementById("status");
  const timerDiv = document.getElementById("timer");
  const moveCountDiv = document.getElementById("moveCount");
  
  // Lấy tên từ localStorage hoặc prompt
  function getPlayerName() {
    let name = localStorage.getItem("playerName");
    if (!name) {
      name = prompt("Nhập tên của bạn:", "Người chơi " + Math.floor(Math.random() * 1000));
      if (name) {
        localStorage.setItem("playerName", name);
      } else {
        name = "Người chơi " + Math.floor(Math.random() * 1000);
      }
    }
    return name;
  }
  
  myPlayerName = getPlayerName();
  if (document.getElementById("playerNameInput")) {
    document.getElementById("playerNameInput").value = myPlayerName;
  }
  
  // Kiểm tra phòng đã lưu khi tải trang
  checkSavedRoom();
  
  // Khởi tạo bàn cờ trống khi trang tải
  if (boardDiv) {
    const emptyBoard = Array(BOARD_SIZE * BOARD_SIZE).fill("");
    renderBoard(emptyBoard);
  }
  
  // ================= DARK MODE =================
  function initDarkMode() {
    const darkMode = localStorage.getItem("darkMode") === "true";
    const toggle = document.getElementById("darkModeToggle");
    if (toggle) {
      toggle.checked = darkMode;
      applyDarkMode(darkMode);
    }
  }
  
  function toggleDarkMode() {
    const toggle = document.getElementById("darkModeToggle");
    const isDark = toggle ? toggle.checked : false;
    localStorage.setItem("darkMode", isDark.toString());
    applyDarkMode(isDark);
  }
  
  function applyDarkMode(isDark) {
    document.body.classList.toggle("dark-mode", isDark);
  }
  
  // Khởi tạo dark mode khi tải trang
  initDarkMode();
  
  // ================= EMOJI REACTIONS =================
  function sendEmoji(emoji) {
    if (!roomId || !myPlayerName) {
      alert("Bạn chưa vào phòng!");
      return;
    }
    
    const chatRef = db.ref("rooms/" + roomId + "/chat");
    
    chatRef.push({
      player: myPlayerName,
      message: emoji,
      timestamp: Date.now(),
      isEmoji: true
    }).catch(error => {
      console.error("Lỗi gửi emoji:", error);
    });
  }
  
  // ================= KIỂM TRA PHÒNG ĐÃ LƯU =================
  function checkSavedRoom() {
    const savedRoom = localStorage.getItem("savedRoom");
    if (savedRoom) {
      try {
        const roomData = JSON.parse(savedRoom);
        const rejoinBtn = document.getElementById("rejoinRoomBtn");
        if (rejoinBtn && roomData.roomId) {
          rejoinBtn.style.display = "block";
          rejoinBtn.setAttribute("data-room-id", roomData.roomId);
          rejoinBtn.setAttribute("data-symbol", roomData.symbol || "");
        }
      } catch (e) {
        console.error("Lỗi đọc phòng đã lưu:", e);
        localStorage.removeItem("savedRoom");
      }
    }
  }
  
  // ================= LƯU THÔNG TIN PHÒNG =================
  function saveRoomInfo() {
    if (roomId && mySymbol) {
      const roomData = {
        roomId: roomId,
        symbol: mySymbol,
        playerName: myPlayerName,
        timestamp: Date.now()
      };
      localStorage.setItem("savedRoom", JSON.stringify(roomData));
    }
  }
  
  // ================= RỜI PHÒNG =================
  function leaveRoom() {
    if (!roomId) {
      alert("Bạn chưa vào phòng nào!");
      return;
    }
    
    if (!confirm("Bạn có chắc muốn rời phòng? Bạn có thể vào lại sau.")) {
      return;
    }
    
    // Xóa listener
    if (roomId) {
      db.ref("rooms/" + roomId).off("value");
      db.ref("rooms/" + roomId + "/chat").off("value");
    }
    
    // Lưu thông tin phòng trước khi rời
    saveRoomInfo();
    
    // Reset các biến
    const oldRoomId = roomId;
    roomId = "";
    mySymbol = "";
    gameStartTime = null;
    moveCount = 0;
    
    // Reset UI
    statusText.innerText = "Đã rời phòng";
    boardDiv.innerHTML = "";
    const emptyBoard = Array(BOARD_SIZE * BOARD_SIZE).fill("");
    renderBoard(emptyBoard);
    
    // Ẩn các panel
    const leftPanel = document.getElementById("leftPanel");
    const rightPanel = document.getElementById("rightPanel");
    const leaveBtn = document.getElementById("leaveRoomBtn");
    const resetBtn = document.getElementById("resetBtn");
    
    if (leftPanel) leftPanel.style.display = "none";
    if (rightPanel) rightPanel.style.display = "none";
    if (leaveBtn) leaveBtn.style.display = "none";
    if (resetBtn) resetBtn.style.display = "none";
    
    // Hiển thị nút vào lại
    checkSavedRoom();
    
    // Xóa input mã phòng
    const roomInput = document.getElementById("roomInput");
    if (roomInput) roomInput.value = "";
    
    alert("Đã rời phòng! Bạn có thể vào lại bằng nút 'Vào lại phòng'.");
  }
  
  // ================= VÀO LẠI PHÒNG =================
  function rejoinRoom() {
    const savedRoom = localStorage.getItem("savedRoom");
    if (!savedRoom) {
      alert("Không có phòng nào đã lưu!");
      return;
    }
    
    try {
      const roomData = JSON.parse(savedRoom);
      const savedRoomId = roomData.roomId;
      
      if (!savedRoomId) {
        alert("Thông tin phòng không hợp lệ!");
        localStorage.removeItem("savedRoom");
        return;
      }
      
      // Kiểm tra phòng còn tồn tại không
      db.ref("rooms/" + savedRoomId).once("value").then(snap => {
        if (!snap.exists()) {
          alert("Phòng này không còn tồn tại!");
          localStorage.removeItem("savedRoom");
          const rejoinBtn = document.getElementById("rejoinRoomBtn");
          if (rejoinBtn) rejoinBtn.style.display = "none";
          return;
        }
        
        const data = snap.val();
        
        // Khôi phục thông tin
        roomId = savedRoomId;
        mySymbol = roomData.symbol || (data.players?.player1?.symbol === roomData.symbol ? "X" : "O");
        myPlayerName = roomData.playerName || myPlayerName;
        
        // Cập nhật input
        const roomInput = document.getElementById("roomInput");
        if (roomInput) roomInput.value = savedRoomId;
        
        // Kiểm tra lại symbol từ Firebase
        if (data.players) {
          if (data.players.player1 && data.players.player1.name === myPlayerName) {
            mySymbol = data.players.player1.symbol || "X";
          } else if (data.players.player2 && data.players.player2.name === myPlayerName) {
            mySymbol = data.players.player2.symbol || "O";
          }
        }
        
        // Khôi phục game state
        if (data.gameStartTime) {
          gameStartTime = data.gameStartTime;
        }
        if (data.moveCount !== undefined) {
          moveCount = data.moveCount;
        }
        
        // Kết nối lại
        listenRoom();
        listenChat();
        updatePlayerInfo();
        showPlayersInfo();
        showChatSection();
        
        // Hiển thị nút rời phòng
        const leaveBtn = document.getElementById("leaveRoomBtn");
        if (leaveBtn) leaveBtn.style.display = "block";
        
        // Ẩn nút vào lại
        const rejoinBtn = document.getElementById("rejoinRoomBtn");
        if (rejoinBtn) rejoinBtn.style.display = "none";
        
        statusText.innerText = "Đã vào lại phòng: " + savedRoomId;
        
        // Lưu lại thông tin
        saveRoomInfo();
        
      }).catch(error => {
        console.error("Lỗi vào lại phòng:", error);
        alert("Lỗi kết nối phòng! Vui lòng thử lại.");
      });
      
    } catch (e) {
      console.error("Lỗi đọc phòng đã lưu:", e);
      alert("Thông tin phòng không hợp lệ!");
      localStorage.removeItem("savedRoom");
      const rejoinBtn = document.getElementById("rejoinRoomBtn");
      if (rejoinBtn) rejoinBtn.style.display = "none";
    }
  }
  
  // ================= VẼ BÀN CỜ =================
  function renderBoard(board) {
    if (!boardDiv) {
      console.error("Không tìm thấy phần tử board!");
      return;
    }
    
    boardDiv.innerHTML = "";
    boardDiv.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, 1fr)`;
    
    // Đảm bảo board có đủ số ô
    const totalCells = BOARD_SIZE * BOARD_SIZE;
    const boardArray = Array.isArray(board) && board.length === totalCells 
      ? board 
      : Array(totalCells).fill("");
    
    boardArray.forEach((cell, i) => {
      const div = document.createElement("div");
      div.className = "cell";
      div.dataset.index = i;
      
      if (cell === "X") {
        div.innerHTML = '<span class="stone stone-x">X</span>';
        div.classList.add("occupied");
      } else if (cell === "O") {
        div.innerHTML = '<span class="stone stone-o">O</span>';
        div.classList.add("occupied");
      }
      
      div.onclick = () => {
        if (roomId && mySymbol) {
          play(i);
        } else {
          alert("Vui lòng tạo hoặc vào phòng trước!");
        }
      };
      boardDiv.appendChild(div);
    });
  }
  
  // ================= TẠO PHÒNG =================
  function createRoom() {
    const nameInput = document.getElementById("playerNameInput");
    if (nameInput && nameInput.value.trim()) {
      myPlayerName = nameInput.value.trim();
      localStorage.setItem("playerName", myPlayerName);
    }
    
    roomId = Math.random().toString(36).substr(2, 6).toUpperCase();
    mySymbol = "X";

    const initialBoard = Array(BOARD_SIZE * BOARD_SIZE).fill("");
    gameStartTime = Date.now();
    moveCount = 0;
    
    db.ref("rooms/" + roomId).set({
      board: initialBoard,
      turn: "X",
      winner: "",
      players: { 
        player1: {
          name: myPlayerName,
          symbol: "X",
          joined: true
        }
      },
      gameStartTime: gameStartTime,
      moveCount: 0,
      createdAt: Date.now(),
      chat: []
    }).then(() => {
      // Render board ngay lập tức
      renderBoard(initialBoard);
      statusText.innerText = "👉 Lượt của bạn (X) - Đang chờ người chơi 2...";
      updateTimer();
      updateMoveCount(0);
      listenRoom();
      listenChat();
      updatePlayerInfo();
      showPlayersInfo();
      showChatSection();
      showRoomCode(roomId);
      
      // Lưu thông tin phòng
      saveRoomInfo();
      
      // Hiển thị nút rời phòng
      const leaveBtn = document.getElementById("leaveRoomBtn");
      if (leaveBtn) leaveBtn.style.display = "block";
      
      // Ẩn nút vào lại
      const rejoinBtn = document.getElementById("rejoinRoomBtn");
      if (rejoinBtn) rejoinBtn.style.display = "none";
    }).catch(error => {
      console.error("Lỗi tạo phòng:", error);
      alert("Lỗi tạo phòng! Vui lòng thử lại.");
    });
  }
  
  // ================= VÀO PHÒNG =================
  function joinRoom(roomCode = null) {
    const nameInput = document.getElementById("playerNameInput");
    if (nameInput && nameInput.value.trim()) {
      myPlayerName = nameInput.value.trim();
      localStorage.setItem("playerName", myPlayerName);
    }
    
    roomId = roomCode || document.getElementById("roomInput").value.trim().toUpperCase();
    if (!roomId) {
      alert("Nhập mã phòng!");
      return;
    }
    
    // Kiểm tra phòng có tồn tại không
    db.ref("rooms/" + roomId).once("value").then(snap => {
      if (!snap.exists()) {
        alert("Phòng không tồn tại!");
        statusText.innerText = "Phòng không tồn tại";
        return;
      }
      
      const data = snap.val();
      
      // Kiểm tra phòng đã đủ 2 người chưa
      if (data.players && data.players.player2 && data.players.player2.joined) {
        alert("Phòng này đã đủ 2 người chơi!");
        return;
      }
      
      mySymbol = "O";
      statusText.innerText = "Đang kết nối...";
      
      if (data.gameStartTime) {
        gameStartTime = data.gameStartTime;
      }
      if (data.moveCount !== undefined) {
        moveCount = data.moveCount;
      }
      
      // Cập nhật người chơi 2
      db.ref("rooms/" + roomId + "/players").update({ 
        player2: {
          name: myPlayerName,
          symbol: "O",
          joined: true
        }
      });
      
      listenRoom();
      listenChat();
      updatePlayerInfo();
      showPlayersInfo();
      showChatSection();
      closeRoomListModal();
      
      // Lưu thông tin phòng
      saveRoomInfo();
      
      // Hiển thị nút rời phòng
      const leaveBtn = document.getElementById("leaveRoomBtn");
      if (leaveBtn) leaveBtn.style.display = "block";
      
      // Ẩn nút vào lại
      const rejoinBtn = document.getElementById("rejoinRoomBtn");
      if (rejoinBtn) rejoinBtn.style.display = "none";
    }).catch(error => {
      console.error("Lỗi vào phòng:", error);
      alert("Lỗi kết nối! Vui lòng thử lại.");
    });
  }
  
  // ================= LẮNG NGHE PHÒNG =================
  function listenRoom() {
    if (!roomId) return;
    
    db.ref("rooms/" + roomId).on("value", snap => {
      const data = snap.val();
      if (!data) {
        statusText.innerText = "Phòng không tồn tại";
        boardDiv.innerHTML = "";
        return;
      }

      // Đảm bảo board luôn được render
      const totalCells = BOARD_SIZE * BOARD_SIZE;
      if (data.board && Array.isArray(data.board) && data.board.length === totalCells) {
        renderBoard(data.board);
      } else {
        // Nếu board chưa có, tạo board mới
        const emptyBoard = Array(totalCells).fill("");
        renderBoard(emptyBoard);
      }

      // Cập nhật thời gian và số nước đi
      if (data.gameStartTime) {
        gameStartTime = data.gameStartTime;
      }
      if (data.moveCount !== undefined) {
        moveCount = data.moveCount;
        updateMoveCount(moveCount);
      }
      updateTimer();

      // Kiểm tra trạng thái game
      if (data.winner) {
        const isWinner = data.winner === mySymbol;
        const resetBtn = document.getElementById("resetBtn");
        if (resetBtn) resetBtn.style.display = "block";
        
        // Hiển thị kết quả nếu chưa hiển thị
        const resultModal = document.getElementById("gameResultModal");
        if (!resultModal || resultModal.style.display === "none") {
          showGameResult(isWinner ? "win" : "lose", {
            winner: data.winner,
            winningCells: data.winningCells || null
          });
        }
        
        statusText.innerText = isWinner 
          ? "🎉 Bạn đã thắng!" 
          : "😢 Bạn đã thua!";
      } else {
        const resetBtn = document.getElementById("resetBtn");
        if (resetBtn) resetBtn.style.display = "none";
        hideGameResult();
        
        if (data.turn) {
          const isMyTurn = data.turn === mySymbol;
          const symbolText = mySymbol === "X" ? "X" : "O";
          statusText.innerText = isMyTurn 
            ? "👉 Lượt của bạn (" + symbolText + ")" 
            : "⏳ Đợi đối thủ...";
        } else {
          statusText.innerText = "Đang chờ người chơi...";
        }
      }
      
      // Cập nhật thông tin người chơi
      updatePlayerInfo();
      updateStatIndicators();
    }, error => {
      console.error("Lỗi lắng nghe:", error);
      statusText.innerText = "Lỗi kết nối!";
    });
  }
  
  // ================= ĐÁNH CỜ =================
  function play(index) {
    if (!roomId || !mySymbol) {
      alert("Vui lòng tạo hoặc vào phòng trước!");
      return;
    }
    
    const ref = db.ref("rooms/" + roomId);

    ref.once("value").then(snap => {
      const data = snap.val();
      if (!data) {
        alert("Phòng không tồn tại!");
        return;
      }

      if (data.winner) {
        alert("Trò chơi đã kết thúc! Nhấn 'Chơi lại' để bắt đầu ván mới.");
        return;
      }

      if (data.turn !== mySymbol) {
        alert("Chưa đến lượt của bạn!");
        return;
      }
      
      if (data.board[index]) {
        alert("Ô này đã được đánh!");
        return;
      }

      // Tạo bản sao của board để tránh mutation
      const newBoard = [...data.board];
      newBoard[index] = mySymbol;
      
      const newTurn = mySymbol === "X" ? "O" : "X";
      const newMoveCount = (data.moveCount || 0) + 1;
      const win = checkWin(newBoard, index);

      const updateData = {
        board: newBoard,
        turn: newTurn,
        moveCount: newMoveCount
      };
      
      if (win && win.winner) {
        updateData.winner = win.winner;
        updateData.winningCells = win.winningCells || null;
        
        // Cập nhật thống kê
        updateStats(win.winner);
      }

      ref.update(updateData).catch(error => {
        console.error("Lỗi cập nhật:", error);
        alert("Lỗi khi đánh cờ! Vui lòng thử lại.");
      });
    }).catch(error => {
      console.error("Lỗi đọc dữ liệu:", error);
      alert("Lỗi kết nối! Vui lòng thử lại.");
    });
  }
  
  // ================= KIỂM TRA THẮNG (5 QUÂN LIÊN TIẾP) =================
  function checkWin(board, lastMoveIndex) {
    if (lastMoveIndex === undefined) {
      // Nếu không có lastMoveIndex, kiểm tra toàn bộ bàn cờ
      for (let i = 0; i < board.length; i++) {
        if (board[i]) {
          const result = checkWinFromPosition(board, i);
          if (result) return result;
        }
      }
      return null;
    }
    
    return checkWinFromPosition(board, lastMoveIndex);
  }
  
  function checkWinFromPosition(board, index) {
    const symbol = board[index];
    if (!symbol) return null;
    
    const row = Math.floor(index / BOARD_SIZE);
    const col = index % BOARD_SIZE;
    const directions = [
      [0, 1],   // Ngang
      [1, 0],   // Dọc
      [1, 1],   // Chéo xuống phải
      [1, -1]   // Chéo xuống trái
    ];
    
    for (let [dx, dy] of directions) {
      let count = 1;
      const winningCells = [index];
      
      // Đếm về phía trước
      for (let i = 1; i < 5; i++) {
        const newRow = row + dx * i;
        const newCol = col + dy * i;
        if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE) {
          const newIndex = newRow * BOARD_SIZE + newCol;
          if (board[newIndex] === symbol) {
            count++;
            winningCells.push(newIndex);
          } else {
            break;
          }
        } else {
          break;
        }
      }
      
      // Đếm về phía sau
      for (let i = 1; i < 5; i++) {
        const newRow = row - dx * i;
        const newCol = col - dy * i;
        if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE) {
          const newIndex = newRow * BOARD_SIZE + newCol;
          if (board[newIndex] === symbol) {
            count++;
            winningCells.push(newIndex);
          } else {
            break;
          }
        } else {
          break;
        }
      }
      
      if (count >= 5) {
        return {
          winner: symbol,
          winningCells: winningCells
        };
      }
    }
    
    return null;
  }
  
  // ================= CHƠI LẠI =================
  function resetGame() {
    if (!roomId) {
      alert("Bạn chưa vào phòng!");
      return;
    }
    
    const ref = db.ref("rooms/" + roomId);
    
    ref.once("value").then(snap => {
      const data = snap.val();
      if (!data) return;
      
      // Người thắng đi trước
      let firstTurn = "X"; // Mặc định
      if (data.winner) {
        // Người thắng ván trước đi trước
        firstTurn = data.winner;
      } else if (data.lastWinner) {
        // Nếu có lastWinner, người đó đi trước
        firstTurn = data.lastWinner;
      }
      
      const initialBoard = Array(BOARD_SIZE * BOARD_SIZE).fill("");
      gameStartTime = Date.now();
      moveCount = 0;
      
      ref.update({
        board: initialBoard,
        turn: firstTurn,
        winner: "",
        winningCells: null,
        gameStartTime: gameStartTime,
        moveCount: 0,
        lastWinner: data.winner || data.lastWinner || null
      }).then(() => {
        hideGameResult();
        const resetBtn = document.getElementById("resetBtn");
        if (resetBtn) resetBtn.style.display = "none";
        statusText.innerText = mySymbol === firstTurn
          ? "👉 Lượt của bạn (" + mySymbol + ")" 
          : "⏳ Đợi đối thủ...";
        updateMoveCount(0);
        updatePlayerInfo();
        updatePlayerStats();
      }).catch(error => {
        console.error("Lỗi reset game:", error);
        alert("Lỗi khi chơi lại! Vui lòng thử lại.");
      });
    }).catch(error => {
      console.error("Lỗi đọc dữ liệu:", error);
      alert("Lỗi khi chơi lại! Vui lòng thử lại.");
    });
  }
  
  // ================= HIỂN THỊ MÃ PHÒNG =================
  function showRoomCode(code) {
    const modal = document.getElementById("roomCodeModal");
    const codeText = document.getElementById("roomCodeText");
    if (modal && codeText) {
      codeText.textContent = code;
      modal.style.display = "flex";
    } else {
      alert("Mã phòng: " + code + "\n\nChia sẻ mã này cho người chơi 2!");
    }
  }
  
  function copyRoomCode() {
    const codeText = document.getElementById("roomCodeText");
    if (codeText) {
      navigator.clipboard.writeText(codeText.textContent).then(() => {
        const btn = document.getElementById("copyBtn");
        if (btn) {
          const originalText = btn.textContent;
          btn.textContent = "✓ Đã copy!";
          setTimeout(() => {
            btn.textContent = originalText;
          }, 2000);
        }
      });
    }
  }
  
  function closeRoomCodeModal() {
    const modal = document.getElementById("roomCodeModal");
    if (modal) {
      modal.style.display = "none";
    }
  }
  
  // ================= HIỂN THỊ KẾT QUẢ GAME =================
  function showGameResult(result, winData) {
    const modal = document.getElementById("gameResultModal");
    const resultText = document.getElementById("resultText");
    const resultIcon = document.getElementById("resultIcon");
    
    if (!modal) return;
    
    if (result === "win") {
      resultIcon.textContent = "🎉";
      resultText.textContent = "BẠN ĐÃ THẮNG!";
      modal.className = "modal game-result win";
    } else if (result === "lose") {
      resultIcon.textContent = "😢";
      resultText.textContent = "BẠN ĐÃ THUA!";
      modal.className = "modal game-result lose";
    } else {
      resultIcon.textContent = "🤝";
      resultText.textContent = "HÒA!";
      modal.className = "modal game-result draw";
    }
    
    modal.style.display = "flex";
    
    // Highlight các quân thắng
    if (winData && winData.winningCells && Array.isArray(winData.winningCells)) {
      setTimeout(() => {
        winData.winningCells.forEach(cellIndex => {
          const cell = boardDiv.querySelector(`[data-index="${cellIndex}"]`);
          if (cell) {
            cell.classList.add("winning-cell");
          }
        });
      }, 100);
    }
  }
  
  function hideGameResult() {
    const modal = document.getElementById("gameResultModal");
    if (modal) {
      modal.style.display = "none";
    }
    
    // Xóa highlight
    boardDiv.querySelectorAll(".winning-cell").forEach(cell => {
      cell.classList.remove("winning-cell");
    });
  }
  
  // ================= ĐẾM THỜI GIAN =================
  function updateTimer() {
    if (!timerDiv || !gameStartTime) return;
    
    const update = () => {
      if (!gameStartTime) return;
      const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      timerDiv.textContent = `⏱️ ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };
    
    update();
    if (!window.timerInterval) {
      window.timerInterval = setInterval(update, 1000);
    }
  }
  
  // ================= CẬP NHẬT SỐ NƯỚC ĐI =================
  function updateMoveCount(count) {
    if (moveCountDiv) {
      moveCountDiv.textContent = `📊 Nước đi: ${count}`;
    }
  }
  
  // ================= CẬP NHẬT THÔNG TIN NGƯỜI CHƠI =================
  function updatePlayerInfo() {
    if (!roomId) return;
    
    db.ref("rooms/" + roomId + "/players").once("value").then(snap => {
      const players = snap.val();
      if (!players) return;
      
      // Cập nhật tên và symbol
      if (players.player1) {
        const name = players.player1.name || "Người chơi 1";
        const symbol = players.player1.symbol || "X";
        const nameDiv = document.getElementById("player1Name");
        const symbolDiv = document.getElementById("player1Symbol");
        if (nameDiv) nameDiv.textContent = name;
        if (symbolDiv) symbolDiv.textContent = symbol;
        
        const card = document.getElementById("player1StatCard");
        if (card) {
          if (symbol === mySymbol) {
            card.classList.add("current-player");
          } else {
            card.classList.remove("current-player");
          }
        }
      }
      
      if (players.player2) {
        const name = players.player2.name || "Người chơi 2";
        const symbol = players.player2.symbol || "O";
        const nameDiv = document.getElementById("player2Name");
        const symbolDiv = document.getElementById("player2Symbol");
        if (nameDiv) nameDiv.textContent = name;
        if (symbolDiv) symbolDiv.textContent = symbol;
        
        const card = document.getElementById("player2StatCard");
        if (card) {
          if (symbol === mySymbol) {
            card.classList.add("current-player");
          } else {
            card.classList.remove("current-player");
          }
        }
      }
      
      updatePlayerStats();
    });
  }
  
  // ================= CẬP NHẬT THỐNG KÊ =================
  function updatePlayerStats() {
    if (!roomId) return;
    
    db.ref("rooms/" + roomId + "/stats").once("value").then(snap => {
      const stats = snap.val() || {};
      
      const player1Wins = stats.player1Wins || 0;
      const player1Losses = stats.player1Losses || 0;
      const player2Wins = stats.player2Wins || 0;
      const player2Losses = stats.player2Losses || 0;
      
      // Cập nhật player 1
      const p1WinsDiv = document.getElementById("player1Wins");
      const p1LossesDiv = document.getElementById("player1Losses");
      const p1RatioDiv = document.getElementById("player1Ratio");
      if (p1WinsDiv) p1WinsDiv.textContent = player1Wins;
      if (p1LossesDiv) p1LossesDiv.textContent = player1Losses;
      if (p1RatioDiv) {
        const total = player1Wins + player1Losses;
        const ratio = total > 0 ? Math.round((player1Wins / total) * 100) : 0;
        p1RatioDiv.textContent = ratio + "%";
      }
      
      // Cập nhật player 2
      const p2WinsDiv = document.getElementById("player2Wins");
      const p2LossesDiv = document.getElementById("player2Losses");
      const p2RatioDiv = document.getElementById("player2Ratio");
      if (p2WinsDiv) p2WinsDiv.textContent = player2Wins;
      if (p2LossesDiv) p2LossesDiv.textContent = player2Losses;
      if (p2RatioDiv) {
        const total = player2Wins + player2Losses;
        const ratio = total > 0 ? Math.round((player2Wins / total) * 100) : 0;
        p2RatioDiv.textContent = ratio + "%";
      }
      
      // Cập nhật indicator
      updateStatIndicators();
    });
  }
  
  function updateStats(winner) {
    if (!roomId || !winner) return;
    
    db.ref("rooms/" + roomId + "/stats").once("value").then(snap => {
      const stats = snap.val() || {};
      
      if (winner === "X") {
        stats.player1Wins = (stats.player1Wins || 0) + 1;
        stats.player2Losses = (stats.player2Losses || 0) + 1;
      } else if (winner === "O") {
        stats.player2Wins = (stats.player2Wins || 0) + 1;
        stats.player1Losses = (stats.player1Losses || 0) + 1;
      }
      
      db.ref("rooms/" + roomId + "/stats").set(stats).then(() => {
        updatePlayerStats();
      });
    });
  }
  
  function updateStatIndicators() {
    const p1Card = document.getElementById("player1StatCard");
    const p2Card = document.getElementById("player2StatCard");
    const p1Indicator = document.getElementById("player1Indicator");
    const p2Indicator = document.getElementById("player2Indicator");
    
    if (p1Card && p1Card.classList.contains("current-player")) {
      if (p1Indicator) p1Indicator.style.display = "block";
      if (p2Indicator) p2Indicator.style.display = "none";
    } else if (p2Card && p2Card.classList.contains("current-player")) {
      if (p2Indicator) p2Indicator.style.display = "block";
      if (p1Indicator) p1Indicator.style.display = "none";
    }
  }
  
  // ================= DANH SÁCH PHÒNG =================
  function showRoomList() {
    const modal = document.getElementById("roomListModal");
    if (modal) {
      modal.style.display = "flex";
      loadRoomList();
    }
  }
  
  function closeRoomListModal() {
    const modal = document.getElementById("roomListModal");
    if (modal) {
      modal.style.display = "none";
    }
  }
  
  function loadRoomList() {
    const roomListDiv = document.getElementById("roomList");
    if (!roomListDiv) return;
    
    roomListDiv.innerHTML = "<div class='loading'>Đang tải...</div>";
    
    db.ref("rooms").once("value").then(snap => {
      const rooms = snap.val();
      if (!rooms) {
        roomListDiv.innerHTML = "<div class='no-rooms'>Không có phòng nào</div>";
        return;
      }
      
      const roomArray = [];
      for (let id in rooms) {
        const room = rooms[id];
        if (room && room.createdAt) {
          const playerCount = room.players ? 
            (room.players.player1 && room.players.player1.joined ? 1 : 0) + 
            (room.players.player2 && room.players.player2.joined ? 1 : 0) : 0;
          
          if (playerCount < 2) {
            roomArray.push({
              id: id,
              createdAt: room.createdAt,
              playerCount: playerCount,
              player1Name: room.players?.player1?.name || "Người chơi 1",
              hasWinner: !!room.winner
            });
          }
        }
      }
      
      // Sắp xếp theo thời gian tạo (mới nhất trước)
      roomArray.sort((a, b) => b.createdAt - a.createdAt);
      
      if (roomArray.length === 0) {
        roomListDiv.innerHTML = "<div class='no-rooms'>Không có phòng nào</div>";
        return;
      }
      
      roomListDiv.innerHTML = roomArray.map(room => `
        <div class="room-item">
          <div class="room-info">
            <div class="room-id">Phòng: <strong>${room.id}</strong></div>
            <div class="room-details">
              <span>👤 ${room.playerCount}/2</span>
              <span>👤 ${room.player1Name}</span>
            </div>
          </div>
          <button onclick="joinRoom('${room.id}')" class="btn btn-small ${room.playerCount >= 2 ? 'btn-disabled' : ''}" ${room.playerCount >= 2 ? 'disabled' : ''}>
            ${room.playerCount >= 2 ? 'Đã đầy' : 'Vào phòng'}
          </button>
        </div>
      `).join("");
    }).catch(error => {
      console.error("Lỗi tải danh sách phòng:", error);
      roomListDiv.innerHTML = "<div class='error'>Lỗi tải danh sách phòng</div>";
    });
  }
  
  // ================= CHAT =================
  function sendChatMessage() {
    if (!roomId || !myPlayerName) {
      alert("Bạn chưa vào phòng!");
      return;
    }
    
    const chatInput = document.getElementById("chatInput");
    if (!chatInput || !chatInput.value.trim()) return;
    
    const message = chatInput.value.trim();
    const chatRef = db.ref("rooms/" + roomId + "/chat");
    
    chatRef.push({
      player: myPlayerName,
      message: message,
      timestamp: Date.now()
    }).then(() => {
      chatInput.value = "";
    }).catch(error => {
      console.error("Lỗi gửi tin nhắn:", error);
    });
  }
  
  function listenChat() {
    if (!roomId) return;
    
    const chatDiv = document.getElementById("chatMessages");
    if (!chatDiv) return;
    
    db.ref("rooms/" + roomId + "/chat").on("value", snap => {
      const messages = snap.val();
      if (!messages) {
        chatDiv.innerHTML = "";
        return;
      }
      
      const messageArray = [];
      for (let id in messages) {
        messageArray.push(messages[id]);
      }
      
      // Sắp xếp theo thời gian
      messageArray.sort((a, b) => a.timestamp - b.timestamp);
      
      chatDiv.innerHTML = messageArray.map(msg => {
        const isMe = msg.player === myPlayerName;
        const time = new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const isEmoji = msg.isEmoji || false;
        return `
          <div class="chat-message ${isMe ? 'my-message' : ''} ${isEmoji ? 'emoji-message' : ''}">
            <div class="chat-player">${msg.player}</div>
            <div class="chat-text ${isEmoji ? 'emoji-text' : ''}">${msg.message}</div>
            <div class="chat-time">${time}</div>
          </div>
        `;
      }).join("");
      
      // Scroll xuống cuối
      chatDiv.scrollTop = chatDiv.scrollHeight;
    });
  }
  
  // Enter để gửi chat
  document.addEventListener("DOMContentLoaded", () => {
    const chatInput = document.getElementById("chatInput");
    if (chatInput) {
      chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          sendChatMessage();
        }
      });
    }
    
    // Enter để vào phòng
    const roomInput = document.getElementById("roomInput");
    if (roomInput) {
      roomInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          joinRoom();
        }
      });
    }
  });
  
  // ================= HIỂN THỊ/ẨN CÁC PHẦN TỬ =================
  function showPlayersInfo() {
    const leftPanel = document.getElementById("leftPanel");
    if (leftPanel) {
      leftPanel.style.display = "block";
    }
  }
  
  function showChatSection() {
    const rightPanel = document.getElementById("rightPanel");
    if (rightPanel) {
      rightPanel.style.display = "block";
    }
  }
  
  function updatePlayerName() {
    const nameInput = document.getElementById("playerNameInput");
    if (nameInput && nameInput.value.trim()) {
      myPlayerName = nameInput.value.trim();
      localStorage.setItem("playerName", myPlayerName);
      alert("Đã lưu tên: " + myPlayerName);
      
      // Cập nhật tên trong phòng nếu đang trong phòng
      if (roomId) {
        const playerKey = mySymbol === "X" ? "player1" : "player2";
        db.ref("rooms/" + roomId + "/players/" + playerKey + "/name").set(myPlayerName);
      }
    } else {
      alert("Vui lòng nhập tên!");
    }
  }
  
  // Auto refresh danh sách phòng
  if (typeof window.roomListInterval === "undefined") {
    window.roomListInterval = setInterval(() => {
      const modal = document.getElementById("roomListModal");
      if (modal && modal.style.display === "flex") {
        loadRoomList();
      }
    }, 3000);
  }
  