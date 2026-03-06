/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1003195976")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE INDEX `idx_X5Z4xIhEr9` ON `requests` (`zip_code`)",
      "CREATE INDEX `idx_j1z0DEg6rI` ON `requests` (`status`)",
      "CREATE INDEX `idx_ldAV9emCTM` ON `requests` (`client_id`)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1003195976")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  return app.save(collection)
})
