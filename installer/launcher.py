"""
CyberPS Investigation Hunter - Main Launcher
This launcher is compiled by PyInstaller into CyberPS.exe
It starts all services and opens the browser.
"""
import os
import sys
import subprocess
import time
import webbrowser
import threading
import ctypes
from pathlib import Path

APP_NAME = "CyberPS Investigation Hunter"
APP_VERSION = "2.0"

def get_install_dir():
    """Get the installation directory (where CyberPS.exe resides)."""
    if getattr(sys, 'frozen', False):
        return Path(sys.executable).parent
    return Path(__file__).parent

def load_env(env_path):
    """Load .env file into os.environ."""
    env = {}
    if env_path.exists():
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, _, val = line.partition('=')
                    env[key.strip()] = val.strip()
    return env

def show_console():
    """Show a nice console window."""
    hwnd = ctypes.windll.kernel32.GetConsoleWindow()
    if hwnd:
        ctypes.windll.user32.ShowWindow(hwnd, 1)

def run_service(name, exe_path, args=None, cwd=None, env=None):
    """Start a background service and return the process."""
    cmd = [str(exe_path)]
    if args:
        cmd += args
    
    creation_flags = subprocess.CREATE_NEW_CONSOLE
    try:
        proc = subprocess.Popen(
            cmd,
            cwd=str(cwd) if cwd else None,
            env=env,
            creationflags=creation_flags
        )
        return proc
    except Exception as e:
        print(f"  [ERROR] Failed to start {name}: {e}")
        return None

def kill_service(name):
    """Kill a service by exe name."""
    os.system(f'taskkill /f /im {name} >nul 2>&1')

def wait_for_backend(port, timeout=30):
    """Poll until backend is responding."""
    import urllib.request
    url = f"http://localhost:{port}/health"
    for i in range(timeout):
        try:
            with urllib.request.urlopen(url, timeout=2) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            pass
        time.sleep(1)
    return False

def main():
    install_dir = get_install_dir()
    
    print()
    print("=" * 60)
    print(f"  {APP_NAME}")
    print(f"  Version {APP_VERSION}")
    print("=" * 60)
    print()
    
    # Load configuration
    env_file = install_dir / ".env"
    if not env_file.exists():
        print("  [ERROR] .env configuration file not found!")
        print(f"  Expected at: {env_file}")
        print()
        print("  Please create .env file with your database settings.")
        print("  Refer to README_INSTALL.txt for instructions.")
        print()
        input("  Press Enter to exit...")
        sys.exit(1)
    
    config = load_env(env_file)
    backend_port = config.get("BACKEND_PORT", "5174")
    ramail_port = config.get("RAMAIL_PORT", "8000")
    
    # (Validation removed as per user request to use hardcoded credentials)
    print("  [OK] Environment variables loaded.")
    
    # Build environment for child processes
    child_env = os.environ.copy()
    child_env.update(config)
    child_env["NODE_ENV"] = "production"
    
    # Set PATH to include bundled Tesseract and Poppler
    bin_dir = install_dir / "bin"
    tesseract_dir = bin_dir / "Tesseract-OCR"
    poppler_bin = bin_dir / "poppler" / "bin"
    
    existing_path = child_env.get("PATH", "")
    extra_paths = []
    if tesseract_dir.exists():
        extra_paths.append(str(tesseract_dir))
    if poppler_bin.exists():
        extra_paths.append(str(poppler_bin))
    if extra_paths:
        child_env["PATH"] = ";".join(extra_paths) + ";" + existing_path
    
    # Start services
    backend_dir = install_dir / "backend"
    ramail_dir = install_dir / "ramail"
    
    print("  [1/3] Running database migration...")
    backend_exe = backend_dir / "backend.exe"
    if backend_exe.exists():
        migrate_proc = subprocess.run(
            [str(backend_exe), "migrate"],
            cwd=str(backend_dir),
            env=child_env,
            timeout=60
        )
        if migrate_proc.returncode != 0:
            print("  [WARNING] Migration had issues. Check .env DB settings if app doesn't work.")
    else:
        print(f"  [ERROR] backend.exe not found at {backend_exe}")
        input("  Press Enter to exit...")
        sys.exit(1)
    
    print()
    print("  [2/3] Starting backend service...")
    backend_proc = run_service(
        "Backend",
        backend_exe,
        cwd=backend_dir,
        env=child_env
    )
    
    ramail_exe = ramail_dir / "ramail.exe"
    ramail_proc = None
    if ramail_exe.exists():
        print("  [2b]  Starting Ramail email service...")
        ramail_proc = run_service(
            "Ramail",
            ramail_exe,
            args=["api"],
            cwd=ramail_dir,
            env=child_env
        )
    
    print()
    print("  [3/3] Waiting for backend to be ready...")
    ready = wait_for_backend(backend_port, timeout=30)
    
    if ready:
        url = f"http://localhost:{backend_port}"
        print(f"  [OK]  System ready at {url}")
        print()
        print("=" * 60)
        print(f"  CyberPS is running!")
        print(f"  URL: {url}")
        print()
        print("  Close this window to stop all services.")
        print("=" * 60)
        print()
        webbrowser.open(url)
    else:
        print("  [WARNING] Backend did not respond in 30 seconds.")
        print("  Please check your database connection in .env")
        print()
    
    # Wait - keep services alive
    try:
        input("  Press Enter or close this window to stop CyberPS...\n")
    except (EOFError, KeyboardInterrupt):
        pass
    
    print()
    print("  Stopping services...")
    kill_service("backend.exe")
    kill_service("ramail.exe")
    print("  Done. Goodbye!")

if __name__ == "__main__":
    main()
