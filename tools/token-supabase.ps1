# =============================================================================
# Imprime o token de gerenciamento do Supabase, lido do Gerenciador de
# Credenciais do Windows -- onde a CLI do Supabase o guarda apos `supabase login`.
#
# POR QUE ESTE ARQUIVO EXISTE SOZINHO
# Varias ferramentas precisam do token para falar com a API de gerenciamento
# (a unica que roda SQL de estrutura). Antes cada uma repetia estas 30 linhas
# de interop com o Windows. Copia repetida diverge -- ja aconteceu cinco vezes
# neste projeto.
#
# 🔴 ELE IMPRIME UM SEGREDO. Por isso:
#   - NUNCA redirecionar a saida para arquivo
#   - NUNCA ecoar em log
#   - quem chama le pelo cano (stdout) e usa em memoria
# O token nao entra em arquivo nenhum, e este repositorio e publico.
#
# Duas armadilhas ja documentadas do PowerShell 5.1, herdadas aqui:
#   - o blob da credencial e UTF-8 puro, nao UTF-16 (Marshal.Copy, nao PtrToStringUni)
#   - Write-Output dentro de funcao vira valor de retorno; aqui nao ha funcao
# =============================================================================
$ErrorActionPreference = 'Stop'

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
$token = [Text.Encoding]::UTF8.GetString($bytes)
[Win32.CredMan]::CredFree($ptr)

if (-not $token.StartsWith('sbp_')) { throw "Token lido parece invalido." }

# Sem quebra de linha extra: quem le do outro lado faz trim de qualquer forma,
# mas menos ruido no cano e menos chance de erro bobo.
[Console]::Out.Write($token)
