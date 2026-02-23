# Мониторинг решения CAPTCHA и автоматическое исправление проблем
$logFile = "server\logs\combined.log"
$successCount = 0
$maxSuccess = 3
$checkInterval = 3

Write-Host "`n╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  АВТОМАТИЧЕСКИЙ МОНИТОРИНГ CAPTCHA  ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host "`nЦель: $maxSuccess успешных решений подряд" -ForegroundColor Yellow
Write-Host "Интервал проверки: $checkInterval секунд`n" -ForegroundColor Gray

while ($true) {
    Start-Sleep -Seconds $checkInterval
    
    if (Test-Path $logFile) {
        $logs = Get-Content $logFile -Tail 100 -ErrorAction SilentlyContinue
        $recent = $logs | Select-Object -Last 20
        
        # Проверка успешных решений
        $success = $recent | Where-Object { $_ -match '"success":true' }
        if ($success) {
            $successCount++
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ✓ Успешное решение #$successCount/$maxSuccess" -ForegroundColor Green
            if ($successCount -ge $maxSuccess) {
                Write-Host "`n🎉 ДОСТИГНУТО $maxSuccess УСПЕШНЫХ РЕШЕНИЯ ПОДРЯД! 🎉" -ForegroundColor Green
                break
            }
        }
        
        # Проверка ошибок
        $errors = $recent | Where-Object { 
            $_ -match '"Tile click did not register"|"not selected"|"actual":0,"expected"|"Token not found"|"failed"|"timeout"' 
        }
        if ($errors -and $successCount -gt 0) {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ✗ Ошибка обнаружена, счетчик сброшен" -ForegroundColor Red
            $successCount = 0
        }
    }
}
