# Prepares everything to move codov to the server, into the "to-server" folder:
#   codov.tar.gz  — project files (without node_modules, .env, uploads)
#   codov.dump    — the database (courses, lessons, students, submissions, chat...)
#   uploads.tar.gz    — uploaded files (mockups, PDF, ZIP...)
# Run in the project folder:  powershell -ExecutionPolicy Bypass -File scripts/pack-for-server.ps1
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$out = "to-server"
New-Item -ItemType Directory -Force $out | Out-Null

Write-Host "1/3 Project files"
tar -czf "$out/codov.tar.gz" --exclude=node_modules --exclude=.next --exclude=storage --exclude=to-server `
  --exclude=.env --exclude=data --exclude=public/monaco --exclude=src/generated --exclude=.claude --exclude=tsconfig.tsbuildinfo .

Write-Host "2/3 Database"
$line = Get-Content .env | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
$url = [Uri](($line -replace '^DATABASE_URL=', '').Trim('"'))
$user, $password = $url.UserInfo.Split(':', 2)
$pgDump = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\pg_dump.exe" | Sort-Object FullName -Descending | Select-Object -First 1
$env:PGPASSWORD = [Uri]::UnescapeDataString($password)
try {
  & $pgDump.FullName -Fc -h $url.Host -p $url.Port -U $user -d $url.AbsolutePath.TrimStart('/') -f "$out/codov.dump"
  if ($LASTEXITCODE -ne 0) { throw "pg_dump failed" }
} finally {
  Remove-Item Env:PGPASSWORD
}

Write-Host "3/3 Uploaded files"
if (Test-Path storage/uploads) {
  tar -czf "$out/uploads.tar.gz" -C storage uploads
}

Get-ChildItem $out | Format-Table Name, @{ n = "MB"; e = { [math]::Round($_.Length / 1MB, 1) } }
Write-Host "Готово: папка $out"
