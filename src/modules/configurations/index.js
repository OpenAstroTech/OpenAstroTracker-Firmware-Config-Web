// Main configuration factory
import { getOATSteps } from './oat/oatSteps.js';
import { getOAMSteps } from './oam/oamSteps.js';
import { getOAESteps } from './oae/oaeSteps.js';

export const getStepsForTracker = (tracker) => {
    switch(tracker) {
        case 'OAT': return getOATSteps();
        case 'OAM': return getOAMSteps();
        case 'OAE': return getOAESteps();
        default: return [];
    }
};

// Export individual tracker configurations for direct access
export { getOATSteps, getOAMSteps, getOAESteps };
