function trace(v){ console.log(v); return v} //inline log for debugging

const ParseError = (error, cursor) => ({
    error, cursor
})

const isError = result => "error" in result;

const CursorProto = {
    advance(n=1) { return Cursor(this.string, this.position + n) },
    get current_char(){ return this.string.charAt(this.position) }
}

const Cursor = (string, position=0) => ({__proto__: CursorProto, string, position })

const EMPTY = Symbol('EMPTY');
const ResultProto = {
    get match(){
        return this.cursor_end.string.slice(this.cursor_start.position, this.cursor_end.position);
    }
}

const Result = (cursor_start, cursor_end, value = EMPTY) =>  ({
    __proto__: ResultProto, cursor_start, cursor_end, value:value,
});

const $ = string => cursor => {
    const working_cursor = Cursor(cursor.string, cursor.position);
    for(let i=0; i < string.length; i++){
        //const result = working_cursor.accept(string.charAt(i));

        if(string.charAt(i) === working_cursor.string.charAt(working_cursor.position)){
            working_cursor.position++;
        }else{
            return ParseError("syntax error", working_cursor);
        }
    } 

    return Result(cursor, working_cursor);
}

const apply_predicate = predicate => cursor => (
    predicate(cursor.current_char)
    ? Result(cursor, cursor.advance())
    : ParseError("syntax error", cursor)
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

const WSP = apply_predicate(
    mapchar(
        ch => (ch >= 9 && ch <= 13) || ch == 32
    )
)

const charset = (...chars) => apply_predicate(
    ch => chars.indexOf(ch) >= 0
)

const either = (...parsers) => cursor => {
    let min_cursor = false;
    for(let p of parsers){
        const result = p(cursor);
        if(isError(result)){
            min_cursor = (
                (!min_cursor)
                ? result.cursor
                : (result.cursor.position < min_cursor.position)
                ? result.cursor
                : min_cursor
            )
        }else{
            return result;
        }
    }
    return ParseError("syntax error " + min_cursor.position, min_cursor);
}

const not = parser => cursor => {
    const working_cursor = Cursor(cursor.string, cursor.position);
    let result = parser(working_cursor);

    while(isError(result)){
        if((result.cursor.position) < result.cursor.string.length){
            working_cursor.position++;
        }else{
            break;
        }
        result = parser(working_cursor);
    }

    return Result(cursor, isError(result) ? result.cursor : result.cursor_start);
}

const option = parser => cursor => {
    const result = parser(cursor);
    return isError(result) ? Result(cursor, cursor) : result;
}

const sequence = (...parsers) => cursor => {
    let value = EMPTY;
    let current_cursor = cursor;
    for(let p of parsers){
        const result = p(current_cursor);
        
        if(isError(result)){
            return result;
        }else if(result.value != EMPTY){
            value = (value == EMPTY) ? [] : value;
            value.push(result.value);
        }

        current_cursor = result.cursor_end
    }

    return Result(cursor, current_cursor, value);
}

const MAX = 10000;

const repeat = (min = 1, max = MAX) => parser => cursor => {
    let current_cursor = cursor;
    let value = EMPTY;

    //we use global Max (not local max) to allow for overflow errors
    for(let rep = 0; rep < MAX; rep++){
        if(rep > max){
            return ParseError("repeat over max error", current_cursor);
        }

        if(current_cursor.position >= current_cursor.string.length){
            if(rep < min ){
                return ParseError("repeat under min error", current_cursor);
            }else{
                return Result(cursor, current_cursor, value);
            }
        }

        const result = parser(current_cursor);
        if(isError(result)){
            return (
                (rep < min)
                ? result //propagate the error
                : Result(cursor, current_cursor, value) //supress the error
            );
        }else if (max <= 0){
            return ParseError("syntax error", current_cursor);
        }else if(result.value != EMPTY){
            value = (value == EMPTY) ? [] : value;
            value.push(result.value);
        }

        current_cursor = result.cursor_end
    }
}

const capture = parser => cursor => {
    const result = parser(cursor);
    return (
        isError(result)
        ? result
        : Result(result.cursor_start, result.cursor_end, result.match)
    )
}

const log = parser => cursor => trace(parser(cursor));

const map = f => parser => cursor => {
    const result = parser(cursor);
    return (
        (isError(result) || (result.value == EMPTY))
        ? result
        : {...result, value: f(result.value)}
    )
}

const tag = label => map(
    value => ({label, value})
)

export {
    Cursor, ParseError, isError, $, either, not, sequence, repeat, option, capture, map, log, WRD, DIG, WSP, charset, tag
};