import { getPieceSymbol } from './Utils.js';

/**
 * Board setup and initialization functions
 */
export class BoardSetup {
    /**
     * Initialize the chess board
     * @param {HTMLElement} board - The board element
     * @param {Array} initialPosition - The initial position of pieces
     * @param {string} currentTurn - The current turn ('white' or 'black')
     * @returns {void}
     */
    static initBoard(board, initialPosition) {
        board.innerHTML = '';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'white' : 'black'}`;
                square.dataset.row = row;
                square.dataset.col = col;

                const piece = initialPosition[row][col];
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.className = 'piece';
                    pieceElement.dataset.type = piece;
                    pieceElement.draggable = true;
                    pieceElement.textContent = getPieceSymbol(piece);
                    pieceElement.style.color = piece[0] === 'w' ? '#fff' : '#000';
                    pieceElement.style.fontSize = '40px';
                    square.appendChild(pieceElement);
                }
                board.appendChild(square);
            }
        }
    }

    /**
     * Setup event listeners for the chess game
     * @param {ChessGame} game - The chess game instance
     * @returns {void}
     */
    static setupEventListeners(game) {
        document.getElementById('new-game').addEventListener('click', () => game.resetGame());
        document.getElementById('new-game-victory').addEventListener('click', () => {
            game.hideVictoryModal();
            game.resetGame();
        });
        document.getElementById('new-game-draw').addEventListener('click', () => {
            game.hideDrawModal();
            game.resetGame();
        });
        document.getElementById('offer-draw').addEventListener('click', () => game.offerDraw());
        document.getElementById('accept-draw').addEventListener('click', () => game.acceptDraw());
        document.getElementById('decline-draw').addEventListener('click', () => game.declineDraw());
        
        // Setup promotion listeners
        game.setupPromotionListeners();

        // Click-based movement
        game.board.addEventListener('click', (e) => {
            const square = e.target.closest('.square');
            if (!square) return;

            if (game.selectedPiece) {
                // Move to the selected square
                game.movePiece(square);
                game.selectedPiece.classList.remove('selected');
                game.selectedPiece = null;
            } else if (e.target.classList.contains('piece')) {
                // Select a new piece
                game.selectedPiece = e.target;
                game.selectedPiece.classList.add('selected');
            }
        });

        // Drag-and-drop movement
        game.board.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('piece')) {
                game.selectedPiece = e.target;
                e.target.classList.add('dragging');
            }
        });

        game.board.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        game.board.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetSquare = e.target.closest('.square');
            if (targetSquare && game.selectedPiece) {
                game.movePiece(targetSquare);
            }
        });

        game.board.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('piece')) {
                e.target.classList.remove('dragging');
                game.selectedPiece = null;
            }
        });
    }
}
