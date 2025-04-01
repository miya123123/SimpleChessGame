/**
 * Piece movement and validation logic
 */
export class PieceMovement {
    /**
     * Check if a move is valid
     * @param {HTMLElement} selectedPiece - The selected piece element
     * @param {number} oldRow - The starting row
     * @param {number} oldCol - The starting column
     * @param {number} newRow - The target row
     * @param {number} newCol - The target column
     * @param {HTMLElement} board - The board element
     * @param {string} currentTurn - The current turn ('white' or 'black')
     * @param {Object} gameState - The game state object
     * @returns {boolean} Whether the move is valid
     */
    static isValidMove(selectedPiece, oldRow, oldCol, newRow, newCol, board, currentTurn, gameState) {
        const piece = selectedPiece.dataset.type;
        const pieceColor = piece[0];
        const pieceType = piece[1];

        // Check if it's the current player's piece
        const isCurrentPlayerPiece = (pieceColor === 'w' && currentTurn === 'white') ||
                                   (pieceColor === 'b' && currentTurn === 'black');
        if (!isCurrentPlayerPiece) {
            return false;
        }

        // Check if the target square has a friendly piece
        const targetSquare = board.children[newRow * 8 + newCol];
        const targetPiece = targetSquare.querySelector('.piece');
        if (targetPiece && targetPiece.dataset.type[0] === pieceColor) {
            return false;
        }

        // Check if there are obstacles in the path
        const hasObstacle = (startRow, startCol, endRow, endCol) => {
            const rowStep = startRow === endRow ? 0 : (endRow - startRow) / Math.abs(endRow - startRow);
            const colStep = startCol === endCol ? 0 : (endCol - startCol) / Math.abs(endCol - startCol);
            let currentRow = startRow + rowStep;
            let currentCol = startCol + colStep;

            while (currentRow !== endRow || currentCol !== endCol) {
                const square = board.children[currentRow * 8 + currentCol];
                if (square.querySelector('.piece')) {
                    return true;
                }
                currentRow += rowStep;
                currentCol += colStep;
            }
            return false;
        };

        // Implement piece-specific movement rules
        switch(pieceType) {
            case 'P': // Pawn
                if (pieceColor === 'w') {
                    // White pawn movement
                    const isInitialPosition = oldRow === 6;
                    const normalMove = oldRow - newRow === 1 && oldCol === newCol && !targetPiece;
                    const initialDoubleMove = isInitialPosition && oldRow - newRow === 2 && oldCol === newCol && !targetPiece && !hasObstacle(oldRow, oldCol, newRow, newCol);
                    const captureMove = oldRow - newRow === 1 && Math.abs(newCol - oldCol) === 1 && targetPiece;
                    
                    // En passant (white)
                    const enPassant = gameState.lastMovedPawn && 
                                    oldRow === 3 && 
                                    gameState.lastMovedPawn.row === 3 &&
                                    gameState.lastMovedPawn.color === 'b' &&
                                    Math.abs(newCol - oldCol) === 1 &&
                                    newCol === gameState.lastMovedPawn.col &&
                                    newRow === 2;
                    
                    return normalMove || initialDoubleMove || captureMove || enPassant;
                } else {
                    // Black pawn movement
                    const isInitialPosition = oldRow === 1;
                    const normalMove = newRow - oldRow === 1 && oldCol === newCol && !targetPiece;
                    const initialDoubleMove = isInitialPosition && newRow - oldRow === 2 && oldCol === newCol && !targetPiece && !hasObstacle(oldRow, oldCol, newRow, newCol);
                    const captureMove = newRow - oldRow === 1 && Math.abs(newCol - oldCol) === 1 && targetPiece;
                    
                    // En passant (black)
                    const enPassant = gameState.lastMovedPawn && 
                                    oldRow === 4 && 
                                    gameState.lastMovedPawn.row === 4 &&
                                    gameState.lastMovedPawn.color === 'w' &&
                                    Math.abs(newCol - oldCol) === 1 &&
                                    newCol === gameState.lastMovedPawn.col &&
                                    newRow === 5;
                    
                    return normalMove || initialDoubleMove || captureMove || enPassant;
                }
            case 'R': // Rook
                if (!(oldRow === newRow || oldCol === newCol)) return false;
                return !hasObstacle(oldRow, oldCol, newRow, newCol);
            case 'N': // Knight
                const dx = Math.abs(newCol - oldCol);
                const dy = Math.abs(newRow - oldRow);
                return (dx === 1 && dy === 2) || (dx === 2 && dy === 1);
            case 'B': // Bishop
                if (Math.abs(newRow - oldRow) !== Math.abs(newCol - oldCol)) return false;
                return !hasObstacle(oldRow, oldCol, newRow, newCol);
            case 'Q': // Queen
                if (!(oldRow === newRow || oldCol === newCol || Math.abs(newRow - oldRow) === Math.abs(newCol - oldCol))) return false;
                return !hasObstacle(oldRow, oldCol, newRow, newCol);
            case 'K': // King
                const rowDiff = Math.abs(newRow - oldRow);
                const colDiff = Math.abs(newCol - oldCol);
                
                // Normal 1-square movement
                if (rowDiff <= 1 && colDiff <= 1) {
                    return true;
                }
                
                // Castling
                if (rowDiff === 0 && colDiff === 2 && !PieceMovement.isKingInCheck(pieceColor, board)) {
                    const color = pieceColor === 'w' ? 'white' : 'black';
                    const baseRow = pieceColor === 'w' ? 7 : 0;
                    
                    // Check if the king has moved
                    if (gameState.hasKingMoved[color]) {
                        return false;
                    }
                    
                    // Kingside castling
                    if (newCol > oldCol && !gameState.hasRookMoved[color].kingside) {
                        return !hasObstacle(oldRow, oldCol, newRow, 7) &&
                               !PieceMovement.isSquareUnderAttack(baseRow, 5, pieceColor, board) &&
                               !PieceMovement.isSquareUnderAttack(baseRow, 6, pieceColor, board);
                    }
                    
                    // Queenside castling
                    if (newCol < oldCol && !gameState.hasRookMoved[color].queenside) {
                        return !hasObstacle(oldRow, oldCol, newRow, 0) &&
                               !PieceMovement.isSquareUnderAttack(baseRow, 3, pieceColor, board) &&
                               !PieceMovement.isSquareUnderAttack(baseRow, 2, pieceColor, board);
                    }
                }
                return false;
            default:
                return false;
        }
    }

