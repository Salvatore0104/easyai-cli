$ErrorActionPreference = 'Stop'
function Check-Exit { if ($LASTEXITCODE -ne 0) { throw "Command failed: $LASTEXITCODE" } }
node -e 'if (Number(process.versions.node.split(".")[0]) < 20) process.exit(2)'
Check-Exit
$installTemp = Join-Path ([IO.Path]::GetTempPath()) ('wowidea-install-' + [guid]::NewGuid())
$repo = if ($env:EASYAI_CLI_REPO) { $env:EASYAI_CLI_REPO } else { 'https://github.com/Salvatore0104/easyai-cli.git' }
$ref = if ($env:EASYAI_CLI_REF) { $env:EASYAI_CLI_REF } else { 'master' }
git clone --depth 1 --branch $ref $repo $installTemp
Check-Exit
Push-Location $installTemp
try {
  npm ci
  Check-Exit
  npm run build
  Check-Exit
  $packageFile = npm pack --silent
  Check-Exit
  npm install --global (Join-Path $installTemp $packageFile)
  Check-Exit
  $globalModules = npm root --global
  Check-Exit
  node (Join-Path $globalModules '@easyai/cli/scripts/install-skills.mjs')
  Check-Exit
} finally {
  Pop-Location
  $resolvedTemp = [IO.Path]::GetFullPath($installTemp)
  $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') + '\'
  if (!$resolvedTemp.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase) -or !(Split-Path $resolvedTemp -Leaf).StartsWith('wowidea-install-')) { throw 'Unexpected cleanup target' }
  Remove-Item -LiteralPath $resolvedTemp -Recurse -Force
}
Write-Host 'Wowidea installed. Run: wowidea --help; wowidea auth use-key --prompt. In Codex use $wowidea.'
