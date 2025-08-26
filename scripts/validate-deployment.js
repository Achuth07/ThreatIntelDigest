#!/usr/bin/env node

/**
 * Vercel Deployment Validation Script
 * Run this before deploying to catch common issues
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 Validating Vercel deployment configuration...\n');

const errors = [];
const warnings = [];
const success = [];

// Check vercel.json exists
if (fs.existsSync('vercel.json')) {
  success.push('✅ vercel.json configuration file found');
  
  try {
    const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
    if (vercelConfig.outputDirectory === 'dist/public') {
      success.push('✅ Output directory correctly set to dist/public');
    }
    if (vercelConfig.buildCommand === 'npm run build') {
      success.push('✅ Build command correctly set');
    }
  } catch (e) {
    errors.push('❌ vercel.json is not valid JSON');
  }
} else {
  errors.push('❌ vercel.json not found - create it for proper Vercel configuration');
}

// Check package.json scripts
if (fs.existsSync('package.json')) {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  if (pkg.scripts?.build) {
    success.push('✅ Build script found in package.json');
  } else {
    errors.push('❌ Build script missing in package.json');
  }
  
  if (pkg.dependencies?.['@vercel/node']) {
    success.push('✅ @vercel/node dependency found');
  } else {
    warnings.push('⚠️  @vercel/node dependency missing - API routes may not work');
  }
  
  if (pkg.dependencies?.['vite'] && pkg.dependencies?.['esbuild']) {
    success.push('✅ Build tools (vite, esbuild) found in dependencies');
  } else {
    warnings.push('⚠️  Build tools missing from dependencies - may cause Vercel build issues');
  }
  
  if (pkg.type === 'module') {
    success.push('✅ ES modules configuration detected');
  }
}

// Check API directory structure
if (fs.existsSync('api')) {
  const apiFiles = fs.readdirSync('api').filter(f => f.endsWith('.ts') || f.endsWith('.js'));
  if (apiFiles.length > 0) {
    success.push(`✅ Found ${apiFiles.length} API route files`);
  }
} else {
  warnings.push('⚠️  API directory not found - no serverless functions will be deployed');
}

// Check build output directory
if (fs.existsSync('dist/public')) {
  success.push('✅ Build output directory exists');
} else {
  warnings.push('⚠️  Build output directory not found - run "npm run build" first');
}

// Check environment variables template
if (fs.existsSync('.env.example')) {
  success.push('✅ Environment variables template found');
} else {
  warnings.push('⚠️  .env.example not found - consider creating for documentation');
}

// Check TypeScript configuration
try {
  if (fs.existsSync('tsconfig.json')) {
    success.push('✅ TypeScript configuration found');
  }
} catch (e) {
  warnings.push('⚠️  TypeScript configuration issues detected');
}

// Check Vite configuration for Replit plugins
if (fs.existsSync('vite.config.ts')) {
  try {
    const viteConfig = fs.readFileSync('vite.config.ts', 'utf8');
    if (viteConfig.includes('@replit/vite-plugin') && viteConfig.includes('process.env.REPL_ID')) {
      success.push('✅ Replit plugins are conditionally loaded');
    } else if (viteConfig.includes('@replit/vite-plugin')) {
      warnings.push('⚠️  Replit plugins detected but may not be conditionally loaded');
    }
  } catch (e) {
    warnings.push('⚠️  Could not parse vite.config.ts');
  }
} else {
  warnings.push('⚠️  vite.config.ts not found');
}

// Display results
console.log('📋 VALIDATION RESULTS:\n');

if (success.length > 0) {
  console.log('✅ SUCCESS:');
  success.forEach(msg => console.log(`   ${msg}`));
  console.log('');
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS:');
  warnings.forEach(msg => console.log(`   ${msg}`));
  console.log('');
}

if (errors.length > 0) {
  console.log('❌ ERRORS:');
  errors.forEach(msg => console.log(`   ${msg}`));
  console.log('');
}

// Deployment readiness assessment
if (errors.length === 0) {
  console.log('🚀 DEPLOYMENT STATUS: READY');
  console.log('   Your project is configured for Vercel deployment.');
  console.log('   Next steps:');
  console.log('   1. Set up database (Neon PostgreSQL recommended)');
  console.log('   2. Configure environment variables in Vercel dashboard');
  console.log('   3. Connect GitHub repository to Vercel');
  console.log('   4. Deploy!');
} else {
  console.log('🔧 DEPLOYMENT STATUS: NEEDS ATTENTION');
  console.log('   Please fix the errors above before deploying.');
}

console.log('\n📚 For detailed instructions, see VERCEL_DEPLOYMENT.md');