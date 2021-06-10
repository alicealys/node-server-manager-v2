module.exports = {
    commandTemplates: {
        status: 'status',
        tell: 'tell {0} \"{1}\"',
        broadcast: 'say {0}'
    },
    rconCommandFormat: '\xff\xff\xff\xffrcon {0} {1}',
    parseStatus: (match) => {
        const address = match[7].split(':')

        return {
            slot: parseInt(match[1]),
            score: parseInt(match[2]),
            bot: match[3] == '1',
            ping: parseInt(match[4]),
            id: parseInt(match[5].substr(8), 16).toString(),
            name: match[6].replace(new RegExp(/\^([0-9]|\:|\;)/g, 'g'), ``),
            ip: address[0],
            port: parseInt(address[1])
        }
    },
    statusRegex: /^ +([0-9]+) +([0-9]+) +([0-9]+) +([0-9]+) +((?:[A-Za-z0-9]){8,32}|(?:[A-Za-z0-9]){8,32}|bot[0-9]+|(?:[[A-Za-z0-9]+)) *(.{0,32}) +(\d+\.\d+\.\d+.\d+\:-*\d{1,5}|0+.0+:-*\d{1,5}|loopback|unknown|bot) +([0-9]+) *$/g
}