from mcp.server.fastmcp import FastMCP
import os
import psutil
import uvicorn
from pathlib import Path
import subprocess
import time
import requests
import json
import signal
import sys
import glob
import re

# Initialize FastMCP
# This handles tools, resources, and prompts automatically
mcp = FastMCP("Local System MCP")

# Global variables for ngrok
ngrok_process = None
ngrok_url = None

TEXT_EXTENSIONS = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".kt", ".kts", ".go", ".rs", ".rb", ".php",
    ".c", ".h", ".cpp", ".hpp", ".cs", ".swift", ".scala", ".r", ".m", ".mm", ".sql", ".sh",
    ".bash", ".zsh", ".ps1", ".yaml", ".yml", ".json", ".toml", ".ini", ".cfg", ".conf",
    ".xml", ".html", ".htm", ".css", ".scss", ".sass", ".less", ".md", ".txt", ".csv", ".env",
    ".dockerfile", ".gradle", ".properties", ".graphql", ".proto", ".vue", ".svelte"
}

def _is_likely_text_file(file_path: str) -> bool:
    """Return True for common text/code files and files without obvious binary signature."""
    ext = Path(file_path).suffix.lower()
    if ext in TEXT_EXTENSIONS:
        return True

    try:
        with open(file_path, "rb") as f:
            sample = f.read(2048)
    except Exception:
        return False

    if b"\x00" in sample:
        return False

    if not sample:
        return True

    # If most bytes are printable ASCII or common whitespace, treat as text.
    printable = sum(1 for b in sample if 32 <= b <= 126 or b in (9, 10, 13))
    return (printable / len(sample)) >= 0.7

def _read_text_file(file_path: str) -> str:
    """Read text file with common fallbacks."""
    for encoding in ("utf-8", "utf-8-sig", "latin-1"):
        try:
            with open(file_path, "r", encoding=encoding) as f:
                return f.read()
        except UnicodeDecodeError:
            continue
    raise UnicodeDecodeError("unknown", b"", 0, 1, "unsupported text encoding")

def start_ngrok():
    """Start ngrok tunnel and return the public URL"""
    global ngrok_process, ngrok_url
    
    try:
        print("🚀 Starting ngrok tunnel...")
        
        # Start ngrok tunnel
        cmd = [
            "ngrok", "http", 
            "8000",
            "--log=stdout",
            "--log-format=json",
            "--host-header=rewrite"
        ]
        
        ngrok_process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        
        # Wait for ngrok to start and get URL
        time.sleep(2)
        
        # Get ngrok API URL
        try:
            response = requests.get("http://127.0.0.1:4040/api/tunnels", timeout=10)
            if response.status_code == 200:
                tunnels = response.json()
                if tunnels.get("tunnels"):
                    ngrok_url = tunnels["tunnels"][0]["public_url"]
                    print(f"✅ Ngrok tunnel established: {ngrok_url}")
                    return ngrok_url
        except Exception as e:
            print(f"⚠️  Could not get ngrok URL from API: {e}")
            
        # Fallback: parse ngrok output
        for line in iter(ngrok_process.stdout.readline, ''):
            if "url=" in line:
                try:
                    data = json.loads(line)
                    if "url" in data:
                        ngrok_url = data["url"]
                        print(f"✅ Ngrok tunnel established: {ngrok_url}")
                        return ngrok_url
                except json.JSONDecodeError:
                    pass
                    
        print("❌ Failed to establish ngrok tunnel")
        return None
        
    except FileNotFoundError:
        print("❌ ngrok not found. Please install ngrok:")
        print("   curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null")
        print("   echo 'deb https://ngrok-agent.s3.amazonaws.com buster main' | sudo tee /etc/apt/sources.list.d/ngrok.list")
        print("   sudo apt update && sudo apt install ngrok")
        return None
    except Exception as e:
        print(f"❌ Error starting ngrok: {e}")
        return None

