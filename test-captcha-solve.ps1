# Скрипт для тестирования решения капчи

Write-Host "`n╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   ТЕСТИРОВАНИЕ РЕШЕНИЯ КАПЧИ         ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Проверка сервера
Write-Host "1. Проверка сервера..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method Get -TimeoutSec 3 -ErrorAction Stop
    Write-Host "   ✓ Сервер работает" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Сервер не отвечает: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# API ключ из .env
$apiKey = "JHQBCCKJJBBKJkhKUUKHOWN73987230598TGU"

# Тестовый запрос
Write-Host "`n2. Отправка запроса на решение капчи..." -ForegroundColor Yellow
Write-Host "   Тип: reCAPTCHA v2" -ForegroundColor Cyan
Write-Host "   Site Key: 6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-" -ForegroundColor Cyan
Write-Host "   URL: https://www.google.com/recaptcha/api2/demo" -ForegroundColor Cyan

$requestBody = @{
    type = "recaptcha_v2"
    siteKey = "6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-"
    pageUrl = "https://www.google.com/recaptcha/api2/demo"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "X-API-Key" = $apiKey
    "Authorization" = "Bearer $apiKey"
}

Write-Host "`n3. Отправка запроса..." -ForegroundColor Yellow
$startTime = Get-Date

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/solve" -Method Post -Body $requestBody -Headers $headers -TimeoutSec 600 -ErrorAction Stop
    
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    Write-Host "`n✓✓✓ ЗАПРОС ОБРАБОТАН ✓✓✓" -ForegroundColor Green
    Write-Host "   Время выполнения: $([math]::Round($duration, 2)) секунд" -ForegroundColor Cyan
    Write-Host "   Успех: $($response.success)" -ForegroundColor $(if ($response.success) { "Green" } else { "Red" })
    
    if ($response.success) {
        Write-Host "   ✓ Капча решена успешно!" -ForegroundColor Green
        if ($response.token) {
            Write-Host "   Длина токена: $($response.token.Length) символов" -ForegroundColor Cyan
            Write-Host "   Префикс токена: $($response.token.Substring(0, [Math]::Min(20, $response.token.Length)))..." -ForegroundColor Cyan
        }
    } else {
        Write-Host "   ✗ Ошибка: $($response.error)" -ForegroundColor Red
    }
    
    Write-Host "`n4. Полный ответ сервера:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 10 | Write-Host
    
} catch {
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    Write-Host "`n✗✗✗ ОШИБКА ПРИ ОБРАБОТКЕ ЗАПРОСА ✗✗✗" -ForegroundColor Red
    Write-Host "   Время до ошибки: $([math]::Round($duration, 2)) секунд" -ForegroundColor Yellow
    Write-Host "   Ошибка: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        try {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $errorBody = $reader.ReadToEnd()
            Write-Host "   Ответ сервера: $errorBody" -ForegroundColor Yellow
        } catch {
            Write-Host "   Не удалось прочитать ответ сервера" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n✓ Тестирование завершено`n" -ForegroundColor Green
Write-Host "Проверьте логи сервера в окне PowerShell с сервером!" -ForegroundColor Cyan
