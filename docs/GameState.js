/**
 * Game state management
 */
export class GameState {
    /**
     * Show the victory modal
     * @param {string} winnerColor - The color of the winner ('白' or '黒')
     * @param {HTMLElement} victoryModal - The victory modal element
     * @returns {void}
     */
    static showVictoryModal(winnerColor, victoryModal) {
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        overlay.style.zIndex = '999';
        document.body.appendChild(overlay);

        document.getElementById('victory-message').textContent = `${winnerColor}の勝利！`;
        victoryModal.style.display = 'block';
        victoryModal.style.zIndex = '1000';

        overlay.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    /**
     * Hide the victory modal
     * @param {HTMLElement} victoryModal - The victory modal element
     * @returns {void}
     */
    static hideVictoryModal(victoryModal) {
        victoryModal.style.display = 'none';
        const overlay = document.querySelector('div[style*="rgba(0, 0, 0, 0.5)"]');
        if (overlay) {
            document.body.removeChild(overlay);
        }
    }
    
    /**
     * Offer a draw
     * @param {boolean} gameActive - Whether the game is active
     * @param {boolean} drawOffered - Whether a draw has been offered
     * @param {string} currentTurn - The current turn ('white' or 'black')
     * @param {HTMLElement} drawOfferModal - The draw offer modal element
     * @returns {boolean} The updated drawOffered state
     */
    static offerDraw(gameActive, drawOffered, currentTurn, drawOfferModal) {
        if (!gameActive || drawOffered) return drawOffered;
        
        const offeringColor = currentTurn === 'white' ? '白' : '黒';
        document.getElementById('draw-offer-message').textContent = `${offeringColor}プレイヤーが引き分けを提案しています。`;
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        overlay.style.zIndex = '999';
        document.body.appendChild(overlay);
        
        drawOfferModal.style.display = 'block';
        drawOfferModal.style.zIndex = '1000';
        
        overlay.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        return true; // Update drawOffered state
    }
    
    /**
     * Accept a draw offer
     * @param {boolean} drawOffered - Whether a draw has been offered
     * @param {HTMLElement} drawOfferModal - The draw offer modal element
     * @param {HTMLElement} drawModal - The draw modal element
     * @returns {boolean} Whether the game is still active
     */
    static acceptDraw(drawOffered, drawOfferModal, drawModal) {
        if (!drawOffered) return true;
        
        GameState.hideDrawOfferModal(drawOfferModal);
        GameState.showDrawModal("合意による引き分け", drawModal);
        return false; // Game is no longer active
    }
    
    /**
     * Decline a draw offer
     * @param {boolean} drawOffered - Whether a draw has been offered
     * @param {HTMLElement} drawOfferModal - The draw offer modal element
     * @returns {boolean} The updated drawOffered state
     */
    static declineDraw(drawOffered, drawOfferModal) {
        if (!drawOffered) return drawOffered;
        
        GameState.hideDrawOfferModal(drawOfferModal);
        return false; // Update drawOffered state
    }
    
    /**
     * Hide the draw offer modal
     * @param {HTMLElement} drawOfferModal - The draw offer modal element
     * @returns {void}
     */
    static hideDrawOfferModal(drawOfferModal) {
        drawOfferModal.style.display = 'none';
        const overlay = document.querySelector('div[style*="rgba(0, 0, 0, 0.5)"]');
        if (overlay) {
            document.body.removeChild(overlay);
        }
    }
    
    /**
     * Show the draw modal
     * @param {string} reason - The reason for the draw
     * @param {HTMLElement} drawModal - The draw modal element
     * @returns {void}
     */
    static showDrawModal(reason, drawModal) {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        overlay.style.zIndex = '999';
        document.body.appendChild(overlay);
        
        document.getElementById('draw-message').textContent = `引き分けです（${reason}）`;
        drawModal.style.display = 'block';
        drawModal.style.zIndex = '1000';
        
        overlay.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    /**
     * Hide the draw modal
     * @param {HTMLElement} drawModal - The draw modal element
     * @returns {void}
     */
    static hideDrawModal(drawModal) {
        drawModal.style.display = 'none';
        const overlay = document.querySelector('div[style*="rgba(0, 0, 0, 0.5)"]');
        if (overlay) {
            document.body.removeChild(overlay);
        }
    }
    
    /**
     * Record the current board state
     * @param {HTMLElement} board - The board element
     * @param {string} currentTurn - The current turn ('white' or 'black')
     * @param {Array} moveHistory - The move history array
     * @returns {void}
     */
    static recordBoardState(board, currentTurn, moveHistory) {
        let boardState = '';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = board.children[row * 8 + col];
                const piece = square.querySelector('.piece');
                if (piece) {
                    boardState += piece.dataset.type;
                } else {
                    boardState += '--';
                }
            }
        }
        boardState += currentTurn; // Include turn in state
        moveHistory.push(boardState);
    }
    
    /**
     * Check for threefold repetition
     * @param {Array} moveHistory - The move history array
     * @returns {boolean} Whether threefold repetition has occurred
     */
    static isThreefoldRepetition(moveHistory) {
        if (moveHistory.length < 5) return false; // Need at least 5 moves
        
        const currentState = moveHistory[moveHistory.length - 1];
        let count = 0;
        
        for (const state of moveHistory) {
            if (state === currentState) {
                count++;
                if (count >= 3) return true;
            }
        }
        
        return false;
    }
    