def display_urls():
    """Display connection URLs"""
    print("\n" + "="*60)
    print("🌐 MCP SERVER URLS")
    print("="*60)
    print(f"📡 Local URL:     http://localhost:8000")
    if ngrok_url:
        print(f"🌍 Public URL:    {ngrok_url}")
        print(f"🔗 SSE Endpoint: {ngrok_url}/sse")
    else:
        print("🌍 Public URL:    Not available")
    print("="*60)
    print("\n📋 Use these URLs in your MCP client configuration")
    print("💡 For remote access, use the public ngrok URL")
    print("⚡ For local development, use the localhost URL")
    print("\n🔄 Press Ctrl+C to stop both services")
    print()

def cleanup():
    """Clean up ngrok process"""
    global ngrok_process
    if ngrok_process:
        ngrok_process.terminate()
        ngrok_process.wait()
        print("✅ Ngrok stopped")

def signal_handler(sig, frame):
    """Handle shutdown signals"""
    print("\n🛑 Shutdown signal received...")
    cleanup()
    sys.exit(0)

@mcp.tool()
async def get_system_stats() -> str:
    """Returns CPU, Memory, and Disk usage statistics."""
    cpu = psutil.cpu_percent(interval=1)
    mem = psutil.virtual_memory().percent
    disk = psutil.disk_usage('/').percent
    return f"CPU Usage: {cpu}% | Memory Usage: {mem}% | Disk Usage: {disk}%"

@mcp.tool()
async def list_workspace_files(path: str = ".") -> str:
    """Lists files in the current workspace directory."""
    # Security: Stay within the current working directory
    absolute_base = os.getcwd()
    target_path = os.path.abspath(os.path.join(absolute_base, path))
    
    if not target_path.startswith(absolute_base):
        return "Error: Access denied to paths outside workspace."
        
    try:
        if not os.path.exists(target_path):
            return f"Error: Path {path} does not exist."
        
        files = os.listdir(target_path)
        if not files:
            return f"Directory {path} is empty."
            
        return "\n".join(files)
    except Exception as e:
        return f"Error listing files: {str(e)}"

@mcp.tool()
async def read_file(file_path: str) -> str:
    """Reads the contents of a file in the workspace."""
    # Security: Stay within the current working directory
    absolute_base = os.getcwd()
    target_path = os.path.abspath(os.path.join(absolute_base, file_path))
    
    if not target_path.startswith(absolute_base):
        return "Error: Access denied to paths outside workspace."
    
    try:
        if not os.path.exists(target_path):
            return f"Error: File {file_path} does not exist."
            
        if os.path.isdir(target_path):
            return f"Error: {file_path} is a directory, not a file."
            
        # Check file size to prevent reading huge files
        file_size = os.path.getsize(target_path)
        if file_size > 15 * 1024 * 1024:  # 15MB limit
            return f"Error: File {file_path} is too large ({file_size} bytes). Limit is 15MB."
            
        if not _is_likely_text_file(target_path):
            return f"Error: File {file_path} appears to be binary and cannot be displayed as text."
            
        content = _read_text_file(target_path)
            
        return content
    except UnicodeDecodeError:
        return f"Error: File {file_path} could not be decoded as text."
    except Exception as e:
        return f"Error reading file: {str(e)}"

@mcp.tool()
async def search_files(pattern: str, path: str = ".") -> str:
    """Search for files by name pattern in the workspace."""
    # Security: Stay within the current working directory
    absolute_base = os.getcwd()
    target_path = os.path.abspath(os.path.join(absolute_base, path))
    
    if not target_path.startswith(absolute_base):
        return "Error: Access denied to paths outside workspace."
    
    try:
        if not os.path.exists(target_path):
            return f"Error: Path {path} does not exist."
            
        matches = []
        for root, dirs, files in os.walk(target_path):
            for file in files:
                if pattern.lower() in file.lower():
                    rel_path = os.path.relpath(os.path.join(root, file), absolute_base)
                    matches.append(rel_path)
                    
        if not matches:
            return f"No files found matching pattern: {pattern}"
            
        return "\n".join(matches)
    except Exception as e:
        return f"Error searching files: {str(e)}"