    /**
     * Check if a square is under attack
     * @param {number} row - The row to check
     * @param {number} col - The column to check
     * @param {string} defendingColor - The color of the defending pieces ('w' or 'b')
     * @param {HTMLElement} board - The board element
     * @returns {boolean} Whether the square is under attack
     */
    static isSquareUnderAttack(row, col, defendingColor, board) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const square = board.children[r * 8 + c];
                const piece = square.querySelector('.piece');
                if (piece && piece.dataset.type[0] !== defendingColor) {
                    // Create a temporary piece for validation
                    const tempPiece = { dataset: { type: piece.dataset.type } };
                    
                    // Check if this piece can attack the target square
                    const canAttack = PieceMovement.isValidMove(
                        tempPiece, r, c, row, col, board, 
                        defendingColor === 'w' ? 'black' : 'white',
                        { lastMovedPawn: null, hasKingMoved: {}, hasRookMoved: {} }
                    );
                    
                    if (canAttack) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /**
     * Check if the king is in check
     * @param {string} kingColor - The color of the king ('w' or 'b')
     * @param {HTMLElement} board - The board element
     * @returns {boolean} Whether the king is in check
     */
    static isKingInCheck(kingColor, board) {
        // Find the king's position
        let kingRow, kingCol;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const square = board.children[r * 8 + c];
                const piece = square.querySelector('.piece');
                if (piece && piece.dataset.type === kingColor + 'K') {
                    kingRow = r;
                    kingCol = c;
                    break;
                }
            }
            if (kingRow !== undefined) break;
        }

