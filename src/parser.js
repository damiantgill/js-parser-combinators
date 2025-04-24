function trace(v){ console.log(v); return v} //inline log for debugging

const ParseError = (error, scanner) => ({
    error, scanner
})

const isError = result => "error" in result;

const SUCCESS = Symbol('SUCCESS');
const FAIL = Symbol('FAIL');
const ANY = Symbol('ANY');

const ScannerProto = {
    accept(criterion){
        if(this.position === this.string.length){
            return FAIL;
        }
        const ch = this.string.charAt(this.position);
        
        if(criterion ==  ch || (criterion instanceof Function && criterion(ch))){
            this.position++;
            return SUCCESS;
        }else{
            return FAIL;
        }
    }
}

const Scanner = (string, position=0) => ({
    __proto__: ScannerProto,
    string,
    position   
})

const EMPTY = Symbol('EMPTY');
const ResultProto = {
    get match(){
        return this.scanner_end.string.slice(this.scanner_start.position, this.scanner_end.position);
    },
    with_value(value){
        return Result(this.scanner_start, this.scanner_end, value)
    }
}

const Result = (scanner_start, scanner_end, value = EMPTY) =>  ({
    __proto__: ResultProto, scanner_start, scanner_end, value:value,
});

const $ = string => scanner => {
    const working_scanner = Scanner(scanner.string, scanner.position);
    for(let i=0; i < string.length; i++){
        const result = working_scanner.accept(string.charAt(i));

        if(result == FAIL){
            return ParseError("syntax error", working_scanner);
        }
    } 

    return Result(scanner, working_scanner);
}

const apply = predicate => scanner => {
    const working_scanner = Scanner(scanner.string, scanner.position);
    const result = working_scanner.accept(predicate);
    return (
        (result == FAIL)
        ? ParseError("syntax error", scanner)
        : Result(scanner, working_scanner)
    )
}

const code = ch => ch.charCodeAt(0)
const mapchar = f => ch => f(ch.charCodeAt(0))

const WRD = apply(
    mapchar(
        ch =>  (ch >= 65 && ch <= 90) || (ch >= 97 && ch <= 122)
    )
)

const DIG = apply(
    mapchar(
        ch => (ch >= 48 && ch <= 57)
    )
)

const WSP = apply(
    mapchar(
        ch => (ch >= 9 && ch <= 13) || ch == 32
    )
)


const either = (...parsers) => scanner => {
    let min_scanner = false;
    for(let p of parsers){
        const result = p(scanner);
        if(isError(result)){
            min_scanner = (
                (!min_scanner)
                ? result.scanner
                : (result.scanner.position < min_scanner.position)
                ? result.scanner
                : min_scanner
            )
        }else{
            return result;
        }
    }
    return ParseError("syntax error " + min_scanner.position, min_scanner);
}

const not = parser => scanner => {
    const working_scanner = Scanner(scanner.string, scanner.position);
    let result = parser(working_scanner);

    while(isError(result)){
        if((result.scanner.position) < result.scanner.string.length){
            working_scanner.position++;
        }else{
            break;
        }
        result = parser(working_scanner);
    }

    return Result(scanner, isError(result) ? result.scanner : result.scanner_start);
}

const option = parser => scanner => {
    const result = parser(scanner);
    return isError(result) ? Result(scanner, scanner) : result;
}

const sequence = (...parsers) => scanner => {
    let value = EMPTY;
    let current_scanner = scanner;
    for(let p of parsers){
        const result = p(current_scanner);
        
        if(isError(result)){
            return result;
        }else if(result.value != EMPTY){
            value = (value == EMPTY) ? [] : value;
            value.push(result.value);
        }

        current_scanner = result.scanner_end
    }

    return Result(scanner, current_scanner, value);
}

const MAX = 10000;

const repeat = (min = 1, max = MAX) => parser => scanner => {
    let current_scanner = scanner;
    let value = EMPTY;

    //we use global Max (not local max) to allow for overflow errors
    for(let rep = 0; rep < MAX; rep++){
        if(rep > max){
            return ParseError("repeat over max error", current_scanner);
        }

        if(current_scanner.position >= current_scanner.string.length){
            if(rep < min ){
                return ParseError("repeat under min error", current_scanner);
            }else{
                return Result(scanner, current_scanner, value);
            }
        }

        const result = parser(current_scanner);
        if(isError(result)){
            return (
                (rep < min)
                ? result //propagate the error
                : Result(scanner, current_scanner, value) //supress the error
            );
        }else if (max <= 0){
            return ParseError("syntax error", current_scanner);
        }else if(result.value != EMPTY){
            value = (value == EMPTY) ? [] : value;
            value.push(result.value);
        }

        current_scanner = result.scanner_end
    }
}

const capture = parser => scanner => {
    const result = parser(scanner);
    return (
        isError(result)
        ? result
        : result.with_value(result.match)
    )
}

const log = parser => scanner => trace(parser(scanner));

const map = f => parser => scanner => {
    const result = parser(scanner);
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
    Scanner, ParseError, isError, $, either, not, sequence, repeat, option, capture, map, log, WRD, DIG, WSP, tag
};