document.addEventListener('DOMContentLoaded', () => {
    const sessionId = sessionStorage.getItem('sessionId');
    const expires = new Date(sessionStorage.getItem('sessionExpires'));
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    
    if (!sessionId || !isLoggedIn || expires < new Date()) {
        window.location.href = '/login.html';
    }
});

class Condition {
    constructor(description, allowMultiple = false, maxInstances = 1) {
        this.description = description;
        this.status = undefined;
        this.allowMultiple = allowMultiple;
        this.maxInstances = maxInstances;
        this.available = maxInstances;
    }
}

class Board {
    constructor() {
        this.grid = Array(5).fill(null).map(() => Array(5).fill(null));        
        const centerCondition = new Condition("Free Space");
        centerCondition.status = true;
        this.grid[2][2] = centerCondition;
        this.isVerified = false;
    }


    placeCondition(condition, row, col) {
        if (row < 0 || row >= 5 || col < 0 || col >= 5) {
            throw new Error("Invalid position");
        }

        if (this.grid[row][col] !== null) {
            throw new Error("Position already occupied");
        }

        if (!condition.allowMultiple && condition.available <= 0) {
            throw new Error("Condition cannot be used multiple times");
        }
        if (condition.allowMultiple && condition.available <= 0) {
            throw new Error(`Cannot use condition more than ${condition.maxInstances} times`);
        }

        this.grid[row][col] = condition;
        condition.available--;
    }

    isComplete() {
        return this.grid.every(row => row.every(cell => cell !== null));
    }

    getCompletedLines() {
        const results = {
            completedLines: 0,           
            maxTrueConditions: 0,        
            linesWithMaxTrue: 0,         
            linesByTrueCount: new Map(), 
            totalTrueConditions: 0       
        };

        // Check rows
        for (let i = 0; i < 5; i++) {
            this._evaluateLine(this.grid[i], results);
        }

        // Check columns
        for (let j = 0; j < 5; j++) {
            const column = this.grid.map(row => row[j]);
            this._evaluateLine(column, results);
        }

        // Check diagonals
        const diagonal1 = [
            this.grid[0][0],
            this.grid[1][1],
            this.grid[2][2],
            this.grid[3][3],
            this.grid[4][4]
        ];
        const diagonal2 = [
            this.grid[0][4],
            this.grid[1][3],
            this.grid[2][2],
            this.grid[3][1],
            this.grid[4][0]
        ];
        this._evaluateLine(diagonal1, results);
        this._evaluateLine(diagonal2, results);

        return results;
    }

    _evaluateLine(line, results) {
        const trueCount = line.filter(condition => condition && condition.status === true).length;
        
        // Update total true conditions (only counting those in lines)
        if (trueCount > 1) {
            results.totalTrueConditions += trueCount;
        }

        // Update completed lines count
        if (trueCount === 5) {
            results.completedLines++;
        }

        // Update max true conditions and lines with that count
        if (trueCount > 1) {  // Only count lines with more than 1 true condition
            if (trueCount > results.maxTrueConditions) {
                results.maxTrueConditions = trueCount;
                results.linesWithMaxTrue = 1;
            } else if (trueCount === results.maxTrueConditions) {
                results.linesWithMaxTrue++;
            }

            // Update count of lines by number of true conditions
            const currentCount = results.linesByTrueCount.get(trueCount) || 0;
            results.linesByTrueCount.set(trueCount, currentCount + 1);
        }
    }
}

class User {
    constructor(username) {
        this.username = username;
        this.boards = [];
    }

    addBoard(board) {
        if (!(board instanceof Board)) {
            throw new Error("Must provide a valid Board instance");
        }
        if (!board.isComplete()) {
            throw new Error("Cannot add incomplete board");
        }
        this.boards.push(board);
    }

    getBoard(index) {
        if (index < 0 || index >= this.boards.length) {
            throw new Error("Invalid board index");
        }
        return this.boards[index];
    }

    getBoardCount() {
        return this.boards.length;
    }
}



class GameManager {
    constructor() {
        this.conditions = new Map();
        this.board = Array(5).fill(null).map(() => Array(5).fill(null));
        this.selectedItem = null;
        this.selectedItemOrigin = null;
        this.isModalOpen = false;
        this.setupGame();
    }

