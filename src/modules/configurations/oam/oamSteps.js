// OAM Configuration Steps
import { 
    createTrackerSelectionStep, 
    createHemisphereStep, 
    createTrackingOnBootStep,
    createBoardStep,
    createRADriverStep,
    createRAPulleyTeethStep,
    createDECDriverStep,
    createDECPulleyTeethStep,
    createStepperStealthModeStep,
    createDisplayStep,
    createInfoDisplayStep,
    createWiFiSteps,
    createFocuserSteps,
    createHallSensorSteps,
    createAutoPASteps
} from '../base/commonSteps.js';
import { Defaults } from '../base/sharedDefaults.js';

export const getOAMSteps = () => [
    createTrackerSelectionStep(),
    {
        id: 'FWM',
        title: 'Firmware',
        label: 'You must use V1.13.x firmware on OAM:',
        variable: 'fwversion',
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
    createHemisphereStep(),
    createBoardStep(),
    {
        id: 'RSM',
        title: 'RA Stepper',
        label: 'Which stepper motor are you using for RA:',
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
    createRADriverStep(),
    {
        id: 'RAM',
        title: 'RA Advanced Settings',
        label: 'These are some advanced settings you may want to override. The defaults are set already. Please only change them if you are sure what they do and what their valid ranges are. Enter the RA stepper specs and desired settings:',
        variable: 'rapower',
        condition: "($radrv == TU)",
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
        }]
    },
    createTrackingOnBootStep(),
    createRAPulleyTeethStep(),
    {
        id: 'DSM',
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
                     additionalLines: ['#define DEC_STEPPER_SPR                (400 * 9)']
                },
                {
                    key: 'N8O',
                    value: 'NEMA 17, 1.8°/step',
                    image: '/images/nema17.png',
                    defineValue: 'STEPPER_TYPE_ENABLED',
                    additionalLines: ['#define DEC_STEPPER_SPR                (200 * 9)']
                },
            ]
        },
        postamble: [{
            literal: ['#define DEC_WHEEL_CIRCUMFERENCE        816.814f'],
        }],
    },
    createDECDriverStep(),
    {
        id: 'DAM',
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
        }]
    },
    createDECPulleyTeethStep(),
    {
        id: 'DLO',
        title: 'DEC Movement Limits',
        label: 'These are required settings to determine how far DEC can move from the Home position without hitting any hardware limits (if you have endswitches, you can set this to 180):',
        variable: 'declimits',
        preamble: ['// Define DEC limits'],
        define: '',
        control: {
            type: 'textinput',
            choices: [
                { key: 'N', label: 'Degrees DEC can move from Home', defaultValue: '120', defineLine: '#define DEC_LIMIT_UP   {0} // degrees from Home\n#define DEC_LIMIT_DOWN {0}' },
            ]
        },
    },
    createStepperStealthModeStep(),
    createDisplayStep(),
    createInfoDisplayStep(),
    ...createWiFiSteps(),
    ...createFocuserSteps(),
    ...createHallSensorSteps(),
    {
        id: 'DAH',
        title: 'DEC Auto Home via Hall sensors',
        label: 'Do you have the Hall sensor-based AutoHome add ons installed on the DEC axis:',
        variable: 'hallhomedec',
        condition: "($board IN [M,M21])",
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
    {
        id: 'RESM',
        title: 'RA End switches',
        label: 'Do you have end switches installed on the RA axis:',
        variable: 'endswra',
        preamble: ['////////////////////////////////', '// End Switch addons'],
        define: 'USE_RA_END_SWITCH',
        control: {
            type: 'radioimg',
            choices: [
                { key: 'N', value: 'No RA end switches installed', image: '/images/none.png', defineValue: '0' },
                { key: 'Y', value: 'RA end switches are installed', image: '/images/none.png', defineValue: '1' },
            ]
        },
    },
    {
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
    {
        id: 'DESM',
        title: 'DEC End switches',
        label: 'Do you have end switches installed on the DEC axis:',
        variable: 'endswdec',
        define: 'USE_DEC_END_SWITCH',
        control: {
            type: 'radioimg',
            choices: [
                { key: 'N', value: 'No DEC end switches installed', image: '/images/none.png', defineValue: '0' },
                { key: 'Y', value: 'DEC end switches are installed', image: '/images/none.png', defineValue: '1' },
            ]
        },
    },
    {
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
    ...createAutoPASteps()
];
