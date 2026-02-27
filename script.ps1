# ============================================================
# REKAMTEKNIK - Frontend File Cleanup Script (Windows)
#
# CARA PAKAI:
#   1. Copy script ini ke ROOT folder project (tempat package.json)
#   2. Buka PowerShell di folder tersebut
#   3. Set-ExecutionPolicy jika perlu:
#      Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   4. .\cleanup_files.ps1
# ============================================================

$ErrorActionPreference = "Stop"

# Warna
function Write-Color($text, $color) { Write-Host $text -ForegroundColor $color }
function Write-Red($text)    { Write-Host $text -ForegroundColor Red }
function Write-Green($text)  { Write-Host $text -ForegroundColor Green }
function Write-Yellow($text) { Write-Host $text -ForegroundColor Yellow }
function Write-Cyan($text)   { Write-Host $text -ForegroundColor Cyan }
function Write-Blue($text)   { Write-Host $text -ForegroundColor Cyan }

Write-Cyan "============================================================"
Write-Cyan "  REKAMTEKNIK - Frontend Cleanup Script"
Write-Cyan "============================================================"
Write-Host ""

# Cek root project
if (-not (Test-Path "package.json")) {
    Write-Red "ERROR: Script harus dijalankan dari root folder project!"
    Write-Red "Pastikan file package.json ada di folder ini."
    exit 1
}
if (-not (Test-Path "src")) {
    Write-Red "ERROR: Folder 'src' tidak ditemukan!"
    exit 1
}

Write-Green "v Root project ditemukan: $(Get-Location)"
Write-Host ""

# ============================================================
# DAFTAR FILE YANG AKAN DIHAPUS
# ============================================================

$pages = @(
    "src\pages\TechnicianJobsList.tsx"
    "src\pages\TechnicianJoDetail.tsx"
)

$jobComponents = @(
    "src\components\jobs\GPSCheckInOut.tsx"
    "src\components\jobs\LocationMap.tsx"
    "src\components\jobs\JobsOverviewMap.tsx"
    "src\components\jobs\JobCalendar.tsx"
    "src\components\jobs\JobPhotoGallery.tsx"
)

$techComponents = @(
    "src\components\technician\CheckInButton.tsx"
    "src\components\technician\CheckOutButton.tsx"
    "src\components\technician\PhotoUpload.tsx"
    "src\components\technician\PartsUsed.tsx"
    "src\components\technician\TaskCheckList.tsx"
    "src\components\technician\TechnicionJobs.tsx"
    "src\components\technician\SkillsManagementDialog.tsx"
    "src\components\technician\AvailabilityManagementDialog.tsx"
)

# ============================================================
# PREVIEW
# ============================================================

Write-Cyan "--- PREVIEW FILE YANG AKAN DIHAPUS ----------------------------"
Write-Host ""

$foundFiles = @()
$notFoundCount = 0

Write-Yellow "[Pages]"
foreach ($file in $pages) {
    if (Test-Path $file) {
        Write-Red   "  x HAPUS  $file"
        $foundFiles += $file
    } else {
        Write-Cyan  "  ~ skip   $file (tidak ditemukan)"
        $notFoundCount++
    }
}

Write-Host ""
Write-Yellow "[Job Components - GPS / Map / Calendar / Photo]"
foreach ($file in $jobComponents) {
    if (Test-Path $file) {
        Write-Red   "  x HAPUS  $file"
        $foundFiles += $file
    } else {
        Write-Cyan  "  ~ skip   $file (tidak ditemukan)"
        $notFoundCount++
    }
}

Write-Host ""
Write-Yellow "[Technician Components - dipindah ke mobile]"
foreach ($file in $techComponents) {
    if (Test-Path $file) {
        Write-Red   "  x HAPUS  $file"
        $foundFiles += $file
    } else {
        Write-Cyan  "  ~ skip   $file (tidak ditemukan)"
        $notFoundCount++
    }
}

Write-Host ""
Write-Cyan "----------------------------------------------------------------"
Write-Host "  Total akan dihapus : " -NoNewline; Write-Red "$($foundFiles.Count) file"
Write-Host "  Tidak ditemukan    : " -NoNewline; Write-Cyan "$notFoundCount file"
Write-Cyan "----------------------------------------------------------------"
Write-Host ""

if ($foundFiles.Count -eq 0) {
    Write-Green "Tidak ada file yang perlu dihapus. Project sudah bersih!"
    exit 0
}

