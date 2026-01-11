# OpenAstroTech Mount Configurator
This is the source code for a small React-based app, using AntDesign that asks the user a bunch of questions about what components
they used to build their mount and then spits out the defines that need to be placed in configuration_local.hpp.

It can be used live at https://config.openastrotech.com

# Status
Captures the great majority of use cases for the OAT, OAE and OAM. Please file Issues if you would like to see more variables supported, or if you are 
able, please create and submit a PR with an extra step in the code. It's pretty easy to add a new step to the Wizard, just look at the
stepProps array in one of the oxxSteps.js files and add a new array item there. 

# Roadmap
- Bluetooth - not currently queried.
- Dark mode support.

# Using Source code

If you want to constribute to this project, you'll need to get the source code. If you want to just use it, simply go to https://config.openastrotech.com

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.
