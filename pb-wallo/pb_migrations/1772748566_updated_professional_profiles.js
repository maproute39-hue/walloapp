/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_198699524")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE INDEX `idx_Eg3LT2Pvsk` ON `professional_profiles` (`userId`)",
      "CREATE INDEX `idx_hTJHu2RRDd` ON `professional_profiles` (`city`)",
      "CREATE INDEX `idx_MURU2OB7QX` ON `professional_profiles` (`is_profile_complete`)"
    ]
  }, collection)

  // update field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": false,
    "collectionId": "_pb_users_auth_",
    "hidden": false,
    "id": "relation2809058197",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "userId",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_198699524")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE INDEX `idx_Eg3LT2Pvsk` ON `professional_profiles` (`user_id`)",
      "CREATE INDEX `idx_hTJHu2RRDd` ON `professional_profiles` (`city`)",
      "CREATE INDEX `idx_MURU2OB7QX` ON `professional_profiles` (`is_profile_complete`)"
    ]
  }, collection)

  // update field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": false,
    "collectionId": "_pb_users_auth_",
    "hidden": false,
    "id": "relation2809058197",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "user_id",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
})
