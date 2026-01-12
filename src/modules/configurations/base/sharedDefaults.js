// Shared default values for all tracker configurations
export const Defaults = {
    PowerRating: { 
        BY: 150, N9: 900, N8: 900, N9O: 900, N8O: 900, N49: 400, N48: 400,
        rastpr: { BY: 150, N9: 900, N8: 900, N9O: 900, N8O: 900 },
        decstpr: { BY: 150, N9: 900, N8: 900, N9O: 900, N8O: 900, N49: 400, N48: 400 },
        focstpr: { BY: 150, N9: 900, N8: 900, N49: 400, N48: 400 },
        az: { BY: 150, N9: 900, N8: 900 },
        alt: { BY: 150, N9: 900, N8: 900 }
    },
    PowerUtilization: { 
        BY: 100, N9: 90, N8: 90, N9O: 90, N8O: 90, N49: 90, N48: 90,
        rastpr: { BY: 100, N9: 90, N8: 90, N9O: 90, N8O: 90 },
        decstpr: { BY: 100, N9: 90, N8: 90, N9O: 90, N8O: 90, N49: 90, N48: 90 },
        focstpr: { BY: 100, N9: 90, N8: 90, N49: 90, N48: 90 },
        az: { BY: 100, N9: 90, N8: 90 },
        alt: { BY: 100, N9: 90, N8: 90 }
    },
    HoldPercentage: { 
        BY: 0, N9: 10, N8: 10, N49: 10, N48: 10,
        az: { BY: 0, N9: 10, N8: 10 },
        alt: { BY: 0, N9: 10, N8: 10 }
    },
    Speed: { 
        BY: 400, N9: 1800, N8: 1800, N49: 1200, N48: 1200,
        rastpr: { BY: 400, N9: 1800, N8: 1800, N9O: 1800, N8O: 1800 },
        decstpr: { BY: 400, N9: 1800, N8: 1800, N9O: 1800, N8O: 1800, N49: 1200, N48: 1200 },
        focstpr: { BY: 400, N9: 1800, N8: 1800, N49: 1200, N48: 1200 }
    },
    Acceleration: { 
        BY: 600, N9: 3000, N8: 3000, N49: 3000, N48: 3000,
        rastpr: { BY: 600, N9: 3000, N8: 3000, N9O: 3000, N8O: 3000 },
        decstpr: { BY: 600, N9: 3000, N8: 3000, N9O: 3000, N8O: 3000, N49: 3000, N48: 3000 },
        focstpr: { BY: 600, N9: 3000, N8: 3000, N49: 3000, N48: 3000 }
    },
    RASlewMicrostepping: { BY: 1, N9: 32, N8: 32, rastpr: { BY: 1, N9: 32, N8: 32, N9O: 32, N8O: 32 } },
    RATrackMicrostepping: { BY: 1, N9: 256, N8: 256, rastpr: { BY: 1, N9: 256, N8: 256, N9O: 256, N8O: 256 } },
    DECSlewMicrostepping: { BY: 1, N9: 32, N8: 32, decstpr: { BY: 1, N9: 32, N8: 32, N9O: 32, N8O: 32, N49: 32, N48: 32 } },
    DECGuideMicrostepping: { BY: 1, N9: 256, N8: 256, decstpr: { BY: 1, N9: 256, N8: 256, N9O: 256, N8O: 256, N49: 256, N48: 256 } },
    FocuserMicrostepping: { BY: 1, N9: 8, N8: 8, N49: 8, N48: 8, focstpr: { BY: 1, N9: 8, N8: 8, N49: 8, N48: 8 } },
    AZALTMicrostepping: { 
        BY: 1, N9: 16, N8: 16,
        az: { BY: 1, N9: 16, N8: 16 },
        alt: { BY: 1, N9: 16, N8: 16 }
    },
    OAMSpeed: { N9: 2.0, N8: 2.0, N9O: 2.0, N8O: 2.0, rastpr: { N9: 2.0, N8: 2.0, N9O: 2.0, N8O: 2.0 }, decstpr: { N9: 2.0, N8: 2.0, N9O: 2.0, N8O: 2.0 } },
    OAMAcceleration: { N9: 2.0, N8: 2.0, N9O: 2.0, N8O: 2.0, rastpr: { N9: 2.0, N8: 2.0, N9O: 2.0, N8O: 2.0 }, decstpr: { N9: 2.0, N8: 2.0, N9O: 2.0, N8O: 2.0 } },
    OAMMicrostepping: { N9: 128, N8: 128, N9O: 128, N8O: 128, rastpr: { N9: 128, N8: 128, N9O: 128, N8O: 128 }, decstpr: { N9: 128, N8: 128, N9O: 128, N8O: 128 } },
    RAHallSensorPin: { OAT: 53, OAM: 27, OAE: 27 },
    DECHallSensorPin: { OAT: 52, OAM: 29, OAE: 29 },
    OAEPowerRating: { N9: 2000, N8: 2000, N9O: 2000, N8O: 2000 },
    OAEPowerUtilization: { N9: 50, N8: 50, N9O: 50, N8O: 50 },
    OAESlewMicrostepping: { N9: 4, N8: 4, N9O: 16, N8O: 16 },
    OAETrackMicrostepping: { N9: 256, N8: 256, N9O: 256, N8O: 256 }    
};