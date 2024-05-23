import { fork } from 'node:child_process'

const commandMigrate = '/app/node_modules/prisma/build/index.js'
const commandStart = '/app/bin/server.js'

const processMigrate = fork(commandMigrate, ['migrate', 'deploy'])

processMigrate.on('close', (codeMigrate) => {
  console.log(`processMigrate code: ${codeMigrate}`)
  if (codeMigrate !== 0) {
    process.exit(codeMigrate)
  }
  const processApp = fork(commandStart)
  processApp.on('close', (codeApp) => {
    console.log(`processApp code: ${codeApp}`)
  })
})
