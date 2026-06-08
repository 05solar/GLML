# 프론트(5173) + 백엔드(8000) 서버를 포트 기준으로 확실하게 종료
$ErrorActionPreference = "SilentlyContinue"
$ports = 5173, 8000
$killed = $false
foreach ($port in $ports) {
    $conns = Get-NetTCPConnection -State Listen -LocalPort $port
    foreach ($procId in ($conns.OwningProcess | Select-Object -Unique)) {
        if ($procId) {
            taskkill /PID $procId /T /F | Out-Null
            Write-Host "포트 $port (PID $procId) 종료"
            $killed = $true
        }
    }
}
if (-not $killed) { Write-Host "실행 중인 서버가 없습니다 (5173 / 8000)" }
