const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async () => {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  // Store instance uri so teardown can stop it
  global.__MONGOD__ = mongod;
};
