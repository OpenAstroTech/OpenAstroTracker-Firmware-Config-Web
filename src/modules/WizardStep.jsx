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

const { Step } = Steps;

const Defaults = {
    PowerRating: { BY: 150, N9: 900, N8: 900, N9O: 900, N8O: 900, N49: 400, N48: 400 },
    PowerUtilization: { BY: 100, N9: 90, N8: 90, N9O: 90, N8O: 90, N49: 90, N48: 90 },
    HoldPercentage: { BY: 0, N9: 10, N8: 10, N49: 10, N48: 10 },
    Speed: { BY: 400, N9: 1800, N8: 1800, N49: 1200, N48: 1200 },
    Acceleration: { BY: 600, N9: 3000, N8: 3000, N49: 3000, N48: 3000 },
    RASlewMicrostepping: { BY: 1, N9: 32, N8: 32 },
    RATrackMicrostepping: { BY: 1, N9: 256, N8: 256 },
    DECSlewMicrostepping: { BY: 1, N9: 32, N8: 32 },
    DECGuideMicrostepping: { BY: 1, N9: 256, N8: 256 },
    FocuserMicrostepping: { BY: 1, N9: 8, N8: 8, N49: 8, N48: 8 },
    AZALTMicrostepping: { BY: 1, N9: 16, N8: 16 },
    OAMSpeed: { N9: 2.0, N8: 2.0, N9O: 2.0, N8O: 2.0 },
    OAMAcceleration: { N9: 2.0, N8: 2.0, N9O: 2.0, N8O: 2.0 },
    OAMMicrostepping: { N9: 128, N8: 128, N9O: 128, N8O: 128 },
    RAHallSensorPin: { OAT: 53, OAM: 27 },
}

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

    console.log('configuration is ',configuration)
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
    // const teststepProps = [
    //     {
    //         title: 'WiFi Access Point Setup',
    //         label: 'Enter the WiFi parameters for Access Point mode:',
    //         variable: 'wifiparamsa',
    //         define: '',
    //         preamble: ['// Define the WPA key and host name for the network'],
    //         control: {
    //             type: 'textinput',
    //             choices: [
    //                 { key: 'P', label: 'WPA Key for OAT hotspot', defineLine: '#define WIFI_AP_MODE_WPAKEY "{0}"' },
    //                 { key: 'H', label: 'Hostname', defaultValue: 'OATScope', defineLine: '#define WIFI_HOSTNAME "{0}"' },
    //             ]
    //         },
    //     },
    // ]

    const stepProps = [
        {
            id: 'TR',
            title: 'Tracker',
            label: 'For which tracker do you want to generate firmware:',
            variable: 'tracker',
            preamble: [
                '/////////////////////////////////////////////////////////////////////////////////////////////////////////',
                '// This configuration file was generated by the OpenAtroTech Configurator at https://config.openastrotech.com',
                '// and is for firmware to be used on a {v}.',
                '// Save this as Configuration_local.hpp in the folder where you placed the firmware code.',
                '/////////////////////////////////////////////////////////////////////////////////////////////////////////',
                '/////////////////////////////////////////////////////////////////////////////////////////////////////////',
            ],
            define: '',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'OAT', value: 'OpenAstroTracker', image: '/images/oat.png', defineValue: '' },
                    { key: 'OAM', value: 'OpenAstroMount', image: '/images/oam.png', defineLine: '#define OAM' },
                    { key: 'OAE', value: 'OpenAstroExplorer', image: '/images/oae.png', defineLine: '#define OAE' }
                ]
            },
        },
        { // OAT
            id: 'FWT',
            title: 'Firmware',
            label: 'Which firmware version are you planning to configure/build:',
            variable: 'fwversion',
            condition: "$tracker == OAT",
            define: '',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'L', value: 'Latest Version (V1.13.x)', image: '/images/none.png', defineValue: '' },
                    { key: 'O', value: 'Official Versions (V1.11.x)', image: '/images/none.png', defineValue: '' },
                ]
            },
        },
        { // OAM
            id: 'FWM',
            title: 'Firmware',
            label: 'You must use V1.13.x firmware on OAM:',
            variable: 'fwversion',
            condition: "$tracker == OAM",
            define: '',
            control: {
                type: 'radioimg',
                choices: [
                    {
                        key: 'L', value: 'Latest Version (V1.13.x)', image: '/images/none.png', defineValue: '', additionalLines: [
                            '// OAM requires the much higher stepper performance of the new stepper library.',
                            '#define NEW_STEPPER_LIB'
                        ],
                        additionalVariables: [
                            { 'autopa': 'Y' },
                            { 'autopaversion': '2' },
                            { 'stepperlib': 'N' }
                        ]
                    },
                ]
            },
        },
        { // OAE
            id: 'FWE',
            title: 'Firmware',
            label: 'You must use V1.13.x firmware on OAE:',
            variable: 'fwversion',
            condition: "$tracker == OAE",
            define: '',
            control: {
                type: 'radioimg',
                choices: [
                    {
                        key: 'L', value: 'Latest Version (V1.13.x)', image: '/images/none.png', defineValue: '', additionalLines: [
                            '// OAE requires the much higher stepper performance of the new stepper library.',
                            '#define NEW_STEPPER_LIB'
                        ],
                        additionalVariables: [
                            { 'autopa': 'Y' },
                            { 'autopaversion': '2' },
                            { 'stepperlib': 'N' },
                            { 'board': 'OAEV1' }
                        ]
                    },
                ]
            },
        },
        {
            id: 'SL',
            title: 'Stepper Library',
            label: 'Which Stepper Library do you want to use for RA and DEC:',
            variable: 'stepperlib',
            condition: "$tracker == OAT",
            define: '',
            control: {
                type: 'radioimg',
                choices: [
                    {
                        key: 'N', value: 'New high performance Stepper Library (by OpenAstroTech)', image: '/images/OpenAstroTech.png', defineValue: '', additionalLines: [
                            '// Use the much higher performance stepper library.',
                            '#define NEW_STEPPER_LIB'
                        ]
                    },
                    {
                        key: 'O', value: 'Older AccelStepper library (max 2kHz stepping)', image: '/images/none.png', defineValue: '', additionalLines: [
                            '// To use the much higher performance stepper library uncomment the next line.',
                            '// #define NEW_STEPPER_LIB'
                        ]
                    },
                ]
            },
        },
        {
            id: 'HS',
            title: 'Hemisphere',
            label: 'Which hemisphere do you live in:',
            variable: 'hemi',
            preamble: ['// We live in the {v}'],
            define: 'NORTHERN_HEMISPHERE',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'N', value: 'Northern Hemisphere', image: '/images/north.png', defineValue: '1' },
                    { key: 'S', value: 'Southern Hemisphere', image: '/images/south.png', defineValue: '0' }]
            },
        },
        { // OAT / OAM
            id: 'BD',
            title: 'Board',
            label: 'Which microcontroller board are you using:',
            variable: 'board',
            condition: "($tracker == OAT) OR ($tracker == OAM)",
            preamble: ['// We are using the {v} board'],
            postamble: [{
                literal: [
                    '#if defined(BOARD) && BOARD != {v}',
                    '    #error Selected PIO environment does not match this configuration',
                    '#else',
                    '    #define BOARD {v}',
                    '#endif']
            }
            ],
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'M', value: 'RAMPS c/w ATMega 2560 (or clone)', image: '/images/mega2560.png', defineValue: 'BOARD_AVR_RAMPS' },
                    { key: 'E', value: 'ESP32', image: '/images/esp32.png', defineValue: 'BOARD_ESP32_ESP32DEV' },
                    { key: 'M10', value: 'MKS GEN L V1.0', image: '/images/mksv10.png', defineValue: 'BOARD_AVR_MKS_GEN_L_V1' },
                    { key: 'M20', value: 'MKS GEN L V2.0', image: '/images/mksv20.png', defineValue: 'BOARD_AVR_MKS_GEN_L_V2' },
                    { key: 'M21', value: 'MKS GEN L V2.1', image: '/images/mksv21.png', defineValue: 'BOARD_AVR_MKS_GEN_L_V21' },
                    { key: 'OAEV1', value: 'OAE_V1', image: '/images/oaeboard.png', defineValue: 'BOARD_OAE_V1', condition: "$tracker == OAE" },
                ]
            },
        },
        { // OAT
            id: 'RST',
            title: 'RA Stepper',
            label: 'Which stepper motor are you using for RA:',
            condition: "$tracker == OAT",
            variable: 'rastpr',
            preamble: ['////////////////////////////////', '// RA Stepper configuration (OAT)', '// See supported stepper values. Change according to the steppers you are using', '// Using the {v} stepper for RA'],
            define: 'RA_STEPPER_TYPE',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'BY', value: 'Modded 28BYJ-48 (Bipolar)', image: '/images/byj48.png', defineValue: 'STEPPER_TYPE_ENABLED', additionalLines: ['#define RA_STEPPER_SPR  2048.0f // steps/rev',], condition: "$stepperlib != N" },
                    { key: 'N9', value: 'NEMA 17, 0.9°/step', image: '/images/nema17.png', defineValue: 'STEPPER_TYPE_ENABLED' },
                    { key: 'N8', value: 'NEMA 17, 1.8°/step', image: '/images/nema17.png', defineValue: 'STEPPER_TYPE_ENABLED', additionalLines: ['#define RA_STEPPER_SPR 200.0f'] },
                ]
            },
        },
        { // OAM
            id: 'RSM',
            title: 'RA Stepper',
            label: 'Which stepper motor are you using for RA:',
            condition: "$tracker == OAM",
            variable: 'rastpr',
            preamble: ['////////////////////////////////', '// RA Stepper configuration (OAM)', '// See supported stepper values. Change according to the steppers you are using', '// Using the {v} stepper for RA'],
            postamble: [{
                literal: [
                ]
            }],
            define: 'RA_STEPPER_TYPE',
            control: {
                type: 'radioimg',
                choices: [
                    {
                        key: 'N9', value: 'NEMA 17, 0.9°/step', image: '/images/nema17.png', defineValue: 'STEPPER_TYPE_ENABLED',
                        additionalLines: [
                            '#define RA_STEPPER_SPR                 (400 * 9)',
                        ]
                    },
                    {
                        key: 'N8', value: 'NEMA 17, 1.8°/step', image: '/images/nema17.png', defineValue: 'STEPPER_TYPE_ENABLED',
                        additionalLines: [
                            '#define RA_STEPPER_SPR                 (200 * 9)',
                        ]
                    },
                ]
            },
        },
        { // OAT / OAM
            id: 'RDO',
            title: 'RA Driver',
            label: 'Which driver board are you using to drive the RA stepper motor:',
            variable: 'radrv',
            condition: "($tracker == OAT) OR ($tracker == OAM)",
            preamble: ['// Using the {v} driver for RA stepper motor'],
            define: 'RA_DRIVER_TYPE',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'A', value: 'Generic A4988', image: '/images/a4988.png', defineValue: 'DRIVER_TYPE_A4988_GENERIC', condition: "$tracker == OAT" },
                    { key: 'TU', value: 'TMC2209-UART', image: '/images/tmc2209.png', defineValue: 'DRIVER_TYPE_TMC2209_UART' },
                    { key: 'TS', value: 'TMC2209-Standalone', image: '/images/tmc2209.png', defineValue: 'DRIVER_TYPE_TMC2209_STANDALONE' },
                ]
            },
        },
        { // OAT
            id: 'RAT',
            title: 'RA Advanced Settings',
            label: 'These are some advanced settings you may want to override. The defaults are set already. Please only change them if you are sure what they do and what their valid ranges are. Enter the RA stepper specs and desired settings:',
            variable: 'rapower',
            condition: "($radrv == TU) AND ($tracker == OAT)",
            preamble: ['// Define some RA stepper motor settings'],
            define: '',
            control: {
                type: 'textinput',
                choices: [
                    { key: 'P', label: 'Power rating in mA', defaultValue: '{Defaults.PowerRating.rastpr}', defineLine: '#define RA_MOTOR_CURRENT_RATING        {0} // mA' },
                    { key: 'O', label: 'Operating percentage', defaultValue: '{Defaults.PowerUtilization.rastpr}', defineLine: '#define RA_OPERATING_CURRENT_SETTING   {0} // %' },
                    { key: 'A', label: 'Acceleration (steps/s/s)', defaultValue: '{Defaults.Acceleration.rastpr}', defineLine: '#define RA_STEPPER_ACCELERATION        {0}' },
                    { key: 'V', label: 'Maximum Speed (steps/s)', defaultValue: '{Defaults.Speed.rastpr}', defineLine: '#define RA_STEPPER_SPEED               {0}' },
                    { key: 'S', label: 'Microstepping while slewing', defaultValue: '{Defaults.RASlewMicrostepping.rastpr}', defineLine: '#define RA_SLEW_MICROSTEPPING          {0}' },
                    { key: 'T', label: 'Microstepping while tracking', defaultValue: '{Defaults.RATrackMicrostepping.rastpr}', defineLine: '#define RA_TRACKING_MICROSTEPPING      {0}' },
                ]
            },
            postamble: [{
                literal: [
                    '',
                    '// Is it going the wrong way?',
                    '#define RA_INVERT_DIR  0',
                    '',
                    '#ifdef NEW_STEPPER_LIB',
                    '  #define RA_SLEWING_ACCELERATION_DEG   2.0  // deg/s/s',
                    '  #define RA_SLEWING_SPEED_DEG          2.0  // deg/s',
                    '#endif',
                ]
            }
            ]
        },
        { // OAM
            id: 'RAM',
            title: 'RA Advanced Settings',
            label: 'These are some advanced settings you may want to override. The defaults are set already. Please only change them if you are sure what they do and what their valid ranges are. Enter the RA stepper specs and desired settings:',
            variable: 'rapower',
            condition: "($radrv == TU) AND ($tracker == OAM)",
            preamble: ['// Define some RA stepper motor settings'],
            define: '',
            control: {
                type: 'textinput',
                choices: [
                    { key: 'P', label: 'Power rating in mA', defaultValue: '{Defaults.PowerRating.rastpr}', defineLine: '#define RA_MOTOR_CURRENT_RATING       {0} // mA' },
                    { key: 'O', label: 'Operating percentage', defaultValue: '{Defaults.PowerUtilization.rastpr}', defineLine: '#define RA_OPERATING_CURRENT_SETTING  {0} // %' },
                    { key: 'A', label: 'Acceleration (deg/s/s)', defaultValue: '{Defaults.OAMAcceleration.rastpr}', defineLine: '#define RA_SLEWING_ACCELERATION_DEG   {0}' },
                    { key: 'V', label: 'Maximum Speed (deg/s)', defaultValue: '{Defaults.OAMSpeed.rastpr}', defineLine: '#define RA_SLEWING_SPEED_DEG          {0}' },
                    { key: 'S', label: 'Microstepping setting', defaultValue: '{Defaults.OAMMicrostepping.rastpr}', defineLine: '#define RA_SLEW_MICROSTEPPING         {0}\n#define RA_TRACKING_MICROSTEPPING     {0}' },
                ]
            },
            postamble: [{
                literal: [
                    '',
                    '// Is it going the wrong way?',
                    '#define RA_INVERT_DIR  0'
                ]
            }
            ]
        },
        {
            id: 'RTR',
            title: 'Tracking on boot',
            label: 'Do you want the mount to start tracking after boot:',
            variable: 'trackonboot',
            preamble: ['// Track immediately after boot'],
            postamble: [{
                literal: [
                    '',
                    '// Define limits for RA... ',
                    '#define RA_LIMIT_LEFT     5.5f',
                    '#define RA_LIMIT_RIGHT    6.5f',
                    '#define RA_TRACKING_LIMIT 6.75f // can\'t quite get to 7h...',
                ]
            }],

            define: 'TRACK_ON_BOOT',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'Y', value: 'Yes, immediately start tracking', image: '/images/none.png', defineValue: '1' },
                    { key: 'N', value: 'No, don\'t track until enabled', image: '/images/none.png', defineValue: '0' },
                ]
            },
        },
        { // OAT / OAM
            id: 'RT',
            title: 'RA Pulley Teeth',
            label: 'How many teeth does your RA gear have?',
            variable: 'racog',
            condition: "($tracker == OAT) OR ($tracker == OAM)",
            preamble: ['// Using the {v} for RA belt'],
            define: 'RA_PULLEY_TEETH',
            control: {
                type: 'radioimg',
                choices: [
                    { key: '1', value: '16 tooth gear (recommended)', image: '/images/cog16t.png', defineValue: '16' },
                    { key: '2', value: '20 tooth gear', image: '/images/cog20t.png', defineValue: '20' },
                ]
            },
        },
        { // OAT / OAM
            id: 'DS',
            title: 'DEC Stepper',
            label: 'Which stepper motor are you using for DEC:',
            variable: 'decstpr',
            condition: "($tracker == OAT) OR ($tracker == OAM)",
            preamble: ['////////////////////////////////', '// DEC Stepper configuration ', '// See supported stepper values. Change according to the steppers you are using', '// Using the {v} stepper for DEC'],
            define: 'DEC_STEPPER_TYPE',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'BY', value: 'Modded 28BYJ-48 (Bipolar)', image: '/images/byj48.png', defineValue: 'STEPPER_TYPE_ENABLED', additionalLines: ['#define DEC_STEPPER_SPR 2048.0f'], condition: "($tracker == OAT) AND ($stepperlib != N)" },
                    { key: 'N9', value: 'NEMA 17, 0.9°/step', image: '/images/nema17.png', defineValue: 'STEPPER_TYPE_ENABLED', condition: "$tracker == OAT" },
                    { key: 'N8', value: 'NEMA 17, 1.8°/step', image: '/images/nema17.png', defineValue: 'STEPPER_TYPE_ENABLED', additionalLines: ['#define DEC_STEPPER_SPR 200.0f'], condition: "$tracker == OAT" },
                    { key: 'N49', value: 'NEMA 14, 0.9°/step', image: '/images/nema14.png', defineValue: 'STEPPER_TYPE_ENABLED', condition: "$tracker == OAT" },
                    { key: 'N48', value: 'NEMA 14, 1.8°/step', image: '/images/nema14.png', defineValue: 'STEPPER_TYPE_ENABLED', additionalLines: ['#define DEC_STEPPER_SPR 200.0f'], condition: "$tracker == OAT" },
                    {
                        key: 'N9O',
                        value: 'NEMA 17, 0.9°/step',
                        image: '/images/nema17.png',
                        defineValue: 'STEPPER_TYPE_ENABLED',
                        condition: "$tracker == OAM",
                        additionalLines: ['#define DEC_STEPPER_SPR                (400 * 9)']
                    },
                    {
                        key: 'N8O',
                        value: 'NEMA 17, 1.8°/step',
                        image: '/images/nema17.png',
                        defineValue: 'STEPPER_TYPE_ENABLED',
                        condition: "$tracker == OAM",
                        additionalLines: ['#define DEC_STEPPER_SPR                (200 * 9)']
                    },
                ]
            },
            postamble: [{
                literal: ['#define DEC_WHEEL_CIRCUMFERENCE        816.814f'],
                condition: "$tracker == OAM",
            }],
        },
        { // OAT / OAM
            id: 'DDT',
            title: 'DEC Driver',
            label: 'Which driver board are you using to drive the DEC stepper motor:',
            variable: 'decdrv',
            condition: "($tracker == OAT) OR ($tracker == OAM)",
            preamble: ['// Using the {v} driver for DEC stepper'],
            define: 'DEC_DRIVER_TYPE',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'A', value: 'Generic A4988', image: '/images/a4988.png', defineValue: 'DRIVER_TYPE_A4988_GENERIC', condition: "$tracker == OAT" },
                    { key: 'TU', value: 'TMC2209-UART', image: '/images/tmc2209.png', defineValue: 'DRIVER_TYPE_TMC2209_UART' },
                    { key: 'TS', value: 'TMC2209-Standalone', image: '/images/tmc2209.png', defineValue: 'DRIVER_TYPE_TMC2209_STANDALONE' },
                ]
            },
        },
        { // OAT
            id: 'DAT',
            title: 'DEC Advanced Settings',
            label: 'These are some advanced settings you may want to override. The defaults are set already. Please only change them if you are sure what they do and what their valid ranges are. Enter the DEC stepper specs and desired settings:',
            variable: 'decpower',
            condition: "($decdrv == TU) AND ($tracker == OAT)",
            preamble: ['// Define some DEC stepper motor settings'],
            define: '',
            control: {
                type: 'textinput',
                choices: [
                    { key: 'P', label: 'Power rating in mA', defaultValue: '{Defaults.PowerRating.decstpr}', defineLine: '#define DEC_MOTOR_CURRENT_RATING       {0} // mA' },
                    { key: 'O', label: 'Operating percentage', defaultValue: '{Defaults.PowerUtilization.decstpr}', defineLine: '#define DEC_OPERATING_CURRENT_SETTING  {0} // %' },
                    { key: 'A', label: 'Acceleration (steps/s/s)', defaultValue: '{Defaults.Acceleration.decstpr}', defineLine: '#define DEC_STEPPER_ACCELERATION       {0}' },
                    { key: 'V', label: 'Maximum Speed (steps/s)', defaultValue: '{Defaults.Speed.decstpr}', defineLine: '#define DEC_STEPPER_SPEED              {0}' },
                    { key: 'S', label: 'Microstepping while slewing', defaultValue: '{Defaults.DECSlewMicrostepping.decstpr}', defineLine: '#define DEC_SLEW_MICROSTEPPING         {0}' },
                    { key: 'T', label: 'Microstepping while guiding', defaultValue: '{Defaults.DECGuideMicrostepping.decstpr}', defineLine: '#define DEC_GUIDE_MICROSTEPPING        {0}' },
                ]
            },
            postamble: [{
                literal: [
                    '',
                    '// Is it going the wrong way?',
                    '#define DEC_INVERT_DIR  0',
                    '',
                    '#ifdef NEW_STEPPER_LIB',
                    '  #define DEC_SLEWING_ACCELERATION_DEG   2.0  // degs/s/s',
                    '  #define DEC_SLEWING_SPEED_DEG          2.0  // deg/s',
                    '#endif',
                ]
            }
            ]
        },
        {// OAM
            id: 'DAM',
            title: 'DEC Advanced Settings',
            label: 'These are some advanced settings you may want to override. The defaults are set already. Please only change them if you are sure what they do and what their valid ranges are. Enter the DEC stepper specs and desired settings:',
            variable: 'decpower',
            condition: "($decdrv == TU) AND ($tracker == OAM)",
            preamble: ['// Define some DEC stepper motor settings'],
            define: '',
            control: {
                type: 'textinput',
                choices: [
                    { key: 'P', label: 'Power rating in mA', defaultValue: '{Defaults.PowerRating.decstpr}', defineLine: '#define DEC_MOTOR_CURRENT_RATING       {0} // mA' },
                    { key: 'O', label: 'Operating percentage', defaultValue: '{Defaults.PowerUtilization.decstpr}', defineLine: '#define DEC_OPERATING_CURRENT_SETTING  {0} // %' },
                    { key: 'A', label: 'Acceleration (deg/s/s)', defaultValue: '{Defaults.OAMAcceleration.decstpr}', defineLine: '#define DEC_SLEWING_ACCELERATION_DEG   {0}' },
                    { key: 'V', label: 'Maximum Speed (deg/s)', defaultValue: '{Defaults.OAMSpeed.decstpr}', defineLine: '#define DEC_SLEWING_SPEED_DEG          {0}' },
                    { key: 'S', label: 'Microstepping setting', defaultValue: '{Defaults.OAMMicrostepping.decstpr}', defineLine: '#define DEC_SLEW_MICROSTEPPING         {0}\n#define DEC_GUIDE_MICROSTEPPING        {0}' },
                ]
            },
            postamble: [{
                literal: [
                    '',
                    '// Is it going the wrong way?',
                    '#define DEC_INVERT_DIR  0'
                ]
            }
            ]
        },
        { // OAT / OAM
            id: 'DT',
            title: 'DEC Pulley Teeth',
            label: 'How many teeth does your DEC gear have?',
            condition: "($tracker == OAT) OR ($tracker == OAM)",
            variable: 'deccog',
            preamble: ['// Using the {v} for DEC belt'],
            define: 'DEC_PULLEY_TEETH',
            control: {
                type: 'radioimg',
                choices: [
                    { key: '1', value: '16 tooth gear (recommended)', image: '/images/cog16t.png', defineValue: '16' },
                    { key: '2', value: '20 tooth gear', image: '/images/cog20t.png', defineValue: '20' },
                ]
            },
        },
        { // OAT
            id: 'DLI',
            title: 'DEC Movement Limits',
            label: 'These are required settings to determine how far DEC can move up and down from the Home position without hitting any hardware limits:',
            variable: 'declimits',
            condition: "$tracker == OAT",
            preamble: ['// Define DEC limits'],
            define: '',
            control: {
                type: 'textinput',
                choices: [
                    { key: 'N', label: 'Degrees DEC can move up from Home', defaultValue: '90', defineLine: '#define DEC_LIMIT_UP   {0} // degrees from Home' },
                    { key: 'D', label: 'Degrees DEC can move down from Home', defaultValue: '45', defineLine: '#define DEC_LIMIT_DOWN {0} // degrees from Home' },
                ]
            },
        },
        { // OAM
            id: 'DLO',
            title: 'DEC Movement Limits',
            label: 'These are required settings to determine how far DEC can move from the Home position without hitting any hardware limits (if you have endswitches, you can set this to 180):',
            variable: 'declimits',
            condition: "$tracker == OAM",
            preamble: ['// Define DEC limits'],
            define: '',
            control: {
                type: 'textinput',
                choices: [
                    { key: 'N', label: 'Degrees DEC can move from Home', defaultValue: '170', defineLine: '#define DEC_LIMIT_UP   {0} // degrees from Home\n#define DEC_LIMIT_DOWN {0}' },
                ]
            },
        },
        { // OAT / OAM
            id: 'STL',
            title: 'Stepper Stealth Mode',
            label: 'What mode do you want to run the RA and DEC steppers in? If Stealth Mode, they will be inaudible (when not slewing), but have slightly lower performance. In Normal mode, they will make a soft hissing sound, but will have better performance.',
            variable: 'stealhmode',
            condition: "($radrv == TU) AND ($decdrv == TU) AND ($tracker != OAE)",
            preamble: ['// TMC2209 Stealth Mode (spreadCycle) - When set to 0, tracking is more precise, but noisy (high-pitched hissing sound). When set to 1, they are silent.'],
            define: '',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'S', value: 'Stealth Mode (silent)', image: '/images/none.png', additionalLines: ['#define RA_UART_STEALTH_MODE      1', '#define DEC_UART_STEALTH_MODE     1'] },
                    { key: 'N', value: 'Normal Mode (hissing)', image: '/images/none.png', additionalLines: ['#define RA_UART_STEALTH_MODE      0', '#define DEC_UART_STEALTH_MODE     0'] },
                ]
            },
        },
        { // OAT / OAM
            id: 'DY',
            title: 'Display',
            label: 'What kind of interactive display are you using:',
            variable: 'display',
            condition: "($tracker == OAT) OR ($tracker == OAM)",
            define: 'DISPLAY_TYPE',
            preamble: ['////////////////////////////////', '// Display configuration ', '// Define the type of display we are using. Currently: {v}'],
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'NO', value: 'No display', image: '/images/none.png', defineValue: 'DISPLAY_TYPE_NONE' },
                    { key: 'LCD', value: 'LCD Shield w/ keypad', image: '/images/lcdshield.png', defineValue: 'DISPLAY_TYPE_LCD_KEYPAD' },
                    { key: 'I08', value: 'I2C LCD Shield w/ MCP23008 controller', image: '/images/lcd23008.png', defineValue: 'DISPLAY_TYPE_LCD_KEYPAD_I2C_MCP23008' },
                    { key: 'I17', value: 'I2C LCD Shield w/ MCP23017 controller', image: '/images/lcd23017.png', defineValue: 'DISPLAY_TYPE_LCD_KEYPAD_I2C_MCP23017' },
                    { key: 'S13', value: 'I2C 32x128 OLED w/ joystick', image: '/images/ssd1306.png', defineValue: 'DISPLAY_TYPE_LCD_JOY_I2C_SSD1306' },
                ]
            },
        },
        { 
            id: 'IDY',
            title: 'Informational Display',
            label: 'What kind of information display are you using:',
            variable: 'infodisplay',
            condition: "($display == NO)",
            preamble: ['////////////////////////////////', '// InfoDisplay configuration ', '// Define the type of info display we are using. Currently: {v}'],
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'NO', value: 'No info display', image: '/images/none.png', additionalLines: ['#define INFO_DISPLAY_TYPE          INFO_DISPLAY_TYPE_NONE'] },
                    { key: 'OLED', value: 'I2C 128x64 OLED display', image: '/images/oledsmall.png', additionalLines: ['#define INFO_DISPLAY_TYPE          INFO_DISPLAY_TYPE_I2C_SSD1306_128x64'] },
                ]
            },
            postamble: [
                { literal: ['#define INFO_DISPLAY_I2C_ADDRESS   0x3C'] },
                { literal: ['#define INFO_DISPLAY_I2C_SDA_PIN   20'] },
                { literal: ['#define INFO_DISPLAY_I2C_SCL_PIN   21'] },
                {
                    literal: ['// Note that the E1 port is not usable since I2C requires pin 21!'],
                    condition: "($board == M10) OR ($board == M20) OR ($board == M21)",
                },
            ],
        },
        { // OAT / OAM
            id: 'WW',
            title: 'Use WiFi',
            label: 'Do you want to enable WiFi:',
            variable: 'wifi',
            condition: "($board == E) AND ($tracker != OAE)",
            preamble: ['////////////////////////////////', '// WiFi configuration ', '// Are we using WiFi: {v}'],
            define: 'WIFI_ENABLED',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'Y', value: 'Yes, use WiFi', image: '/images/wifi.png', defineValue: '1' },
                    { key: 'N', value: 'No, disable WiFi', image: '/images/nowifi.png', defineValue: '0' },
                ]
            },
        },
        {
            id: 'WM',
            title: 'WiFi Mode',
            label: 'In what mode do you want to use WiFi:',
            condition: "$wifi == Y",
            variable: 'wifimode',
            preamble: ['// Using WiFi in mode {v}'],
            define: 'WIFI_MODE',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'I', value: 'Infrastructure, all devices connect to same network', image: '/images/infra.png', defineValue: 'WIFI_MODE_INFRASTRUCTURE' },
                    { key: 'A', value: 'Access Point, OAT is a hotspot', image: '/images/ap.png', defineValue: 'WIFI_MODE_AP_ONLY' },
                    { key: 'F', value: 'Infrastructure with failover to Access Point', image: '/images/failover.png', defineValue: 'WIFI_MODE_ATTEMPT_INFRASTRUCTURE_FAIL_TO_AP' },
                ]
            },
        },
        {
            id: 'WI',
            title: 'WiFi Infrastructure Setup',
            label: 'Enter the WiFi parameters for Infrastructure mode:',
            variable: 'wifiparamsi',
            condition: "($wifi == Y) AND ($wifimode == I)",
            preamble: ['// Define the SSID, WPA key and host name for the network'],
            define: '',
            control: {
                type: 'textinput',
                choices: [
                    { key: 'S', label: 'WiFi SSID', defineLine: '#define WIFI_INFRASTRUCTURE_MODE_SSID "{0}"' },
                    { key: 'P', label: 'WPA Key', defineLine: '#define WIFI_INFRASTRUCTURE_MODE_WPAKEY "{0}"' },
                    { key: 'H', label: 'Hostname', defaultValue: 'OATScope', defineLine: '#define WIFI_HOSTNAME "{0}"' },
                ]
            },
        },
        {
            id: 'WA',
            title: 'WiFi Access Point Setup',
            label: 'Enter the WiFi parameters for Access Point mode:',
            variable: 'wifiparamsa',
            condition: "($wifi == Y) AND ($wifimode == A)",
            define: '',
            preamble: ['// Define the WPA key and host name for the network'],
            control: {
                type: 'textinput',
                choices: [
                    { key: 'P', label: 'WPA Key for OAT hotspot', defineLine: '#define WIFI_AP_MODE_WPAKEY "{0}"' },
                    { key: 'H', label: 'Hostname', defaultValue: 'OATScope', defineLine: '#define WIFI_HOSTNAME "{0}"' },
                ]
            },
        },
        {
            id: 'WF',
            title: 'WiFi Failover Setup',
            label: 'Enter the WiFi parameters for Failover mode:',
            variable: 'wifiparamsf',
            condition: "($wifi == Y) AND ($wifimode == F)",
            define: '',
            preamble: ['// Define the SSID, WPA keys and host name for the network'],
            control: {
                type: 'textinput',
                choices: [
                    { key: 'S', label: 'WiFi SSID of network', defineLine: '#define WIFI_INFRASTRUCTURE_MODE_SSID "{0}"' },
                    { key: 'P', label: 'WPA Key for network', defineLine: '#define WIFI_INFRASTRUCTURE_MODE_WPAKEY "{0}"' },
                    { key: 'N', label: 'WPA Key for OAT hotspot', defineLine: '#define WIFI_AP_MODE_WPAKEY "{0}"' },
                    { key: 'H', label: 'Hostname', defaultValue: 'OATScope', defineLine: '#define WIFI_HOSTNAME "{0}"' },
                ]
            },
        },
        { // OAT
            id: 'GP',
            title: 'GPS',
            label: 'Do you have the GPS add on:',
            variable: 'gps',
            condition: "$tracker == OAT",
            preamble: ['////////////////////////////////', '// GPS Addon configuration ', '// Define whether we have the GPS addon or not. Currently: {v}'],
            define: 'USE_GPS',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'N', value: 'No GPS', image: '/images/none.png', defineValue: '0' },
                    { key: 'Y', value: 'GPS NEO-6M', image: '/images/gpsneo6m.png', defineValue: '1' },
                ]
            },
        },
        // GYRO for MEGA
        { // OAT
            id: 'DL',
            title: 'Digital Level',
            label: 'Do you have the Digital Level add on:',
            variable: 'gyro',
            preamble: ['////////////////////////////////', '// Digital Level Addon configuration ', '// Define whether we have the Digital Level or not. Currently: {v}'],
            condition: "($board == M) AND ($tracker == OAT)",
            define: 'USE_GYRO_LEVEL',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'N', value: 'No Digital Level', image: '/images/none.png', defineValue: '0' },
                    { key: 'Y', value: 'MPU-6050 Gyroscope', image: '/images/levelmpu6050.png', defineValue: '1', additionalLines: ['#define GYRO_AXIS_SWAP 0'] },
                    { key: 'Y2', value: 'MPU-6050 Gyroscope with axes swapped', image: '/images/levelmpu6050.png', defineValue: '1', additionalLines: ['#define GYRO_AXIS_SWAP 1'] },
                ]
            },
        },
        // GYRO for MKS V21
        { // OAT
            id: 'LM',
            title: 'Digital Level',
            label: 'Do you have the Digital Level add on:',
            variable: 'gyromks',
            preamble: ['////////////////////////////////', '// Digital Level Addon configuration ', '// Define whether we have the Digital Level or not. Currently: {v}'],
            condition: "($board == M21) AND ($tracker == OAT)",
            define: 'USE_GYRO_LEVEL',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'N', value: 'No Digital Level', image: '/images/none.png', defineValue: '0' },
                    { key: 'Y', value: 'MPU-6050 Gyroscope', image: '/images/levelmpu6050.png', defineValue: '1', additionalLines: ['#define GYRO_AXIS_SWAP 0', '// MKS uses software I2C library. Define the SCL and SDA pins you wired (recommended are 11 and 21)', '#define USE_GYRO_WITH_SOFTWAREI2C 1', '#define GYRO_SOFTWARE_SCL_PIN 11', '#define GYRO_SOFTWARE_SDA_PIN 21'] },
                    { key: 'Y2', value: 'MPU-6050 Gyroscope with axes swapped', image: '/images/levelmpu6050.png', defineValue: '1', additionalLines: ['#define GYRO_AXIS_SWAP 1', '// MKS uses software I2C library. Define the SCL and SDA pins you wired (recommended are 11 and 21)', '#define USE_GYRO_WITH_SOFTWAREI2C 1', '#define GYRO_SOFTWARE_SCL_PIN 11', '#define GYRO_SOFTWARE_SDA_PIN 21'] },
                ]
            },
        },
        { // OAT/OAM
            id: 'FC',
            title: 'Focuser support',
            label: 'Do you want to support a focuser on E1:',
            variable: 'focuser',
            condition: "($board IN [M,M10,M20,M21]) AND ($tracker != OAE)",
            preamble: ['////////////////////////////////', '// Focuser configuration ', '// Define whether to support a focusing stepper motor on E1 or not. Currently: {v}'],
            define: '',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'N', value: 'No Focuser', image: '/images/none.png', additionalLines: ['// No Focuser settings'] },
                    { key: 'Y', value: 'Focuser stepper', image: '/images/focuser.png' },
                ]
            },
        },
        {
            id: 'FS',
            title: 'Focuser Stepper',
            label: 'Which stepper motor are you using for the Focuser:',
            variable: 'focstpr',
            condition: "$focuser == Y",
            preamble: ['// Using the {v} stepper for FOC'],
            define: 'FOCUS_STEPPER_TYPE',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'BY', value: 'Modded 28BYJ-48 (Bipolar)', image: '/images/byj48.png', defineValue: 'STEPPER_TYPE_ENABLED', additionalLines: ['#define FOCUS_STEPPER_SPR 2048.0f'] },
                    { key: 'N9', value: 'NEMA 17, 0.9°/step', image: '/images/nema17.png', defineValue: 'STEPPER_TYPE_ENABLED' },
                    { key: 'N8', value: 'NEMA 17, 1.8°/step', image: '/images/nema17.png', defineValue: 'STEPPER_TYPE_ENABLED', additionalLines: ['#define FOCUS_STEPPER_SPR 200.0f'] },
                    { key: 'N49', value: 'NEMA 14, 0.9°/step', image: '/images/nema14.png', defineValue: 'STEPPER_TYPE_ENABLED' },
                    { key: 'N48', value: 'NEMA 14, 1.8°/step', image: '/images/nema14.png', defineValue: 'STEPPER_TYPE_ENABLED', additionalLines: ['#define FOCUS_STEPPER_SPR 200.0f'] },
                ]
            },
        },
        {
            id: 'FD',
            title: 'Focuser Driver',
            label: 'Which driver board are you using to drive the focuser stepper motor:',
            variable: 'focdrv',
            condition: "$focuser == Y",
            preamble: ['// Using the {v} driver for focuser stepper'],
            define: 'FOCUS_DRIVER_TYPE',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'A', value: 'Generic A4988', image: '/images/a4988.png', defineValue: 'DRIVER_TYPE_A4988_GENERIC' },
                    { key: 'TU', value: 'TMC2209-UART', image: '/images/tmc2209.png', defineValue: 'DRIVER_TYPE_TMC2209_UART' },
                    { key: 'TS', value: 'TMC2209-Standalone', image: '/images/tmc2209.png', defineValue: 'DRIVER_TYPE_TMC2209_STANDALONE' },
                ]
            },
        },
        {
            id: 'FA',
            title: 'Focuser Advanced Settings',
            label: 'These are some advanced settings you may want to override. The defaults are set already. Please only change them if you are sure what they do and what their valid ranges are. Enter the Focus stepper specs and desired settings:',
            variable: 'focuspower',
            condition: "$focdrv == TU",
            preamble: ['// Define Focus stepper motor power settings'],
            postamble: [{ literal: ['#define FOCUSER_ALWAYS_ON                1'] }],
            define: '',
            control: {
                type: 'textinput',
                choices: [
                    { key: 'P', label: 'Power rating in mA', defaultValue: '{Defaults.PowerRating.focstpr}', defineLine: '#define FOCUS_MOTOR_CURRENT_RATING       {0} // mA' },
                    { key: 'O', label: 'Operating percentage', defaultValue: '{Defaults.PowerUtilization.focstpr}', defineLine: '#define FOCUS_OPERATING_CURRENT_SETTING  {0} // %' },
                    { key: 'S', label: 'Microstepping setting', defaultValue: '{Defaults.FocuserMicrostepping.focstpr}', defineLine: '#define FOCUS_MICROSTEPPING              {0} // steps' },
                    { key: 'H', label: 'Hold current percentage (0 to power down)', defaultValue: 10, defineLine: '#define FOCUSER_MOTOR_HOLD_SETTING       {0} // %', additionalLines: ['#define FOCUS_UART_STEALTH_MODE          1 // silent?'] },
                ]
            },
        },
        {
            id: 'FMS',
            title: 'Focuser Motion Settings',
            label: 'These are some advanced settings you may want to override. The defaults are set already. Please only change them if you are sure what they do and what their valid ranges are. Enter the Focuser stepper specs and desired settings:',
            variable: 'focmotion',
            condition: "$focuser == Y",
            preamble: ['// Define some focuser stepper motor settings'],
            define: '',
            control: {
                type: 'textinput',
                choices: [
                    { key: 'A', label: 'Acceleration (steps/s/s)', defaultValue: '{Defaults.Acceleration.focstpr}', defineLine: '#define FOCUS_STEPPER_ACCELERATION {0}' },
                    { key: 'V', label: 'Maximum Speed (steps/s)', defaultValue: '{Defaults.Speed.focstpr}', defineLine: '#define FOCUS_STEPPER_SPEED {0}' },
                ]
            },
        },
        ///////////////// AUTO PA
        { // OAT
            id: 'APT',
            title: 'Auto Polar Align',
            label: 'Do you have the AutoPA add on:',
            variable: 'autopa',
            condition: "$tracker == OAT",
            preamble: ['////////////////////////////////', '// AutoPA Addon configuration ', '// Define whether we have the AutoPA add on or not. Currently: {v}'],
            define: '',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'N', value: 'No AutoPA', image: '/images/none.png', additionalLines: ['// No AutoPA settings'] },
                    { key: 'Y', value: 'AutoPA is installed', image: '/images/autopa.png' },
                ]
            },
        },
        { // OAT
            id: 'AV',
            title: 'AutoPA Version',
            label: 'What version of AutoPA do you have installed:',
            variable: 'autopaversion',
            condition: "($autopa == Y) AND ($tracker == OAT)",
            preamble: ['// Using AutoPA {v}.'],
            define: '',
            control: {
                type: 'radioimg',
                choices: [
                    { key: '1', value: 'V1.0', image: '/images/none.png' },
                    { key: '2', value: 'V2.0', image: '/images/none.png', additionalLines: ['#define AUTOPA_VERSION 2'] },
                ]
            },
        },
        { // OAT
            id: 'ZST',
            title: 'Azimuth Stepper',
            label: 'Which stepper motor are you using for the Azimuth:',
            variable: 'az',
            condition: "($autopa == Y) AND ($tracker == OAT)",
            preamble: ['// Using the {v} stepper for AZ'],
            define: 'AZ_STEPPER_TYPE',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'BY', value: 'Modded 28BYJ-48 (Bipolar)', image: '/images/byj48mod.png', defineValue: 'STEPPER_TYPE_ENABLED', additionalLines: ['#define AZ_STEPPER_SPR 2048.0f'], condition: "$tracker == OAT" },
                    { key: 'N9', value: 'NEMA 17, 0.9°/step', image: '/images/nema17.png', defineValue: 'STEPPER_TYPE_ENABLED' },
                    { key: 'N8', value: 'NEMA 17, 1.8°/step', image: '/images/nema17.png', defineValue: 'STEPPER_TYPE_ENABLED', additionalLines: ['#define AZ_STEPPER_SPR 200.0f'] },
                ]
            },
        },
        { // OAT
            id: 'ZD',
            title: 'Azimuth Driver',
            label: 'Which stepper driver are you using to drive the Azimuth stepper motor:',
            variable: 'azdrv',
            condition: "($autopa == Y) AND ($tracker == OAT)",
            preamble: ['// Using the {v} driver for AZ stepper motor'],
            define: 'AZ_DRIVER_TYPE',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'A', value: 'Generic A4988', image: '/images/a4988.png', defineValue: 'DRIVER_TYPE_A4988_GENERIC', condition: "$tracker == OAT" },
                    { key: 'TU', value: 'TMC2209-UART', image: '/images/tmc2209.png', defineValue: 'DRIVER_TYPE_TMC2209_UART' },
                    { key: 'TS', value: 'TMC2209-Standalone', image: '/images/tmc2209.png', defineValue: 'DRIVER_TYPE_TMC2209_STANDALONE' },
                ]
            },
        },
        { // OAT
            id: 'ZA',
            title: 'Azimuth Advanced Settings',
            label: 'These are some advanced settings you may want to override. The defaults are set already. Please only change them if you are sure what they do and what their valid ranges are. Enter the AZ stepper specs and desired settings:',
            variable: 'azpower',
            condition: "($azdrv == TU) AND ($tracker != OAE)",
            preamble: ['// Define AZ stepper motor power settings'],
            postamble: [{
                literal: [
                    '#define AZ_STEPPER_SPEED             1000',
                    '#define AZ_STEPPER_ACCELERATION      500',
                    '',
                    '',
                    '///////////////////////////////',
                    '// AZ parameters will require tuning according to your setup',
                    '',
                    '// If you have a custom solution involving a rod you can uncomment and use the next 3 lines for calculations',
                    '// #define AZ_CIRCUMFERENCE        (115 * 2 * 3.1415927) // the circumference of the circle where the movement is anchored',
                    '// #define AZ_ROD_PITCH            1.0f                  // mm per full rev of stepper',
                    '// #define AZIMUTH_STEPS_PER_REV   (AZ_CIRCUMFERENCE / AZ_ROD_PITCH * AZ_STEPPER_SPR * AZ_MICROSTEPPING)  // Steps needed to turn AZ 360deg',
                    '',
                    '// If you have a belt drive solution, you can uncomment and use the next 2 lines for calculations',
                    '// #define AZ_CIRCUMFERENCE        (725)  // the circumference of the circle where the movement is anchored',
                    '// #define AZ_PULLEY_TEETH         16',
                    '',
                    '// Is it going the wrong way?',
                    '#define AZ_INVERT_DIR 0'
                ]
            },
            {
                literal: [
                    '',
                    '// Should AZ motor stay energized?',
                    '#define AZ_ALWAYS_ON  1',
                ],
                condition: "$tracker == OAM",
            }
            ],
            define: '',
            control: {
                type: 'textinput',
                choices: [
                    { key: 'P', label: 'Power rating in mA', defaultValue: '{Defaults.PowerRating.az}', defineLine: '#define AZ_MOTOR_CURRENT_RATING      {0} // mA' },
                    { key: 'O', label: 'Operating percentage', defaultValue: '{Defaults.PowerUtilization.az}', defineLine: '#define AZ_OPERATING_CURRENT_SETTING {0} // %' },
                    { key: 'S', label: 'Microstepping setting', defaultValue: '{Defaults.AZALTMicrostepping.az}', defineLine: '#define AZ_MICROSTEPPING             {0} // steps' },
                    { key: 'H', label: 'Hold current percentage (0 to power down)', defaultValue: '{Defaults.HoldPercentage.az}', defineLine: '#define AZ_MOTOR_HOLD_SETTING        {0} // %' },
                ]
            },
        },
        { // OAT
            id: 'ZAO',
            title: 'Azimuth Always On',
            label: 'It is possible to keep the azimuth motor energized at all times to prevent any shifting in position. This is not necessarily needed for 28BYJ motors, however it is recommended for NEMAs when using AutoPA V2.0.',
            variable: 'azalwayson',
            condition: "($autopa == Y) AND ($tracker == OAT)",
            preamble: ['// Define AZ always-on'],
            define: 'AZ_ALWAYS_ON',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'Y', value: 'Yes', image: '/images/none.png', defineValue: '1' },
                    { key: 'N', value: 'No', image: '/images/none.png', defineValue: '0' },
                ]
            },
        },
        {
            id: 'LST',
            title: 'Altitude Stepper',
            label: 'Which stepper motor are you using for the Altitude:',
            variable: 'alt',
            condition: "($autopa == Y) AND ($tracker != OAE)",
            preamble: ['// Using the {v} stepper for ALT'],
            define: 'ALT_STEPPER_TYPE',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'BY', value: 'Modded 28BYJ-48 (Bipolar)', image: '/images/byj48mod.png', defineValue: 'STEPPER_TYPE_ENABLED', additionalLines: ['#define ALT_STEPPER_SPR 2048.0f'], condition: "$tracker == OAT" },
                    { key: 'N9', value: 'NEMA 17, 0.9°/step', image: '/images/nema17.png', defineValue: 'STEPPER_TYPE_ENABLED' },
                    { key: 'N8', value: 'NEMA 17, 1.8°/step', image: '/images/nema17.png', defineValue: 'STEPPER_TYPE_ENABLED', additionalLines: ['#define ALT_STEPPER_SPR 200.0f'] },
                ]
            },
        },
        {
            id: 'LD',
            title: 'Altitude Driver',
            label: 'Which driver board are you using to drive the Altitude stepper motor:',
            variable: 'altdrv',
            condition: "($autopa == Y) AND ($tracker != OAE)",
            preamble: ['// Using the {v} driver for ALT stepper motor'],
            define: 'ALT_DRIVER_TYPE',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'A', value: 'Generic A4988', image: '/images/a4988.png', defineValue: 'DRIVER_TYPE_A4988_GENERIC', condition: "$tracker == OAT" },
                    { key: 'TU', value: 'TMC2209-UART', image: '/images/tmc2209.png', defineValue: 'DRIVER_TYPE_TMC2209_UART' },
                    { key: 'TS', value: 'TMC2209-Standalone', image: '/images/tmc2209.png', defineValue: 'DRIVER_TYPE_TMC2209_STANDALONE' },
                ]
            },
        },
        {
            id: 'LA',
            title: 'Altitude Advanced Settings',
            label: 'These are some advanced settings you may want to override. The defaults are set already. Please only change them if you are sure what they do and what their valid ranges are. Enter the ALT stepper specs and desired settings:',
            variable: 'altpower',
            condition: "($altdrv == TU) AND ($tracker != OAE)",
            preamble: ['// Define ALT stepper motor power settings'],
            define: '',
            control: {
                type: 'textinput',
                choices: [
                    { key: 'P', label: 'Power rating in mA', defaultValue: '{Defaults.PowerRating.alt}', defineLine: '#define ALT_MOTOR_CURRENT_RATING      {0} // mA' },
                    { key: 'O', label: 'Operating percentage', defaultValue: '{Defaults.PowerUtilization.alt}', defineLine: '#define ALT_OPERATING_CURRENT_SETTING {0} // %' },
                    { key: 'S', label: 'Microstepping setting', defaultValue: '{Defaults.AZALTMicrostepping.alt}', defineLine: '#define ALT_MICROSTEPPING             {0} // steps' },
                    { key: 'H', label: 'Hold current percentage (0 to power down)', defaultValue: '{Defaults.HoldPercentage.alt}', defineLine: '#define ALT_MOTOR_HOLD_SETTING        {0} // %' },
                ]
            },
            postamble: [{
                condition: '$tracker == OAM',
                literal: [
                    '#define ALT_STEPPER_SPEED             3000',
                    '#define ALT_STEPPER_ACCELERATION      1000',
                    '',
                    '///////////////////////////////',
                    '// ALT parameters are for hardware as designed',
                    '#define ALTITUDE_STEPS_PER_ARC_MINUTE  ((1640 / 60) * ALT_MICROSTEPPING)',
                    '',
                    '// Is it going the wrong way?',
                    '#define ALT_INVERT_DIR 0'
                ]
            },
            {
                condition: '$tracker == OAT',
                literal: [
                    '#define ALT_STEPPER_SPEED             2000',
                    '#define ALT_STEPPER_ACCELERATION      1000',
                    '',
                    '// Is it going the wrong way?',
                    '#define ALT_INVERT_DIR 0'
                ]
            }
            ]
        }, 
        {// OAT
            id: 'LAO',
            title: 'Altitude Always On',
            label: 'It is possible to keep the altitude motor energized at all times to prevent any shifting in position. This is usually not needed.',
            variable: 'altalwayson',
            condition: "($autopa == Y) AND ($tracker == OAT)",
            preamble: ['// Define ALT always-on'],
            define: 'ALT_ALWAYS_ON',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'Y', value: 'Yes', image: '/images/none.png', defineValue: '1' },
                    { key: 'N', value: 'No', image: '/images/none.png', defineValue: '0' },
                ]
            },
        },
        //////////////////// HALL Sensors ///////////////////////////
        {// OAT / OAM
            id: 'RAH',
            title: 'RA Auto Home via Hall sensors',
            label: 'Do you have the Hall sensor-based AutoHome add ons installed on the RA axis:',
            variable: 'hallhomera',
            condition: "($board IN [M,M21]) AND ($tracker != OAE)",
            preamble: ['////////////////////////////////', '// Auto Homing addons'],
            define: 'USE_HALL_SENSOR_RA_AUTOHOME',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'N', value: 'No RA Hall sensor homing', image: '/images/none.png', defineValue: '0' },
                    { key: 'Y', value: 'RA Homing Hall sensor installed', image: '/images/none.png', defineValue: '1' },
                ]
            },
        },
        { // OAT / OAM
            id: 'RAHA',
            title: 'RA Auto Home Settings',
            label: 'What settings would you like to use for the RA homing sensor:',
            variable: 'hallhomerasettings',
            condition: "($hallhomera == Y) AND ($tracker != OAE)",
            define: '',
            control: {
                type: 'textinput',
                choices: [
                    { key: 'P', label: 'Pin that sensor is attached to', defaultValue: '{Defaults.RAHallSensorPin.tracker}', defineLine: '#define RA_HOMING_SENSOR_PIN            {0}' },
                    { key: 'S', label: 'Number of degrees to search for sensor', defaultValue: '10', defineLine: '#define RA_HOMING_SENSOR_SEARCH_DEGREES {0}' },
                ]
            },
        },
        {
            id: 'DAH',
            title: 'DEC Auto Home via Hall sensors',
            label: 'Do you have the Hall sensor-based AutoHome add ons installed on the DEC axis:',
            variable: 'hallhomedec',
            condition: "($board IN [M,M21]) AND ($tracker == OAM)",
            define: 'USE_HALL_SENSOR_DEC_AUTOHOME',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'N', value: 'No DEC Hall sensor homing', image: '/images/none.png', defineValue: '0' },
                    { key: 'Y', value: 'DEC Homing Hall sensor installed', image: '/images/none.png', defineValue: '1' },
                ]
            },
        },
        {
            id: 'DAHA',
            title: 'DEC Auto Home Settings',
            label: 'What settings would you like to use for the DEC homing sensor:',
            variable: 'hallhomedecsettings',
            condition: "$hallhomedec == Y",
            define: '',
            control: {
                type: 'textinput',
                choices: [
                    { key: 'P', label: 'Pin that sensor is attached to', defaultValue: '29', defineLine: '#define DEC_HOMING_SENSOR_PIN            {0}' },
                    { key: 'S', label: 'Number of degrees to search for sensor', defaultValue: '10', defineLine: '#define DEC_HOMING_SENSOR_SEARCH_DEGREES {0}' },
                ]
            },
        },
        { // OAM
            id: 'RESM',
            title: 'RA End switches',
            label: 'Do you have end switches installed on the RA axis:',
            variable: 'endswra',
            preamble: ['////////////////////////////////', '// End Switch addons'],
            condition: "$tracker == OAM",
            define: 'USE_RA_END_SWITCH',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'N', value: 'No RA end switches installed', image: '/images/none.png', defineValue: '0' },
                    { key: 'Y', value: 'RA end switches are installed', image: '/images/none.png', defineValue: '1' },
                ]
            },
        },
        { // OAM
            id: 'RESMA',
            title: 'RA End switch settings',
            label: 'What settings do you want to use for the RA end switches:',
            variable: 'endswraadv',
            condition: "$endswra == Y",
            define: '',
            control: {
                type: 'textinput',
                choices: [
                    { key: 'E', label: 'East direction pin that sensor is attached to', defaultValue: '19', defineLine: '#define RA_ENDSWITCH_EAST_SENSOR_PIN   {0}' },
                    { key: 'W', label: 'West direction pin that sensor is attached to', defaultValue: '18', defineLine: '#define RA_ENDSWITCH_WEST_SENSOR_PIN   {0}' },
                    { key: 'D', label: 'How many degrees should the mount slew back to get off the switches', defaultValue: '3.0', defineLine: '#define RA_ENDSWITCH_BACKSLEW_DEG      {0}' },
                ]
            },
        },
        { // OAM
            id: 'DESM',
            title: 'DEC End switches',
            label: 'Do you have end switches installed on the DEC axis:',
            variable: 'endswdec',
            condition: "$tracker == OAM",
            define: 'USE_DEC_END_SWITCH',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'N', value: 'No DEC end switches installed', image: '/images/none.png', defineValue: '0' },
                    { key: 'Y', value: 'DEC end switches are installed', image: '/images/none.png', defineValue: '1' },
                ]
            },
        },
        { // OAM
            id: 'DESMA',
            title: 'DEC End switch settings',
            label: 'What settings do you want to use for the DEC end switches:',
            variable: 'endswdecadv',
            condition: "$endswdec == Y",
            define: '',
            control: {
                type: 'textinput',
                choices: [
                    { key: 'E', label: 'Up direction pin that sensor is attached to', defaultValue: '32', defineLine: '#define DEC_ENDSWITCH_UP_SENSOR_PIN    {0}' },
                    { key: 'W', label: 'Down direction pin that sensor is attached to', defaultValue: '47', defineLine: '#define DEC_ENDSWITCH_DOWN_SENSOR_PIN  {0}' },
                    { key: 'D', label: 'How many degrees should the mount slew back to get off the switches', defaultValue: '3.0', defineLine: '#define DEC_ENDSWITCH_BACKSLEW_DEG     {0}' },
                ]
            },
        },

    ];

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
            }
        }

        let skipState = shouldSkipStep(index);
        if ((skipState.skip) && (index < stepIndex)) {
            description = "N/A, skipped.";
        }

        if ((!skipState.skip) || (index <= stepIndex)) {
            steps.push(<Step size="small" title={title} description={description} />)
        }
    });

    steps.push(<Step title='Completed' />)

    if (showResult) {
        let configKey = ''
        let defines = [];
        console.log('config',configuration);
        configuration.forEach(config => {
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
            configKey += property.id
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
        });

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
                                <Image className='image-column' src={item.image} />
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
