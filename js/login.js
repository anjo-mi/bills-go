document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const loginBtn = document.querySelector('.login-btn');
    const signupBtn = document.querySelector('.signup-btn');

    // Prevent default form submission on enter key
    form.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
        }
    });

    loginBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Here you'll add the actual login logic once we set up the backend
        console.log('Login attempt:', { username, password });
        
        // For now, just redirect to userHome
        window.location.href = '/userHome.html';
    });

    signupBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Here you'll add the actual signup logic once we set up the backend
        console.log('Signup attempt:', { username, password });
        
        // For now, just redirect to userHome
        window.location.href = '/userHome.html';
    });
});