@mcp.tool()
async def get_project_structure() -> str:
    """Returns the project directory structure."""
    try:
        absolute_base = os.getcwd()
        structure = []
        
        def add_directory(path, prefix="", max_depth=3, current_depth=0):
            if current_depth >= max_depth:
                return
                
            try:
                items = sorted(os.listdir(path))
                # Skip hidden files and common cache directories
                items = [item for item in items if not item.startswith('.') and 
                        item not in ['__pycache__', 'node_modules', '.git', 'venv']]
                
                for i, item in enumerate(items):
                    item_path = os.path.join(path, item)
                    rel_path = os.path.relpath(item_path, absolute_base)
                    is_last = i == len(items) - 1
                    
                    if os.path.isdir(item_path):
                        structure.append(f"{prefix}{'└── ' if is_last else '├── '}{item}/")
                        add_directory(item_path, prefix + ("    " if is_last else "│   "), 
                                    max_depth, current_depth + 1)
                    else:
                        # Show file sizes for important files
                        try:
                            size = os.path.getsize(item_path)
                            if size > 1024*1024:  # > 1MB
                                size_str = f" ({size//1024//1024}MB)"
                            elif size > 1024:  # > 1KB
                                size_str = f" ({size//1024}KB)"
                            else:
                                size_str = f" ({size}B)"
                        except:
                            size_str = ""
                        
                        structure.append(f"{prefix}{'└── ' if is_last else '├── '}{item}{size_str}")
            except PermissionError:
                structure.append(f"{prefix}[Permission Denied]")
                
        structure.append(f"Project: {os.path.basename(absolute_base)}")
        structure.append("/")
        add_directory(absolute_base)
        
        return "\n".join(structure)
    except Exception as e:
        return f"Error getting project structure: {str(e)}"

@mcp.tool()
async def analyze_project_dependencies() -> str:
    """Analyze project dependencies and requirements."""
    try:
        analysis = ["📦 PROJECT DEPENDENCIES ANALYSIS", "="*50]
        
        # Check requirements.txt
        if os.path.exists("requirements.txt"):
            analysis.append("\n🔍 requirements.txt:")
            with open("requirements.txt", 'r') as f:
                deps = f.read().strip().split('\n')
                deps = [d.strip() for d in deps if d.strip() and not d.startswith('#')]
                for dep in deps[:20]:  # Limit to first 20
                    analysis.append(f"  • {dep}")
                if len(deps) > 20:
                    analysis.append(f"  ... and {len(deps)-20} more")
        
        # Check pyproject.toml
        if os.path.exists("pyproject.toml"):
            analysis.append("\n🔍 pyproject.toml:")
            with open("pyproject.toml", 'r') as f:
                content = f.read()
                if 'dependencies' in content:
                    analysis.append("  • Has dependencies defined")
                if 'dev-dependencies' in content:
                    analysis.append("  • Has dev dependencies")
        
        # Check package.json if exists
        if os.path.exists("package.json"):
            analysis.append("\n🔍 package.json:")
            with open("package.json", 'r') as f:
                content = f.read()
                if '"dependencies"' in content:
                    analysis.append("  • Has npm dependencies")
                if '"devDependencies"' in content:
                    analysis.append("  • Has dev dependencies")
        
        # Check Docker setup
        if os.path.exists("Dockerfile"):
            analysis.append("\n🐳 Docker: Dockerfile found")
        if os.path.exists("docker-compose.yml"):
            analysis.append("🐳 Docker: docker-compose.yml found")
        
        return "\n".join(analysis)
    except Exception as e:
        return f"Error analyzing dependencies: {str(e)}"

