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
        ];
        const diagonal2 = [
            grid[0][4],
            grid[1][3],
            grid[2][2],
            grid[3][1],
            grid[4][0]
        ];
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



class UserHomeManager {
    constructor() {
        this.username = 'TestUser'; // This would come from session/login
        this.boards = [];
        this.setupEventListeners();
        this.loadUserBoards();
        this.checkDeadline();
    }

    setupEventListeners() {
        document.querySelector('.close-modal').addEventListener('click', () => {
            this.closeModal();
        });

        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('boardModal')) {
                this.closeModal();
            }
        });

        document.getElementById('createNewBoard')?.addEventListener('click', () => {
            window.location.href = '/index.html';
        });

    
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById('boardModal').style.display === 'block') {
                this.closeModal();
            }
        });
    }

    loadUserBoards() {
        this.boards = this.generateTestBoards();
        this.displayUserInfo();
        this.displayBoards();
    }

    displayUserInfo() {
        document.getElementById('username').textContent = this.username;
        document.getElementById('boardCount').textContent = this.boards.length;
        
        // Find best line across all boards
        const bestLine = Math.max(...this.boards.map(board => board.stats.maxTrueConditions));
        document.getElementById('bestLine').textContent = bestLine;
    }

    displayBoards() {
        const boardsList = document.getElementById('boardsList');
        boardsList.innerHTML = '';

        // Sort using same logic as leaderboard
        const sortedBoards = this.sortBoards(this.boards);
        sortedBoards.forEach((board, index) => {
            boardsList.appendChild(this.createBoardEntry(board, index + 1));
        });
    }

    sortBoards(boards) {
        return boards.sort((a, b) => {
            // First check max number of true conditions in any line
            if (a.stats.maxTrueConditions !== b.stats.maxTrueConditions) {
                return b.stats.maxTrueConditions - a.stats.maxTrueConditions;
            }

            // If max true conditions are equal, check number of lines with that max
            if (a.stats.linesWithMaxTrue !== b.stats.linesWithMaxTrue) {
                return b.stats.linesWithMaxTrue - a.stats.linesWithMaxTrue;
            }

            // Check each lower number of true conditions (from max-1 down to 2)
            for (let count = a.stats.maxTrueConditions - 1; count >= 2; count--) {
                const aLines = a.stats.linesByTrueCount.get(count) || 0;
                const bLines = b.stats.linesByTrueCount.get(count) || 0;
                if (aLines !== bLines) {
                    return bLines - aLines;
                }
            }

            // If all else is equal, sort by total true conditions
            return b.stats.totalTrueConditions - a.stats.totalTrueConditions;
        });
    }

    generateTestBoards() {
        const conditions = [
            { description: "Josh Allen TD Pass", status: true },
            { description: "Bills Score First", status: true },
            { description: "Defensive Turnover", status: true },
            { description: "Stefon Diggs TD", status: true },
            { description: "50+ Yard Play", status: true },
            { description: "4th Down Stop", status: false },
            { description: "Missed FG", status: false },
            { description: "Punt Return TD", status: undefined },
            { description: "Safety", status: undefined },
            { description: "Trick Play", status: undefined }
        ];

        const createGrid = (config = {}) => {
            const grid = Array(5).fill(null).map(() => Array(5).fill(null));
            
            // Add center FREE SPACE
            grid[2][2] = { description: "FREE SPACE", status: true };

            // Create winning line if specified
            if (config.winningLine) {
                const row = config.winningLine;
                for (let j = 0; j < 5; j++) {
                    grid[row][j] = { 
                        description: conditions[j].description, 
                        status: true 
                    };
                }
            }

            // Create partial line if specified
            if (config.partialLine) {
                const { row, count } = config.partialLine;
                for (let j = 0; j < count; j++) {
                    if (!grid[row][j]) { // Don't overwrite if already set
                        grid[row][j] = { 
                            description: conditions[j].description, 
                            status: true 
                        };
                    }
                }
            }

            // Fill remaining spaces
            for (let i = 0; i < 5; i++) {
                for (let j = 0; j < 5; j++) {
                    if (!grid[i][j]) { // Only fill empty spaces
                        const randomStatus = Math.random();
                        let status;
                        if (randomStatus < 0.3) status = true;
                        else if (randomStatus < 0.6) status = false;
                        else status = undefined;
                        
                        const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
                        grid[i][j] = { 
                            description: randomCondition.description, 
                            status: status 
                        };
                    }
                }
            }
            return grid;
        };

        // Create test boards with various scenarios
        return [
            {
                grid: createGrid({ winningLine: 0 }), // Board with completed top row
                boardNumber: 1
            },
            {
                grid: createGrid({ partialLine: { row: 0, count: 4 } }), // Board with 4 true in top row
                boardNumber: 2
            },
            {
                grid: createGrid({ partialLine: { row: 0, count: 4 } }), // Another board with 4 true but different pattern
                boardNumber: 3
            },
            {
                grid: createGrid({ partialLine: { row: 1, count: 3 } }), // Board with 3 true in a row
                boardNumber: 4
            },
            {
                grid: createGrid(), // Random board
                boardNumber: 5
            }
        ].map(board => ({
            ...board,
            stats: BoardStatsCalculator.calculateStats(board.grid)
        }));
    }

    createBoardEntry(board, number) {
        const entry = document.createElement('div');
        entry.className = `board-entry ${board.stats.completedLines > 0 ? 'winning' : ''}`;
        entry.innerHTML = `
            <div class="board-info">
                <div class="username">Board ${number}</div>
                <div class="board-stats">
                    Closest Line: ${board.stats.maxTrueConditions}, 
                    Lines w/ Most: ${board.stats.linesWithMaxTrue}
                </div>
            </div>
            <button class="view-board-btn">View Board</button>
        `;

        entry.querySelector('.view-board-btn').addEventListener('click', () => {
            this.showBoardModal(board, number);
        });

        return entry;
    }

    showBoardModal(board, number) {
        const modal = document.getElementById('boardModal');
        const modalBoard = document.getElementById('modalBoard');

        document.getElementById('modalBoardNumber').textContent = number;
        document.getElementById('modalCompletedLines').textContent = board.stats.completedLines;
        document.getElementById('modalMaxTrue').textContent = board.stats.maxTrueConditions;
        document.getElementById('modalLinesWithMax').textContent = board.stats.linesWithMaxTrue;
        document.getElementById('modalTotalTrue').textContent = board.stats.totalTrueConditions;

        modalBoard.innerHTML = '';
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
                modalBoard.appendChild(cellDiv);
            });
        });

        modal.style.display = 'block';
    }

    closeModal() {
        document.getElementById('boardModal').style.display = 'none';
    }

    checkDeadline() {
        const deadline = new Date('2024-01-14T13:00:00-05:00');
        const now = new Date();
        const newBoardContainer = document.getElementById('newBoardContainer');
        
        if (now >= deadline && newBoardContainer) {
            newBoardContainer.classList.add('hidden');
        }
    }

    // You can use the same generateTestBoards method from before
}

document.addEventListener('DOMContentLoaded', () => {
    new UserHomeManager();
});