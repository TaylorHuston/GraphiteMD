import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Owner extends BaseModel {
  static table = 'owners'
  static connection = 'security'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'password_hash', serializeAs: null })
  declare passwordHash: string
}
