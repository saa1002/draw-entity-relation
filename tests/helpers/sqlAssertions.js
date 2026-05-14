export const compactSQL = (sql) => sql.replace(/\s+/g, '')

export const buildSQLAssertions = (expect) => ({
    expectSQLToContain(actual, expectedFragment) {
        expect(compactSQL(actual)).toContain(compactSQL(expectedFragment))
    },

    expectSQLNotToContain(actual, expectedFragment) {
        expect(compactSQL(actual)).not.toContain(compactSQL(expectedFragment))
    },
})