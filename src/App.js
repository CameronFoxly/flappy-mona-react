import React, { useEffect, useRef, useState, useCallback } from 'react';
import './App.css';

// Import player sprites
import PlayerFrame1 from './assets/sprites/Player_1.png';
import PlayerFrame2 from './assets/sprites/Player_2.png';
import PlayerFrame3 from './assets/sprites/Player_3.png';
import PlayerFrame4 from './assets/sprites/Player_4.png';
import PlayerFrame5 from './assets/sprites/Player_5.png';
import PlayerFrame6 from './assets/sprites/Player_6.png';
import PlayerFrame7 from './assets/sprites/Player_7.png';
import PlayerDeath1 from './assets/sprites/Player_Death1.png';
import PlayerDeath2 from './assets/sprites/Player_Death2.png';
import PlayerDeath3 from './assets/sprites/Player_Death3.png';
import PlayerDeath4 from './assets/sprites/Player_Death4.png';
import PlayerDeath5 from './assets/sprites/Player_Death5.png';

function App() {
  const canvasRef = useRef(null);
  const birdVelocityRef = useRef(0);
  const obstaclesRef = useRef([]);
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [showStartMessage, setShowStartMessage] = useState(true);
  
  // Time tracking references
  const lastTimestampRef = useRef(0);
  const animationFrameIdRef = useRef(null);

  // Fixed game world dimensions (9:16 aspect ratio for phones)
  const GAME_WIDTH = 360;  // Fixed game width
  const GAME_HEIGHT = 640; // Fixed game height (9:16 ratio)
  
  // Scale references for transforms
  const scaleRef = useRef(1);
  const offsetXRef = useRef(0);
  const offsetYRef = useRef(0);

  // Game constants - speed values now represent units per second rather than per frame
  const flapStrength = -350;
  const obstacleWidth = 100; // Scaled for game world size
  const obstacleGap = 180;  // Scaled for game world size
  const obstacleSpacing = 200;
  const obstacleSpeed = 150;
  const gravity = 900;

  // Add sprite references
  const playerSpritesRef = useRef({
    // Animation frames
    frames: [null, null, null, null, null, null, null, null],
    // Death animation frames
    deathFrames: [null, null, null, null, null],
    // Current frame index
    currentFrame: 0, 
    // Animation sequence for flap: frames 5, 6, 7, 1, 2, 3, 4
    flapSequence: [4, 5, 6, 0, 1, 2, 3], // 0-indexed (frame-1)
    // Flag to indicate if flap animation is in progress
    isFlapping: false,
    // Frame time in milliseconds (time each frame should be shown)
    frameTime: 50, // Adjust this value to control animation speed
    // Timer for current frame
    frameTimer: 0
  });

  // Add a function to reset the game state
  const resetGame = useCallback((canvas) => {
    birdVelocityRef.current = 0;
    setIsGameOver(false);
    setIsGameStarted(false);
    setShowStartMessage(true);
    setScore(0);
    obstaclesRef.current = [];

    // Reset bird position and obstacles
    const context = canvas.getContext('2d');
    context.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply scaling transform
    applyTransform(canvas);
    
    // Spawn initial obstacles
    spawnInitialObstacles();
  }, []);

  // Utility function to apply current transform to canvas
  const applyTransform = useCallback((canvas) => {
    if (!canvas) return;
    
    const context = canvas.getContext('2d');
    context.setTransform(1, 0, 0, 1, 0, 0); // Reset transform first
    context.translate(offsetXRef.current, offsetYRef.current);
    context.scale(scaleRef.current, scaleRef.current);
  }, []);

  // Convert window coordinates to game world coordinates
  const windowToGameCoords = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left - offsetXRef.current) / scaleRef.current;
    const y = (clientY - rect.top - offsetYRef.current) / scaleRef.current;
    
    return { x, y };
  }, []);

  // Handle user input - start flap animation
  const handleInput = useCallback(() => {
    if (showStartMessage) {
      setShowStartMessage(false);
    }
    
    if (isGameOver) {
      resetGame(canvasRef.current);
    } else if (!isGameStarted) {
      setIsGameStarted(true);
      birdVelocityRef.current = flapStrength;
      
      // Start flapping animation
      playerSpritesRef.current.isFlapping = true;
      playerSpritesRef.current.currentFrame = 0; // Start with the first frame in sequence
      playerSpritesRef.current.frameTimer = 0;   // Reset frame timer
    } else {
      birdVelocityRef.current = flapStrength;
      
      // Start flapping animation
      playerSpritesRef.current.isFlapping = true;
      playerSpritesRef.current.currentFrame = 0; // Start with the first frame in sequence
      playerSpritesRef.current.frameTimer = 0;   // Reset frame timer
    }
  }, [isGameOver, isGameStarted, showStartMessage, resetGame]);

  // Handle keydown events
  const handleKeyDown = useCallback((event) => {
    if (event.code === 'Space') {
      handleInput();
    }
  }, [handleInput]);

  // Function to draw current game state (used during resizing)
  const drawCurrentGameState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const context = canvas.getContext('2d');
    
    // Clear canvas first
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.restore();
    
    // Apply the transform
    applyTransform(canvas);
    
    // Draw background (sky)
    context.fillStyle = '#87CEFA'; // Light sky blue background
    context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // Draw bird at middle point
    const birdY = GAME_HEIGHT / 2;
    
    // Draw bird sprite if loaded
    const playerSprites = playerSpritesRef.current;
    if (!isGameStarted && playerSprites.frames && playerSprites.frames[0]) {
      // Before game starts, show the first frame
      const sprite = playerSprites.frames[0]; // Player_1.png
      context.drawImage(sprite, 100 - 24, birdY - 24, 48, 48);
    } else if (isGameOver && playerSprites.deathFrames && playerSprites.deathFrames[0]) {
      // Game over - show death animation final frame
      const sprite = playerSprites.deathFrames[playerSprites.deathFrames.length - 1];
      context.drawImage(sprite, 100 - 24, birdY - 24, 48, 48);
    } else if (playerSprites.frames) {
      // Game is running - show current frame from flap sequence or default
      const frameIndex = playerSprites.isFlapping 
        ? playerSprites.flapSequence[playerSprites.currentFrame]
        : 3; // Default to frame 4 when not flapping (0-indexed)
      
      if (playerSprites.frames[frameIndex]) {
        context.drawImage(playerSprites.frames[frameIndex], 100 - 24, birdY - 24, 48, 48);
      } else {
        // Fallback if sprite not loaded
        context.fillStyle = 'yellow';
        context.beginPath();
        context.arc(100, birdY, 24, 0, Math.PI * 2);
        context.fill();
      }
    } else {
      // Fallback if sprites not loaded
      context.fillStyle = 'yellow';
      context.beginPath();
      context.arc(100, birdY, 24, 0, Math.PI * 2);
      context.fill();
    }
    
    // Draw obstacles
    obstaclesRef.current.forEach(obstacle => {
      // Draw top obstacle
      context.fillStyle = 'green';
      context.fillRect(obstacle.x, 0, obstacleWidth, obstacle.topHeight);
      
      // Draw bottom obstacle
      context.fillStyle = 'red';
      context.fillRect(
        obstacle.x,
        obstacle.bottomY,
        obstacleWidth,
        GAME_HEIGHT - obstacle.bottomY
      );
    });
  }, [applyTransform, isGameStarted, isGameOver, obstacleWidth]);

  // Initialize and resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resizeCanvas = () => {
      // Get window dimensions
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      // Set canvas size to fill window
      canvas.width = windowWidth;
      canvas.height = windowHeight;
      
      // Determine the scaling factor based on aspect ratio
      const windowRatio = windowWidth / windowHeight;
      const gameRatio = GAME_WIDTH / GAME_HEIGHT;
      
      let scale, offsetX, offsetY;
      
      if (windowRatio > gameRatio) {
        // Window is wider than game ratio, scale based on height
        scale = windowHeight / GAME_HEIGHT;
        // Set offsetX to 0 to anchor to left side instead of centering
        offsetX = 0;
        offsetY = 0;
      } else {
        // Window is taller than game ratio, scale based on width
        scale = windowWidth / GAME_WIDTH;
        offsetX = 0;
        // Center vertically only
        offsetY = (windowHeight - (GAME_HEIGHT * scale)) / 2;
      }
      
      // Store scale and offsets for later use
      scaleRef.current = scale;
      offsetXRef.current = offsetX;
      offsetYRef.current = offsetY;
      
      // Apply the transform and clear canvas
      const context = canvas.getContext('2d');
      context.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      // Apply scaling transform
      applyTransform(canvas);
      
      // Redraw game state
      drawCurrentGameState();
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas(); // Initial sizing
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [applyTransform, drawCurrentGameState]);

  // Preload images
  useEffect(() => {
    const loadImage = (src) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };
    
    // Load all player frames
    Promise.all([
      loadImage(PlayerFrame1),
      loadImage(PlayerFrame2),
      loadImage(PlayerFrame3),
      loadImage(PlayerFrame4),
      loadImage(PlayerFrame5),
      loadImage(PlayerFrame6),
      loadImage(PlayerFrame7),
      // Load death animation frames
      loadImage(PlayerDeath1),
      loadImage(PlayerDeath2),
      loadImage(PlayerDeath3),
      loadImage(PlayerDeath4),
      loadImage(PlayerDeath5)
    ]).then(images => {
      // Store loaded images in refs
      playerSpritesRef.current.frames = images.slice(0, 7);
      playerSpritesRef.current.deathFrames = images.slice(7);
      
      console.log('All player sprites loaded successfully');
      
      // Force a redraw to show the loaded sprites
      const canvas = canvasRef.current;
      if (canvas) {
        drawCurrentGameState();
      }
    }).catch(error => {
      console.error('Error loading sprite images:', error);
    });
  }, [drawCurrentGameState]);

  // Generate a new obstacle at a specific X position
  const generateObstacle = useCallback((xPosition) => {
    const minGapY = 100; // Minimum start for gap
    const maxGapY = GAME_HEIGHT - 100 - obstacleGap; // Maximum start for gap
    const gapY = Math.floor(Math.random() * (maxGapY - minGapY + 1)) + minGapY;

    return {
      x: xPosition,
      topHeight: gapY,
      bottomY: gapY + obstacleGap,
      passed: false
    };
  }, []);

  // Spawn initial obstacles
  const spawnInitialObstacles = useCallback(() => {
    obstaclesRef.current = []; // Clear existing obstacles
    
    for (let i = 0; i < 5; i++) {
      const xPosition = 450 + i * (obstacleWidth + obstacleSpacing);
      obstaclesRef.current.push(generateObstacle(xPosition));
    }
  }, [generateObstacle]);

  // Spawn a single new obstacle
  const spawnObstacle = useCallback(() => {
    const lastObstacle = obstaclesRef.current[obstaclesRef.current.length - 1];
    const xPosition = lastObstacle.x + obstacleWidth + obstacleSpacing;
    obstaclesRef.current.push(generateObstacle(xPosition));
  }, [generateObstacle]);

  // Buffer obstacles to maintain a steady stream
  const bufferObstacles = useCallback(() => {
    // Add obstacles when the last one is fully visible in the game world
    const lastObstacle = obstaclesRef.current[obstaclesRef.current.length - 1];
    
    // Add new obstacles when the last one is fully on screen
    // GAME_WIDTH is the width of our virtual game world
    if (lastObstacle && lastObstacle.x < GAME_WIDTH) {
      spawnObstacle();
    }
  }, [spawnObstacle]);

  // Initialize obstacles
  useEffect(() => {
    spawnInitialObstacles();
  }, [spawnInitialObstacles]);

  // Main game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    let birdY = GAME_HEIGHT / 2;
    lastTimestampRef.current = 0;

    const gameLoop = (timestamp) => {
      if (lastTimestampRef.current === 0) {
        lastTimestampRef.current = timestamp;
      }
      
      const deltaTime = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;
      
      // Clamp deltaTime to prevent huge jumps
      const clampedDeltaTime = Math.min(deltaTime, 0.1);

      // Update sprite animation
      const playerSprites = playerSpritesRef.current;
      if (playerSprites.isFlapping) {
        playerSprites.frameTimer += clampedDeltaTime * 1000; // Convert to ms
        
        if (playerSprites.frameTimer >= playerSprites.frameTime) {
          playerSprites.frameTimer = 0;
          playerSprites.currentFrame++;
          
          // Check if animation sequence completed
          if (playerSprites.currentFrame >= playerSprites.flapSequence.length) {
            playerSprites.isFlapping = false;
            playerSprites.currentFrame = playerSprites.flapSequence.length - 1; // Hold on last frame
          }
        }
      }

      // Clear canvas with transform reset to properly clear everything
      const context = canvas.getContext('2d');
      context.save();
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.restore();
      
      // Apply scaling transform
      applyTransform(canvas);

      if (!isGameStarted) {
        // Draw the bird in its initial position using sprite
        if (playerSprites.frames && playerSprites.frames[0]) {
          context.drawImage(playerSprites.frames[0], 100 - 24, birdY - 24, 48, 48);
        } else {
          // Fallback if sprite not loaded
          context.fillStyle = 'yellow';
          context.beginPath();
          context.arc(100, birdY, 24, 0, Math.PI * 2);
          context.fill();
        }

        // Draw initial obstacles
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
            GAME_HEIGHT - obstacle.bottomY
          );
        }
        
        animationFrameIdRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      // Apply gravity and update bird's position
      birdVelocityRef.current += gravity * clampedDeltaTime;
      birdY += birdVelocityRef.current * clampedDeltaTime;

      // Draw the bird using sprite
      if (playerSprites.frames) {
        const frameIndex = playerSprites.isFlapping 
          ? playerSprites.flapSequence[playerSprites.currentFrame]
          : 3; // Default to frame 4 when not flapping (0-indexed)
        
        if (playerSprites.frames[frameIndex]) {
          context.drawImage(playerSprites.frames[frameIndex], 100 - 24, birdY - 24, 48, 48);
        } else {
          // Fallback if sprite not loaded
          context.fillStyle = 'yellow';
          context.beginPath();
          context.arc(100, birdY, 24, 0, Math.PI * 2);
          context.fill();
        }
      } else {
        // Fallback if sprites not loaded
        context.fillStyle = 'yellow';
        context.beginPath();
        context.arc(100, birdY, 24, 0, Math.PI * 2);
        context.fill();
      }

      // Move and draw obstacles
      for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
        const obstacle = obstaclesRef.current[i];
        obstacle.x -= obstacleSpeed * clampedDeltaTime;

        // Draw top obstacle
        context.fillStyle = 'green';
        context.fillRect(obstacle.x, 0, obstacleWidth, obstacle.topHeight);

        // Draw bottom obstacle
        context.fillStyle = 'red';
        context.fillRect(
          obstacle.x,
          obstacle.bottomY,
          obstacleWidth,
          GAME_HEIGHT - obstacle.bottomY
        );

        // Remove obstacles that go completely off-screen
        // Make sure they're completely off the left edge with some buffer
        if (obstacle.x + obstacleWidth < -100) {
          obstaclesRef.current.splice(i, 1);
        }
      }

      // Check collisions
      const checkCollision = () => {
        const birdRadius = 24;
        const birdX = 100;
      
        // Check collision with obstacles
        for (let i = 0; i < obstaclesRef.current.length; i++) {
          const obstacle = obstaclesRef.current[i];
      
          if (
            birdX + birdRadius > obstacle.x &&
            birdX - birdRadius < obstacle.x + obstacleWidth
          ) {
            // Check collision with top obstacle
            if (birdY - birdRadius < obstacle.topHeight) {
              return true;
            }
            
            // Check collision with bottom obstacle
            if (birdY + birdRadius > obstacle.bottomY) {
              return true;
            }
          }
        }
      
        // Check if the bird hits the boundaries
        if (birdY + birdRadius > GAME_HEIGHT || birdY - birdRadius < 0) {
          return true;
        }
      
        return false;
      };
      
      // Check collisions and end game if needed
      if (checkCollision()) {
        setIsGameOver(true);
        return;
      }

      // Buffer new obstacles
      bufferObstacles();

      // Update score
      const updateScore = () => {
        for (let i = 0; i < obstaclesRef.current.length; i++) {
          const obstacle = obstaclesRef.current[i];
      
          if (!obstacle.passed && obstacle.x + obstacleWidth < 100) {
            obstacle.passed = true;
            setScore(prevScore => prevScore + 1);
          }
        }
      };
      
      updateScore();

      if (!isGameOver) {
        animationFrameIdRef.current = requestAnimationFrame(gameLoop);
      }
    };

    if (!isGameOver) {
      animationFrameIdRef.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [isGameOver, isGameStarted, applyTransform, bufferObstacles]);

  // Input handlers
  useEffect(() => {
    const handleMouseDown = () => handleInput();
    const handleTouchStart = (e) => {
      e.preventDefault(); // Prevent default touch behavior
      handleInput();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('touchstart', handleTouchStart, { passive: false });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, [handleKeyDown, handleInput]);

  return (
    <div className="App">
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
      
      {/* Score display - using fixed game coordinates */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          color: 'white',
          fontSize: '24px',
          fontFamily: 'Arial, sans-serif',
          zIndex: 1,
        }}
      >
        Score: {score}
      </div>
      
      {/* Start message */}
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
            zIndex: 1,
          }}
        >
          Press Space to Flap
        </div>
      )}
      
      {/* Game over message */}
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
            zIndex: 1,
          }}
        >
          Game Over! Press Space to Restart.
        </div>
      )}
    </div>
  );
}

export default App;
