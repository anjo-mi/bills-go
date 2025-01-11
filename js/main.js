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
        
        // Remove any existing listeners
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
        
        let isSubmitting = false; // Add flag to prevent multiple submissions
    
        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Prevent duplicate submissions
            if (isSubmitting) return;
            isSubmitting = true;
                
            if (!this.isBoardComplete()) {
                alert('Please fill all squares before submitting');
                isSubmitting = false;
                return;
            }
    
            try {
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
                    const errorData = await response.json();
                    alert(errorData.error || 'Error submitting board');
                    isSubmitting = false;
                }
            } catch (error) {
                console.error('Submit error:', error);
                alert('Error submitting board');
                isSubmitting = false;
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
            
            // Add drop events to all cells
            newCell.addEventListener('dragover', e => this.handleDragOver(e));
            newCell.addEventListener('dragleave', e => this.handleDragLeave(e));
            newCell.addEventListener('drop', e => this.handleDrop(e));
            
            // Add touch events
            newCell.addEventListener('touchend', e => this.handleTouchEnd(e));
            
            // If cell already has a condition, make it draggable and add touch listeners
            if (newCell.dataset.condition) {
                // Ensure draggable
                newCell.draggable = true;
                
                // Add drag and touch listeners explicitly
                this.setupDragListeners(newCell);
                this.setupTouchListeners(newCell);
                
                // Mark that listeners have been added
                newCell.hasListeners = true;
            }
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

        // Don't allow dropping on center square
        if (row === 2 && col === 2) return;

        // Handle different drop scenarios
        if (data.origin === 'pool') {
            // Dropping from pool to board
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
            const [fromRow, fromCol] = data.origin.split(',').map(Number);
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

        this.checkBoardCompletion();
    }

    // Helper method to clear a cell and return its condition to the pool
    clearCell(row, col) {
        const condition = this.board[row][col];
        if (condition) {
            condition.available++;
            this.updateConditionDisplay(condition);
            this.board[row][col] = null;
            this.updateCellDisplay(row, col);
        }
    }

    setupTouchListeners(element) {
        element.addEventListener('touchstart', e => this.handleTouchStart(e), { passive: false });
        element.addEventListener('touchmove', e => this.handleTouchMove(e), { passive: false });
        element.addEventListener('touchend', e => this.handleTouchEnd(e));
    }
    
    setupDragListeners(element) {
        element.draggable = true;
        element.addEventListener('dragstart', e => this.handleDragStart(e));
        element.addEventListener('dragend', e => this.handleDragEnd(e));
    }
    
    handleDragStart(e) {
        if (this.dragHelper) {
            this.dragHelper.remove();
        }
        
        this.draggedItem = e.target;
        this.draggedItemOrigin = this.getItemLocation(e.target);
        e.target.classList.add('dragging');
        
        // Create visual helper for mouse drag
        const clone = e.target.cloneNode(true);
        clone.id = 'dragHelper';
        clone.style.position = 'fixed';
        clone.style.top = `${e.clientY - 25}px`;
        clone.style.left = `${e.clientX - 25}px`;
        clone.style.opacity = '0.8';
        clone.style.pointerEvents = 'none';
        clone.style.zIndex = '1000';
        document.body.appendChild(clone);
        this.dragHelper = clone;
        
        const data = {
            condition: e.target.dataset.condition,
            origin: this.draggedItemOrigin
        };
        e.dataTransfer.setData('text/plain', JSON.stringify(data));
    }

    handleDragEnd(e) {
        if (this.dragHelper) {
            this.dragHelper.remove();
            this.dragHelper = null;
        }
        
        if (this.draggedItem) {
            this.draggedItem.classList.remove('dragging');
            this.draggedItem = null;
        }
        
        document.querySelectorAll('.board-cell').forEach(cell => {
            cell.classList.remove('drag-over');
            if (cell.classList.contains('empty')) {
                cell.textContent = 'Drop here';
            }
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        const cell = e.target.closest('.board-cell');
        if (cell && !cell.classList.contains('center')) {
            cell.classList.add('drag-over');
            // Ensure "Drop here" text is visible in empty cells
            if (cell.classList.contains('empty')) {
                cell.textContent = 'Drop here';
            }
        }
    }

    handleDragLeave(e) {
        const cell = e.target.closest('.board-cell');
        if (cell) {
            cell.classList.remove('drag-over');
        }
    }
    
    handleTouchStart(e) {
        const touchedElement = e.target.closest('.condition-item') || e.target.closest('.board-cell');
        if (!touchedElement || (touchedElement.classList.contains('board-cell') && !touchedElement.dataset.condition)) return;
        
        e.preventDefault();
        this.draggedItem = touchedElement;
        this.draggedItemOrigin = this.getItemLocation(touchedElement);
        
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        
        // Create drag helper
        if (this.dragHelper) {
            this.dragHelper.remove();
        }
        const clone = touchedElement.cloneNode(true);
        clone.id = 'dragHelper';
        clone.style.position = 'fixed';
        clone.style.top = `${touch.clientY - 25}px`;
        clone.style.left = `${touch.clientX - 25}px`;
        clone.style.opacity = '0.8';
        clone.style.pointerEvents = 'none';
        clone.style.zIndex = '1000';
        document.body.appendChild(clone);
        this.dragHelper = clone;
    
        touchedElement.classList.add('dragging');
    
        // Reset empty cells text
        document.querySelectorAll('.board-cell.empty').forEach(cell => {
            cell.textContent = 'Drop here';
        });
    }
    
    handleTouchMove(e) {
        if (!this.draggedItem) return;
        e.preventDefault();
    
        const touch = e.touches[0];
        if (this.dragHelper) {
            this.dragHelper.style.top = `${touch.clientY - 25}px`;
            this.dragHelper.style.left = `${touch.clientX - 25}px`;
        }
    
        // Remove drag-over from all cells
        document.querySelectorAll('.board-cell').forEach(c => 
            c.classList.remove('drag-over'));
    
        // Find the cell under the touch point
        const elementAtPoint = document.elementFromPoint(touch.clientX, touch.clientY);
        const cell = elementAtPoint?.closest('.board-cell');
        
        // Add drag-over if we're over a valid cell
        if (cell && !cell.classList.contains('center')) {
            cell.classList.add('drag-over');
            // Keep "Drop here" text visible
            if (cell.classList.contains('empty')) {
                cell.textContent = 'Drop here';
            }
        }
    }
    
    handleTouchEnd(e) {
        if (!this.draggedItem) return;
        e.preventDefault();
    
        // Remove drag helper
        if (this.dragHelper) {
            this.dragHelper.remove();
            this.dragHelper = null;
        }
    
        const touch = e.changedTouches[0];
        const elementAtPoint = document.elementFromPoint(touch.clientX, touch.clientY);
        const cell = elementAtPoint?.closest('.board-cell');
    
        this.draggedItem.classList.remove('dragging');
    
        if (cell) {
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
        } else if (this.draggedItemOrigin !== 'pool') {
            // Return condition to pool if dropped outside
            const [row, col] = this.draggedItemOrigin.split(',').map(Number);
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
    
        this.draggedItem = null;
        this.draggedItemOrigin = null;
        document.querySelectorAll('.board-cell').forEach(cell => 
            cell.classList.remove('drag-over'));
    }

    cleanup() {
        if (this.dragHelper) {
            this.dragHelper.remove();
            this.dragHelper = null;
        }
        if (this.draggedItem) {
            this.draggedItem.style.opacity = '1';
            this.draggedItem.classList.remove('dragging');
            this.draggedItem = null;
        }
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
            
            // Make cell draggable when it contains a condition
            cell.draggable = true;
            cell.dataset.condition = condition.description;
            
            // Add drag and touch handlers if they haven't been added yet
            if (!cell.hasListeners) {
                this.setupDragListeners(cell);
                this.setupTouchListeners(cell);
                cell.hasListeners = true;
            }
        } else {
            cell.textContent = 'Drop here';
            cell.className = 'board-cell empty';
            cell.draggable = false;
            cell.dataset.condition = '';
            cell.hasListeners = false;
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

    async handleSubmit(e){
        console.log(e.target)
        e.preventDefault();

        if (!this.isBoardComplete()){
            alert('All squares must be filled before submitting')
            return
        }

        this.submitBoard();

    }

    async submitBoard(){
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
        try{
            const response = await fetch('/submit-board', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(boardData)
            })
            if (response.ok) {
                if (response.ok){
                    alert(response)
                    alert('submission worked')
                    window.location.href = '/userBoards.html'
                }else{
                    alert('submission error')
                }
            }
        }
        catch(err){
             console.error('error of submission: ', err)};
    }

}

document.addEventListener('DOMContentLoaded', () => {
    const game = new GameManager();
    
    const form = document.getElementById('bingoForm');
    form.addEventListener('submit', (e) => game.handleSubmit(e));
});