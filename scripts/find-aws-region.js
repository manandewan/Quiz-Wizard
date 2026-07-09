const dns = require('dns');

async function main() {
  const host = 'db.ecqeseqnrqgyrqxlpgls.supabase.co';
  console.log(`Resolving IP for ${host}...`);
  
  try {
    const ips = await new Promise((resolve, reject) => {
      dns.resolve6(host, (err, addrs) => err ? reject(err) : resolve(addrs));
    });
    console.log(`Resolved IPv6: ${ips[0]}`);
    const targetIp = ips[0];

    console.log('Fetching AWS IP Ranges JSON...');
    const response = await fetch('https://ip-ranges.amazonaws.com/ip-ranges.json');
    const data = await response.json();
    console.log(`Loaded ${data.ipv6_prefixes.length} IPv6 prefixes.`);

    console.log('Searching AWS ranges...');
    function ipv6InCidr(ip, cidr) {
      try {
        const [cidrIp, prefixLengthStr] = cidr.split('/');
        const prefixLength = parseInt(prefixLengthStr, 10);
        
        const ipHex = ipToHex(ip);
        const cidrHex = ipToHex(cidrIp);
        
        const bitsToCheck = prefixLength;
        const hexCharsToCheck = Math.floor(bitsToCheck / 4);
        
        if (ipHex.slice(0, hexCharsToCheck) !== cidrHex.slice(0, hexCharsToCheck)) {
          return false;
        }
        
        // Check remaining bits in the next hex char if prefix is not a multiple of 4
        const remainingBits = bitsToCheck % 4;
        if (remainingBits > 0) {
          const ipChar = parseInt(ipHex[hexCharsToCheck], 16);
          const cidrChar = parseInt(cidrHex[hexCharsToCheck], 16);
          const mask = (0xf << (4 - remainingBits)) & 0xf;
          if ((ipChar & mask) !== (cidrChar & mask)) {
            return false;
          }
        }
        
        return true;
      } catch (err) {
        return false;
      }
    }

    function ipToHex(ip) {
      const parts = ip.split(':');
      let hex = '';
      for (let part of parts) {
        if (part === '') {
          // Double colon expansion
          const missingCount = 8 - parts.filter(p => p !== '').length;
          hex += '0'.repeat(missingCount * 4);
        } else {
          hex += part.padStart(4, '0');
        }
      }
      return hex;
    }

    console.log('Searching AWS ranges...');
    let found = null;
    for (const prefix of data.ipv6_prefixes) {
      if (ipv6InCidr(targetIp, prefix.ipv6_prefix)) {
        found = prefix;
        console.log(`Match found! Region: ${prefix.region}, Service: ${prefix.service}, CIDR: ${prefix.ipv6_prefix}`);
      }
    }
    
    if (!found) {
      console.log('No AWS CIDR match found. Checking IPv4 addresses...');
      // Try resolving IPv4 addresses
      try {
        const ipv4s = await new Promise((resolve, reject) => {
          dns.resolve4(host, (err, addrs) => err ? reject(err) : resolve(addrs));
        });
        console.log(`Resolved IPv4s: ${ipv4s.join(', ')}`);
      } catch (err) {
        console.log(`Failed to resolve IPv4: ${err.message}`);
      }
    }

  } catch (err) {
    console.error('Error running check:', err);
  }
}

main();
