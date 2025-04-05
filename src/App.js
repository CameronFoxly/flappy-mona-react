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
  const obstacleGap = 250; // Gap between top and bottom parts of an obstacle
  const obstacleSpacing = 200; // Horizontal spacing between obstacles
  const obstacleSpeed = 1.5; // Speed of obstacle movement

  const handleKeyDown = useCallback((event) => {
    if (event.code === 'Space') {
      if (showStartMessage) {
        setShowStartMessage(false); // Hide the start message
      }
      if (!isGameStarted) {
        setIsGameStarted(true);
        birdVelocityRef.current = -6; // Trigger a flap on the first spacebar press
      } else if (isGameOver) {
        setIsGameOver(false);
        birdVelocityRef.current = 0; // Reset velocity
      } else {
        birdVelocityRef.current = -6; // Flap strength
      }
    }
  }, [isGameOver, isGameStarted, showStartMessage]);

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
      context.fillStyle = 'green';
      for (let i = 0; i < obstaclesRef.current.length; i++) {
        const obstacle = obstaclesRef.current[i];
        // Draw top obstacle
        context.fillRect(obstacle.x, 0, obstacleWidth, obstacle.topHeight);
        // Draw bottom obstacle
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
    const minGapY = canvas.height / 4; // Start of the middle two quarters
    const maxGapY = (canvas.height * 3) / 4 - obstacleGap; // End of the middle two quarters
    const gapY = Math.random() * (maxGapY - minGapY) + minGapY; // Randomly position the gap
    return {
      x: xPosition,
      topHeight: gapY,
      bottomY: gapY + obstacleGap, // Ensure consistent gap
    };
  };

  const spawnInitialObstacles = (canvas) => {
    for (let i = 0; i < 5; i++) { // Spawn 5 obstacles initially
      const xPosition = 150 + i * (obstacleWidth + obstacleSpacing); // Start 150px from the player
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
          context.fillRect(obstacle.x, 0, obstacleWidth, obstacle.topHeight);
          // Draw bottom obstacle
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

      // Check if the bird hits the ground or flies off the screen
      if (birdY + 15 > canvas.height || birdY - 15 < 0) {
        setIsGameOver(true);
        return;
      }

      // Buffer new obstacles
      bufferObstacles(canvas);

      if (!isGameOver) {
        requestAnimationFrame(gameLoop);
      }
    };

    if (!isGameOver) {
      gameLoop();
    }
  }, [isGameOver, isGameStarted]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <div className="App">
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: -1 }} />
      <div
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          color: 'black',
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
            color: 'black',
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
            color: 'black',
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