@mcp.tool()
async def find_code_patterns(pattern: str, file_types: str = "*") -> str:
    """Search for pattern matches in files. Default scans all workspace files."""
    try:
        results = []
        matched_files = set()
        patterns = [p.strip() for p in file_types.split(",") if p.strip()]
        if not patterns:
            patterns = ["*"]
        
        for file_glob in patterns:
            matched_files.update(glob.glob(f"**/{file_glob}", recursive=True))
        
        files = sorted(matched_files)
        
        scanned = 0
        for file_path in files:
            if scanned >= 300:
                break
            if os.path.isfile(file_path) and not any(part.startswith('.') for part in Path(file_path).parts):
                if not _is_likely_text_file(file_path):
                    continue
                try:
                    content = _read_text_file(file_path)
                    lines = content.split('\n')
                        
                    for i, line in enumerate(lines, 1):
                        if re.search(pattern, line, re.IGNORECASE):
                            results.append(f"{file_path}:{i}: {line.strip()}")
                                
                except (UnicodeDecodeError, PermissionError):
                    continue
                scanned += 1
        
        if not results:
            return f"No matches found for pattern: {pattern}"
            
        return f"Found {len(results)} matches for '{pattern}':\n\n" + "\n".join(results[:100])
        
    except Exception as e:
        return f"Error searching patterns: {str(e)}"

