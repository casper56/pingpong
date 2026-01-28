document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('pongCanvas');
    const ctx = canvas.getContext('2d');
    const btnStart = document.getElementById('btnStart');
    const btnPause = document.getElementById('btnPause');
    const rangeSpeed = document.getElementById('rangeSpeed');
    const spanSpeed = document.getElementById('speedValue');
    const overlay = document.getElementById('gameResult');

    // Game Constants
    const PADDLE_WIDTH = 100;
    const PADDLE_HEIGHT = 15;
    const BALL_SIZE = 10;
    const WINNING_SCORE = 10;

    // Game State
    let gameRunning = false;
    let gamePaused = false;
    let animationId;
    let baseSpeed = parseInt(rangeSpeed.value, 10);

    // Objects
    const ball = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        size: BALL_SIZE,
        speed: baseSpeed,
        dx: baseSpeed,
        dy: baseSpeed,
        color: 'red'
    };

    // Computer (Top)
    const computerPaddle = {
        x: canvas.width / 2 - PADDLE_WIDTH / 2,
        y: 10,
        width: PADDLE_WIDTH,
        height: PADDLE_HEIGHT,
        speed: 8, // Slightly slower than max speed maybe? or dynamic
        score: 0
    };

    // Player (Bottom)
    const playerPaddle = {
        x: canvas.width / 2 - PADDLE_WIDTH / 2,
        y: canvas.height - 10 - PADDLE_HEIGHT,
        width: PADDLE_WIDTH,
        height: PADDLE_HEIGHT,
        speed: 10,
        score: 0
    };

    // Input State
    const keys = {
        ArrowLeft: false,
        ArrowRight: false
    };

    // Event Listeners
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') keys.ArrowLeft = true;
        if (e.key === 'ArrowRight') keys.ArrowRight = true;
    });

    document.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowLeft') keys.ArrowLeft = false;
        if (e.key === 'ArrowRight') keys.ArrowRight = false;
    });

    // Mouse control
    canvas.addEventListener('mousemove', (e) => {
        if (gamePaused) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;

        playerPaddle.x = mouseX - playerPaddle.width / 2;

        // Clamp
        playerPaddle.x = Math.max(0, Math.min(canvas.width - playerPaddle.width, playerPaddle.x));

        // Optional: Redraw if waiting to start so user can position paddle
        if (!gameRunning) {
            draw();
        }
    });

    rangeSpeed.addEventListener('input', (e) => {
        baseSpeed = parseInt(e.target.value, 10);
        spanSpeed.textContent = baseSpeed;
        
        if (gameRunning && !gamePaused) {
            ball.speed = baseSpeed;
            // Normalize direction vector to apply new speed
            const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
            if (speed !== 0) {
                ball.dx = (ball.dx / speed) * baseSpeed;
                ball.dy = (ball.dy / speed) * baseSpeed;
            }
        }
    });

    btnStart.addEventListener('click', startGame);
    btnPause.addEventListener('click', togglePause);

    function resetBall(winner) {
        ball.speed = baseSpeed;
        ball.x = Math.random() * (canvas.width - ball.size);
        ball.y = canvas.height / 2;
        
        // Random X direction
        ball.dx = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 2 + 2); // Less X speed
        // Y direction based on winner or random? 
        // If computer won (ball went past bottom), serve to player (dy > 0)?
        // If player won (ball went past top), serve to computer (dy < 0)?
        // Or just random. Random is fair enough.
        ball.dy = (Math.random() > 0.5 ? 1 : -1) * ball.speed;
        
        // Ensure minimum vertical speed
        if (Math.abs(ball.dy) < ball.speed * 0.5) {
            ball.dy = (ball.dy > 0 ? 1 : -1) * ball.speed * 0.8;
        }
    }

    function startGame() {
        if (gameRunning) return;
        
        gameRunning = true;
        gamePaused = false;
        btnStart.disabled = true;
        btnStart.textContent = "遊戲進行中";
        btnPause.disabled = false;
        btnPause.style.display = 'inline-block';
        btnPause.textContent = "暫停";
        rangeSpeed.disabled = false;
        
        computerPaddle.score = 0;
        playerPaddle.score = 0;
        overlay.style.display = 'none';
        
        resetBall();
        loop();
    }

    function togglePause() {
        if (!gameRunning) return;
        
        gamePaused = !gamePaused;
        if (gamePaused) {
            btnPause.textContent = "繼續";
            cancelAnimationFrame(animationId);
        } else {
            btnPause.textContent = "暫停";
            loop();
        }
    }

    function endGame(winnerName) {
        gameRunning = false;
        gamePaused = false;
        btnStart.disabled = false;
        btnStart.textContent = "重新開始";
        btnPause.disabled = true;
        cancelAnimationFrame(animationId);
        
        overlay.textContent = `${winnerName} 獲勝!`;
        overlay.style.display = 'block';
    }

    function update() {
        if (gamePaused) return;

        // --- Player Movement ---
        if (keys.ArrowLeft) playerPaddle.x -= playerPaddle.speed;
        if (keys.ArrowRight) playerPaddle.x += playerPaddle.speed;

        // Clamp Player
        playerPaddle.x = Math.max(0, Math.min(canvas.width - playerPaddle.width, playerPaddle.x));

        // --- Computer AI Movement ---
        // Simple AI: Follow ball X
        // Add a bit of delay or error?
        // Center of paddle
        const computerCenter = computerPaddle.x + computerPaddle.width / 2;
        const ballCenter = ball.x + ball.size / 2;
        
        if (computerCenter < ballCenter - 10) {
            computerPaddle.x += computerPaddle.speed;
        } else if (computerCenter > ballCenter + 10) {
            computerPaddle.x -= computerPaddle.speed;
        }
        
        // Clamp Computer
        computerPaddle.x = Math.max(0, Math.min(canvas.width - computerPaddle.width, computerPaddle.x));

        // --- Ball Movement ---
        ball.x += ball.dx;
        ball.y += ball.dy;

        // --- Wall Collision (Left/Right) ---
        if (ball.x <= 0 || ball.x + ball.size >= canvas.width) {
            ball.dx *= -1;
        }

        // --- Paddle Collision ---
        
        // Computer (Top)
        if (
            ball.y <= computerPaddle.y + computerPaddle.height &&
            ball.y >= computerPaddle.y &&
            ball.x + ball.size >= computerPaddle.x &&
            ball.x <= computerPaddle.x + computerPaddle.width
        ) {
            // Hit computer paddle
            ball.dy = Math.abs(ball.dy); // Move down
            // Add some "english" based on where it hit the paddle?
            // (Optional)
        }

        // Player (Bottom)
        if (
            ball.y + ball.size >= playerPaddle.y &&
            ball.y + ball.size <= playerPaddle.y + playerPaddle.height &&
            ball.x + ball.size >= playerPaddle.x &&
            ball.x <= playerPaddle.x + playerPaddle.width
        ) {
            // Hit player paddle
            ball.dy = -Math.abs(ball.dy); // Move up
        }

        // --- Scoring ---
        // Ball goes past Top (Player Wins Point)
        if (ball.y < 0) {
            playerPaddle.score++;
            checkWin();
        } 
        // Ball goes past Bottom (Computer Wins Point)
        else if (ball.y > canvas.height) {
            computerPaddle.score++;
            checkWin();
        }
    }

    function checkWin() {
        if (playerPaddle.score >= WINNING_SCORE) {
            endGame("玩家");
        } else if (computerPaddle.score >= WINNING_SCORE) {
            endGame("電腦");
        } else {
            resetBall(); 
        }
    }

    function draw() {
        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw Net (Horizontal in center)
        ctx.strokeStyle = '#333';
        ctx.setLineDash([10, 15]);
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw Ball
        ctx.fillStyle = ball.color;
        ctx.fillRect(ball.x, ball.y, ball.size, ball.size);

        // Draw Paddles
        ctx.fillStyle = 'white';
        ctx.fillRect(computerPaddle.x, computerPaddle.y, computerPaddle.width, computerPaddle.height);
        ctx.fillRect(playerPaddle.x, playerPaddle.y, playerPaddle.width, playerPaddle.height);

        // Draw Scores (Rotated or positioned differently)
        ctx.font = '32px Arial';
        ctx.fillStyle = 'white';
        // Computer Score (Top Half)
        ctx.fillText(computerPaddle.score, 20, canvas.height / 2 - 20);
        // Player Score (Bottom Half)
        ctx.fillText(playerPaddle.score, 20, canvas.height / 2 + 50);
    }

    function loop() {
        update();
        draw();
        if (gameRunning && !gamePaused) {
            animationId = requestAnimationFrame(loop);
        }
    }

    // Initial Draw
    draw();
});