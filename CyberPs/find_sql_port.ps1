# Universal SQL Port Finder
$instances = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\Instance Names\SQL'
foreach ($instance in $instances.PSObject.Properties) {
    if ($instance.Name -ne 'PSPath' -and $instance.Name -ne 'PSParentPath' -and $instance.Name -ne 'PSChildName' -and $instance.Name -ne 'PSDrive' -and $instance.Name -ne 'PSProvider') {
        $actualName = $instance.Value
        $regPath = "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\$actualName\MSSQLServer\SuperSocketNetLib\Tcp\IpAll"
        if (Test-Path $regPath) {
            $ports = Get-ItemProperty $regPath
            Write-Host "INSTANCE: $($instance.Name)"
            Write-Host "Dynamic Port: $($ports.TcpDynamicPorts)"
            Write-Host "Static Port: $($ports.TcpPort)"
            Write-Host "----------------------------"
        }
    }
}
pause
