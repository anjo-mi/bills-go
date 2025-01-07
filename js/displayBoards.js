const testBoards = [
    {
        grid: Array(5).fill().map(() => Array(5).fill(null)),
        stats: {
            completedLines: 1,
            maxTrueConditions: 4,
            linesWithMaxTrue: 2,
            totalTrueConditions: 12
        }
    },
    {
        grid: Array(5).fill().map(() => Array(5).fill(null)),
        stats: {
            completedLines: 0,
            maxTrueConditions: 3,
            linesWithMaxTrue: 1,
            totalTrueConditions: 8
        }
    },
    {
        grid: Array(5).fill().map(() => Array(5).fill(null)),
        stats: {
            completedLines: 2,
            maxTrueConditions: 5,
            linesWithMaxTrue: 2,
            totalTrueConditions: 15
        }
    }
];

// Fill test boards with sample conditions
testBoards.forEach(board => {
    const conditions = [
        { description: "Josh Allen TD", status: true },
        { description: "Bills Score First", status: false },
        { description: "Defensive TO", status: undefined },
        { description: "Stefon Diggs TD", status: true },
        { description: "50+ Yard Play", status: false }
    ];

    board.grid = board.grid.map(row => 
        row.map(() => {
            const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
            return { ...randomCondition };
        })
    );

    // Set center square
    board.grid[2][2] = { description: "FREE SPACE", status: true };
});

class BoardsDisplay {
    constructor() {
        this.currentBoardIndex = 0;
        this.boards = testBoards;
        this.setupEventListeners();
        this.renderCurrentBoard();
        this.checkDeadline();
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