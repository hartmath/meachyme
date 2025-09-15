# PowerShell script to build the Expo app
Write-Host "Starting EAS build process..."

# First, let's try to initialize EAS
Write-Host "Initializing EAS project..."
$initProcess = Start-Process -FilePath "eas" -ArgumentList "init" -NoNewWindow -PassThru -Wait
if ($initProcess.ExitCode -eq 0) {
    Write-Host "EAS initialized successfully"
} else {
    Write-Host "EAS init failed, trying to continue..."
}

# Now try to build
Write-Host "Starting Android build..."
$buildProcess = Start-Process -FilePath "eas" -ArgumentList "build", "--platform", "android", "--profile", "preview" -NoNewWindow -PassThru -Wait
if ($buildProcess.ExitCode -eq 0) {
    Write-Host "Build completed successfully!"
} else {
    Write-Host "Build failed with exit code: $($buildProcess.ExitCode)"
}
