/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_198699524")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE INDEX `idx_Eg3LT2Pvsk` ON `professional_profiles` (`user_id`)",
      "CREATE INDEX `idx_hTJHu2RRDd` ON `professional_profiles` (`city`)",
      "CREATE INDEX `idx_MURU2OB7QX` ON `professional_profiles` (`is_profile_complete`)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_198699524")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  return app.save(collection)
})