        return PieceMovement.isSquareUnderAttack(kingRow, kingCol, kingColor, board);
    }

    /**
     * Check if a pawn can be promoted
     * @param {string} pieceType - The piece type (e.g., 'wP', 'bP')
     * @param {number} newRow - The target row
     * @returns {boolean} Whether the pawn can be promoted
     */
    static isPawnPromotion(pieceType, newRow) {
        const pieceColor = pieceType[0];
        return pieceType[1] === 'P' && 
               ((pieceColor === 'w' && newRow === 0) || 
                (pieceColor === 'b' && newRow === 7));
    }

    /**
     * Execute a move
     * @param {HTMLElement} selectedPiece - The selected piece element
     * @param {HTMLElement} targetSquare - The target square element
     * @param {HTMLElement} board - The board element
     * @param {Object} gameState - The game state object
     * @param {Function} updateTurn - Function to update the turn
     * @param {Function} showVictoryModal - Function to show the victory modal
     * @param {Function} showDrawModal - Function to show the draw modal
     * @param {Function} recordBoardState - Function to record the board state
     * @param {Function} isThreefoldRepetition - Function to check for threefold repetition
     * @param {Function} isStalemate - Function to check for stalemate
     * @param {Function} hasInsufficientMaterial - Function to check for insufficient material
     * @returns {void}
     */
    static executeMove(selectedPiece, targetSquare, board, gameState, updateTurn, showVictoryModal, showDrawModal, recordBoardState, isThreefoldRepetition, isStalemate, hasInsufficientMaterial) {
        const oldSquare = selectedPiece.parentElement;
        const oldRow = parseInt(oldSquare.dataset.row);
        const oldCol = parseInt(oldSquare.dataset.col);
        const newRow = parseInt(targetSquare.dataset.row);
        const newCol = parseInt(targetSquare.dataset.col);
        const piece = selectedPiece.dataset.type;

        // Update capture or pawn move count
        const targetPiece = targetSquare.querySelector('.piece');
        if (targetPiece || piece[1] === 'P') {
            gameState.captureOrPawnMoveCount = 0;
        } else {
            gameState.captureOrPawnMoveCount++;
        }

        // Check if a king is captured
        if (targetPiece && targetPiece.dataset.type[1] === 'K') {
            const winnerColor = piece[0] === 'w' ? '白' : '黒';
            showVictoryModal(winnerColor);
            gameState.gameActive = false;
        }

        // Track king or rook movement for castling
        if (piece[1] === 'K') {
            const color = piece[0] === 'w' ? 'white' : 'black';
            gameState.hasKingMoved[color] = true;

            // Execute castling if needed
            if (Math.abs(newCol - oldCol) === 2) {
                const isKingside = newCol > oldCol;
                const rookCol = isKingside ? 7 : 0;
                const newRookCol = isKingside ? 5 : 3;
                const rookSquare = board.children[oldRow * 8 + rookCol];
                const newRookSquare = board.children[oldRow * 8 + newRookCol];
                const rook = rookSquare.querySelector('.piece');
                if (rook) {
                    newRookSquare.innerHTML = '';
                    newRookSquare.appendChild(rook);
                }
            }
        } else if (piece[1] === 'R') {
            const color = piece[0] === 'w' ? 'white' : 'black';
            const side = oldCol === 0 ? 'queenside' : oldCol === 7 ? 'kingside' : null;
            if (side) {
                gameState.hasRookMoved[color][side] = true;
            }
        }

        // Handle en passant capture
        if (piece[1] === 'P' && Math.abs(oldCol - newCol) === 1 && !targetSquare.querySelector('.piece')) {
            const capturedRow = oldRow;
            const capturedSquare = board.children[capturedRow * 8 + newCol];
            if (capturedSquare.querySelector('.piece')) {
                capturedSquare.innerHTML = '';
            }
        }

        // Track pawn double move for en passant
        if (piece[1] === 'P' && Math.abs(oldRow - newRow) === 2) {
            gameState.lastMovedPawn = {
                row: newRow,
                col: newCol,
                color: piece[0]
            };
        } else {
            gameState.lastMovedPawn = null;
        }

        // Move the piece
        targetSquare.innerHTML = '';
        targetSquare.appendChild(selectedPiece);
        
        // Update turn
        updateTurn();
        
        // Increment move count
        gameState.moveCount++;
        
        // Record board state for threefold repetition detection
        recordBoardState();
        
        // Check for 50-move rule
        if (gameState.captureOrPawnMoveCount >= 50) {
            showDrawModal("50手ルール");
            gameState.gameActive = false;
            return;
        }
        
        // Check for threefold repetition
        if (isThreefoldRepetition()) {
            showDrawModal("同一局面3回出現");
            gameState.gameActive = false;
            return;
        }
        
        // Check for stalemate
        if (isStalemate()) {
            showDrawModal("ステイルメイト");
            gameState.gameActive = false;
            return;
        }
        
        // Check for insufficient material
        if (hasInsufficientMaterial()) {
            showDrawModal("不十分な駒");
            gameState.gameActive = false;
            return;
        }
    }
}
