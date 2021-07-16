module.exports = {
    commandTemplates: {
        status: 'status',
        tell: 'tell {0} \"{1}\"',
        say: 'say {0}',
        kick: 'clientkick {0} "{1}"',
        setDvar: 'set {0} "{1}"',
        getDvar: '{0}'
    },
    responseHeader: /\xff\xff\xff\xffprint\n/g,
    statusHeader: /num +score +ping +guid +name +lastmsg +address +qport +rate */g,
    rconCommandFormat: '\xff\xff\xff\xffrcon {0} {1}',
    dvarRegex: /\"(.*?)\" +(is:|is) +\"(.*?)(?:\^7|)\"/g,
    statusRegex: /^ +([0-9]+) +([0-9]+) +([0-9]+) +([0-9]+) +(.{0,32}) +([0-9]+) +(\d+\.\d+\.\d+.\d+\:-*\d{1,5}|0+.0+:-*\d{1,5}|loopback|unknown|bot) +(-*[0-9]+) +([0-9]+) *$/g,
    commandDelay: 500,
    parseStatus: (match) => {
        const address = match[7].split(':')

        return {
            slot: parseInt(match[1]),
            score: parseInt(match[2]),
            bot: false,
            ping: parseInt(match[3]),
            uniqueId: match[4],
            name: match[5].replace(new RegExp(/\^([0-9]|\:|\;)/g, 'g'), ``),
            address: address[0] == '00000000.000000000000:0' ? '0.0.0.0' : address[0],
            port: parseInt(address[1])
        }
    },
    parseGuid: (guid) => {
        return guid
    },
    colors: {
        'white': '^7',
        'red': '^1',
        'green': '^2',
        'yellow': '^3',
        'blue': '^5',
        'purple': '^6',
        'default': '^7',
    },
}