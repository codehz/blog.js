'use strict'

module.exports = function (morgan) {
    morgan.format('custom', function developmentFormatLine(tokens, req, res) {
        // get the status code if response written
        var status = res._header
            ? res.statusCode
            : undefined

        // get status color
        var color = status >= 500 ? 31 // red
            : status >= 400 ? 33 // yellow
                : status >= 300 ? 36 // cyan
                    : status >= 200 ? 32 // green
                        : 0 // no color

        // get colored function
        var fn = developmentFormatLine[color]

        if (!fn) {
            // compile
            fn = developmentFormatLine[color] = morgan.compile('\x1b['
                + color + 'm:status\x1b[0m\t:method\t:url\t@:date[iso]\t:req[X-Forwarded-For]\t:user-agent\x1b[0m')
        }

        return fn(tokens, req, res)
    });
    return morgan('custom');
}
