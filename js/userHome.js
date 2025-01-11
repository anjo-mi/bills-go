document.addEventListener('DOMContentLoaded', () => {
    const sessionId = sessionStorage.getItem('sessionId');
    const expires = new Date(sessionStorage.getItem('sessionExpires'));
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    
    if (!sessionId || !isLoggedIn || expires < new Date()) {
        window.location.href = '/login.html';
    }
});


class BoardStatsCalculator {
    static calculateStats(boardData) {
        // Handle both formats - extract grid if it's a verified board object
        const grid = Array.isArray(boardData) ? boardData : boardData.grid;
        
        const results = {
            completedLines: 0,
            maxTrueConditions: 0,
            linesWithMaxTrue: 0,
            totalTrueConditions: this._countTotalTrueConditions(grid),
            linesByTrueCount: new Map(),
            isVerified: !Array.isArray(boardData) && boardData.isVerified
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
        
        if (trueCount === 5) {
            results.completedLines++;
        }

        if (trueCount > 1) {
            if (trueCount > results.maxTrueConditions) {
                results.maxTrueConditions = trueCount;
                results.linesWithMaxTrue = 1;
            } else if (trueCount === results.maxTrueConditions) {
                results.linesWithMaxTrue++;
            }

            const currentCount = results.linesByTrueCount.get(trueCount) || 0;
            results.linesByTrueCount.set(trueCount, currentCount + 1);
        }
    }

    static _countTotalTrueConditions(grid) {
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
        this.username = sessionStorage.getItem('username')
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

    async loadUserBoards() {
        try {
            const response = await fetch('/user-boards', {
                method: 'GET',
                headers: {
                    'sessionid': sessionStorage.getItem('sessionId'),
                    'username': this.username
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.boards = data.boards;
                this.displayUserInfo();
                this.displayBoards();
            } else {
                const errorData = await response.json();
                console.error('Server error:', errorData);
                alert(`Error loading boards: ${errorData.error}`);
            }
        } catch(err) {
            console.error('Error in loadUserBoards:', err);
            alert(`Error: ${err.message}`);
        }
    }

    displayUserInfo() {
        document.getElementById('username').textContent = this.username;
        document.getElementById('boardCount').textContent = this.boards.length;
        
        const bestLine = Math.max(...this.boards.map(board => {
            const stats = BoardStatsCalculator.calculateStats(board);
            return stats.maxTrueConditions;
        }));
        document.getElementById('bestLine').textContent = bestLine;
    }

    displayBoards() {
        const boardsList = document.getElementById('boardsList');
        boardsList.innerHTML = '';

        this.boards.forEach((board, index) => {
            const stats = BoardStatsCalculator.calculateStats(board);
            boardsList.appendChild(this.createBoardEntry(board, index + 1, stats));
        });
    }

    sortBoards(boards) {
        return boards.sort((a, b) => {
            const statsA = BoardStatsCalculator.calculateStats(a);
            const statsB = BoardStatsCalculator.calculateStats(b);

            if (statsA.maxTrueConditions !== statsB.maxTrueConditions) {
                return statsB.maxTrueConditions - statsA.maxTrueConditions;
            }

            if (statsA.linesWithMaxTrue !== statsB.linesWithMaxTrue) {
                return statsB.linesWithMaxTrue - statsA.linesWithMaxTrue;
            }

            for (let count = statsA.maxTrueConditions - 1; count >= 2; count--) {
                const aLines = statsA.linesByTrueCount.get(count) || 0;
                const bLines = statsB.linesByTrueCount.get(count) || 0;
                if (aLines !== bLines) {
                    return bLines - aLines;
                }
            }

            return statsB.totalTrueConditions - statsA.totalTrueConditions;
        });
    }

    createBoardEntry(board, number, stats) {
        const entry = document.createElement('div');
        const isVerified = !Array.isArray(board) && board.isVerified;
        entry.className = `board-entry ${stats.completedLines > 0 ? 'winning' : ''} ${isVerified ? 'verified' : ''}`;
        entry.innerHTML = `
            <div class="board-info">
                <div class="username">Board ${number} ${isVerified ? '(Verified)' : ''}</div>
                <div class="board-stats">
                    Closest Line: ${stats.maxTrueConditions}, 
                    Lines w/ Most: ${stats.linesWithMaxTrue}
                </div>
            </div>
            <button class="view-board-btn">View Board</button>
        `;

        entry.querySelector('.view-board-btn').addEventListener('click', () => {
            this.showBoardModal(board, number, stats);
        });

        return entry;
    }

    showBoardModal(board, number, stats) {
        const modal = document.getElementById('boardModal');
        const modalBoard = document.getElementById('modalBoard');
        const grid = Array.isArray(board) ? board : board.grid;

        document.getElementById('modalBoardNumber').textContent = `${number}${!Array.isArray(board) && board.isVerified ? ' (Verified)' : ''}`;
        document.getElementById('modalCompletedLines').textContent = stats.completedLines;
        document.getElementById('modalMaxTrue').textContent = stats.maxTrueConditions;
        document.getElementById('modalLinesWithMax').textContent = stats.linesWithMaxTrue;
        document.getElementById('modalTotalTrue').textContent = stats.totalTrueConditions;

        modalBoard.innerHTML = '';
        grid.forEach((row) => {
            row.forEach((cell) => {
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
}

document.addEventListener('DOMContentLoaded', () => {
    new UserHomeManager();
});