    /**
     * Check for stalemate
     * @param {string} currentTurn - The current turn ('white' or 'black')
     * @param {HTMLElement} board - The board element
     * @param {Function} isKingInCheck - Function to check if king is in check
     * @param {Function} isValidMove - Function to check if a move is valid
     * @param {Object} gameState - The game state object
     * @returns {boolean} Whether stalemate has occurred
     */
    static isStalemate(currentTurn, board, isKingInCheck, isValidMove, gameState) {
        const currentColor = currentTurn === 'white' ? 'w' : 'b';
        
        // Check if king is in check
        if (isKingInCheck(currentColor, board)) {
            return false; // Not stalemate if in check
        }
        
        // Check if current player has any legal moves
        for (let startRow = 0; startRow < 8; startRow++) {
            for (let startCol = 0; startCol < 8; startCol++) {
                const startSquare = board.children[startRow * 8 + startCol];
                const piece = startSquare.querySelector('.piece');
                
                if (piece && piece.dataset.type[0] === currentColor) {
                    // Check if this piece can move anywhere
                    for (let endRow = 0; endRow < 8; endRow++) {
                        for (let endCol = 0; endCol < 8; endCol++) {
                            // Skip if start and end positions are the same
                            if (startRow === endRow && startCol === endCol) continue;
                            
                            // Create temporary piece for validation
                            const tempPiece = { dataset: { type: piece.dataset.type } };
                            
                            // Check if this piece can move to this square
                            const canMove = isValidMove(
                                tempPiece, startRow, startCol, endRow, endCol, 
                                board, currentTurn, gameState
                            );
                            
                            if (canMove) {
                                // Simulate the move to check if it would leave the king in check
                                const isLegalMove = GameState.simulateMove(
                                    startRow, startCol, endRow, endCol, 
                                    board, currentColor, isKingInCheck
                                );
                                
                                if (isLegalMove) {
                                    return false; // Not stalemate if legal move exists
                                }
                            }
                        }
                    }
                }
            }
        }
        
        return true; // Stalemate if no legal moves
    }
    
    /**
     * Simulate a move to check if it would leave the king in check
     * @param {number} startRow - The starting row
     * @param {number} startCol - The starting column
     * @param {number} endRow - The target row
     * @param {number} endCol - The target column
     * @param {HTMLElement} board - The board element
     * @param {string} kingColor - The color of the king ('w' or 'b')
     * @param {Function} isKingInCheck - Function to check if king is in check
     * @returns {boolean} Whether the move is legal (doesn't leave the king in check)
     */
    static simulateMove(startRow, startCol, endRow, endCol, board, kingColor, isKingInCheck) {
        // Get the start and end squares
        const startSquare = board.children[startRow * 8 + startCol];
        const endSquare = board.children[endRow * 8 + endCol];
        
        // Get the piece to move
        const piece = startSquare.querySelector('.piece');
        if (!piece) return false;
        
        // Save the current state
        const startSquareHTML = startSquare.innerHTML;
        const endSquareHTML = endSquare.innerHTML;
        
        // Make the move
        const pieceHTML = piece.outerHTML;
        startSquare.innerHTML = '';
        endSquare.innerHTML = pieceHTML;
        
        // Check if the king is in check after the move
        const isInCheck = isKingInCheck(kingColor, board);
        
        // Restore the original state
        startSquare.innerHTML = startSquareHTML;
        endSquare.innerHTML = endSquareHTML;
        
        // The move is legal if the king is not in check
        return !isInCheck;
    }
    
    /**
     * Check for insufficient material
     * @param {HTMLElement} board - The board element
     * @returns {boolean} Whether there is insufficient material
     */
    static hasInsufficientMaterial(board) {
        let whitePieces = [];
        let blackPieces = [];
        
        // Count pieces on the board
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = board.children[row * 8 + col];
                const piece = square.querySelector('.piece');
                if (piece) {
                    const pieceType = piece.dataset.type;
                    if (pieceType[0] === 'w') {
                        whitePieces.push(pieceType[1]);
                    } else {
                        blackPieces.push(pieceType[1]);
                    }
                }
            }
        }
        
        // King vs King
        if (whitePieces.length === 1 && blackPieces.length === 1) {
            return true;
        }
        
        // King vs King + Knight
        if ((whitePieces.length === 1 && blackPieces.length === 2 && blackPieces.includes('N')) ||
            (blackPieces.length === 1 && whitePieces.length === 2 && whitePieces.includes('N'))) {
            return true;
        }
        
        // King vs King + Bishop
        if ((whitePieces.length === 1 && blackPieces.length === 2 && blackPieces.includes('B')) ||
            (blackPieces.length === 1 && whitePieces.length === 2 && whitePieces.includes('B'))) {
            return true;
        }
        
        // King + Bishop vs King + Bishop (same color bishops)
        if (whitePieces.length === 2 && blackPieces.length === 2 && 
            whitePieces.includes('B') && blackPieces.includes('B')) {
            // Check bishop colors (simplified: check if they're on same colored squares)
            let whiteBishopSquare = null;
            let blackBishopSquare = null;
            
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const square = board.children[row * 8 + col];
                    const piece = square.querySelector('.piece');
                    if (piece) {
                        if (piece.dataset.type === 'wB') {
                            whiteBishopSquare = (row + col) % 2;
                        } else if (piece.dataset.type === 'bB') {
                            blackBishopSquare = (row + col) % 2;
                        }
                    }
                }
            }
            
            if (whiteBishopSquare === blackBishopSquare) {
                return true; // Same color bishops
            }
        }
        
        return false;
    }
}
