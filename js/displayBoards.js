// const testBoards = [
//     {
//         grid: Array(5).fill().map(() => Array(5).fill(null)),
//         stats: {
//             completedLines: 1,
//             maxTrueConditions: 4,
//             linesWithMaxTrue: 2,
//             totalTrueConditions: 12
//         }
//     },
//     {
//         grid: Array(5).fill().map(() => Array(5).fill(null)),
//         stats: {
//             completedLines: 0,
//             maxTrueConditions: 3,
//             linesWithMaxTrue: 1,
//             totalTrueConditions: 8
//         }
//     },
//     {
//         grid: Array(5).fill().map(() => Array(5).fill(null)),
//         stats: {
//             completedLines: 2,
//             maxTrueConditions: 5,
//             linesWithMaxTrue: 2,
//             totalTrueConditions: 15
//         }
//     }
// ];

// // Fill test boards with sample conditions
// testBoards.forEach(board => {
//     const conditions = [
//         { description: "Josh Allen TD", status: true },
//         { description: "Bills Score First", status: false },
//         { description: "Defensive TO", status: undefined },
//         { description: "Stefon Diggs TD", status: true },
//         { description: "50+ Yard Play", status: false }
//     ];

//     board.grid = board.grid.map(row => 
//         row.map(() => {
//             const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
//             return { ...randomCondition };
//         })
//     );

//     // Set center square
//     board.grid[2][2] = { description: "FREE SPACE", status: true };
// });


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
        this.boards = this.generateTestBoards();
        this.renderCurrentBoard();
        this.checkDeadline();
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
        const boards = [
            {
                username: "BillsMafia1",
                boardNumber: 1,
                grid: createGrid({ winningLine: 0 })  // Board with completed top row
            },
            {
                username: "BillsMafia2",
                boardNumber: 1,
                grid: createGrid({ partialLine: { row: 0, count: 4 } })  // Board with 4 true in top row
            },
            {
                username: "BillsFan1",
                boardNumber: 1,
                grid: createGrid({ partialLine: { row: 0, count: 4 } })  // Another board with 4 true
            },
            {
                username: "BillsFan2",
                boardNumber: 1,
                grid: createGrid({ partialLine: { row: 1, count: 3 } })  // Board with 3 true in a row
            },
            {
                username: "BillsFan3",
                boardNumber: 2,
                grid: createGrid()  // Random board
            }
        ];

        // Calculate real stats for each board
        return boards.map(board => ({
            ...board,
            stats: BoardStatsCalculator.calculateStats(board.grid)
        }));
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