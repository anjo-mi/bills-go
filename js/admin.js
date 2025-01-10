class AdminDashboard {
    constructor() {
        if (!sessionStorage.getItem('isAdmin')) {
            window.location.href = '/login.html';
            return;
        }

        this.unverifiedBoards = [];

        this.loadAllData();
        this.setupEventListeners();
    }

    async loadAllData() {
        // Load all sections
        await Promise.all([
            this.loadUsers(),
            this.loadUnverifiedBoards(),
            this.loadConditions()
        ]);
    }

    async loadUsers() {
        try {
            const response = await fetch('/admin/users', {
                headers: {
                    'sessionid': sessionStorage.getItem('sessionId')
                }
            });
            
            if (response.ok) {
                const users = await response.json();
                this.displayUsers(users);
            }else{
                const error = await response.json();
                alert(error.error || 'error loading users')
            }
        } catch (error) {
            console.error('Error loading users:', error);
            alert('error loading users')
        }
    }

    displayUsers(users) {
        const userList = document.querySelector('.user-list');
        userList.innerHTML = users.map(user => `
            <div class="user-item" data-userid="${user._id}">
                <span class="username">${user.username}</span>
                <span class="board-count">Boards: ${user.boardCount}</span>
                ${user.isAdmin ? 
                    '<span class="admin-badge">Admin</span>' : 
                    '<button class="delete-user-btn">Delete</button>'
                }
            </div>
        `).join('');

        document.querySelectorAll('.delete-user-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const userItem = e.target.closest('.user-item');
                const userId = userItem.dataset.userid;

                if (confirm(`delete ${userItem.querySelector('.username').textContent}?`)){
                    await this.deleteUser(userId);
                }
            });
        });
    }

    async loadUnverifiedBoards() {
        try {
            const response = await fetch('/admin/unverified-boards', {
                headers: {
                    'sessionid': sessionStorage.getItem('sessionId')
                }
            });
            
            if (response.ok) {
                this.unverifiedBoards = await response.json();
                this.displayUnverifiedBoards(this.unverifiedBoards);
            }else{
            }
        } catch (error) {
            console.error('Error loading unverified boards:', error);
        }
    }

    displayUnverifiedBoards(boards) {
        console.log('details of boards:', boards.map(board => ({
            userId: boards.userId,
            boardIndex: board.boardIndex,
            username: board.username
        })))


        console.log('Received boards:', boards); // Debug log
        const boardList = document.querySelector('.board-list');
        boardList.innerHTML = boards.map(board => `
            <div class="board-item">
                <span>User: ${board.username}</span>
                <div class="board-actions">
                    <button class="view-board-btn" 
                            data-userid="${board.userId.toString()}" 
                            data-boardindex="${board.boardIndex}">View</button>
                    <button class="verify-board-btn" 
                            data-userid="${board.userId.toString()}" 
                            data-boardindex="${board.boardIndex}">Verify</button>
                </div>
            </div>
        `).join('');

        console.log('board items: ', document.querySelectorAll('.board-item'));


        boardList.querySelectorAll('.verify-board-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const userId = e.target.dataset.userid;
                const boardIndex = e.target.dataset.boardindex;
                console.log('Verifying board:', { userId, boardIndex }); // Debug log
                await this.verifyBoard(userId, boardIndex);
            });
        });
    
        boardList.querySelectorAll('.view-board-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.target.dataset.userid;
                const boardIndex = e.target.dataset.boardindex;
                console.log('Viewing board:', { userId, boardIndex }); // Debug log
                this.viewBoard(userId, boardIndex);
            });
        });
    }

    async loadConditions() {
        try {
            const response = await fetch('/admin/conditions', {
                headers: {
                    'sessionid': sessionStorage.getItem('sessionId')
                }
            });
            
            if (response.ok) {
                const conditions = await response.json();
                this.displayConditions(conditions);
            }
        } catch (error) {
            console.error('Error loading conditions:', error);
        }
    }

    displayConditions(conditions) {
        const conditionList = document.querySelector('.condition-list');
        conditionList.innerHTML = conditions.map(condition => `
            <div class="condition-item">
                <span>${condition.description}</span>
                <select class="condition-status" data-condition="${condition.description}">
                    <option value="undefined" ${!condition.status ? 'selected' : ''}>Undefined</option>
                    <option value="true" ${condition.status === true ? 'selected' : ''}>True</option>
                    <option value="false" ${condition.status === false ? 'selected' : ''}>False</option>
                </select>
            </div>
        `).join('');
    }

    setupEventListeners() {
        // Delete user
        document.querySelector('.user-list').addEventListener('click', async (e) => {
            if (e.target.classList.contains('delete-user-btn')) {
                const userId = e.target.closest('.user-item').dataset.userid;
                if (confirm('Are you sure you want to delete this user?')) {
                    await this.deleteUser(userId);
                }
            }
        });

        // Verify board
        document.querySelector('.board-list').addEventListener('click', async (e) => {
            const boardItem = e.target.closest('.board-item');
            if (!boardItem) return;

            const boardId = boardItem.dataset.boardid;
            if (e.target.classList.contains('verify-board-btn')) {
                await this.verifyBoard(boardId);
            } else if (e.target.classList.contains('view-board-btn')) {
                this.viewBoard(boardId);
            }
        });

        // Update condition status
        document.querySelector('.condition-list').addEventListener('change', async (e) => {
            if (e.target.classList.contains('condition-status')) {
                const description = e.target.dataset.condition;
                const status = e.target.value;
                await this.updateConditionStatus(description, status);
            }
        });
    }

    async deleteUser(userId) {
        try {
            const response = await fetch(`/admin/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'sessionid': sessionStorage.getItem('sessionId')
                }
            });

            if (response.ok) {
                await this.loadUsers(); // Refresh user list
            }else{
                const error = await response.json();
                alert(error.error || 'error deleting user')
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('error deleting user')
        }
    }

    async verifyBoard(userId, boardIndex) {
        console.log('sending ver. req', {userId, boardIndex});
        try {
            const response = await fetch(`/admin/boards/${userId}/${boardIndex}/verify`, {
                method: 'PUT',
                headers: {
                    'sessionid': sessionStorage.getItem('sessionId')
                }
            });
    
            if (response.ok) {
                // Refresh board list after verification
                await this.loadUnverifiedBoards();
            } else {
                const error = await response.json();
                alert(error.error || 'Error verifying board');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error verifying board');
        }
    }

    viewBoard(userId, boardIndex) {
        const board = this.unverifiedBoards.find(b => 
            b.userId === userId && b.boardIndex === boardIndex
        ).board;
    
        const modal = document.getElementById('boardModal');
        const modalBoard = document.getElementById('modalBoard');
    
        modalBoard.innerHTML = '';
        
        // Create the grid
        board.forEach(row => {
            row.forEach(cell => {
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

    async updateConditionStatus(description, status) {
        try {
            const response = await fetch('/admin/conditions', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'sessionid': sessionStorage.getItem('sessionId')
                },
                body: JSON.stringify({
                    description,
                    status: status === 'undefined' ? undefined : status === 'true'
                })
            });

            if (response.ok) {
                await this.loadConditions(); // Refresh conditions
            }
        } catch (error) {
            console.error('Error updating condition:', error);
        }
    }

    viewBoard(boardId) {
        // Implement board viewing logic
        // Could open in modal or new page
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AdminDashboard();
});