class LeaderboardManager {
    constructor() {
        this.boards = [];
        this.setupEventListeners();
        this.loadBoards();
    }

    setupEventListeners() {
        // Modal close button
        document.querySelector('.close-modal').addEventListener('click', () => {
            this.closeModal();
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('boardModal')) {
                this.closeModal();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById('boardModal').style.display === 'block') {
                this.closeModal();
            }
        });
    }

    loadBoards() {
        // This would normally fetch from server - using test data for now
        this.boards = this.generateTestBoards();
        this.displayBoards();
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

    displayBoards() {
        const winners = this.boards.filter(board => board.stats.completedLines > 0);
        const participants = this.boards.filter(board => board.stats.completedLines === 0);

        // Display winners
        const winnersContainer = document.getElementById('winnersContainer');
        winnersContainer.innerHTML = '';

        if (winners.length === 0) {
            winnersContainer.innerHTML = `
                <div class="no-winners">
                    No Winners as of yet
                </div>
            `;
        } else {
            winners.forEach(board => {
                winnersContainer.appendChild(this.createBoardEntry(board, true));
            });
        }

        // Display sorted participants
        const sortedParticipants = this.sortBoards(participants);
        const participantsContainer = document.getElementById('participantsContainer');
        participantsContainer.innerHTML = '';
        sortedParticipants.forEach(board => {
            participantsContainer.appendChild(this.createBoardEntry(board, false));
        });
    }

    createBoardEntry(board, isWinner) {
        const entry = document.createElement('div');
        entry.className = `board-entry ${isWinner ? 'winner' : ''}`;
        entry.innerHTML = `
            <div class="board-info">
                <div class="username">Username: ${board.username} Board: ${board.boardNumber}</div>
                <div class="board-stats">
                    Closest Line: ${board.stats.maxTrueConditions}, 
                    Lines w/ Most: ${board.stats.linesWithMaxTrue}
                </div>
            </div>
            <button class="view-board-btn">View Board</button>
        `;

        entry.querySelector('.view-board-btn').addEventListener('click', () => {
            this.showBoardModal(board);
        });

        return entry;
    }

    showBoardModal(board) {
        const modal = document.getElementById('boardModal');
        const modalUsername = document.getElementById('modalUsername');
        const modalBoard = document.getElementById('modalBoard');

        // Update modal content
        modalUsername.textContent = `${board.username}'s Board`;
        document.getElementById('modalCompletedLines').textContent = board.stats.completedLines;
        document.getElementById('modalMaxTrue').textContent = board.stats.maxTrueConditions;
        document.getElementById('modalLinesWithMax').textContent = board.stats.linesWithMaxTrue;
        document.getElementById('modalTotalTrue').textContent = board.stats.totalTrueConditions;

        // Clear and populate board
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

        const createGrid = (winningLine = false) => {
            const grid = Array(5).fill(null).map(() => Array(5).fill(null));
            
            // Add center FREE SPACE
            grid[2][2] = { description: "FREE SPACE", status: true };

            // If winningLine is true, make first row all true
            if (winningLine) {
                for (let j = 0; j < 5; j++) {
                    grid[0][j] = { description: `Condition ${j+1}`, status: true };
                }
            }

            // Fill rest of grid with a mix of statuses
            for (let i = 0; i < 5; i++) {
                for (let j = 0; j < 5; j++) {
                    if (grid[i][j]) continue; // Skip if already filled
                    
                    // Ensure some true conditions (about 30% chance)
                    const randomStatus = Math.random();
                    let status;
                    if (randomStatus < 0.3) {
                        status = true;
                    } else if (randomStatus < 0.6) {
                        status = false;
                    } else {
                        status = undefined;
                    }
                    
                    const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
                    grid[i][j] = { 
                        description: randomCondition.description, 
                        status: status 
                    };
                }
            }
            return grid;
        };

        // Create test boards with calculated stats
        const boards = [
            {
                username: "BillsMafia1",
                boardNumber: 1,
                grid: createGrid(true)  // This one will have a winning line
            },
            {
                username: "BillsMafia2",
                boardNumber: 1,
                grid: createGrid(true)  // This one will have a winning line
            },
            {
                username: "BillsFan1",
                boardNumber: 1,
                grid: createGrid(false)
            },
            {
                username: "BillsFan2",
                boardNumber: 1,
                grid: createGrid(false)
            },
            {
                username: "BillsFan3",
                boardNumber: 2,
                grid: createGrid(false)
            }
        ];

        // Calculate stats for each board
        return boards.map(board => ({
            ...board,
            stats: BoardStatsCalculator.calculateStats(board.grid)
        }));
    }
}


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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LeaderboardManager();
});