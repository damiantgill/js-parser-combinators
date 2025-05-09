import {isError} from "../parser.js";
import {json_parse} from "../examples/json-parser.js";

function trace(v){ console.log(v); return v} //inline log for debugging

async function start_test_suite(){
    stop = false;
    for(let t of tests){
        if(stop){
            return;
        }

        if(t.startsWith("./test_parsing/i")){
            continue;
        }else if (t.startsWith("./test_parsing/n")){
            test_i(t)
        } else{
            if(!test_y(t)) {
                return;
            }
        }    
    }
}

const isScalar = (object) => object == null || typeof object != "object";

function value_compare(value1, value2){
    if(isScalar(value1) != isScalar(value2)) return false;

    if(isScalar(value1) && isScalar(value2)) return value1 === value2;

    const o1_keys = Object.keys(value1);
    const o2_keys = Object.keys(value2);
    if(o1_keys.length != o2_keys.length) return false;

    for (var key of o1_keys){
        if(!value_compare(value1[key], value2[key])) return false;
    }

    return true;
}

const y_test = test => result => {
    const json = JSON.parse(test);
    const compare = value_compare(result.value, json);
    return !isError(result) && compare
}


//------------------------------------------------------
// test file directory, you will likely need to change!
//------------------------------------------------------
const test_file_dir = './js/js-parser-combinators/json_test_files/';

async function run_json_tests(verbose = "not-verbose"){
    const response = await fetch(test_file_dir + "_index_of_all_tests.json");
    const tests = await response.json();
    let passes = 0;
    let falures = 0;
    let exceptions = 0;
    for(let t = 0; t < tests.length; t++){
        const n = t+1;
        const file = tests[t];
        const url = test_file_dir + file;
        const test_code = file[0];

        if(test_code == "i"){
            if(verbose == "verbose") trace("SKIP " + n + ": " + file);
            continue;
        }

        const response = await fetch(url);
        const test = await response.text();

        const predicate = (
            test_code == "n"
            ? isError
            : y_test(test)
        );

        try{
            const result = json_parse(test);
            const pass = predicate(result);
            if(predicate(result)){
                passes++;
                if(verbose == "verbose") trace("PASS " + n + ": " + file);
            }else{
                falures++;
                trace("FAIL " + n + ": " + file);
            }
        }catch(e){
            exceptions++;
            trace("EXCEPTION " + n + ": " + file + " : " + e.message);
        }
    }
    trace("--------------------------------------------")
    trace("passes :" + passes);
    trace("falures :" + falures);
    trace("exceptions :" + exceptions);
}

export {run_json_tests}