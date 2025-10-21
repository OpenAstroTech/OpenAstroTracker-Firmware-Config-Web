import React from 'react';
import { useState, useEffect, useRef } from 'react';
import {
    Button,
    Image,
    Input,
    List,
    Select,
    Steps,
    Radio,
} from 'antd';

import { parseExpression } from './parser.js'
import { getStepsForTracker } from './configurations/index.js'
import { Defaults } from './configurations/base/sharedDefaults.js'

const { Step } = Steps;

function WizardException(message) {
    this.message = message;
    this.name = 'WizardException';
    this.toString = function () {
        return this.message;
    };
}
const WizardStep = (props) => {
    const [stepIndex, setStepIndex] = useState(-1);
    const [showResult, setShowResult] = useState(false);
    const [configuration, setConfiguration] = useState([]);
    const [advanceStep, setAdvanceStep] = useState(false);
    const [stepHistory, setStepHistory] = useState([]);
    const downloadParentRef = useRef(null);

    console.log('configuration is ', configuration)
    const onRestart = () => {
        setConfiguration([]);
        setStepHistory([]);
        setStepIndex(0);
        setShowResult(false);
    };

    const getDefaultValue = (val) => {
        if (typeof val === 'string') {
            if (val.startsWith('{') && val.endsWith('}')) {
                const words = val.substring(1, val.length - 1).split('.');
                // console.log("Need default value for: " + val + ", Words are: ", words)
                const config = configuration.find(v => v.variable === words[2])
                // console.log("config is ", config)
                if (config) {
                    if (words[0] === 'Defaults') {
                        const lookup = Defaults[words[1]][config.value]
                        // console.log("Result for Defaults." + words[1] + "." + config.value + " is " + lookup)
                        return lookup;
                    }
                }
            }
        }
        return val
    }

    const evaluateLiteral = (expr) => {
        const variable = (expr.lhs.startsWith('$') ? expr.lhs.substr(1) : expr.lhs)
        const conf = configuration.find(config => config.variable === variable);
        if (!conf) {
            return { status: 'skip' }
        }

        switch (expr.op) {
            case 'IN':
                {
                    const set = expr.rhs.substr(1, expr.rhs.length - 2).split(',');
                    return { bool: set.indexOf(conf.value) !== -1, status: "OK" };
                }
            case 'NOTIN':
                {
                    const set = expr.rhs.substr(1, expr.rhs.length - 2).split(',');
                    return { bool: set.indexOf(conf.value) === -1, status: "OK" };
                }
            case '==':
            case 'EQ':
                {
                    return { bool: conf.value === expr.rhs, status: "OK" };
                }
            case '!=':
            case 'NEQ':
                {
                    return { bool: conf.value !== expr.rhs, status: "OK" };
                }
            default:
                throw new WizardException("Unknown operator " + expr.op);
        }
    }

    const evaluateExpression = (expr) => {
        let lhs = false
        let rhs = false
        if (typeof (expr.lhs) === "object") {
            const result = evaluateExpression(expr.lhs);
            if (result.status === 'skip') {
                return result;
            }
            lhs = result.bool
        }
        else {
            const result = evaluateLiteral(expr);
            return result;
        }

        if (typeof (expr.rhs) !== "object") {
            throw new WizardException("rhs should be expression!")
        }

        const result = evaluateExpression(expr.rhs);
        if (result.status === 'skip') {
            return result;
        }
        rhs = result.bool

        if (expr.op === 'AND') return { bool: lhs && rhs, status: 'ok' };
        if (expr.op === 'OR') return { bool: lhs || rhs, status: 'ok' };
        if (expr.op === 'XOR') return { bool: lhs !== rhs, status: 'ok' };

        throw new WizardException("Unknown operator " + expr.op);
    }

    const shouldSkipStep = (index) => {
        let startIndex = index;
        let skip = true;
        // if (index < stepProps.length) {
        //     console.log(`* Should we skip step ${index}: ${stepProps[index].id} - ${stepProps[index].variable}?`)
        // }
        while (index < stepProps.length) {
            skip = false;
            let nextStep = stepProps[index];

            if (configuration.find(c => c.variable === nextStep.variable)) {
                skip = true;
            } else
                // console.log(`> Check ${nextStep.id}: Variable is [${nextStep.variable}]`
                if (nextStep.condition) {
                    // console.log(`> Check ${nextStep.id}: Condition is [${nextStep.condition}]`)
                    const expr = parseExpression(nextStep.condition)
                    const exprResult = evaluateExpression(expr);
                    if (exprResult.status === 'skip') {
                        skip = true;
                    }
                    else {
                        skip = !exprResult.bool;
                    }
                    // console.log(`> Evaluation result says: ${skip ? 'skip' : 'dont skip'}. ExprTree is:`, expr)
                }
            // if (nextStep.immediateValue && !configuration.find(c => c.variable === nextStep.variable)) {
            //     let newConfiguration = configuration.filter(config => config.variable !== nextStep.variable)
            //     newConfiguration = [...newConfiguration, { variable: nextStep.variable, value: nextStep.immediateValue }]
            //     setConfiguration(newConfiguration);
            //     skip = true;
            // }
            if (!skip) {
                // console.log(`*>Dont skip ${index}: ${stepProps[index].id} `)
                return { skip: startIndex !== index, nextIndex: index, atEnd: false };
            }
            else {
                // console.log('> Skipping to next')
                index++;
            }
        }

        // console.log("Should we skip : " + (startIndex !== index))
        // if (index >= stepProps.length) {
        //     console.log(`*>Skipped to end`)
        // } else {
        //     console.log(`*>Skipped to ${index}: ${stepProps[index].id} `)
        // }

        return { atEnd: index >= stepProps.length, skip: startIndex !== index, nextIndex: index };
    }

    useEffect(() => {
        let nextStepIndex = stepIndex + 1;
        const newStepHistory = [...stepHistory, stepIndex];
        setStepHistory(newStepHistory);
        // console.log(`Advancing from ${stepIndex}`);

        let res = shouldSkipStep(nextStepIndex);

        // console.log(`Advancing from ${stepIndex} to ${res.nextIndex} -> ${stepProps[res.nextIndex].id}`);
        setStepIndex(res.nextIndex);

        if (res.atEnd) {
            setShowResult(true);
        }
    }, [advanceStep]);

    const goBackInHistory = () => {
        const newStepIndex = stepHistory[stepHistory.length - 1];
        const newStepHistory = stepHistory.slice(0, -1);
        setStepHistory(newStepHistory);
        setStepIndex(newStepIndex);
    }

    const download = (filename, lines) => {
        const text = [...(lines.map(line => line + "\n"))]
        var textLines = text.join("")
        textLines = encodeURIComponent(textLines)

        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + textLines);
        element.setAttribute('download', filename);

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    }

    const downloadTxtFile = (lines) => {

        const element = document.createElement("a");
        const file = new Blob([...(lines.map(line => line + "\n"))], { type: 'text/plain;charset=utf-8' });
        element.setAttribute('href', window.URL.createObjectURL(file));

        element.target = "_blank";
        element.rel = "noreferrer noopener";
        // element.download = "Configuration_local.hpp";
        downloadParentRef.current.appendChild(element);
        setTimeout(function () {
            element.click();
            element.parentNode.removeChild(element);
        }, 200);
    }

    const onSelect = (index, e) => {
        let newConfiguration = configuration.filter(config => config.variable !== stepProps[index].variable)
        let newVariables = [{ variable: stepProps[index].variable, value: e }]

        const chosenOption = stepProps[index].control.choices.find(c => c.key === e);
        if (chosenOption.additionalVariables) {
            newVariables = [...newVariables, ...chosenOption.additionalVariables.map((vr) => {
                const o = {}
                const ov = Object.entries(vr)
                o['variable'] = ov[0][0]
                o['value'] = ov[0][1]
                return o
            })]
        }
        let newConfig = stepProps[index].control.choices.find((v) => { return { key: v.key, value: getDefaultValue(v.defaultValue) || '' } });

        newConfiguration = [...newConfiguration, ...newVariables]
        setConfiguration(newConfiguration);
        setAdvanceStep(!advanceStep);
    }

    const onChangedText = (index, key, val) => {
        if (key === '$OK') {
            // The NEXT button on text inputs was hit. We nee to check if the config is here, which only happens when
            // something is edited. If the user accepts all defaults, configuration won't have an entry for this step
            // yet. We detect this and add all the text input fields with their default values before advancing.
            let currentConfig = configuration.find(config => config.variable === stepProps[index].variable);
            if (!currentConfig) {
                // It is not, so create it with default values
                let prop = stepProps[index];
                // console.log("Next step: ", prop)
                let newConfig = prop.control.choices.map((v) => { return { key: v.key, value: getDefaultValue(v.defaultValue) || '' } });
                let newConfiguration = configuration.filter(config => config.variable !== stepProps[index].variable);
                let newVariables = [{ variable: prop.variable, value: newConfig }]
                newConfiguration = [...newConfiguration, ...newVariables]
                setConfiguration(newConfiguration);
            }

            setAdvanceStep(!advanceStep);
        }
        else {
            let currentConfig = configuration.find(config => config.variable === stepProps[index].variable) || { value: [] };
            let newConfig = currentConfig.value.filter(config => config.key !== key);
            newConfig = [...newConfig, { key: key, value: val }];
            let newConfiguration = configuration.filter(config => config.variable !== stepProps[index].variable);
            newConfiguration = [...newConfiguration, { variable: stepProps[index].variable, value: newConfig }]
            setConfiguration(newConfiguration);
        }
    }

    // Get steps based on selected tracker
    const getSteps = () => {
        const trackerConfig = configuration.find(c => c.variable === 'tracker');
        const tracker = trackerConfig?.value || 'OAT';
        const steps = getStepsForTracker(tracker);
        console.log('steps', steps);
        return steps;
    };

    const stepProps = getSteps();

    useEffect(() => {
        const allVars = new Set()

        for (let i = 0; i < stepProps.length; i++) {
            // Check ID fields
            for (let j = i + 1; j < stepProps.length; j++) {
                if (!stepProps[i].id) {
                    throw new WizardException("No ID for step " + i);
                }
                if (!stepProps[j].id) {
                    throw new WizardException("No ID for step " + j);
                }
                if (stepProps[i].id === stepProps[j].id) {
                    throw new WizardException("Duplicate ID '" + stepProps[i].id + "' for steps " + i + " and " + j);
                }
            }
            if (!stepProps[i].variable) {
                throw new WizardException("No variable defined in step " + i);
            }
            // Collect all variables
            if (allVars.has(stepProps[i].variable)) {
                if (!stepProps[i].condition) {
                    throw new WizardException("Variable " + stepProps[i].variable + " defined twice. Second one in step " + i);
                }
            }
            allVars.add(stepProps[i].variable)
        }

        for (let i = 0; i < stepProps.length; i++) {
            if (stepProps[i].condition) {
                const expr = parseExpression(stepProps[i].condition)
                if (typeof expr.lhs === 'string') {
                    if (!allVars.has(expr.lhs)) {
                        throw new WizardException("Step " + i + " has a condition referencing a variable named '" + expr.lhs + "' which does not exist.");
                    }
                }
                else if (typeof expr.lhs.lhs === 'string') {
                    if (!allVars.has(expr.lhs.lhs)) {
                        throw new WizardException("Step " + i + " has a condition referencing a variable named '" + expr.lhs.lhs + "' which does not exist.");
                    }
                }
                // console.log(expr)
            }
        }
        console.log(allVars);
        console.log(stepProps);
    }, [])

    if (stepIndex < 0) {
        return <div />
    }

    const enabledChoices = (choices) => {
        return choices.filter(ch => {
            if (!ch.condition) {
                return true
            }
            const expr = parseExpression(ch.condition)
            const exprResult = evaluateExpression(expr);
            return exprResult.bool
        })
    }

    let steps = [];

    stepProps.forEach((step, index) => {
        let title = step.title;
        let description;
        
        // For completed steps (index < stepIndex), show the chosen option
        if (index < stepIndex) {
            let foundConfig = configuration.find(config => config.variable === stepProps[index].variable);
            if (foundConfig && !Array.isArray(foundConfig.value)) {
                if (stepProps[index].control) {
                    let foundControl = stepProps[index].control.choices.find(choice => foundConfig.value === choice.key);
                    if (!foundControl) {
                        console.log("Could not find control ", foundConfig)
                    } else {
                        description = foundControl.value;
                    }
                }
            } else {
                // If no configuration found for this step, check if it was actually skipped due to conditions
                // rather than being completed
                if (stepProps[index].condition) {
                    const expr = parseExpression(stepProps[index].condition);
                    const exprResult = evaluateExpression(expr);
                    if (exprResult.status === 'skip' || !exprResult.bool) {
                        description = "N/A, skipped.";
                    }
                } else {
                    description = "N/A, skipped.";
                }
            }
        }

        let skipState = shouldSkipStep(index);
        if ((!skipState.skip) || (index <= stepIndex)) {
            steps.push(<Step size="small" title={title} description={description} />)
        }
    });

    steps.push(<Step title='Completed' />)

    if (showResult) {
        let configKey = ''
        let defines = [];
        console.log('config', configuration);
        for (const checkStep of stepProps) {
            const config = configuration.find(c => c.variable === checkStep.variable);
            if (config) {
                console.log('step', checkStep);


                if (configKey.length) {
                    configKey += ','
                }

                let property
                let properties = stepProps.filter(prop => prop.variable === config.variable);
                if (properties.length === 1) {
                    property = properties[0]
                } else {
                    properties.forEach((prop) => {
                        let skip = false
                        const expr = parseExpression(prop.condition)
                        const exprResult = evaluateExpression(expr);
                        if (exprResult.status === 'skip') {
                            skip = true;
                        }
                        else {
                            skip = !exprResult.bool;
                        }
                        if (!skip) {
                            if (property) {
                                throw new WizardException("More than one property satisfies condition [" + prop.condition + "]. " + properties.map(p => p.id).join(', '))
                            }
                            property = prop
                        }
                    })
                }

                let defineLine = null;
                if (property) {
                    configKey += property.id
                } else {
                    console.warn(`No step definition found for variable: ${config.variable}`);
                    continue; // Skip this configuration entry
                }
                if (property.control) {
                    let skipProp = false
                    // if (property.condition) {
                    //     const expr = parseExpression(property.condition)
                    //     const exprResult = evaluateExpression(expr);
                    //     skipProp = exprResult.skip || !exprResult.bool
                    // }
                    if (!skipProp) {
                        if (property.control.type === 'textinput') {
                            if (property.preamble) {
                                defines = [...defines, ...property.preamble];
                            }
                            property.control.choices.forEach(choice => {
                                let skip = false
                                if (choice.condition) {
                                    const expr = parseExpression(choice.condition)
                                    const exprResult = evaluateExpression(expr);
                                    skip = exprResult.skip || !exprResult.bool
                                }

                                if (!skip) {
                                    let configVal = config.value.find(cfgval => cfgval.key === choice.key);
                                    let val = (configVal ? configVal.value : null) || getDefaultValue(choice.defaultValue) || '';
                                    configKey += choice.key + val + ':'
                                    defineLine = choice.defineLine.replace('{0}', val);
                                    while (defineLine.indexOf('{0}') >= 0) {
                                        defineLine = defineLine.replace('{0}', val);
                                    }
                                    const defineLines = defineLine.split('\n')
                                    defines = [...defines, ...defineLines];
                                    if (choice.additionalLines) {
                                        defines = [...defines, ...choice.additionalLines];
                                    }
                                }
                            })
                            if (property.postamble) {
                                const postLines = []
                                property.postamble.forEach(entry => {
                                    let output = true
                                    if (entry.condition) {
                                        const expr = parseExpression(entry.condition)
                                        const exprResult = evaluateExpression(expr);
                                        if (exprResult.bool === false) {
                                            output = false
                                        }
                                    }
                                    if (output && entry.literal) {
                                        postLines.push(...entry.literal)
                                    }
                                })
                                defines = [...defines, ...postLines];
                            }
                        }
                        else {
                            let propertyValue = property.control.choices.find(choice => choice.key === config.value);
                            configKey += ':' + propertyValue.key
                            if (property.preamble) {
                                defines = [...defines, ...(property.preamble.map((pre) => pre.replace('{v}', propertyValue.value)))];
                            }
                            if (property.define) {
                                defines = [...defines, '#define ' + property.define + ' ' + propertyValue.defineValue];
                            }
                            if (propertyValue.defineLine) {
                                defines = [...defines, propertyValue.defineLine];
                            }
                            if (propertyValue.additionalLines) {
                                defines = [...defines, ...propertyValue.additionalLines];
                            }
                            if (property.postamble) {
                                const postLines = []
                                property.postamble.forEach(entry => {
                                    let output = true
                                    if (entry.condition) {
                                        const expr = parseExpression(entry.condition)
                                        const exprResult = evaluateExpression(expr);
                                        if (exprResult.bool === false) {
                                            output = false
                                        }
                                    }
                                    if (output && entry.literal) {
                                        postLines.push(...entry.literal.map(e => e.replace('{v}', propertyValue.defineValue)))
                                    }
                                })
                                defines = [...defines, ...postLines];
                            }
                        }
                    }
                }
                defines = [...defines, ''];
            }
        }

        defines.splice(5, 0, '// Unique ConfigKey: ' + configKey);

        defines.push('///////////////////////');
        defines.push('// Debug settings');
        defines.push('#define DEBUG_LEVEL (DEBUG_NONE)');
        defines.push('');


        return <div className='steps-container'>
            <div className='steps-column'>
                <Steps size="small" current={stepIndex} direction='vertical'>
                    {steps}
                </Steps>
            </div>
            <div className='list-container' ref={downloadParentRef}>
                <h2>Local configuration file</h2>
                <p>Copy/paste the following into your Configuration_local.hpp file</p>
                {
                    defines.map(define => <p className='code'>{define}&nbsp;</p>)
                }
                <br />
                <div className='back-button' >
                    <Button type='primary' onClick={() => downloadTxtFile(defines)}>Open as Text in new Tab</Button>
                </div>

                <div className='back-button' >
                    <Button type='primary' onClick={() => download('Configuration_local.hpp', defines)}>Download</Button>
                </div>

                <div className='back-button' >
                    <Button type='primary' onClick={() => onRestart()}>Restart</Button>
                </div>
            </div>
        </div>

    } else {
        let control = null
        const stepControl = stepProps[stepIndex].control;
        if (!stepControl) {
            setStepIndex(stepIndex + 1)
        } else {
            const controlKey = stepControl.type + "_" + stepIndex + "_"
            switch (stepControl.type) {
                case 'combo':
                    control = <Select key={controlKey} onSelect={(e) => onSelect(stepIndex, e)}>
                        {enabledChoices(stepControl.choices).map((ch) => <Select.Option value={ch.key}>{ch.value}</Select.Option>)}
                    </Select>

                    break;

                case 'radio':
                    control = <Radio.Group key={controlKey} onChange={(e) => onSelect(stepIndex, e.target.value)} buttonStyle='solid'>
                        {enabledChoices(stepControl.choices).map((ch) => <Radio.Button value={ch.key}>{ch.value}</Radio.Button>)}
                    </Radio.Group>

                    break;

                case 'radioimg':
                    control = <List
                        bordered
                        itemLayout='horizontal'
                        dataSource={enabledChoices(stepControl.choices)}
                        renderItem={item =>
                            <List.Item>
                                <Button key={controlKey} value={item.value} onClick={(e) => onSelect(stepIndex, item.key)} >{item.value}</Button>
                                <Image
                                    className='image-column'
                                    src={item.image}
                                    onClick={() => onSelect(stepIndex, item.key)}
                                    style={{ cursor: 'pointer' }}
                                    preview={false}
                                />
                            </List.Item>
                        }
                    />

                    break;

                case 'textinput':
                    control = <>
                        {enabledChoices(stepControl.choices).map(input =>
                            <div style={{ marginBottom: '10pt' }}>
                                <Input key={controlKey + input.key} addonBefore={input.label} placeholder={input.label} defaultValue={getDefaultValue(input.defaultValue)} onChange={(e) => onChangedText(stepIndex, input.key, e.target.value)} />
                            </div>
                        )}
                        <div className='back-button' >
                            <Button key={controlKey + "ok"} value='OK' type='primary' onClick={(e) => onChangedText(stepIndex, '$OK')} >Next</Button>
                        </div>
                        <br></br>
                    </>

                    break;
                default:
                    break;
            }
        }

        return <div className='steps-container'>
            <div className='steps-column'>
                <Steps size="small" current={stepIndex} direction='vertical'>
                    {steps}
                </Steps>
            </div>
            <div className='list-container'>
                <div className='step-title'>{stepProps[stepIndex].title}</div>
                <div className='step-description'>{stepProps[stepIndex].label}</div>
                <div>
                    {control}
                </div>
                <div className='back-button' >
                    <Button type='primary' onClick={() => goBackInHistory()} disabled={stepIndex < 1}>Back</Button>
                </div>
            </div>
        </div>
    }
}

export default WizardStep;
