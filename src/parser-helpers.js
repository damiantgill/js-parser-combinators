import {Result, ParseError, isError, map} from "./parser.js";

const apply_predicate = predicate => cursor => (
    predicate(cursor.current_char)
    ? Result(cursor.string, cursor.position, cursor.position + 1)
    : ParseError(cursor.string, "syntax error", cursor.position)
)

const mapchar = f => ch => f(ch.charCodeAt(0))

const WRD = apply_predicate(
    mapchar(
        ch =>  (ch >= 65 && ch <= 90) || (ch >= 97 && ch <= 122)
    )
)

const DIG = apply_predicate(
    mapchar(
        ch => (ch >= 48 && ch <= 57)
    )
)

// const WSP = apply_predicate(
//     mapchar(
//         ch => (ch >= 9 && ch <= 13) || ch == 32
//     )
// )

const WSP = apply_predicate(
    mapchar(
        ch => ch != 12 &&(ch >= 9 && ch <= 13) || ch == 32
    )
)


const END = apply_predicate(
    ch => ch == ""
)

const charset = (...chars) => apply_predicate(
    ch => chars.indexOf(ch) >= 0
)

const tag = label => map(
    value => ({label, value})
)


const as_value = value => parser => cursor => {
    const result = parser(cursor);
    return (
        isError(result)
        ? result
        : Result(cursor.string, result.start_position, result.end_position, value)
    )
}

export {apply_predicate, mapchar, WRD, WSP, END, charset, tag, as_value}