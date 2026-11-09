export class CatalogRepository {
    connection;
    constructor(connection) {
        this.connection = connection;
    }
    get db() { return this.connection.db; }
    async company(id, session) {
        const row = await this.db.collection('companies').findOne({ id }, { session });
        if (row) {
            if (row.archived || row.status !== 'verified' || await this.db.collection('users').findOne({ id, active: false }, { session }))
                return null;
            return { ...row, verified: true, technologies: row.technologies ?? [], opted_out: !!row.opted_out };
        }
        return this.db.collection('integration_company_refs').findOne({ id }, { session });
    }
    async job(id, session) {
        const row = await this.db.collection('jobs').findOne({ id }, { session });
        if (row) {
            if (row.archived || !await this.company(row.company_id, session))
                return null;
            const rawDeadline = row.application_deadline ?? row.deadline ?? null;
            const deadline = typeof rawDeadline === 'string' && rawDeadline.length === 10 ? `${rawDeadline}T23:59:59.999Z` : rawDeadline;
            return { ...row, city: row.location ?? row.city ?? '', contract: row.type ?? row.contract ?? '', state: row.status, route: row.route ?? 'internal', questions: row.questions ?? [], deadline };
        }
        return this.db.collection('integration_job_refs').findOne({ id }, { session });
    }
    async companies() {
        const canonical = await this.db.collection('companies').find({}).toArray();
        const legacy = await this.db.collection('integration_company_refs').find({}).toArray();
        const ids = [...new Set([...canonical, ...legacy].map(r => r.id))];
        const rows = await Promise.all(ids.map(id => this.company(id)));
        return rows.filter((r) => !!r);
    }
    async jobs() {
        const rows = await this.db.collection('jobs').find({}).toArray();
        const legacy = await this.db.collection('integration_job_refs').find({}).toArray();
        return (await Promise.all([...new Set([...rows, ...legacy].map(r => r.id))].map(id => this.job(id)))).filter((r) => !!r && r.state === 'published');
    }
    async recruiterCompanies(userId, session) {
        const user = await this.db.collection('users').findOne({ id: userId }, { session });
        if (user?.active === false)
            return [];
        const refs = await this.db.collection('integration_membership_refs').find({ user_id: userId, verified: true }, { session }).toArray();
        const ids = [...new Set([userId, ...refs.map(r => r.company_id)])];
        const rows = await Promise.all(ids.map(id => this.company(id, session)));
        return rows.filter((r) => !!r && r.verified === true);
    }
}
