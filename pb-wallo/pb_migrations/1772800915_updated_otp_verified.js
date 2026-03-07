/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_162888494")

  // update collection data
  unmarshal({
    "name": "otp_verifications"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_162888494")

  // update collection data
  unmarshal({
    "name": "otp_verified"
  }, collection)

  return app.save(collection)
})
