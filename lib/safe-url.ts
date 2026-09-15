import dns from 'node:dns/promises';
import net from 'node:net';

function isPrivateIpv4(address: string) {
  const parts = address.split('.').map(Number);
  return parts.length === 4 && (
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168)
  );
}

function isPrivateAddress(address: string) {
  const normalized = address.toLowerCase();
  if (net.isIPv4(normalized)) return isPrivateIpv4(normalized);
  return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:') || normalized.startsWith('::ffff:192.168.') || normalized.startsWith('::ffff:10.');
}

export async function validateMonitorUrl(rawUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Geçerli bir URL girilmelidir');
  }

  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error('Yalnızca kimlik doğrulamasız HTTP/HTTPS URL desteklenir');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === 'metadata.google.internal' || hostname === 'host.docker.internal') {
    throw new Error('Bu adres izlenemez');
  }

  const addresses = net.isIP(hostname) ? [hostname] : (await dns.lookup(hostname, { all: true })).map((result) => result.address);
  if (!addresses.length || addresses.some(isPrivateAddress)) throw new Error('Yerel veya özel ağ adresleri izlenemez');
  return parsed.toString().replace(/\/$/, '');
}