@mcp.tool()
async def get_git_status() -> str:
    """Get git repository status and recent commits."""
    try:
        import subprocess
        
        status = ["🔍 GIT REPOSITORY STATUS", "="*40]
        
        # Check if it's a git repo
        try:
            subprocess.run(['git', 'status'], check=True, capture_output=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            return "Not a git repository or git not installed"
        
        # Get git status
        result = subprocess.run(['git', 'status', '--porcelain'], 
                              capture_output=True, text=True)
        if result.stdout.strip():
            status.append("\n📝 Changed files:")
            for line in result.stdout.strip().split('\n'):
                status.append(f"  {line}")
        else:
            status.append("\n✅ Working directory clean")
        
        # Get recent commits
        result = subprocess.run(['git', 'log', '--oneline', '-5'], 
                              capture_output=True, text=True)
        if result.stdout.strip():
            status.append("\n📜 Recent commits:")
            for line in result.stdout.strip().split('\n'):
                status.append(f"  {line}")
        
        # Get current branch
        result = subprocess.run(['git', 'branch', '--show-current'], 
                              capture_output=True, text=True)
        if result.stdout.strip():
            status.append(f"\n🌿 Current branch: {result.stdout.strip()}")
        
        return "\n".join(status)
        
    except Exception as e:
        return f"Error getting git status: {str(e)}"

@mcp.tool()
async def analyze_file_complexity(file_path: str) -> str:
    """Analyze complexity and structure metrics for a specific text/code file."""
    try:
        absolute_base = os.getcwd()
        target_path = os.path.abspath(os.path.join(absolute_base, file_path))

        if not target_path.startswith(absolute_base):
            return "Error: Access denied to paths outside workspace."
            
        if not os.path.exists(target_path):
            return f"File not found: {file_path}"
            
        if os.path.isdir(target_path):
            return f"Error: {file_path} is a directory, not a file."

        if not _is_likely_text_file(target_path):
            return f"Error: File {file_path} appears to be binary. Complexity analysis supports text/code files."
            
        content = _read_text_file(target_path)
        lines = content.split('\n')
        
        analysis = [f"📊 CODE ANALYSIS: {file_path}", "="*50]
        
        # Basic metrics
        total_lines = len(lines)
        comment_line_prefixes = ("#", "//", "/*", "*", "--")
        code_lines = len([l for l in lines if l.strip() and not l.strip().startswith(comment_line_prefixes)])
        comment_lines = len([l for l in lines if l.strip().startswith(comment_line_prefixes)])
        empty_lines = total_lines - code_lines - comment_lines
        
        analysis.append(f"📏 Lines: {total_lines} total, {code_lines} code, {comment_lines} comments, {empty_lines} empty")
        
        # Functions and classes
        function_patterns = [
            r'\bdef\s+([A-Za-z_]\w*)',                   # Python
            r'\bfunction\s+([A-Za-z_]\w*)',              # JS/TS
            r'([A-Za-z_]\w*)\s*=\s*\([^)]*\)\s*=>',      # Arrow functions
            r'\bfunc\s+([A-Za-z_]\w*)',                  # Go
            r'\bfn\s+([A-Za-z_]\w*)',                    # Rust
        ]
        functions = []
        for fp in function_patterns:
            functions.extend(re.findall(fp, content))
        
        class_patterns = [
            r'\bclass\s+([A-Za-z_]\w*)',                 # Common class syntax
            r'\binterface\s+([A-Za-z_]\w*)',             # TS/Java interfaces
            r'\bstruct\s+([A-Za-z_]\w*)',                # C/Rust/Go structs
            r'\benum\s+([A-Za-z_]\w*)',                  # Enums
        ]
        classes = []
        for cp in class_patterns:
            classes.extend(re.findall(cp, content))
        
        analysis.append(f"🔧 Functions: {len(functions)}")
        if functions:
            analysis.append(f"  {', '.join(functions[:10])}")
            if len(functions) > 10:
                analysis.append(f"  ... and {len(functions)-10} more")
        
        analysis.append(f"🏗️  Types: {len(classes)}")
        if classes:
            analysis.append(f"  {', '.join(classes[:10])}")
            if len(classes) > 10:
                analysis.append(f"  ... and {len(classes)-10} more")
        
        # Imports
        imports = re.findall(
            r'^(?:\s*(?:from\s+\S+\s+import\s+.+|import\s+.+|#include\s+[<"].+[>"]|using\s+\S+|require\(.+\))).*$',
            content,
            re.MULTILINE
        )
        analysis.append(f"📦 Import statements: {len(imports)}")
        
        # Complexity indicators
        loops = len(re.findall(r'\b(for|while|do)\b', content))
        conditionals = len(re.findall(r'\b(if|else if|elif|switch|case)\b', content))
        try_blocks = len(re.findall(r'\b(try|catch|except|finally)\b', content))
        nested_loops = len(re.findall(r'\bfor\b[^{\n]*\{[^}]*\bfor\b|\bwhile\b[^{\n]*\{[^}]*\bwhile\b', content, re.DOTALL))
        analysis.append(f"🔁 Loop keywords: {loops}")
        analysis.append(f"🔀 Conditional keywords: {conditionals}")
        analysis.append(f"🛡️  Error-handling keywords: {try_blocks}")
        analysis.append(f"🔄 Nested-loop hints: {nested_loops}")
        
        return "\n".join(analysis)
        
    except Exception as e:
        return f"Error analyzing file: {str(e)}"

if __name__ == "__main__":
    # Set up signal handler for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    print("🚀 Starting MCP Server with automatic ngrok tunnel...")
    print("="*60)
    
    # Start ngrok first
    start_ngrok()
    
    # Display URLs
    display_urls()
    
    # Use the built-in SSE ASGI app and run it with uvicorn
    # This avoids the double-response issues found in manual implementations
    print("🔧 Starting Local System MCP server on port 8000...")
    
    # Configure custom logging to filter out /api/agents/register 404s
    # These are harmless requests from MCP clients expecting a different protocol
    import logging
    class Filter404AgentRegister(logging.Filter):
        def filter(self, record):
            # Filter out 404 logs for /api/agents/register endpoint
            if '404' in str(record.getMessage()) and '/api/agents/register' in str(record.getMessage()):
                return False  # Silently ignore these 404s
            return True  # Log everything else normally
    
    # Add filter to uvicorn access logger
    logging.getLogger("uvicorn.access").addFilter(Filter404AgentRegister())
    
    try:
        uvicorn.run(
            mcp.sse_app(), 
            host="0.0.0.0", 
            port=8000, 
            forwarded_allow_ips=["*"],
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n🛑 MCP server stopped...")
    finally:
        cleanup()
