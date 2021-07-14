module.exports = {
    chunk(arr, len) {
        var chunks = []
        var i = 0
        var n = arr.length

        while (i < n) {
            chunks.push(arr.slice(i, i += len))
        }

        return chunks
    }
}