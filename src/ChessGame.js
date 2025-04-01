import { getPieceSymbol } from './Utils.js';
import { BoardSetup } from './BoardSetup.js';
import { PieceMovement } from './PieceMovement.js';
import { Promotion } from './Promotion.js';
import { GameState } from './GameState.js';

/**
 * Main chess game class
 */
export class ChessGame {
    /**
     * Initialize a new chess game
     */
    constructor() {
        // DOM elements
        this.board = document.getElementById('board');
        this.turnDisplay = document.getElementById('turn-display');
        this.promotionModal = document.getElementById('promotion-modal');
        this.victoryModal = document.getElementById('victory-modal');
        this.drawOfferModal = document.getElementById('draw-offer-modal');
        this.drawModal = document.getElementById('draw-modal');
        
        // Game state
        this.currentTurn = 'white';
        this.selectedPiece = null;
        this.pendingPromotion = null;
        this.lastMovedPawn = null; // Last pawn that moved 2 squares
        this.drawOffered = false; // Whether a draw has been offered
        this.moveCount = 0; // Move counter
        this.moveHistory = []; // Board state history for threefold repetition detection
        this.captureOrPawnMoveCount = 0; // Counter for 50-move rule
        this.gameActive = true; // Whether the game is active
        
        // Castling state
        this.hasKingMoved = { white: false, black: false };
        this.hasRookMoved = {
            white: { kingside: false, queenside: false },
            black: { kingside: false, queenside: false }
        };
        
        // Initial board position
        this.initialPosition = [
            ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
            ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
            ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR']
        ];

        // Initialize the game
        this.initBoard();
        this.setupEventListeners();
    }

    /**
     * Initialize the chess board
     */
    initBoard() {
        BoardSetup.initBoard(this.board, this.initialPosition);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        BoardSetup.setupEventListeners(this);
    }

    /**
     * Setup promotion listeners
     */
    setupPromotionListeners() {
        Promotion.setupPromotionListeners(this.promotionModal, (selectedPiece) => {
            this.handlePromotionSelection(selectedPiece);
        });
    }

    /**
     * Move a piece to a target square
     * @param {HTMLElement} targetSquare - The target square element
     */
    movePiece(targetSquare) {
        const newRow = parseInt(targetSquare.dataset.row);
        const newCol = parseInt(targetSquare.dataset.col);
        const oldSquare = this.selectedPiece.parentElement;
        const oldRow = parseInt(oldSquare.dataset.row);
        const oldCol = parseInt(oldSquare.dataset.col);

        // Check if the move is valid
        if (this.isValidMove(oldRow, oldCol, newRow, newCol)) {
            // Check for pawn promotion
            if (PieceMovement.isPawnPromotion(this.selectedPiece.dataset.type, newRow)) {
                this.pendingPromotion = {
                    piece: this.selectedPiece,
                    targetSquare: targetSquare,
                    oldRow: oldRow,
                    oldCol: oldCol,
                    newRow: newRow,
                    newCol: newCol
                };
                this.showPromotionModal();
                return;
            }

            this.executeMove(targetSquare);
        }
    }

    /**
     * Check if a move is valid
     * @param {number} oldRow - The starting row
     * @param {number} oldCol - The starting column
     * @param {number} newRow - The target row
     * @param {number} newCol - The target column
     * @returns {boolean} Whether the move is valid
     */
    isValidMove(oldRow, oldCol, newRow, newCol) {
        // Create game state object for validation
        const gameState = {
            lastMovedPawn: this.lastMovedPawn,
            hasKingMoved: this.hasKingMoved,
            hasRookMoved: this.hasRookMoved
        };
        
        return PieceMovement.isValidMove(
            this.selectedPiece, oldRow, oldCol, newRow, newCol, 
            this.board, this.currentTurn, gameState
        );
    }

    /**
     * Execute a move
     * @param {HTMLElement} targetSquare - The target square element
     */
    executeMove(targetSquare) {
        // Create game state object for move execution
        const gameState = {
            lastMovedPawn: this.lastMovedPawn,
            hasKingMoved: this.hasKingMoved,
            hasRookMoved: this.hasRookMoved,
            captureOrPawnMoveCount: this.captureOrPawnMoveCount,
            moveCount: this.moveCount,
            gameActive: this.gameActive
        };
        
        // Execute the move
        PieceMovement.executeMove(
            this.selectedPiece, 
            targetSquare, 
            this.board, 
            gameState, 
            () => this.updateTurn(),
            (winnerColor) => this.showVictoryModal(winnerColor),
            (reason) => this.showDrawModal(reason),
            () => this.recordBoardState(),
            () => this.isThreefoldRepetition(),
            () => this.isStalemate(),
            () => this.hasInsufficientMaterial()
        );
        
        // Update game state from the returned object
        this.lastMovedPawn = gameState.lastMovedPawn;
        this.hasKingMoved = gameState.hasKingMoved;
        this.hasRookMoved = gameState.hasRookMoved;
        this.captureOrPawnMoveCount = gameState.captureOrPawnMoveCount;
        this.moveCount = gameState.moveCount;
        this.gameActive = gameState.gameActive;
    }

