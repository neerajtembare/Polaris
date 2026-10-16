# Polaris - Allow Access from Local Wi-Fi Network
# Requires Administrator privileges to configure Windows Firewall and Port Proxy

$ErrorActionPreference = "Stop"

Write-Host "Configuring Windows Firewall for Polaris (ports 5173, 3001)..." -ForegroundColor Cyan

# 1. Remove any old rule with same name if exists
Remove-NetFirewallRule -DisplayName "Polaris Web" -ErrorAction SilentlyContinue

# 2. Add Inbound Firewall Rule for Vite (5173) and Backend (3001)
New-NetFirewallRule -DisplayName "Polaris Web" -Direction Inbound -LocalPort 5173,3001 -Protocol TCP -Action Allow -Profile Any | Out-Null
Write-Host "✓ Windows Firewall rule added for ports 5173 & 3001" -ForegroundColor Green

# 3. Add Port Proxy so incoming LAN traffic forwards directly to WSL localhost
netsh interface portproxy delete v4tov4 listenport=5173 listenaddress=0.0.0.0 2>$null
netsh interface portproxy delete v4tov4 listenport=3001 listenaddress=0.0.0.0 2>$null

netsh interface portproxy add v4tov4 listenport=5173 listenaddress=0.0.0.0 connectport=5173 connectaddress=127.0.0.1
netsh interface portproxy add v4tov4 listenport=3001 listenaddress=0.0.0.0 connectport=3001 connectaddress=127.0.0.1
Write-Host "✓ Port forwarding active (0.0.0.0 -> 127.0.0.1)" -ForegroundColor Green

# 4. Display local Wi-Fi IP
$wifiIp = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi" -ErrorAction SilentlyContinue | Select-Object -First 1).IPAddress
if (-not $wifiIp) {
    $wifiIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.*" } | Select-Object -First 1).IPAddress
}

Write-Host "`nSetup complete! On your phone or another device on the same Wi-Fi, open:" -ForegroundColor Yellow
Write-Host "  http://${wifiIp}:5173`n" -ForegroundColor Green
