const { MongoClient } = require('mongodb')
const {send} = require('micro');

const responses = []
const { MONGO_URL, MONGO_DB } = process.env

const retrieveDataMongo = async url => {
  const connection = await MongoClient.connect(MONGO_URL)
  const db = connection.db(MONGO_DB)
  const collection = db.collection('responses')
  const lastCall = await collection.findOne({ url })
  connection.close()
  return lastCall
}

const retrieveData = async url => {
  if (MONGO_URL && MONGO_DB) {
    return retrieveDataMongo(url)
  }

  return responses[url]
}

const saveDataMongo = async (url, { data, date, status }) => {
  const connection = await MongoClient.connect(MONGO_URL)
  const db = connection.db(MONGO_DB)
  const collection = await db.collection('responses')
  await collection.remove({ url })
  const lastCall = await collection.insert({ url, data, date, status })
  connection.close()
  return lastCall
}

const saveData = async (url, data) => {
  if (MONGO_URL && MONGO_DB) {
    return saveDataMongo(url, data)
  }

  responses[url] = data
  return data
}

module.exports = (ms, microFunction) => async (req, res) => {
  const lastCall = await retrieveData(req.url)
  if (lastCall && lastCall.date > new Date() && lastCall.data) {
      return send(
        res,
        lastCall.status,
        lastCall.data
      );
  }
  const data = await microFunction(req, res)
  const status = data.statusCode || 200;
  const date = new Date(new Date().getTime() + ms)
  if (status === 200) {
    saveData(req.url, { data, date, status})
  }
  return send(
     res,
     status,
     data
  );
}
