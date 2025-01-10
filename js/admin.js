class AdminDashboard {
    constructor() {
        // Verify admin status
        if (!sessionStorage.getItem('isAdmin')) {
            window.location.href = '/login.html';
            return;
        }

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
            }
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    displayUsers(users) {
        const userList = document.querySelector('.user-list');
        userList.innerHTML = users.map(user => `
            <div class="user-item" data-userid="${user._id}">
                <span>${user.username}</span>
                <span>Boards: ${user.boards.length}</span>
                ${user.isAdmin ? 
                    '<span class="admin-badge">Admin</span>' : 
                    '<button class="delete-user-btn">Delete</button>'
                }
            </div>
        `).join('');
    }

    async loadUnverifiedBoards() {
        try {
            const response = await fetch('/admin/unverified-boards', {
                headers: {
                    'sessionid': sessionStorage.getItem('sessionId')
                }
            });
            
            if (response.ok) {
                const boards = await response.json();
                this.displayUnverifiedBoards(boards);
            }
        } catch (error) {
            console.error('Error loading unverified boards:', error);
        }
    }

    displayUnverifiedBoards(boards) {
        const boardList = document.querySelector('.board-list');
        boardList.innerHTML = boards.map(board => `
            <div class="board-item" data-boardid="${board._id}">
                <span>User: ${board.username}</span>
                <button class="view-board-btn">View</button>
                <button class="verify-board-btn">Verify</button>
            </div>
        `).join('');
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
            }
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    }

    async verifyBoard(boardId) {
        try {
            const response = await fetch(`/admin/boards/${boardId}/verify`, {
                method: 'PUT',
                headers: {
                    'sessionid': sessionStorage.getItem('sessionId')
                }
            });

            if (response.ok) {
                await this.loadUnverifiedBoards(); // Refresh board list
            }
        } catch (error) {
            console.error('Error verifying board:', error);
        }
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