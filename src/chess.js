class ChessGame {
    constructor() {
        this.board = document.getElementById('board');
        this.turnDisplay = document.getElementById('turn-display');
        this.currentTurn = 'white';
        this.selectedPiece = null;
        this.promotionModal = document.getElementById('promotion-modal');
        this.victoryModal = document.getElementById('victory-modal');
        this.drawOfferModal = document.getElementById('draw-offer-modal');
        this.drawModal = document.getElementById('draw-modal');
        this.pendingPromotion = null;
        this.lastMovedPawn = null; // 最後に2マス移動したポーンの情報
        this.drawOffered = false; // 引き分けが提案されているかどうか
        this.moveCount = 0; // 手数のカウント
        this.moveHistory = []; // 盤面の履歴（スリーフォールド・レピティションの検出用）
        this.captureOrPawnMoveCount = 0; // 駒取りやポーン移動がない手数（50手ルール用）
        this.gameActive = true; // ゲームがアクティブかどうか
        // キャスリングのための状態管理
        this.hasKingMoved = { white: false, black: false };
        this.hasRookMoved = {
            white: { kingside: false, queenside: false },
            black: { kingside: false, queenside: false }
        };
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

        this.initBoard();
        this.setupEventListeners();
    }

    initBoard() {
        this.board.innerHTML = '';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'white' : 'black'}`;
                square.dataset.row = row;
                square.dataset.col = col;

                const piece = this.initialPosition[row][col];
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.className = 'piece';
                    pieceElement.dataset.type = piece;
                    pieceElement.draggable = true;
                    pieceElement.textContent = this.getPieceSymbol(piece);
                    pieceElement.style.color = piece[0] === 'w' ? '#fff' : '#000';
                    pieceElement.style.fontSize = '40px';
                    square.appendChild(pieceElement);
                }
                this.board.appendChild(square);
            }
        }
    }

    setupEventListeners() {
        document.getElementById('new-game').addEventListener('click', () => this.resetGame());
        document.getElementById('new-game-victory').addEventListener('click', () => {
            this.hideVictoryModal();
            this.resetGame();
        });
        document.getElementById('new-game-draw').addEventListener('click', () => {
            this.hideDrawModal();
            this.resetGame();
        });
        document.getElementById('offer-draw').addEventListener('click', () => this.offerDraw());
        document.getElementById('accept-draw').addEventListener('click', () => this.acceptDraw());
        document.getElementById('decline-draw').addEventListener('click', () => this.declineDraw());
        // プロモーション選択のイベントリスナーを設定
        this.setupPromotionListeners();

        // クリックでの移動を追加
        this.board.addEventListener('click', (e) => {
            const square = e.target.closest('.square');
            if (!square) return;

            if (this.selectedPiece) {
                // 移動先が選択された場合
                this.movePiece(square);
                this.selectedPiece.classList.remove('selected');
                this.selectedPiece = null;
            } else if (e.target.classList.contains('piece')) {
                // 新しい駒を選択
                this.selectedPiece = e.target;
                this.selectedPiece.classList.add('selected');
            }
        });

        this.board.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('piece')) {
                this.selectedPiece = e.target;
                e.target.classList.add('dragging');
            }
        });

        this.board.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        this.board.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetSquare = e.target.closest('.square');
            if (targetSquare && this.selectedPiece) {
                this.movePiece(targetSquare);
            }
        });

        this.board.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('piece')) {
                e.target.classList.remove('dragging');
                this.selectedPiece = null;
            }
        });
    }

    movePiece(targetSquare) {
        const newRow = parseInt(targetSquare.dataset.row);
        const newCol = parseInt(targetSquare.dataset.col);
        const oldSquare = this.selectedPiece.parentElement;
        const oldRow = parseInt(oldSquare.dataset.row);
        const oldCol = parseInt(oldSquare.dataset.col);

        if (this.isValidMove(oldRow, oldCol, newRow, newCol)) {
            // ポーンのプロモーションをチェック
            if (this.isPawnPromotion(this.selectedPiece.dataset.type, newRow)) {
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

    isPawnPromotion(pieceType, newRow) {
        const pieceColor = pieceType[0];
        return pieceType[1] === 'P' && 
               ((pieceColor === 'w' && newRow === 0) || 
                (pieceColor === 'b' && newRow === 7));
    }

    setupPromotionListeners() {
        const promotionPieces = document.querySelectorAll('.promotion-piece');
        
        // すべてのイベントリスナーを一度削除
        promotionPieces.forEach(piece => {
            const newPiece = piece.cloneNode(true);
            piece.parentNode.replaceChild(newPiece, piece);
        });
        
        // 新しいイベントリスナーを設定
        document.querySelectorAll('.promotion-piece').forEach(piece => {
            piece.addEventListener('click', (e) => {
                e.stopPropagation(); // イベントの伝播を停止
                if (this.pendingPromotion) {
                    const selectedPiece = e.target.dataset.piece;
                    if (selectedPiece) {
                        this.handlePromotionSelection(selectedPiece);
                    }
                }
            });
        });
    }

    showPromotionModal() {
        // オーバーレイを作成
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        overlay.style.zIndex = '999';
        document.body.appendChild(overlay);

        // プロモーション駒の色を現在のプレイヤーに合わせて設定
        const pieceClass = this.currentTurn === 'white' ? 'white-piece-bg' : 'black-piece-bg';
        document.querySelectorAll('.promotion-piece').forEach(piece => {
            // 既存のクラスをリセット
            piece.classList.remove('white-piece-bg', 'black-piece-bg');
            // 新しいクラスを追加
            piece.classList.add(pieceClass);
            piece.style.cursor = 'pointer';
        });
        
        // モーダルを表示
        this.promotionModal.style.display = 'block';
        this.promotionModal.style.zIndex = '1000';
        
        // イベントリスナーを再設定
        this.setupPromotionListeners();

        // オーバーレイのクリックイベントを設定
        overlay.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    hidePromotionModal() {
        this.promotionModal.style.display = 'none';
        // オーバーレイを削除
        const overlay = document.querySelector('div[style*="rgba(0, 0, 0, 0.5)"]');
        if (overlay) {
            document.body.removeChild(overlay);
        }
    }

    handlePromotionSelection(pieceType) {
        if (!this.pendingPromotion) return;

        const { piece, targetSquare, newRow, newCol } = this.pendingPromotion;
        const color = piece.dataset.type[0];
        
        // 移動先の駒を削除（存在する場合）
        targetSquare.innerHTML = '';
        
        // 新しい駒を作成
        const promotedPiece = document.createElement('div');
        promotedPiece.className = 'piece';
        promotedPiece.dataset.type = color + pieceType;
        promotedPiece.draggable = true;
        promotedPiece.textContent = this.getPieceSymbol(color + pieceType);
        promotedPiece.style.color = color === 'w' ? '#fff' : '#000';
        promotedPiece.style.fontSize = '40px';
        
        // 新しい駒を配置
        targetSquare.appendChild(promotedPiece);
        
        // 元の駒の親要素から削除
        if (piece.parentElement) {
            piece.parentElement.innerHTML = '';
        }
        
        // ターンを切り替え
        this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';
        this.turnDisplay.textContent = `${this.currentTurn === 'white' ? '白' : '黒'}のターン`;
        
        // プロモーションの状態をリセット
        this.hidePromotionModal();
        this.pendingPromotion = null;
        this.selectedPiece = null;
    }

    executeMove(targetSquare) {
        const oldSquare = this.selectedPiece.parentElement;
        const oldRow = parseInt(oldSquare.dataset.row);
        const oldCol = parseInt(oldSquare.dataset.col);
        const newRow = parseInt(targetSquare.dataset.row);
        const newCol = parseInt(targetSquare.dataset.col);
        const piece = this.selectedPiece.dataset.type;

        // 駒取りやポーン移動のカウントを更新
        const targetPiece = targetSquare.querySelector('.piece');
        if (targetPiece || piece[1] === 'P') {
            this.captureOrPawnMoveCount = 0;
        } else {
            this.captureOrPawnMoveCount++;
        }

        // キングを取る場合の判定
        if (targetPiece && targetPiece.dataset.type[1] === 'K') {
            const winnerColor = piece[0] === 'w' ? '白' : '黒';
            this.showVictoryModal(winnerColor);
            this.gameActive = false;
        }

        // キングまたはルークの移動を記録
        if (piece[1] === 'K') {
            const color = piece[0] === 'w' ? 'white' : 'black';
            this.hasKingMoved[color] = true;

            // キャスリングの実行
            if (Math.abs(newCol - oldCol) === 2) {
                const isKingside = newCol > oldCol;
                const rookCol = isKingside ? 7 : 0;
                const newRookCol = isKingside ? 5 : 3;
                const rookSquare = this.board.children[oldRow * 8 + rookCol];
                const newRookSquare = this.board.children[oldRow * 8 + newRookCol];
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
                this.hasRookMoved[color][side] = true;
            }
        }

        // アンパッサンの処理
        if (piece[1] === 'P' && Math.abs(oldCol - newCol) === 1 && !targetSquare.querySelector('.piece')) {
            const capturedRow = oldRow;
            const capturedSquare = this.board.children[capturedRow * 8 + newCol];
            if (capturedSquare.querySelector('.piece')) {
                capturedSquare.innerHTML = '';
            }
        }

        // ポーンの2マス移動を記録
        if (piece[1] === 'P' && Math.abs(oldRow - newRow) === 2) {
            this.lastMovedPawn = {
                row: newRow,
                col: newCol,
                color: piece[0]
            };
        } else {
            this.lastMovedPawn = null;
        }

        targetSquare.innerHTML = '';
        targetSquare.appendChild(this.selectedPiece);
        this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';
        this.turnDisplay.textContent = `${this.currentTurn === 'white' ? '白' : '黒'}のターン`;
        
        // 手数を増やす
        this.moveCount++;
        
        // 盤面の状態を記録（スリーフォールド・レピティションの検出用）
        this.recordBoardState();
        
        // 50手ルールの確認
        if (this.captureOrPawnMoveCount >= 50) {
            this.showDrawModal("50手ルール");
            this.gameActive = false;
            return;
        }
        
        // スリーフォールド・レピティションの確認
        if (this.isThreefoldRepetition()) {
            this.showDrawModal("同一局面3回出現");
            this.gameActive = false;
            return;
        }
        
        // ステイルメイトの確認
        if (this.isStalemate()) {
            this.showDrawModal("ステイルメイト");
            this.gameActive = false;
            return;
        }
        
        // 不十分な駒の確認
        if (this.hasInsufficientMaterial()) {
            this.showDrawModal("不十分な駒");
            this.gameActive = false;
            return;
        }
    }

    getPieceSymbol(piece) {
        const symbols = {
            'wR': '♖', 'wN': '♘', 'wB': '♗', 'wQ': '♕', 'wK': '♔', 'wP': '♙',
            'bR': '♜', 'bN': '♞', 'bB': '♝', 'bQ': '♛', 'bK': '♚', 'bP': '♟'
        };
        return symbols[piece];
    }

    isValidMove(oldRow, oldCol, newRow, newCol) {
        const piece = this.selectedPiece.dataset.type;
        const pieceColor = piece[0];
        const pieceType = piece[1];

        // 現在のターンと駒の色が一致するかチェック
        const isCurrentPlayerPiece = (pieceColor === 'w' && this.currentTurn === 'white') ||
                                   (pieceColor === 'b' && this.currentTurn === 'black');
        if (!isCurrentPlayerPiece) {
            return false;
        }

        // 移動先に味方の駒があるかチェック
        const targetSquare = this.board.children[newRow * 8 + newCol];
        const targetPiece = targetSquare.querySelector('.piece');
        if (targetPiece && targetPiece.dataset.type[0] === pieceColor) {
            return false;
        }

        // 駒の移動パスに他の駒がないかチェック
        const hasObstacle = (startRow, startCol, endRow, endCol) => {
            const rowStep = startRow === endRow ? 0 : (endRow - startRow) / Math.abs(endRow - startRow);
            const colStep = startCol === endCol ? 0 : (endCol - startCol) / Math.abs(endCol - startCol);
            let currentRow = startRow + rowStep;
            let currentCol = startCol + colStep;

            while (currentRow !== endRow || currentCol !== endCol) {
                const square = this.board.children[currentRow * 8 + currentCol];
                if (square.querySelector('.piece')) {
                    return true;
                }
                currentRow += rowStep;
                currentCol += colStep;
            }
            return false;
        };

        // 基本的な駒の動きを実装
        switch(pieceType) {
            case 'P': // ポーン
                if (pieceColor === 'w') {
                    // 白ポーンの移動
                    const isInitialPosition = oldRow === 6;
                    const normalMove = oldRow - newRow === 1 && oldCol === newCol && !targetPiece;
                    const initialDoubleMove = isInitialPosition && oldRow - newRow === 2 && oldCol === newCol && !targetPiece && !hasObstacle(oldRow, oldCol, newRow, newCol);
                    const captureMove = oldRow - newRow === 1 && Math.abs(newCol - oldCol) === 1 && targetPiece;
                    
                    // アンパッサンの判定（白）
                    const enPassant = this.lastMovedPawn && 
                                    oldRow === 3 && 
                                    this.lastMovedPawn.row === 3 &&
                                    this.lastMovedPawn.color === 'b' &&
                                    Math.abs(newCol - oldCol) === 1 &&
                                    newCol === this.lastMovedPawn.col &&
                                    newRow === 2;
                    
                    return normalMove || initialDoubleMove || captureMove || enPassant;
                } else {
                    // 黒ポーンの移動
                    const isInitialPosition = oldRow === 1;
                    const normalMove = newRow - oldRow === 1 && oldCol === newCol && !targetPiece;
                    const initialDoubleMove = isInitialPosition && newRow - oldRow === 2 && oldCol === newCol && !targetPiece && !hasObstacle(oldRow, oldCol, newRow, newCol);
                    const captureMove = newRow - oldRow === 1 && Math.abs(newCol - oldCol) === 1 && targetPiece;
                    
                    // アンパッサンの判定（黒）
                    const enPassant = this.lastMovedPawn && 
                                    oldRow === 4 && 
                                    this.lastMovedPawn.row === 4 &&
                                    this.lastMovedPawn.color === 'w' &&
                                    Math.abs(newCol - oldCol) === 1 &&
                                    newCol === this.lastMovedPawn.col &&
                                    newRow === 5;
                    
                    return normalMove || initialDoubleMove || captureMove || enPassant;
                }
            case 'R': // ルーク
                if (!(oldRow === newRow || oldCol === newCol)) return false;
                return !hasObstacle(oldRow, oldCol, newRow, newCol);
            case 'N': // ナイト
                const dx = Math.abs(newCol - oldCol);
                const dy = Math.abs(newRow - oldRow);
                return (dx === 1 && dy === 2) || (dx === 2 && dy === 1);
            case 'B': // ビショップ
                if (Math.abs(newRow - oldRow) !== Math.abs(newCol - oldCol)) return false;
                return !hasObstacle(oldRow, oldCol, newRow, newCol);
            case 'Q': // クイーン
                if (!(oldRow === newRow || oldCol === newCol || Math.abs(newRow - oldRow) === Math.abs(newCol - oldCol))) return false;
                return !hasObstacle(oldRow, oldCol, newRow, newCol);
            case 'K': // キング
                const rowDiff = Math.abs(newRow - oldRow);
                const colDiff = Math.abs(newCol - oldCol);
                
                // 通常の1マス移動
                if (rowDiff <= 1 && colDiff <= 1) {
                    return true;
                }
                
                // キャスリングの判定
                if (rowDiff === 0 && colDiff === 2 && !this.isKingInCheck(pieceColor)) {
                    const color = pieceColor === 'w' ? 'white' : 'black';
                    const baseRow = pieceColor === 'w' ? 7 : 0;
                    
                    // キングが移動していないことを確認
                    if (this.hasKingMoved[color]) {
                        return false;
                    }
                    
                    // キングサイドキャスリング
                    if (newCol > oldCol && !this.hasRookMoved[color].kingside) {
                        return !hasObstacle(oldRow, oldCol, newRow, 7) &&
                               !this.isSquareUnderAttack(baseRow, 5, pieceColor) &&
                               !this.isSquareUnderAttack(baseRow, 6, pieceColor);
                    }
                    
                    // クイーンサイドキャスリング
                    if (newCol < oldCol && !this.hasRookMoved[color].queenside) {
                        return !hasObstacle(oldRow, oldCol, newRow, 0) &&
                               !this.isSquareUnderAttack(baseRow, 3, pieceColor) &&
                               !this.isSquareUnderAttack(baseRow, 2, pieceColor);
                    }
                }
                return false;
            default:
                return false;
        }
    }

    isSquareUnderAttack(row, col, defendingColor) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const square = this.board.children[r * 8 + c];
                const piece = square.querySelector('.piece');
                if (piece && piece.dataset.type[0] !== defendingColor) {
                    // 一時的に選択された駒を保存
                    const tempSelected = this.selectedPiece;
                    this.selectedPiece = piece;
                    
                    // その駒がターゲットのマスに移動できるかチェック
                    const canAttack = this.isValidMove(r, c, row, col);
                    
                    // 選択された駒を元に戻す
                    this.selectedPiece = tempSelected;
                    
                    if (canAttack) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    isKingInCheck(kingColor) {
        // キングの位置を探す
        let kingRow, kingCol;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const square = this.board.children[r * 8 + c];
                const piece = square.querySelector('.piece');
                if (piece && piece.dataset.type === kingColor + 'K') {
                    kingRow = r;
                    kingCol = c;
                    break;
                }
            }
            if (kingRow !== undefined) break;
        }

        return this.isSquareUnderAttack(kingRow, kingCol, kingColor);
    }

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

    showVictoryModal(winnerColor) {
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
        this.victoryModal.style.display = 'block';
        this.victoryModal.style.zIndex = '1000';

        overlay.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    hideVictoryModal() {
        this.victoryModal.style.display = 'none';
        const overlay = document.querySelector('div[style*="rgba(0, 0, 0, 0.5)"]');
        if (overlay) {
            document.body.removeChild(overlay);
        }
    }
    
    // 引き分け関連のメソッド
    offerDraw() {
        if (!this.gameActive || this.drawOffered) return;
        
        this.drawOffered = true;
        const offeringColor = this.currentTurn === 'white' ? '白' : '黒';
        document.getElementById('draw-offer-message').textContent = `${offeringColor}プレイヤーが引き分けを提案しています。`;
        
        // オーバーレイを作成
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        overlay.style.zIndex = '999';
        document.body.appendChild(overlay);
        
        this.drawOfferModal.style.display = 'block';
        this.drawOfferModal.style.zIndex = '1000';
        
        overlay.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    acceptDraw() {
        if (!this.drawOffered) return;
        
        this.hideDrawOfferModal();
        this.showDrawModal("合意による引き分け");
        this.gameActive = false;
    }
    
    declineDraw() {
        if (!this.drawOffered) return;
        
        this.drawOffered = false;
        this.hideDrawOfferModal();
    }
    
    hideDrawOfferModal() {
        this.drawOfferModal.style.display = 'none';
        const overlay = document.querySelector('div[style*="rgba(0, 0, 0, 0.5)"]');
        if (overlay) {
            document.body.removeChild(overlay);
        }
    }
    
    showDrawModal(reason) {
        // オーバーレイを作成
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
        this.drawModal.style.display = 'block';
        this.drawModal.style.zIndex = '1000';
        
        overlay.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    hideDrawModal() {
        this.drawModal.style.display = 'none';
        const overlay = document.querySelector('div[style*="rgba(0, 0, 0, 0.5)"]');
        if (overlay) {
            document.body.removeChild(overlay);
        }
    }
    
    // 盤面の状態を記録
    recordBoardState() {
        let boardState = '';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = this.board.children[row * 8 + col];
                const piece = square.querySelector('.piece');
                if (piece) {
                    boardState += piece.dataset.type;
                } else {
                    boardState += '--';
                }
            }
        }
        boardState += this.currentTurn; // ターンも状態に含める
        this.moveHistory.push(boardState);
    }
    
    // スリーフォールド・レピティションの検出
    isThreefoldRepetition() {
        if (this.moveHistory.length < 5) return false; // 最低でも5手以上必要
        
        const currentState = this.moveHistory[this.moveHistory.length - 1];
        let count = 0;
        
        for (const state of this.moveHistory) {
            if (state === currentState) {
                count++;
                if (count >= 3) return true;
            }
        }
        
        return false;
    }
    
    // ステイルメイトの検出
    isStalemate() {
        const currentColor = this.currentTurn === 'white' ? 'w' : 'b';
        
        // キングがチェックされているかどうか
        if (this.isKingInCheck(currentColor)) {
            return false; // チェックされていればステイルメイトではない
        }
        
        // 現在のプレイヤーが合法的な手を持っているかチェック
        for (let startRow = 0; startRow < 8; startRow++) {
            for (let startCol = 0; startCol < 8; startCol++) {
                const startSquare = this.board.children[startRow * 8 + startCol];
                const piece = startSquare.querySelector('.piece');
                
                if (piece && piece.dataset.type[0] === currentColor) {
                    // この駒が動ける場所があるかチェック
                    for (let endRow = 0; endRow < 8; endRow++) {
                        for (let endCol = 0; endCol < 8; endCol++) {
                            // 一時的に選択された駒を保存
                            const tempSelected = this.selectedPiece;
                            this.selectedPiece = piece;
                            
                            // この駒がこのマスに移動できるかチェック
                            const canMove = this.isValidMove(startRow, startCol, endRow, endCol);
                            
                            // 選択された駒を元に戻す
                            this.selectedPiece = tempSelected;
                            
                            if (canMove) {
                                return false; // 合法的な手があればステイルメイトではない
                            }
                        }
                    }
                }
            }
        }
        
        return true; // 合法的な手がなければステイルメイト
    }
    
    // 不十分な駒の検出
    hasInsufficientMaterial() {
        let whitePieces = [];
        let blackPieces = [];
        
        // 盤上の駒を集計
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = this.board.children[row * 8 + col];
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
        
        // キング対キング
        if (whitePieces.length === 1 && blackPieces.length === 1) {
            return true;
        }
        
        // キング対キング+ナイト
        if ((whitePieces.length === 1 && blackPieces.length === 2 && blackPieces.includes('N')) ||
            (blackPieces.length === 1 && whitePieces.length === 2 && whitePieces.includes('N'))) {
            return true;
        }
        
        // キング対キング+ビショップ
        if ((whitePieces.length === 1 && blackPieces.length === 2 && blackPieces.includes('B')) ||
            (blackPieces.length === 1 && whitePieces.length === 2 && whitePieces.includes('B'))) {
            return true;
        }
        
        // キング+ビショップ対キング+ビショップ（同色のビショップ）
        if (whitePieces.length === 2 && blackPieces.length === 2 && 
            whitePieces.includes('B') && blackPieces.includes('B')) {
            // ビショップの色をチェック（簡易版：同色のマスにあるかどうか）
            let whiteBishopSquare = null;
            let blackBishopSquare = null;
            
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const square = this.board.children[row * 8 + col];
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
                return true; // 同色のビショップ
            }
        }
        
        return false;
    }
}

// ゲーム開始
new ChessGame();
