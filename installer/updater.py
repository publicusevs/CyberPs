"""
CyberPS Updater — updater.py
Compiled by PyInstaller into updater.exe.

This is a SEPARATE process from CyberPS.exe.
It is launched by CyberPS.exe before it exits, and it:
  1. Waits for CyberPS.exe (and backend/ramail) to fully exit
  2. Backs up the current installation
  3. Runs the new installer silently
  4. Restores backup on failure
  5. Launches the new CyberPS.exe
  6. Deletes temp files
  7. Exits

Usage:
  updater.exe --installer-path <path> --install-dir <dir> --backup-dir <dir> --launcher <path>
"""

import sys
import os
import time
import shutil
import subprocess
import logging
import argparse
import ctypes
from pathlib import Path
from datetime import datetime

# ── Setup logging ─────────────────────────────────────────────────────────────

def setup_logging(log_dir: Path):
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "updater.log"
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.FileHandler(log_file, encoding="utf-8"),
            logging.StreamHandler(sys.stdout),
        ],
    )

log = logging.getLogger("CyberPS.Updater")

# ── Process helpers ───────────────────────────────────────────────────────────

def is_process_running(name: str) -> bool:
    """Check if a process by exe name is still running."""
    try:
        result = subprocess.run(
            ["tasklist", "/FI", f"IMAGENAME eq {name}", "/NH"],
            capture_output=True, text=True, timeout=5
        )
        return name.lower() in result.stdout.lower()
    except Exception:
        return False

def kill_process(name: str):
    """Force kill a process by name."""
    try:
        subprocess.run(
            ["taskkill", "/F", "/IM", name],
            capture_output=True, timeout=10
        )
    except Exception:
        pass

def wait_for_processes_to_exit(names: list, timeout: int = 60) -> bool:
    """Wait until all named processes have exited."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        still_running = [n for n in names if is_process_running(n)]
        if not still_running:
            return True
        log.info(f"Waiting for processes to exit: {', '.join(still_running)}")
        time.sleep(2)
    return False

# ── Backup / Restore ──────────────────────────────────────────────────────────

def backup_installation(install_dir: Path, backup_dir: Path) -> bool:
    """Copy current installation to backup directory."""
    try:
        if backup_dir.exists():
            shutil.rmtree(backup_dir)
        log.info(f"Backing up {install_dir} → {backup_dir}")
        shutil.copytree(str(install_dir), str(backup_dir), ignore=shutil.ignore_patterns(
            'Temp', 'Backup', '*.log', '__pycache__', '*.pyc'
        ))
        log.info("Backup complete.")
        return True
    except Exception as e:
        log.error(f"Backup failed: {e}")
        return False

def restore_backup(backup_dir: Path, install_dir: Path) -> bool:
    """Restore backup if installation fails."""
    if not backup_dir.exists():
        log.error("Backup not found — cannot restore.")
        return False
    try:
        log.info(f"Restoring backup from {backup_dir}")
        shutil.copytree(str(backup_dir), str(install_dir), dirs_exist_ok=True)
        log.info("Restore complete.")
        return True
    except Exception as e:
        log.error(f"Restore failed: {e}")
        return False

# ── Installer runner ──────────────────────────────────────────────────────────

def run_installer(installer_path: Path, install_dir: Path) -> bool:
    """Run the Inno Setup installer silently."""
    try:
        log.info(f"Running installer: {installer_path}")
        result = subprocess.run(
            [
                str(installer_path),
                "/VERYSILENT",
                "/SP-",
                "/SUPPRESSMSGBOXES",
                "/NORESTART",
                f"/DIR={install_dir}",
            ],
            timeout=300,  # 5 min max
        )
        if result.returncode == 0:
            log.info("Installer completed successfully.")
            return True
        else:
            log.error(f"Installer exited with code {result.returncode}")
            return False
    except subprocess.TimeoutExpired:
        log.error("Installer timed out after 5 minutes.")
        return False
    except Exception as e:
        log.error(f"Installer failed: {e}")
        return False

# ── Cleanup ───────────────────────────────────────────────────────────────────

def cleanup_temp(temp_dir: Path):
    """Delete the temp download folder."""
    try:
        if temp_dir.exists():
            shutil.rmtree(temp_dir)
            log.info(f"Cleaned up temp dir: {temp_dir}")
    except Exception as e:
        log.warning(f"Could not delete temp dir: {e}")

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="CyberPS Updater")
    parser.add_argument("--installer-path", required=True)
    parser.add_argument("--install-dir", required=True)
    parser.add_argument("--backup-dir", required=True)
    parser.add_argument("--launcher", required=True, help="Path to new CyberPS.exe after install")
    args = parser.parse_args()

    installer_path = Path(args.installer_path)
    install_dir = Path(args.install_dir)
    backup_dir = Path(args.backup_dir)
    launcher_path = Path(args.launcher)

    # Setup logging inside install_dir/logs
    setup_logging(install_dir / "logs")

    log.info("=" * 60)
    log.info("CyberPS Updater started")
    log.info(f"  Installer : {installer_path}")
    log.info(f"  Install   : {install_dir}")
    log.info(f"  Backup    : {backup_dir}")
    log.info(f"  Launcher  : {launcher_path}")
    log.info("=" * 60)

    # 1. Verify installer exists
    if not installer_path.exists():
        log.error(f"Installer not found: {installer_path}")
        sys.exit(1)

    # 2. Wait for app processes to exit (max 60s)
    log.info("Waiting for CyberPS services to stop...")
    exited = wait_for_processes_to_exit(["CyberPS.exe", "backend.exe", "ramail.exe"], timeout=60)
    if not exited:
        log.warning("Processes still running after 60s — force killing...")
        kill_process("CyberPS.exe")
        kill_process("backend.exe")
        kill_process("ramail.exe")
        time.sleep(3)

    # 3. Backup
    log.info("Creating backup...")
    backed_up = backup_installation(install_dir, backup_dir)

    # 4. Run installer
    log.info("Installing update...")
    success = run_installer(installer_path, install_dir)

    if not success:
        log.error("Installation failed! Attempting to restore backup...")
        if backed_up:
            restore_backup(backup_dir, install_dir)
        else:
            log.error("No backup available — installation left in unknown state.")
        sys.exit(2)

    # 5. Cleanup temp file
    cleanup_temp(installer_path.parent)

    # 6. Launch new version
    log.info(f"Launching updated CyberPS: {launcher_path}")
    try:
        subprocess.Popen(
            [str(launcher_path)],
            cwd=str(launcher_path.parent),
            creationflags=subprocess.CREATE_NEW_CONSOLE,
        )
        log.info("Update complete! New version launched.")
    except Exception as e:
        log.error(f"Could not launch updated app: {e}")
        sys.exit(3)

    log.info("Updater exiting cleanly.")
    sys.exit(0)


if __name__ == "__main__":
    main()
