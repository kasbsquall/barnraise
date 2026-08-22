# Levanta el barrio completo. Montaje hibrido: los agentes vecinos corren en
# Ollama local (tarea simple, sin cuota) y la negociacion en Gemini, que es lo
# que se ve en la demo. Ajusta GEMINI_API_KEY antes de correrlo.
$root = $PSScriptRoot
$py = "$root\.venv\Scripts\python.exe"

if (-not $env:GEMINI_API_KEY) {
    Write-Host "Falta GEMINI_API_KEY. Exportala antes de correr este script." -ForegroundColor Yellow
    exit 1
}

try { Invoke-WebRequest -UseBasicParsing http://localhost:11434/api/version -TimeoutSec 3 | Out-Null }
catch { Start-Process "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" -ArgumentList "serve" -WindowStyle Hidden; Start-Sleep 7 }

Get-CimInstance Win32_Process -Filter "Name='python.exe'" |
    Where-Object { $_.CommandLine -like '*serve_org*' -or $_.CommandLine -like '*web?server.py*' } |
    ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -Confirm:$false -ErrorAction Stop } catch {} }
Start-Sleep 2

$env:BARNRAISE_MODEL_PROVIDER = "ollama"
$env:BARNRAISE_OLLAMA_MODEL = "qwen2.5:7b-instruct"
Start-Process $py -ArgumentList "$root\a2a\serve_org.py","seed/orgs/library.json","9001" -WorkingDirectory $root -WindowStyle Hidden
Start-Process $py -ArgumentList "$root\a2a\serve_org.py","seed/orgs/school.json","9003" -WorkingDirectory $root -WindowStyle Hidden

$env:BARNRAISE_MODEL_PROVIDER = "gemini"
if (-not $env:BARNRAISE_GEMINI_MODEL) { $env:BARNRAISE_GEMINI_MODEL = "gemini-3.5-flash" }
Start-Process $py -ArgumentList "$root\web\server.py" -WorkingDirectory $root -WindowStyle Hidden

Start-Sleep 9
Write-Host "Barrio levantado. Abre http://127.0.0.1:8080"
