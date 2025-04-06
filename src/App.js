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
// Import obstacle sprites
import UpperObstacle from './assets/sprites/UpperObstacle.png';
import LowerObstacle from './assets/sprites/LowerObstacle.png';

function App() {
  const canvasRef = useRef(null);
  const birdVelocityRef = useRef(0);
  const obstaclesRef = useRef([]);
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [showStartMessage, setShowStartMessage] = useState(true);
  
  // Add loading state
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

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
  const flapStrength = -400;
  const obstacleWidth = 100; // Scaled for game world size
  const obstacleGap = 180;  // Scaled for game world size
  const obstacleSpacing = 200;
  const obstacleSpeed = 150;
  const gravity = 1200;

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
    // Flag to indicate if death animation is in progress
    isDeathAnimating: false,
    // Current death animation frame
    deathFrame: 0,
    // Flag to hide the bird after death animation completes
    hideAfterDeath: false,
    // Frame time in milliseconds (time each frame should be shown)
    frameTime: 100, // Adjust this value to control animation speed
    // Timer for current frame
    frameTimer: 0
  });

  // Add obstacle sprites references
  const obstacleSpritesRef = useRef({
    upper: null,
    lower: null,
    loaded: false
  });

  // Add a reference to track bird's Y position outside the game loop
  const birdYRef = useRef(GAME_HEIGHT / 4); // Adjusted starting position to be higher
  const finalDeathPositionRef = useRef(GAME_HEIGHT / 2); // Store final position on death

  // Add collision detection data references
  const collisionDataRef = useRef({
    // Collision canvas for off-screen pixel detection
    canvas: null,
    context: null,
    // Flag to indicate if collision data is initialized
    initialized: false
  });

  // Utility function to apply current transform to canvas
  const applyTransform = useCallback((canvas) => {
    if (!canvas) return;
    
    const context = canvas.getContext('2d');
    context.setTransform(1, 0, 0, 1, 0, 0); // Reset transform first
    
    // Disable image smoothing for crisp pixel art
    context.imageSmoothingEnabled = false;
    context.mozImageSmoothingEnabled = false;
    context.webkitImageSmoothingEnabled = false;
    context.msImageSmoothingEnabled = false;
    
    context.translate(offsetXRef.current, offsetYRef.current);
    context.scale(scaleRef.current, scaleRef.current);
  }, []);

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
  }, [obstacleGap]);

  // Spawn initial obstacles
  const spawnInitialObstacles = useCallback(() => {
    obstaclesRef.current = []; // Clear existing obstacles
    
    for (let i = 0; i < 5; i++) {
      const xPosition = 450 + i * (obstacleWidth + obstacleSpacing);
      obstaclesRef.current.push(generateObstacle(xPosition));
    }
  }, [generateObstacle, obstacleSpacing, obstacleWidth]);

  // Add a function to reset the game state
  const resetGame = useCallback((canvas) => {
    birdVelocityRef.current = 0;
    setIsGameOver(false);
    setIsGameStarted(false);
    setShowStartMessage(true);
    setScore(0);
    obstaclesRef.current = [];

    // Reset animation states
    playerSpritesRef.current.isDeathAnimating = false;
    playerSpritesRef.current.deathFrame = 0;
    playerSpritesRef.current.hideAfterDeath = false;
    playerSpritesRef.current.isFlapping = false;
    playerSpritesRef.current.currentFrame = 0;

    // Reset bird position and obstacles
    const context = canvas.getContext('2d');
    context.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply scaling transform
    applyTransform(canvas);
    
    // Spawn initial obstacles
    spawnInitialObstacles();
  }, [applyTransform, spawnInitialObstacles]);

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
  }, [flapStrength, isGameOver, isGameStarted, resetGame, showStartMessage]);

  // Handle keydown events
  const handleKeyDown = useCallback((event) => {
    if (event.code === 'Space') {
      handleInput();
    }
  }, [handleInput]);

  // Bounding box collision as fallback
  const checkBoundingBoxCollision = useCallback(() => {
    const birdRadius = 48; // Doubled from 24 to 48
    const birdX = 100;
    const birdY = birdYRef.current; // Use the ref value
  
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
  }, [obstacleWidth]);

  // Pixel-perfect collision detection
  const checkPixelCollision = useCallback(() => {
    if (!collisionDataRef.current.initialized || !obstacleSpritesRef.current.loaded) {
      // Fall back to bounding box collision if not initialized
      return checkBoundingBoxCollision();
    }

    const birdX = 100;
    const birdY = birdYRef.current;
    const spriteSize = 96;
    const playerSprites = playerSpritesRef.current;
    
    // Get current frame for player
    const frameIndex = playerSprites.isFlapping 
      ? playerSprites.flapSequence[playerSprites.currentFrame]
      : 3; // Default to frame 4 when not flapping
      
    if (!playerSprites.frames || !playerSprites.frames[frameIndex]) {
      // Fall back to bounding box collision if sprites not loaded
      return checkBoundingBoxCollision();
    }
    
    // Check for collisions with game boundaries
    if (birdY - spriteSize/2 < 0 || birdY + spriteSize/2 > GAME_HEIGHT) {
      return true;
    }
    
    // Define a tighter collision hitbox for the bird (reducing by 30% from each side)
    const hitboxReduction = spriteSize * 0.3;
    const birdBounds = {
      left: birdX - spriteSize/2 + hitboxReduction,
      right: birdX + spriteSize/2 - hitboxReduction,
      top: birdY - spriteSize/2 + hitboxReduction,
      bottom: birdY + spriteSize/2 - hitboxReduction
    };
    
    // For each obstacle, check collision
    for (let i = 0; i < obstaclesRef.current.length; i++) {
      const obstacle = obstaclesRef.current[i];
      
      // Skip if obstacle is completely past the bird
      if (obstacle.x > birdBounds.right) {
        continue; // Bird hasn't reached this obstacle yet
      }
      
      // Skip if bird is completely past the obstacle
      if (birdBounds.left > obstacle.x + obstacleWidth) {
        continue; // Bird has already passed this obstacle
      }
      
      // At this point we know there's horizontal overlap, now check vertical collision
      
      // Check for collision with top obstacle - adjust for visual height of sprite
      if (birdBounds.top < obstacle.topHeight) {
        return true;
      }
      
      // Check for collision with bottom obstacle
      if (birdBounds.bottom > obstacle.bottomY) {
        return true;
      }
    }
    
    return false; // No collision
  }, [checkBoundingBoxCollision, obstacleWidth]);

  // Function to draw obstacles with sprites
  const drawObstacles = useCallback((context, obstacles) => {
    const obstacleSprites = obstacleSpritesRef.current;
    
    // Scale the obstacles to half the current size (0.5 instead of 1)
    const spriteScale = 0.5;
    
    for (let i = 0; i < obstacles.length; i++) {
      const obstacle = obstacles[i];
      
      if (obstacleSprites.loaded) {
        // Draw top obstacle with sprite
        if (obstacleSprites.upper) {
          // Get sprite dimensions
          const spriteWidth = obstacleSprites.upper.width * spriteScale;
          const spriteHeight = obstacleSprites.upper.height * spriteScale;
          
          // Draw upper obstacle aligned to top edge, centered horizontally on obstacle x
          context.drawImage(
            obstacleSprites.upper,
            obstacle.x - (spriteWidth - obstacleWidth) / 2, // Center sprite on obstacle x position
            obstacle.topHeight - spriteHeight, // Position sprite so bottom edge is at topHeight
            spriteWidth,
            spriteHeight
          );
        }
        
        // Draw bottom obstacle with sprite
        if (obstacleSprites.lower) {
          // Get sprite dimensions
          const spriteWidth = obstacleSprites.lower.width * spriteScale;
          const spriteHeight = obstacleSprites.lower.height * spriteScale;
          
          // Draw lower obstacle aligned to bottom edge, centered horizontally on obstacle x
          context.drawImage(
            obstacleSprites.lower,
            obstacle.x - (spriteWidth - obstacleWidth) / 2, // Center sprite on obstacle x position
            obstacle.bottomY, // Position sprite so top edge is at bottomY
            spriteWidth,
            spriteHeight
          );
        }
      } else {
        // Fallback to original colored rectangles if sprites not loaded
        context.fillStyle = 'green';
        context.fillRect(obstacle.x, 0, obstacleWidth, obstacle.topHeight);
        
        context.fillStyle = 'red';
        context.fillRect(
          obstacle.x,
          obstacle.bottomY,
          obstacleWidth,
          GAME_HEIGHT - obstacle.bottomY
        );
      }
    }
  }, [obstacleWidth]);

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
    
    // Increase sprite size - doubled from 48x48 to 96x96
    const spriteSize = 96;
    
    // Draw bird sprite if loaded
    const playerSprites = playerSpritesRef.current;
    if (!isGameStarted && playerSprites.frames && playerSprites.frames[0]) {
      // Before game starts, show the first frame
      const sprite = playerSprites.frames[0]; // Player_1.png
      context.drawImage(sprite, 100 - spriteSize/2, birdY - spriteSize/2, spriteSize, spriteSize);
    } else if (isGameOver && playerSprites.deathFrames && playerSprites.deathFrames[0]) {
      // Game over - show death animation final frame
      const sprite = playerSprites.deathFrames[playerSprites.deathFrames.length - 1];
      context.drawImage(sprite, 100 - spriteSize/2, birdY - spriteSize/2, spriteSize, spriteSize);
    } else if (playerSprites.frames) {
      // Game is running - show current frame from flap sequence or default
      const frameIndex = playerSprites.isFlapping 
        ? playerSprites.flapSequence[playerSprites.currentFrame]
        : 3; // Default to frame 4 when not flapping (0-indexed)
      
      if (playerSprites.frames[frameIndex]) {
        context.drawImage(playerSprites.frames[frameIndex], 100 - spriteSize/2, birdY - spriteSize/2, spriteSize, spriteSize);
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
    
    // Draw obstacles using new function
    drawObstacles(context, obstaclesRef.current);
  }, [applyTransform, isGameStarted, isGameOver, drawObstacles]);

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
    
    // Load all player frames and obstacle sprites
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
      loadImage(PlayerDeath5),
      // Load obstacle sprites
      loadImage(UpperObstacle),
      loadImage(LowerObstacle)
    ]).then(images => {
      // Store loaded images in refs
      playerSpritesRef.current.frames = images.slice(0, 7);
      playerSpritesRef.current.deathFrames = images.slice(7, 12);
      obstacleSpritesRef.current.upper = images[12];
      obstacleSpritesRef.current.lower = images[13];
      obstacleSpritesRef.current.loaded = true;
      
      console.log('All sprites loaded successfully');
      
      // Set assets as loaded
      setAssetsLoaded(true);

      // Trigger fade-out effect
      setTimeout(() => setFadeOut(true), 500); // Delay fade-out slightly

      // Force a redraw to show the loaded sprites
      const canvas = canvasRef.current;
      if (canvas) {
        drawCurrentGameState();
      }
    }).catch(error => {
      console.error('Error loading sprite images:', error);
    });
  }, [drawCurrentGameState]);

  // Initialize collision detection system
  useEffect(() => {
    // Create offscreen canvas for collision detection
    const collisionCanvas = document.createElement('canvas');
    const collisionContext = collisionCanvas.getContext('2d', { willReadFrequently: true });
    
    // Set size based on game dimensions
    collisionCanvas.width = GAME_WIDTH;
    collisionCanvas.height = GAME_HEIGHT;
    
    // Store for later use
    collisionDataRef.current = {
      canvas: collisionCanvas,
      context: collisionContext,
      initialized: true
    };
    
    // Debug logging
    console.log('Collision detection system initialized');
    
    return () => {
      const currentCollisionData = collisionDataRef.current;
      if (currentCollisionData) {
        currentCollisionData.initialized = false;
        currentCollisionData.canvas = null;
        currentCollisionData.context = null;
      }
    };
  }, []);

  // Spawn a single new obstacle
  const spawnObstacle = useCallback(() => {
    const lastObstacle = obstaclesRef.current[obstaclesRef.current.length - 1];
    const xPosition = lastObstacle.x + obstacleWidth + obstacleSpacing;
    obstaclesRef.current.push(generateObstacle(xPosition));
  }, [generateObstacle, obstacleSpacing, obstacleWidth]);

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
    
    let birdY = GAME_HEIGHT / 2.5; // Updated to match the birdYRef initial position
    birdYRef.current = birdY; // Initialize the ref
    lastTimestampRef.current = 0;

    const gameLoop = (timestamp) => {
      if (lastTimestampRef.current === 0) {
        lastTimestampRef.current = timestamp;
      }
      
      const deltaTime = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;
      
      // Clamp deltaTime to prevent huge jumps
      const clampedDeltaTime = Math.min(deltaTime, 0.1);

      // Clear canvas with transform reset to properly clear everything
      const context = canvas.getContext('2d');
      context.save();
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.restore();
      
      // Apply scaling transform
      applyTransform(canvas);

      // Update sprite animation
      const playerSprites = playerSpritesRef.current;
      
      if (isGameOver && playerSprites.isDeathAnimating) {
        // Update death animation
        playerSprites.frameTimer += clampedDeltaTime * 1000; // Convert to ms
        
        if (playerSprites.frameTimer >= playerSprites.frameTime) {
          playerSprites.frameTimer = 0;
          playerSprites.deathFrame++;
          
          // Check if death animation completed
          if (playerSprites.deathFrame >= playerSprites.deathFrames.length) {
            playerSprites.isDeathAnimating = false;
            playerSprites.hideAfterDeath = true; // Set flag to hide the bird completely
          }
        }
      }
      else if (playerSprites.isFlapping) {
        // Update flap animation
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


      // Draw bird at current position
      const spriteSize = 96;
      
      if (!isGameStarted) {
        // Draw the bird in its initial position using sprite
        if (playerSprites.frames && playerSprites.frames[0]) {
          context.drawImage(playerSprites.frames[0], 100 - spriteSize/2, birdY - spriteSize/2, spriteSize, spriteSize);
        } else {
          // Fallback if sprite not loaded
          context.fillStyle = 'yellow';
          context.beginPath();
          context.arc(100, birdY, 24, 0, Math.PI * 2);
          context.fill();
        }
      } else if (isGameOver) {
        // Don't draw anything if the death animation is complete and we should hide the bird
        if (!playerSprites.hideAfterDeath) {
          // Draw death animation at the position where bird died
          const deathY = finalDeathPositionRef.current;
          
          if (playerSprites.deathFrames && playerSprites.deathFrames.length > 0) {
            // If death animation is active, show appropriate frame
            const frameIndex = Math.min(playerSprites.deathFrame, playerSprites.deathFrames.length - 1);
            
            if (playerSprites.deathFrames[frameIndex]) {
              context.drawImage(
                playerSprites.deathFrames[frameIndex], 
                100 - spriteSize/2, 
                deathY - spriteSize/2, 
                spriteSize, 
                spriteSize
              );
            } else {
              // Fallback
              context.fillStyle = 'red'; // Red circle for death
              context.beginPath();
              context.arc(100, deathY, 24, 0, Math.PI * 2);
              context.fill();
            }
          }
        }
      } else {
        // Draw the bird using sprite (normal gameplay)
        if (playerSprites.frames) {
          const frameIndex = playerSprites.isFlapping 
            ? playerSprites.flapSequence[playerSprites.currentFrame]
            : 3; // Default to frame 4 when not flapping (0-indexed)
          
          if (playerSprites.frames[frameIndex]) {
            context.drawImage(
              playerSprites.frames[frameIndex], 
              100 - spriteSize/2, 
              birdY - spriteSize/2, 
              spriteSize, 
              spriteSize
            );
          } else {
            // Fallback if sprite not loaded
            context.fillStyle = 'yellow';
            context.beginPath();
            context.arc(100, birdY, 24, 0, Math.PI * 2);
            context.fill();
          }
        }
      }

      // Draw obstacles - prevent movement unless the game has started
      if (!isGameStarted) {
        // Draw obstacles in their static initial positions
        drawObstacles(context, obstaclesRef.current);
        
        animationFrameIdRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      // Apply gravity and update bird's position (only if game is active)
      if (!isGameOver) {
        birdVelocityRef.current += gravity * clampedDeltaTime;
        birdY += birdVelocityRef.current * clampedDeltaTime;
        birdYRef.current = birdY; // Update the ref with current position
      }

      // Move obstacles (only if game is active)
      if (!isGameOver) {
        // Move obstacles
        for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
          const obstacle = obstaclesRef.current[i];
          obstacle.x -= obstacleSpeed * clampedDeltaTime;

          // Remove obstacles that go completely off-screen
          if (obstacle.x + obstacleWidth < -100) {
            obstaclesRef.current.splice(i, 1);
          }
        }
        
        // Draw obstacles after movement
        drawObstacles(context, obstaclesRef.current);
      } else {
        // Just draw obstacles in their current positions without moving them
        drawObstacles(context, obstaclesRef.current);
      }

      // Check collisions and end game if needed
      if (!isGameOver) {
        // Use pixel-perfect collision instead of bounding box
        if (checkPixelCollision()) {
          // Store final bird position at the moment of death
          finalDeathPositionRef.current = birdYRef.current;
          
          // Start death animation
          playerSpritesRef.current.isDeathAnimating = true;
          playerSpritesRef.current.deathFrame = 0;
          playerSpritesRef.current.frameTimer = 0;
          
          setIsGameOver(true);
        }
      }

      // Buffer new obstacles (only if game is active)
      if (!isGameOver) {
        bufferObstacles();
      }

      // Update score (only if game is active)
      if (!isGameOver) {
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
      }

      // Continue the animation loop
      animationFrameIdRef.current = requestAnimationFrame(gameLoop);
    };

    // Start the game loop
    animationFrameIdRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [isGameOver, isGameStarted, applyTransform, bufferObstacles, drawObstacles, checkPixelCollision, gravity, obstacleSpeed]);

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
      {/* Black overlay for loading screen */}
      {!fadeOut && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'black',
            zIndex: 10,
            opacity: assetsLoaded ? 0 : 1,
            transition: 'opacity 1s ease-in-out',
            pointerEvents: 'none',
          }}
        ></div>
      )}

      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
      
      {/* Score display - using fixed game coordinates */}
      <div
        style={{
          position: 'absolute',
          top: '10px', // Adjusted to be 10px from the top of the viewport
          right: '10px',
          color: 'white',
          fontSize: '24px',
          fontFamily: 'PixeloidSans',
          zIndex: 3, // Ensure it appears above the black bar
          backgroundColor: 'black', // Black bar background
          padding: '10px', // Padding around text
          borderRadius: '5px', // Optional: rounded corners for better aesthetics
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
            fontFamily: 'PixeloidSans', // Updated font family
            textAlign: 'center',
            zIndex: 1,
            backgroundColor: 'black', // Black bar background
            padding: '10px', // Padding around text
            borderRadius: '5px', // Optional: rounded corners for better aesthetics
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
            fontFamily: 'PixeloidSans', // Updated font family
            textAlign: 'center',
            zIndex: 1,
            backgroundColor: 'black', // Black bar background
            padding: '10px', // Padding around text
            borderRadius: '5px', // Optional: rounded corners for better aesthetics
          }}
        >
          Game Over! Press Space to Restart.
        </div>
      )}

      {/* Black bar overlay for future controls */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '50px', // Height of the black bar
          backgroundColor: 'black',
          zIndex: 2, // Ensure it appears above other elements
        }}
      ></div>
    </div>
  );
}

export default App;
