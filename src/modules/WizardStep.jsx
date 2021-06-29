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

// TODO: Support full expressions. 
// For example:
// ($fwversion IN [V19, V197]) AND ($azdrv907 EQ TMC2209U)
// ($fwversion IN [V19, V197]) AND ($azdrv907 EQ TMC2209U) OR (${azdrv} EQ TMC2209U))
// Needed operators : EQ, NEQ, IN, NOTIN
// $ denotes variable
// Parentheses nest

const { Step } = Steps;

const WizardStep = (props) => {
    const [stepIndex, setStepIndex] = useState(-1);
    const [showResult, setShowResult] = useState(false);
    const [configuration, setConfiguration] = useState([]);
    const [advanceStep, setAdvanceStep] = useState(false);
    const downloadParentRef = useRef(null);

    const onRestart = () => {
        setConfiguration([]);
        setStepIndex(0);
        setShowResult(false);
    };

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
                break;
            case 'NOTIN':
                {
                    const set = expr.rhs.substr(1, expr.rhs.length - 2).split(',');
                    return { bool: set.indexOf(conf.value) === -1, status: "OK" };
                }
                break;
            case '==':
            case 'EQ':
                {
                    return { bool: conf.value === expr.rhs, status: "OK" };
                }
                break;
            case '!=':
            case 'NEQ':
                {
                    return { bool: conf.value !== expr.rhs, status: "OK" };
                }
                break;
            default:
                throw "Unknown operator " + expr.op;
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
            throw "rhs should be expression!"
        }

        const result = evaluateExpression(expr.rhs);
        if (result.status === 'skip') {
            return result;
        }
        rhs = result.bool

        if (expr.op === 'AND') return { bool: lhs && rhs, status: 'ok' };
        if (expr.op === 'OR') return { bool: lhs || rhs, status: 'ok' };
        if (expr.op === 'XOR') return { bool: lhs !== rhs, status: 'ok' };

        throw "Unknown operator " + expr.op;
    }

    const shouldSkipStep = (index) => {
        let startIndex = index;
        let skip = true;
        // if (index < stepProps.length){
        //     console.log(`Should we skip step ${index}: ${stepProps[index].variable}?`)
        // }
        while (index < stepProps.length) {
            skip = false;
            let nextStep = stepProps[index];
            if (nextStep.condition) {
                const expr = parseExpression(nextStep.condition)
                const exprResult = evaluateExpression(expr);
                if (exprResult.status === 'skip') {
                    skip = true;
                }
                else {
                    skip = !exprResult.bool;
                }
            }
            else {
                if (nextStep.conditions) {
                    let result = true;
                    nextStep.conditions.forEach(cond => {
                        const neededKeys = cond.neededKeys.split(',');
                        const conf = configuration.find(config => config.variable === cond.variable);
                        if (!conf || (neededKeys.indexOf(conf.value) === -1)) {
                            result = false;
                        }
                    });

                    if (!result) {
                        skip = true;
                    }
                }
            }
            if (!skip) {
                return { skip: startIndex !== index, nextIndex: index, atEnd: false };
            }
            else {
                index++;
            }
        }

        // console.log("Should we skip : " + (startIndex !== index))

        return { atEnd: index >= stepProps.length, skip: startIndex !== index, nextIndex: index };
    }

    useEffect(() => {
        let nextStepIndex = stepIndex + 1;
        let res = shouldSkipStep(nextStepIndex);
        setStepIndex(res.nextIndex);

        if (res.atEnd) {
            setShowResult(true);
        }
    }, [advanceStep]);

    const downloadTxtFile = (lines) => {
        const element = document.createElement("a");
        const file = new Blob([...(lines.map(line => line + "\n"))], { type: 'text/plain;charset=utf-8' });
        element.setAttribute('href', window.URL.createObjectURL(file));

        element.target = "_blank";
        element.rel = "noreferrer noopener";
        //element.download = "Configuration_local.hpp";
        downloadParentRef.current.appendChild(element);
        setTimeout(function () {
            element.click();
            element.parentNode.removeChild(element);
        }, 200);

    }

    const onSelect = (index, e) => {
        let newConfiguration = configuration.filter(config => config.variable !== stepProps[index].variable)
        newConfiguration = [...newConfiguration, { variable: stepProps[index].variable, value: e }]
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
                let newConfig = prop.control.choices.map((v) => { return { key: v.key, value: v.defaultValue || '' } });
                let newConfiguration = configuration.filter(config => config.variable !== stepProps[index].variable);
                newConfiguration = [...newConfiguration, { variable: prop.variable, value: newConfig }]
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
    const teststepProps = [
        {
            title: 'WiFi Access Point Setup',
            label: 'Enter the WiFi parameters for Access Point mode:',
            variable: 'wifiparamsa',
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

    ]

    const stepProps = [
        {
            title: 'Firmware',
            label: 'Which firmware version are you planning to configure/build:',
            variable: 'fwversion',
            preamble: [
                '/////////////////////////////////////////////////////////////////////////////////////////////////////////',
                '// This configuration file was generated by the OAT Configurator at https://config.openastrotech.com for',
                '// firmware {v}.',
                '// Save this as Configuration_local.hpp in the folder where you placed the firmware code.'],
            define: '',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'V18', value: 'V1.8.77 and earlier', image: '/images/none.png', defineValue: '' },
                    { key: 'V19', value: 'V1.9.00 to V1.9.06', image: '/images/none.png', defineValue: '' },
                    { key: 'V197', value: 'V1.9.07 to V1.9.10', image: '/images/none.png', defineValue: '' },
                    { key: 'V1911', value: 'V1.9.11 to V1.9.14', image: '/images/none.png', defineValue: '' },
                    { key: 'V1915', value: 'V1.9.15 and later', image: '/images/none.png', defineValue: '' },
                ]
            },
        },
        {
            title: 'Hemisphere',
            label: 'Which hemisphere do you live in:',
            variable: 'hemi',
            preamble: ['// We live in the {v}'],
            define: 'NORTHERN_HEMISPHERE',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'NORTH', value: 'Northern Hemisphere', image: '/images/north.png', defineValue: '1' },
                    { key: 'SOUTH', value: 'Southern Hemisphere', image: '/images/south.png', defineValue: '0' }]
            },
        },
        {
            title: 'Board',
            label: 'Which microcontroller board are you using:',
            variable: 'board',
            preamble: ['// We are using the {v} board'],
            define: 'BOARD',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'MEGA', value: 'ATMega 2560 (or clone)', image: '/images/mega2560.png', defineValue: 'BOARD_AVR_MEGA2560' },
                    { key: 'ESP', value: 'ESP32', image: '/images/esp32.png', defineValue: 'BOARD_ESP32_ESP32DEV' },
                    { key: 'MKSV10', value: 'MKS GEN L V1.0', image: '/images/mksv10.png', defineValue: 'BOARD_AVR_MKS_GEN_L_V1' },
                    { key: 'MKSV20', value: 'MKS GEN L V2.0', image: '/images/mksv20.png', defineValue: 'BOARD_AVR_MKS_GEN_L_V2' },
                    { key: 'MKSV21', value: 'MKS GEN L V2.1', image: '/images/mksv21.png', defineValue: 'BOARD_AVR_MKS_GEN_L_V21' },
                ]
            },
        },
        {
            title: 'RA Stepper',
            label: 'Which stepper motor are you using for RA:',
            variable: 'rastpr',
            preamble: ['////////////////////////////////', '// RA Stepper configuration ', ' // See supported stepper values. Change according to the steppers you are using', '// Using the {v} stepper for RA'],
            define: 'RA_STEPPER_TYPE',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'BYJ', value: '28BYJ-48', image: '/images/byj48.png', defineValue: 'STEPPER_TYPE_28BYJ48', additionalLines: ['#define RA_DRIVER_TYPE DRIVER_TYPE_ULN2003'] },
                    { key: 'N1709', value: 'NEMA 17, 0.9°/step', image: '/images/nema17.png', defineValue: 'STEPPER_TYPE_NEMA17' },
                    { key: 'N1718', value: 'NEMA 17, 1.8°/step', image: '/images/nema17.png', defineValue: 'STEPPER_TYPE_NEMA17', additionalLines: ['#define RA_STEPPER_SPR 200'] },
                ]
            },
        },
        {
            title: 'RA Driver',
            label: 'Which driver board are you using to drive the RA stepper motor:',
            variable: 'radrv',
            condition: "$rastpr IN [N1709,N1718]",
            preamble: ['// Using the {v} driver for RA stepper motor'],
            define: 'RA_DRIVER_TYPE',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'ULN', value: 'ULN2003', image: '/images/uln2003.png', defineValue: 'DRIVER_TYPE_ULN2003' },
                    { key: 'A4988', value: 'Generic A4988', image: '/images/a4988.png', defineValue: 'DRIVER_TYPE_A4988_GENERIC' },
                    { key: 'TMC2209U', value: 'TMC2209-UART', image: '/images/tmc2209.png', defineValue: 'DRIVER_TYPE_TMC2209_UART' },
                    { key: 'TMC2209S', value: 'TMC2209-Standalone', image: '/images/tmc2209.png', defineValue: 'DRIVER_TYPE_TMC2209_STANDALONE' },
                ]
            },
        },
        {
            title: 'RA Advanced Settings',
            label: 'These are some advanced settings you may want to override. The defaults are set already. Please only change them if you are sure what they do and what their valid ranges are. Enter the RA stepper specs and desired settings:',
            variable: 'rapower',
            condition: "($fwversion IN [V19,V197,V1911,V1915]) AND ($radrv == TMC2209U)",
            preamble: ['// Define some RA stepper motor settings'],
            define: '',
            control: {
                type: 'textinput',
                choices: [
                    { key: 'P', label: 'Power rating in mA', defaultValue: 900, defineLine: '#define RA_MOTOR_CURRENT_RATING      {0} // mA' },
                    { key: 'O', label: 'Operating percentage', defaultValue: 80, defineLine: '#define RA_OPERATING_CURRENT_SETTING {0} // %' },
                    { key: 'A', label: 'Acceleration (steps/s/s)', defaultValue: 3000, defineLine: '#define RA_STEPPER_ACCELERATION {0}' },
                    { key: 'V', label: 'Maximum Speed (steps/s)', defaultValue: 1200, defineLine: '#define RA_STEPPER_SPEED {0}' },
                    { key: 'S', label: 'Microstepping while slewing', defaultValue: 8, defineLine: '#define RA_SLEW_MICROSTEPPING {0}' },
                    {
                        key: 'T', label: 'Microstepping while tracking', defaultValue: 64, defineLine: '#define RA_TRACKING_MICROSTEPPING {0}',
                        additionalLines: [
                            ' // TMC2209 Stealth Mode (spreadCycle) - When set to 0, tracking is more precise, but noisy (high-pitched sound). When set to 1, they are silent.',
                            '#define RA_UART_STEALTH_MODE     0'
                        ]
                    },
                ]
            },
        },
        {
            title: 'RA Advanced Settings',
            label: 'These are some advanced settings you may want to override. The defaults are set already. Please only change them if you are sure what they do and what their valid ranges are. Enter the RA stepper specs and desired settings:',
            variable: 'rapowerbjy',
            condition: "($fwversion == V18) AND ($rastpr == BYJ)",
            preamble: ['// Define some RA stepper motor settings'],
            define: '',
            control: {
                type: 'textinput',
                choices: [
                    { key: 'A', label: 'Acceleration (steps/s/s)', defaultValue: 600, defineLine: '#define RA_STEPPER_ACCELERATION {0}' },
                    { key: 'V', label: 'Maximum Speed (steps/s)', defaultValue: 400, defineLine: '#define RA_STEPPER_SPEED {0}' },
                ]
            },
        },
        {
            title: 'RA Pulley Teeth',
            label: 'How many teeth does your RA gear have?',
            variable: 'racog',
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
        {
            title: 'DEC Stepper',
            label: 'Which stepper motor are you using for DEC:',
            variable: 'decstpr',
            preamble: ['////////////////////////////////', '// DEC Stepper configuration ', ' // See supported stepper values. Change according to the steppers you are using', '// Using the {v} stepper for DEC'],
            define: 'DEC_STEPPER_TYPE',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'BYJ', value: '28BYJ-48', image: '/images/byj48.png', defineValue: 'STEPPER_TYPE_28BYJ48', additionalLines: ['#define DEC_DRIVER_TYPE DRIVER_TYPE_ULN2003'] },
                    { key: 'N1709', value: 'NEMA 17, 0.9°/step', image: '/images/nema17.png', defineValue: 'STEPPER_TYPE_NEMA17' },
                    { key: 'N1718', value: 'NEMA 17, 1.8°/step', image: '/images/nema17.png', defineValue: 'STEPPER_TYPE_NEMA17', additionalLines: ['#define DEC_STEPPER_SPR 200'] },
                    { key: 'N1409', value: 'NEMA 14, 0.9°/step', image: '/images/nema14.png', defineValue: 'STEPPER_TYPE_NEMA17' },
                    { key: 'N1418', value: 'NEMA 14, 1.8°/step', image: '/images/nema14.png', defineValue: 'STEPPER_TYPE_NEMA17', additionalLines: ['#define DEC_STEPPER_SPR 200'] },
                ]
            },
        },
        {
            title: 'DEC Driver',
            label: 'Which driver board are you using to drive the DEC stepper motor:',
            variable: 'decdrv',
            condition: "$decstpr IN [N1709,N1718,N1409,N1418]",
            preamble: ['// Using the {v} driver for DEC stepper'],
            define: 'DEC_DRIVER_TYPE',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'ULN', value: 'ULN2003', image: '/images/uln2003.png', defineValue: 'DRIVER_TYPE_ULN2003' },
                    { key: 'A4988', value: 'Generic A4988', image: '/images/a4988.png', defineValue: 'DRIVER_TYPE_A4988_GENERIC' },
                    { key: 'TMC2209U', value: 'TMC2209-UART', image: '/images/tmc2209.png', defineValue: 'DRIVER_TYPE_TMC2209_UART' },
                    { key: 'TMC2209S', value: 'TMC2209-Standalone', image: '/images/tmc2209.png', defineValue: 'DRIVER_TYPE_TMC2209_STANDALONE' },
                ]
            },
        },
        {
            title: 'DEC Advanced Settings',
            label: 'These are some advanced settings you may want to override. The defaults are set already. Please only change them if you are sure what they do and what their valid ranges are. Enter the DEC stepper specs and desired settings:',
            variable: 'decpower',
            condition: "($fwversion IN [V19,V197,V1911,V1915]) AND ($decdrv == TMC2209U)",
            preamble: ['// Define some DEC stepper motor settings'],
            define: '',
            control: {
                type: 'textinput',
                choices: [
                    { key: 'P', label: 'Power rating in mA', defaultValue: 900, defineLine: '#define DEC_MOTOR_CURRENT_RATING      {0} // mA' },
                    { key: 'O', label: 'Operating percentage', defaultValue: 80, defineLine: '#define DEC_OPERATING_CURRENT_SETTING {0} // %' },
                    { key: 'A', label: 'Acceleration (steps/s/s)', defaultValue: 3000, defineLine: '#define DEC_STEPPER_ACCELERATION {0}' },
                    { key: 'V', label: 'Maximum Speed (steps/s)', defaultValue: 1200, defineLine: '#define DEC_STEPPER_SPEED {0}' },
                    { key: 'S', label: 'Microstepping while slewing', defaultValue: 16, defineLine: '#define DEC_SLEW_MICROSTEPPING {0}' },
                    {
                        key: 'T', label: 'Microstepping while tracking', defaultValue: 64, defineLine: '#define DEC_GUIDE_MICROSTEPPING {0}',
                        additionalLines: [
                            ' // TMC2209 Stealth Mode (spreadCycle) - When set to 0, tracking is more precise, but noisy (high-pitched sound). When set to 1, they are silent.',
                            '#define DEC_UART_STEALTH_MODE     0'
                        ]
                    },
                ]
            },
        },
        {
            title: 'DEC Advanced Settings',
            label: 'These are some advanced settings you may want to override. The defaults are set already. Please only change them if you are sure what they do and what their valid ranges are. Enter the DEC stepper specs and desired settings:',
            variable: 'decpowerbjy',
            condition: "($fwversion == V18) AND ($decstpr == BYJ)",
            preamble: ['// Define some DEC stepper motor settings'],
            define: '',
            control: {
                type: 'textinput',
                choices: [
                    { key: 'A', label: 'Acceleration (steps/s/s)', defaultValue: 600, defineLine: '#define DEC_STEPPER_ACCELERATION {0}' },
                    { key: 'V', label: 'Maximum Speed (steps/s)', defaultValue: 400, defineLine: '#define DEC_STEPPER_SPEED {0}' },
                ]
            },
        },
        {
            title: 'DEC Pulley Teeth',
            label: 'How many teeth does your DEC gear have?',
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
        {
            title: 'Display',
            label: 'What kind of display are you using:',
            variable: 'display',
            define: 'DISPLAY_TYPE',
            preamble: ['////////////////////////////////', '// Display configuration ', '// Define the type of display we are using. Currently: {v}'],
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'NONE', value: 'No display', image: '/images/none.png', defineValue: 'DISPLAY_TYPE_NONE' },
                    { key: 'LCD', value: 'LCD Shield w/ keypad', image: '/images/lcdshield.png', defineValue: 'DISPLAY_TYPE_LCD_KEYPAD' },
                    { key: 'I08', value: 'I2C LCD Shield w/ MCP23008 controller', image: '/images/lcd23008.png', defineValue: 'DISPLAY_TYPE_LCD_KEYPAD_I2C_MCP23008' },
                    { key: 'I17', value: 'I2C LCD Shield w/ MCP23017 controller', image: '/images/lcd23017.png', defineValue: 'DISPLAY_TYPE_LCD_KEYPAD_I2C_MCP23017' },
                    { key: 'S13', value: 'I2C 32x128 OLED w/ joystick', image: '/images/ssd1306.png', defineValue: 'DISPLAY_TYPE_LCD_JOY_I2C_SSD1306' },
                ]
            },
        },
        {
            title: 'Use WiFi',
            label: 'Do you want to enable WiFi:',
            variable: 'wifi',
            condition: "$board == ESP",
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
            title: 'WiFi Mode',
            label: 'In what mode do you want to use WiFi:',
            condition: "$wifi == Y",
            variable: 'wifimode',
            preamble: ['// Using WiFi in mode {v}'],
            define: 'WIFI_MODE',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'INFRA', value: 'Infrastructure, all devices connect to same network', image: '/images/infra.png', defineValue: 'WIFI_MODE_INFRASTRUCTURE' },
                    { key: 'AP', value: 'Access Point, OAT is a hotspot', image: '/images/ap.png', defineValue: 'WIFI_MODE_AP_ONLY' },
                    { key: 'FAILOVER', value: 'Infrastructure with failover to Access Point', image: '/images/failover.png', defineValue: 'WIFI_MODE_ATTEMPT_INFRASTRUCTURE_FAIL_TO_AP' },
                ]
            },
        },
        {
            title: 'WiFi Infrastructure Setup',
            label: 'Enter the WiFi parameters for Infrastructure mode:',
            variable: 'wifiparamsi',
            condition: "($wifi == Y) AND ($wifimode == INFRA)",
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
            title: 'WiFi Access Point Setup',
            label: 'Enter the WiFi parameters for Access Point mode:',
            variable: 'wifiparamsa',
            condition: "($wifi == Y) AND ($wifimode == AP)",
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
            title: 'WiFi Failover Setup',
            label: 'Enter the WiFi parameters for Failover mode:',
            variable: 'wifiparamsf',
            condition: "($wifi == Y) AND ($wifimode == FAILOVER)",
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
        {
            title: 'GPS',
            label: 'Do you have the GPS add on:',
            variable: 'gps',
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
        {
            title: 'Digital Level',
            label: 'Do you have the Digital Level add on:',
            variable: 'gyro',
            preamble: ['////////////////////////////////', '// Digital Level Addon configuration ', '// Define whether we have the Digital Level or not. Currently: {v}'],
            condition: "($fwversion == V1915) AND ($board == MEGA)",
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
        {
            title: 'Digital Level',
            label: 'Do you have the Digital Level add on:',
            variable: 'gyromks',
            preamble: ['////////////////////////////////', '// Digital Level Addon configuration ', '// Define whether we have the Digital Level or not. Currently: {v}'],
            condition: "($fwversion == V1915) AND ($board == MKSV21)",
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

        //  V1.9.06 and lower begins //////////////////////////////////////
        {
            title: 'Auto Polar Align',
            label: 'Do you have the AutoPA add on:',
            variable: 'autopa',
            condition: "$fwversion IN [V19,V18]",
            preamble: ['////////////////////////////////', '// AutoPA Addon configuration ', '// Define whether we have the AutoPA add on or not. Currently: {v}'],
            define: 'AZIMUTH_ALTITUDE_MOTORS',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'N', value: 'No AutoPA', image: '/images/none.png', defineValue: '0' },
                    { key: 'Y', value: 'AutoPA is installed', image: '/images/autopa.png', defineValue: '1' },
                ]
            },
        },
        {
            title: 'Azimuth Stepper',
            label: 'Which stepper motor are you using for the Azimuth:',
            variable: 'az',
            condition: "$autopa == Y",
            preamble: ['// Using the {v} stepper for AZ'],
            define: 'AZ_STEPPER_TYPE',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'B', value: '28BYJ-48', image: '/images/byj48.png', defineValue: 'STEPPER_TYPE_28BYJ48', additionalLines: ['#define AZ_DRIVER_TYPE DRIVER_TYPE_ULN2003'] },
                    { key: 'N', value: 'NEMA 17, 0.9°/step', image: '/images/nema17.png', defineValue: 'STEPPER_TYPE_NEMA17' },
                ]
            },
        },
        {
            title: 'Azimuth Driver',
            label: 'Which driver board are you using to drive the Azimuth stepper motor:',
            variable: 'azdrv',
            condition: "$az == N",
            preamble: ['// Using the {v} driver for AZ stepper motor'],
            define: 'AZ_DRIVER_TYPE',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'U', value: 'ULN2003', image: '/images/uln2003.png', defineValue: 'DRIVER_TYPE_ULN2003' },
                    { key: 'A', value: 'Generic A4988', image: '/images/a4988.png', defineValue: 'DRIVER_TYPE_A4988_GENERIC' },
                    { key: 'TMC2209U', value: 'TMC2209-UART', image: '/images/tmc2209.png', defineValue: 'DRIVER_TYPE_TMC2209_UART' },
                    { key: 'TMC2209S', value: 'TMC2209-Standalone', image: '/images/tmc2209.png', defineValue: 'DRIVER_TYPE_TMC2209_STANDALONE' },
                ]
            },
        },
        {
            title: 'Azimuth Advanced Settings',
            label: 'These are some advanced settings you may want to override. The defaults are set already. Please only change them if you are sure what they do and what their valid ranges are. Enter the AZ stepper specs and desired settings:',
            variable: 'azpower',
            condition: "($fwversion IN [V19,V197,V1911,V1915]) AND ($azdrv == TMC2209U)",
            preamble: ['// Define AZ stepper motor power settings'],
            define: '',
            control: {
                type: 'textinput',
                choices: [
                    { key: 'P', label: 'Power rating in mA', defaultValue: 900, defineLine: '#define AZ_MOTOR_CURRENT_RATING      {0} // mA' },
                    { key: 'O', label: 'Operating percentage', defaultValue: 80, defineLine: '#define AZ_OPERATING_CURRENT_SETTING {0} // %' },
                ]
            },
        },
        {
            title: 'Altitude Stepper',
            label: 'Which stepper motor are you using for the Altitude:',
            variable: 'alt',
            condition: "$autopa == Y",
            preamble: ['// Using the {v} stepper for ALT'],
            define: 'ALT_STEPPER_TYPE',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'B', value: '28BYJ-48', image: '/images/byj48.png', defineValue: 'STEPPER_TYPE_28BYJ48', additionalLines: ['#define ALT_DRIVER_TYPE DRIVER_TYPE_ULN2003'] },
                    { key: 'N', value: 'NEMA 17, 0.9°/step', image: '/images/nema17.png', defineValue: 'STEPPER_TYPE_NEMA17' },
                ]
            },
        },
        {
            title: 'Altitude Driver',
            label: 'Which driver board are you using to drive the Altitude stepper motor:',
            variable: 'altdrv',
            condition: "$alt == N",
            preamble: ['// Using the {v} driver for ALT stepper motor'],
            define: 'ALT_DRIVER_TYPE',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'U', value: 'ULN2003', image: '/images/uln2003.png', defineValue: 'DRIVER_TYPE_ULN2003' },
                    { key: 'A', value: 'Generic A4988', image: '/images/a4988.png', defineValue: 'DRIVER_TYPE_A4988_GENERIC' },
                    { key: 'TMC2209U', value: 'TMC2209-UART', image: '/images/tmc2209.png', defineValue: 'DRIVER_TYPE_TMC2209_UART' },
                    { key: 'TMC2209S', value: 'TMC2209-Standalone', image: '/images/tmc2209.png', defineValue: 'DRIVER_TYPE_TMC2209_STANDALONE' },
                ]
            },
        },
        {
            title: 'Altitude Advanced Settings',
            label: 'These are some advanced settings you may want to override. The defaults are set already. Please only change them if you are sure what they do and what their valid ranges are. Enter the ALT stepper specs and desired settings:',
            variable: 'altpower',
            condition: "($fwversion IN [V19,V197,V1911,V1915]) AND ($altdrv == TMC2209U)",
            preamble: ['// Define ALT stepper motor power settings'],
            define: '',
            control: {
                type: 'textinput',
                choices: [
                    { key: 'P', label: 'Power rating in mA', defaultValue: 900, defineLine: '#define ALT_MOTOR_CURRENT_RATING      {0} // mA' },
                    { key: 'O', label: 'Operating percentage', defaultValue: 80, defineLine: '#define ALT_OPERATING_CURRENT_SETTING {0} // %' },
                ]
            },
        },
        // V1.9.06 and lower ends //////////////////////////////////////

        // V1.9.07 and later begins //////////////////////////////////////
        {
            title: 'Auto Polar Align',
            label: 'Do you have the AutoPA add on:',
            variable: 'autopa907',
            condition: "$fwversion IN [V197,V1911,V1915]",
            preamble: ['////////////////////////////////', '// AutoPA Addon configuration ', '// Define whether we have the AutoPA add on or not. Currently: {v}'],
            define: '',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'N', value: 'No AutoPA', image: '/images/none.png', additionalLines: ['// No AutoPA settings'] },
                    { key: 'ALT', value: 'Altitude stepper only', image: '/images/autopa_alt.png' },
                    { key: 'AZ', value: 'Azimuth stepper only', image: '/images/autopa_az.png' },
                    { key: 'ALTAZ', value: 'Full AutoPA is installed', image: '/images/autopa.png' },
                ]
            },
        },
        {
            title: 'Azimuth Stepper',
            label: 'Which stepper motor are you using for the Azimuth:',
            variable: 'az907',
            condition: "$autopa907 IN [AZ,ALTAZ]",
            preamble: ['// Using the {v} stepper for AZ'],
            define: 'AZ_STEPPER_TYPE',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'BYJ', value: '28BYJ-48', image: '/images/byj48.png', defineValue: 'STEPPER_TYPE_28BYJ48' , additionalLines: ['#define AZ_DRIVER_TYPE DRIVER_TYPE_ULN2003']  },
                    { key: 'BYJMOD', value: '28BYJ-48 (Bipolar)', image: '/images/byj48mod.png', defineValue: 'STEPPER_TYPE_28BYJ48'},
                    { key: 'NEMA', value: 'NEMA 17, 0.9°/step', image: '/images/nema17.png', defineValue: 'STEPPER_TYPE_NEMA17' },
                ]
            },
        },
        {
            title: 'Azimuth Driver',
            label: 'Which driver board are you using to drive the Azimuth stepper motor:',
            variable: 'azdrv907',
            condition: "($az907 == NEMA) OR ($az907 == BYJMOD)",
            preamble: ['// Using the {v} driver for AZ stepper motor'],
            define: 'AZ_DRIVER_TYPE',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'A', value: 'Generic A4988', image: '/images/a4988.png', defineValue: 'DRIVER_TYPE_A4988_GENERIC' },
                    { key: 'TMC2209S', value: 'TMC2209-Standalone', image: '/images/tmc2209.png', defineValue: 'DRIVER_TYPE_TMC2209_STANDALONE' },
                    { key: 'TMC2209U', value: 'TMC2209-UART', image: '/images/tmc2209.png', defineValue: 'DRIVER_TYPE_TMC2209_UART' },
                ]
            },
        },
        {
            title: 'Azimuth Advanced Settings',
            label: 'These are some advanced settings you may want to override. The defaults are set already. Please only change them if you are sure what they do and what their valid ranges are. Enter the AZ stepper specs and desired settings:',
            variable: 'azpower907',
            condition: "($fwversion IN [V19,V197,V1911,V1915]) AND ($azdrv907 == TMC2209U)",
            preamble: ['// Define AZ stepper motor power settings'],
            define: '',
            control: {
                type: 'textinput',
                choices: [
                    { key: 'P', label: 'Power rating in mA', defaultValue: 900, defineLine: '#define AZ_MOTOR_CURRENT_RATING      {0} // mA' },
                    { key: 'O', label: 'Operating percentage', defaultValue: 80, defineLine: '#define AZ_OPERATING_CURRENT_SETTING {0} // %' },
                ]
            },
        },
        {
            title: 'Altitude Stepper',
            label: 'Which stepper motor are you using for the Altitude:',
            variable: 'alt907',
            condition: "$autopa907 IN [ALT,ALTAZ]",
            preamble: ['// Using the {v} stepper for ALT'],
            define: 'ALT_STEPPER_TYPE',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'BYJ', value: '28BYJ-48', image: '/images/byj48.png', defineValue: 'STEPPER_TYPE_28BYJ48', additionalLines: ['#define ALT_DRIVER_TYPE DRIVER_TYPE_ULN2003'] },
                    { key: 'BYJMOD', value: '28BYJ-48 (Bipolar)', image: '/images/byj48mod.png', defineValue: 'STEPPER_TYPE_28BYJ48' },
                    { key: 'NEMA', value: 'NEMA 17, 0.9°/step', image: '/images/nema17.png', defineValue: 'STEPPER_TYPE_NEMA17' },
                ]
            },
        },
        {
            title: 'Altitude Driver',
            label: 'Which driver board are you using to drive the Altitude stepper motor:',
            variable: 'altdrv907',
            condition: "($alt907 == NEMA) OR ($alt907 == BYJMOD)",
            preamble: ['// Using the {v} driver for ALT stepper motor'],
            define: 'ALT_DRIVER_TYPE',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'A4988', value: 'Generic A4988', image: '/images/a4988.png', defineValue: 'DRIVER_TYPE_A4988_GENERIC' },
                    { key: 'TMC2209U', value: 'TMC2209-UART', image: '/images/tmc2209.png', defineValue: 'DRIVER_TYPE_TMC2209_UART' },
                    { key: 'TMC2209S', value: 'TMC2209-Standalone', image: '/images/tmc2209.png', defineValue: 'DRIVER_TYPE_TMC2209_STANDALONE' },
                ]
            },
        },
        {
            title: 'Altitude Advanced Settings',
            label: 'These are some advanced settings you may want to override. The defaults are set already. Please only change them if you are sure what they do and what their valid ranges are. Enter the ALT stepper specs and desired settings:',
            variable: 'altpower907',
            condition: "($fwversion IN [V19,V197,V1911,V1915]) AND ($altdrv907 == TMC2209U)",
            preamble: ['// Define ALT stepper motor power settings'],
            define: '',
            control: {
                type: 'textinput',
                choices: [
                    { key: 'P', label: 'Power rating in mA', defaultValue: 900, defineLine: '#define ALT_MOTOR_CURRENT_RATING      {0} // mA' },
                    { key: 'O', label: 'Operating percentage', defaultValue: 80, defineLine: '#define ALT_OPERATING_CURRENT_SETTING {0} // %' },
                ]
            },
        },
        // V1.9.07 ends //////////////////////////////////////

        // V1.9.11 and later begins //////////////////////////////////////
        {
            title: 'Focuser support',
            label: 'Do you want to support a focuser on E1:',
            variable: 'focuser',
            condition: "($fwversion IN [V1911,V1915]) AND ($board == MKSV21)",
            preamble: ['////////////////////////////////', '// Focuser configuration ', '// Define whether to support a focusing stepper motor on E1 or not. Currently: {v}'],
            define: '',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'N', value: 'No Focuser', image: '/images/none.png', additionalLines: ['// No AutoPA settings'] },
                    { key: 'Y', value: 'Focuser stepper', image: '/images/none.png' },
                ]
            },
        },
        {
            title: 'Focuser Stepper',
            label: 'Which stepper motor are you using for the Focuser:',
            variable: 'focusmotor',
            condition: "$focuser == Y",
            preamble: ['// Using the {v} stepper for FOC'],
            define: 'FOCUS_STEPPER_TYPE',
            control: {
                type: 'radioimg',
                choices: [
                    { key: 'BYJ', value: '28BYJ-48', image: '/images/byj48.png', defineValue: 'STEPPER_TYPE_28BYJ48', additionalLines: ['#define FOCUS_DRIVER_TYPE  DRIVER_TYPE_ULN2003'] },
                    { key: 'NEMA17', value: 'NEMA 17 w/ TMC2209 UART', image: '/images/nema17.png', defineValue: 'STEPPER_TYPE_NEMA17', additionalLines: ['#define FOCUS_DRIVER_TYPE  DRIVER_TYPE_TMC2209_UART'] },
                ]
            },
        },
        {
            title: 'Focuser Advanced Settings',
            label: 'These are some advanced settings you may want to override. The defaults are set already. Please only change them if you are sure what they do and what their valid ranges are. Enter the Focus stepper specs and desired settings:',
            variable: 'focuspower',
            condition: "$focusmotor == NEMA17",
            preamble: ['// Define Focus stepper motor power settings'],
            define: '',
            control: {
                type: 'textinput',
                choices: [
                    { key: 'P', label: 'Power rating in mA', defaultValue: 900, defineLine: '#define FOCUS_MOTOR_CURRENT_RATING      {0} // mA', additionalLines: ['#define FOCUS_STEPPER_SPR               400 // steps/rev', '#define FOCUS_UART_STEALTH_MODE          1 // silent?'] },
                    { key: 'O', label: 'Operating percentage', defaultValue: 80, defineLine: '#define FOCUS_OPERATING_CURRENT_SETTING {0} // %' },
                    { key: 'A', label: 'Acceleration (steps/s/s)', defaultValue: 3000, defineLine: '#define FOCUS_STEPPER_ACCELERATION      {0} // steps/s/s' },
                    { key: 'V', label: 'Maximum Speed (steps/s)', defaultValue: 1500, defineLine: '#define FOCUS_STEPPER_SPEED             {0} // steps/s' },
                    { key: 'S', label: 'Microstepping while slewing', defaultValue: 16, defineLine: '#define FOCUS_MICROSTEPPING             {0} // steps' },
                ]
            },
        },

        // V1.9.11 and later ends //////////////////////////////////////
    ];

    if (stepIndex < 0) {
        return <div />
    }

    let steps = [];

    stepProps.forEach((step, index) => {
        let title = step.title;
        let description;
        if (index < stepIndex) {
            let foundConfig = configuration.find(config => config.variable === stepProps[index].variable);
            if (foundConfig && !Array.isArray(foundConfig.value)) {
                let foundControl = stepProps[index].control.choices.find(choice => foundConfig.value === choice.key);
                if (!foundControl) {
                    console.log("Could not find control ", foundConfig)
                }
                description = foundControl.value;
            }
        }

        let skipState = shouldSkipStep(index);
        if ((skipState.skip) && (index < stepIndex)) {
            description = "N/A, skipped.";
        }

        if ((!skipState.skip) || (index <= stepIndex)) {
            steps.push(<Step title={title} description={description} />)
        }
    });

    steps.push(<Step title='Completed' />)

    if (showResult) {
        let defines = [];
        configuration.forEach(config => {
            let property = stepProps.find(prop => prop.variable === config.variable);
            let defineLine = null;
            if (property.control.type === 'textinput') {
                if (property.preamble) {
                    defines = [...defines, ...property.preamble];
                }
                property.control.choices.forEach(choice => {
                    let configVal = config.value.find(cfgval => cfgval.key === choice.key);
                    let val = (configVal ? configVal.value : null) || choice.defaultValue || '';
                    defineLine = choice.defineLine.replace('{0}', val);
                    defines = [...defines, defineLine];
                    if (choice.additionalLines) {
                        defines = [...defines, ...choice.additionalLines];
                    }
                })
            }
            else {
                let propertyValue = property.control.choices.find(choice => choice.key === config.value);
                if (property.preamble) {
                    defines = [...defines, ...(property.preamble.map((pre) => pre.replace('{v}', propertyValue.value)))];
                }
                if (property.define) {
                    defines = [...defines, '#define ' + property.define + ' ' + propertyValue.defineValue];
                }
                if (propertyValue.additionalLines) {
                    defines = [...defines, ...propertyValue.additionalLines];
                }
            }
            defines = [...defines, ''];
        });

        return <div className='steps-container'>
            <div className='steps-column'>
                <Steps current={stepIndex} direction='vertical'>
                    {steps}
                </Steps>
            </div>
            <div className='list-container' ref={downloadParentRef}>
                <h2>Local configuration file</h2>
                <p>Copy/paste the following into your Configuration_local.hpp file</p>
                {
                    defines.map(define => <p className='code'>{define}&nbsp;</p>)
                }
                <p className='code'>#define DEBUG_LEVEL (DEBUG_NONE)</p>
                <br />
                <br />
                <div className='back-button' >
                    <Button type='primary' onClick={() => downloadTxtFile(defines)}>Open as Text in new Tab</Button>
                </div>


                <div className='back-button' >
                    <Button type='primary' onClick={() => onRestart()}>Restart</Button>
                </div>
            </div>
        </div>

    } else {
        let control = null
        const stepControl = stepProps[stepIndex].control;
        switch (stepControl.type) {
            case 'combo':
                control = <Select onSelect={(e) => onSelect(stepIndex, e)}>
                    {stepControl.choices.map((ch) => <Select.Option value={ch.key}>{ch.value}</Select.Option>)}
                </Select>

                break;

            case 'radio':
                control = <Radio.Group onChange={(e) => onSelect(stepIndex, e.target.value)} buttonStyle='solid'>
                    {stepControl.choices.map((ch) => <Radio.Button value={ch.key}>{ch.value}</Radio.Button>)}
                </Radio.Group>

                break;

            case 'radioimg':
                control = <List
                    bordered
                    itemLayout='horizontal'
                    dataSource={stepControl.choices}
                    renderItem={item =>
                        <List.Item>
                            <Button value={item.value} onClick={(e) => onSelect(stepIndex, item.key)} >{item.value}</Button>
                            <Image className='image-column' src={item.image} />
                        </List.Item>
                    }
                />

                break;

            case 'textinput':
                control = <>
                    { stepControl.choices.map(input =>
                        <div style={{ marginBottom: '10pt' }}>
                            <Input addonBefore={input.label} placeholder={input.label} defaultValue={input.defaultValue} onChange={(e) => onChangedText(stepIndex, input.key, e.target.value)} />
                        </div>
                    )}
                    <div className='back-button' >
                        <Button value='OK' type='primary' onClick={(e) => onChangedText(stepIndex, '$OK')} >Next</Button>
                    </div>
                    <br></br>
                </>

                break;
            default:
                break;
        }

        return <div className='steps-container'>
            <div className='steps-column'>
                <Steps current={stepIndex} direction='vertical'>
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
                    <Button type='primary' onClick={() => setStepIndex(stepIndex - 1)} disabled={stepIndex < 1}>Back</Button>
                </div>
            </div>
        </div>
    }
}

export default WizardStep;