    /**
     * Update the current turn
     */
    updateTurn() {
        this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';
        this.turnDisplay.textContent = `${this.currentTurn === 'white' ? '白' : '黒'}のターン`;
    }

    /**
     * Show the promotion modal
     */
    showPromotionModal() {
        Promotion.showPromotionModal(this.promotionModal, this.currentTurn);
    }

    /**
     * Hide the promotion modal
     */
    hidePromotionModal() {
        Promotion.hidePromotionModal(this.promotionModal);
    }

    /**
     * Handle promotion selection
     * @param {string} pieceType - The selected piece type
     */
    handlePromotionSelection(pieceType) {
        if (!this.pendingPromotion) return;
        
        Promotion.handlePromotionSelection(
            pieceType, 
            this.pendingPromotion, 
            getPieceSymbol, 
            () => this.updateTurn(),
            this.promotionModal
        );
        
        // Reset promotion state
        this.pendingPromotion = null;
        this.selectedPiece = null;
    }

    /**
     * Show the victory modal
     * @param {string} winnerColor - The color of the winner ('白' or '黒')
     */
    showVictoryModal(winnerColor) {
        GameState.showVictoryModal(winnerColor, this.victoryModal);
    }

    /**
     * Hide the victory modal
     */
    hideVictoryModal() {
        GameState.hideVictoryModal(this.victoryModal);
    }
    
    /**
     * Offer a draw
     */
    offerDraw() {
        this.drawOffered = GameState.offerDraw(
            this.gameActive, 
            this.drawOffered, 
            this.currentTurn, 
            this.drawOfferModal
        );
    }
    
    /**
     * Accept a draw offer
     */
    acceptDraw() {
        this.gameActive = GameState.acceptDraw(
            this.drawOffered, 
            this.drawOfferModal, 
            this.drawModal
        );
        this.drawOffered = false;
    }
    
    /**
     * Decline a draw offer
     */
    declineDraw() {
        this.drawOffered = GameState.declineDraw(
            this.drawOffered, 
            this.drawOfferModal
        );
    }
    
    /**
     * Show the draw modal
     * @param {string} reason - The reason for the draw
     */
    showDrawModal(reason) {
        GameState.showDrawModal(reason, this.drawModal);
    }
    
    /**
     * Hide the draw modal
     */
    hideDrawModal() {
        GameState.hideDrawModal(this.drawModal);
    }
    
    /**
     * Record the current board state
     */
    recordBoardState() {
        GameState.recordBoardState(this.board, this.currentTurn, this.moveHistory);
    }
    
    /**
     * Check for threefold repetition
     * @returns {boolean} Whether threefold repetition has occurred
     */
    isThreefoldRepetition() {
        return GameState.isThreefoldRepetition(this.moveHistory);
    }
    
    /**
     * Check for stalemate
     * @returns {boolean} Whether stalemate has occurred
     */
    isStalemate() {
        return GameState.isStalemate(
            this.currentTurn, 
            this.board, 
            (kingColor, board) => PieceMovement.isKingInCheck(kingColor, board),
            (piece, oldRow, oldCol, newRow, newCol, board, currentTurn, gameState) => 
                PieceMovement.isValidMove(piece, oldRow, oldCol, newRow, newCol, board, currentTurn, gameState),
            {
                lastMovedPawn: this.lastMovedPawn,
                hasKingMoved: this.hasKingMoved,
                hasRookMoved: this.hasRookMoved
            }
        );
    }
    
    /**
     * Check for insufficient material
     * @returns {boolean} Whether there is insufficient material
     */
    hasInsufficientMaterial() {
        return GameState.hasInsufficientMaterial(this.board);
    }
    
    /**
     * Reset the game
     */
    resetGame() {
        this.currentTurn = 'white';
        this.turnDisplay.textContent = '白のターン';
        this.hasKingMoved = { white: false, black: false };
        this.hasRookMoved = {
            white: { kingside: false, queenside: false },
            black: { kingside: false, queenside: false }
        };
        this.drawOffered = false;
        this.moveCount = 0;
        this.moveHistory = [];
        this.captureOrPawnMoveCount = 0;
        this.gameActive = true;
        this.initBoard();
    }
}
