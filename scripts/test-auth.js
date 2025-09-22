// Simple test script to verify auth function structure
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const authFunctionPath = join(process.cwd(), 'api', 'auth.ts');
const bookmarksFunctionPath = join(process.cwd(), 'api', 'bookmarks.ts');

console.log('Checking authentication function...');
if (existsSync(authFunctionPath)) {
  console.log('✓ Authentication function exists');
  // Check if it has the required export
  const authContent = readFileSync(authFunctionPath, 'utf8');
  if (authContent.includes('export default')) {
    console.log('✓ Authentication function has default export');
  } else {
    console.log('✗ Authentication function missing default export');
  }
  
  if (authContent.includes('handler(')) {
    console.log('✓ Authentication function has handler implementation');
  } else {
    console.log('✗ Authentication function missing handler implementation');
  }
} else {
  console.log('✗ Authentication function does not exist');
}

console.log('Checking bookmarks function...');
if (existsSync(bookmarksFunctionPath)) {
  console.log('✓ Bookmarks function exists');
  // Check if it has the required export
  const bookmarksContent = readFileSync(bookmarksFunctionPath, 'utf8');
  if (bookmarksContent.includes('export default')) {
    console.log('✓ Bookmarks function has default export');
  } else {
    console.log('✗ Bookmarks function missing default export');
  }
} else {
  console.log('✗ Bookmarks function does not exist');
}

console.log('Test completed.');