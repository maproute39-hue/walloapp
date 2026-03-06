/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_505575146")

  // update collection data
  unmarshal({
    "name": "otp_requests"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_505575146")

  // update collection data
  unmarshal({
    "name": "otp_verifications"
  }, collection)

  return app.save(collection)
})
