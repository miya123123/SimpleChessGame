/**
 * Pawn promotion handling
 */
export class Promotion {
    /**
     * Setup promotion listeners
     * @param {HTMLElement} promotionModal - The promotion modal element
     * @param {Function} handlePromotionSelection - Function to handle promotion selection
     * @returns {void}
     */
    static setupPromotionListeners(promotionModal, handlePromotionSelection) {
        const promotionPieces = document.querySelectorAll('.promotion-piece');
        
        // Remove all existing event listeners
        promotionPieces.forEach(piece => {
            const newPiece = piece.cloneNode(true);
            piece.parentNode.replaceChild(newPiece, piece);
        });
        
        // Set up new event listeners
        document.querySelectorAll('.promotion-piece').forEach(piece => {
            piece.addEventListener('click', (e) => {
                e.stopPropagation(); // Stop event propagation
                const selectedPiece = e.target.dataset.piece;
                if (selectedPiece) {
                    handlePromotionSelection(selectedPiece);
                }
            });
        });
    }

    /**
     * Show the promotion modal
     * @param {HTMLElement} promotionModal - The promotion modal element
     * @param {string} currentTurn - The current turn ('white' or 'black')
     * @returns {void}
     */
    static showPromotionModal(promotionModal, currentTurn) {
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

        // Set promotion piece color based on current player
        const pieceClass = currentTurn === 'white' ? 'white-piece-bg' : 'black-piece-bg';
        document.querySelectorAll('.promotion-piece').forEach(piece => {
            // Reset existing classes
            piece.classList.remove('white-piece-bg', 'black-piece-bg');
            // Add new class
            piece.classList.add(pieceClass);
            piece.style.cursor = 'pointer';
        });
        
        // Show modal
        promotionModal.style.display = 'block';
        promotionModal.style.zIndex = '1000';
        
        // Set overlay click event
        overlay.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    /**
     * Hide the promotion modal
     * @param {HTMLElement} promotionModal - The promotion modal element
     * @returns {void}
     */
    static hidePromotionModal(promotionModal) {
        promotionModal.style.display = 'none';
        // Remove overlay
        const overlay = document.querySelector('div[style*="rgba(0, 0, 0, 0.5)"]');
        if (overlay) {
            document.body.removeChild(overlay);
        }
    }

    /**
     * Handle promotion selection
     * @param {string} pieceType - The selected piece type
     * @param {Object} pendingPromotion - The pending promotion data
     * @param {Function} getPieceSymbol - Function to get piece symbol
     * @param {Function} updateTurn - Function to update the turn
     * @param {HTMLElement} promotionModal - The promotion modal element
     * @returns {void}
     */
    static handlePromotionSelection(pieceType, pendingPromotion, getPieceSymbol, updateTurn, promotionModal) {
        if (!pendingPromotion) return;

        const { piece, targetSquare } = pendingPromotion;
        const color = piece.dataset.type[0];
        
        // Remove existing piece at target square
        targetSquare.innerHTML = '';
        
        // Create new promoted piece
        const promotedPiece = document.createElement('div');
        promotedPiece.className = 'piece';
        promotedPiece.dataset.type = color + pieceType;
        promotedPiece.draggable = true;
        promotedPiece.textContent = getPieceSymbol(color + pieceType);
        promotedPiece.style.color = color === 'w' ? '#fff' : '#000';
        promotedPiece.style.fontSize = '40px';
        
        // Place new piece
        targetSquare.appendChild(promotedPiece);
        
        // Remove original piece
        if (piece.parentElement) {
            piece.parentElement.innerHTML = '';
        }
        
        // Update turn
        updateTurn();
        
        // Hide modal
        Promotion.hidePromotionModal(promotionModal);
    }
}
