# 📖 Structura - README.md

```markdown
# 📂 Structura

> **Convert directory structures and files into organized markdown documentation**

[![Node.js](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](README.md)

---

## 🚀 Overview

Structura is a **Node.js script** that generates beautiful, readable markdown documentation from any project directory. It creates:

- ✅ A hierarchical **directory tree** visualization
- ✅ Full **file contents** with syntax-highlighted code blocks
- ✅ Support for **exclusion patterns** to filter out unwanted files/directories
- ✅ **Cross-platform compatible** (Windows/Linux/macOS)

Perfect for generating documentation from your project structure!

---

## 📋 Features

| Feature | Description |
|---------|-------------|
| 🌳 **Directory Tree** | Visual tree representation of your project structure |
| 📁 **File Contents** | Full file contents with syntax-highlighted code blocks |
| 🔧 **Exclusions** | Filter out `node_modules`, `.git`, logs, temp files, etc. |
| 🌐 **Language Detection** | Automatic language detection from file extensions (JS, TS, JSON, HTML, CSS, etc.) |
| 🎯 **Config Support** | Load custom configuration from `config.json` |
| ⚙️ **Size Limits** | Optional file size limiting to avoid huge markdown files |
| 🖥️ **Cross-Platform** | Works on Windows, Linux, and macOS |

---

## 💻 Requirements

- **Node.js >= 22.20.0**
- No external dependencies required (uses built-in `fs` API)

---

## 📦 Installation

### Quick Start (No Dependencies)

Structura is a standalone script—no npm installation needed!

```bash
# Clone or download the files
git clone <[repository-url](https://github.com/maddiethegm/structura.git)> || mkdir structura && cd structura

# Copy your structura.js and config.json into a folder
cp structura.js ./
# (config.json is optional)

# Run directly with Node.js
node structura.js ./src ./output.md
```

### Optional: Project Setup

If you prefer using npm:

```bash
npm init -y
npm install  # No external dependencies needed
```

---

## 🎯 Usage

### Basic Command

```bash
node structura.js <source-directory> <output-file>
```

#### Examples:

```bash
# Convert your src directory to markdown
node structura.js ./src ./output.md

# Generate documentation for a project folder
node structura.js ../Home-Inventory-Controller/oop ./output.md

# Specify output file location
node structura.js . ./documentation/output.md
```

### Command Line Options

| Option | Description | Example |
|--------|-------------|---------|
| `--help` | Show help message | `node structura.js --help` |
| `--config FILE` | Load configuration from JSON file | `node structura.js --config config.json ./src ./output.md` |

### Config File Location

Structura will automatically look for a `config.json` in the following order:

1. If `--config` argument provided, use that path
2. Otherwise, check current directory for `config.json`
3. Otherwise, use CLI arguments as defaults

---

## ⚙️ Configuration (config.json)

Create a `config.json` file in your project directory to customize behavior:

```json
{
  "sourceDir": "./src",              // Root directory to process
  "outputFile": "./output.md",       // Output markdown file path
  "exclusions": {
    "directories": [                  // Directory names to exclude
      "node_modules", 
      ".git",
      "dist",
      "build"
    ],
    "files": [                        // File extension patterns to exclude
      "*.log",
      "*.tmp",
      "*.cache"
    ],
    "names": [                        // Specific filenames to exclude
      "package-lock.json",
      "yarn.lock",
      ".DS_Store",
      "Thumbs.db",
      ".gitignore",
      ".env"
    ]
  },
  "options": {
    "includeHidden": true,            // Include hidden files (.gitkeep, .DS_Store)
    "maxFileSizeMB": 2,              // Max file size before truncation
    "symlinkHandling": "skip"         // Handle symbolic links: skip/follow/validate
  }
}
```

### Configuration Options Explained

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `sourceDir` | string | CLI arg | Root directory to process |
| `outputFile` | string | CLI arg | Output markdown file path |
| `exclusions.directories` | array | `['node_modules', '.git']` | Directory names to exclude |
| `exclusions.files` | array | `['*.log', '*.tmp']` | File extension patterns to exclude (e.g., `*.txt`, `*.ts`) |
| `exclusions.names` | array | Empty | Specific filenames to exclude (exact match or pattern) |
| `options.includeHidden` | boolean | `true` | Include hidden files starting with `.` |
| `options.maxFileSizeMB` | number | `2` | Max file size in MB before truncation |

### Configuration Examples

```json
{
  "sourceDir": "../Home-Inventory-Controller/oop",
  "outputFile": "./documentation.md",
  "exclusions": {
    "directories": ["node_modules", ".git", "dist"],
    "files": ["*.log", "*.tmp", "*.cache", "package-lock.json"]
  }
}
```

---

## 🎨 Output Format

### Directory Structure Section

```markdown
### Directory Structure
```markdown
config.yaml
invRoutes.js
LICENSE
src/
  controllers/
    CoreController.js
    UserController.js
  middleware/
    authMiddleware.js
  services/
    dbconnector/
      connectionManager.js
      queryConstructor.js
    ```
```

### File Contents Section

Each file is displayed with:
- Relative path as comment
- Syntax-highlighted code block (language detected from extension)
- Markdown-safe content (escaped special characters)

Example:

```markdown
### File Contents

---

// File: src/controllers/UserController.js
```javascript
const express = require('express');

class UserController {
    // ...
}
module.exports = UserController;
```
```
---

## 📊 Supported File Types

Structura automatically detects syntax highlighting for these extensions:

| Extension | Language Highlighting |
|-----------|----------------------|
| `js`, `jsx` | JavaScript / JSX |
| `ts`, `tsx` | TypeScript / TSX |
| `json` | JSON |
| `yaml`, `yml` | YAML |
| `html`, `htm` | HTML |
| `css`, `scss`, `sass`, `less` | CSS / SCSS / Sass / Less |
| `xml`, `svg` | XML / SVG |
| `md`, `markdown`, `txt`, `text` | Markdown / Text |
| `toml`, `map`, `min.js` | TOML / Map / Minified JS |

All other extensions default to `text` highlighting.

---

## 🎯 Use Cases

- Generate project documentation for team onboarding
- Create changelog-ready file structure records
- Document codebase for public repositories
- Archive project snapshots as markdown
- Share project structure without needing to browse folders

---

## ⚠️ Limitations

- **No binary file support** – Only text files with valid UTF-8 encoding
- **File size limit** – Files > 2MB are truncated (configurable)
- **Read-only operations** – Script only reads file content, doesn't modify
- **Permission errors** – May silently skip unreadable subdirectories
- **Backtick escaping** – Content with backticks is escaped to prevent code block breakage

---

## 📦 Project Structure

```bash
structura/
├── structura.js          # Main script (executable)
├── config.json           # Optional configuration file
├── README.md            # This documentation
└── LICENSE              # MIT License
```

---

## 🛠️ Contributing

Contributions welcome! Here's how to help:

1. **Report bugs** – Submit issues on GitHub
2. **Feature requests** – Suggest new features in the issues section
3. **Improve documentation** – Edit this README.md file
4. **Submit PRs** – Pull requests are welcome for bug fixes and improvements

### Before Contributing

- Check existing issues/PRs first
- Ensure Node.js >= 22.20.0 is installed
- Test locally before submitting changes

---

## 📜 License

MIT License - Free for personal and commercial use.

See [LICENSE](LICENSE) file for details.

---

## 📞 Support & Contact

**Issues**: Create a GitHub issue    
**GitHub**: [structura](https://github.com/maddiethegm/structura)
---

## ⭐ Star History

[![Stargazers over time](https://starchart-backup.github.io/api/maddiethegm/structura)](https://github.com/maddiethegm/structura)

---

## 🔄 Version History

| Version | Date      | Notes           |
|---------|-----------|-----------------|
| 1.0.0   | 2024      | Initial Release |

---

<div align="center">
  <strong>🔧 Built with Node.js — No external dependencies</strong>
</div>
```
