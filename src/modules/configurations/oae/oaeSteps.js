// OAE Configuration Steps
import { 
    createTrackerSelectionStep,
    createHemisphereStep,
    createBoardStep,
    createRADriverStep,
    createRAPulleyTeethStep,
    createDECDriverStep,
    createTrackingOnBootStep,
    createStepperStealthModeStep,
    createWiFiSteps,
    createFocuserSteps,
    createHallSensorSteps,
    createAutoPASteps
} from '../base/commonSteps.js';
import { Defaults } from '../base/sharedDefaults.js';

export const getOAESteps = () => [
    createTrackerSelectionStep(),
    {
        id: 'FWE',
        title: 'Firmware',
        label: 'You must use V1.13.x firmware on OAE:',
        variable: 'fwversion',
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
    createHemisphereStep(),
    createBoardStep(),
    {
        id: 'RSE',
        title: 'RA Stepper',
        label: 'Which stepper motor are you using for RA:',
        variable: 'rastpr',
        preamble: ['////////////////////////////////', '// RA Stepper configuration (OAE)', '// See supported stepper values. Change according to the steppers you are using', '// Using the {v} stepper for RA'],
        define: 'RA_STEPPER_TYPE',
        control: {
            type: 'radioimg',
            choices: [
                { key: 'N9', value: 'NEMA 17, 0.9°/step', image: '/images/nema17.png', defineValue: 'STEPPER_TYPE_ENABLED', additionalLines: ['#define RA_STEPPER_SPR                 (400 * 9)   // change to (200 * 9) for 1.8° stepper',] },
                { key: 'N8', value: 'NEMA 17, 1.8°/step', image: '/images/nema17.png', defineValue: 'STEPPER_TYPE_ENABLED', additionalLines: ['#define RA_STEPPER_SPR                 (200 * 9)   // change to (400 * 9) for 0.9° stepper',] },
            ]
        },
    },
    createRADriverStep(),
    {
        id: 'RAE',
        title: 'RA Advanced Settings',
        label: 'These are some advanced settings you may want to override. The defaults are set already. Please only change them if you are sure what they do and what their valid ranges are. Enter the RA stepper specs and desired settings:',
        variable: 'rapower',
        condition: "($radrv == TU)",
        preamble: ['// Define some RA stepper motor settings'],
        define: '',
        control: {
            type: 'textinput',
            choices: [
                { key: 'P', label: 'Power rating in mA', defaultValue: '{Defaults.OAEPowerRating.rastpr}', defineLine: '#define RA_MOTOR_CURRENT_RATING        {0} // mA' },
                { key: 'O', label: 'Operating percentage', defaultValue: '{Defaults.OAEPowerUtilization.rastpr}', defineLine: '#define RA_OPERATING_CURRENT_SETTING   {0} // %' },
                { key: 'S', label: 'Microstepping while slewing', defaultValue: '{Defaults.OAESlewMicrostepping.rastpr}', defineLine: '#define RA_SLEW_MICROSTEPPING          {0}' },
                { key: 'T', label: 'Microstepping while tracking', defaultValue: '{Defaults.OAETrackMicrostepping.rastpr}', defineLine: '#define RA_TRACKING_MICROSTEPPING      {0}' },
            ]
        },
        postamble: [{
            literal: [
                '',
                '// Is it going the wrong way?',
                '#define RA_INVERT_DIR  0',
                '',
                '// Define some RA stepper motor settings',
                '',
                '#define RA_SLEWING_SPEED_DEGREE 4',
                '#define RA_ACCEL_SecToFullSpeed 1.5  // Seconds to reach full slewing speed',
                '',
                '#define RA_STEPPER_SPEED RA_SLEWING_SPEED_DEGREE * (RA_STEPPER_SPR * RA_SLEW_MICROSTEPPING * (RA_WHEEL_CIRCUMFERENCE / (RA_PULLEY_TEETH * GT2_BELT_PITCH)) / 360)  //3525',
                '#define RA_STEPPER_ACCELERATION (RA_STEPPER_SPEED / RA_ACCEL_SecToFullSpeed)'
            ]
        }]
    },
    createRAPulleyTeethStep(),
    {
        id: 'DTE',
        title: 'DEC Pulley Teeth',
        label: 'How many teeth does your DEC gear have?',
        variable: 'deccog',
        preamble: ['// Using the {v} for DEC belt'],
        define: 'DEC_PULLEY_TEETH',
        control: {
            type: 'radioimg',
            choices: [
                { key: '1', value: '60 tooth gear', image: '/images/cog60t.png', defineValue: '60' },
                { key: '2', value: '50 tooth gear (recommended)', image: '/images/cog50t.png', defineValue: '50' },
                { key: '3', value: '40 tooth gear', image: '/images/cog40t.png', defineValue: '40' },
            ]
        },
    },
    {
         id: 'DSE',
        title: 'DEC Stepper',
        label: 'Which stepper motor are you using for DEC:',
        variable: 'decstpr',
        preamble: ['////////////////////////////////', '// DEC Stepper configuration ', '// See supported stepper values. Change according to the steppers you are using', '// Using the {v} stepper for DEC'],
        define: 'DEC_STEPPER_TYPE',
        control: {
            type: 'radioimg',
            choices: [
                {
                    key: 'N9O',
                    value: 'NEMA 17, 0.9°/step',
                    image: '/images/nema17.png',
                    defineValue: 'STEPPER_TYPE_ENABLED',
                    additionalLines: ['#define DEC_STEPPER_SPR                (400 * DEC_PULLEY_TEETH * 4.5f)  // change "200" to "400" for 0.9° stepper']
                },
                 {
                    key: 'N8O',
                    value: 'NEMA 17, 1.8°/step',
                    image: '/images/nema17.png',
                    defineValue: 'STEPPER_TYPE_ENABLED',
                    additionalLines: ['#define DEC_STEPPER_SPR                (200 * DEC_PULLEY_TEETH * 4.5f)  // change "400" to "200" for 1.8° stepper']
                },
             ]
        },
        postamble: [{
            literal: ['#define DEC_WHEEL_CIRCUMFERENCE        1.0f'],
        }],
    },
    createDECDriverStep(),
    {
        id: 'DAE',
        title: 'DEC Advanced Settings',
        label: 'These are some advanced settings you may want to override. The defaults are set already. Please only change them if you are sure what they do and what their valid ranges are. Enter the DEC stepper specs and desired settings:',
        variable: 'decpower',
        condition: "($decdrv == TU)",
        preamble: ['// Define some DEC stepper motor settings'],
        define: '',
        control: {
            type: 'textinput',
            choices: [
                { key: 'P', label: 'Power rating in mA', defaultValue: '{Defaults.OAEPowerRating.decstpr}', defineLine: '#define DEC_MOTOR_CURRENT_RATING       {0} // mA' },
                { key: 'O', label: 'Operating percentage', defaultValue: '{Defaults.OAEPowerUtilization.decstpr}', defineLine: '#define DEC_OPERATING_CURRENT_SETTING  {0} // %' },
                { key: 'S', label: 'Microstepping while slewing', defaultValue: '{Defaults.OAESlewMicrostepping.decstpr}', defineLine: '#define DEC_SLEW_MICROSTEPPING         {0}' },
                { key: 'T', label: 'Microstepping while guiding', defaultValue: '{Defaults.OAETrackMicrostepping.decstpr}', defineLine: '#define DEC_GUIDE_MICROSTEPPING        {0}' },
            ]
        },
        postamble: [{
            literal: [
                '',
                '// Is it going the wrong way?',
                '#define DEC_INVERT_DIR  1',
                '',
                '#define DEC_SLEWING_SPEED_DEGREE RA_SLEWING_SPEED_DEGREE',
                '#define DEC_ACCEL_SecToFullSpeed RA_ACCEL_SecToFullSpeed',
                '',
                '#define DEC_STEPPER_SPEED DEC_SLEWING_SPEED_DEGREE * (DEC_STEPPER_SPR * DEC_SLEW_MICROSTEPPING / 360 ) // * (DEC_WHEEL_CIRCUMFERENCE / (DEC_PULLEY_TEETH * GT2_BELT_PITCH)) / 360)',
                '#define DEC_STEPPER_ACCELERATION (DEC_STEPPER_SPEED / DEC_ACCEL_SecToFullSpeed)'
            ]
        }]
    },
    createTrackingOnBootStep(),
    createStepperStealthModeStep(),
    ...createWiFiSteps(),
    createFocuserSteps(),
    {
        id: 'FC',
        title: 'Focuser support',
        label: 'Do you want to support a focuser with additional board:',
        variable: 'focuser',
        condition: "($board IN [M,M10,M20,M21,OAEV1])",
        preamble: ['////////////////////////////////', '// Focuser configuration ', '// Define whether to support a focusing stepper motor on an additional board or not. Currently: {v}'],
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
    ...createHallSensorSteps(),
    ...createAutoPASteps()
];
