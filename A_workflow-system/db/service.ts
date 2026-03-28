import { db } from "@/db";
import { Many, One } from "drizzle-orm";
import { PgColumn } from "drizzle-orm/pg-core";

export function getSchema() {
    const tables = Object.values(db._.schema!);

    const schema = tables.map((table) => {
        const columns = Object.values(table.columns).filter((column) => column instanceof PgColumn);

        const foreignKeys = Object.entries(table.relations).map(([, relation]) => {
            if (relation instanceof One) {
                return ["<ONE>", relation.fieldName, relation.referencedTableName].join(" -> ");
            }

            if (relation instanceof Many) {
                return ["<MANY>", relation.fieldName, relation.referencedTableName].join(" -> ");
            }

            return null;
        }).filter(Boolean);

        return {
            databaseName: table.dbName,
            tableName: table.tsName,
            columns: Object.entries(columns).map(([, column]) => {
                return {
                    name: column.name,
                    primary: column.primary,
                    dataType: column.dataType,
                    notNull: column.notNull,
                    hasDefault: column.hasDefault,
                }
            }),
            primaryKey: table.primaryKey?.map(key => key.name),
            foreignKeys,
        }
    })

    return schema;
}
