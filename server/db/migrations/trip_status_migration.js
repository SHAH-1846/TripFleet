const { MongoClient } = require("mongodb");
require('dotenv').config();

const config = {
  dbUri: process.env.MONGODB_URI,
  dbName: process.env.DB_NAME,
  migrationCollection: "migration_history",
  tripCollection: "trips",
  statusCollection: "trip_status",
};

class TripStatusMigration {
  constructor() {
    this.client = new MongoClient(config.dbUri);
    this.db = null;
    this.migrationName = "trip_status_migration";
  }

  async connect() {
    await this.client.connect();
    this.db = this.client.db(config.dbName);
  }

  async disconnect() {
    await this.client.close();
  }

  async createMigrationHistoryCollection() {
    try {
      await this.db.createCollection(config.migrationCollection);
    } catch (err) {
      if (err.codeName !== "NamespaceExists") throw err;
    }
  }

  async migrationAlreadyRun() {
    const rec = await this.db.collection(config.migrationCollection).findOne({
      name: this.migrationName,
      direction: "up",
      status: "completed",
    });
    return !!rec;
  }

  async runUp() {
    console.log("🔄 Starting TripStatus migration (UP)...");
    await this.connect();
    await this.createMigrationHistoryCollection();

    if (await this.migrationAlreadyRun()) {
      console.log("✅ Migration already completed. Skipping.");
      return this.disconnect();
    }

    const migrationRecord = {
      name: this.migrationName,
      direction: "up",
      status: "pending",
      startedAt: new Date(),
      mapping: {},
      createdIds: [],
    };

    const { insertedId: migrationId } = await this.db
      .collection(config.migrationCollection)
      .insertOne(migrationRecord);

    try {
      const distinctStatuses = await this.db
        .collection(config.tripCollection)
        .distinct("status", { status: { $type: "string" } });

      console.log(`Found ${distinctStatuses.length} distinct statuses:`, distinctStatuses);

      for (const status of distinctStatuses) {
        let statusDoc = await this.db
          .collection(config.statusCollection)
          .findOne({ name: status });

        if (!statusDoc) {
          const newDoc = {
            name: status,
            description: `${status} status`,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          const { insertedId } = await this.db
            .collection(config.statusCollection)
            .insertOne(newDoc);
          statusDoc = { ...newDoc, _id: insertedId };
          migrationRecord.createdIds.push(insertedId);
          console.log(`✅ Created trip_status "${status}" with _id ${insertedId}`);
        }

        migrationRecord.mapping[status] = statusDoc._id;

        const { modifiedCount } = await this.db
          .collection(config.tripCollection)
          .updateMany(
            { status: status },
            { $set: { status: statusDoc._id } }
          );
        console.log(`👉 Updated ${modifiedCount} trips from "${status}" → ${statusDoc._id}`);
      }

      await this.db.collection(config.migrationCollection).updateOne(
        { _id: migrationId },
        {
          $set: {
            status: "completed",
            completedAt: new Date(),
            mapping: migrationRecord.mapping,
            createdIds: migrationRecord.createdIds,
          },
        }
      );

      console.log("🎉 Migration completed successfully!");
    } catch (err) {
      await this.db.collection(config.migrationCollection).updateOne(
        { _id: migrationId },
        {
          $set: {
            status: "failed",
            error: err.message,
            completedAt: new Date(),
          },
        }
      );
      console.error("Migration failed:", err);
      throw err;
    } finally {
      await this.disconnect();
    }
  }

  async runDown() {
    console.log("🔙 Starting TripStatus rollback (DOWN)...");
    await this.connect();

    const lastMigration = await this.db
      .collection(config.migrationCollection)
      .findOne(
        { name: this.migrationName, direction: "up", status: "completed" },
        { sort: { completedAt: -1 } }
      );

    if (!lastMigration) {
      console.log("⚠️ No completed UP migration found. Nothing to rollback.");
      return this.disconnect();
    }

    const rollbackRecord = {
      name: this.migrationName,
      direction: "down",
      status: "pending",
      startedAt: new Date(),
      basedOnMigration: lastMigration._id,
    };

    const { insertedId: rollbackId } = await this.db
      .collection(config.migrationCollection)
      .insertOne(rollbackRecord);

    try {
      for (const [statusName, statusId] of Object.entries(lastMigration.mapping)) {
        const { modifiedCount } = await this.db
          .collection(config.tripCollection)
          .updateMany(
            { status: statusId },
            { $set: { status: statusName } }
          );
        console.log(`⏪ Reverted ${modifiedCount} trips: ${statusId} → "${statusName}"`);
      }

      if (lastMigration.createdIds?.length > 0) {
        const { deletedCount } = await this.db
          .collection(config.statusCollection)
          .deleteMany({ _id: { $in: lastMigration.createdIds } });
        console.log(`🗑️ Deleted ${deletedCount} trip_status docs created during migration`);
      }

      await this.db.collection(config.migrationCollection).updateOne(
        { _id: rollbackId },
        {
          $set: {
            status: "completed",
            completedAt: new Date(),
          },
        }
      );

      console.log("✅ Rollback completed successfully!");
    } catch (err) {
      await this.db.collection(config.migrationCollection).updateOne(
        { _id: rollbackId },
        {
          $set: {
            status: "failed",
            error: err.message,
            completedAt: new Date(),
          },
        }
      );
      console.error("Rollback failed:", err);
      throw err;
    } finally {
      await this.disconnect();
    }
  }
}

// CLI execution
async function main() {
  const cmd = process.argv[2];
  const mig = new TripStatusMigration();

  try {
    if (cmd === "up") {
      await mig.runUp();
    } else if (cmd === "down") {
      await mig.runDown();
    } else {
      console.log("Usage: node 003-convert-trip-status-to-objectid.js [up|down]");
    }
  } catch (err) {
    console.error("💥 Error:", err.message);
    process.exit(1);
  }
}

main();
