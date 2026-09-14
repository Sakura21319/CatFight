$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$creatorExe = 'C:\ProgramData\cocos\editors\Creator\3.8.8\CocosCreator.exe'
$configPath = Join-Path $projectRoot 'wechat-build-config.json'
$tempPath = Join-Path $projectRoot 'temp'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$stdoutLog = Join-Path $tempPath "cocos-cli-wechat-$stamp-stdout.log"
$stderrLog = Join-Path $tempPath "cocos-cli-wechat-$stamp-stderr.log"

New-Item -ItemType Directory -Force -Path $tempPath | Out-Null
if (!(Test-Path -LiteralPath $creatorExe)) {
    throw "Cocos Creator executable not found: $creatorExe"
}
if (!(Test-Path -LiteralPath $configPath)) {
    throw "WeChat build config not found: $configPath"
}

$startOptions = @{
    FilePath = $creatorExe
    ArgumentList = @('--project', $projectRoot, '--build', 'configPath=./wechat-build-config.json')
    WorkingDirectory = $projectRoot
    RedirectStandardOutput = $stdoutLog
    RedirectStandardError = $stderrLog
    PassThru = $true
    Wait = $true
}
$process = Start-Process @startOptions

$buildOutput = Get-Content -Raw -LiteralPath $stdoutLog
if ($buildOutput -notmatch 'build Task \(wechatgame\) Finished') {
    throw "Cocos WeChat build did not finish successfully. See $stdoutLog and $stderrLog"
}

& node (Join-Path $PSScriptRoot 'postprocess-wechat-subpackages.mjs')
if ($LASTEXITCODE -ne 0) {
    throw 'WeChat subpackage post-processing failed.'
}

Write-Output "WeChat build ready: $(Join-Path $projectRoot 'build\wechatgame')"
Write-Output "Build log: $stdoutLog"
