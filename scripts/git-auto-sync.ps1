param(
  [int]$IntervalSeconds = 20,
  [string]$MessagePrefix = "auto-sync",
  [string]$RemoteName = "origin",
  [string]$BranchName = ""
)

if ([string]::IsNullOrWhiteSpace($BranchName)) {
  $BranchName = git branch --show-current
}

Write-Host "Auto-commit + auto-push watcher aktif di $(Get-Location)"
Write-Host "Remote target : $RemoteName/$BranchName"
Write-Host "Interval cek  : $IntervalSeconds detik"
Write-Host "Tekan Ctrl+C untuk berhenti."

while ($true) {
  $status = git status --porcelain 2>$null

  if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace(($status -join ""))) {
    git add -A

    git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) {
      $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
      $message = "$MessagePrefix: $timestamp"
      Write-Host "Perubahan terdeteksi. Commit: $message"
      git commit -m $message
    }
  }

  $aheadCount = git rev-list --count "$RemoteName/$BranchName..HEAD" 2>$null
  if ($LASTEXITCODE -eq 0 -and [int]$aheadCount -gt 0) {
    Write-Host "Branch lokal lebih baru $aheadCount commit. Push ke $RemoteName/$BranchName..."
    git push $RemoteName $BranchName
  }

  Start-Sleep -Seconds $IntervalSeconds
}
