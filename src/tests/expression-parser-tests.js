import {Cursor, ParseError, isError, $, either, not, sequence, repeat, option, capture, map, log, END} from "../parser.js";
import {expression, expression_parser} from "../examples/expression-parser.js"
import {apply_predicate, mapchar, WRD, WSP, charset, as_value, tag} from "../parser-helpers.js";

function trace(v){ console.log(v); return v} //inline log for debugging
const compare_objects = (o1,o2) => JSON.stringify(o1) == JSON.stringify(o2);

function run_tests(specs){
    for (const [name, tests] of Object.entries(specs)) {
        const results = tests.map(
            (test, i) => {
                const cursor = Cursor(test.string);
                let test_result = false;
                try{
                    test_result = test.assess(test.parser(cursor))
                }catch(e){
                    trace(name + ":" + "Error at test " + (i+1));
                    trace(e);
                }
                return test_result
            }
        );

        const result = results.findIndex(v => v==false);
        trace(`${name} : ${result < 0 ? "pass" : "failure of test " + (result+1)}`)
    }
}

const basic_tests = [
    {
        parser: expression,
        string: "(1+1+(1+2)*(3*(4+2)))",
        assess: (result) => !isError(result) && result.value == (1+1+(1+2)*(3*(4+2)))
    },
    {
        parser: expression,
        string: " ( 1+(3 /5)+ (1  + 2)*(3*(4+-2) )))",
        assess: (result) => !isError(result) && result.value == ( 1+(3 /5)+ (1 + 2) * (3 * (4+-2)))
    },
    {
        parser: expression,
        string: "((1)+((2)))",
        assess: (result) => !isError(result) && result.value == ((1)+((2)))
    },
    {
        parser: expression,
        string: "(0.5 + (1)+((2 ) ))",
        assess: (result) => !isError(result) && result.value == (0.5 + (1) + ((2)))
    }
];

const run_expr_parser_tests = () => run_tests(
    {
        ["basic_tests"]:basic_tests,
    }
)

export {run_expr_parser_tests};