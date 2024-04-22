import fs from 'node:fs'

export default class Permissions {
  static instance: Permissions
  jsonObject: { [key: string]: number } | null

  constructor() {
    this.jsonObject = null
    try {
      const data = fs.readFileSync('resources/permissions/permissions.json', 'utf8')
      const jsonTab = JSON.parse(data)
      this.jsonObject = {}
      for (const [i, element] of jsonTab.entries()) {
        this.jsonObject[element] = Math.pow(2, i)
      }
    } catch (error) {
      // pass, file error : jsonObject stay at null value
    }
  }

  static getInstance() {
    if (!Permissions.instance) {
      Permissions.instance = new Permissions()
    }

    return Permissions.instance
  }

  getJsonObject() {
    return this.jsonObject
  }
}
