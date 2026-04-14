/**
 * Structura - Directory Structure to Markdown Converter with Advanced Filtering
 * 
 * Usage: node structura.js [options] <source-directory> <output-file>
 */

const fs = require('fs').promises;
const path = require('path');

// ============================================
// STATEFUL CONFIGURATION OBJECTS
// ============================================

let configData = { sourceDir: null, outputFile: null };
let excludeDirectories = [];
let excludeExtensions = [];
let excludeNames = []; // For filename filtering
let maxFileSizeMB = 2;
let includeHidden = true;
let isDebugMode = process.env.DEBUG === 'true';

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if item name matches exclusion pattern (directories, extensions, or names)
 * @param {string} name - Item name to check
 * @param {string[]} excludedExtensions - List of extension patterns (*.txt, *.log, etc.)
 * @param {string[]} excludedDirectories - List of directory names to exclude
 * @param {string[]} excludedNames - List of specific file/directory names to exclude
 * @param {boolean} includeHidden - Whether to include hidden files (starting with .)
 * @returns {boolean} True if item should be excluded
 */
function isExcluded(name, excludedExtensions, excludedDirectories, excludedNames, includeHidden = true) {
    const lowerName = name.toLowerCase();
    const ext = path.extname(name).toLowerCase().replace('.', '') || '';

    // ✅ SKIP HIDDEN FILES (unless explicitly included)
    if (name.startsWith('.') && !includeHidden) return true;

    // ========== 1. CHECK DIRECTORY EXCLUSIONS ==========
    for (const excludedDir of excludedDirectories) {
        const dirLower = excludedDir.toLowerCase().trim();
        
        if (dirLower === '*' || lowerName === dirLower) {
            console.log(`     ❌ [DIR] Excluded: "${name}" matches directory pattern: "${excludedDir}"`);
            return true;
        } else if (dirLower.startsWith('*')) {
            const pattern = dirLower.replace('*', '');
            if (lowerName.endsWith(pattern)) {
                console.log(`     ❌ [DIR] Excluded: "${name}" matches directory pattern: "${excludedDir}"`);
                return true;
            }
        }
    }

    // ========== 2. CHECK EXTENSION EXCLUSIONS ==========
    for (const excludedExt of excludedExtensions) {
        const extPattern = excludedExt.toLowerCase().trim();
        
        if (extPattern.startsWith('*')) {
            const pattern = extPattern.replace('*', '');
            if (ext.endsWith(pattern)) {
                console.log(`     ❌ [EXT] Excluded: "${name}" matches extension pattern: "${excludedExt}"`);
                return true;
            }
        } else if (ext && ext === extPattern) {
            console.log(`     ❌ [EXT] Excluded: "${name}" has excluded extension: "${excludedExt}"`);
            return true;
        }
    }

    // ========== 3. CHECK NAME EXCLUSIONS ==========
    for (const excludedName of excludedNames) {
        const namePattern = excludedName.toLowerCase().trim();
        
        if (namePattern.startsWith('*')) {
            const pattern = namePattern.replace('*', '');
            if (lowerName.endsWith(pattern)) {
                console.log(`     ❌ [NAME] Excluded: "${name}" matches exclusion name pattern: "${excludedName}"`);
                return true;
            }
        } else if (lowerName === namePattern) {
            console.log(`     ❌ [NAME] Excluded: "${name}" matches exclusion name exactly: "${excludedName}"`);
            return true;
        }
    }

    // ========== 4. CHECK FILESIZE (for files only) ==========
    if (!path.extname(name).startsWith('.') && !includeHidden) {
        // filesize check happens later, not here
    }

    console.log(`     ✅ Included: "${name}" (no exclusion matches)`);
    return false;
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
    const options = { config: null, sourceDir: null, outputFile: null };
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg === '--help') {
            console.log(`
Structura - Directory Structure to Markdown Converter with Advanced Filtering


USAGE:
  node structura.js [options] <source-directory> <output-file>

OPTIONS:
  --config FILE   Load configuration from JSON file
  --help          Show this help message

CONFIGURATION (config.json):
{
  "sourceDir": "./src",              // Root directory to process
  "outputFile": "./output.md",       // Output markdown file path
  "exclusions": {
    "directories": [                  // Directory names to exclude
      "node_modules", 
      ".git"
    ],
    "files": [                        // File extension patterns to exclude
      "*.log", 
      "*.tmp", 
      "*.cache"
    ],
    "names": [                        // Specific filenames to exclude
      "README.md",                    
      ".env.example"
    ]
  },
  "options": {
    "includeHidden": true,            // Include hidden files (.gitkeep, .DS_Store)
    "maxFileSizeMB": 2,              // Max file size before truncation
    "symlinkHandling": "skip"         // Handle symbolic links: skip/follow/validate
  }
}

EXAMPLES:
  node structura.js ./src ./output.md
  node structura.js --config config.json ./src ./output.md
  node structura.js . documentation.md
        `);
            process.exit(0);
        } else if (arg === '--config') {
            options.config = args[i + 1] || null;
            i++; // skip next argument (the config file path)
        } else {
            // Positional arguments: sourceDir, then outputFile
            if (!options.sourceDir) options.sourceDir = arg;
            else if (!options.outputFile) options.outputFile = arg;
        }
    }
    
    return options;
}

