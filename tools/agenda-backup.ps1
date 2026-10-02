# ============================================================================
# AGENDA-BACKUP -- o backup do banco todo dia, sozinho, neste computador
#
# Auditoria pre-lancamento, achado OPS-02 (S0), Lote 1 do roadmap (02/10/2026).
# O plano gratis do Supabase NAO faz backup. O nosso (tools/backup.js) so
# existia quando alguem o rodava. Esta tarefa do Windows roda ele todo dia.
#
# - Horario: 21:00. Se o computador estiver desligado, roda assim que ligar
#   (StartWhenAvailable).
# - Os dados NAO saem deste computador: ficam em ..\ASTRAL-BACKUPS, fora do
#   repositorio (que e publico). Copia fora do PC e decisao do Lucas.
# - Cada execucao grava ..\ASTRAL-BACKUPS\ultimo-backup.json; o checa-saude
#   avisa se o ultimo backup tiver mais de 2 dias ou tiver falhado.
# - Nada e apagado: cada copia tem ~2 MB (medido em 02/10/2026).
#
# USO
#   powershell -File tools\agenda-backup.ps1            cria (ou recria) a tarefa
#   powershell -File tools\agenda-backup.ps1 -Agora     cria e roda uma vez agora
#   powershell -File tools\agenda-backup.ps1 -Ver       mostra a tarefa e o ultimo resultado
#   powershell -File tools\agenda-backup.ps1 -Remover   apaga a tarefa (os backups ficam)
# ============================================================================
param([switch]$Agora, [switch]$Ver, [switch]$Remover)

$ErrorActionPreference = 'Stop'
$nome = 'Astral - backup diario'
$raiz = Split-Path -Parent $PSScriptRoot
$destino = Join-Path (Split-Path -Parent $raiz) 'ASTRAL-BACKUPS'
$log = Join-Path $destino 'backup-agendado.log'
$status = Join-Path $destino 'ultimo-backup.json'

if ($Remover) {
  Unregister-ScheduledTask -TaskName $nome -Confirm:$false -ErrorAction SilentlyContinue
  Write-Output "Tarefa removida (os backups em $destino continuam la)."
  exit 0
}

if ($Ver) {
  $t = Get-ScheduledTask -TaskName $nome -ErrorAction SilentlyContinue
  if (-not $t) { Write-Output 'Tarefa NAO existe.'; exit 1 }
  $i = Get-ScheduledTaskInfo -TaskName $nome
  Write-Output ("Tarefa: {0} | estado: {1} | ultima execucao: {2} (codigo {3}) | proxima: {4}" -f $nome, $t.State, $i.LastRunTime, $i.LastTaskResult, $i.NextRunTime)
  if (Test-Path $status) { Write-Output ('ultimo-backup.json: ' + (Get-Content $status -Raw)) }
  exit 0
}

$node = (Get-Command node -ErrorAction Stop).Source
New-Item -ItemType Directory -Force -Path $destino | Out-Null

# cmd /c para o >> do log funcionar; cd /d para rodar de dentro do repositorio.
$argumentos = '/c cd /d "{0}" && "{1}" tools\backup.js >> "{2}" 2>&1' -f $raiz, $node, $log
$acao = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument $argumentos
$quando = New-ScheduledTaskTrigger -Daily -At '21:00'
$config = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 30)
Register-ScheduledTask -TaskName $nome -Action $acao -Trigger $quando -Settings $config -Description 'Backup diario do banco do Astral (tools/backup.js). Dados ficam neste PC, fora do repositorio.' -Force | Out-Null
Write-Output "Tarefa '$nome' criada: todo dia as 21:00 (ou ao ligar o PC, se estiver desligado)."

if ($Agora) {
  Start-ScheduledTask -TaskName $nome
  Write-Output 'Rodando agora pela propria tarefa...'
  $limite = (Get-Date).AddMinutes(10)
  do { Start-Sleep -Seconds 5; $estado = (Get-ScheduledTask -TaskName $nome).State } while ($estado -eq 'Running' -and (Get-Date) -lt $limite)
  $i = Get-ScheduledTaskInfo -TaskName $nome
  Write-Output ("Terminou com codigo {0} (0 = deu certo)." -f $i.LastTaskResult)
  if (Test-Path $status) { Write-Output ('ultimo-backup.json: ' + (Get-Content $status -Raw)) }
}
