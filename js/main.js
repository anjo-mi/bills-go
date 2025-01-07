class Condition {
    constructor(description, allowMultiple = false, maxInstances = 1) {
        this.description = description;
        this.status = undefined;
        this.allowMultiple = allowMultiple;
        this.maxInstances = maxInstances;
        this.available = maxInstances;  // Add this new property
    }
}

class Board {
    constructor() {
        this.grid = Array(5).fill(null).map(() => Array(5).fill(null));        
        // Set center square with automatic true condition
        const centerCondition = new Condition("Free Space");
        centerCondition.status = true;  // Direct assignment instead of updateStatus
        this.grid[2][2] = centerCondition;
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
            completedLines: 0,           // lines with all true conditions
            maxTrueConditions: 0,        // largest number of true conditions in any line
            linesWithMaxTrue: 0,         // number of lines with max true conditions
            linesByTrueCount: new Map(), // map of true count to number of lines with that count
            totalTrueConditions: 0       // total number of true conditions on board
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
        this.draggedItem = null;
        this.draggedItemOrigin = null;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.setupGame();
    }

    setupGame() {
        // First handle any hard-coded conditions in HTML
        const existingConditions = document.querySelectorAll('.condition-item');
        existingConditions.forEach(item => {
            const text = item.querySelector('.condition-text').textContent;
            // Handle the "Available: X" format
            const availableText = item.querySelector('.instance-counter').textContent;
            const maxInstances = parseInt(availableText.split(': ')[1]) || 1;
            
            // Create condition object for this HTML element
            const condition = new Condition(text, maxInstances > 1, maxInstances);
            this.conditions.set(text, condition);
            
            // The data-condition-id isn't needed, we'll use the text as the identifier
            item.dataset.condition = text;
            this.setupDragListeners(item);
            this.setupTouchListeners(item);
        });

        // Set up center square
        const centerCondition = new Condition("FREE SPACE");
        centerCondition.status = true;
        this.board[2][2] = centerCondition;

        // Set up board cell events
        this.initializeBoardCells();

        // Set up form submission
        this.setupFormSubmission();
    }

    setupFormSubmission() {
        const form = document.getElementById('bingoForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Only proceed if the board is complete
            if (!this.isBoardComplete()) {
                alert('Please fill all squares before submitting');
                return;
            }

            // Prepare board data for submission
            const boardData = {
                grid: this.board.map(row => 
                    row.map(cell => cell ? {
                        description: cell.description,
                        status: cell.status,
                        allowMultiple: cell.allowMultiple,
                        maxInstances: cell.maxInstances
                    } : null)
                )
            };

            // Update hidden input
            const boardDataInput = document.getElementById('boardData');
            boardDataInput.value = JSON.stringify(boardData);

            // Submit the form
            form.submit();
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
        li.draggable = true;
        li.dataset.condition = condition.description;

        li.innerHTML = `
            <span class="condition-text">${condition.description}</span>
            <span class="instance-counter">${condition.available}/${condition.maxInstances}</span>
        `;

        this.setupDragListeners(li);
        this.setupTouchListeners(li);
        conditionsList.appendChild(li);
    }

    initializeBoardCells() {
        const cells = document.querySelectorAll('.board-cell');
        cells.forEach(cell => {
            // Clear existing listeners
            const newCell = cell.cloneNode(true);
            cell.parentNode.replaceChild(newCell, cell);
            
            // Add new listeners
            newCell.addEventListener('dragover', e => this.handleDragOver(e));
            newCell.addEventListener('dragleave', e => this.handleDragLeave(e));
            newCell.addEventListener('drop', e => this.handleDrop(e));
            newCell.addEventListener('touchend', e => this.handleTouchEnd(e));
        });
    }

    handleDrop(e) {
        e.preventDefault();
        const cell = e.target.closest('.board-cell');
        if (!cell) return;
        
        cell.classList.remove('drag-over');

        let data;
        try {
            data = JSON.parse(e.dataTransfer.getData('text/plain'));
        } catch {
            // If data transfer fails, use draggedItem properties
            if (this.draggedItem) {
                data = {
                    condition: this.draggedItem.dataset.condition,
                    origin: this.draggedItemOrigin
                };
            } else {
                return;
            }
        }

        const condition = this.conditions.get(data.condition);
        if (!condition) return;

        const [row, col] = [
            parseInt(cell.dataset.row),
            parseInt(cell.dataset.col)
        ];

        // Handle center square
        if (row === 2 && col === 2) return;

        // If dragging from the pool to an empty cell
        if (data.origin === 'pool' && !this.board[row][col]) {
            if (condition.available > 0) {
                this.placeConditionOnBoard(condition, row, col);
                condition.available--;
                this.updateConditionDisplay(condition);
            }
        }
        // If dragging from one cell to another
        else if (data.origin !== 'pool') {
            const [fromRow, fromCol] = data.origin.split(',').map(Number);
            // Swap positions if both cells have conditions
            if (this.board[row][col]) {
                const temp = this.board[row][col];
                this.board[row][col] = this.board[fromRow][fromCol];
                this.board[fromRow][fromCol] = temp;
                this.updateCellDisplay(row, col);
                this.updateCellDisplay(fromRow, fromCol);
            }
            // Move to empty cell
            else {
                this.board[row][col] = this.board[fromRow][fromCol];
                this.board[fromRow][fromCol] = null;
                this.updateCellDisplay(row, col);
                this.updateCellDisplay(fromRow, fromCol);
            }
        }

        this.checkBoardCompletion();
    }

    setupDragListeners(element) {
        element.draggable = true;
        element.addEventListener('dragstart', e => this.handleDragStart(e));
        element.addEventListener('dragend', e => this.handleDragEnd(e));
    }
    
    setupTouchListeners(element) {
        element.addEventListener('touchstart', e => this.handleTouchStart(e), { passive: false });
        element.addEventListener('touchmove', e => this.handleTouchMove(e), { passive: false });
        element.addEventListener('touchend', e => this.handleTouchEnd(e));
    }
    
    handleDragStart(e) {
        this.draggedItem = e.target;
        this.draggedItemOrigin = this.getItemLocation(e.target);
        e.target.classList.add('dragging');
        
        const data = {
            condition: e.target.dataset.condition,
            origin: this.draggedItemOrigin
        };
        e.dataTransfer.setData('text/plain', JSON.stringify(data));
    }
    
    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        document.querySelectorAll('.board-cell').forEach(cell => 
            cell.classList.remove('drag-over'));
    }
    
