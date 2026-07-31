# =============================================================================
# LIGA / DESLIGA o captcha do Supabase Auth. Ferramenta de emergencia.
#
# PARA QUE SERVE: se o captcha quebrar o login (widget que nao carrega, dominio
# cadastrado errado no hCaptcha, hCaptcha fora do ar), isto devolve o acesso a
# todo mundo em segundos, sem abrir painel nenhum.
#
#   DESLIGAR (emergencia):
#     powershell -File tools\captcha-toggle.ps1
#
#   LIGAR de novo (a secret ja fica guardada no Supabase, nao precisa reenviar):
#     powershell -File tools\captcha-toggle.ps1 -Ligar
#
#   LIGAR trocando a secret:
#     $env:HCAPTCHA_SECRET = 'ES_...'
#     powershell -File tools\captcha-toggle.ps1 -Ligar
#     $env:HCAPTCHA_SECRET = $null
#
# ⚠️ A SECRET NUNCA ENTRA NESTE ARQUIVO. Este repositorio e publico. Ela vem por
#    variavel de ambiente, e o Supabase ja a guarda depois da primeira vez.
#
# ⚠️ ORDEM AO LIGAR: a sitekey em assets/js/astral.js tem de estar PUBLICADA
#    antes. Ligar aqui primeiro derruba o login de todo mundo -- ja aconteceu em
#    31/07/2026. Ver CLAUDE.md 13.5.
#
# O token de acesso vem do Gerenciador de Credenciais do Windows, onde a CLI do
# Supabase o guarda. Duas armadilhas ja documentadas em CLAUDE.md 10.2:
#   - o blob e UTF-8 puro, nao UTF-16 (usar Marshal.Copy, nao PtrToStringUni)
#   - Invoke-RestMethod -Method PATCH falha em silencio no PS 5.1 (usar
#     HttpWebRequest)
# =============================================================================
param([switch]$Ligar)
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
  throw "Token da CLI do Supabase nao encontrado. Rode 'supabase login' primeiro."
}
$cred  = [Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [type][Win32.CredMan+CREDENTIAL])
$bytes = New-Object byte[] $cred.CredentialBlobSize
[Runtime.InteropServices.Marshal]::Copy($cred.CredentialBlob, $bytes, 0, $cred.CredentialBlobSize)
$TOKEN = [Text.Encoding]::UTF8.GetString($bytes)
[Win32.CredMan]::CredFree($ptr)

if (-not $TOKEN.StartsWith('sbp_')) { throw "Token lido parece invalido." }

$mapa = @{ security_captcha_enabled = [bool]$Ligar }
if ($Ligar) {
  $mapa['security_captcha_provider'] = 'hcaptcha'
  # So reenvia a secret se ela vier pelo ambiente. Sem isso, mantem a que ja
  # esta guardada no Supabase -- e por isso religar nao exige a chave em maos.
  if ($env:HCAPTCHA_SECRET) { $mapa['security_captcha_secret'] = $env:HCAPTCHA_SECRET }
}

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
  Write-Output "PATCH -> HTTP $([int]$resp.StatusCode)"
  $resp.Close()
} catch [Net.WebException] {
  $r = $_.Exception.Response
  $texto = (New-Object IO.StreamReader($r.GetResponseStream())).ReadToEnd()
  throw "PATCH falhou: HTTP $([int]$r.StatusCode) $texto"
}

$agora = Invoke-RestMethod -Method GET `
  -Uri "https://api.supabase.com/v1/projects/$REF/config/auth" `
  -Headers @{ Authorization = "Bearer $TOKEN" }

Write-Output ("security_captcha_enabled = {0}" -f $agora.security_captcha_enabled)
Write-Output ("external_google_enabled  = {0}  (nao tocado)" -f $agora.external_google_enabled)
if (-not $agora.security_captcha_enabled) {
  Write-Output "`nCaptcha DESLIGADO. O login por senha volta a funcionar imediatamente."
}
