# Levanta el barrio completo.
#
# Montaje hibrido: los agentes vecinos corren en Ollama local, que es tarea
# simple y sin cuota, y la negociacion corre en Gemini, que es lo que se ve en la
# demo. Exporta GEMINI_API_KEY antes de correrlo.
#
# Los puertos y los perfiles salen de seed/network.json. Estaban escritos a mano
# aqui y se quedaron en dos organizaciones cuando el barrio ya tenia seis, asi
# que cuatro agentes no arrancaban y las rondas salian flacas sin decir por que.
$root = $PSScriptRoot
$py = "$root\.venv\Scripts\python.exe"

if (-not $env:GEMINI_API_KEY) {
    Write-Host "Falta GEMINI_API_KEY. Exportala antes de correr este script." -ForegroundColor Yellow
    exit 1
}
if (-not (Test-Path $py)) {
    Write-Host "No encuentro el interprete en $py" -ForegroundColor Yellow
    exit 1
}

try { Invoke-WebRequest -UseBasicParsing http://localhost:11434/api/version -TimeoutSec 3 | Out-Null }
catch { Start-Process "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" -ArgumentList "serve" -WindowStyle Hidden; Start-Sleep 7 }

Get-CimInstance Win32_Process -Filter "Name='python.exe'" |
    Where-Object { $_.CommandLine -like '*serve_org*' -or $_.CommandLine -like '*web?server.py*' } |
    ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -Confirm:$false -ErrorAction Stop } catch {} }
Start-Sleep 2

$red = Get-Content "$root\seed\network.json" -Raw | ConvertFrom-Json

$env:BARNRAISE_MODEL_PROVIDER = "ollama"
$env:BARNRAISE_OLLAMA_MODEL = "qwen2.5:7b-instruct"
foreach ($o in $red.organizaciones) {
    Start-Process $py -ArgumentList "$root\a2a\serve_org.py",$o.perfil,$o.port `
        -WorkingDirectory $root -WindowStyle Hidden
    Write-Host ("  {0}  {1}" -f $o.port, $o.nombre)
}

# gemini-3.5-flash quedaba estrangulado en llamadas de dos minutos y una ronda
# entera no cabia en una toma. flash-lite responde alrededor de 600 ms.
$env:BARNRAISE_MODEL_PROVIDER = "gemini"
if (-not $env:BARNRAISE_GEMINI_MODEL) { $env:BARNRAISE_GEMINI_MODEL = "gemini-3.1-flash-lite" }
Start-Process $py -ArgumentList "$root\web\server.py" -WorkingDirectory $root -WindowStyle Hidden

# Esperar a que respondan de verdad, en vez de dormir un numero fijo y confiar.
$fin = (Get-Date).AddSeconds(60)
$listos = @()
while ((Get-Date) -lt $fin) {
    $listos = @()
    foreach ($o in $red.organizaciones) {
        try {
            Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 `
                "http://127.0.0.1:$($o.port)/.well-known/agent-card.json" | Out-Null
            $listos += $o.port
        } catch {}
    }
    $web = $false
    try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 http://127.0.0.1:8080/api/state | Out-Null; $web = $true } catch {}
    if ($listos.Count -eq $red.organizaciones.Count -and $web) {
        Write-Host "Barrio levantado: $($listos.Count)/$($red.organizaciones.Count) agentes y la web. http://127.0.0.1:8080" -ForegroundColor Green
        exit 0
    }
    Start-Sleep 3
}
Write-Host "Solo respondieron $($listos.Count)/$($red.organizaciones.Count) agentes: $($listos -join ', ')" -ForegroundColor Yellow
exit 1
