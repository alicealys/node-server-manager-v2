// https://github.com/12pt/steamid-converter/blob/master/js/converter.js

const bigInt          = require('big-integer')

const BASE_NUM        = bigInt("76561197960265728")
const REGEX_STEAMID64 = /^[0-9]{17}$/
const REGEX_STEAMID   = /^STEAM_[0-5]:[01]:\d+$/
const REGEX_STEAMID3  = /^\[U:1:[0-9]+\]$/

const steamUtils = {
    toSteamID64: (steamID) => {
        if (!steamID || typeof steamID !== 'string') {
            return false
        } else if (steamUtils.isSteamID3(steamID)) {
            steamID = steamUtils.fromSteamID3(steamID)
        }

        const split = steamID.split(':')
        const v = BASE_NUM
        const z = split[2]
        const y = split[1]

        return v.plus(z * 2).plus(y).toString()
    },
    isSteamID3: (steamID) => {
        if (!steamID || typeof steamID !== 'string') {
            return false
        }

        return REGEX_STEAMID3.test(steamID)
    },
    fromSteamID3: (steamID3) => {
        const split = steamID3.split(':')
        const last = split[2].substring(0, split[2].length - 1)

        return 'STEAM_0:' + (last % 2) + ':' + Math.floor(last / 2)
    }
}

module.exports = steamUtils