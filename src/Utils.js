/**
 * Utility functions for the chess game
 */

/**
 * Get the Unicode symbol for a chess piece
 * @param {string} piece - The piece code (e.g., 'wK', 'bP')
 * @returns {string} The Unicode symbol for the piece
 */
export function getPieceSymbol(piece) {
    const symbols = {
        'wR': '♖', 'wN': '♘', 'wB': '♗', 'wQ': '♕', 'wK': '♔', 'wP': '♙',
        'bR': '♜', 'bN': '♞', 'bB': '♝', 'bQ': '♛', 'bK': '♚', 'bP': '♟'
    };
    return symbols[piece];
}