# ============================================================
# KONFIRMASI
# ============================================================

Write-Yellow "! PERINGATAN: Aksi ini tidak bisa di-undo!"
Write-Yellow "  Pastikan sudah commit atau backup project dulu."
Write-Host ""
$confirm = Read-Host "Lanjutkan hapus $($foundFiles.Count) file? (ketik 'ya' untuk konfirmasi)"

if ($confirm -ne "ya") {
    Write-Host ""
    Write-Cyan "Dibatalkan. Tidak ada file yang dihapus."
    exit 0
}

Write-Host ""

# ============================================================
# BUAT BACKUP LOG
# ============================================================

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$logFile = "cleanup_deleted_files_$timestamp.log"
"# REKAMTEKNIK Cleanup - File Dihapus" | Out-File $logFile -Encoding UTF8
"# Tanggal: $(Get-Date)" | Out-File $logFile -Append -Encoding UTF8
"" | Out-File $logFile -Append -Encoding UTF8

# ============================================================
# EKSEKUSI HAPUS
# ============================================================

Write-Cyan "--- MENGHAPUS FILE ---------------------------------------------"
Write-Host ""

$deletedCount = 0
$errorCount = 0

foreach ($file in $foundFiles) {
    try {
        Remove-Item $file -Force
        Write-Green "  v Dihapus: $file"
        $file | Out-File $logFile -Append -Encoding UTF8
        $deletedCount++
    } catch {
        Write-Red "  x GAGAL hapus: $file"
        Write-Red "    Error: $_"
        $errorCount++
    }
}

# ============================================================
# CEK FOLDER TECHNICIAN KOSONG
# ============================================================

Write-Host ""
$techDir = "src\components\technician"
if (Test-Path $techDir) {
    $remaining = Get-ChildItem $techDir | Measure-Object
    if ($remaining.Count -eq 0) {
        Remove-Item $techDir -Force
        Write-Green "  v Folder kosong dihapus: $techDir\"
        "$techDir\ (folder)" | Out-File $logFile -Append -Encoding UTF8
    } else {
        Write-Yellow "  ! Folder $techDir\ masih ada isi lain, tidak dihapus:"
        Get-ChildItem $techDir | ForEach-Object { Write-Host "     - $($_.Name)" }
    }
}

# ============================================================
# SUMMARY
# ============================================================

Write-Host ""
Write-Cyan "----------------------------------------------------------------"
Write-Host "  " -NoNewline; Write-Green "v Berhasil dihapus : $deletedCount file"
if ($errorCount -gt 0) {
    Write-Host "  " -NoNewline; Write-Red "x Gagal dihapus   : $errorCount file"
}
Write-Host "  Log tersimpan di  : " -NoNewline; Write-Cyan $logFile
Write-Cyan "----------------------------------------------------------------"
Write-Host ""

# ============================================================
# LANGKAH SELANJUTNYA
# ============================================================

Write-Yellow "--- LANGKAH SELANJUTNYA ----------------------------------------"
Write-Host ""
Write-Host "  1. Replace " -NoNewline; Write-Cyan "src\App.tsx" 
Write-Host "     Hapus import & route /technician/jobs"
Write-Host ""
Write-Host "  2. Replace " -NoNewline; Write-Cyan "src\pages\Technicians.tsx"
Write-Host "     Hapus kolom skills dan dialog availability"
Write-Host ""
Write-Host "  3. Buka " -NoNewline; Write-Cyan "src\pages\Jobs.tsx" -NoNewline; Write-Host " dan hapus import:"
Write-Host "     - GPSCheckInOut, LocationMap, JobsOverviewMap"
Write-Host "     - JobCalendar, JobPhotoGallery"
Write-Host ""
Write-Host "  4. Buka " -NoNewline; Write-Cyan "src\pages\JobsDetail.tsx" -NoNewline; Write-Host " dan hapus import:"
Write-Host "     - GPSCheckInOut, LocationMap, JobPhotoGallery"
Write-Host ""
Write-Host "  5. Jalankan " -NoNewline; Write-Cyan "npm run build"
Write-Host "     untuk cek tidak ada broken import"
Write-Host ""
Write-Host "  6. Jalankan " -NoNewline; Write-Cyan "database_cleanup.sql"
Write-Host "     di Supabase SQL Editor (setelah backup database!)"
Write-Host ""
Write-Green "Selesai! Project lebih bersih sekarang."
Write-Host ""