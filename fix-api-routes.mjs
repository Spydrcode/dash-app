import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const apiDir = './src/app/api';

function fixApiRoute(filePath) {
  try {
    let content = readFileSync(filePath, 'utf8');
    let modified = false;

    // Fix pattern 1: process.env.NEXT_PUBLIC_SUPABASE_URL!
    if (content.includes('process.env.NEXT_PUBLIC_SUPABASE_URL!')) {
      content = content.replace(/process\.env\.NEXT_PUBLIC_SUPABASE_URL!/g, 'process.env.NEXT_PUBLIC_SUPABASE_URL');
      modified = true;
    }

    // Fix pattern 2: process.env.SUPABASE_SERVICE_ROLE_KEY!
    if (content.includes('process.env.SUPABASE_SERVICE_ROLE_KEY!')) {
      content = content.replace(/process\.env\.SUPABASE_SERVICE_ROLE_KEY!/g, 'process.env.SUPABASE_SERVICE_ROLE_KEY');
      modified = true;
    }

    // Fix pattern 3: process.env.OPENAI_API_KEY!
    if (content.includes('process.env.OPENAI_API_KEY!')) {
      content = content.replace(/process\.env\.OPENAI_API_KEY!/g, 'process.env.OPENAI_API_KEY');
      modified = true;
    }

    // Add null checks after createClient calls
    if (content.includes('createClient(supabaseUrl, supabaseKey)') && !content.includes('if (!supabaseUrl || !supabaseKey)')) {
      content = content.replace(
        /const supabaseAdmin = createClient\(supabaseUrl, supabaseKey\);/g,
        `if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);`
      );
      modified = true;
    }

    if (modified) {
      writeFileSync(filePath, content);
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

function walkDirectory(dir) {
  const files = readdirSync(dir);
  let fixedCount = 0;

  for (const file of files) {
    const fullPath = join(dir, file);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      fixedCount += walkDirectory(fullPath);
    } else if (file === 'route.ts') {
      if (fixApiRoute(fullPath)) {
        fixedCount++;
      }
    }
  }

  return fixedCount;
}

console.log('🔧 Fixing API routes for build compatibility...');
const fixedCount = walkDirectory(apiDir);
console.log(`✅ Fixed ${fixedCount} API route files`);