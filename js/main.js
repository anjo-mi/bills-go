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

        // Add global click listener to handle deselection
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.condition-item') && 
                !e.target.closest('.board-cell')) {
                this.clearSelection();
            }
        });
    }

    addCondition(condition) {
        this.conditions.set(condition.description, condition);
        this.createConditionElement(condition);
    }

    createConditionElement(condition) {
        const conditionsPool = document.getElementById('conditionsPool');
        const conditionsList = conditionsPool.querySelector('.conditions-list') || conditionsPool;

        const li = document.createElement('li');
        li.className = 'condition-item';
        li.dataset.condition = condition.description;

        li.innerHTML = `
            <span class="condition-text">${condition.description}</span>
            <span class="instance-counter">${condition.available}/${condition.maxInstances}</span>
        `;

        this.setupClickListeners(li);
        conditionsList.appendChild(li);
    }

    setupClickListeners(element) {
        element.addEventListener('click', (e) => this.handleItemClick(e));
        element.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleItemClick(e);
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

        // If clicking a cell with a condition or a condition from the pool
        if (clickedElement.dataset.condition) {
            // If clicking the already selected item, deselect it
            if (clickedElement === this.selectedItem) {
                this.clearSelection();
                return;
            }

            // Clear previous selection
            this.clearSelection();

            // Set new selection
            this.selectedItem = clickedElement;
            this.selectedItemOrigin = this.getItemLocation(clickedElement);
            clickedElement.classList.add('selected');
        }
    }

    handlePlacement(targetCell) {
        if (!this.selectedItem || targetCell.classList.contains('center')) return;

        const [row, col] = [
            parseInt(targetCell.dataset.row),
            parseInt(targetCell.dataset.col)
        ];

        const condition = this.conditions.get(this.selectedItem.dataset.condition);
        if (!condition) return;

        if (this.selectedItemOrigin === 'pool') {
            // Placing from pool to board
            if (condition.available > 0) {
                // If cell is occupied, return that condition to pool
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
            }
        } else {
            // Moving between board cells
            const [fromRow, fromCol] = this.selectedItemOrigin.split(',').map(Number);
            if (isNaN(fromRow) || isNaN(fromCol)) return;
            
            // Swap if target cell is occupied
            if (this.board[row][col]) {
                const temp = this.board[row][col];
                this.board[row][col] = this.board[fromRow][fromCol];
                this.board[fromRow][fromCol] = temp;
            } else {
                // Move to empty cell
                this.board[row][col] = this.board[fromRow][fromCol];
                this.board[fromRow][fromCol] = null;
            }
            
            this.updateCellDisplay(row, col);
            this.updateCellDisplay(fromRow, fromCol);
        }

        this.clearSelection();
        this.checkBoardCompletion();
    }

    clearSelection() {
        if (this.selectedItem) {
            // If the selected item was from the board, return it to the pool
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

    initializeBoardCells() {
        const cells = document.querySelectorAll('.board-cell');
        cells.forEach(cell => {
            // Clear existing listeners
            const newCell = cell.cloneNode(true);
            cell.parentNode.replaceChild(newCell, cell);
            
            // Add click events
            newCell.addEventListener('click', (e) => this.handleItemClick(e));
            newCell.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleItemClick(e);
            });
            
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

    clearCell(row, col) {
        const condition = this.board[row][col];
        if (condition) {
            condition.available++;
            this.updateConditionDisplay(condition);
            this.board[row][col] = null;
            this.updateCellDisplay(row, col);
        }
    }

    updateCellDisplay(row, col) {
        const cell = document.querySelector(
            `.board-cell[data-row="${row}"][data-col="${col}"]`
        );
        const condition = this.board[row][col];
    
        if (condition) {
            cell.textContent = condition.description;
            cell.classList.remove('empty');
            cell.classList.add(condition.status === undefined ? 'undefined' : 
                             condition.status ? 'true' : 'false');
            cell.dataset.condition = condition.description;
        } else {
            cell.textContent = 'Click to place';
            cell.className = 'board-cell empty';
            cell.dataset.condition = '';
        }
    }

    updateConditionDisplay(condition) {
        const conditionElements = document.querySelectorAll(
            `.condition-item[data-condition="${condition.description}"]`
        );
        
        conditionElements.forEach(element => {
            const counter = element.querySelector('.instance-counter');
            counter.textContent = `Available: ${condition.available}`;
            
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
        const cell = element.closest('.board-cell');
        if (cell) {
            return `${cell.dataset.row},${cell.dataset.col}`;
        }
        return null;
    }

    isBoardComplete() {
        return this.board.every(row => row.every(cell => cell !== null));
    }

    checkBoardCompletion() {
        const submitButton = document.getElementById('submitButton');
        submitButton.disabled = !this.isBoardComplete();
    }

    handleSubmit(e) {
        e.preventDefault();
        if (!this.isBoardComplete()) {
            alert('All squares must be filled before submitting');
            return;
        }
        this.submitBoard();
    }

    async submitBoard() {
        const boardData = {
            username: sessionStorage.getItem('username'),
            sessionId: sessionStorage.getItem('sessionId'),
            grid: this.board.map(row => 
                row.map(cell => cell ? {
                    description: cell.description,
                    status: cell.status,
                    allowMultiple: cell.allowMultiple,
                    maxInstances: cell.maxInstances
                } : null)
            )
        };

        try {
            const response = await fetch('/submit-board', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(boardData)
            });

            if (response.ok) {
                window.location.href = '/userBoards.html';
            } else {
                alert('Submission error');
            }
        } catch (err) {
            console.error('Error during submission:', err);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const game = new GameManager();
    
    const form = document.getElementById('bingoForm');
    form.addEventListener('submit', (e) => game.handleSubmit(e));
});