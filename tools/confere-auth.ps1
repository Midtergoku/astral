# =============================================================================
# CONFERE-AUTH -- so leitura. Compara a configuracao de autenticacao em
# producao com o que ela DEVE ser.
#
# POR QUE EXISTE (03/08/2026)
# Um `git push` disparou um `supabase config push` automatico que reescreveu a
# configuracao de auth da PRODUCAO com valores de desenvolvimento local
# (site_url virando http://127.0.0.1:3000, senha minima caindo de 8 para 6).
# Isto aqui diz, em segundos, se producao esta como deveria.
#
#   powershell -File tools\confere-auth.ps1             so confere
#   powershell -File tools\confere-auth.ps1 -Corrigir   confere e conserta
#
# Sai com codigo 1 se algo estiver diferente do esperado.
# =============================================================================
param([switch]$Corrigir)
$ErrorActionPreference = 'Stop'
$REF = 'jjogmcacbdefwiwcyjxp'

if (-not ("CredMan" -as [type])) {
  Add-Type -Namespace Win32 -Name CredMan -MemberDefinition @'
[DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
public static extern bool CredRead(string target, uint type, uint flags, out IntPtr credential);
[DllImport("advapi32.dll")]
public static extern void CredFree(IntPtr buffer);
[StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
public struct CREDENTIAL {
  public uint Flags; public uint Type; public string TargetName; public string Comment;
  public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
  public uint CredentialBlobSize; public IntPtr CredentialBlob;
  public uint Persist; public uint AttributeCount; public IntPtr Attributes;
  public string TargetAlias; public string UserName;
}
'@
}
$ptr = [IntPtr]::Zero
if (-not [Win32.CredMan]::CredRead('Supabase CLI:supabase', 1, 0, [ref]$ptr)) {
  throw "Token da CLI do Supabase nao encontrado."
}
$cred  = [Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [type][Win32.CredMan+CREDENTIAL])
$bytes = New-Object byte[] $cred.CredentialBlobSize
[Runtime.InteropServices.Marshal]::Copy($cred.CredentialBlob, $bytes, 0, $cred.CredentialBlobSize)
$TOKEN = [Text.Encoding]::UTF8.GetString($bytes)
[Win32.CredMan]::CredFree($ptr)

$c = Invoke-RestMethod -Method GET -Uri "https://api.supabase.com/v1/projects/$REF/config/auth" `
       -Headers @{ Authorization = "Bearer $TOKEN" }

# O que producao TEM de ser. Cada linha tem um porque:
$esperado = @(
  @{ campo = 'site_url';                 vale = 'https://astral-psi.vercel.app'
     porque = 'e para onde o Google devolve o usuario e para onde vai o link de senha' },
  @{ campo = 'uri_allow_list';           vale = 'https://astral-psi.vercel.app/**'
     porque = 'sem isto o redirecionamento do login e recusado' },
  @{ campo = 'password_min_length';      vale = 8
     porque = 'o formulario exige 8; deixar o servidor em 6 e seguranca de mentira' },
  @{ campo = 'external_google_enabled';  vale = $true
     porque = 'e por onde entram 6 dos 8 usuarios' },
  @{ campo = 'external_email_enabled';   vale = $true
     porque = 'os outros 2 usuarios entram por senha' },
  @{ campo = 'security_captcha_enabled'; vale = $true
     porque = 'unica protecao de forca bruta que nao se contorna' },
  @{ campo = 'mailer_autoconfirm';       vale = $true
     porque = 'sem SMTP proprio, exigir confirmacao tranca todo mundo do lado de fora' }
)

Write-Host "CONFERE-AUTH -- producao contra o esperado`n"
$ruim = 0
foreach ($e in $esperado) {
  $atual = $c.($e.campo)
  $ok = ($atual -eq $e.vale)
  if (-not $ok) { $ruim++ }
  Write-Host ("  {0} {1}{2}" -f $(if ($ok) { 'OK    ' } else { 'ERRADO' }), $e.campo.PadRight(28), $atual)
  if (-not $ok) {
    Write-Host ("         esperado: {0}" -f $e.vale)
    Write-Host ("         importa porque: {0}" -f $e.porque)
  }
}

Write-Host ""
Write-Host ("=" * 66)

if ($ruim -and $Corrigir) {
  Write-Host "Corrigindo os $ruim campo(s)...`n"
  $mapa = @{}
  foreach ($e in $esperado) { if ($c.($e.campo) -ne $e.vale) { $mapa[$e.campo] = $e.vale } }

  $corpo = $mapa | ConvertTo-Json -Compress
  $req = [Net.HttpWebRequest]::Create("https://api.supabase.com/v1/projects/$REF/config/auth")
  $req.Method = 'PATCH'
  $req.ContentType = 'application/json'
  $req.Headers.Add('Authorization', "Bearer $TOKEN")
  $dados = [Text.Encoding]::UTF8.GetBytes($corpo)
  $req.ContentLength = $dados.Length
  $f = $req.GetRequestStream(); $f.Write($dados, 0, $dados.Length); $f.Close()
  try {
    $resp = $req.GetResponse()
    Write-Host ("PATCH -> HTTP {0}" -f [int]$resp.StatusCode)
    $resp.Close()
  } catch [Net.WebException] {
    $r = $_.Exception.Response
    $texto = (New-Object IO.StreamReader($r.GetResponseStream())).ReadToEnd()
    throw "PATCH falhou: HTTP $([int]$r.StatusCode) $texto"
  }

  # Confere de novo, lendo do servidor -- nao acreditar no proprio PATCH
  $d = Invoke-RestMethod -Method GET -Uri "https://api.supabase.com/v1/projects/$REF/config/auth" `
         -Headers @{ Authorization = "Bearer $TOKEN" }
  $sobrou = 0
  Write-Host ""
  foreach ($e in $esperado) {
    $ok = ($d.($e.campo) -eq $e.vale)
    if (-not $ok) { $sobrou++ }
    Write-Host ("  {0} {1}{2}" -f $(if ($ok) { 'OK    ' } else { 'AINDA ERRADO' }), $e.campo.PadRight(28), $d.($e.campo))
  }
  Write-Host ""
  if ($sobrou) { Write-Host "$sobrou campo(s) NAO voltaram."; exit 1 }
  Write-Host "Tudo de volta ao esperado."
  exit 0
}

if ($ruim) {
  Write-Host "$ruim campo(s) DIFERENTE(S) do esperado."
  Write-Host "Para consertar:  powershell -File tools\confere-auth.ps1 -Corrigir"
  exit 1
} else {
  Write-Host "Configuracao de autenticacao da producao esta correta."
  exit 0
}
