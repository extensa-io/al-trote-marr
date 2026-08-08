import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is not set");

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

// Start a fresh connection. On a serverless platform we must NOT connect at
// module scope: that fires during import in every instance that transitively
// imports this file, so a request that never queries can freeze mid-handshake
// and leak a timeout rejection nothing is awaiting. We connect lazily instead,
// inside the accessor, so a connection only starts within an invocation that
// awaits it. Timeouts are set well inside the function limit so a real connect
// failure surfaces as an attributable error from the awaiting route rather than
// an orphaned rejection killed by the platform first.
function connect(): Promise<MongoClient> {
  const promise = new MongoClient(uri!, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  })
    .connect()
    .catch((err) => {
      // Evict the rejected promise so the next request retries instead of
      // re-awaiting a permanently poisoned cache slot for the life of the
      // instance. Only clear if it still holds this exact promise, so we never
      // clobber a newer successful connection.
      if (global._mongoClientPromise === promise) global._mongoClientPromise = undefined;
      throw err;
    });
  return promise;
}

function getClientPromise(): Promise<MongoClient> {
  return (global._mongoClientPromise ??= connect());
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(process.env.MONGODB_DB || "altrotemarr");
}

export function getClient(): Promise<MongoClient> {
  return getClientPromise();
}
