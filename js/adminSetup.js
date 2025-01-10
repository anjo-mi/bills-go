document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('adminSetupForm');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const adminData = {
            username: document.getElementById('username').value,
            password: document.getElementById('password').value
        };

        try {
            const response = await fetch('/create-admin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(adminData)
            });

            const data = await response.json();
            if (response.ok) {
                alert('Admin account created successfully');
                window.location.href = '/login.html';
            } else {
                alert(data.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error creating admin account');
        }
    });
});