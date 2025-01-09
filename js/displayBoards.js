document.addEventListener('DOMContentLoaded', () => {
    const sessionId = sessionStorage.getItem('sessionId');
    const expires = new Date(sessionStorage.getItem('sessionExpires'));
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    
    if (!sessionId || !isLoggedIn || expires < new Date()) {
        window.location.href = '/login.html';
    }
});

class BoardStatsCalculator {
    static calculateStats(grid) {
        const results = {
            completedLines: 0,
            maxTrueConditions: 0,
            linesWithMaxTrue: 0,
            totalTrueConditions: this._countTotalTrueConditions(grid),
            linesByTrueCount: new Map()
        };

        // Check rows
        for (let i = 0; i < 5; i++) {
            this._evaluateLine(grid[i], results);
        }

        // Check columns
        for (let j = 0; j < 5; j++) {
            const column = grid.map(row => row[j]);
            this._evaluateLine(column, results);
        }

        // Check diagonals
        const diagonal1 = [
            grid[0][0],
            grid[1][1],
            grid[2][2],
            grid[3][3],
            grid[4][4]
        ];  // Main diagonal top-left to bottom-right
        
        const diagonal2 = [
            grid[0][4],
            grid[1][3],
            grid[2][2],
            grid[3][1],
            grid[4][0]
        ];  // Main diagonal top-right to bottom-left
        
        this._evaluateLine(diagonal1, results);
        this._evaluateLine(diagonal2, results);

        return results;
    }

    static _evaluateLine(line, results) {
        const trueCount = line.filter(cell => cell && cell.status === true).length;
        
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

    static _countTotalTrueConditions(grid) {
        // Count true conditions across the entire board (only once per cell)
        let total = 0;
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 5; j++) {
                if (grid[i][j] && grid[i][j].status === true) {
                    total++;
                }
            }
        }
        return total;
    }
}

class BoardsDisplay {
    constructor() {
        this.currentBoardIndex = 0;
        this.boards = [];
        this.setupEventListeners();
        this.loadUserBoards();
        this.renderCurrentBoard();
        this.checkDeadline();
    }

    async loadUserBoards(){
        try{
            const response = await fetch('/user-boards', {
                method: 'GET',
                headers: {
                    'sessionid': sessionStorage.getItem('sessionId'),
                    'username': sessionStorage.getItem('username')
                }
            });

            if (response.ok){
                const data = await response.json();
                this.boards = data.boards.map(board => ({
                    ...board,
                    stats: BoardStatsCalculator.calculateStats(board.grid)
                }))
            }else {
                window.location.href = '/login.html';
            }
        }catch(err){
            console.error('error loading boards:', err);
            window.location.href = '/login.html';
        }
    }

    setupEventListeners() {
        document.getElementById('prevBoard').addEventListener('click', () => this.showPreviousBoard());
        document.getElementById('nextBoard').addEventListener('click', () => this.showNextBoard());
        document.getElementById('createNewBoard')?.addEventListener('click', () => {
            window.location.href = '/create.html';
        });
    }

    showPreviousBoard() {
        this.currentBoardIndex = this.currentBoardIndex <= 0 ? 
            this.boards.length - 1 : this.currentBoardIndex - 1;
        this.renderCurrentBoard();
    }

    showNextBoard() {
        this.currentBoardIndex = this.currentBoardIndex >= this.boards.length - 1 ? 
            0 : this.currentBoardIndex + 1;
        this.renderCurrentBoard();
    }

    renderCurrentBoard() {
        const board = this.boards[this.currentBoardIndex];
        const boardElement = document.getElementById('displayBoard');
        const currentNum = document.getElementById('currentBoardNum');
        const totalBoards = document.getElementById('totalBoards');
        
        // Remove disabled state from navigation buttons since we can always navigate
        document.getElementById('prevBoard').disabled = false;
        document.getElementById('nextBoard').disabled = false;

        // Clear existing board
        boardElement.innerHTML = '';

        // Create cells
        board.grid.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                const cellDiv = document.createElement('div');
                cellDiv.className = 'board-cell';
                if (cell) {
                    cellDiv.textContent = cell.description;
                    if (cell.status !== undefined) {
                        cellDiv.classList.add(cell.status ? 'true' : 'false');
                    } else {
                        cellDiv.classList.add('undefined');
                    }
                }
                boardElement.appendChild(cellDiv);
            });
        });

        // Update navigation
        currentNum.textContent = this.currentBoardIndex + 1;
        totalBoards.textContent = this.boards.length;

        // Update stats
        this.updateStats(board.stats);
    }

    updateStats(stats) {
        document.getElementById('completedLines').textContent = stats.completedLines;
        document.getElementById('maxTrueCount').textContent = stats.maxTrueConditions;
        document.getElementById('linesWithMax').textContent = stats.linesWithMaxTrue;
        document.getElementById('totalTrue').textContent = stats.totalTrueConditions;
    }

    checkDeadline() {
        const deadline = new Date('2024-01-14T13:00:00-05:00'); // 1 PM EST on Sunday
        const now = new Date();
        const newBoardContainer = document.getElementById('newBoardContainer');
        
        if (now >= deadline && newBoardContainer) {
            newBoardContainer.classList.add('hidden');
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BoardsDisplay();
});