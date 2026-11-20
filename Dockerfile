# pull official base image
FROM node:13.12.0-alpine

# set working directory
WORKDIR /app

# add `/app/node_modules/.bin` to $PATH
ENV PATH /app/node_modules/.bin:$PATH

# install app dependencies
COPY package.json ./
COPY package-lock.json ./
RUN npm install --silent
RUN npm install react-scripts@3.4.1 -g --silent

# add app
COPY . ./

# serve the wizard steps at /steps.json for OATControl; generated here as root because npm runs the
# prestart hook as an unprivileged user, which can't write to /app. A failure must not stop the site.
RUN node scripts/export-steps.mjs || echo "steps.json export failed"

# start app
CMD ["npm", "start"]