    setupGame() {
        // Handle existing conditions in HTML
        const existingConditions = document.querySelectorAll('.condition-item');
        existingConditions.forEach(item => {
            const text = item.querySelector('.condition-text').textContent;
            const availableText = item.querySelector('.instance-counter').textContent;
            const maxInstances = parseInt(availableText.split(': ')[1]) || 1;
            
            const condition = new Condition(text, maxInstances > 1, maxInstances);
            this.conditions.set(text, condition);
            
            item.dataset.condition = text;
            this.setupClickListeners(item);
        });

        // Set up center square
        const centerCondition = new Condition("FREE SPACE");
        centerCondition.status = true;
        this.board[2][2] = centerCondition;

        // Initialize board cells
        this.initializeBoardCells();

        // Setup modal controls
        this.setupModalControls();

        // Add global click listener to handle deselection
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.condition-item') && 
                !e.target.closest('.board-cell') && 
                !e.target.closest('#viewBoardButton') && 
                !e.target.closest('.board-modal')) {

                this.clearSelection();
            }
        });

        
    }

    setupModalControls() {
    const modal = document.getElementById('boardModal');
    const viewBoardBtn = document.getElementById('viewBoardButton');
    const closeBtn = modal.querySelector('.close-bingo-modal');

    // Open modal on view board click
    viewBoardBtn.addEventListener('click', () => this.openModal());

    // Close modal on X button click
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.selectedItem && this.selectedItemOrigin !== 'pool') {
            // Return condition to pool if it's from the board
            const [row, col] = this.selectedItemOrigin.split(',').map(Number);
            if (!isNaN(row) && !isNaN(col)) {
                const condition = this.board[row][col];
                if (condition) {
                    condition.available++;
                    this.updateConditionDisplay(condition);
                    this.board[row][col] = null;
                    this.updateCellDisplay(row, col);
                }
            }
        }
        this.clearSelection();
        this.closeModal();
    });

    // Close modal and handle condition return on outside click
    modal.addEventListener('click', (e) => {
        if (e.target.classList.contains('board-modal')) {
            if (this.selectedItem && this.selectedItemOrigin !== 'pool') {
                // Return condition to pool if it's from the board
                const [row, col] = this.selectedItemOrigin.split(',').map(Number);
                if (!isNaN(row) && !isNaN(col)) {
                    const condition = this.board[row][col];
                    if (condition) {
                        condition.available++;
                        this.updateConditionDisplay(condition);
                        this.board[row][col] = null;
                        this.updateCellDisplay(row, col);
                    }
                }
            }
            this.clearSelection();
            this.closeModal();
        }
    });

    // Handle Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isModalOpen) {
            if (this.selectedItem && this.selectedItemOrigin !== 'pool') {
                // Return condition to pool if it's from the board
                const [row, col] = this.selectedItemOrigin.split(',').map(Number);
                if (!isNaN(row) && !isNaN(col)) {
                    const condition = this.board[row][col];
                    if (condition) {
                        condition.available++;
                        this.updateConditionDisplay(condition);
                        this.board[row][col] = null;
                        this.updateCellDisplay(row, col);
                    }
                }
            }
            this.clearSelection();
            this.closeModal();
        }
    });
}

    setupClickListeners(element) {
        const clickHandler = (e) => {
            e.stopPropagation(); // Prevent event from bubbling
            this.handleItemClick(e);
        };

        element.addEventListener('click', clickHandler);
        element.addEventListener('touchstart', (e) => {
            e.preventDefault();
            clickHandler(e);
        });
    }

    handleItemClick(e) {
        const clickedElement = e.target.closest('.condition-item') || e.target.closest('.board-cell');
        if (!clickedElement) return;

        // If clicking an empty cell while having a selection
        if (clickedElement.classList.contains('board-cell') && this.selectedItem) {
            this.handlePlacement(clickedElement);
            return;
        }

        // If clicking a condition from the pool
        if (clickedElement.classList.contains('condition-item')) {
            const condition = this.conditions.get(clickedElement.dataset.condition);
            if (!condition || condition.available <= 0) return;

            // If clicking the already selected item, deselect it
            if (clickedElement === this.selectedItem) {
                this.clearSelection();
                return;
            }

            this.clearSelection();
            this.selectedItem = clickedElement;
            this.selectedItemOrigin = 'pool';
            clickedElement.classList.add('selected');
            this.openModal();
            return;
        }

        // If clicking a cell with a condition
        if (clickedElement.classList.contains('board-cell') && clickedElement.dataset.condition) {
            // If clicking the already selected item, deselect it
            if (clickedElement === this.selectedItem) {
                this.clearSelection();
                return;
            }

            this.clearSelection();
            this.selectedItem = clickedElement;
            this.selectedItemOrigin = this.getItemLocation(clickedElement);
            clickedElement.classList.add('selected');
        }
    }

    initializeBoardCells() {
        const cells = document.querySelectorAll('#modalBoard .board-cell');
        cells.forEach(cell => {
            // Clear existing listeners
            const newCell = cell.cloneNode(true);
            cell.parentNode.replaceChild(newCell, cell);
            
            // Add click events
            this.setupClickListeners(newCell);
            
            // If cell has a condition, add it to the board array
            if (newCell.dataset.condition) {
                const [row, col] = [
                    parseInt(newCell.dataset.row),
                    parseInt(newCell.dataset.col)
                ];
                const condition = this.conditions.get(newCell.dataset.condition);
                if (condition) {
                    this.board[row][col] = condition;
                }
            }
        });
    }

    handlePlacement(targetCell) {
        if (!this.selectedItem || targetCell.classList.contains('center')) return;
    
        const [row, col] = [
            parseInt(targetCell.dataset.row),
            parseInt(targetCell.dataset.col)
        ];
    
        // If coming from pool, use the conditions Map
        if (this.selectedItemOrigin === 'pool') {
            const condition = this.conditions.get(this.selectedItem.dataset.condition);
            if (!condition || condition.available <= 0) return;
    
            // When placing from pool, return existing condition to pool
            if (this.board[row][col]) {
                const existingCondition = this.board[row][col];
                existingCondition.available++;
                this.updateConditionDisplay(existingCondition);
            }
            
            // Place new condition
            this.board[row][col] = condition;
            condition.available--;
            this.updateConditionDisplay(condition);
            this.updateCellDisplay(row, col);
        } else {
            // For board-to-board moves, work directly with board positions
            const [fromRow, fromCol] = this.selectedItemOrigin.split(',').map(Number);
            if (isNaN(fromRow) || isNaN(fromCol)) return;

            
            // Simple swap using board positions
            const temp = this.board[row][col];
            this.board[row][col] = this.board[fromRow][fromCol];
            this.board[fromRow][fromCol] = temp;
            
            this.updateCellDisplay(row, col);
            this.updateCellDisplay(fromRow, fromCol);

        }
    
        this.clearSelection();
        this.checkBoardCompletion();
    }

    clearSelection() {
        if (this.selectedItem) {
            // If the selected item was from the board AND we just did a swap,
            // don't return it to the pool
            if (this.selectedItemOrigin && this.selectedItemOrigin !== 'pool') {
                this.selectedItem.classList.remove('selected');
                this.selectedItem = null;
                this.selectedItemOrigin = null;
                return;  // Exit early without modifying availability
            }
    
            // Original pool-return logic for other cases
            if (this.selectedItemOrigin !== 'pool') {
                const [row, col] = this.selectedItemOrigin.split(',').map(Number);
                if (!isNaN(row) && !isNaN(col)) {
                    const condition = this.board[row][col];
                    if (condition) {
                        condition.available++;
                        this.updateConditionDisplay(condition);
                        this.board[row][col] = null;
                        this.updateCellDisplay(row, col);
                    }
                }
            }
            
            this.selectedItem.classList.remove('selected');
            this.selectedItem = null;
            this.selectedItemOrigin = null;
        }
    }

    openModal() {
        const modal = document.getElementById('boardModal');
        modal.style.display = 'flex';
        this.isModalOpen = true;
    }

    closeModal() {
        const modal = document.getElementById('boardModal');
        modal.style.display = 'none';
        this.isModalOpen = false;
        this.clearSelection();
    }

    updateCellDisplay(row, col) {
        const cell = document.querySelector(
            `#modalBoard .board-cell[data-row="${row}"][data-col="${col}"]`
        );
        const condition = this.board[row][col];
    
        if (condition) {
            cell.textContent = condition.description;
            cell.classList.remove('empty');
            cell.classList.add(condition.status === undefined ? 'undefined' : 
                             condition.status ? 'true' : 'false');
            cell.dataset.condition = condition.description;
        } else {
            cell.textContent = 'Drop here';
            cell.className = 'board-cell empty';
            delete cell.dataset.condition;
        }
    }

    updateConditionDisplay(condition) {
        const conditionElements = document.querySelectorAll(
            `.condition-item[data-condition="${condition.description}"]`
        );
        
        conditionElements.forEach(element => {
            const counter = element.querySelector('.instance-counter');
            if (counter) {
                counter.textContent = `Available: ${condition.available}`;
            }
            
            if (condition.available <= 0) {
                element.classList.add('disabled');
            } else {
                element.classList.remove('disabled');
            }
        });
    }

    getItemLocation(element) {
        if (element.closest('.conditions-pool')) {
            return 'pool';
        }
        if (element.classList.contains('board-cell')) {
            return `${element.dataset.row},${element.dataset.col}`;
        }
        return null;
    }

    checkBoardCompletion() {
        const submitButton = document.getElementById('submitButton');
        submitButton.disabled = !this.isBoardComplete();
    }

    isBoardComplete() {
        return this.board.every((row, i) => 
            row.every((cell, j) => 
                (i === 2 && j === 2) || cell !== null
            )
        );
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const game = new GameManager();
    
    const form = document.getElementById('bingoForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!game.isBoardComplete()) {
            alert('All squares must be filled before submitting');
            return;
        }

        try {
            // Transform the game board data to match the Board class format
            const gridData = game.board.map(row => 
                row.map(cell => {
                    if (cell === null) return null;
                    return {
                        description: cell.description,
                        status: cell.status,
                        allowMultiple: cell.allowMultiple,
                        maxInstances: cell.maxInstances,
                        available: cell.available
                    };
                })
            );

            const response = await fetch('/submit-board', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: sessionStorage.getItem('username'),
                    sessionId: sessionStorage.getItem('sessionId'),
                    grid: gridData
                })
            });

            if (response.ok) {
                window.location.href = '/userBoards.html';
            } else {
                const data = await response.json();
                alert(data.error || 'Submission error');
            }
        } catch (err) {
            console.error('Error during submission:', err);
            alert('Error submitting board');
        }
    });
});