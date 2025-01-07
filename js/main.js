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
        centerCondition.updateStatus(true);
        this.grid[2][2] = centerCondition;
    }

    placeCondition(condition, row, col) {
        if (row < 0 || row >= 5 || col < 0 || col >= 5) {
            throw new Error("Invalid position");
        }

        if (this.grid[row][col] !== null) {
            throw new Error("Position already occupied");
        }

        const currentInstances = this.conditionInstances.get(condition.description) || 0;
        if (!condition.allowMultiple && currentInstances > 0) {
            throw new Error("Condition cannot be used multiple times");
        }
        if (condition.allowMultiple && currentInstances >= condition.maxInstances) {
            throw new Error(`Cannot use condition more than ${condition.maxInstances} times`);
        }

        this.grid[row][col] = condition;
        this.conditionInstances.set(condition.description, currentInstances + 1);
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
        this.setupGame();
    }

    setupGame() {
        // Initialize your conditions here
        this.addCondition(new Condition("Example 1", false, 1));
        this.addCondition(new Condition("Example 2", true, 2));
        // Add more conditions as needed

        // Set up center square
        const centerCondition = new Condition("FREE SPACE");
        centerCondition.status = true;
        this.board[2][2] = centerCondition;

        this.initializeDOM();
        this.setupEventListeners();
    }

    addCondition(condition) {
        this.conditions.set(condition.description, condition);
        this.createConditionElement(condition);
    }

    createConditionElement(condition) {
        const conditionsPool = document.getElementById('conditionsPool');
        const conditionsList = conditionsPool.querySelector('.conditions-list');

        const li = document.createElement('li');
        li.className = 'condition-item';
        li.draggable = true;
        li.dataset.condition = condition.description;

        li.innerHTML = `
            <span class="condition-text">${condition.description}</span>
            <span class="instance-counter">Available: ${condition.available}</span>
        `;

        this.setupDragListeners(li);
        conditionsList.appendChild(li);
    }

    setupEventListeners() {
        const cells = document.querySelectorAll('.board-cell');
        cells.forEach(cell => {
            cell.addEventListener('dragover', e => this.handleDragOver(e));
            cell.addEventListener('drop', e => this.handleDrop(e));
        });
    }

    setupDragListeners(element) {
        element.addEventListener('dragstart', e => this.handleDragStart(e));
        element.addEventListener('dragend', e => this.handleDragEnd(e));
    }

    handleDragStart(e) {
        this.draggedItem = e.target;
        this.draggedItemOrigin = this.getItemLocation(e.target);
        e.target.classList.add('dragging');
        
        // Store the condition's location data
        const data = {
            condition: e.target.dataset.condition,
            origin: this.draggedItemOrigin
        };
        e.dataTransfer.setData('text/plain', JSON.stringify(data));
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
    }

    handleDragOver(e) {
        e.preventDefault();
        e.target.classList.add('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        const cell = e.target.closest('.board-cell');
        cell.classList.remove('drag-over');

        if (!cell) return;

        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        const condition = this.conditions.get(data.condition);
        const origin = data.origin;
        const [row, col] = [
            parseInt(cell.dataset.row),
            parseInt(cell.dataset.col)
        ];

        // Handle center square
        if (row === 2 && col === 2) return;

        // If dragging from the pool to an empty cell
        if (origin === 'pool' && !this.board[row][col]) {
            if (condition.available > 0) {
                this.placeConditionOnBoard(condition, row, col);
                condition.available--;
                this.updateConditionDisplay(condition);
            }
        }
        // If dragging from one cell to another
        else if (origin !== 'pool') {
            const [fromRow, fromCol] = origin.split(',').map(Number);
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
            
            // Disable if no instances available
            if (condition.available <= 0) {
                element.classList.add('disabled');
                element.draggable = false;
            } else {
                element.classList.remove('disabled');
                element.draggable = true;
            }
        });
    }

    checkBoardCompletion() {
        const submitButton = document.getElementById('submitButton');
        const isComplete = this.board.every(row => 
            row.every(cell => cell !== null)
        );
        submitButton.disabled = !isComplete;
    }

    // Add method to handle form submission
    handleSubmit(event) {
        event.preventDefault();
        const boardData = document.getElementById('boardData');
        boardData.value = JSON.stringify(this.board);
        // Now the form can be submitted
        event.target.submit();
    }
}