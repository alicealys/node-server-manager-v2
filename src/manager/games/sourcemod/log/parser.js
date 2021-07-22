const regex = {
    header: /L (\d+\/\d+\/\d+) - (\d+:\d+:\d+): /g,
    kill: /"(.+?)\<(\d+)\>\<(\S+)\>\<(\S+)\>" \[(-?\d+) (-?\d+) (-?\d+)\] killed "(.+?)\<(\d+)\>\<(\S+)\>\<(\S+)\>" \[(-?\d+) (-?\d+) (-?\d+)\] with "(\S+)"/g,
    say: /"(.+?)\<(\d+)\>\<(\S+)\>\<(\S+)\>" say "(.+)"/g,
    purchase: /"(.+?)\<(\d+)\>\<(\S+)\>\<(\S+)\>" purchased "(.+)"/g,
    assist: /"(.+?)\<(\d+)\>\<(\S+)\>\<(\S+)\>" assisted killing "(.+?)\<(\d+)\>\<(\S+)\>\<(\S+)\>"/g,
    connect: /"(.+?)\<(\d+)\>\<(\S+)\>\<\>" connected.+/g,
    disconnect: /"(.+?)\<(\d+)\>\<(\S+)\>\<(\S+|)\>" disconnected \(reason "(.+|)"\)/gs,
    switch_team: /"(.+?)\<(\d+)\>\<(\S+)\>" switched from team \<(\S+)\> to \<(\S+)\>/g,
    suicide: /"(.+?)\<(\d+)\>\<(\S+)\>\<(\S+)\>" \[(-?\d+) (-?\d+) (-?\d+)\] committed suicide with "(.+)"/g,
    server_cvar: /server_cvar: "(.+)" "(.+|)"/g,
    cvar: /"(.+)" = "(.+|)"/g,
    start_map: /Started map "(.+)" \(CRC "(\d+)"\)/g,
}

class Parser {
    constructor() { }

    parse(event) {
        if (!event.match(regex.header)) {
            return {
                valid: false
            }
        }

        event = event.replace(regex.header, '')

        const types = Object.keys(regex)
        for (var i = 0; i < types.length; i++) {
            if (types[i] == 'header') {
                continue
            }

            if (event.match(regex[types[i]])) {
                return {
                    valid: true,
                    type: types[i],
                    args: regex[types[i]].exec(event).slice(1)
                }
            }
        }

        return {
            valid: false
        }
    }
}

module.exports = Parser