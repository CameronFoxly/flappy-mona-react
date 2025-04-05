import React, { useEffect, useRef, useState, useCallback } from 'react';

function App() {
  const canvasRef = useRef(null);
  const birdVelocityRef = useRef(0); // Use useRef for birdVelocity
  const obstaclesRef = useRef([]); // Use useRef for obstacles
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false); // Track if the game has started
  const [showStartMessage, setShowStartMessage] = useState(true); // Track if the start message is visible

  const flapStrength = -6;
  const obstacleWidth = 135; // Width of each obstacle
  const obstacleGap = 400; // Update the gap between obstacles to 400px
  const obstacleSpacing = 200; // Horizontal spacing between obstacles
  const obstacleSpeed = 1.5; // Speed of obstacle movement

  // Add a function to reset the game state
  const resetGame = (canvas) => {
    birdVelocityRef.current = 0; // Reset bird velocity
    setIsGameOver(false); // Reset game over state
    setIsGameStarted(false); // Reset game started state
    setShowStartMessage(true); // Show the start message
    setScore(0); // Reset the score
    obstaclesRef.current = []; // Clear all obstacles

    // Reset bird position
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'yellow';
    context.beginPath();
    context.arc(100, canvas.height / 2, 48, 0, Math.PI * 2);
    context.fill();

    // Spawn initial obstacles
    spawnInitialObstacles(canvas);
  };

  // Move handleInput above handleKeyDown to fix the initialization error
  const handleInput = useCallback(() => {
    if (showStartMessage) {
      setShowStartMessage(false); // Hide the start message
    }
    if (isGameOver) {
      resetGame(canvasRef.current); // Reset the game
    } else if (!isGameStarted) {
      setIsGameStarted(true);
      birdVelocityRef.current = -6; // Trigger a flap on the first input
    } else {
      birdVelocityRef.current = -6; // Flap strength
    }
  }, [isGameOver, isGameStarted, showStartMessage]);

  // Update the keydown handler to reset the game on space press when game is over
  const handleKeyDown = useCallback((event) => {
    if (event.code === 'Space') {
      handleInput();
    }
  }, [handleInput]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // Redraw the initial state of the game after resizing
      context.clearRect(0, 0, canvas.width, canvas.height);

      // Draw the bird in its initial position
      context.fillStyle = 'yellow';
      context.beginPath();
      context.arc(100, canvas.height / 2, 48, 0, Math.PI * 2);
      context.fill();

      // Adjust obstacle positions to be anchored relative to the middle of the window
      const previousCanvasMiddleY = canvas.height / 2;
      const newCanvasMiddleY = window.innerHeight / 2;
      obstaclesRef.current.forEach((obstacle) => {
        const offsetFromMiddle = obstacle.topHeight - previousCanvasMiddleY;
        obstacle.topHeight = newCanvasMiddleY + offsetFromMiddle;
        obstacle.bottomY = obstacle.topHeight + obstacleGap;
      });

      // Draw initial obstacles
    
      for (let i = 0; i < obstaclesRef.current.length; i++) {
          context.fillStyle = 'green';
        const obstacle = obstaclesRef.current[i];
        // Draw top obstacle
        context.fillRect(obstacle.x, 0, obstacleWidth, obstacle.topHeight);
        // Draw bottom obstacle
        context.fillStyle = 'red';
        context.fillRect(
          obstacle.x,
          obstacle.bottomY,
          obstacleWidth,
          canvas.height - obstacle.bottomY
        );
      }
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas(); // Set initial canvas size and draw content

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  const generateObstacle = (xPosition, canvas) => {
    const minGapY = 100; // Start 100px from the top of the window
    const maxGapY = canvas.height - 100 - obstacleGap; // End 100px from the bottom of the window
    const gapY = Math.floor(Math.random() * (maxGapY - minGapY + 1)) + minGapY; // Use Math.floor for consistent integer values

    return {
      x: xPosition,
      topHeight: gapY,
      bottomY: gapY + obstacleGap, // Ensure consistent gap
    };
  };

  const spawnInitialObstacles = (canvas) => {
    for (let i = 0; i < 5; i++) { // Spawn 5 obstacles initially
      const xPosition = 450 + i * (obstacleWidth + obstacleSpacing); // Start 300px further to the right
      obstaclesRef.current.push(generateObstacle(xPosition, canvas));
    }
  };

  const spawnObstacle = (canvas) => {
    const lastObstacle = obstaclesRef.current[obstaclesRef.current.length - 1];
    const xPosition = lastObstacle.x + obstacleWidth + obstacleSpacing;
    obstaclesRef.current.push(generateObstacle(xPosition, canvas));
  };

  const bufferObstacles = (canvas) => {
    const lastObstacle = obstaclesRef.current[obstaclesRef.current.length - 1];
    if (lastObstacle && lastObstacle.x + obstacleWidth + obstacleSpacing < canvas.width) {
      spawnObstacle(canvas);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    spawnInitialObstacles(canvas); // Spawn obstacles when the game initializes
    spawnObstacle(canvas);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    let birdY = canvas.height / 2;
    const gravity = 0.2; // Adjusted gravity to make it less strong

    const gameLoop = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);

      if (!isGameStarted) {
        // Draw the bird in its initial position
        context.fillStyle = 'yellow';
        context.beginPath();
        context.arc(100, birdY, 48, 0, Math.PI * 2);
        context.fill();

        // Draw initial obstacles
        context.fillStyle = 'green';
        for (let i = 0; i < obstaclesRef.current.length; i++) {
          const obstacle = obstaclesRef.current[i];
          // Draw top obstacle
          context.fillStyle = 'green';
          context.fillRect(obstacle.x, 0, obstacleWidth, obstacle.topHeight);
          // Draw bottom obstacle
          context.fillStyle = 'red';
          context.fillRect(
            obstacle.x,
            obstacle.bottomY,
            obstacleWidth,
            canvas.height - obstacle.bottomY
          );
        }
        return;
      }

      // Apply gravity and update bird's position
      birdVelocityRef.current += gravity;
      birdY += birdVelocityRef.current;

      // Draw the bird
      context.fillStyle = 'yellow';
      context.beginPath();
      context.arc(100, birdY, 48, 0, Math.PI * 2);
      context.fill();

      // Move obstacles
      for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
        const obstacle = obstaclesRef.current[i];
        obstacle.x -= obstacleSpeed;

        // Draw top obstacle
        context.fillStyle = 'green'; // Sets the color for the obstacles
        context.fillRect(obstacle.x, 0, obstacleWidth, obstacle.topHeight);

        // Draw bottom obstacle
        context.fillStyle = 'red';
        context.fillRect(
          obstacle.x,
          obstacle.bottomY,
          obstacleWidth,
          canvas.height - obstacle.bottomY
        );

        // Remove obstacles that go off-screen
        if (obstacle.x + obstacleWidth < 0) {
          obstaclesRef.current.splice(i, 1);
        }
      }

      // Add collision detection logic
      const checkCollision = (birdY, canvas) => {
        const birdRadius = 48; // Radius of the bird
        const birdX = 100; // Fixed horizontal position of the bird
      
        for (let i = 0; i < obstaclesRef.current.length; i++) {
          const obstacle = obstaclesRef.current[i];
      
          // Check collision with top obstacle
          if (
            birdX + birdRadius > obstacle.x &&
            birdX - birdRadius < obstacle.x + obstacleWidth &&
            birdY - birdRadius < obstacle.topHeight
          ) {
            return true;
          }
      
          // Check collision with bottom obstacle
          if (
            birdX + birdRadius > obstacle.x &&
            birdX - birdRadius < obstacle.x + obstacleWidth &&
            birdY + birdRadius > obstacle.bottomY
          ) {
            return true;
          }
        }
      
        // Check if the bird hits the ground
        if (birdY + birdRadius > canvas.height) {
          return true;
        }
      
        return false;
      };
      
      // Update game loop to include collision logic
      if (checkCollision(birdY, canvas)) {
        setIsGameOver(true);
        setTimeout(() => {
          // Display game over message after 0.5 seconds
          setIsGameOver(true);
        }, 500);
        return;
      }

      // Check if the bird hits the ground or flies off the screen
      if (birdY + 48 > canvas.height) {
        setIsGameOver(true);
        return;
      }

      // Buffer new obstacles
      bufferObstacles(canvas);

      // Refine score increment logic to prevent double counting
      const updateScore = () => {
        for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
          const obstacle = obstaclesRef.current[i];
      
          // Ensure the score increments only once per obstacle
          if (!obstacle.passed && obstacle.x + obstacleWidth < 100) {
            obstacle.passed = true; // Mark the obstacle as passed
            setScore((prevScore) => prevScore + 1); // Increment the score
            console.log(`Score incremented! Current score: ${score + 1}`); // Debug log
          }
        }
      };
      
      // Call updateScore in the game loop
      updateScore();

      if (!isGameOver) {
        requestAnimationFrame(gameLoop);
      }
    };

    if (!isGameOver) {
      gameLoop();
    }
  }, [isGameOver, isGameStarted]);

  useEffect(() => {
    const handleMouseDown = () => handleInput();
    const handleTouchStart = () => handleInput();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('touchstart', handleTouchStart);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, [handleKeyDown, handleInput]);

  return (
    <div className="App">
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: -1 }} />
      <div
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          color: 'white',
          fontSize: '24px',
          fontFamily: 'Arial, sans-serif',
          zIndex: 1, // Ensure score text is on top
        }}
      >
        Score: {score}
      </div>
      {showStartMessage && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            fontSize: '32px',
            fontFamily: 'Arial, sans-serif',
            textAlign: 'center',
            zIndex: 1, // Ensure start message is on top
          }}
        >
          Press Space to Flap
        </div>
      )}
      {isGameOver && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            fontSize: '32px',
            fontFamily: 'Arial, sans-serif',
            textAlign: 'center',
            zIndex: 1, // Ensure game over message is on top
          }}
        >
          Game Over! Press Space to Restart.
        </div>
      )}
    </div>
  );
}

export default App;
