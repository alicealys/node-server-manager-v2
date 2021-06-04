const regex = {
    say: /^(.+) (say|sayteam);(-?[A-Fa-f0-9_]{1,32}|bot[0-9]+|0);([0-9]+);([^;]*);(.*)$/g,
    join: /^(.+) (J);(-?[A-Fa-f0-9_]{1,32}|bot[0-9]+|0);([0-9]+);(.*)$/g,
    quit: /^(.+) (Q);(-?[A-Fa-f0-9_]{1,32}|bot[0-9]+|0);([0-9]+);(.*)$/g,
    damage: /^(.+) (D);(-?[A-Fa-f0-9_]{1,32}|bot[0-9]+|0);(-?[0-9]+);(axis|allies|world|none)?;([^;]{1,24});(-?[A-Fa-f0-9_]{1,32}|bot[0-9]+|0)?;(-?[0-9]+);(axis|allies|world|none)?;([^;]{1,24})?;((?:[0-9]+|[a-z]+|_|\+)+);([0-9]+);((?:[A-Z]|_)+);((?:[a-z]|_)+)$/g,
    kill: /^(.+) (K);(-?[A-Fa-f0-9_]{1,32}|bot[0-9]+|0);(-?[0-9]+);(axis|allies|world|none)?;([^;]{1,24});(-?[A-Fa-f0-9_]{1,32}|bot[0-9]+|0)?;(-?[0-9]+);(axis|allies|world|none)?;([^;]{1,24})?;((?:[0-9]+|[a-z]+|_|\+)+);([0-9]+);((?:[A-Z]|_)+);((?:[a-z]|_)+)$/g,
    init: /^( +|)(.+) (InitGame|InitGame(.+))$/g
}

class Parser {
    constructor() { }

    parse(event) {
        const types = Object.keys(regex)
        for (var i = 0; i < types.length; i++) {
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