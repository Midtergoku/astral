# =============================================================================
# ENTREGA DE E-MAIL do Astral -- ler e configurar o SMTP do Supabase Auth.
#
# O PROBLEMA QUE ISTO RESOLVE (03/08/2026)
# O Lucas relatou que ninguem recebe o e-mail de confirmacao nem o de
# "esqueci minha senha". Nao e bug no codigo: o SMTP padrao do Supabase manda
# 2 MENSAGENS POR HORA e SO PARA MEMBROS DA ORGANIZACAO. Qualquer outro
# endereco falha com "Email address not authorized". Confirmado na
# documentacao oficial (supabase.com/docs/guides/auth/auth-smtp).
#
# Ou seja: um concurseiro de verdade NUNCA recebe. Hoje sao 2 usuarios com
# senha (os outros 6 entram pelo Google e nao dependem de e-mail).
#
# ⚠️ NAO USAR `supabase config push` PARA ISTO.
#    O config.toml deste projeto so declara as edge functions -- nao tem secao
#    [auth]. Um `config push` empurraria auth VAZIO e desligaria o captcha e o
#    login com Google em producao. A API de gerenciamento altera so o que se
#    manda, e por isso e o caminho certo aqui.
#
#   VER o estado atual (nao altera nada):
#     powershell -File tools\smtp-configura.ps1
#
#   APLICAR o SMTP do Gmail (precisa da senha de app, 16 letras):
#     $env:SMTP_PASS = 'abcd efgh ijkl mnop'
#     powershell -File tools\smtp-configura.ps1 -Aplicar -Usuario 'voce@gmail.com'
#     $env:SMTP_PASS = $null
#
#   VOLTAR ao SMTP padrao do Supabase (emergencia):
#     powershell -File tools\smtp-configura.ps1 -Desfazer
#
# ⚠️ A SENHA NUNCA ENTRA NESTE ARQUIVO. O repositorio e PUBLICO. Ela vem por
#    variavel de ambiente e fica guardada so no Supabase.
#
# ⚠️ ORDEM AO EXIGIR CONFIRMACAO DE E-MAIL DE NOVO:
#    1. configurar o SMTP aqui
#    2. PROVAR que um e-mail chega num endereco de fora
#    3. so entao mailer_autoconfirm = false (parametro -ExigirConfirmacao)
#    Inverter isso deixa NINGUEM conseguindo se cadastrar, porque a conta fica
#    presa esperando um e-mail que nao sai. E o mesmo tipo de erro de duas
#    pontas que derrubou o login no captcha em 31/07/2026.
#
# O token de acesso vem do Gerenciador de Credenciais do Windows, onde a CLI do
# Supabase o guarda. Duas armadilhas ja documentadas:
#   - o blob e UTF-8 puro, nao UTF-16 (usar Marshal.Copy, nao PtrToStringUni)
#   - Invoke-RestMethod -Method PATCH falha em silencio no PS 5.1 (usar
#     HttpWebRequest)
# =============================================================================
param(
  [switch]$Aplicar,
  [switch]$Desfazer,
  [switch]$ExigirConfirmacao,
  [string]$Usuario,
  [string]$Servidor = 'smtp.gmail.com',
  [int]$Porta = 465,
  [string]$Remetente = 'Astral'
)
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

