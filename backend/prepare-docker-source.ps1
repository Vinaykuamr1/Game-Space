$ErrorActionPreference = 'Stop'

$mappings = @(
    @{ Source = 'main\java\com\unoarena\config\WebSocketConfig.java'; Target = 'config\WebSocketConfig.java' },
    @{ Source = 'main\java\com\unoarena\game\GameController.java'; Target = 'game\GameController.java' },
    @{ Source = 'main\java\com\unoarena\game\GameService.java'; Target = 'game\GameService.java' },
    @{ Source = 'main\java\com\unoarena\security\SecurityConfig.java'; Target = 'security\SecurityConfig.java' }
)

foreach ($mapping in $mappings) {
    $sourcePath = Join-Path $PSScriptRoot (Join-Path 'src' $mapping.Source)
    $targetPath = Join-Path $PSScriptRoot (Join-Path 'docker-src' $mapping.Target)
    $targetDirectory = Split-Path -Parent $targetPath
    New-Item -ItemType Directory -Force -Path $targetDirectory | Out-Null
    $contents = [IO.File]::ReadAllText($sourcePath)
    [IO.File]::WriteAllText($targetPath, $contents, [Text.UTF8Encoding]::new($false))
}

Write-Host 'Docker backend sources refreshed.'
