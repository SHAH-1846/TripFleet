const mongoose = require("mongoose");
const { MongoClient } = require("mongodb");
const dotenv = require('dotenv');
dotenv.config();

//Clear migration_history before running migrations

// Configuration
const config = {
  dbUri: process.env.MONGODB_URI,
  dbName: process.env.DB_NAME,
  migrationCollection: "migration_history",
  userCollection: "users",
  userTypeCollection: "user_types",
};

// Migration functions
class UserTypeMigration {
  constructor() {
    this.client = new MongoClient(config.dbUri);
    this.db = null;
    this.migrationName = "001-convert-user-types-to-objectid";
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
      console.log(`Created ${config.migrationCollection} collection`);
    } catch (err) {
      if (err.codeName === "NamespaceExists") {
        console.log(`${config.migrationCollection} collection already exists`);
      } else {
        throw err;
      }
    }
  }

  async migrationAlreadyRun() {
    const migration = await this.db
      .collection(config.migrationCollection)
      .findOne({
        name: this.migrationName,
        direction: "up",
        status: "completed",
      });
    return !!migration;
  }

  async runUp() {
    console.log("Starting migration...");
    await this.connect();
    await this.createMigrationHistoryCollection();

    // Check if migration already completed
    if (await this.migrationAlreadyRun()) {
      console.log("Migration already completed. Skipping...");
      await this.disconnect();
      return;
    }

    // Create migration record
    const migrationRecord = {
      name: this.migrationName,
      direction: "up",
      status: "pending",
      startedAt: new Date(),
      mapping: {},
      createdIds: [],
    };
    const migrationResult = await this.db
      .collection(config.migrationCollection)
      .insertOne(migrationRecord);
    const migrationId = migrationResult.insertedId;

    try {
      // Get all distinct string user types
      const distinctUserTypes = await this.db
        .collection(config.userCollection)
        .distinct("user_type", {
          user_type: { $type: "string" },
        });

      console.log(
        `Found ${distinctUserTypes.length} user types to migrate:`,
        distinctUserTypes
      );

      // Process each user type
      for (const userType of distinctUserTypes) {
        // Create or find existing user type document
        let userTypeDoc = await this.db
          .collection(config.userTypeCollection)
          .findOne({ name: userType });
        let created = false;

        if (!userTypeDoc) {
          const newUserType = {
            name: userType,
            description: `${userType} role`,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          const insertResult = await this.db
            .collection(config.userTypeCollection)
            .insertOne(newUserType);
          userTypeDoc = { ...newUserType, _id: insertResult.insertedId };
          created = true;
          migrationRecord.createdIds.push(insertResult.insertedId);
          console.log(
            `Created new user type: ${userType} (${insertResult.insertedId})`
          );
        }

        // Store mapping for rollback
        migrationRecord.mapping[userType] = userTypeDoc._id;

        // Update all users with this user type
        const updateResult = await this.db
          .collection(config.userCollection)
          .updateMany(
            { user_type: userType },
            { $set: { user_type: userTypeDoc._id } }
          );

        console.log(
          `Updated ${updateResult.modifiedCount} users from "${userType}" to ${userTypeDoc._id}`
        );
      }

      // Update migration record to completed
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

      console.log("Migration completed successfully!");
    } catch (error) {
      // Update migration record with error
      await this.db.collection(config.migrationCollection).updateOne(
        { _id: migrationId },
        {
          $set: {
            status: "failed",
            error: error.message,
            completedAt: new Date(),
          },
        }
      );
      console.error("Migration failed:", error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  async runDown() {
    console.log("Starting rollback...");
    await this.connect();

    // Find the last successful migration
    const migration = await this.db
      .collection(config.migrationCollection)
      .findOne(
        {
          name: this.migrationName,
          direction: "up",
          status: "completed",
        },
        { sort: { completedAt: -1 } }
      );

    if (!migration) {
      console.log("No migration found to rollback");
      await this.disconnect();
      return;
    }

    // Create rollback record
    const rollbackRecord = {
      name: this.migrationName,
      direction: "down",
      status: "pending",
      startedAt: new Date(),
      basedOnMigration: migration._id,
    };
    const rollbackResult = await this.db
      .collection(config.migrationCollection)
      .insertOne(rollbackRecord);
    const rollbackId = rollbackResult.insertedId;

    try {
      // Revert user type references
      for (const [typeName, typeId] of Object.entries(migration.mapping)) {
        const updateResult = await this.db
          .collection(config.userCollection)
          .updateMany({ user_type: typeId }, { $set: { user_type: typeName } });
        console.log(
          `Reverted ${updateResult.modifiedCount} users from ${typeId} to "${typeName}"`
        );
      }

      // Delete created user types
      if (migration.createdIds.length > 0) {
        const deleteResult = await this.db
          .collection(config.userTypeCollection)
          .deleteMany({
            _id: { $in: migration.createdIds },
          });
        console.log(
          `Deleted ${deleteResult.deletedCount} user types created by migration`
        );
      }

      // Update rollback record to completed
      await this.db.collection(config.migrationCollection).updateOne(
        { _id: rollbackId },
        {
          $set: {
            status: "completed",
            completedAt: new Date(),
          },
        }
      );

      console.log("Rollback completed successfully!");
    } catch (error) {
      // Update rollback record with error
      await this.db.collection(config.migrationCollection).updateOne(
        { _id: rollbackId },
        {
          $set: {
            status: "failed",
            error: error.message,
            completedAt: new Date(),
          },
        }
      );
      console.error("Rollback failed:", error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

}

// Command-line execution
async function main() {
  const command = process.argv[2];
  const migration = new UserTypeMigration();

  try {
    if (command === "up") {
      await migration.runUp();
    } else if (command === "down") {
      await migration.runDown();
    } else {
      console.log("Usage:");
      console.log("  node migration.js up   - Run migration");
      console.log("  node migration.js down - Rollback migration");
    }
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();
