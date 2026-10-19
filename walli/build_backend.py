# only god knows how it works
# The output must be named backend-x86_64-pc-windows-msvc.exe for Tauri sidecar
import subprocess, shutil, os

SRC = os.path.join("src-back", "home", "home.py")
OUT_NAME = "backend"
BINARIES_DIR = os.path.join("src-tauri", "binaries")
TARGET_TRIPLE = "x86_64-pc-windows-msvc"

os.makedirs(BINARIES_DIR, exist_ok=True)

print("==> Compiling backend with PyInstaller ...")
subprocess.run(
    [
        "pyinstaller",
        "--onefile",
        "--noconfirm",
        "--clean",
        "--name", OUT_NAME,
        "--distpath", BINARIES_DIR,
        SRC,
    ],
    check=True,
)

# Tauri expects the sidecar binary named as: <name>-<target-triple>.exe
src_exe = os.path.join(BINARIES_DIR, f"{OUT_NAME}.exe")
dst_exe = os.path.join(BINARIES_DIR, f"{OUT_NAME}-{TARGET_TRIPLE}.exe")
if os.path.exists(dst_exe):
    os.remove(dst_exe)
shutil.move(src_exe, dst_exe)

print(f"==> Sidecar ready: {dst_exe}")
print(f"    Size: {os.path.getsize(dst_exe) / 1024 / 1024:.1f} MB")