# ⚠️ ARMADILHA DO POWERSHELL, custou uma rodada em 03/08/2026:
#    dentro de uma funcao, TUDO que vai para Write-Output vira valor de
#    retorno. Como esta funcao e chamada com `$antes = Mostrar "ANTES"`, o
#    relatorio inteiro foi capturado na variavel e a tela ficou vazia.
#    Por isso o texto sai por Write-Host (vai direto para a tela) e so o
#    objeto de configuracao sai por return.
function Mostrar($rotulo) {
  $c = Invoke-RestMethod -Method GET -Uri "https://api.supabase.com/v1/projects/$REF/config/auth" `
         -Headers @{ Authorization = "Bearer $TOKEN" }
  Write-Host ""
  Write-Host "===== $rotulo ====="
  if ([string]::IsNullOrEmpty($c.smtp_host)) {
    Write-Host "  ENTREGA: SMTP padrao do Supabase"
    Write-Host "           -> 2 mensagens por hora, SO para membros da organizacao."
    Write-Host "           -> usuario de verdade NAO RECEBE nada."
  } else {
    Write-Host ("  ENTREGA: {0}:{1} como {2}" -f $c.smtp_host, $c.smtp_port, $c.smtp_user)
    Write-Host ("           remetente: {0} <{1}>" -f $c.smtp_sender_name, $c.smtp_admin_email)
  }
  Write-Host ("  mailer_autoconfirm ....... {0}  ({1})" -f $c.mailer_autoconfirm,
    $(if ($c.mailer_autoconfirm) { 'cadastro entra SEM confirmar e-mail' } else { 'EXIGE confirmacao por e-mail' }))
  Write-Host ("  rate_limit_email_sent .... {0} por hora" -f $c.rate_limit_email_sent)
  Write-Host ("  external_email_enabled ... {0}" -f $c.external_email_enabled)
  Write-Host ("  external_google_enabled .. {0}   <- nao mexer" -f $c.external_google_enabled)
  Write-Host ("  security_captcha_enabled . {0}   <- nao mexer" -f $c.security_captcha_enabled)
  return $c
}

function Aplicar($mapa) {
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
    Write-Output ("PATCH -> HTTP {0}" -f [int]$resp.StatusCode)
    $resp.Close()
  } catch [Net.WebException] {
    $r = $_.Exception.Response
    $texto = (New-Object IO.StreamReader($r.GetResponseStream())).ReadToEnd()
    throw "PATCH falhou: HTTP $([int]$r.StatusCode) $texto"
  }
}

$antes = Mostrar "ANTES"

if ($Desfazer) {
  Write-Output "`nVoltando ao SMTP padrao do Supabase..."
  # Limpar o host desliga o SMTP proprio. mailer_autoconfirm volta a true para
  # ninguem ficar preso sem conseguir se cadastrar.
  Aplicar @{ smtp_host = ''; smtp_user = ''; smtp_pass = ''; smtp_admin_email = ''; mailer_autoconfirm = $true }
  Mostrar "DEPOIS" | Out-Null
  return
}

if ($Aplicar) {
  if (-not $Usuario)        { throw "Faltou -Usuario 'voce@gmail.com'." }
  if (-not $env:SMTP_PASS)  { throw "Faltou a senha: `$env:SMTP_PASS = 'as 16 letras da senha de app'." }

  $mapa = @{
    smtp_host        = $Servidor
    smtp_port        = $Porta
    smtp_user        = $Usuario
    smtp_pass        = ($env:SMTP_PASS -replace '\s', '')   # o Google mostra em 4 blocos
    smtp_admin_email = $Usuario   # o Gmail so envia com o remetente autenticado
    smtp_sender_name = $Remetente
  }
  # De proposito NAO mexe em mailer_autoconfirm aqui. Exigir confirmacao antes
  # de provar que o e-mail chega tranca todo mundo do lado de fora.
  Write-Output "`nAplicando SMTP..."
  Aplicar $mapa
  Mostrar "DEPOIS" | Out-Null
  Write-Output ""
  Write-Output "PROXIMO PASSO OBRIGATORIO: provar que chega num endereco de FORA"
  Write-Output "  (nao vale o proprio e-mail do dono do projeto -- esse ja recebia)."
  Write-Output "  So depois disso rodar com -ExigirConfirmacao."
  return
}

if ($ExigirConfirmacao) {
  if ([string]::IsNullOrEmpty($antes.smtp_host)) {
    throw "RECUSADO: nao ha SMTP proprio configurado. Exigir confirmacao agora deixaria NINGUEM conseguindo se cadastrar."
  }
  Write-Output "`nPassando a exigir confirmacao de e-mail no cadastro..."
  Aplicar @{ mailer_autoconfirm = $false }
  Mostrar "DEPOIS" | Out-Null
  return
}

Write-Output ""
Write-Output "(so leitura -- nada foi alterado. Use -Aplicar, -Desfazer ou -ExigirConfirmacao.)"
