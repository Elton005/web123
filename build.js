import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function build() {
  try {
    // Read the Speed Insights module
    const speedInsightsPath = join(__dirname, 'node_modules', '@vercel', 'speed-insights', 'dist', 'index.mjs');
    const speedInsightsCode = await readFile(speedInsightsPath, 'utf-8');
    
    // Create our initialization script
    const initScript = `
// Vercel Speed Insights
${speedInsightsCode}

// Initialize Speed Insights when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    injectSpeedInsights();
  });
} else {
  injectSpeedInsights();
}
`;

    // Ensure assets/js directory exists and write the file
    const outputPath = join(__dirname, 'assets', 'js', 'speed-insights.js');
    await writeFile(outputPath, initScript, 'utf-8');
    
    console.log('✓ Speed Insights script built successfully at assets/js/speed-insights.js');
  } catch (error) {
    console.error('Error building Speed Insights script:', error);
    process.exit(1);
  }
}

build();
