#!/system/bin/sh
# Re-aplica el redirect de red para que el cliente llegue a NUESTRO server.
# Puerto real del game server = 9340 (y 9339 por si acaso) -> gateway 172.16.1.2:9339 (=PC).
GW=172.16.1.2
sysctl -w net.ipv4.conf.all.route_localnet=1 >/dev/null 2>&1
iptables -t nat -F OUTPUT
iptables -t nat -A OUTPUT -p tcp --dport 9339 -j DNAT --to-destination $GW:9339
iptables -t nat -A OUTPUT -p tcp --dport 9340 -j DNAT --to-destination $GW:9339
echo "redirect activo:"
iptables -t nat -S OUTPUT | grep 934
