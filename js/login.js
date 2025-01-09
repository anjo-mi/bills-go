class User {
    constructor(username, password) {
        this.username = username;
        this.password = password;
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

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');

    loginBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const user = new User(
            document.getElementById('username').value,
            document.getElementById('password').value
        );

        try {
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(user)
            });

            if (response.ok) {
                const sessionData = await response.json();
                sessionStorage.setItem('sessionId', sessionData.sessionId);
                sessionStorage.setItem('username', sessionData.username);
                sessionStorage.setItem('sessionExpires', sessionData.expiresAt);
                window.location.href = '/index.html';
            } else {
                alert('Invalid username or password');
            }
        } catch (error) {
            console.error('Login error:', error);
        }
    });

    signupBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const user = new User(
            document.getElementById('username').value,
            document.getElementById('password').value
        );

        try {
            const response = await fetch('/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(user)
            });

            if (response.ok) {
                const sessionData = await response.json();
                sessionStorage.setItem('sessionId', sessionData.sessionId);
                sessionStorage.setItem('username', sessionData.username);
                sessionStorage.setItem('sessionExpires', sessionData.expiresAt);
                window.location.href = '/index.html';
            } else {
                alert('Username already exists');
            }
        } catch (error) {
            console.error('Signup error:', error);
        }
    });
});