/**
 * Load configuration file with fallback to defaults
 */
async function loadConfig(configPath, configData) {
    try {
        const exists = await fs.access(configPath).then(() => true).catch(() => false);
        
        if (exists) {
            console.log(`📄 Loading config from: ${configPath}`);
            const configContent = await fs.readFile(configPath, 'utf-8');
            const parsed = JSON.parse(configContent);
            
            // Merge defaults with config values
            return { ...configData, ...parsed };
        } else {
            console.log(`⚠️ Config file "${configPath}" not found. Using CLI defaults.`);
        }
    } catch (err) {
        console.error(`❌ Error loading config: ${err.message}`);
    }
    
    return configData;
}

/**
 * Validate source directory exists and is a directory
 */
async function checkRootDir(rootDir) {
    try {
        const stat = await fs.stat(rootDir);
        
        if (!stat.isDirectory()) {
            console.error(`Error: "${rootDir}" exists but is not a directory.`);
            process.exit(1);
        }
        
        return true;
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.error(`Error: Directory "${rootDir}" does not exist.`);
            process.exit(1);
        } else {
            console.error(`Error checking directory: ${err.message}`);
            process.exit(1);
        }
    }
}

/**
 * Escape markdown special characters for safe code blocks
 */
function escapeMarkdown(text) {
    if (!text) return '';
    
    return text
        .replace(/\\/g, '\\\\')       // Backslash first (escape backslashes)
        .replace(/`/g, '\\`')         // Then backticks (prevents code block breakage)
        .replace(/\t/g, '\\t')        // Tab characters
        .trim();                      // Trim leading/trailing whitespace
}

/**
 * Generate directory tree visualization - FIXED version
 */
async function generateTree(sourceDir, dir, level = 0) {
    const indentChars = '  ';
    const indentString = level > 0 ? indentChars.repeat(level).trim() + '/': '';
    
    try {
        console.log(`🔍 Scanning directory at level ${level}: ${dir}`);
        
        const items = await fs.readdir(dir, { withFileTypes: true });
        
        for (const item of items) {
            const name = item.name;
            
            // ========== CHECK ALL EXCLUSIONS ==========
            if (isExcluded(name, excludeExtensions, excludeDirectories, excludeNames, includeHidden)) {
                console.log(`     📝 Skipped from tree: "${name}"`);
                continue;
            }
            
            const fullPath = path.join(dir, name);
            const stat = await fs.stat(fullPath);
            
            // ========== HANDLE FILES ==========
            if (!stat.isDirectory()) {
                const relPath = path.relative(sourceDir, fullPath);
                
                console.log(`     📄 Tree item: ${indentString}${relPath}`);
                
                // Add to tree lines with proper indentation
                const indent = level === 0 ? '' : (level > 1 ? indentChars.repeat(level - 2) : '') + '/';
                if (level > 0) {
                    const dirIndent = indentChars.repeat(level).trim();
                    console.log(`     ✅ Adding: ${dirIndent}${relPath.replace(/\/$/, '')}\n`);
                }
                
                // Add to tree lines with correct indentation
                const relPathWithoutSlash = relPath.replace(/\/$/, '');
                const finalIndent = level === 0 ? '' : indentChars.repeat(level);
                treeLines.push(`${finalIndent}${relPathWithoutSlash}\n`);
            } 
            // ========== HANDLE DIRECTORIES ==========
            else {
                const dirBasename = name.toLowerCase();
                
                // Check if this is an excluded directory
                const isExcludedDir = excludeDirectories.some(d => d.toLowerCase() === dirBasename);
                
                if (isExcludedDir) {
                    console.log(`     🚫 Tree skipped: ${name} (excluded directory)`);
                    continue; // Skip and don't recurse into this directory
                }
                
                const isSymlink = stat.isSymbolicLink();
                const dirName = isSymlink ? `${name} (link)/` : `${name}/`;
                
                console.log(`     📁 Tree item: ${indentString}${dirName}`);
                
                // Add to tree lines with proper indentation
                if (level > 0) {
                    const dirIndent = indentChars.repeat(level).trim();
                    console.log(`     ✅ Adding directory: ${dirIndent}${dirName}\n`);
                }
                
                const treeIndent = level === 0 ? '' : indentChars.repeat(level).trim();
                treeLines.push(`${treeIndent}${dirName}\n`);
                
                // Recurse into subdirectory (only if not excluded)
                console.log(`     🔄 Recursing into: ${fullPath}`);
                await generateTree(sourceDir, fullPath, level + 1);
            }
        }
        
        console.log(`📝 Directory tree complete for: ${dir}`);
    } catch (err) {
        console.warn(`Warning: Could not read directory "${dir}": ${err.message}`);
        if (!isDebugMode) {} // Silently handle permission errors
    }
}

/**
 * Collect file contents with proper filtering and language detection
 */
async function collectFiles(sourceDir, dir, level = 0) {
    const indent = '  '.repeat(level);
    
    try {
        console.log(`🔍 Scanning: ${path.relative(sourceDir, dir)}`);
        
        const items = await fs.readdir(dir, { withFileTypes: true });
        
        for (const item of items) {
            const name = item.name;
            
            // ========== CHECK EXCLUSIONS ==========
            if (isExcluded(name, excludeExtensions, excludeDirectories, excludeNames, includeHidden)) {
                console.log(`     ❌ Collect skipped: "${name}"`);
                continue;
            }
            
            const fullPath = path.join(dir, name);
            const stat = await fs.stat(fullPath);
            
            // ========== ONLY PROCESS NON-DIRECTORIES ==========
            if (!stat.isDirectory()) {
                try {
                    console.log(`     🔍 Reading: ${path.relative(sourceDir, fullPath)}`);
                    
                    let content = await fs.readFile(fullPath, 'utf-8');
                    
                    // ========== APPLY MAX FILE SIZE LIMIT ==========
                    const maxSizeBytes = maxFileSizeMB * 1024 * 1024;
                    if (Buffer.byteLength(content) > maxSizeBytes) {
                        console.warn(`     ⚠️ Large file truncated: ${name} (${Math.round(Buffer.byteLength(content)/1024/1024)}MB)`);
                        content = `[File too large (${Math.round(Buffer.byteLength(content)/1024/1024)}MB)]`;
                    }
                    
                    // ========== ESCAPE MARKDOWN CHARACTERS ==========
                    const escapedContent = escapeMarkdown(content);
                    
                    // ========== DETERMINE LANGUAGE FROM EXTENSION ==========
                    let lang = 'text';
                    const ext = path.extname(fullPath).substring(1).toLowerCase();
                    
                    const langMap = {
                        js: 'javascript', ts: 'typescript', jsx: 'jsx', tsx: 'tsx',
                        json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'toml',
                        html: 'html', htm: 'html', css: 'css', scss: 'scss', sass: 'sass', less: 'less',
                        xml: 'xml', svg: 'svg', md: 'markdown', markdown: 'markdown', txt: 'text'
                    };
                    
                    lang = langMap[ext] || ext || 'text';
                    
                    // ========== DETERMINE FILE SIZE FOR LOGGING ==========
                    const fileSizeMB = Math.round(Buffer.byteLength(content) / 1024 / 1024);
                    
                    // ========== STORE WITH RELATIVE PATH ==========
                    const relPath = path.relative(sourceDir, fullPath);
                    console.log(`     ✅ Added: ${relPath} (${lang}, ${fileSizeMB}MB)`);
                    
                    fileContentsMap.set(relPath, { content: escapedContent, lang });
                } catch (readErr) {
                    console.warn(`Warning: Could not read file "${fullPath}": ${readErr.message}`);
                }
            } 
            // ========== RECURSE INTO DIRECTORIES ==========
            else {
                await collectFiles(sourceDir, fullPath, level + 1);
            }
        }
    } catch (err) {
        console.warn(`Warning: Could not read directory "${dir}": ${err.message}`);
        if (!isDebugMode) {} // Silently handle permission errors
    }
}

/**
 * Main function - orchestrates the entire process
 */
async function main() {
    const args = process.argv.slice(2);
    
    console.log(`\n🚀 Structura v1.0.0 starting...`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // ========== 1. PARSE ARGUMENTS ==========
    console.log(`📊 PARSING: ${args.length} arguments received`);
    const options = parseArgs(args);
    
    console.log(`     ✅ Options parsed:`);
    console.log(`        - sourceDir: "${options.sourceDir}"`);
    console.log(`        - outputFile: "${options.outputFile}"`);
    console.log(`        - config: ${options.config || 'null'}`);

    // ========== 2. VALIDATE REQUIRED ARGUMENTS ==========
    if (!options.sourceDir || !options.outputFile) {
        console.error('\n❌ Error: Source directory and output file are required.');
        process.exit(1);
    }

    // ========== 3. LOAD CONFIGURATION ==========
    let configPath = options.config;
    
    if (configPath) {
        try {
            const absoluteConfigPath = path.resolve(configPath);
            console.log(`📄 Loading config from: ${absoluteConfigPath}`);
            
            const loadedConfig = await loadConfig(absoluteConfigPath, configData);
            configData = loadedConfig;
            console.log(`     ✅ Config loaded successfully`);
        } catch (err) {
            console.error(`❌ Error loading config: ${err.message}`);
            process.exit(1);
        }
    } else {
        const defaultConfigPath = path.join(process.cwd(), 'config.json');
        try {
            await fs.access(defaultConfigPath);
            console.log(`📄 Loading default config from: ${defaultConfigPath}`);
            
            const loadedConfig = await loadConfig(defaultConfigPath, configData);
            configData = loadedConfig;
            console.log(`     ✅ Default config loaded successfully`);
        } catch (err) {
            console.log(`⚠️ No config file found. Using defaults.`);
        }
    }

    // ========== 4. EXTRACT CONFIG VALUES ==========
    const sourceDir = configData.sourceDir || options.sourceDir;
    const outputFile = configData.outputFile || options.outputFile;
    
    console.log(`\n📍 Configuration:`);
    console.log(`   Source directory: ${sourceDir}`);
    console.log(`   Output file:      ${outputFile}`);

    // ========== 5. APPLY DEFAULT VALUES FROM CONFIG ==========
    const exclusions = configData.exclusions || { directories: [], files: [] };
    const optionsConfig = configData.options || {};
    
    // ========== INITIALIZE STATEFUL EXCLUSION OBJECTS ==========
    console.log(`\n📋 Initializing exclusion filters:`);
    
    // Extract directories to exclude (always exclude node_modules, .git by default)
    excludeDirectories = exclusions.directories 
        ? exclusions.directories.filter(d => d)
        : ['node_modules', '.git']; // Default exclusions
    
    console.log(`   - Excluded directories (${excludeDirectories.length}): ${JSON.stringify(excludeDirectories)}`);

    // Extract file extension patterns (excluding package-lock.json, yarn.lock by default)
    excludeExtensions = exclusions.files 
        ? exclusions.files.map(f => {
            if (f.startsWith('*')) return f.substring(1).toLowerCase();
            return f.toLowerCase();
        }).filter(f => f && !['package-lock.json', 'yarn.lock'].includes(f))
        : ['*.log', '*.tmp']; // Default exclusion patterns
    
    console.log(`   - Excluded extensions (${excludeExtensions.length}): ${JSON.stringify(excludeExtensions)}`);

    // Extract specific file names to exclude (NEW!)
    const configNames = exclusions.names || []; // Config option for name exclusions
    excludeNames = configNames.filter(n => n);
    
    console.log(`   - Excluded file names (${excludeNames.length}): ${JSON.stringify(excludeNames)}`);

    // Apply size limit
    maxFileSizeMB = optionsConfig.maxFileSizeMB || 2;
    console.log(`   - Max file size: ${maxFileSizeMB}MB`);

    // Apply hidden file handling
    includeHidden = optionsConfig.includeHidden !== false;
    console.log(`   - Include hidden files: ${includeHidden}`);

    // ========== 6. VALIDATE SOURCE DIRECTORY EXISTS ==========
    await checkRootDir(sourceDir);
    console.log(`\n✅ Source directory exists and is valid`);

    // ========== 7. GENERATE DIRECTORY TREE ==========
    console.log(`\n🌳 Generating directory tree...`);
    
    const treeLines = [];
    
    async function generateTreeHelper(dir, level = 0) {
        try {
            const items = await fs.readdir(dir, { withFileTypes: true });
            
            for (const item of items) {
                const name = item.name;
                
                // Check exclusions BEFORE adding to tree
                if (isExcluded(name, excludeExtensions, excludeDirectories, excludeNames, includeHidden)) {
                    console.log(`     📝 Tree skipped: "${name}"`);
                    continue;
                }
                
                const fullPath = path.join(dir, name);
                const stat = await fs.stat(fullPath);
                
                if (!stat.isDirectory()) {
                    // ✅ File - add relative path with CORRECT indentation
                    const relPath = path.relative(sourceDir, fullPath);
                    
                    console.log(`     📄 Tree: ${relPath}`);
                    
                    // Add to treeLines with CORRECT indentation at each level
                    if (level === 0) {
                        // Root level: just the relative path
                        treeLines.push(`${relPath}\n`);
                    } else {
                        // Subdirectory levels: add proper indent and slash for parent dir
                        const parentIndent = Array(level - 1).fill('  ').join('') + '  ';
                        treeLines.push(`${parentIndent}${relPath.replace(/\/$/, '')}\n`);
                    }
                } else {
                    // ✅ Directory - add with proper indentation and trailing slash
                    const dirBasename = name.toLowerCase();
                    
                    const isExcludedDir = excludeDirectories.some(d => d.toLowerCase() === dirBasename);
                    
                    if (isExcludedDir) {
                        console.log(`     🚫 Tree skipped: ${name} (excluded directory)`);
                        continue; // Skip and don't recurse into this directory
                    }
                    
                    const isSymlink = stat.isSymbolicLink();
                    const dirName = isSymlink ? `${name} (link)/` : `${name}/`;
                    
                    console.log(`     📁 Tree: ${dirName}`);
                    
                    // ✅ Add to treeLines with CORRECT indentation
                    if (level === 0) {
                        // Root level directory (no extra indent, just name with slash)
                        treeLines.push(`${dirName}\n`);
                    } else {
                        // Subdirectory: add proper indent + slash for parent dir
                        const parentIndent = Array(level - 1).fill('  ').join('') + '  ';
                        treeLines.push(`${parentIndent}${name}/\n`);
                    }
                    
                    // ✅ Always recurse into non-excluded directories, regardless of level
                    await generateTreeHelper(fullPath, level + 1);
                }
            }
        } catch (err) {
            if (!isDebugMode) {} // Silently handle permission errors
        }
    }

    await generateTreeHelper(sourceDir, 0);
    
    // ✅ DON'T SORT THE TREE - It breaks the hierarchy!
    console.log(`     🌳 Directory tree generated: ${treeLines.length} entries`);
    console.log(`     ✅ Tree structure with proper hierarchical indentation\n`);

    // ========== 8. COLLECT FILE CONTENTS ==========
    console.log(`📁 Collecting file contents...`);
    
    const fileContentsMap = new Map();
    
    async function collectFilesHelper(dir, level = 0) {
        try {
            console.log(`     🔍 Scanning: ${path.relative(sourceDir, dir)}`);
            
            const items = await fs.readdir(dir, { withFileTypes: true });
            
            for (const item of items) {
                const name = item.name;
                
                // Skip hidden files unless explicitly included
                if (!includeHidden && name.startsWith('.')) continue;
                
                const fullPath = path.join(dir, name);
                const stat = await fs.stat(fullPath);
                
                // Check exclusions before reading file content
                if (isExcluded(name, excludeExtensions, excludeDirectories, excludeNames, includeHidden)) {
                    console.log(`     ❌ Collect skipped: "${name}"`);
                    continue;
                }
                
                // Only process non-directories at this level
                if (!stat.isDirectory()) {
                    try {
                        let content = await fs.readFile(fullPath, 'utf-8');
                        
                        // Apply max file size limit
                        const maxSizeBytes = maxFileSizeMB * 1024 * 1024;
                        if (Buffer.byteLength(content) > maxSizeBytes) {
                            console.log(`     ⚠️ Large file skipped: ${name} (${Math.round(Buffer.byteLength(content)/1024/1024)}MB)`);
                            content = `[File too large (${Math.round(Buffer.byteLength(content)/1024/1024)}MB)]`;
                        }
                        
                        // Escape markdown special characters
                        const escapedContent = escapeMarkdown(content);
                        
                        // Determine language from extension
                        let lang = 'text';
                        const ext = path.extname(fullPath).substring(1).toLowerCase();
                        
                        const langMap = {
                            js: 'javascript', ts: 'typescript', jsx: 'jsx', tsx: 'tsx',
                            json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'toml',
                            html: 'html', htm: 'html', css: 'css', scss: 'scss', sass: 'sass', less: 'less',
                            xml: 'xml', svg: 'svg', md: 'markdown', markdown: 'markdown', txt: 'text'
                        };
                        
                        lang = langMap[ext] || ext || 'text';
                        
                        // Store with relative path as key
                        const relPath = path.relative(sourceDir, fullPath);
                        console.log(`     ✅ Added: ${relPath} (${lang}, ${Buffer.byteLength(content)} bytes)`);
                        fileContentsMap.set(relPath, { content: escapedContent, lang });
                    } catch (readErr) {
                        console.warn(`Warning: Could not read file "${fullPath}": ${readErr.message}`);
                    }
                } else {
                    // Directory - continue traversing
                    await collectFilesHelper(fullPath, level + 1);
                }
            }
        } catch (err) {
            if (!isDebugMode) {} // Silently handle permission errors
        }
    }

    await collectFilesHelper(sourceDir, 0);
    console.log(`     📁 File collection complete: ${fileContentsMap.size} files processed`);

    // ========== 9. GENERATE MARKDOWN OUTPUT ==========
    console.log(`\n📝 Generating markdown output...`);
    
    let markdownContent = '### Directory Structure\n';
    
    if (treeLines.length > 0) {
        // ✅ CRITICAL: DO NOT SORT treeLines - it destroys hierarchy!
        markdownContent += '```\ntext\n' + treeLines.join('').trim() + '\n```\n\n';
        
        console.log(`     📋 Directory structure written with ${treeLines.length} entries`);
    } else {
        console.log('     ⚠️ No directory structure found');
    }

    markdownContent += '### File Contents\n';

    // Only add files section if we have files
    if (fileContentsMap.size > 0) {
        const sortedFiles = Array.from(fileContentsMap.entries()).sort((a, b) => 
            a[0].localeCompare(b[0], undefined, { numeric: true })
        );

        for (const [relPath, { content, lang }] of sortedFiles) {
            markdownContent += `\n\n---\n\n// File: ${relPath}\n`;
            
            // Use appropriate language for code block fence
            const finalLang = lang === 'unknown' || !lang ? 'text' : lang;
            
            // Ensure proper escaping within the file content
            markdownContent += `\`\`\`${finalLang}\n${content}\n\`\`\``;
        }
    } else {
        console.log('     ⚠️ No files found to process');
    }

    // ========== 10. WRITE OUTPUT FILE ==========
    try {
        const outputDir = path.dirname(outputFile);
        await fs.mkdir(outputDir, { recursive: true });
        await fs.writeFile(outputFile, markdownContent, 'utf-8');
        
        console.log(`\n✅ Output written to: ${outputFile}`);
        console.log(`📁 Files processed: ${fileContentsMap.size}`);
        console.log(`   - Directory entries: ${treeLines.length}`);
    } catch (err) {
        console.error(`❌ Error writing output file: ${err.message}`);
        process.exit(1);
    }

    console.log(`\n🎉 Structura completed successfully!\n`);
}


// ============================================
// MAIN EXECUTION
// ============================================

console.log('🚀 Starting Structura...\n');

main().catch(err => {
    console.error(`❌ Fatal error: ${err.message}`);
    if (process.env.NODE_ENV !== 'production') {
        console.error(err.stack);
    }
    process.exit(1);
});
