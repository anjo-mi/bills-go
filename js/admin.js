class AdminDashboard {
    constructor() {
        if (!sessionStorage.getItem('isAdmin')) {
            window.location.href = '/login.html';
            return;
        }

        this.unverifiedBoards = [];
        this.allBoards = [];

        this.loadAllData();
        this.setupEventListeners();
    }

    async loadAllData() {
        // Load all sections
        await Promise.all([
            this.loadUsers(),
            this.loadUnverifiedBoards(),
            this.loadAllBoards(),
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
        
        // Remove any existing event listeners
        const oldList = userList.cloneNode(false);
        userList.parentNode.replaceChild(oldList, userList);
        
        oldList.innerHTML = users.map(user => `
            <div class="user-item" data-userid="${user._id}">
                <span class="username">${user.username}</span>
                <span class="board-count">Boards: ${user.boardCount}</span>
                ${user.isAdmin ? 
                    '<span class="admin-badge">Admin</span>' : 
                    `<button class="delete-user-btn">Delete User</button>`
                }
            </div>
        `).join('');
    
        // Use single event listener with event delegation
        oldList.addEventListener('click', async (e) => {
            if (e.target.classList.contains('delete-user-btn')) {
                const userItem = e.target.closest('.user-item');
                const userId = userItem.dataset.userid;
                
                if (confirm('Are you sure you want to delete this user?')) {
                    await this.deleteUser(userId);
                }
            }
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
        const boardList = document.querySelector('.board-list');
        boardList.innerHTML = boards.map(board => `
            <div class="board-item">
                <span>User: ${board.username} - Board #${board.boardNumber}</span>
                <button class="verify-board-btn" 
                    onclick="event.stopPropagation(); return false;"
                    data-userid="${board.userId}" 
                    data-boardindex="${board.boardIndex}">Verify</button>
            </div>
        `).join('');
    
        // Add event listeners separately
        document.querySelectorAll('.verify-board-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const userId = button.getAttribute('data-userid');
                const boardIndex = button.getAttribute('data-boardindex');
                if (userId && boardIndex) {
                    await this.verifyBoard(userId, boardIndex);
                } else {
                    console.error('Missing data attributes:', { userId, boardIndex });
                }
            });
        });
    }

    async loadAllBoards() {
        try {
            const response = await fetch('/all-boards', {
                headers: {
                    'sessionid': sessionStorage.getItem('sessionId')
                }
            });
            
            if (response.ok) {
                this.allBoards = await response.json();
                this.displayAllBoards(this.allBoards);
            }else{
            }
        } catch (error) {
            console.error('Error loading all boards:', error);
        }
    }

    displayAllBoards(boards) {
        const boardList = document.querySelector('.all-boards');
        boardList.innerHTML = boards.map(board => `
            <div class="board-item">
                <span>User: ${board.username} - Board #${board.boardNumber}</span>
                <button class="delete-board-btn" 
                    onclick="event.stopPropagation(); return false;"
                    data-userid="${board.userId}" 
                    data-boardindex="${board.boardNumber - 1}">Delete</button>
            </div>
        `).join('');
    
        // Add event listeners separately
        document.querySelectorAll('.delete-board-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                
                e.preventDefault();
                e.stopPropagation();
                const userId = button.getAttribute('data-userid');
                const boardIndex = parseInt(button.getAttribute('data-boardindex')); // Add parseInt here
                if (userId && boardIndex !== undefined) {
                    if (confirm('Are you sure you want to delete this board?')) {
                        await this.deleteBoard(userId, boardIndex);
                    }
                } else {
                    console.error('Missing data attributes:', { userId, boardIndex });
                }
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
        // End Game
        document.getElementById('end').addEventListener('click', async () => {
            const response = await fetch('/end', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'sessionid': sessionStorage.getItem('sessionId')
                }
            });
            if (response.ok){
                alert('winner updated');
            }else{
                console.error(await response.json());
                alert('error ending game')
            }
        });

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
    
            const data = await response.json();
    
            if (response.ok) {
                // Only refresh if delete was successful
                await this.loadUsers();
            } else {
                alert(data.error || 'Error deleting user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Error deleting user');
        }
    }

    async deleteBoard(userId, boardIndex) {
        if (!userId || boardIndex === undefined) {
            console.error('Invalid parameters:', { userId, boardIndex });
            return;
        }
    
        try {
            const response = await fetch('/delete-board', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'sessionid': sessionStorage.getItem('sessionId')
                },
                body: JSON.stringify({ 
                    userId, 
                    boardIndex: boardIndex // It's already a number from parseInt above
                })
            });
    
            if (response.ok) {
                await this.loadAllBoards(); // Reload the list after successful deletion
            } else {
                const error = await response.json();
                console.error('Error deleting board:', error);
            }
        } catch (error) {
            console.error('Error deleting board:', error);
        }
    }

    async verifyBoard(userId, boardIndex) {
        if (!userId || !boardIndex) {
            console.error('Invalid parameters:', { userId, boardIndex });
            return;
        }
    
        try {
            const response = await fetch(`/admin/boards/${userId}/${boardIndex}/verify`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'sessionid': sessionStorage.getItem('sessionId')
                }
            });
    
            if (response.ok) {
                await this.loadUnverifiedBoards();
            } else {
                const error = await response.json();
                alert(`Error verifying board: ${error.error}`);
            }
        } catch (error) {
            console.error('Verification error:', error);
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