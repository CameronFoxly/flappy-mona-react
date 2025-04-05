import React, { useEffect, useRef, useState, useCallback } from 'react';

function App() {
  const canvasRef = useRef(null);
  const birdVelocityRef = useRef(0); // Use useRef for birdVelocity
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false); // Track if the game has started

  const flapStrength = -10;

  const handleKeyDown = useCallback((event) => {
    if (event.code === 'Space') {
      if (!isGameStarted) {
        setIsGameStarted(true);
        birdVelocityRef.current = -10; // Trigger a flap on the first spacebar press
      } else if (isGameOver) {
        setIsGameOver(false);
        birdVelocityRef.current = 0; // Reset velocity
      } else {
        birdVelocityRef.current = -10; // Flap strength
      }
    }
  }, [isGameOver, isGameStarted]);

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
      <canvas ref={canvasRef} width={800} height={600} style={{ border: '1px solid black' }} />
      <div>Score: {score}</div>
      {isGameOver && <div>Game Over! Press Space to Restart.</div>}
    </div>
  );
}

export default App;