    handleDragOver(e) {
        e.preventDefault();
        e.target.classList.add('drag-over');
    }
    
    handleDragLeave(e) {
        e.target.classList.remove('drag-over');
    }
    
    handleTouchStart(e) {
        if (!e.target.closest('.condition-item')) return;
        e.preventDefault();
        
        const item = e.target.closest('.condition-item');
        this.draggedItem = item;
        this.draggedItemOrigin = this.getItemLocation(item);
        
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        
        item.classList.add('dragging');
        
        // Create visual feedback for dragging
        const clone = item.cloneNode(true);
        clone.id = 'dragHelper';
        clone.style.position = 'fixed';
        clone.style.top = `${touch.clientY - 25}px`;
        clone.style.left = `${touch.clientX - 25}px`;
        clone.style.opacity = '0.8';
        clone.style.pointerEvents = 'none';
        clone.style.zIndex = '1000';
        document.body.appendChild(clone);
    }
    
    handleTouchMove(e) {
        if (!this.draggedItem) return;
        e.preventDefault();
    
        const touch = e.touches[0];
        const helper = document.getElementById('dragHelper');
        if (helper) {
            helper.style.top = `${touch.clientY - 25}px`;
            helper.style.left = `${touch.clientX - 25}px`;
        }
    
        // Find the cell under the touch point
        const cell = document.elementFromPoint(touch.clientX, touch.clientY);
        if (cell && cell.classList.contains('board-cell')) {
            // Remove drag-over from all cells
            document.querySelectorAll('.board-cell').forEach(c => 
                c.classList.remove('drag-over'));
            // Add drag-over to current cell
            cell.classList.add('drag-over');
        }
    }
    
    handleTouchEnd(e) {
        if (!this.draggedItem) return;
        e.preventDefault();
    
        const helper = document.getElementById('dragHelper');
        if (helper) helper.remove();
    
        const touch = e.changedTouches[0];
        const cell = document.elementFromPoint(touch.clientX, touch.clientY);
    
        if (cell && cell.classList.contains('board-cell')) {
            this.handleDrop({ 
                preventDefault: () => {},
                target: cell,
                dataTransfer: {
                    getData: () => JSON.stringify({
                        condition: this.draggedItem.dataset.condition,
                        origin: this.draggedItemOrigin
                    })
                }
            });
        }
    
        this.draggedItem.classList.remove('dragging');
        this.draggedItem = null;
        this.draggedItemOrigin = null;
    
        // Remove drag-over from all cells
        document.querySelectorAll('.board-cell').forEach(cell => 
            cell.classList.remove('drag-over'));
    }

    placeConditionOnBoard(condition, row, col) {
        this.board[row][col] = condition;
        this.updateCellDisplay(row, col);
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
        } else {
            cell.textContent = 'Drop here';
            cell.className = 'board-cell empty';
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
                element.draggable = false;
            } else {
                element.classList.remove('disabled');
                element.draggable = true;
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
        const isComplete = this.board.every(row => 
            row.every(cell => cell !== null)
        );
        submitButton.disabled = !isComplete;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const game = new GameManager();
    
    // Set up form submission
    // const form = document.getElementById('bingoForm');
    // form.addEventListener('submit', (e) => game.handleSubmit(e));
});