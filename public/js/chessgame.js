//const { render } = require("ejs");

const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;

const renderBoard = () => {
  const board = chess.board();
  boardElement.innerHTML = "";  // Clears the board before re-rendering

  board.forEach((row, rowindex) => {
    row.forEach((square, squareindex) => {
      const squareElement = document.createElement("div");
      squareElement.classList.add(
        "square",
        (rowindex + squareindex) % 2 === 0 ? "light" : "dark"
      );

      squareElement.dataset.row = rowindex;
      squareElement.dataset.col = squareindex;

      if (square) {
        const pieceElement = document.createElement("div");
        pieceElement.classList.add(
          "piece",
          square.color === "w" ? "white" : "black"
        );
        pieceElement.innerHTML = getPieceUnicode(square);  // Use Unicode for pieces
        pieceElement.draggable = playerRole === square.color;

        // Drag start and end listeners
        pieceElement.addEventListener("dragstart", (e) => {
          if (pieceElement.draggable) {
            draggedPiece = pieceElement;
            sourceSquare = { row: rowindex, col: squareindex };
            e.dataTransfer.setData("text/plain", "");
          }
        });

        pieceElement.addEventListener("dragend", (e) => {
          draggedPiece = null;
          sourceSquare = null;
        });

        squareElement.appendChild(pieceElement);
      }

      // Handle the drag over and drop events for moving pieces
      squareElement.addEventListener("dragover", function (e) {
        e.preventDefault();  // Allow the drop action
      });

      squareElement.addEventListener("drop", function (e) {
        e.preventDefault();
        if (draggedPiece) {
          const targetSquare = {
            row: parseInt(squareElement.dataset.row),
            col: parseInt(squareElement.dataset.col),
          };

          handleMove(sourceSquare, targetSquare);
        }
      });

      boardElement.appendChild(squareElement);
    });
  });

  // Flip the board if the player is black
  if (playerRole === 'b') {
    boardElement.classList.add("flipped");
  } else {
    boardElement.classList.remove("flipped");
  }
};

// Handle the move logic and emit the move
const handleMove = (source, target) => {
  const move = {
      from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`, // Convert source to algebraic notation
      to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,   // Convert target to algebraic notation
  };

  // Only apply promotion if a pawn is being moved to the last rank (8th for white, 1st for black)
  if ((source.row === 1 && chess.turn() === 'w') || (source.row === 6 && chess.turn() === 'b')) {
      move.promotion = 'q'; // Promote pawn to a Queen
  }

  socket.emit("move", move);
};


// Get the Unicode symbol for each chess piece
const getPieceUnicode = (piece) => {
  const unicodePieces = {
    p: '♟️', 
    r: '♜', 
    n: '♞', 
    b: '♝', 
    q: '♛', 
    k: '♚', 
    P: '♙', 
    R: '♖', 
    N: '♘', 
    B: '♗', 
    Q: '♕', 
    K: '♔',
  };
  return unicodePieces[piece.type] || "";
};

// Handle player roles and update the board
socket.on("playerRole", function (role) {
  playerRole = role;
  renderBoard();  // Re-render the board when player role is set
});

// Handle spectators
socket.on("spectatorRole", function () {
  playerRole = null;
  renderBoard();
});

// Update the board state based on the FEN received
socket.on("boardState", function (fen) {
  chess.load(fen);
  renderBoard();  // Re-render the board with the new state
});

// Listen for moves from other players and update the board
socket.on("move", function (move) {
  chess.move(move);
  renderBoard();  // Re-render the board after the move
});

// Initial board render
renderBoard();
