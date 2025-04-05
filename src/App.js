import React, { useEffect, useRef, useState, useCallback } from 'react';

function App() {
  const canvasRef = useRef(null);
  const birdVelocityRef = useRef(0); // Use useRef for birdVelocity
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false); // Track if the game has started
  const [showStartMessage, setShowStartMessage] = useState(true); // Track if the start message is visible

  const flapStrength = -6;

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
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas(); // Set initial canvas size

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
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
        context.arc(100, birdY, 15, 0, Math.PI * 2);
        context.fill();
        return;
      }

      // Apply gravity and update bird's position
      birdVelocityRef.current += gravity;
      birdY += birdVelocityRef.current;

      // Draw the bird
      context.fillStyle = 'yellow';
      context.beginPath();
      context.arc(100, birdY, 15, 0, Math.PI * 2);
      context.fill();

      // Check if the bird hits the ground or flies off the screen
      if (birdY + 15 > canvas.height || birdY - 15 < 0) {
        setIsGameOver(true);
        return;
      }

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
