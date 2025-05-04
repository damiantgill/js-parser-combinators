function trace(v){ console.log(v); return v} //inline log for debugging

class ResultList extends Array{
    constructor(){
        super();
    }

    append(item){
        if(item instanceof ResultList){
            for(let i=0; i < item.length; i++){
                this.push(item[i])
            }
        }else{
            this.push(item);
        }
    }
}

const ParseError = (string, error, position) => ({
    string, error, position, cursor:null
})

const isError = result => "error" in result;

const CursorProto = {
    get current_char(){ return this.string.charAt(this.position) },
    get remaining(){ return this.string.length - this.position},
    clone(){ return Cursor(this.string, this.position)}
}

const Cursor = (string, position=0) => ({__proto__: CursorProto, string, position })

const EMPTY = Symbol('EMPTY');
const ResultProto = {
    get match(){
        return this.string.slice(this.start_position, this.end_position);
    }
}

const Result = (string, start_position, end_position, value = EMPTY) =>  ({
    __proto__: ResultProto, string, start_position, end_position, value:value,
});

const $ = string => cursor => {
    const working_cursor = cursor.clone();
    for(let i=0; i < string.length; i++){
        if(string.charAt(i) === working_cursor.string.charAt(working_cursor.position)){
            working_cursor.position++;
        }else{
            return ParseError(working_cursor.string, "syntax error", working_cursor.position);
        }
    } 

    return Result(cursor.string, cursor.position, working_cursor.position);
}

const either = (...parsers) => cursor => {
    let min_position = (parsers.length > 0) ? Number.MAX_SAFE_INTEGER : cursor.position;
    for(let p of parsers){
        const result = p(cursor);
        if(isError(result)){
            min_position = Math.min(min_position, result.position)
        }else{
            return result;
        }
    }

    return ParseError(cursor.string, "syntax error " + min_position, min_position);
}

const not = parser => cursor => {
    const working_cursor = cursor.clone();
    let result = parser(working_cursor);

    while(isError(result)){
        if(result.position < result.string.length){
            working_cursor.position++;
        }else{
            break;
        }
        result = parser(working_cursor);
    }

    return Result(cursor.string, cursor.position, isError(result) ? result.position : result.start_position);
}

const option = parser => cursor => {
    const result = parser(cursor);
    return isError(result) ? Result(cursor.string, cursor.position, cursor.position) : result;
}

const sequence = (...parsers) => cursor => {
    let value = EMPTY;
    let current_cursor = cursor.clone();
    for(let p of parsers){
        const result = p(current_cursor);
        if(isError(result)){
            return result;
        }else if(result.value != EMPTY){
            value = (value == EMPTY) ? new ResultList : value;
            value.append(result.value);
        }

        current_cursor.position = result.end_position
    }

    return Result(cursor.string, cursor.position, current_cursor.position, value);
}

const MAX = 10000;

const repeat = (min = 1, max = MAX) => parser => cursor => {
    let current_cursor = cursor.clone();
    let value = EMPTY;

    //we use global Max (not local max) to allow for overflow errors
    for(let rep = 0; rep < MAX; rep++){
        if(rep > max){
            return ParseError(current_cursor.string, "repeat over max error", current_cursor.position);
        }

        if(current_cursor.position >= current_cursor.string.length){
            if(rep < min ){
                return ParseError(current_cursor.string, "repeat under min error", current_cursor.position);
            }else{
                return Result(cursor.string, cursor.position, current_cursor.position, value);
            }
        }

        const result = parser(current_cursor);
        if(isError(result)){
            return (
                (rep < min)
                ? result //propagate the error
                : Result(cursor.string, cursor.position, current_cursor.position, value) //supress the error
            );
        }else if (max <= 0){
            return ParseError(current_cursor.string, "syntax error", current_cursor.position);
        }else if(result.value != EMPTY){
            value = (value == EMPTY) ? new ResultList : value;
            value.append(result.value);
        }

        current_cursor.position = result.end_position
    }
}

const capture = parser => cursor => {
    const result = parser(cursor);
    return (
        isError(result)
        ? result
        : Result(cursor.string, result.start_position, result.end_position, result.match)
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

function parser_refrence(){
    let slot = [];
    return [
        cursor => slot[0](cursor),
        parser => slot[0] = parser
    ]
}

function string_parser(parser){
    const root_parser = map(v => (v instanceof ResultList) ? v[0]: v)(parser);
    return string => root_parser(Cursor(string));
}

export {
    Cursor, ParseError, Result, isError, $, either, not, sequence, repeat, option, capture, map, log, parser_refrence, string_parser
};