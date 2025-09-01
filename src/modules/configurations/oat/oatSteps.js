// OAT Configuration Steps
import { 
    createTrackerSelectionStep, 
    createHemisphereStep, 
    createTrackingOnBootStep,
    createBoardStep,
    createRADriverStep,
    createRAPulleyTeethStep,
    createDECStepperStep,
    createDECDriverStep,
    createDECPulleyTeethStep,
    createStepperStealthModeStep,
    createDisplayStep,
    createInfoDisplayStep,
    createWiFiSteps,
    createFocuserSteps,
    createHallSensorSteps
} from '../base/commonSteps.js';
import { Defaults } from '../base/sharedDefaults.js';

export const getOATSteps = () => [
    createTrackerSelectionStep(),
    {
        id: 'FWT',
        title: 'Firmware',
        label: 'Which firmware version are you planning to configure/build:',
        variable: 'fwversion',
        define: '',
        control: {
            type: 'radioimg',
            choices: [
                { key: 'L', value: 'Latest Version (V1.13.x)', image: '/images/none.png', defineValue: '' },
                { key: 'O', value: 'Official Versions (V1.11.x)', image: '/images/none.png', defineValue: '' },
            ]
        },
    },
    createHemisphereStep(),
    {
        id: 'SL',
        title: 'Stepper Library',
        label: 'Which Stepper Library do you want to use for RA and DEC:',
        variable: 'stepperlib',
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
    createBoardStep(),
    {
        id: 'RST',
        title: 'RA Stepper',
        label: 'Which stepper motor are you using for RA:',
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
    createRADriverStep(),
    {
        id: 'RAT',
        title: 'RA Advanced Settings',
        label: 'These are some advanced settings you may want to override. The defaults are set already. Please only change them if you are sure what they do and what their valid ranges are. Enter the RA stepper specs and desired settings:',
        variable: 'rapower',
        condition: "($radrv == TU)",
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
        }]
    },
    createTrackingOnBootStep(),
    createRAPulleyTeethStep(),
    createDECStepperStep(),
    createDECDriverStep(),
    {
        id: 'DAT',
        title: 'DEC Advanced Settings',
        label: 'These are some advanced settings you may want to override. The defaults are set already. Please only change them if you are sure what they do and what their valid ranges are. Enter the DEC stepper specs and desired settings:',
        variable: 'decpower',
        condition: "($decdrv == TU)",
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
        }]
    },
    createDECPulleyTeethStep(),
    {
        id: 'DLI',
        title: 'DEC Movement Limits',
        label: 'These are required settings to determine how far DEC can move up and down from the Home position without hitting any hardware limits:',
        variable: 'declimits',
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
    createStepperStealthModeStep(),
    createDisplayStep(),
    createInfoDisplayStep(),
    ...createWiFiSteps(),
    {
        id: 'GP',
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
    {
        id: 'DL',
        title: 'Digital Level',
        label: 'Do you have the Digital Level add on:',
        variable: 'gyro',
        preamble: ['////////////////////////////////', '// Digital Level Addon configuration ', '// Define whether we have the Digital Level or not. Currently: {v}'],
        condition: "($board == M)",
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
    {
        id: 'LM',
        title: 'Digital Level',
        label: 'Do you have the Digital Level add on:',
        variable: 'gyromks',
        preamble: ['////////////////////////////////', '// Digital Level Addon configuration ', '// Define whether we have the Digital Level or not. Currently: {v}'],
        condition: "($board == M21)",
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
    ...createFocuserSteps(),
    {
        id: 'APT',
        title: 'Auto Polar Align',
        label: 'Do you have the AutoPA add on:',
        variable: 'autopa',
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
    {
        id: 'AV',
        title: 'AutoPA Version',
        label: 'What version of AutoPA do you have installed:',
        variable: 'autopaversion',
        condition: "($autopa == Y)",
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
    {
        id: 'ZST',
        title: 'Azimuth Stepper',
        label: 'Which stepper motor are you using for the Azimuth:',
        variable: 'az',
        condition: "($autopa == Y)",
        preamble: ['// Using the {v} stepper for AZ'],
        define: 'AZ_STEPPER_TYPE',
        control: {
            type: 'radioimg',
            choices: [
                { key: 'BY', value: 'Modded 28BYJ-48 (Bipolar)', image: '/images/byj48mod.png', defineValue: 'STEPPER_TYPE_ENABLED', additionalLines: ['#define AZ_STEPPER_SPR 2048.0f'] },
                { key: 'N9', value: 'NEMA 17, 0.9°/step', image: '/images/nema17.png', defineValue: 'STEPPER_TYPE_ENABLED' },
                { key: 'N8', value: 'NEMA 17, 1.8°/step', image: '/images/nema17.png', defineValue: 'STEPPER_TYPE_ENABLED', additionalLines: ['#define AZ_STEPPER_SPR 200.0f'] },
            ]
        },
    },
    {
        id: 'ZD',
        title: 'Azimuth Driver',
        label: 'Which stepper driver are you using to drive the Azimuth stepper motor:',
        variable: 'azdrv',
        condition: "($autopa == Y)",
        preamble: ['// Using the {v} driver for AZ stepper motor'],
        define: 'AZ_DRIVER_TYPE',
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
        id: 'ZA',
        title: 'Azimuth Advanced Settings',
        label: 'These are some advanced settings you may want to override. The defaults are set already. Please only change them if you are sure what they do and what their valid ranges are. Enter the AZ stepper specs and desired settings:',
        variable: 'azpower',
        condition: "($azdrv == TU)",
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
        }],
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
    {
        id: 'ZAO',
        title: 'Azimuth Always On',
        label: 'It is possible to keep the azimuth motor energized at all times to prevent any shifting in position. This is not necessarily needed for 28BYJ motors, however it is recommended for NEMAs when using AutoPA V2.0.',
        variable: 'azalwayson',
        condition: "($autopa == Y)",
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
        condition: "($autopa == Y)",
        preamble: ['// Using the {v} stepper for ALT'],
        define: 'ALT_STEPPER_TYPE',
        control: {
            type: 'radioimg',
            choices: [
                { key: 'BY', value: 'Modded 28BYJ-48 (Bipolar)', image: '/images/byj48mod.png', defineValue: 'STEPPER_TYPE_ENABLED', additionalLines: ['#define ALT_STEPPER_SPR 2048.0f'] },
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
        condition: "($autopa == Y)",
        preamble: ['// Using the {v} driver for ALT stepper motor'],
        define: 'ALT_DRIVER_TYPE',
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
        id: 'LA',
        title: 'Altitude Advanced Settings',
        label: 'These are some advanced settings you may want to override. The defaults are set already. Please only change them if you are sure what they do and what their valid ranges are. Enter the ALT stepper specs and desired settings:',
        variable: 'altpower',
        condition: "($altdrv == TU)",
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
            literal: [
                '#define ALT_STEPPER_SPEED             2000',
                '#define ALT_STEPPER_ACCELERATION      1000',
                '',
                '// Is it going the wrong way?',
                '#define ALT_INVERT_DIR 0'
            ]
        }]
    },
    {
        id: 'LAO',
        title: 'Altitude Always On',
        label: 'It is possible to keep the altitude motor energized at all times to prevent any shifting in position. This is usually not needed.',
        variable: 'altalwayson',
        condition: "($autopa == Y)",
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
    ...createHallSensorSteps()
];