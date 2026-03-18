<template>
  <div class="starfield-container">
    <canvas 
      ref="starfieldCanvas1" 
      class="starfield-canvas"
      :class="{ active: activeCanvas === 1 }"
      :width="canvasWidth" 
      :height="canvasHeight"
    ></canvas>
    <canvas 
      ref="starfieldCanvas2" 
      class="starfield-canvas"
      :class="{ active: activeCanvas === 2 }"
      :width="canvasWidth" 
      :height="canvasHeight"
    ></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';

const props = defineProps({
  dateSeed: {
    type: Number,
    default: 0
  }
});

const starfieldCanvas1 = ref(null);
const starfieldCanvas2 = ref(null);
const canvasWidth = ref(800);
const canvasHeight = ref(600);
const activeCanvas = ref(1);
const isTransitioning = ref(false);
let resizeObserver = null;

// Simple seeded random number generator
const seededRandom = (seed) => {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const createStarfield = (canvas, seed = 0) => {
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Validate canvas dimensions
  if (!canvas.width || !canvas.height || canvas.width <= 0 || canvas.height <= 0) {
    console.warn('Invalid canvas dimensions:', canvas.width, canvas.height);
    return;
  }
  
  // Fill background with black
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Generate stars
  const numStars = Math.floor((canvas.width * canvas.height) / 2000); // Responsive star count
  let randomSeed = seed;
  
  for (let i = 0; i < numStars; i++) {
    // Seeded random position
    const x = seededRandom(randomSeed++) * canvas.width;
    const y = seededRandom(randomSeed++) * canvas.height;
    
    // Seeded random size (most stars small, few large) - reduced by 40%
    let radius;
    const sizeRandom = seededRandom(randomSeed++);
    if (sizeRandom < 0.7) {
      radius = 0.3 + seededRandom(randomSeed++) * 0.6; // Small stars
    } else if (sizeRandom < 0.9) {
      radius = 0.9 + seededRandom(randomSeed++) * 0.9; // Medium stars
    } else {
      radius = 1.5 + seededRandom(randomSeed++) * 1.2; // Large bright stars
    }
    
    // Seeded random brightness/opacity - reduced maximum by 40%
    const brightness = 0.3 + seededRandom(randomSeed++) * 0.42;
    
    // Star color (mostly white, some slight blue/yellow tints)
    let red, green, blue;
    const colorVariation = seededRandom(randomSeed++);
    if (colorVariation < 0.8) {
      // White stars
      red = green = blue = 255;
    } else if (colorVariation < 0.9) {
      // Slightly blue stars
      red = 200 + seededRandom(randomSeed++) * 55;
      green = 220 + seededRandom(randomSeed++) * 35;
      blue = 255;
    } else {
      // Slightly yellow/orange stars
      red = 255;
      green = 240 + seededRandom(randomSeed++) * 15;
      blue = 180 + seededRandom(randomSeed++) * 75;
    }
    
    // Draw star with glow effect for larger stars
    if (radius > 2) {
      // Add glow for bright stars
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 3);
      gradient.addColorStop(0, `rgba(${red}, ${green}, ${blue}, ${brightness})`);
      gradient.addColorStop(0.3, `rgba(${red}, ${green}, ${blue}, ${brightness * 0.5})`);
      gradient.addColorStop(1, `rgba(${red}, ${green}, ${blue}, 0)`);
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw main star
    ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${brightness})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Add twinkle effect for some stars
    if (seededRandom(randomSeed++) < 0.1 && radius > 1) {
      ctx.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${brightness * 0.8})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      // Vertical line
      ctx.moveTo(x, y - radius * 4);
      ctx.lineTo(x, y + radius * 4);
      // Horizontal line
      ctx.moveTo(x - radius * 4, y);
      ctx.lineTo(x + radius * 4, y);
      ctx.stroke();
    }
  }
  
  // Add some nebula-like background variations
  for (let i = 0; i < 3; i++) {
    const x = seededRandom(randomSeed++) * canvas.width;
    const y = seededRandom(randomSeed++) * canvas.height;
    const size = 100 + seededRandom(randomSeed++) * 200;
    
    // Validate values before creating gradient
    if (!isFinite(x) || !isFinite(y) || !isFinite(size) || size <= 0) {
      continue;
    }
    
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
    const colors = [
      'rgba(60, 30, 100, 0.03)',
      'rgba(30, 60, 120, 0.02)',
      'rgba(80, 40, 60, 0.02)'
    ];
    const color = colors[Math.floor(seededRandom(randomSeed++) * colors.length)];
    
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
};

const transitionToNewStarfield = async (newSeed) => {
  if (isTransitioning.value) return;
  
  isTransitioning.value = true;
  
  // Draw new starfield on the inactive canvas
  const inactiveCanvas = activeCanvas.value === 1 ? starfieldCanvas2.value : starfieldCanvas1.value;
  createStarfield(inactiveCanvas, newSeed);
  
  // Start cross-fade transition
  const targetCanvasNum = activeCanvas.value === 1 ? 2 : 1;
  activeCanvas.value = targetCanvasNum;
  
  // Wait for transition to complete
  setTimeout(() => {
    isTransitioning.value = false;
  }, 800); // Match CSS transition duration
};

const updateCanvasSize = () => {
  const canvas1 = starfieldCanvas1.value;
  const canvas2 = starfieldCanvas2.value;
  if (!canvas1 || !canvas1.parentElement) return;
  
  const rect = canvas1.parentElement.getBoundingClientRect();
  canvasWidth.value = rect.width;
  canvasHeight.value = rect.height;
  
  nextTick(() => {
    createStarfield(starfieldCanvas1.value, props.dateSeed);
    createStarfield(starfieldCanvas2.value, props.dateSeed);
  });
};

// Watch for date seed changes to trigger transitions
watch(() => props.dateSeed, (newSeed) => {
  transitionToNewStarfield(newSeed);
});

onMounted(() => {
  nextTick(() => {
    updateCanvasSize();
    
    // Set up resize observer to redraw when container size changes
    if (starfieldCanvas1.value?.parentElement) {
      resizeObserver = new ResizeObserver(() => {
        updateCanvasSize();
      });
      resizeObserver.observe(starfieldCanvas1.value.parentElement);
    }
  });
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});
</script>

<style scoped>
.starfield-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  border-radius: inherit;
  overflow: hidden;
}

.starfield-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  border-radius: inherit;
  opacity: 0;
  transition: opacity 0.8s ease-in-out;
}

.starfield-canvas.active {
  opacity: 1;
}
</style>